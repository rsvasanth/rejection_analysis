import React, { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Package, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Save } from 'lucide-react'

interface FinalInspectionRecord {
    spp_inspection_entry: string
    inspection_date: string
    production_date: string
    shift_type: string | null
    operator_name: string
    press_number: string
    item: string
    mould_ref: string
    lot_no: string
    base_lot_no: string
    patrol_rej_pct: number
    line_rej_pct: number
    lot_rej_pct: number
    final_insp_rej_pct: number
    final_inspector: string
    final_insp_qty: number
    final_rej_qty: number
    warehouse: string | null
    stage: string | null
    exceeds_threshold: boolean
    threshold_percentage: number
    car_name?: string
    car_status?: string
}

interface GroupedLot {
    base_lot_no: string
    sublots: FinalInspectionRecord[]
    // Aggregated data
    total_insp_qty: number
    total_rej_qty: number
    avg_final_rej_pct: number
    avg_patrol_rej_pct: number
    avg_line_rej_pct: number
    avg_lot_rej_pct: number
    exceeds_threshold: boolean
    production_date: string
    operator_name: string
    press_number: string
    item: string
    mould_ref: string
    shift_type: string | null
}

export function FinalInspectionGroupedTable({
    records,
    loading,
    onGenerateCAR,
    onShowRejectionDetails
}: {
    records: FinalInspectionRecord[]
    loading: boolean
    onGenerateCAR: (record: FinalInspectionRecord) => void
    onShowRejectionDetails: (inspectionEntry: string, type: string) => void
}) {
    const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set())

    const groupedData = useMemo(() => {
        const groups = new Map<string, FinalInspectionRecord[]>()

        // Group by base_lot_no
        records.forEach(record => {
            const baseLot = record.base_lot_no
            if (!groups.has(baseLot)) {
                groups.set(baseLot, [])
            }
            groups.get(baseLot)!.push(record)
        })

        // Calculate aggregated data
        const result: GroupedLot[] = []
        groups.forEach((sublots, base_lot_no) => {
            const total_insp_qty = sublots.reduce((sum, r) => sum + r.final_insp_qty, 0)
            const total_rej_qty = sublots.reduce((sum, r) => sum + r.final_rej_qty, 0)
            const avg_final_rej_pct = total_insp_qty > 0 ? (total_rej_qty / total_insp_qty) * 100 : 0
            const avg_patrol_rej_pct = sublots.reduce((sum, r) => sum + r.patrol_rej_pct, 0) / sublots.length
            const avg_line_rej_pct = sublots.reduce((sum, r) => sum + r.line_rej_pct, 0) / sublots.length
            const avg_lot_rej_pct = sublots.reduce((sum, r) => sum + r.lot_rej_pct, 0) / sublots.length

            // Use data from first sublot for common fields
            const first = sublots[0]

            result.push({
                base_lot_no,
                sublots,
                total_insp_qty,
                total_rej_qty,
                avg_final_rej_pct,
                avg_patrol_rej_pct,
                avg_line_rej_pct,
                avg_lot_rej_pct,
                exceeds_threshold: avg_final_rej_pct > first.threshold_percentage,
                production_date: first.production_date,
                operator_name: first.operator_name,
                press_number: first.press_number,
                item: first.item,
                mould_ref: first.mould_ref,
                shift_type: first.shift_type
            })
        })

        // Sort by base_lot_no descending
        return result.sort((a, b) => b.base_lot_no.localeCompare(a.base_lot_no))
    }, [records])

    const toggleLot = (baseLotNo: string) => {
        setExpandedLots(prev => {
            const newSet = new Set(prev)
            if (newSet.has(baseLotNo)) {
                newSet.delete(baseLotNo)
            } else {
                newSet.add(baseLotNo)
            }
            return newSet
        })
    }

    const getRejectionColor = (percentage: number) => {
        if (percentage > 5) return 'text-red-600 font-bold'
        if (percentage > 3) return 'text-orange-500'
        return 'text-green-600'
    }

    const shortenPressNumber = (pressNumber: string | null) => {
        if (!pressNumber) return '—'
        const match = pressNumber.match(/^(P\d+)/)
        return match ? match[1] : pressNumber.split(':')[0].trim()
    }

    if (loading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        )
    }

    if (!records || records.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto opacity-50 mb-4" />
                <p className="text-lg font-medium">No inspection records found</p>
                <p className="text-sm">Click "Generate All Reports" to fetch data</p>
            </div>
        )
    }

    return (
        <div className="rounded-md border">
            <div className="overflow-auto max-h-[600px]">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead className="w-[90px]">Date</TableHead>
                            <TableHead className="w-[70px] truncate">Shift</TableHead>
                            <TableHead className="w-[110px]">Operator</TableHead>
                            <TableHead className="w-[50px]">Press</TableHead>
                            <TableHead className="w-[80px]">Item</TableHead>
                            <TableHead className="w-[90px]">Mould</TableHead>
                            <TableHead className="w-[90px]">Lot No</TableHead>
                            <TableHead className="w-[70px] text-center">Qty</TableHead>
                            <TableHead className="w-[70px] text-center">Rej Qty</TableHead>
                            <TableHead className="w-[70px] text-center">Patrol</TableHead>
                            <TableHead className="w-[70px] text-center">Line</TableHead>
                            <TableHead className="w-[70px] text-center">Lot</TableHead>
                            <TableHead className="w-[70px] text-center">Final</TableHead>
                            <TableHead className="w-[80px]">Status</TableHead>
                            <TableHead className="w-[100px]">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedData.map((group) => {
                            const isExpanded = expandedLots.has(group.base_lot_no)
                            const hasMultipleSublots = group.sublots.length > 1

                            return (
                                <React.Fragment key={group.base_lot_no}>
                                    {/* Parent row - Aggregated data */}
                                    <TableRow
                                        className={`${group.exceeds_threshold ? 'bg-red-50' : 'bg-blue-50/30'} border-b-2 font-medium`}
                                    >
                                        <TableCell className="text-center">
                                            {hasMultipleSublots && (
                                                <button
                                                    onClick={() => toggleLot(group.base_lot_no)}
                                                    className="hover:bg-gray-200 rounded p-1"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </button>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {group.production_date ? new Date(group.production_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '—'}
                                        </TableCell>
                                        <TableCell className="text-xs truncate">{group.shift_type || '—'}</TableCell>
                                        <TableCell className="text-xs truncate max-w-[110px]" title={group.operator_name}>
                                            {group.operator_name || '—'}
                                        </TableCell>
                                        <TableCell className="text-xs font-semibold">{shortenPressNumber(group.press_number)}</TableCell>
                                        <TableCell className="font-mono text-xs truncate">{group.item || '—'}</TableCell>
                                        <TableCell className="text-xs truncate">{group.mould_ref || '—'}</TableCell>
                                        <TableCell className="font-mono font-semibold text-xs">
                                            {group.base_lot_no}
                                            {hasMultipleSublots && (
                                                <span className="ml-1 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">
                                                    {group.sublots.length}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center text-xs font-bold">{group.total_insp_qty.toLocaleString()}</TableCell>
                                        <TableCell className="text-center text-xs font-bold">{group.total_rej_qty.toLocaleString()}</TableCell>
                                        <TableCell className={`text-center text-xs ${getRejectionColor(group.avg_patrol_rej_pct)}`}>
                                            {group.avg_patrol_rej_pct.toFixed(1)}%
                                        </TableCell>
                                        <TableCell className={`text-center text-xs ${getRejectionColor(group.avg_line_rej_pct)}`}>
                                            {group.avg_line_rej_pct.toFixed(1)}%
                                        </TableCell>
                                        <TableCell className={`text-center text-xs ${getRejectionColor(group.avg_lot_rej_pct)}`}>
                                            {group.avg_lot_rej_pct.toFixed(1)}%
                                        </TableCell>
                                        <TableCell
                                            className={`text-center text-xs ${getRejectionColor(group.avg_final_rej_pct)} cursor-pointer hover:underline`}
                                            onClick={() => onShowRejectionDetails(group.sublots[0].spp_inspection_entry, 'SPP Inspection Entry')}
                                            title="Click to see defect details"
                                        >
                                            <span className="font-bold">{group.avg_final_rej_pct.toFixed(1)}%</span>
                                        </TableCell>
                                        <TableCell>
                                            {group.exceeds_threshold ? (
                                                <Badge variant="destructive" className="flex items-center gap-1 w-fit text-[10px]">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Critical
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="flex items-center gap-1 w-fit text-green-600 border-green-200 text-[10px]">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Normal
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-muted-foreground">
                                                {hasMultipleSublots ? `${group.sublots.length} sub-lots` : '—'}
                                            </span>
                                        </TableCell>
                                    </TableRow>

                                    {/* Child rows - Individual sub-lots */}
                                    {isExpanded && group.sublots.map((record, idx) => (
                                        <TableRow
                                            key={`${record.spp_inspection_entry}-${idx}`}
                                            className="bg-gray-50/50 hover:bg-gray-100"
                                        >
                                            <TableCell></TableCell>
                                            <TableCell className="text-xs pl-8"></TableCell>
                                            <TableCell className="text-xs"></TableCell>
                                            <TableCell className="text-xs"></TableCell>
                                            <TableCell className="text-xs"></TableCell>
                                            <TableCell className="text-xs"></TableCell>
                                            <TableCell className="text-xs"></TableCell>
                                            <TableCell className="font-mono text-xs pl-4">└ {record.lot_no}</TableCell>
                                            <TableCell className="text-center text-xs">{record.final_insp_qty.toLocaleString()}</TableCell>
                                            <TableCell className="text-center text-xs">{record.final_rej_qty.toLocaleString()}</TableCell>
                                            <TableCell className={`text-center text-xs ${getRejectionColor(record.patrol_rej_pct)}`}>
                                                {record.patrol_rej_pct.toFixed(1)}%
                                            </TableCell>
                                            <TableCell className={`text-center text-xs ${getRejectionColor(record.line_rej_pct)}`}>
                                                {record.line_rej_pct.toFixed(1)}%
                                            </TableCell>
                                            <TableCell className={`text-center text-xs ${getRejectionColor(record.lot_rej_pct)}`}>
                                                {record.lot_rej_pct.toFixed(1)}%
                                            </TableCell>
                                            <TableCell
                                                className={`text-center text-xs ${getRejectionColor(record.final_insp_rej_pct)} cursor-pointer hover:underline`}
                                                onClick={() => onShowRejectionDetails(record.spp_inspection_entry, 'SPP Inspection Entry')}
                                                title="Click to see defect details"
                                            >
                                                <span className="font-bold">{record.final_insp_rej_pct.toFixed(1)}%</span>
                                            </TableCell>
                                            <TableCell>
                                                {record.exceeds_threshold ? (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                                        <AlertCircle className="h-2.5 w-2.5 mr-1" />
                                                        Critical
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-green-600 border-green-200 text-[10px] px-1.5 py-0.5">
                                                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                                        Normal
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {record.exceeds_threshold && (
                                                    <Button
                                                        size="sm"
                                                        variant={record.car_name ? "default" : "outline"}
                                                        onClick={() => onGenerateCAR(record)}
                                                        className={`text-[10px] h-6 px-2 ${record.car_name ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                                    >
                                                        {record.car_name ? (
                                                            <>
                                                                <Save className="h-3 w-3 mr-1" />
                                                                Update
                                                            </>
                                                        ) : (
                                                            "Generate CAR"
                                                        )}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
