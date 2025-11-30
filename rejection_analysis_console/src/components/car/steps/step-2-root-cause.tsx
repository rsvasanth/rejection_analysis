import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, TrendingUp, Eye, EyeOff } from 'lucide-react'
import type { CARFormData } from '../types'

interface Step2Props {
  formData: CARFormData
  updateFormData: (updates: Partial<CARFormData>) => void
}

export function Step2RootCause({ formData, updateFormData }: Step2Props) {
  const [showWhyAnalysis, setShowWhyAnalysis] = useState(false)

  const whyFields = [
    { key: 'why_1' as const, label: 'Why 1', placeholder: 'First level - What happened?' },
    { key: 'why_2' as const, label: 'Why 2', placeholder: 'Second level - Why did it happen?' },
    { key: 'why_3' as const, label: 'Why 3', placeholder: 'Third level - What was the underlying cause?' },
    { key: 'why_4' as const, label: 'Why 4', placeholder: 'Fourth level - What system failed?' },
    { key: 'why_5' as const, label: 'Why 5', placeholder: 'Fifth level - What is the root cause?' }
  ]

  const filledWhyCount = whyFields.filter(field => formData[field.key]?.trim()).length

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Root Cause Analysis
        </h3>
        <p className="text-sm text-muted-foreground">
          Identify the root causes for both occurrence and non-detection
        </p>
      </div>

      {/* Cause for Occurrence */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            Cause for Occurrence
            <span className="text-red-500">*</span>
          </CardTitle>
          <CardDescription>
            Why did this defect occur in the first place? What process or system failure led to this?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Example: Mould cavity wear due to exceeding maintenance cycle, inadequate process parameters, operator training gap..."
            value={formData.cause_for_occurrence}
            onChange={(e) => updateFormData({ cause_for_occurrence: e.target.value })}
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Cause for Non-Detection */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-orange-600" />
            Cause for Non-Detection
            <span className="text-red-500">*</span>
          </CardTitle>
          <CardDescription>
            Why wasn't this defect caught earlier? What inspection or control failed?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Example: Patrol inspection frequency insufficient, visual inspection criteria unclear, inspector training inadequate..."
            value={formData.cause_for_non_detection}
            onChange={(e) => updateFormData({ cause_for_non_detection: e.target.value })}
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* 5 Why Analysis - Optional with Toggle */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                5 Why Analysis
                <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </CardTitle>
              <CardDescription>
                Dig deeper into the root cause using the 5 Why technique
              </CardDescription>
            </div>
            <Button
              type="button"
              variant={showWhyAnalysis ? "default" : "outline"}
              size="sm"
              onClick={() => setShowWhyAnalysis(!showWhyAnalysis)}
              className="ml-4"
            >
              {showWhyAnalysis ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Enable 5 Why
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {showWhyAnalysis && (
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Keep asking "Why?" to drill down from symptoms to root cause.
                {filledWhyCount > 0 && (
                  <span className="ml-2 text-blue-600 font-semibold">
                    ({filledWhyCount}/5 completed)
                  </span>
                )}
              </p>
            </div>

            {whyFields.map((field, index) => (
              <div key={field.key} className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <div className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                    ${formData[field.key]?.trim() ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                  `}>
                    {index + 1}
                  </div>
                  {field.label}
                </label>
                <Textarea
                  placeholder={field.placeholder}
                  value={formData[field.key]}
                  onChange={(e) => updateFormData({ [field.key]: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              </div>
            ))}

            {filledWhyCount >= 3 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <strong>Good progress!</strong> You've identified {filledWhyCount} levels of root causes.
                </p>
              </div>
            )}
          </CardContent>
        )}

        {!showWhyAnalysis && (
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Click "Enable 5 Why" to add deeper root cause analysis</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
