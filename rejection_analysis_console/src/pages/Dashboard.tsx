import { useState, useContext, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FrappeContext } from 'frappe-react-sdk'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  FileText,
  AlertCircle,
  Activity
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DashboardMetrics {
  total_lots_inspected: number
  total_rejected_qty: number
  average_rejection_rate: number
  lots_exceeding_threshold: number
  total_cars_generated: number
  pending_cars: number
  critical_alerts: number
  trend_direction: 'up' | 'down' | 'stable'
  trend_percentage: number
}

interface RejectionTrendData {
  date: string
  rejection_rate: number
  lots_inspected: number
}

interface DefectTypeData {
  defect_type: string
  count: number
  percentage: number
}

interface StageRejectionData {
  stage: string
  rejection_rate: number
  color: string
}

function DashboardPage() {
  const { call } = useContext(FrappeContext) as any
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [trendData, setTrendData] = useState<RejectionTrendData[]>([])
  const [defectData, setDefectData] = useState<DefectTypeData[]>([])
  const [stageData, setStageData] = useState<StageRejectionData[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [selectedDate])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch all dashboard data in parallel
      const [metricsResult, trendResult, defectsResult, stagesResult] = await Promise.all([
        fetchMetrics(),
        fetchTrendData(),
        fetchDefectTypes(),
        fetchStageRejections()
      ])

      console.log('Dashboard Data Loaded:', {
        metrics: metricsResult,
        trendCount: trendResult.length,
        trendSample: trendResult[0],
        defectCount: defectsResult.length,
        stageCount: stagesResult.length
      })
      setMetrics(metricsResult)
      setTrendData(trendResult)
      setDefectData(defectsResult)
      setStageData(stagesResult)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      // Fetch real metrics from API for selected date
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const result = await call.post('rejection_analysis.api.get_dashboard_metrics', {
        date: dateStr,
        inspection_type: 'Lot Inspection'
      })

      const data = result?.message || result

      return {
        total_lots_inspected: data?.total_lots || 0,
        total_rejected_qty: data?.total_rejected_qty || 0,
        average_rejection_rate: data?.avg_rejection || 0,
        lots_exceeding_threshold: data?.lots_exceeding_threshold || 0,
        total_cars_generated: 0, // Will add API later
        pending_cars: 0, // Will add API later
        critical_alerts: data?.lots_exceeding_threshold || 0,
        trend_direction: (data?.avg_rejection || 0) < 5.0 ? 'down' as const : 'up' as const,
        trend_percentage: Math.abs(5.0 - (data?.avg_rejection || 0))
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
      return {
        total_lots_inspected: 0,
        total_rejected_qty: 0,
        average_rejection_rate: 0,
        lots_exceeding_threshold: 0,
        total_cars_generated: 0,
        pending_cars: 0,
        critical_alerts: 0,
        trend_direction: 'stable' as const,
        trend_percentage: 0
      }
    }
  }

  const fetchTrendData = async () => {
    try {
      // Fetch real trend data - last 6 months
      const result = await call.post('rejection_analysis.api.get_rejection_trend_chart', {
        months: 6
      })

      const data = result?.message || result || []

      // Transform and reverse to show oldest to newest
      return data.reverse().map((item: any) => ({
        date: item.month,
        patrol: item.patrol,
        line: item.line,
        lot: item.lot,
        incoming: item.incoming
      }))
    } catch (error) {
      console.error('Error fetching trend data:', error)
      return []
    }
  }

  const fetchDefectTypes = async () => {
    try {
      // Fetch real defect distribution - last 30 days
      const result = await call.post('rejection_analysis.api.get_defect_distribution_chart', {
        days: 30
      })

      const data = result?.message || result || []

      return data.map((item: any) => ({
        defect_type: item.defect_type,
        count: item.total_rejected_qty,
        percentage: item.percentage
      }))
    } catch (error) {
      console.error('Error fetching defect types:', error)
      return []
    }
  }

  const fetchStageRejections = async () => {
    try {
      // Fetch real stage rejection data for selected date
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const result = await call.post('rejection_analysis.api.get_stage_rejection_chart', {
        date: dateStr
      })

      const data = result?.message || result || []

      return data.map((item: any) => ({
        stage: item.stage,
        rejection_rate: item.rejection_rate,
        color: item.color
      }))
    } catch (error) {
      console.error('Error fetching stage rejections:', error)
      return []
    }
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

  return (
    <DashboardLayout>
      <SiteHeader />
      <div className="space-y-8 p-8">
        {/* Header with Date Picker */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Business critical metrics and insights
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[240px] justify-start text-left font-normal',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Lots Inspected */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Lots Inspected</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{metrics?.total_lots_inspected.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics?.total_rejected_qty.toLocaleString()} units rejected
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Average Rejection Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rejection Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{metrics?.average_rejection_rate.toFixed(2)}%</div>
                  <div className="flex items-center text-xs mt-1">
                    {metrics?.trend_direction === 'down' ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-green-600 mr-1" />
                        <span className="text-green-600">-{metrics?.trend_percentage}% from yesterday</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-3 w-3 text-red-600 mr-1" />
                        <span className="text-red-600">+{metrics?.trend_percentage}% from yesterday</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Critical Lots */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Lots</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600">{metrics?.lots_exceeding_threshold}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exceeding 5.0% threshold
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* CARs Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CARs Status</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold">{metrics?.pending_cars}</div>
                    <span className="text-sm text-muted-foreground">/ {metrics?.total_cars_generated}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pending / Total generated
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-4 md:grid-cols-7">
          {/* Rejection Trend - Wider */}
          <Card className="col-span-7 lg:col-span-4">
            <CardHeader>
              <CardTitle>6-Month Rejection Trend</CardTitle>
              <CardDescription>Monthly average rejection rate by inspection stage</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorPatrol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLot" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" label={{ value: 'Rejection %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="patrol"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorPatrol)"
                      name="Patrol (%)"
                    />
                    <Area
                      type="monotone"
                      dataKey="line"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#colorLine)"
                      name="Line (%)"
                    />
                    <Area
                      type="monotone"
                      dataKey="lot"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorLot)"
                      name="Lot (%)"
                    />
                    <Area
                      type="monotone"
                      dataKey="incoming"
                      stroke="#f59e0b"
                      fillOpacity={1}
                      fill="url(#colorIncoming)"
                      name="Incoming (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Defect Types - Pie Chart */}
          <Card className="col-span-7 lg:col-span-3">
            <CardHeader>
              <CardTitle>Top Defect Types</CardTitle>
              <CardDescription>Distribution of rejection reasons</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={defectData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.defect_type}: ${entry.percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {defectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Rejection by Stage */}
          <Card>
            <CardHeader>
              <CardTitle>Rejection by Stage</CardTitle>
              <CardDescription>Average rejection rates across inspection stages</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stageData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="stage" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="rejection_rate" name="Rejection Rate (%)" radius={[8, 8, 0, 0]}>
                      {stageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Critical Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
              <CardDescription>Lots requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Lot 25K30X15 - 8.5% Rejection</p>
                    <p className="text-xs text-muted-foreground mt-1">Flash defect on P18 press • Operator: John Doe</p>
                    <Button size="sm" variant="destructive" className="mt-2 h-7 text-xs">
                      Generate CAR
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Lot 25K30X12 - 6.2% Rejection</p>
                    <p className="text-xs text-muted-foreground mt-1">Air bubble on P12 press • Operator: Jane Smith</p>
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs border-orange-600 text-orange-600">
                      Generate CAR
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Lot 25K30X08 - 5.8% Rejection</p>
                    <p className="text-xs text-muted-foreground mt-1">Short mould on P15 press • Operator: Mike Wilson</p>
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs border-yellow-600 text-yellow-600">
                      Generate CAR
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

export const Component = DashboardPage
export default DashboardPage
