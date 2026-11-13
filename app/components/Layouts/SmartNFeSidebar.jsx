'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartBar,
  faFileInvoice,
  faFileImport,
  faClipboardCheck,
  faGear,
  faChevronLeft,
  faChevronRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useAppContext } from '@/context/AppContext';

const menuItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: faChartBar,
  },
  {
    label: 'Documentos',
    href: '/documentos',
    icon: faFileInvoice,
  },
  {
    label: 'Importar',
    href: '/documentos/importar',
    icon: faFileImport,
  },
  {
    label: 'Notas Preparadas',
    href: '/notas-preparadas',
    icon: faClipboardCheck,
  },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: faGear,
  },
];

function NavItem({ item, collapsed, pathname, onClick }) {
  const isCurrent = pathname === item.href;
  const isNestedDocument =
    item.href === '/documentos' &&
    pathname.startsWith('/documentos/') &&
    pathname !== '/documentos/importar';
  const isActive = isCurrent || isNestedDocument;

  return (
    <li>
      <Link
        href={item.href}
        title={collapsed ? item.label : ''}
        onClick={onClick}
        className={`
          flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150
          ${isActive
            ? 'bg-blue-700 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <FontAwesomeIcon icon={item.icon} className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );
}

export default function SmartNFeSidebar({
  collapsed: propCollapsed,
  onToggle: propOnToggle,
  mobileOpen: propMobileOpen,
  onMobileClose: propOnMobileClose,
} = {}) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const appContext = useAppContext();

  const collapsed = propCollapsed !== undefined ? propCollapsed : appContext?.sidebarCollapsed ?? false;
  const onToggle = propOnToggle || appContext?.toggleSidebar;
  const mobileOpen = propMobileOpen !== undefined ? propMobileOpen : appContext?.mobileDrawerOpen ?? false;
  const onMobileClose = propOnMobileClose || appContext?.closeMobileDrawer;

  // Fecha o drawer móvel ao pressionar Escape e previne propagação de eventos
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (onMobileClose) {
          onMobileClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  // Bloqueio do scroll do body enquanto o drawer móvel estiver ativo
  useEffect(() => {
    if (!mobileOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  // Fecha o drawer móvel automaticamente na navegação de rotas (apenas se a rota realmente mudou)
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (mobileOpen && onMobileClose) {
        onMobileClose();
      }
    }
  }, [pathname, mobileOpen, onMobileClose]);

  return (
    <>
      {/* Desktop sidebar: visível acima de 1024px (lg) */}
      <aside
        className={`
          hidden lg:flex flex-col bg-slate-800 text-white transition-all duration-200 flex-shrink-0 select-none
          ${collapsed ? 'w-14' : 'w-60'}
        `}
        aria-label="Menu principal"
        data-testid="desktop-sidebar"
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-slate-700 h-12 ${collapsed ? 'justify-center px-2' : 'px-4 gap-2'}`}>
          <div className="flex items-center justify-center w-7 h-7 bg-blue-600 rounded-md flex-shrink-0">
            <FontAwesomeIcon icon={faFileInvoice} className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-base tracking-tight text-white">SmartNFe</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-1">
            {menuItems.map(item => (
              <NavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                pathname={pathname}
              />
            ))}
          </ul>
        </nav>

        {/* Toggle button */}
        <div className="border-t border-slate-700 p-2">
          <button
            type="button"
            onClick={onToggle}
            title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            data-testid="sidebar-toggle"
            className="w-full flex items-center justify-center py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <FontAwesomeIcon
              icon={collapsed ? faChevronRight : faChevronLeft}
              className="w-3 h-3"
            />
            {!collapsed && <span className="ml-2 text-xs">Recolher</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer: visível em telas <= 1024px quando mobileOpen === true */}
      {mobileOpen && (
        <div className="lg:hidden" data-testid="mobile-drawer-root">
          {/* Backdrop (z-50 para sobrepor e escurecer ScreenTourTip z-40) */}
          <div
            className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs transition-opacity duration-300"
            onClick={onMobileClose}
            aria-hidden="true"
            data-testid="sidebar-backdrop"
          />

          {/* Slide-over aside container */}
          <aside
            id="mobile-sidebar-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu móvel"
            data-testid="mobile-sidebar-drawer"
            className="fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-slate-800 text-white shadow-2xl flex flex-col select-none transition-transform duration-300 ease-in-out"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700 h-12 px-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 bg-blue-600 rounded-md flex-shrink-0">
                  <FontAwesomeIcon icon={faFileInvoice} className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-base tracking-tight text-white">SmartNFe</span>
              </div>
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Fechar menu lateral"
                title="Fechar menu lateral"
                data-testid="sidebar-close-button"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-2">
              <ul className="space-y-1">
                {menuItems.map(item => (
                  <NavItem
                    key={`mobile-${item.href}`}
                    item={item}
                    collapsed={false}
                    pathname={pathname}
                    onClick={onMobileClose}
                  />
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
