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

    // Debug logging
    console.log('🔍 UserProvider - currentUser:', currentUser, 'isLoading:', isLoading)

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
                // ✅ FIX: Use correct path based on environment
                const loginPath = import.meta.env.DEV ? '/login' : '/rejection_analysis_console/login'
                console.log('🔍 Redirecting to:', loginPath)
                window.location.replace(loginPath)
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
