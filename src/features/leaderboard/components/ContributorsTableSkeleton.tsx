import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';

export function ContributorsTableSkeleton() {
  return (
    <div className={`bg-white/[0.12] rounded-[24px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden`}>
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-white/10 bg-white/[0.08]">
        <div className="col-span-1">
          <SkeletonLoader className="h-4 w-12" />
        </div>
        <div className="col-span-1">
          <SkeletonLoader className="h-4 w-12" />
        </div>
        <div className="col-span-6">
          <SkeletonLoader className="h-4 w-24" />
        </div>
        <div className="col-span-2 flex justify-end">
          <SkeletonLoader className="h-4 w-16" />
        </div>
        <div className="col-span-2"></div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-white/10">
        {[...Array(10)].map((_, index) => (
          <div key={index} className="grid grid-cols-12 gap-4 px-8 py-5">
            {/* Rank */}
            <div className="col-span-1 flex items-center">
              <SkeletonLoader className="w-8 h-8 rounded-[10px]" />
            </div>

            {/* Trend */}
            <div className="col-span-1 flex items-center">
              <SkeletonLoader className="w-8 h-8 rounded-[10px]" />
            </div>

            {/* Contributor */}
            <div className="col-span-6 flex items-center gap-3">
              <SkeletonLoader variant="circle" className="w-12 h-12" />
              <div className="flex-1 space-y-2">
                <SkeletonLoader className="h-4 w-32" />
                <SkeletonLoader className="h-3 w-24" />
              </div>
            </div>

            {/* Score */}
            <div className="col-span-2 flex items-center justify-end">
              <SkeletonLoader className="h-10 w-20 rounded-[12px]" />
            </div>

            {/* Action */}
            <div className="col-span-2"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

