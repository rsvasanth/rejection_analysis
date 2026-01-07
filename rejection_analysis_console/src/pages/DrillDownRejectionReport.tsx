import React, { useState, useEffect, useMemo, useContext } from 'react'
import { FrappeContext } from 'frappe-react-sdk'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs'
import {
    ChevronDown,
    ChevronRight,
    RefreshCw,
    Download,
    Search,
    Filter,
    BarChart2,
    Table as TableIcon,
    PlusSquare,
    MinusSquare,
    Info
} from 'lucide-react'
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'
import { exportToCSV } from '@/utils/export-csv'

interface RejectionRecord {
    source_type: string
    inspection_type: string
    document_name: string
    lot_no: string
    item_code: string
    posting_date: string
    inspector_code: string
    inspected_qty: number
    rejected_qty: number
    rejection_percentage: number
    rejection_cost: number
    quality_status: string
    defect_details: string
}

interface PivotRow {
    id: string
    parentId?: string
    type: 'product' | 'main_lot' | 'sublot'
    label: string
    inspected: number
    rejected: number
    rejection_cost: number
    rate: number
    inspector?: string
    inspection_type?: string
    product_code?: string
    main_lot?: string
    lot_no?: string
    date?: string
    [key: string]: any // Dynamic defect columns
}

interface PivotData {
    rows: PivotRow[]
    defect_columns: string[]
    summary: {
        total_products: number
        total_inspected: number
        total_rejected: number
    }
}

const DrillDownRejectionReport: React.FC = () => {
    const { call } = useContext(FrappeContext)

    // Filters State
    const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [itemCode, setItemCode] = useState('')
    const [inspectionType, setInspectionType] = useState('All')

    // Data State
    const [standardData, setStandardData] = useState<RejectionRecord[]>([])
    const [pivotData, setPivotData] = useState<PivotData | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('pivot')

    // UI State
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    const fetchStandardData = async () => {
        try {
            setLoading(true)
            const response = await call.post('rejection_analysis.api.get_drill_down_rejection_data', {
                filters: {
                    from_date: fromDate,
                    to_date: toDate,
                    item_code: itemCode,
                    inspection_type: inspectionType === 'All' ? '' : inspectionType
                }
            })
            const data = response?.message || response
            if (data) {
                setStandardData(Array.isArray(data) ? data : [])
            }
        } catch (err) {
            console.error('Standard Fetch Error:', err)
            toast.error('An error occurred while fetching data')
        } finally {
            setLoading(false)
        }
    }

    const fetchPivotData = async () => {
        try {
            setLoading(true)
            const response = await call.post('rejection_analysis.api.get_drill_down_pivot_report', {
                filters: {
                    from_date: fromDate,
                    to_date: toDate,
                    item_code: itemCode,
                    inspection_type: inspectionType === 'All' ? '' : inspectionType
                }
            })
            const data = response?.message || response
            if (data && data.rows) {
                setPivotData(data)
            }
        } catch (err) {
            console.error('Pivot Fetch Error:', err)
            toast.error('An error occurred while fetching pivot data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'standard') {
            fetchStandardData()
        } else {
            fetchPivotData()
        }
    }, [activeTab])

    const toggleRow = (id: string) => {
        const newExpandedRows = new Set(expandedRows)
        if (newExpandedRows.has(id)) {
            newExpandedRows.delete(id)
        } else {
            newExpandedRows.add(id)
        }
        setExpandedRows(newExpandedRows)
    }

    const getQualityBadgeColor = (status: string) => {
        switch (status) {
            case 'Perfect': return 'bg-green-500 hover:bg-green-600'
            case 'Excellent': return 'bg-green-400 hover:bg-green-500'
            case 'Good': return 'bg-blue-400 hover:bg-blue-500'
            case 'Warning': return 'bg-amber-400 hover:bg-amber-500'
            case 'Critical': return 'bg-red-500 hover:bg-red-600'
            default: return 'bg-slate-400'
        }
    }

    const getHeatmapColor = (value: number) => {
        if (value === 0) return 'text-slate-200'
        if (value < 10) return 'bg-red-50 text-red-700'
        if (value < 50) return 'bg-red-100 text-red-800 font-semibold'
        if (value < 100) return 'bg-red-200 text-red-900 font-bold'
        return 'bg-red-300 text-red-950 font-black'
    }

    const handleExport = () => {
        if (activeTab === 'standard') {
            if (standardData.length === 0) {
                toast.error('No data to export')
                return
            }

            const headerMap = {
                'source_type': 'Source',
                'inspection_type': 'Inspection Type',
                'document_name': 'Document Name',
                'lot_no': 'Lot No',
                'item_code': 'Item Code',
                'posting_date': 'Posting Date',
                'inspector_code': 'Inspector',
                'inspected_qty': 'Inspected Qty',
                'rejected_qty': 'Rejected Qty',
                'rejection_percentage': 'Rejection %',
                'rejection_cost': 'Cost (₹)',
                'quality_status': 'Status',
                'defect_details': 'Defects'
            }

            exportToCSV(standardData, `Rejection_Report_Standard_${format(new Date(), 'yyyyMMdd')}`, headerMap)
        } else {
            if (!pivotData || pivotData.rows.length === 0) {
                toast.error('No data to export')
                return
            }

            const baseHeaders: Record<string, string> = {
                'product_code': 'Product Code',
                'main_lot': 'Main Lot',
                'lot_no': 'Lot Number',
                'inspection_type': 'Inspection Type',
                'inspected': 'Inspected Qty',
                'rejected': 'Rejected Qty',
                'rejection_cost': 'Rejection Cost (₹)',
                'rate': 'Rejection Rate %',
                'inspector': 'Inspector',
                'date': 'Inspection Date'
            }

            // Add dynamic defect columns
            pivotData.defect_columns.forEach(col => {
                baseHeaders[col] = col
            })

            // Sort rows by hierarchy for clean CSV
            const sortedRowsForExport = [...pivotData.rows].sort((a, b) => {
                const aIdx = pivotData.rows.indexOf(a)
                const bIdx = pivotData.rows.indexOf(b)
                return aIdx - bIdx
            })

            exportToCSV(sortedRowsForExport, `Rejection_Report_Pivot_${format(new Date(), 'yyyyMMdd')}`, baseHeaders)
        }
        toast.success('Export started')
    }

    const visibleRows = useMemo(() => {
        if (!pivotData || !pivotData.rows) return []
        const results: PivotRow[] = []

        const products = pivotData.rows.filter(r => r.type === 'product')

        products.forEach(p => {
            results.push(p)
            if (expandedRows.has(p.id)) {
                const mainLots = pivotData.rows.filter(r => r.type === 'main_lot' && r.parentId === p.id)
                mainLots.forEach(ml => {
                    results.push(ml)
                    if (expandedRows.has(ml.id)) {
                        const sublots = pivotData.rows.filter(r => r.type === 'sublot' && r.parentId === ml.id)
                        results.push(...sublots)
                    }
                })
            }
        })

        return results
    }, [pivotData, expandedRows])

    const STICKY_COL_WIDTHS = {
        product: 200,
        mainLot: 160,
        lotNo: 160
    }

    return (
        <DashboardLayout>
            <SiteHeader
                title="Drill Down Rejection Report"
                description="Analyze rejection patterns across products, lots, and sublots."
            />
            {/* Hardened container: Removed max-w-[100vw] to stay within SidebarInset flow */}
            <div className="flex-1 space-y-4 p-4 md:p-6 pb-20 w-full overflow-x-hidden border-t">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 px-1">Phase 1 Report</h1>
                        <p className="text-muted-foreground mt-0.5 text-xs px-1">
                            Traceability and Pivot analysis
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => activeTab === 'pivot' ? fetchPivotData() : fetchStandardData()} className="h-8">
                            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport} className="h-8">
                            <Download className="mr-2 h-3.5 w-3.5" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="border-slate-200 shadow-sm bg-white overflow-visible">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                            <div className="space-y-1.5">
                                <Label htmlFor="fromDate" className="text-[10px] uppercase tracking-wider font-bold text-slate-500">From Date</Label>
                                <Input
                                    id="fromDate"
                                    type="date"
                                    className="h-9 px-3 text-xs bg-slate-50/50"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="toDate" className="text-[10px] uppercase tracking-wider font-bold text-slate-500">To Date</Label>
                                <Input
                                    id="toDate"
                                    type="date"
                                    className="h-9 px-3 text-xs bg-slate-50/50"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="itemCode" className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Item Code</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        id="itemCode"
                                        placeholder="Search item code..."
                                        className="pl-8 h-9 text-xs bg-slate-50/50"
                                        value={itemCode}
                                        onChange={(e) => setItemCode(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="inspectionType" className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Inspection Type</Label>
                                <Select value={inspectionType} onValueChange={setInspectionType}>
                                    <SelectTrigger id="inspectionType" className="h-9 text-xs bg-slate-50/50">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Types</SelectItem>
                                        <SelectItem value="Incoming Inspection">Incoming Inspection</SelectItem>
                                        <SelectItem value="Patrol Inspection">Patrol Inspection</SelectItem>
                                        <SelectItem value="Line Inspection">Line Inspection</SelectItem>
                                        <SelectItem value="Lot Inspection">Lot Inspection</SelectItem>
                                        <SelectItem value="Final Visual Inspection">Final Visual Inspection</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full h-9 text-xs font-bold uppercase tracking-wide bg-slate-900" onClick={() => activeTab === 'pivot' ? fetchPivotData() : fetchStandardData()}>
                                <Filter className="mr-2 h-3.5 w-3.5" />
                                Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <Card className="shadow-none border-slate-100 bg-white">
                        <CardHeader className="pb-1 py-2 px-3">
                            <CardTitle className="text-[9px] uppercase tracking-widest font-black text-slate-400">Total Inspected</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                            <div className="text-xl font-black text-slate-900">
                                {pivotData?.summary.total_inspected.toLocaleString() || '0'}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border-red-50 bg-white">
                        <CardHeader className="pb-1 py-2 px-3">
                            <CardTitle className="text-[9px] uppercase tracking-widest font-black text-red-300">Total Rejected</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                            <div className="text-xl font-black text-red-600">
                                {pivotData?.summary.total_rejected.toLocaleString() || '0'}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border-slate-100 bg-white">
                        <CardHeader className="pb-1 py-2 px-3">
                            <CardTitle className="text-[9px] uppercase tracking-widest font-black text-slate-400">Rejection Rate</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                            <div className="text-xl font-black text-slate-900 tabular-nums">
                                {pivotData?.summary.total_inspected ?
                                    ((pivotData.summary.total_rejected / pivotData.summary.total_inspected) * 100).toFixed(2) : '0.00'}%
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border-slate-100 bg-white">
                        <CardHeader className="pb-1 py-2 px-3">
                            <CardTitle className="text-[9px] uppercase tracking-widest font-black text-slate-400">Products Tracked</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                            <div className="text-xl font-black text-slate-900 tabular-nums">
                                {pivotData?.summary.total_products || '0'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="pivot" onValueChange={setActiveTab}>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-1">
                        <TabsList className="h-9 bg-slate-100/50 p-1">
                            <TabsTrigger value="pivot" className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-tight">
                                <BarChart2 className="h-3.5 w-3.5" />
                                Hierarchical Pivot
                            </TabsTrigger>
                            <TabsTrigger value="standard" className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-tight">
                                <TableIcon className="h-3.5 w-3.5" />
                                Standard View
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="pivot" className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm mt-0">
                        <div className="overflow-x-auto">
                            <Table className="border-separate border-spacing-0 table-fixed w-full min-w-max bg-white">
                                <TableHeader className="bg-slate-900 sticky top-0 z-40">
                                    <TableRow className="hover:bg-slate-900 border-none">
                                        <TableHead
                                            style={{ left: 0, width: STICKY_COL_WIDTHS.product, minWidth: STICKY_COL_WIDTHS.product }}
                                            className="text-white sticky top-0 z-50 border-r border-slate-800 shadow-[2px_0_4px_rgba(0,0,0,0.5)] bg-slate-900 h-10 py-0 uppercase text-[10px] font-black tracking-widest"
                                        >
                                            Product
                                        </TableHead>
                                        <TableHead
                                            style={{ left: STICKY_COL_WIDTHS.product, width: STICKY_COL_WIDTHS.mainLot, minWidth: STICKY_COL_WIDTHS.mainLot }}
                                            className="text-white sticky top-0 z-50 border-r border-slate-800 bg-slate-900 h-10 py-0 uppercase text-[10px] font-black tracking-widest"
                                        >
                                            Main Lot
                                        </TableHead>
                                        <TableHead
                                            style={{ left: STICKY_COL_WIDTHS.product + STICKY_COL_WIDTHS.mainLot, width: STICKY_COL_WIDTHS.lotNo, minWidth: STICKY_COL_WIDTHS.lotNo }}
                                            className="text-white sticky top-0 z-50 border-r border-slate-800 bg-slate-900 h-10 py-0 uppercase text-[10px] font-black tracking-widest"
                                        >
                                            Lot No
                                        </TableHead>
                                        <TableHead className="w-[110px] min-w-[110px] text-white text-center uppercase text-[9px] font-black tracking-widest">Source</TableHead>
                                        <TableHead className="w-[90px] min-w-[90px] text-white text-center uppercase text-[9px] font-black tracking-widest">Inspected</TableHead>
                                        <TableHead className="w-[90px] min-w-[90px] text-white text-center uppercase text-[9px] font-black tracking-widest">Rejected</TableHead>
                                        <TableHead className="w-[100px] min-w-[100px] text-white text-center uppercase text-[9px] font-black tracking-widest">Cost</TableHead>
                                        <TableHead className="w-[70px] min-w-[70px] text-white text-center border-r border-slate-800 uppercase text-[9px] font-black tracking-widest">Rate</TableHead>
                                        {pivotData?.defect_columns.map(col => (
                                            <TableHead key={col} className="min-w-[60px] text-white text-center border-r border-slate-800 last:border-r-0 text-[10px] font-black">{col}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={8 + (pivotData?.defect_columns.length || 0)} className="h-32 text-center text-slate-400 font-medium">
                                                Loading rejection data...
                                            </TableCell>
                                        </TableRow>
                                    ) : visibleRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8 + (pivotData?.defect_columns.length || 0)} className="h-40 text-center text-slate-400 italic">
                                                No records found for the selected criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        visibleRows.map((row) => {
                                            const bgColor = row.type === 'product' ? 'bg-slate-50' : 'bg-white';

                                            return (
                                                <TableRow
                                                    key={row.id}
                                                    className={`
                                                        ${row.type === 'product' ? 'bg-slate-50 font-bold' : ''}
                                                        ${row.type === 'main_lot' ? 'bg-white font-medium border-t border-slate-100' : ''}
                                                        ${row.type === 'sublot' ? 'bg-white text-[11px] text-slate-600' : ''}
                                                        group hover:bg-slate-100/30 transition-colors
                                                    `}
                                                >
                                                    {/* Product Column */}
                                                    <TableCell
                                                        style={{ left: 0, width: STICKY_COL_WIDTHS.product, minWidth: STICKY_COL_WIDTHS.product }}
                                                        className={`sticky z-20 border-r border-slate-100 align-middle py-2 ${bgColor}`}
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden px-1">
                                                            {row.type === 'product' ? (
                                                                <>
                                                                    <button onClick={() => toggleRow(row.id)} className="text-slate-400 hover:text-blue-600 shrink-0 transition-colors">
                                                                        {expandedRows.has(row.id) ?
                                                                            <MinusSquare className="h-4 w-4" /> :
                                                                            <PlusSquare className="h-4 w-4" />
                                                                        }
                                                                    </button>
                                                                    <span className="text-blue-700 font-black truncate text-xs">{row.product_code}</span>
                                                                </>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>

                                                    {/* Main Lot Column */}
                                                    <TableCell
                                                        style={{ left: STICKY_COL_WIDTHS.product, width: STICKY_COL_WIDTHS.mainLot, minWidth: STICKY_COL_WIDTHS.mainLot }}
                                                        className={`sticky z-20 border-r border-slate-100 align-middle ${bgColor}`}
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden px-1">
                                                            {row.type === 'main_lot' ? (
                                                                <>
                                                                    <button onClick={() => toggleRow(row.id)} className="text-slate-400 hover:text-slate-700 shrink-0 transition-colors">
                                                                        {expandedRows.has(row.id) ?
                                                                            <MinusSquare className="h-3.5 w-3.5" /> :
                                                                            <PlusSquare className="h-3.5 w-3.5" />
                                                                        }
                                                                    </button>
                                                                    <span className="font-bold text-slate-700 truncate text-[11px]">{row.main_lot}</span>
                                                                </>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>

                                                    {/* Lot No Column */}
                                                    <TableCell
                                                        style={{ left: STICKY_COL_WIDTHS.product + STICKY_COL_WIDTHS.mainLot, width: STICKY_COL_WIDTHS.lotNo, minWidth: STICKY_COL_WIDTHS.lotNo }}
                                                        className={`sticky z-20 border-r border-slate-100 align-middle ${bgColor}`}
                                                    >
                                                        {row.type === 'sublot' ? (
                                                            <div className="flex flex-col min-w-0 pr-1 leading-none gap-0.5">
                                                                <span className="font-bold text-slate-800 truncate text-[11px]">{row.lot_no}</span>
                                                                <span className="text-[8px] text-slate-400 uppercase font-black truncate">{row.inspector}</span>
                                                            </div>
                                                        ) : null}
                                                    </TableCell>

                                                    {/* Source Badge */}
                                                    <TableCell className="text-center align-middle py-2">
                                                        {row.type === 'sublot' ? (
                                                            <Badge variant="outline" className="text-[8px] py-0 h-4 px-1.5 bg-blue-50/50 text-blue-600 border-blue-100/50 whitespace-nowrap font-black uppercase tracking-tighter">
                                                                {row.inspection_type?.replace(' Inspection', '').replace('Final Visual', 'FVI')}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest">{row.type.replace('_', ' ')}</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right tabular-nums font-semibold text-slate-600 px-3 text-xs">{row.inspected.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right tabular-nums font-black text-red-600 px-3 text-xs">{row.rejected.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right tabular-nums text-[10px] font-bold text-slate-700 px-3">
                                                        {row.rejection_cost > 0 ? `₹${row.rejection_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                                                    </TableCell>
                                                    <TableCell className={`text-center tabular-nums border-r border-slate-50 font-black text-xs ${row.rate > 5 ? 'text-red-700' : 'text-slate-400'}`}>
                                                        {row.rate.toFixed(1)}%
                                                    </TableCell>

                                                    {pivotData?.defect_columns.map(col => {
                                                        const val = row[col] || 0
                                                        return (
                                                            <TableCell key={col} className={`text-center tabular-nums border-r border-slate-50 last:border-r-0 text-xs ${getHeatmapColor(val)}`}>
                                                                <span className={val > 0 ? 'font-bold' : ''}>{val || '-'}</span>
                                                            </TableCell>
                                                        )
                                                    })}
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="standard" className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm mt-0 transition-all">
                        <Table className="bg-white">
                            <TableHeader className="bg-slate-50 border-b border-slate-100">
                                <TableRow>
                                    <TableHead className="uppercase text-[9px] font-black tracking-widest text-slate-500">Source</TableHead>
                                    <TableHead className="uppercase text-[9px] font-black tracking-widest text-slate-500">Item Code</TableHead>
                                    <TableHead className="uppercase text-[9px] font-black tracking-widest text-slate-500">Lot No</TableHead>
                                    <TableHead className="uppercase text-[9px] font-black tracking-widest text-slate-500">Type</TableHead>
                                    <TableHead className="uppercase text-[9px] font-black tracking-widest text-slate-500">Doc Name</TableHead>
                                    <TableHead className="text-right uppercase text-[9px] font-black tracking-widest text-slate-500">Inspected</TableHead>
                                    <TableHead className="text-right uppercase text-[9px] font-black tracking-widest text-slate-500">Rejected</TableHead>
                                    <TableHead className="text-right uppercase text-[9px] font-black tracking-widest text-slate-500">Cost</TableHead>
                                    <TableHead className="text-right uppercase text-[9px] font-black tracking-widest text-slate-500">Rate%</TableHead>
                                    <TableHead className="uppercase text-[9px] font-black tracking-widest text-slate-500">Status</TableHead>
                                    <TableHead className="uppercase text-[9px] font-black tracking-widest text-slate-500">Defects</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-40 text-center text-slate-400">Loading data...</TableCell>
                                    </TableRow>
                                ) : standardData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-40 text-center text-slate-400 italic">No records found</TableCell>
                                    </TableRow>
                                ) : (
                                    standardData.map((row, idx) => (
                                        <TableRow key={idx} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0 h-10">
                                            <TableCell>
                                                <Badge variant="outline" className="text-[8px] bg-slate-50/50 font-black uppercase tracking-tighter border-slate-200">
                                                    {row.source_type.split(' ')[0]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-900 truncate max-w-[120px] text-xs">{row.item_code}</TableCell>
                                            <TableCell className="font-semibold text-slate-700 text-xs">{row.lot_no}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-blue-50/30 text-blue-800 border-blue-100/50 text-[9px] uppercase font-bold tracking-tight px-1.5 h-4">
                                                    {row.inspection_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-400 text-[9px] font-mono truncate max-w-[100px]">{row.document_name}</TableCell>
                                            <TableCell className="text-right tabular-nums text-slate-600 text-xs">{row.inspected_qty.toLocaleString()}</TableCell>
                                            <TableCell className="text-right tabular-nums font-black text-red-600 text-xs">{row.rejected_qty.toLocaleString()}</TableCell>
                                            <TableCell className="text-right tabular-nums font-bold text-slate-700 text-xs">
                                                {row.rejection_cost > 0 ? `₹${row.rejection_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums font-black text-xs text-slate-800">{row.rejection_percentage.toFixed(1)}%</TableCell>
                                            <TableCell>
                                                <Badge className={`${getQualityBadgeColor(row.quality_status)} text-white text-[9px] font-black uppercase py-0 px-2 h-4 tracking-tighter`}>
                                                    {row.quality_status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate text-[9px] text-slate-400 font-medium italic">
                                                {row.defect_details || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    )
}

export default DrillDownRejectionReport

export const Component = DrillDownRejectionReport
