# CleanTech Asset Tracking System

A comprehensive PostgreSQL-based API and frontend application for asset tracking, order management, and logistics operations.

## Features

- JWT Authentication with role-based permissions
- Complete contact/user management (CUSTOMER, CARRIER, PROCESSOR, ADMIN roles)
- Product catalog with custom attributes
- RFID tag and asset lifecycle management
- Order management with approval workflow (INITIATED → APPROVED → SHIPPED → RECEIVED)
- BOL (Bill of Lading) creation and tracking
- Shipment management with multi-BOL support
- PDF generation for orders and BOLs
- CSV import for tags and assets
- Swagger documentation at `/api-docs`

## Quick Start

### Running the Application

```bash
cp .env.example .env   # then fill in DATABASE_URL (and optionally JWT_SECRET/SMTP)
npm install
npm run db:push        # sync the Drizzle schema to your database
npm run dev
```

The application will be available at `http://localhost:5000`.

### Production Build

```bash
npm run build   # client → dist/public, server → dist/index.cjs
npm start
```

### Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

Alternative usernames: `amcdaniel`, `cceniceros`, `sgonzalez`, `kassif`, `christenr` (all with password: `admin123`)

## MongoDB Data Import

The database can be populated from MongoDB BSON exports using the import script.

### Prerequisites

Place your MongoDB BSON export files in the `mongodb_export/myworkapp/` directory. The expected files include:
- `roles.bson`
- `contacts.bson`
- `products.bson`
- `tags.bson`
- `assets.bson`
- `orders.bson`
- `orderevents.bson`
- `bols.bson`
- `shipments.bson`
- `assetevents.bson`
- `settings.bson`
- `customfields.bson`

### Running the Import

```bash
npx tsx server/import-mongodb.ts
```

### What the Import Script Does

1. **Clears existing data** - Removes all current data from the database
2. **Parses BSON files** - Reads MongoDB BSON export files
3. **Converts IDs** - Transforms MongoDB ObjectIds to PostgreSQL UUIDs with consistent mapping
4. **Handles relationships** - Imports data in correct order to respect foreign key constraints
5. **Sets up authentication** - Creates admin user credentials for login

### Import Order (respects foreign keys)

1. Roles
2. Contacts
3. Settings
4. Custom Fields
5. Products
6. Tags
7. Assets
8. Hierarchies (if present)
9. Orders & Order Events
10. BOLs (Bills of Lading)
11. Shipments
12. Asset Events

### Current Imported Data

- 8 roles
- 15 contacts
- 1 product
- 37,504 tags
- 37,504 assets
- 26 orders
- 49 order events
- 6 BOLs
- 6 shipments
- 2,567 asset events

### Performance

The import script processes approximately 37,500 tags and assets in ~25 seconds using batch inserts.

### Security Note

The import script sets a default password (`admin123`) for all admin/owner users. This is intended for **development environments only**. For production use, change passwords immediately after import.

## Tech Stack

- **Backend**: Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React + Vite + Shadcn UI
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **PDF Generation**: PDFKit
- **Documentation**: Swagger UI (OpenAPI 3.0)

## API Documentation

Access the Swagger API documentation at `/api-docs` when the server is running.

## Database Seeding (Alternative)

For a fresh database with minimal sample data:

```bash
npx tsx server/seed.ts
```

## Environment Variables

See [.env.example](.env.example) for the full list:

- `DATABASE_URL` - PostgreSQL connection string (required)
- `JWT_SECRET` - JWT signing secret (required in production)
- `PORT` - Server port (defaults to 5000; injected by the platform in production)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` - Email config (optional)

## Deployment

The app deploys to [Railway](https://railway.com) as a single Docker service (Express serves both the API and the built client) with a Railway PostgreSQL database, fronted by [Cloudflare](https://cloudflare.com) for DNS/CDN/TLS. See [MIGRATION.md](MIGRATION.md) for the full runbook.
