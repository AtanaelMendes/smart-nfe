# Handoff Report — Explorer 1 (Milestone 2: AppContext & AppLayout)

**Author**: `m2_explorer_1` (teamwork_explorer)  
**Date**: 2026-11-13  
**Working Directory**: `c:\www\smart-nfe`  
**State Folder**: `c:\www\smart-nfe\.agents\teamwork\m2_explorer_1\`  
**Target Milestone**: Milestone 2 — Left Drawer & Responsive Layout (R1)  
**Type**: Hard Handoff  

---

## 1. Observation

1. **`app/components/Layouts/AppLayout.jsx` (lines 9-18)**:
   ```javascript
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
   ```
   - Direct observation: `sidebarCollapsed` is instantiated as local component state using `useState(false)`.
   - Direct observation: Every Next.js page route (`/dashboard/page.jsx`, `/documentos/page.jsx`, `/documentos/importar/page.jsx`, `/notas-preparadas/page.jsx`, `/configuracoes/page.jsx`, `/documentos/[id]/conferencia/page.jsx`, `/documentos/[id]/divisao/page.jsx`, `/documentos/[id]/validacao/page.jsx`) wraps its body in its own `<AppLayout>`.
   - Direct observation: Navigating between any two routes unmounts the current `<AppLayout>` and mounts a fresh one, immediately discarding any previous collapse state.
   - Direct observation: No reads or writes to `localStorage` (`smartnfe_sidebar_collapsed`) exist.
   - Direct observation: No state variable or prop exists for `mobileDrawerOpen`.

2. **`app/context/AppContext.jsx` (lines 15-58, 122-153)**:
   ```javascript
   export const AppContext = createContext();

   export function AppProvider({ children }) {
     const [loading, setLoading] = useState(false);
     const [toasts, setToasts] = useState([]);
     
     // useSyncExternalStore oficial do React para hidratação segura sem cascading renders
     const mounted = useSyncExternalStore(
       emptySubscribe,
       () => true,
       () => false
     );

     const [darkMode, setDarkMode] = useState(false);
     const [settings, setSettings] = useState(DEFAULT_SETTINGS);
   ```
   - Direct observation: `<AppProvider>` is wrapped at the root layout level (`app/layout.jsx`), meaning its React state is preserved across client-side page transitions in Next.js App Router.
   - Direct observation: `mounted` is computed using `useSyncExternalStore(emptySubscribe, () => true, () => false)`, returning `false` during SSR and `true` upon client mount.
   - Direct observation: `darkMode` and `settings` use post-mount `useEffect` with `localStorage` reads and deferred application (`setTimeout(..., 0)`), plus a guarded persistence effect `if (!mounted) return;` before saving to `localStorage`.
   - Direct observation: `AppContext` exports do not currently include `sidebarCollapsed`, `mobileDrawerOpen`, `isLgScreen`, `toggleSidebar`, or `toggleMobileDrawer`.

3. **`PROJECT.md` Interface Contract (lines 75-79)**:
   - Direct observation: Context exports required: `{ sidebarCollapsed, setSidebarCollapsed, toggleSidebar, mobileDrawerOpen, setMobileDrawerOpen, toggleMobileDrawer, isLgScreen }`.
   - Direct observation: LocalStorage key: `smartnfe_sidebar_collapsed` (`'true'` / `'false'`).
   - Direct observation: Hydration guarantee: initial render uses default state based on window width check post-mount, avoiding SSR/client mismatch.

4. **`ORIGINAL_REQUEST.md` (lines 17-19, 37-41)**:
   - Direct observation: "O drawer deve permanecer expandido por padrão acima de 1024px quando não houver preferência salva e recolhido por padrão em LG ou inferior (até 1024px)".
   - Direct observation: "persistir a escolha do usuário em `smartnfe_sidebar_collapsed` durante navegação e recarga sem hydration mismatch".

---

## 2. Logic Chain

1. From Observation 1, each route page renders `<AppLayout>` independently. When navigating between routes, React unmounts the old page's `<AppLayout>` and mounts the new page's `<AppLayout>`.
2. Because `sidebarCollapsed` was kept in local `useState(false)` in `AppLayout.jsx`, every route change destroys the state, resetting `sidebarCollapsed` to `false`.
3. From Observation 2, `<AppProvider>` in `app/layout.jsx` wraps all routes and never unmounts during client-side navigation.
4. Therefore, elevating `sidebarCollapsed`, `mobileDrawerOpen`, and `isLgScreen` into `AppContext.jsx` guarantees that state is preserved across all route transitions without any reset.
5. In React 19, synchronous reads of `localStorage` or `window.innerWidth` during initial render cause hydration mismatches because the server renders without `window`/`localStorage`.
6. To avoid hydration mismatch completely:
   - Initial state for SSR and client initial hydration MUST be identical (`sidebarCollapsed = false`, `mobileDrawerOpen = false`, `isLgScreen = true`).
   - Reading `localStorage.getItem('smartnfe_sidebar_collapsed')` and checking `window.innerWidth > 1024` MUST occur exclusively inside a post-mount `useEffect`.
   - If a saved preference exists (`'true'` or `'false'`), it is applied. If no preference exists (`null`), the viewport rule is applied: `window.innerWidth <= 1024` sets `sidebarCollapsed = true`, while `window.innerWidth > 1024` leaves `sidebarCollapsed = false`.
7. Saving to `localStorage` must be guarded by a ref (`sidebarHydratedRef.current`) so that initial default state is never written before the stored preference is loaded.
8. By removing `useState(false)` from `AppLayout.jsx` and having it consume `useAppContext()`, `AppLayout.jsx` becomes a clean coordinator, delegating `sidebarCollapsed` to `SmartNFeSidebar` and `toggleMobileDrawer` to `SmartNFeHeader`.

---

## 3. Caveats

1. **Detailed Markup of Sidebar & Header**: Explorer 1 investigated `AppContext.jsx` and `AppLayout.jsx`. The internal DOM details, backdrop markup, and close button within `SmartNFeSidebar.jsx` and `SmartNFeHeader.jsx` are investigated in depth by peer `m2_explorer_2`.
2. **Coexistence with ScreenTourTip & Table Editing**: ScreenTourTip and inline table cell editing coexistence are investigated in depth by peer `m2_explorer_3`.
3. **No Code Implementation**: In accordance with the Explorer archetype rules, no source files outside the state folder were modified.

---

## 4. Conclusion

1. **Elevation to `AppContext`**: `sidebarCollapsed`, `mobileDrawerOpen`, `isLgScreen`, `setSidebarCollapsed`, `toggleSidebar`, `setMobileDrawerOpen`, `toggleMobileDrawer`, and `closeMobileDrawer` must be elevated to `AppContext.jsx` and exported in the context value.
2. **Persistence & Hydration**:
   - Initial SSR and client render: `sidebarCollapsed: false`, `mobileDrawerOpen: false`, `isLgScreen: true`.
   - Post-mount `useEffect`: Read `smartnfe_sidebar_collapsed` from `localStorage`. If `null`, evaluate `window.innerWidth <= 1024` (collapse if $\le 1024\text{px}$, expand if $> 1024\text{px}$).
   - Guarded sync effect: Only write to `localStorage` after post-mount hydration completes.
   - Resize listener: Updates `isLgScreen` and automatically closes `mobileDrawerOpen` when expanding above 1024px.
3. **`AppLayout.jsx` Refactor**:
   - Remove local `useState(false)`.
   - Call `useAppContext()`.
   - Pass `collapsed={sidebarCollapsed}`, `onToggle={toggleSidebar}`, `mobileOpen={mobileDrawerOpen}`, `onMobileClose={() => setMobileDrawerOpen(false)}` to `SmartNFeSidebar`.
   - Pass `onMenuToggle={toggleMobileDrawer}` to `SmartNFeHeader`.

---

## 5. Verification Method

To independently verify this design and findings:

1. **Inspect Code Files**:
   - Examine `c:\www\smart-nfe\app\context\AppContext.jsx` lines 15-58.
   - Examine `c:\www\smart-nfe\app\components\Layouts\AppLayout.jsx` lines 9-18.
   - Verify that `<AppLayout>` is rendered inside individual route pages (`app/dashboard/page.jsx`, `app/documentos/page.jsx`).
2. **Verify Proposed Implementation**:
   - Inspect full technical specification and proposed code in `c:\www\smart-nfe\.agents\teamwork\m2_explorer_1\report.md`.
3. **Future Test Execution Command**:
   - After worker implements the changes:
     ```bash
     cd c:\www\smart-nfe
     node --no-warnings --test tests/unit/leftDrawer.test.mjs
     npm run build
     ```
   - Invalidation conditions: Any React 19 hydration warning in console (`Text content did not match` or `Hydration failed`), failure to persist collapse across route navigation, or reset on browser reload.
