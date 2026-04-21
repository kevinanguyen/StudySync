import { useEffect, useState } from 'react';

/**
 * Returns the current moment formatted in US Central Time
 * (`America/Chicago`), regardless of the browser's locale setting.
 *
 * Used to show an unambiguous "Tue 10:23 AM" reference next to the
 * calendar so users always know what time is what, even if their OS
 * timezone happens to be set to something other than CST.
 *
 * Updates every 30 seconds — enough precision for a wall clock without
 * thrashing renders.
 */
export function useCentralClock(): string {
  const [text, setText] = useState(() => formatCentral(new Date()));

  useEffect(() => {
    const intervalId = setInterval(() => setText(formatCentral(new Date())), 30_000);
    return () => clearInterval(intervalId);
  }, []);

  return text;
}

function formatCentral(d: Date): string {
  return d.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
