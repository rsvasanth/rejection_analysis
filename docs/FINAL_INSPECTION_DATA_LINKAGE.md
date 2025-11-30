# Final Inspection Data Linkage Documentation

**Date:** November 26, 2025  
**Module:** Rejection Analysis Console  
**Purpose:** Define data relationships and linkage strategy for Final Inspection Report

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Backend Responsibility](#backend-responsibility)
3. [Data Source Hierarchy](#data-source-hierarchy)
4. [Final Inspection vs Lot Inspection Linkage](#final-inspection-vs-lot-inspection-linkage)
5. [DocType Relationships](#doctype-relationships)
6. [Field Mapping Reference](#field-mapping-reference)
7. [SQL Query Implementation](#sql-query-implementation)
8. [API Endpoint Specification](#api-endpoint-specification)
9. [Frontend Data Model](#frontend-data-model)

---

## 🎯 Executive Summary

### Key Principle: **Moulding Production Entry is the Source of Truth**

All inspection-related queries (Lot Inspection, Incoming Inspection, Final Inspection) must:
1. **START** with `Moulding Production Entry` as the primary data source
2. Use `scan_lot_number` as the **PRIMARY KEY** for all joins
3. Inherit core fields (`mould_reference`, `item_to_manufacture`, `employee_name`) from MPE

### Final Inspection Specifics
- **DocType Used:** `SPP Inspection Entry` (not regular Inspection Entry)
- **Inspection Type:** "Final Visual Inspection"
- **Primary Metric:** Final Inspection REJ%
- **Secondary Metrics:** Patrol REJ%, Line REJ%, Lot REJ% (aggregated)
- **Unique Feature:** Includes trimming operator information
- **CAR Threshold:** Final Inspection REJ% > 4% (computed in frontend)

### Why This Matters
- **Complete Quality Picture**: Shows all inspection stages (Patrol → Line → Lot → Final)
- **Traceability**: Complete production-to-final-inspection linkage
- **Process Insight**: Identifies where defects were caught or missed
- **Data Integrity**: Single source of truth prevents data mismatches

---

## 🎯 Backend Responsibility

**The backend API simply provides RAW DATA.** 

- ✅ Fetch all final inspection records
- ✅ Join to Moulding Production Entry (source of truth)
- ✅ Aggregate Patrol, Line, Lot rejection percentages
- ✅ Return complete dataset with all 4 rejection metrics
- ✅ Include a boolean flag `exceeds_threshold` (Final REJ% > 4%)
- ❌ **NO threshold configuration lookup**
- ❌ **NO CAR auto-generation**
- ❌ **NO complex business logic**

**Frontend Responsibility:**
- Filter display based on rejection percentages
- Show/hide "GENERATE CAR" button based on `exceeds_threshold` flag
- Handle CAR creation workflow
- Apply visual styling (color coding)

---

## 🏗️ Data Source Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│         MOULDING PRODUCTION ENTRY (MPE)                         │
│         ═══════════════════════════════════                     │
│         PRIMARY SOURCE OF TRUTH                                 │
│                                                                 │
│  Key Fields:                                                    │
│  • scan_lot_number (PRIMARY KEY)                                │
│  • mould_reference                                              │
│  • item_to_manufacture                                          │
│  • employee_name (moulding operator)                            │
│  • moulding_date (production date)                              │
│  • job_card (FK to Job Card)                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ scan_lot_number (FK)
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────────────────┐
│   JOB CARD       │    │ SPP INSPECTION ENTRY         │
│   ────────       │    │ ────────────────────────     │
│                  │    │                              │
│  • shift_type    │    │ inspection_type:             │
│  • workstation   │    │  "Final Visual Inspection"   │
│  • batch_no      │    │                              │
│  • posting_date  │    │  • lot_no (FK)               │
│                  │    │  • inspector_name            │
└──────────────────┘    │  • total_rejected_qty        │
                        │  • rejected_%                │
                        │  • warehouse                 │
                        │  • stage                     │
                        └──────────────────────────────┘
                                 │
                                 │ lot_no (FK)
                                 │
                    ┌────────────┴─────────────┐
                    │                          │
                    ▼                          ▼
        ┌──────────────────────┐   ┌──────────────────────┐
        │ INSPECTION ENTRY     │   │ TRIMMING/FINISHING   │
        │ ──────────────────── │   │ PROCESS DATA         │
        │                      │   │ (Future)             │
        │ Aggregated metrics:  │   │                      │
        │  - Patrol REJ%       │   │  • trimming_operator │
        │  - Line REJ%         │   │  • trimming_date     │
        │  - Lot REJ%          │   │  • qty_trimmed       │
        │                      │   │                      │
        └──────────────────────┘   └──────────────────────┘
```

---

## 📊 Final Inspection vs Lot Inspection Linkage

### Comparison Table

| Aspect | **Lot Inspection** | **Final Inspection** |
|--------|-------------------|----------------------|
| **Primary DocType** | Moulding Production Entry | Moulding Production Entry |
| **Inspection DocType** | Inspection Entry | **SPP Inspection Entry** |
| **Inspection Type** | "Lot Inspection" | "Final Visual Inspection" |
| **Additional DocTypes** | Job Card | Job Card, Inspection Entry (for aggregation) |
| **Join Key** | `scan_lot_number` = `lot_no` | `scan_lot_number` = `lot_no` |
| **Date Filter** | `ie.posting_date` | `spp_ie.posting_date` |
| **Unique Fields** | Patrol REJ%, Line REJ%, Shift Type | **Trimming Operator**, All 4 rejection % |
| **Rejection Metrics** | 3 metrics (Patrol, Line, Lot) | **4 metrics** (Patrol, Line, Lot, Final) |
| **Primary Metric** | Lot REJ% | **Final Inspection REJ%** |
| **Process Stage** | During production | Post-production (final check) |
| **Purpose** | In-process quality control | Pre-warehousing final validation |

---

## 🔗 DocType Relationships

### For **FINAL INSPECTION REPORT**

```sql
Moulding Production Entry (MPE)
    ↓ scan_lot_number
SPP Inspection Entry (SPP_IE) [inspection_type = 'Final Visual Inspection']
    ↓ lot_no
Job Card (JC) [via mpe.job_card]
    ↓
Aggregated Patrol Inspection (subquery on lot_no)
Aggregated Line Inspection (subquery on lot_no)
Aggregated Lot Inspection (subquery on lot_no)
```

**Join Logic:**
```sql
FROM `tabMoulding Production Entry` mpe

-- Join to SPP Inspection Entry (Final Visual Inspection)
INNER JOIN `tabSPP Inspection Entry` spp_ie 
    ON spp_ie.lot_no = mpe.scan_lot_number
    AND spp_ie.inspection_type = 'Final Visual Inspection'
    AND spp_ie.docstatus = 1

-- Join to Job Card (for shift, press, batch)
LEFT JOIN `tabJob Card` jc 
    ON jc.name = mpe.job_card

-- Subquery for Patrol rejection aggregation
LEFT JOIN (
    SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS avg_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Patrol Inspection' AND docstatus = 1
    GROUP BY lot_no
) patrol ON patrol.lot_no = spp_ie.lot_no

-- Subquery for Line rejection aggregation
LEFT JOIN (
    SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS avg_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Line Inspection' AND docstatus = 1
    GROUP BY lot_no
) line ON line.lot_no = spp_ie.lot_no

-- Subquery for Lot inspection aggregation
LEFT JOIN (
    SELECT lot_no, total_rejected_qty_in_percentage AS lot_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Lot Inspection' AND docstatus = 1
) lot_insp ON lot_insp.lot_no = spp_ie.lot_no
```

---

## 📝 Field Mapping Reference

### **FINAL INSPECTION REPORT - Complete Field Map**

| UI Column | Data Source DocType | Field Name | Data Type | Join Path | Notes |
|-----------|-------------------|------------|-----------|-----------|-------|
| **PRODUCTION DATE** | Job Card | `posting_date` | Date | `jc.posting_date` | Production date |
| **SHIFT TYPE** | Job Card | `shift_type` | Select | `jc.shift_type` | A/B/C/General |
| **OPERATOR NAME** | Moulding Production Entry | `employee_name` | Data | `mpe.employee_name` | Moulding operator |
| **PRESS NUMBER** | Job Card | `workstation` | Link→Workstation | `jc.workstation` | Machine/Press |
| **ITEM CODE** | Moulding Production Entry | `item_to_manufacture` | Link→Item | `mpe.item_to_manufacture` | **SOURCE OF TRUTH** |
| **MOULD REF** | Moulding Production Entry | `mould_reference` | Data | `mpe.mould_reference` | **SOURCE OF TRUTH** |
| **LOT NO** | SPP Inspection Entry | `lot_no` | Data | `spp_ie.lot_no` | Lot identifier |
| **TRIMMING OPERATOR** | Custom/TBD | `trimming_operator` | Data | To be determined | **NEW FIELD** |
| **PATROL REJ%** | Aggregated Subquery | `AVG(total_rejected_qty_in_percentage)` | Percent | Patrol subquery | Patrol average |
| **LINE REJ%** | Aggregated Subquery | `AVG(total_rejected_qty_in_percentage)` | Percent | Line subquery | Line average |
| **LOT REJ%** | Inspection Entry | `total_rejected_qty_in_percentage` | Percent | Lot Inspection | Lot inspection |
| **FINAL INSP REJ%** | SPP Inspection Entry | `total_rejected_qty_in_percentage` | Percent | `spp_ie.total_rejected_qty_in_percentage` | **PRIMARY METRIC** |
| **ACTION** | Computed | - | - | `final_rej% > threshold ? 'GENERATE CAR' : null` | Conditional button |

---

### **Comparison: Lot vs Incoming vs Final Inspection**

| Field Category | Lot Inspection | Incoming Inspection | Final Inspection |
|---------------|---------------|---------------------|------------------|
| **DocType** | Inspection Entry | Inspection Entry | **SPP Inspection Entry** |
| **Production Info** | Date, Shift, Operator, Press | Date, Batch, Item, Mould | Date, Shift, Operator, Press |
| **Process Info** | Moulding operator | Deflasher vendor | **Trimming operator** |
| **Rejection Metrics** | Patrol, Line, Lot (3) | Incoming (1) | Patrol, Line, Lot, Final **(4)** |
| **Primary Metric** | Lot REJ% | Incoming REJ% | **Final Insp REJ%** |
| **Additional Data** | Shift type | Qty sent/received, Diff% | Stage, Warehouse |
| **Threshold Logic** | Lot REJ% > 5% | Incoming REJ% > 5% | **Final REJ% > 5%** |

---

## 🔧 SQL Query Implementation

### **FINAL INSPECTION REPORT - Complete Query**

```sql
SELECT
    -- Inspection date (from SPP Inspection Entry)
    spp_ie.posting_date AS inspection_date,
    spp_ie.name AS spp_inspection_entry,
    
    -- Core lot data from Moulding Production Entry (SOURCE OF TRUTH)
    mpe.scan_lot_number AS lot_no,
    mpe.item_to_manufacture AS item,
    mpe.mould_reference AS mould_ref,
    mpe.employee_name AS operator_name,
    mpe.moulding_date AS production_date,
    
    -- Production context from Job Card
    jc.posting_date AS job_date,
    jc.shift_type,
    jc.workstation AS press_number,
    jc.batch_no,
    
    -- Final inspection results from SPP Inspection Entry
    spp_ie.inspector_name AS final_inspector,
    spp_ie.total_inspected_qty_nos AS final_insp_qty,
    spp_ie.total_rejected_qty AS final_rej_qty,
    spp_ie.total_rejected_qty_in_percentage AS final_insp_rej_pct,
    spp_ie.warehouse,
    spp_ie.stage,
    
    -- Aggregated rejection rates from earlier inspections
    COALESCE(patrol.avg_rej, 0) AS patrol_rej_pct,
    COALESCE(line.avg_rej, 0) AS line_rej_pct,
    COALESCE(lot_insp.lot_rej, 0) AS lot_rej_pct,
    
    -- Trimming operator (to be implemented)
    NULL AS trimming_operator  -- TODO: Add source for this field

FROM `tabMoulding Production Entry` mpe

-- Join to SPP Inspection Entry (Final Visual Inspection)
INNER JOIN `tabSPP Inspection Entry` spp_ie 
    ON spp_ie.lot_no = mpe.scan_lot_number
    AND spp_ie.inspection_type = 'Final Visual Inspection'
    AND spp_ie.docstatus = 1

-- LEFT JOIN to Job Card (for production context)
LEFT JOIN `tabJob Card` jc 
    ON jc.name = mpe.job_card

-- Subquery for Patrol rejection aggregation
LEFT JOIN (
    SELECT 
        lot_no, 
        AVG(total_rejected_qty_in_percentage) AS avg_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Patrol Inspection' 
        AND docstatus = 1
    GROUP BY lot_no
) patrol ON patrol.lot_no = spp_ie.lot_no

-- Subquery for Line rejection aggregation
LEFT JOIN (
    SELECT 
        lot_no, 
        AVG(total_rejected_qty_in_percentage) AS avg_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Line Inspection' 
        AND docstatus = 1
    GROUP BY lot_no
) line ON line.lot_no = spp_ie.lot_no

-- Subquery for Lot inspection
LEFT JOIN (
    SELECT 
        lot_no, 
        total_rejected_qty_in_percentage AS lot_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Lot Inspection' 
        AND docstatus = 1
) lot_insp ON lot_insp.lot_no = spp_ie.lot_no

WHERE
    spp_ie.posting_date = %s  -- Selected date parameter
    
ORDER BY spp_ie.posting_date DESC, mpe.scan_lot_number DESC
```

---

### **Comparison: Lot vs Final Inspection Queries**

| Query Component | Lot Inspection | Final Inspection |
|----------------|---------------|------------------|
| **Primary Table** | `tabInspection Entry` | **`tabSPP Inspection Entry`** |
| **Inspection Type Filter** | `'Lot Inspection'` | **`'Final Visual Inspection'`** |
| **Date Field** | `ie.posting_date` | `spp_ie.posting_date` |
| **Rejection Subqueries** | 2 (Patrol, Line) | **3 (Patrol, Line, Lot)** |
| **Primary Metric** | `ie.total_rejected_qty_in_percentage` | **`spp_ie.total_rejected_qty_in_percentage`** |
| **Additional Fields** | None | `warehouse`, `stage` |

---

## 🔌 API Endpoint Specification

### **Endpoint: `get_final_inspection_report`**

**File:** `rejection_analysis/rejection_analysis/api.py`

```python
import frappe
from frappe import _
from frappe.utils import today, getdate

@frappe.whitelist()
def get_final_inspection_report(filters=None):
    """
    Get detailed final inspection report with all rejection metrics
    
    Args:
        filters (dict): {
            "date": "2025-11-26",
            "shift_type": "A",
            "operator_name": "John Doe",
            "press_number": "M-001",
            "item": "ITEM-001",
            "mould_ref": "M-123",
            "lot_no": "25K15X05",
            "trimming_operator": "Jane Smith"
        }
    
    Returns:
        list: Array of final inspection records with complete rejection data
    """
    if not filters:
        filters = {}

    date = filters.get("date", today())

    # Build SQL query starting from Moulding Production Entry
    query = """
        SELECT
            -- Inspection date
            spp_ie.posting_date AS inspection_date,
            spp_ie.name AS spp_inspection_entry,
            
            -- Core lot data from MPE (SOURCE OF TRUTH)
            mpe.scan_lot_number AS lot_no,
            mpe.item_to_manufacture AS item,
            mpe.mould_reference AS mould_ref,
            mpe.employee_name AS operator_name,
            mpe.moulding_date AS production_date,
            
            -- Production context from Job Card
            jc.posting_date AS job_date,
            jc.shift_type,
            jc.workstation AS press_number,
            jc.batch_no,
            
            -- Final inspection results
            spp_ie.inspector_name AS final_inspector,
            spp_ie.total_inspected_qty_nos AS final_insp_qty,
            spp_ie.total_rejected_qty AS final_rej_qty,
            spp_ie.total_rejected_qty_in_percentage AS final_insp_rej_pct,
            spp_ie.warehouse,
            spp_ie.stage,
            
            -- Aggregated rejection rates
            COALESCE(patrol.avg_rej, 0) AS patrol_rej_pct,
            COALESCE(line.avg_rej, 0) AS line_rej_pct,
            COALESCE(lot_insp.lot_rej, 0) AS lot_rej_pct

        FROM `tabMoulding Production Entry` mpe

        INNER JOIN `tabSPP Inspection Entry` spp_ie 
            ON spp_ie.lot_no = mpe.scan_lot_number
            AND spp_ie.inspection_type = 'Final Visual Inspection'
            AND spp_ie.docstatus = 1

        LEFT JOIN `tabJob Card` jc 
            ON jc.name = mpe.job_card

        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Patrol Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) patrol ON patrol.lot_no = spp_ie.lot_no

        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) AS avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Line Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) line ON line.lot_no = spp_ie.lot_no

        LEFT JOIN (
            SELECT lot_no, total_rejected_qty_in_percentage AS lot_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Lot Inspection' AND docstatus = 1
        ) lot_insp ON lot_insp.lot_no = spp_ie.lot_no

        WHERE spp_ie.posting_date = %s
    """

    # Apply additional filters
    params = [date]
    conditions = []

    if filters.get("shift_type"):
        conditions.append("jc.shift_type = %s")
        params.append(filters["shift_type"])

    if filters.get("operator_name"):
        conditions.append("mpe.employee_name LIKE %s")
        params.append(f"%{filters['operator_name']}%")

    if filters.get("press_number"):
        conditions.append("jc.workstation = %s")
        params.append(filters["press_number"])

    if filters.get("item"):
        conditions.append("mpe.item_to_manufacture = %s")
        params.append(filters["item"])

    if filters.get("mould_ref"):
        conditions.append("mpe.mould_reference LIKE %s")
        params.append(f"%{filters['mould_ref']}%")

    if filters.get("lot_no"):
        conditions.append("mpe.scan_lot_number LIKE %s")
        params.append(f"%{filters['lot_no']}%")

    if conditions:
        query += " AND " + " AND ".join(conditions)

    query += " ORDER BY spp_ie.posting_date DESC, mpe.scan_lot_number DESC"

    # Execute query
    data = frappe.db.sql(query, params, as_dict=True)

    # Use hardcoded threshold (can be made configurable later)
    threshold = 4.0

    # Process results
    results = []
    for row in data:
        result = {
            "spp_inspection_entry": row.get("spp_inspection_entry"),
            "inspection_date": str(row.get("inspection_date")) if row.get("inspection_date") else None,
            "production_date": str(row.get("job_date")) if row.get("job_date") else None,
            "shift_type": row.get("shift_type"),
            "operator_name": row.get("operator_name"),
            "press_number": row.get("press_number"),
            "item": row.get("item"),
            "mould_ref": row.get("mould_ref"),
            "lot_no": row.get("lot_no"),
            "trimming_operator": None,  # TODO: Implement trimming operator source
            "patrol_rej_pct": round(row.get("patrol_rej_pct", 0), 2),
            "line_rej_pct": round(row.get("line_rej_pct", 0), 2),
            "lot_rej_pct": round(row.get("lot_rej_pct", 0), 2),
            "final_insp_rej_pct": round(row.get("final_insp_rej_pct", 0), 2),
            "final_inspector": row.get("final_inspector"),
            "final_insp_qty": row.get("final_insp_qty") or 0,
            "final_rej_qty": row.get("final_rej_qty") or 0,
            "warehouse": row.get("warehouse"),
            "stage": row.get("stage"),
            "exceeds_threshold": row.get("final_insp_rej_pct", 0) > threshold,
            "threshold_percentage": threshold
        }
        results.append(result)

    return results
```

---

## 💻 Frontend Data Model

### **TypeScript Interface**

```typescript
// src/types/FinalInspection.ts

export interface FinalInspectionRecord {
  spp_inspection_entry: string
  inspection_date: string
  production_date: string | null
  shift_type: string | null
  operator_name: string
  press_number: string | null
  item: string
  mould_ref: string
  lot_no: string
  trimming_operator: string | null
  patrol_rej_pct: number
  line_rej_pct: number
  lot_rej_pct: number
  final_insp_rej_pct: number
  final_inspector: string
  final_insp_qty: number
  final_rej_qty: number
  warehouse: string | null
  stage: string | null
  exceeds_threshold: boolean
  threshold_percentage: number
}

export interface FinalInspectionFilters {
  date: string
  shift_type?: string
  operator_name?: string
  press_number?: string
  item?: string
  mould_ref?: string
  lot_no?: string
  trimming_operator?: string
}

export interface FinalInspectionMetrics {
  total_lots_inspected: number
  average_final_rej_pct: number
  lots_exceeding_threshold: number
  average_patrol_rej_pct: number
  average_line_rej_pct: number
  average_lot_rej_pct: number
}
```

---

### **React Component Usage**

```tsx
// src/pages/Dashboard.tsx (Final Inspection Tab)

const fetchFinalInspectionRecords = async (date: string) => {
  try {
    const result = await call.post('rejection_analysis.api.get_final_inspection_report', {
      filters: {
        date: date
      }
    })
    return result?.message || result || []
  } catch (error) {
    console.error('Error fetching final inspection records:', error)
    toast.error('Failed to load final inspection data')
    return []
  }
}

// Calculate metrics
const calculateFinalInspectionMetrics = (records: FinalInspectionRecord[]): FinalInspectionMetrics => {
  if (records.length === 0) {
    return {
      total_lots_inspected: 0,
      average_final_rej_pct: 0,
      lots_exceeding_threshold: 0,
      average_patrol_rej_pct: 0,
      average_line_rej_pct: 0,
      average_lot_rej_pct: 0
    }
  }

  const totalFinalRej = records.reduce((sum, r) => sum + r.final_insp_rej_pct, 0)
  const totalPatrolRej = records.reduce((sum, r) => sum + r.patrol_rej_pct, 0)
  const totalLineRej = records.reduce((sum, r) => sum + r.line_rej_pct, 0)
  const totalLotRej = records.reduce((sum, r) => sum + r.lot_rej_pct, 0)
  const exceedingThreshold = records.filter(r => r.exceeds_threshold).length

  return {
    total_lots_inspected: records.length,
    average_final_rej_pct: totalFinalRej / records.length,
    lots_exceeding_threshold: exceedingThreshold,
    average_patrol_rej_pct: totalPatrolRej / records.length,
    average_line_rej_pct: totalLineRej / records.length,
    average_lot_rej_pct: totalLotRej / records.length
  }
}

// In component
const [finalRecords, setFinalRecords] = useState<FinalInspectionRecord[]>([])
const [finalMetrics, setFinalMetrics] = useState<FinalInspectionMetrics | null>(null)

useEffect(() => {
  if (selectedDate) {
    fetchFinalInspectionRecords(selectedDate).then(records => {
      setFinalRecords(records)
      setFinalMetrics(calculateFinalInspectionMetrics(records))
    })
  }
}, [selectedDate])
```

---

## 📊 Data Linkage Comparison Summary

### **Core Principle (All Reports)**

```
START → Moulding Production Entry (scan_lot_number)
  ↓
JOIN → Inspection Entry / SPP Inspection Entry (lot_no, inspection_type)
  ↓
JOIN → Additional DocTypes based on inspection type
```

### **Key Differences**

| Aspect | Lot Inspection | Incoming Inspection | **Final Inspection** |
|--------|---------------|---------------------|---------------------|
| **Primary DocType** | Inspection Entry | Inspection Entry | **SPP Inspection Entry** |
| **Inspection Type** | Lot Inspection | Incoming Inspection | **Final Visual Inspection** |
| **Secondary Joins** | Job Card, Patrol/Line subqueries | Deflashing Receipt, Job Card | **Job Card, Patrol/Line/Lot subqueries** |
| **Aggregations** | 3 rejection % (Patrol, Line, Lot) | 1 rejection % + Qty diff% | **4 rejection %** (Patrol, Line, Lot, Final) |
| **Process Context** | Moulding operator | Deflasher vendor | **Trimming operator** |
| **Date Context** | Production date | Receipt date + Inspection date | Production date + Inspection date |
| **Warehouse** | No | No | **Yes** (target warehouse) |
| **Stage** | No | No | **Yes** (production stage) |

---

## 🎯 Unique Features of Final Inspection

### 1. **Complete Quality Journey**
Final Inspection shows the complete quality timeline:
```
Patrol REJ% → Line REJ% → Lot REJ% → Final Insp REJ%
```

### 2. **Quality Progression Analysis**
```typescript
// Identify where defects were caught
const analyzeQualityProgression = (record: FinalInspectionRecord) => {
  const stages = {
    patrol: record.patrol_rej_pct,
    line: record.line_rej_pct,
    lot: record.lot_rej_pct,
    final: record.final_insp_rej_pct
  }
  
  // Where were most defects caught?
  const maxStage = Object.entries(stages).reduce((max, [stage, pct]) => 
    pct > max.pct ? { stage, pct } : max, 
    { stage: '', pct: 0 }
  )
  
  // Were defects missed in earlier stages?
  const missedDefects = record.final_insp_rej_pct > record.lot_rej_pct
  
  return {
    primaryDetectionStage: maxStage.stage,
    missedDefects,
    improvementNeeded: missedDefects
  }
}
```

### 3. **Warehouse & Stage Tracking**
- **Warehouse**: Where the lot will be stored after final inspection
- **Stage**: Production stage identifier (e.g., "Finished Goods", "Semi-Finished")

### 4. **Trimming Operator Field** (To Be Implemented)
**Purpose:** Track who performed trimming/finishing operations

**Potential Data Sources:**
1. **Stock Entry** with operation type = "Trimming"
2. **Work Order** with operation = "Trimming"
3. **Custom DocType** for trimming operations
4. **SPP Inspection Entry** custom field

**Implementation Note:**
```python
# TODO: Determine source for trimming_operator
# Option 1: Add custom field to SPP Inspection Entry
# Option 2: Link to Stock Entry with trimming operation
# Option 3: Create Trimming Process DocType
```

---

## ✅ Implementation Checklist

### Backend Tasks
- [ ] Create `get_final_inspection_report()` API endpoint
- [ ] Test SQL query with real data
- [ ] Verify all joins return correct data (especially SPP Inspection Entry)
- [ ] Test filter parameters
- [ ] Implement trimming operator source
- [ ] Add proper error handling
- [ ] Add permission checks
- [ ] Test aggregation subqueries

### Frontend Tasks
- [ ] Create `FinalInspectionRecord` TypeScript interface
- [ ] Create `FinalInspectionMetrics` interface
- [ ] Update Dashboard to fetch final inspection data
- [ ] Create table component for final inspection records
- [ ] Add filter UI (date, shift, operator, press, item, mould, lot, trimming operator)
- [ ] Implement "GENERATE CAR" button logic
- [ ] Add 4-column rejection % display (Patrol, Line, Lot, Final)
- [ ] Add loading states
- [ ] Add error handling

### Data Quality Tasks
- [ ] Verify SPP Inspection Entry data completeness
- [ ] Validate lot_number consistency across all inspection types
- [ ] Check for missing Patrol/Line/Lot inspections
- [ ] Test with lots that have all 4 inspection types
- [ ] Test with lots missing some inspection types
- [ ] Verify threshold calculations
- [ ] Validate warehouse and stage data

### Analysis Features
- [ ] Implement quality progression analysis
- [ ] Add detection stage identification
- [ ] Create "missed defects" indicator
- [ ] Build quality trend visualization
- [ ] Add comparison between all 4 inspection stages

---

## 🔍 Data Discovery Tasks

### 1. **Verify SPP Inspection Entry Structure**
```python
# Run in Frappe console
import frappe
doc = frappe.get_doc('SPP Inspection Entry', 'SPP-INSP-00001')
print(doc.as_dict())
```

### 2. **Find Trimming Operator Source**
```python
# Check if trimming data exists in Stock Entry
se = frappe.get_all('Stock Entry', 
    filters={'stock_entry_type': 'Manufacture'},
    fields=['name', 'employee', 'custom_trimming_operator'])

# Check Work Order
wo = frappe.get_all('Work Order',
    fields=['name', 'custom_trimming_operator'])

# Check SPP Inspection Entry custom fields
from frappe.custom.doctype.custom_field.custom_field import get_custom_fields
custom_fields = frappe.get_all('Custom Field',
    filters={'dt': 'SPP Inspection Entry'},
    fields=['fieldname', 'label'])
```

### 3. **Sample Data Query**
```python
# Get recent final inspections
final_inspections = frappe.get_all(
    'SPP Inspection Entry',
    filters={
        'inspection_type': 'Final Visual Inspection',
        'docstatus': 1
    },
    fields=['name', 'lot_no', 'posting_date', 'total_rejected_qty_in_percentage'],
    limit=10
)
```

---

## 🎯 Next Steps

1. **Verify SPP Inspection Entry** - Confirm doctype structure and available fields
2. **Find Trimming Operator Source** - Identify where trimming operator data exists
3. **Implement API endpoint** - Create `get_final_inspection_report()` in `rejection_analysis/api.py`
4. **Test with real data** - Run query in Frappe console with actual lot numbers
5. **Update frontend** - Add final inspection table to Dashboard
6. **Add filters** - Implement filter UI including trimming operator
7. **Test edge cases** - Lots without all inspection types, missing data, etc.
8. **Document findings** - Update this document with any discoveries

---

## 📚 Related Documentation

- [Lot Inspection Data Linkage](./LOT_INSPECTION_DATA_LINKING.md)
- [Incoming Inspection Data Linkage](./INCOMING_INSPECTION_DATA_LINKAGE.md)
- [Inspection Entry Analysis](./INSPECTION_ENTRY_ANALYSIS.md)
- [UI Requirements Specification](./UI_REQUIREMENTS_SPEC.md)
- [Complete Implementation Roadmap](./COMPLETE_IMPLEMENTATION_ROADMAP.md)

---

## 📋 TRIMMING OPERATOR - Investigation Needed

### Questions to Answer:
1. **Where is trimming operation recorded?**
   - Stock Entry?
   - Work Order?
   - Custom DocType?
   - SPP Inspection Entry custom field?

2. **How to link trimming to lot number?**
   - Direct lot_no field?
   - Via Stock Entry reference?
   - Via batch_no?

3. **What is the trimming operator field name?**
   - `employee`?
   - `operator_name`?
   - `custom_trimming_operator`?
   - `trimming_employee`?

### Action Items:
- [ ] Query Stock Entry for trimming operations
- [ ] Check Work Order for trimming data
- [ ] Review SPP Inspection Entry custom fields
- [ ] Interview users to understand trimming process
- [ ] Document trimming data flow
- [ ] Update this document with findings

---

**END OF DOCUMENT**
