import { Skeleton } from "@/components/ui/skeleton";

// Route-level skeleton — paints in one frame while the dashboard chunk loads,
// mirroring the page layout (briefing hero → numbers strip → evidence grid)
// so hydration doesn't shift anything.
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-6 pb-10 sm:px-8 lg:pt-12 lg:pb-16">
      {/* Briefing */}
      <Skeleton className="h-3 w-44" />
      <div className="mt-6 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-5/6" />
        <Skeleton className="h-8 w-2/3" />
      </div>
      <div className="mt-7 flex gap-3">
        <Skeleton className="h-11 w-44 rounded-lg" />
        <Skeleton className="h-11 w-40 rounded-lg" />
      </div>

      {/* Numbers strip */}
      <div className="mt-12 grid grid-cols-1 gap-6 border-t border-[var(--hairline)] pt-6 sm:grid-cols-3 lg:mt-16">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-3 h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Evidence grid */}
      <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-12 lg:mt-16 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          <div className="border-t border-[var(--hairline)] pt-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-6 h-[240px] w-full rounded-xl" />
          </div>
        </div>
        <div className="space-y-12">
          <div className="border-t border-[var(--hairline)] pt-6">
            <Skeleton className="h-4 w-28" />
            <div className="mt-6 space-y-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
