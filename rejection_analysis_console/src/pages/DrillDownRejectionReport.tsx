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
        if (value === 0) return 'text-slate-300'
        if (value < 10) return 'bg-red-50 text-red-700 font-medium'
        if (value < 50) return 'bg-red-100 text-red-800 font-bold'
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
        product: 180,
        mainLot: 160,
        lotNo: 160
    }

    return (
        <DashboardLayout>
            <SiteHeader title="Drill Down Rejection Report" description="Analyze rejection patterns across products, lots, and sublots." />
            <div className="space-y-6 p-6 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Phase 1 Report</h1>
                        <p className="text-muted-foreground mt-1">
                            Traceability and Pivot analysis
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => activeTab === 'pivot' ? fetchPivotData() : fetchStandardData()}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="fromDate">From Date</Label>
                                <Input
                                    id="fromDate"
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="toDate">To Date</Label>
                                <Input
                                    id="toDate"
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="itemCode">Item Code</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="itemCode"
                                        placeholder="Search item code..."
                                        className="pl-8"
                                        value={itemCode}
                                        onChange={(e) => setItemCode(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="inspectionType">Inspection Type</Label>
                                <Select value={inspectionType} onValueChange={setInspectionType}>
                                    <SelectTrigger id="inspectionType">
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
                            <Button className="w-full" onClick={() => activeTab === 'pivot' ? fetchPivotData() : fetchStandardData()}>
                                <Filter className="mr-2 h-4 w-4" />
                                Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inspected</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {pivotData?.summary.total_inspected.toLocaleString() || '0'}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rejected</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {pivotData?.summary.total_rejected.toLocaleString() || '0'}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Rejection Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {pivotData?.summary.total_inspected ?
                                    ((pivotData.summary.total_rejected / pivotData.summary.total_inspected) * 100).toFixed(2) : '0.00'}%
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Products Tracked</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {pivotData?.summary.total_products || '0'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="pivot" onValueChange={setActiveTab}>
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="pivot" className="flex items-center gap-2">
                                <BarChart2 className="h-4 w-4" />
                                Hierarchical Pivot
                            </TabsTrigger>
                            <TabsTrigger value="standard" className="flex items-center gap-2">
                                <TableIcon className="h-4 w-4" />
                                Standard View
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="pivot" className="border rounded-lg bg-card overflow-hidden mt-4 shadow-sm">
                        <div className="overflow-x-auto">
                            <Table className="border-collapse table-fixed w-full min-w-max">
                                <TableHeader className="bg-slate-900 border-b-2 border-slate-700">
                                    <TableRow className="hover:bg-slate-900">
                                        <TableHead
                                            style={{ left: 0, width: STICKY_COL_WIDTHS.product, minWidth: STICKY_COL_WIDTHS.product }}
                                            className="text-white sticky z-30 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.3)] bg-slate-900"
                                        >
                                            Product
                                        </TableHead>
                                        <TableHead
                                            style={{ left: STICKY_COL_WIDTHS.product, width: STICKY_COL_WIDTHS.mainLot, minWidth: STICKY_COL_WIDTHS.mainLot }}
                                            className="text-white sticky z-30 border-r border-slate-800 bg-slate-900"
                                        >
                                            Main Lot
                                        </TableHead>
                                        <TableHead
                                            style={{ left: STICKY_COL_WIDTHS.product + STICKY_COL_WIDTHS.mainLot, width: STICKY_COL_WIDTHS.lotNo, minWidth: STICKY_COL_WIDTHS.lotNo }}
                                            className="text-white sticky z-30 border-r border-slate-800 bg-slate-900"
                                        >
                                            Lot No
                                        </TableHead>
                                        <TableHead className="w-[120px] min-w-[120px] text-white text-center">Source</TableHead>
                                        <TableHead className="w-[100px] min-w-[100px] text-white text-center">Inspected</TableHead>
                                        <TableHead className="w-[100px] min-w-[100px] text-white text-center">Rejected</TableHead>
                                        <TableHead className="w-[110px] min-w-[110px] text-white text-center">Cost</TableHead>
                                        <TableHead className="w-[80px] min-w-[80px] text-white text-center border-r border-slate-800">Rate</TableHead>
                                        {pivotData?.defect_columns.map(col => (
                                            <TableHead key={col} className="min-w-[70px] text-white text-center border-r border-slate-800 last:border-r-0">{col}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={8 + (pivotData?.defect_columns.length || 0)} className="h-24 text-center">
                                                Loading data...
                                            </TableCell>
                                        </TableRow>
                                    ) : visibleRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8 + (pivotData?.defect_columns.length || 0)} className="h-24 text-center">
                                                No records found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        visibleRows.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                className={`
                                                    ${row.type === 'product' ? 'bg-slate-50 font-bold border-t-2 border-slate-200' : ''}
                                                    ${row.type === 'main_lot' ? 'bg-white font-medium border-t border-slate-100' : ''}
                                                    ${row.type === 'sublot' ? 'bg-white text-xs text-muted-foreground' : ''}
                                                    hover:bg-slate-100/60 transition-colors
                                                `}
                                            >
                                                {/* Product Column */}
                                                <TableCell
                                                    style={{ left: 0, width: STICKY_COL_WIDTHS.product, minWidth: STICKY_COL_WIDTHS.product }}
                                                    className="sticky z-20 border-r align-middle bg-inherit py-2 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
                                                >
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        {row.type === 'product' ? (
                                                            <>
                                                                <button onClick={() => toggleRow(row.id)} className="hover:text-primary shrink-0">
                                                                    {expandedRows.has(row.id) ?
                                                                        <MinusSquare className="h-4 w-4" /> :
                                                                        <PlusSquare className="h-4 w-4" />
                                                                    }
                                                                </button>
                                                                <span className="text-blue-700 font-bold truncate">{row.product_code}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-muted-foreground/30 font-normal italic pl-5 truncate">{row.product_code}</span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Main Lot Column */}
                                                <TableCell
                                                    style={{ left: STICKY_COL_WIDTHS.product, width: STICKY_COL_WIDTHS.mainLot, minWidth: STICKY_COL_WIDTHS.mainLot }}
                                                    className="sticky z-20 border-r align-middle bg-inherit"
                                                >
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        {row.type === 'main_lot' ? (
                                                            <>
                                                                <button onClick={() => toggleRow(row.id)} className="hover:text-primary shrink-0">
                                                                    {expandedRows.has(row.id) ?
                                                                        <MinusSquare className="h-3.5 w-3.5" /> :
                                                                        <PlusSquare className="h-3.5 w-3.5" />
                                                                    }
                                                                </button>
                                                                <span className="font-bold text-slate-800 truncate">{row.main_lot}</span>
                                                            </>
                                                        ) : row.type === 'sublot' ? (
                                                            <span className="text-muted-foreground/40 font-normal italic pl-5 truncate">{row.main_lot}</span>
                                                        ) : null}
                                                    </div>
                                                </TableCell>

                                                {/* Lot No Column */}
                                                <TableCell
                                                    style={{ left: STICKY_COL_WIDTHS.product + STICKY_COL_WIDTHS.mainLot, width: STICKY_COL_WIDTHS.lotNo, minWidth: STICKY_COL_WIDTHS.lotNo }}
                                                    className="sticky z-20 border-r align-middle bg-inherit"
                                                >
                                                    {row.type === 'sublot' ? (
                                                        <div className="flex flex-col min-w-0 pr-1 leading-tight">
                                                            <span className="font-semibold text-slate-900 truncate">{row.lot_no}</span>
                                                            <span className="text-[9px] text-muted-foreground uppercase opacity-70 truncate">{row.inspector}</span>
                                                        </div>
                                                    ) : null}
                                                </TableCell>

                                                {/* Source Badge */}
                                                <TableCell className="text-center align-middle">
                                                    {row.type === 'sublot' ? (
                                                        <Badge variant="outline" className="text-[9px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-100 whitespace-nowrap">
                                                            {row.inspection_type?.replace(' Inspection', '')}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tighter px-1 opacity-50">
                                                            {row.type}
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right tabular-nums font-medium">{row.inspected.toLocaleString()}</TableCell>
                                                <TableCell className="text-right tabular-nums font-bold text-red-600">{row.rejected.toLocaleString()}</TableCell>
                                                <TableCell className="text-right tabular-nums text-[11px] font-semibold text-slate-700">
                                                    {row.rejection_cost > 0 ? `₹${row.rejection_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                                                </TableCell>
                                                <TableCell className={`text-center tabular-nums border-r font-black ${row.rate > 5 ? 'text-red-700' : 'text-slate-600'}`}>
                                                    {row.rate.toFixed(1)}%
                                                </TableCell>

                                                {pivotData?.defect_columns.map(col => {
                                                    const val = row[col] || 0
                                                    return (
                                                        <TableCell key={col} className={`text-center tabular-nums border-r last:border-r-0 ${getHeatmapColor(val)}`}>
                                                            <span className={val > 0 ? 'font-bold' : ''}>{val || '-'}</span>
                                                        </TableCell>
                                                    )
                                                })}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="standard" className="border rounded-lg bg-card overflow-hidden mt-4 shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50 border-b">
                                <TableRow>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Item Code</TableHead>
                                    <TableHead>Lot No</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Doc Name</TableHead>
                                    <TableHead className="text-right">Inspected</TableHead>
                                    <TableHead className="text-right">Rejected</TableHead>
                                    <TableHead className="text-right">Cost</TableHead>
                                    <TableHead className="text-right">Rate %</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Defects</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-24 text-center">Loading data...</TableCell>
                                    </TableRow>
                                ) : standardData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-24 text-center">No records found</TableCell>
                                    </TableRow>
                                ) : (
                                    standardData.map((row, idx) => (
                                        <TableRow key={idx} className="hover:bg-slate-50">
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] bg-slate-50">
                                                    {row.source_type.split(' ')[0]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-900">{row.item_code}</TableCell>
                                            <TableCell className="font-medium">{row.lot_no}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-100">
                                                    {row.inspection_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-[11px] font-mono">{row.document_name}</TableCell>
                                            <TableCell className="text-right tabular-nums">{row.inspected_qty.toLocaleString()}</TableCell>
                                            <TableCell className="text-right tabular-nums font-bold text-red-600">{row.rejected_qty.toLocaleString()}</TableCell>
                                            <TableCell className="text-right tabular-nums font-semibold">
                                                {row.rejection_cost > 0 ? `₹${row.rejection_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums font-bold">{row.rejection_percentage.toFixed(2)}%</TableCell>
                                            <TableCell>
                                                <Badge className={`${getQualityBadgeColor(row.quality_status)} text-white`}>
                                                    {row.quality_status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate text-[10px] text-muted-foreground font-medium">
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
