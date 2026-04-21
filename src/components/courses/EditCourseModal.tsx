import { useState, useEffect, type FormEvent } from 'react';
import Drawer from '@/components/shared/Drawer';
import { useUIStore } from '@/store/uiStore';
import type { EnrolledCourse } from '@/types/domain';

interface EditCourseModalProps {
  open: boolean;
  course: EnrolledCourse | null;
  onClose: () => void;
  /** Updates the enrollment (personal color / instructor label). */
  onSave: (courseId: string, patch: { color?: string; instructor?: string | null }) => Promise<void>;
}

const COLOR_PALETTE = ['#3B5BDB', '#EF4444', '#8B5CF6', '#F97316', '#10B981', '#14B8A6', '#EC4899', '#F59E0B'];

export default function EditCourseModal({ open, course, onClose, onSave }: EditCourseModalProps) {
  const [color, setColor] = useState<string>(COLOR_PALETTE[0]);
  const [instructor, setInstructor] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const showToast = useUIStore((s) => s.showToast);

  // Hydrate form from the incoming course every time the modal opens.
  useEffect(() => {
    if (open && course) {
      setColor(course.color);
      setInstructor(course.instructor ?? '');
      setErr(null);
    }
  }, [open, course]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!course) return;
    setErr(null);

    // Build a sparse patch so we don't overwrite fields that didn't change.
    const patch: { color?: string; instructor?: string | null } = {};
    if (color !== course.color) patch.color = color;
    const trimmed = instructor.trim();
    const newInstructor = trimmed === '' ? null : trimmed;
    if (newInstructor !== course.instructor) patch.instructor = newInstructor;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      await onSave(course.id, patch);
      showToast({ level: 'success', message: `Updated ${course.code}` });
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update course.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={course ? `Edit ${course.code}` : 'Edit course'}
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-sm font-semibold text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-course-form"
            disabled={submitting}
            className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      {course && (
        <form id="edit-course-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Course</span>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-sm font-bold text-gray-800">{course.code}</span>
              <span className="text-sm text-gray-600">· {course.name}</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Course code and name are global and shared with classmates. You can customize how
              it looks on your calendar below.
            </p>
          </div>

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
            <span className="text-xs font-semibold text-gray-700">Instructor / nickname (optional)</span>
            <input
              type="text"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="e.g. Prof. Smith, or a nickname for this class"
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
            />
            <span className="text-[11px] text-gray-400">
              This label is just for you — classmates see their own instructor field.
            </span>
          </label>

          {err && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
              {err}
            </div>
          )}
        </form>
      )}
    </Drawer>
  );
}
