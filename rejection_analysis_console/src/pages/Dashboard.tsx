import { useContext } from 'react'
import { UserContext } from '@/utils/auth/UserProvider'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'

export function Component() {
  const { currentUser } = useContext(UserContext)
  
  return (
    <DashboardLayout>
      <SiteHeader />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
          <p className="text-muted-foreground">Welcome, {currentUser}!</p>
          <p className="text-muted-foreground mt-2">Dashboard content coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
