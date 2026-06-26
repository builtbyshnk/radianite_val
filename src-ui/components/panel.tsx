import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function Panel({
  icon,
  title,
  action,
  children,
  className,
}: {
  icon: React.ReactNode
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("gap-2.5 rounded-xl [--card-spacing:--spacing(3)]", className)}>
      <div className="flex items-center justify-between gap-2 px-3.5 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-primary [&_svg]:size-4">{icon}</span>
          <h2 className="text-xs font-semibold tracking-[0.15em] text-foreground/90 uppercase">
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="px-3.5 pb-0.5">{children}</div>
    </Card>
  )
}
