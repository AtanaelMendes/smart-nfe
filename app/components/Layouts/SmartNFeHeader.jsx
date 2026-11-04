'use client';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faChevronRight, faBars } from '@fortawesome/free-solid-svg-icons';
import { useAppContext } from '@/context/AppContext';

export default function SmartNFeHeader({ breadcrumbs = [], onMenuToggle }) {
  const { darkMode, toggleDarkMode } = useAppContext();

  return (
    <header className="h-12 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center px-4 gap-3 flex-shrink-0 transition-colors">
      {/* Mobile menu toggle */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
          title="Menu"
          aria-label="Abrir menu"
        >
          <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
        </button>
      )}

      {/* Breadcrumbs */}
      <nav aria-label="Navegação estrutural" className="flex-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 min-w-0">
        <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white flex-shrink-0 font-medium transition-colors">
          SmartNFe
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            <FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5 flex-shrink-0 text-gray-400 dark:text-slate-600" />
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-gray-900 dark:hover:text-white truncate transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-white font-medium truncate">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right side actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Demo mode label */}
        <span className="hidden sm:inline-flex items-center text-xs text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded px-2 py-0.5 font-medium">
          Modo Demo
        </span>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
          aria-label={darkMode ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
