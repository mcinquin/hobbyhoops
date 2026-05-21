export function DashboardPageSkeleton() {
  return (
    <div className="min-w-0 animate-pulse space-y-6 sm:space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="h-4 w-72 max-w-full rounded-md bg-muted" />
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-20 rounded-lg border border-border bg-card sm:h-24"
          />
        ))}
      </div>
      <div className="h-64 rounded-lg border border-border bg-card" />
      <div className="space-y-2">
        <div className="h-5 w-40 rounded-md bg-muted" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-14 rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}

export function TablePageSkeleton() {
  return (
    <div className="min-w-0 animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-md bg-muted" />
        <div className="h-4 w-64 max-w-full rounded-md bg-muted" />
      </div>
      <div className="h-10 rounded-md bg-muted" />
      <div className="hidden space-y-2 md:block">
        <div className="h-10 rounded-md border border-border bg-card" />
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-12 rounded-md border border-border bg-card"
          />
        ))}
      </div>
      <div className="space-y-2 md:hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-20 rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <div className="h-56 animate-pulse rounded-lg border border-border bg-card" />
      <div className="h-56 animate-pulse rounded-lg border border-border bg-card" />
    </div>
  );
}
