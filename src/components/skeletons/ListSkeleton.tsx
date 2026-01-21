import { Skeleton } from '@/components/ui/skeleton';

interface ListSkeletonProps {
  count?: number;
  showAvatar?: boolean;
}

export function ListItemSkeleton({ showAvatar = true }: { showAvatar?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-3">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
        <div>
          <Skeleton className="h-4 w-32 mb-1.5" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <Skeleton className="h-5 w-20 mb-1" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-5 w-5" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5, showAvatar = true }: ListSkeletonProps) {
  return (
    <div className="space-y-2 animate-fade-in">
      {[...Array(count)].map((_, i) => (
        <ListItemSkeleton key={i} showAvatar={showAvatar} />
      ))}
    </div>
  );
}

export function ServiceProductItemSkeleton() {
  return (
    <div className="w-full bg-card rounded-xl p-4 flex items-center gap-3 border border-border">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="text-right">
        <Skeleton className="h-5 w-20 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function ServiceProductListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 animate-fade-in">
      {[...Array(count)].map((_, i) => (
        <ServiceProductItemSkeleton key={i} />
      ))}
    </div>
  );
}
