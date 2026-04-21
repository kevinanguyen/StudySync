import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Mount once at the app root.
 *
 * When a Chrome tab sits on a backgrounded macOS Space, Chrome throttles
 * timers + network I/O. supabase-js's `autoRefreshToken` fires on a timer
 * and its refresh promise can stall indefinitely while paused. Since
 * supabase-js awaits the current session before every query, one stuck
 * refresh blocks ALL subsequent INSERT/UPDATE/SELECT calls — so clicks
 * appear to do nothing until the user reloads the tab.
 *
 * The supported fix (Supabase recommends this for RN / any paused JS
 * environment) is to pause the auto-refresher while the tab is not in
 * the foreground and resume it on return. `startAutoRefresh()` runs an
 * immediate tick, so a refresh happens as soon as the user swipes back.
 *
 * We also:
 *   - Walk realtime channels and re-subscribe any that aren't joined.
 *   - Dispatch a `studysync:tab-revived` window event so data hooks can
 *     reload in case realtime events were missed while paused.
 *
 * macOS note: swiping between Spaces does NOT reliably fire
 * `visibilitychange`, but window `focus` / `blur` do fire when the
 * window enters / leaves the active Space. We listen to both.
 */
export function useSupabaseKeepalive(): void {
  useEffect(() => {
    let isActive = !document.hidden;

    function activate() {
      if (isActive) return;
      isActive = true;

      // Resume auth auto-refresh. This also kicks an immediate refresh
      // if the access token is near expiry, which dislodges any
      // previously-paused refresh attempt.
      supabase.auth.startAutoRefresh().catch(() => {
        /* non-fatal: next query will surface the error via fetch timeout */
      });

      // Re-subscribe any realtime channels that dropped while paused.
      try {
        for (const channel of supabase.getChannels()) {
          const state = channel.state;
          if (state !== 'joined' && state !== 'joining') {
            try {
              channel.subscribe();
            } catch {
              /* individual channel owners will recover on remount */
            }
          }
        }
      } catch {
        /* older client without getChannels — ignore */
      }

      // Tell data hooks to reload in case they missed realtime events.
      window.dispatchEvent(new CustomEvent('studysync:tab-revived'));
    }

    function deactivate() {
      if (!isActive) return;
      isActive = false;
      // Pause auth auto-refresh so no refresh promise gets stuck mid-flight
      // while the JS engine is throttled.
      supabase.auth.stopAutoRefresh().catch(() => {
        /* non-fatal */
      });
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') activate();
      else deactivate();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', activate);
    window.addEventListener('blur', deactivate);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', activate);
      window.removeEventListener('blur', deactivate);
    };
  }, []);
}
