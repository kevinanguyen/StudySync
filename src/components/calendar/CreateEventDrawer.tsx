import { useState, useEffect, type FormEvent } from 'react';
import Drawer from '@/components/shared/Drawer';
import { useCourses } from '@/hooks/useCourses';
import { useAuthStore } from '@/store/authStore';
import { findConflicts } from '@/lib/availability';
import type { EventRow, EventVisibility, ExpandedClassMeeting } from '@/types/domain';
import type { EventInput } from '@/services/events.service';

interface CreateEventDrawerProps {
  open: boolean;
  draft: { start: Date; end: Date } | null;
  onClose: () => void;
  onCreated: (input: EventInput) => Promise<void>;
  existingEvents: EventRow[];
  expandedClassMeetings: ExpandedClassMeeting[];
}

function toDateInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInput(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function combineDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export default function CreateEventDrawer({
  open,
  draft,
  onClose,
  onCreated,
  existingEvents,
  expandedClassMeetings,
}: CreateEventDrawerProps) {
  const { courses } = useCourses();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);

  const [title, setTitle] = useState('Study Session');
  const [courseId, setCourseId] = useState<string | ''>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<EventVisibility>('private');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Seed form when draft changes
  useEffect(() => {
    if (open && draft) {
      setTitle('Study Session');
      setCourseId('');
      setDate(toDateInput(draft.start));
      setStartTime(toTimeInput(draft.start));
      setEndTime(toTimeInput(draft.end));
      setLocation('');
      setDescription('');
      setVisibility('private');
      setErr(null);
    }
  }, [open, draft]);

  // Default visibility follows course selection
  useEffect(() => {
    if (courseId) {
      setVisibility('friends');
      const course = courses.find((c) => c.id === courseId);
      if (course && title === 'Study Session') {
        setTitle(course.code);
      }
    } else {
      setVisibility('private');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const range = date && startTime && endTime
    ? { start: combineDateTime(date, startTime), end: combineDateTime(date, endTime) }
    : null;

  const conflicts = range && !isNaN(range.start.getTime()) && !isNaN(range.end.getTime()) && range.end > range.start
    ? findConflicts(range, existingEvents, expandedClassMeetings)
    : [];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!userId) {
      setErr('Not authenticated.');
      return;
    }
    if (!title.trim()) {
      setErr('Title is required.');
      return;
    }
    if (!range || isNaN(range.start.getTime()) || isNaN(range.end.getTime())) {
      setErr('Please select a valid date and time.');
      return;
    }
    if (range.end <= range.start) {
      setErr('End time must be after start time.');
      return;
    }
    setSubmitting(true);
    try {
      await onCreated({
        title: title.trim(),
        start_at: range.start.toISOString(),
        end_at: range.end.toISOString(),
        owner_id: userId,
        course_id: courseId || null,
        location: location.trim() || null,
        description: description.trim() || null,
        visibility,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New study event"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-event-form"
            disabled={submitting}
            className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create event'}
          </button>
        </div>
      }
    >
      <form id="create-event-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Course (optional)</span>
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

        {conflicts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm text-amber-900" role="alert">
            <p className="font-semibold mb-1 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
              Conflicts with:
            </p>
            <ul className="text-xs space-y-0.5 pl-5 list-disc">
              {conflicts.map((c) => (
                <li key={`${c.kind}:${c.id}`}>
                  {c.title} ({c.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {c.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Location (optional)</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Library room 214 or zoom link"
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Description (optional)</span>
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
            <input
              type="radio"
              name="visibility"
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
            />
            <span>Private — only you</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              checked={visibility === 'friends'}
              onChange={() => setVisibility('friends')}
              disabled={!courseId}
            />
            <span className={!courseId ? 'text-gray-400' : ''}>
              Friends in this course {!courseId && '(requires course)'}
            </span>
          </label>
        </fieldset>

        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
            {err}
          </div>
        )}
      </form>
    </Drawer>
  );
}
