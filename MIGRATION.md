# Migration: Replit → Railway + Cloudflare

## Context

This app (CleanTech Asset Tracking) was built and hosted on Replit. It has been migrated to:

- **Railway** — hosts the app as a single Docker service (Express serves both the API and the built React client on one port) plus a managed PostgreSQL database.
- **Cloudflare** — DNS, CDN/proxy, and TLS in front of the Railway service.

The app was a good migration candidate: it uses standard JWT auth (not Replit Auth), the plain `pg` driver (not Neon serverless), and reads all config from environment variables.

## Status: LIVE

- **Production URL:** https://cleantec.myworkapp.io (`myworkapp.io` zone on Cloudflare, registrar Network Solutions).
- Served via Cloudflare Worker `cleantec-proxy` → Railway service `cleantec-app` (see Phase 3 for why a Worker instead of a native Railway custom domain).
- Data copied from the live Replit Neon database into Railway Postgres; all 20 tables verified row-for-row.
- The temporary `cleantec.mobilespotrepairs.com` used during setup has been fully decommissioned (DNS record, Worker route, and config rule removed).
- Login accounts are the real system users from production (`kassif`, `amcdaniel`, `cceniceros`, `sgonzalez`, `christenr`, `system`); there is no `admin`/`admin123` account in the live data (that pair only existed in the repo's demo BSON snapshot).

## Code changes made for the migration

| Change | Files |
|---|---|
| Removed Replit Vite plugins (`@replit/vite-plugin-*`) | `vite.config.ts`, `package.json` |
| Deleted Replit config; moved `replit.md` → `docs/APP-OVERVIEW.md` | `.replit` (deleted) |
| Removed Linux-only `reusePort` listen option (crashed local dev on macOS) | `server/index.ts` |
| Added `trust proxy` for Railway/Cloudflare reverse proxies | `server/index.ts` |
| Fail fast in production when `JWT_SECRET` is unset (previously fell back to a hardcoded default) | `server/middleware/auth.ts` |
| Multi-stage Docker build (Node 22; client + server bundle; prod deps only at runtime) | `Dockerfile`, `.dockerignore` |
| Railway config-as-code: Dockerfile builder, `/api/health` healthcheck, restart policy | `railway.json` |
| Documented env vars; dev script now loads `.env` if present | `.env.example`, `package.json`, `README.md` |

## Architecture on the target stack

```
Browser ──▶ Cloudflare (DNS + proxy + TLS + CDN)
                │  CNAME app.<domain> → <service>.up.railway.app
                ▼
        Railway service (Docker: node dist/index.cjs, $PORT)
                │  private network (DATABASE_URL)
                ▼
        Railway PostgreSQL
```

- One origin for API + client, same as on Replit — no CORS changes needed.
- Cloudflare SSL mode must be **Full (strict)**; Railway terminates TLS with a valid cert on its domain.

## Runbook

### Phase 1 — Provision Railway

1. `railway init` — create project (uses `RAILWAY_API_TOKEN`).
2. `railway add --database postgres` — managed PostgreSQL.
3. `railway up` — build the Dockerfile and deploy the app service from this repo.
4. Set service variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (private-network reference)
   - `JWT_SECRET` = freshly generated 64-hex secret (`openssl rand -hex 32`)
   - `SMTP_*` (optional, if email notifications are wanted)
5. `railway domain` — generate the `*.up.railway.app` domain; confirm `/api/health` returns 200.

### Phase 2 — Schema and data

1. Schema: `DATABASE_URL=<railway-public-url> npm run db:push` (run locally against the Railway DB's public connection string).
2. Data — one of:
   - **Copy live data from the Replit database** (best fidelity): `pg_dump` from the Replit `DATABASE_URL` → `pg_restore`/`psql` into Railway. Requires the Replit DB connection string.
   - **Re-import from the BSON export in this repo**: `DATABASE_URL=<railway-public-url> npx tsx server/import-mongodb.ts` (data snapshot; resets admin passwords to `admin123`).
   - **Fresh seed**: `npx tsx server/seed.ts`.
3. If passwords were reset by the import path, rotate them immediately.

### Phase 3 — Cloudflare

**What was actually deployed (Worker proxy pattern).** The standard Railway custom-domain flow (add domain → CNAME → Railway issues a certificate) failed for `cleantec.mobilespotrepairs.com`: Railway's ownership validation stayed stuck for ~4 hours across proxied, DNS-only, and manually retriggered attempts, with clean diagnostics (no CAA/DNSSEC records, ACME path unobstructed, no Railway incidents). The deployed alternative bypasses Railway domain validation entirely:

1. Proxied CNAME `cleantec` → `cleantec-app-production.up.railway.app` (the service domain; content is informational — the Worker below decides the origin).
2. Cloudflare Worker `cleantec-proxy` on route `cleantec.mobilespotrepairs.com/*` rewrites the request hostname to the Railway service domain and fetches it, so Railway routes by its own domain. No Railway custom domain object exists.
3. Configuration Rule pins SSL mode **Full** for the hostname (relevant only if the Worker route is ever removed; Railway docs say Full-strict does not work behind the Cloudflare proxy).
4. Browsers get Cloudflare's Universal SSL cert; the Worker's fetch to Railway is fully validated HTTPS.

The Worker source is ~6 lines; it lives in the Cloudflare account (`cleantec-proxy`) and can be recreated from this snippet:

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = "cleantec-app-production.up.railway.app";
    return fetch(new Request(url, request));
  },
};
```

For a future domain (e.g. `cleantec.myworkapp.io`), try the standard custom-domain flow first — a fresh hostname with no DNS churn may validate fine — and fall back to this Worker pattern if validation sticks.

### Phase 4 — Verify

- `GET https://<domain>/api/health` → 200
- Login with an admin account; browse orders/assets pages
- `GET /api-docs` (Swagger) renders
- Download an order PDF and a BOL PDF
- CSV import round-trip on a test product

### Phase 5 — Cutover and decommission

1. Repoint any external/mobile clients (`/v1/*` consumers) to the new domain.
2. Stop the Replit deployment (leave the Repl intact until Railway has run clean for a few days).
3. Final `pg_dump` of the Replit DB as an archival backup before deleting anything.

## Credentials required for autonomous execution

| Credential | Scope | Used for |
|---|---|---|
| Railway account/workspace token (`RAILWAY_API_TOKEN`) | Project create + deploy + variables + domains | Phases 1, 3 |
| Cloudflare API token | `Zone → DNS: Edit`, `Zone → Zone: Read`, `Zone → Zone Settings: Edit` — scoped to the target zone | Phase 3 |
| Replit `DATABASE_URL` (only for the live-copy data option) | read access | Phase 2 |
| SMTP credentials (optional) | — | Email notifications |

## Moving to cleantec.myworkapp.io later

The app currently runs at `cleantec.mobilespotrepairs.com` (temporary). To move it to `cleantec.myworkapp.io`:

1. **Add `myworkapp.io` to Cloudflare**: Cloudflare dashboard → Add a domain → `myworkapp.io` → pick the Free plan. Cloudflare shows two nameservers (e.g. `xxx.ns.cloudflare.com`).
2. **Update nameservers at the registrar** where `myworkapp.io` is registered (GoDaddy/Namecheap/etc.): replace the existing nameservers with the two Cloudflare ones. Propagation takes minutes to ~24h; the zone shows **Active** in Cloudflare when done. Any existing DNS records must be recreated in Cloudflare first (Cloudflare auto-imports most on add — review them).
3. **Add the new custom domain on Railway**: service → Settings → Networking → Custom Domain → `cleantec.myworkapp.io` (or via API). Railway returns a new CNAME target.
4. **Create the CNAME in the `myworkapp.io` zone**: `cleantec` → that target, proxied ☁️, and add a Configuration Rule setting SSL mode **Full** for `cleantec.myworkapp.io` (Railway requires Full, not Full-strict, behind the Cloudflare proxy). If Railway's certificate validation gets stuck the way it did for the temporary domain, use the Worker proxy pattern from Phase 3 instead (route `cleantec.myworkapp.io/*` to the same `cleantec-proxy` Worker).
5. **Verify** `https://cleantec.myworkapp.io/api/health`, then delete the temporary `cleantec.mobilespotrepairs.com` DNS record, its config rule, and its Worker route.
6. A scoped API token for the new zone (DNS:Edit, Zone:Read, Config Rules:Edit, Workers Routes:Edit) is enough for me to do steps 3–5 autonomously; steps 1–2 must be done by the account owner at the registrar.

## Rollback

Replit deployment stays untouched until Phase 5, so rollback at any earlier point is simply "keep using the Replit URL". After DNS cutover, rollback is flipping the Cloudflare CNAME back (or unproxying), which propagates in minutes.
