import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, Calendar, Clock, Mail, Lightbulb } from 'lucide-react'
import type { CARFormData } from '../types'

interface Step4Props {
  formData: CARFormData
  updateFormData: (updates: Partial<CARFormData>) => void
}

export function Step4Assignment({ formData, updateFormData }: Step4Props) {
  const today = new Date().toISOString().split('T')[0]
  const targetDate = new Date(formData.target_date || today)
  const daysUntilDue = Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  
  const setQuickDate = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    updateFormData({ target_date: date.toISOString().split('T')[0] })
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Assignment & Timeline</h2>
        <p className="text-muted-foreground mt-1">
          Assign responsibility and set completion deadlines
        </p>
      </div>

      {/* Responsible Person */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-purple-600" />
            <div>
              <CardTitle className="text-base">
                Responsible Person
              </CardTitle>
              <CardDescription>
                Who will own and implement this CAR?
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="responsible_person" className="text-sm">
              Employee Name <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Input
              id="responsible_person"
              value={formData.responsible_person}
              onChange={(e) => updateFormData({ responsible_person: e.target.value })}
              placeholder="Enter employee name..."
              className="mt-2 bg-white"
            />
          </div>
          
          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-purple-600 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-purple-900 mb-1">Suggested based on root cause:</p>
                <div className="space-y-1 mt-2">
                  {formData.cause_for_occurrence.toLowerCase().includes('mould') || 
                   formData.cause_for_occurrence.toLowerCase().includes('cavity') ? (
                    <Badge variant="outline" className="mr-2 cursor-pointer hover:bg-purple-100">
                      Maintenance Supervisor
                    </Badge>
                  ) : null}
                  
                  {formData.cause_for_occurrence.toLowerCase().includes('operator') || 
                   formData.cause_for_occurrence.toLowerCase().includes('training') ? (
                    <Badge variant="outline" className="mr-2 cursor-pointer hover:bg-purple-100">
                      Production Manager
                    </Badge>
                  ) : null}
                  
                  {formData.cause_for_occurrence.toLowerCase().includes('process') || 
                   formData.cause_for_occurrence.toLowerCase().includes('procedure') ? (
                    <Badge variant="outline" className="mr-2 cursor-pointer hover:bg-purple-100">
                      Quality Manager
                    </Badge>
                  ) : null}
                  
                  {formData.cause_for_occurrence.toLowerCase().includes('machine') || 
                   formData.cause_for_occurrence.toLowerCase().includes('calibration') ? (
                    <Badge variant="outline" className="mr-2 cursor-pointer hover:bg-purple-100">
                      Maintenance Engineer
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-base">
                Target Completion Date
              </CardTitle>
              <CardDescription>
                When should this CAR be completed?
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="target_date" className="text-sm">
              Due Date <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Input
              id="target_date"
              type="date"
              value={formData.target_date}
              onChange={(e) => updateFormData({ target_date: e.target.value })}
              min={today}
              className="mt-2 bg-white"
            />
          </div>

          {/* Quick Date Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Select:</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDate(3)}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                3 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDate(7)}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                1 Week
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDate(14)}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                2 Weeks
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDate(30)}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                1 Month
              </Button>
            </div>
          </div>

          {/* Timeline Indicator */}
          {formData.target_date && (
            <div className={`p-3 rounded-lg border ${
              daysUntilDue <= 3 ? 'bg-red-50 border-red-200' :
              daysUntilDue <= 7 ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${
                  daysUntilDue <= 3 ? 'text-red-600' :
                  daysUntilDue <= 7 ? 'text-yellow-600' :
                  'text-green-600'
                }`} />
                <p className={`text-sm font-semibold ${
                  daysUntilDue <= 3 ? 'text-red-900' :
                  daysUntilDue <= 7 ? 'text-yellow-900' :
                  'text-green-900'
                }`}>
                  {daysUntilDue > 0 ? (
                    <>Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}</>
                  ) : daysUntilDue === 0 ? (
                    <>Due today</>
                  ) : (
                    <>Overdue by {Math.abs(daysUntilDue)} day{Math.abs(daysUntilDue) !== 1 ? 's' : ''}</>
                  )}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Target: {new Date(formData.target_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-gray-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-600" />
            <div>
              <CardTitle className="text-base">
                Notifications
              </CardTitle>
              <CardDescription>
                Automatic notifications will be sent
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input type="checkbox" checked disabled className="mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Email to responsible person</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Sent immediately upon CAR creation
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input type="checkbox" checked disabled className="mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Reminder notification</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Sent 1 day before target date
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input type="checkbox" checked disabled className="mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Overdue alert</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Escalated to Quality Manager if not completed on time
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Summary */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 text-white rounded-full p-2">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">CAR Assignment</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {formData.responsible_person || 'Not assigned'} • {formData.target_date ? 
                    `Due ${new Date(formData.target_date).toLocaleDateString()}` : 
                    'No due date set'
                  }
                </p>
              </div>
            </div>
            <Badge className="bg-green-600">
              Ready to Review
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
