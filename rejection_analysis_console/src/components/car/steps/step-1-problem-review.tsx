import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import type { CARFormData } from '../types'

interface Step1Props {
  formData: CARFormData
  updateFormData: (updates: Partial<CARFormData>) => void
}

export function Step1ProblemReview({ formData, updateFormData }: Step1Props) {
  const trend = formData.rejection_percentage > formData.line_rej_pct ? 'up' : 'stable'
  
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Review the Problem</h2>
        <p className="text-muted-foreground mt-1">
          Review the auto-generated problem description and make any necessary edits
        </p>
      </div>

      {/* Quality Journey Visualization */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Quality Journey
          </CardTitle>
          <CardDescription>Rejection progression through inspection stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs text-muted-foreground mb-2">Patrol</span>
              <Badge variant="outline" className="text-lg font-bold px-4 py-2">
                {formData.patrol_rej_pct.toFixed(2)}%
              </Badge>
            </div>
            
            <div className="flex items-center px-4">
              <div className="w-8 h-0.5 bg-gray-400" />
              <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-400" />
            </div>
            
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs text-muted-foreground mb-2">Line</span>
              <Badge variant="outline" className="text-lg font-bold px-4 py-2">
                {formData.line_rej_pct.toFixed(2)}%
              </Badge>
            </div>
            
            <div className="flex items-center px-4">
              <div className="w-8 h-0.5 bg-gray-400" />
              <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-400" />
            </div>
            
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs text-muted-foreground mb-2">Lot (Final)</span>
              <Badge variant="destructive" className="text-lg font-bold px-4 py-2">
                {formData.rejection_percentage.toFixed(2)}%
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 ml-2" />
                ) : (
                  <TrendingDown className="h-4 w-4 ml-2" />
                )}
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="font-semibold">
                {trend === 'up' ? (
                  <span className="text-red-600">
                    Quality degraded by {(formData.rejection_percentage - formData.line_rej_pct).toFixed(2)}% from Line to Lot inspection
                  </span>
                ) : (
                  <span className="text-yellow-600">
                    Rejection rate remained stable through production
                  </span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Problem Description */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="problem_description" className="text-base font-semibold">
            Problem Description
          </Label>
          <Badge variant="secondary">
            AI-Generated (Editable)
          </Badge>
        </div>
        
        <Textarea
          id="problem_description"
          value={formData.problem_description}
          onChange={(e) => updateFormData({ problem_description: e.target.value })}
          className="min-h-[280px] font-mono text-sm bg-blue-50/50 border-blue-200"
          placeholder="Describe the quality issue in detail..."
        />
        
        <p className="text-xs text-muted-foreground">
          💡 Tip: Include specific details about the defect type, affected parts, and production conditions
        </p>
      </div>

      {/* Production Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Production Context</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Item Code:</span>
              <span className="ml-2 font-mono font-semibold">{formData.item_code}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Mould:</span>
              <span className="ml-2 font-mono font-semibold">{formData.mould_ref}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Press:</span>
              <span className="ml-2 font-semibold">{formData.press_number}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Operator:</span>
              <span className="ml-2 font-semibold">{formData.operator_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>
              <span className="ml-2 font-semibold">
                {new Date(formData.production_date).toLocaleDateString()}
              </span>
            </div>
            {formData.shift_type && (
              <div>
                <span className="text-muted-foreground">Shift:</span>
                <span className="ml-2 font-semibold">{formData.shift_type}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
