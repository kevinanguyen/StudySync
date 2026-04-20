import Header from './components/Header';
import CoursesSidebar from './components/CoursesSidebar';
import StudyCalendar from './components/StudyCalendar';
import RightPanel from './components/RightPanel';

export default function App() {
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
