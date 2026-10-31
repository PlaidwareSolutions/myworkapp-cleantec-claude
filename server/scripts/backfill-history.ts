/**
 * Historical order backfill from scripts/backfill/loads.json.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx server/scripts/backfill-history.ts            # dry run (reads only, prints plan)
 *   DATABASE_URL=... npx tsx server/scripts/backfill-history.ts --execute  # writes, single transaction
 * Options: --loads <path> (default scripts/backfill/loads.json), --mapping <path> (default scripts/backfill/mapping.json)
 *
 * Writes orders, order_items, order_events, bols, bol_items, bol_tags, shipments, shipment_bols and
 * asset_events with historical timestamps, then recomputes assets.last_state. Idempotent: a load whose
 * BOL number already exists in bols.reference_id is skipped. Missing tags are created (tags + assets +
 * COMMISSIONING event) when mapping.missingTags.create is true.
 */
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "../db";
import {
  contacts, products, tags, assets, assetEvents, orders, orderItems, orderEvents,
  bols, bolItems, bolTags, shipments, shipmentBols, settings,
} from "@shared/schema";

type LoadTag = { number: number; epc: string; date: string; sheet: string; row: number };
type Load = {
  bol: string; sheet: string | null; direction: "OUTBOUND" | "INBOUND"; quantity: number;
  order_date: string; ship_date: string; po: string | null; po_note?: string; customer: string;
  warehouse: string; notes: string[]; tags: LoadTag[];
};
type Mapping = {
  createdByUsername: string; productName: string;
  carrier: { name: string; create?: boolean };
  customers: Record<string, { name: string; create?: boolean; type?: string }>;
  warehouses: Record<string, string>;
  missingTags: { create: boolean; customAttributes: Record<string, unknown> };
};

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const opt = (name: string, dflt: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const loadsFile = opt("--loads", "scripts/backfill/loads.json");
const mappingFile = opt("--mapping", "scripts/backfill/mapping.json");

const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00Z`);
const T_INITIATED = "15:00", T_APPROVED = "15:05", T_SHIP = "17:00", T_RECEIVE = "17:00";

async function main() {
  const source = JSON.parse(fs.readFileSync(loadsFile, "utf8"));
  const loads: Load[] = source.loads;
  const mapping: Mapping = JSON.parse(fs.readFileSync(mappingFile, "utf8"));
  const problems: string[] = [];
  const log = (s: string) => console.log(s);

  log(`Backfill ${execute ? "EXECUTE" : "DRY RUN"} from ${loadsFile} (${loads.length} loads, source ${source.source})`);

  // ---- resolve master data ----
  const [product] = await db.select().from(products).where(eq(products.name, mapping.productName));
  if (!product) problems.push(`product ${mapping.productName} not found`);
  const [creator] = await db.select().from(contacts).where(eq(contacts.systemUserUsername, mapping.createdByUsername));
  if (!creator) problems.push(`user ${mapping.createdByUsername} not found`);
  const [setting] = await db.select().from(settings);
  const warehouses: Record<string, any> = {};
  for (const w of (setting?.warehouses as any[]) ?? []) warehouses[w.name] = w;

  const byName = async (name: string) =>
    (await db.select().from(contacts).where(sql`trim(${contacts.name}) = ${name.trim()}`))[0];

  const contactsToCreate: { name: string; type: string }[] = [];
  let carrier = await byName(mapping.carrier.name);
  if (!carrier) {
    if (mapping.carrier.create) contactsToCreate.push({ name: mapping.carrier.name, type: "CARRIER" });
    else problems.push(`carrier ${mapping.carrier.name} not found`);
  }
  const customerIds: Record<string, string | null> = {};
  for (const name of Array.from(new Set(loads.map((l) => l.customer)))) {
    const m = mapping.customers[name];
    if (!m) { problems.push(`no customer mapping for "${name}"`); continue; }
    const c = await byName(m.name);
    if (c) customerIds[name] = c.id;
    else if (m.create) { customerIds[name] = null; if (!contactsToCreate.some((x) => x.name === m.name)) contactsToCreate.push({ name: m.name, type: m.type ?? "CUSTOMER" }); }
    else problems.push(`customer "${m.name}" (for "${name}") not found`);
  }
  for (const l of loads) if (!warehouses[mapping.warehouses[l.warehouse] ?? ""]) problems.push(`warehouse "${l.warehouse}" not in settings for ${l.bol}`);

  // ---- tags ----
  const allEpcs = Array.from(new Set(loads.flatMap((l) => l.tags.map((t) => t.epc))));
  const existingTags = new Set((await db.select({ id: tags.id }).from(tags).where(inArray(tags.id, allEpcs))).map((r) => r.id));
  const missingEpcs = allEpcs.filter((e) => !existingTags.has(e));
  if (missingEpcs.length && !mapping.missingTags.create) problems.push(`${missingEpcs.length} tags missing and creation disabled`);
  const assetByEpc: Record<string, string> = {};
  for (const r of await db.select({ id: assets.id, tagId: assets.tagId }).from(assets).where(and(inArray(assets.tagId, allEpcs), eq(assets.active, true)))) assetByEpc[r.tagId] = r.id;
  for (const e of allEpcs) if (existingTags.has(e) && !assetByEpc[e]) problems.push(`tag ${e} exists but has no active asset`);

  // ---- idempotency ----
  const existingBols = new Set((await db.select({ ref: bols.referenceId }).from(bols).where(inArray(bols.referenceId, loads.map((l) => l.bol)))).map((r) => r.ref));
  const todo = loads.filter((l) => !existingBols.has(l.bol));
  for (const l of loads) if (existingBols.has(l.bol)) log(`  skip ${l.bol}: BOL already present`);

  // ---- per-tag timeline: link returns to the latest prior outbound load ----
  const sorted = [...todo].sort((a, b) => a.ship_date.localeCompare(b.ship_date) || a.bol.localeCompare(b.bol));
  const lastOutbound: Record<string, string> = {};
  const returnsOf: Record<string, { count: number; last: string }> = {};
  const returnLink: Record<string, string | null> = {}; // `${bol}:${epc}` -> outbound bol
  for (const l of sorted) {
    for (const t of l.tags) {
      if (l.direction === "OUTBOUND") lastOutbound[t.epc] = l.bol;
      else {
        const ob = lastOutbound[t.epc] ?? null;
        returnLink[`${l.bol}:${t.epc}`] = ob;
        if (ob) { const r = (returnsOf[ob] ??= { count: 0, last: t.date }); r.count++; if (t.date > r.last) r.last = t.date; }
      }
    }
  }
  const finalStatus = (l: Load) => {
    if (l.direction === "INBOUND") return "RECEIVED";
    const r = returnsOf[l.bol];
    if (!r) return "SHIPPED";
    return r.count >= l.tags.length ? "RETURNED" : "RETURNED-PARTIAL";
  };

  // ---- plan report ----
  log(`\n${"BOL".padEnd(7)} ${"type".padEnd(8)} ${"status".padEnd(16)} ${"ship".padEnd(10)} ${"tags".padStart(4)} ${"ret".padStart(3)}  customer`);
  for (const l of sorted) log(`${l.bol.padEnd(7)} ${l.direction.padEnd(8)} ${finalStatus(l).padEnd(16)} ${l.ship_date.padEnd(10)} ${String(l.tags.length).padStart(4)} ${String(returnsOf[l.bol]?.count ?? "").padStart(3)}  ${mapping.customers[l.customer]?.name ?? l.customer}${l.notes.length ? "   [" + l.notes.join("; ") + "]" : ""}`);
  const unlinked = Object.entries(returnLink).filter(([, v]) => !v).map(([k]) => k);
  log(`\nloads to write: ${sorted.length}; tag links: ${sorted.reduce((n, l) => n + l.tags.length, 0)}; shipping events: ${sorted.filter((l) => l.direction === "OUTBOUND").reduce((n, l) => n + l.tags.length, 0)}; receiving events: ${sorted.filter((l) => l.direction === "INBOUND").reduce((n, l) => n + l.tags.length, 0)} (${unlinked.length} without a prior shipment)`);
  log(`contacts to create: ${contactsToCreate.map((c) => `${c.name} [${c.type}]`).join(", ") || "none"}`);
  log(`tags to create: ${missingEpcs.length}${missingEpcs.length ? " -> " + missingEpcs.map((e) => String(parseInt(e.slice(-6)))).join(", ") : ""}`);
  if (problems.length) { log(`\nPROBLEMS (${problems.length}):`); problems.forEach((p) => log("  - " + p)); }
  if (!execute) { log(problems.length ? "\nDry run finished with problems; nothing written." : "\nDry run OK; re-run with --execute to write."); return; }
  if (problems.length) throw new Error("refusing to execute with problems");

  // ---- execute ----
  await db.transaction(async (tx) => {
    const createdBy = creator.id;
    for (const c of contactsToCreate) {
      const [row] = await tx.insert(contacts).values({ id: uuidv4(), type: c.type, name: c.name, phone: [], email: [], active: true, createdBy, customAttributes: { source: "backfill-2026-10" } }).returning();
      if (c.type === "CARRIER") carrier = row;
      for (const [wbName, m] of Object.entries(mapping.customers)) if (m.name === c.name) customerIds[wbName] = row.id;
    }
    const firstDate: Record<string, string> = {};
    for (const l of sorted) for (const t of l.tags) if (!firstDate[t.epc] || t.date < firstDate[t.epc]) firstDate[t.epc] = t.date;
    for (const epc of missingEpcs) {
      const serial = epc.slice(-6);
      const commissioned = new Date(at(firstDate[epc], "12:00").getTime() - 86400000);
      await tx.insert(tags).values({ id: epc, serial, type: "tote", state: "AVAILABLE", customAttributes: mapping.missingTags.customAttributes, createdBy, createdAt: commissioned, updatedAt: commissioned });
      const assetId = uuidv4();
      await tx.insert(assets).values({ id: assetId, productId: product.id, tagId: epc, active: true, lastState: "CLEANED", createdBy, createdAt: commissioned, updatedAt: commissioned });
      await tx.insert(assetEvents).values({ id: uuidv4(), assetId, state: "CLEANED", process: "COMMISSIONING", comment: "Created by history backfill; label not in verification list", createdBy, createdAt: commissioned });
      assetByEpc[epc] = assetId;
    }

    const orderIdByBol: Record<string, string> = {};
    const touched = new Set<string>();
    for (const l of sorted) {
      const customerId = customerIds[l.customer]!;
      const customer = (await tx.select().from(contacts).where(eq(contacts.id, customerId)))[0];
      const wh = warehouses[mapping.warehouses[l.warehouse]];
      const receiver = l.direction === "OUTBOUND"
        ? { receiverName: customer.name, receiverAddressStreet: customer.addressStreet, receiverAddressCity: customer.addressCity, receiverAddressState: customer.addressState, receiverAddressZipCode: customer.addressZipCode, receiverAddressCountry: customer.addressCountry }
        : { receiverName: wh.name, receiverAddressStreet: wh.address?.street, receiverAddressCity: wh.address?.city, receiverAddressState: wh.address?.state, receiverAddressZipCode: wh.address?.zipCode, receiverAddressCountry: wh.address?.country };
      const status = finalStatus(l);
      const orderId = uuidv4();
      orderIdByBol[l.bol] = orderId;
      const shipAt = at(l.ship_date, T_SHIP);
      await tx.insert(orders).values({
        id: orderId, referenceId: l.bol, poNumber: l.po ?? "", carrierId: carrier.id, customerId, type: l.direction, status: status as any,
        requiredDate: shipAt, shipDate: shipAt, ...receiver, createdBy, updatedBy: createdBy, createdAt: at(l.order_date, T_INITIATED), updatedAt: shipAt,
      });
      await tx.insert(orderItems).values({ id: uuidv4(), orderId, productId: product.id, requiredQuantity: l.quantity });
      const comment = [`Backfilled from ${source.source}${l.sheet ? ` sheet ${l.sheet}` : ""}`, l.direction === "OUTBOUND" ? `picked from ${l.warehouse}` : `returned to ${l.warehouse}`, l.po_note, ...l.notes].filter(Boolean).join("; ");
      await tx.insert(orderEvents).values([
        { id: uuidv4(), orderId, status: "INITIATED", requiredQuantity: l.quantity, comment, createdBy, createdAt: at(l.order_date, T_INITIATED) },
        { id: uuidv4(), orderId, status: "APPROVED", requiredQuantity: l.quantity, createdBy, createdAt: at(l.order_date, T_APPROVED) },
        { id: uuidv4(), orderId, status: l.direction === "OUTBOUND" ? "SHIPPED" : "RECEIVED", requiredQuantity: l.quantity, quantity: l.tags.length, createdBy, createdAt: shipAt },
      ]);
      const bolId = uuidv4();
      await tx.insert(bols).values({ id: bolId, referenceId: l.bol, carrierId: carrier.id, orderId, orderType: l.direction, createdBy, updatedBy: createdBy, createdAt: shipAt, updatedAt: shipAt });
      await tx.insert(bolItems).values({ id: uuidv4(), bolId, productId: product.id, quantity: l.tags.length });
      const shipmentId = uuidv4();
      const lastDate = l.tags.reduce((m, t) => (t.date > m ? t.date : m), l.ship_date);
      await tx.insert(shipments).values({ id: shipmentId, referenceId: `SHIP-${l.bol}`, carrierId: carrier.id, orderType: l.direction, shipmentDate: shipAt, receivedDate: l.direction === "INBOUND" ? at(lastDate, T_RECEIVE) : null, createdBy, updatedBy: createdBy, createdAt: shipAt, updatedAt: shipAt });
      await tx.insert(shipmentBols).values({ id: uuidv4(), shipmentId, bolId });
      for (let i = 0; i < l.tags.length; i += 500) {
        const chunk = l.tags.slice(i, i + 500);
        await tx.insert(bolTags).values(chunk.map((t) => ({ id: uuidv4(), bolId, tagId: t.epc })));
        await tx.insert(assetEvents).values(chunk.map((t) => {
          const linkBol = l.direction === "OUTBOUND" ? l.bol : returnLink[`${l.bol}:${t.epc}`] ?? l.bol;
          return {
            id: uuidv4(), assetId: assetByEpc[t.epc], state: l.direction === "OUTBOUND" ? "ASSIGNED" : "RETURNED", process: l.direction === "OUTBOUND" ? "SHIPPING" : "RECEIVING",
            comment: `Backfill ${l.bol} (${source.source} ${t.sheet} row ${t.row})`, outboundOrderId: orderIdByBol[linkBol] ?? orderId, shipmentId, createdBy,
            createdAt: at(t.date, l.direction === "OUTBOUND" ? T_SHIP : T_RECEIVE),
          } as const;
        }));
        chunk.forEach((t) => touched.add(assetByEpc[t.epc]));
      }
    }
    // closing events for outbound orders with returns
    for (const l of sorted) {
      const r = returnsOf[l.bol];
      if (!r) continue;
      await tx.insert(orderEvents).values({ id: uuidv4(), orderId: orderIdByBol[l.bol], status: finalStatus(l) as any, requiredQuantity: l.quantity, quantity: r.count, comment: "Backfill: returns recorded on inbound loads", createdBy, createdAt: at(r.last, T_RECEIVE) });
    }
    // backdate COMMISSIONING events of pre-existing tags that were commissioned after their first historical
    // movement, to the day before that movement, so tag histories read in order
    const existingEpcs = Object.keys(firstDate).filter((e) => !missingEpcs.includes(e));
    let backdated = 0;
    for (let i = 0; i < existingEpcs.length; i += 1000) {
      const chunk = existingEpcs.slice(i, i + 1000);
      const vals = sql.join(chunk.map((e) => sql`(${e}, ${new Date(at(firstDate[e], "12:00").getTime() - 86400000).toISOString()}::timestamp)`), sql`, `);
      const r = await tx.execute(sql`
        update asset_events ev set created_at = v.commissioned
        from (values ${vals}) as v(epc, commissioned)
        join assets a on a.tag_id = v.epc
        where ev.asset_id = a.id and ev.process = 'COMMISSIONING' and ev.created_at > v.commissioned`);
      backdated += Number((r as any).rowCount ?? 0);
    }
    log(`backdated ${backdated} commissioning events`);
    // recompute last_state from the latest movement per touched asset (commissioning events are ignored)
    const ids = Array.from(touched);
    for (let i = 0; i < ids.length; i += 1000) {
      const chunk = ids.slice(i, i + 1000);
      await tx.execute(sql`
        update assets a set last_state = e.state, updated_at = e.created_at
        from (select distinct on (asset_id) asset_id, state, created_at from asset_events
              where asset_id in (${sql.join(chunk.map((x) => sql`${x}`), sql`, `)})
                and process <> 'COMMISSIONING'
              order by asset_id, created_at desc) e
        where a.id = e.asset_id`);
    }
    log(`\nwrote ${sorted.length} loads; assets touched ${ids.length}`);
  });
  const states = await db.execute(sql`select last_state, count(*)::int as n from assets group by 1 order by 1`);
  log("assets by state: " + (states.rows as any[]).map((r) => `${r.last_state}=${r.n}`).join(", "));
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
