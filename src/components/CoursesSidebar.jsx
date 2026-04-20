import { COURSES } from '../data/courses';
import { CURRENT_USER, statusConfig } from '../data/users';
import Avatar from './Avatar';

export default function CoursesSidebar() {
  const enrolledCourses = COURSES.filter(c => CURRENT_USER.enrolledCourses.includes(c.id));

  return (
    <aside className="flex flex-col bg-white border-r border-gray-200" style={{ width: '210px', minWidth: '210px' }}>
      {/* MY COURSES */}
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">My Courses</p>
        <div className="flex flex-col gap-1.5">
          {enrolledCourses.map(course => (
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

      {/* Spacer to push bottom content down */}
      <div className="flex-1" />

      {/* QUICK INVITE */}
      <div className="px-3 py-3 border-t border-gray-100 flex-shrink-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Quick Invite</p>
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        />
        <button
          className="mt-2 w-full bg-[#3B5BDB] text-white text-sm font-semibold py-2 rounded hover:bg-[#3451c7] transition-colors"
        >
          Send Invite
        </button>
      </div>

      {/* USER PROFILE */}
      <div className="px-3 py-3 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Avatar user={CURRENT_USER} size="md" showStatus />
          <div>
            <p className="text-xs font-semibold text-gray-800 leading-tight">{CURRENT_USER.name}</p>
            <p className="text-[10px] font-medium" style={{ color: statusConfig[CURRENT_USER.status]?.color }}>
              {statusConfig[CURRENT_USER.status]?.label}
            </p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
