// src/components/ThemeToggle.tsx
'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <h2 className="mb-3 text-lg font-semibold text-zinc-900">
        Appearance
      </h2>
      <p className="mb-4 text-sm text-zinc-600">
        Choose your preferred color scheme
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => {
            if (theme === 'dark') toggleTheme();
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-4 transition-colors ${
            theme === 'light'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span className="font-medium">Light</span>
        </button>

        <button
          onClick={() => {
            if (theme === 'light') toggleTheme();
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-4 transition-colors ${
            theme === 'dark'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
          <span className="font-medium">Dark</span>
        </button>
      </div>
    </div>
  );
}
