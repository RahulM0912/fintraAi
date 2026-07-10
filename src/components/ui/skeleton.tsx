import { cn } from "@/lib/utils"

// Skeletons pull from the palette (recessed paper fill), not raw grays —
// off-token grays read cool against the warm surfaces in both themes.
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--surface-2)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
