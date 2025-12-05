import { useState, useContext, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FrappeContext } from 'frappe-react-sdk'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, TrendingUp, Package, AlertCircle } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts'

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

function CostAnalysisPage() {
    const { call } = useContext(FrappeContext) as any
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
    const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily')
    const [costData, setCostData] = useState<CostData[]>([])
    const [loading, setLoading] = useState(false)
    const [totalCost, setTotalCost] = useState(0)
    const [totalRejectedQty, setTotalRejectedQty] = useState(0)

    useEffect(() => {
        fetchCostData()
    }, [selectedMonth, viewMode])

    const fetchCostData = async () => {
        setLoading(true)
        try {
            // Calculate period based on selected month and view mode
            const [year, month] = selectedMonth.split('-')
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
            const endDate = new Date(parseInt(year), parseInt(month), 0) // Last day of month

            const result = await call.post('rejection_analysis.api.get_cost_impact_analysis', {
                period: viewMode === 'daily' ? '30d' : '6m',
                end_date: endDate.toISOString().split('T')[0]
            })

            const data = result?.message || result || []

            // Filter data to only show selected month
            const filteredData = data.filter((item: CostData) => {
                return item.period.startsWith(selectedMonth)
            })

            setCostData(filteredData)

            // Calculate totals from new API format
            const totalCostSum = filteredData.reduce((sum: number, item: CostData) => sum + (item.total_cost || 0), 0)
            const totalQtySum = filteredData.reduce((sum: number, item: CostData) => sum + (item.total_rejected_qty || 0), 0)

            setTotalCost(totalCostSum)
            setTotalRejectedQty(totalQtySum)
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

    // Generate month options (last 6 months)
    const monthOptions = Array.from({ length: 6 }, (_, i) => {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        return {
            value: date.toISOString().slice(0, 7),
            label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
    })

    return (
        <DashboardLayout>
            <SiteHeader />
            <div className="space-y-6 p-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Cost Analysis</h1>
                        <p className="text-muted-foreground mt-2">
                            Financial impact of quality rejections
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {/* Month Selector */}
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* View Mode Selector */}
                        <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Daily View</SelectItem>
                                <SelectItem value="weekly">Weekly View</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Cost Impact</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-8 w-32" />
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Total estimated loss
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Rejected Qty</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">{totalRejectedQty.toLocaleString()}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Units rejected
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Cost per Unit</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">
                                        {totalRejectedQty > 0 ? formatCurrency(totalCost / totalRejectedQty) : formatCurrency(0)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Average loss per rejection
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Cost Trend Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Cost Impact Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : costData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                                <p className="text-lg font-medium">Cost Analysis Not Configured</p>
                                <p className="text-sm mt-2">Please provide item pricing information to enable cost calculations</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <ComposedChart data={costData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" />
                                    <YAxis yAxisId="left" />
                                    <YAxis yAxisId="right" orientation="right" />
                                    <Tooltip
                                        formatter={(value: any, name: string) => {
                                            if (name === 'total_cost') return formatCurrency(value)
                                            return value
                                        }}
                                    />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="total_rejected_qty" fill="#ef4444" name="Rejected Qty" />
                                    <Line yAxisId="right" type="monotone" dataKey="total_cost" stroke="#f59e0b" strokeWidth={2} name="Cost Impact" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Daily/Weekly Breakdown Table */}
                {!loading && costData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{viewMode === 'daily' ? 'Daily' : 'Weekly'} Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-2 font-medium">Date</th>
                                            <th className="text-right p-2 font-medium">Items</th>
                                            <th className="text-right p-2 font-medium">Rejected Qty</th>
                                            <th className="text-right p-2 font-medium">Total Cost</th>
                                            <th className="text-right p-2 font-medium">Avg Cost/Unit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...costData]
                                            .sort((a, b) => b.period.localeCompare(a.period))
                                            .map((day, index) => {
                                                const avgCost = day.total_rejected_qty > 0
                                                    ? day.total_cost / day.total_rejected_qty
                                                    : 0
                                                return (
                                                    <tr key={index} className="border-b hover:bg-muted/50">
                                                        <td className="p-2 font-medium">
                                                            {new Date(day.period).toLocaleDateString('en-IN', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </td>
                                                        <td className="text-right p-2">{day.items.length}</td>
                                                        <td className="text-right p-2">{day.total_rejected_qty.toLocaleString()}</td>
                                                        <td className="text-right p-2 font-medium">{formatCurrency(day.total_cost)}</td>
                                                        <td className="text-right p-2">{formatCurrency(avgCost)}</td>
                                                    </tr>
                                                )
                                            })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 font-bold">
                                            <td className="p-2">Total</td>
                                            <td className="text-right p-2">-</td>
                                            <td className="text-right p-2">{totalRejectedQty.toLocaleString()}</td>
                                            <td className="text-right p-2">{formatCurrency(totalCost)}</td>
                                            <td className="text-right p-2">
                                                {formatCurrency(totalRejectedQty > 0 ? totalCost / totalRejectedQty : 0)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Top Cost Items Table */}
                {!loading && costData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Cost Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-2 font-medium">Item Code</th>
                                            <th className="text-right p-2 font-medium">Rejected Qty</th>
                                            <th className="text-right p-2 font-medium">Unit Cost</th>
                                            <th className="text-right p-2 font-medium">Total Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {costData
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
                                            .slice(0, 15)
                                            .map((item, index) => (
                                                <tr key={index} className="border-b hover:bg-muted/50">
                                                    <td className="p-2">{item.item_code}</td>
                                                    <td className="text-right p-2">{item.rejected_qty.toLocaleString()}</td>
                                                    <td className="text-right p-2">{formatCurrency(item.unit_cost)}</td>
                                                    <td className="text-right p-2 font-medium">{formatCurrency(item.total_cost)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    )
}

export function Component() {
    return <CostAnalysisPage />
}
