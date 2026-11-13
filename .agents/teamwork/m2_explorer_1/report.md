# Investigation Report — AppContext & AppLayout Architecture (Milestone 2 / R1)

**Author**: `m2_explorer_1` (teamwork_explorer)  
**Date**: 2026-11-13  
**Target Milestone**: Milestone 2 — Left Drawer & Responsive Layout (R1)  
**Working Directory**: `c:\www\smart-nfe`  
**State Folder**: `c:\www\smart-nfe\.agents\teamwork\m2_explorer_1\`  

---

## Executive Summary

This report delivers a definitive architectural investigation and technical design for elevating `sidebarCollapsed` and `mobileDrawerOpen` to `AppContext.jsx`, establishing safe post-mount hydration without React 19 / Next.js 16 mismatches, and restructuring `AppLayout.jsx` to seamlessly orchestrate desktop sidebar persistence and responsive mobile overlay navigation.

Key findings:
1. **Root Cause of Reset**: `sidebarCollapsed` was held in local `useState(false)` within `AppLayout.jsx`. Because every route page (`/dashboard`, `/documentos`, `/documentos/importar`, `/notas-preparadas`, etc.) mounts its own `<AppLayout>`, every route change unmounts the previous layout and destroys its state, resetting the drawer.
2. **Hydration Guarantee**: React 19 strictly rejects any mismatch between SSR HTML and the client's initial virtual DOM. Reading `localStorage` synchronously during `useState` causes fatal hydration errors. The solution is identical SSR/client initial render (`sidebarCollapsed = false`, `mobileDrawerOpen = false`) followed by post-mount synchronization inside a guarded `useEffect` that reads `localStorage.getItem('smartnfe_sidebar_collapsed')` and evaluates viewport width ($> 1024\text{px}$ expanded, $\le 1024\text{px}$ collapsed).
3. **State Elevation**: `AppContext.jsx` is located in `RootLayout` (`app/layout.jsx`), persisting across all client-side navigation. Elevating `sidebarCollapsed`, `mobileDrawerOpen`, and `isLgScreen` with helpers (`setSidebarCollapsed`, `toggleSidebar`, `setMobileDrawerOpen`, `toggleMobileDrawer`, `closeMobileDrawer`) satisfies the interface contract in `PROJECT.md` line 75-79.
4. **Layout Integration**: `AppLayout.jsx` becomes a clean coordinator consuming `useAppContext()`, passing `collapsed` and `onToggle` to `SmartNFeSidebar`, and hooking `toggleMobileDrawer` to `SmartNFeHeader`'s accessible mobile menu toggle button.

---

## 1. Investigation of Existing Implementation

### 1.1 `app/context/AppContext.jsx`

Direct inspection of `app/context/AppContext.jsx` (lines 1-153):
- **Exports**:
  - `export const DEFAULT_SETTINGS`: Object defining `tableDensity`, `rowsPerPage`, `demoValueLimit`, `showOriginalValues`, `autoSave`.
  - `export const AppContext = createContext();`
  - `export function AppProvider({ children })`: Provider component.
  - `export function useAppContext()`: Consumer hook throwing an error if used outside `AppProvider`.
- **Existing State**:
  - `loading`: boolean (`useState(false)`).
  - `toasts`: array of toast items (`useState([])`).
  - `mounted`: boolean via `useSyncExternalStore(emptySubscribe, () => true, () => false)`.
  - `darkMode`: boolean (`useState(false)`).
  - `settings`: object (`useState(DEFAULT_SETTINGS)`).
  - `tourSignal` & `tourTargetKey`: number/string for guided screen tours.
- **Existing Persistence Patterns**:
  - `darkMode` and `settings` are loaded inside `useEffect(() => { ... }, [])` using `setTimeout(..., 0)` to prevent cascading render warnings during hydration.
  - Guarded write effect:
    ```javascript
    useEffect(() => {
      if (!mounted) return;
      try {
        localStorage.setItem('smartnfe_darkMode', darkMode.toString());
        document.documentElement.classList.toggle('dark', darkMode);
      } catch (e) {}
    }, [darkMode, mounted]);
    ```
    This guard (`if (!mounted) return;`) is critical to prevent writing initial state before the load effect reads the saved preference.
- **Context Memoization**:
  The context `value` is memoized with `useMemo`. Any newly exposed state or functions must be added to both the `value` object and its dependency array.

### 1.2 `app/components/Layouts/AppLayout.jsx`

Direct inspection of `app/components/Layouts/AppLayout.jsx` (lines 1-28):
```javascript
'use client';
import { useState } from 'react';
import SmartNFeSidebar from './SmartNFeSidebar';
import SmartNFeHeader from './SmartNFeHeader';
import ToastContainer from './ToastContainer';
import DemoBadge from './DemoBadge';
import ScreenTourTip from '../feedback/ScreenTourTip';

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

      <ScreenTourTip />
      <ToastContainer />
      <DemoBadge />
    </div>
  );
}
```

Deficiencies identified:
1. **Local State Reset**: `sidebarCollapsed` is instantiated in `AppLayout`. Navigating between routes unmounts `AppLayout` and resets state to `false`.
2. **Missing LocalStorage Sync**: No `localStorage` reads or writes exist for `smartnfe_sidebar_collapsed`.
3. **No Mobile Drawer State**: `mobileDrawerOpen` does not exist. `onMenuToggle` in `SmartNFeHeader` toggled `sidebarCollapsed`, which simply shrank the sidebar from 240px to 56px on mobile rather than opening an overlay drawer.
4. **Desktop/Mobile Coupling**: On viewports $\le 1024\text{px}$, the sidebar remained in normal flow rather than rendering as a slide-over overlay with backdrop.

---

## 2. Elevating Sidebar & Mobile Drawer State into `AppContext`

### 2.1 Interface Contract (`PROJECT.md` lines 75-79)

The contract mandates the following context exports:
```typescript
interface AppContextValue {
  // Existing exports
  loading: boolean;
  setLoading: (loading: boolean) => void;
  toasts: Toast[];
  addToast: (message: string, type?: string, duration?: number) => void;
  removeToast: (id: string | number) => void;
  toast: ToastHelpers;
  darkMode: boolean;
  toggleDarkMode: () => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  DEFAULT_SETTINGS: AppSettings;
  mounted: boolean;
  tourSignal: number;
  tourTargetKey: string | null;
  openTour: (targetKey?: string | null) => void;

  // Milestone 2 elevated exports
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  toggleMobileDrawer: (explicitState?: boolean) => void;
  closeMobileDrawer: () => void;
  isLgScreen: boolean;
}
```

### 2.2 Storage Key & Values
- **Key**: `'smartnfe_sidebar_collapsed'`
- **Values**: `'true'` | `'false'`
- **Behavior**:
  - When user toggles desktop sidebar to collapsed: `localStorage.setItem('smartnfe_sidebar_collapsed', 'true')`.
  - When user toggles desktop sidebar to expanded: `localStorage.setItem('smartnfe_sidebar_collapsed', 'false')`.
  - On page reload: loaded into `sidebarCollapsed`.

---

## 3. Safe Hydration Mechanism in React 19 / Next.js 16

### 3.1 The React 19 Hydration Challenge

In React 19, hydration strictly verifies that the DOM rendered on the server matches the client's initial render. Any discrepancy results in:
```
Unhandled Runtime Error: Hydration failed because the initial UI does not match what was rendered on the server.
```

If we attempted:
```javascript
// ANTIPATTERN — CAUSES HYDRATION MISMATCH
const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('smartnfe_sidebar_collapsed') === 'true';
  }
  return false;
});
```
- Server renders HTML with `sidebarCollapsed = false` (e.g. `w-60`).
- Client with saved preference runs `useState` initializer and gets `true` (e.g. `w-14`).
- Hydration immediately crashes.

### 3.2 The Safe Hydration Architecture

To eliminate mismatch while ensuring fast, flicker-free rendering:

1. **Deterministic Initial State (SSR & Hydration Render)**:
   - `sidebarCollapsed = false` (default expanded).
   - `mobileDrawerOpen = false` (mobile drawer is always closed initially).
   - `isLgScreen = true` (default desktop layout matching `sidebarCollapsed = false`).
   - Server and client initial renders are 100% identical.

2. **Guarded Post-Mount Initialization Effect**:
   Inside a `useEffect` that runs exclusively in the browser after mount:
   ```javascript
   const sidebarHydratedRef = useRef(false);

   useEffect(() => {
     let isLg = true;
     if (typeof window !== 'undefined') {
       isLg = window.innerWidth > 1024;
       setIsLgScreen(isLg);
     }

     let savedSidebar = null;
     try {
       savedSidebar = localStorage.getItem('smartnfe_sidebar_collapsed');
     } catch (e) {
       // Storage unavailable in restricted sandboxes
     }

     // Resolution logic:
     // 1. If explicit user preference saved, respect it regardless of screen size
     // 2. If no preference saved:
     //    - Viewport > 1024px: expanded (false)
     //    - Viewport <= 1024px (LG or lower): collapsed (true)
     if (savedSidebar !== null) {
       setSidebarCollapsed(savedSidebar === 'true');
     } else {
       setSidebarCollapsed(!isLg);
     }

     // Mark hydrated so subsequent updates are persisted to localStorage
     sidebarHydratedRef.current = true;
   }, []);
   ```

3. **Guarded LocalStorage Sync Effect**:
   To prevent writing default values into `localStorage` before the read completes:
   ```javascript
   useEffect(() => {
     if (!sidebarHydratedRef.current) return;
     try {
       localStorage.setItem('smartnfe_sidebar_collapsed', String(sidebarCollapsed));
     } catch (e) {}
   }, [sidebarCollapsed]);
   ```

4. **Dynamic Resize Observer / Window Listener**:
   ```javascript
   useEffect(() => {
     const handleResize = () => {
       const isLg = window.innerWidth > 1024;
       setIsLgScreen(isLg);
       // When resizing to desktop (> 1024px), automatically dismiss mobile overlay drawer
       if (isLg) {
         setMobileDrawerOpen(false);
       }
     };

     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
   }, []);
   ```

5. **CSS Breakpoint Coordination (Zero Layout Shift)**:
   Tailwind CSS responsive classes ensure instantaneous styling even before JS executes:
   - Desktop sidebar (`SmartNFeSidebar`): `hidden lg:flex`.
     On screens $\le 1024\text{px}$, the desktop sidebar is hidden by browser CSS immediately, preventing any layout flicker.
   - Mobile toggle button (`SmartNFeHeader`): `lg:hidden`.
     Visible on all screens $\le 1024\text{px}$ (replacing buggy `md:hidden` which hid it between 768px and 1024px).
   - Mobile drawer overlay: `lg:hidden`.
     Never displayed on desktop viewports.

---

## 4. Architectural Design for `AppLayout.jsx`

### 4.1 Restructured Component Structure

`AppLayout.jsx` delegates state to `AppContext`:

```javascript
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
    setMobileDrawerOpen,
  } = useAppContext();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 overflow-hidden">
      {/* Desktop & Mobile Sidebar Navigation */}
      <SmartNFeSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={() => setMobileDrawerOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <SmartNFeHeader
          breadcrumbs={breadcrumbs}
          onMenuToggle={toggleMobileDrawer}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Overlays & Global Feedback */}
      <ScreenTourTip />
      <ToastContainer />
      <DemoBadge />
    </div>
  );
}
```

### 4.2 Clean Responsibility Separation

| Component | Responsibility | Props / State |
|---|---|---|
| `AppContext.jsx` | Single source of truth for UI state, `localStorage` persistence, hydration safety, viewport resize listener | `sidebarCollapsed`, `mobileDrawerOpen`, `isLgScreen`, setters & toggles |
| `AppLayout.jsx` | High-level shell layout connecting context to sidebar, header, and route children | Consumes `useAppContext`, passes handlers to Header and Sidebar |
| `SmartNFeSidebar.jsx` | Renders desktop docked sidebar (`hidden lg:flex`) and mobile slide-over drawer with backdrop (`lg:hidden`) | `collapsed`, `onToggle`, `mobileOpen`, `onMobileClose` |
| `SmartNFeHeader.jsx` | Header bar with accessible mobile menu toggle button (`lg:hidden`), breadcrumbs, theme toggle, tour button | `breadcrumbs`, `onMenuToggle` |

---

## 5. Concrete Code Implementation Proposal

### 5.1 Updated `app/context/AppContext.jsx`

```javascript
// Excerpt of additions to app/context/AppContext.jsx
export function AppProvider({ children }) {
  // Existing state: loading, toasts, mounted, darkMode, settings, tourSignal, tourTargetKey...
  
  // Milestone 2: Left Drawer & Responsive Layout State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isLgScreen, setIsLgScreen] = useState(true);
  const sidebarHydratedRef = useRef(false);

  // Post-mount synchronization for sidebar and viewport
  useEffect(() => {
    let isLg = true;
    if (typeof window !== 'undefined') {
      isLg = window.innerWidth > 1024;
      setIsLgScreen(isLg);
    }

    let saved = null;
    try {
      saved = localStorage.getItem('smartnfe_sidebar_collapsed');
    } catch (e) {}

    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    } else {
      // Default: expanded (> 1024px), collapsed (<= 1024px)
      setSidebarCollapsed(!isLg);
    }

    sidebarHydratedRef.current = true;
  }, []);

  // Persist sidebarCollapsed to localStorage after initial mount
  useEffect(() => {
    if (!sidebarHydratedRef.current) return;
    try {
      localStorage.setItem('smartnfe_sidebar_collapsed', String(sidebarCollapsed));
    } catch (e) {}
  }, [sidebarCollapsed]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      const isLg = window.innerWidth > 1024;
      setIsLgScreen(isLg);
      if (isLg) {
        setMobileDrawerOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const toggleMobileDrawer = useCallback((explicitState) => {
    setMobileDrawerOpen(prev => (typeof explicitState === 'boolean' ? explicitState : !prev));
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  // Update value useMemo with new states & helpers
  const value = useMemo(() => ({
    // Existing context values...
    loading,
    setLoading,
    toasts,
    addToast,
    removeToast,
    toast,
    darkMode,
    toggleDarkMode,
    settings,
    updateSettings,
    DEFAULT_SETTINGS,
    mounted,
    tourSignal,
    tourTargetKey,
    openTour,
    // Milestone 2 exports
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    toggleMobileDrawer,
    closeMobileDrawer,
    isLgScreen,
  }), [
    loading, toasts, addToast, removeToast, toast, darkMode, toggleDarkMode, settings,
    updateSettings, mounted, tourSignal, tourTargetKey, openTour,
    sidebarCollapsed, toggleSidebar, mobileDrawerOpen, toggleMobileDrawer, closeMobileDrawer, isLgScreen
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
```

---

## 6. Edge Cases & Resilience Analysis

1. **Private Browsing / Quota Exceeded / Security Sandboxes**:
   All `localStorage` calls are wrapped in `try { ... } catch (e) { ... }`. If `localStorage` throws, state remains functional in memory.
2. **Rapid Window Resizing**:
   The resize listener sets `isLgScreen` and automatically dismisses `mobileDrawerOpen` when expanding past 1024px, preventing orphaned mobile overlay drawers.
3. **Repeated Route Changes**:
   Because `AppProvider` resides in RootLayout (`app/layout.jsx`), it does not unmount during client-side route transitions. Navigation across `/dashboard`, `/documentos`, `/documentos/importar`, etc. retains exact sidebar collapse state in memory with zero re-reads or DOM flashes.
4. **Hard Reload (F5)**:
   SSR renders expanded desktop view (`collapsed = false`), matches initial hydration, and smoothly transitions to the saved preference (`w-14`) via Tailwind CSS `transition-all duration-200`.
5. **Escape Key & Modal Hierarchy**:
   `mobileDrawerOpen` handles `Escape` with `event.preventDefault()`, which complies with `ScreenTourTip.jsx` lines 148-177 (`if (event.defaultPrevented) return;`). Closing the drawer via Escape never dismisses `ScreenTourTip` or background dialogues.

---

## 7. Recommendations for Worker Implementation

1. Update `app/context/AppContext.jsx` with the exact exports specified in Section 5.1.
2. Update `app/components/Layouts/AppLayout.jsx` to consume `useAppContext()` and remove local `useState(false)`.
3. Ensure `SmartNFeSidebar.jsx` and `SmartNFeHeader.jsx` receive matching props (`mobileOpen`, `onMobileClose`, `onMenuToggle`).
4. Execute unit and integration tests to verify safe hydration and persistence across route changes.
