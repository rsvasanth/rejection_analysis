import { useState, useContext } from 'react'
import { FrappeContext } from 'frappe-react-sdk'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  CheckCircle2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Calendar,
  Package
} from 'lucide-react'

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

interface CARFormData {
  // Auto-filled from inspection
  inspection_entry: string
  lot_no: string
  production_date: string
  operator_name: string
  press_number: string
  item_code: string
  mould_ref: string
  rejection_percentage: number
  
  // User inputs - Left Column
  problem_description: string
  cause_for_non_detection: string
  cause_for_occurrence: string
  remarks: string
  
  // User inputs - Right Column
  corrective_action: string
  why_1: string
  why_2: string
  why_3: string
  why_4: string
  why_5: string
  
  // Additional fields
  responsible_person: string
  target_date: string
  preventive_measures: string
}

interface CARGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  inspectionRecord: LotInspectionRecord | null
  onSuccess?: (carName: string) => void
}

export function CARGenerationModal({
  isOpen,
  onClose,
  inspectionRecord,
  onSuccess
}: CARGenerationModalProps) {
  const { call } = useContext(FrappeContext) as any
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWhyAnalysis, setShowWhyAnalysis] = useState(false)
  
  const [formData, setFormData] = useState<CARFormData>({
    // Auto-filled
    inspection_entry: inspectionRecord?.inspection_entry || '',
    lot_no: inspectionRecord?.lot_no || '',
    production_date: inspectionRecord?.production_date || '',
    operator_name: inspectionRecord?.operator_name || '',
    press_number: inspectionRecord?.press_number || '',
    item_code: inspectionRecord?.item_code || '',
    mould_ref: inspectionRecord?.mould_ref || '',
    rejection_percentage: inspectionRecord?.lot_rej_pct || 0,
    
    // User inputs - Left Column
    problem_description: '',
    cause_for_non_detection: '',
    cause_for_occurrence: '',
    remarks: '',
    
    // User inputs - Right Column
    corrective_action: '',
    why_1: '',
    why_2: '',
    why_3: '',
    why_4: '',
    why_5: '',
    
    // Additional fields
    responsible_person: '',
    target_date: '',
    preventive_measures: ''
  })

  // Update form data when inspection record changes
  useState(() => {
    if (inspectionRecord) {
      setFormData(prev => ({
        ...prev,
        inspection_entry: inspectionRecord.inspection_entry,
        lot_no: inspectionRecord.lot_no,
        production_date: inspectionRecord.production_date,
        operator_name: inspectionRecord.operator_name,
        press_number: inspectionRecord.press_number,
        item_code: inspectionRecord.item_code,
        mould_ref: inspectionRecord.mould_ref,
        rejection_percentage: inspectionRecord.lot_rej_pct
      }))
      
      // Auto-generate problem description
      setFormData(prev => ({
        ...prev,
        problem_description: `Lot ${inspectionRecord.lot_no} exceeded rejection threshold with ${inspectionRecord.lot_rej_pct.toFixed(2)}% rejection rate (Threshold: ${inspectionRecord.threshold_percentage}%).\n\nInspection Details:\n- Item: ${inspectionRecord.item_code}\n- Mould: ${inspectionRecord.mould_ref}\n- Operator: ${inspectionRecord.operator_name}\n- Press: ${inspectionRecord.press_number}\n- Production Date: ${new Date(inspectionRecord.production_date).toLocaleDateString()}\n\nRejection Progression:\n- Patrol Inspection: ${inspectionRecord.patrol_rej_pct.toFixed(2)}%\n- Line Inspection: ${inspectionRecord.line_rej_pct.toFixed(2)}%\n- Lot Inspection: ${inspectionRecord.lot_rej_pct.toFixed(2)}%`
      }))
    }
  })

  const handleInputChange = (field: keyof CARFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): boolean => {
    // Required fields validation
    if (!formData.problem_description.trim()) {
      toast.error('Please enter Problem Description')
      return false
    }
    
    if (!formData.corrective_action.trim()) {
      toast.error('Please enter Corrective Action')
      return false
    }
    
    if (!formData.cause_for_occurrence.trim()) {
      toast.error('Please enter Cause for Occurrence')
      return false
    }
    
    if (!formData.cause_for_non_detection.trim()) {
      toast.error('Please enter Cause for Non Detection')
      return false
    }
    
    // 5 Why validation - at least 3 whys should be filled
    const whyAnswers = [
      formData.why_1,
      formData.why_2,
      formData.why_3,
      formData.why_4,
      formData.why_5
    ].filter(why => why.trim() !== '')
    
    if (whyAnswers.length < 3) {
      toast.error('Please complete at least 3 levels of Why Analysis')
      return false
    }
    
    if (!formData.responsible_person.trim()) {
      toast.error('Please assign a Responsible Person')
      return false
    }
    
    if (!formData.target_date) {
      toast.error('Please set a Target Completion Date')
      return false
    }
    
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Call backend API to create CAR
      const result = await call.post('rejection_analysis.rejection_analysis.api.create_car_from_inspection', {
        inspection_entry_name: formData.inspection_entry,
        car_data: {
          problem_description: formData.problem_description,
          cause_for_non_detection: formData.cause_for_non_detection,
          cause_for_occurrence: formData.cause_for_occurrence,
          corrective_action: formData.corrective_action,
          remarks: formData.remarks,
          why_analysis: {
            why_1: formData.why_1,
            why_2: formData.why_2,
            why_3: formData.why_3,
            why_4: formData.why_4,
            why_5: formData.why_5
          },
          responsible_person: formData.responsible_person,
          target_date: formData.target_date,
          preventive_measures: formData.preventive_measures
        }
      })

      const carName = result?.message?.name || result?.name

      toast.success('CAR Created Successfully!', {
        description: `CAR ${carName} has been created for Lot ${formData.lot_no}`
      })

      // Call success callback
      if (onSuccess) {
        onSuccess(carName)
      }

      // Close modal and reset form
      handleClose()
    } catch (error: any) {
      console.error('Error creating CAR:', error)
      toast.error('Failed to Create CAR', {
        description: error.message || 'Please try again or contact support'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset form data
    setFormData({
      inspection_entry: '',
      lot_no: '',
      production_date: '',
      operator_name: '',
      press_number: '',
      item_code: '',
      mould_ref: '',
      rejection_percentage: 0,
      problem_description: '',
      cause_for_non_detection: '',
      cause_for_occurrence: '',
      remarks: '',
      corrective_action: '',
      why_1: '',
      why_2: '',
      why_3: '',
      why_4: '',
      why_5: '',
      responsible_person: '',
      target_date: '',
      preventive_measures: ''
    })
    setShowWhyAnalysis(false)
    onClose()
  }

  if (!inspectionRecord) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="bg-green-600 text-white px-6 py-4 -mx-6 -mt-6 mb-4 rounded-t-lg">
            <DialogTitle className="text-2xl font-bold text-center text-white">
              CORRECTIVE ACTION REPORT
            </DialogTitle>
          </div>
          
          <DialogDescription className="sr-only">
            Create Corrective Action Report for Lot {inspectionRecord.lot_no}
          </DialogDescription>

          {/* Lot Information Header */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Lot Number</p>
                  <p className="font-mono font-bold">{inspectionRecord.lot_no}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Production Date</p>
                  <p className="font-medium">
                    {new Date(inspectionRecord.production_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Operator</p>
                  <p className="font-medium">{inspectionRecord.operator_name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Rejection</p>
                  <Badge variant="destructive" className="font-bold">
                    {inspectionRecord.lot_rej_pct.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Item:</span>
                <span className="ml-2 font-mono">{inspectionRecord.item_code}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mould:</span>
                <span className="ml-2 font-mono">{inspectionRecord.mould_ref}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Press:</span>
                <span className="ml-2">{inspectionRecord.press_number}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Inspection:</span>
                <span className="ml-2 font-mono text-xs">{inspectionRecord.inspection_entry}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Main Form - Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Problem Description */}
            <div className="space-y-2">
              <Label htmlFor="problem_description" className="text-sm font-semibold uppercase">
                Problem Description
              </Label>
              <Textarea
                id="problem_description"
                value={formData.problem_description}
                onChange={(e) => handleInputChange('problem_description', e.target.value)}
                placeholder="Describe the quality issue in detail..."
                className="min-h-[140px] bg-blue-50/50 border-blue-200"
                required
              />
            </div>

            {/* Cause for Non Detection */}
            <div className="space-y-2">
              <Label htmlFor="cause_for_non_detection" className="text-sm font-semibold uppercase">
                Cause for Non Detection
              </Label>
              <Textarea
                id="cause_for_non_detection"
                value={formData.cause_for_non_detection}
                onChange={(e) => handleInputChange('cause_for_non_detection', e.target.value)}
                placeholder="Why was this defect not caught earlier? (Patrol/Line inspection)"
                className="min-h-[120px] bg-blue-50/50 border-blue-200"
                required
              />
            </div>

            {/* Cause for Occurrence */}
            <div className="space-y-2">
              <Label htmlFor="cause_for_occurrence" className="text-sm font-semibold uppercase">
                Cause for Occurrence
              </Label>
              <Textarea
                id="cause_for_occurrence"
                value={formData.cause_for_occurrence}
                onChange={(e) => handleInputChange('cause_for_occurrence', e.target.value)}
                placeholder="What caused this defect to occur in the first place?"
                className="min-h-[120px] bg-blue-50/50 border-blue-200"
                required
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Corrective Action */}
            <div className="space-y-2">
              <Label htmlFor="corrective_action" className="text-sm font-semibold uppercase">
                Corrective Action
              </Label>
              <Textarea
                id="corrective_action"
                value={formData.corrective_action}
                onChange={(e) => handleInputChange('corrective_action', e.target.value)}
                placeholder="What actions will be taken to fix this issue?"
                className="min-h-[140px] bg-blue-50/50 border-blue-200"
                required
              />
            </div>

            {/* WHY - WHY ANALYSIS (Collapsible) */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={() => setShowWhyAnalysis(!showWhyAnalysis)}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold"
                size="lg"
              >
                <span>WHY - WHY ANALYSIS</span>
                {showWhyAnalysis ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )}
              </Button>

              {showWhyAnalysis && (
                <div className="space-y-3 bg-blue-100/50 p-4 rounded-lg border-2 border-blue-200">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <div key={num} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-blue-600 text-white">
                          {num}
                        </Badge>
                        <Label className="font-semibold">WHY?</Label>
                      </div>
                      <Input
                        value={formData[`why_${num}` as keyof CARFormData] as string}
                        onChange={(e) => handleInputChange(`why_${num}` as keyof CARFormData, e.target.value)}
                        placeholder={`Answer to Why ${num}...`}
                        className="bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Additional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="responsible_person" className="text-sm font-semibold">
              Responsible Person
            </Label>
            <Input
              id="responsible_person"
              value={formData.responsible_person}
              onChange={(e) => handleInputChange('responsible_person', e.target.value)}
              placeholder="Who will implement this CAR?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_date" className="text-sm font-semibold">
              Target Completion Date
            </Label>
            <Input
              id="target_date"
              type="date"
              value={formData.target_date}
              onChange={(e) => handleInputChange('target_date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preventive_measures" className="text-sm font-semibold">
              Preventive Measures
            </Label>
            <Input
              id="preventive_measures"
              value={formData.preventive_measures}
              onChange={(e) => handleInputChange('preventive_measures', e.target.value)}
              placeholder="How to prevent recurrence?"
            />
          </div>
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <Label htmlFor="remarks" className="text-sm font-semibold uppercase">
            Remarks
          </Label>
          <Textarea
            id="remarks"
            value={formData.remarks}
            onChange={(e) => handleInputChange('remarks', e.target.value)}
            placeholder="Additional notes, observations, or comments..."
            className="min-h-[80px] bg-gray-50 border-gray-300"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            size="lg"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating CAR...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Submit CAR
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
