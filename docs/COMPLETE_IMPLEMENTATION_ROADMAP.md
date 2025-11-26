## 📊 **COMPLETE IMPLEMENTATION ROADMAP**
**Rejection Analysis Console - Backend & Frontend Integration**

---

## 🎯 **EXECUTIVE SUMMARY**

Based on comprehensive data discovery and UI requirements analysis, this document provides the complete implementation roadmap for the Rejection Analysis Console application.

**Key Discoveries:**
- ✅ All required data exists in the system (Inspection Entry, Moulding Production Entry, Job Card)
- ✅ **NO MODIFICATIONS** to existing DocTypes - all data accessed via read-only joins
- ✅ Shift Type and Mould Ref fetched from Job Card and Moulding Production Entry
- ✅ Complete data linkage chain established
- ✅ UI specifications fully defined
- ✅ API endpoints designed

---

## 🔗 **DATA LINKAGE ARCHITECTURE**

### **Complete Data Flow for Lot Inspection Report:**

```
Inspection Entry (lot_no: 25K15X05)
    ↓
Moulding Production Entry (scan_lot_number: 25K15X05)
    ↓
Job Card (job_card: PO-JOB268519)
    ↓
Complete Record:
├── Production Date: Job Card.posting_date
├── Shift Type: Job Card.shift_type ("8 Hours - 1")
├── Operator Name: Moulding PE.employee_name ("Amirthalingam N")
├── Press Number: Job Card.workstation ("P15 : TUNGYU - 150 Ton")
├── Item Code: Inspection Entry.product_ref_no ("TDS001")
├── Mould Ref: Moulding PE.mould_reference ("TC-DS001-A")
├── Lot No: Inspection Entry.lot_no ("25K15X05")
├── Patrol REJ%: Aggregated from Patrol Inspections
├── Line REJ%: Aggregated from Line Inspections
├── Lot REJ%: Inspection Entry.total_rejected_qty_in_percentage (13.0%)
└── CAR Trigger: Lot REJ% > 5.0%
```

---

## 📋 **IMPLEMENTATION PHASES**

### **PHASE 1: FOUNDATION (Week 1)**

#### **1.1 Create New DocTypes (No Modifications to Existing DocTypes)**

**Important Rule:** We will NOT alter any existing DocTypes (Inspection Entry, Moulding Production Entry, Job Card, etc.). All data will be accessed via read-only queries and joins.

**A. Corrective Action Report (CAR)**
```python
# rejection_analysis/rejection_analysis/doctype/corrective_action_report/
{
    "name": "Corrective Action Report",
    "module": "Rejection Analysis",
    "fields": [
        {"fieldname": "car_date", "fieldtype": "Date", "label": "CAR Date", "reqd": 1},
        {"fieldname": "inspection_entry", "fieldtype": "Link", "label": "Inspection Entry", "options": "Inspection Entry", "reqd": 1},
        {"fieldname": "lot_no", "fieldtype": "Data", "label": "Lot No", "reqd": 1},
        {"fieldname": "product_ref_no", "fieldtype": "Link", "label": "Product", "options": "Item"},
        {"fieldname": "rejection_percentage", "fieldtype": "Percent", "label": "Rejection %"},
        {"fieldname": "problem_description", "fieldtype": "Small Text", "label": "Problem Description"},
        {"fieldname": "cause_for_non_detection", "fieldtype": "Small Text", "label": "Cause for Non Detection"},
        {"fieldname": "cause_for_occurrence", "fieldtype": "Small Text", "label": "Cause for Occurrence"},
        {"fieldname": "corrective_action", "fieldtype": "Small Text", "label": "Corrective Action"},
        {"fieldname": "assigned_to", "fieldtype": "Link", "label": "Assigned To", "options": "User"},
        {"fieldname": "target_date", "fieldtype": "Date", "label": "Target Date"},
        {"fieldname": "status", "fieldtype": "Select", "label": "Status", "options": "Open\nIn Progress\nCompleted\nClosed", "default": "Open"},
        {"fieldname": "remarks", "fieldtype": "Small Text", "label": "Remarks"},
        {"fieldname": "five_why_analysis", "fieldtype": "Table", "label": "5 Why Analysis", "options": "Five Why Analysis"}
    ]
}
```

**B. Five Why Analysis (Child Table)**
```python
# rejection_analysis/rejection_analysis/doctype/five_why_analysis/
{
    "name": "Five Why Analysis",
    "module": "Rejection Analysis",
    "fields": [
        {"fieldname": "why_1", "fieldtype": "Small Text", "label": "Why 1"},
        {"fieldname": "why_2", "fieldtype": "Small Text", "label": "Why 2"},
        {"fieldname": "why_3", "fieldtype": "Small Text", "label": "Why 3"},
        {"fieldname": "why_4", "fieldtype": "Small Text", "label": "Why 4"},
        {"fieldname": "why_5", "fieldtype": "Small Text", "label": "Why 5"}
    ]
}
```

**C. Rejection Threshold Configuration**
```python
# rejection_analysis/rejection_analysis/doctype/rejection_threshold_config/
{
    "name": "Rejection Threshold Configuration",
    "module": "Rejection Analysis",
    "fields": [
        {"fieldname": "inspection_type", "fieldtype": "Select", "label": "Inspection Type", "options": "Lot Inspection\nIncoming Inspection\nFinal Visual Inspection\nLine Inspection\nPatrol Inspection", "reqd": 1},
        {"fieldname": "product_ref_no", "fieldtype": "Link", "label": "Product", "options": "Item"},
        {"fieldname": "item_group", "fieldtype": "Link", "label": "Item Group", "options": "Item Group"},
        {"fieldname": "threshold_percentage", "fieldtype": "Float", "label": "Threshold %", "default": 5.0, "reqd": 1},
        {"fieldname": "warning_threshold", "fieldtype": "Float", "label": "Warning Threshold %", "default": 3.0},
        {"fieldname": "critical_threshold", "fieldtype": "Float", "label": "Critical Threshold %", "default": 10.0},
        {"fieldname": "auto_trigger_car", "fieldtype": "Check", "label": "Auto Trigger CAR", "default": 1}
    ]
}
```

#### **1.3 Create API Endpoints**

**A. rejection_analysis/api.py**
```python
import frappe
from frappe import _
from frappe.utils import today, getdate

@frappe.whitelist()
def get_dashboard_metrics(date=None, inspection_type="Lot Inspection"):
    """Get dashboard metrics for specified date and inspection type"""
    if not date:
        date = today()
    
    # Base filters
    filters = {
        "posting_date": date,
        "inspection_type": inspection_type,
        "docstatus": 1
    }
    
    # Get all inspections for the date
    inspections = frappe.get_all(
        "Inspection Entry",
        filters=filters,
        fields=[
            "name", "lot_no", "total_rejected_qty_in_percentage",
            "total_inspected_qty_nos", "total_rejected_qty"
        ]
    )
    
    if not inspections:
        return {
            "total_lots": 0,
            "pending_lots": 0,
            "avg_rejection": 0.0,
            "lots_exceeding_threshold": 0,
            "total_inspected_qty": 0,
            "total_rejected_qty": 0
        }
    
    # Calculate metrics
    total_lots = len(inspections)
    total_inspected = sum([i.get("total_inspected_qty_nos", 0) for i in inspections])
    total_rejected = sum([i.get("total_rejected_qty", 0) for i in inspections])
    avg_rejection = sum([i.get("total_rejected_qty_in_percentage", 0) for i in inspections]) / total_lots
    
    # Get threshold from config (default 5.0%)
    threshold = get_threshold_for_inspection_type(inspection_type)
    lots_exceeding = len([i for i in inspections if i.get("total_rejected_qty_in_percentage", 0) > threshold])
    
    return {
        "total_lots": total_lots,
        "pending_lots": 0,  # TODO: Calculate pending lots
        "avg_rejection": round(avg_rejection, 2),
        "lots_exceeding_threshold": lots_exceeding,
        "total_inspected_qty": total_inspected,
        "total_rejected_qty": total_rejected,
        "threshold_percentage": threshold
    }

@frappe.whitelist()
def get_lot_inspection_report(filters=None):
    """Get detailed lot inspection report with production data"""
    if not filters:
        filters = {}
    
    date = filters.get("production_date", today())
    
    # Build SQL query to join all required tables
    query = """
        SELECT 
            ie.name as inspection_entry,
            ie.posting_date,
            ie.lot_no,
            ie.product_ref_no as item_code,
            ie.machine_no as press_number,
            ie.operator_name,
            ie.total_rejected_qty_in_percentage as lot_rej_pct,
            ie.total_inspected_qty_nos,
            ie.total_rejected_qty,
            
            -- Production data from Moulding Production Entry
            mpe.employee_name,
            mpe.mould_reference,
            mpe.moulding_date,
            
            -- Shift data from Job Card
            jc.shift_type,
            jc.workstation,
            jc.posting_date as job_date,
            
            -- Aggregated rejection rates
            COALESCE(patrol.avg_rej, 0) as patrol_rej_pct,
            COALESCE(line.avg_rej, 0) as line_rej_pct
            
        FROM `tabInspection Entry` ie
        LEFT JOIN `tabMoulding Production Entry` mpe ON mpe.scan_lot_number = ie.lot_no
        LEFT JOIN `tabJob Card` jc ON jc.name = mpe.job_card
        
        -- Subquery for Patrol rejection aggregation
        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) as avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Patrol Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) patrol ON patrol.lot_no = ie.lot_no
        
        -- Subquery for Line rejection aggregation
        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) as avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Line Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) line ON line.lot_no = ie.lot_no
        
        WHERE ie.inspection_type = 'Lot Inspection'
        AND ie.docstatus = 1
        AND ie.posting_date = %s
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
        conditions.append("jc.workstation LIKE %s")
        params.append(f"%{filters['press_number']}%")
    
    if filters.get("item_code"):
        conditions.append("ie.product_ref_no LIKE %s")
        params.append(f"%{filters['item_code']}%")
    
    if filters.get("mould_ref"):
        conditions.append("mpe.mould_reference LIKE %s")
        params.append(f"%{filters['mould_ref']}%")
    
    if filters.get("lot_no"):
        conditions.append("ie.lot_no LIKE %s")
        params.append(f"%{filters['lot_no']}%")
    
    if conditions:
        query += " AND " + " AND ".join(conditions)
    
    query += " ORDER BY ie.lot_no DESC"
    
    # Execute query
    data = frappe.db.sql(query, params, as_dict=True)
    
    # Get threshold for CAR trigger logic
    threshold = get_threshold_for_inspection_type("Lot Inspection")
    
    # Process results
    results = []
    for row in data:
        # Use production date from Job Card if available, else inspection date
        production_date = row.get("job_date") or row.get("posting_date")
        
        # Use workstation from Job Card if available, else machine_no
        press_number = row.get("workstation") or row.get("press_number")
        
        result = {
            "inspection_entry": row.get("inspection_entry"),
            "production_date": production_date,
            "shift_type": row.get("shift_type"),
            "operator_name": row.get("employee_name"),
            "press_number": press_number,
            "item_code": row.get("item_code"),
            "mould_ref": row.get("mould_reference"),
            "lot_no": row.get("lot_no"),
            "patrol_rej_pct": round(row.get("patrol_rej_pct", 0), 2),
            "line_rej_pct": round(row.get("line_rej_pct", 0), 2),
            "lot_rej_pct": round(row.get("lot_rej_pct", 0), 2),
            "exceeds_threshold": row.get("lot_rej_pct", 0) > threshold,
            "threshold_percentage": threshold
        }
        results.append(result)
    
    return results

@frappe.whitelist()
def create_car_from_inspection(inspection_entry_name):
    """Create a CAR from an inspection entry"""
    
    # Get inspection entry
    inspection = frappe.get_doc("Inspection Entry", inspection_entry_name)
    
    # Get defect details for problem description
    defect_details = []
    for item in inspection.items:
        if item.rejected_qty > 0:
            defect_details.append(f"{item.type_of_defect}: {item.rejected_qty}")
    
    problem_desc = f"High rejection ({inspection.total_rejected_qty_in_percentage}%) found in lot {inspection.lot_no}.\n\nDefects:\n" + "\n".join(defect_details)
    
    # Create CAR
    car = frappe.get_doc({
        "doctype": "Corrective Action Report",
        "car_date": today(),
        "inspection_entry": inspection_entry_name,
        "lot_no": inspection.lot_no,
        "product_ref_no": inspection.product_ref_no,
        "rejection_percentage": inspection.total_rejected_qty_in_percentage,
        "problem_description": problem_desc,
        "status": "Open"
    })
    
    car.insert()
    
    return {
        "name": car.name,
        "status": "created"
    }

@frappe.whitelist()
def save_five_why_analysis(car_name, why_answers):
    """Save 5 Why analysis answers"""
    
    car = frappe.get_doc("Corrective Action Report", car_name)
    
    # Clear existing analysis
    car.set("five_why_analysis", [])
    
    # Add new analysis
    for i, answer in enumerate(why_answers, 1):
        car.append("five_why_analysis", {
            f"why_{i}": answer
        })
    
    car.save()
    
    return {"status": "success"}

def get_threshold_for_inspection_type(inspection_type):
    """Get threshold percentage for inspection type"""
    
    # Try to get from config
    config = frappe.get_all(
        "Rejection Threshold Configuration",
        filters={"inspection_type": inspection_type},
        fields=["threshold_percentage"]
    )
    
    if config:
        return config[0].get("threshold_percentage", 5.0)
    
    # Default thresholds
    defaults = {
        "Lot Inspection": 5.0,
        "Incoming Inspection": 2.0,
        "Final Visual Inspection": 3.0,
        "Line Inspection": 4.0,
        "Patrol Inspection": 3.0
    }
    
    return defaults.get(inspection_type, 5.0)
```

---

## 🎨 **PHASE 2: FRONTEND IMPLEMENTATION (Weeks 2-4)**

### **2.1 Dashboard Page Implementation**

**A. src/pages/Dashboard.tsx**
```tsx
import { useState } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { DashboardLayout } from '@/components/dashboard-layout'
import { DatePicker } from '@/components/ui/date-picker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const navigate = useNavigate()
  
  // Get metrics for Lot Inspection (default tab)
  const { data: lotMetrics, isLoading: lotLoading } = useFrappeGetCall(
    'rejection_analysis.api.get_dashboard_metrics',
    { date: selectedDate, inspection_type: 'Lot Inspection' }
  )
  
  const { data: incomingMetrics, isLoading: incomingLoading } = useFrappeGetCall(
    'rejection_analysis.api.get_dashboard_metrics',
    { date: selectedDate, inspection_type: 'Incoming Inspection' }
  )
  
  const { data: finalMetrics, isLoading: finalLoading } = useFrappeGetCall(
    'rejection_analysis.api.get_dashboard_metrics',
    { date: selectedDate, inspection_type: 'Final Visual Inspection' }
  )

  const handleGenerateReport = (inspectionType: string) => {
    navigate(`/lot-inspection-report?date=${selectedDate}&type=${inspectionType}`)
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <DatePicker
            label="Select Date"
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
        
        <Tabs defaultValue="lot-inspection" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lot-inspection">Lot Inspection</TabsTrigger>
            <TabsTrigger value="incoming">Incoming Inspection</TabsTrigger>
            <TabsTrigger value="final">Final Inspection</TabsTrigger>
            <TabsTrigger value="pdir">PDIR</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lot-inspection">
            <Card>
              <CardHeader>
                <CardTitle>Lot Inspection Metrics - {selectedDate}</CardTitle>
              </CardHeader>
              <CardContent>
                {lotLoading ? (
                  <div>Loading...</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{lotMetrics?.total_lots || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Lots</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{lotMetrics?.pending_lots || 0}</div>
                      <div className="text-sm text-muted-foreground">Pending Lots</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {lotMetrics?.avg_rejection || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Rejection</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {lotMetrics?.lots_exceeding_threshold || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Exceeding Threshold</div>
                    </div>
                  </div>
                )}
                <div className="mt-6">
                  <Button 
                    onClick={() => handleGenerateReport('Lot Inspection')}
                    className="w-full"
                  >
                    Generate Lot Inspection Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="incoming">
            <Card>
              <CardHeader>
                <CardTitle>Incoming Inspection Metrics - {selectedDate}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Similar structure for incoming metrics */}
                <div className="text-center py-8 text-muted-foreground">
                  Incoming Inspection metrics coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="final">
            <Card>
              <CardHeader>
                <CardTitle>Final Inspection Metrics - {selectedDate}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Final Inspection metrics coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="pdir">
            <Card>
              <CardHeader>
                <CardTitle>PDIR Metrics - {selectedDate}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  PDIR metrics coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
```

### **2.2 Lot Inspection Report Page**

**A. src/pages/LotInspectionReport.tsx**
```tsx
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { DashboardLayout } from '@/components/dashboard-layout'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { DataTable } from '@/components/data-table'
import { useNavigate } from 'react-router-dom'

const columns = [
  {
    accessorKey: "production_date",
    header: "Production Date",
    cell: ({ row }) => new Date(row.getValue("production_date")).toLocaleDateString()
  },
  {
    accessorKey: "shift_type",
    header: "Shift Type"
  },
  {
    accessorKey: "operator_name",
    header: "Operator Name"
  },
  {
    accessorKey: "press_number",
    header: "Press Number"
  },
  {
    accessorKey: "item_code",
    header: "Item Code"
  },
  {
    accessorKey: "mould_ref",
    header: "Mould Ref"
  },
  {
    accessorKey: "lot_no",
    header: "Lot No"
  },
  {
    accessorKey: "patrol_rej_pct",
    header: "Patrol REJ%",
    cell: ({ row }) => `${row.getValue("patrol_rej_pct")}%`
  },
  {
    accessorKey: "line_rej_pct",
    header: "Line REJ%",
    cell: ({ row }) => `${row.getValue("line_rej_pct")}%`
  },
  {
    accessorKey: "lot_rej_pct",
    header: "LOT REJ%",
    cell: ({ row }) => {
      const value = row.getValue("lot_rej_pct")
      const exceeds = row.original.exceeds_threshold
      
      return (
        <span className={exceeds ? 'text-red-600 font-bold' : 'text-green-600'}>
          {value}%
        </span>
      )
    }
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const exceeds = row.original.exceeds_threshold
      
      if (!exceeds) return null
      
      return (
        <Button 
          size="sm" 
          onClick={() => handleGenerateCAR(row.original)}
          variant="outline"
        >
          GENERATE CAR
        </Button>
      )
    }
  }
]

export function LotInspectionReport() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [filters, setFilters] = useState({
    production_date: searchParams.get('date') || new Date().toISOString().split('T')[0],
    shift_type: '',
    operator_name: '',
    press_number: '',
    item_code: '',
    mould_ref: '',
    lot_no: ''
  })
  
  const { data: reportData, isLoading } = useFrappeGetCall(
    'rejection_analysis.api.get_lot_inspection_report',
    { filters }
  )
  
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }
  
  const handleGenerateCAR = (row: any) => {
    navigate(`/car-form?inspection=${row.inspection_entry}`)
  }
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Lot Inspection Report</h1>
        
        {/* Filter Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <DatePicker
            label="Production Date"
            value={filters.production_date}
            onChange={(value) => handleFilterChange('production_date', value)}
          />
          
          <Select
            label="Shift Type"
            value={filters.shift_type}
            onChange={(value) => handleFilterChange('shift_type', value)}
            options={[
              { value: '', label: 'All' },
              { value: 'A', label: 'A' },
              { value: 'B', label: 'B' },
              { value: 'C', label: 'C' },
              { value: 'General', label: 'General' }
            ]}
          />
          
          <Input
            label="Operator Name"
            value={filters.operator_name}
            onChange={(e) => handleFilterChange('operator_name', e.target.value)}
            placeholder="Search operator..."
          />
          
          <Input
            label="Press Number"
            value={filters.press_number}
            onChange={(e) => handleFilterChange('press_number', e.target.value)}
            placeholder="Search press..."
          />
          
          <Input
            label="Item Code"
            value={filters.item_code}
            onChange={(e) => handleFilterChange('item_code', e.target.value)}
            placeholder="Search item..."
          />
          
          <Input
            label="Mould Ref"
            value={filters.mould_ref}
            onChange={(e) => handleFilterChange('mould_ref', e.target.value)}
            placeholder="Search mould..."
          />
          
          <Input
            label="Lot No"
            value={filters.lot_no}
            onChange={(e) => handleFilterChange('lot_no', e.target.value)}
            placeholder="Search lot..."
          />
          
          <div className="flex items-end">
            <Button onClick={() => {/* Apply filters */}}>
              Apply Filters
            </Button>
          </div>
        </div>
        
        {/* Results Table */}
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <DataTable
            columns={columns}
            data={reportData || []}
            onRowClick={(row) => navigate(`/inspection-entry/${row.inspection_entry}`)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
```

### **2.3 CAR Form Implementation**

**A. src/pages/CorrectiveActionReport.tsx**
```tsx
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CorrectiveActionReport() {
  const [searchParams] = useSearchParams()
  const inspectionEntry = searchParams.get('inspection')
  
  const [formData, setFormData] = useState({
    problem_description: '',
    cause_for_non_detection: '',
    cause_for_occurrence: '',
    corrective_action: '',
    remarks: '',
    showFiveWhy: false,
    whyAnswers: ['', '', '', '', '']
  })
  
  // Get inspection entry details for pre-filling
  const { data: inspectionData } = useFrappeGetCall(
    'frappe.client.get',
    { doctype: 'Inspection Entry', name: inspectionEntry }
  )
  
  // Create CAR API call
  const { call: createCAR, loading: creating } = useFrappePostCall(
    'rejection_analysis.api.create_car_from_inspection'
  )
  
  // Save 5 Why API call
  const { call: saveFiveWhy } = useFrappePostCall(
    'rejection_analysis.api.save_five_why_analysis'
  )
  
  useEffect(() => {
    if (inspectionData) {
      // Pre-fill problem description from defect details
      const defects = inspectionData.items?.map(item => 
        `${item.type_of_defect}: ${item.rejected_qty}`
      ).join('\n') || ''
      
      setFormData(prev => ({
        ...prev,
        problem_description: `High rejection (${inspectionData.total_rejected_qty_in_percentage}%) found in lot ${inspectionData.lot_no}.\n\nDefects:\n${defects}`
      }))
    }
  }, [inspectionData])
  
  const handleSubmit = async () => {
    try {
      // Create CAR
      const carResult = await createCAR({ inspection_entry_name: inspectionEntry })
      
      // Save 5 Why analysis if provided
      if (formData.showFiveWhy && formData.whyAnswers.some(a => a.trim())) {
        await saveFiveWhy({
          car_name: carResult.message.name,
          why_answers: formData.whyAnswers
        })
      }
      
      // Navigate to CAR detail or show success
      alert('CAR created successfully!')
    } catch (error) {
      console.error('Error creating CAR:', error)
      alert('Error creating CAR')
    }
  }
  
  const updateWhyAnswer = (index: number, value: string) => {
    const newAnswers = [...formData.whyAnswers]
    newAnswers[index] = value
    setFormData(prev => ({ ...prev, whyAnswers: newAnswers }))
  }
  
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-green-500 text-white text-center text-2xl font-bold p-4 rounded-t-lg mb-0">
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
                  value={formData.problem_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, problem_description: e.target.value }))}
                />
                
                <Textarea
                  label="CAUSE FOR NON DETECTION"
                  rows={5}
                  value={formData.cause_for_non_detection}
                  onChange={(e) => setFormData(prev => ({ ...prev, cause_for_non_detection: e.target.value }))}
                />
                
                <Textarea
                  label="CAUSE FOR OCCURRENCE"
                  rows={5}
                  value={formData.cause_for_occurrence}
                  onChange={(e) => setFormData(prev => ({ ...prev, cause_for_occurrence: e.target.value }))}
                />
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                <Textarea
                  label="CORRECTIVE ACTION"
                  rows={5}
                  value={formData.corrective_action}
                  onChange={(e) => setFormData(prev => ({ ...prev, corrective_action: e.target.value }))}
                />
                
                {/* 5 Why Analysis */}
                <div className="border rounded-lg p-4">
                  <Button
                    className="w-full bg-yellow-400 text-black hover:bg-yellow-500 mb-4"
                    onClick={() => setFormData(prev => ({ ...prev, showFiveWhy: !prev.showFiveWhy }))}
                  >
                    WHY - WHY ANALYSIS (BUTTON)
                  </Button>
                  
                  {formData.showFiveWhy && (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <div key={num} className="flex items-center gap-2">
                          <span className="font-semibold bg-teal-600 text-white px-3 py-2 rounded min-w-[80px]">
                            {num}. WHY?
                          </span>
                          <Input
                            className="flex-1"
                            value={formData.whyAnswers[num - 1]}
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
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-6">
              <Button variant="outline">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={creating}>
                {creating ? 'Creating...' : 'Submit CAR'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
```

---

## 📋 **PHASE 3: TESTING & DEPLOYMENT (Week 5)**

### **3.1 Test Cases**

**A. Dashboard Tests**
- [ ] Date selector changes metrics correctly
- [ ] Tab switching loads correct inspection type metrics
- [ ] "Generate Report" navigation works
- [ ] Loading states display properly
- [ ] Error handling for no data

**B. Lot Inspection Report Tests**
- [ ] Filter bar applies filters correctly
- [ ] Table displays all required columns
- [ ] Color coding works (green/yellow/red)
- [ ] GENERATE CAR button appears only for >5% rejection
- [ ] CAR creation navigates to form
- [ ] Sorting and pagination work

**C. CAR Form Tests**
- [ ] Pre-filling from inspection entry works
- [ ] 5 Why analysis expands/collapses
- [ ] Form validation works
- [ ] Save/submit creates CAR document
- [ ] Navigation back to report works

### **3.2 Performance Optimization**

**A. Database Queries**
- Add indexes on frequently queried fields:
  - `posting_date` on Inspection Entry
  - `scan_lot_number` on Moulding Production Entry
  - `lot_no` on Inspection Entry

**B. API Optimization**
- Implement caching for dashboard metrics (5-minute cache)
- Add pagination to large result sets
- Use database views for complex joins

**C. Frontend Optimization**
- Implement virtual scrolling for large tables
- Add debounced search inputs
- Lazy load components

### **3.3 Deployment Checklist**

- [ ] Backend API endpoints tested
- [ ] Frontend components integrated
- [ ] Authentication working
- [ ] Data validation implemented
- [ ] Error handling complete
- [ ] Performance optimized
- [ ] User acceptance testing passed
- [ ] Documentation updated

---

## 🎯 **SUCCESS METRICS**

### **Functional Metrics**
- ✅ Dashboard loads metrics within 2 seconds
- ✅ Lot Inspection Report filters work correctly
- ✅ CAR creation takes < 3 seconds
- ✅ All data linkages work correctly
- ✅ Color coding matches business rules

### **Business Metrics**
- ✅ Identifies lots exceeding 5% threshold
- ✅ Generates CARs for high-rejection lots
- ✅ Provides complete traceability
- ✅ Enables root cause analysis
- ✅ Supports continuous improvement

---

## 📞 **SUPPORT & MAINTENANCE**

### **Post-Deployment Support**
1. **User Training**: Train quality team on new console
2. **Data Validation**: Monitor data accuracy for first month
3. **Performance Monitoring**: Track API response times
4. **Bug Fixes**: Address any issues within 24 hours
5. **Feature Requests**: Collect and prioritize enhancements

### **Maintenance Tasks**
1. **Monthly**: Review threshold configurations
2. **Quarterly**: Update defect type lists if needed
3. **Annually**: Performance optimization review

---

**END OF IMPLEMENTATION ROADMAP**

This comprehensive roadmap provides everything needed to build the Rejection Analysis Console from data discovery through deployment. The implementation is divided into clear phases with specific deliverables, test cases, and success metrics.