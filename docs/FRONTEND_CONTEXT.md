# Frontend Development Context - Rejection Analysis Console
**Complete Reference Guide for React/TypeScript Development**

---

## 📋 PROJECT OVERVIEW

**Application:** Rejection Analysis Console  
**Framework:** React 19 + TypeScript + Vite  
**UI Library:** Radix UI + Tailwind CSS  
**Data Layer:** frappe-react-sdk  
**Router:** React Router DOM v7  

**Purpose:** Modern frontend for quality inspection analysis, CAR generation, and rejection tracking.

---

## 🗂️ FOLDER STRUCTURE

```
rejection_analysis_console/
├── public/                          # Static assets
├── src/
│   ├── app/                         # App configuration
│   ├── assets/                      # Images, icons
│   ├── components/                  # Reusable UI components
│   │   ├── ui/                      # shadcn/ui primitives
│   │   ├── app-sidebar.tsx          # Sidebar navigation
│   │   ├── dashboard-layout.tsx     # Main layout wrapper
│   │   ├── data-table.tsx           # Reusable table component
│   │   ├── error-boundary.tsx       # Error handling
│   │   ├── login-form.tsx           # Login UI
│   │   ├── nav-*.tsx                # Navigation components
│   │   └── section-cards.tsx        # Metric cards
│   ├── hooks/                       # Custom React hooks
│   │   └── use-mobile.ts            # Responsive detection
│   ├── lib/                         # Utility libraries
│   │   └── utils.ts                 # Helper functions
│   ├── pages/                       # Route pages
│   │   ├── auth/
│   │   │   └── Login.tsx            # Login page
│   │   ├── Dashboard.tsx            # ✅ Main dashboard (COMPLETE)
│   │   ├── RejectionAnalysis.tsx    # Analysis views
│   │   ├── Reports.tsx              # Report generation
│   │   ├── Settings.tsx             # App settings
│   │   └── NotFound.tsx             # 404 page
│   ├── utils/                       # Utilities
│   │   └── auth/                    # Authentication helpers
│   ├── App.tsx                      # Root component
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Global styles
├── package.json                     # Dependencies
├── vite.config.ts                   # Vite configuration
├── tailwind.config.js               # Tailwind configuration
└── tsconfig.json                    # TypeScript configuration
```

---

## 📦 INSTALLED DEPENDENCIES

### Core Libraries
- **react** `19.2.0` - UI library
- **react-dom** `19.2.0` - DOM rendering
- **react-router-dom** `7.9.6` - Routing
- **frappe-react-sdk** `1.13.0` - Frappe backend integration
- **typescript** `5.9.3` - Type safety

### UI Components
- **@radix-ui/react-*** - Accessible component primitives:
  - `react-avatar`, `react-checkbox`, `react-dialog`
  - `react-dropdown-menu`, `react-label`, `react-select`
  - `react-separator`, `react-slot`, `react-tabs`
  - `react-toggle`, `react-tooltip`
- **@tabler/icons-react** `3.35.0` - Icon library
- **lucide-react** `0.554.0` - Additional icons
- **next-themes** `0.4.6` - Dark mode support

### Tables & Data
- **@tanstack/react-table** `8.21.3` - Advanced table features
- **recharts** `3.5.0` - Charts/graphs

### Utilities
- **tailwindcss** `4.1.17` - Utility-first CSS
- **class-variance-authority** `0.7.1` - Component variants
- **clsx** `2.1.1` - Class name utilities
- **tailwind-merge** `3.4.0` - Merge Tailwind classes
- **zod** `4.1.13` - Schema validation
- **sonner** `2.0.7` - Toast notifications
- **js-cookie** `3.0.5` - Cookie management

### Drag & Drop
- **@dnd-kit/core** `6.3.1` - Drag and drop toolkit
- **@dnd-kit/sortable** `10.0.0` - Sortable lists
- **@dnd-kit/modifiers** `9.0.0` - DnD modifiers

---

## 🎯 CURRENT IMPLEMENTATION STATUS

### ✅ COMPLETED FEATURES

#### 1. **Authentication System**
- Login page with Frappe SSO integration
- Protected routes with `ProtectedRoute` component
- User context provider
- Session management with cookies

#### 2. **Dashboard Page** (`src/pages/Dashboard.tsx`)
- ✅ Date selector
- ✅ 4-tab layout (Lot, Incoming, Final, PDIR)
- ✅ Metric cards with loading states
- ✅ Inspection records table
- ✅ Color-coded rejection percentages
- ✅ "Generate CAR" button (conditional display)
- ✅ Export functionality placeholder

**Current Tab Structure:**
```tsx
<Tabs>
  <TabsTrigger value="lot-inspection">Lot Inspection</TabsTrigger>
  <TabsTrigger value="incoming">Incoming Inspection</TabsTrigger>
  <TabsTrigger value="final">Final Visual Inspection</TabsTrigger>
  <TabsTrigger value="pdir">PDIR (Coming Soon)</TabsTrigger>
</Tabs>
```

#### 3. **Reusable Components**
- `DashboardLayout` - Main app layout with sidebar
- `SiteHeader` - Top navigation bar
- `MetricCard` - Statistics display cards
- `InspectionRecordsTable` - Data table with color coding
- `DataTable` - Generic table component
- `ErrorBoundary` - Error handling wrapper

#### 4. **Routing System**
```typescript
// Current Routes:
/ → /dashboard (redirect)
/dashboard → Dashboard page ✅
/rejection-analysis → Analysis page (placeholder)
/reports → Reports page (placeholder)
/settings → Settings page (placeholder)
/login → Login page ✅
* → 404 Not Found ✅
```

#### 5. **API Integration** (Partial)
- Uses `frappe-react-sdk` for backend calls
- `useFrappeGetDocList` for fetching documents
- `useFrappeCall` for custom API methods
- Toast notifications with `sonner`

---

## 🚧 MISSING FEATURES (TO IMPLEMENT)

### 1. **CAR (Corrective Action Report) Form Page**
**Priority:** HIGH  
**File to Create:** `src/pages/CorrectiveActionReport.tsx`

**Required Components:**
```tsx
// CAR Form Layout (as per UI_REQUIREMENTS_SPEC.md)
- Green header: "CORRECTIVE ACTION REPORT"
- Left column:
  - Problem Description (textarea)
  - Cause for Non Detection (textarea)
  - Cause for Occurrence (textarea)
- Right column:
  - Corrective Action (textarea)
  - 5 Why Analysis (expandable yellow button)
    - 5 iterative "Why?" inputs
- Bottom:
  - Remarks (textarea)
  - Action buttons: Save, Submit, Cancel
```

**TypeScript Interface:**
```typescript
interface CARFormData {
  inspection_entry: string
  lot_no: string
  product_ref_no: string
  rejection_percentage: number
  problem_description: string
  cause_for_non_detection: string
  cause_for_occurrence: string
  corrective_action: string
  why_answers: string[] // 5 elements
  remarks: string
  assigned_to: string
  target_date: string
  status: 'Open' | 'In Progress' | 'Completed' | 'Closed'
}
```

### 2. **Detailed Report Pages** (3 separate pages needed)

#### A. Lot Inspection Report Page
**File:** `src/pages/reports/LotInspectionReport.tsx`

**Features:**
- Advanced filter bar (7 filters):
  - Production Date
  - Shift Type (A/B/C/General)
  - Operator Name (autocomplete)
  - Press Number (autocomplete)
  - Item Code (autocomplete)
  - Mould Ref (text input)
  - Lot No (text input)
- Full data table with all columns
- Export to Excel/PDF
- Navigate to CAR form on button click

#### B. Incoming Inspection Report Page
**File:** `src/pages/reports/IncomingInspectionReport.tsx`

**Features:**
- Similar structure to Lot Inspection Report
- Different columns (no Patrol/Line rejection)
- Focus on supplier quality

#### C. Final Inspection Report Page
**File:** `src/pages/reports/FinalInspectionReport.tsx`

**Features:**
- Uses `SPP Inspection Entry` DocType
- Shows all 4 rejection stages:
  - Patrol REJ%
  - Line REJ%
  - Lot REJ%
  - Final REJ% (primary metric)
- Includes trimming operator info

### 3. **API Endpoints** (Backend Required)

**Endpoints Needed:**
```python
# 1. Dashboard Metrics
@frappe.whitelist()
def get_dashboard_metrics(date, inspection_type):
    """Returns aggregated metrics for dashboard tabs"""
    
# 2. Lot Inspection Report
@frappe.whitelist()
def get_lot_inspection_report(filters):
    """Returns detailed lot inspection data with patrol/line aggregation"""
    
# 3. Incoming Inspection Report
@frappe.whitelist()
def get_incoming_inspection_report(filters):
    """Returns incoming inspection data"""
    
# 4. Final Inspection Report
@frappe.whitelist()
def get_final_inspection_report(filters):
    """Returns final visual inspection data (from SPP Inspection Entry)"""
    
# 5. Create CAR
@frappe.whitelist()
def create_car_from_inspection(inspection_entry_name):
    """Creates new CAR document from inspection entry"""
    
# 6. Save 5 Why Analysis
@frappe.whitelist()
def save_five_why_analysis(car_name, why_answers):
    """Saves 5 Why analysis to CAR"""
```

### 4. **Missing UI Components**

#### Filter Components
```tsx
// src/components/filters/InspectionFilters.tsx
- Date range picker
- Multi-select for shift types
- Autocomplete for Employee (Operator)
- Autocomplete for Workstation (Press)
- Autocomplete for Item (Product)
- Text inputs for Mould Ref, Lot No
```

#### CAR Components
```tsx
// src/components/car/
- FiveWhyAnalysis.tsx     // Expandable 5 Why section
- CARFormFields.tsx       // Form field components
- ProblemDescription.tsx  // Auto-populated from defects
```

#### Export Components
```tsx
// src/components/export/
- ExportButton.tsx        // Export to Excel/PDF
- ReportDownloader.tsx    // Download handler
```

---

## 🎨 DESIGN SYSTEM & STYLING

### Color Scheme (as per UI_REQUIREMENTS_SPEC.md)

```css
/* Brand Colors */
--green-header: #86BC42;       /* CAR header */
--yellow-why: #FFE234;         /* 5 Why button */
--teal-section: #5A9BA8;       /* Section headers */
--gray-background: #E5E7EB;    /* Filter area */

/* Rejection Status Colors */
--success-green: #22C55E;      /* < 3% */
--warning-yellow: #EAB308;     /* 3-5% */
--critical-red: #EF4444;       /* > 5% */
```

### Component Styling Guidelines

**Current Implementation (Dashboard):**
```typescript
// Color coding for rejection percentages
const getRejectionColor = (percentage: number) => {
  if (percentage >= 5.0) return 'text-red-600 font-bold'  // Critical
  if (percentage >= 3.0) return 'text-yellow-600'         // Warning
  return 'text-green-600'                                  // Normal
}

// Row highlighting for critical lots
className={record.exceeds_threshold ? 'bg-red-50' : ''}
```

### Tailwind Configuration
- Custom theme colors defined in `tailwind.config.js`
- Dark mode support via `next-themes`
- Responsive breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`

---

## 🔌 API INTEGRATION PATTERNS

### Pattern 1: Fetch Document List
```typescript
import { useFrappeGetDocList } from 'frappe-react-sdk'

const { data, error, isLoading } = useFrappeGetDocList('Inspection Entry', {
  filters: [
    ['posting_date', '=', selectedDate],
    ['inspection_type', '=', 'Lot Inspection'],
    ['docstatus', '=', 1]
  ],
  fields: ['name', 'lot_no', 'total_rejected_qty_in_percentage'],
  orderBy: { field: 'posting_date', order: 'desc' },
  limit: 100
})
```

### Pattern 2: Call Custom API Method
```typescript
import { useContext } from 'react'
import { FrappeContext } from 'frappe-react-sdk'

const { call } = useContext(FrappeContext) as any

// POST request to custom API
const result = await call.post('rejection_analysis.api.get_lot_inspection_report', {
  filters: {
    production_date: selectedDate,
    shift_type: 'A'
  }
})

const data = result?.message || result
```

### Pattern 3: Create Document
```typescript
import { useFrappeCreateDoc } from 'frappe-react-sdk'

const { createDoc } = useFrappeCreateDoc()

await createDoc('Corrective Action Report', {
  inspection_entry: inspectionEntryName,
  lot_no: lotNo,
  rejection_percentage: rejectionPct,
  problem_description: description,
  status: 'Open'
})
```

### Pattern 4: Update Document
```typescript
import { useFrappeUpdateDoc } from 'frappe-react-sdk'

const { updateDoc } = useFrappeUpdateDoc()

await updateDoc('Corrective Action Report', carName, {
  corrective_action: action,
  status: 'In Progress'
})
```

---

## 📊 DATA MODELS (TypeScript Interfaces)

### Current Interfaces (Dashboard.tsx)

```typescript
interface InspectionMetrics {
  total_lots: number
  pending_lots: number
  avg_rejection: number
  lots_exceeding_threshold: number
  total_inspected_qty: number
  total_rejected_qty: number
  threshold_percentage: number
  patrol_rej_avg?: number
  line_rej_avg?: number
}

interface LotInspectionRecord {
  inspection_entry: string
  production_date: string
  shift_type: string | null
  operator_name: string
  press_number: string
  item_code: string
  mould_ref: string
  lot_no: string
  patrol_rej_pct: number
  line_rej_pct: number
  lot_rej_pct: number
  exceeds_threshold: boolean
  threshold_percentage: number
}
```

### Additional Interfaces Needed

```typescript
// For Incoming Inspection
interface IncomingInspectionRecord {
  inspection_entry: string
  posting_date: string
  supplier: string
  material_code: string
  batch_no: string
  inspected_qty: number
  rejected_qty: number
  rejection_pct: number
  inspector_name: string
  exceeds_threshold: boolean
}

// For Final Inspection
interface FinalInspectionRecord {
  inspection_entry: string
  production_date: string
  lot_no: string
  item_code: string
  mould_ref: string
  patrol_rej_pct: number
  line_rej_pct: number
  lot_rej_pct: number
  final_rej_pct: number       // Primary metric
  trimming_operator: string
  inspector_name: string
  exceeds_threshold: boolean
}

// For CAR
interface CorrectiveActionReport {
  name?: string
  inspection_entry: string
  lot_no: string
  product_ref_no: string
  rejection_percentage: number
  problem_description: string
  cause_for_non_detection: string
  cause_for_occurrence: string
  corrective_action: string
  why_analysis: WhyAnalysis[]
  remarks: string
  assigned_to: string
  target_date: string
  status: 'Open' | 'In Progress' | 'Completed' | 'Closed'
  created_on: string
  created_by: string
}

interface WhyAnalysis {
  why_number: number
  question: string
  answer: string
}
```

---

## 🧩 REUSABLE COMPONENT PATTERNS

### MetricCard Component
```tsx
<MetricCard 
  label="Total Lots" 
  value={123}
  loading={false}
  icon={Package}
  trend="up" // or "down" or "neutral"
/>
```

### InspectionRecordsTable Component
```tsx
<InspectionRecordsTable 
  records={lotRecords}
  loading={loading}
  onGenerateCAR={(record) => handleGenerateCAR(record)}
/>
```

### FilterBar Component (To Create)
```tsx
<FilterBar
  filters={filters}
  onFilterChange={setFilters}
  onApply={applyFilters}
  onReset={resetFilters}
/>
```

---

## 🔄 STATE MANAGEMENT

### Current Approach (React Hooks)

**Dashboard State:**
```typescript
// Date selection
const [selectedDate, setSelectedDate] = useState(
  new Date().toISOString().split('T')[0]
)

// Active tab
const [activeTab, setActiveTab] = useState('lot-inspection')

// Metrics by inspection type
const [lotMetrics, setLotMetrics] = useState<InspectionMetrics | null>(null)
const [incomingMetrics, setIncomingMetrics] = useState<InspectionMetrics | null>(null)
const [finalMetrics, setFinalMetrics] = useState<InspectionMetrics | null>(null)

// Records by inspection type
const [lotRecords, setLotRecords] = useState<LotInspectionRecord[]>([])
const [incomingRecords, setIncomingRecords] = useState<LotInspectionRecord[]>([])
const [finalRecords, setFinalRecords] = useState<LotInspectionRecord[]>([])

// Loading states
const [loading, setLoading] = useState(false)
const [metricsLoading, setMetricsLoading] = useState(false)
```

**Recommended:** Consider React Context for shared state across pages:
```tsx
// src/contexts/DateContext.tsx
export const DateProvider = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState(today())
  return (
    <DateContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </DateContext.Provider>
  )
}
```

---

## 🚀 DEVELOPMENT WORKFLOW

### Running the Frontend

```bash
# Navigate to console directory
cd apps/rejection_analysis/rejection_analysis_console

# Install dependencies (if not done)
yarn install

# Start dev server (http://localhost:5173)
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

### Development Server Details
- **Dev URL:** `http://localhost:5173`
- **Production URL:** `http://your-frappe-site/rejection_analysis_console`
- **Proxy:** Vite proxies API calls to Frappe backend (configured in `proxyOptions.ts`)

### Hot Module Replacement (HMR)
- Changes to `.tsx` files reflect instantly
- Tailwind CSS updates in real-time
- State is preserved during HMR

---

## 📝 NEXT IMPLEMENTATION STEPS

### Phase 1: Backend API (Priority 1)
1. ✅ Create `get_lot_inspection_report()` API
2. ✅ Create `get_incoming_inspection_report()` API
3. ✅ Create `get_final_inspection_report()` API
4. ✅ Create `get_dashboard_metrics()` API
5. ✅ Test APIs with real data

### Phase 2: CAR Form (Priority 2)
1. ✅ Create `CorrectiveActionReport.tsx` page
2. ✅ Build 5 Why Analysis component
3. ✅ Implement form validation (Zod)
4. ✅ Add save/submit logic
5. ✅ Link to inspection entries

### Phase 3: Report Pages (Priority 3)
1. ✅ Create `LotInspectionReport.tsx`
2. ✅ Create `IncomingInspectionReport.tsx`
3. ✅ Create `FinalInspectionReport.tsx`
4. ✅ Add filter components
5. ✅ Add export functionality

### Phase 4: Polish (Priority 4)
1. ✅ Add loading skeletons
2. ✅ Improve error handling
3. ✅ Add empty states
4. ✅ Performance optimization
5. ✅ Mobile responsiveness

---

## �� DEBUGGING TIPS

### Common Issues

**1. API calls failing:**
```typescript
// Check if API endpoint is whitelisted
@frappe.whitelist()
def your_api_method():
    pass

// Check network tab for errors
// Verify authentication cookie is present
```

**2. TypeScript errors:**
```bash
# Check types
yarn tsc --noEmit

# Fix with proper interface definitions
```

**3. Routing issues:**
```typescript
// Development: basename = '/'
// Production: basename = '/rejection_analysis_console'

// Check vite.config.ts base path matches
```

**4. Styling not applying:**
```bash
# Restart dev server for Tailwind config changes
# Check class names are valid Tailwind utilities
# Verify PostCSS is processing correctly
```

---

## 📚 KEY REFERENCE FILES

| File | Purpose |
|------|---------|
| `docs/UI_REQUIREMENTS_SPEC.md` | Complete UI mockups and specifications |
| `docs/LOT_INSPECTION_DATA_LINKING.md` | Lot inspection data structure |
| `docs/INCOMING_INSPECTION_DATA_LINKAGE.md` | Incoming inspection data structure |
| `docs/FINAL_INSPECTION_DATA_LINKAGE.md` | Final inspection data structure |
| `src/pages/Dashboard.tsx` | Working example of all patterns |
| `src/components/ui/` | Reusable Radix UI components |

---

## ✅ DEVELOPMENT CHECKLIST

### Before Starting Frontend Work:
- [ ] Backend APIs are implemented and tested
- [ ] DocTypes are created (Inspection Entry, SPP Inspection Entry)
- [ ] Sample data exists in database
- [ ] API endpoints return correct data format
- [ ] Authentication is working

### Frontend Development:
- [ ] Component follows TypeScript best practices
- [ ] Uses Tailwind CSS for styling (no inline styles)
- [ ] Includes loading states
- [ ] Includes error handling
- [ ] Has proper TypeScript interfaces
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Accessible (keyboard navigation, ARIA labels)
- [ ] Uses frappe-react-sdk for API calls
- [ ] Includes toast notifications for actions

---

**END OF FRONTEND CONTEXT DOCUMENT**
