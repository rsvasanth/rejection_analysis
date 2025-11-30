import { useState, useEffect, useContext } from 'react'
import { FrappeContext } from 'frappe-react-sdk'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'


import {
  Save,
  Send,
  AlertCircle,
  Package,
  Calendar,
  User,
  TrendingUp,
  Eye,
  EyeOff,
  FileText,
  CheckCircle2
} from 'lucide-react'

import type { CARFormData, LotInspectionRecord } from './types'

interface CARGenerationWizardProps {
  isOpen: boolean
  onClose: () => void
  inspectionRecord: LotInspectionRecord | null
  onSuccess?: (carName: string) => void
}

const STORAGE_KEY = 'car-wizard-draft'

export function CARGenerationWizard({
  isOpen,
  onClose,
  inspectionRecord,
  onSuccess
}: CARGenerationWizardProps) {
  const { call } = useContext(FrappeContext) as any
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showWhyAnalysis, setShowWhyAnalysis] = useState(false)
  const [isExistingCAR, setIsExistingCAR] = useState(false)

  const [formData, setFormData] = useState<CARFormData>({
    inspection_entry: '',
    lot_no: '',
    production_date: '',
    operator_name: '',
    press_number: '',
    item_code: '',
    mould_ref: '',
    shift_type: null,
    rejection_percentage: 0,
    patrol_rej_pct: 0,
    line_rej_pct: 0,
    threshold_percentage: 5,
    problem_description: '',
    cause_for_non_detection: '',
    cause_for_occurrence: '',
    why_1: '',
    why_2: '',
    why_3: '',
    why_4: '',
    why_5: '',
    corrective_action: '',
    preventive_measures: '',
    responsible_person: '',
    target_date: '',
    remarks: ''
  })



  // Check for existing CAR and load data
  useEffect(() => {
    const fetchCARDetails = async (carName: string) => {
      try {
        const car = await call.get('frappe.client.get', {
          doctype: 'Corrective Action Report',
          name: carName
        })

        const carData = car.message || car

        // Map 5 Why Analysis
        const whyMap: Record<string, string> = {}
        if (carData.five_why_analysis && Array.isArray(carData.five_why_analysis)) {
          carData.five_why_analysis.forEach((row: any) => {
            const match = row.why_question?.match(/Why (\d+)/)
            if (match) {
              whyMap[`why_${match[1]}`] = row.answer
            }
          })

          if (carData.five_why_analysis.length > 0) {
            setShowWhyAnalysis(true)
          }
        }

        // Populate form data - ensure core fields are always set from inspectionRecord
        setFormData(prev => ({
          // Core fields from inspection record (always set these)
          inspection_entry: inspectionRecord.inspection_entry,
          lot_no: inspectionRecord.lot_no,
          production_date: inspectionRecord.production_date,
          operator_name: inspectionRecord.operator_name,
          press_number: inspectionRecord.press_number,
          item_code: inspectionRecord.item_code,
          mould_ref: inspectionRecord.mould_ref,
          shift_type: inspectionRecord.shift_type,
          rejection_percentage: inspectionRecord.lot_rej_pct,
          patrol_rej_pct: inspectionRecord.patrol_rej_pct,
          line_rej_pct: inspectionRecord.line_rej_pct,
          threshold_percentage: inspectionRecord.threshold_percentage,

          // Editable fields from CAR data
          problem_description: carData.problem_description || prev.problem_description || generateProblemDescription(inspectionRecord),
          cause_for_non_detection: carData.cause_for_non_detection || '',
          cause_for_occurrence: carData.cause_for_occurrence || '',
          corrective_action: carData.corrective_action || '',
          preventive_measures: carData.preventive_measures || '',
          responsible_person: carData.assigned_to || '',
          target_date: carData.target_date || getDefaultTargetDate(),
          remarks: carData.remarks || '',
          ...whyMap
        }))

      } catch (e) {
        console.error('Error fetching CAR details:', e)
        toast.error('Failed to load existing CAR details')
      }
    }

    const checkExisting = async () => {
      if (!inspectionRecord?.inspection_entry) return
      try {
        const result = await call.post('rejection_analysis.api.get_car_by_inspection', {
          inspection_entry_name: inspectionRecord.inspection_entry
        })
        const data = result?.message || result
        const exists = !!(data?.exists && data?.car_name)
        setIsExistingCAR(exists)

        if (exists) {
          fetchCARDetails(data.car_name)
        }
      } catch (e) {
        console.error(e)
      }
    }
    if (isOpen) checkExisting()
  }, [isOpen, inspectionRecord])

  // Initialize form data when inspection record changes
  useEffect(() => {
    if (inspectionRecord && isOpen) {

      const savedDraft = localStorage.getItem(`${STORAGE_KEY}-${inspectionRecord.lot_no}`)

      if (savedDraft) {
        const draft = JSON.parse(savedDraft)
        toast.info('Found unfinished CAR', {
          description: 'Would you like to continue from where you left off?',
          action: {
            label: 'Continue',
            onClick: () => {
              setFormData(draft.formData)
            }
          }
        })
      }

      const initialData: CARFormData = {
        inspection_entry: inspectionRecord.inspection_entry,
        lot_no: inspectionRecord.lot_no,
        production_date: inspectionRecord.production_date,
        operator_name: inspectionRecord.operator_name,
        press_number: inspectionRecord.press_number,
        item_code: inspectionRecord.item_code,
        mould_ref: inspectionRecord.mould_ref,
        shift_type: inspectionRecord.shift_type,
        rejection_percentage: inspectionRecord.lot_rej_pct,
        patrol_rej_pct: inspectionRecord.patrol_rej_pct,
        line_rej_pct: inspectionRecord.line_rej_pct,
        threshold_percentage: inspectionRecord.threshold_percentage,
        problem_description: generateProblemDescription(inspectionRecord),
        cause_for_non_detection: '',
        cause_for_occurrence: '',
        why_1: '',
        why_2: '',
        why_3: '',
        why_4: '',
        why_5: '',
        corrective_action: '',
        preventive_measures: '',
        responsible_person: '',
        target_date: getDefaultTargetDate(),
        remarks: ''
      }

      if (!savedDraft) {
        setFormData(initialData)
      }
    }
  }, [inspectionRecord, isOpen])

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!inspectionRecord) return

    const interval = setInterval(() => {
      const draft = {
        formData,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem(`${STORAGE_KEY}-${inspectionRecord.lot_no}`, JSON.stringify(draft))
    }, 30000)

    return () => clearInterval(interval)
  }, [formData, inspectionRecord])

  const generateProblemDescription = (record: LotInspectionRecord) => {
    const lotRejPct = record.lot_rej_pct || (record as any).rej_pct || 0
    const lineRejPct = record.line_rej_pct || 0
    const trend = lotRejPct > lineRejPct ? 'increased' : 'remained stable'
    const severity = lotRejPct > 10 ? 'CRITICAL' : lotRejPct > 7 ? 'HIGH' : 'MEDIUM'

    return `SEVERITY: ${severity}

Lot ${record.lot_no} exceeded the quality threshold with a ${lotRejPct.toFixed(2)}% rejection rate (Threshold: ${record.threshold_percentage}%).

INSPECTION DETAILS:
• Item Code: ${record.item_code}
• Mould Reference: ${record.mould_ref}
• Operator: ${record.operator_name}
• Press/Machine: ${record.press_number}
• Production Date: ${new Date(record.production_date).toLocaleDateString()}
${record.shift_type ? `• Shift: ${record.shift_type}` : ''}

QUALITY JOURNEY:
The rejection rate ${trend} through the inspection stages:
• Patrol Inspection: ${(record.patrol_rej_pct || 0).toFixed(2)}%
• Line Inspection: ${(record.line_rej_pct || 0).toFixed(2)}%
• Lot Inspection: ${lotRejPct.toFixed(2)}% ⚠️

This indicates ${record.lot_rej_pct > record.line_rej_pct ? 'quality degradation during production' : 'consistent quality issues throughout the process'}.`
  }

  const getDefaultTargetDate = (): string => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date.toISOString().split('T')[0]
  }

  const updateFormData = (updates: Partial<CARFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const validateForm = (): boolean => {
    if (!formData.problem_description.trim()) {
      toast.error('Please describe the problem')
      return false
    }

    if (!formData.cause_for_occurrence.trim()) {
      toast.error('Please identify the cause for occurrence')
      return false
    }

    if (!formData.cause_for_non_detection.trim()) {
      toast.error('Please identify why the defect was not detected earlier')
      return false
    }

    if (!formData.corrective_action.trim()) {
      toast.error('Please define corrective actions')
      return false
    }

    // assigned_to and target_date are optional

    // If target_date is provided, validate it's not in the past
    if (formData.target_date) {
      const targetDate = new Date(formData.target_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (targetDate < today) {
        toast.error('Target date cannot be in the past')
        return false
      }
    }

    return true
  }

  const handleSaveDraft = () => {
    if (!inspectionRecord) return

    const draft = {
      formData,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem(`${STORAGE_KEY}-${inspectionRecord.lot_no}`, JSON.stringify(draft))
    toast.success('Draft saved successfully')
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)

    console.log('Submitting CAR for:', inspectionRecord)
    console.log('Form Data:', formData)

    try {
      // First, check if a CAR already exists for this inspection entry
      const checkResult = await call.post('rejection_analysis.api.get_car_by_inspection', {
        inspection_entry_name: formData.inspection_entry
      })

      const existingCAR = checkResult?.message || checkResult

      const carDataPayload = {
        problem_description: formData.problem_description,
        cause_for_non_detection: formData.cause_for_non_detection,
        cause_for_occurrence: formData.cause_for_occurrence,
        corrective_action: formData.corrective_action,
        preventive_measures: formData.preventive_measures,
        remarks: formData.remarks,
        why_analysis: [
          formData.why_1 ? { why_question: 'Why 1', answer: formData.why_1 } : null,
          formData.why_2 ? { why_question: 'Why 2', answer: formData.why_2 } : null,
          formData.why_3 ? { why_question: 'Why 3', answer: formData.why_3 } : null,
          formData.why_4 ? { why_question: 'Why 4', answer: formData.why_4 } : null,
          formData.why_5 ? { why_question: 'Why 5', answer: formData.why_5 } : null
        ].filter(Boolean),
        assigned_to: formData.responsible_person,
        target_date: formData.target_date
      }

      let result
      let carName

      if (existingCAR?.exists && existingCAR?.car_name) {
        // Update existing CAR
        result = await call.post('rejection_analysis.api.update_car', {
          car_name: existingCAR.car_name,
          car_data: carDataPayload
        })

        carName = result?.message?.name || result?.name || existingCAR.car_name

        toast.success('CAR Updated Successfully! 🎉', {
          description: `CAR ${carName} has been updated for Lot ${formData.lot_no}`
        })
      } else {
        // Create new CAR
        result = await call.post('rejection_analysis.api.create_car_from_inspection', {
          inspection_entry_name: formData.inspection_entry,
          car_data: carDataPayload
        })

        carName = result?.message?.name || result?.name

        toast.success('CAR Created Successfully! 🎉', {
          description: `CAR ${carName} has been created for Lot ${formData.lot_no}`
        })
      }

      if (inspectionRecord) {
        localStorage.removeItem(`${STORAGE_KEY}-${inspectionRecord.lot_no}`)
      }



      if (onSuccess) {
        onSuccess(carName)
      }

      onClose()
    } catch (error: any) {
      console.error('Error creating/updating CAR:', error)

      let errorMessage = 'Please try again or contact support'

      if (error?.message) {
        errorMessage = error.message
      } else if (error?._server_messages) {
        try {
          const messages = JSON.parse(error._server_messages)
          errorMessage = messages.map((m: string) => JSON.parse(m).message).join('\n')
        } catch (e) {
          errorMessage = error._server_messages
        }
      } else if (error?.exception) {
        errorMessage = error.exception
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      toast.error(isExistingCAR ? 'Failed to Update CAR' : 'Failed to Create CAR', {
        description: errorMessage
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Allow the Sheet slide-out animation to complete before unmounting
    // The Sheet component has a 300ms animation duration
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const whyFields = [
    { key: 'why_1' as const, label: 'Why 1', placeholder: 'First level - What happened?' },
    { key: 'why_2' as const, label: 'Why 2', placeholder: 'Second level - Why did it happen?' },
    { key: 'why_3' as const, label: 'Why 3', placeholder: 'Third level - What was the underlying cause?' },
    { key: 'why_4' as const, label: 'Why 4', placeholder: 'Fourth level - What system failed?' },
    { key: 'why_5' as const, label: 'Why 5', placeholder: 'Fifth level - What is the root cause?' }
  ]

  const filledWhyCount = whyFields.filter(field => formData[field.key]?.trim()).length

  if (!inspectionRecord) {
    return null
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col gap-0 bg-gray-50">
        {/* Header */}
        <SheetHeader className="border-b flex-shrink-0 bg-white">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl font-semibold text-gray-900">
                  Corrective Action Report
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-500 mt-1">
                  Create CAR for Lot {inspectionRecord.lot_no}
                </SheetDescription>
              </div>
              <Badge variant="destructive" className="h-8 px-3 text-sm font-semibold">
                {((inspectionRecord as any).lot_rej_pct || (inspectionRecord as any).rej_pct || 0).toFixed(2)}% Rejection
              </Badge>
            </div>
          </div>

          {/* Lot Info Card - Cleaner design */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-white rounded border border-gray-200">
                  <Package className="h-3.5 w-3.5 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">Lot Number</p>
                  <p className="font-mono font-semibold text-sm text-gray-900 truncate">{inspectionRecord.lot_no}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-white rounded border border-gray-200">
                  <Calendar className="h-3.5 w-3.5 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">Date</p>
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {new Date(inspectionRecord.production_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-white rounded border border-gray-200">
                  <User className="h-3.5 w-3.5 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">Operator</p>
                  <p className="font-medium text-sm text-gray-900 truncate">{inspectionRecord.operator_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-white rounded border border-gray-200">
                  <AlertCircle className="h-3.5 w-3.5 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">Press</p>
                  <p className="font-medium text-sm text-gray-900 truncate">{inspectionRecord.press_number}</p>
                </div>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">

            {/* SECTION 1: Problem Description */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="border-l-4 border-l-blue-500 rounded-l-lg">
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Problem Description
                      <span className="text-red-500 ml-1">*</span>
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Describe the quality issue and its impact
                  </p>
                </div>
                <div className="p-5">
                  <Textarea
                    placeholder="Describe the problem, defect type, and severity..."
                    value={formData.problem_description}
                    onChange={(e) => updateFormData({ problem_description: e.target.value })}
                    rows={3}
                    className="resize-none font-mono text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Root Cause Analysis */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-700" />
                <h3 className="text-sm font-semibold text-gray-900">Root Cause Analysis</h3>
              </div>

              {/* Cause for Occurrence */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="border-l-4 border-l-red-500 rounded-l-lg">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <h4 className="text-sm font-semibold text-gray-900">
                        Cause for Occurrence
                        <span className="text-red-500 ml-1">*</span>
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Why did this defect occur in the first place?
                    </p>
                  </div>
                  <div className="p-5">
                    <Input
                      placeholder="Example: Mould cavity wear due to exceeding maintenance cycle, inadequate process parameters..."
                      value={formData.cause_for_occurrence}
                      onChange={(e) => updateFormData({ cause_for_occurrence: e.target.value })}
                      className="text-sm border-gray-300 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Cause for Non-Detection */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="border-l-4 border-l-orange-500 rounded-l-lg">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-orange-600" />
                      <h4 className="text-sm font-semibold text-gray-900">
                        Cause for Non-Detection
                        <span className="text-red-500 ml-1">*</span>
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Why wasn't this defect caught earlier?
                    </p>
                  </div>
                  <div className="p-5">
                    <Input
                      placeholder="Example: Patrol inspection frequency insufficient, visual inspection criteria unclear..."
                      value={formData.cause_for_non_detection}
                      onChange={(e) => updateFormData({ cause_for_non_detection: e.target.value })}
                      className="text-sm border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* 5 Why Analysis - Optional */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="border-l-4 border-l-purple-500 rounded-l-lg">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <h4 className="text-sm font-semibold text-gray-900">
                          5 Why Analysis
                          <span className="text-xs text-gray-500 font-normal ml-2">(Optional)</span>
                        </h4>
                      </div>
                      <Button
                        type="button"
                        variant={showWhyAnalysis ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowWhyAnalysis(!showWhyAnalysis)}
                        className="h-7 text-xs"
                      >
                        {showWhyAnalysis ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1.5" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1.5" />
                            Enable
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {showWhyAnalysis && (
                    <div className="p-5 space-y-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                        <p className="text-xs text-purple-900">
                          <strong>💡 Tip:</strong> Keep asking "Why?" to drill down to the root cause.
                          {filledWhyCount > 0 && (
                            <span className="ml-2 text-purple-700 font-semibold">
                              ({filledWhyCount}/5 completed)
                            </span>
                          )}
                        </p>
                      </div>

                      {whyFields.map((field, index) => (
                        <div key={field.key} className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <div className={`
                              flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold
                              ${formData[field.key]?.trim() ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}
                            `}>
                              {index + 1}
                            </div>
                            {field.label}
                          </Label>
                          <Input
                            placeholder={field.placeholder}
                            value={formData[field.key]}
                            onChange={(e) => updateFormData({ [field.key]: e.target.value })}
                            className="text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {!showWhyAnalysis && (
                    <div className="p-5">
                      <div className="text-center py-8 text-gray-400">
                        <Eye className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">Click "Enable" for deeper root cause analysis</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: Corrective Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gray-700" />
                <h3 className="text-sm font-semibold text-gray-900">Corrective Actions</h3>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="border-l-4 border-l-green-500 rounded-l-lg">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Corrective Action
                      <span className="text-red-500 ml-1">*</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Immediate actions to fix the current issue
                    </p>
                  </div>
                  <div className="p-5">
                    <Textarea
                      placeholder="Example: Replace worn mould cavity, adjust process parameters, retrain operator..."
                      value={formData.corrective_action}
                      onChange={(e) => updateFormData({ corrective_action: e.target.value })}
                      rows={2}
                      className="resize-none text-sm border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: Additional Remarks */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">
                  Additional Remarks
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Any additional information or notes (optional)
                </p>
              </div>
              <div className="p-5">
                <Input
                  placeholder="Add any additional context, constraints, or observations..."
                  value={formData.remarks}
                  onChange={(e) => updateFormData({ remarks: e.target.value })}
                  className="text-sm border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="text-gray-600 hover:text-gray-900"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  {isExistingCAR ? <Save className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  {isExistingCAR ? 'Update CAR' : 'Save CAR'}
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
