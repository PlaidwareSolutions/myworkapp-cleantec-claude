# CleanTech Asset Tracking System

## Overview

The CleanTech Asset Tracking System is a comprehensive application built to track reusable bins, totes, and containers used in the farming industry. The application is designed for a company that specializes in cleaning and sanitizing these agricultural containers.

## Business Context

### The Company
- Operates multiple warehouses for storing, cleaning, and shipping containers
- Owns and maintains a fleet of reusable bins/totes/containers
- Provides cleaning and sanitization services for agricultural containers

### Key Stakeholders

| Stakeholder | Role in System | Order Type |
|-------------|----------------|------------|
| **Farmers** | Customers who receive clean containers | OUTBOUND |
| **Processors** | Facilities that clean produce and return dirty containers | INBOUND |
| **Carriers** | Transport companies that pick up and deliver shipments | Transport |
| **Company Staff** | Manage operations, orders, and assets | Operations |

## Core Business Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLEANTECH ASSET LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌───────────┐    OUTBOUND Order     ┌──────────┐                          │
│   │           │ ─────────────────────▶│          │                          │
│   │ WAREHOUSE │   (Clean Containers)  │  FARMER  │                          │
│   │           │                       │          │                          │
│   └─────┬─────┘                       └────┬─────┘                          │
│         │                                  │                                 │
│         │                                  │ Farmer uses containers         │
│    Clean│                                  │ for harvesting crops           │
│    Assets                                  │                                 │
│         │                                  ▼                                 │
│         │                            ┌───────────┐                          │
│         │                            │           │                          │
│         │                            │ PROCESSOR │                          │
│         │                            │           │                          │
│         │                            └─────┬─────┘                          │
│         │                                  │                                 │
│         │      INBOUND Order               │                                 │
│         │◀─────────────────────────────────┘                                │
│         │    (Dirty Containers)                                             │
│         │                                                                    │
│         ▼                                                                    │
│   ┌───────────┐                                                             │
│   │  INSPECT  │◀──── Asset arrives, gets inspected                          │
│   │  & CLEAN  │      Damaged items repaired or decommissioned               │
│   └───────────┘                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Asset Management
- Track individual containers via RFID tags
- Monitor asset lifecycle from commissioning to decommissioning
- Record inspection and cleaning status
- Identify damaged or fixed items

### 2. Order Management
- Create and manage OUTBOUND orders (to Farmers)
- Create and manage INBOUND orders (from Processors)
- Approval workflow with status tracking
- PDF generation for order documentation

### 3. Shipment & BOL Tracking
- Track carrier pickups and deliveries
- Generate Bills of Lading (BOLs)
- Link assets to specific shipments
- Monitor shipment status

### 4. Inventory & Analytics
- Real-time inventory levels
- Asset status breakdown
- Order activity tracking
- Customer-based asset distribution

## System Architecture

### Technology Stack
- **Frontend**: React with TypeScript, Shadcn UI components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based with role-based permissions
- **Documentation**: Swagger/OpenAPI

### Key Modules
- **Processes**: Orders, Shipments, Inventory management
- **Setup**: Products, Contacts, Tags, Devices configuration
- **Settings**: Application configuration
- **Activities**: Analytics and reporting

## Documentation Index

| Document | Description |
|----------|-------------|
| [Data Model](./DATA-MODEL.md) | Database entities and relationships |
| [Order Lifecycle](./ORDER-LIFECYCLE.md) | Order statuses, transitions, and rules |
| [Asset Lifecycle](./ASSET-LIFECYCLE.md) | Asset states, processes, and events |
| [Roles & Permissions](./ROLES-PERMISSIONS.md) | User roles and access control |
| [Processes](./PROCESSES.md) | Shipping and receiving workflows |

## Quick Start

### Login Credentials
- **Username**: admin
- **Password**: admin123

### API Documentation
Access Swagger documentation at `/api-docs`

## Related Resources
- Main application configuration: `/replit.md`
- Database schema: `/shared/schema.ts`
- API routes: `/server/routes/`
