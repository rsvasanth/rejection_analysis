import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, User, Calendar, Target, Shield, TrendingUp, Package, FileText } from "lucide-react";
import type { CARFormData, LotInspectionRecord } from "../types";

interface Step5Props {
  formData: CARFormData;
  inspectionRecord: LotInspectionRecord;
}

export function Step5Review({ formData, inspectionRecord }: Step5Props) {
  // Completeness check
  const checks = [
    { label: 'Problem described', value: !!formData.problem_description, required: true },
    { label: 'Root cause identified (3 whys minimum)', value: [formData.why_1, formData.why_2, formData.why_3].every(w => w.trim()), required: true },
    { label: 'Cause for occurrence', value: !!formData.cause_for_occurrence, required: true },
    { label: 'Cause for non-detection', value: !!formData.cause_for_non_detection, required: true },
    { label: 'Corrective action defined', value: !!formData.corrective_action, required: true },
    { label: 'Responsible person assigned', value: !!formData.responsible_person, required: true },
    { label: 'Target date set', value: !!formData.target_date, required: true },
    { label: 'Preventive measures (recommended)', value: !!formData.preventive_measures, required: false },
  ]

  const requiredChecks = checks.filter(c => c.required)
  const completedRequired = requiredChecks.filter(c => c.value).length
  const completionPercentage = (completedRequired / requiredChecks.length) * 100

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Review & Submit</h2>
        <p className="text-muted-foreground mt-1">
          Review your CAR before submitting
        </p>
      </div>

      {/* Completeness Check */}
      <Card className={`${
        completionPercentage === 100 ? 'border-green-200 bg-green-50/30' : 'border-yellow-200 bg-yellow-50/30'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {completionPercentage === 100 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            Completeness Check
          </CardTitle>
          <CardDescription>
            {completionPercentage === 100 ? (
              <span className="text-green-700 font-medium">All required fields completed!</span>
            ) : (
              <span className="text-yellow-700 font-medium">
                {completedRequired} of {requiredChecks.length} required items completed
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checks.map((check, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-white">
                {check.value ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                )}
                <span className={`text-sm ${check.value ? 'text-gray-900' : 'text-gray-500'}`}>
                  {check.label}
                </span>
                {!check.required && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    Optional
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CAR Summary */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            CAR Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lot Information */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Lot Information</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Lot Number:</span>
                <span className="ml-2 font-mono font-bold">{inspectionRecord.lot_no}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rejection:</span>
                <Badge variant="destructive" className="ml-2">
                  {inspectionRecord.lot_rej_pct.toFixed(2)}%
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Item:</span>
                <span className="ml-2 font-mono">{inspectionRecord.item_code}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mould:</span>
                <span className="ml-2 font-mono">{inspectionRecord.mould_ref}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Operator:</span>
                <span className="ml-2">{inspectionRecord.operator_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Press:</span>
                <span className="ml-2">{inspectionRecord.press_number}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Root Cause */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <h4 className="font-semibold text-sm">Root Cause</h4>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-sm">
              {formData.cause_for_occurrence || <span className="text-muted-foreground">Not specified</span>}
            </div>
            {formData.why_5 && (
              <div className="p-2 bg-orange-100 rounded text-xs">
                <span className="font-semibold">Final Why:</span> {formData.why_5}
              </div>
            )}
          </div>

          <Separator />

          {/* Corrective Action */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold text-sm">Corrective Action</h4>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm whitespace-pre-wrap">
              {formData.corrective_action || <span className="text-muted-foreground">Not specified</span>}
            </div>
          </div>

          {formData.preventive_measures && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-sm">Preventive Measures</h4>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm whitespace-pre-wrap">
                  {formData.preventive_measures}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Assignment */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-purple-600" />
              <h4 className="font-semibold text-purple-900">Assignment</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Responsible Person:</span>
                <span className="ml-2 font-semibold">{formData.responsible_person || 'Not assigned'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Target Date:</span>
                <span className="ml-2 font-semibold">
                  {formData.target_date ? 
                    new Date(formData.target_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 
                    'Not set'
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Remarks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Remarks (Optional)</CardTitle>
          <CardDescription>
            Any other notes or observations about this CAR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            id="remarks"
            value={formData.remarks}
            onChange={(e) => {
              // This won't work as formData is read-only in this component
              // But keeping for UI consistency
            }}
            placeholder="Additional comments, observations, or special instructions..."
            className="min-h-[100px] bg-gray-50"
            disabled
          />
          <p className="text-xs text-muted-foreground mt-2">
            💡 You can go back to any step to make changes before submitting
          </p>
        </CardContent>
      </Card>

      {/* Warning Box */}
      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-900 mb-1">
                This CAR will be tracked until completion
              </p>
              <ul className="text-yellow-800 space-y-1 text-xs list-disc list-inside">
                <li>Notifications will be sent to the responsible person</li>
                <li>Status updates are required at regular intervals</li>
                <li>Overdue CARs will escalate to Quality Manager</li>
                <li>CAR effectiveness will be verified after completion</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Instructions */}
      {completionPercentage === 100 ? (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-green-900 mb-2">
              Ready to Submit!
            </h3>
            <p className="text-sm text-green-700">
              Click the "Submit CAR" button below to create this Corrective Action Report
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-900 mb-2">
              Cannot Submit Yet
            </h3>
            <p className="text-sm text-red-700">
              Please complete all required fields before submitting
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
