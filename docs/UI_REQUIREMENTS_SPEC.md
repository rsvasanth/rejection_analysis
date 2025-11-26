# UI Requirements Specification - Rejection Analysis Console
**Based on Requirements Team Mockups**

---

## 📋 OVERVIEW

This document defines the exact UI components needed based on the visual mockups provided by the requirements team.

---

## 🎨 SCREEN 1: DASHBOARD WITH DATE SELECTOR & INSPECTION TABS

### Layout Description
```
┌─────────────────────────────────────────────────────────────────┐
│  [DATE SELECTOR]                                                │
├─────────────────────────────────────────────────────────────────┤
│  [Lot Inspection] [Incoming Inspection] [Final Inspection] [PDIR]│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  No of lots: [123]          Pending lots: [45]           │  │
│  │  Patrol rej% Avg: [2.5%]    Line rej% Avg: [1.8%]       │  │
│  │  Lot Insp rej% Avg: [3.2%]                               │  │
│  │                                                           │  │
│  │  [Generate Report]                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component: Dashboard Tabs

**Tab 1: Lot Inspection**
```
Metrics to Display:
├── No of lots: Count(Inspection Entry where inspection_type = "Lot Inspection")
├── Pending lots: Count(Lots not yet inspected or in draft)
├── Patrol rej% Avg: AVG(total_rejected_qty_in_percentage) for Patrol Inspection
├── Line rej% Avg: AVG(total_rejected_qty_in_percentage) for Line Inspection
└── Lot Insp rej% Avg: AVG(total_rejected_qty_in_percentage) for Lot Inspection

Action: [Generate Report] → Navigate to Lot Inspection Report page
```

**Tab 2: Incoming Inspection**
```
Metrics to Display:
├── No of lots received: Count(Inspection Entry where inspection_type = "Incoming Inspection")
├── No of Pending lots: Count(Pending incoming inspections)
└── Incoming Insp Avg%: AVG(total_rejected_qty_in_percentage)

Action: [Generate Report] → Navigate to Incoming Inspection Report
```

**Tab 3: Final Inspection**
```
Metrics to Display:
├── No of lots Inspected: Count(SPP Inspection Entry where inspection_type = "Final Visual Inspection")
└── Avg Rej%: AVG(total_rejected_qty_in_percentage)

Action: [Generate Report] → Navigate to Final Inspection Report
```

**Tab 4: PDIR** *(Future Implementation)*
```
Metrics to Display:
├── No of lots for PDIR: Count(Future PDIR entries)
├── No of Pending lots: Pending PDIR count
├── No of Rework: Count(Rework entries)
└── Rej%: Average rejection percentage

Action: [Generate Report] → Navigate to PDIR Report
```

### React Component Structure
```tsx
// src/pages/Dashboard.tsx
<DashboardLayout>
  <div className="p-6">
    {/* Date Selector */}
    <DatePicker selected={date} onChange={setDate} />
    
    {/* Inspection Type Tabs */}
    <Tabs defaultValue="lot-inspection">
      <TabsList>
        <TabsTrigger value="lot-inspection">Lot Inspection</TabsTrigger>
        <TabsTrigger value="incoming">Incoming Inspection</TabsTrigger>
        <TabsTrigger value="final">Final Inspection</TabsTrigger>
        <TabsTrigger value="pdir">PDIR</TabsTrigger>
      </TabsList>
      
      <TabsContent value="lot-inspection">
        <LotInspectionMetrics date={date} />
      </TabsContent>
      
      <TabsContent value="incoming">
        <IncomingInspectionMetrics date={date} />
      </TabsContent>
      
      <TabsContent value="final">
        <FinalInspectionMetrics date={date} />
      </TabsContent>
      
      <TabsContent value="pdir">
        <PDIRMetrics date={date} />
      </TabsContent>
    </Tabs>
  </div>
</DashboardLayout>
```

---

## 🎨 SCREEN 2: LOT INSPECTION REPORT (Generated Report)

### Layout Description
```
┌─────────────────────────────────────────────────────────────────────────┐
│  LOT INSPECTION REPORT                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Filters:                                                               │
│  [Production Date] [Shift Type] [Operator Name] [Press Number]         │
│  [Item Code] [Mould Ref] [Lot No]                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  PRODUCTION │ SHIFT  │ OPERATOR │ PRESS  │ ITEM  │ MOULD │ LOT NO │    │
│  DATE       │ TYPE   │ NAME     │ NUMBER │ CODE  │ REF   │        │    │
│             │(filter)│ (filter) │(filter)│       │       │(filter)│    │
├─────────────┼────────┼──────────┼────────┼───────┼───────┼────────┼────┤
│             │        │          │        │       │       │        │    │
│  PATROL REJ% │ LINE REJ% │ LOT REJ% │                    │ ACTION     │
├─────────────┼───────────┼──────────┼────────────────────┼────────────┤
│      -      │     -     │   5%     │                    │[GENERATE   │
│             │           │          │                    │    CAR]    │
├─────────────┼───────────┼──────────┼────────────────────┼────────────┤
│      -      │     -     │   7%     │                    │[GENERATE   │
│             │           │          │                    │    CAR]    │
└─────────────┴───────────┴──────────┴────────────────────┴────────────┘
```

### Features

**Filters (All Optional):**
1. Production Date (Date Picker)
2. Shift Type (Select: A/B/C/General)
3. Operator Name (Autocomplete from Employee)
4. Press Number (Select from Workstation)
5. Item Code (Autocomplete from Item)
6. Mould Ref (Text Input)
7. Lot No (Text Input)

**Table Columns:**
1. Production Date
2. Shift Type
3. Operator Name
4. Press Number (Machine No)
5. Item Code (Product Ref No)
6. Mould Ref
7. Lot No
8. Patrol REJ% (from Patrol Inspection records)
9. Line REJ% (from Line Inspection records)
10. LOT REJ% (from Lot Inspection records) **← PRIMARY METRIC**
11. ACTION → [GENERATE CAR] button

**Key Business Logic:**
- Show "GENERATE CAR" button only if LOT REJ% > threshold (default 5%)
- Color coding:
  - Green: < 3% (Normal)
  - Yellow: 3-5% (Warning)
  - Red: > 5% (Critical - CAR required)

### Data Query Logic
```python
# For each lot, we need to fetch:
# 1. Lot Inspection record (primary)
# 2. Patrol Inspection records (for same lot_no)
# 3. Line Inspection records (for same lot_no)

SELECT 
    ie_lot.posting_date as production_date,
    ie_lot.shift_type,
    ie_lot.operator_name,
    ie_lot.machine_no as press_number,
    ie_lot.product_ref_no as item_code,
    ie_lot.mould_ref,
    ie_lot.lot_no,
    COALESCE(patrol.avg_rej, 0) as patrol_rej_pct,
    COALESCE(line.avg_rej, 0) as line_rej_pct,
    ie_lot.total_rejected_qty_in_percentage as lot_rej_pct
FROM 
    `tabInspection Entry` ie_lot
LEFT JOIN (
    SELECT lot_no, AVG(total_rejected_qty_in_percentage) as avg_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Patrol Inspection'
    AND docstatus = 1
    GROUP BY lot_no
) patrol ON patrol.lot_no = ie_lot.lot_no
LEFT JOIN (
    SELECT lot_no, AVG(total_rejected_qty_in_percentage) as avg_rej
    FROM `tabInspection Entry`
    WHERE inspection_type = 'Line Inspection'
    AND docstatus = 1
    GROUP BY lot_no
) line ON line.lot_no = ie_lot.lot_no
WHERE 
    ie_lot.inspection_type = 'Lot Inspection'
    AND ie_lot.docstatus = 1
    AND ie_lot.posting_date = '2025-11-25'
ORDER BY 
    ie_lot.lot_no DESC
```

### React Component Structure
```tsx
// src/pages/LotInspectionReport.tsx
<DashboardLayout>
  <div className="p-6">
    <h1 className="text-3xl font-bold mb-6">Lot Inspection (Generated Report)</h1>
    
    {/* Filter Bar */}
    <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
      <DatePicker label="Production Date" />
      <Select label="Shift Type" options={["A", "B", "C", "General"]} />
      <AutocompleteInput label="Operator Name" doctype="Employee" />
      <AutocompleteInput label="Press Number" doctype="Workstation" />
      <AutocompleteInput label="Item Code" doctype="Item" />
      <Input label="Mould Ref" />
      <Input label="Lot No" />
      <Button>Apply Filters</Button>
    </div>
    
    {/* Results Table */}
    <DataTable
      columns={columns}
      data={inspections}
      onGenerateCAR={(row) => handleGenerateCAR(row)}
    />
  </div>
</DashboardLayout>
```

---

## 🎨 SCREEN 3: CORRECTIVE ACTION REPORT (CAR) FORM

### Layout Description
```
┌──────────────────────────────────────────────────────────────────┐
│  CORRECTIVE ACTION REPORT                        [GREEN HEADER]  │
├──────────────────────────────────────────────────────────────────┤
│  PROBLEM DESCRIPTION           │  CORRECTIVE ACTION              │
│  ┌───────────────────────────┐ │  ┌───────────────────────────┐ │
│  │                           │ │  │                           │ │
│  │                           │ │  │                           │ │
│  └───────────────────────────┘ │  └───────────────────────────┘ │
│                                │                                 │
│  CAUSE FOR NON DETECTION       │  WHY - WHY ANALYSIS (BUTTON)   │
│  ┌───────────────────────────┐ │  [YELLOW BUTTON]               │
│  │                           │ │                                 │
│  │                           │ │  1. WHY? _________________     │
│  └───────────────────────────┘ │  2. WHY? _________________     │
│                                │  3. WHY? _________________     │
│  CAUSE FOR OCCURRENCE          │  4. WHY? _________________     │
│  ┌───────────────────────────┐ │  5. WHY? _________________     │
│  │                           │ │                                 │
│  │                           │ │                                 │
│  └───────────────────────────┘ │                                 │
├────────────────────────────────┴─────────────────────────────────┤
│  REMARKS: ..............................                         │
└──────────────────────────────────────────────────────────────────┘
```

### Form Fields

**Left Column:**
1. **Problem Description** (Long Text)
   - Multi-line textarea
   - Auto-populated from inspection entry defect details
   - Editable

2. **Cause for Non Detection** (Long Text)
   - Why wasn't this caught earlier in the process?
   - Requires input from quality team

3. **Cause for Occurrence** (Long Text)
   - Root cause of why the defect occurred
   - Requires input from production team

**Right Column:**
1. **Corrective Action** (Long Text)
   - Actions taken to fix the immediate problem
   - Requires input from production/quality

2. **WHY - WHY ANALYSIS** (Interactive Section)
   - Yellow button to expand/collapse
   - 5 iterative "Why" questions
   - Each answer leads to deeper root cause
   - Based on Toyota's 5 Whys methodology

**Bottom Section:**
1. **Remarks** (Long Text)
   - Additional comments or notes
   - Optional field

### Additional Hidden/Auto-filled Fields
```python
{
    "inspection_entry": "Link→Inspection Entry",  # Auto-filled from context
    "lot_no": "Data",                             # Auto-filled
    "product_ref_no": "Link→Item",                # Auto-filled
    "rejection_percentage": "Percent",            # Auto-filled
    "car_date": "Date",                           # Auto-filled (today)
    "assigned_to": "Link→User",                   # Selected by user
    "target_date": "Date",                        # Selected by user
    "status": "Select",                           # Open/In Progress/Completed
}
```

### React Component Structure
```tsx
// src/pages/CorrectiveActionReport.tsx
<DashboardLayout>
  <div className="p-6 max-w-7xl mx-auto">
    {/* Header */}
    <div className="bg-green-500 text-white text-center text-2xl font-bold p-4 rounded-t-lg">
      CORRECTIVE ACTION REPORT
    </div>
    
    <Card className="rounded-t-none">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <Textarea 
              label="PROBLEM DESCRIPTION" 
              rows={5}
              value={problemDescription}
            />
            
            <Textarea 
              label="CAUSE FOR NON DETECTION" 
              rows={5}
              value={causeForNonDetection}
            />
            
            <Textarea 
              label="CAUSE FOR OCCURRENCE" 
              rows={5}
              value={causeForOccurrence}
            />
          </div>
          
          {/* Right Column */}
          <div className="space-y-6">
            <Textarea 
              label="CORRECTIVE ACTION" 
              rows={5}
              value={correctiveAction}
            />
            
            {/* 5 Why Analysis */}
            <div className="border rounded-lg p-4">
              <Button 
                className="w-full bg-yellow-400 text-black hover:bg-yellow-500 mb-4"
                onClick={() => setShow5Why(!show5Why)}
              >
                WHY - WHY ANALYSIS (BUTTON)
              </Button>
              
              {show5Why && (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <div key={num} className="flex items-center gap-2">
                      <span className="font-semibold bg-teal-600 text-white px-3 py-2 rounded min-w-[80px]">
                        {num}. WHY?
                      </span>
                      <Input 
                        className="flex-1"
                        value={whyAnswers[num - 1]}
                        onChange={(e) => updateWhyAnswer(num - 1, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom Remarks */}
        <div className="mt-6">
          <Textarea 
            label="REMARKS" 
            rows={3}
            placeholder="..............................."
            value={remarks}
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save CAR</Button>
          <Button onClick={handleSubmit}>Submit CAR</Button>
        </div>
      </CardContent>
    </Card>
  </div>
</DashboardLayout>
```

---

## 🎨 SCREEN 2 DETAILED: LOT INSPECTION REPORT TABLE

### Table Columns Definition

| Column | Width | Data Source | Format | Notes |
|--------|-------|-------------|--------|-------|
| Production Date | 120px | `posting_date` | DD-MM-YYYY | Sortable |
| Shift Type | 100px | Custom field | A/B/C/General | Filterable |
| Operator Name | 150px | `operator_name` | Text | Filterable |
| Press Number | 120px | `machine_no` | Text | Filterable |
| Item Code | 150px | `product_ref_no` | Link | Filterable |
| Mould Ref | 120px | Custom field | Text | Filterable |
| Lot No | 120px | `lot_no` | Text | Filterable, Searchable |
| Patrol REJ% | 100px | Aggregated | 2.5% | Color-coded |
| Line REJ% | 100px | Aggregated | 1.8% | Color-coded |
| LOT REJ% | 100px | `total_rejected_qty_in_percentage` | 5.0% | **Bold if > threshold** |
| ACTION | 150px | Button | - | Conditional display |

### Color Coding Logic
```typescript
const getRejectionColor = (percentage: number) => {
  if (percentage >= 5.0) return 'text-red-600 font-bold'  // Critical
  if (percentage >= 3.0) return 'text-yellow-600'         // Warning
  return 'text-green-600'                                  // Normal
}
```

### GENERATE CAR Button Logic
```typescript
const showGenerateCAR = (lotRejPct: number) => {
  return lotRejPct > 5.0  // Show only if exceeds threshold
}
```

### Filter Components
```tsx
// src/components/lot-inspection-filters.tsx
<div className="grid grid-cols-4 gap-4 p-4 bg-slate-100 rounded-lg">
  <div>
    <label>Production Date</label>
    <DatePicker value={filters.productionDate} onChange={updateFilter} />
  </div>
  
  <div>
    <label>Shift Type (filter)</label>
    <Select 
      options={["All", "A", "B", "C", "General"]} 
      value={filters.shiftType}
    />
  </div>
  
  <div>
    <label>Operator Name (filter)</label>
    <AutocompleteInput 
      doctype="Employee"
      value={filters.operatorName}
    />
  </div>
  
  <div>
    <label>Press Number (filter)</label>
    <AutocompleteInput 
      doctype="Workstation"
      value={filters.pressNumber}
    />
  </div>
  
  <div>
    <label>Item Code</label>
    <AutocompleteInput 
      doctype="Item"
      value={filters.itemCode}
    />
  </div>
  
  <div>
    <label>Mould Ref</label>
    <Input value={filters.mouldRef} />
  </div>
  
  <div>
    <label>Lot No (filter)</label>
    <Input value={filters.lotNo} />
  </div>
  
  <div className="flex items-end">
    <Button onClick={applyFilters} className="w-full">
      Apply Filters
    </Button>
  </div>
</div>
```

### Table Row Component
```tsx
// src/components/lot-inspection-table-row.tsx
<TableRow className={lotRejPct > 5.0 ? 'bg-red-50' : ''}>
  <TableCell>{formatDate(productionDate)}</TableCell>
  <TableCell>{shiftType}</TableCell>
  <TableCell>{operatorName}</TableCell>
  <TableCell>{pressNumber}</TableCell>
  <TableCell>
    <Link to={`/app/item/${itemCode}`} className="text-blue-600 hover:underline">
      {itemCode}
    </Link>
  </TableCell>
  <TableCell>{mouldRef}</TableCell>
  <TableCell>
    <Link to={`/app/inspection-entry/${inspectionEntry}`} className="font-mono">
      {lotNo}
    </Link>
  </TableCell>
  <TableCell className={getRejectionColor(patrolRejPct)}>
    {patrolRejPct ? `${patrolRejPct.toFixed(1)}%` : '-'}
  </TableCell>
  <TableCell className={getRejectionColor(lineRejPct)}>
    {lineRejPct ? `${lineRejPct.toFixed(1)}%` : '-'}
  </TableCell>
  <TableCell className={getRejectionColor(lotRejPct)}>
    <span className="font-bold">{lotRejPct.toFixed(1)}%</span>
  </TableCell>
  <TableCell>
    {lotRejPct > 5.0 && (
      <Button 
        size="sm" 
        onClick={() => onGenerateCAR(row)}
        className="bg-white border-2 border-gray-800 text-gray-800 hover:bg-gray-100"
      >
        GENERATE CAR
      </Button>
    )}
  </TableCell>
</TableRow>
```

---

## 🔄 USER WORKFLOWS

### Workflow 1: Generate Daily Lot Inspection Report

```
1. User opens Dashboard
   ↓
2. Selects date (e.g., 2025-11-25)
   ↓
3. Clicks "Lot Inspection" tab
   ↓
4. Reviews summary metrics
   ↓
5. Clicks "Generate Report" button
   ↓
6. Navigates to Lot Inspection Report page
   ↓
7. System fetches all lot inspections for selected date
   ↓
8. System calculates patrol/line/lot rejection percentages
   ↓
9. Table displays with color-coded rejection rates
   ↓
10. User sees "GENERATE CAR" buttons for lots with rejection > 5%
```

### Workflow 2: Create CAR from High Rejection Lot

```
1. User on Lot Inspection Report page
   ↓
2. Identifies row with LOT REJ% = 7% (red, shows GENERATE CAR button)
   ↓
3. Clicks "GENERATE CAR" button
   ↓
4. System pre-fills CAR form with:
   - Inspection entry reference
   - Lot number
   - Product code
   - Rejection percentage
   - Problem description (from defect details)
   ↓
5. User fills in:
   - Cause for Non Detection
   - Cause for Occurrence
   - Corrective Action
   ↓
6. User clicks "WHY - WHY ANALYSIS" button (yellow)
   ↓
7. 5 Why questions expand
   ↓
8. User fills each Why answer iteratively
   ↓
9. User adds remarks
   ↓
10. User assigns to team member
    ↓
11. User saves/submits CAR
    ↓
12. CAR is created and linked to inspection entry
```

### Workflow 3: Review Dashboard Metrics

```
1. User opens Dashboard (default page after login)
   ↓
2. Date defaults to TODAY
   ↓
3. System fetches metrics for all 4 inspection types
   ↓
4. User switches between tabs:
   - Lot Inspection: See lot counts and avg rejection %
   - Incoming: See incoming material quality
   - Final: See final inspection quality
   - PDIR: See post-delivery issues
   ↓
5. User clicks "Generate Report" on any tab
   ↓
6. Navigates to detailed report for that inspection type
```

---

## 🎯 MISSING FIELDS IN CURRENT SCHEMA

Based on the mockups, we need to add these fields to Inspection Entry:

### Fields to Add to Inspection Entry DocType:
1. **shift_type** (Select: A/B/C/General)
   - Required for filtering and reporting
   - Not present in current schema

2. **mould_ref** (Data)
   - Mould reference number
   - Not present in current schema
   - Different from batch_no

3. **threshold_percentage** (Float, default 5.0)
   - Reference threshold for this inspection
   - Used for visual indicators

### Custom Fields via Frappe Customize Form:
```python
# Add these via Frappe UI: Customize Form
[
    {
        "fieldname": "shift_type",
        "fieldtype": "Select",
        "label": "Shift Type",
        "options": "\nA\nB\nC\nGeneral",
        "insert_after": "posting_date"
    },
    {
        "fieldname": "mould_ref",
        "fieldtype": "Data",
        "label": "Mould Reference",
        "insert_after": "batch_no"
    }
]
```

---

## 📊 API ENDPOINTS REQUIRED

### 1. Get Dashboard Metrics
```python
@frappe.whitelist()
def get_dashboard_metrics(date, inspection_type):
    """
    Returns metrics for dashboard tabs
    
    Args:
        date (str): Date in YYYY-MM-DD format
        inspection_type (str): "Lot Inspection", "Incoming Inspection", etc.
    
    Returns:
        {
            "total_lots": 123,
            "pending_lots": 45,
            "patrol_rej_avg": 2.5,
            "line_rej_avg": 1.8,
            "lot_rej_avg": 3.2,
            "lots_exceeding_threshold": 5
        }
    """
```

### 2. Get Lot Inspection Report Data
```python
@frappe.whitelist()
def get_lot_inspection_report(filters):
    """
    Returns detailed lot inspection data with aggregated rejection rates
    
    Args:
        filters (dict): {
            "production_date": "2025-11-25",
            "shift_type": "A",
            "operator_name": "John Doe",
            "press_number": "M-001",
            "item_code": "ITEM-001",
            "mould_ref": "M-123",
            "lot_no": "LOT-001"
        }
    
    Returns:
        [
            {
                "inspection_entry": "INSP-00123",
                "production_date": "2025-11-25",
                "shift_type": "A",
                "operator_name": "John Doe",
                "press_number": "M-001",
                "item_code": "ITEM-001",
                "mould_ref": "M-123",
                "lot_no": "LOT-12345",
                "patrol_rej_pct": 0.0,
                "line_rej_pct": 2.5,
                "lot_rej_pct": 7.0,
                "exceeds_threshold": True
            }
        ]
    """
```

### 3. Create CAR from Inspection
```python
@frappe.whitelist()
def create_car_from_inspection(inspection_entry_name):
    """
    Creates a new CAR document pre-filled with inspection data
    
    Args:
        inspection_entry_name (str): Name of the Inspection Entry
    
    Returns:
        {
            "name": "CAR-00001",
            "inspection_entry": "INSP-00123",
            "lot_no": "LOT-12345",
            "rejection_percentage": 7.0,
            "problem_description": "Auto-generated from defect details...",
            "status": "Open"
        }
    """
```

### 4. Get 5 Why Analysis
```python
@frappe.whitelist()
def save_five_why_analysis(car_name, why_answers):
    """
    Saves the 5 Why analysis answers to the CAR
    
    Args:
        car_name (str): CAR document name
        why_answers (list): ["Why 1 answer", "Why 2 answer", ...]
    
    Returns:
        {"status": "success"}
    """
```

---

## 🎨 COLOR SCHEME & STYLING

### Brand Colors
```css
/* Primary Colors */
--green-header: #86BC42;       /* CAR header green */
--yellow-why: #FFE234;         /* WHY button yellow */
--teal-section: #5A9BA8;       /* Section headers teal */
--gray-background: #E5E7EB;    /* Filter area gray */

/* Status Colors */
--success-green: #22C55E;      /* < 3% rejection */
--warning-yellow: #EAB308;     /* 3-5% rejection */
--critical-red: #EF4444;       /* > 5% rejection */

/* Neutral Colors */
--text-primary: #1F2937;
--text-secondary: #6B7280;
--border-color: #D1D5DB;
```

### Component Styling Guidelines

**Card Borders:**
- Light blue/teal borders for form sections
- Rounded corners: 8px
- Shadow: subtle drop shadow

**Buttons:**
- Generate Report: Green (#86BC42)
- Generate CAR: White background, black border
- WHY Analysis: Yellow (#FFE234) with black text
- Submit: Primary color
- Cancel: Outlined

**Table:**
- Header: Dark gray background (#374151)
- Rows: Alternate white/light gray
- Hover: Light blue highlight
- Border: 1px solid light gray

---

## 📱 RESPONSIVE DESIGN NOTES

### Desktop (> 1024px)
- 2-column layout for CAR form
- Full table with all columns visible
- Sidebar expanded by default

### Tablet (768px - 1024px)
- 2-column layout maintained
- Scrollable table
- Sidebar collapsible

### Mobile (< 768px)
- Single column layout for CAR form
- Card-based layout for table rows
- Sidebar collapsed by default
- Filters in accordion/drawer

---

## 🔧 TECHNICAL IMPLEMENTATION NOTES

### Data Fetching Strategy
```typescript
// Use frappe-react-sdk hooks
import { useFrappeGetDocList, useFrappeGetDoc } from 'frappe-react-sdk'

// Dashboard metrics
const { data: metrics } = useFrappeGetDocList('Inspection Entry', {
  filters: [
    ['posting_date', '=', selectedDate],
    ['inspection_type', '=', 'Lot Inspection'],
    ['docstatus', '=', 1]
  ],
  fields: ['name', 'total_rejected_qty_in_percentage', 'lot_no'],
})

// Lot inspection report data
const { data: reportData } = useFrappeCall('rejection_analysis.api.get_lot_inspection_report', {
  filters: filterState
})
```

### State Management
```typescript
// Use React Context for shared state
- DateContext: Selected date across all pages
- FilterContext: Filter state for reports
- ThresholdContext: Threshold configuration
```

### Performance Optimizations
1. **Pagination:** Load 50 rows at a time
2. **Lazy Loading:** Load defect details on row expand
3. **Debounced Filters:** Wait 300ms after filter input before querying
4. **Cache:** Cache dashboard metrics for 5 minutes

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Core Components
- [ ] Create DatePicker component
- [ ] Create FilterBar component
- [ ] Create DataTable component with sorting/filtering
- [ ] Create MetricsCard component
- [ ] Create TabsLayout component

### Phase 2: Dashboard Page
- [ ] Implement date selector
- [ ] Implement 4 inspection type tabs
- [ ] Fetch and display metrics for each tab
- [ ] Add "Generate Report" button navigation

### Phase 3: Lot Inspection Report Page
- [ ] Implement filter bar with 7 filters
- [ ] Fetch lot inspection data with aggregated patrol/line rejection
- [ ] Display data table with color coding
- [ ] Implement "GENERATE CAR" button (conditional)
- [ ] Add export to Excel/PDF

### Phase 4: CAR Form Page
- [ ] Implement 2-column layout
- [ ] Add Problem Description textarea
- [ ] Add Cause for Non Detection textarea
- [ ] Add Cause for Occurrence textarea
- [ ] Add Corrective Action textarea
- [ ] Implement WHY - WHY ANALYSIS expandable section
- [ ] Add 5 Why input fields
- [ ] Add Remarks textarea
- [ ] Implement Save/Submit buttons
- [ ] Auto-populate from inspection entry

### Phase 5: API Development
- [ ] Create `get_dashboard_metrics()` API
- [ ] Create `get_lot_inspection_report()` API
- [ ] Create `create_car_from_inspection()` API
- [ ] Create `save_five_why_analysis()` API

### Phase 6: DocType Creation
- [ ] Create "Corrective Action Report" DocType
- [ ] Create "5 Why Analysis" Child Table
- [ ] Add custom fields to Inspection Entry (shift_type, mould_ref)
- [ ] Create "Rejection Threshold Config" DocType

---

## 🎯 PRIORITY IMPLEMENTATION ORDER

**Week 1: Foundation**
1. ~~Fix authentication & routing~~ ✅ **Already Implemented**
2. Create missing custom fields (shift_type, mould_ref)
3. Create Corrective Action Report DocType
4. Create basic API endpoints

**Week 2: Dashboard**
1. Build dashboard page with tabs
2. Implement metrics calculation
3. Add date selector functionality
4. Connect to real data

**Week 3: Lot Inspection Report**
1. Build filter bar
2. Build data table with color coding
3. Implement GENERATE CAR action
4. Add export functionality

**Week 4: CAR Form**
1. Build CAR form layout
2. Implement 5 Why analysis section
3. Add save/submit logic
4. Link CAR to inspection entry

**Week 5: Polish & Testing**
1. Add loading states
2. Add error handling
3. Performance optimization
4. User acceptance testing

---

**END OF UI REQUIREMENTS SPECIFICATION**
