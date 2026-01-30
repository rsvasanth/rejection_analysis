import { FrappeProvider } from 'frappe-react-sdk'
import { RouterProvider, createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/error-boundary'
import { UserProvider } from '@/utils/auth/UserProvider'
import { ProtectedRoute } from '@/utils/auth/ProtectedRoute'
import { Toaster } from 'sonner'
import './App.css'

// ✅ Configure router with lazy-loaded routes
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public Routes */}
      <Route path='/login' lazy={() => import('@/pages/auth/Login')} />

      {/* Protected Routes - Wrapped with ProtectedRoute */}
      <Route path="/" element={<ProtectedRoute />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" lazy={() => import('@/pages/Dashboard')} />
        <Route path="/rejection-analysis" lazy={() => import('@/pages/RejectionAnalysis')} />
        <Route path="/batch-rejection-analysis" lazy={() => import('@/pages/BatchRejectionAnalysis')} />
        <Route path="/drill-down-report" lazy={() => import('@/pages/DrillDownRejectionReport')} />
        <Route path="/meta-report" lazy={() => import('@/pages/MetaReport')} />
        <Route path="/performance-rankings" lazy={() => import('@/pages/PerformanceRankings')} />
        <Route path="/cost-analysis" lazy={() => import('@/pages/CostAnalysis')} />
        <Route path="/operator-traceability" lazy={() => import('@/pages/OperatorTraceability')} />
        <Route path="/reports" lazy={() => import('@/pages/Reports')} />
        <Route path="/settings" lazy={() => import('@/pages/Settings')} />
      </Route>

      {/* 404 Not Found */}
      <Route path='*' lazy={() => import('@/pages/NotFound')} />
    </>
  ),
  {
    // ✅ FIX: Only use basename in production, not in dev
    basename: import.meta.env.DEV ? '/' : '/rejection_analysis_console',
  }
)

function App() {
  return (
    <ErrorBoundary>
      <FrappeProvider>
        <UserProvider>
          <Toaster richColors position="top-right" />
          <RouterProvider router={router} />
        </UserProvider>
      </FrappeProvider>
    </ErrorBoundary>
  )
}

export default App
