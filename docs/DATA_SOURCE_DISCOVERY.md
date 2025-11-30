# Data Source Discovery - Rejection Analysis
**Discovery Date:** November 26, 2025

---

## 📋 OVERVIEW

This document captures the discovery and analysis of data sources for the Rejection Analysis system. It documents how inspection data flows through different DocTypes and the relationship between main lots and sub-lots.

---

## 🗂️ DATA SOURCES IDENTIFIED

### 1. Moulding Production Entry (Source of Truth)
**DocType:** `Moulding Production Entry`  
**Table:** `tabMoulding Production Entry`  
**Naming:** `MLDPE-#####`

**Purpose:** Records production of lots during moulding process. This is the **origin point** for lot numbers.

**Key Fields:**
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | Data | Document ID | MLDPE-25186 |
| `moulding_date` | Date | Production date | 2025-10-31 |
| `scan_lot_number` | Data | **🔑 LOT NUMBER** | 25J31X01 |
| `item_to_produce` | Link→Item | Item code (T-prefix) | T5117 |
| `employee` | Link→Employee | Operator employee ID | HR-EMP-00107 |
| `employee_name` | Data | Operator name | Ansari K |
| `mould_reference` | Data | Mould reference | MLD-5117-A |
| `job_card` | Link→Job Card | Production job card | PO-JOB262840 |
| `compound` | Data | Compound used | C_7040 |
| `spp_batch_number` | Data | SPP batch number | 25J06X24-1 |
| `batch_no` | Data | Batch number | C_7040/25/10/10/001 |
| `number_of_lifts` | Int | Production lifts | 80 |
| `no_of_running_cavities` | Int | Running cavities | 168 |
| `weight` | Float | Weight produced (Kgs) | 8.213 |

---

### 2. Inspection Entry (4 Inspection Types)
**DocType:** `Inspection Entry`  
**Table:** `tabInspection Entry`  
**Naming:** `INSP-#####`

**Purpose:** Records quality inspections during production process.

**Inspection Types Covered:**
- ✅ Patrol Inspection
- ✅ Line Inspection
- ✅ Lot Inspection
- ✅ Incoming Inspection

**Key Fields:**
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | Data | Document ID | INSP-105021 |
| `inspection_type` | Select | Type of inspection | Lot Inspection |
| `posting_date` | Date | Inspection date | 2025-10-31 |
| `lot_no` | Data | **🔑 LOT NUMBER** | 25J31X01 |
| `product_ref_no` | Link→Item | Item code | T5117 or P5117 |
| `machine_no` | Link→Workstation | Machine/Press | P9 : TUNGYU - 150 Ton |
| `operator_name` | Data | Operator name | Ansari K |
| `inspector_name` | Data | Inspector name | Priya G |
| `total_inspected_qty_nos` | Float | Inspected qty (Nos) | 0 |
| `total_rejected_qty` | Float | Rejected qty (Nos) | 26 |
| `total_rejected_qty_in_percentage` | Float | **Rejection %** | 3.095 |
| `docstatus` | Int | Document status | 1 (Submitted) |

---

### 3. SPP Inspection Entry (Final Visual Inspection)
**DocType:** `SPP Inspection Entry`  
**Table:** `tabSPP Inspection Entry`  
**Naming:** `SPP-INSP-#####`

**Purpose:** Records Final Visual Inspection - the last quality check before finished goods.

**⚠️ IMPORTANT:** This DocType uses **SUB-LOT NUMBERS** instead of main lot numbers!

**Inspection Types Covered:**
- ✅ Final Visual Inspection
- (Also supports: Patrol, Line, Lot, Incoming - but primarily used for FVI)

**Key Fields:**
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | Data | Document ID | SPP-INSP-10387 |
| `inspection_type` | Select | Type of inspection | Final Visual Inspection |
| `posting_date` | Date | Inspection date | 2025-11-08 |
| `lot_no` | Data | **🔑 SUB-LOT NUMBER** | 25J31X01-1 |
| `product_ref_no` | Link→Item | Item code (P-prefix) | P5117 |
| `inspector_name` | Data | Inspector name | Radhika S Raghavan |
| `total_inspected_qty_nos` | Float | Inspected qty (Nos) | 658 |
| `total_rejected_qty` | Float | Rejected qty (Nos) | 58 |
| `total_rejected_qty_in_percentage` | Float | **Rejection %** | 8.81 |
| `docstatus` | Int | Document status | 1 (Submitted) |

---

## 🔗 DATA RELATIONSHIPS

### Linking Field: Lot Number

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MOULDING PRODUCTION ENTRY                        │
│                    scan_lot_number: "25J31X01"                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ lot_no = scan_lot_number
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INSPECTION ENTRY                               │
│                      lot_no: "25J31X01"                             │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐     │
│  │   Patrol     │    Line      │     Lot      │   Incoming   │     │
│  │  Inspection  │  Inspection  │  Inspection  │  Inspection  │     │
│  │  INSP-104962 │  INSP-104975 │  INSP-105021 │  INSP-105298 │     │
│  │    1.82%     │    1.79%     │    3.10%     │    6.00%     │     │
│  └──────────────┴──────────────┴──────────────┴──────────────┘     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ lot_no LIKE 'main_lot%' (sub-lots)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SPP INSPECTION ENTRY                             │
│                    (Final Visual Inspection)                        │
│  ┌──────────────────────┬──────────────────────┐                   │
│  │   Sub-Lot 1          │   Sub-Lot 2          │                   │
│  │   lot_no: 25J31X01-1 │   lot_no: 25J31X01-2 │                   │
│  │   SPP-INSP-10387     │   SPP-INSP-10489     │                   │
│  │   Date: Nov 08       │   Date: Nov 10       │                   │
│  │   Rej%: X.XX%        │   Rej%: X.XX%        │                   │
│  └──────────────────────┴──────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 SUB-LOT PATTERN DISCOVERY

### Main Lot vs Sub-Lot Format

```
MAIN LOT FORMAT:    25J31X01       (8 characters, no suffix)
SUB-LOT FORMAT:     25J31X01-1     (8 chars + hyphen + sequence number)
                    25J31X01-2
                    25J31X01-3
                    ...
```

### Lot Number Breakdown

```
25  J  31  X  01  -  1
│   │  │   │  │   │  │
│   │  │   │  │   │  └── Sub-lot sequence (1, 2, 3, 4, 5...)
│   │  │   │  │   └───── Separator (only present in sub-lots)
│   │  │   │  └───────── Sequence number within shift
│   │  │   └──────────── Shift identifier (U, V, W, X, Y, Z)
│   │  └────────────────  Day of month (01-31)
│   └───────────────────  Month code (A=Jan, B=Feb... J=Oct, K=Nov)
└───────────────────────  Year (25 = 2025)
```

### Month Code Reference
| Code | Month |
|------|-------|
| A | January |
| B | February |
| C | March |
| D | April |
| E | May |
| F | June |
| G | July |
| H | August |
| I | September |
| J | October |
| K | November |
| L | December |

### Shift Code Reference
| Code | Shift |
|------|-------|
| U | Shift 1 |
| V | Shift 2 |
| W | Shift 3 |
| X | Shift 4 |
| Y | Shift 5 |
| Z | Shift 6 |

---

## 📊 COMPLETE EXAMPLE: LOT 25J31X01

### Source: Moulding Production Entry
| Field | Value |
|-------|-------|
| Document | MLDPE-25186 |
| Moulding Date | 2025-10-31 |
| Lot Number | **25J31X01** |
| Item | T5117 |
| Operator | Ansari K |
| Mould Ref | MLD-5117-A |
| Job Card | PO-JOB262840 |

### Inspection Flow

| Stage | DocType | Document | Date | Lot No | Item | Rejection % |
|-------|---------|----------|------|--------|------|-------------|
| 1. Patrol | Inspection Entry | INSP-104962 | Oct 31 | 25J31X01 | T5117 | 1.82% |
| 2. Line | Inspection Entry | INSP-104975 | Oct 31 | 25J31X01 | T5117 | 1.79% |
| 3. Lot | Inspection Entry | INSP-105021 | Oct 31 | 25J31X01 | T5117 | 3.10% |
| 4. Incoming | Inspection Entry | INSP-105298 | Nov 03 | 25J31X01 | P5117 | 6.00% |
| 5. Final Visual | SPP Inspection Entry | SPP-INSP-10387 | Nov 08 | **25J31X01-1** | P5117 | TBD |
| 6. Final Visual | SPP Inspection Entry | SPP-INSP-10489 | Nov 10 | **25J31X01-2** | P5117 | TBD |

### Key Observations

1. **Item Code Transformation:**
   - Production/Early Inspections: `T5117` (T-prefix = raw/semi-finished)
   - Later Inspections: `P5117` (P-prefix = finished product)

2. **Timeline Progression:**
   - Day 1 (Oct 31): Moulding → Patrol → Line → Lot
   - Day 3 (Nov 03): Incoming Inspection
   - Day 8-10 (Nov 08-10): Final Visual Inspection (sub-lots)

3. **One Main Lot → Multiple Sub-Lots:**
   - Main lot `25J31X01` split into sub-lots for Final Visual Inspection
   - Sub-lots: `25J31X01-1`, `25J31X01-2`
   - Each sub-lot inspected separately (possibly different days/inspectors)

---

## 🧮 SQL PATTERN FOR LINKING SUB-LOTS TO MAIN LOT

### Extract Main Lot from Sub-Lot
```sql
-- Method 1: Using REGEXP_REPLACE (MariaDB 10.0.5+)
SELECT 
    lot_no as sub_lot,
    REGEXP_REPLACE(lot_no, '-[0-9]+$', '') as main_lot
FROM `tabSPP Inspection Entry`
WHERE inspection_type = 'Final Visual Inspection';

-- Method 2: Using SUBSTRING_INDEX (works for simple cases)
-- Note: This won't work correctly because lot format has no other hyphens
SELECT 
    lot_no as sub_lot,
    CASE 
        WHEN lot_no REGEXP '-[0-9]+$' 
        THEN LEFT(lot_no, LENGTH(lot_no) - LENGTH(SUBSTRING_INDEX(lot_no, '-', -1)) - 1)
        ELSE lot_no
    END as main_lot
FROM `tabSPP Inspection Entry`
WHERE inspection_type = 'Final Visual Inspection';
```

### Join Sub-Lots with Main Lot Inspections
```sql
SELECT 
    mpe.scan_lot_number as main_lot,
    mpe.moulding_date,
    mpe.item_to_produce,
    mpe.employee_name as operator,
    
    -- Patrol Inspection
    patrol.total_rejected_qty_in_percentage as patrol_rej_pct,
    
    -- Line Inspection
    line.total_rejected_qty_in_percentage as line_rej_pct,
    
    -- Lot Inspection
    lot.total_rejected_qty_in_percentage as lot_rej_pct,
    
    -- Incoming Inspection
    incoming.total_rejected_qty_in_percentage as incoming_rej_pct,
    
    -- Final Visual Inspection (aggregated from sub-lots)
    fvi.avg_rej_pct as fvi_rej_pct,
    fvi.sub_lot_count
    
FROM `tabMoulding Production Entry` mpe

-- Patrol Inspection
LEFT JOIN `tabInspection Entry` patrol 
    ON patrol.lot_no = mpe.scan_lot_number 
    AND patrol.inspection_type = 'Patrol Inspection'
    AND patrol.docstatus = 1

-- Line Inspection  
LEFT JOIN `tabInspection Entry` line 
    ON line.lot_no = mpe.scan_lot_number 
    AND line.inspection_type = 'Line Inspection'
    AND line.docstatus = 1

-- Lot Inspection
LEFT JOIN `tabInspection Entry` lot 
    ON lot.lot_no = mpe.scan_lot_number 
    AND lot.inspection_type = 'Lot Inspection'
    AND lot.docstatus = 1

-- Incoming Inspection
LEFT JOIN `tabInspection Entry` incoming 
    ON incoming.lot_no = mpe.scan_lot_number 
    AND incoming.inspection_type = 'Incoming Inspection'
    AND incoming.docstatus = 1

-- Final Visual Inspection (sub-lots aggregated)
LEFT JOIN (
    SELECT 
        REGEXP_REPLACE(lot_no, '-[0-9]+$', '') as main_lot,
        AVG(total_rejected_qty_in_percentage) as avg_rej_pct,
        SUM(total_rejected_qty) as total_rejected,
        SUM(total_inspected_qty_nos) as total_inspected,
        COUNT(*) as sub_lot_count
    FROM `tabSPP Inspection Entry`
    WHERE inspection_type = 'Final Visual Inspection'
    AND docstatus = 1
    GROUP BY REGEXP_REPLACE(lot_no, '-[0-9]+$', '')
) fvi ON fvi.main_lot = mpe.scan_lot_number

WHERE mpe.moulding_date = '2025-10-31';
```

---

## ❓ PENDING QUESTIONS / CLARIFICATIONS NEEDED

### 1. Sub-Lot Creation Logic
- **Q:** How/when are sub-lots created from main lots?
- **Q:** Is there a DocType that tracks the split from main lot to sub-lots?
- **Q:** What triggers the creation of `-1`, `-2`, etc. suffixes?

### 2. Rejection Percentage Calculation for FVI
- **Q:** The `total_rejected_qty_in_percentage` field shows `0.000` in some FVI records. Is this calculated differently?
- **Q:** Should we calculate rejection % as: `(total_rejected_qty / total_inspected_qty_nos) * 100`?

### 3. Aggregation Rules
- **Q:** When aggregating FVI data back to main lot, should we:
  - Use **average** rejection % across all sub-lots?
  - Use **weighted average** based on inspected quantity?
  - Use **maximum** rejection % (worst case)?
  - Use **sum** of rejected quantities / sum of inspected quantities?

### 4. Date Filtering
- **Q:** When filtering by date, which date should be used?
  - `moulding_date` from Moulding Production Entry?
  - `posting_date` from Inspection Entry?
  - Both (configurable)?

### 5. Threshold Logic
- **Q:** Which inspection type's rejection % triggers CAR?
  - Only Lot Inspection?
  - Any inspection type exceeding threshold?
  - Weighted combination of all?

### 6. PDIR Inspection
- **Q:** Where does PDIR (Pre-Delivery Inspection Report) data come from?
- **Q:** Is there a separate DocType for PDIR?

---

## 🎯 NEXT STEPS

1. **Clarify business logic** for sub-lot aggregation
2. **Confirm rejection % calculation** for Final Visual Inspection
3. **Define threshold rules** for each inspection type
4. **Design unified query** that combines all inspection types per main lot
5. **Implement backend API** based on confirmed business logic

---

## 📝 REVISION HISTORY

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-26 | 1.0 | Initial discovery document | AI Assistant |

---

**END OF DISCOVERY DOCUMENT**
