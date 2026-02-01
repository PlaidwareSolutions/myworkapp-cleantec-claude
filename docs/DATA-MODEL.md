# Data Model

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLEANTECH DATA MODEL                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                             │
│  │ PRODUCTS │     │   TAGS   │     │  ASSETS  │                             │
│  │          │     │          │     │          │                             │
│  │ - id     │◀────│ - id(EPC)│────▶│ - id     │                             │
│  │ - name   │     │ - serial │     │ - tagId  │                             │
│  │ - weight │     │ - state  │     │ - prodId │                             │
│  │ - active │     └──────────┘     │-lastState│                             │
│  └──────────┘                      └────┬─────┘                             │
│                                         │                                    │
│                                         ▼                                    │
│                                  ┌─────────────┐                            │
│                                  │ASSET_EVENTS │                            │
│                                  │             │                            │
│                                  │ - state     │                            │
│                                  │ - process   │                            │
│                                  └─────────────┘                            │
│                                                                              │
│  ┌──────────┐     ┌─────────────┐     ┌───────────┐                         │
│  │ CONTACTS │◀────│   ORDERS    │────▶│ORDER_ITEMS│                         │
│  │          │     │             │     │           │                         │
│  │ - type   │     │ - type      │     │ - prodId  │                         │
│  │ - name   │     │ - status    │     │ - reqQty  │                         │
│  │ - email[]│     └──────┬──────┘     └───────────┘                         │
│  └──────────┘            │                                                   │
│                          ▼                                                   │
│                    ┌───────────┐     ┌───────────┐                          │
│                    │   BOLs    │────▶│ BOL_ITEMS │                          │
│                    │           │     │           │                          │
│                    └─────┬─────┘     └───────────┘                          │
│                          │                                                   │
│                          ▼                                                   │
│                    ┌───────────┐                                            │
│                    │ SHIPMENTS │                                            │
│                    │-driverName│                                            │
│                    │-receivedDt│                                            │
│                    └───────────┘                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Entities

### Products

Products represent the types of bins, totes, or containers available in the system.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| name | text | Product name |
| description | text | Product description |
| weight | real | Product weight (default: 0) |
| active | boolean | Whether product is active (default: false) |
| customAttributes | jsonb | Flexible custom fields |
| createdBy | varchar(36) | User who created |
| createdAt | timestamp | Creation timestamp |

### Tags

RFID tags that are physically attached to container items.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(255) | Primary key - the EPC (Electronic Product Code) |
| serial | varchar(255) | Serial number |
| type | varchar(100) | Tag type |
| model | varchar(100) | Tag model |
| provider | varchar(100) | Tag provider |
| brand | varchar(100) | Tag brand |
| upc | varchar(100) | Universal Product Code |
| state | enum | COMMISSIONED, AVAILABLE, DECOMMISSIONED |
| customAttributes | jsonb | Flexible custom fields |
| createdBy | varchar(36) | User who created |
| createdAt | timestamp | Creation timestamp |

### Assets

An Asset represents the combination of a Product and a Tag - a trackable container unit.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| productId | varchar(36) | Reference to Products |
| tagId | varchar(255) | Reference to Tags (EPC) |
| active | boolean | Whether asset is active (default: true) |
| lastState | enum | Current asset state (default: CLEANED) |
| createdBy | varchar(36) | User who created |
| createdAt | timestamp | Creation timestamp |

**Asset States:**
- `CLEANED` - Ready for shipment
- `ASSIGNED` - Assigned to an order/shipment
- `PROCESSING` - At processor location
- `RETURNED` - Returned from processor
- `DAMAGED` - Needs repair
- `FIXED` - Repaired and ready
- `DECOMMISSIONED` - No longer in service

### Asset Events

Tracks the lifecycle history of each asset.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| assetId | varchar(36) | Reference to Assets |
| state | enum | State at this event |
| process | enum | Process that triggered event |
| comment | text | Optional notes |
| outboundOrderId | varchar(36) | Related outbound order |
| shipmentId | varchar(36) | Related shipment |
| createdBy | varchar(36) | User who created |
| createdAt | timestamp | Event timestamp |

**Process Types:**
- `COMMISSIONING` - Initial asset registration
- `SHIPPING` - Shipping to customer
- `RECEIVING` - Receiving from processor
- `PROCESSING` - At processor facility
- `INSPECTION` - Inspection/cleaning

---

## Order Entities

### Contacts

Represents customers, carriers, and processors in the system.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| type | varchar(50) | References roles.id (CUSTOMER, CARRIER, PROCESSOR, etc.) |
| active | boolean | Whether contact is active |
| name | text | Contact name |
| phone | text[] | Array of phone numbers |
| email | text[] | Array of email addresses |
| notification | boolean | Email notification preference |
| businessDetails | text | Business information |
| profilePicture | text | Profile image URL |
| customAttributes | jsonb | Flexible custom fields |
| addressStreet | text | Street address |
| addressCity | text | City |
| addressState | text | State/Province |
| addressZipCode | text | Postal code |
| addressCountry | text | Country |
| systemUserActive | boolean | Whether system login is enabled |
| systemUserUsername | varchar(255) | System login username (unique) |
| systemUserPasswordHash | text | Hashed password |
| systemUserPasswordLastChanged | timestamp | Password last changed |
| systemUserLastLogin | timestamp | Last login timestamp |
| createdBy | varchar(36) | User who created |
| createdAt | timestamp | Creation timestamp |

### Orders

Tracks requests for container shipments.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| referenceId | varchar(50) | Human-readable order number |
| poNumber | varchar(100) | Purchase order number |
| type | enum | OUTBOUND, INBOUND |
| status | enum | Order status (see Order Lifecycle) |
| customerId | varchar(36) | Customer contact |
| carrierId | varchar(36) | Carrier contact |
| requiredDate | timestamp | Requested delivery date |
| shipDate | timestamp | Actual ship date |
| palletCount | integer | Number of pallets |
| palletWeight | real | Weight of pallets |
| binWeight | real | Weight of bins |
| orderWeight | real | Total order weight |
| receiverName | text | Receiver name (for delivery) |
| receiverAddressStreet | text | Receiver street address |
| receiverAddressCity | text | Receiver city |
| receiverAddressState | text | Receiver state |
| receiverAddressZipCode | text | Receiver postal code |
| receiverAddressCountry | text | Receiver country |
| pdfKey | text | Generated PDF file key |
| createdBy | varchar(36) | User who created |
| createdAt | timestamp | Creation timestamp |

**Note:** Driver information (driverName, driverDl) is stored on the Shipment record, not the Order.

### Order Items

Line items within an order specifying products and quantities.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| orderId | varchar(36) | Reference to Orders |
| productId | varchar(36) | Reference to Products |
| requiredQuantity | integer | Ordered quantity |

**Note:** Shipped quantity is calculated from BOL items, not stored on order items.

### Order Events

Audit trail of order status changes.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| orderId | varchar(36) | Reference to Orders |
| status | enum | Status at this event |
| requiredQuantity | integer | Required quantity at time of event |
| quantity | integer | Quantity involved in this event |
| comment | text | Optional notes/comments |
| createdBy | varchar(36) | User who created |
| createdAt | timestamp | Event timestamp |

---

## Shipment Entities

### Shipments

Represents a carrier pickup event that may contain multiple orders.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| referenceId | varchar(50) | Shipment number (auto-generated) |
| carrierId | varchar(36) | Carrier contact |
| orderType | enum | OUTBOUND, INBOUND |
| shipmentDate | timestamp | Pickup/ship date |
| receivedDate | timestamp | Delivery/received date (marks shipment as received) |
| driverName | varchar(255) | Driver name |
| driverDl | varchar(100) | Driver license number |
| createdBy | varchar(36) | User who created |
| createdAt | timestamp | Creation timestamp |

### BOLs (Bills of Lading)

Documents that tie assets to a specific order within a shipment.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| referenceId | varchar(50) | BOL number |
| orderId | varchar(36) | Reference to Orders |
| orderType | enum | OUTBOUND, INBOUND |
| carrierId | varchar(36) | Carrier contact |
| createdBy | varchar(36) | User who created |
| createdAt | timestamp | Creation timestamp |

### BOL Items

Products and quantities included in a BOL.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| bolId | varchar(36) | Reference to BOLs (cascade delete) |
| productId | varchar(36) | Reference to Products |
| quantity | integer | Quantity of product (default: 0) |

### BOL Tags

Individual asset tags included in a BOL (for OUTBOUND shipments with scanned assets).

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| bolId | varchar(36) | Reference to BOLs (cascade delete) |
| tagId | varchar(255) | Reference to Tags (EPC) |

### Shipment BOLs

Junction table linking shipments to their BOLs.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key (UUID) |
| shipmentId | varchar(36) | Reference to Shipments (cascade delete) |
| bolId | varchar(36) | Reference to BOLs |

---

## Supporting Entities

### Roles

User roles with permission configurations.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(50) | Role name (primary key) |
| permissions | jsonb | Permission flags |

### Settings

Application-wide configuration.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | Primary key |
| companyName | varchar(100) | Company name |
| address | text | Company address |
| phone | varchar(20) | Company phone |
| email | varchar(100) | Company email |
| logo | text | Logo URL/path |

### Hierarchies / Hierarchy Levels / Hierarchy Nodes

Organizational structure for warehouses and locations.

---

## Key Relationships

1. **Asset = Product + Tag**: An asset is created when an RFID tag is attached to a product item
2. **Order → Order Items**: Each order contains one or more line items
3. **Order → BOL → Shipment**: Orders are fulfilled via BOLs which are grouped into shipments
4. **Asset Events**: Track every state change of an asset throughout its lifecycle
5. **Contacts**: Can be Customers (Farmers), Processors, or Carriers with optional system login
