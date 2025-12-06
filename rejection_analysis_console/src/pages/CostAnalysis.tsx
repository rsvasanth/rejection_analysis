import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar as CalendarIcon, Package } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ProductionData {
    mpe_name: string
    lot_no: string
    moulding_date: string
    item_code: string
    production_qty_nos: number
    weight_kg: number
    cavities: number
    total_pieces: number
    operator_name: string
    machine_name: string
}

function CostAnalysisPage() {
    const [fromDate, setFromDate] = useState<Date>(new Date('2025-04-01'))
    const [toDate, setToDate] = useState<Date>(new Date())
    const [loading, setLoading] = useState(false)
    const [productionData, setProductionData] = useState<ProductionData[]>([])
    const [totalLots, setTotalLots] = useState(0)

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
                        from_date: format(fromDate, 'yyyy-MM-dd'),
                        to_date: format(toDate, 'yyyy-MM-dd')
                    }
                })
            })

            const data = await response.json()

            if (data.message) {
                setProductionData(data.message.production_data || [])
                setTotalLots(data.message.total_lots || 0)
            }
        } catch (error) {
            console.error('API Error:', error)
        } finally {
            setLoading(false)
        }
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
                                    Production data based on Work Planning lots
                                </p>
                            </div>
                            <Badge variant="secondary" className="text-sm">
                                {totalLots} Lots Planned
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Filters */}
                <Card className="border shadow-sm">
                    <CardContent className="py-2 px-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">From:</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {format(fromDate, 'PPP')}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={fromDate} onSelect={(date) => date && setFromDate(date)} />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">To:</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {format(toDate, 'PPP')}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={toDate} onSelect={(date) => date && setToDate(date)} />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <Button onClick={fetchData} disabled={loading}>
                                {loading ? 'Loading...' : 'Load Data'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

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
                                No production data found. Click "Load Data" to fetch.
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Lot No</TableHead>
                                            <TableHead>Moulding Date</TableHead>
                                            <TableHead>Item Code</TableHead>
                                            <TableHead className="text-right">Qty (Nos)</TableHead>
                                            <TableHead className="text-right">Weight (kg)</TableHead>
                                            <TableHead className="text-right">Pieces</TableHead>
                                            <TableHead>Operator</TableHead>
                                            <TableHead>Machine</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {productionData.map((row) => (
                                            <TableRow key={row.mpe_name}>
                                                <TableCell className="font-medium">{row.lot_no}</TableCell>
                                                <TableCell>{format(new Date(row.moulding_date), 'dd-MMM-yyyy')}</TableCell>
                                                <TableCell>{row.item_code}</TableCell>
                                                <TableCell className="text-right">{row.production_qty_nos}</TableCell>
                                                <TableCell className="text-right">{row.weight_kg?.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">{row.total_pieces}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{row.operator_name}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{row.machine_name}</TableCell>
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
