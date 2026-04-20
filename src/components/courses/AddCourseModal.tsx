import { useState, useEffect, type FormEvent } from 'react';
import Drawer from '@/components/shared/Drawer';
import ClassMeetingsField, { type ClassMeetingDraft } from './ClassMeetingsField';
import { lookupCourseByCode } from '@/services/courses.service';
import { useCourses } from '@/hooks/useCourses';

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
}

const COLOR_PALETTE = ['#3B5BDB', '#EF4444', '#8B5CF6', '#F97316', '#10B981', '#14B8A6', '#EC4899', '#F59E0B'];

export default function AddCourseModal({ open, onClose }: AddCourseModalProps) {
  const { addCourse, addMeeting, courses } = useCourses();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [instructor, setInstructor] = useState('');
  const [meetings, setMeetings] = useState<ClassMeetingDraft[]>([]);
  const [lookupResult, setLookupResult] = useState<'idle' | 'searching' | 'exists' | 'new'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setCode('');
      setName('');
      setColor(COLOR_PALETTE[0]);
      setInstructor('');
      setMeetings([]);
      setLookupResult('idle');
      setErr(null);
    }
  }, [open]);

  // Debounced lookup on code change
  useEffect(() => {
    if (!code.trim()) {
      setLookupResult('idle');
      return;
    }
    setLookupResult('searching');
    const handle = setTimeout(async () => {
      try {
        const existing = await lookupCourseByCode(code);
        if (existing) {
          setLookupResult('exists');
          setName(existing.name);
        } else {
          setLookupResult('new');
        }
      } catch {
        setLookupResult('idle');
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [code]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      setErr('Course code is required.');
      return;
    }
    if (!trimmedName) {
      setErr('Course name is required.');
      return;
    }
    if (courses.some((c) => c.code === trimmedCode)) {
      setErr('You are already enrolled in this course.');
      return;
    }

    setSubmitting(true);
    try {
      const course = await addCourse({
        code: trimmedCode,
        name: trimmedName,
        color,
        instructor: instructor.trim() || null,
      });
      // Add each meeting in sequence (small N, sequential is fine)
      for (const m of meetings) {
        await addMeeting({
          course_id: course.id,
          day_of_week: m.day_of_week,
          start_time: `${m.start_time}:00`,
          end_time: `${m.end_time}:00`,
        });
      }
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to add course.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add a course"
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
            form="add-course-form"
            disabled={submitting}
            className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding…' : 'Add course'}
          </button>
        </div>
      }
    >
      <form id="add-course-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Course code <span className="text-red-500">*</span></span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. CS4063"
            autoFocus
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] uppercase"
          />
          {lookupResult === 'exists' && (
            <span className="text-xs text-emerald-600">✓ Found — joining existing course</span>
          )}
          {lookupResult === 'new' && (
            <span className="text-xs text-gray-500">New course — you'll be the first to add it</span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Course name <span className="text-red-500">*</span></span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HCI Design"
            disabled={lookupResult === 'exists'}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] disabled:bg-gray-50 disabled:text-gray-600"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Your color</span>
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Instructor (optional)</span>
          <input
            type="text"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        <ClassMeetingsField meetings={meetings} onChange={setMeetings} />

        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
            {err}
          </div>
        )}
      </form>
    </Drawer>
  );
}
