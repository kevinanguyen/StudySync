import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  name: string;
  username: string;
  school_email: string;
  major: string | null;
  grad_year: number | null;
  avatar_color: string;
  initials: string;
  status: 'available' | 'studying' | 'busy';
  status_text: string | null;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  hydrated: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  reset: () => void;
  userId: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  hydrated: false,
  setSession: (session) => set({ session, hydrated: true }),
  setProfile: (profile) => set({ profile }),
  reset: () => set({ session: null, profile: null, hydrated: false }),
  userId: () => get().session?.user.id ?? null,
}));
