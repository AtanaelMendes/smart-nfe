'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faCircleUser,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';

import Button from '@/components/buttons/Button';
import { cn } from '@/assets/utils';

export default function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    let active = true;

    fetch('/api/auth/session')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.authenticated) setUser(data.user);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Mesmo em falha de rede o usuário deve sair da aplicação.
    }
    router.replace('/login');
    router.refresh();
  };

  const displayName = user?.name || user?.username || 'Usuário';
  const handle = user?.username ? `@${user.username}` : '';

  return (
    <div ref={containerRef} className="relative">
      <Button
        ref={triggerRef}
        type="button"
        buttonType="ghost"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        title="Menu do usuário"
        data-testid="header-user-menu-button"
        className="gap-1.5 rounded-full p-1 pr-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <FontAwesomeIcon icon={faCircleUser} className="h-6 w-6" />
        <span className="hidden max-w-[120px] truncate text-xs font-medium sm:inline">
          {displayName}
        </span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={cn('h-2.5 w-2.5 transition-transform', open && 'rotate-180')}
        />
      </Button>

      {open && (
        <div
          id="user-menu"
          ref={menuRef}
          role="menu"
          aria-label="Menu do usuário"
          data-testid="header-user-menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg animate-fade-in dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-700">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {displayName}
            </p>
            {handle && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{handle}</p>
            )}
          </div>

          <div className="p-1">
            <Button
              type="button"
              role="menuitem"
              buttonType="ghost"
              size="small"
              block
              onClick={handleLogout}
              data-testid="header-user-menu-logout"
              className="justify-start gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
