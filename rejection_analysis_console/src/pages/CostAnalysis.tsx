import { useState, useContext, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { FrappeContext } from 'frappe-react-sdk'
import { toast } from 'sonner'
import {
    Calendar as CalendarIcon,
    TrendingUp,
    TrendingDown,
    Package,
    AlertCircle,
    RefreshCw,
    Download,
    BarChart3,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent
} from '@/components/ui/chart'

// TypeScript Interfaces
interface MouldingData {
    mpe_name: string
    lot_no: string
    work_plan: string
    planned_date: string
    moulding_date: string
    item_code: string
    production_qty_nos: number
    item_rate: number
    production_value: number
    weight_kg: number
    total_pieces: number
    operator_name: string
    machine_name: string
}

interface LotRejectionData {
    inspection_entry: string
    inspection_date: string
    lot_no: string
    item_code: string
    inspected_qty_nos: number
    total_rejected_qty: number
    rejection_pct: number
    item_rate: number
    rejection_cost: number
}

interface IncomingData {
    inspection_entry: string
    inspection_date: string
    lot_no: string
    item_code: string
    inspected_qty_nos: number
    total_rejected_qty: number
    rejection_pct: number
    cutmark_qty: number
    rbs_rejection_qty: number
    impression_mark_qty: number
    cmrr_pct: number
    df_vendor_cost: number
    total_rejection_cost: number
}

interface FVIData {
    inspection_entry: string
    inspection_date: string
    lot_no: string
    item_code: string
    inspected_qty: number
    rejected_qty: number
    rejection_pct: number
    over_trim_qty: number
    under_fill_qty: number
    trimming_rejection_pct: number
    trimming_cost: number
    fvi_rejection_cost: number
    total_fvi_cost: number
}

interface SummaryData {
    total_lots: number
    total_production_qty: number
    total_production_value: number
    lot_rejection_cost: number
    incoming_cost: number
    fvi_cost: number
    total_rejection_cost: number
    net_value: number
    copq_pct: number
}

function MetricCard({
    label,
    value,
    loading,
    icon: Icon
}: {
    label: string
    value: string | number
    loading: boolean
    icon?: any
}) {
    return (
        <Card className="overflow-hidden transition-all hover:shadow-md">
            <CardContent className="p-1">
                <div className="flex items-center justify-between space-x-1">
                    <div className="flex-1">
                        <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
                        {loading ? (
                            <Skeleton className="h-4 w-14 mt-0.5" />
                        ) : (
                            <p className="text-lg font-bold mt-0.5 tracking-tight">
                                {value !== null && value !== undefined ? value : '—'}
                            </p>
                        )}
                    </div>
                    {Icon && (
                        <div className="rounded-lg p-1 bg-primary/10">
                            <Icon className="h-3 w-3 text-primary" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function CostAnalysisPage() {
    const { call } = useContext(FrappeContext) as any
    const [activeTab, setActiveTab] = useState('analysis')
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [period, setPeriod] = useState<string>('daily')
    const [loading, setLoading] = useState(false)

    // State for all 4 stages
    const [mouldingData, setMouldingData] = useState<MouldingData[]>([])
    const [lotRejectionData, setLotRejectionData] = useState<LotRejectionData[]>([])
    const [incomingData, setIncomingData] = useState<IncomingData[]>([])
    const [fviData, setFVIData] = useState<FVIData[]>([])
    const [summary, setSummary] = useState<SummaryData>({
        total_lots: 0,
        total_production_qty: 0,
        total_production_value: 0,
        lot_rejection_cost: 0,
        incoming_cost: 0,
        fvi_cost: 0,
        total_rejection_cost: 0,
        net_value: 0,
        copq_pct: 0
    })

    // Table sorting and filtering state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
    const [filters, setFilters] = useState({
        lotNo: '',
        itemCode: '',
        operator: ''
    })

    useEffect(() => {
        fetchData()
    }, [])

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

    // Memoized processed data for each tab - prevents recalculation on tab switch
    const processedMouldingData = useMemo(() => {
        let processed = mouldingData.filter(row => {
            const lotMatch = !filters.lotNo || row.lot_no?.toString().toLowerCase().includes(filters.lotNo.toLowerCase())
            const itemMatch = !filters.itemCode || row.item_code?.toString().toLowerCase().includes(filters.itemCode.toLowerCase())
            const operatorMatch = !filters.operator || row.operator_name?.toString().toLowerCase().includes(filters.operator.toLowerCase())
            return lotMatch && itemMatch && operatorMatch
        })

        if (sortConfig) {
            processed = [...processed].sort((a, b) => {
                const aVal = a[sortConfig.key as keyof MouldingData]
                const bVal = b[sortConfig.key as keyof MouldingData]
                if (aVal === null || aVal === undefined) return 1
                if (bVal === null || bVal === undefined) return -1
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
                }
                return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
            })
        }
        return processed
    }, [mouldingData, sortConfig, filters])

    const processedLotRejectionData = useMemo(() => {
        let processed = lotRejectionData.filter(row => {
            const lotMatch = !filters.lotNo || row.lot_no?.toString().toLowerCase().includes(filters.lotNo.toLowerCase())
            const itemMatch = !filters.itemCode || row.item_code?.toString().toLowerCase().includes(filters.itemCode.toLowerCase())
            return lotMatch && itemMatch
        })

        if (sortConfig) {
            processed = [...processed].sort((a, b) => {
                const aVal = a[sortConfig.key as keyof LotRejectionData]
                const bVal = b[sortConfig.key as keyof LotRejectionData]
                if (aVal === null || aVal === undefined) return 1
                if (bVal === null || bVal === undefined) return -1
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
                }
                return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
            })
        }
        return processed
    }, [lotRejectionData, sortConfig, filters])

    const processedIncomingData = useMemo(() => {
        let processed = incomingData.filter(row => {
            const lotMatch = !filters.lotNo || row.lot_no?.toString().toLowerCase().includes(filters.lotNo.toLowerCase())
            const itemMatch = !filters.itemCode || row.item_code?.toString().toLowerCase().includes(filters.itemCode.toLowerCase())
            return lotMatch && itemMatch
        })

        if (sortConfig) {
            processed = [...processed].sort((a, b) => {
                const aVal = a[sortConfig.key as keyof IncomingData]
                const bVal = b[sortConfig.key as keyof IncomingData]
                if (aVal === null || aVal === undefined) return 1
                if (bVal === null || bVal === undefined) return -1
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
                }
                return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
            })
        }
        return processed
    }, [incomingData, sortConfig, filters])

    const processedFviData = useMemo(() => {
        let processed = fviData.filter(row => {
            const lotMatch = !filters.lotNo || row.lot_no?.toString().toLowerCase().includes(filters.lotNo.toLowerCase())
            const itemMatch = !filters.itemCode || row.item_code?.toString().toLowerCase().includes(filters.itemCode.toLowerCase())
            return lotMatch && itemMatch
        })

        if (sortConfig) {
            processed = [...processed].sort((a, b) => {
                const aVal = a[sortConfig.key as keyof FVIData]
                const bVal = b[sortConfig.key as keyof FVIData]
                if (aVal === null || aVal === undefined) return 1
                if (bVal === null || bVal === undefined) return -1
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
                }
                return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
            })
        }
        return processed
    }, [fviData, sortConfig, filters])

    // Memoized chart data - expensive calculation
    const chartData = useMemo(() => {
        const dateMap = new Map<string, { production_value: number; rejection_cost: number }>()

        mouldingData.forEach(item => {
            const date = item.moulding_date
            if (!date) return
            const current = dateMap.get(date) || { production_value: 0, rejection_cost: 0 }
            dateMap.set(date, {
                ...current,
                production_value: current.production_value + (item.production_value || 0)
            })
        })

        lotRejectionData.forEach(item => {
            // Strictly use inspection_date. Fallback to lot_no extract is unreliable (e.g. 5525.02.05)
            const date = item.inspection_date
            if (!date) return
            const current = dateMap.get(date) || { production_value: 0, rejection_cost: 0 }
            dateMap.set(date, {
                ...current,
                rejection_cost: current.rejection_cost + (item.rejection_cost || 0)
            })
        })

        incomingData.forEach(item => {
            const date = item.inspection_date
            if (!date) return
            const current = dateMap.get(date) || { production_value: 0, rejection_cost: 0 }
            dateMap.set(date, {
                ...current,
                rejection_cost: current.rejection_cost + (item.df_vendor_cost || 0)
            })
        })

        fviData.forEach(item => {
            const date = item.inspection_date
            if (!date) return
            const current = dateMap.get(date) || { production_value: 0, rejection_cost: 0 }
            dateMap.set(date, {
                ...current,
                rejection_cost: current.rejection_cost + (item.total_fvi_cost || 0)
            })
        })

        return Array.from(dateMap.entries())
            .map(([date, values]) => ({
                date,
                production_value: values.production_value,
                rejection_cost: values.rejection_cost
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }, [mouldingData, lotRejectionData, incomingData, fviData])

    const fetchData = async () => {
        setLoading(true)
        try {
            const response = await call.post('rejection_analysis.rejection_analysis.cost_analysis_api.get_cost_analysis_data', {
                filters: {
                    period: period,
                    date: format(selectedDate, 'yyyy-MM-dd')
                }
            })

            const data = response?.message || response

            if (data && data.success) {
                setMouldingData(data.stages?.moulding || [])
                setLotRejectionData(data.stages?.lot_rejection || [])
                setIncomingData(data.stages?.incoming || [])
                setFVIData(data.stages?.fvi || [])
                setSummary(data.summary || {})
            }
        } catch (error) {
            console.error('API Error:', error)
            toast.error('Failed to load cost analysis data')
        } finally {
            setLoading(false)
        }
    }

    const handleTabChange = (tabName: string) => {
        setActiveTab(tabName)
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(value)
    }

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), 'dd-MMM-yy')
    }

    // Calculate actual date range being queried
    const getDateRangeDisplay = () => {
        const date = selectedDate

        switch (period) {
            case 'daily':
                return format(date, 'MMM d, yyyy')

            case 'weekly':
                const weekStart = new Date(date)
                weekStart.setDate(weekStart.getDate() - 6)
                return `${format(weekStart, 'MMM d')} - ${format(date, 'MMM d, yyyy')}`

            case 'monthly':
                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
                const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
                return `${format(monthStart, 'MMM d')} - ${format(monthEnd, 'MMM d, yyyy')}`

            case '6months':
                const sixMonthsAgo = new Date(date)
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
                return `${format(sixMonthsAgo, 'MMM d, yyyy')} - ${format(date, 'MMM d, yyyy')}`

            default:
                return format(date, 'MMM d, yyyy')
        }
    }

    const getPeriodLabel = () => {
        switch (period) {
            case 'daily': return 'Daily Report'
            case 'weekly': return 'Weekly Report (7 days)'
            case 'monthly': return 'Monthly Report'
            case '6months': return 'Last 6 Months'
            default: return 'Report'
        }
    }

    const exportToCSV = () => {
        toast.success('Export feature coming soon')
    }

    return (
        <DashboardLayout>
            <SiteHeader />
            <div className="flex flex-1 flex-col gap-6 p-4 bg-muted/30">
                {/* Header Section */}
                <Card className="border-2 shadow-sm">
                    <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-6">
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold tracking-tight">Cost Analysis Dashboard</h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <p className="text-xs text-muted-foreground">
                                        Production cost tracking and rejection cost analysis
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                            {getPeriodLabel()}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                            {getDateRangeDisplay()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs font-semibold">Period Type</Label>
                                    <Select value={period} onValueChange={setPeriod}>
                                        <SelectTrigger className="w-[160px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly (7 days)</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="6months">Last 6 Months</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs font-semibold">
                                        {period === 'daily' ? 'Select Date' : period === 'weekly' || period === '6months' ? 'End Date' : 'Any Date in Month'}
                                    </Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-[180px] h-8 text-xs justify-start font-normal">
                                                <CalendarIcon className="mr-2 h-3 w-3" />
                                                {format(selectedDate, 'PPP')}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end">
                                            <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs font-semibold opacity-0">Actions</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={fetchData}
                                            disabled={loading}
                                            className="gap-2 h-8"
                                        >
                                            {loading ? (
                                                <RefreshCw className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-3 w-3" />
                                            )}
                                            Refresh
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={exportToCSV}
                                            className="gap-2 h-8"
                                        >
                                            <Download className="h-3 w-3" />
                                            Export
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="analysis" className="gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Analysis
                        </TabsTrigger>
                        <TabsTrigger value="moulding" className="gap-2">
                            <Package className="h-3 w-3" />
                            Moulding
                        </TabsTrigger>
                        <TabsTrigger value="lot_rejection" className="gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Lot Rejection
                        </TabsTrigger>
                        <TabsTrigger value="incoming" className="gap-2">
                            <TrendingDown className="h-4 w-4" />
                            Incoming
                        </TabsTrigger>
                        <TabsTrigger value="fvi" className="gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Final Inspection
                        </TabsTrigger>
                    </TabsList>

                    {/* Analysis Tab */}
                    <TabsContent value="analysis" className="space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                            <Card className="border-l-4 border-primary">
                                <CardHeader className="pb-1 pt-2 px-3">
                                    <CardTitle className="text-xs flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        Moulding
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-2 pt-1 px-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Lots</span>
                                            <span className="font-bold">{summary.total_lots}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Qty</span>
                                            <span className="font-bold">{summary.total_production_qty.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-1 border-t">
                                            <p className="text-[10px] text-muted-foreground">Value</p>
                                            <p className="text-lg font-bold text-primary">{formatCurrency(summary.total_production_value)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-orange-500">
                                <CardHeader className="pb-1 pt-2 px-3">
                                    <CardTitle className="text-xs flex items-center gap-2">
                                        <AlertCircle className="h-3 w-3" />
                                        Lot Rejection
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-2 pt-1 px-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Records</span>
                                            <span className="font-bold">{lotRejectionData.length}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Rejected</span>
                                            <span className="font-bold">{lotRejectionData.reduce((sum, r) => sum + r.total_rejected_qty, 0)}</span>
                                        </div>
                                        <div className="pt-1 border-t">
                                            <p className="text-[10px] text-muted-foreground">Cost</p>
                                            <p className="text-lg font-bold text-orange-600">{formatCurrency(summary.lot_rejection_cost)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-yellow-500">
                                <CardHeader className="pb-1 pt-2 px-3">
                                    <CardTitle className="text-xs flex items-center gap-2">
                                        <TrendingDown className="h-3 w-3" />
                                        Incoming
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-2 pt-1 px-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Records</span>
                                            <span className="font-bold">{incomingData.length}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Defects</span>
                                            <span className="font-bold">{incomingData.reduce((sum, r) => sum + r.total_rejected_qty, 0)}</span>
                                        </div>
                                        <div className="pt-1 border-t">
                                            <p className="text-[10px] text-muted-foreground">DF Cost</p>
                                            <p className="text-lg font-bold text-yellow-600">{formatCurrency(summary.incoming_cost)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-destructive">
                                <CardHeader className="pb-1 pt-2 px-3">
                                    <CardTitle className="text-xs flex items-center gap-2">
                                        <TrendingUp className="h-3 w-3" />
                                        FVI
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-2 pt-1 px-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Records</span>
                                            <span className="font-bold">{fviData.length}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Rejected</span>
                                            <span className="font-bold">{fviData.reduce((sum, r) => sum + r.rejected_qty, 0)}</span>
                                        </div>
                                        <div className="pt-1 border-t">
                                            <p className="text-[10px] text-muted-foreground">Cost</p>
                                            <p className="text-lg font-bold text-destructive">{formatCurrency(summary.fvi_cost)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Overall Cost Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Production Value</p>
                                        <p className="text-3xl font-bold text-primary">{formatCurrency(summary.total_production_value)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Total Rejection Cost</p>
                                        <p className="text-3xl font-bold text-destructive">{formatCurrency(summary.total_rejection_cost)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Net Value</p>
                                        <p className="text-3xl font-bold">{formatCurrency(summary.net_value)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Cost of Poor Quality</p>
                                        <p className="text-3xl font-bold text-orange-600">{summary.copq_pct.toFixed(2)}%</p>
                                        <p className="text-xs text-muted-foreground">Rejection / Production</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Production Value Chart */}
                        <Card>
                            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                                <div className="grid flex-1 gap-1">
                                    <CardTitle>Production Value vs Rejection Cost Trend</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Showing daily production value and rejection cost over time
                                    </p>
                                </div>
                                <Select
                                    value={(() => {
                                        if (period === 'weekly') return '7d'
                                        if (period === 'monthly') return '30d'
                                        return '90d'
                                    })()}
                                    onValueChange={(value) => {
                                        if (value === '7d') setPeriod('weekly')
                                        else if (value === '30d') setPeriod('monthly')
                                        else setPeriod('6months')
                                    }}
                                >
                                    <SelectTrigger className="w-[160px] rounded-lg" aria-label="Select a value">
                                        <SelectValue placeholder="Select range" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
                                        <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
                                        <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardHeader>
                            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                                {loading ? (
                                    <div className="h-[350px] flex items-center justify-center">
                                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : mouldingData.length === 0 ? (
                                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                                        <p>No data available for the selected period</p>
                                    </div>
                                ) : (
                                    <ChartContainer
                                        config={{
                                            production_value: {
                                                label: "Production Value",
                                                color: "#2563eb",
                                            },
                                            rejection_cost: {
                                                label: "Rejection Cost",
                                                color: "#ef4444",
                                            },
                                        } satisfies ChartConfig}
                                        className="aspect-auto h-[350px] w-full"
                                    >
                                        <BarChart
                                            data={chartData}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis
                                                dataKey="date"
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                minTickGap={32}
                                                tickFormatter={(value) => {
                                                    try {
                                                        const date = new Date(value)
                                                        if (isNaN(date.getTime())) return value
                                                        return date.toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                        })
                                                    } catch (e) {
                                                        return value
                                                    }
                                                }}
                                            />
                                            <ChartTooltip
                                                cursor={false}
                                                content={
                                                    <ChartTooltipContent
                                                        labelFormatter={(value: any) => {
                                                            try {
                                                                const date = new Date(value)
                                                                if (isNaN(date.getTime())) return String(value)
                                                                return date.toLocaleDateString("en-US", {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric"
                                                                })
                                                            } catch (e) {
                                                                return String(value)
                                                            }
                                                        }}
                                                        formatter={(value) => formatCurrency(Number(value))}
                                                        indicator="dashed"
                                                    />
                                                }
                                            />
                                            <Bar
                                                dataKey="production_value"
                                                fill="var(--color-production_value)"
                                                radius={[4, 4, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="rejection_cost"
                                                fill="var(--color-rejection_cost)"
                                                radius={[4, 4, 0, 0]}
                                            />
                                            <ChartLegend content={<ChartLegendContent />} />
                                        </BarChart>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Daily Trend Table */}
                        <Card>
                            <CardHeader className="py-3 border-b">
                                <CardTitle className="text-lg">Daily Cost Analysis</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-[120px]">Date</TableHead>
                                            <TableHead className="text-right">Production Value</TableHead>
                                            <TableHead className="text-right">Rejection Cost</TableHead>
                                            <TableHead className="text-right">Net Value</TableHead>
                                            <TableHead className="text-right">COPQ %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {chartData.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                    No data available for the selected period
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {chartData.map((row) => {
                                                    const netValue = row.production_value - row.rejection_cost
                                                    const copq = row.production_value > 0 ? (row.rejection_cost / row.production_value) * 100 : 0

                                                    return (
                                                        <TableRow key={row.date} className="hover:bg-muted/50">
                                                            <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
                                                            <TableCell className="text-right text-primary font-semibold">
                                                                {formatCurrency(row.production_value)}
                                                            </TableCell>
                                                            <TableCell className="text-right text-destructive font-semibold">
                                                                {formatCurrency(row.rejection_cost)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold">
                                                                {formatCurrency(netValue)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <span className={`px-2 py-1 rounded text-xs font-bold ${copq > 5 ? 'bg-red-100 text-red-700' :
                                                                    copq > 2 ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-green-100 text-green-700'
                                                                    }`}>
                                                                    {copq.toFixed(2)}%
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                                {/* Total Row */}
                                                <TableRow className="bg-muted font-bold border-t-2 border-primary/20">
                                                    <TableCell>Total</TableCell>
                                                    <TableCell className="text-right text-primary">
                                                        {formatCurrency(chartData.reduce((sum, r) => sum + r.production_value, 0))}
                                                    </TableCell>
                                                    <TableCell className="text-right text-destructive">
                                                        {formatCurrency(chartData.reduce((sum, r) => sum + r.rejection_cost, 0))}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatCurrency(
                                                            chartData.reduce((sum, r) => sum + r.production_value, 0) -
                                                            chartData.reduce((sum, r) => sum + r.rejection_cost, 0)
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {(() => {
                                                            const totalProd = chartData.reduce((sum, r) => sum + r.production_value, 0)
                                                            const totalRej = chartData.reduce((sum, r) => sum + r.rejection_cost, 0)
                                                            return totalProd > 0 ? ((totalRej / totalProd) * 100).toFixed(2) + '%' : '0.00%'
                                                        })()}
                                                    </TableCell>
                                                </TableRow>
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Moulding Tab */}
                    <TabsContent value="moulding" className="space-y-4">
                        <div className="grid grid-cols-5 gap-3">
                            <MetricCard label="Total Lots" value={summary.total_lots} loading={loading} icon={Package} />
                            <MetricCard label="Total Quantity" value={summary.total_production_qty.toLocaleString()} loading={loading} />
                            <MetricCard label="Production Value" value={formatCurrency(summary.total_production_value)} loading={loading} icon={TrendingUp} />
                            <MetricCard label="Records" value={mouldingData.length} loading={loading} />
                            <MetricCard label="Avg Rate" value={mouldingData.length > 0 ? formatCurrency(summary.total_production_value / summary.total_production_qty) : '₹0'} loading={loading} />
                        </div>

                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-lg">Production Records</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-2">
                                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                                    </div>
                                ) : mouldingData.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>No production data found for selected period</p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[110px]">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="-ml-3 h-8 data-[state=open]:bg-accent"
                                                            onClick={() => handleSort('lot_no')}
                                                        >
                                                            Lot No
                                                            {sortConfig?.key === 'lot_no' ? (
                                                                sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                                            ) : (
                                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead>Work Plan</TableHead>
                                                    <TableHead>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="-ml-3 h-8"
                                                            onClick={() => handleSort('moulding_date')}
                                                        >
                                                            Moulded Date
                                                            {sortConfig?.key === 'moulding_date' ? (
                                                                sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                                            ) : (
                                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="-ml-3 h-8"
                                                            onClick={() => handleSort('item_code')}
                                                        >
                                                            Item Code
                                                            {sortConfig?.key === 'item_code' ? (
                                                                sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                                            ) : (
                                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead className="text-right">Qty</TableHead>
                                                    <TableHead className="text-right">Rate</TableHead>
                                                    <TableHead className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="-ml-3 h-8"
                                                            onClick={() => handleSort('production_value')}
                                                        >
                                                            Value
                                                            {sortConfig?.key === 'production_value' ? (
                                                                sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                                            ) : (
                                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="-ml-3 h-8"
                                                            onClick={() => handleSort('operator_name')}
                                                        >
                                                            Operator
                                                            {sortConfig?.key === 'operator_name' ? (
                                                                sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                                            ) : (
                                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableHead>
                                                </TableRow>
                                                {/* Filter Row */}
                                                <TableRow className="bg-muted/50">
                                                    <TableHead>
                                                        <Input
                                                            placeholder="Filter lot..."
                                                            value={filters.lotNo}
                                                            onChange={(e) => handleFilterChange('lotNo', e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                    </TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead>
                                                        <Input
                                                            placeholder="Filter item..."
                                                            value={filters.itemCode}
                                                            onChange={(e) => handleFilterChange('itemCode', e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                    </TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead>
                                                        <Input
                                                            placeholder="Filter operator..."
                                                            value={filters.operator}
                                                            onChange={(e) => handleFilterChange('operator', e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {processedMouldingData.map((row) => (
                                                    <TableRow key={row.mpe_name}>
                                                        <TableCell className="font-mono font-medium text-sm">{row.lot_no}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{row.work_plan || '-'}</TableCell>
                                                        <TableCell className="text-sm">{formatDate(row.moulding_date)}</TableCell>
                                                        <TableCell className="text-sm">{row.item_code}</TableCell>
                                                        <TableCell className="text-right font-medium">{row.production_qty_nos}</TableCell>
                                                        <TableCell className="text-right text-sm">{row.item_rate?.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-medium text-primary">{formatCurrency(row.production_value)}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{row.operator_name}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Lot Rejection Tab */}
                    <TabsContent value="lot_rejection" className="space-y-4">
                        <div className="grid grid-cols-5 gap-3">
                            <MetricCard label="Records" value={lotRejectionData.length} loading={loading} icon={AlertCircle} />
                            <MetricCard label="Total Inspected" value={lotRejectionData.reduce((sum, r) => sum + r.inspected_qty_nos, 0).toLocaleString()} loading={loading} />
                            <MetricCard label="Total Rejected" value={lotRejectionData.reduce((sum, r) => sum + r.total_rejected_qty, 0).toLocaleString()} loading={loading} />
                            <MetricCard label="Avg Rejection %" value={lotRejectionData.length > 0 ? `${(lotRejectionData.reduce((sum, r) => sum + r.rejection_pct, 0) / lotRejectionData.length).toFixed(2)}%` : '0%'} loading={loading} />
                            <MetricCard label="Rejection Cost" value={formatCurrency(summary.lot_rejection_cost)} loading={loading} icon={TrendingDown} />
                        </div>

                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-lg">Lot Inspection Records</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-2">
                                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                                    </div>
                                ) : lotRejectionData.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>No lot rejection data found for selected period</p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>
                                                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('inspection_date')}>
                                                            Date
                                                            {sortConfig?.key === 'inspection_date' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : (<ArrowUpDown className="ml-2 h-4 w-4" />)}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead>
                                                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('lot_no')}>
                                                            Lot No
                                                            {sortConfig?.key === 'lot_no' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : (<ArrowUpDown className="ml-2 h-4 w-4" />)}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead>
                                                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('item_code')}>
                                                            Item
                                                            {sortConfig?.key === 'item_code' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : (<ArrowUpDown className="ml-2 h-4 w-4" />)}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead className="text-right">Inspected</TableHead>
                                                    <TableHead className="text-right">Rejected</TableHead>
                                                    <TableHead className="text-right">Rej %</TableHead>
                                                    <TableHead className="text-right">Rate</TableHead>
                                                    <TableHead className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="-ml-3 h-8"
                                                            onClick={() => handleSort('rejection_cost')}
                                                        >
                                                            Cost
                                                            {sortConfig?.key === 'rejection_cost' ? (
                                                                sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                                            ) : (
                                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableHead>
                                                </TableRow>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead></TableHead>
                                                    <TableHead><Input placeholder="Filter lot..." value={filters.lotNo} onChange={(e) => handleFilterChange('lotNo', e.target.value)} className="h-8 text-xs" /></TableHead>
                                                    <TableHead><Input placeholder="Filter item..." value={filters.itemCode} onChange={(e) => handleFilterChange('itemCode', e.target.value)} className="h-8 text-xs" /></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {processedLotRejectionData.map((row) => (
                                                    <TableRow key={row.inspection_entry}>
                                                        <TableCell className="text-sm">{formatDate(row.inspection_date)}</TableCell>
                                                        <TableCell className="font-mono font-medium text-sm">{row.lot_no}</TableCell>
                                                        <TableCell className="text-sm">{row.item_code}</TableCell>
                                                        <TableCell className="text-right">{row.inspected_qty_nos}</TableCell>
                                                        <TableCell className="text-right font-medium">{row.total_rejected_qty}</TableCell>
                                                        <TableCell className="text-right text-orange-600 font-medium">{row.rejection_pct.toFixed(2)}%</TableCell>
                                                        <TableCell className="text-right text-sm">{row.item_rate?.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-medium text-orange-600">{formatCurrency(row.rejection_cost)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Incoming Inspection Tab */}
                    <TabsContent value="incoming" className="space-y-4">
                        <div className="grid grid-cols-5 gap-3">
                            <MetricCard label="Records" value={incomingData.length} loading={loading} icon={TrendingDown} />
                            <MetricCard label="Total Defects" value={incomingData.reduce((sum, r) => sum + r.total_rejected_qty, 0).toLocaleString()} loading={loading} />
                            <MetricCard label="Cutmark" value={incomingData.reduce((sum, r) => sum + r.cutmark_qty, 0).toLocaleString()} loading={loading} />
                            <MetricCard label="RBS" value={incomingData.reduce((sum, r) => sum + r.rbs_rejection_qty, 0).toLocaleString()} loading={loading} />
                            <MetricCard label="DF Vendor Cost" value={formatCurrency(summary.incoming_cost)} loading={loading} icon={TrendingDown} />
                        </div>

                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-lg">Incoming Inspection Records</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-2">
                                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                                    </div>
                                ) : incomingData.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>No incoming inspection data found for selected period</p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>
                                                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('inspection_date')}>
                                                            Date
                                                            {sortConfig?.key === 'inspection_date' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : (<ArrowUpDown className="ml-2 h-4 w-4" />)}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead>
                                                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('lot_no')}>
                                                            Lot No
                                                            {sortConfig?.key === 'lot_no' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : (<ArrowUpDown className="ml-2 h-4 w-4" />)}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead>
                                                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('item_code')}>
                                                            Item
                                                            {sortConfig?.key === 'item_code' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : (<ArrowUpDown className="ml-2 h-4 w-4" />)}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead className="text-right">Cutmark</TableHead>
                                                    <TableHead className="text-right">RBS</TableHead>
                                                    <TableHead className="text-right">Impression</TableHead>
                                                    <TableHead className="text-right">C/M/RR %</TableHead>
                                                    <TableHead className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="-ml-3 h-8"
                                                            onClick={() => handleSort('df_vendor_cost')}
                                                        >
                                                            DF Cost
                                                            {sortConfig?.key === 'df_vendor_cost' ? (
                                                                sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                                            ) : (
                                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableHead>
                                                </TableRow>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead></TableHead>
                                                    <TableHead><Input placeholder="Filter lot..." value={filters.lotNo} onChange={(e) => handleFilterChange('lotNo', e.target.value)} className="h-8 text-xs" /></TableHead>
                                                    <TableHead><Input placeholder="Filter item..." value={filters.itemCode} onChange={(e) => handleFilterChange('itemCode', e.target.value)} className="h-8 text-xs" /></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {processedIncomingData.map((row) => (
                                                    <TableRow key={row.inspection_entry}>
                                                        <TableCell className="text-sm">{formatDate(row.inspection_date)}</TableCell>
                                                        <TableCell className="font-mono font-medium text-sm">{row.lot_no}</TableCell>
                                                        <TableCell className="text-sm">{row.item_code}</TableCell>
                                                        <TableCell className="text-right">{row.cutmark_qty}</TableCell>
                                                        <TableCell className="text-right">{row.rbs_rejection_qty}</TableCell>
                                                        <TableCell className="text-right">{row.impression_mark_qty}</TableCell>
                                                        <TableCell className="text-right text-yellow-600 font-medium">{(row.cmrr_pct * 100).toFixed(2)}%</TableCell>
                                                        <TableCell className="text-right font-medium text-yellow-600">{formatCurrency(row.df_vendor_cost)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* FVI Tab */}
                    <TabsContent value="fvi" className="space-y-4">
                        <div className="grid grid-cols-5 gap-3">
                            <MetricCard label="Records" value={fviData.length} loading={loading} icon={TrendingUp} />
                            <MetricCard label="Total Rejected" value={fviData.reduce((sum, r) => sum + r.rejected_qty, 0).toLocaleString()} loading={loading} />
                            <MetricCard label="Over Trim" value={fviData.reduce((sum, r) => sum + r.over_trim_qty, 0).toLocaleString()} loading={loading} />
                            <MetricCard label="Under Fill" value={fviData.reduce((sum, r) => sum + r.under_fill_qty, 0).toLocaleString()} loading={loading} />
                            <MetricCard label="FVI Cost" value={formatCurrency(summary.fvi_cost)} loading={loading} icon={TrendingUp} />
                        </div>

                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-lg">Final Inspection Records</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-2">
                                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                                    </div>
                                ) : fviData.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>No FVI data found for selected period</p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>
                                                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('inspection_date')}>
                                                            Date
                                                            {sortConfig?.key === 'inspection_date' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : (<ArrowUpDown className="ml-2 h-4 w-4" />)}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead>
                                                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('lot_no')}>
                                                            Lot No
                                                            {sortConfig?.key === 'lot_no' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : (<ArrowUpDown className="ml-2 h-4 w-4" />)}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead>
                                                        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('item_code')}>
                                                            Item
                                                            {sortConfig?.key === 'item_code' ? (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />) : (<ArrowUpDown className="ml-2 h-4 w-4" />)}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead className="text-right">Over Trim</TableHead>
                                                    <TableHead className="text-right">Under Fill</TableHead>
                                                    <TableHead className="text-right">Trim %</TableHead>
                                                    <TableHead className="text-right">Trim Cost</TableHead>
                                                    <TableHead className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="-ml-3 h-8"
                                                            onClick={() => handleSort('total_fvi_cost')}
                                                        >
                                                            Total Cost
                                                            {sortConfig?.key === 'total_fvi_cost' ? (
                                                                sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                                            ) : (
                                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableHead>
                                                </TableRow>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead></TableHead>
                                                    <TableHead><Input placeholder="Filter lot..." value={filters.lotNo} onChange={(e) => handleFilterChange('lotNo', e.target.value)} className="h-8 text-xs" /></TableHead>
                                                    <TableHead><Input placeholder="Filter item..." value={filters.itemCode} onChange={(e) => handleFilterChange('itemCode', e.target.value)} className="h-8 text-xs" /></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {processedFviData.map((row) => (
                                                    <TableRow key={row.inspection_entry}>
                                                        <TableCell className="text-sm">{formatDate(row.inspection_date)}</TableCell>
                                                        <TableCell className="font-mono font-medium text-sm">{row.lot_no}</TableCell>
                                                        <TableCell className="text-sm">{row.item_code}</TableCell>
                                                        <TableCell className="text-right">{row.over_trim_qty}</TableCell>
                                                        <TableCell className="text-right">{row.under_fill_qty}</TableCell>
                                                        <TableCell className="text-right text-destructive font-medium">{row.trimming_rejection_pct.toFixed(2)}%</TableCell>
                                                        <TableCell className="text-right text-sm">{formatCurrency(row.trimming_cost)}</TableCell>
                                                        <TableCell className="text-right font-medium text-destructive">{formatCurrency(row.total_fvi_cost)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    )
}

export const Component = CostAnalysisPage
export default CostAnalysisPage
