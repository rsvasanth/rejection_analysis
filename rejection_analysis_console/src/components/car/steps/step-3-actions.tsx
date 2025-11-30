import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Target, Shield } from 'lucide-react'
import type { CARFormData } from '../types'

interface Step3Props {
  formData: CARFormData
  updateFormData: (updates: Partial<CARFormData>) => void
}

export function Step3Actions({ formData, updateFormData }: Step3Props) {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Corrective & Preventive Actions</h2>
        <p className="text-muted-foreground mt-1">
          Define actions to fix the problem and prevent recurrence
        </p>
      </div>

      {/* Corrective Action */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            <div>
              <CardTitle className="text-base">
                Immediate Corrective Action
              </CardTitle>
              <CardDescription>
                What will you do right now to fix this specific problem?
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            id="corrective_action"
            value={formData.corrective_action}
            onChange={(e) => updateFormData({ corrective_action: e.target.value })}
            className="min-h-[140px] bg-white"
            placeholder="Example:
1. Immediately stop production on Press P17
2. Replace damaged mould cavity #3
3. Inspect all parts produced in the last 8 hours
4. Segregate and rework/scrap defective parts
5. Resume production after mould verification"
          />
          
          <div className="p-3 bg-white rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-green-900 mb-1">Corrective action guidelines:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Should fix the immediate problem</li>
                  <li>Be specific with actions and steps</li>
                  <li>Include verification/inspection steps</li>
                  <li>Address containment of affected products</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preventive Measures */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-base">
                Preventive Measures
              </CardTitle>
              <CardDescription>
                How will you prevent this problem from happening again?
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            id="preventive_measures"
            value={formData.preventive_measures}
            onChange={(e) => updateFormData({ preventive_measures: e.target.value })}
            className="min-h-[140px] bg-white"
            placeholder="Example:
1. Establish weekly press calibration checks (Preventive Maintenance)
2. Update standard operating procedures to include force monitoring
3. Provide operator training on equipment settings
4. Install force monitoring sensors with alarms
5. Add mould inspection to daily startup checklist"
          />
          
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-blue-900 mb-1">Preventive measures should:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Address the root cause identified in Step 2</li>
                  <li>Prevent similar issues on other equipment</li>
                  <li>Include process improvements or controls</li>
                  <li>Be sustainable long-term</li>
                  <li>Consider training, procedures, and systems</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Templates */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Common Action Examples
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs">Corrective Actions</Badge>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Replace defective tooling/parts</li>
                <li>Rework or scrap affected products</li>
                <li>Adjust machine parameters</li>
                <li>Retrain operator on procedure</li>
                <li>Repair or service equipment</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs">Preventive Measures</Badge>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Schedule preventive maintenance</li>
                <li>Update work instructions/SOPs</li>
                <li>Implement additional inspections</li>
                <li>Install monitoring equipment</li>
                <li>Standardize process parameters</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Representation */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="bg-red-100 text-red-700 rounded-lg p-3 mb-2">
                <p className="font-bold text-sm">PROBLEM</p>
                <p className="text-xs mt-1">High Rejection</p>
              </div>
              <p className="text-xs text-muted-foreground">Current State</p>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="space-y-2">
                <div className="bg-green-500 text-white rounded px-3 py-1 text-xs font-semibold">
                  Corrective
                </div>
                <div className="bg-blue-500 text-white rounded px-3 py-1 text-xs font-semibold">
                  Preventive
                </div>
              </div>
            </div>
            
            <div>
              <div className="bg-green-100 text-green-700 rounded-lg p-3 mb-2">
                <p className="font-bold text-sm">SOLUTION</p>
                <p className="text-xs mt-1">Quality Restored</p>
              </div>
              <p className="text-xs text-muted-foreground">Target State</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
