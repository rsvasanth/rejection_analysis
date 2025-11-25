# AI Agent Implementation Guide - Rejection Analysis Console
**Authentication & Routing System Implementation**

---

## 🎯 OBJECTIVE

Implement a production-ready authentication and routing system for the Rejection Analysis Console React SPA, following the architecture pattern used in the Raven app (The Commit Company).

---

## 📍 CURRENT STATE

### What's Already Done ✅
- [x] Frappe Doppio installed and configured
- [x] React app scaffolded with TypeScript
- [x] frappe-react-sdk installed
- [x] TailwindCSS v4 configured
- [x] shadcn/ui components installed (dashboard-01, login-01 blocks)
- [x] React Router DOM installed
- [x] Basic login form created
- [x] Dashboard layout with sidebar created
- [x] Error Boundary component created

### Current Problem ❌
- Login succeeds but page doesn't redirect to dashboard
- Authentication state not properly managed
- Using hash-based navigation instead of proper routing
- No UserProvider context wrapper
- No ProtectedRoute implementation

### File Locations
```
/Users/alphaworkz/frappe-bench/apps/rejection_analysis/
├── rejection_analysis_console/          # React SPA
│   ├── src/
│   │   ├── App.tsx                      # ❌ NEEDS COMPLETE REWRITE
│   │   ├── main.tsx                     # ✅ OK (leave as is)
│   │   ├── components/
│   │   │   ├── error-boundary.tsx       # ✅ ALREADY EXISTS
│   │   │   ├── login-form.tsx           # ❌ NEEDS UPDATE
│   │   │   ├── login-page.tsx           # ✅ OK
│   │   │   ├── dashboard-layout.tsx     # ✅ OK
│   │   │   ├── app-sidebar.tsx          # ❌ NEEDS UPDATE (links)
│   │   │   ├── nav-main.tsx             # ❌ NEEDS UPDATE (use Link)
│   │   │   └── ui/                      # ✅ shadcn/ui components
│   │   ├── pages/                       # ⚠️  NEEDS TO BE CREATED
│   │   └── utils/                       # ⚠️  NEEDS TO BE CREATED
│   │       └── auth/                    # ⚠️  CREATE THIS
│   ├── package.json
│   └── vite.config.ts
└── rejection_analysis/
    ├── hooks.py                         # ✅ Routing configured
    └── www/
        └── rejection_analysis_console.html
```

---

## 🎯 IMPLEMENTATION TASKS

### TASK 1: Create UserProvider Context
**File:** `src/utils/auth/UserProvider.tsx` (NEW FILE)

**Purpose:** 
- Wrap frappe-react-sdk's useFrappeAuth()
- Provide authentication state globally via React Context
- Handle logout with proper cache clearing

**Code:**
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
        // Clear local storage cache
        localStorage.removeItem('app-cache')
        localStorage.removeItem('app-cache-timestamp')

        return logout()
            .then(() => {
                // Clear SWR cache
                return mutate(() => true, undefined, false)
            })
            .then(() => {
                // Redirect to login page
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

---

### TASK 2: Create ProtectedRoute Component
**File:** `src/utils/auth/ProtectedRoute.tsx` (NEW FILE)

**Purpose:** 
- Check if user is authenticated before showing protected pages
- Show loading state while checking authentication
- Redirect to /login if not authenticated
- Use React Router's Outlet for nested routes

**Code:**
```tsx
import { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { UserContext } from './UserProvider'

export const ProtectedRoute = () => {
    const { currentUser, isLoading } = useContext(UserContext)

    // Show loading screen while checking authentication
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
    
    // Redirect to login if not authenticated
    if (!currentUser || currentUser === 'Guest') {
        return <Navigate to="/login" replace />
    }
    
    // Render nested routes if authenticated
    return <Outlet />
}
```

---

### TASK 3: Update Login Form Component
**File:** `src/components/login-form.tsx` (UPDATE EXISTING)

**Changes Needed:**
1. Import useNavigate and useEffect from react-router-dom
2. Import useContext for UserContext
3. Add useEffect to watch currentUser and redirect when it changes
4. Simplify handleSubmit (remove manual redirect)

**Updated Code:**
```tsx
import { useState, useEffect, useContext } from "react"
import { useNavigate } from "react-router-dom"
import { useFrappeAuth } from "frappe-react-sdk"
import { UserContext } from "@/utils/auth/UserProvider"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { currentUser } = useContext(UserContext)
  const { login } = useFrappeAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  // ✅ KEY FIX: Redirect when user becomes authenticated
  useEffect(() => {
    if (currentUser && currentUser !== 'Guest') {
      navigate('/dashboard', { replace: true })
    }
  }, [currentUser, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login({ username, password })
      // No manual redirect needed - useEffect will handle it
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid username or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
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

### TASK 4: Create Page Components (Lazy Loaded)
**Purpose:** Create separate page components for lazy loading

#### 4a. Dashboard Page
**File:** `src/pages/Dashboard.tsx` (NEW FILE)

```tsx
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
```

#### 4b. Rejection Analysis Page
**File:** `src/pages/RejectionAnalysis.tsx` (NEW FILE)

```tsx
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
```

#### 4c. Reports Page
**File:** `src/pages/Reports.tsx` (NEW FILE)

```tsx
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'

export function Component() {
  return (
    <DashboardLayout>
      <SiteHeader />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-2xl font-semibold mb-4">Reports</h2>
          <p className="text-muted-foreground">Reports coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
```

#### 4d. Settings Page
**File:** `src/pages/Settings.tsx` (NEW FILE)

```tsx
import { DashboardLayout } from '@/components/dashboard-layout'
import { SiteHeader } from '@/components/site-header'

export function Component() {
  return (
    <DashboardLayout>
      <SiteHeader />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-2xl font-semibold mb-4">Settings</h2>
          <p className="text-muted-foreground">Settings page coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
```

#### 4e. Login Page
**File:** `src/pages/auth/Login.tsx` (NEW FILE)

```tsx
import { LoginPage } from '@/components/login-page'

export function Component() {
  return <LoginPage />
}
```

#### 4f. Not Found Page
**File:** `src/pages/NotFound.tsx` (NEW FILE)

```tsx
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function Component() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Page Not Found</p>
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
```

---

### TASK 5: Complete Rewrite of App.tsx
**File:** `src/App.tsx` (REPLACE ENTIRE FILE)

**Purpose:** 
- Set up React Router with proper basename
- Wrap app with all necessary providers
- Configure lazy-loaded routes
- Set up protected and public routes

**Complete New Code:**
```tsx
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
        <Route path="/reports" lazy={() => import('@/pages/Reports')} />
        <Route path="/settings" lazy={() => import('@/pages/Settings')} />
      </Route>
      
      {/* 404 Not Found */}
      <Route path='*' lazy={() => import('@/pages/NotFound')} />
    </>
  ),
  {
    // ✅ IMPORTANT: basename must match Frappe route
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

---

### TASK 6: Update Navigation Components

#### 6a. Update nav-main.tsx
**File:** `src/components/nav-main.tsx` (UPDATE EXISTING)

**Change:** Replace `<a href="#">` with React Router `<Link>`

**Key Changes:**
```tsx
// ADD this import at the top
import { Link } from "react-router-dom"

// CHANGE this line in the map function:
// FROM:
<a href={item.url}>

// TO:
<Link to={item.url}>

// And close with:
</Link>
```

**Complete Updated Code:**
```tsx
import { IconCirclePlusFilled, IconMail, type Icon } from "@tabler/icons-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />
              <span>Quick Create</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <IconMail />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild>
                <Link to={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
```

#### 6b. Update app-sidebar.tsx
**File:** `src/components/app-sidebar.tsx` (UPDATE EXISTING)

**Change:** Update URLs to use route paths instead of hash-based URLs

**Key Changes:**
```tsx
// CHANGE the navMain data object URLs:
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",  // ✅ Changed from "#dashboard"
      icon: IconDashboard,
    },
    {
      title: "Rejection Analysis",
      url: "/rejection-analysis",  // ✅ Changed from "#rejection-analysis"
      icon: IconChartBar,
    },
    {
      title: "Reports",
      url: "/reports",  // ✅ Changed from "#reports"
      icon: IconFileAnalytics,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",  // ✅ Changed from "#settings"
      icon: IconSettings,
    },
    // ...existing code...
  ],
  // ...existing code...
}
```

---

### TASK 7: Update TypeScript Path Aliases
**File:** `tsconfig.json` (VERIFY EXISTING)

**Ensure this configuration exists:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**File:** `tsconfig.app.json` (VERIFY EXISTING)

**Ensure this configuration exists:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 🔍 VERIFICATION STEPS

After implementing all tasks, verify the implementation:

### 1. Check File Structure
```bash
cd /Users/alphaworkz/frappe-bench/apps/rejection_analysis/rejection_analysis_console

# Check if new files were created
ls -la src/utils/auth/
# Should show: UserProvider.tsx, ProtectedRoute.tsx

ls -la src/pages/
# Should show: Dashboard.tsx, RejectionAnalysis.tsx, Reports.tsx, Settings.tsx, NotFound.tsx

ls -la src/pages/auth/
# Should show: Login.tsx
```

### 2. Check for TypeScript Errors
```bash
cd /Users/alphaworkz/frappe-bench/apps/rejection_analysis/rejection_analysis_console
npx tsc --noEmit
```

Should show **0 errors**.

### 3. Build the Application
```bash
cd /Users/alphaworkz/frappe-bench/apps/rejection_analysis
yarn build
```

Should complete successfully with no errors.

### 4. Test Authentication Flow

**Test Scenario 1: Login Flow**
1. Visit: `http://spp15.local:8000/rejection_analysis_console`
2. Should redirect to: `http://spp15.local:8000/rejection_analysis_console/login`
3. Enter credentials and submit
4. Should redirect to: `http://spp15.local:8000/rejection_analysis_console/dashboard`
5. Verify dashboard shows: "Welcome, Administrator!"

**Test Scenario 2: Direct Protected Route Access**
1. Logout (click user menu → logout)
2. Try visiting: `http://spp15.local:8000/rejection_analysis_console/reports`
3. Should redirect to: `http://spp15.local:8000/rejection_analysis_console/login`

**Test Scenario 3: Navigation**
1. Login successfully
2. Click sidebar menu items:
   - Dashboard → URL changes to `/dashboard`
   - Rejection Analysis → URL changes to `/rejection-analysis`
   - Reports → URL changes to `/reports`
   - Settings → URL changes to `/settings`
3. Verify each page loads correctly

**Test Scenario 4: Already Logged In**
1. Login to Frappe Desk first
2. Visit: `http://spp15.local:8000/rejection_analysis_console`
3. Should automatically show dashboard (no login prompt)

**Test Scenario 5: Logout**
1. Click user avatar in sidebar footer
2. Click "Log out"
3. Should clear cache and redirect to login page

---

## 🐛 TROUBLESHOOTING

### Issue: "Module not found" errors
**Solution:** 
```bash
cd /Users/alphaworkz/frappe-bench/apps/rejection_analysis/rejection_analysis_console
yarn install
```

### Issue: TypeScript errors about missing types
**Solution:**
```bash
yarn add -D @types/node
```

### Issue: Routes not working (404 errors)
**Check:**
1. Verify `basename` in router matches Frappe route
2. Check `hooks.py` has correct `website_route_rules`
3. Rebuild app: `yarn build`

### Issue: Login succeeds but doesn't redirect
**Check:**
1. Verify `UserProvider` is wrapping the router
2. Verify `useEffect` in login form is watching `currentUser`
3. Check browser console for errors

### Issue: "Cannot read property of undefined" errors
**Check:**
1. Verify all imports are correct
2. Verify UserContext is provided before being consumed
3. Check component hierarchy in App.tsx

---

## 📊 EXPECTED RESULT

After successful implementation:

```
User Flow:
┌──────────────────────────────────────────┐
│ Visit: /rejection_analysis_console      │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ FrappeProvider checks session            │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ UserProvider wraps app                   │
│ - useFrappeAuth() gets currentUser       │
└─────────────┬────────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
┌──────────┐  ┌────────────┐
│ Logged   │  │ Not        │
│ In       │  │ Logged In  │
└────┬─────┘  └─────┬──────┘
     │              │
     ▼              ▼
┌──────────┐  ┌────────────┐
│ Show     │  │ Redirect   │
│ Dashboard│  │ to /login  │
└──────────┘  └────────────┘
```

---

## ✅ FINAL CHECKLIST

Before marking this task as complete:

- [ ] UserProvider.tsx created and working
- [ ] ProtectedRoute.tsx created and working
- [ ] login-form.tsx updated with useEffect redirect
- [ ] All page components created (Dashboard, RejectionAnalysis, Reports, Settings, Login, NotFound)
- [ ] App.tsx completely rewritten with router
- [ ] nav-main.tsx updated to use React Router Link
- [ ] app-sidebar.tsx updated with proper route paths
- [ ] TypeScript compiles with 0 errors
- [ ] yarn build completes successfully
- [ ] Login flow works (redirects to dashboard after login)
- [ ] Protected routes redirect to login when not authenticated
- [ ] Navigation between pages works
- [ ] Logout works (clears cache and redirects to login)
- [ ] Already logged-in users see dashboard immediately

---

## 📝 NOTES FOR AI AGENT

### Important Context:
1. This is a Frappe Framework app, not a standalone React app
2. The React SPA is served at `/rejection_analysis_console` route
3. Authentication is handled by Frappe (session cookies)
4. frappe-react-sdk automatically detects existing Frappe sessions
5. The basename in React Router MUST match the Frappe route
6. All page components use lazy loading for better performance
7. Pattern is based on Raven app (proven production app)

### Critical Implementation Points:
1. **UserProvider must wrap RouterProvider** - Not the other way around
2. **ProtectedRoute uses Outlet** - For nested routes
3. **Login uses useEffect** - To watch currentUser changes
4. **All navigation uses React Router Link** - No hash-based navigation
5. **Lazy loading uses lazy()** - For code splitting
6. **basename is critical** - Must match Frappe website_route_rules

### Common Mistakes to Avoid:
❌ Don't use window.location.href for navigation
❌ Don't use hash-based URLs (#dashboard)
❌ Don't call updateCurrentUser() manually after login
❌ Don't forget the basename in router config
❌ Don't use <a href> tags, use <Link to>
❌ Don't wrap FrappeProvider inside UserProvider

### Correct Provider Hierarchy:
```tsx
<ErrorBoundary>
  <FrappeProvider>          // ← Outer (provides Frappe context)
    <UserProvider>          // ← Middle (provides user context)
      <RouterProvider />    // ← Inner (provides routing)
    </UserProvider>
  </FrappeProvider>
</ErrorBoundary>
```

---

**END OF IMPLEMENTATION GUIDE**
