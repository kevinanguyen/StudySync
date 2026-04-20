import type { UserStatus } from '@/types/domain';

export interface StatusMeta {
  color: string;
  label: string;
}

export const statusConfig: Record<UserStatus, StatusMeta> = {
  available: { color: '#22C55E', label: 'Available' },
  studying:  { color: '#EAB308', label: 'Studying'  },
  busy:      { color: '#EF4444', label: 'Busy'      },
};
