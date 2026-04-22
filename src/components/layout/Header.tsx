import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/services/auth.service';

interface HeaderIconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

function HeaderIconButton({ label, onClick, children }: HeaderIconButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  function handleClick() {
    setShowTooltip(false);
    onClick();
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        className="w-8 h-8 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
        aria-label={label}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-950 px-2 py-1 text-xs font-semibold text-white shadow-lg transition-opacity duration-150 ${showTooltip ? 'opacity-100' : 'opacity-0'}`}
      >
        {label}
      </span>
    </div>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const setTheme = useUIStore((s) => s.setTheme);
  const theme = useUIStore((s) => s.theme);
  const openWelcome = useUIStore((s) => s.openWelcome);
  const resetAuth = useAuthStore((s) => s.reset);

  // theme is read from the UI store; no debug logging in production

  async function handleLogout() {
    await signOut();
    resetAuth();
    navigate('/login', { replace: true });
  }

  return (
    <header
      className={`flex items-center justify-between px-4 flex-shrink-0 transition-colors duration-200 ease-in-out ${
        theme === 'dark' ? 'bg-[#2d46a8] text-white' : 'bg-[#3B5BDB] text-white'
      }`}
      style={{ height: '52px' }}
    >
      {/* Logo + Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M2 6C2 6 5 5 8 5C10 5 12 6 12 6V20C12 20 10 19 8 19C5 19 2 20 2 20V6Z" fill="white" fillOpacity="0.9"/>
            <path d="M22 6C22 6 19 5 16 5C14 5 12 6 12 6V20C12 20 14 19 16 19C19 19 22 20 22 20V6Z" fill="white" fillOpacity="0.7"/>
            <path d="M7 3C8.5 2 10.2 2 12 2C13.8 2 15.5 2 17 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-lg font-bold tracking-tight">StudySync</span>
      </div>

      <div className="flex items-center gap-2">
        <HeaderIconButton
          onClick={openWelcome}
          label="Help"
        >
          <span className="text-sm font-bold">?</span>
        </HeaderIconButton>

        {/* 🌙 Dark mode toggle */}
        <HeaderIconButton
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          label="Night mode"
        >
          {theme === 'dark' ? (
            // ☀️ Sun icon
            <span className="text-sm">☀️</span>
          ) : (
            // 🌙 Moon icon
            <span className="text-sm">🌙</span>
          )}
        </HeaderIconButton>

        <HeaderIconButton
          onClick={() => navigate('/settings')}
          label="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </HeaderIconButton>

        <HeaderIconButton
          onClick={handleLogout}
          label="Log out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </HeaderIconButton>
      </div>
    </header>
  );
}
