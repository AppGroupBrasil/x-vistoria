export function SkeletonLine({ className = '' }: Readonly<{ className?: string }>) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <SkeletonLine className="h-4 w-3/4" />
      <SkeletonLine className="h-3 w-1/2" />
      <SkeletonLine className="h-3 w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: Readonly<{ rows?: number }>) {
  return (
    <div className="card divide-y divide-gray-100">
      <div className="px-5 py-3 flex gap-4">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="h-3 w-32" />
        <SkeletonLine className="h-3 w-20" />
        <SkeletonLine className="h-3 w-28" />
      </div>
      {Array.from({ length: rows }, (_, i) => `table-${i}`).map(key => (
        <div key={key} className="px-5 py-4 flex gap-4 items-center">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-3 w-40" />
          <SkeletonLine className="h-3 w-16" />
          <SkeletonLine className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: Readonly<{ count?: number }>) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }, (_, i) => `stat-${i}`).map(key => (
        <div key={key} className="card p-5 space-y-2">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-pulse">
      <SkeletonLine className="h-6 w-48" />
      <SkeletonStats />
      <SkeletonTable />
    </div>
  );
}

export function SkeletonList({ rows = 4 }: Readonly<{ rows?: number }>) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => `list-${i}`).map(key => (
        <SkeletonCard key={key} />
      ))}
    </div>
  );
}

export function SkeletonInline() {
  return (
    <div className="px-5 py-4 space-y-2 animate-pulse">
      <SkeletonLine className="h-3 w-full" />
      <SkeletonLine className="h-3 w-3/4" />
    </div>
  );
}
