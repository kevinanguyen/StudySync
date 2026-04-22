import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useUIStore } from '@/store/uiStore';

const screens = [
  {
    title: 'Welcome to StudySync',
    text: 'Use the main workspace to plan study time, find classmates, and keep every group conversation close by.',
    highlights: ['Courses stay on the left', 'Calendar fills the center', 'Friends and requests sit on the right'],
    preview: 'dashboard',
  },
  {
    title: 'Start with your courses',
    text: 'Add each class from the course panel. Courses help organize study sessions and make it easier to find the right classmates.',
    highlights: ['Add or edit courses', 'Open settings from the bottom', 'Use course colors to scan faster'],
    preview: 'courses',
  },
  {
    title: 'Schedule study sessions',
    text: 'Click the calendar to create study events, invite friends, and see upcoming sessions by day or week.',
    highlights: ['Click a time slot to add an event', 'Drag through available blocks', 'Open events to view details'],
    preview: 'calendar',
  },
  {
    title: 'Study with people',
    text: 'Use friends and groups to coordinate plans. Group pages keep members, chat, and upcoming sessions together.',
    highlights: ['Accept friend requests', 'Create study groups', 'Chat from each group page'],
    preview: 'people',
  },
  {
    title: 'Tune your profile',
    text: 'Settings lets you update your profile, status, password, theme, and text size whenever your study setup changes.',
    highlights: ['Set your availability', 'Adjust accessibility options', 'Use the ? button to reopen this guide'],
    preview: 'settings',
  },
] as const;

type Preview = (typeof screens)[number]['preview'];

function PreviewScreen({ type, dark }: { type: Preview; dark: boolean }) {
  const shell = dark ? 'bg-slate-950 border-slate-700' : 'bg-white border-gray-200';
  const subtle = dark ? 'bg-slate-800' : 'bg-gray-100';
  const line = dark ? 'bg-slate-700' : 'bg-gray-200';
  const accent = type === 'courses' ? 'bg-teal-500' : type === 'people' ? 'bg-rose-500' : type === 'settings' ? 'bg-amber-500' : 'bg-[#3B5BDB]';

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
  const [index, setIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dark = theme === 'dark';
  const screen = screens[index];

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeWelcome();
      if (e.key === 'ArrowRight') setIndex((current) => Math.min(current + 1, screens.length - 1));
      if (e.key === 'ArrowLeft') setIndex((current) => Math.max(current - 1, 0));
    }
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeWelcome]);

  if (!open) return null;

  const isFirst = index === 0;
  const isLast = index === screens.length - 1;

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
              <p className="text-sm font-bold">Press ?</p>
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

        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_1.05fr] gap-5 p-5">
          <nav className={`rounded-lg border p-2 ${dark ? 'border-slate-700 bg-slate-950' : 'border-gray-200 bg-gray-50'}`} aria-label="Help pages">
            {screens.map((item, itemIndex) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setIndex(itemIndex)}
                aria-current={itemIndex === index ? 'page' : undefined}
                className={`w-full rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  itemIndex === index
                    ? 'bg-[#3B5BDB] text-white'
                    : dark
                      ? 'text-gray-300 hover:bg-slate-800 hover:text-white'
                      : 'text-gray-700 hover:bg-white hover:text-gray-950'
                }`}
              >
                {item.title}
              </button>
            ))}
          </nav>

          <div className="flex flex-col">
            <h3 className="text-2xl font-bold mb-2">{screen.title}</h3>
            <p className={`text-sm leading-6 mb-5 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{screen.text}</p>
            <ul className="space-y-2 mb-5">
              {screen.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#3B5BDB] flex-shrink-0" />
                  <span className={dark ? 'text-gray-200' : 'text-gray-700'}>{highlight}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIndex((current) => Math.max(current - 1, 0))}
                disabled={isFirst}
                className={`text-sm font-semibold px-3 py-2 rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  dark ? 'border-slate-700 text-gray-200 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Back
              </button>
              <span className={`text-sm font-bold ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{index + 1} / {screens.length}</span>
              <button
                type="button"
                onClick={isLast ? closeWelcome : () => setIndex((current) => current + 1)}
                className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 py-2 rounded-md transition-colors"
              >
                {isLast ? 'Start studying' : 'Next'}
              </button>
            </div>
          </div>

          <div className={`rounded-xl p-4 ${dark ? 'bg-slate-950' : 'bg-gray-50'}`}>
            <PreviewScreen type={screen.preview} dark={dark} />
          </div>
        </div>
      </div>
    </div>
  );
}
