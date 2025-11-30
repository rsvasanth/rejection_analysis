# Incoming Inspection Data Linkage Documentation

**Date:** November 26, 2025  
**Module:** Rejection Analysis Console  
**Purpose:** Define data relationships and linkage strategy for Incoming Inspection Report

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Data Source Hierarchy](#data-source-hierarchy)
3. [Lot Inspection vs Incoming Inspection Linkage](#lot-inspection-vs-incoming-inspection-linkage)
4. [DocType Relationships](#doctype-relationships)
5. [Field Mapping Reference](#field-mapping-reference)
6. [SQL Query Implementation](#sql-query-implementation)
7. [API Endpoint Specification](#api-endpoint-specification)
8. [Frontend Data Model](#frontend-data-model)

---

## 🎯 Executive Summary

### Key Principle: **Moulding Production Entry is the Source of Truth**

All inspection-related queries (Lot Inspection, Incoming Inspection, Final Inspection) must:
1. **START** with `Moulding Production Entry` as the primary data source
2. Use `scan_lot_number` as the **PRIMARY KEY** for all joins
3. Inherit core fields (`mould_reference`, `item_to_manufacture`, `employee_name`) from MPE

### Why This Matters
- **Consistency**: Same lot data across all inspection types
- **Traceability**: Complete production-to-inspection linkage
- **Data Integrity**: Single source of truth prevents data mismatches

---

## 🏗️ Data Source Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│         MOULDING PRODUCTION ENTRY (MPE)                 │
│         ═══════════════════════════════════             │
│         PRIMARY SOURCE OF TRUTH                         │
│                                                         │
│  Key Fields:                                            │
│  • scan_lot_number (PRIMARY KEY)                        │
│  • mould_reference                                      │
│  • item_to_manufacture                                  │
│  • employee_name (operator)                             │
│  • moulding_date (production date)                      │
│  • job_card (FK to Job Card)                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ scan_lot_number (FK)
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│   JOB CARD       │    │ INSPECTION ENTRY     │
│   ────────       │    │ ────────────────     │
│                  │    │                      │
│  • shift_type    │    │ inspection_type:     │
│  • workstation   │    │  - Lot Inspection    │
│  • batch_no      │    │  - Incoming Insp     │
│  • posting_date  │    │  - Line Inspection   │
│                  │    │  - Patrol Insp       │
└──────────────────┘    │  - Final Visual      │
                        │                      │
                        │  • lot_no (FK)       │
                        │  • inspector_name    │
                        │  • rejected_qty      │
                        │  • rejected_%        │
                        └──────────────────────┘
                                 │
                                 │ lot_number (FK)
                                 │
                    ┌────────────┴─────────────┐
                    │                          │
                    ▼                          ▼
        ┌──────────────────────┐   ┌──────────────────────┐
        │ DEFLASHING DESPATCH  │   │ DEFLASHING RECEIPT   │
        │ ─────────────────── │   │ ──────────────────── │
        │                      │   │                      │
        │ • lot_number (FK)    │   │ • lot_number (FK)    │
        │ • posting_date       │   │ • posting_date       │
        │ • vendor             │   │ • vendor             │
        │ • qty_sent           │   │ • qty_despatched_nos │
        │                      │   │ • qty_received_nos   │
        │                      │   │ • difference_%       │
        │                      │   │ • scrap_weight       │
        └──────────────────────┘   └──────────────────────┘
```

---

## 📊 Lot Inspection vs Incoming Inspection Linkage

### Comparison Table

| Aspect | **Lot Inspection** | **Incoming Inspection** |
|--------|-------------------|------------------------|
| **Primary DocType** | Moulding Production Entry | Moulding Production Entry |
| **Inspection DocType** | Inspection Entry | Inspection Entry |
| **Additional DocTypes** | Job Card | Deflashing Receipt Entry, Deflashing Despatch Entry |
| **Join Key** | `scan_lot_number` = `lot_no` | `scan_lot_number` = `lot_no` |
| **Date Filter** | `ie.posting_date` (inspection date) | `ie.posting_date` (inspection date) |
| **Unique Fields** | Patrol REJ%, Line REJ%, Shift Type | Qty Sent, Qty Received, Diff%, Deflasher Name |
| **Rejection Metrics** | Aggregated from Patrol + Line + Lot | Single Incoming Inspection REJ% |
| **Production Context** | In-house production | Post-deflashing receipt |
| **Operator Context** | Moulding operator | Deflashing vendor |

---

## 🔗 DocType Relationships

### For **LOT INSPECTION REPORT**

```sql
Moulding Production Entry (MPE)
    ↓ scan_lot_number
Inspection Entry (IE) [inspection_type = 'Lot Inspection']
    ↓ lot_no
Job Card (JC) [via mpe.job_card]
    ↓
Aggregated Patrol Inspection (subquery on lot_no)
Aggregated Line Inspection (subquery on lot_no)
```

**Join Logic:**
```sql
FROM `tabMoulding Production Entry` mpe
INNER JOIN `tabInspection Entry` ie 
    ON ie.lot_no = mpe.scan_lot_number
    AND ie.inspection_type = 'Lot Inspection'
LEFT JOIN `tabJob Card` jc 
    ON jc.name = mpe.job_card
LEFT JOIN (Patrol subquery) patrol 
    ON patrol.lot_no = ie.lot_no
LEFT JOIN (Line subquery) line 
    ON line.lot_no = ie.lot_no
```

---

### For **INCOMING INSPECTION REPORT**

```sql
Moulding Production Entry (MPE)
    ↓ scan_lot_number
Inspection Entry (IE) [inspection_type = 'Incoming Inspection']
    ↓ lot_no
Deflashing Receipt Entry (DRE) [via lot_number]
    ↓
Deflashing Despatch Entry (DDE) [via lot_number] (optional)
    ↓
Job Card (JC) [via mpe.job_card]
```

**Join Logic:**
```sql
FROM `tabMoulding Production Entry` mpe
INNER JOIN `tabInspection Entry` ie 
    ON ie.lot_no = mpe.scan_lot_number
    AND ie.inspection_type = 'Incoming Inspection'
LEFT JOIN `tabDeflashing Receipt Entry` dre 
    ON dre.lot_number = mpe.scan_lot_number
LEFT JOIN `tabDeflashing Despatch Entry` dde 
    ON dde.lot_number = mpe.scan_lot_number
LEFT JOIN `tabJob Card` jc 
    ON jc.name = mpe.job_card
```

---

## 📝 Field Mapping Reference

### **INCOMING INSPECTION REPORT - Complete Field Map**

| UI Column | Data Source DocType | Field Name | Data Type | Join Path | Notes |
|-----------|-------------------|------------|-----------|-----------|-------|
| **DATE** | Inspection Entry | `posting_date` | Date | `ie.posting_date` | Inspection date |
| **BATCH NO** | Job Card | `batch_no` | Link→Batch | `jc.batch_no` | Via MPE → JC join |
| **ITEM** | Moulding Production Entry | `item_to_manufacture` | Link→Item | `mpe.item_to_manufacture` | **SOURCE OF TRUTH** |
| **MOULD REF** | Moulding Production Entry | `mould_reference` | Data | `mpe.mould_reference` | **SOURCE OF TRUTH** |
| **DEFLASHER NAME** | Deflashing Receipt Entry | `scan_deflashing_vendor` | Data | `dre.scan_deflashing_vendor` | Barcode/Vendor ID |
| **QUANTITY SENT** | Deflashing Receipt Entry | `qty_despatched_nos` | Float | `dre.qty_despatched_nos` | Qty sent to vendor |
| **QUANTITY RECEIVED** | Deflashing Receipt Entry | `qty_received_nos` | Float | `dre.qty_received_nos` | Qty received back |
| **DIFF%** | Deflashing Receipt Entry | `difference_nos_percentage` | Float | `dre.difference_nos_percentage` | **Loss percentage** |
| **INSPECTOR NAME** | Inspection Entry | `inspector_name` | Data | `ie.inspector_name` | Inspector who checked |
| **INSP QTY** | Inspection Entry | `total_inspected_qty_nos` | Int | `ie.total_inspected_qty_nos` | Qty inspected |
| **REJ QTY** | Inspection Entry | `total_rejected_qty` | Int | `ie.total_rejected_qty` | Qty rejected |
| **REJ%** | Inspection Entry | `total_rejected_qty_in_percentage` | Percent | `ie.total_rejected_qty_in_percentage` | **PRIMARY METRIC** |
| **ACTION** | Computed | - | - | `rej% > threshold ? 'GENERATE CAR' : null` | Conditional button |

---

### **LOT INSPECTION REPORT - Field Map (For Comparison)**

| UI Column | Data Source DocType | Field Name | Data Type | Join Path |
|-----------|-------------------|------------|-----------|-----------|
| **Production Date** | Job Card | `posting_date` | Date | `jc.posting_date` |
| **Shift Type** | Job Card | `shift_type` | Data | `jc.shift_type` |
| **Operator Name** | Moulding Production Entry | `employee_name` | Data | `mpe.employee_name` |
| **Press Number** | Job Card | `workstation` | Link→Workstation | `jc.workstation` |
| **Item Code** | Moulding Production Entry | `item_to_manufacture` | Link→Item | `mpe.item_to_manufacture` |
| **Mould Ref** | Moulding Production Entry | `mould_reference` | Data | `mpe.mould_reference` |
| **Lot No** | Inspection Entry | `lot_no` | Data | `ie.lot_no` |
| **Patrol REJ%** | Aggregated Subquery | `AVG(total_rejected_qty_in_percentage)` | Percent | Patrol subquery |
| **Line REJ%** | Aggregated Subquery | `AVG(total_rejected_qty_in_percentage)` | Percent | Line subquery |
| **Lot REJ%** | Inspection Entry | `total_rejected_qty_in_percentage` | Percent | `ie.total_rejected_qty_in_percentage` |
| **ACTION** | Computed | - | - | `lot_rej% > threshold ? 'GENERATE CAR' : null` |

---

## 🔧 SQL Query Implementation

### **INCOMING INSPECTION REPORT - Complete Query**

```sql
SELECT
    -- Inspection date
    ie.posting_date AS date,
    ie.name AS inspection_entry,
    
    -- Core lot data from Moulding Production Entry (SOURCE OF TRUTH)
    mpe.scan_lot_number AS lot_no,
    mpe.item_to_manufacture AS item,
    mpe.mould_reference AS mould_ref,
    mpe.employee_name AS operator_name,
    mpe.moulding_date AS production_date,
    
    -- Batch from Job Card
    jc.batch_no AS batch_no,
    
    -- Deflashing vendor & quantity tracking from Deflashing Receipt Entry
    dre.scan_deflashing_vendor AS deflasher_name,
    dre.qty_despatched_nos AS qty_sent,
    dre.qty_received_nos AS qty_received,
    dre.difference_nos_percentage AS diff_pct,
    dre.posting_date AS receipt_date,
    
    -- Inspection results from Inspection Entry
    ie.inspector_name,
    ie.total_inspected_qty_nos AS insp_qty,
    ie.total_rejected_qty AS rej_qty,
    ie.total_rejected_qty_in_percentage AS rej_pct

FROM `tabMoulding Production Entry` mpe

-- Join to Inspection Entry (inspection_type = 'Incoming Inspection')
INNER JOIN `tabInspection Entry` ie 
    ON ie.lot_no = mpe.scan_lot_number
    AND ie.inspection_type = 'Incoming Inspection'
    AND ie.docstatus = 1

-- LEFT JOIN to Deflashing Receipt Entry (may not exist for all lots)
LEFT JOIN `tabDeflashing Receipt Entry` dre 
    ON dre.lot_number = mpe.scan_lot_number
    AND dre.docstatus = 1

-- LEFT JOIN to Job Card (for batch_no)
LEFT JOIN `tabJob Card` jc 
    ON jc.name = mpe.job_card

WHERE
    ie.posting_date = %s  -- Selected date parameter
    
ORDER BY ie.posting_date DESC, mpe.scan_lot_number DESC
```

---

### **LOT INSPECTION REPORT - Query (For Comparison)**

```sql
SELECT
    -- Date and shift info
    ie.posting_date,
    jc.posting_date AS job_date,
    jc.shift_type,
    
    -- Core lot data from MPE (SOURCE OF TRUTH)
    mpe.scan_lot_number AS lot_no,
    mpe.item_to_manufacture AS item_code,
    mpe.mould_reference AS mould_ref,
    mpe.employee_name AS operator_name,
    mpe.moulding_date AS production_date,
    
    -- Press/workstation
    jc.workstation AS press_number,
    
    -- Inspection results
    ie.name AS inspection_entry,
    ie.total_rejected_qty_in_percentage AS lot_rej_pct,
    ie.total_inspected_qty_nos,
    ie.total_rejected_qty,
    
    -- Aggregated rejection rates
    COALESCE(patrol.avg_rej, 0) AS patrol_rej_pct,
    COALESCE(line.avg_rej, 0) AS line_rej_pct

FROM `tabMoulding Production Entry` mpe

-- Join to Lot Inspection Entry
INNER JOIN `tabInspection Entry` ie 
    ON ie.lot_no = mpe.scan_lot_number
    AND ie.inspection_type = 'Lot Inspection'
    AND ie.docstatus = 1

-- Join to Job Card
LEFT JOIN `tabJob Card` jc 
    ON jc.name = mpe.job_card

-- Subquery for Patrol rejection aggregation
LEFT JOIN (
    SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS avg_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Patrol Inspection' AND docstatus = 1
    GROUP BY lot_no
) patrol ON patrol.lot_no = ie.lot_no

-- Subquery for Line rejection aggregation
LEFT JOIN (
    SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS avg_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Line Inspection' AND docstatus = 1
    GROUP BY lot_no
) line ON line.lot_no = ie.lot_no

WHERE
    ie.posting_date = %s  -- Selected date parameter
    
ORDER BY ie.lot_no DESC
```

---

## 🔌 API Endpoint Specification

### **Endpoint: `get_incoming_inspection_report`**

**File:** `rejection_analysis/rejection_analysis/api.py`

```python
import frappe
from frappe import _
from frappe.utils import today, getdate

@frappe.whitelist()
def get_incoming_inspection_report(filters=None):
    """
    Get detailed incoming inspection report with deflashing vendor data
    
    Args:
        filters (dict): {
            "date": "2025-11-26",
            "item": "ITEM-001",
            "deflasher": "VENDOR-001",
            "lot_no": "25K15X05"
        }
    
    Returns:
        list: Array of incoming inspection records with all related data
    """
    if not filters:
        filters = {}

    date = filters.get("date", today())

    # Build SQL query starting from Moulding Production Entry
    query = """
        SELECT
            -- Inspection date
            ie.posting_date AS date,
            ie.name AS inspection_entry,
            
            -- Core lot data from MPE (SOURCE OF TRUTH)
            mpe.scan_lot_number AS lot_no,
            mpe.item_to_manufacture AS item,
            mpe.mould_reference AS mould_ref,
            mpe.employee_name AS operator_name,
            mpe.moulding_date AS production_date,
            
            -- Batch from Job Card
            jc.batch_no AS batch_no,
            
            -- Deflashing data from Deflashing Receipt Entry
            dre.scan_deflashing_vendor AS deflasher_name,
            dre.qty_despatched_nos AS qty_sent,
            dre.qty_received_nos AS qty_received,
            dre.difference_nos_percentage AS diff_pct,
            dre.posting_date AS receipt_date,
            
            -- Inspection results
            ie.inspector_name,
            ie.total_inspected_qty_nos AS insp_qty,
            ie.total_rejected_qty AS rej_qty,
            ie.total_rejected_qty_in_percentage AS rej_pct

        FROM `tabMoulding Production Entry` mpe

        INNER JOIN `tabInspection Entry` ie 
            ON ie.lot_no = mpe.scan_lot_number
            AND ie.inspection_type = 'Incoming Inspection'
            AND ie.docstatus = 1

        LEFT JOIN `tabDeflashing Receipt Entry` dre 
            ON dre.lot_number = mpe.scan_lot_number
            AND dre.docstatus = 1

        LEFT JOIN `tabJob Card` jc 
            ON jc.name = mpe.job_card

        WHERE ie.posting_date = %s
    """

    # Apply additional filters
    params = [date]
    conditions = []

    if filters.get("item"):
        conditions.append("mpe.item_to_manufacture = %s")
        params.append(filters["item"])

    if filters.get("deflasher"):
        conditions.append("dre.scan_deflashing_vendor LIKE %s")
        params.append(f"%{filters['deflasher']}%")

    if filters.get("lot_no"):
        conditions.append("mpe.scan_lot_number LIKE %s")
        params.append(f"%{filters['lot_no']}%")
    
    if filters.get("mould_ref"):
        conditions.append("mpe.mould_reference LIKE %s")
        params.append(f"%{filters['mould_ref']}%")

    if conditions:
        query += " AND " + " AND ".join(conditions)

    query += " ORDER BY ie.posting_date DESC, mpe.scan_lot_number DESC"

    # Execute query
    data = frappe.db.sql(query, params, as_dict=True)

    # Use hardcoded threshold (can be made configurable later)
    threshold = 5.0

    # Process results
    results = []
    for row in data:
        result = {
            "inspection_entry": row.get("inspection_entry"),
            "date": str(row.get("date")) if row.get("date") else None,
            "batch_no": row.get("batch_no"),
            "item": row.get("item"),
            "mould_ref": row.get("mould_ref"),
            "lot_no": row.get("lot_no"),
            "deflasher_name": row.get("deflasher_name") or "—",
            "qty_sent": row.get("qty_sent") or 0,
            "qty_received": row.get("qty_received") or 0,
            "diff_pct": round(row.get("diff_pct", 0), 2),
            "inspector_name": row.get("inspector_name"),
            "insp_qty": row.get("insp_qty") or 0,
            "rej_qty": row.get("rej_qty") or 0,
            "rej_pct": round(row.get("rej_pct", 0), 2),
            "exceeds_threshold": row.get("rej_pct", 0) > threshold,
            "threshold_percentage": threshold
        }
        results.append(result)

    return results
```

---

## 💻 Frontend Data Model

### **TypeScript Interface**

```typescript
// src/types/IncomingInspection.ts

export interface IncomingInspectionRecord {
  inspection_entry: string
  date: string
  batch_no: string | null
  item: string
  mould_ref: string
  lot_no: string
  deflasher_name: string
  qty_sent: number
  qty_received: number
  diff_pct: number
  inspector_name: string
  insp_qty: number
  rej_qty: number
  rej_pct: number
  exceeds_threshold: boolean
  threshold_percentage: number
}

export interface IncomingInspectionFilters {
  date: string
  item?: string
  deflasher?: string
  lot_no?: string
  mould_ref?: string
}
```

---

### **React Component Usage**

```tsx
// src/pages/Dashboard.tsx (Incoming Inspection Tab)

const fetchIncomingRecords = async (date: string) => {
  try {
    const result = await call.post('rejection_analysis.api.get_incoming_inspection_report', {
      filters: {
        date: date
      }
    })
    return result?.message || result || []
  } catch (error) {
    console.error('Error fetching incoming inspection records:', error)
    toast.error('Failed to load incoming inspection data')
    return []
  }
}

// In component
const [incomingRecords, setIncomingRecords] = useState<IncomingInspectionRecord[]>([])

useEffect(() => {
  if (selectedDate) {
    fetchIncomingRecords(selectedDate).then(setIncomingRecords)
  }
}, [selectedDate])
```

---

## 📊 Data Linkage Comparison Summary

### **Core Principle (Both Reports)**

```
START → Moulding Production Entry (scan_lot_number)
  ↓
JOIN → Inspection Entry (lot_no, inspection_type)
  ↓
JOIN → Additional DocTypes based on inspection type
```

### **Key Differences**

| Aspect | Lot Inspection | Incoming Inspection |
|--------|---------------|---------------------|
| **Primary Join** | MPE → IE (Lot Inspection) | MPE → IE (Incoming Inspection) |
| **Secondary Joins** | Job Card, Patrol subquery, Line subquery | Deflashing Receipt Entry, Job Card |
| **Aggregations** | 3 rejection % (Patrol, Line, Lot) | 1 rejection % + Qty difference % |
| **Vendor Context** | Internal (operator_name) | External (deflasher_name) |
| **Date Context** | Production date from Job Card | Receipt date + Inspection date |

---

## ✅ Implementation Checklist

### Backend Tasks
- [ ] Create `get_incoming_inspection_report()` API endpoint
- [ ] Test SQL query with real data
- [ ] Verify all joins return correct data
- [ ] Test filter parameters
- [ ] Add proper error handling
- [ ] Add permission checks

### Frontend Tasks
- [ ] Create `IncomingInspectionRecord` TypeScript interface
- [ ] Update Dashboard to fetch incoming inspection data
- [ ] Create table component for incoming records
- [ ] Add filter UI (date, item, deflasher, lot_no)
- [ ] Implement "GENERATE CAR" button logic
- [ ] Add loading states
- [ ] Add error handling

### Data Quality Tasks
- [ ] Verify lot_number consistency across DDE/DRE/IE
- [ ] Validate deflashing vendor data
- [ ] Check for null/missing deflashing records
- [ ] Test with lots that skip deflashing
- [ ] Verify threshold calculations

---

## 🎯 Next Steps

1. **Implement API endpoint** - Create `get_incoming_inspection_report()` in `rejection_analysis/api.py`
2. **Test with real data** - Run query in Frappe console
3. **Update frontend** - Add incoming inspection table to Dashboard
4. **Add filters** - Implement filter UI for incoming inspection
5. **Test edge cases** - Lots without deflashing, missing data, etc.
6. **Document findings** - Update this document with any discoveries

---

## 📚 Related Documentation

- [Lot Inspection Data Linkage](./REJECTION_ANALYSIS_CONSOLE_IMPLEMENTATION.md)
- [Inspection Entry Analysis](../apps/rejection_analysis/docs/INSPECTION_ENTRY_ANALYSIS.md)
- [UI Requirements Specification](../apps/rejection_analysis/docs/UI_REQUIREMENTS_SPEC.md)
- [Complete Implementation Roadmap](../apps/rejection_analysis/docs/COMPLETE_IMPLEMENTATION_ROADMAP.md)

---

**END OF DOCUMENT**
