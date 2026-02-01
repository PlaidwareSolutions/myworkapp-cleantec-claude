# Business Processes

## Overview

The CleanTech system supports two main operational processes:

1. **Shipping Process** - OUTBOUND orders going to Farmers
2. **Receiving Process** - INBOUND orders returning from Processors

---

## Shipping Process (OUTBOUND)

### Purpose
Deliver clean containers from the warehouse to Farmers who will use them for harvesting.

### Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OUTBOUND SHIPPING PROCESS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. ORDER CREATION                                                           │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • Farmer requests containers (or office creates on behalf)      │      │
│     │ • Select products and quantities needed                         │      │
│     │ • Set required delivery date                                    │      │
│     │ • Assign carrier for transport                                  │      │
│     │ • Status: INITIATED                                             │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  2. ORDER APPROVAL                                                           │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • Manager reviews order details                                 │      │
│     │ • Verifies inventory availability                               │      │
│     │ • Approves order for fulfillment                                │      │
│     │ • Status: APPROVED                                              │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  3. SHIPMENT CREATION                                                        │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • Warehouse staff prepares containers                           │      │
│     │ • RFID tags scanned to identify assets                          │      │
│     │ • Assets verified as CLEANED status                             │      │
│     │ • Driver information recorded                                   │      │
│     │ • Bill of Lading (BOL) generated                                │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  4. ASSET STATE UPDATE                                                       │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • Each scanned asset: State → ASSIGNED                          │      │
│     │ • Process: SHIPPING                                             │      │
│     │ • Asset event created with order reference                      │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  5. ORDER STATUS UPDATE                                                      │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • If all items shipped: Status → SHIPPED                        │      │
│     │ • If partial shipment: Status → SHIPPED-PARTIAL                 │      │
│     │ • Order event logged                                            │      │
│     │ • Email notification sent                                       │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  6. DELIVERY                                                                 │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • Carrier transports to Farmer location                         │      │
│     │ • Farmer receives containers                                    │      │
│     │ • Containers used for harvesting                                │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Validations
- Order must be in APPROVED status before shipment
- Only CLEANED assets can be shipped
- Scanned tags must match active assets
- No duplicate tags across BOLs in same shipment

### Documents Generated
- **Order PDF** - Order confirmation with details
- **BOL PDF** - Bill of Lading for carrier

---

## Receiving Process (INBOUND)

### Purpose
Receive dirty containers back from Processors and return them to inventory for cleaning.

### Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INBOUND RECEIVING PROCESS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. ORDER CREATION                                                           │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • Processor requests return pickup                              │      │
│     │ • Specify products and quantities to return                     │      │
│     │ • Set pickup date                                               │      │
│     │ • Assign carrier for transport                                  │      │
│     │ • Status: INITIATED                                             │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  2. ORDER APPROVAL                                                           │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • Manager reviews return request                                │      │
│     │ • Schedules carrier pickup                                      │      │
│     │ • Approves order                                                │      │
│     │ • Status: APPROVED                                              │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  3. PICKUP & TRANSPORT                                                       │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • Carrier picks up from Processor                               │      │
│     │ • BOL created with item quantities                              │      │
│     │ • Shipment record created                                       │      │
│     │ • Status: SHIPPED                                               │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  4. WAREHOUSE RECEIVING                                                      │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • Shipment arrives at warehouse                                 │      │
│     │ • receivedDate set on shipment                                  │      │
│     │ • Assets scanned and verified                                   │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  5. ASSET STATE UPDATE                                                       │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • Each received asset: State → RETURNED                         │      │
│     │ • Process: RECEIVING                                            │      │
│     │ • Asset event created                                           │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  6. ORDER STATUS UPDATE                                                      │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • If all items received: Status → RETURNED                      │      │
│     │ • If partial receipt: Status → RETURNED-PARTIAL                 │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                              │                                               │
│                              ▼                                               │
│  7. INSPECTION & CLEANING                                                    │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │ • Assets inspected for damage                                   │      │
│     │ • Damaged assets marked for repair                              │      │
│     │ • Clean assets: State → CLEANED                                 │      │
│     │ • Ready for next OUTBOUND cycle                                 │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Differences from OUTBOUND
- Items are specified by quantity (not individual tag scans at creation)
- Asset scanning happens at receiving, not shipping
- Creates RETURNED + RECEIVING asset events
- Triggers inspection workflow

---

## Shipment Structure

A single shipment can contain multiple orders, each with its own BOL:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SHIPMENT                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Shipment ID: SH-2024-001                                               │  │
│  │ Carrier: ABC Transport                                                 │  │
│  │ Driver: John Smith                                                     │  │
│  │ Ship Date: 2024-01-15                                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                   │
│  │        BOL #1           │  │        BOL #2           │                   │
│  ├─────────────────────────┤  ├─────────────────────────┤                   │
│  │ Order: ORD-001          │  │ Order: ORD-002          │                   │
│  │ Customer: Farm A        │  │ Customer: Farm B        │                   │
│  ├─────────────────────────┤  ├─────────────────────────┤                   │
│  │ Items:                  │  │ Items:                  │                   │
│  │ - 100x Large Bins       │  │ - 50x Medium Totes      │                   │
│  │ - 50x Small Totes       │  │ - 25x Large Bins        │                   │
│  ├─────────────────────────┤  ├─────────────────────────┤                   │
│  │ Tags:                   │  │ Tags:                   │                   │
│  │ - TAG001, TAG002...     │  │ - TAG201, TAG202...     │                   │
│  └─────────────────────────┘  └─────────────────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints for Processes

### Shipping (OUTBOUND)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/order/create` | POST | Create OUTBOUND order |
| `/api/order/:id/approve` | POST | Approve for shipping |
| `/api/tracking/shipment/create` | POST | Create shipment with BOLs |
| `/api/tracking/bol/:id/pdf` | GET | Download BOL document |

### Receiving (INBOUND)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/order/create` | POST | Create INBOUND order |
| `/api/order/:id/approve` | POST | Approve for pickup |
| `/api/tracking/shipment/create` | POST | Create shipment with quantities |
| `/api/tracking/shipment/:id` | PUT | Mark as received (set receivedDate) |
| `/api/entity/asset/inspect` | POST | Inspect returned assets |

---

## Notifications

The system sends email notifications at key points:
- Order approved
- Shipment created
- Order status changes

Configured via SMTP environment variables:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
