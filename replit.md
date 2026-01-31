# CleanTech Asset Tracking API

## Overview
A comprehensive PostgreSQL-based API for asset tracking, order management, and logistics operations. Converted from MongoDB to PostgreSQL using Drizzle ORM.

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

### Authentication
- `POST /api/user/login` - User login
- `GET /api/user/me` - Get current user

### Roles & System Users
- `GET/POST /api/user/role` - Role management
- `POST /api/user/create-system-user/:contactId` - Create system user
- `PUT /api/user/update-system-user/:contactId` - Update system user

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
- `GET /api/order/:id/pdf` - Download order PDF
- `POST /api/order/:id/approve` - Approve order
- `POST /api/order/:id/cancel` - Cancel order

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
- `GET/POST /api/hierarchy/levels` - Hierarchy levels
- `GET/POST /api/hierarchy/nodes` - Hierarchy nodes

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
15+ tables including:
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
- `hierarchy_levels` / `hierarchy_nodes` - Organizational hierarchy

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `SESSION_SECRET` - Session secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email config (optional)
- `JWT_SECRET` - JWT signing secret (defaults to built-in)

## Running the Seed
```bash
npx tsx server/seed.ts
```

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
