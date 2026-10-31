
# Cleantec RFID System — Backend Requirements Analysis

**Source:** Email chain "RE: Cleantec RFID system"  
**Attachment:** doc/Regional_Bin_Tags_Summary_Official.xlsx  
**Analysis Date:** October 17, 2026

---

## 1. Executive Summary

### What is being requested?

The Cleantec team is requesting a **historical data migration and reconciliation of RFID-tagged bin movements** into the RFID Discovery platform.

This is more than uploading a spreadsheet. The backend must reconstruct historical orders, associate individual RFID tags with those orders, and establish an accurate history of bins moving between Cleantec warehouses and customers.

### Primary Objectives

1. **Create missing historical orders** in the RFID Discovery platform, including outgoing shipments and incoming returns.
2. **Associate individual RFID Tag IDs (Tote IDs)** with their respective orders.
3. **Establish correct warehouse and customer relationships**, including Cleantec's Corona and Salinas facilities.
4. **Populate and reconcile master data** for customers, carriers, warehouse locations, and users.
5. **Preserve historical dates and transaction details** rather than treating the orders as new shipments.
6. **Reconcile existing data** to avoid duplicate orders, duplicate tag assignments, or incorrect inventory balances.

### Expected Outcome

The RFID Discovery platform should accurately reflect Cleantec's historical inventory movements, allowing users to:

- Track where RFID-tagged bins were shipped.
- Identify which customer received each bin.
- Track incoming bin returns.
- View individual RFID tag movement histories.
- Determine the current location and inventory status of bins.
- Reconcile historical and current inventory records.

**Important:** This should be treated as a controlled historical data backfill, not a fresh RFID scanning operation.

---

## 2. Analysis of the Attached Excel Workbook

The workbook contains 21 worksheets:

- 1 summary worksheet.
- 20 individual transaction worksheets.

### 2.1 Workbook Statistics

| Metric | Count |
|---|---:|
| Orders in summary worksheet | 15 |
| Detailed transaction worksheets | 20 |
| Total detailed tag-order records | 4,195 |
| Visible outgoing order worksheets | 12 |
| Visible outgoing tag records | 3,978 |
| Visible incoming return worksheets | 2 |
| Visible incoming tag records | 7 |
| Hidden incoming return worksheets | 6 |
| Hidden incoming tag records | 210 |
| Missing C071 outgoing order | 1 |
| C071 reported quantity | 420 |

The summary worksheet describes 4,405 tag movements, including C071.

The detailed worksheets contain 4,195 movements, including 210 hidden return records absent from the summary.

These totals should not be treated as interchangeable without reconciliation.

### 2.2 Spreadsheet-to-Backend Field Mapping

| Excel Column | Backend Interpretation |
|---|---|
| Order Date | Historical order creation date |
| Imputted By | Original order creator |
| Ship Date | Historical shipment date |
| BOL | Bill of Lading / shipment reference |
| PO | Purchase Order reference |
| Customer / Parent | Customer and parent organization |
| Outbound | Quantity of bins shipped out |
| Picked From | Originating Cleantec warehouse |
| Total Inbound | Quantity of bins received back |
| Returned To | Receiving Cleantec warehouse |
| Tag ID | Individual RFID/bin identifier |

### 2.3 How Records Should Be Imported

The detailed worksheets use a **one-row-per-tag representation**.

Shipment information is repeated across the individual RFID tag rows.

**Example 1: Outgoing Order**

Worksheet: `190`

- Customer: Heritage Farms
- Origin: Cleantec Corona
- RFID tag records: 392
- Transaction type: Outgoing shipment

**Expected Backend Result:**

- Create or reconcile one outgoing order.
- Associate 392 individual RFID tags with that order.
- Record the historical outgoing inventory movement.

Do not create 392 separate orders.

**Example 2: Incoming Order**

Worksheet: `S-82546`

- Destination: Cleantec Salinas
- RFID tag records: 5
- Transaction type: Incoming return

**Expected Backend Result:**

- Create or reconcile one incoming transaction.
- Associate five RFID tags with the return.
- Record the historical incoming inventory movement.

---

## 3. Required Backend Functionality

### 3.1 Master Data Management

Before importing historical transactions, the following master data must exist or be reconciled.

#### Customers

- Customer name
- Parent organization
- Contact person
- Phone number
- Email address
- Warehouse or delivery addresses

#### Carriers

- Carrier name
- Contact person
- Phone number
- Email address
- Address information

#### Locations

- Cleantec Corona warehouse
- Cleantec Salinas warehouse
- Customer locations
- Receiving processors
- Other shipment destinations

#### Users

- User name
- Email address
- Role
- Associated organization or customer

**Backend Requirement:**

Match spreadsheet values to existing entities wherever possible.

Create missing entities only after validating that they do not already exist under another name or identifier.

---

### 3.2 Historical Order Creation

The backend must create or reconcile missing historical orders.

#### Outgoing Orders

Represent RFID-tagged bins shipped from Cleantec warehouses to customers or processors.

Required information:

- Order number
- Order creation date
- Original order creator
- Customer
- Carrier
- Origin warehouse
- Destination address
- Purchase Order number
- Bill of Lading number
- Product
- Required quantity
- Ship date
- Delivery date, if available
- Associated RFID Tag IDs

#### Incoming Orders

Represent RFID-tagged bins returning to Cleantec warehouses.

Required information:

- Incoming order/reference number
- Creation date
- Original creator
- Returning customer or processor
- Carrier
- Receiving warehouse
- Return or delivery date
- Quantity
- Associated RFID Tag IDs

**Backend Requirement:**

Historical transactions must retain their actual business dates rather than defaulting to the migration execution date.

---

### 3.3 RFID Tag-to-Order Associations

Each RFID tag listed in the spreadsheet must be associated with its corresponding transaction.

The backend should support relationships such as:

    Order
      |
      +-- Order-Tag Association
               |
               +-- RFID Tag / Tote
                         |
                         +-- Inventory Movement History

An RFID tag represents a persistent physical asset.

Its order associations and inventory movements change over time.

For example:

    RFID Tag: 12345

    Movement 1:
      Cleantec Corona -> Customer A

    Movement 2:
      Customer A -> Cleantec Salinas

    Movement 3:
      Cleantec Salinas -> Customer B

The system should maintain all three historical movements while preserving a single identity for RFID Tag `12345`.

---

### 3.4 Inventory Movement History

The backend must record inventory movements for historical transactions.

Each movement should contain:

- RFID Tag ID
- Associated Order ID
- Movement type
- Source location
- Destination location
- Business transaction date
- Source document/reference
- Historical creator, if known
- Import metadata

#### Supported Movement Types

At minimum:

- Outbound shipment
- Inbound return

Additional movement types should only be introduced if required by the existing platform's business process.

**Important:**

Do not assume that importing a historical shipment should automatically reduce today's warehouse inventory.

Historical movements must be reconciled chronologically against existing platform records so current inventory remains accurate.

---

### 3.5 Audit and Traceability

Every imported record should retain:

- Source workbook name
- Source worksheet
- Source row number
- Original transaction reference
- Historical business date
- Original transaction creator
- Import batch ID
- Actual import timestamp
- Importing system user or process
- Validation status
- Error or warning information

This allows developers and operations teams to trace every imported transaction back to its spreadsheet source.

---

### 3.6 Validation and Duplicate Prevention

The import process should identify:

- Duplicate order references.
- Duplicate RFID tag associations within the same transaction.
- RFID tags that do not exist in the registry.
- Conflicting tag identifiers.
- Missing mandatory information.
- Invalid or inconsistent dates.
- Missing customer mappings.
- Missing warehouse mappings.
- Quantity mismatches.
- Transactions that already exist.
- Conflicting movements for the same RFID tag.

The import mechanism should be **idempotent**.

Running the same import multiple times must not create duplicate orders or movement events.

---

## 4. Discrepancies Identified in the Workbook

Several issues require resolution before a production import.

### 4.1 Missing Order C071

**Priority: Critical**

Email chain indicates:

- BOL: C071
- Shipment date: March 4, 2025
- Quantity: 420 bins
- Previously scanned with AJ
- RFID Tag IDs unavailable in the provided spreadsheet

The email also indicates that the team could not locate the order in the system.

**Required Action:**

1. Search the existing platform for order C071.
2. Investigate historical RFID scan logs.
3. Determine whether the corresponding tag IDs can be recovered.
4. Reconcile any existing order or movement records.
5. Do not invent RFID Tag IDs if historical information is unavailable.

### 4.2 Order 25670 — Conflicting Information

**Priority: Critical**

The summary identifies a September 2025 outgoing shipment.

The detailed worksheet contains July 2026 dates and references BOL `S-83216`, which also appears on a return worksheet.

**Required Action:**

- Confirm the correct BOL.
- Confirm the actual transaction dates.
- Determine whether the worksheet contains copied information.
- Prevent the incorrect dates or references from entering the platform.

### 4.3 Order C-259 — Conflicting Customer and Dates

**Priority: Critical**

Summary information:

- Year: 2025
- Customer: Nevada Fresh Pak
- PO: 4000001

Detailed worksheet information:

- Date: June 16, 2026
- Customer: Fresh Pak
- PO: 76-04696

**Required Action:**

Determine the authoritative customer, date, and purchase order information before migration.

### 4.4 Order C-259 — Tag Count Mismatch

**Priority: Critical**

- Summary ranges describe 406 tag IDs.
- Detailed worksheet contains 392 tag records.
- Tag IDs 8613–8626 are absent.

**Required Action:**

Confirm whether the missing IDs were intentionally excluded or are missing from the source data.

Review the workbook's range verification warnings.

### 4.5 Worksheet 195 — Possible Transcription Error

**Priority: High**

The workbook flags a likely transcription error involving the range:

`7241-2754`

**Required Action:**

Compare the range against the original paper Bill of Lading or verified tag records.

Do not automatically generate tag IDs from an incorrect range.

### 4.6 Hidden Incoming Transaction Worksheets

**Priority: High**

The workbook contains six hidden worksheets representing 210 incoming tag records.

These records are not included in the summary worksheet.

**Required Action:**

1. Confirm whether the hidden worksheets represent valid historical transactions.
2. Confirm whether they should be imported.
3. Check whether they already exist in the platform.
4. Include them in reconciliation counts if approved.

### 4.7 Verification Status Inconsistencies

**Priority: High**

Several order details have date differences between the summary and detailed worksheets.

The summary also marks many records as not verified, while some detailed sheets describe the tags as verified.

**Required Action:**

Clarify the distinction between:

- RFID tag verification.
- Order verification.
- Shipment verification.
- Inventory reconciliation.

Define which source is authoritative for each field.

### 4.8 Potential Duplicate Return Tag

**Priority: High**

RFID tag value `194` appears on two different incoming worksheets.

This could represent:

- A legitimate repeated movement.
- A duplicate return record.
- A data-entry error.

**Required Action:**

Review historical order and inventory movements before deciding whether both records are valid.

---

## 5. Missing Information Required by the Email Chain

Mina's September 10, 2026 email defines the required order and master-data fields.

Not all those fields are present in the attached workbook.

| Required Information | Available in Workbook |
|---|---|
| Order number / BOL | Mostly |
| Order creation date | Yes, with inconsistencies |
| Order creator | Yes, as free text |
| Customer | Yes |
| Outbound quantity | Yes |
| Inbound quantity | Yes |
| Ship date | Yes |
| Individual RFID Tag IDs | Yes, except C071 |
| Carrier information | No |
| Delivery date | No |
| Destination address | Not consistently |
| Product details | No explicit catalog mapping |
| Actual shipped/delivered status | No |
| Platform user IDs | No |

The September 12 email references separate attachments containing:

- Grower/customer contact information.
- Customer locations.
- Carrier information.

These files are needed to complete customer, destination, and carrier mappings.

---

## 6. Recommended Implementation Plan

### Phase 1 — Master Data Reconciliation

**Objective:** Ensure all referenced business entities are correctly represented in the platform.

#### Tasks

1. Retrieve existing customers.
2. Retrieve existing carriers.
3. Retrieve warehouse and location records.
4. Retrieve existing users.
5. Retrieve the RFID tag registry.
6. Identify missing or duplicate entities.
7. Build spreadsheet-to-platform mapping tables.
8. Obtain business approval for unresolved mappings.

#### Deliverables

- Customer mapping table.
- Carrier mapping table.
- Location mapping table.
- User mapping table.
- RFID registry reconciliation report.

---

### Phase 2 — Staging Data Import

**Objective:** Parse the workbook into a normalized dataset without changing production business records.

#### Tasks

1. Read the summary worksheet.
2. Read all in-scope transaction worksheets.
3. Identify hidden worksheets.
4. Extract order-level information.
5. Extract individual RFID tag records.
6. Normalize transaction direction.
7. Normalize dates and references.
8. Preserve source row and worksheet information.
9. Store records in staging structures.

#### Suggested Staging Entities

    import_batch
    staging_order
    staging_order_tag
    staging_movement
    staging_validation_error

Preserve RFID Tag IDs as text to prevent formatting changes or loss of leading zeroes.

#### Deliverables

- Parsed order staging data.
- Parsed RFID association data.
- Import batch metadata.
- Source-to-staging reconciliation report.

---

### Phase 3 — Validation and Dry Run

**Objective:** Identify and resolve data quality issues before modifying production transactions.

#### Tasks

1. Validate mandatory fields.
2. Validate transaction dates.
3. Validate customers and locations.
4. Validate order references.
5. Validate RFID tag identities.
6. Compare quantities with detailed tag records.
7. Detect duplicates.
8. Detect existing transactions.
9. Investigate conflicting movements.
10. Produce a dry-run validation report.

#### Deliverables

- Validated import dataset.
- Exception report.
- Duplicate/conflict report.
- Import readiness summary.
- Business approval for unresolved exceptions.

---

### Phase 4 — Historical Transaction Migration

**Objective:** Import approved historical transactions into the platform.

#### Tasks

1. Create missing order headers.
2. Map orders to customers and locations.
3. Assign carriers where data is available.
4. Associate RFID Tag IDs with orders.
5. Create historical inventory movement events.
6. Preserve historical business dates.
7. Process transactions in chronological order.
8. Prevent duplicate creation through idempotency controls.
9. Record import audit information.
10. Log any failed or skipped transactions.

#### Important Engineering Considerations

Prefer the platform's existing APIs or approved business transaction services.

Direct database changes should be used only when supported by the platform's migration design and when business rules can be safely preserved.

#### Deliverables

- Migrated historical orders.
- Migrated order-tag associations.
- Reconstructed inventory movement history.
- Import execution logs.

---

### Phase 5 — Post-Migration Reconciliation

**Objective:** Confirm that the imported records accurately reflect the approved historical data.

#### Tasks

1. Compare imported order counts with approved source counts.
2. Compare tag association counts.
3. Verify outgoing shipments.
4. Verify incoming returns.
5. Review tag movement histories.
6. Verify warehouse assignments.
7. Verify customer associations.
8. Compare current inventory balances with expected inventory.
9. Review rejected or skipped records.
10. Obtain Cleantec business sign-off.

#### Deliverables

- Final migration report.
- Imported order count.
- Imported tag association count.
- Reconciliation results.
- Exception list.
- Business sign-off.

---


## 7. Decisions Required Before Development

The engineering team should obtain clarification on the following items.

| # | Question | Why It Matters |
|---|---|---|
| 1 | Should all 20 detailed worksheets be imported, including hidden tabs? | Defines import scope |
| 2 | Does each worksheet represent one transaction, even when BOL references overlap? | Determines transaction granularity |
| 3 | Are the RFID tags already registered in the platform? | Determines whether to create or reference tag records |
| 4 | Are any orders already present in the platform? | Prevents duplicate transactions |
| 5 | Which source is authoritative when summary and detail disagree? | Ensures accurate historical records |
| 6 | How should C071 be handled without RFID Tag IDs? | Prevents incomplete or invented associations |
| 7 | Should imported historical movements update current inventory balances? | Prevents inventory corruption |
| 8 | Are existing platform APIs available for historical order creation? | Determines implementation method |
| 9 | What is the expected behavior when a tag has multiple historical movements? | Ensures correct movement history |
| 10 | Who approves unresolved data quality exceptions? | Establishes import sign-off responsibility |

---

## 8. Recommended Engineering Work Items

### BE-001 — Review Existing RFID Platform Data Model

**Description:**

Analyze current database structures, services, and APIs for:

- Orders
- RFID tags
- Customers
- Carriers
- Warehouses
- Inventory movements
- Order-tag relationships

**Acceptance Criteria:**

- Existing structures are documented.
- Reusable APIs and services are identified.
- Required extensions are documented.

### BE-002 — Implement Historical Spreadsheet Parser

**Description:**

Develop a parser to convert workbook data into normalized staging records.

**Acceptance Criteria:**

- All approved worksheets can be parsed.
- One order can contain multiple RFID tags.
- Dates and identifiers are preserved.
- Source row references are maintained.
- Hidden worksheets are detected.

### BE-003 — Implement Master Data Mapping

**Description:**

Resolve spreadsheet customers, carriers, locations, and users to existing platform records.

**Acceptance Criteria:**

- Existing entities are reused.
- Unresolved references are reported.
- Duplicate master data is not created automatically.

### BE-004 — Implement Order and RFID Association Import

**Description:**

Create or reconcile historical orders and associate their RFID tags.

**Acceptance Criteria:**

- Correct order-to-tag relationships are created.
- Duplicate imports are prevented.
- Existing valid orders are preserved.
- Missing tags are reported.

### BE-005 — Implement Historical Inventory Movement Backfill

**Description:**

Reconstruct inbound and outbound bin movement history.

**Acceptance Criteria:**

- Historical transaction dates are preserved.
- Movement direction is correct.
- Source and destination locations are recorded.
- Repeated legitimate movements are supported.
- Current inventory is not incorrectly modified.

### BE-006 — Implement Validation and Exception Reporting

**Description:**

Identify import errors, data conflicts, and missing information.

**Acceptance Criteria:**

- Duplicate detection is available.
- Quantity reconciliation is available.
- Missing references are reported.
- Conflicting dates and order IDs are reported.
- A dry-run mode is supported.

### BE-007 — Execute Migration and Reconciliation

**Description:**

Run the approved import and validate the resulting system state.

**Acceptance Criteria:**

- Approved historical orders are present.
- Expected RFID associations exist.
- Movement histories are accurate.
- Reconciliation reports are generated.
- Outstanding exceptions are documented.
- Business sign-off is obtained.

---

## 9. Security Consideration

The email chain includes an account password in plaintext.

Before development or migration activities:

1. Rotate the exposed password.
2. Avoid copying credentials into tickets or documentation.
3. Use approved secrets management for application credentials.
4. Ensure migration logs do not capture sensitive authentication data.

---

## 10. Final Recommendation

### Suggested Project Name

**Cleantec RFID — Historical Order, Tote Association, and Inventory Movement Data Migration**

### Scope Classification

This is primarily a:

- Backend data migration requirement.
- Historical transaction reconstruction effort.
- RFID tag-to-order association requirement.
- Inventory reconciliation requirement.
- Data quality and validation effort.

It is **not primarily a request to redesign RFID hardware, scanner functionality, or the user interface**.

### Expected Technical Deliverable

A repeatable, auditable migration capability that:

1. Accepts Cleantec's historical order spreadsheets.
2. Validates and normalizes their contents.
3. Maps referenced entities to the existing platform.
4. Creates missing historical orders.
5. Associates RFID tags with the correct transactions.
6. Reconstructs historical inventory movements.
7. Prevents duplicate or conflicting records.
8. Preserves existing current inventory accuracy.
9. Generates reconciliation and exception reports.

### Recommended First Action

**Review the existing RFID Discovery platform's order, RFID tag, and inventory movement schemas and APIs before deciding whether new backend functionality is necessary.**

This will determine whether the work can be completed through existing services or requires additional backend development.

### Overall Conclusion

The Cleantec request is fundamentally about **bringing historical shipment and return information from manually maintained spreadsheets into the RFID Discovery platform**.

The migration must preserve the relationship between orders, RFID-tagged bins, customers, warehouses, and their movement history.

The key success criterion is not merely the number of uploaded records, but the accuracy and consistency of the resulting RFID inventory and transaction history.

---

## 12. Analysis Limitations

This analysis is based on:

- The supplied Cleantec RFID email chain.
- The attached docs/Regional_Bin_Tags_Summary_Official.xlsx workbook.

The email chain was partially clipped, and other referenced attachments were not available in this review.

Further validation may be required using:

- Complete historical correspondence.
- Customer and carrier master-data files.
- Original Bills of Lading.
- Existing RFID Discovery platform records.
- Historical RFID scan logs.
- Current warehouse inventory records.
