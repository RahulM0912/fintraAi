import { Skeleton } from "@/components/ui/skeleton";

// Route-level skeleton mirroring the settings layout: title, flat hairline
// sections with small-caps headers.
export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-6 pb-10 sm:px-8 lg:pt-12 lg:pb-16">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-9 w-44" />

      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mt-10 border-t border-[var(--hairline)] pt-6">
          <Skeleton className="h-3 w-24" />
          <div className="mt-5 flex items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-11 w-32 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
