import { useState, useContext, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FrappeContext } from 'frappe-react-sdk'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingDown, Award, AlertCircle } from 'lucide-react'

interface RankingData {
    name: string
    total_inspected: number
    total_rejected: number
    rejection_pct: number
}

function PerformanceRankingsPage() {
    const { call } = useContext(FrappeContext) as any
    const [dimension, setDimension] = useState<'machine' | 'operator' | 'item' | 'mould'>('machine')
    const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '6m'>('30d')
    const [rankings, setRankings] = useState<RankingData[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchRankings()
    }, [dimension, period])

    const fetchRankings = async () => {
        setLoading(true)
        try {
            const result = await call.post('rejection_analysis.api.get_performance_rankings', {
                period,
                dimension,
                limit: 20
            })
            const data = result?.message || result || []
            setRankings(data)
        } catch (error) {
            console.error('Error fetching rankings:', error)
            setRankings([])
        } finally {
            setLoading(false)
        }
    }

    const getRejectionBadgeColor = (pct: number) => {
        if (pct >= 5) return 'destructive'
        if (pct >= 3) return 'default'
        return 'secondary'
    }

    const getDimensionLabel = () => {
        const labels = {
            machine: 'Machines',
            operator: 'Operators',
            item: 'Items',
            mould: 'Moulds'
        }
        return labels[dimension]
    }

    return (
        <DashboardLayout>
            <SiteHeader />
            <div className="space-y-6 p-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Performance Rankings</h1>
                        <p className="text-muted-foreground mt-2">
                            Top worst performers ranked by rejection percentage
                        </p>
                    </div>

                    {/* Time Period Selector */}
                    <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="90d">Last 90 Days</SelectItem>
                            <SelectItem value="6m">Last 6 Months</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Tabs for Dimensions */}
                <Tabs value={dimension} onValueChange={(value: any) => setDimension(value)}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="machine">Machines</TabsTrigger>
                        <TabsTrigger value="operator">Operators</TabsTrigger>
                        <TabsTrigger value="item">Items</TabsTrigger>
                        <TabsTrigger value="mould">Moulds</TabsTrigger>
                    </TabsList>

                    <TabsContent value={dimension} className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingDown className="h-5 w-5" />
                                    Top 20 Worst {getDimensionLabel()}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-2">
                                        {[...Array(5)].map((_, i) => (
                                            <Skeleton key={i} className="h-12 w-full" />
                                        ))}
                                    </div>
                                ) : rankings.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No data available for this period</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[60px]">Rank</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead className="text-right">Inspected</TableHead>
                                                <TableHead className="text-right">Rejected</TableHead>
                                                <TableHead className="text-right">Rejection %</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rankings.map((item, index) => (
                                                <TableRow key={index} className="hover:bg-muted/50">
                                                    <TableCell className="font-medium">
                                                        {index === 0 && <Award className="h-4 w-4 text-yellow-600 inline mr-1" />}
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell className="text-right">{item.total_inspected.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">{item.total_rejected.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={getRejectionBadgeColor(item.rejection_pct)}>
                                                            {item.rejection_pct.toFixed(2)}%
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    )
}

export function Component() {
    return <PerformanceRankingsPage />
}
