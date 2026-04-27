import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import CoursesSidebar from '@/components/courses/CoursesSidebar';
import StudyCalendar from '@/components/calendar/StudyCalendar';
import RightPanel from '@/components/friends/RightPanel';
import { useUIStore } from '@/store/uiStore';
import { useLayoutStore } from '@/store/layoutStore';

// Below this width expanded sidebars overlay the calendar instead of
// compressing it — keeps the week grid readable on narrow desktops / split
// screens.
const OVERLAY_BELOW_PX = 1024;

function useViewportWidth(): number {
  const [width, setWidth] = useState<number>(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

export default function DashboardPage() {
  const theme = useUIStore((s) => s.theme);
  const leftCollapsed = useLayoutStore((s) => s.leftSidebarCollapsed);
  const rightCollapsed = useLayoutStore((s) => s.rightSidebarCollapsed);
  const setLeftCollapsed = useLayoutStore((s) => s.setLeftSidebarCollapsed);
  const setRightCollapsed = useLayoutStore((s) => s.setRightSidebarCollapsed);

  const width = useViewportWidth();
  const isNarrow = width < OVERLAY_BELOW_PX;

  // When the sidebar is expanded AND the viewport is narrow, we render it as
  // an absolutely-positioned overlay on top of the calendar rather than
  // inline.
  const leftOverlay = isNarrow && !leftCollapsed;
  const rightOverlay = isNarrow && !rightCollapsed;

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <Header />

      <div className="flex flex-1 min-h-0 relative">
        {/* Left sidebar — inline unless narrow+expanded. */}
        {!leftOverlay && <CoursesSidebar />}

        <StudyCalendar />

        {/* Right sidebar — inline unless narrow+expanded. */}
        {!rightOverlay && <RightPanel />}

        {/* Backdrop: tapping it collapses whichever sidebar(s) are overlaid. */}
        {(leftOverlay || rightOverlay) && (
          <div
            className="absolute inset-0 bg-black/30 z-20"
            onClick={() => {
              if (leftOverlay) setLeftCollapsed(true);
              if (rightOverlay) setRightCollapsed(true);
            }}
            aria-hidden="true"
          />
        )}

        {/* Overlay renderings — absolutely positioned on top of the calendar. */}
        {leftOverlay && (
          <div className="absolute inset-y-0 left-0 z-30 shadow-xl">
            <CoursesSidebar />
          </div>
        )}
        {rightOverlay && (
          <div className="absolute inset-y-0 right-0 z-30 shadow-xl">
            <RightPanel />
          </div>
        )}
      </div>
    </div>
  );
}
