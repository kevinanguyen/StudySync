import { useCallback, useEffect, useRef, useState } from 'react';
import { listEventsInRange, createEvent, updateEvent, deleteEvent, dismissEvent } from '@/services/events.service';
import type { EventRow, EventWithOwner, EventOwnerInfo } from '@/types/domain';
import type { EventInput } from '@/services/events.service';
import { useAuthStore } from '@/store/authStore';

interface UseEventsResult {
  events: EventWithOwner[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createOne: (input: EventInput) => Promise<EventWithOwner>;
  updateOne: (id: string, patch: Partial<Omit<EventInput, 'owner_id'>>) => Promise<EventWithOwner>;
  /** Optimistic local update — use for drag/resize. Returns a rollback function. */
  patchLocal: (id: string, patch: Partial<EventRow>) => () => void;
  deleteOne: (id: string) => Promise<void>;
  /** Hide a shared event from this user's calendar without affecting the underlying row. */
  dismiss: (id: string) => Promise<void>;
}

/**
 * Build an `EventOwnerInfo` from the currently-signed-in user's profile,
 * so freshly-created events can render the owner avatar without another
 * round-trip to the database. Returns `null` if the profile hasn't loaded
 * yet (unusual, since events can only be created by a signed-in user).
 */
function getCurrentUserAsOwnerInfo(): EventOwnerInfo | null {
  const p = useAuthStore.getState().profile;
  if (!p) return null;
  return { id: p.id, name: p.name, initials: p.initials, avatar_color: p.avatar_color, avatar_url: p.avatar_url };
}

export function useEvents(weekStart: Date, weekEnd: Date): UseEventsResult {
  const [events, setEvents] = useState<EventWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reloadRef = useRef<() => Promise<void>>(async () => {});

  // Key the effect on ISO strings so identical Date instances don't re-trigger.
  const startKey = weekStart.toISOString();
  const endKey = weekEnd.toISOString();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listEventsInRange(new Date(startKey), new Date(endKey));
      setEvents(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [startKey, endKey]);

  useEffect(() => { reloadRef.current = reload; }, [reload]);

  // Keep a ref to the latest events array so callbacks can read it without
  // depending on it (which would churn their identity every render).
  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Tab-revived: if the initial fetch stalled while the tab was backgrounded,
  // re-fire it so the calendar doesn't stay blank.
  // Friends-changed: shared events are RLS-filtered by friendship, so an
  // unfriend makes the ex-friend's shared events disappear and a new
  // friendship makes theirs appear. Either way we need a reload.
  useEffect(() => {
    function onReload() { void reloadRef.current(); }
    window.addEventListener('studysync:tab-revived', onReload);
    window.addEventListener('studysync:friends-changed', onReload);
    return () => {
      window.removeEventListener('studysync:tab-revived', onReload);
      window.removeEventListener('studysync:friends-changed', onReload);
    };
  }, []);

  const createOne = useCallback(async (input: EventInput) => {
    const created = await createEvent(input);
    // The service returns the bare events row. We create these events, so the
    // owner is the current user — attach their profile locally so the UI can
    // render consistently without a round-trip.
    const withOwner: EventWithOwner = { ...created, owner_profile: getCurrentUserAsOwnerInfo() };
    setEvents((prev) => [...prev, withOwner].sort((a, b) => a.start_at.localeCompare(b.start_at)));
    return withOwner;
  }, []);

  const updateOne = useCallback(async (id: string, patch: Partial<Omit<EventInput, 'owner_id'>>) => {
    const updated = await updateEvent(id, patch);
    setEvents((prev) => prev.map((e) => {
      if (e.id !== id) return e;
      // Preserve whatever owner_profile we already had; updateEvent doesn't re-join it.
      return { ...updated, owner_profile: e.owner_profile };
    }));
    // Read the current owner from our ref (avoids a dep on `events`).
    const existing = eventsRef.current.find((e) => e.id === id);
    return { ...updated, owner_profile: existing?.owner_profile ?? getCurrentUserAsOwnerInfo() };
  }, []);

  const patchLocal = useCallback((id: string, patch: Partial<EventRow>) => {
    let snapshot: EventWithOwner | undefined;
    setEvents((prev) => {
      snapshot = prev.find((e) => e.id === id);
      return prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
    });
    return () => {
      if (!snapshot) return;
      setEvents((prev) => prev.map((e) => (e.id === id ? snapshot! : e)));
    };
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const dismiss = useCallback(async (id: string) => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) throw new Error('Not authenticated');
    await dismissEvent(userId, id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { events, loading, error, reload, createOne, updateOne, patchLocal, deleteOne, dismiss };
}
