import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { statusConfig } from '@/lib/status';
import type { Profile } from '@/services/friends.service';

interface FriendProfileModalProps {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
  onUnfriend?: () => void;
}

export default function FriendProfileModal({ open, profile, onClose, onUnfriend }: FriendProfileModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !profile) return null;

  const cfg = statusConfig[profile.status];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="friend-profile-title">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close profile"
        className="absolute inset-0 bg-black/40 cursor-default"
      />
      <div ref={panelRef} className="relative bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
        {/* Banner in the user's color */}
        <div className="h-20 w-full" style={{ backgroundColor: profile.avatar_color }} />

        <div className="relative px-5 pb-5">
          {/* Large avatar overlapping the banner */}
          <div className="absolute -top-9 left-5">
            <div
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center font-bold text-white text-2xl ring-4 ring-white shadow-md"
              style={{ backgroundColor: profile.avatar_color }}
            >
              {profile.initials}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 text-white/90 hover:text-white text-sm w-7 h-7 rounded-full bg-black/20 hover:bg-black/30 transition-colors flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="pt-12">
            <h3 id="friend-profile-title" className="text-xl font-bold text-gray-900 leading-tight">{profile.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">@{profile.username}</p>

            {/* Status pill */}
            <div className="mt-3 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-2 pr-3 py-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
              {profile.status_text && (
                <>
                  <span className="w-px h-3 bg-gray-200" />
                  <span className="text-xs text-gray-600 truncate max-w-[180px]">{profile.status_text}</span>
                </>
              )}
            </div>

            {/* Facts grid */}
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {profile.major && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Major</div>
                  <div className="text-gray-800">{profile.major}</div>
                </div>
              )}
              {profile.grad_year && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Graduating</div>
                  <div className="text-gray-800">{profile.grad_year}</div>
                </div>
              )}
              <div className="col-span-2">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">School email</div>
                <div className="text-gray-800 truncate">{profile.school_email}</div>
              </div>
            </div>

            {!profile.major && !profile.grad_year && (
              <p className="text-xs text-gray-400 italic mt-3">{profile.name.split(' ')[0]} hasn't filled out their profile yet.</p>
            )}

            {onUnfriend && (
              <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={onUnfriend}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
                >
                  Unfriend
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
