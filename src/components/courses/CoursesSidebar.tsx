import { COURSES } from '../../data/courses';
import { CURRENT_USER, statusConfig } from '../../data/users';
import Avatar from '../shared/Avatar';
import { signOut } from '@/services/auth.service';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
}

export default function CoursesSidebar() {
  const navigate = useNavigate();
  const reset = useAuthStore((s) => s.reset);
  const enrolledCourses = COURSES.filter((c: Course) => CURRENT_USER.enrolledCourses.includes(c.id));

  async function handleLogout() {
    await signOut();
    reset();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="flex flex-col bg-white border-r border-gray-200" style={{ width: '210px', minWidth: '210px' }}>
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">My Courses</p>
        <div className="flex flex-col gap-1.5">
          {enrolledCourses.map((course: Course) => (
            <div
              key={course.id}
              className="flex items-stretch rounded-md overflow-hidden bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: course.color }} />
              <div className="px-2.5 py-2">
                <p className="text-xs font-bold text-gray-800 leading-tight">{course.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{course.code}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <div className="px-3 py-3 border-t border-gray-100 flex-shrink-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Quick Invite</p>
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        />
        <button className="mt-2 w-full bg-[#3B5BDB] text-white text-sm font-semibold py-2 rounded hover:bg-[#3451c7] transition-colors">
          Send Invite
        </button>
      </div>

      <div className="px-3 py-3 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Avatar user={CURRENT_USER} size="md" showStatus />
          <div>
            <p className="text-xs font-semibold text-gray-800 leading-tight">{CURRENT_USER.name}</p>
            <p className="text-[10px] font-medium" style={{ color: statusConfig[CURRENT_USER.status as keyof typeof statusConfig]?.color }}>
              {statusConfig[CURRENT_USER.status as keyof typeof statusConfig]?.label}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-500 transition-colors p-1"
          aria-label="Log out"
          title="Log out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
