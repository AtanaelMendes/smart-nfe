'use client';
import { useState } from 'react';
import SmartNFeSidebar from './SmartNFeSidebar';
import SmartNFeHeader from './SmartNFeHeader';
import ToastContainer from './ToastContainer';
import DemoBadge from './DemoBadge';

export default function AppLayout({ children, breadcrumbs = [] }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 overflow-hidden">
      <SmartNFeSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <SmartNFeHeader breadcrumbs={breadcrumbs} onMenuToggle={() => setSidebarCollapsed(prev => !prev)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      <ToastContainer />
      <DemoBadge />
    </div>
  );
}
