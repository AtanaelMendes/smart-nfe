'use client';
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
} from '@fortawesome/free-solid-svg-icons';

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

function NavItem({ item, collapsed, pathname }) {
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

export default function SmartNFeSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();

  return (
    <aside
      className={`
        flex flex-col bg-slate-800 text-white transition-all duration-200 flex-shrink-0 select-none
        ${collapsed ? 'w-14' : 'w-60'}
      `}
      aria-label="Menu principal"
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
          onClick={onToggle}
          title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          className="w-full flex items-center justify-center py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <FontAwesomeIcon
            icon={collapsed ? faChevronRight : faChevronLeft}
            className="w-3 h-3"
          />
          {!collapsed && <span className="ml-2 text-xs">Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
