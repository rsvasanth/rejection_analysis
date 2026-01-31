import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Calendar, Download, Users } from 'lucide-react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'

interface TraceabilityItem {
    Date: string
    Shift: string
    'Lot No': string
    Item: string
    'Mould Ref': string
    'No. of Lifts': number
    'Press Operator': string
    Bin1: string
    Bin2: string
    Bin3: string
    Bin4: string
    Bin5: string
    'Bin1 Qty': number
    'Bin2 Qty': number
    'Bin3 Qty': number
    'Bin4 Qty': number
    'Bin5 Qty': number
    'Blanking Operator 1': string
    'Blanking Operator 2': string
    'Blanking Operator 3': string
    'Batch 1': string
    'Batch 2': string
    'Batch 3': string
    'Batch 1 Qty': number
    'Batch 2 Qty': number
    'Batch 3 Qty': number
    'Sizing Operator 1': string
    'Sizing Operator 2': string
    'Sizing Operator 3': string
    'Cutbit Entry 1': string
    'Cutbit Entry 2': string
    'Cutbit Entry 3': string
}

export function Component() {
    const [limit, setLimit] = useState(10)
    const [reportData, setReportData] = useState<TraceabilityItem[]>([])
    const [filterMode, setFilterMode] = useState<'single' | 'range'>('single')
    const [singleDate, setSingleDate] = useState('')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')

    const { call: generateReport, loading, error } = useFrappePostCall<{ message: TraceabilityItem[] }>(
        'rejection_analysis.rejection_analysis.api.get_traceable_sample_set'
    )

    const handleGenerate = async () => {
        try {
            const params: any = { limit }

            if (filterMode === 'single' && singleDate) {
                params.date = singleDate
            } else if (filterMode === 'range') {
                if (fromDate) params.from_date = fromDate
                if (toDate) params.to_date = toDate
            }

            const result = await generateReport(params)
            if (result?.message) {
                setReportData(result.message)
                toast.success(`Generated ${result.message.length} records`)
            }
        } catch (error) {
            console.error('Error generating report:', error)
            toast.error('Failed to generate report')
        }
    }

    const exportToCSV = () => {
        if (reportData.length === 0) {
            toast.error('No data to export')
            return
        }

        // Determine which columns have data
        const { maxBins, maxBatches } = getMaxColumns()

        const headers = [
            'Date', 'Shift', 'Lot No', 'Item', 'Mould Ref', 'No. of Lifts', 'Press Operator',
        ]

        // Add dynamic bin columns
        for (let i = 1; i <= maxBins; i++) {
            headers.push(`Bin${i}`, `Bin${i} Qty`, `Blanking Operator ${i}`)
        }

        // Add dynamic batch columns
        for (let i = 1; i <= maxBatches; i++) {
            headers.push(`Batch ${i}`, `Batch ${i} Qty`, `Sizing Operator ${i}`, `Cutbit Entry ${i}`)
        }

        let csvContent = headers.join(',') + '\n'

        reportData.forEach(item => {
            const row: any[] = [
                item.Date,
                item.Shift,
                item['Lot No'],
                item.Item,
                item['Mould Ref'],
                item['No. of Lifts'],
                item['Press Operator']
            ]

            // Add bin data
            for (let i = 1; i <= maxBins; i++) {
                const bin = item[`Bin${i}` as keyof TraceabilityItem] || ''
                const qty = item[`Bin${i} Qty` as keyof TraceabilityItem] || ''
                const op = item[`Blanking Operator ${i}` as keyof TraceabilityItem] || ''
                row.push(bin, qty, op)
            }

            // Add batch data
            for (let i = 1; i <= maxBatches; i++) {
                const batch = item[`Batch ${i}` as keyof TraceabilityItem] || ''
                const qty = item[`Batch ${i} Qty` as keyof TraceabilityItem] || ''
                const op = item[`Sizing Operator ${i}` as keyof TraceabilityItem] || ''
                const cbt = item[`Cutbit Entry ${i}` as keyof TraceabilityItem] || ''
                row.push(batch, qty, op, cbt)
            }

            const escapedRow = row.map(value => {
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`
                }
                return value
            })

            csvContent += escapedRow.join(',') + '\n'
        })

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        const filename = `operator_traceability_${new Date().toISOString().split('T')[0]}.csv`

        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success('CSV exported successfully')
    }

    // Helper to determine max bins and batches with data
    const getMaxColumns = () => {
        let maxBins = 0
        let maxBatches = 0

        reportData.forEach(item => {
            for (let i = 1; i <= 5; i++) {
                if (item[`Bin${i}` as keyof TraceabilityItem]) {
                    maxBins = Math.max(maxBins, i)
                }
            }
            for (let i = 1; i <= 3; i++) {
                if (item[`Batch ${i}` as keyof TraceabilityItem]) {
                    maxBatches = Math.max(maxBatches, i)
                }
            }
        })

        return { maxBins, maxBatches }
    }

    return (
        <DashboardLayout>
            <SiteHeader />
            <div className="flex flex-1 flex-col gap-4 p-4 bg-muted/30">
                {/* Header */}
                <Card className="border-2 shadow-sm">
                    <CardContent className="py-4 px-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Operator Traceability Report</h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Press, Blanking & Sizing operator linkage for incentive calculations
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                {/* Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Report Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Date Filter Mode Toggle */}
                            <div>
                                <Label className="mb-2 block">Date Filter</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="filterMode"
                                            value="single"
                                            checked={filterMode === 'single'}
                                            onChange={() => setFilterMode('single')}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">Single Date</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="filterMode"
                                            value="range"
                                            checked={filterMode === 'range'}
                                            onChange={() => setFilterMode('range')}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">Date Range</span>
                                    </label>
                                </div>
                            </div>

                            {/* Date Inputs */}
                            <div className="flex items-end gap-4">
                                {filterMode === 'single' ? (
                                    <div className="flex-1 max-w-xs">
                                        <Label htmlFor="singleDate">Date</Label>
                                        <Input
                                            id="singleDate"
                                            type="date"
                                            value={singleDate}
                                            onChange={(e) => setSingleDate(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 max-w-xs">
                                            <Label htmlFor="fromDate">From Date</Label>
                                            <Input
                                                id="fromDate"
                                                type="date"
                                                value={fromDate}
                                                onChange={(e) => setFromDate(e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div className="flex-1 max-w-xs">
                                            <Label htmlFor="toDate">To Date</Label>
                                            <Input
                                                id="toDate"
                                                type="date"
                                                value={toDate}
                                                onChange={(e) => setToDate(e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="flex-1 max-w-xs">
                                    <Label htmlFor="limit">Max Records</Label>
                                    <Input
                                        id="limit"
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={limit}
                                        onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
                                        className="mt-1"
                                    />
                                </div>

                                <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {loading ? 'Generating...' : 'Generate Report'}
                                </Button>
                                {reportData.length > 0 && (
                                    <Button onClick={exportToCSV} variant="outline" className="gap-2">
                                        <Download className="h-4 w-4" />
                                        Export CSV
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Table */}
                {loading ? (
                    <Card>
                        <CardContent className="py-6">
                            <div className="space-y-2">
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : error ? (
                    <Card>
                        <CardContent className="py-8 text-center">
                            <p className="text-red-600">Failed to load data</p>
                        </CardContent>
                    </Card>
                ) : reportData.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{reportData.length} Records</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Shift</TableHead>
                                            <TableHead>Lot No</TableHead>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Press Operator</TableHead>
                                            {(() => {
                                                const { maxBins, maxBatches } = getMaxColumns()
                                                const headers = []

                                                for (let i = 1; i <= maxBins; i++) {
                                                    headers.push(
                                                        <TableHead key={`bin${i}`}>Bin{i}</TableHead>,
                                                        <TableHead key={`binqty${i}`}>Bin{i} Qty</TableHead>,
                                                        <TableHead key={`blankop${i}`}>Blanking Op {i}</TableHead>
                                                    )
                                                }

                                                for (let i = 1; i <= maxBatches; i++) {
                                                    headers.push(
                                                        <TableHead key={`batch${i}`}>Batch {i}</TableHead>,
                                                        <TableHead key={`batchqty${i}`}>Batch {i} Qty</TableHead>,
                                                        <TableHead key={`sizingop${i}`}>Sizing Op {i}</TableHead>,
                                                        <TableHead key={`cbt${i}`}>Cutbit Entry {i}</TableHead>
                                                    )
                                                }

                                                return headers
                                            })()}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.map((row, idx) => {
                                            const { maxBins, maxBatches } = getMaxColumns()
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell className="text-xs">{row.Date}</TableCell>
                                                    <TableCell className="text-xs">{row.Shift}</TableCell>
                                                    <TableCell className="font-medium text-xs">{row['Lot No']}</TableCell>
                                                    <TableCell className="text-xs">{row.Item}</TableCell>
                                                    <TableCell className="text-xs">{row['Press Operator']}</TableCell>

                                                    {/* Dynamic Bin Columns */}
                                                    {Array.from({ length: maxBins }, (_, i) => i + 1).map(i => (
                                                        <>
                                                            <TableCell key={`bin${i}`} className="text-xs">{row[`Bin${i}` as keyof TraceabilityItem]}</TableCell>
                                                            <TableCell key={`binqty${i}`} className="text-xs">{row[`Bin${i} Qty` as keyof TraceabilityItem]}</TableCell>
                                                            <TableCell key={`blankop${i}`} className="text-xs">{row[`Blanking Operator ${i}` as keyof TraceabilityItem]}</TableCell>
                                                        </>
                                                    ))}

                                                    {/* Dynamic Batch Columns */}
                                                    {Array.from({ length: maxBatches }, (_, i) => i + 1).map(i => (
                                                        <>
                                                            <TableCell key={`batch${i}`} className="text-xs">{row[`Batch ${i}` as keyof TraceabilityItem]}</TableCell>
                                                            <TableCell key={`batchqty${i}`} className="text-xs">{row[`Batch ${i} Qty` as keyof TraceabilityItem]}</TableCell>
                                                            <TableCell key={`sizingop${i}`} className="text-xs">{row[`Sizing Operator ${i}` as keyof TraceabilityItem]}</TableCell>
                                                            <TableCell key={`cbt${i}`} className="text-xs">{row[`Cutbit Entry ${i}` as keyof TraceabilityItem]}</TableCell>
                                                        </>
                                                    ))}
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}
            </div>
        </DashboardLayout>
    )
}
