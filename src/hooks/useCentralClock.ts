import { useEffect, useState } from 'react';

/**
 * Returns the current moment formatted in US Central Time
 * (`America/Chicago`), regardless of the browser's locale setting.
 *
 * The display only has minute precision ("Tue 10:23 AM"), so we only
 * need to re-render on minute boundaries — but those boundaries must
 * line up with the wall clock, not with mount time. We schedule the
 * first tick for the moment the next real-world minute starts, then
 * tick every 60s after that. This keeps the displayed minute within
 * a second or two of reality rather than up to 59s stale.
 */
export function useCentralClock(): string {
  const [text, setText] = useState(() => formatCentral(new Date()));

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    function tick() {
      setText(formatCentral(new Date()));
    }

    // Milliseconds until the start of the next wall-clock minute.
    const now = new Date();
    const msUntilNextMinute = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());

    const timeoutId = setTimeout(() => {
      tick(); // first wall-clock-aligned tick
      intervalId = setInterval(tick, 60_000); // 60s steady-state
    }, msUntilNextMinute);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId !== undefined) clearInterval(intervalId);
    };
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
