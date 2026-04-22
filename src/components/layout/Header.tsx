import { useUIStore } from '@/store/uiStore';

export default function Header() {
  const setTheme = useUIStore((s) => s.setTheme);
  const theme = useUIStore((s) => s.theme);

  // theme is read from the UI store; no debug logging in production

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

      {/* 🌙 Dark mode toggle */}
      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="w-8 h-8 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? (
          // ☀️ Sun icon
          <span className="text-sm">☀️</span>
        ) : (
          // 🌙 Moon icon
          <span className="text-sm">🌙</span>
        )}
      </button>
    </header>
  );
}