import { useState, useEffect, type FormEvent } from 'react';
import Drawer from '@/components/shared/Drawer';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import type { EventRow, EnrolledCourse, EventVisibility } from '@/types/domain';
import type { EventInput } from '@/services/events.service';

interface EventDetailsPanelProps {
  event: EventRow | null;
  courses: EnrolledCourse[];
  currentUserId: string | null;
  onClose: () => void;
  onUpdate: (patch: Partial<Omit<EventInput, 'owner_id'>>) => Promise<void>;
  onDelete: () => Promise<void>;
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

export default function EventDetailsPanel({ event, courses, currentUserId, onClose, onUpdate, onDelete }: EventDetailsPanelProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState<string | ''>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<EventVisibility>('private');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    }
  }, [event]);

  if (!event) return null;

  const isOwner = event.owner_id === currentUserId;
  const course = event.course_id ? courses.find((c) => c.id === event.course_id) : null;

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) { setErr('Title is required.'); return; }
    const start = combineDateTime(date, startTime);
    const end = combineDateTime(date, endTime);
    if (end <= start) { setErr('End must be after start.'); return; }
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
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    try {
      await onDelete();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete.');
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
                      className="text-sm font-semibold text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
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
              <span className="text-xs font-semibold text-gray-700">Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700">Course</span>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] bg-white"
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
              <span className="text-xs font-semibold text-gray-700">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700">Start</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700">End</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700">Location</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] resize-y"
              />
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs font-semibold text-gray-700">Visibility</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="visibility" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
                <span>Private</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="visibility" checked={visibility === 'friends'} onChange={() => setVisibility('friends')} disabled={!courseId} />
                <span className={!courseId ? 'text-gray-400' : ''}>Friends in this course</span>
              </label>
            </fieldset>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">{err}</div>}
          </form>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Title</div>
              <div className="text-base font-bold text-gray-800">{event.title}</div>
            </div>
            {course && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Course</div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: course.color }} />
                  <span className="text-gray-800">{course.code} · {course.name}</span>
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">When</div>
              <div className="text-gray-800">
                {new Date(event.start_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                <br />
                {new Date(event.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {new Date(event.end_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
            {event.location && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Location</div>
                <div className="text-gray-800">{event.location}</div>
              </div>
            )}
            {event.description && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Description</div>
                <div className="text-gray-800 whitespace-pre-wrap">{event.description}</div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Visibility</div>
              <div className="text-gray-800 capitalize">{event.visibility}</div>
            </div>
            {!isOwner && (
              <p className="text-xs text-gray-500 italic">You can only view this event — it's owned by someone else.</p>
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
