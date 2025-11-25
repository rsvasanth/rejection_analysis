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
