import { statusConfig } from '../../data/users';

export default function Avatar({ user, size = 'md', showStatus = false, className = '' }) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const dotSizes = {
    sm: 'w-2 h-2 border',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
  };

  const status = user?.status && statusConfig[user.status];

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white`}
        style={{ backgroundColor: user?.avatarColor || '#6B7280' }}
      >
        {user?.initials || '?'}
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
