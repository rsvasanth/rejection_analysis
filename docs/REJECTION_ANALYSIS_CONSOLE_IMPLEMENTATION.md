# Rejection Analysis Console - Complete Implementation Guide

**Date:** November 25, 2025  
**Based on:** Raven App Architecture Analysis  
**Framework:** Frappe + React + TypeScript + React Router + shadcn/ui

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Learnings from Raven](#key-learnings-from-raven)
3. [Implementation Strategy](#implementation-strategy)
4. [File Structure](#file-structure)
5. [Core Components](#core-components)
6. [Authentication Flow](#authentication-flow)
7. [Routing Strategy](#routing-strategy)
8. [Error Handling](#error-handling)
9. [State Management](#state-management)
10. [Build & Deployment](#build--deployment)

---

## 🏗️ Architecture Overview

### Technology Stack
```
Frontend:
├── React 19.x (UI Library)
├── TypeScript (Type Safety)
├── React Router 7.x (Routing)
├── frappe-react-sdk (Frappe Integration)
├── TailwindCSS v4 (Styling)
├── shadcn/ui (Component Library)
├── Vite 7.x (Build Tool)
└── SWR (Data Fetching & Caching)

Backend:
├── Frappe Framework (Python)
├── MariaDB (Database)
└── Redis (Caching & Queue)
```

### Architecture Pattern
```
┌─────────────────────────────────────────────┐
│          Browser (React SPA)                │
├─────────────────────────────────────────────┤
│   React Router + Protected Routes           │
├─────────────────────────────────────────────┤
│   FrappeProvider (frappe-react-sdk)         │
├─────────────────────────────────────────────┤
│   UserProvider (Auth Context)               │
├─────────────────────────────────────────────┤
│   Error Boundary                            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       Frappe Backend (Python)               │
├─────────────────────────────────────────────┤
│   API Endpoints (/api/method/*)             │
├─────────────────────────────────────────────┤
│   Authentication & Session                  │
├─────────────────────────────────────────────┤
│   Database (MariaDB)                        │
└─────────────────────────────────────────────┘
```

---

## 🎓 Key Learnings from Raven

### 1. **UserProvider Pattern** ✅
Raven uses a **UserProvider** context wrapper that:
- Wraps `useFrappeAuth()` from frappe-react-sdk
- Provides auth state to entire app via React Context
- Handles logout with cache clearing
- Manages push notifications on logout

**Key Code:**
```tsx
export const UserProvider: FC<PropsWithChildren> = ({ children }) => {
    const { logout, currentUser, updateCurrentUser, isLoading } = useFrappeAuth()
    
    const handleLogout = async () => {
        // Clear cache
        localStorage.removeItem('app-cache')
        // Logout from Frappe
        return logout()
            .then(() => mutate(() => true, undefined, false))
            .then(() => window.location.replace('/login'))
    }
    
    return (
        <UserContext.Provider value={{ 
            isLoading, 
            currentUser: currentUser ?? "", 
            logout: handleLogout,
            updateCurrentUser 
        }}>
            {children}
        </UserContext.Provider>
    )
}
```

### 2. **ProtectedRoute Component** ✅
Simple and effective protected route implementation:

```tsx
export const ProtectedRoute = () => {
    const { currentUser, isLoading } = useContext(UserContext)

    if (isLoading) {
        return <LoadingScreen />
    }
    else if (!currentUser || currentUser === 'Guest') {
        return <Navigate to="/login" />
    }
    return <Outlet />
}
```

**Why it works:**
- Uses React Router's `<Outlet />` for nested routes
- Checks loading state first (prevents flash of login page)
- Redirects to `/login` if not authenticated
- Clean and declarative

### 3. **React Router Setup** ✅
Raven uses **lazy loading** for better performance:

```tsx
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public Routes */}
      <Route path='/login' lazy={() => import('@/pages/auth/Login')} />
      
      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute />}>
        <Route path="/dashboard" lazy={() => import('@/pages/Dashboard')} />
        <Route path="/settings" lazy={() => import('@/pages/Settings')} />
      </Route>
    </>
  ), 
  {
    basename: import.meta.env.VITE_BASE_NAME ? `/${import.meta.env.VITE_BASE_NAME}` : '',
  }
)
```

**Key Features:**
- `lazy()` for code splitting
- `basename` for Frappe app routing
- Nested routes with `<Outlet />`
- Error boundaries per route

### 4. **SWR Cache Management** ✅
Raven implements intelligent cache management:

```tsx
function localStorageProvider() {
  const map = new Map<string, any>(JSON.parse(localStorage.getItem('app-cache')))
  
  window.addEventListener('beforeunload', () => {
    // Only cache specific keys
    const cacheEntries = []
    for (const [key, value] of map.entries()) {
      if (CACHE_KEYS.some(cacheKey => key.includes(cacheKey))) {
        cacheEntries.push([key, value])
      }
    }
    localStorage.setItem('app-cache', JSON.stringify(cacheEntries))
  })
  
  return map
}
```

**Benefits:**
- Persists data across page reloads
- Selective caching (not everything)
- Timestamp-based cache expiration
- Clears on logout

### 5. **Environment Handling** ✅
Separate dev and production boot contexts:

```tsx
if (import.meta.env.DEV) {
  fetch('/api/method/raven.www.raven.get_context_for_dev')
    .then(response => response.json())
    .then((values) => {
      window.frappe.boot = JSON.parse(values.message)
      // Mount app
    })
} else {
  // Production - frappe.boot already available
}
```

### 6. **Error Boundary** ✅
Route-level error boundaries:

```tsx
<Route path="/" element={<ProtectedRoute />} errorElement={<ErrorPage />}>
  {/* Nested routes */}
</Route>
```

---

## 🎯 Implementation Strategy

### Phase 1: Core Setup ✅ DONE
- [x] Install Doppio
- [x] Create React app with TypeScript
- [x] Install frappe-react-sdk
- [x] Setup TailwindCSS v4
- [x] Install shadcn/ui
- [x] Install React Router

### Phase 2: Authentication System (CURRENT)
- [ ] Create UserProvider context
- [ ] Implement ProtectedRoute component
- [ ] Setup login page
- [ ] Configure React Router with basename
- [ ] Test authentication flow

### Phase 3: Layout & Navigation
- [ ] Dashboard layout with sidebar
- [ ] Header component
- [ ] Navigation menu
- [ ] Settings pages
- [ ] Profile management

### Phase 4: Rejection Analysis Features
- [ ] Dashboard with charts
- [ ] Data tables
- [ ] Filters and search
- [ ] Export functionality
- [ ] Real-time updates

### Phase 5: Polish & Optimization
- [ ] Error handling
- [ ] Loading states
- [ ] Cache optimization
- [ ] Performance tuning
- [ ] Mobile responsiveness

---

## 📁 Recommended File Structure

```
rejection_analysis_console/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component with providers
│   ├── index.css                   # Global styles
│   │
│   ├── components/                 # Reusable components
│   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/                 # Layout components
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   └── features/               # Feature-specific components
│   │       ├── rejection-analysis/
│   │       ├── reports/
│   │       └── settings/
│   │
│   ├── pages/                      # Page components
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   └── Logout.tsx
│   │   │
│   │   ├── Dashboard.tsx
│   │   ├── RejectionAnalysis.tsx
│   │   ├── Reports.tsx
│   │   ├── Settings.tsx
│   │   ├── NotFound.tsx
│   │   └── ErrorPage.tsx
│   │
│   ├── utils/                      # Utility functions
│   │   ├── auth/
│   │   │   ├── UserProvider.tsx   # Auth context provider
│   │   │   └── ProtectedRoute.tsx # Protected route component
│   │   │
│   │   ├── cn.ts                  # Class name utility
│   │   └── api.ts                 # API helpers
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useLocalStorage.ts
│   │   └── useStickyState.ts
│   │
│   ├── types/                      # TypeScript types
│   │   ├── index.d.ts
│   │   └── frappe.d.ts
│   │
│   └── lib/
│       └── utils.ts                # Shared utilities
│
├── public/                         # Static assets
├── index.html                      # HTML template
├── vite.config.ts                  # Vite configuration
├── tailwind.config.js              # Tailwind configuration
├── tsconfig.json                   # TypeScript configuration
├── components.json                 # shadcn/ui configuration
├── proxyOptions.ts                 # Vite proxy config
└── package.json                    # Dependencies
```

---

## 🔑 Core Components Implementation

### 1. UserProvider (src/utils/auth/UserProvider.tsx)

```tsx
import { useFrappeAuth, useSWRConfig } from 'frappe-react-sdk'
import { FC, PropsWithChildren, createContext } from 'react'
import { toast } from 'sonner'

interface UserContextProps {
    isLoading: boolean
    currentUser: string
    logout: () => Promise<void>
    updateCurrentUser: VoidFunction
}

export const UserContext = createContext<UserContextProps>({
    currentUser: '',
    isLoading: false,
    logout: () => Promise.resolve(),
    updateCurrentUser: () => {},
})

export const UserProvider: FC<PropsWithChildren> = ({ children }) => {
    const { mutate } = useSWRConfig()
    const { logout, currentUser, updateCurrentUser, isLoading } = useFrappeAuth()

    const handleLogout = async () => {
        // Clear local cache
        localStorage.removeItem('app-cache')
        localStorage.removeItem('app-cache-timestamp')

        return logout()
            .then(() => {
                // Clear SWR cache
                return mutate(() => true, undefined, false)
            })
            .then(() => {
                // Redirect to login
                window.location.replace('/rejection_analysis_console/login')
            })
            .catch((error) => {
                toast.error('Failed to logout', {
                    description: error.message
                })
            })
    }

    return (
        <UserContext.Provider value={{ 
            isLoading, 
            updateCurrentUser, 
            logout: handleLogout, 
            currentUser: currentUser ?? "" 
        }}>
            {children}
        </UserContext.Provider>
    )
}
```

### 2. ProtectedRoute (src/utils/auth/ProtectedRoute.tsx)

```tsx
import { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { UserContext } from './UserProvider'

export const ProtectedRoute = () => {
    const { currentUser, isLoading } = useContext(UserContext)

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }
    
    if (!currentUser || currentUser === 'Guest') {
        return <Navigate to="/login" replace />
    }
    
    return <Outlet />
}
```

### 3. ErrorBoundary (src/components/ErrorBoundary.tsx)

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-4">Oops!</h1>
            <p className="text-muted-foreground mb-6">
              Something went wrong. Please try refreshing the page.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-muted p-4 rounded mb-4 text-left overflow-auto">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

### 4. App.tsx (Main Application)

```tsx
import { FrappeProvider } from 'frappe-react-sdk'
import { RouterProvider, createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { UserProvider } from '@/utils/auth/UserProvider'
import { ProtectedRoute } from '@/utils/auth/ProtectedRoute'
import { Toaster } from 'sonner'
import './index.css'

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public Routes */}
      <Route path='/login' lazy={() => import('@/pages/auth/Login')} />
      
      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" lazy={() => import('@/pages/Dashboard')} />
        <Route path="/rejection-analysis" lazy={() => import('@/pages/RejectionAnalysis')} />
        <Route path="/reports" lazy={() => import('@/pages/Reports')} />
        <Route path="/settings" lazy={() => import('@/pages/Settings')} />
      </Route>
      
      {/* 404 Page */}
      <Route path='*' lazy={() => import('@/pages/NotFound')} />
    </>
  ),
  {
    basename: '/rejection_analysis_console',
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
```

### 5. Login Page (src/pages/auth/Login.tsx)

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFrappeAuth } from 'frappe-react-sdk'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Component() {
  const { currentUser, login } = useFrappeAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser && currentUser !== 'Guest') {
      navigate('/dashboard', { replace: true })
    }
  }, [currentUser, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login({ username, password })
      // Navigation will happen automatically via useEffect
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid username or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Rejection Analysis Console</CardTitle>
          <CardDescription>
            Enter your credentials to access the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Administrator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────┐
│  User visits /rejection_analysis_console    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  App.tsx loads with FrappeProvider          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  UserProvider wraps routes                  │
│  - useFrappeAuth() checks session           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Router matches path                        │
└─────────────────┬───────────────────────────┘
                  │
           ┌──────┴──────┐
           │             │
           ▼             ▼
    ┌──────────┐   ┌──────────┐
    │ Public   │   │Protected │
    │ Route    │   │ Route    │
    │ (/login) │   │ (/)      │
    └──────────┘   └────┬─────┘
                        │
                        ▼
              ┌─────────────────┐
              │ ProtectedRoute  │
              │ Component       │
              └────┬────────────┘
                   │
            ┌──────┴──────┐
            │             │
            ▼             ▼
    ┌────────────┐ ┌──────────────┐
    │ Logged In  │ │ Not Logged   │
    │ Show Page  │ │ Redirect to  │
    │            │ │ /login       │
    └────────────┘ └──────────────┘
```

---

## 🚦 Routing Strategy

### Route Configuration
```tsx
/rejection_analysis_console/
├── /login                    # Public - Login page
├── /                         # Protected - Root redirect to /dashboard
├── /dashboard                # Protected - Main dashboard
├── /rejection-analysis       # Protected - Analysis page
├── /reports                  # Protected - Reports page
├── /settings                 # Protected - Settings page
│   ├── /profile             # Protected - User profile
│   ├── /preferences         # Protected - User preferences
│   └── /help                # Protected - Help & support
└── *                         # Public - 404 Not Found
```

### Navigation Links
```tsx
// In Sidebar component
<Link to="/dashboard">Dashboard</Link>
<Link to="/rejection-analysis">Rejection Analysis</Link>
<Link to="/reports">Reports</Link>
<Link to="/settings">Settings</Link>
```

---

## ⚠️ Error Handling Strategy

### 1. Error Boundary (Component-level errors)
```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### 2. Route-level errors
```tsx
<Route path="/" element={<ProtectedRoute />} errorElement={<ErrorPage />}>
  {/* Routes */}
</Route>
```

### 3. API errors (via toast notifications)
```tsx
import { toast } from 'sonner'

try {
  await someApiCall()
} catch (error) {
  toast.error('Operation failed', {
    description: error.message
  })
}
```

### 4. Form validation errors
```tsx
{error && (
  <div className="p-3 bg-red-50 border border-red-200 rounded">
    {error}
  </div>
)}
```

---

## 🗄️ State Management

### 1. Authentication State
- Managed by `UserProvider` (React Context)
- Backed by `useFrappeAuth()` from frappe-react-sdk

### 2. API Data
- Managed by SWR (built into frappe-react-sdk)
- Automatic caching and revalidation

### 3. UI State
- Local component state (`useState`)
- URL state (via React Router)

### 4. Persistent State
- `localStorage` for cache
- `useStickyState` hook for preferences

---

## 🚀 Build & Deployment

### Development
```bash
cd apps/rejection_analysis
yarn dev
```
Access at: `http://spp15.local:8080`

### Production Build
```bash
cd apps/rejection_analysis
yarn build
```

### Frappe Integration
1. Build creates files in `rejection_analysis/public/rejection_analysis_console/`
2. HTML copied to `rejection_analysis/www/rejection_analysis_console.html`
3. Access via: `http://spp15.local:8000/rejection_analysis_console`

### bench build Integration
```json
// apps/rejection_analysis/package.json
{
  "scripts": {
    "postinstall": "cd rejection_analysis_console && yarn install",
    "dev": "cd rejection_analysis_console && yarn dev",
    "build": "cd rejection_analysis_console && yarn build"
  }
}
```

Run: `bench build --app rejection_analysis`

---

## ✅ Implementation Checklist

### Core Setup
- [x] Install React Router DOM
- [ ] Create UserProvider context
- [ ] Create ProtectedRoute component
- [ ] Update Login page with useEffect redirect
- [ ] Update App.tsx with router and providers
- [ ] Update sidebar links to use React Router Link
- [ ] Test authentication flow
- [ ] Test protected routes
- [ ] Test logout functionality

### Pages to Create
- [ ] Dashboard page (lazy loaded)
- [ ] Rejection Analysis page (lazy loaded)
- [ ] Reports page (lazy loaded)
- [ ] Settings page (lazy loaded)
- [ ] NotFound page (404)
- [ ] ErrorPage component

### Polish
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add toast notifications
- [ ] Test mobile responsiveness
- [ ] Performance optimization
- [ ] Cache management

---

## 🎯 Next Steps

1. **Create UserProvider** - Implement authentication context
2. **Create ProtectedRoute** - Implement route protection
3. **Update Login** - Add redirect logic with useEffect
4. **Update App.tsx** - Configure router with all providers
5. **Update Navigation** - Use React Router Link components
6. **Create Pages** - Implement lazy-loaded page components
7. **Test Flow** - Verify complete authentication flow
8. **Build & Deploy** - Test in production mode

---

## 📚 References

- [Raven GitHub](https://github.com/The-Commit-Company/raven)
- [frappe-react-sdk](https://github.com/nikkothari22/frappe-react-sdk)
- [React Router v7](https://reactrouter.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Frappe Framework](https://frappeframework.com)

---

**End of Document**
