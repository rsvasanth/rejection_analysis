import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Calendar as CalendarIcon, Package, TrendingUp, TrendingDown, AlertCircle, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ProductionData {
    mpe_name: string
    lot_no: string
    work_plan: string
    planned_date: string
    moulding_date: string
    item_code: string
    production_qty_nos: number
    item_rate: number
    production_value: number
    weight_kg: number
    total_pieces: number
    operator_name: string
    machine_name: string
}

interface SummaryData {
    total_lots: number
    total_qty: number
    total_value: number
}

type StageType = 'moulding' | 'lot_rejection' | 'incoming' | 'fvi'

function CostAnalysisPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [period, setPeriod] = useState<string>('daily')
    const [loading, setLoading] = useState(false)
    const [productionData, setProductionData] = useState<ProductionData[]>([])
    const [summary, setSummary] = useState<SummaryData>({ total_lots: 0, total_qty: 0, total_value: 0 })
    const [selectedStage, setSelectedStage] = useState<StageType>('moulding')

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
                        period: period,
                        date: format(selectedDate, 'yyyy-MM-dd')
                    }
                })
            })

            const data = await response.json()

            if (data.message) {
                setProductionData(data.message.production_data || [])
                setSummary(data.message.summary || { total_lots: 0, total_qty: 0, total_value: 0 })
            }
        } catch (error) {
            console.error('API Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(value)
    }

    const stages = [
        {
            id: 'moulding' as StageType,
            icon: '🟢',
            title: 'Moulding Production',
            color: 'green',
            borderClass: 'border-l-4 border-green-500',
            bgClass: 'bg-green-50',
            textClass: 'text-green-700'
        },
        {
            id: 'lot_rejection' as StageType,
            icon: '🟠',
            title: 'Lot Rejection',
            color: 'orange',
            borderClass: 'border-l-4 border-orange-500',
            bgClass: 'bg-orange-50',
            textClass: 'text-orange-700'
        },
        {
            id: 'incoming' as StageType,
            icon: '🟡',
            title: 'Incoming Inspection',
            color: 'amber',
            borderClass: 'border-l-4 border-amber-500',
            bgClass: 'bg-amber-50',
            textClass: 'text-amber-700'
        },
        {
            id: 'fvi' as StageType,
            icon: '🔴',
            title: 'Final Inspection',
            color: 'red',
            borderClass: 'border-l-4 border-red-500',
            bgClass: 'bg-red-50',
            textClass: 'text-red-700'
        }
    ]

    const renderDetailPanel = () => {
        const stage = stages.find(s => s.id === selectedStage)

        if (!stage) return null

        switch (selectedStage) {
            case 'moulding':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-muted-foreground">Total Lots</p>
                                <p className="text-2xl font-bold">{summary.total_lots}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-muted-foreground">Total Qty</p>
                                <p className="text-2xl font-bold">{summary.total_qty.toLocaleString()}</p>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <p className="text-sm font-medium mb-2">Production Breakdown</p>
                            <div className="space-y-2">
                                {productionData.slice(0, 5).map((item) => (
                                    <div key={item.mpe_name} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                        <span className="font-mono">{item.lot_no}</span>
                                        <span className="font-medium">{formatCurrency(item.production_value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800 font-medium">Total Production Value</p>
                            <p className="text-3xl font-bold text-green-700">{formatCurrency(summary.total_value)}</p>
                        </div>
                    </div>
                )

            case 'lot_rejection':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                            <span className="text-sm text-orange-800">Data will be available in next phase</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <p className="font-medium mb-2">This section will show:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Overall rejection percentage</li>
                                <li>Rejected quantity breakdown</li>
                                <li>Cost impact calculation</li>
                                <li>Trend over time</li>
                            </ul>
                        </div>
                    </div>
                )

            case 'incoming':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                            <span className="text-sm text-amber-800">Data will be available in next phase</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <p className="font-medium mb-2">This section will show:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Cutmark defect count & cost</li>
                                <li>RBS rejection count & cost</li>
                                <li>Impression Mark count & cost</li>
                                <li>C/M/RR percentage calculation</li>
                                <li>Vendor-wise breakdown</li>
                            </ul>
                        </div>
                    </div>
                )

            case 'fvi':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <span className="text-sm text-red-800">Data will be available in next phase</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <p className="font-medium mb-2">This section will show:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Over Trim defect count & cost</li>
                                <li>Under Fill defect count & cost</li>
                                <li>Trimming rejection percentage</li>
                                <li>Final rejection cost impact</li>
                            </ul>
                        </div>
                    </div>
                )
        }
    }

    return (
        <DashboardLayout>
            <SiteHeader />
            <div className="flex flex-1 flex-col gap-4 p-4 bg-muted/30">
                {/* Header with Summary */}
                <Card className="border-2 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
                    <CardContent className="py-4 px-6">
                        <div className="grid grid-cols-4 gap-6">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Production Value</p>
                                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_value)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Rejection Cost</p>
                                <p className="text-2xl font-bold text-red-600">₹0</p>
                                <p className="text-xs text-muted-foreground">(Phase 2+)</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Net Value</p>
                                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_value)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">COPQ %</p>
                                <p className="text-2xl font-bold text-orange-600">0%</p>
                                <p className="text-xs text-muted-foreground">(Phase 2+)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Filters */}
                <Card className="border shadow-sm">
                    <CardContent className="py-2 px-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Period:</span>
                                <Select value={period} onValueChange={setPeriod}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly (Last 7 Days)</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="6months">Last 6 Months</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Date:</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {format(selectedDate, 'PPP')}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <Button onClick={fetchData} disabled={loading}>
                                {loading ? 'Loading...' : 'Load Data'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Split View: Stage Cards (Left) + Detail Panel (Right) */}
                <div className="grid grid-cols-12 gap-4">
                    {/* Left: Stage Cards */}
                    <div className="col-span-4 space-y-3">
                        {stages.map((stage) => (
                            <Card
                                key={stage.id}
                                className={cn(
                                    'cursor-pointer transition-all hover:shadow-md',
                                    stage.borderClass,
                                    selectedStage === stage.id ? 'ring-2 ring-offset-2 shadow-lg' : ''
                                )}
                                onClick={() => setSelectedStage(stage.id)}
                            >
                                <CardContent className="py-3 px-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{stage.icon}</span>
                                            <div>
                                                <p className="font-semibold text-sm">{stage.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {stage.id === 'moulding' ? `${summary.total_lots} lots` : 'Coming soon'}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className={cn(
                                            'h-5 w-5 transition-transform',
                                            selectedStage === stage.id ? 'transform rotate-90' : ''
                                        )} />
                                    </div>

                                    {stage.id === 'moulding' && (
                                        <div className={cn('mt-3 p-2 rounded-lg text-center', stage.bgClass)}>
                                            <p className={cn('text-xl font-bold', stage.textClass)}>
                                                {formatCurrency(summary.total_value)}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Right: Detail Panel */}
                    <div className="col-span-8">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {stages.find(s => s.id === selectedStage)?.icon}
                                    {stages.find(s => s.id === selectedStage)?.title} - Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-20 w-full" />
                                        <Skeleton className="h-20 w-full" />
                                        <Skeleton className="h-20 w-full" />
                                    </div>
                                ) : (
                                    renderDetailPanel()
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

export const Component = CostAnalysisPage
export default CostAnalysisPage
