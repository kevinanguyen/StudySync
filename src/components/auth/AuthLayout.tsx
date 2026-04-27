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
        {/* Theme-switched monkey wordmark hero. Black background of the asset
            is part of the intentional sticker/badge aesthetic. */}
        <div className="flex items-center justify-center mb-8">
          <img
            src={theme === 'dark' ? '/brand/monkey-wordmark-dark.png' : '/brand/monkey-wordmark-light.png'}
            alt="StudySync"
            className="w-72 max-w-full rounded-xl shadow-sm"
          />
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
