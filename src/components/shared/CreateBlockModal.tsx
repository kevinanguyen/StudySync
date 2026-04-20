import { useState, useEffect, useRef } from 'react';
import { COURSES } from '../../data/courses';
import { CURRENT_USER } from '../../data/users';

interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
}

interface TimeInfo {
  startStr: string;
  endStr: string;
  start: Date;
  end: Date;
}

interface Position {
  x: number;
  y: number;
}

interface CreateBlockModalProps {
  position: Position;
  timeInfo: TimeInfo;
  onConfirm: (course: Course) => void;
  onCancel: () => void;
}

export default function CreateBlockModal({ position, timeInfo, onConfirm, onCancel }: CreateBlockModalProps) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const enrolledCourses = COURSES.filter((c: Course) => CURRENT_USER.enrolledCourses.includes(c.id));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  function formatTime(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function handleConfirm() {
    if (!selectedCourse) return;
    onConfirm(selectedCourse);
  }

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    top: Math.min(position.y, window.innerHeight - 300),
    left: Math.min(position.x, window.innerWidth - 240),
  };

  return (
    <div style={modalStyle}>
      <div ref={ref} className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-56">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">Add Study Block</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {timeInfo && (
          <p className="text-[11px] text-gray-500 mb-3">
            {formatTime(timeInfo.startStr)} – {formatTime(timeInfo.endStr)}
          </p>
        )}

        <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Select Course</p>

        <div className="flex flex-col gap-1.5 mb-4">
          {enrolledCourses.map((course: Course) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourse(course)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all border ${
                selectedCourse?.id === course.id ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
              }`}
            >
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: course.color }} />
              <div>
                <p className="text-xs font-semibold text-gray-800">{course.code}</p>
                <p className="text-[10px] text-gray-500 leading-tight">{course.name}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!selectedCourse} className={`flex-1 py-1.5 text-xs font-semibold text-white rounded transition-colors ${selectedCourse ? 'bg-[#3B5BDB] hover:bg-[#3451c7]' : 'bg-gray-300 cursor-not-allowed'}`}>
            Add Block
          </button>
        </div>
      </div>
    </div>
  );
}
