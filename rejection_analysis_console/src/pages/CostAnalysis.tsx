import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function CostAnalysisPage() {
    const [apiResponse, setApiResponse] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const testAPI = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/method/rejection_analysis.rejection_analysis.cost_analysis_api.get_cost_analysis_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filters: {
                        from_date: '2025-12-01',
                        to_date: '2025-12-06'
                    }
                })
            })

            const data = await response.json()

            if (data.message) {
                setApiResponse(data.message)
            } else {
                setError('No response data')
            }
        } catch (err) {
            console.error('API Error:', err)
            setError(String(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <DashboardLayout>
            <SiteHeader />
            <div className="flex flex-1 flex-col gap-4 p-4 bg-muted/30">
                {/* Header */}
                <Card className="border-2 shadow-sm">
                    <CardContent className="py-2 px-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Cost Analysis</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Analyze rejection costs and trends
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* API Test Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>API Connection Test</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            onClick={testAPI}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? 'Testing...' : '🏓 Ping API'}
                        </Button>

                        {error && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm font-medium text-red-800">Error:</p>
                                <p className="text-xs text-red-600">{error}</p>
                            </div>
                        )}

                        {apiResponse && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm font-medium text-green-800 mb-2">✅ Success! Response:</p>
                                <pre className="text-xs overflow-auto text-green-900">
                                    {JSON.stringify(apiResponse, null, 2)}
                                </pre>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}

export const Component = CostAnalysisPage
export default CostAnalysisPage
