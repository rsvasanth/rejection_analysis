import { useState, useContext, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    BarChart3
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ProductionData {
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

interface SummaryData {
    total_lots: number
    total_qty: number
    total_value: number
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
                        <div className="rounded-lg p-1.5 bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
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
    const [productionData, setProductionData] = useState<ProductionData[]>([])
    const [summary, setSummary] = useState<SummaryData>({ total_lots: 0, total_qty: 0, total_value: 0 })

    useEffect(() => {
        // Auto-load data on mount
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const response = await call.post('rejection_analysis.rejection_analysis.cost_analysis_api.get_production_data_phase1', {
                filters: {
                    period: period,
                    date: format(selectedDate, 'yyyy-MM-dd')
                }
            })

            const data = response?.message || response

            if (data) {
                setProductionData(data.production_data || [])
                setSummary(data.summary || { total_lots: 0, total_qty: 0, total_value: 0 })
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
        // Can fetch tab-specific data here in future phases
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

    const exportToCSV = () => {
        if (productionData.length === 0) {
            toast.error('No data to export')
            return
        }

        const headers = ['Lot No', 'Work Plan', 'Planned Date', 'Moulding Date', 'Item Code', 'Qty', 'Rate', 'Value', 'Operator', 'Machine']
        const rows = productionData.map(row => [
            row.lot_no,
            row.work_plan || '',
            row.planned_date ? formatDate(row.planned_date) : '',
            formatDate(row.moulding_date),
            row.item_code,
            row.production_qty_nos,
            row.item_rate,
            row.production_value,
            row.operator_name,
            row.machine_name || ''
        ])

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `cost_analysis_${format(selectedDate, 'yyyy-MM-dd')}.csv`
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Data exported successfully')
    }

    return (
        <DashboardLayout>
            <SiteHeader />
            <div className="flex flex-1 flex-col gap-6 p-4 bg-muted/30">
                {/* Header Section */}
                <Card className="border-2 shadow-sm">
                    <CardContent className="py-1 px-4">
                        <div className="flex items-start justify-between gap-6">
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold tracking-tight">Cost Analysis Dashboard</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Production cost tracking and rejection cost analysis
                                </p>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-3">
                                {/* Date Info */}
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                                    <CalendarIcon className="h-4 w-4 text-primary" />
                                    <div>
                                        <Label className="text-xs font-semibold">Report Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" className="h-6 p-0 text-xs font-normal hover:bg-transparent">
                                                    {format(selectedDate, 'PPP')}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Period Selector */}
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs">Period:</Label>
                                    <Select value={period} onValueChange={setPeriod}>
                                        <SelectTrigger className="w-[140px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="6months">Last 6 Months</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Refresh Button */}
                                <Button
                                    size="default"
                                    variant="outline"
                                    onClick={fetchData}
                                    disabled={loading}
                                    className="gap-2"
                                >
                                    {loading ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                    Refresh
                                </Button>

                                {/* Export Button */}
                                <Button
                                    size="default"
                                    variant="outline"
                                    onClick={exportToCSV}
                                    className="gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    Export
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs Section */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="analysis" className="gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Analysis
                        </TabsTrigger>
                        <TabsTrigger value="moulding" className="gap-2">
                            <Package className="h-4 w-4" />
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
                        {/* Summary Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            <Card className="border-l-4 border-green-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        Moulding Production
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Lots</span>
                                            <span className="font-bold">{summary.total_lots}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Quantity</span>
                                            <span className="font-bold">{summary.total_qty.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-2 border-t">
                                            <p className="text-xs text-muted-foreground">Production Value</p>
                                            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_value)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-orange-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Lot Rejection
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Rejection %</span>
                                            <span className="font-bold">-</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Rejected Qty</span>
                                            <span className="font-bold">-</span>
                                        </div>
                                        <div className="pt-2 border-t">
                                            <p className="text-xs text-muted-foreground">Rejection Cost</p>
                                            <p className="text-2xl font-bold text-orange-600">₹0</p>
                                            <p className="text-xs text-muted-foreground mt-1">Phase 2</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-amber-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <TrendingDown className="h-4 w-4" />
                                        Incoming Inspection
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Cutmark</span>
                                            <span className="font-bold">-</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">RBS/Impression</span>
                                            <span className="font-bold">-</span>
                                        </div>
                                        <div className="pt-2 border-t">
                                            <p className="text-xs text-muted-foreground">DF Vendor Cost</p>
                                            <p className="text-2xl font-bold text-amber-600">₹0</p>
                                            <p className="text-xs text-muted-foreground mt-1">Phase 3</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-red-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        Final Inspection
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Over Trim</span>
                                            <span className="font-bold">-</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Under Fill</span>
                                            <span className="font-bold">-</span>
                                        </div>
                                        <div className="pt-2 border-t">
                                            <p className="text-xs text-muted-foreground">FVI Cost</p>
                                            <p className="text-2xl font-bold text-red-600">₹0</p>
                                            <p className="text-xs text-muted-foreground mt-1">Phase 4</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Overall Summary */}
                        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
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
                                        <p className="text-3xl font-bold text-green-600">{formatCurrency(summary.total_value)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Total Rejection Cost</p>
                                        <p className="text-3xl font-bold text-red-600">₹0</p>
                                        <p className="text-xs text-muted-foreground">Phases 2-4</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Net Value</p>
                                        <p className="text-3xl font-bold text-blue-600">{formatCurrency(summary.total_value)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Cost of Poor Quality</p>
                                        <p className="text-3xl font-bold text-orange-600">0%</p>
                                        <p className="text-xs text-muted-foreground">Rejection / Production</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Info Card */}
                        <Card>
                            <CardContent className="py-6">
                                <div className="text-center">
                                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-primary opacity-20" />
                                    <h3 className="font-semibold mb-2">Comprehensive Cost Analysis</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        This tab provides an overview of all cost stages. As you implement phases 2-4,
                                        this will show detailed charts and trends for rejection costs across all inspection stages.
                                    </p>
                                    <div className="grid grid-cols-4 gap-4 text-left mt-6">
                                        <div className="p-3 bg-green-50 rounded-lg">
                                            <p className="text-xs font-semibold text-green-700">✓ Phase 1: Moulding</p>
                                            <p className="text-xs text-muted-foreground mt-1">Production value tracking</p>
                                        </div>
                                        <div className="p-3 bg-orange-50 rounded-lg">
                                            <p className="text-xs font-semibold text-orange-700">⏳ Phase 2: Lot Rejection</p>
                                            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
                                        </div>
                                        <div className="p-3 bg-amber-50 rounded-lg">
                                            <p className="text-xs font-semibold text-amber-700">⏳ Phase 3: Incoming</p>
                                            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
                                        </div>
                                        <div className="p-3 bg-red-50 rounded-lg">
                                            <p className="text-xs font-semibold text-red-700">⏳ Phase 4: FVI</p>
                                            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Moulding Tab */}
                    <TabsContent value="moulding" className="space-y-4">
                        {/* Metrics Row */}
                        <div className="grid grid-cols-5 gap-3">
                            <MetricCard
                                label="Total Lots"
                                value={summary.total_lots}
                                loading={loading}
                                icon={Package}
                            />
                            <MetricCard
                                label="Total Quantity"
                                value={summary.total_qty.toLocaleString()}
                                loading={loading}
                            />
                            <MetricCard
                                label="Production Value"
                                value={formatCurrency(summary.total_value)}
                                loading={loading}
                                icon={TrendingUp}
                            />
                            <MetricCard
                                label="Rejection Cost"
                                value="₹0"
                                loading={false}
                            />
                            <MetricCard
                                label="Net Value"
                                value={formatCurrency(summary.total_value)}
                                loading={loading}
                            />
                        </div>

                        {/* Data Table */}
                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-lg">Production Records</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-2">
                                        {[...Array(5)].map((_, i) => (
                                            <Skeleton key={i} className="h-12 w-full" />
                                        ))}
                                    </div>
                                ) : productionData.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>No production data found for selected period</p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[110px]">Lot No</TableHead>
                                                    <TableHead>Work Plan</TableHead>
                                                    <TableHead>Planned Date</TableHead>
                                                    <TableHead>Moulded Date</TableHead>
                                                    <TableHead>Item Code</TableHead>
                                                    <TableHead className="text-right">Qty (Nos)</TableHead>
                                                    <TableHead className="text-right">Rate (₹)</TableHead>
                                                    <TableHead className="text-right">Value (₹)</TableHead>
                                                    <TableHead>Operator</TableHead>
                                                    <TableHead>Machine</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {productionData.map((row) => (
                                                    <TableRow key={row.mpe_name}>
                                                        <TableCell className="font-mono font-medium text-sm">{row.lot_no}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{row.work_plan || '-'}</TableCell>
                                                        <TableCell className="text-sm">
                                                            {row.planned_date ? formatDate(row.planned_date) : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-sm">{formatDate(row.moulding_date)}</TableCell>
                                                        <TableCell className="text-sm">{row.item_code}</TableCell>
                                                        <TableCell className="text-right font-medium">{row.production_qty_nos}</TableCell>
                                                        <TableCell className="text-right text-sm text-muted-foreground">
                                                            {row.item_rate?.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-green-700">
                                                            {formatCurrency(row.production_value)}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{row.operator_name}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{row.machine_name}</TableCell>
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
                        <Card>
                            <CardContent className="py-8">
                                <div className="text-center">
                                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                    <h3 className="font-semibold mb-2">Lot Rejection Data - Coming Soon</h3>
                                    <p className="text-sm text-muted-foreground">Phase 2 will include lot rejection cost analysis</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Incoming Tab */}
                    <TabsContent value="incoming" className="space-y-4">
                        <Card>
                            <CardContent className="py-8">
                                <div className="text-center">
                                    <TrendingDown className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                    <h3 className="font-semibold mb-2">Incoming Inspection Data - Coming Soon</h3>
                                    <p className="text-sm text-muted-foreground">Phase 3 will include incoming inspection cost analysis</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* FVI Tab */}
                    <TabsContent value="fvi" className="space-y-4">
                        <Card>
                            <CardContent className="py-8">
                                <div className="text-center">
                                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                    <h3 className="font-semibold mb-2">Final Inspection Data - Coming Soon</h3>
                                    <p className="text-sm text-muted-foreground">Phase 4 will include final inspection cost analysis</p>
                                </div>
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
