import { useEffect, useState, useContext } from 'react'
import { FrappeContext } from 'frappe-react-sdk'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Package, TrendingUp } from 'lucide-react'

interface DefectDetail {
    defect_type: string
    rejected_qty: number
    percentage: number
}

interface StageDetail {
    stage_name: string
    total_inspected: number
    total_rejected: number
    rejection_percentage: number
    defects: DefectDetail[]
}

interface RejectionDetailsData {
    inspection_entry: string
    lot_no: string
    stages: StageDetail[]
}

interface RejectionDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    inspectionEntryName: string | null
    inspectionType?: string
}

export function RejectionDetailsModal({
    isOpen,
    onClose,
    inspectionEntryName,
    inspectionType = "Inspection Entry"
}: RejectionDetailsModalProps) {
    const { call } = useContext(FrappeContext) as any
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<RejectionDetailsData | null>(null)

    useEffect(() => {
        if (isOpen && inspectionEntryName) {
            fetchRejectionDetails()
        }
    }, [isOpen, inspectionEntryName])

    const fetchRejectionDetails = async () => {
        if (!inspectionEntryName) return

        setLoading(true)
        try {
            const result = await call.post('rejection_analysis.api.get_inspection_rejection_details', {
                inspection_entry_name: inspectionEntryName,
                inspection_type: inspectionType
            })
            setData(result?.message || result)
        } catch (error) {
            console.error('Error fetching rejection details:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStageColor = (stageName: string) => {
        switch (stageName) {
            case 'PATROL':
                return 'bg-blue-600'
            case 'LINE':
                return 'bg-indigo-600'
            case 'LOT':
                return 'bg-purple-600'
            case 'FINAL INSPECTION':
                return 'bg-pink-600'
            default:
                return 'bg-gray-600'
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        Rejection Details
                    </DialogTitle>
                    <DialogDescription>
                        Detailed breakdown of rejections by stage and defect type
                        {data && (
                            <span className="ml-2 font-semibold">
                                • Lot: {data.lot_no}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : data && data.stages.length > 0 ? (
                    <div className="space-y-4">
                        {data.stages.map((stage, idx) => (
                            <div key={idx} className="border rounded-lg overflow-hidden shadow-sm">
                                {/* Stage Header */}
                                <div className={`${getStageColor(stage.stage_name)} text-white px-4 py-3`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg">{stage.stage_name}</h3>
                                            <p className="text-sm opacity-90">
                                                Inspected: {stage.total_inspected.toLocaleString()} |
                                                Rejected: {stage.total_rejected.toLocaleString()}
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="bg-white text-gray-900 font-bold text-lg px-3 py-1">
                                            {stage.rejection_percentage.toFixed(2)}%
                                        </Badge>
                                    </div>
                                </div>

                                {/* Defects List */}
                                <div className="bg-gray-50 p-4">
                                    {stage.defects.length > 0 ? (
                                        <div className="space-y-2">
                                            {stage.defects.map((defect, defectIdx) => (
                                                <div key={defectIdx} className="flex items-center justify-between bg-white p-3 rounded border">
                                                    <div className="flex items-center gap-3">
                                                        <Package className="h-4 w-4 text-gray-500" />
                                                        <span className="font-medium">{defect.defect_type}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm text-gray-600">
                                                            Qty: <span className="font-semibold">{defect.rejected_qty.toLocaleString()}</span>
                                                        </span>
                                                        <Badge
                                                            variant={defect.percentage > 5 ? "destructive" : "outline"}
                                                            className="min-w-[60px] justify-center"
                                                        >
                                                            {defect.percentage.toFixed(2)}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-gray-500 py-4">No defects recorded for this stage</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="h-16 w-16 mx-auto opacity-50 mb-4" />
                        <p className="text-lg font-medium">No rejection data available</p>
                        <p className="text-sm">This inspection entry has no recorded rejections</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
