import Header from '@/components/layout/Header';
import CoursesSidebar from '@/components/courses/CoursesSidebar';
import StudyCalendar from '@/components/calendar/StudyCalendar';
import RightPanel from '@/components/friends/RightPanel';
import { useUIStore } from '@/store/uiStore';

export default function DashboardPage() {
  const theme = useUIStore((s) => s.theme);
  return (
    <div className={`flex flex-col h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <Header />

      {/* Small-screen notice (under tablet) */}
      <div className={`${theme === 'dark' ? 'md:hidden bg-amber-900 border-b border-amber-700 text-amber-200 text-xs px-4 py-2 text-center' : 'md:hidden bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 text-center'}`}>
        StudySync is best on a tablet or desktop. Some features may be hard to reach on small screens.
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="hidden md:flex"><CoursesSidebar /></div>
        <StudyCalendar />
        <div className="hidden lg:flex"><RightPanel /></div>
      </div>
    </div>
  );
}
