import { useState, useMemo, useContext, useEffect } from 'react'
import { exportToCSV } from '@/utils/export-csv'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FrappeContext } from 'frappe-react-sdk'
import {
    Calendar,
    Download,
    Activity,
    Zap,
    Percent,
    TrendingUp,
    Package,
    TrendingDown,
    Info,
    BarChart3,
    AlertCircle,
    RefreshCw
} from 'lucide-react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Bar,
    ComposedChart
} from 'recharts'
import { toast } from 'sonner'

interface MetaReportData {
    date: string
    oee_pct: number
    capacity_utilisation_pct: number
    rejection_pct: number
    planned_qty: number
    produced_qty: number
    efficiency_pct: number
    utilisation_hours: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg text-xs">
                <p className="font-bold mb-1 border-bottom pb-1 border-slate-50">
                    {new Date(label).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <span style={{ color: entry.color }} className="font-medium">{entry.name}:</span>
                            <span className="font-mono">{entry.value}{entry.unit || ''}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }
    return null
}

export default function MetaReport() {
    const { call } = useContext(FrappeContext) as any
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })
    const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
    const [trendData, setTrendData] = useState<MetaReportData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await call.get('rejection_analysis.rejection_analysis.api.get_meta_report_trend', {
                from_date: fromDate,
                to_date: toDate
            })

            // Frappe whitelisted functions return data in 'message' or top level depending on usage
            const data = result?.message || result

            if (Array.isArray(data)) {
                setTrendData(data)
            } else {
                console.warn('Unexpected data format for Meta Report:', data)
                setTrendData([])
                if (data && typeof data === 'object' && 'error' in data) {
                    setError(String(data.error))
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch meta report data:', err)
            setError(err.message || 'Failed to connect to server')
            toast.error('Could not load report data')
            setTrendData([])
        } finally {
            setIsLoading(false)
        }
    }

    const handleExport = () => {
        if (!trendData || trendData.length === 0) return
        exportToCSV(trendData, 'meta_report_trend.csv', {
            date: 'Date',
            oee_pct: 'OEE %',
            capacity_utilisation_pct: 'Capacity Utilisation %',
            rejection_pct: 'Rejection %',
            planned_qty: 'Planned Qty (Lifts)',
            produced_qty: 'Produced Qty (Lifts)',
            efficiency_pct: 'Prod Efficiency %',
            utilisation_hours: 'Utilisation Hours'
        })
    }

    const averages = useMemo(() => {
        if (!Array.isArray(trendData) || trendData.length === 0) return null
        const count = trendData.length
        return {
            avg_oee: (trendData.reduce((acc, curr) => acc + (curr.oee_pct || 0), 0) / count).toFixed(2),
            avg_utilisation: (trendData.reduce((acc, curr) => acc + (curr.capacity_utilisation_pct || 0), 0) / count).toFixed(2),
            avg_rejection: (trendData.reduce((acc, curr) => acc + (curr.rejection_pct || 0), 0) / count).toFixed(2),
            total_planned: trendData.reduce((acc, curr) => acc + (curr.planned_qty || 0), 0).toFixed(0),
            total_produced: trendData.reduce((acc, curr) => acc + (curr.produced_qty || 0), 0).toFixed(0),
        }
    }, [trendData])

    return (
        <DashboardLayout>
            <div className="flex-1 space-y-4 p-4 pt-4">
                <SiteHeader
                    title="Meta Report"
                    description="Consolidated OEE, Capacity & Rejection Analytics"
                    actions={
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExport} disabled={!trendData.length || isLoading}>
                                <Download className="mr-2 h-4 w-4" />
                                Export Trend
                            </Button>
                        </div>
                    }
                />

                <Card className="border-none shadow-sm bg-muted/20">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-end gap-6 text-sm">
                            <div className="grid gap-2">
                                <Label htmlFor="from_date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Period</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="from_date"
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="pl-10 w-[200px] h-9"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="to_date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Period</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="to_date"
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="pl-10 w-[200px] h-9"
                                    />
                                </div>
                            </div>
                            <Button onClick={fetchData} disabled={isLoading} className="h-9 px-6">
                                {isLoading ? (
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Activity className="mr-2 h-4 w-4" />
                                )}
                                Get Analytics
                            </Button>
                            {error && (
                                <div className="flex items-center text-xs text-red-600 gap-1.5 pb-2 ml-auto bg-red-50 px-3 py-1 rounded border border-red-100">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {error}
                                </div>
                            )}
                            {!error && (
                                <div className="flex items-center text-xs text-muted-foreground gap-1.5 pb-2 ml-auto">
                                    <Info className="h-3.5 w-3.5" />
                                    Data sourced from OEE Dashboard & Inspection Entries
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-l-4 border-l-yellow-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">Target OEE</CardTitle>
                            <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-200 bg-yellow-50">85% Goal</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold tracking-tight">
                                {isLoading ? <Skeleton className="h-10 w-24" /> : `${averages?.avg_oee || '0.00'}%`}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <Zap className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                <span className="text-[11px] text-muted-foreground font-medium">Average OEE for selection</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">Capacity Util</CardTitle>
                            <Activity className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold tracking-tight">
                                {isLoading ? <Skeleton className="h-10 w-24" /> : `${averages?.avg_utilisation || '0.00'}%`}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium mt-1">Based on 19 presses / 24hrs</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-red-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">Lot Rejection</CardTitle>
                            <Percent className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold tracking-tight ${(averages?.avg_rejection && parseFloat(averages.avg_rejection) > 5) ? 'text-red-600' : ''}`}>
                                {isLoading ? <Skeleton className="h-10 w-24" /> : `${averages?.avg_rejection || '0.00'}%`}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium mt-1">Weighted average rejection</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">Planned Output</CardTitle>
                            <Package className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold tracking-tight">
                                {isLoading ? <Skeleton className="h-10 w-32" /> : `${averages?.total_produced || '0'} / ${averages?.total_planned || '0'}`}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium mt-1">Total pieces (Lifts) vs Plan</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-12">
                    <Card className="lg:col-span-8 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Key Performance Indicators</CardTitle>
                                <CardDescription>Daily trend analysis for OEE, Utilisation and Quality</CardDescription>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-medium uppercase text-muted-foreground">
                                <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-yellow-500 block"></span> OEE</div>
                                <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 block"></span> Util</div>
                                <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-500 block"></span> Rej</div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[420px] pt-4">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Activity className="h-8 w-8 text-primary animate-pulse" />
                                </div>
                            ) : trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="date"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                        />
                                        <YAxis
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            unit="%"
                                            domain={[0, 100]}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line
                                            type="monotone"
                                            dataKey="oee_pct"
                                            name="OEE"
                                            stroke="#eab308"
                                            strokeWidth={3}
                                            strokeLinecap="round"
                                            dot={{ r: 4, fill: '#eab308', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                            unit="%"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="capacity_utilisation_pct"
                                            name="Utilisation"
                                            stroke="#3b82f6"
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                            dot={{ r: 3.5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                            unit="%"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="rejection_pct"
                                            name="Rej %"
                                            stroke="#ef4444"
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                            dot={{ r: 3.5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                                            unit="%"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground opacity-50">
                                    <Activity className="h-10 w-10" />
                                    <p className="text-sm">No data to display in chart</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-4 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Production Lifts</CardTitle>
                            <CardDescription>Daily Planned vs Produced</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[420px] pt-4">
                            {isLoading ? (
                                <Skeleton className="h-full w-full rounded-lg" />
                            ) : trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="date"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                        />
                                        <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="planned_qty" name="Planned" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={24} />
                                        <Bar dataKey="produced_qty" name="Produced" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={24} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground opacity-50">
                                    <BarChart3 className="h-10 w-10" />
                                    <p className="text-sm">No production data</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Daily Performance Matrix</CardTitle>
                                <CardDescription>Detailed daily metrics for the selected period</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[200px] font-bold text-slate-700">Production Date</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700">OEE %</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700">Utilisation %</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700">Lots Rejection %</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700">Planned (Lifts)</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700">Produced (Lifts)</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700">Efficiency %</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : trendData.length > 0 ? (
                                    [...trendData].reverse().map((row) => {
                                        const oeeColor = row.oee_pct >= 85 ? 'bg-green-100 text-green-700' :
                                            row.oee_pct >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                        return (
                                            <TableRow key={row.date} className="hover:bg-muted/20 border-b">
                                                <TableCell className="font-semibold py-4">
                                                    <div className="flex flex-col">
                                                        <span>{new Date(row.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase font-normal">{new Date(row.date).toLocaleDateString(undefined, { weekday: 'long' })}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="outline" className={`${oeeColor} border-none font-bold text-sm px-3 py-1`}>
                                                        {row.oee_pct || '0'}%
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-medium text-blue-600">{row.capacity_utilisation_pct || '0'}%</TableCell>
                                                <TableCell className={`text-right font-mono font-medium ${(row.rejection_pct || 0) > 5 ? 'text-red-600' : ''}`}>
                                                    {row.rejection_pct || '0'}%
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-slate-500">{row.planned_qty || '0'}</TableCell>
                                                <TableCell className="text-right font-mono text-slate-700 font-semibold">{row.produced_qty || '0'}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${(row.efficiency_pct || 0) >= 95 ? 'bg-green-500' : (row.efficiency_pct || 0) >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                                        <span className="font-mono font-bold text-slate-700">{row.efficiency_pct || '0'}%</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-20 bg-muted/5">
                                            <div className="flex flex-col items-center gap-2">
                                                <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
                                                <p className="text-muted-foreground text-sm">No analytics available for the selected period.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}

export const Component = MetaReport
