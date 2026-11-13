# Handoff Report — Challenger 2 (Milestone 2: Left Drawer & Responsive Layout)

**Agent**: `m2_challenger_2` (teamwork_challenger)  
**Roles**: critic, specialist  
**Date**: 2026-11-13  
**Working Directory**: `c:\www\smart-nfe`  
**State Folder**: `c:\www\smart-nfe\.agents\teamwork\m2_challenger_2\`  
**Target Milestone**: Milestone 2 — Left Drawer & Responsive Layout (R1)  
**Type**: Hard Handoff  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

1. **Critical Defect in Mobile Drawer Auto-Close Hook (`SmartNFeSidebar.jsx:118-124`)**:
   - File: `c:\www\smart-nfe\app\components\Layouts\SmartNFeSidebar.jsx`
   - Exact code (lines 118-124):
     ```javascript
     // Fecha o drawer móvel automaticamente na navegação de rotas
     useEffect(() => {
       if (mobileOpen && onMobileClose) {
         onMobileClose();
       }
     }, [pathname, mobileOpen, onMobileClose]);
     ```
   - Observed behavior:
     - The dependency array `[pathname, mobileOpen, onMobileClose]` includes `mobileOpen`.
     - When a user on a viewport $\le 1024\text{px}$ clicks the hamburger toggle button in `SmartNFeHeader.jsx`, `toggleMobileDrawer()` sets `mobileDrawerOpen = true`.
     - `SmartNFeSidebar` re-renders with `mobileOpen = true`.
     - React's dependency change detection algorithm compares the previous dependencies `[pathname, false, onMobileClose]` against current `[pathname, true, onMobileClose]`.
     - Because `mobileOpen` changed, React executes the effect callback after render.
     - In the callback, `if (mobileOpen && onMobileClose)` evaluates to `true`, immediately executing `onMobileClose()`.
     - `onMobileClose()` invokes `setMobileDrawerOpen(false)`, closing the drawer immediately on the same route.
     - As a result, the mobile drawer cannot remain open for the user to view or click menu items.
   - Empirical Reproduction:
     - File: `c:\www\smart-nfe\tests\adversarial\m2_challenger2_drawer_coexistence.test.mjs` (Suite 1, Test 1.2).
     - Execution Command: `node --no-warnings --test tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs`
     - Output: `✔ 1.2: Empirical Reproduction: Abrir o drawer móvel sem mudança de rota causa fechamento instantâneo (0.5271ms)`.
     - Verified: `onMobileClose()` is called immediately on opening without any route transition.

2. **Keyboard Escape Key Event Order & Coexistence**:
   - File: `c:\www\smart-nfe\app\documentos\[id]\conferencia\page.jsx` (lines 183-187):
     ```javascript
     } else if (e.key === 'Escape') {
       e.preventDefault();
       handleRestoreItem(itemId);
       e.target.blur();
     }
     ```
   - File: `c:\www\smart-nfe\app\components\feedback\ScreenTourTip.jsx` (lines 151-163):
     ```javascript
     const handleKeyDown = (event) => {
       if (event.key === 'Escape') {
         // Se outro elemento já consumiu o Escape (ex: cancelando edição de célula de tabela), não fecha o tour
         if (event.defaultPrevented) return;

         // Se houver um modal/diálogo aberto na tela, o Escape pertence ao modal e não ao tourtip
         const hasActiveModal = Boolean(
           typeof document !== 'undefined' &&
             document.querySelector('[role="dialog"], [aria-modal="true"]')
         );
         if (hasActiveModal) return;
     ```
   - File: `c:\www\smart-nfe\app\components\Layouts\SmartNFeSidebar.jsx` (lines 94-102):
     ```javascript
     const handleKeyDown = (e) => {
       if (e.key === 'Escape') {
         e.preventDefault();
         e.stopPropagation();
         if (onMobileClose) {
           onMobileClose();
         }
       }
     };
     ```
   - Observed behavior:
     - Case A (Cell editing active, mobile drawer closed, ScreenTourTip visible): Pressing Escape triggers cell handler, calling `e.preventDefault()`, restoring item, and blurring. Event bubbles to `window`. `ScreenTourTip` evaluates `event.defaultPrevented === true` and aborts. `ScreenTourTip` remains visible. (Verified in Suite 2, Test 2.1 & 2.2).
     - Case B (Mobile drawer open, ScreenTourTip visible): Pressing Escape triggers `SmartNFeSidebar` handler, calling `e.preventDefault()`, `e.stopPropagation()`, and `onMobileClose()`. Even if `ScreenTourTip`'s window listener runs first due to registration order, `hasActiveModal` evaluates to `true` (since `#mobile-sidebar-drawer` has `role="dialog"` and `aria-modal="true"`). `ScreenTourTip` remains visible. (Verified in Suite 2, Test 2.3).
     - Case C (Isolated Escape, no active cell, no dialog): `ScreenTourTip` closes cleanly. (Verified in Suite 2, Test 2.4).
     - Caveat noted: `conferencia/page.jsx` does not invoke `e.stopPropagation()`. While `ScreenTourTip` is protected by `event.defaultPrevented`, `e.stopPropagation()` would prevent the event from bubbling further.

3. **Rapid Toggling and Backdrop Click Stress**:
   - File: `c:\www\smart-nfe\tests\adversarial\m2_challenger2_drawer_coexistence.test.mjs` (Suite 3).
   - Observed behavior:
     - Burst of 100 consecutive backdrop clicks: `mobileDrawerOpen` remains `false`, executed with strict idempotency (Test 3.1).
     - Burst of 200 consecutive hamburger toggles: `toggleMobileDrawer()` uses functional updater `prev => !prev`, resulting in deterministic state without closure lag (Test 3.2).
     - Body scroll lock (`document.body.style.overflow`): 50 rapid open/close cycles verified that `document.body.style.overflow` is restored to `""` on close with zero leak (Test 3.3).
     - Chaos harness: 1000 randomized mixed actions (Toggle, Backdrop, Escape, Navigation) verified that whenever `mobileDrawerOpen === false`, `body.style.overflow` is strictly `""` (Test 3.4).

4. **ScreenTourTip Coexistence Under Active Tour Step**:
   - File: `c:\www\smart-nfe\tests\adversarial\m2_challenger2_drawer_coexistence.test.mjs` (Suite 4).
   - Observed behavior:
     - State preservation: Tourtip step index and `isMinimized` state remain completely unaltered when mobile drawer opens and closes (Test 4.1).
     - Stacking context: Mobile drawer backdrop and aside use `z-50`, cleanly obscuring `ScreenTourTip` (`z-40`) behind the dark backdrop overlay (Test 4.2).
     - On-demand tour opening: `SmartNFeHeader.jsx` dispatches `smartnfe:open-screen-tour` CustomEvent, reopening tours independently of drawer state (Test 4.3).

5. **Viewport Boundary Analysis (1024px)**:
   - File: `c:\www\smart-nfe\app\globals.css` defines `--breakpoint-lg: 1024px;` which generates `@media (min-width: 1024px)`.
   - File: `c:\www\smart-nfe\app\context\AppContext.jsx` line 57 uses `window.innerWidth > 1024`.
   - Observed behavior at exactly 1024px:
     - CSS treats 1024px as desktop (`lg:` active): desktop sidebar is displayed via `hidden lg:flex`, header hamburger button is hidden via `lg:hidden`.
     - JS treats 1024px as mobile (`1024 > 1024` is false): `sidebarCollapsed` defaults to `true` (w-14).
     - User experience: User sees the desktop sidebar collapsed (`w-14`) with desktop toggle chevron available. To achieve 100% semantic alignment between JS and CSS, `AppContext.jsx` should use `window.innerWidth >= 1024`.

6. **Full Test & Build Execution**:
   - Command: `node --no-warnings --test tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs`
     - Output: `pass 14, fail 0, duration_ms 147.1965`.
   - Command: `npm test`
     - Output: `pass 552, fail 0, suites 157, duration_ms 43958.3772`.
   - Command: `npm run lint`
     - Output: Exit code 0, 0 errors, 0 warnings.
   - Command: `npm run build`
     - Output: `✓ Compiled successfully in 12.3s`, 11/11 static pages generated, exit code 0.

---

## 2. Logic Chain

1. From Observation 1, the requirement R1 states:
   *"oferecendo drawer móvel com backdrop, tecla Escape e botão de fechar, botão de toggle sempre acessível, sem interferir no editor de produtos nem no ScreenTourTip."*
2. In `app/components/Layouts/SmartNFeSidebar.jsx` (lines 118-124), the auto-close effect was written as:
   ```javascript
   useEffect(() => {
     if (mobileOpen && onMobileClose) {
       onMobileClose();
     }
   }, [pathname, mobileOpen, onMobileClose]);
   ```
3. Whenever the user clicks the hamburger toggle button in `SmartNFeHeader.jsx` to open the mobile drawer, `mobileDrawerOpen` changes from `false` to `true`.
4. Because `mobileOpen` is listed in the dependency array without checking whether `pathname` actually changed, React immediately runs the effect on the very next render cycle.
5. In that cycle, `if (mobileOpen && onMobileClose)` evaluates to `true`, which immediately calls `onMobileClose()`, resetting `mobileDrawerOpen` back to `false`.
6. Therefore, on viewports $\le 1024\text{px}$, the mobile drawer auto-closes instantaneously every time it is opened, making it impossible for users to interact with navigation links.
7. From Observation 1, this defect was verified through static source inspection and reproduced empirically in `tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs` (Suite 1).
8. From Observation 2, 3, and 4, the Keyboard Escape hierarchy (`conferencia` $\to$ `mobileDrawer` $\to$ `ScreenTourTip`), rapid toggling resilience, body scroll lock management, and ScreenTourTip visual layering are architecturally sound and passed all 14 empirical challenge tests.
9. However, because Observation 1 represents a critical functional defect that prevents the mobile drawer from staying open, the milestone cannot be approved in its current state.
10. Therefore, the required verdict is `REQUEST_CHANGES`.

---

## 3. Caveats

- In accordance with the Review-Only constraint, no implementation files (`SmartNFeSidebar.jsx`, `AppContext.jsx`, `SmartNFeHeader.jsx`) were modified by this challenger.
- The defect is confirmed in `SmartNFeSidebar.jsx` lines 118-124; fixing it requires updating that component to guard route changes with `useRef(pathname)`.
- Existing integration tests (`flow_a_drawer_layout.test.mjs`) missed this defect because they tested a custom mock function (`handleRouteChange(newPath)`) instead of mounting or testing the actual `useEffect` hook of `SmartNFeSidebar.jsx`.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

### Actionable Remediation Items for Worker:

1. **Fix Critical Auto-Close Hook in `app/components/Layouts/SmartNFeSidebar.jsx`**:
   Replace lines 118-124 with a ref-guarded effect that only invokes `onMobileClose()` when `pathname` actually changes:
   ```javascript
   // app/components/Layouts/SmartNFeSidebar.jsx
   import { useEffect, useRef } from 'react';
   ...
   const prevPathnameRef = useRef(pathname);
   useEffect(() => {
     if (prevPathnameRef.current !== pathname) {
       prevPathnameRef.current = pathname;
       if (mobileOpen && onMobileClose) {
         onMobileClose();
       }
     }
   }, [pathname, mobileOpen, onMobileClose]);
   ```
   *(Note: Since mobile navigation links already include `onClick={onMobileClose}` at line 228, route navigation initiated by the drawer itself is already handled.)*

2. **Align Viewport Breakpoint in `app/context/AppContext.jsx` (Recommended)**:
   Change `window.innerWidth > 1024` to `window.innerWidth >= 1024` in lines 57 and 86 to achieve 100% boundary alignment with Tailwind v4 `@media (min-width: 1024px)`.

3. **Add `e.stopPropagation()` in `app/documentos/[id]/conferencia/page.jsx` (Recommended)**:
   Add `e.stopPropagation()` to line 184 alongside `e.preventDefault()` to stop keyboard event bubbling at the cell level.

---

## 5. Verification Method

To reproduce the findings and verify remediation:

1. **Run Empirical Challenger Test Suite**:
   ```powershell
   cd c:\www\smart-nfe
   node --no-warnings --test tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs
   ```
   *Expected*: All 14 tests pass, confirming empirical isolation of the auto-close defect and coexistence assertions.

2. **Inspect the Defective Hook**:
   - File: `c:\www\smart-nfe\app\components\Layouts\SmartNFeSidebar.jsx`
   - Lines: 118-124. Note that `mobileOpen` in `[pathname, mobileOpen, onMobileClose]` causes immediate auto-close upon opening.

3. **Run Full Regression Suite**:
   ```powershell
   cd c:\www\smart-nfe
   npm test
   ```
   *Expected*: 552 tests pass across 157 suites.

4. **Run Linter and Build**:
   ```powershell
   cd c:\www\smart-nfe
   npm run lint
   npm run build
   ```
   *Expected*: Code 0 with 0 errors.
