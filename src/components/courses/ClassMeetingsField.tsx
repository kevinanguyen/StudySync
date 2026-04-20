import { useState } from 'react';

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
  const [day, setDay] = useState(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [err, setErr] = useState<string | null>(null);

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
      <span className="text-xs font-semibold text-gray-700">Class meetings (optional)</span>
      {meetings.length > 0 && (
        <ul className="flex flex-col gap-1">
          {meetings.map((m, i) => (
            <li key={i} className="flex items-center gap-2 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1">
              <span className="font-semibold text-gray-700 w-10">{DAYS.find((d) => d.value === m.day_of_week)?.label}</span>
              <span className="text-gray-600 flex-1">{m.start_time} – {m.end_time}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove meeting"
                className="text-gray-400 hover:text-red-600 transition-colors"
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
          className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
          aria-label="Day of week"
        >
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          aria-label="Start time"
          className="text-sm border border-gray-200 rounded px-2 py-1.5"
        />
        <span className="text-gray-400 text-xs">to</span>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          aria-label="End time"
          className="text-sm border border-gray-200 rounded px-2 py-1.5"
        />
        <button
          type="button"
          onClick={add}
          className="ml-auto text-xs font-semibold text-[#3B5BDB] border border-[#3B5BDB]/40 px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
        >
          Add
        </button>
      </div>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
