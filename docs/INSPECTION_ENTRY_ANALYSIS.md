# Inspection Entry System Analysis
**Rejection Analysis App - DocType Schema Study**

---

## 📋 EXECUTIVE SUMMARY

This document provides a comprehensive analysis of the existing Inspection Entry system in the Frappe workspace, which serves as the foundation for the Rejection Analysis Console application.

---

## 🎯 BUSINESS OBJECTIVE

**Purpose:** Collect and analyze rejection metrics from inspection entries to:
- Track quality issues across different inspection types
- Generate daily rejection reports
- Trigger corrective actions when rejection thresholds are exceeded
- Provide insights for continuous improvement

---

## 📊 INSPECTION TYPES

The system supports **5 types of inspections**:

### 1. **Incoming Inspection**
- **Purpose:** Quality check of incoming raw materials/components
- **DocType Used:** Inspection Entry
- **When:** Upon receipt of materials from suppliers

### 2. **Lot Inspection** ⭐ (PRIMARY FOCUS)
- **Purpose:** Quality check of production lots during/after manufacturing
- **DocType Used:** Inspection Entry
- **When:** After production batch completion
- **Key Metric:** Lot rejection percentage vs threshold

### 3. **Final Visual Inspection**
- **Purpose:** Final quality check before finished goods storage
- **DocType Used:** SPP Inspection Entry (smart_screens app)
- **When:** After production, before warehousing
- **Special:** Uses different DocType with enhanced features

### 4. **Line Inspection**
- **Purpose:** In-process quality checks during production
- **DocType Used:** Inspection Entry
- **When:** During production run

### 5. **Patrol Inspection**
- **Purpose:** Random quality checks by roving inspectors
- **DocType Used:** Inspection Entry
- **When:** Periodic random checks

### 6. **PDIR (Future Implementation)**
- **Purpose:** Post-delivery inspection record
- **Status:** Planned for future development

---

## 🗂️ DOCTYPE SCHEMAS

### 1. Inspection Entry (Primary DocType)
**Location:** `/apps/shree_polymer_custom_app/shree_polymer_custom_app/shree_polymer_custom_app/doctype/inspection_entry/`

**Auto-naming:** `INSP-.#####`

**Key Fields:**

#### A. Header Information
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `posting_date` | Date | Date of inspection | ✅ Yes |
| `inspection_type` | Select | Type of inspection (5 options) | ✅ Yes |
| `lot_no` | Data | Production lot number | ✅ Yes |
| `inspector_code` | Link→Employee | Inspector employee ID | ✅ Yes |
| `inspector_name` | Data | Inspector full name | No |
| `product_ref_no` | Link→Item | Item being inspected | No |
| `batch_no` | Link→Batch | Batch number | No |
| `machine_no` | Link→Workstation | Machine/workstation | No |
| `operator_name` | Data | Operator name | No |
| `spp_batch_number` | Data | SPP batch identifier | No |

#### B. Quantity Fields
| Field | Type | Description | Unit |
|-------|------|-------------|------|
| `total_inspected_qty` | Float | Total inspected quantity | Kgs |
| `total_inspected_qty_nos` | Int | Total inspected quantity | Nos |
| `total_inspected_qty_kgs` | Float | Total inspected quantity | Kgs |
| `inspected_qty_nos` | Float | Inspected quantity | Nos |
| `total_rejected_qty` | Int | Total rejected quantity | Nos |
| `total_rejected_qty_in_percentage` | Percent | Rejection percentage | % |
| `total_rejected_qty_kg` | Float | Total rejected quantity | Kgs |

#### C. Specification Fields (Quality Parameters)
| Field | Type | Description |
|-------|------|-------------|
| `id_minimum` | Float | Inner diameter minimum spec |
| `id_maximum` | Float | Inner diameter maximum spec |
| `od_minimum` | Float | Outer diameter minimum spec |
| `od_maximum` | Float | Outer diameter maximum spec |
| `hardness` | Float | Hardness specification |
| `thickness` | Float | Thickness specification |

#### D. Defect Details (Child Table)
| Field | Type | Table |
|-------|------|-------|
| `items` | Table | Inspection Entry Item |

**Child Table: Inspection Entry Item**
- `type_of_defect` (Data) - Defect type/code
- `rejected_qty` (Int) - Rejected quantity in Nos
- `rejected_qty_kg` (Float) - Rejected quantity in Kgs
- `machine_no` (Data) - Machine reference
- `operator_name` (Data) - Operator reference
- `inspector_code` (Link→Employee)
- `lot_no` (Data)
- `batch_no` (Data)
- `product_ref_no` (Data)

#### E. Defect Types Available
```
FLOW-(FL)
BUBBLE-(BU) / BLISTER-(BL)
CUTMARK-(CU)
DEFLASH-(DF)
RIB
FOREIGN PARTICLE-(FP)
UNDER FILL-(UF)
DIPRESSION-(DP)
UNDER CURE-(UC)
SURFACE DEFECT-(SD)
OVER CURE-(OC) /FAST CURE
BURST / TEAR
BLACK MARK
```

#### F. Reference Fields
| Field | Type | Description |
|-------|------|-------------|
| `stock_entry_reference` | Data | Stock entry reference |
| `vs_pdir_work_order_ref` | Data | Work order reference |
| `vs_pdir_stock_entry_ref` | Data | PDIR stock entry ref |

#### G. UOM & Conversion
| Field | Type | Description |
|-------|------|-------------|
| `uom` | Select | Unit of measure (Nos/Kgs) |
| `one_kg_equal_nos` | Float | Conversion: 1 Kg = X Nos |
| `one_no_qty_equal_kgs` | Float | Conversion: 1 No = X Kgs |

#### H. Flags
| Field | Type | Description |
|-------|------|-------------|
| `sample_or_trial` | Check | Is this a sample/trial? |
| `moulding_production_completed` | Check | Production completed flag |

---

### 2. SPP Inspection Entry (Final Visual Inspection)
**Location:** `/apps/smart_screens/smart_screens/smart_screens/doctype/spp_inspection_entry/`

**Auto-naming:** `SPP-INSP-.#####`

**Key Differences from Inspection Entry:**

#### Additional Fields
| Field | Type | Description |
|-------|------|-------------|
| `warehouse` | Link→Warehouse | Target warehouse |
| `source_warehouse` | Link→Warehouse | Source warehouse |
| `stage` | Link→Item Group | Production stage |
| `html_location_details` | HTML | Location details widget |

#### Child Table: FV Inspection Entry Item
- Same structure as Inspection Entry Item
- Used for Final Visual Inspection defect tracking

#### Enhanced Features
- Better warehouse management
- Stage-based inspection tracking
- Visual location details display
- Improved UX for final inspection process

---

## 🎯 DAILY REJECTION ANALYSIS WORKFLOW

### Scenario: Daily Lot Inspection Report

```
┌──────────────────────────────────────────┐
│ User selects date: 2025-11-25           │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ Query Inspection Entry DocType           │
│ Filters:                                 │
│ - posting_date = 2025-11-25             │
│ - inspection_type = "Lot Inspection"    │
│ - docstatus = 1 (submitted)             │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ Retrieve All Records                     │
│ Fields needed:                           │
│ - lot_no                                 │
│ - product_ref_no                         │
│ - total_inspected_qty_nos                │
│ - total_rejected_qty                     │
│ - total_rejected_qty_in_percentage       │
│ - inspector_code, inspector_name         │
│ - machine_no, operator_name              │
│ - batch_no, spp_batch_number             │
│ - items (defect details)                 │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ For Each Record:                         │
│ Check if rejection % > threshold         │
└─────────────┬────────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
┌──────────┐  ┌────────────────────────┐
│ Normal   │  │ Exceeds Threshold      │
│ Record   │  │ (e.g., > 5%)           │
└────┬─────┘  └─────┬──────────────────┘
     │              │
     │              ▼
     │        ┌─────────────────────────┐
     │        │ Trigger Corrective      │
     │        │ Action Report (CAR)     │
     │        └─────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────┐
│ Store in Daily Rejection Report DocType  │
│ (To be created)                          │
└──────────────────────────────────────────┘
```

---

## 📝 PROPOSED DOCTYPES FOR REJECTION ANALYSIS

### 1. Daily Rejection Report (Master DocType)
**Purpose:** Store aggregated daily rejection metrics

**Suggested Fields:**

```python
{
    "report_date": "Date",  # Report date
    "inspection_type": "Select",  # Lot Inspection, Incoming, etc.
    "total_inspections": "Int",  # Count of inspections
    "total_inspected_qty": "Float",  # Sum of inspected qty
    "total_rejected_qty": "Float",  # Sum of rejected qty
    "average_rejection_percentage": "Percent",  # Average rejection %
    "max_rejection_percentage": "Percent",  # Highest rejection
    "lots_exceeding_threshold": "Int",  # Count of lots over threshold
    "status": "Select",  # Draft, Completed, Reviewed
    "threshold_percentage": "Float",  # Threshold value used (e.g., 5.0)
    "inspection_entries": "Table",  # Child table: Inspection Entry Reference
    "generated_on": "Datetime",  # Report generation timestamp
    "generated_by": "Link→User",  # User who generated
}
```

**Child Table: Inspection Entry Reference**
```python
{
    "inspection_entry": "Link→Inspection Entry",
    "lot_no": "Data",
    "product_ref_no": "Link→Item",
    "inspector_code": "Link→Employee",
    "inspected_qty": "Float",
    "rejected_qty": "Float",
    "rejection_percentage": "Percent",
    "exceeds_threshold": "Check",
    "car_triggered": "Check",  # Corrective Action Report triggered
    "car_reference": "Link→Corrective Action Report",
}
```

---

### 2. Corrective Action Report (CAR)
**Purpose:** Track corrective actions for high rejection lots

**Suggested Fields:**

```python
{
    "car_date": "Date",
    "inspection_entry": "Link→Inspection Entry",
    "lot_no": "Data",
    "product_ref_no": "Link→Item",
    "rejection_percentage": "Percent",
    "threshold_percentage": "Percent",
    "root_cause": "Small Text",
    "corrective_action": "Small Text",
    "preventive_action": "Small Text",
    "assigned_to": "Link→User",
    "target_date": "Date",
    "status": "Select",  # Open, In Progress, Completed, Closed
    "defect_analysis": "Table",  # Child table: Defect Breakdown
}
```

**Child Table: Defect Breakdown**
```python
{
    "defect_type": "Data",
    "rejected_qty": "Int",
    "percentage_of_total": "Percent",
    "root_cause": "Small Text",
}
```

---

### 3. Rejection Threshold Configuration
**Purpose:** Define rejection thresholds by inspection type/product

**Suggested Fields:**

```python
{
    "inspection_type": "Select",
    "product_ref_no": "Link→Item",  # Optional: specific to product
    "item_group": "Link→Item Group",  # Optional: by category
    "threshold_percentage": "Float",  # e.g., 5.0 means 5%
    "warning_threshold": "Float",  # Warning level (e.g., 3.0%)
    "critical_threshold": "Float",  # Critical level (e.g., 10.0%)
    "auto_trigger_car": "Check",  # Auto-create CAR when exceeded
    "notify_users": "Table",  # Users to notify when threshold exceeded
}
```

---

## 🔍 SAMPLE DATA QUERY

### Get Recent Lot Inspections

```python
import frappe
from frappe.utils import today, add_days

# Get lot inspections for today
inspections = frappe.get_all(
    "Inspection Entry",
    filters={
        "posting_date": today(),
        "inspection_type": "Lot Inspection",
        "docstatus": 1  # Submitted only
    },
    fields=[
        "name",
        "posting_date",
        "lot_no",
        "product_ref_no",
        "batch_no",
        "spp_batch_number",
        "inspector_code",
        "inspector_name",
        "operator_name",
        "machine_no",
        "total_inspected_qty_nos",
        "total_rejected_qty",
        "total_rejected_qty_in_percentage",
        "total_rejected_qty_kg"
    ],
    order_by="posting_date desc"
)

# Get full document with child table
for insp in inspections:
    doc = frappe.get_doc("Inspection Entry", insp.name)
    
    # Access defect details
    for item in doc.items:
        print(f"Defect: {item.type_of_defect}, Qty: {item.rejected_qty}")
    
    # Check threshold
    if doc.total_rejected_qty_in_percentage > 5.0:
        print(f"⚠️ Lot {doc.lot_no} exceeds threshold: {doc.total_rejected_qty_in_percentage}%")
        # Trigger CAR creation
```

---

## 📊 KEY METRICS TO TRACK

### Daily Metrics
1. **Total Inspections Performed** - Count by type
2. **Total Quantity Inspected** - Sum in Nos/Kgs
3. **Total Quantity Rejected** - Sum in Nos/Kgs
4. **Average Rejection Rate** - Weighted average %
5. **Lots Exceeding Threshold** - Count and list
6. **Top 5 Defect Types** - By frequency and quantity

### By Inspector
1. **Inspections Performed** - Count
2. **Average Rejection Rate** - Per inspector
3. **Lots Flagged** - Threshold violations

### By Product
1. **Rejection Rate by Item** - Group by product_ref_no
2. **Defect Pattern by Product** - Common defects per product

### By Machine/Operator
1. **Rejection Rate by Machine** - Group by machine_no
2. **Rejection Rate by Operator** - Group by operator_name

---

## 🎨 CONSOLE UI FEATURES (To Implement)

### 1. Dashboard Page
- **Daily Summary Card**
  - Total inspections today
  - Total rejection rate
  - Lots exceeding threshold
  - CARs generated

- **Trend Chart**
  - Rejection rate over last 30 days
  - By inspection type

- **Top Issues**
  - Top 5 defect types
  - Worst performing lots

### 2. Inspection Entry Search
- **Filters:**
  - Date range
  - Inspection type
  - Product
  - Inspector
  - Machine
  - Rejection % range

- **Columns:**
  - Lot No
  - Product
  - Inspector
  - Inspected Qty
  - Rejected Qty
  - Rejection %
  - Status (Normal/Warning/Critical)
  - Actions (View, Generate CAR)

### 3. Daily Report Generator
- **Inputs:**
  - Date selection
  - Inspection type
  - Threshold % (default from config)

- **Output:**
  - Generate Daily Rejection Report
  - Auto-create CARs for threshold violations
  - Export to PDF/Excel

### 4. CAR Management
- **List View:**
  - Open CARs
  - Overdue CARs
  - Completed CARs

- **Detail View:**
  - Root cause analysis
  - Corrective actions
  - Timeline
  - Attachments

---

## 🔧 IMPLEMENTATION STEPS

### Phase 1: DocType Creation
1. ✅ Create "Daily Rejection Report" DocType
2. ✅ Create "Inspection Entry Reference" Child Table
3. ✅ Create "Corrective Action Report" DocType
4. ✅ Create "Defect Breakdown" Child Table
5. ✅ Create "Rejection Threshold Configuration" DocType

### Phase 2: Backend Logic
1. ✅ Create API endpoint: `get_inspection_entries_by_date()`
2. ✅ Create API endpoint: `generate_daily_report()`
3. ✅ Create API endpoint: `check_threshold_violations()`
4. ✅ Create API endpoint: `create_car_from_inspection()`
5. ✅ Create scheduled job: Daily report auto-generation

### Phase 3: Frontend Implementation
1. ✅ Build Dashboard page with metrics
2. ✅ Build Inspection Entry search/filter
3. ✅ Build Daily Report generator UI
4. ✅ Build CAR list and detail pages
5. ✅ Build threshold configuration UI

### Phase 4: Testing & Deployment
1. ✅ Test with sample data
2. ✅ User acceptance testing
3. ✅ Production deployment
4. ✅ Training documentation

---

## 📌 NEXT ACTIONS

1. **Review this document** with stakeholders
2. **Define exact threshold values** for each inspection type
3. **Create DocTypes** in rejection_analysis app
4. **Build API endpoints** for data retrieval
5. **Implement React UI** in rejection_analysis_console
6. **Set up automated daily reports**

---

**END OF ANALYSIS**
