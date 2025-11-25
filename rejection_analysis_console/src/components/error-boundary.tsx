import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
    this.setState({ error, errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
              <CardDescription>
                An error occurred while rendering the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm">
                  <p className="font-semibold">Error:</p>
                  <p className="text-destructive">{this.state.error.message}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={this.handleReset} className="flex-1">
                  Reload Application
                </Button>
                <Button 
                  onClick={() => window.location.href = "/"} 
                  variant="outline"
                  className="flex-1"
                >
                  Go to Home
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-48">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
