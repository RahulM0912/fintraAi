import { Skeleton } from "@/components/ui/skeleton";

// Route-level skeleton mirroring the ledger layout: title row, filter bar,
// header rule, rows.
export default function TransactionsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-6 pb-10 sm:px-8 lg:pt-12 lg:pb-16">
      <div className="hidden lg:flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-9 w-56" />
        </div>
        <Skeleton className="h-11 w-40 rounded-lg" />
      </div>

      <div className="mt-0 flex flex-wrap gap-3 lg:mt-8">
        <Skeleton className="h-11 w-56 rounded-lg" />
        <Skeleton className="h-11 w-40 rounded-lg" />
        <Skeleton className="h-11 w-32 rounded-lg" />
        <Skeleton className="h-11 w-36 rounded-lg" />
      </div>

      <div className="mt-6 border-b border-[var(--hairline-strong)] pb-3">
        <Skeleton className="h-3 w-full max-w-md" />
      </div>
      <div className="divide-y divide-[var(--hairline)]">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
