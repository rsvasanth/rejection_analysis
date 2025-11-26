import { useState, useContext } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FrappeContext } from 'frappe-react-sdk'
import { toast } from 'sonner'

interface LotInspectionData {
  inspection_entry: string
  production_date: string
  shift_type: string
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

function RejectionAnalysisPage() {
  const { call } = useContext(FrappeContext) as any
  
  const [filters, setFilters] = useState({
    production_date: new Date().toISOString().split('T')[0],
    shift_type: '',
    operator_name: '',
    press_number: '',
    item_code: '',
    mould_ref: '',
    lot_no: ''
  })

  const [apiData, setApiData] = useState<LotInspectionData[]>([])
  const [loading, setLoading] = useState(false)

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const testGetLotInspectionReport = async () => {
    setLoading(true)
    try {
      const result = await call.post('rejection_analysis.api.get_lot_inspection_report', {
        filters: {
          production_date: filters.production_date,
          ...(filters.shift_type && { shift_type: filters.shift_type }),
          ...(filters.operator_name && { operator_name: filters.operator_name }),
          ...(filters.press_number && { press_number: filters.press_number }),
          ...(filters.item_code && { item_code: filters.item_code }),
          ...(filters.mould_ref && { mould_ref: filters.mould_ref }),
          ...(filters.lot_no && { lot_no: filters.lot_no })
        }
      })

      // Fix: Access result.message instead of result directly
      const data = result?.message || result || []
      setApiData(data)
      toast.success(`API call successful! Retrieved ${data.length} records`)
      console.log('API Response:', result)
      console.log('Data:', data)
    } catch (error) {
      console.error('API Error:', error)
      toast.error('API call failed. Check console for details.')
      setApiData([])
    } finally {
      setLoading(false)
    }
  }

  const getRejectionColor = (percentage: number) => {
    if (percentage >= 5.0) return 'text-red-600 font-bold'
    if (percentage >= 3.0) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getRejectionBadge = (percentage: number) => {
    if (percentage >= 5.0) return <Badge variant="destructive">Critical</Badge>
    if (percentage >= 3.0) return <Badge variant="secondary">Warning</Badge>
    return <Badge variant="outline">Normal</Badge>
  }

  return (
    <DashboardLayout>
      <SiteHeader />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>API Testing: Get Lot Inspection Report</CardTitle>
            <CardDescription>
              Test the get_lot_inspection_report API endpoint with various filters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filter Form */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="production_date">Production Date</Label>
                <Input
                  id="production_date"
                  type="date"
                  value={filters.production_date}
                  onChange={(e) => handleFilterChange('production_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift_type">Shift Type</Label>
                <Select value={filters.shift_type || 'all'} onValueChange={(value) => handleFilterChange('shift_type', value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Shifts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operator_name">Operator Name</Label>
                <Input
                  id="operator_name"
                  placeholder="Search operator..."
                  value={filters.operator_name}
                  onChange={(e) => handleFilterChange('operator_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="press_number">Press Number</Label>
                <Input
                  id="press_number"
                  placeholder="Search press..."
                  value={filters.press_number}
                  onChange={(e) => handleFilterChange('press_number', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_code">Item Code</Label>
                <Input
                  id="item_code"
                  placeholder="Search item..."
                  value={filters.item_code}
                  onChange={(e) => handleFilterChange('item_code', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mould_ref">Mould Ref</Label>
                <Input
                  id="mould_ref"
                  placeholder="Search mould..."
                  value={filters.mould_ref}
                  onChange={(e) => handleFilterChange('mould_ref', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lot_no">Lot No</Label>
                <Input
                  id="lot_no"
                  placeholder="Search lot..."
                  value={filters.lot_no}
                  onChange={(e) => handleFilterChange('lot_no', e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={testGetLotInspectionReport}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Testing...' : 'Test API'}
                </Button>
              </div>
            </div>

            {/* Results */}
            {apiData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Results ({apiData.length} records)</h3>
                  <div className="text-sm text-muted-foreground">
                    Threshold: {apiData[0]?.threshold_percentage || 5.0}%
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {apiData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.production_date}</TableCell>
                          <TableCell>{row.shift_type || '-'}</TableCell>
                          <TableCell>{row.operator_name || '-'}</TableCell>
                          <TableCell>{row.press_number || '-'}</TableCell>
                          <TableCell>{row.item_code || '-'}</TableCell>
                          <TableCell>{row.mould_ref || '-'}</TableCell>
                          <TableCell className="font-mono">{row.lot_no}</TableCell>
                          <TableCell className={getRejectionColor(row.patrol_rej_pct)}>
                            {row.patrol_rej_pct ? `${row.patrol_rej_pct.toFixed(1)}%` : '-'}
                          </TableCell>
                          <TableCell className={getRejectionColor(row.line_rej_pct)}>
                            {row.line_rej_pct ? `${row.line_rej_pct.toFixed(1)}%` : '-'}
                          </TableCell>
                          <TableCell className={getRejectionColor(row.lot_rej_pct)}>
                            <span className="font-bold">{row.lot_rej_pct.toFixed(1)}%</span>
                          </TableCell>
                          <TableCell>{getRejectionBadge(row.lot_rej_pct)}</TableCell>
                          <TableCell>
                            {row.exceeds_threshold && (
                              <Button size="sm" variant="outline" className="text-xs">
                                Generate CAR
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {apiData.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No data to display. Click "Test API" to fetch lot inspection reports.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

// Named export for React Router lazy loading
export const Component = RejectionAnalysisPage
export default RejectionAnalysisPage
