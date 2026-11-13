'use client';
import { useAppContext } from '@/context/AppContext';
import SmartNFeSidebar from './SmartNFeSidebar';
import SmartNFeHeader from './SmartNFeHeader';
import ToastContainer from './ToastContainer';
import DemoBadge from './DemoBadge';
import ScreenTourTip from '../feedback/ScreenTourTip';

export default function AppLayout({ children, breadcrumbs = [] }) {
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileDrawerOpen,
    toggleMobileDrawer,
    closeMobileDrawer,
  } = useAppContext();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 overflow-hidden">
      <SmartNFeSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={closeMobileDrawer}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <SmartNFeHeader
          breadcrumbs={breadcrumbs}
          onMenuToggle={toggleMobileDrawer}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      <ScreenTourTip />
      <ToastContainer />
      <DemoBadge />
    </div>
  );
}
