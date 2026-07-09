import { Skeleton } from "@/components/ui/skeleton";

// Route-level skeleton mirroring the conversation layout: title row, welcome
// prose, suggestions band, composer.
export default function ChatLoading() {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-5 pt-6 pb-6 sm:px-8 lg:pt-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-3 w-36" />
          <Skeleton className="mt-3 h-9 w-32" />
          <Skeleton className="mt-3 h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-28 rounded-lg" />
      </div>

      <div className="mt-10 space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-2/3" />
      </div>

      <div className="mt-auto space-y-4 pt-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    </div>
  );
}
