import appIcon from "@/assets/app-icon.png"
import { cn } from "@/lib/utils"

export function AppIcon({
  className,
  alt = "",
}: {
  className?: string
  alt?: string
}) {
  return (
    <img
      src={appIcon}
      alt={alt}
      className={cn("shrink-0 object-contain", className)}
      draggable={false}
    />
  )
}
