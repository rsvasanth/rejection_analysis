import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import sppLogo from "@/assets/spp-logo.png"

interface SiteHeaderProps {
  title?: string
  description?: string
  actions?: React.ReactNode
}

export function SiteHeader({ title = "Rejection Analysis Dashboard", description, actions }: SiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-col">
          <h1 className="text-base font-medium">{title}</h1>
          {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
        </div>
        <div className="ml-auto flex items-center gap-4">
          {actions && <div className="flex items-center gap-2">{actions}</div>}
          <img
            src={sppLogo}
            alt="Shree Polymer Products"
            className="h-12 object-contain"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
      </div>
    </header>
  )
}
