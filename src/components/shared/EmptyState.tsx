import type { ReactNode } from 'react';
import { useUIStore } from '@/store/uiStore';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Compact styling for narrow sidebars (210px). */
  compact?: boolean;
}

/**
 * Friendly placeholder for lists with no items yet. Uses a soft blue circle
 * around a stroke icon so the empty state has presence without being loud.
 */
export default function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  const theme = useUIStore((s) => s.theme);
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'px-2 py-3' : 'px-4 py-6'}`}>
      <div
        className={`rounded-full bg-[#3B5BDB]/10 text-[#3B5BDB] flex items-center justify-center ${
          compact ? 'w-9 h-9 mb-2' : 'w-12 h-12 mb-3'
        }`}
      >
        {icon}
      </div>
      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'} leading-snug ${compact ? 'text-[11px]' : 'text-sm'}`}>
        {title}
      </p>
      {description && (
        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} mt-1 leading-relaxed ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`mt-2 font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] rounded transition-colors ${
            compact ? 'text-[10px] px-2 py-1' : 'text-xs px-3 py-1.5'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
