import React from 'react';
import { useTheme } from './ThemeProvider';

const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-pressed={isDark}
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-icon theme-toggle-sun" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </span>
        <span className="theme-toggle-icon theme-toggle-moon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.8 15.7A8.8 8.8 0 0 1 8.3 3.2 9.3 9.3 0 1 0 20.8 15.7Z" />
          </svg>
        </span>
      </span>
    </button>
  );
};

export default ThemeToggle;
