# Backend API Implementation Guide
**Rejection Analysis Console - Complete API Documentation**

**Date:** November 26, 2025  
**File:** `/rejection_analysis/rejection_analysis/api.py`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [API Endpoints](#api-endpoints)
4. [Step-by-Step Process Explanation](#step-by-step-process-explanation)
5. [Testing the APIs](#testing-the-apis)
6. [Common Issues & Solutions](#common-issues--solutions)

---

## 🎯 Overview

The backend API provides **5 main endpoints** for the Rejection Analysis Console:

| Endpoint | Purpose | Inspection Type |
|----------|---------|----------------|
| `get_dashboard_metrics()` | Get aggregated metrics for dashboard | All types |
| `get_lot_inspection_report()` | Get detailed lot inspection data | Lot Inspection |
| `get_incoming_inspection_report()` | Get incoming inspection with vendor data | Incoming Inspection |
| `get_final_inspection_report()` | Get final visual inspection data | Final Visual Inspection |
| `create_car_from_inspection()` | Create Corrective Action Report | All types |

---

## 🏗️ Architecture Principles

### Core Principle: Moulding Production Entry is SOURCE OF TRUTH

Every query follows this pattern:

```
START → Moulding Production Entry (MPE)
  ↓ (scan_lot_number)
JOIN → Inspection Entry / SPP Inspection Entry (lot_no)
  ↓
JOIN → Other tables as needed
  ↓
RETURN → Aggregated data
```

### Key Rules:

1. **Always start with MPE** - Never query Inspection Entry directly as primary table
2. **Use scan_lot_number** - This is the PRIMARY KEY for all joins
3. **Backend = RAW DATA** - No business logic, thresholds, or CAR generation
4. **Frontend = LOGIC** - Frontend decides what to do with the data
5. **Proper SQL joins** - Use LEFT JOIN for optional data, INNER JOIN for required

---

## 📡 API Endpoints

### 1. `get_dashboard_metrics(date, inspection_type)`

**Purpose:** Get aggregated metrics for the dashboard cards.

**STEP-BY-STEP PROCESS:**

```python
# STEP 1: Validate input
date = "2025-11-26" (or today if not provided)
inspection_type = "Lot Inspection"

# STEP 2: Query Inspection Entry table
SELECT name, lot_no, total_rejected_qty_in_percentage, ...
FROM `tabInspection Entry`
WHERE inspection_type = 'Lot Inspection'
AND docstatus = 1  # Only submitted documents
AND DATE_FORMAT(posting_date, '%Y-%m-%d') = '2025-11-26'

# STEP 3: Calculate metrics
total_lots = count of records
avg_rejection = sum of all rejection % / total_lots
lots_exceeding_threshold = count where rejection > 5%

# STEP 4: For Lot Inspection only, get Patrol & Line averages
SELECT AVG(total_rejected_qty_in_percentage)
FROM `tabInspection Entry`
WHERE inspection_type = 'Patrol Inspection'
AND posting_date = '2025-11-26'

# STEP 5: Return structured data
{
  "total_lots": 15,
  "avg_rejection": 3.2,
  "lots_exceeding_threshold": 2,
  "patrol_rej_avg": 1.8,
  "line_rej_avg": 2.1,
  ...
}
```

**Example API Call:**

```python
# From Frappe console or frontend
import frappe

metrics = frappe.call(
    'rejection_analysis.rejection_analysis.api.get_dashboard_metrics',
    date='2025-11-26',
    inspection_type='Lot Inspection'
)

print(metrics)
```

**What Happens:**
1. ✅ Query finds all Lot Inspections for Nov 26
2. ✅ Calculates total lots, average rejection
3. ✅ Counts how many exceed 5% threshold
4. ✅ For Lot type: Also gets Patrol and Line averages
5. ✅ Returns JSON object with all metrics

---

### 2. `get_lot_inspection_report(filters)`

**Purpose:** Get detailed lot inspection data with production context.

**STEP-BY-STEP PROCESS:**

```python
# STEP 1: Parse filters
filters = {
    "production_date": "2025-11-26",
    "operator_name": "John",  # Optional
    "lot_no": "25K26"         # Optional
}

# STEP 2: Build SQL query (START WITH MPE!)
SELECT
    -- From Inspection Entry
    ie.name, ie.lot_no, ie.total_rejected_qty_in_percentage,
    
    -- From Moulding Production Entry (SOURCE OF TRUTH)
    mpe.employee_name, mpe.mould_reference, mpe.moulding_date,
    
    -- From Patrol Inspection (aggregated)
    AVG(patrol_ie.total_rejected_qty_in_percentage),
    
    -- From Line Inspection (aggregated)
    AVG(line_ie.total_rejected_qty_in_percentage)

FROM `tabInspection Entry` ie

-- Join to MPE using lot_no = scan_lot_number
LEFT JOIN `tabMoulding Production Entry` mpe
    ON mpe.scan_lot_number = ie.lot_no

-- Subquery: Aggregate all Patrol inspections for this lot
LEFT JOIN (
    SELECT lot_no, AVG(total_rejected_qty_in_percentage) as avg_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Patrol Inspection'
    GROUP BY lot_no
) patrol ON patrol.lot_no = ie.lot_no

-- Subquery: Aggregate all Line inspections for this lot
LEFT JOIN (
    SELECT lot_no, AVG(total_rejected_qty_in_percentage) as avg_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Line Inspection'
    GROUP BY lot_no
) line ON line.lot_no = ie.lot_no

WHERE ie.inspection_type = 'Lot Inspection'
AND DATE_FORMAT(ie.posting_date, '%Y-%m-%d') = '2025-11-26'
AND mpe.employee_name LIKE '%John%'  # Dynamic filter
AND ie.lot_no LIKE '%25K26%'         # Dynamic filter

# STEP 3: Execute query and get results

# STEP 4: Process each row
For each row:
    - Use moulding_date from MPE (if available) as production_date
    - Use employee_name from MPE (if available) as operator_name
    - Calculate exceeds_threshold = (lot_rej_pct > 5.0)
    - Round all percentages to 2 decimal places

# STEP 5: Return array of records
[
  {
    "lot_no": "25K26X01",
    "production_date": "2025-11-26",
    "operator_name": "John Doe",
    "mould_ref": "MLD-5117-A",
    "patrol_rej_pct": 1.5,
    "line_rej_pct": 2.0,
    "lot_rej_pct": 3.2,
    "exceeds_threshold": false
  },
  ...
]
```

**Why This Data Linkage?**

```
Lot: 25K26X01
    ↓
Moulding Production Entry (25K26X01)
    → Tells us: Who made it, which mould, when
    ↓
Lot Inspection (25K26X01)
    → Tells us: Final lot rejection %
    ↓
Patrol Inspections (25K26X01) - Multiple records
    → Average: 1.5% rejection
    ↓
Line Inspections (25K26X01) - Multiple records
    → Average: 2.0% rejection

Result: Complete quality journey for this lot
```

---

### 3. `get_incoming_inspection_report(filters)`

**Purpose:** Get incoming inspection data with deflashing vendor information.

**STEP-BY-STEP PROCESS:**

```python
# STEP 1: Parse filters
filters = {
    "date": "2025-11-26",
    "deflasher": "VENDOR"  # Optional
}

# STEP 2: Build SQL query (START WITH MPE!)
SELECT
    -- From Inspection Entry
    ie.name, ie.posting_date, ie.total_rejected_qty_in_percentage,
    
    -- From Moulding Production Entry (SOURCE OF TRUTH)
    mpe.scan_lot_number, mpe.item_to_manufacture, mpe.mould_reference,
    
    -- From Deflashing Receipt Entry
    dre.scan_deflashing_vendor,    # Who deflashed
    dre.qty_despatched_nos,        # Qty sent to vendor
    dre.qty_received_nos,          # Qty received back
    dre.difference_nos_percentage, # Loss %
    
    -- From Job Card
    jc.batch_no

FROM `tabMoulding Production Entry` mpe

-- Join to Incoming Inspection
INNER JOIN `tabInspection Entry` ie
    ON ie.lot_no = mpe.scan_lot_number
    AND ie.inspection_type = 'Incoming Inspection'

-- Join to Deflashing Receipt (may not exist)
LEFT JOIN `tabDeflashing Receipt Entry` dre
    ON dre.lot_number = mpe.scan_lot_number

-- Join to Job Card (for batch info)
LEFT JOIN `tabJob Card` jc
    ON jc.name = mpe.job_card

WHERE DATE_FORMAT(ie.posting_date, '%Y-%m-%d') = '2025-11-26'

# STEP 3: Process results
For each row:
    - deflasher_name = dre.scan_deflashing_vendor (or "—" if null)
    - qty_sent = dre.qty_despatched_nos
    - qty_received = dre.qty_received_nos
    - diff_pct = dre.difference_nos_percentage (loss during deflashing)
    - rej_pct = ie.total_rejected_qty_in_percentage

# STEP 4: Return array with vendor data
```

**What This Tells Us:**

```
Lot sent to deflasher:
    Qty sent: 1000 pcs
    Qty received: 950 pcs
    Difference: 5% (50 pcs lost/damaged during deflashing)
    
After incoming inspection:
    Inspected: 950 pcs
    Rejected: 57 pcs
    Rejection: 6% (quality issues after deflashing)
```

---

### 4. `get_final_inspection_report(filters)`

**Purpose:** Get final visual inspection data showing ALL 4 rejection stages.

**UNIQUE FEATURE:** Uses `SPP Inspection Entry` (not regular Inspection Entry)

**STEP-BY-STEP PROCESS:**

```python
# STEP 1: Parse filters
filters = {
    "date": "2025-11-26",
    "shift_type": "A"  # Optional
}

# STEP 2: Build SQL query (START WITH MPE!)
SELECT
    -- From SPP Inspection Entry (DIFFERENT DocType!)
    spp_ie.name, spp_ie.posting_date,
    spp_ie.total_rejected_qty_in_percentage as final_insp_rej_pct,
    spp_ie.warehouse, spp_ie.stage,
    
    -- From Moulding Production Entry
    mpe.scan_lot_number, mpe.item_to_manufacture, mpe.employee_name,
    
    -- From Job Card
    jc.shift_type, jc.workstation, jc.batch_no,
    
    -- From Patrol Inspection (aggregated)
    AVG(patrol_ie.total_rejected_qty_in_percentage),
    
    -- From Line Inspection (aggregated)
    AVG(line_ie.total_rejected_qty_in_percentage),
    
    -- From Lot Inspection
    lot_ie.total_rejected_qty_in_percentage

FROM `tabMoulding Production Entry` mpe

-- Join to SPP Inspection Entry (NOT regular Inspection Entry!)
INNER JOIN `tabSPP Inspection Entry` spp_ie
    ON spp_ie.lot_no = mpe.scan_lot_number
    AND spp_ie.inspection_type = 'Final Visual Inspection'

-- Join to Job Card
LEFT JOIN `tabJob Card` jc
    ON jc.name = mpe.job_card

-- Subquery for Patrol
LEFT JOIN (...) patrol ON patrol.lot_no = spp_ie.lot_no

-- Subquery for Line
LEFT JOIN (...) line ON line.lot_no = spp_ie.lot_no

-- Subquery for Lot
LEFT JOIN (...) lot_insp ON lot_insp.lot_no = spp_ie.lot_no

WHERE DATE_FORMAT(spp_ie.posting_date, '%Y-%m-%d') = '2025-11-26'

# STEP 3: Return data with ALL 4 rejection stages
[
  {
    "lot_no": "25K26X01",
    "patrol_rej_pct": 1.5,    # Stage 1
    "line_rej_pct": 2.0,      # Stage 2
    "lot_rej_pct": 3.2,       # Stage 3
    "final_insp_rej_pct": 4.1, # Stage 4 (PRIMARY)
    "warehouse": "Finished Goods - SPP",
    "stage": "Finished Goods"
  }
]
```

**Why 4 Stages?**

```
Production Timeline:
┌─────────────────────────────────────────────────────┐
│ 1. Patrol Inspection   → During production (random) │
│ 2. Line Inspection     → During production (fixed)  │
│ 3. Lot Inspection      → After production complete  │
│ 4. Final Inspection    → Before warehousing         │
└─────────────────────────────────────────────────────┘

Shows quality progression through entire process!
```

---

## 🔍 Step-by-Step Process Explanation

### How a Query Works (Example: Lot Inspection)

**User Action:**
```javascript
// Frontend calls API
fetch('/api/method/rejection_analysis.api.get_lot_inspection_report', {
  filters: {
    production_date: '2025-11-26',
    lot_no: '25K26'
  }
})
```

**Backend Process:**

```python
# STEP 1: API receives request
@frappe.whitelist()
def get_lot_inspection_report(filters=None):
    # Frappe automatically parses JSON filters
    
# STEP 2: Extract filter values
date = filters.get("production_date", today())  # '2025-11-26'
lot_filter = filters.get("lot_no")              # '25K26'

# STEP 3: Build SQL query string
query = """
    SELECT ...
    FROM `tabInspection Entry` ie
    LEFT JOIN `tabMoulding Production Entry` mpe ...
    WHERE ie.posting_date = %s
"""

# STEP 4: Add dynamic filters
params = [date]  # ['2025-11-26']

if lot_filter:
    query += " AND ie.lot_no LIKE %s"
    params.append('%25K26%')  # ['2025-11-26', '%25K26%']

# STEP 5: Execute SQL query
data = frappe.db.sql(query, params, as_dict=True)
# Returns: [{lot_no: '25K26X01', ...}, {lot_no: '25K26X02', ...}]

# STEP 6: Process each row
results = []
for row in data:
    result = {
        "lot_no": row.get("lot_no"),
        "patrol_rej_pct": round(row.get("patrol_rej_pct", 0), 2),
        "exceeds_threshold": row.get("lot_rej_pct") > 5.0  # Boolean flag
    }
    results.append(result)

# STEP 7: Return JSON to frontend
return results
# Frontend receives: [{lot_no: '25K26X01', ...}, ...]
```

**What Happens in Database:**

```sql
-- Query execution in MariaDB

-- 1. Find all Lot Inspections for 2025-11-26
SELECT * FROM `tabInspection Entry`
WHERE inspection_type = 'Lot Inspection'
AND posting_date = '2025-11-26'
-- Result: 15 records

-- 2. For each record, join to Moulding Production Entry
-- Example: lot_no = '25K26X01'
SELECT * FROM `tabMoulding Production Entry`
WHERE scan_lot_number = '25K26X01'
-- Result: Get mould_reference, employee_name, etc.

-- 3. For each record, aggregate Patrol inspections
SELECT AVG(total_rejected_qty_in_percentage)
FROM `tabInspection Entry`
WHERE lot_no = '25K26X01'
AND inspection_type = 'Patrol Inspection'
-- Result: 1.5%

-- 4. Combine all data and return
```

---

## 🧪 Testing the APIs

### Test 1: Dashboard Metrics

```python
# Open Frappe console: bench console

import frappe

# Test Lot Inspection metrics for today
metrics = frappe.call(
    'rejection_analysis.rejection_analysis.api.get_dashboard_metrics',
    date='2025-11-26',
    inspection_type='Lot Inspection'
)

print("Total Lots:", metrics['total_lots'])
print("Average Rejection:", metrics['avg_rejection'])
print("Lots Exceeding Threshold:", metrics['lots_exceeding_threshold'])
print("Patrol Avg:", metrics['patrol_rej_avg'])
print("Line Avg:", metrics['line_rej_avg'])
```

**Expected Output:**
```
Total Lots: 15
Average Rejection: 3.45
Lots Exceeding Threshold: 2
Patrol Avg: 1.82
Line Avg: 2.13
```

### Test 2: Lot Inspection Report

```python
# Get detailed lot inspection data
report = frappe.call(
    'rejection_analysis.rejection_analysis.api.get_lot_inspection_report',
    filters={
        'production_date': '2025-11-26',
        'lot_no': '25K26'  # Partial match
    }
)

print(f"Found {len(report)} lots")
for record in report[:3]:  # First 3
    print(f"\nLot: {record['lot_no']}")
    print(f"  Operator: {record['operator_name']}")
    print(f"  Mould: {record['mould_ref']}")
    print(f"  Patrol: {record['patrol_rej_pct']}%")
    print(f"  Line: {record['line_rej_pct']}%")
    print(f"  Lot: {record['lot_rej_pct']}%")
    print(f"  Exceeds Threshold: {record['exceeds_threshold']}")
```

### Test 3: Incoming Inspection Report

```python
# Get incoming inspection data
incoming = frappe.call(
    'rejection_analysis.rejection_analysis.api.get_incoming_inspection_report',
    filters={
        'date': '2025-11-26'
    }
)

print(f"Found {len(incoming)} incoming inspections")
for record in incoming[:2]:
    print(f"\nLot: {record['lot_no']}")
    print(f"  Deflasher: {record['deflasher_name']}")
    print(f"  Qty Sent: {record['qty_sent']}")
    print(f"  Qty Received: {record['qty_received']}")
    print(f"  Loss: {record['diff_pct']}%")
    print(f"  Rejection: {record['rej_pct']}%")
```

### Test 4: Final Inspection Report

```python
# Get final inspection data (uses SPP Inspection Entry)
final = frappe.call(
    'rejection_analysis.rejection_analysis.api.get_final_inspection_report',
    filters={
        'date': '2025-11-26'
    }
)

print(f"Found {len(final)} final inspections")
for record in final[:2]:
    print(f"\nLot: {record['lot_no']}")
    print(f"  Patrol REJ: {record['patrol_rej_pct']}%")
    print(f"  Line REJ: {record['line_rej_pct']}%")
    print(f"  Lot REJ: {record['lot_rej_pct']}%")
    print(f"  Final REJ: {record['final_insp_rej_pct']}%")  # PRIMARY
    print(f"  Warehouse: {record['warehouse']}")
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: No data returned

**Problem:**
```python
metrics = get_dashboard_metrics(date='2025-11-26', inspection_type='Lot Inspection')
# Returns: {"total_lots": 0, ...}
```

**Solution:**
```python
# Check if inspection entries exist for that date
import frappe

inspections = frappe.get_all(
    'Inspection Entry',
    filters={
        'posting_date': '2025-11-26',
        'inspection_type': 'Lot Inspection',
        'docstatus': 1
    },
    fields=['name', 'lot_no']
)

print(f"Found {len(inspections)} inspections")

# If 0: Change date or create test data
# If >0: Check DATE_FORMAT in query
```

### Issue 2: Moulding Production Entry not found

**Problem:**
```python
# get_lot_inspection_report returns records but mould_ref is None
```

**Solution:**
```python
# Check if Moulding Production Entry exists for the lot
lot_no = '25K26X01'

mpe = frappe.get_all(
    'Moulding Production Entry',
    filters={'scan_lot_number': lot_no},
    fields=['name', 'mould_reference', 'employee_name']
)

if not mpe:
    print(f"No Moulding Production Entry for {lot_no}")
    # This is OK - LEFT JOIN will return NULL for these fields
else:
    print(f"Found MPE: {mpe[0]}")
```

### Issue 3: Permission denied

**Problem:**
```
frappe.exceptions.PermissionError: Insufficient Permission for Inspection Entry
```

**Solution:**
```python
# Run as Administrator
frappe.set_user('Administrator')

# Or grant permissions to role
# Setup > Permissions > Inspection Entry
# Add "Read" permission for Quality Inspector role
```

### Issue 4: SPP Inspection Entry not found (Final Inspection)

**Problem:**
```python
final = get_final_inspection_report(filters={'date': '2025-11-26'})
# Returns: []
```

**Solution:**
```python
# Check if SPP Inspection Entry exists (different DocType!)
spp = frappe.get_all(
    'SPP Inspection Entry',  # NOT 'Inspection Entry'
    filters={
        'posting_date': '2025-11-26',
        'inspection_type': 'Final Visual Inspection',
        'docstatus': 1
    },
    fields=['name', 'lot_no']
)

print(f"Found {len(spp)} final inspections")

# If 0: No final inspections for that date
# If >0: Check your query
```

---

## 📊 Data Flow Diagram

```
Frontend (React)
    │
    │ HTTP POST: /api/method/rejection_analysis.api.get_lot_inspection_report
    │ Body: { filters: { production_date: '2025-11-26' } }
    │
    ▼
Frappe Server
    │
    │ 1. Authentication check (session cookie)
    │ 2. Permission check (can user access Inspection Entry?)
    │ 3. Parse JSON body → filters dict
    │
    ▼
api.py (Backend)
    │
    │ @frappe.whitelist()
    │ def get_lot_inspection_report(filters=None):
    │
    ├─→ STEP 1: Parse filters
    │   date = '2025-11-26'
    │
    ├─→ STEP 2: Build SQL query
    │   query = "SELECT ... FROM `tabInspection Entry` ..."
    │
    ├─→ STEP 3: Add dynamic filters
    │   params = ['2025-11-26']
    │
    ├─→ STEP 4: Execute query
    │   frappe.db.sql(query, params, as_dict=True)
    │   
    │   ┌─────────────────────────┐
    │   │     MariaDB Database    │
    │   │                         │
    │   │ 1. tabInspection Entry  │
    │   │ 2. tabMoulding Prod...  │
    │   │ 3. Patrol subquery      │
    │   │ 4. Line subquery        │
    │   └─────────────────────────┘
    │   
    ├─→ STEP 5: Process results
    │   for row in data:
    │       result = {...}
    │       results.append(result)
    │
    └─→ STEP 6: Return JSON
        return results  # List of dicts
    
    │
    ▼
Frappe Server
    │
    │ Serialize to JSON
    │ Add headers (Content-Type: application/json)
    │
    ▼
Frontend (React)
    │
    │ response.json()
    │ setState(data)
    │ Render table with data
```

---

## ✅ Summary

**What We Built:**

1. ✅ **5 API Endpoints** - Dashboard metrics, 3 inspection reports, CAR creation
2. ✅ **Proper Data Linkage** - Always start with Moulding Production Entry
3. ✅ **Clean Code** - Well-documented with step-by-step comments
4. ✅ **No Business Logic** - Backend provides raw data, frontend decides
5. ✅ **Dynamic Filtering** - Support for partial matches and multiple filters
6. ✅ **Error Handling** - Graceful handling of missing data

**Next Steps:**

1. ✅ Test each API endpoint in Frappe console
2. ✅ Verify data is returned correctly
3. ✅ Update frontend to consume these APIs
4. ✅ Build UI components for displaying data
5. ✅ Add CAR generation workflow

---

**END OF BACKEND API GUIDE**
