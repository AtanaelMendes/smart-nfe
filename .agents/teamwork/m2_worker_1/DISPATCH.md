# Dispatch for Worker 1 — Milestone 2

## Mission
Implement Milestone 2: Left Drawer & Responsive Layout in `c:\www\smart-nfe` on branch `feature/preparacoes-unificadas`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Code Ownership (Exclusive)
- `app/context/AppContext.jsx`
- `app/components/Layouts/AppLayout.jsx`
- `app/components/Layouts/SmartNFeSidebar.jsx`
- `app/components/Layouts/SmartNFeHeader.jsx`
- `tests/unit/leftDrawer.test.mjs`

## Implementation Specifications
1. **app/context/AppContext.jsx**:
   - Add `sidebarCollapsed` and `mobileDrawerOpen` state to `AppContext`.
   - Provide helper functions: `toggleSidebar`, `setSidebarCollapsed`, `toggleMobileDrawer`, `setMobileDrawerOpen`, `closeMobileDrawer`.
   - Hydration safety in React 19:
     - Storage key: `smartnfe_sidebar_collapsed`.
     - In SSR / initial render: stable snapshot avoiding hydration mismatch (e.g. using `mounted` check or `useSyncExternalStore` / post-mount `useEffect`).
     - Post-mount: if `localStorage.getItem('smartnfe_sidebar_collapsed')` exists, parse `'true'` -> true, `'false'` -> false. If no stored preference, check `window.innerWidth > 1024 ? false : true`.
     - When `toggleSidebar` or `setSidebarCollapsed` is called, update state and persist to `localStorage.setItem('smartnfe_sidebar_collapsed', String(val))`.
     - `mobileDrawerOpen` defaults to `false`.

2. **app/components/Layouts/AppLayout.jsx**:
   - Remove page-level `useState(false)` for `sidebarCollapsed` that was resetting state on route navigation.
   - Use `useAppContext()` to get `sidebarCollapsed`, `toggleSidebar`, `mobileDrawerOpen`, `closeMobileDrawer`.
   - Pass props cleanly to `SmartNFeSidebar` and `SmartNFeHeader`.

3. **app/components/Layouts/SmartNFeSidebar.jsx**:
   - Desktop: Render standard collapsible aside (`hidden lg:flex`, width transitions, icons + labels).
   - Mobile: For `<= 1024px`, render responsive overlay drawer when `mobileDrawerOpen === true`:
     - Backdrop (`fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-xs`) that closes drawer on click.
     - Slide-over aside container (`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 ...`) with `role="dialog"` and `aria-modal="true"`.
     - Explicit close button with `faXmark` (`aria-label="Fechar menu"`).
     - Escape key listener: on `Escape`, close drawer and call `e.preventDefault()`.
     - Close mobile drawer on link click / navigation.

4. **app/components/Layouts/SmartNFeHeader.jsx**:
   - Ensure mobile hamburger toggle button is visible at `<= 1024px` (`lg:hidden`).
   - Accessible `aria-label="Abrir menu"`, `aria-expanded={mobileDrawerOpen}`, click handler `toggleMobileDrawer`.

5. **tests/unit/leftDrawer.test.mjs**:
   - Write comprehensive unit tests for Left Drawer and responsive layout behaviors using the repository's test runner (e.g. `node --test` or `npm test`).
   - Verify persistence, hydration safety, mobile drawer states, Escape key handling, and role/aria attributes.

6. **Verification**:
   - Run tests: ensure all existing tests (383+) pass without regression, plus new unit tests.
   - Run build (`npm run build` or Next.js build check).
   - Document commands, outputs, and git status in `c:\www\smart-nfe\.agents\teamwork\m2_worker_1\handoff.md`.


## 2026-11-13T13:46:02Z
You are m2_worker_1 (teamwork_worker).
Working directory: c:\www\smart-nfe
Your state folder: c:\www\smart-nfe\.agents\teamwork\m2_worker_1\

MANDATORY FIRST STEP:
Read c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Also read:
- c:\www\smart-nfe\.agents\teamwork\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m2\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\report.md
- c:\www\smart-nfe\.agents\teamwork\m2_worker_1\DISPATCH.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
- app/context/AppContext.jsx
- app/components/Layouts/AppLayout.jsx
- app/components/Layouts/SmartNFeSidebar.jsx
- app/components/Layouts/SmartNFeHeader.jsx
- tests/unit/leftDrawer.test.mjs

TASKS:
1. Verify git branch is feature/preparacoes-unificadas.
2. Implement state elevation in app/context/AppContext.jsx:
   - sidebarCollapsed, setSidebarCollapsed, toggleSidebar
   - mobileDrawerOpen, setMobileDrawerOpen, toggleMobileDrawer, closeMobileDrawer
   - localStorage sync with key 'smartnfe_sidebar_collapsed' post-mount to eliminate React 19 hydration mismatch
   - Default expanded (>1024px) without stored preference, default collapsed (<=1024px).
3. Update app/components/Layouts/AppLayout.jsx to use AppContext state and eliminate the local useState navigation reset.
4. Update app/components/Layouts/SmartNFeSidebar.jsx to support:
   - Desktop collapsible aside (hidden lg:flex)
   - Mobile overlay drawer (<=1024px) with backdrop, slide-over transition, close button, Escape key listener (with e.preventDefault()), role="dialog", aria-modal="true", and auto-close on link navigation.
5. Update app/components/Layouts/SmartNFeHeader.jsx with accessible mobile toggle button (lg:hidden, aria-label, aria-expanded).
6. Implement tests/unit/leftDrawer.test.mjs covering all drawer features.
7. Run tests (npm test / node --test) and verify zero regressions on the 383 existing tests + new tests.
8. Run build check to verify clean compilation.
9. Write handoff.md in your state folder with full verification commands and outputs, then send a message to caller when done.


## 2026-11-13T13:49:31Z
**Context**: Milestone 2 Architecture Guidance
**Content**: Explorer 1 has finalized its investigation report and handoff for AppContext.jsx and AppLayout.jsx at `c:\www\smart-nfe\.agents\teamwork\m2_explorer_1\handoff.md` and `report.md`. Please read it to guide your AppContext and AppLayout implementation details (especially regarding safe hydration guards, localStorage sync, and context exports).
**Action**: Incorporate the findings into your implementation.


## 2026-11-13T13:51:40Z
**Context**: Milestone 2 Architecture Guidance from Explorer 2
**Content**: Explorer 2 has completed its report at `c:\www\smart-nfe\.agents\teamwork\m2_explorer_2\handoff.md`. Key specs:
1. `SmartNFeSidebar.jsx`: Keep the 5 root menu items invariant. Use `hidden lg:flex` for desktop docked aside and `lg:hidden` for mobile overlay drawer.
2. Mobile overlay drawer: `role="dialog"`, `aria-modal="true"`, `id="mobile-sidebar-drawer"`, dimmed backdrop (`data-testid="sidebar-backdrop"`), close button (`data-testid="sidebar-close-button"`, `aria-label="Fechar menu lateral"`).
3. Escape key listener: on `Escape`, invoke close and call `e.preventDefault()` + `e.stopPropagation()`. Auto-close on menu link clicks.
4. `SmartNFeHeader.jsx`: Change toggle button from `md:hidden` to `lg:hidden`, add `data-testid="header-mobile-toggle"`, `aria-controls="mobile-sidebar-drawer"`, `aria-expanded={Boolean(mobileDrawerOpen)}`.
**Action**: Incorporate these attributes and specifications into your implementation.


## 2026-11-13T13:54:48Z
**Context**: Milestone 2 Architecture Guidance from Explorer 3
**Content**: Explorer 3 has finalized its coexistence and test harness investigation at `c:\www\smart-nfe\.agents\teamwork\m2_explorer_3\handoff.md`. Key findings:
1. Mobile drawer container and backdrop MUST use `z-50` so that `ScreenTourTip` (`z-40`) is dimmed cleanly behind the backdrop on <= 1024px screens.
2. `role="dialog"` and `aria-modal="true"` on the mobile drawer aside are recognized by ScreenTourTip's internal guard, preventing unwanted tour dismissal.
3. Node test harness uses `node --test tests/**/*.test.mjs` via `npm test`. `tests/unit/leftDrawer.test.mjs` should use `node:test` and `node:assert/strict`.
**Action**: Implement `z-50` and the test suites per Explorer 3's specifications.
