import { LoginForm } from "@/components/login-form"

export function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 bg-muted/40">
      <LoginForm className="w-full max-w-md" />
    </div>
  )
}
