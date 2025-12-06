import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar as CalendarIcon, Package, TrendingUp } from 'lucide-react'
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
    cavities: number
    total_pieces: number
    operator_name: string
    machine_name: string
}

interface SummaryData {
    total_lots: number
    total_qty: number
    total_value: number
}

function CostAnalysisPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [period, setPeriod] = useState<string>('daily')
    const [loading, setLoading] = useState(false)
    const [productionData, setProductionData] = useState<ProductionData[]>([])
    const [summary, setSummary] = useState<SummaryData>({ total_lots: 0, total_qty: 0, total_value: 0 })

    const fetchData = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/method/rejection_analysis.rejection_analysis.cost_analysis_api.get_production_data_phase1', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filters: {
                        period: period,
                        date: format(selectedDate, 'yyyy-MM-dd')
                    }
                })
            })

            const data = await response.json()

            if (data.message) {
                setProductionData(data.message.production_data || [])
                setSummary(data.message.summary || { total_lots: 0, total_qty: 0, total_value: 0 })
            }
        } catch (error) {
            console.error('API Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(value)
    }

    return (
        <DashboardLayout>
            <SiteHeader />
            <div className="flex flex-1 flex-col gap-4 p-4 bg-muted/30">
                {/* Header */}
                <Card className="border-2 shadow-sm">
                    <CardContent className="py-2 px-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Cost Analysis - Phase 1</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Production data and values based on Work Planning
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Total Production Value</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(summary.total_value)}</p>
                                </div>
                                <Badge variant="secondary" className="text-sm h-fit">
                                    {summary.total_lots} Lots
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Filters */}
                <Card className="border shadow-sm">
                    <CardContent className="py-2 px-4">
                        <div className="flex items-center gap-4">
                            {/* Period Selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Period:</span>
                                <Select value={period} onValueChange={setPeriod}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly (Last 7 Days)</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="6months">Last 6 Months</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date Picker */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Date:</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {format(selectedDate, 'PPP')}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <Button onClick={fetchData} disabled={loading}>
                                {loading ? 'Loading...' : 'Load Data'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Lots</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_lots}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_qty.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Nos</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Production Value</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_value)}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Production Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Production Data
                        </CardTitle>
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
                                No production data found. Select period and click "Load Data".
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Lot No</TableHead>
                                            <TableHead>Work Plan</TableHead>
                                            <TableHead>Planned Date</TableHead>
                                            <TableHead>Moulding Date</TableHead>
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
                                                    {row.planned_date ? format(new Date(row.planned_date), 'dd-MMM-yy') : '-'}
                                                </TableCell>
                                                <TableCell className="text-sm">{format(new Date(row.moulding_date), 'dd-MMM-yy')}</TableCell>
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
            </div>
        </DashboardLayout>
    )
}

export const Component = CostAnalysisPage
export default CostAnalysisPage
