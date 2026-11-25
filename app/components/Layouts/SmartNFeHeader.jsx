'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faChevronRight, faBars, faLightbulb, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { useAppContext } from '@/context/AppContext';
import { getScreenTourByPath } from '@/config/screenTours';
import Button from '@/components/buttons/Button';
import PillsBadge from '@/components/buttons/PillsBadge';

export default function SmartNFeHeader({ breadcrumbs = [], onMenuToggle, onOpenTour }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    darkMode,
    toggleDarkMode,
    mounted,
    openTour,
    mobileDrawerOpen,
    toggleMobileDrawer,
  } = useAppContext();

  const isDark = mounted ? Boolean(darkMode) : false;
  const handleMenuToggle = onMenuToggle || toggleMobileDrawer;
  const isMobileOpen = Boolean(mobileDrawerOpen);

  const activeTour = getScreenTourByPath(pathname);
  const hasTour = Boolean(onOpenTour || activeTour);

  const handleOpenTour = () => {
    if (!hasTour) return;
    const tourKey = activeTour?.routeKey || null;
    if (onOpenTour) {
      onOpenTour(tourKey);
    } else if (openTour) {
      openTour(tourKey);
    } else if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('smartnfe:open-screen-tour', {
            detail: { routeKey: tourKey },
          })
        );
      } catch {
        // ignore
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Mesmo em falha de rede o usuário deve sair da aplicação.
    }
    router.replace('/login');
    router.refresh();
  };

  const tourTitle = activeTour?.title || activeTour?.titulo;
  const buttonTitle = hasTour
    ? (tourTitle ? `Guia explicativo: ${tourTitle}` : 'Guia explicativo da tela')
    : 'Nenhum guia explicativo disponível para esta tela';
  const ariaLabel = hasTour
    ? (tourTitle ? `Abrir guia explicativo: ${tourTitle}` : 'Abrir guia explicativo da tela')
    : 'Nenhum guia explicativo disponível para esta tela';

  return (
    <header className="h-12 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center px-4 gap-3 flex-shrink-0 transition-colors">
      {/* Mobile menu toggle (visível em telas <= 1024px) */}
      {handleMenuToggle && (
        <Button
          type="button"
          onClick={handleMenuToggle}
          className="lg:hidden p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer"
          title={isMobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
          aria-label={isMobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
          aria-expanded={isMobileOpen}
          aria-controls="mobile-sidebar-drawer"
          data-testid="header-mobile-toggle"
        >
          <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
        </Button>
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
        <PillsBadge type="default" small className="hidden sm:inline-flex" title="Ambiente de demonstração">
          Modo Demo
        </PillsBadge>

        {/* Guia explicativo da tela */}
        <Button
          type="button"
          id="tour-help-button"
          data-testid="header-tour-button"
          onClick={handleOpenTour}
          disabled={!hasTour}
          title={buttonTitle}
          aria-label={ariaLabel}
          aria-disabled={!hasTour}
          className={`p-1.5 rounded-lg transition-colors ${
            hasTour
              ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer'
              : 'text-gray-300 dark:text-slate-600 cursor-not-allowed opacity-50'
          }`}
        >
          <FontAwesomeIcon icon={faLightbulb} className="w-4 h-4" />
        </Button>

        {/* Logout */}
        <Button
          type="button"
          data-testid="header-logout"
          onClick={handleLogout}
          title="Sair"
          aria-label="Sair da conta"
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-colors"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
        </Button>

        {/* Dark mode toggle */}
        <Button
          type="button"
          onClick={toggleDarkMode}
          title={isDark ? 'Modo claro' : 'Modo escuro'}
          aria-label={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          suppressHydrationWarning
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
