import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useLayoutStore } from '@/store/layoutStore';
import { signOut } from '@/services/auth.service';

interface HeaderIconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

function ThemeModeIcon({ nextTheme }: { nextTheme: 'light' | 'dark' }) {
  if (nextTheme === 'light') {
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

function HeaderIconButton({ label, onClick, children }: HeaderIconButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const suppressTooltipRef = useRef(false);

  function handleClick() {
    suppressTooltipRef.current = true;
    setShowTooltip(false);
    onClick();
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (!suppressTooltipRef.current) setShowTooltip(true);
      }}
      onMouseLeave={() => {
        suppressTooltipRef.current = false;
        setShowTooltip(false);
      }}
      onFocus={() => {
        if (!suppressTooltipRef.current) setShowTooltip(true);
      }}
      onBlur={() => {
        suppressTooltipRef.current = false;
        setShowTooltip(false);
      }}
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
  const leftCollapsed = useLayoutStore((s) => s.leftSidebarCollapsed);
  const rightCollapsed = useLayoutStore((s) => s.rightSidebarCollapsed);
  const toggleLeftSidebar = useLayoutStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useLayoutStore((s) => s.toggleRightSidebar);
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  const themeToggleLabel = nextTheme === 'dark' ? 'Night mode' : 'Day mode';
  const leftToggleLabel = leftCollapsed ? 'Expand courses panel' : 'Collapse courses panel';
  const rightToggleLabel = rightCollapsed ? 'Expand friends panel' : 'Collapse friends panel';

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
      {/* Left sidebar toggle + Logo + Brand */}
      <div className="flex items-center gap-2.5">
        <HeaderIconButton onClick={toggleLeftSidebar} label={leftToggleLabel}>
          {leftCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
            </svg>
          )}
        </HeaderIconButton>
        {/* Brand mark — theme-switched monkey logo. Black bg of the image is
            intentional sticker styling and matches the rounded badge below. */}
        <img
          src={theme === 'dark' ? '/brand/monkey-mark-dark.png' : '/brand/monkey-mark-light.png'}
          alt="StudySync"
          className="w-8 h-8 rounded-lg flex-shrink-0 object-cover"
        />
        <span className="text-lg font-bold tracking-tight">StudySync</span>
      </div>

      <div className="flex items-center gap-2">
        <HeaderIconButton
          onClick={() => navigate('/dashboard')}
          label="Dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
          </svg>
        </HeaderIconButton>

        <HeaderIconButton
          onClick={toggleRightSidebar}
          label={rightToggleLabel}
        >
          {rightCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </HeaderIconButton>

        {/* 🌙 Dark mode toggle */}
        <HeaderIconButton
          onClick={() => setTheme(nextTheme)}
          label={themeToggleLabel}
        >
          <ThemeModeIcon nextTheme={nextTheme} />
        </HeaderIconButton>

        <HeaderIconButton
          onClick={openWelcome}
          label="Help"
        >
          <span className="text-sm font-bold">?</span>
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
