# CleanTech Asset Tracking API

## Overview
A comprehensive PostgreSQL-based application for tracking reusable bins, totes, and containers used in the farming industry. Built for a cleaning/sanitization company that manages container lifecycle from warehouse to farmers (OUTBOUND) and back from processors (INBOUND).

## Documentation
Detailed documentation is available in the `/docs` folder:
- [README](./docs/README.md) - Application overview and purpose
- [Data Model](./docs/DATA-MODEL.md) - Database entities and relationships
- [Order Lifecycle](./docs/ORDER-LIFECYCLE.md) - Order statuses, transitions, and editing rules
- [Asset Lifecycle](./docs/ASSET-LIFECYCLE.md) - Asset states, processes, and event tracking
- [Roles & Permissions](./docs/ROLES-PERMISSIONS.md) - User roles and access control
- [Processes](./docs/PROCESSES.md) - Shipping (OUTBOUND) and receiving (INBOUND) workflows

## Technical Stack
- **Backend**: Express + TypeScript with PostgreSQL (Drizzle ORM)
- **Frontend**: React + TypeScript with Shadcn UI components
- **Authentication**: JWT with role-based permissions

## Current State
**Fully functional API with 50+ endpoints**

### Features Implemented
- JWT Authentication with role-based permissions
- Complete contact/user management (CUSTOMER, CARRIER, PROCESSOR, ADMIN roles)
- Product catalog with custom attributes
- RFID tag and asset lifecycle management
- Order management with approval workflow (INITIATED → APPROVED → SHIPPED → RECEIVED)
- BOL (Bill of Lading) creation and tracking
- Shipment management with multi-BOL support
- PDF generation for orders and BOLs
- CSV import for tags and assets
- Email notification service (SMTP configurable)
- Swagger documentation at /api-docs
- Statistics and analytics endpoints

## Login Credentials
- **Username**: admin
- **Password**: admin123

## API Endpoints Summary

### Authentication & Setup
- `GET /api/user/setup-status` - Check if initial setup is required (no admin users exist)
- `POST /api/user/setup` - Create first admin user (only works when no admin users exist)
- `POST /api/user/login` - User login
- `GET /api/user/me` - Get current user

### Roles & System Users
- `GET/POST /api/user/role` - Role management
- `POST /api/user/create-system-user/:contactId` - Create system user
- `PUT /api/user/update-system-user/:contactId` - Update system user
- `DELETE /api/user/delete-system-user/:contactId` - Delete system user (admin only)
- `POST /api/user/reset-password/:contactId` - Reset user password (admin only)
- `POST /api/user/change-password` - Change own password (authenticated)

### Contacts
- `GET/POST /api/contact` - Contact management
- `GET/PUT /api/contact/:id` - Single contact operations

### Products, Tags & Assets
- `GET/POST /api/entity/product` - Product catalog
- `POST /api/entity/product/:id/import` - CSV import for product assets
- `GET/POST /api/entity/tag` - Tag management
- `POST /api/entity/tag/import` - Bulk tag import
- `GET/PUT /api/entity/asset/:id` - Asset management
- `POST /api/entity/asset/inspect` - Asset inspection

### Orders
- `POST /api/order/create` - Create order
- `GET /api/order` - List orders with filters
- `GET /api/order/:id` - Get order with full details
- `PUT /api/order/:id` - Update order (when status allows)
- `GET /api/order/:id/pdf` - Download order PDF
- `POST /api/order/:id/approve` - Approve order
- `POST /api/order/:id/cancel` - Cancel order
- `POST /api/order/:id/revoke` - Revoke order approval

### Order Editing Rules
Orders are editable based on their status:
- **INITIATED**: Full editing (customer, carrier, PO number, dates) + Approve/Cancel buttons
- **APPROVED + OUTBOUND**: Driver info editable + Update/Revoke/Cancel buttons
- **SHIPPED/RECEIVED/CANCELLED**: Read-only mode (no editing allowed)

### Tracking (BOLs & Shipments)
- `GET /api/tracking/bol` - List BOLs
- `GET /api/tracking/bol/:id/pdf` - Download BOL PDF
- `POST /api/tracking/shipment/create` - Create shipment
- `GET /api/tracking/shipment` - List shipments

### Statistics
- `GET /api/stats/activity/orders` - Order activity
- `GET /api/stats/asset/status` - Asset status breakdown
- `GET /api/stats/asset/customer` - Assets by customer

### Settings & Hierarchy
- `GET/PUT /api/settings` - Application settings
- `GET/POST /api/hierarchy` - Hierarchies (parent containers)
- `GET/PUT/DELETE /api/hierarchy/:id` - Single hierarchy operations
- `GET /api/hierarchy/:id/tree` - Full hierarchy tree
- `GET/POST /api/hierarchy/levels` - Hierarchy levels
- `PUT/DELETE /api/hierarchy/levels/:id` - Level operations
- `GET/POST /api/hierarchy/nodes` - Hierarchy nodes
- `PUT/DELETE /api/hierarchy/nodes/:id` - Node operations

## Tech Stack
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **PDF Generation**: PDFKit
- **Email**: Nodemailer
- **Documentation**: Swagger UI (OpenAPI 3.0)
- **File Upload**: Multer
- **CSV Parsing**: csv-parse

## Database Schema
17+ tables including:
- `roles` - User roles with permissions
- `contacts` - Customers, carriers, processors with system user auth
- `products` - Product catalog
- `tags` - RFID/EPC tags
- `assets` - Asset instances linked to products/tags
- `asset_events` - Asset state history
- `orders` / `order_items` / `order_events` - Order management
- `bols` / `bol_items` / `bol_tags` - Bill of Lading
- `shipments` / `shipment_bols` - Shipment tracking
- `settings` - Application configuration
- `custom_fields` - Custom field definitions
- `hierarchies` - Parent container for hierarchy structures
- `hierarchy_levels` / `hierarchy_nodes` - Organizational hierarchy with parent reference

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `SESSION_SECRET` - Session secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email config (optional)
- `JWT_SECRET` - JWT signing secret (defaults to built-in)

## Running the Seed
```bash
npx tsx server/seed.ts
```

## MongoDB Import Script
The database can be populated from MongoDB BSON exports using:
```bash
npx tsx server/import-mongodb.ts
```

This script:
- Parses BSON files from `mongodb_export/myworkapp/` directory
- Converts MongoDB ObjectIds to PostgreSQL UUIDs
- Handles foreign key relationships in correct order
- Processes 37,504 tags/assets in ~25 seconds
- Sets up admin user (username: admin, password: admin123)

**Current imported data:**
- 8 roles, 15 contacts, 1 product
- 37,504 tags and assets
- 26 orders, 6 BOLs, 6 shipments
- 2,567 asset events

**Other login usernames:** amcdaniel, cceniceros, sgonzalez, kassif, christenr (password: admin123)

## Project Structure
```
server/
├── routes/          # API route handlers
│   ├── user.routes.ts
│   ├── contact.routes.ts
│   ├── entity.routes.ts
│   ├── order.routes.ts
│   ├── tracking.routes.ts
│   ├── stats.routes.ts
│   ├── settings.routes.ts
│   └── hierarchy.routes.ts
├── middleware/
│   └── auth.ts      # JWT authentication middleware
├── services/
│   ├── email.ts     # Email notification service
│   └── pdf.ts       # PDF generation service
├── db.ts            # Database connection
├── storage.ts       # Data access layer
├── routes.ts        # Route registration
├── swagger.ts       # OpenAPI documentation
└── seed.ts          # Database seeding

shared/
└── schema.ts        # Drizzle schema definitions
```
