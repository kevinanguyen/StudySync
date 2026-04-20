import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('starts unhydrated with no session and no profile', () => {
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.hydrated).toBe(false);
  });

  it('setSession stores session and marks hydrated', () => {
    const fakeSession = { access_token: 'abc', user: { id: 'u1', email: 'a@b.com' } } as unknown as import('@supabase/supabase-js').Session;
    useAuthStore.getState().setSession(fakeSession);
    const state = useAuthStore.getState();
    expect(state.session).toEqual(fakeSession);
    expect(state.hydrated).toBe(true);
  });

  it('setSession(null) clears session but keeps hydrated true', () => {
    useAuthStore.getState().setSession(null);
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.hydrated).toBe(true);
  });

  it('setProfile stores profile', () => {
    const fakeProfile = { id: 'u1', name: 'Alice', username: 'alice' } as never;
    useAuthStore.getState().setProfile(fakeProfile);
    expect(useAuthStore.getState().profile).toEqual(fakeProfile);
  });

  it('reset clears session and profile and resets hydrated', () => {
    useAuthStore.getState().setSession({ user: { id: 'u1' } } as never);
    useAuthStore.getState().setProfile({ id: 'u1' } as never);
    useAuthStore.getState().reset();
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.hydrated).toBe(false);
  });

  it('selectors: userId returns session user id or null', () => {
    expect(useAuthStore.getState().userId()).toBeNull();
    useAuthStore.getState().setSession({ user: { id: 'u42' } } as never);
    expect(useAuthStore.getState().userId()).toBe('u42');
  });
});
