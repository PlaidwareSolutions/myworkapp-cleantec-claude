# Order Lifecycle

## Order Types

The system handles two types of orders based on the direction of container movement:

| Type | Direction | Description |
|------|-----------|-------------|
| **OUTBOUND** | Warehouse → Farmer | Clean containers shipped to farmers |
| **INBOUND** | Processor → Warehouse | Dirty containers returned from processors |

---

## Order Statuses

### Status Definitions

| Status | Description | Trigger |
|--------|-------------|---------|
| **INITIATED** | Order created but not yet approved | Default when order is created; reverted from APPROVED via revoke |
| **APPROVED** | Order approved and ready for shipment | Admin/manager approves (from INITIATED) |
| **CANCELLED** | Order was cancelled | User cancels from INITIATED or APPROVED |
| **SHIPPED-PARTIAL** | Some items shipped but not all | OUTBOUND shipment created with `totalShipped < totalRequired` |
| **SHIPPED** | All items have been shipped | All required quantities shipped |
| **RECEIVED** | All items have been received | When shipment receivedDate is set (INBOUND) |
| **RETURNED** | All items have been returned to warehouse | All INBOUND items received and processed |
| **RETURNED-PARTIAL** | Some items returned | Only some items marked as received (INBOUND) |
| **MANUAL RECONCILIATION** | Requires manual intervention | Edge cases needing admin attention |

---

## Status Transition Diagram

```
                              ┌──────────────┐
                              │   INITIATED  │
                              │              │
                              └──────┬───────┘
                                     │
                   ┌─────────────────┼─────────────────┐
                   │                 │                 │
                   ▼                 ▼                 │
           ┌──────────────┐  ┌──────────────┐         │
           │  CANCELLED   │  │   APPROVED   │◀────────┘
           │              │  │              │  (revoke)
           └──────────────┘  └──────┬───────┘
                   ▲                │
                   │                │
                   │    ┌───────────┴───────────┐
                   │    │                       │
                   │    ▼                       ▼
                   │ ┌──────────────┐    ┌──────────────┐
                   └─│SHIPPED-PARTIAL│───▶│   SHIPPED   │
                     │              │    │              │
                     └──────────────┘    └──────┬───────┘
                                                │
                                                │ (INBOUND only)
                                                ▼
                                         ┌──────────────┐
                                         │   RECEIVED   │
                                         │              │
                                         └──────┬───────┘
                                                │
                                                ▼
                     ┌──────────────┐    ┌──────────────┐
                     │RETURNED-PARTIAL│──▶│   RETURNED  │
                     │              │    │              │
                     └──────────────┘    └──────────────┘
```

---

## Transition Rules

### From INITIATED
| Action | Target Status | Conditions |
|--------|---------------|------------|
| Approve | APPROVED | User has OrderManagement permission |
| Cancel | CANCELLED | User has OrderManagement permission |

### From APPROVED
| Action | Target Status | Conditions |
|--------|---------------|------------|
| Revoke | INITIATED | User has OrderManagement permission |
| Cancel | CANCELLED | User has OrderManagement permission |
| Create Shipment (partial) | SHIPPED-PARTIAL | OUTBOUND: totalShipped < totalRequired |
| Create Shipment (full) | SHIPPED | All items shipped |

### From SHIPPED-PARTIAL
| Action | Target Status | Conditions |
|--------|---------------|------------|
| Create Shipment (remaining) | SHIPPED | All remaining items shipped |

### From SHIPPED
| Action | Target Status | Conditions |
|--------|---------------|------------|
| Set receivedDate on shipment | RECEIVED | When shipment is marked as received |

### From RECEIVED
| Action | Target Status | Conditions |
|--------|---------------|------------|
| Process returned items (partial) | RETURNED-PARTIAL | INBOUND: Some items processed |
| Process returned items (all) | RETURNED | INBOUND: All items processed |

---

## Order Editing Rules

The ability to edit order fields depends on the current status:

### INITIATED Status
**Full editing allowed:**
- Customer
- Carrier
- PO Number
- Required Date
- Order Items (products and quantities)
- Pallet/weight information

**Available Actions:**
- Approve
- Cancel

### APPROVED Status (OUTBOUND)
**Limited editing:**
- Driver Name
- Driver License Number

**Available Actions:**
- Update (driver info)
- Revoke (back to INITIATED)
- Cancel
- Create Shipment

### APPROVED Status (INBOUND)
**Limited editing:**
- Driver Name
- Driver License Number

**Available Actions:**
- Update (driver info)
- Revoke
- Cancel

### SHIPPED / SHIPPED-PARTIAL Status
**Read-only** - No editing allowed

**Available Actions (OUTBOUND):**
- View only

**Available Actions (INBOUND):**
- Mark as Received

### RECEIVED Status
**Read-only** - No editing allowed

**Available Actions (INBOUND):**
- View only
- Process returned assets

### RETURNED / RETURNED-PARTIAL / CANCELLED Status
**Read-only** - No editing allowed

**Available Actions:**
- View only
- Download PDF

---

## Order Events

Every status transition is recorded in the `order_events` table for audit purposes:

| Field | Description |
|-------|-------------|
| orderId | The order that changed |
| status | The new status |
| quantity | Quantity affected (for shipments) |
| createdBy | User who made the change |
| createdAt | When the change occurred |

---

## Business Rules Summary

1. **Only INITIATED orders can be fully edited**
2. **Approval is required before shipping**
3. **Approved orders can be revoked back to INITIATED if not yet shipped**
4. **OUTBOUND orders track partial shipments via SHIPPED-PARTIAL**
5. **INBOUND orders track partial receipts via RETURNED-PARTIAL**
6. **Cancelled orders cannot be reinstated**
7. **All transitions are logged for audit trail**

## Implementation Notes

The following status transitions are defined in the schema but may have limited or pending implementation:

- **SHIPPED → RECEIVED**: The `receivedDate` field on Shipment marks a shipment as received, but automatic Order status transition to RECEIVED may not be fully implemented.
- **RECEIVED → RETURNED/RETURNED-PARTIAL**: These transitions for INBOUND orders after receiving may require manual status updates or additional development.

The current implementation fully supports:
- INITIATED → APPROVED → SHIPPED/SHIPPED-PARTIAL (via shipment creation)
- Order cancellation and approval revocation

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/order/create` | POST | Create new order |
| `/api/order` | GET | List orders with filters |
| `/api/order/:id` | GET | Get order details |
| `/api/order/:id` | PUT | Update order (when allowed) |
| `/api/order/:id/approve` | POST | Approve order |
| `/api/order/:id/cancel` | POST | Cancel order |
| `/api/order/:id/revoke` | POST | Revoke approval |
| `/api/order/:id/pdf` | GET | Download order PDF |
