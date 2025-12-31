import { useState, useContext, useEffect, useMemo } from 'react'
import { exportToCSV } from '@/utils/export-csv'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FrappeContext } from 'frappe-react-sdk'
import { toast } from 'sonner'
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Package,
  ClipboardCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
  BarChart3,
  RefreshCw,
  Download,
  Eye,
  Save,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { CARGenerationWizard } from '@/components/car/car-generation-wizard'
import { FinalInspectionGroupedTable } from '@/components/FinalInspectionGroupedTable'
import { RejectionDetailsModal } from '@/components/RejectionDetailsModal'

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
  patrol_rej_pct?: number
  line_rej_pct?: number
  lot_rej_pct?: number
  rej_pct?: number  // For Incoming/Final inspections
  exceeds_threshold: boolean
  threshold_percentage: number
  car_name?: string
  car_status?: string
  // Cost fields
  unit_cost?: number
  patrol_rejection_cost?: number
  line_rejection_cost?: number
  lot_rejection_cost?: number
  total_rejection_cost?: number
}

interface FinalInspectionRecord {
  spp_inspection_entry: string
  inspection_date: string
  production_date: string
  shift_type: string | null
  operator_name: string
  press_number: string
  item: string
  mould_ref: string
  lot_no: string
  base_lot_no: string  // Added for grouping sub-lots
  patrol_rej_pct: number
  line_rej_pct: number
  lot_rej_pct: number
  final_insp_rej_pct: number
  final_inspector: string  // Trimming Operator
  final_insp_qty: number
  final_rej_qty: number
  warehouse: string | null
  stage: string | null
  exceeds_threshold: boolean
  threshold_percentage: number
  car_name?: string
  car_status?: string
  // Cost fields
  unit_cost?: number
  fvi_rejection_cost?: number
}

interface IncomingInspectionRecord {
  inspection_entry: string
  date: string
  production_date?: string
  batch_no: string | null
  item: string
  mould_ref: string
  lot_no: string
  deflasher_name: string | null
  qty_sent: number | null
  qty_received: number | null
  diff_pct: number | null
  inspector_name: string
  insp_qty: number
  rej_qty: number
  rej_pct: number
  exceeds_threshold: boolean
  threshold_percentage: number
  car_name?: string
  car_status?: string
  // Cost fields
  unit_cost?: number
  rejection_cost?: number
}

function MetricCard({
  label,
  value,
  trend,
  loading,
  icon: Icon
}: {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  loading: boolean
  icon?: any
}) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-1.5">
        <div className="flex items-center justify-between space-x-1.5">
          <div className="flex-1">
            <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-5 w-16 mt-0.5" />
            ) : (
              <p className="text-xl font-bold mt-0.5 tracking-tight">
                {value !== null && value !== undefined ? value : '—'}
              </p>
            )}
          </div>
          {Icon && (
            <div className="rounded-full bg-primary/10 p-1.5">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
          )}
        </div>
        {trend && !loading && (
          <div className={`flex items-center gap-0.5 mt-0.5 text-[9px] ${trend === 'up' ? 'text-red-600' :
            trend === 'down' ? 'text-green-600' :
              'text-muted-foreground'
            }`}>
            {trend === 'up' && <TrendingUp className="h-2.5 w-2.5" />}
            {trend === 'down' && <TrendingDown className="h-2.5 w-2.5" />}
            {trend === 'up' ? 'Above threshold' : trend === 'down' ? 'Within limits' : 'Normal'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}



function InspectionRecordsTable({
  records,
  loading,
  onGenerateCAR,
  onShowRejectionDetails
}: {
  records: LotInspectionRecord[]
  loading: boolean
  onGenerateCAR: (record: LotInspectionRecord) => void
  onShowRejectionDetails: (inspectionEntry: string) => void
}) {
  // Sorting and filtering state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [filters, setFilters] = useState({
    lotNo: '',
    itemCode: '',
    operator: ''
  })

  const getRejectionColor = (percentage: number) => {
    if (percentage >= 5.0) return 'text-red-600 font-bold'
    if (percentage >= 3.0) return 'text-yellow-600'
    return 'text-green-600'
  }

  const shortenPressNumber = (pressNumber: string) => {
    if (!pressNumber) return '—'
    const shortened = pressNumber
      .replace(/^(PRESS|Press|MACHINE|Machine|M)-?/i, '')
      .trim()
    return shortened || pressNumber
  }

  // Sorting function
  const sortData = <T extends Record<string, any>>(data: T[], key: string, direction: 'asc' | 'desc'): T[] => {
    return [...data].sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return direction === 'asc'
        ? (aVal > bVal ? 1 : -1)
        : (aVal < bVal ? 1 : -1)
    })
  }

  // Filter function
  const filterData = (data: LotInspectionRecord[]): LotInspectionRecord[] => {
    return data.filter(row => {
      const lotMatch = !filters.lotNo ||
        row.lot_no?.toString().toLowerCase().includes(filters.lotNo.toLowerCase())
      const itemMatch = !filters.itemCode ||
        row.item_code?.toString().toLowerCase().includes(filters.itemCode.toLowerCase())
      const operatorMatch = !filters.operator ||
        row.operator_name?.toString().toLowerCase().includes(filters.operator.toLowerCase())

      return lotMatch && itemMatch && operatorMatch
    })
  }

  // Handle sort
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Handle filter change
  const handleFilterChange = (filterKey: 'lotNo' | 'itemCode' | 'operator', value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }))
  }

  // Get processed data (filtered and sorted)
  const getProcessedData = (): LotInspectionRecord[] => {
    let processed = filterData(records)
    if (sortConfig) {
      processed = sortData(processed, sortConfig.key, sortConfig.direction)
    }
    return processed
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const processedRecords = getProcessedData()

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto opacity-50 mb-3" />
        <p>No inspection records found</p>
        <p className="text-sm mt-1">Click "Generate All Reports" to fetch data</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full caption-bottom text-sm">
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="w-[90px] sticky top-0 bg-muted z-10">
                <Button variant="ghost" size="sm" className="-ml-3 h-7 text-xs" onClick={() => handleSort('production_date')}>
                  Date
                  {sortConfig?.key === 'production_date' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : (<ArrowUpDown className="ml-1 h-3 w-3" />)}
                </Button>
              </TableHead>
              <TableHead className="w-[70px] sticky top-0 bg-muted z-10">Shift</TableHead>
              <TableHead className="w-[110px] sticky top-0 bg-muted z-10">
                <Button variant="ghost" size="sm" className="-ml-3 h-7 text-xs" onClick={() => handleSort('operator_name')}>
                  Operator
                  {sortConfig?.key === 'operator_name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : (<ArrowUpDown className="ml-1 h-3 w-3" />)}
                </Button>
              </TableHead>
              <TableHead className="w-[50px] sticky top-0 bg-muted z-10">Press</TableHead>
              <TableHead className="w-[90px] sticky top-0 bg-muted z-10">
                <Button variant="ghost" size="sm" className="-ml-3 h-7 text-xs" onClick={() => handleSort('item_code')}>
                  Item
                  {sortConfig?.key === 'item_code' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : (<ArrowUpDown className="ml-1 h-3 w-3" />)}
                </Button>
              </TableHead>
              <TableHead className="w-[90px] sticky top-0 bg-muted z-10">Mould</TableHead>
              <TableHead className="w-[90px] sticky top-0 bg-muted z-10">
                <Button variant="ghost" size="sm" className="-ml-3 h-7 text-xs" onClick={() => handleSort('lot_no')}>
                  Lot No
                  {sortConfig?.key === 'lot_no' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : (<ArrowUpDown className="ml-1 h-3 w-3" />)}
                </Button>
              </TableHead>
              <TableHead className="w-[65px] text-center sticky top-0 bg-muted z-10">Patrol</TableHead>
              <TableHead className="w-[65px] text-center sticky top-0 bg-muted z-10">Line</TableHead>
              <TableHead className="w-[65px] text-center sticky top-0 bg-muted z-10">Lot</TableHead>
              <TableHead className="w-[80px] text-right sticky top-0 bg-muted z-10">Cost</TableHead>
              <TableHead className="w-[80px] sticky top-0 bg-muted z-10">Status</TableHead>
              <TableHead className="w-[100px] sticky top-0 bg-muted z-10">Action</TableHead>
            </TableRow>
            {/* Filter Row */}
            <TableRow className="bg-muted border-t border-muted-foreground/10">
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10">
                <Input placeholder="Filter..." value={filters.operator} onChange={(e) => handleFilterChange('operator', e.target.value)} className="h-7 text-xs bg-background" />
              </TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10">
                <Input placeholder="Filter..." value={filters.itemCode} onChange={(e) => handleFilterChange('itemCode', e.target.value)} className="h-7 text-xs bg-background" />
              </TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10">
                <Input placeholder="Filter..." value={filters.lotNo} onChange={(e) => handleFilterChange('lotNo', e.target.value)} className="h-7 text-xs bg-background" />
              </TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedRecords.map((record, index) => (
              <TableRow
                key={index}
                className={record.exceeds_threshold ? 'bg-red-50' : ''}
              >
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(record.production_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                </TableCell>
                <TableCell className="text-xs truncate max-w-[70px]" title={record.shift_type || ''}>{record.shift_type || '—'}</TableCell>
                <TableCell className="text-xs truncate max-w-[110px]" title={record.operator_name || ''}>{record.operator_name || '—'}</TableCell>
                <TableCell className="text-xs font-semibold" title={record.press_number || ''}>
                  {shortenPressNumber(record.press_number)}
                </TableCell>
                <TableCell className="font-mono text-xs truncate max-w-[90px]" title={record.item_code || ''}>{record.item_code || '—'}</TableCell>
                <TableCell className="text-xs truncate max-w-[90px]" title={record.mould_ref || ''}>{record.mould_ref || '—'}</TableCell>
                <TableCell className="font-mono font-semibold text-xs">{record.lot_no}</TableCell>
                <TableCell
                  className={`text-center text-xs ${getRejectionColor(record.patrol_rej_pct || 0)} cursor-pointer hover:underline`}
                  onClick={() => onShowRejectionDetails(record.inspection_entry, 'Patrol Inspection')}
                  title="Click to see Patrol defect details"
                >
                  {record.patrol_rej_pct !== undefined ? `${record.patrol_rej_pct.toFixed(1)}%` : '—'}
                </TableCell>
                <TableCell
                  className={`text-center text-xs ${getRejectionColor(record.line_rej_pct || 0)} cursor-pointer hover:underline`}
                  onClick={() => onShowRejectionDetails(record.inspection_entry, 'Line Inspection')}
                  title="Click to see Line defect details"
                >
                  {record.line_rej_pct !== undefined ? `${record.line_rej_pct.toFixed(1)}%` : '—'}
                </TableCell>
                <TableCell
                  className={`text-center text-xs ${getRejectionColor(record.lot_rej_pct || record.rej_pct || 0)} cursor-pointer hover:underline`}
                  onClick={() => onShowRejectionDetails(record.inspection_entry, 'Lot Inspection')}
                  title="Click to see Lot defect details"
                >
                  <span className="font-bold">
                    {(record.lot_rej_pct !== undefined ? record.lot_rej_pct : record.rej_pct !== undefined ? record.rej_pct : null) !== null
                      ? `${(record.lot_rej_pct || record.rej_pct || 0).toFixed(1)}%`
                      : '—'}
                  </span>
                </TableCell>
                <TableCell className="text-right text-xs font-medium">
                  {record.total_rejection_cost !== undefined && record.total_rejection_cost > 0
                    ? `₹${record.total_rejection_cost.toFixed(0)}`
                    : '—'}
                </TableCell>
                <TableCell>
                  {record.exceeds_threshold ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 whitespace-nowrap">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Critical
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-200 text-[10px] px-1.5 py-0.5 whitespace-nowrap">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Normal
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {record.exceeds_threshold && (
                    <Button
                      size="sm"
                      variant={record.car_name ? "default" : "outline"}
                      onClick={() => onGenerateCAR(record)}
                      className={`text-[10px] h-7 px-2 ${record.car_name ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    >
                      {record.car_name ? (
                        <>
                          <Save className="h-3 w-3 mr-1" />
                          Update CAR
                        </>
                      ) : (
                        "Generate CAR"
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  )
}


function IncomingInspectionTable({
  records,
  loading,
  onGenerateCAR,
  onShowRejectionDetails
}: {
  records: IncomingInspectionRecord[]
  loading: boolean
  onGenerateCAR: (record: IncomingInspectionRecord) => void
  onShowRejectionDetails: (inspectionEntry: string, type: string) => void
}) {
  // Sorting and filtering state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [filters, setFilters] = useState({
    lotNo: '',
    itemCode: '',
    operator: ''
  })

  // Sorting function
  const sortData = <T extends Record<string, any>>(data: T[], key: string, direction: 'asc' | 'desc'): T[] => {
    return [...data].sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return direction === 'asc'
        ? (aVal > bVal ? 1 : -1)
        : (aVal < bVal ? 1 : -1)
    })
  }

  // Filter function
  const filterData = (data: IncomingInspectionRecord[]): IncomingInspectionRecord[] => {
    return data.filter(row => {
      const lotMatch = !filters.lotNo ||
        row.lot_no?.toString().toLowerCase().includes(filters.lotNo.toLowerCase())
      const itemMatch = !filters.itemCode ||
        row.item?.toString().toLowerCase().includes(filters.itemCode.toLowerCase())
      const operatorMatch = !filters.operator ||
        row.inspector_name?.toString().toLowerCase().includes(filters.operator.toLowerCase())

      return lotMatch && itemMatch && operatorMatch
    })
  }

  // Handle sort
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Handle filter change
  const handleFilterChange = (filterKey: 'lotNo' | 'itemCode' | 'operator', value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }))
  }

  // Get processed data (filtered and sorted)
  const getProcessedData = (): IncomingInspectionRecord[] => {
    let processed = filterData(records)
    if (sortConfig) {
      processed = sortData(processed, sortConfig.key, sortConfig.direction)
    }
    return processed
  }

  const getRejectionColor = (percentage: number) => {
    if (percentage > 5) return 'text-red-600 font-bold'
    if (percentage > 3) return 'text-orange-500'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  const processedRecords = getProcessedData()

  if (!records || records.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-16 w-16 mx-auto opacity-50 mb-4" />
        <p className="text-lg font-medium">No inspection records found</p>
        <p className="text-sm">Click "Generate All Reports" to fetch data</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full caption-bottom text-sm">
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="w-[90px] sticky top-0 bg-muted z-10">
                <Button variant="ghost" size="sm" className="-ml-3 h-7 text-xs" onClick={() => handleSort('date')}>
                  Date
                  {sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : (<ArrowUpDown className="ml-1 h-3 w-3" />)}
                </Button>
              </TableHead>
              <TableHead className="w-[90px] sticky top-0 bg-muted z-10">Batch</TableHead>
              <TableHead className="w-[80px] sticky top-0 bg-muted z-10">
                <Button variant="ghost" size="sm" className="-ml-3 h-7 text-xs" onClick={() => handleSort('item')}>
                  Item
                  {sortConfig?.key === 'item' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : (<ArrowUpDown className="ml-1 h-3 w-3" />)}
                </Button>
              </TableHead>
              <TableHead className="w-[90px] sticky top-0 bg-muted z-10">Mould</TableHead>
              <TableHead className="w-[90px] sticky top-0 bg-muted z-10">
                <Button variant="ghost" size="sm" className="-ml-3 h-7 text-xs" onClick={() => handleSort('lot_no')}>
                  Lot No
                  {sortConfig?.key === 'lot_no' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : (<ArrowUpDown className="ml-1 h-3 w-3" />)}
                </Button>
              </TableHead>
              <TableHead className="w-[100px] sticky top-0 bg-muted z-10">Deflasher</TableHead>
              <TableHead className="w-[70px] text-right sticky top-0 bg-muted z-10">Sent</TableHead>
              <TableHead className="w-[70px] text-right sticky top-0 bg-muted z-10">Recv</TableHead>
              <TableHead className="w-[60px] text-right sticky top-0 bg-muted z-10">Diff%</TableHead>
              <TableHead className="w-[100px] sticky top-0 bg-muted z-10">
                <Button variant="ghost" size="sm" className="-ml-3 h-7 text-xs" onClick={() => handleSort('inspector_name')}>
                  Inspector
                  {sortConfig?.key === 'inspector_name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : (<ArrowUpDown className="ml-1 h-3 w-3" />)}
                </Button>
              </TableHead>
              <TableHead className="w-[70px] text-right sticky top-0 bg-muted z-10">Insp</TableHead>
              <TableHead className="w-[70px] text-right sticky top-0 bg-muted z-10">Rej</TableHead>
              <TableHead className="w-[60px] text-right sticky top-0 bg-muted z-10">Rej%</TableHead>
              <TableHead className="w-[80px] text-right sticky top-0 bg-muted z-10">Cost</TableHead>
              <TableHead className="w-[80px] sticky top-0 bg-muted z-10">Status</TableHead>
              <TableHead className="w-[90px] sticky top-0 bg-muted z-10">Action</TableHead>
            </TableRow>
            {/* Filter Row */}
            <TableRow className="bg-muted border-t border-muted-foreground/10">
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10">
                <Input placeholder="Filter..." value={filters.itemCode} onChange={(e) => handleFilterChange('itemCode', e.target.value)} className="h-7 text-xs bg-background" />
              </TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10">
                <Input placeholder="Filter..." value={filters.lotNo} onChange={(e) => handleFilterChange('lotNo', e.target.value)} className="h-7 text-xs bg-background" />
              </TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10">
                <Input placeholder="Filter..." value={filters.operator} onChange={(e) => handleFilterChange('operator', e.target.value)} className="h-7 text-xs bg-background" />
              </TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
              <TableHead className="sticky top-[41px] bg-muted z-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedRecords.map((record, index) => (
              <TableRow key={`${record.inspection_entry}-${index}`} className="hover:bg-muted/50">
                <TableCell className="text-xs whitespace-nowrap">
                  {record.date ? new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '—'}
                </TableCell>
                <TableCell className="font-mono text-xs truncate max-w-[90px]" title={record.batch_no || ''}>{record.batch_no || '—'}</TableCell>
                <TableCell className="font-mono text-xs truncate max-w-[80px]" title={record.item || ''}>{record.item || '—'}</TableCell>
                <TableCell className="text-xs truncate max-w-[90px]" title={record.mould_ref || ''}>{record.mould_ref || '—'}</TableCell>
                <TableCell className="font-mono font-semibold text-xs">{record.lot_no}</TableCell>
                <TableCell className="text-xs truncate max-w-[100px]" title={record.deflasher_name || ''}>{record.deflasher_name || '—'}</TableCell>
                <TableCell className="text-right text-xs">
                  {record.qty_sent !== null && record.qty_sent !== undefined
                    ? record.qty_sent.toLocaleString()
                    : '—'}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {record.qty_received !== null && record.qty_received !== undefined
                    ? record.qty_received.toLocaleString()
                    : '—'}
                </TableCell>
                <TableCell className={`text-center text-xs ${getRejectionColor(record.diff_pct || 0)}`}>
                  {record.diff_pct !== null && record.diff_pct !== undefined
                    ? `${record.diff_pct.toFixed(1)}%`
                    : '—'}
                </TableCell>
                <TableCell className="text-xs truncate max-w-[100px]" title={record.inspector_name || ''}>{record.inspector_name || '—'}</TableCell>
                <TableCell className="text-right text-xs">
                  {record.insp_qty !== null && record.insp_qty !== undefined
                    ? record.insp_qty.toLocaleString()
                    : '—'}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {record.rej_qty !== null && record.rej_qty !== undefined
                    ? record.rej_qty.toLocaleString()
                    : '—'}
                </TableCell>
                <TableCell
                  className={`text-center text-xs ${getRejectionColor(record.rej_pct || 0)} cursor-pointer hover:underline`}
                  onClick={() => onShowRejectionDetails(record.inspection_entry, 'Inspection Entry')}
                  title="Click to see defect details"
                >
                  <span className="font-bold">
                    {record.rej_pct !== undefined ? `${record.rej_pct.toFixed(1)}%` : '—'}
                  </span>
                </TableCell>
                <TableCell className="text-right text-xs font-medium">
                  {record.rejection_cost !== undefined && record.rejection_cost > 0
                    ? `₹${record.rejection_cost.toFixed(0)}`
                    : '—'}
                </TableCell>
                <TableCell>
                  {record.exceeds_threshold ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 whitespace-nowrap">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Critical
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-200 text-[10px] px-1.5 py-0.5 whitespace-nowrap">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Normal
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {record.exceeds_threshold && (
                    <Button
                      size="sm"
                      variant={record.car_name ? "default" : "outline"}
                      onClick={() => onGenerateCAR(record as any)}
                      className={`text-[10px] h-7 px-2 ${record.car_name ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    >
                      {record.car_name ? (
                        <>
                          <Save className="h-3 w-3 mr-1" />
                          Update CAR
                        </>
                      ) : (
                        "Generate CAR"
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  )
}


function BatchRejectionAnalysisPage() {
  const { call } = useContext(FrappeContext) as any

  // Calculate default date range
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [fromDate, setFromDate] = useState(sevenDaysAgo)
  const [toDate, setToDate] = useState(today)
  const [activeTab, setActiveTab] = useState('lot-inspection')

  // State for pending CARs
  const [pendingCARs, setPendingCARs] = useState<any>(null)

  // State for metrics
  const [lotMetrics, setLotMetrics] = useState<InspectionMetrics | null>(null)
  const [incomingMetrics, setIncomingMetrics] = useState<InspectionMetrics | null>(null)
  const [finalMetrics, setFinalMetrics] = useState<InspectionMetrics | null>(null)

  // State for records
  const [lotRecords, setLotRecords] = useState<LotInspectionRecord[]>([])
  const [incomingRecords, setIncomingRecords] = useState<IncomingInspectionRecord[]>([])
  const [finalRecords, setFinalRecords] = useState<FinalInspectionRecord[]>([])
  const [pdirRecords] = useState<LotInspectionRecord[]>([])

  // Loading states - per tab
  const [loading, setLoading] = useState(false)
  const [lotLoading, setLotLoading] = useState(false)
  const [incomingLoading, setIncomingLoading] = useState(false)
  const [finalLoading, setFinalLoading] = useState(false)

  // CAR Wizard state
  const [showCARWizard, setShowCARWizard] = useState(false)
  const [selectedRecordForCAR, setSelectedRecordForCAR] = useState<any>(null)

  // Rejection Details Modal State
  const [rejectionDetailsOpen, setRejectionDetailsOpen] = useState(false)
  const [selectedInspectionEntry, setSelectedInspectionEntry] = useState<string | null>(null)
  const [selectedInspectionType, setSelectedInspectionType] = useState<string>('Inspection Entry')

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set())

  const fetchMetrics = async (inspectionType: string) => {
    try {
      const result = await call.post('rejection_analysis.api.get_dashboard_metrics', {
        from_date: fromDate,
        to_date: toDate,
        inspection_type: inspectionType
      })
      return result?.message || result
    } catch (error) {
      console.error(`Error fetching ${inspectionType} metrics:`, error)
      return null
    }
  }

  const fetchRecords = async (inspectionType: string) => {
    try {
      let apiEndpoint = 'rejection_analysis.api.get_lot_inspection_report'
      let filterKey = 'production_date' // Default for Lot Inspection

      // Select the correct API endpoint and filter key based on inspection type
      if (inspectionType === 'Incoming Inspection') {
        apiEndpoint = 'rejection_analysis.api.get_incoming_inspection_report'
        filterKey = 'date'
      } else if (inspectionType === 'Final Visual Inspection') {
        apiEndpoint = 'rejection_analysis.api.get_final_inspection_report'
        filterKey = 'date'
      }
      // For 'Lot Inspection' and 'PDIR', use default lot inspection report with production_date

      const result = await call.post(apiEndpoint, {
        filters: {
          from_date: fromDate,
          to_date: toDate
        }
      })
      return result?.message || result || []
    } catch (error) {
      console.error(`Error fetching ${inspectionType} records:`, error)
      return []
    }
  }

  const fetchTabData = async (tabName: string) => {
    let inspectionType = ''
    let setMetrics: (data: any) => void
    let setRecords: (data: any) => void
    let setTabLoading: (loading: boolean) => void

    switch (tabName) {
      case 'lot-inspection':
        inspectionType = 'Lot Inspection'
        setMetrics = setLotMetrics
        setRecords = setLotRecords
        setTabLoading = setLotLoading
        break
      case 'incoming':
        inspectionType = 'Incoming Inspection'
        setMetrics = setIncomingMetrics
        setRecords = setIncomingRecords
        setTabLoading = setIncomingLoading
        break
      case 'final':
        inspectionType = 'Final Visual Inspection'
        setMetrics = setFinalMetrics
        setRecords = setFinalRecords
        setTabLoading = setFinalLoading
        break
      case 'pdir':
        inspectionType = 'PDIR'
        // setMetrics = setPdirMetrics
        // setRecords = setPdirRecords
        // setTabLoading = setPdirLoading
        return // PDIR not implemented yet

      default:
        return
    }

    setTabLoading(true)
    try {
      const [metrics, records] = await Promise.all([
        fetchMetrics(inspectionType),
        fetchRecords(inspectionType)
      ])

      setMetrics(metrics)
      setRecords(records)
      setLoadedTabs(prev => new Set(prev).add(tabName))
    } catch (error) {
      console.error(`Error fetching ${inspectionType} data:`, error)
      toast.error(`Failed to fetch ${inspectionType} data`)
    } finally {
      setTabLoading(false)
    }
  }

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName)
    // Only fetch if not already loaded
    if (!loadedTabs.has(tabName)) {
      fetchTabData(tabName)
    }
  }

  const fetchPendingCARs = async () => {
    try {
      const result = await call.post('rejection_analysis.api.get_pending_cars_for_date', {
        from_date: fromDate,
        to_date: toDate,
        threshold_percentage: 5.0
      })

      const data = result?.message || result
      setPendingCARs(data)
    } catch (error) {
      console.error('Error fetching pending CARs:', error)
    }
  }

  // Auto-fetch pending CARs when date range changes
  useEffect(() => {
    if (fromDate && toDate) {
      fetchPendingCARs()
    }
  }, [fromDate, toDate])

  const handleExportLot = () => {
    const headerMap = {
      production_date: 'Date',
      shift_type: 'Shift',
      operator_name: 'Operator',
      press_number: 'Press',
      item_code: 'Item',
      mould_ref: 'Mould',
      lot_no: 'Lot',
      patrol_rej_pct: 'Patrol %',
      line_rej_pct: 'Line %',
      lot_rej_pct: 'Lot %',
      total_rejection_cost: 'Cost (INR)'
    }
    exportToCSV(lotRecords, `lot_inspection_batch_${fromDate}_to_${toDate}`, headerMap)
  }

  const handleExportIncoming = () => {
    const headerMap = {
      date: 'Date',
      item: 'Item',
      lot_no: 'Lot',
      deflasher_name: 'Deflasher',
      qty_sent: 'Qty Sent',
      qty_received: 'Qty Recv',
      insp_qty: 'Insp Qty',
      rej_qty: 'Rej Qty',
      rej_pct: 'Rej %',
      rejection_cost: 'Cost (INR)'
    }
    exportToCSV(incomingRecords, `incoming_inspection_batch_${fromDate}_to_${toDate}`, headerMap)
  }

  const handleExportFinal = () => {
    const headerMap = {
      inspection_date: 'Date',
      item: 'Item',
      lot_no: 'Lot',
      final_insp_qty: 'Final Insp Qty',
      final_rej_qty: 'Final Rej Qty',
      patrol_rej_pct: 'Patrol %',
      line_rej_pct: 'Line %',
      lot_rej_pct: 'Lot %',
      final_insp_rej_pct: 'Final %',
      fvi_rejection_cost: 'Cost (INR)'
    }
    exportToCSV(finalRecords, `final_inspection_batch_${fromDate}_to_${toDate}`, headerMap)
  }


  const handleCombinedExport = () => {
    if (lotRecords.length === 0 && incomingRecords.length === 0 && finalRecords.length === 0) {
      toast.error('No data available to export')
      return
    }

    // Combine all records into a single dataset with a 'Source' column
    const combinedData: any[] = []

    lotRecords.forEach(r => {
      combinedData.push({
        source: 'Lot Inspection',
        date: r.production_date,
        item: r.item_code,
        lot_no: r.lot_no,
        shift: r.shift_type || '',
        press: r.press_number || '',
        inspected: '', // Lot inspection records in this view don't have total_qty directly available in the same way? Wait, I should check the interfaces.
        rejected: '',
        rej_pct: r.lot_rej_pct || 0,
        cost: r.total_rejection_cost || 0
      })
    })

    incomingRecords.forEach(r => {
      combinedData.push({
        source: 'Incoming Inspection',
        date: r.date,
        item: r.item,
        lot_no: r.lot_no,
        shift: '',
        press: '',
        inspected: r.insp_qty || 0,
        rejected: r.rej_qty || 0,
        rej_pct: r.rej_pct || 0,
        cost: r.rejection_cost || 0
      })
    })

    finalRecords.forEach(r => {
      combinedData.push({
        source: 'Final Visual Inspection',
        date: r.inspection_date,
        item: r.item,
        lot_no: r.lot_no,
        shift: r.shift_type || '',
        press: r.press_number || '',
        inspected: r.final_insp_qty || 0,
        rejected: r.final_rej_qty || 0,
        rej_pct: r.final_insp_rej_pct || 0,
        cost: r.fvi_rejection_cost || 0
      })
    })

    const headerMap = {
      source: 'Source',
      date: 'Date',
      item: 'Item',
      lot_no: 'Lot No',
      shift: 'Shift',
      press: 'Press',
      inspected: 'Inspected Qty',
      rejected: 'Rejected Qty',
      rej_pct: 'Rejection %',
      cost: 'Cost (INR)'
    }

    exportToCSV(combinedData, `combined_rejection_analysis_${fromDate}_to_${toDate}`, headerMap)
    toast.success('Combined report exported successfully')
  }

  const generateAllReports = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please select both dates')
      return
    }

    setLoading(true)

    try {
      // Fetch pending CARs and all tabs data in parallel
      await Promise.all([
        fetchPendingCARs(),
        fetchTabData('lot-inspection'),
        fetchTabData('incoming'),
        fetchTabData('final'),
        fetchTabData('pdir')
      ])

      toast.success('Batch analysis data updated')
    } catch (error) {
      console.error('Error generating reports:', error)
      toast.error('Failed to generate reports')
    } finally {
      setLoading(false)
    }
  }



  const handleGenerateCAR = (record: any) => {
    // Normalize record data for CAR Wizard
    const normalizedRecord = {
      ...record,
      // Handle different field names for inspection entry ID
      inspection_entry: record.inspection_entry || record.spp_inspection_entry,
      // Ensure production_date exists (fallback to inspection date if needed)
      production_date: record.production_date || record.date || record.inspection_date
    }

    setSelectedRecordForCAR(normalizedRecord)
    setShowCARWizard(true)
  }

  const handleCARSuccess = (carName: string) => {
    toast.success(`CAR ${carName} created successfully!`)
    // Refresh pending CARs list
    fetchPendingCARs()
    // Optionally refresh all data
    fetchTabData(activeTab)
  }

  const handleShowRejectionDetails = (inspectionEntry: string, type: string = 'Inspection Entry') => {
    setSelectedInspectionEntry(inspectionEntry)
    setSelectedInspectionType(type)
    setRejectionDetailsOpen(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <DashboardLayout>
      <SiteHeader />
      <div className="flex flex-1 flex-col gap-6 p-4 bg-muted/30">
        {/* Header Section - Consolidated */}
        <Card className="border-2 shadow-sm">
          <CardContent className="py-1 px-4">
            <div className="flex items-start justify-between gap-6">
              {/* Title & Report Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold tracking-tight">Batch Rejection Analysis</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quality insights and inspection metrics for selected date range
                </p>
              </div>

              {/* Controls Section */}
              <div className="flex items-center gap-3">
                {/* Date Selection */}
                <div className="flex items-end gap-3 px-3 py-2 rounded-lg bg-muted/50">
                  <div className="grid items-center gap-1">
                    <Label className="text-[10px] font-semibold uppercase">From</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="h-8 w-34 py-0 text-xs"
                    />
                  </div>
                  <div className="grid items-center gap-1">
                    <Label className="text-[10px] font-semibold uppercase">To</Label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="h-8 w-34 py-0 text-xs"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={generateAllReports}
                  disabled={loading}
                  size="default"
                  className="gap-2 h-10 px-6"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4" />
                      Run Analysis
                    </>
                  )}
                </Button>

                {/* Combined Export Button */}
                {(lotRecords.length > 0 || incomingRecords.length > 0 || finalRecords.length > 0) && (
                  <Button
                    onClick={handleCombinedExport}
                    variant="outline"
                    size="default"
                    className="gap-2 h-10 px-6"
                  >
                    <Download className="h-4 w-4 text-primary" />
                    Combined Export
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CAR Status Summary Section - Compact Single Row */}
        {pendingCARs && (
          <Card className="border shadow-sm">
            <CardContent className="py-1 px-4">
              <div className="flex items-center justify-between gap-6">
                {/* CAR Status Title */}
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${pendingCARs.total_cars_pending > 0
                    ? 'bg-orange-100'
                    : 'bg-green-100'
                    }`}>
                    {pendingCARs.total_cars_pending > 0 ? (
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">CAR Status</h3>
                    <p className={`text-lg font-bold ${pendingCARs.total_cars_pending > 0 ? 'text-orange-700' : 'text-green-700'
                      }`}>
                      {pendingCARs.total_cars_pending > 0
                        ? `${pendingCARs.total_cars_pending} Pending`
                        : 'All Complete'}
                    </p>
                  </div>
                </div>

                {/* Compact Metrics Row */}
                <div className="flex items-center gap-6">
                  {/* Lot Inspection */}
                  {pendingCARs.lot_inspection_summary && pendingCARs.lot_inspection_summary.total_exceeding_threshold > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-blue-100 flex items-center justify-center">
                          <Package className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Lot Inspection</p>
                          <p className="text-sm font-bold text-foreground">
                            {pendingCARs.lot_inspection_summary.total_exceeding_threshold}
                          </p>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-border"></div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {pendingCARs.lot_inspection_summary.cars_filled} ✓
                        </Badge>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {pendingCARs.lot_inspection_summary.cars_pending} ⏳
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Incoming Inspection */}
                  {pendingCARs.incoming_inspection_summary && pendingCARs.incoming_inspection_summary.total_exceeding_threshold > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-purple-100 flex items-center justify-center">
                          <ClipboardCheck className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Incoming</p>
                          <p className="text-sm font-bold text-foreground">
                            {pendingCARs.incoming_inspection_summary.total_exceeding_threshold}
                          </p>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-border"></div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {pendingCARs.incoming_inspection_summary.cars_filled} ✓
                        </Badge>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {pendingCARs.incoming_inspection_summary.cars_pending} ⏳
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Final Inspection */}
                  {pendingCARs.final_inspection_summary && pendingCARs.final_inspection_summary.total_exceeding_threshold > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-teal-100 flex items-center justify-center">
                          <Eye className="h-4 w-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Final</p>
                          <p className="text-sm font-bold text-foreground">
                            {pendingCARs.final_inspection_summary.total_exceeding_threshold}
                          </p>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-border"></div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {pendingCARs.final_inspection_summary.cars_filled} ✓
                        </Badge>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {pendingCARs.final_inspection_summary.cars_pending} ⏳
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Total Summary Badge */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold text-foreground">{pendingCARs.total_exceeding_threshold}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger
              value="lot-inspection"
              className={`gap-2 ${activeTab === 'lot-inspection' ? 'bg-black text-white data-[state=active]:bg-black data-[state=active]:text-white' : ''}`}
            >
              <Package className="h-4 w-4" />
              Lot Inspection
              {lotRecords.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {lotRecords.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="incoming"
              className={`gap-2 ${activeTab === 'incoming' ? 'bg-black text-white data-[state=active]:bg-black data-[state=active]:text-white' : ''}`}
            >
              <ClipboardCheck className="h-4 w-4" />
              Incoming
              {incomingRecords.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {incomingRecords.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="final"
              className={`gap-2 ${activeTab === 'final' ? 'bg-black text-white data-[state=active]:bg-black data-[state=active]:text-white' : ''}`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Final
              {finalRecords.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {finalRecords.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="pdir"
              className={`gap-2 ${activeTab === 'pdir' ? 'bg-black text-white data-[state=active]:bg-black data-[state=active]:text-white' : ''}`}
            >
              <FileText className="h-4 w-4" />
              PDIR
              {pdirRecords.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pdirRecords.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Lot Inspection Tab */}
          <TabsContent value="lot-inspection" className="space-y-3">
            {/* Centered Metrics Bar */}
            <Card className="border shadow-sm">
              <CardContent className="py-2 px-4">
                <div className="flex items-center justify-center gap-6">
                  {/* Total & Pending */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-blue-100 flex items-center justify-center">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Lots</p>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-lg font-bold">{lotMetrics?.total_lots || 0}</p>
                        <span className="text-[10px] text-muted-foreground">Pending:</span>
                        <span className="text-xs font-semibold text-orange-600">{lotMetrics?.pending_lots || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-10 w-px bg-border"></div>

                  {/* Patrol Avg */}
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Patrol Avg</p>
                      <div className="flex items-center gap-1">
                        <p className={`text-lg font-bold ${lotMetrics && (lotMetrics.patrol_rej_avg || 0) > 3 ? 'text-red-600' : 'text-green-600'}`}>
                          {lotMetrics?.patrol_rej_avg ? `${lotMetrics.patrol_rej_avg.toFixed(1)}%` : '—'}
                        </p>
                        {lotMetrics && (lotMetrics.patrol_rej_avg || 0) > 3 ? (
                          <TrendingUp className="h-3 w-3 text-red-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-10 w-px bg-border"></div>

                  {/* Line Avg */}
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Line Avg</p>
                      <div className="flex items-center gap-1">
                        <p className={`text-lg font-bold ${lotMetrics && (lotMetrics.line_rej_avg || 0) > 3 ? 'text-red-600' : 'text-green-600'}`}>
                          {lotMetrics?.line_rej_avg ? `${lotMetrics.line_rej_avg.toFixed(1)}%` : '—'}
                        </p>
                        {lotMetrics && (lotMetrics.line_rej_avg || 0) > 3 ? (
                          <TrendingUp className="h-3 w-3 text-red-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-10 w-px bg-border"></div>

                  {/* Lot Rejection */}
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Lot Rejection</p>
                      <div className="flex items-center gap-1">
                        <p className={`text-lg font-bold ${lotMetrics && lotMetrics.avg_rejection > 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {lotMetrics?.avg_rejection ? `${lotMetrics.avg_rejection.toFixed(1)}%` : '—'}
                        </p>
                        {lotMetrics && lotMetrics.avg_rejection > 5 ? (
                          <TrendingUp className="h-3 w-3 text-red-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-10 w-px bg-border"></div>

                  {/* Critical Lots */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-red-100 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Critical Lots</p>
                      <p className="text-lg font-bold text-red-600">{lotMetrics?.lots_exceeding_threshold || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Lot Inspection Records</CardTitle>
                    <CardDescription className="text-xs">
                      Detailed inspection records for the selected period
                    </CardDescription>
                  </div>
                  {lotRecords.length > 0 && (
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-xs" onClick={handleExportLot}>
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <InspectionRecordsTable
                  records={lotRecords}
                  loading={lotLoading}
                  onGenerateCAR={handleGenerateCAR}
                  onShowRejectionDetails={handleShowRejectionDetails}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incoming Inspection Tab */}
          <TabsContent value="incoming" className="space-y-3">
            {/* Centered Metrics Bar */}
            <Card className="border shadow-sm">
              <CardContent className="py-2 px-4">
                <div className="flex items-center justify-center gap-8">
                  {/* Total & Pending */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-purple-100 flex items-center justify-center">
                      <ClipboardCheck className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Lots Received</p>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-lg font-bold">{incomingMetrics?.total_lots || 0}</p>
                        <span className="text-[10px] text-muted-foreground">Pending:</span>
                        <span className="text-xs font-semibold text-orange-600">{incomingMetrics?.pending_lots || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-10 w-px bg-border"></div>

                  {/* Avg Rejection */}
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Avg Rejection</p>
                      <div className="flex items-center gap-1">
                        <p className={`text-lg font-bold ${incomingMetrics && incomingMetrics.avg_rejection > 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {incomingMetrics?.avg_rejection ? `${incomingMetrics.avg_rejection.toFixed(1)}%` : '—'}
                        </p>
                        {incomingMetrics && incomingMetrics.avg_rejection > 3 ? (
                          <TrendingUp className="h-3 w-3 text-red-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-10 w-px bg-border"></div>

                  {/* Critical */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-red-100 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Critical</p>
                      <p className="text-lg font-bold text-red-600">{incomingMetrics?.lots_exceeding_threshold || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Incoming Inspection Records</CardTitle>
                    <CardDescription className="text-xs">
                      Material quality check records
                    </CardDescription>
                  </div>
                  {incomingRecords.length > 0 && (
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-xs" onClick={handleExportIncoming}>
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <IncomingInspectionTable
                  records={incomingRecords}
                  loading={incomingLoading}
                  onGenerateCAR={handleGenerateCAR}
                  onShowRejectionDetails={handleShowRejectionDetails}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Final Inspection Tab */}
          <TabsContent value="final" className="space-y-3">
            {/* Centered Metrics Bar */}
            <Card className="border shadow-sm">
              <CardContent className="py-2 px-4">
                <div className="flex items-center justify-center gap-8">
                  {/* Total Lots */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Lots Inspected</p>
                      <p className="text-lg font-bold">{finalMetrics?.total_lots || 0}</p>
                    </div>
                  </div>

                  <div className="h-10 w-px bg-border"></div>

                  {/* Avg Rejection */}
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Avg Rejection</p>
                      <div className="flex items-center gap-1">
                        <p className={`text-lg font-bold ${finalMetrics && finalMetrics.avg_rejection > 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {finalMetrics?.avg_rejection ? `${finalMetrics.avg_rejection.toFixed(1)}%` : '—'}
                        </p>
                        {finalMetrics && finalMetrics.avg_rejection > 3 ? (
                          <TrendingUp className="h-3 w-3 text-red-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-10 w-px bg-border"></div>

                  {/* Critical */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-red-100 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Critical</p>
                      <p className="text-lg font-bold text-red-600">{finalMetrics?.lots_exceeding_threshold || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Final Visual Inspection Records</CardTitle>
                    <CardDescription className="text-xs">
                      Final quality verification records
                    </CardDescription>
                  </div>
                  {finalRecords.length > 0 && (
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-xs" onClick={handleExportFinal}>
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <FinalInspectionGroupedTable
                  records={finalRecords}
                  loading={loading}
                  onGenerateCAR={handleGenerateCAR}
                  onShowRejectionDetails={handleShowRejectionDetails}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* PDIR Tab */}
          <TabsContent value="pdir" className="space-y-3">
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">PDIR Coming Soon</h3>
              <p className="text-sm">Post-delivery inspection records will be available here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* CAR Generation Wizard Modal */}
      <CARGenerationWizard
        isOpen={showCARWizard}
        onClose={() => {
          setShowCARWizard(false)
          setSelectedRecordForCAR(null)
        }}
        inspectionRecord={selectedRecordForCAR as any}
        onSuccess={handleCARSuccess}
      />

      {/* Rejection Details Modal */}
      <RejectionDetailsModal
        isOpen={rejectionDetailsOpen}
        onClose={() => {
          setRejectionDetailsOpen(false)
          setSelectedInspectionEntry(null)
        }}
        inspectionEntryName={selectedInspectionEntry}
        inspectionType={selectedInspectionType}
      />
    </DashboardLayout>
  )
}

export const Component = BatchRejectionAnalysisPage
export default BatchRejectionAnalysisPage
