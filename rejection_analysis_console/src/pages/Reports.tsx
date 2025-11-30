import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Eye,
  Calendar,
  Filter,
  Search,
} from 'lucide-react'
import { useFrappeGetCall } from 'frappe-react-sdk'

interface DailyReport {
  name: string
  production_date: string
  status: string
  creation: string
  modified: string
  total_lots: number
  pending_cars: number
}

export function Component() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  // Fetch all reports using custom API
  const { data: apiResponse, isLoading, error, mutate } = useFrappeGetCall<any>(
    'rejection_analysis.api.get_all_daily_reports',
    undefined,
    'reports-list',
    {
      revalidateOnFocus: false,
    }
  )

  // Handle different response formats (Frappe sometimes wraps in message)
  const reportsList: DailyReport[] = Array.isArray(apiResponse)
    ? apiResponse
    : (Array.isArray(apiResponse?.message) ? apiResponse.message : [])

  console.log('Reports API Response:', apiResponse)
  console.log('Processed Reports List:', reportsList)

  // Filter reports
  const filteredReports = (reportsList || []).filter((report) => {
    const matchesSearch =
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.production_date.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || report.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const openReportInFrappe = (reportName: string) => {
    const siteUrl = window.location.origin
    window.open(`${siteUrl}/app/daily-rejection-report/${reportName}`, '_blank')
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
                <h1 className="text-2xl font-bold tracking-tight">Saved Reports</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  View and manage all Daily Rejection Reports
                </p>
              </div>
              <Badge variant="secondary" className="text-sm">
                {filteredReports.length} {filteredReports.length === 1 ? 'Report' : 'Reports'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border shadow-sm">
          <CardContent className="py-2 px-4">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by report name or date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {['All', 'Draft', 'Generated'].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Reports List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load reports</p>
                <Button onClick={() => mutate()} variant="outline" size="sm" className="mt-2">
                  Retry
                </Button>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No reports found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchTerm || statusFilter !== 'All'
                    ? 'Try adjusting your filters'
                    : 'Generate your first report from the Dashboard'}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Production Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Lots</TableHead>
                      <TableHead>Pending CARs</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.name}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {report.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(report.production_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={report.status === 'Draft' ? 'secondary' : 'default'}
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.total_lots || 0}</TableCell>
                        <TableCell>
                          {report.pending_cars > 0 ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              {report.pending_cars}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              0
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(report.creation)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(report.modified)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReportInFrappe(report.name)}
                            className="gap-2"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </TableCell>
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
