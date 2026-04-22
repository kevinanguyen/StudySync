import type { ReactNode } from 'react';
import { useUIStore } from '@/store/uiStore';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const theme = useUIStore((s) => s.theme);
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#3B5BDB] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 6C2 6 5 5 8 5C10 5 12 6 12 6V20C12 20 10 19 8 19C5 19 2 20 2 20V6Z" fill="white" fillOpacity="0.9" />
              <path d="M22 6C22 6 19 5 16 5C14 5 12 6 12 6V20C12 20 14 19 16 19C19 19 22 20 22 20V6Z" fill="white" fillOpacity="0.7" />
              <path d="M7 3C8.5 2 10.2 2 12 2C13.8 2 15.5 2 17 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className={`${theme === 'dark' ? 'text-2xl font-bold text-gray-100 tracking-tight' : 'text-2xl font-bold text-gray-800 tracking-tight'}`}>StudySync</span>
        </div>

        <div className={`${theme === 'dark' ? 'rounded-xl shadow-sm p-8 bg-slate-800 border border-slate-700' : 'bg-white rounded-xl shadow-sm border border-gray-200 p-8'}`}>
          <h1 className={`${theme === 'dark' ? 'text-2xl font-bold text-gray-100 mb-1' : 'text-2xl font-bold text-gray-800 mb-1'}`}>{title}</h1>
          {subtitle && <p className={`${theme === 'dark' ? 'text-sm text-gray-300 mb-6' : 'text-sm text-gray-500 mb-6'}`}>{subtitle}</p>}
          {!subtitle && <div className="mb-4" />}
          {children}
        </div>

        {footer && <div className={`${theme === 'dark' ? 'text-center mt-6 text-sm text-gray-400' : 'text-center mt-6 text-sm text-gray-600'}`}>{footer}</div>}
      </div>
    </div>
  );
}
