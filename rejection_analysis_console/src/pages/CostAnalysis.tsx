import { useState, useContext, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FrappeContext } from 'frappe-react-sdk'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, Package, AlertCircle, IndianRupee, Target, Award, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts'

interface CostData {
    period: string
    total_cost: number
    total_rejected_qty: number
    items: Array<{
        item_code: string
        rejected_qty: number
        unit_cost: number
        total_cost: number
    }>
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

function CostAnalysisPage() {
    const { call } = useContext(FrappeContext) as any
    const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '6m' | 'ytd'>('30d')
    const [costData, setCostData] = useState<CostData[]>([])
    const [loading, setLoading] = useState(false)

    // Calculated metrics
    const [totalCost, setTotalCost] = useState(0)
    const [totalRejectedQty, setTotalRejectedQty] = useState(0)
    const [avgDailyCost, setAvgDailyCost] = useState(0)
    const [costTrend, setCostTrend] = useState<'up' | 'down' | 'stable'>('stable')
    const [trendPercentage, setTrendPercentage] = useState(0)

    useEffect(() => {
        fetchCostData()
    }, [period])

    const fetchCostData = async () => {
        setLoading(true)
        try {
            const result = await call.post('rejection_analysis.api.get_cost_impact_analysis', {
                period,
                end_date: new Date().toISOString().split('T')[0]
            })

            const data = result?.message || result || []
            setCostData(data)

            // Calculate metrics
            const totalCostSum = data.reduce((sum: number, item: CostData) => sum + (item.total_cost || 0), 0)
            const totalQtySum = data.reduce((sum: number, item: CostData) => sum + (item.total_rejected_qty || 0), 0)
            const avgDaily = data.length > 0 ? totalCostSum / data.length : 0

            setTotalCost(totalCostSum)
            setTotalRejectedQty(totalQtySum)
            setAvgDailyCost(avgDaily)

            // Calculate trend (compare last 30% vs first 30%)
            if (data.length >= 3) {
                const third = Math.floor(data.length / 3)
                const recentCost = data.slice(-third).reduce((sum: number, item: CostData) => sum + item.total_cost, 0) / third
                const oldCost = data.slice(0, third).reduce((sum: number, item: CostData) => sum + item.total_cost, 0) / third

                if (oldCost > 0) {
                    const change = ((recentCost - oldCost) / oldCost) * 100
                    setTrendPercentage(Math.abs(change))
                    setCostTrend(change > 5 ? 'up' : change < -5 ? 'down' : 'stable')
                }
            }
        } catch (error) {
            console.error('Error fetching cost data:', error)
            setCostData([])
            setTotalCost(0)
            setTotalRejectedQty(0)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value)
    }

    // Get top 5 items by cost
    const topItems = costData
        .flatMap(period => period.items)
        .reduce((acc, item) => {
            const existing = acc.find(i => i.item_code === item.item_code)
            if (existing) {
                existing.rejected_qty += item.rejected_qty
                existing.total_cost += item.total_cost
            } else {
                acc.push({ ...item })
            }
            return acc
        }, [] as any[])
        .sort((a, b) => b.total_cost - a.total_cost)
        .slice(0, 5)

    // Prepare data for pie chart
    const pieData = topItems.map(item => ({
        name: item.item_code,
        value: item.total_cost
    }))

    // Add "Others" category
    const topItemsCost = topItems.reduce((sum, item) => sum + item.total_cost, 0)
    if (totalCost > topItemsCost) {
        pieData.push({
            name: 'Others',
            value: totalCost - topItemsCost
        })
    }

    const periodOptions = [
        { value: '7d', label: 'Last 7 Days' },
        { value: '30d', label: 'Last 30 Days' },
        { value: '3m', label: 'Last 3 Months' },
        { value: '6m', label: 'Last 6 Months' },
        { value: 'ytd', label: 'Year to Date' }
    ]

    return (
        <DashboardLayout>
            <SiteHeader />
            <div className="space-y-6 p-8 bg-gradient-to-br from-background to-muted/20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <IndianRupee className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Cost Impact Analysis</h1>
                                <p className="text-muted-foreground mt-1">
                                    Financial impact of quality rejections
                                </p>
                            </div>
                        </div>
                    </div>

                    <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {periodOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Total Cost */}
                    <Card className="border-l-4 border-l-red-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost Impact</CardTitle>
                            <DollarSign className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-10 w-32" />
                            ) : (
                                <>
                                    <div className="text-3xl font-bold text-red-600">{formatCurrency(totalCost)}</div>
                                    <div className="flex items-center gap-2 mt-2">
                                        {costTrend === 'up' && (
                                            <>
                                                <TrendingUp className="h-3 w-3 text-red-500" />
                                                <span className="text-xs text-red-500 font-medium">+{trendPercentage.toFixed(1)}%</span>
                                            </>
                                        )}
                                        {costTrend === 'down' && (
                                            <>
                                                <TrendingDown className="h-3 w-3 text-green-500" />
                                                <span className="text-xs text-green-500 font-medium">-{trendPercentage.toFixed(1)}%</span>
                                            </>
                                        )}
                                        {costTrend === 'stable' && (
                                            <span className="text-xs text-muted-foreground">Stable</span>
                                        )}
                                        <span className="text-xs text-muted-foreground">vs previous period</span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Total Rejected Qty */}
                    <Card className="border-l-4 border-l-orange-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rejections</CardTitle>
                            <Package className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-10 w-24" />
                            ) : (
                                <>
                                    <div className="text-3xl font-bold">{totalRejectedQty.toLocaleString()}</div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Units rejected in period
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Avg Daily Cost */}
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Daily Cost</CardTitle>
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-10 w-24" />
                            ) : (
                                <>
                                    <div className="text-3xl font-bold text-blue-600">{formatCurrency(avgDailyCost)}</div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Average loss per day
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Avg Cost per Unit */}
                    <Card className="border-l-4 border-l-purple-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Cost per Rejection</CardTitle>
                            <Target className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-10 w-24" />
                            ) : (
                                <>
                                    <div className="text-3xl font-bold text-purple-600">
                                        {totalRejectedQty > 0 ? formatCurrency(totalCost / totalRejectedQty) : formatCurrency(0)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Avg cost per rejected unit
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row */}
                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Cost Trend Chart (2/3 width) */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Cost Trend Over Time
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-[350px] w-full" />
                            ) : costData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                                    <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No Cost Data Available</p>
                                    <p className="text-sm mt-2">Configure item pricing to enable cost analysis</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={350}>
                                    <AreaChart data={costData}>
                                        <defs>
                                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis
                                            dataKey="period"
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(value) => {
                                                const date = new Date(value)
                                                return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                            }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                                            formatter={(value: any, name: string) => {
                                                if (name === 'Cost Impact') return [formatCurrency(value), name]
                                                return [value.toLocaleString() + ' units', name]
                                            }}
                                            labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        />
                                        <Legend />
                                        <Area
                                            type="monotone"
                                            dataKey="total_cost"
                                            stroke="#ef4444"
                                            strokeWidth={2}
                                            fill="url(#colorCost)"
                                            name="Cost Impact"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="total_rejected_qty"
                                            stroke="#f59e0b"
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            name="Rejected Qty"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Items Pie Chart (1/3 width) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5" />
                                Top Cost Drivers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-[350px] w-full" />
                            ) : pieData.length === 0 ? (
                                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                                    <AlertCircle className="h-8 w-8" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                                label={(entry) => `${((entry.value / totalCost) * 100).toFixed(0)}%`}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: any) => formatCurrency(value)}
                                                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-2">
                                        {pieData.slice(0, 6).map((item, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                    />
                                                    <span className="font-medium">{item.name}</span>
                                                </div>
                                                <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Tables Row */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Top Cost Items Table */}
                    {!loading && costData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    Highest Cost Items
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {topItems.slice(0, 10).map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{item.item_code}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.rejected_qty.toLocaleString()} units @ {formatCurrency(item.unit_cost)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-red-600">{formatCurrency(item.total_cost)}</div>
                                                <Badge variant="outline" className="mt-1">
                                                    {((item.total_cost / totalCost) * 100).toFixed(1)}%
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Period Breakdown Table */}
                    {!loading && costData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Period Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {[...costData]
                                        .sort((a, b) => b.period.localeCompare(a.period))
                                        .map((day, index) => {
                                            const avgCost = day.total_rejected_qty > 0
                                                ? day.total_cost / day.total_rejected_qty
                                                : 0
                                            return (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-medium">
                                                            {new Date(day.period).toLocaleDateString('en-IN', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {day.total_rejected_qty.toLocaleString()} units • {day.items.length} items
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold">{formatCurrency(day.total_cost)}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {formatCurrency(avgCost)}/unit
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </DashboardLayout >
    )
}

export function Component() {
    return <CostAnalysisPage />
}
