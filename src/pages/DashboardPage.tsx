import Header from '@/components/layout/Header';
import CoursesSidebar from '@/components/courses/CoursesSidebar';
import StudyCalendar from '@/components/calendar/StudyCalendar';
import RightPanel from '@/components/friends/RightPanel';

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        <CoursesSidebar />
        <StudyCalendar />
        <RightPanel />
      </div>
    </div>
  );
}
