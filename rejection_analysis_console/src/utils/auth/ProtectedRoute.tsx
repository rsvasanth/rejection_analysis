import { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { UserContext } from './UserProvider'
import Cookies from 'js-cookie'

export const ProtectedRoute = () => {
    const { currentUser, isLoading } = useContext(UserContext)

    // Check if user is logged in via cookie (more reliable than currentUser from SWR)
    const userIdFromCookie = Cookies.get('user_id')
    const isLoggedIn = userIdFromCookie && userIdFromCookie !== 'Guest'

    console.log('🔍 ProtectedRoute - userIdFromCookie:', userIdFromCookie, 'currentUser:', currentUser, 'isLoading:', isLoading)

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
    
    // ✅ FIX: Check cookie instead of currentUser (which fails with 403)
    if (!isLoggedIn) {
        console.log('❌ Not logged in - redirecting to /login')
        return <Navigate to="/login" replace />
    }
    
    console.log('✅ User is logged in - rendering protected route')
    // Render nested routes if authenticated
    return <Outlet />
}
