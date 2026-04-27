import { useEffect, useRef, useState } from 'react';
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
import { useLayoutStore } from '@/store/layoutStore';
import { updateStatus } from '@/services/profile.service';
import { CourseRowSkeleton } from '../shared/Skeleton';
import EmptyState from '../shared/EmptyState';
import Tooltip from '../shared/Tooltip';
import type { EnrolledCourse, UserStatus } from '@/types/domain';

export default function CoursesSidebar() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const reset = useAuthStore((s) => s.reset);
  const { courses, loading, dropCourse, addCourse, updateCourse } = useCourses();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnrolledCourse | null>(null);
  const [dropTarget, setDropTarget] = useState<EnrolledCourse | null>(null);
  const [dropping, setDropping] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState<UserStatus | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const showToast = useUIStore((s) => s.showToast);
  const theme = useUIStore((s) => s.theme);
  const collapsed = useLayoutStore((s) => s.leftSidebarCollapsed);
  const toggleLeftSidebar = useLayoutStore((s) => s.toggleLeftSidebar);

  useEffect(() => {
    if (!profileMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileMenuOpen]);

  async function handleLogout() {
    await signOut();
    reset();
    navigate('/login', { replace: true });
  }

  async function handleStatusChange(nextStatus: UserStatus) {
    if (!profile || statusSubmitting === nextStatus || profile.status === nextStatus) {
      setProfileMenuOpen(false);
      return;
    }

    setStatusSubmitting(nextStatus);
    try {
      const updated = await updateStatus(profile.id, nextStatus, profile.status_text ?? null);
      setProfile(updated);
      showToast({ level: 'success', message: `Status updated to ${statusConfig[nextStatus].label}` });
      setProfileMenuOpen(false);
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to update status' });
    } finally {
      setStatusSubmitting(null);
    }
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

  // Shared modal/dialog block — rendered in both modes so collapsed-rail
  // swatch clicks can still open the EditCourseModal.
  const modals = (
    <>
      <AddCourseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingCourses={courses}
        onAddCourse={addCourse}
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
    </>
  );

  if (collapsed) {
    return (
      <aside
        className={`flex flex-col items-center ${theme === 'dark' ? 'bg-slate-900 border-r border-slate-700' : 'bg-white border-r border-gray-200'}`}
        style={{ width: '48px', minWidth: '48px' }}
      >
        <div className="flex flex-col items-center gap-1.5 pt-2 pb-2 w-full flex-shrink-0">
          <Tooltip label="Expand courses panel" side="right">
            <button
              type="button"
              onClick={toggleLeftSidebar}
              aria-label="Expand courses panel"
              className={`w-[22px] h-[22px] rounded flex items-center justify-center transition-colors ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip label="Add course" side="right">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              aria-label="Add course"
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold leading-none transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-800 text-gray-200 hover:bg-slate-700 border border-slate-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              +
            </button>
          </Tooltip>
        </div>

        <div className="flex-1 w-full overflow-y-auto flex flex-col items-center gap-1.5 py-1">
          {loading && courses.length === 0 && (
            <>
              <div className={`w-7 h-7 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`} />
              <div className={`w-7 h-7 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`} />
              <div className={`w-7 h-7 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`} />
            </>
          )}
          {courses.map((course) => (
            <Tooltip key={course.id} label={`${course.code} · ${course.name}`} side="right">
              <button
                type="button"
                onClick={() => setEditTarget(course)}
                aria-label={`Edit ${course.code}`}
                className="w-7 h-7 rounded-full flex-shrink-0 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/50 focus:ring-offset-1"
                style={{ backgroundColor: course.color }}
              />
            </Tooltip>
          ))}
        </div>

        <div className={`flex flex-col items-center gap-1 py-2 w-full border-t flex-shrink-0 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
          {profile && (
            <Tooltip label={profile.name} side="right">
              <span>
                <Avatar
                  user={{ avatarColor: profile.avatar_color, avatarUrl: profile.avatar_url, initials: profile.initials, status: profile.status }}
                  size="md"
                  showStatus
                />
              </span>
            </Tooltip>
          )}
          <Tooltip label="Settings" side="right">
            <button
              onClick={() => navigate('/settings')}
              className={`p-1 rounded transition-colors ${theme === 'dark' ? 'text-gray-300 hover:bg-slate-700 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
              aria-label="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip label="Log out" side="right">
            <button
              onClick={handleLogout}
              className={`p-1 rounded transition-colors ${theme === 'dark' ? 'text-gray-300 hover:bg-slate-700 hover:text-red-300' : 'text-gray-400 hover:bg-gray-100 hover:text-red-500'}`}
              aria-label="Log out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </Tooltip>
        </div>

        {modals}
      </aside>
    );
  }

  return (
    <aside
      className={`flex flex-col ${theme === 'dark' ? 'bg-slate-900 border-r border-slate-700' : 'bg-white border-r border-gray-200'}`}
      style={{ width: '240px', minWidth: '240px' }}
    >
      {/* Collapse toggle — top-right of the panel. */}
      <div className="flex justify-end px-2 pt-2 flex-shrink-0">
        <button
          type="button"
          onClick={toggleLeftSidebar}
          aria-label="Collapse courses panel"
          className={`flex items-center gap-1 px-2 h-[22px] rounded text-[10px] font-semibold uppercase tracking-wide transition-colors ${
            theme === 'dark'
              ? 'text-gray-300 hover:bg-slate-700 hover:text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Collapse
        </button>
      </div>
      <div className="px-3 pt-1 pb-2 flex-shrink-0">
        {/* Title row — `+` sits immediately next to "My Courses" instead of pinned to the right edge. */}
        <div className="flex items-center gap-2 mb-2">
          <p className={`${theme === 'dark' ? 'text-[10px] font-bold text-gray-300 uppercase tracking-widest' : 'text-[10px] font-bold text-gray-500 uppercase tracking-widest'}`}>My Courses</p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="Add course"
            title="Add course"
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

      <div className={`${theme === 'dark' ? 'px-3 py-3 border-t border-slate-700 flex-shrink-0' : 'px-3 py-3 border-t border-gray-200 flex-shrink-0'}`}>
        <div ref={profileMenuRef} className="relative">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              className={`flex-1 flex items-center gap-2 min-w-0 rounded-md px-2 py-1.5 text-left transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-slate-800 data-[open=true]:bg-slate-800'
                  : 'hover:bg-gray-100 data-[open=true]:bg-gray-100'
              }`}
              data-open={profileMenuOpen}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
            >
              {profile && (
                <Avatar
                  user={{ avatarColor: profile.avatar_color, avatarUrl: profile.avatar_url, initials: profile.initials, status: profile.status }}
                  size="md"
                  showStatus
                />
              )}
              <div className="min-w-0 flex-1">
                <p className={`${theme === 'dark' ? 'text-xs font-semibold text-gray-100 leading-tight truncate' : 'text-xs font-semibold text-gray-800 leading-tight truncate'}`}>{profile?.name ?? 'Loading…'}</p>
                <p className="text-[10px] font-medium" style={{ color: statusCfg.color }}>
                  {statusCfg.label}
                </p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 flex-shrink-0 transition-transform ${profileMenuOpen ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => navigate('/settings')}
              className={`p-1 rounded-md transition-colors flex-shrink-0 ${theme === 'dark' ? 'text-gray-300 hover:text-gray-50 hover:bg-slate-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
              aria-label="Settings"
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {profileMenuOpen && profile && (
            <div
              role="menu"
              className={`absolute bottom-[calc(100%+10px)] left-0 right-0 z-20 rounded-lg border shadow-xl p-3 ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar
                  user={{ avatarColor: profile.avatar_color, avatarUrl: profile.avatar_url, initials: profile.initials, status: profile.status }}
                  size="lg"
                  showStatus
                />
                <div className="min-w-0">
                  <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{profile.name}</p>
                  <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>@{profile.username}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate('/settings');
                }}
                className="w-full text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-2 rounded-md transition-colors mb-3"
              >
                Edit profile
              </button>

              <div className="mb-3">
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Availability</p>
                <div className="flex flex-col gap-1.5">
                  {(Object.keys(statusConfig) as UserStatus[]).map((status) => {
                    const active = profile.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusChange(status)}
                        disabled={statusSubmitting !== null}
                        className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors disabled:opacity-60 ${
                          active
                            ? 'bg-[#3B5BDB] text-white'
                            : theme === 'dark'
                              ? 'bg-slate-900 text-gray-100 hover:bg-slate-700'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusConfig[status].color }} />
                          <span>{statusConfig[status].label}</span>
                        </span>
                        {statusSubmitting === status && <span className="text-[10px] font-semibold">Saving…</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className={`w-full text-sm font-semibold px-3 py-2 rounded-md transition-colors ${
                  theme === 'dark'
                    ? 'text-red-300 bg-red-500/10 hover:bg-red-500/20'
                    : 'text-red-600 bg-red-50 hover:bg-red-100'
                }`}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {modals}
    </aside>
  );
}
