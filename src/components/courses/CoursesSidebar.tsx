import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../shared/Avatar';
import ConfirmDialog from '../shared/ConfirmDialog';
import AddCourseModal from './AddCourseModal';
import EditCourseModal from './EditCourseModal';
import { useCourses } from '@/hooks/useCourses';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/services/auth.service';
import { statusConfig } from '@/lib/status';
import { useUIStore } from '@/store/uiStore';
import { CourseRowSkeleton } from '../shared/Skeleton';
import EmptyState from '../shared/EmptyState';
import type { EnrolledCourse } from '@/types/domain';

export default function CoursesSidebar() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);
  const { courses, loading, dropCourse, addCourse, updateCourse, addMeeting } = useCourses();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnrolledCourse | null>(null);
  const [dropTarget, setDropTarget] = useState<EnrolledCourse | null>(null);
  const [dropping, setDropping] = useState(false);
  const showToast = useUIStore((s) => s.showToast);
  const theme = useUIStore((s) => s.theme);

  async function handleLogout() {
    await signOut();
    reset();
    navigate('/login', { replace: true });
  }

  async function handleConfirmDrop() {
    if (!dropTarget || dropping) return;
    const code = dropTarget.code;
    setDropping(true);
    try {
      await dropCourse(dropTarget.id);
      showToast({ level: 'success', message: `Dropped ${code}` });
      setDropTarget(null);
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to drop course' });
    } finally {
      setDropping(false);
    }
  }

  const statusCfg = profile ? statusConfig[profile.status] : statusConfig.available;

  return (
    <aside
      className={`flex flex-col ${theme === 'dark' ? 'bg-slate-900 border-r border-slate-700' : 'bg-white border-r border-gray-200'}`}
      style={{ width: '210px', minWidth: '210px' }}
    >
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className={`${theme === 'dark' ? 'text-[10px] font-bold text-gray-300 uppercase tracking-widest' : 'text-[10px] font-bold text-gray-500 uppercase tracking-widest'}`}>My Courses</p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="Add course"
            className={`${theme === 'dark' ? 'w-4 h-4 rounded-full bg-slate-800 text-gray-300 text-[11px] font-bold flex items-center justify-center hover:bg-slate-700 transition-colors leading-none border border-slate-700' : 'w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200'}`}
          >
            +
          </button>
        </div>
        {loading && courses.length === 0 && (
          <div className="flex flex-col gap-1.5">
            <CourseRowSkeleton />
            <CourseRowSkeleton />
            <CourseRowSkeleton />
          </div>
        )}
        {!loading && courses.length === 0 && (
          <EmptyState
            compact
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            }
            title="No courses yet"
            description="Add a class to see your schedule and find classmates."
            action={{ label: '+ Add course', onClick: () => setAddOpen(true) }}
          />
        )}
        <div className="flex flex-col gap-1.5">
          {courses.map((course) => (
            <div
              key={course.id}
              className={`group relative flex items-stretch rounded-md overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-800 border border-slate-700 hover:bg-slate-700' : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'}`}
            >
              <button
                type="button"
                onClick={() => setEditTarget(course)}
                aria-label={`Edit ${course.code}`}
                className="flex items-stretch flex-1 text-left min-w-0 focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 rounded-md"
              >
                <span className="w-1.5 flex-shrink-0" style={{ backgroundColor: course.color }} />
                <span className="px-2.5 py-2 flex-1 min-w-0 block">
                  <span className={`${theme === 'dark' ? 'block text-xs font-bold text-gray-100 leading-tight truncate' : 'block text-xs font-bold text-gray-800 leading-tight truncate'}`}>{course.name}</span>
                  <span className={`${theme === 'dark' ? 'block text-[10px] text-gray-300 mt-0.5 truncate' : 'block text-[10px] text-gray-500 mt-0.5 truncate'}`}>{course.code}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDropTarget(course); }}
                aria-label={`Drop ${course.code}`}
                title={`Drop ${course.code}`}
                className={`${theme === 'dark' ? 'opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 px-2' : 'opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 px-2'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <div className={`${theme === 'dark' ? 'px-3 py-3 border-t border-slate-700 flex items-center justify-between flex-shrink-0' : 'px-3 py-3 border-t border-gray-200 flex items-center justify-between flex-shrink-0'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {profile && (
            <Avatar
              user={{ avatarColor: profile.avatar_color, initials: profile.initials, status: profile.status }}
              size="md"
              showStatus
            />
          )}
          <div className="min-w-0">
            <p className={`${theme === 'dark' ? 'text-xs font-semibold text-gray-100 leading-tight truncate' : 'text-xs font-semibold text-gray-800 leading-tight truncate'}`}>{profile?.name ?? 'Loading…'}</p>
            <p className="text-[10px] font-medium" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => navigate('/settings')}
            className={`${theme === 'dark' ? 'text-gray-300 hover:text-gray-50 transition-colors p-1' : 'text-gray-400 hover:text-gray-700 transition-colors p-1'}`}
            aria-label="Settings"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-400 transition-colors p-1' : 'text-gray-400 hover:text-red-500 transition-colors p-1'}`}
            aria-label="Log out"
            title="Log out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      <AddCourseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingCourses={courses}
        onAddCourse={addCourse}
        onAddMeeting={addMeeting}
      />
      <EditCourseModal
        open={!!editTarget}
        course={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={updateCourse}
      />
      <ConfirmDialog
        open={!!dropTarget}
        title="Drop this course?"
        message={
          dropTarget
            ? `Your class meetings for ${dropTarget.code} will be removed. Study events tagged with this course will keep their time but lose the course label.`
            : ''
        }
        confirmLabel="Drop course"
        loadingLabel="Dropping…"
        loading={dropping}
        destructive
        onConfirm={handleConfirmDrop}
        onCancel={() => { if (!dropping) setDropTarget(null); }}
      />
    </aside>
  );
}
