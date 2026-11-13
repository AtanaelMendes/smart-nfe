# Dispatch for Worker — Iteration 2

## Mission
Implement the fixes for Milestone 2: Left Drawer & Responsive Layout in `c:\www\smart-nfe` on branch `feature/preparacoes-unificadas`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Code Ownership (Exclusive)
- `app/components/Layouts/SmartNFeSidebar.jsx`
- `app/context/AppContext.jsx`
- `tests/unit/leftDrawer.test.mjs`
- `tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs`

## Implementation Tasks:
1. **Fix critical route auto-close in `app/components/Layouts/SmartNFeSidebar.jsx`**:
   - Import `useRef` from `'react'`.
   - Add `const prevPathnameRef = useRef(pathname);`.
   - Update the auto-close `useEffect` (lines 118-124):
     ```javascript
     useEffect(() => {
       if (prevPathnameRef.current !== pathname) {
         prevPathnameRef.current = pathname;
         if (mobileOpen && onMobileClose) {
           onMobileClose();
         }
       }
     }, [pathname, mobileOpen, onMobileClose]);
     ```
   - This ensures opening the drawer on the current pathname never triggers `onMobileClose()`, and only actual route changes dismiss the drawer.

2. **Harden `app/context/AppContext.jsx`**:
   - In `handleResize` (lines 85-91):
     Use `const isLg = window.innerWidth >= 1024;` so resizing to exactly 1024px cleanly dismisses the mobile drawer and releases body scroll lock.
   - In initial hydration (lines 57-78):
     Keep Option A decoupling:
     `const isLg = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;`
     `const defaultCollapsed = typeof window !== 'undefined' ? window.innerWidth <= 1024 : false;`
     In `setTimeout`, set `setSidebarCollapsedState(storedCollapsed !== null ? storedCollapsed === 'true' : defaultCollapsed);` and place `sidebarHydratedRef.current = true;` inside the timeout callback.
   - Clean updater in `setSidebarCollapsed`: do not execute `localStorage.setItem` inside the updater function; let Effect 2 or the outer callback handle it safely.

3. **Update Test Suites**:
   - `tests/unit/leftDrawer.test.mjs`:
     Add tests asserting that opening the mobile drawer on the same pathname keeps it open (0 calls to `onMobileClose`), while a change in pathname calls `onMobileClose()`.
   - `tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs`:
     Update Suite 1 so that instead of expecting the bug, it tests and asserts the regression guard: opening on same route keeps drawer open (`closeCount === 0`, `mobileOpen === true`), and route transition triggers `onMobileClose()`.

4. **Run Verification**:
   - `node --no-warnings --test tests/unit/leftDrawer.test.mjs`
   - `node --no-warnings --test tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs`
   - `node --no-warnings --test tests/tier5/m2_challenger_drawer_adversarial.test.mjs`
   - `npm test` (full suite pass)
   - `npm run lint` (0 errors)
   - `npm run build` (clean compilation)
   - Document results in `c:\www\smart-nfe\.agents\teamwork\m2_it2_worker_1\handoff.md`.


## 2026-11-13T14:24:51Z
You are m2_it2_worker_1 (teamwork_worker).
Working directory: c:\www\smart-nfe
Your state folder: c:\www\smart-nfe\.agents\teamwork\m2_it2_worker_1\

MANDATORY FIRST STEP:
Read c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Also read:
- c:\www\smart-nfe\.agents\teamwork\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m2\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\m2_it2_explorer_1\handoff.md
- c:\www\smart-nfe\.agents\teamwork\m2_it2_explorer_2\report.md
- c:\www\smart-nfe\.agents\teamwork\m2_it2_explorer_3\handoff.md
- c:\www\smart-nfe\.agents\teamwork\m2_it2_worker_1\DISPATCH.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
- app/components/Layouts/SmartNFeSidebar.jsx
- app/context/AppContext.jsx
- tests/unit/leftDrawer.test.mjs
- tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs

TASKS:
1. Fix route auto-close in app/components/Layouts/SmartNFeSidebar.jsx:
   - Import useRef from 'react'.
   - Add const prevPathnameRef = useRef(pathname);
   - In useEffect (lines 118-124), check:
     if (prevPathnameRef.current !== pathname) {
       prevPathnameRef.current = pathname;
       if (mobileOpen && onMobileClose) {
         onMobileClose();
       }
     }
2. Harden app/context/AppContext.jsx:
   - In handleResize, use window.innerWidth >= 1024 to cleanly dismiss mobile drawer at 1024px.
   - In hydration timeout, place sidebarHydratedRef.current = true inside the timeout callback.
   - Keep default state resolution: defaultCollapsed = window.innerWidth <= 1024 to satisfy R1.
3. Update tests/unit/leftDrawer.test.mjs and tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs to assert the ref guard and verify that opening drawer on same route keeps drawer open (0 calls to onMobileClose), while route transitions call onMobileClose.
4. Run tests:
   - node --no-warnings --test tests/unit/leftDrawer.test.mjs
   - node --no-warnings --test tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs
   - node --no-warnings --test tests/tier5/m2_challenger_drawer_adversarial.test.mjs
   - npm test
   - npm run lint
   - npm run build
5. Write handoff.md in your state folder with complete verification commands and outputs, then send a message to caller when done.
