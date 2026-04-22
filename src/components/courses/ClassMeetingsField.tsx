import { useState, useRef } from 'react';
import { useUIStore } from '@/store/uiStore';

export interface ClassMeetingDraft {
  day_of_week: number;
  start_time: string; // "HH:MM"
  end_time: string;
}

interface ClassMeetingsFieldProps {
  meetings: ClassMeetingDraft[];
  onChange: (meetings: ClassMeetingDraft[]) => void;
}

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export default function ClassMeetingsField({ meetings, onChange }: ClassMeetingsFieldProps) {
  const theme = useUIStore((s) => s.theme);
  const [day, setDay] = useState(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [err, setErr] = useState<string | null>(null);
  const startRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLInputElement | null>(null);

  function add() {
    if (end <= start) {
      setErr('End must be after start.');
      return;
    }
    setErr(null);
    onChange([...meetings, { day_of_week: day, start_time: start, end_time: end }]);
  }

  function remove(idx: number) {
    onChange(meetings.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Class meetings (optional)</span>
      {meetings.length > 0 && (
        <ul className="flex flex-col gap-1">
          {meetings.map((m, i) => (
            <li key={i} className={`flex items-center gap-2 text-sm rounded px-2 py-1 ${theme === 'dark' ? 'bg-slate-700 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
              <span className={`font-semibold w-10 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>{DAYS.find((d) => d.value === m.day_of_week)?.label}</span>
              <span className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-600'} flex-1`}>{m.start_time} – {m.end_time}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove meeting"
                className={`${theme === 'dark' ? 'text-gray-300 hover:text-red-400' : 'text-gray-400 hover:text-red-600'} transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className={`${theme === 'dark' ? 'text-sm border border-slate-700 rounded px-2 py-1.5 bg-slate-800 text-gray-100' : 'text-sm border border-gray-200 rounded px-2 py-1.5 bg-white'}`}
          aria-label="Day of week"
        >
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <div className="relative">
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            ref={startRef}
            aria-label="Start time"
            className={`${theme === 'dark' ? 'text-sm border border-slate-700 rounded px-2 py-1.5 pr-8 bg-slate-800 text-gray-100' : 'text-sm border border-gray-200 rounded px-2 py-1.5 pr-8'} custom-time`}
          />
          <button
            type="button"
            onClick={() => {
              const el = startRef.current as HTMLInputElement | null;
              if (!el) return;
              // Prefer the modern showPicker API when available (opens native picker on supporting browsers)
              // otherwise fall back to focusing the input which may open the picker on mobile.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if ((el as any).showPicker) {
                try { (el as any).showPicker(); return; } catch (_) { /* ignore */ }
              }
              el.focus();
            }}
            aria-label="Open start time picker"
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center ${theme === 'dark' ? 'text-gray-100' : 'text-black'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-400'} text-xs`}>to</span>
        <div className="relative">
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            ref={endRef}
            aria-label="End time"
            className={`${theme === 'dark' ? 'text-sm border border-slate-700 rounded px-2 py-1.5 pr-8 bg-slate-800 text-gray-100' : 'text-sm border border-gray-200 rounded px-2 py-1.5 pr-8'} custom-time`}
          />
          <button
            type="button"
            onClick={() => {
              const el = endRef.current as HTMLInputElement | null;
              if (!el) return;
              // Prefer showPicker when available
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if ((el as any).showPicker) {
                try { (el as any).showPicker(); return; } catch (_) { /* ignore */ }
              }
              el.focus();
            }}
            aria-label="Open end time picker"
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center ${theme === 'dark' ? 'text-gray-100' : 'text-black'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={add}
          className={`ml-auto text-xs font-semibold border px-3 py-1.5 rounded transition-colors ${theme === 'dark' ? 'text-[#9AB0FF] border-[#3B5BDB]/30 hover:bg-slate-700/50' : 'text-[#3B5BDB] border border-[#3B5BDB]/40 hover:bg-blue-50'}`}
        >
          Add
        </button>
      </div>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
