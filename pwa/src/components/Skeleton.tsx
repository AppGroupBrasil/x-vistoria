export function SkeletonLine({ className = '' }: Readonly<{ className?: string }>) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <SkeletonLine className="h-4 w-3/4" />
      <SkeletonLine className="h-3 w-1/2" />
      <SkeletonLine className="h-3 w-full" />
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {['a', 'b', 'c', 'd'].map((id) => (
        <div key={id} className="card p-4 space-y-2">
          <SkeletonLine className="h-3 w-16" />
          <SkeletonLine className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: Readonly<{ rows?: number }>) {
  const ids = Array.from({ length: rows }, (_, i) => `row-${i}`);
  return (
    <div className="space-y-3">
      {ids.map((id) => (
        <SkeletonCard key={id} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: Readonly<{ count?: number }>) {
  const ids = Array.from({ length: count }, (_, i) => `grid-${i}`);
  return (
    <div className="grid grid-cols-3 gap-2">
      {ids.map((id) => (
        <div key={id} className="bg-gray-200 rounded-lg animate-pulse aspect-square" />
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="space-y-3 w-48">
        <SkeletonLine className="h-4 w-full mx-auto" />
        <SkeletonLine className="h-3 w-3/4 mx-auto" />
      </div>
    </div>
  );
}
