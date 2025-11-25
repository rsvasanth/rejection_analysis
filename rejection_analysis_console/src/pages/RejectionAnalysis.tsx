import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'

export function Component() {
  return (
    <DashboardLayout>
      <SiteHeader />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-2xl font-semibold mb-4">Rejection Analysis</h2>
          <p className="text-muted-foreground">Rejection analysis features coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
