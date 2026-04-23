import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useUIStore } from '@/store/uiStore';

const helpSections = [
  {
    title: 'Getting Started',
    pages: [
      {
        title: 'Welcome to StudySync',
        text: 'Use the main workspace to plan study time, find classmates, and access group conversations.',
        highlights: ['Your list of courses appears on the left', 'The weekly calendar is displayed in the center', 'Your friends and group chats are on the right'],
        preview: 'dashboard',
      },
      {
        title: 'Navigation Bar',
        text: 'The icons in the top-right corner provide quick access to key features:',
        iconItems: [
          { icon: 'calendar', label: 'Calendar', text: 'Return to the main dashboard' },
          { icon: 'night', label: 'Night Mode', text: 'Toggle between light and dark themes' },
          { icon: 'help', label: 'Help', text: 'Open this guide' },
          { icon: 'settings', label: 'Settings', text: 'Manage your account' },
          { icon: 'logout', label: 'Log Out', text: 'Sign out when finished' },
        ],
        preview: 'settings',
      },
      {
        title: 'Profile Bar',
        text: 'You may click the profile bar to quickly change your availability status and edit your profile information.',
        highlights: ['Open the profile menu from the sidebar', 'Choose a new availability status in one click', 'Use Edit Profile to jump straight to Settings'],
        preview: 'dashboard',
      },
    ],
  },
  {
    title: 'Calendar',
    pages: [
      {
        title: 'Scheduling Study Sessions',
        highlights: ['Click and drag on specific times in the calendar to quickly create a study event', 'Or use the "+New Event" button in the top-right corner'],
        preview: 'calendar',
      },
      {
        title: 'Event Details',
        highlights: ['Click on any event block to view or edit its details'],
        preview: 'calendar',
      },
      {
        title: 'Navigation',
        highlights: ['Use the arrows at the top to move between weeks', 'Click "Today" to return to the current date'],
        preview: 'calendar',
      },
    ],
  },
  {
    title: 'My Courses',
    pages: [
      {
        title: 'My Courses',
        text: 'Courses help organize study sessions and make it easier to connect with classmates.',
        highlights: ['Add a new course using the + button', 'Delete a course by hovering over it and clicking the x', 'Customize course colors for quick identification'],
        preview: 'courses',
      },
    ],
  },
  {
    title: 'People',
    pages: [
      {
        title: 'Friends',
        highlights: ['Add friends using the + button, then search by username or email', 'Availability is shown with a colored dot and status text', 'Friends can then be added to events and group chats'],
        preview: 'people',
      },
      {
        title: 'Groups',
        highlights: ['Each group page shows members, chat, and upcoming sessions', 'You can also share events with a group when creating them'],
        preview: 'people',
      },
    ],
  },
  {
    title: 'Settings',
    pages: [
      {
        title: 'Manage Your Profile',
        text: 'Update your preferences anytime to match your study needs:',
        highlights: ['Set your availability', 'Adjust accessibility options', 'Change your password'],
        preview: 'settings',
      },
    ],
  },
] as const;

const pages = helpSections.flatMap((section, sectionIndex) =>
  section.pages.map((page, pageIndex) => ({
    ...page,
    sectionTitle: section.title,
    sectionIndex,
    pageIndex,
  }))
);

type Preview = (typeof pages)[number]['preview'];
type PageTitle = (typeof pages)[number]['title'];

type NavIcon = 'calendar' | 'night' | 'help' | 'settings' | 'logout';

function HelpIcon({ icon, dark = false }: { icon: NavIcon; dark?: boolean }) {
  if (icon === 'calendar') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
      </svg>
    );
  }
  if (icon === 'night') {
    if (dark) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
      </svg>
    );
  }
  if (icon === 'help') {
    return <span className="text-sm font-bold" aria-hidden="true">?</span>;
  }
  if (icon === 'settings') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function PreviewScreen({ type, title, dark }: { type: Preview; title: PageTitle; dark: boolean }) {
  const shell = dark ? 'bg-slate-950 border-slate-700' : 'bg-white border-gray-200';
  const subtle = dark ? 'bg-slate-800' : 'bg-gray-100';
  const line = dark ? 'bg-slate-700' : 'bg-gray-200';
  const accent = type === 'courses' ? 'bg-teal-500' : type === 'people' ? 'bg-rose-500' : type === 'settings' ? 'bg-amber-500' : 'bg-[#3B5BDB]';

  if (title === 'Navigation Bar') {
    return (
      <div className={`rounded-lg border p-3 shadow-sm ${shell}`} aria-hidden="true">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 rounded-full bg-[#3B5BDB]" />
          <div className="flex gap-2">
            {['calendar', 'night', 'help', 'settings', 'logout'].map((icon) => (
              <div key={icon} className="h-8 w-8 rounded-md bg-[#3B5BDB] text-white flex items-center justify-center ring-2 ring-[#3B5BDB]/20">
                <HelpIcon icon={icon as NavIcon} dark={dark} />
              </div>
            ))}
          </div>
        </div>
        <div className={`rounded-md p-3 ${subtle}`}>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className={`rounded-md p-2 ${idx === 2 ? 'bg-[#3B5BDB] text-white' : dark ? 'bg-slate-700 text-gray-200' : 'bg-white text-gray-700 border border-gray-200'}`}>
                <div className="h-2 w-8 rounded-full bg-current opacity-70 mb-2" />
                <div className="h-2 w-full rounded-full bg-current opacity-40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (title === 'Scheduling Study Sessions') {
    return (
      <div className={`rounded-lg border p-3 shadow-sm ${shell}`} aria-hidden="true">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 rounded-full bg-[#3B5BDB]" />
          <div className="h-8 w-24 rounded-md bg-[#3B5BDB] text-white text-xs font-bold flex items-center justify-center">+ New Event</div>
        </div>
        <div className={`rounded-md p-2 ${subtle}`}>
          <div className="grid grid-cols-5 gap-1 h-40">
            {Array.from({ length: 25 }).map((_, idx) => (
              <div key={idx} className={`rounded-sm ${idx >= 11 && idx <= 17 ? 'bg-[#3B5BDB] ring-2 ring-blue-300' : line}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (title === 'Event Details') {
    return (
      <div className={`rounded-lg border p-3 shadow-sm ${shell}`} aria-hidden="true">
        <div className="h-3 w-24 rounded-full bg-[#3B5BDB] mb-3" />
        <div className="grid grid-cols-[1fr_120px] gap-3 h-40">
          <div className={`rounded-md p-3 ring-2 ring-[#3B5BDB]/70 ${dark ? 'bg-slate-800' : 'bg-white border border-gray-200'}`}>
            <div className="h-3 w-24 rounded-full bg-[#3B5BDB] mb-3" />
            <div className={`h-2 rounded-full mb-2 ${line}`} />
            <div className={`h-2 rounded-full mb-2 ${line}`} />
            <div className={`h-2 w-2/3 rounded-full mb-4 ${line}`} />
            <div className="flex gap-2">
              <div className="h-7 w-16 rounded-md bg-[#3B5BDB]" />
              <div className={`h-7 w-16 rounded-md ${line}`} />
            </div>
          </div>
          <div className={`rounded-md p-3 ${subtle}`}>
            <div className="h-2 rounded-full mb-2 bg-amber-400" />
            <div className={`h-2 rounded-full mb-2 ${line}`} />
            <div className={`h-2 rounded-full mb-2 ${line}`} />
          </div>
        </div>
      </div>
    );
  }

  if (title === 'Navigation') {
    return (
      <div className={`rounded-lg border p-3 shadow-sm ${shell}`} aria-hidden="true">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-[#3B5BDB] text-white flex items-center justify-center text-sm font-bold">←</div>
            <div className="h-8 w-8 rounded-md bg-[#3B5BDB] text-white flex items-center justify-center text-sm font-bold">→</div>
          </div>
          <div className="h-8 w-16 rounded-md bg-[#3B5BDB] text-white text-xs font-bold flex items-center justify-center">Today</div>
        </div>
        <div className={`rounded-md p-2 ${subtle}`}>
          <div className="grid grid-cols-7 gap-1 h-40">
            {Array.from({ length: 21 }).map((_, idx) => (
              <div key={idx} className={`rounded-sm ${idx === 10 ? 'bg-[#3B5BDB] ring-2 ring-blue-300' : line}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (title === 'Friends') {
    return (
      <div className={`rounded-lg border p-3 shadow-sm ${shell}`} aria-hidden="true">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 rounded-full bg-[#3B5BDB]" />
          <div className="h-8 w-8 rounded-md bg-rose-500 text-white flex items-center justify-center text-sm font-bold">+</div>
        </div>
        <div className="space-y-2">
          {['bg-emerald-500', 'bg-amber-500', 'bg-rose-500'].map((dot, idx) => (
            <div key={idx} className={`rounded-md p-3 ${subtle} flex items-center gap-3`}>
              <div className="h-8 w-8 rounded-full bg-[#3B5BDB]" />
              <div className="flex-1">
                <div className={`h-2 w-20 rounded-full mb-2 ${line}`} />
                <div className={`h-2 w-28 rounded-full ${line}`} />
              </div>
              <div className={`h-3 w-3 rounded-full ${dot}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (title === 'Groups') {
    return (
      <div className={`rounded-lg border p-3 shadow-sm ${shell}`} aria-hidden="true">
        <div className="h-3 w-24 rounded-full bg-[#3B5BDB] mb-3" />
        <div className="grid grid-cols-[90px_1fr_90px] gap-2 h-40">
          <div className={`rounded-md p-2 ${subtle}`}>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => <div key={idx} className={`h-7 rounded-md ${line}`} />)}
            </div>
          </div>
          <div className={`rounded-md p-2 ring-2 ring-rose-300 ${dark ? 'bg-slate-800' : 'bg-white border border-gray-200'}`}>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => <div key={idx} className={`h-5 rounded-md ${idx % 2 === 0 ? 'bg-rose-200' : line}`} />)}
            </div>
          </div>
          <div className={`rounded-md p-2 ${subtle}`}>
            <div className="h-2 rounded-full mb-2 bg-rose-400" />
            <div className={`h-2 rounded-full mb-2 ${line}`} />
            <div className={`h-8 rounded-md ${line}`} />
          </div>
        </div>
      </div>
    );
  }

  if (title === 'Manage Your Profile') {
    return (
      <div className={`rounded-lg border p-3 shadow-sm ${shell}`} aria-hidden="true">
        <div className="h-3 w-24 rounded-full bg-[#3B5BDB] mb-3" />
        <div className="space-y-3">
          <div className={`rounded-md p-3 ring-2 ring-amber-300 ${dark ? 'bg-slate-800' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-amber-400" />
              <div className="flex-1">
                <div className={`h-2 w-24 rounded-full mb-2 ${line}`} />
                <div className={`h-2 w-16 rounded-full ${line}`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, idx) => <div key={idx} className={`h-8 rounded-md ${line}`} />)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-8 rounded-md bg-emerald-500" />
            <div className="h-8 rounded-md bg-[#3B5BDB]" />
            <div className="h-8 rounded-md bg-amber-500" />
          </div>
        </div>
      </div>
    );
  }

  if (title === 'Profile Bar') {
    return (
      <div className={`rounded-lg border p-3 shadow-sm ${shell}`} aria-hidden="true">
        <div className="grid grid-cols-[88px_1fr] gap-3 h-40">
          <div className={`rounded-md p-2 ${subtle} flex flex-col justify-end`}>
            <div className={`rounded-xl border px-3 py-3 ${dark ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'} ring-2 ring-[#3B5BDB]/50`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#3B5BDB]" />
                <div className="flex-1">
                  <div className={`h-2 w-16 rounded-full mb-2 ${line}`} />
                  <div className={`h-2 w-12 rounded-full ${line}`} />
                </div>
                <div className="h-7 w-7 rounded-md bg-amber-500" />
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <div className={`w-full max-w-[210px] rounded-xl border p-3 shadow-sm ${dark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-[#3B5BDB]" />
                <div className="flex-1">
                  <div className={`h-2 w-20 rounded-full mb-2 ${line}`} />
                  <div className={`h-2 w-14 rounded-full ${line}`} />
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="h-8 rounded-md bg-emerald-500/85" />
                <div className={`h-8 rounded-md ${line}`} />
                <div className={`h-8 rounded-md ${line}`} />
              </div>
              <div className="h-8 rounded-md bg-[#3B5BDB]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 shadow-sm ${shell}`} aria-hidden="true">
      <div className="h-3 w-24 rounded-full bg-[#3B5BDB] mb-3" />
      <div className="grid grid-cols-[72px_1fr_64px] gap-2 h-40">
        <div className={`rounded-md p-2 ${type === 'courses' ? 'ring-2 ring-teal-400' : subtle}`}>
          <div className={`h-3 rounded-full mb-2 ${accent}`} />
          <div className={`h-2 rounded-full mb-2 ${line}`} />
          <div className={`h-2 rounded-full mb-2 ${line}`} />
          <div className={`h-2 w-2/3 rounded-full ${line}`} />
        </div>
        <div className={`rounded-md p-2 ${type === 'calendar' || type === 'dashboard' ? 'ring-2 ring-[#3B5BDB]/70' : subtle}`}>
          <div className="grid grid-cols-5 gap-1 h-full">
            {Array.from({ length: 20 }).map((_, idx) => (
              <div
                key={idx}
                className={`rounded-sm ${idx === 7 || idx === 13 ? accent : line}`}
              />
            ))}
          </div>
        </div>
        <div className={`rounded-md p-2 ${type === 'people' ? 'ring-2 ring-rose-400' : subtle}`}>
          <div className="flex gap-1 mb-2">
            <div className="h-5 w-5 rounded-full bg-rose-400" />
            <div className="h-5 w-5 rounded-full bg-amber-400" />
          </div>
          <div className={`h-2 rounded-full mb-2 ${line}`} />
          <div className={`h-2 rounded-full mb-2 ${line}`} />
          <div className={`h-7 rounded ${type === 'settings' ? 'ring-2 ring-amber-400' : line}`} />
        </div>
      </div>
    </div>
  );
}

export default function WelcomeTour() {
  const open = useUIStore((s) => s.welcomeOpen);
  const closeWelcome = useUIStore((s) => s.closeWelcome);
  const theme = useUIStore((s) => s.theme);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dark = theme === 'dark';
  const section = helpSections[activeSectionIndex];
  const page = section.pages[pageIndex];
  const isFirstPage = pageIndex === 0;
  const isLastPage = pageIndex === section.pages.length - 1;
  const isFirstSection = activeSectionIndex === 0;
  const isLastSection = activeSectionIndex === helpSections.length - 1;
  const showPreviousSection = isFirstPage;

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    setActiveSectionIndex(0);
    setPageIndex(0);
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeWelcome();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') setPageIndex((current) => Math.max(current - 1, 0));
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeWelcome, isLastPage, isLastSection]);

  function showSection(nextSectionIndex: number) {
    setActiveSectionIndex(nextSectionIndex);
    setPageIndex(0);
  }

  function handleNext() {
    if (!isLastPage) {
      setPageIndex((current) => current + 1);
      return;
    }

    if (!isLastSection) {
      showSection(activeSectionIndex + 1);
      return;
    }

    closeWelcome();
  }

  function handleBack() {
    if (!isFirstPage) {
      setPageIndex((current) => current - 1);
      return;
    }

    if (!isFirstSection) {
      showSection(activeSectionIndex - 1);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <button
        type="button"
        aria-label="Close welcome guide"
        onClick={closeWelcome}
        className="absolute inset-0 bg-black/45 cursor-default"
      />
      <div
        ref={panelRef}
        className={`relative w-full max-w-5xl rounded-xl shadow-2xl focus:outline-none overflow-hidden ${
          dark ? 'bg-slate-900 text-gray-100' : 'bg-white text-gray-900'
        }`}
      >
        <div className={`flex items-center justify-between gap-4 px-5 py-3 border-b ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${dark ? 'text-blue-300' : 'text-[#3B5BDB]'}`}>Help guide</p>
            <h2 id="welcome-title" className="text-lg font-bold">Welcome to StudySync</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className={`hidden sm:block text-right ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
              <p className={`text-[11px] font-semibold uppercase ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Need this again?</p>
              <p className="text-sm font-bold">Press ? in the top right</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={closeWelcome}
              aria-label="Close"
              className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
                dark ? 'text-gray-300 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)_minmax(320px,1.05fr)] gap-5 p-5 md:items-stretch">
          <nav className={`rounded-lg border p-2 overflow-y-auto md:min-h-[380px] md:max-h-[520px] ${dark ? 'border-slate-700 bg-slate-950' : 'border-gray-200 bg-gray-50'}`} aria-label="Help pages">
            {helpSections.map((section, sectionIndex) => (
              <div key={section.title} className="mb-2 last:mb-0">
                <button
                  type="button"
                  onClick={() => showSection(sectionIndex)}
                  aria-current={sectionIndex === activeSectionIndex ? 'page' : undefined}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm font-bold transition-colors ${
                    sectionIndex === activeSectionIndex
                      ? 'bg-[#3B5BDB] text-white'
                      : dark
                        ? 'text-gray-300 hover:bg-slate-800 hover:text-white'
                        : 'text-gray-700 hover:bg-white hover:text-gray-950'
                  }`}
                >
                  {section.title}
                </button>
              </div>
            ))}
          </nav>

          <div className="flex flex-col md:min-h-[380px]">
            <p className={`text-xs font-semibold uppercase mb-1 ${dark ? 'text-blue-300' : 'text-[#3B5BDB]'}`}>{section.title}</p>
            <h3 className="text-2xl font-bold mb-2">{page.title}</h3>
            {'text' in page && page.text && (
              <p className={`text-sm leading-6 mb-5 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{page.text}</p>
            )}
            {'iconItems' in page ? (
              <ul className="space-y-2 mb-5">
                {page.iconItems.map((item) => (
                  <li
                    key={item.label}
                    className={`grid items-center gap-x-3 text-sm ${
                      item.icon === 'night' ? 'grid-cols-[28px_28px_1fr] gap-x-1.5' : 'grid-cols-[28px_1fr]'
                    }`}
                  >
                    {item.icon === 'night' ? (
                      <>
                        <span className="h-7 w-7 rounded-md bg-[#3B5BDB] text-white flex items-center justify-center flex-shrink-0">
                          <HelpIcon icon="night" dark />
                        </span>
                        <span className="h-7 w-7 rounded-md bg-[#3B5BDB] text-white flex items-center justify-center flex-shrink-0">
                          <HelpIcon icon="night" dark={false} />
                        </span>
                      </>
                    ) : (
                      <span className="h-7 w-7 rounded-md bg-[#3B5BDB] text-white flex items-center justify-center flex-shrink-0">
                        <HelpIcon icon={item.icon} dark={dark} />
                      </span>
                    )}
                    <span className={`leading-6 ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
                      <span className="font-bold">{item.icon === 'night' ? 'Day/Night Mode' : item.label}</span>{' '}
                      — {item.icon === 'night' ? 'Switch website theme' : item.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2 mb-5">
                {page.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#3B5BDB] flex-shrink-0" />
                    <span className={dark ? 'text-gray-200' : 'text-gray-700'}>{highlight}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={isFirstPage && isFirstSection}
                className={`text-sm font-semibold px-3 py-2 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed border ${
                  dark ? 'border-slate-700 text-gray-200 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {showPreviousSection ? 'Previous section' : 'Back'}
              </button>
              <span className={`text-sm font-bold ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{pageIndex + 1} / {section.pages.length}</span>
              <button
                type="button"
                onClick={handleNext}
                className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 py-2 rounded-md transition-colors"
              >
                {isLastPage ? (isLastSection ? 'Done' : 'Next section') : 'Next'}
              </button>
            </div>
          </div>

          <div className={`rounded-xl p-4 md:min-h-[380px] ${dark ? 'bg-slate-950' : 'bg-gray-50'}`}>
            <PreviewScreen type={page.preview} title={page.title} dark={dark} />
          </div>
        </div>
      </div>
    </div>
  );
}
