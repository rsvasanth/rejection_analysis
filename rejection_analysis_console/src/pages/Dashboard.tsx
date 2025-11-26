import { useState, useContext } from 'react'
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
  Download
} from 'lucide-react'

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
  patrol_rej_pct: number
  line_rej_pct: number
  lot_rej_pct: number
  exceeds_threshold: boolean
  threshold_percentage: number
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
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <p className="text-3xl font-bold mt-2 tracking-tight">
                {value !== null && value !== undefined ? value : '—'}
              </p>
            )}
          </div>
          {Icon && (
            <div className="rounded-full bg-primary/10 p-3">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
        {trend && !loading && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${
            trend === 'up' ? 'text-red-600' : 
            trend === 'down' ? 'text-green-600' : 
            'text-muted-foreground'
          }`}>
            {trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3" />}
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
  onGenerateCAR 
}: { 
  records: LotInspectionRecord[]
  loading: boolean
  onGenerateCAR: (record: LotInspectionRecord) => void
}) {
  const getRejectionColor = (percentage: number) => {
    if (percentage >= 5.0) return 'text-red-600 font-bold'
    if (percentage >= 3.0) return 'text-yellow-600'
    return 'text-green-600'
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
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Production Date</TableHead>
            <TableHead>Shift</TableHead>
            <TableHead>Operator</TableHead>
            <TableHead>Press</TableHead>
            <TableHead>Item Code</TableHead>
            <TableHead>Mould</TableHead>
            <TableHead>Lot No</TableHead>
            <TableHead>Patrol REJ%</TableHead>
            <TableHead>Line REJ%</TableHead>
            <TableHead>Lot REJ%</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => (
            <TableRow 
              key={index} 
              className={record.exceeds_threshold ? 'bg-red-50' : ''}
            >
              <TableCell className="font-medium">
                {new Date(record.production_date).toLocaleDateString()}
              </TableCell>
              <TableCell>{record.shift_type || '—'}</TableCell>
              <TableCell>{record.operator_name || '—'}</TableCell>
              <TableCell className="text-sm">{record.press_number || '—'}</TableCell>
              <TableCell className="font-mono text-sm">{record.item_code || '—'}</TableCell>
              <TableCell className="text-sm">{record.mould_ref || '—'}</TableCell>
              <TableCell className="font-mono font-semibold">{record.lot_no}</TableCell>
              <TableCell className={getRejectionColor(record.patrol_rej_pct)}>
                {record.patrol_rej_pct ? `${record.patrol_rej_pct.toFixed(1)}%` : '—'}
              </TableCell>
              <TableCell className={getRejectionColor(record.line_rej_pct)}>
                {record.line_rej_pct ? `${record.line_rej_pct.toFixed(1)}%` : '—'}
              </TableCell>
              <TableCell className={getRejectionColor(record.lot_rej_pct)}>
                <span className="font-bold">{record.lot_rej_pct.toFixed(1)}%</span>
              </TableCell>
              <TableCell>
                {record.exceeds_threshold ? (
                  <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                    <AlertCircle className="h-3 w-3" />
                    Critical
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1 w-fit text-green-600 border-green-200">
                    <CheckCircle2 className="h-3 w-3" />
                    Normal
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {record.exceeds_threshold && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onGenerateCAR(record)}
                    className="text-xs"
                  >
                    Generate CAR
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DashboardPage() {
  const { call } = useContext(FrappeContext) as any
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState('lot-inspection')
  
  // State for metrics
  const [lotMetrics, setLotMetrics] = useState<InspectionMetrics | null>(null)
  const [incomingMetrics, setIncomingMetrics] = useState<InspectionMetrics | null>(null)
  const [finalMetrics, setFinalMetrics] = useState<InspectionMetrics | null>(null)
  const [pdirMetrics, setPdirMetrics] = useState<InspectionMetrics | null>(null)
  
  // State for records
  const [lotRecords, setLotRecords] = useState<LotInspectionRecord[]>([])
  const [incomingRecords, setIncomingRecords] = useState<LotInspectionRecord[]>([])
  const [finalRecords, setFinalRecords] = useState<LotInspectionRecord[]>([])
  const [pdirRecords, setPdirRecords] = useState<LotInspectionRecord[]>([])
  
  // Loading states
  const [loading, setLoading] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(false)

  const fetchMetrics = async (inspectionType: string) => {
    try {
      const result = await call.post('rejection_analysis.api.get_dashboard_metrics', {
        date: selectedDate,
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
      const result = await call.post('rejection_analysis.api.get_lot_inspection_report', {
        filters: {
          production_date: selectedDate
        }
      })
      return result?.message || result || []
    } catch (error) {
      console.error(`Error fetching ${inspectionType} records:`, error)
      return []
    }
  }

  const generateAllReports = async () => {
    if (!selectedDate) {
      toast.error('Please select a date first')
      return
    }

    setLoading(true)
    setMetricsLoading(true)

    try {
      // Fetch all metrics in parallel
      const [lot, incoming, final, pdir] = await Promise.all([
        fetchMetrics('Lot Inspection'),
        fetchMetrics('Incoming Inspection'),
        fetchMetrics('Final Visual Inspection'),
        fetchMetrics('PDIR')
      ])

      setLotMetrics(lot)
      setIncomingMetrics(incoming)
      setFinalMetrics(final)
      setPdirMetrics(pdir)

      // Fetch all records in parallel
      const [lotRecs, incomingRecs, finalRecs, pdirRecs] = await Promise.all([
        fetchRecords('Lot Inspection'),
        fetchRecords('Incoming Inspection'),
        fetchRecords('Final Visual Inspection'),
        fetchRecords('PDIR')
      ])

      setLotRecords(lotRecs)
      setIncomingRecords(incomingRecs)
      setFinalRecords(finalRecs)
      setPdirRecords(pdirRecs)

      toast.success(`Reports generated successfully for ${selectedDate}`)
    } catch (error) {
      console.error('Error generating reports:', error)
      toast.error('Failed to generate reports')
    } finally {
      setLoading(false)
      setMetricsLoading(false)
    }
  }

  const handleGenerateCAR = (record: LotInspectionRecord) => {
    toast.info('CAR form coming soon')
    console.log('Generate CAR for:', record)
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
      <div className="flex flex-1 flex-col gap-6 p-8 bg-muted/30">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Rejection Analysis Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Quality insights and inspection metrics
              </p>
            </div>
            <Button 
              onClick={generateAllReports}
              disabled={loading || !selectedDate}
              size="lg"
              className="gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Generate All Reports
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Date Selector */}
        <Card className="border-2 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <Label className="text-base font-semibold">Report Date</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatDate(selectedDate)}
                  </p>
                </div>
              </div>
              
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto font-medium"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="lot-inspection" className="gap-2">
              <Package className="h-4 w-4" />
              Lot Inspection
              {lotRecords.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {lotRecords.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="incoming" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Incoming
              {incomingRecords.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {incomingRecords.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="final" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Final
              {finalRecords.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {finalRecords.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pdir" className="gap-2">
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
          <TabsContent value="lot-inspection" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <MetricCard 
                label="Total Lots" 
                value={lotMetrics?.total_lots || 0}
                loading={metricsLoading}
                icon={Package}
              />
              <MetricCard 
                label="Pending" 
                value={lotMetrics?.pending_lots || 0}
                loading={metricsLoading}
              />
              <MetricCard 
                label="Patrol Avg" 
                value={lotMetrics?.patrol_rej_avg ? `${lotMetrics.patrol_rej_avg}%` : '—'}
                trend={lotMetrics && lotMetrics.patrol_rej_avg > 3 ? 'up' : 'down'}
                loading={metricsLoading}
              />
              <MetricCard 
                label="Line Avg" 
                value={lotMetrics?.line_rej_avg ? `${lotMetrics.line_rej_avg}%` : '—'}
                trend={lotMetrics && lotMetrics.line_rej_avg > 3 ? 'up' : 'down'}
                loading={metricsLoading}
              />
              <MetricCard 
                label="Lot Rejection" 
                value={lotMetrics?.avg_rejection ? `${lotMetrics.avg_rejection}%` : '—'}
                trend={lotMetrics && lotMetrics.avg_rejection > 5 ? 'up' : 'down'}
                loading={metricsLoading}
              />
              <MetricCard 
                label="Critical Lots" 
                value={lotMetrics?.lots_exceeding_threshold || 0}
                trend={lotMetrics && lotMetrics.lots_exceeding_threshold > 0 ? 'up' : 'neutral'}
                loading={metricsLoading}
                icon={AlertCircle}
              />
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lot Inspection Records</CardTitle>
                    <CardDescription>
                      Detailed inspection records for {formatDate(selectedDate)}
                    </CardDescription>
                  </div>
                  {lotRecords.length > 0 && (
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <InspectionRecordsTable 
                  records={lotRecords}
                  loading={loading}
                  onGenerateCAR={handleGenerateCAR}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incoming Inspection Tab */}
          <TabsContent value="incoming" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard 
                label="Lots Received" 
                value={incomingMetrics?.total_lots || 0}
                loading={metricsLoading}
                icon={ClipboardCheck}
              />
              <MetricCard 
                label="Pending" 
                value={incomingMetrics?.pending_lots || 0}
                loading={metricsLoading}
              />
              <MetricCard 
                label="Avg Rejection" 
                value={incomingMetrics?.avg_rejection ? `${incomingMetrics.avg_rejection}%` : '—'}
                trend={incomingMetrics && incomingMetrics.avg_rejection > 3 ? 'up' : 'down'}
                loading={metricsLoading}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Incoming Inspection Records</CardTitle>
                <CardDescription>
                  Material quality check records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InspectionRecordsTable 
                  records={incomingRecords}
                  loading={loading}
                  onGenerateCAR={handleGenerateCAR}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Final Inspection Tab */}
          <TabsContent value="final" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard 
                label="Lots Inspected" 
                value={finalMetrics?.total_lots || 0}
                loading={metricsLoading}
                icon={CheckCircle2}
              />
              <MetricCard 
                label="Avg Rejection" 
                value={finalMetrics?.avg_rejection ? `${finalMetrics.avg_rejection}%` : '—'}
                trend={finalMetrics && finalMetrics.avg_rejection > 3 ? 'up' : 'down'}
                loading={metricsLoading}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Final Visual Inspection Records</CardTitle>
                <CardDescription>
                  Final quality verification records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InspectionRecordsTable 
                  records={finalRecords}
                  loading={loading}
                  onGenerateCAR={handleGenerateCAR}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* PDIR Tab */}
          <TabsContent value="pdir" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">PDIR Coming Soon</h3>
              <p className="text-sm">Post-delivery inspection records will be available here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export const Component = DashboardPage
export default DashboardPage
