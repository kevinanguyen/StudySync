import { useEffect, useState } from 'react';
import { statusConfig } from '@/lib/status';

type Size = 'sm' | 'md' | 'lg';

interface AvatarUser {
  avatarColor?: string;
  avatarUrl?: string | null;
  initials?: string;
  status?: string;
}

interface AvatarProps {
  user?: AvatarUser | null;
  size?: Size;
  showStatus?: boolean;
  className?: string;
}

export default function Avatar({ user, size = 'md', showStatus = false, className = '' }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizes: Record<Size, string> = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const dotSizes: Record<Size, string> = {
    sm: 'w-2 h-2 border',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
  };

  const status = user?.status ? statusConfig[user.status as keyof typeof statusConfig] : null;
  const showImage = !!user?.avatarUrl && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [user?.avatarUrl]);

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white overflow-hidden`}
        style={{ backgroundColor: user?.avatarColor || '#6B7280' }}
      >
        {showImage ? (
          <img
            src={user.avatarUrl ?? undefined}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          user?.initials || '?'
        )}
      </div>
      {showStatus && status && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-white`}
          style={{ backgroundColor: status.color }}
        />
      )}
    </div>
  );
}
