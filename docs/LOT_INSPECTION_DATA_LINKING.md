# Lot Inspection Report - Data Linking Strategy
**Rejection Analysis Console**

---

## 📋 OVERVIEW

This document defines the data linking strategy for the Lot Inspection Report in the Rejection Analysis Console. The report aggregates data from multiple DocTypes to provide a comprehensive view of production lots and their inspection results.

---

## 🎯 PRIMARY DATA SOURCE

### Moulding Production Entry
**The primary record source, filtered by `posting_date` (user-selected date)**

| Field | Type | Description |
|-------|------|-------------|
| `posting_date` | Date | Production date (PRIMARY FILTER) |
| `scan_lot_number` | Data | Lot number identifier |
| `item_to_produce` | Link→Item | Item being produced |
| `mould_reference` | Link→Asset | Mould used for production |
| `workstation` | Link→Workstation | Machine/Press number |
| `employee` | Link→Employee | Operator |
| `scan_operator` | Data | Scanned operator code |
| `job_card` | Link→Job Card | Reference to Job Card |

---

## 🔗 TABLE RELATIONSHIPS

```
┌─────────────────────────────────┐
│   Moulding Production Entry     │ ◄── PRIMARY (filter by posting_date)
│   ─────────────────────────────│
│   • posting_date               │
│   • scan_lot_number (lot)      │
│   • mould_reference            │
│   • item_to_produce            │
│   • workstation                │
│   • employee / scan_operator   │
│   • job_card ──────────────────┼────┐
└─────────────────────────────────┘    │
              │                         │
              │ lot_no                  │
              ▼                         ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│     Inspection Entry            │  │        Job Card                 │
│   ─────────────────────────────│  │   ─────────────────────────────│
│   • lot_no                      │  │   • shift_number (1/2/3)       │
│   • inspection_type             │  │   • shift_supervisor           │
│   • total_rejected_qty_in_%     │  │   • workstation                │
│   • machine_no                  │  │   • mould_reference            │
│   • operator_name               │  │   • press_no                   │
│   • product_ref_no              │  │   • batch_code (lot)           │
│   • posting_date                │  │   • operator_code              │
└─────────────────────────────────┘  └─────────────────────────────────┘
```

---

## 📊 DATA SOURCE MAPPING

### UI Column → Data Source

| UI Column | Source DocType | Field Name | Notes |
|-----------|---------------|------------|-------|
| **Production Date** | Moulding Production Entry | `posting_date` | Primary filter |
| **Shift Type** | Job Card | `shift_number` | Options: `1`, `2`, `3` (display as-is) |
| **Operator Name** | Moulding Production Entry | `employee` or `scan_operator` | Link→Employee or scanned code |
| **Press Number** | Moulding Production Entry | `workstation` | Link→Workstation |
| **Item Code** | Moulding Production Entry | `item_to_produce` | Link→Item |
| **Mould Ref** | Moulding Production Entry | `mould_reference` | Link→Asset |
| **Lot No** | Moulding Production Entry | `scan_lot_number` | Primary identifier |
| **Patrol REJ%** | Inspection Entry | `total_rejected_qty_in_percentage` | WHERE `inspection_type='Patrol Inspection'` |
| **Line REJ%** | Inspection Entry | `total_rejected_qty_in_percentage` | WHERE `inspection_type='Line Inspection'` |
| **LOT REJ%** | Inspection Entry | `total_rejected_qty_in_percentage` | WHERE `inspection_type='Lot Inspection'` |

---

## 🔍 JOB CARD SHIFT FIELDS

### Custom Fields in Job Card (from shree_polymer_custom_app)

| Field Name | Field Type | Options | Label | Purpose |
|------------|------------|---------|-------|---------|
| `shift_number` | Select | `1\n2\n3` | Shift Number | Identifies shift (1, 2, or 3) |
| `shift_supervisor` | Link→Employee | | Shift Supervisor | Supervisor for the shift |
| `press_no` | Data | | Press No | Press number identifier |
| `operator_code` | Data | | Operator Code | Operator identifier |
| `batch_code` | Data | | Production Lot Number | Alternative lot reference |
| `mould_reference` | Link→Asset | | Mould Reference | Mould used (Asset link) |

### Shift Number Display
- **Database Values:** `1`, `2`, `3`
- **UI Display:** `1`, `2`, `3` (displayed as-is per user requirement)
- **Note:** No mapping to A/B/C - show numeric values directly

---

## 📝 SQL QUERY STRUCTURE

### Main Report Query

```sql
SELECT 
    -- Production Data (Primary)
    mpe.posting_date AS production_date,
    mpe.scan_lot_number AS lot_no,
    mpe.item_to_produce AS item_code,
    mpe.mould_reference AS mould_ref,
    mpe.workstation AS press_number,
    COALESCE(mpe.employee, mpe.scan_operator) AS operator_name,
    
    -- Shift Data (from Job Card)
    jc.shift_number AS shift_type,
    
    -- Rejection Percentages (from Inspection Entry)
    COALESCE(patrol.rej_pct, 0) AS patrol_rej_pct,
    COALESCE(line.rej_pct, 0) AS line_rej_pct,
    COALESCE(lot_insp.rej_pct, 0) AS lot_rej_pct,
    
    -- Reference IDs
    mpe.name AS moulding_production_entry,
    jc.name AS job_card,
    lot_insp.inspection_entry AS lot_inspection_entry
    
FROM `tabMoulding Production Entry` mpe

-- Join to Job Card for shift_number
LEFT JOIN `tabJob Card` jc 
    ON jc.name = mpe.job_card

-- Patrol Inspection aggregation
LEFT JOIN (
    SELECT 
        lot_no, 
        AVG(total_rejected_qty_in_percentage) AS rej_pct,
        GROUP_CONCAT(name) AS inspection_entries
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Patrol Inspection' 
      AND docstatus = 1
    GROUP BY lot_no
) patrol 
    ON patrol.lot_no = mpe.scan_lot_number

-- Line Inspection aggregation
LEFT JOIN (
    SELECT 
        lot_no, 
        AVG(total_rejected_qty_in_percentage) AS rej_pct,
        GROUP_CONCAT(name) AS inspection_entries
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Line Inspection' 
      AND docstatus = 1
    GROUP BY lot_no
) line 
    ON line.lot_no = mpe.scan_lot_number

-- Lot Inspection aggregation
LEFT JOIN (
    SELECT 
        lot_no, 
        AVG(total_rejected_qty_in_percentage) AS rej_pct,
        MAX(name) AS inspection_entry
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Lot Inspection' 
      AND docstatus = 1
    GROUP BY lot_no
) lot_insp 
    ON lot_insp.lot_no = mpe.scan_lot_number

WHERE 
    mpe.posting_date = %(selected_date)s
    AND mpe.docstatus = 1

ORDER BY 
    mpe.scan_lot_number DESC
```

### Dashboard Metrics Query

```sql
-- Get metrics for dashboard summary
SELECT 
    COUNT(DISTINCT mpe.scan_lot_number) AS total_lots,
    
    -- Pending lots (production entries without lot inspection)
    SUM(CASE WHEN lot_insp.lot_no IS NULL THEN 1 ELSE 0 END) AS pending_lots,
    
    -- Average rejection percentages
    AVG(COALESCE(patrol.rej_pct, 0)) AS patrol_rej_avg,
    AVG(COALESCE(line.rej_pct, 0)) AS line_rej_avg,
    AVG(COALESCE(lot_insp.rej_pct, 0)) AS lot_rej_avg,
    
    -- Lots exceeding threshold
    SUM(CASE WHEN COALESCE(lot_insp.rej_pct, 0) > 5.0 THEN 1 ELSE 0 END) AS lots_exceeding_threshold
    
FROM `tabMoulding Production Entry` mpe

LEFT JOIN (
    SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS rej_pct
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Patrol Inspection' AND docstatus = 1
    GROUP BY lot_no
) patrol ON patrol.lot_no = mpe.scan_lot_number

LEFT JOIN (
    SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS rej_pct
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Line Inspection' AND docstatus = 1
    GROUP BY lot_no
) line ON line.lot_no = mpe.scan_lot_number

LEFT JOIN (
    SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS rej_pct
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Lot Inspection' AND docstatus = 1
    GROUP BY lot_no
) lot_insp ON lot_insp.lot_no = mpe.scan_lot_number

WHERE 
    mpe.posting_date = %(selected_date)s
    AND mpe.docstatus = 1
```

---

## 🔧 API ENDPOINT IMPLEMENTATION

### Python API Function

```python
# rejection_analysis/rejection_analysis/api/lot_inspection.py

import frappe
from frappe import _

@frappe.whitelist()
def get_lot_inspection_report(filters=None):
    """
    Get lot inspection report data with aggregated rejection percentages
    
    Args:
        filters (dict): {
            "production_date": "2025-11-25",
            "shift_type": "1",           # Optional
            "operator_name": "EMP-001",  # Optional
            "press_number": "WS-001",    # Optional
            "item_code": "ITEM-001",     # Optional
            "mould_ref": "ASSET-001",    # Optional
            "lot_no": "LOT-12345"        # Optional
        }
    
    Returns:
        list: List of lot inspection records with aggregated data
    """
    if not filters:
        filters = {}
    
    # Build conditions
    conditions = ["mpe.docstatus = 1"]
    values = {}
    
    if filters.get("production_date"):
        conditions.append("mpe.posting_date = %(production_date)s")
        values["production_date"] = filters["production_date"]
    
    if filters.get("shift_type"):
        conditions.append("jc.shift_number = %(shift_type)s")
        values["shift_type"] = filters["shift_type"]
    
    if filters.get("operator_name"):
        conditions.append("(mpe.employee = %(operator_name)s OR mpe.scan_operator = %(operator_name)s)")
        values["operator_name"] = filters["operator_name"]
    
    if filters.get("press_number"):
        conditions.append("mpe.workstation = %(press_number)s")
        values["press_number"] = filters["press_number"]
    
    if filters.get("item_code"):
        conditions.append("mpe.item_to_produce = %(item_code)s")
        values["item_code"] = filters["item_code"]
    
    if filters.get("mould_ref"):
        conditions.append("mpe.mould_reference = %(mould_ref)s")
        values["mould_ref"] = filters["mould_ref"]
    
    if filters.get("lot_no"):
        conditions.append("mpe.scan_lot_number LIKE %(lot_no)s")
        values["lot_no"] = f"%{filters['lot_no']}%"
    
    where_clause = " AND ".join(conditions)
    
    query = f"""
        SELECT 
            mpe.posting_date AS production_date,
            jc.shift_number AS shift_type,
            COALESCE(emp.employee_name, mpe.scan_operator, mpe.employee) AS operator_name,
            mpe.workstation AS press_number,
            mpe.item_to_produce AS item_code,
            mpe.mould_reference AS mould_ref,
            mpe.scan_lot_number AS lot_no,
            COALESCE(patrol.rej_pct, 0) AS patrol_rej_pct,
            COALESCE(line.rej_pct, 0) AS line_rej_pct,
            COALESCE(lot_insp.rej_pct, 0) AS lot_rej_pct,
            mpe.name AS moulding_production_entry,
            lot_insp.inspection_entry AS lot_inspection_entry
            
        FROM `tabMoulding Production Entry` mpe
        
        LEFT JOIN `tabJob Card` jc ON jc.name = mpe.job_card
        LEFT JOIN `tabEmployee` emp ON emp.name = mpe.employee
        
        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS rej_pct
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Patrol Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) patrol ON patrol.lot_no = mpe.scan_lot_number
        
        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS rej_pct
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Line Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) line ON line.lot_no = mpe.scan_lot_number
        
        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS rej_pct, MAX(name) AS inspection_entry
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Lot Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) lot_insp ON lot_insp.lot_no = mpe.scan_lot_number
        
        WHERE {where_clause}
        
        ORDER BY mpe.scan_lot_number DESC
    """
    
    return frappe.db.sql(query, values, as_dict=True)


@frappe.whitelist()
def get_dashboard_metrics(date, inspection_type="Lot Inspection"):
    """
    Get dashboard metrics for the selected date
    
    Args:
        date (str): Date in YYYY-MM-DD format
        inspection_type (str): Type of inspection
    
    Returns:
        dict: Dashboard metrics
    """
    query = """
        SELECT 
            COUNT(DISTINCT mpe.scan_lot_number) AS total_lots,
            SUM(CASE WHEN lot_insp.lot_no IS NULL THEN 1 ELSE 0 END) AS pending_lots,
            COALESCE(AVG(patrol.rej_pct), 0) AS patrol_rej_avg,
            COALESCE(AVG(line.rej_pct), 0) AS line_rej_avg,
            COALESCE(AVG(lot_insp.rej_pct), 0) AS lot_rej_avg,
            SUM(CASE WHEN COALESCE(lot_insp.rej_pct, 0) > 5.0 THEN 1 ELSE 0 END) AS lots_exceeding_threshold
            
        FROM `tabMoulding Production Entry` mpe
        
        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS rej_pct
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Patrol Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) patrol ON patrol.lot_no = mpe.scan_lot_number
        
        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS rej_pct
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Line Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) line ON line.lot_no = mpe.scan_lot_number
        
        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS rej_pct
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Lot Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) lot_insp ON lot_insp.lot_no = mpe.scan_lot_number
        
        WHERE mpe.posting_date = %s AND mpe.docstatus = 1
    """
    
    result = frappe.db.sql(query, [date], as_dict=True)
    
    if result:
        return {
            "total_lots": result[0].total_lots or 0,
            "pending_lots": result[0].pending_lots or 0,
            "patrol_rej_avg": round(result[0].patrol_rej_avg or 0, 2),
            "line_rej_avg": round(result[0].line_rej_avg or 0, 2),
            "lot_rej_avg": round(result[0].lot_rej_avg or 0, 2),
            "lots_exceeding_threshold": result[0].lots_exceeding_threshold or 0
        }
    
    return {
        "total_lots": 0,
        "pending_lots": 0,
        "patrol_rej_avg": 0,
        "line_rej_avg": 0,
        "lot_rej_avg": 0,
        "lots_exceeding_threshold": 0
    }
```

---

## 🎨 REACT COMPONENT DATA TYPES

### TypeScript Interfaces

```typescript
// src/types/lot-inspection.ts

export interface LotInspectionRecord {
  production_date: string;           // "2025-11-25"
  shift_type: string;                // "1", "2", "3"
  operator_name: string;             // "John Doe"
  press_number: string;              // "WS-001"
  item_code: string;                 // "ITEM-001"
  mould_ref: string;                 // "ASSET-001"
  lot_no: string;                    // "LOT-12345"
  patrol_rej_pct: number;            // 2.5
  line_rej_pct: number;              // 1.8
  lot_rej_pct: number;               // 7.0
  moulding_production_entry: string; // "MPE-00001"
  lot_inspection_entry: string | null; // "INSP-00001"
}

export interface DashboardMetrics {
  total_lots: number;
  pending_lots: number;
  patrol_rej_avg: number;
  line_rej_avg: number;
  lot_rej_avg: number;
  lots_exceeding_threshold: number;
}

export interface LotInspectionFilters {
  production_date?: string;
  shift_type?: string;      // "1", "2", "3"
  operator_name?: string;
  press_number?: string;
  item_code?: string;
  mould_ref?: string;
  lot_no?: string;
}
```

---

## 📋 FILTER OPTIONS

### Shift Type Filter
```typescript
const shiftTypeOptions = [
  { value: "", label: "All Shifts" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" }
];
```

### Dynamic Filters (Fetched from Frappe)
- **Operator Name:** Autocomplete from `Employee` DocType
- **Press Number:** Autocomplete from `Workstation` DocType
- **Item Code:** Autocomplete from `Item` DocType
- **Mould Ref:** Autocomplete from `Asset` DocType

---

## 🎯 REJECTION THRESHOLD LOGIC

### Color Coding
```typescript
const getRejectionColor = (percentage: number): string => {
  if (percentage >= 5.0) return 'text-red-600 font-bold';   // Critical
  if (percentage >= 3.0) return 'text-yellow-600';          // Warning
  return 'text-green-600';                                   // Normal
};

const getRowBackground = (lotRejPct: number): string => {
  if (lotRejPct >= 5.0) return 'bg-red-50';
  return '';
};
```

### Generate CAR Button Logic
```typescript
const shouldShowGenerateCAR = (lotRejPct: number): boolean => {
  return lotRejPct > 5.0;  // Show only if exceeds 5% threshold
};
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Backend Tasks
- [ ] Create `lot_inspection.py` API file
- [ ] Implement `get_lot_inspection_report()` function
- [ ] Implement `get_dashboard_metrics()` function
- [ ] Add API endpoints to `hooks.py`
- [ ] Test queries with sample data

### Frontend Tasks
- [ ] Create TypeScript interfaces
- [ ] Implement filter component with shift type dropdown
- [ ] Implement data table with color coding
- [ ] Connect to Frappe API using `frappe-react-sdk`
- [ ] Add "Generate CAR" button with conditional display

### Testing
- [ ] Verify shift_number values display correctly (1, 2, 3)
- [ ] Test filter combinations
- [ ] Verify rejection percentage calculations
- [ ] Test with production data

---

## 📌 IMPORTANT NOTES

1. **Shift Number Display:** Values are `1`, `2`, `3` - displayed as-is (not mapped to A/B/C)

2. **Primary Filter:** Always filter by `posting_date` on `Moulding Production Entry`

3. **Lot Number Linking:** `scan_lot_number` in Moulding Production Entry = `lot_no` in Inspection Entry

4. **Multiple Inspections:** A single lot may have multiple patrol/line inspections - use AVG for aggregation

5. **Pending Lots:** Lots with no `Lot Inspection` entry are considered "pending"

6. **Job Card Link:** Access shift information via `job_card` field on Moulding Production Entry

---

**Document Version:** 1.0  
**Last Updated:** November 26, 2025  
**Author:** Rejection Analysis Development Team
