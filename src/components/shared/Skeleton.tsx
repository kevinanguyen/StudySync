import { useUIStore } from '@/store/uiStore';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  const theme = useUIStore((s) => s.theme);
  return <div className={`animate-pulse rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'} ${className}`} />;
}

/** Preset: course row placeholder. */
export function CourseRowSkeleton() {
  const theme = useUIStore((s) => s.theme);

  return (
    <div className={`flex items-stretch rounded-md overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-gray-50 border border-gray-100'}`}>
      <div className={`w-1.5 animate-pulse ${theme === 'dark' ? 'bg-slate-600' : 'bg-gray-200'}`} />
      <div className="px-2.5 py-2 flex-1 flex flex-col gap-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-12" />
      </div>
    </div>
  );
}

/** Preset: friend row placeholder. */
export function FriendRowSkeleton() {
  return (
    <div className="flex items-center gap-2 px-1.5 py-1.5">
      <Skeleton className="w-7 h-7 rounded-full" />
      <div className="flex-1 flex flex-col gap-1">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-2 w-14" />
      </div>
    </div>
  );
}