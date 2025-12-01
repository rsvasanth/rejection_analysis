import { useContext, useState, useEffect } from 'react'
import { FrappeContext } from 'frappe-react-sdk'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
    FileText,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Package,
    Calendar,
    ExternalLink
} from 'lucide-react'

interface ReportData {
    name: string
    production_date: string
    status: string
    lot_total_inspections: number
    lot_total_rejected: number
    lot_avg_rejection: number
    lot_exceeding_threshold: number
    incoming_total_inspections: number
    incoming_total_rejected: number
    incoming_avg_rejection: number
    incoming_exceeding_threshold: number
    final_total_inspections: number
    final_total_rejected: number
    final_avg_rejection: number
    final_exceeding_threshold: number
    total_cars_generated: number
    pending_cars: number
    creation: string
    modified: string
}

interface ReportViewerModalProps {
    isOpen: boolean
    onClose: () => void
    reportName: string | null
}

export function ReportViewerModal({
    isOpen,
    onClose,
    reportName
}: ReportViewerModalProps) {
    const { call } = useContext(FrappeContext) as any
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState<ReportData | null>(null)

    useEffect(() => {
        if (isOpen && reportName) {
            fetchReportData()
        }
    }, [isOpen, reportName])

    const fetchReportData = async () => {
        if (!reportName) return

        setLoading(true)
        try {
            const result = await call.get('frappe.client.get', {
                doctype: 'Daily Rejection Report',
                name: reportName
            })
            setReport(result?.message || result)
        } catch (error) {
            console.error('Error fetching report:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '—'
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const openInFrappe = () => {
        const siteUrl = window.location.origin
        window.open(`${siteUrl}/app/daily-rejection-report/${reportName}`, '_blank')
    }

    const handleClose = () => {
        // Allow the Dialog slide-out animation to complete before unmounting
        setTimeout(() => {
            onClose()
        }, 250)
    }

    const getRejectionColor = (percentage: number) => {
        if (percentage >= 5.0) return 'text-red-600 font-bold'
        if (percentage >= 3.0) return 'text-orange-500'
        return 'text-green-600'
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-2xl">
                                <FileText className="h-6 w-6 text-blue-600" />
                                Daily Rejection Report
                            </DialogTitle>
                            <DialogDescription className="mt-2">
                                {report && (
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(report.production_date)}
                                        </span>
                                        <Badge variant={report.status === 'Draft' ? 'secondary' : 'default'}>
                                            {report.status}
                                        </Badge>
                                    </div>
                                )}
                            </DialogDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={openInFrappe}
                            className="gap-2"
                        >
                            <ExternalLink className="h-3 w-3" />
                            Open in Frappe
                        </Button>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : report ? (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            {/* Lot Inspection Summary */}
                            <Card className="border-blue-200 bg-blue-50/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        Lot Inspection
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-2xl font-bold text-blue-900">
                                            {report.lot_total_inspections || 0}
                                        </span>
                                        <span className="text-xs text-muted-foreground">lots</span>
                                    </div>
                                    <div className="text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Avg Rejection:</span>
                                            <span className={getRejectionColor(report.lot_avg_rejection || 0)}>
                                                {(report.lot_avg_rejection || 0).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-muted-foreground">Critical:</span>
                                            <Badge variant="destructive" className="h-5 px-2 text-xs">
                                                {report.lot_exceeding_threshold || 0}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Incoming Inspection Summary */}
                            <Card className="border-purple-200 bg-purple-50/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        Incoming Inspection
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-2xl font-bold text-purple-900">
                                            {report.incoming_total_inspections || 0}
                                        </span>
                                        <span className="text-xs text-muted-foreground">lots</span>
                                    </div>
                                    <div className="text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Avg Rejection:</span>
                                            <span className={getRejectionColor(report.incoming_avg_rejection || 0)}>
                                                {(report.incoming_avg_rejection || 0).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-muted-foreground">Critical:</span>
                                            <Badge variant="destructive" className="h-5 px-2 text-xs">
                                                {report.incoming_exceeding_threshold || 0}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Final Inspection Summary */}
                            <Card className="border-green-200 bg-green-50/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Final Inspection
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-2xl font-bold text-green-900">
                                            {report.final_total_inspections || 0}
                                        </span>
                                        <span className="text-xs text-muted-foreground">lots</span>
                                    </div>
                                    <div className="text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Avg Rejection:</span>
                                            <span className={getRejectionColor(report.final_avg_rejection || 0)}>
                                                {(report.final_avg_rejection || 0).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-muted-foreground">Critical:</span>
                                            <Badge variant="destructive" className="h-5 px-2 text-xs">
                                                {report.final_exceeding_threshold || 0}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* CAR Status */}
                        <Card className="border-orange-200 bg-orange-50/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-orange-900 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Corrective Action Reports (CARs)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-orange-900">
                                                {report.pending_cars || 0}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                / {report.total_cars_generated || 0} pending
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {report.pending_cars === 0
                                                ? '✅ All CARs completed!'
                                                : `${report.pending_cars} CAR${report.pending_cars > 1 ? 's' : ''} requiring attention`}
                                        </p>
                                    </div>
                                    {report.pending_cars > 0 && (
                                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 px-4 py-2 text-lg">
                                            Action Required
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Report Metadata */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Report Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Report ID:</span>
                                        <p className="font-mono text-xs mt-1">{report.name}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Production Date:</span>
                                        <p className="font-medium mt-1">{formatDate(report.production_date)}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Created:</span>
                                        <p className="font-medium mt-1">{formatDate(report.creation)}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Last Modified:</span>
                                        <p className="font-medium mt-1">{formatDate(report.modified)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No report data available</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
