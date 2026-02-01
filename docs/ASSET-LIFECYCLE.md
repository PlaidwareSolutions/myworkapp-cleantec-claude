# Asset Lifecycle

## What is an Asset?

An **Asset** represents a trackable container unit - the combination of:
- A **Product** (type of bin/tote/container)
- An **RFID Tag** (unique identifier attached to the physical item)

```
Asset = Product + Tag
```

When an RFID tag is physically attached to a container item, that combination is registered in the system as an Asset with a unique ID.

---

## Asset States

Assets move through various states during their lifecycle:

| State | Description | Typical Location |
|-------|-------------|------------------|
| **CLEANED** | Ready for shipment, sanitized | Warehouse |
| **ASSIGNED** | Allocated to an order/shipment | In transit |
| **PROCESSING** | At processor facility | Processor |
| **RETURNED** | Returned from processor | Receiving dock |
| **DAMAGED** | Needs repair | Inspection area |
| **FIXED** | Repaired and ready | Warehouse |
| **DECOMMISSIONED** | No longer in service | Retired |

---

## Asset Processes

Each state change is triggered by a specific process:

| Process | Description | Resulting States |
|---------|-------------|------------------|
| **COMMISSIONING** | New asset registration | RETURNED (initial) |
| **INSPECTION** | Quality check/cleaning | CLEANED, DAMAGED, FIXED |
| **SHIPPING** | Shipped on OUTBOUND order | ASSIGNED |
| **RECEIVING** | Received on INBOUND order | RETURNED |
| **PROCESSING** | At processor facility | PROCESSING |

---

## Complete Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ASSET LIFECYCLE FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     1. COMMISSIONING                                 │   │
│   │                                                                      │   │
│   │   CSV Import or Manual Registration                                  │   │
│   │         │                                                            │   │
│   │         ▼                                                            │   │
│   │   ┌───────────┐                                                      │   │
│   │   │ CLEANED   │ (default lastState) + COMMISSIONING event            │   │
│   │   └─────┬─────┘                                                      │   │
│   └─────────┼────────────────────────────────────────────────────────────┘   │
│             │                                                                │
│             ▼                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     2. INSPECTION                                    │   │
│   │                                                                      │   │
│   │   Asset inspected and cleaned                                        │   │
│   │         │                                                            │   │
│   │         ├──────────────┬──────────────┐                              │   │
│   │         ▼              ▼              ▼                              │   │
│   │   ┌─────────┐    ┌─────────┐    ┌─────────┐                          │   │
│   │   │ CLEANED │    │ DAMAGED │    │  FIXED  │                          │   │
│   │   └────┬────┘    └────┬────┘    └────┬────┘                          │   │
│   │        │              │              │                               │   │
│   │        │              ▼              │                               │   │
│   │        │        (Repair needed)      │                               │   │
│   │        │              │              │                               │   │
│   │        ◀──────────────┴──────────────┘                               │   │
│   └────────┼─────────────────────────────────────────────────────────────┘   │
│            │                                                                 │
│            ▼                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     3. SHIPPING (OUTBOUND)                           │   │
│   │                                                                      │   │
│   │   Asset scanned and shipped to Farmer                                │   │
│   │         │                                                            │   │
│   │         ▼                                                            │   │
│   │   ┌───────────┐                                                      │   │
│   │   │ ASSIGNED  │ + SHIPPING process                                   │   │
│   │   └─────┬─────┘                                                      │   │
│   └─────────┼────────────────────────────────────────────────────────────┘   │
│             │                                                                │
│             ▼                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     4. PROCESSING                                    │   │
│   │                                                                      │   │
│   │   Asset at Processor facility (tracked via stats)                    │   │
│   │         │                                                            │   │
│   │         ▼                                                            │   │
│   │   ┌────────────┐                                                     │   │
│   │   │ PROCESSING │ + PROCESSING process                                │   │
│   │   └─────┬──────┘                                                     │   │
│   └─────────┼────────────────────────────────────────────────────────────┘   │
│             │                                                                │
│             ▼                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     5. RECEIVING (INBOUND)                           │   │
│   │                                                                      │   │
│   │   Asset returned from Processor                                      │   │
│   │         │                                                            │   │
│   │         ▼                                                            │   │
│   │   ┌───────────┐                                                      │   │
│   │   │ RETURNED  │ + RECEIVING process                                  │   │
│   │   └─────┬─────┘                                                      │   │
│   └─────────┼────────────────────────────────────────────────────────────┘   │
│             │                                                                │
│             │ (Cycle repeats)                                                │
│             └──────────────────────────────────▶ Back to INSPECTION         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Asset Events

Every state change is recorded as an **Asset Event** for complete traceability:

### Event Fields

| Field | Type | Description |
|-------|------|-------------|
| assetId | varchar | The asset that changed |
| state | enum | New state of the asset |
| process | enum | Process that triggered the change |
| comment | text | Optional notes |
| outboundOrderId | varchar | Related OUTBOUND order (if applicable) |
| shipmentId | varchar | Related shipment (if applicable) |
| createdBy | varchar | User who made the change |
| createdAt | timestamp | When the change occurred |

### Event Examples

| Scenario | State | Process | Notes |
|----------|-------|---------|-------|
| New asset registered via CSV | RETURNED | COMMISSIONING | Initial registration event (lastState defaults to CLEANED) |
| Asset passed inspection | CLEANED | INSPECTION | Ready for use |
| Asset failed inspection | DAMAGED | INSPECTION | Needs repair |
| Asset repaired | FIXED | INSPECTION | Back in service |
| Shipped to farmer | ASSIGNED | SHIPPING | On OUTBOUND order |
| At processor location | PROCESSING | PROCESSING | Being processed |
| Returned from processor | RETURNED | RECEIVING | On INBOUND order |
| Retired from service | DECOMMISSIONED | INSPECTION | End of life |

**Note on Commissioning:** When assets are imported via CSV, an asset event with state RETURNED + process COMMISSIONING is created, but the asset's `lastState` field defaults to CLEANED in the database schema.

---

## Key Tracking Points

### 1. OUTBOUND Shipping
When assets are scanned for an OUTBOUND shipment:
- State changes to `ASSIGNED`
- Process is `SHIPPING`
- `outboundOrderId` links to the order

### 2. INBOUND Receiving
When assets are received from processors:
- State changes to `RETURNED`
- Process is `RECEIVING`
- Ready for inspection cycle

### 3. Statistics Tracking
The system counts asset events to provide analytics:
- `ASSIGNED + SHIPPING` = Items shipped out
- `PROCESSING + PROCESSING` = Items at processors
- `RETURNED + RECEIVING` = Items received back

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/entity/asset/:id` | GET | Get asset details with history |
| `/api/entity/asset/:id` | PUT | Update asset |
| `/api/entity/asset/inspect` | POST | Bulk inspect assets |
| `/api/entity/product/:id/import` | POST | Import assets via CSV |

---

## Asset Tracking Field

The `lastState` field on each Asset record always reflects the current state, updated whenever a new Asset Event is created. This provides quick access to current status without querying the event history.
