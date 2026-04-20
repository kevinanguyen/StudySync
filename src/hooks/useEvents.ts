import { useCallback, useEffect, useState } from 'react';
import { listEventsInRange, createEvent, updateEvent, deleteEvent } from '@/services/events.service';
import type { EventRow } from '@/types/domain';
import type { EventInput } from '@/services/events.service';

interface UseEventsResult {
  events: EventRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createOne: (input: EventInput) => Promise<EventRow>;
  updateOne: (id: string, patch: Partial<Omit<EventInput, 'owner_id'>>) => Promise<EventRow>;
  /** Optimistic local update — use for drag/resize. Returns a rollback function. */
  patchLocal: (id: string, patch: Partial<EventRow>) => () => void;
  deleteOne: (id: string) => Promise<void>;
}

export function useEvents(weekStart: Date, weekEnd: Date): UseEventsResult {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    reload();
  }, [reload]);

  const createOne = useCallback(async (input: EventInput) => {
    const created = await createEvent(input);
    setEvents((prev) => [...prev, created].sort((a, b) => a.start_at.localeCompare(b.start_at)));
    return created;
  }, []);

  const updateOne = useCallback(async (id: string, patch: Partial<Omit<EventInput, 'owner_id'>>) => {
    const updated = await updateEvent(id, patch);
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const patchLocal = useCallback((id: string, patch: Partial<EventRow>) => {
    let snapshot: EventRow | undefined;
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

  return { events, loading, error, reload, createOne, updateOne, patchLocal, deleteOne };
}
