import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getCurrentSession, onAuthChange, fetchProfile } from '@/services/auth.service';

/**
 * Bootstraps auth state: loads current session, subscribes to auth changes,
 * and hydrates the profile when session is present.
 * Must be mounted once at the app root.
 */
export function useAuthBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);

  useEffect(() => {
    let cancelled = false;

    getCurrentSession().then(async (session) => {
      if (cancelled) return;
      setSession(session);
      if (session) {
        const profile = await fetchProfile(session.user.id);
        if (!cancelled) setProfile(profile);
      } else {
        setProfile(null);
      }
    });

    const { data: sub } = onAuthChange(async (session) => {
      setSession(session);
      if (session) {
        const profile = await fetchProfile(session.user.id);
        setProfile(profile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setProfile]);
}

/**
 * Read-only selector for components that need auth state.
 */
export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const hydrated = useAuthStore((s) => s.hydrated);
  return { session, profile, hydrated, isAuthenticated: !!session };
}
