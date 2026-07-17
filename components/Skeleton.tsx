export function SkeletonCard({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`bg-white rounded-lg p-4 border border-[#e8ddd2] ${className}`}>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 bg-[#f3ede5] rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 2, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-[#f3ede5] rounded animate-pulse" style={{
          width: i === lines - 1 ? "80%" : "100%"
        }} />
      ))}
    </div>
  );
}

export function SkeletonPost() {
  return (
    <div className="bg-white rounded-lg p-4 border border-[#e8ddd2] space-y-4">
      {/* Author info */}
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 bg-[#f3ede5] rounded-full animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-[#f3ede5] rounded animate-pulse" />
          <div className="h-3 w-24 bg-[#f3ede5] rounded animate-pulse" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-[#f3ede5] rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-[#f3ede5] rounded animate-pulse" />
        <div className="h-4 w-4/5 bg-[#f3ede5] rounded animate-pulse" />
      </div>

      {/* Reactions and comments */}
      <div className="flex justify-between pt-2">
        <div className="h-4 w-20 bg-[#f3ede5] rounded animate-pulse" />
        <div className="h-4 w-24 bg-[#f3ede5] rounded animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={4} />
      ))}
    </div>
  );
}
