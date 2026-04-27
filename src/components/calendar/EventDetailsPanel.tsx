import { useState, useEffect, useRef, type FormEvent } from 'react';
import Drawer from '@/components/shared/Drawer';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Avatar from '@/components/shared/Avatar';
import InviteePicker from './InviteePicker';
import { useFriends } from '@/hooks/useFriends';
import { inviteParticipant, listParticipants, removeParticipant, respondToInvite, type ParticipantWithProfile } from '@/services/events.service';
import type { EventRow, EnrolledCourse, EventVisibility } from '@/types/domain';
import type { EventInput } from '@/services/events.service';
import { useUIStore } from '@/store/uiStore';

interface EventDetailsPanelProps {
  event: EventRow | null;
  courses: EnrolledCourse[];
  currentUserId: string | null;
  onClose: () => void;
  onUpdate: (patch: Partial<Omit<EventInput, 'owner_id'>>) => Promise<void>;
  onDelete: () => Promise<void>;
  /** Optional: hide a shared event from the viewer's calendar (no effect on the owner). */
  onDismiss?: () => Promise<void>;
}

function toDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function combineDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export default function EventDetailsPanel({ event, courses, currentUserId, onClose, onUpdate, onDelete, onDismiss }: EventDetailsPanelProps) {
  const { accepted: friends } = useFriends();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState<string | ''>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const startRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLInputElement | null>(null);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<EventVisibility>('private');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [inviteeIds, setInviteeIds] = useState<Set<string>>(new Set());
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const showToast = useUIStore((s) => s.showToast);
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    if (event) {
      setEditing(false);
      setTitle(event.title);
      setCourseId(event.course_id ?? '');
      setDate(toDateInput(event.start_at));
      setStartTime(toTimeInput(event.start_at));
      setEndTime(toTimeInput(event.end_at));
      setLocation(event.location ?? '');
      setDescription(event.description ?? '');
      setVisibility(event.visibility);
      setErr(null);
      setParticipantsLoading(true);
      listParticipants(event.id)
        .then((loaded) => {
          setParticipants(loaded);
          setInviteeIds(new Set(loaded.map((p) => p.participant.user_id)));
        })
        .catch(() => {
          setParticipants([]);
          setInviteeIds(new Set());
        })
        .finally(() => setParticipantsLoading(false));
    }
  }, [event]);

  if (!event) return null;

  const isOwner = event.owner_id === currentUserId;
  const course = event.course_id ? courses.find((c) => c.id === event.course_id) : null;
  const editRange = date && startTime && endTime
    ? { start: combineDateTime(date, startTime), end: combineDateTime(date, endTime) }
    : null;

  async function handleRespond(response: 'accepted' | 'declined' | 'maybe') {
    if (!event || !currentUserId) return;
    try {
      await respondToInvite(event.id, currentUserId, response);
      const updated = await listParticipants(event.id);
      setParticipants(updated);
      const label = response === 'accepted' ? 'Accepted' : response === 'declined' ? 'Declined' : 'Marked as maybe';
      showToast({ level: 'success', message: label });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to respond.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    }
  }

  const myParticipation = participants.find((p) => p.participant.user_id === currentUserId);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!event) { setErr('No event selected.'); return; }
    if (!title.trim()) { setErr('Title is required.'); return; }
    const start = combineDateTime(date, startTime);
    const end = combineDateTime(date, endTime);
    if (end <= start) { setErr('End must be after start.'); return; }
    const eventId = event.id;
    setSubmitting(true);
    try {
      await onUpdate({
        title: title.trim(),
        course_id: courseId || null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        location: location.trim() || null,
        description: description.trim() || null,
        visibility,
      });
      const previousInviteeIds = new Set(participants.map((p) => p.participant.user_id));
      const toInvite = Array.from(inviteeIds).filter((id) => !previousInviteeIds.has(id));
      const toRemove = Array.from(previousInviteeIds).filter((id) => !inviteeIds.has(id));

      for (const userId of toInvite) {
        await inviteParticipant(eventId, userId);
      }
      for (const userId of toRemove) {
        await removeParticipant(eventId, userId);
      }

      if (toInvite.length > 0 || toRemove.length > 0) {
        const updatedParticipants = await listParticipants(eventId);
        setParticipants(updatedParticipants);
        setInviteeIds(new Set(updatedParticipants.map((p) => p.participant.user_id)));
      }

      const inviteSummary = toInvite.length || toRemove.length
        ? ` · ${toInvite.length} added, ${toRemove.length} removed`
        : '';
      showToast({ level: 'success', message: `Event updated${inviteSummary}` });
      setEditing(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    try {
      await onDelete();
      showToast({ level: 'success', message: 'Event deleted' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    }
  }

  return (
    <>
      <Drawer
        open={!!event}
        onClose={onClose}
        title={editing ? 'Edit event' : 'Event details'}
        footer={
          isOwner ? (
            <div className="flex gap-2 justify-between">
              {!editing && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-md transition-colors"
                >
                  Delete
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className={`text-sm font-semibold px-3 py-1.5 rounded-md border transition-colors ${
                        theme === 'dark'
                          ? 'text-gray-100 border-slate-700 hover:bg-slate-700/50'
                          : 'text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="event-edit-form"
                      disabled={submitting}
                      className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {editing ? (
          <form id="event-edit-form" onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] ${
                  theme === 'dark'
                    ? 'border border-slate-700 bg-slate-800 text-gray-100'
                    : 'border border-gray-200 bg-white text-gray-900'
                }`}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Course</span>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className={`rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] ${
                  theme === 'dark'
                    ? 'border border-slate-700 bg-slate-800 text-gray-100'
                    : 'border border-gray-200 bg-white text-gray-900'
                }`}
              >
                <option value="">— No course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`date-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] ${
                  theme === 'dark'
                    ? 'border border-slate-700 bg-slate-800 text-gray-100'
                    : 'border border-gray-200 bg-white text-gray-900'
                }`}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Start</span>
                <div className="relative w-full">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    ref={startRef}
                    className={`custom-time w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] ${
                      theme === 'dark'
                        ? 'border border-slate-700 bg-slate-800 text-gray-100 pr-9'
                        : 'border border-gray-200 bg-white text-gray-900 pr-9'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = startRef.current as HTMLInputElement | null;
                      if (!el) return;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      if ((el as any).showPicker) {
                        try { (el as any).showPicker(); return; } catch (_) { /* ignore */ }
                      }
                      el.focus();
                    }}
                    aria-label="Open start time picker"
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center ${theme === 'dark' ? 'text-gray-100' : 'text-black'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>End</span>
                <div className="relative">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    ref={endRef}
                    className={`custom-time w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] ${
                      theme === 'dark'
                        ? 'border border-slate-700 bg-slate-800 text-gray-100 pr-8'
                        : 'border border-gray-200 bg-white text-gray-900 pr-8'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = endRef.current as HTMLInputElement | null;
                      if (!el) return;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      if ((el as any).showPicker) {
                        try { (el as any).showPicker(); return; } catch (_) { /* ignore */ }
                      }
                      el.focus();
                    }}
                    aria-label="Open end time picker"
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center ${theme === 'dark' ? 'text-gray-100' : 'text-black'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Location</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={`rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] ${
                  theme === 'dark'
                    ? 'border border-slate-700 bg-slate-800 text-gray-100'
                    : 'border border-gray-200 bg-white text-gray-900'
                }`}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`resize-y rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] ${
                  theme === 'dark'
                    ? 'border border-slate-700 bg-slate-800 text-gray-100'
                    : 'border border-gray-200 bg-white text-gray-900'
                }`}
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Invite friends (optional)</span>
              <InviteePicker
                friends={friends}
                range={editRange}
                selected={inviteeIds}
                onToggle={(id) => {
                  setInviteeIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
              />
            </div>

            <fieldset className="flex flex-col gap-1.5">
              <legend className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Visibility</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="visibility" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
                <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}>Private</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="visibility" checked={visibility === 'friends'} onChange={() => setVisibility('friends')} disabled={!courseId} />
                <span className={!courseId ? 'text-gray-400' : theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}>
                  Friends in this course
                </span>
              </label>
            </fieldset>

            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">{err}</div>}
          </form>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Title</div>
              <div className={`text-base font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{event.title}</div>
            </div>
            {course && (
              <div>
                <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Course</div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: course.color }} />
                  <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}>{course.code} · {course.name}</span>
                </div>
              </div>
            )}
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>When</div>
              <div className={theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}>
                {new Date(event.start_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                <br />
                {new Date(event.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {new Date(event.end_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
            {event.location && (
              <div>
                <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Location</div>
                <div className={theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}>{event.location}</div>
              </div>
            )}
            {event.description && (
              <div>
                <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Description</div>
                <div className={`whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{event.description}</div>
              </div>
            )}
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Visibility</div>
              <div className={`capitalize ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{event.visibility}</div>
            </div>

            <div>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Participants</div>
              {participantsLoading && <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>Loading…</p>}
              {!participantsLoading && participants.length === 0 && (
                <p className={`text-xs italic ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No invitees.</p>
              )}
              <ul className="flex flex-col gap-1">
                {participants.map((p) => (
                  <li key={p.participant.user_id} className="flex items-center gap-2">
                    <Avatar user={{ avatarColor: p.profile.avatar_color, avatarUrl: p.profile.avatar_url, initials: p.profile.initials }} size="sm" />
                    <span className={`text-sm flex-1 truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{p.profile.name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      p.participant.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                      p.participant.status === 'declined' ? 'bg-gray-100 text-gray-600' :
                      p.participant.status === 'maybe' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {p.participant.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {!isOwner && myParticipation && myParticipation.participant.status === 'pending' && (
              <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                <p className="text-xs font-semibold text-blue-900 mb-2">You've been invited. Respond:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespond('accepted')}
                    className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond('maybe')}
                    className="text-xs font-semibold text-amber-700 border border-amber-300 hover:bg-amber-50 px-2.5 py-1 rounded transition-colors"
                  >
                    Maybe
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond('declined')}
                    className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors border ${
                      theme === 'dark'
                        ? 'text-gray-100 border-slate-700 hover:bg-slate-700/50'
                        : 'text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {!isOwner && (
              <div className="flex flex-col gap-2">
                <p className={`text-xs italic ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  You can only view this event — it's owned by someone else.
                </p>
                {onDismiss && (
                  <button
                    type="button"
                    title="Removes this event from your calendar only — the creator's event stays unchanged."
                    onClick={async () => {
                      try {
                        await onDismiss();
                        showToast({ level: 'info', message: 'Hidden from your calendar' });
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : 'Failed to hide event';
                        showToast({ level: 'error', message: msg });
                      }
                    }}
                    className={`self-start text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-100 border-slate-700 hover:bg-slate-700/50'
                        : 'text-gray-600 hover:text-gray-900 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Hide from my calendar
                  </button>
                )}
              </div>
            )}
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">{err}</div>}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this event?"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
