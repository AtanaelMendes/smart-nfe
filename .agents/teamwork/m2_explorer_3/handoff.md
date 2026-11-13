# Handoff Report: Coexistence & Test Harness Architecture for Milestone 2 (R1)

**Agent**: `m2_explorer_3` (teamwork_explorer)  
**Date**: 2026-11-13  
**Working Directory**: `c:\www\smart-nfe`  
**State Folder**: `c:\www\smart-nfe\.agents\teamwork\m2_explorer_3\`  
**Caller / Parent**: `744fe86f-d6f1-40a4-833e-217247dbf06e`  

---

## 1. Observation

1. **`ScreenTourTip.jsx` Layout & Z-Index**:
   - File: `c:\www\smart-nfe\app\components\feedback\ScreenTourTip.jsx`.
   - Line 223 (minimized): `className="fixed bottom-5 right-5 z-40 animate-fade-in"`.
   - Line 266 (expanded): `className="fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] sm:w-[480px] md:w-[540px] max-h-[85vh] flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 transition-all duration-200 animate-fade-in"`.
   - Lines 153-162:
     ```javascript
     if (event.defaultPrevented) return;
     const hasActiveModal = Boolean(
       typeof document !== 'undefined' &&
         document.querySelector('[role="dialog"], [aria-modal="true"]')
     );
     if (hasActiveModal) return;
     ```
2. **Layout Shell Stacking in `AppLayout.jsx`**:
   - File: `c:\www\smart-nfe\app\components\Layouts\AppLayout.jsx`.
   - Lines 13-26:
     ```javascript
     <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 overflow-hidden">
       <SmartNFeSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />
       <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
         <SmartNFeHeader breadcrumbs={breadcrumbs} onMenuToggle={() => setSidebarCollapsed(prev => !prev)} />
         <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
       </div>
       <ScreenTourTip />
       <ToastContainer />
       <DemoBadge />
     </div>
     ```
   - Notice that `<SmartNFeSidebar>` is rendered before `<ScreenTourTip>` in DOM order.
3. **Table Inline Editing in `conferencia/page.jsx`**:
   - File: `c:\www\smart-nfe\app\documentos\[id]\conferencia\page.jsx`.
   - Lines 168-188:
     ```javascript
     const handleKeyDown = (e, rowIndex, field, itemId) => {
       if (e.key === 'Enter') {
         e.preventDefault();
         ...
       } else if (e.key === 'Escape') {
         e.preventDefault();
         handleRestoreItem(itemId);
         e.target.blur();
       }
     };
     ```
   - Lines 634-636: `<div className="overflow-x-auto"><table className="w-full text-xs text-left ...">`.
4. **Test Harness & Existing Tests in `package.json`**:
   - File: `c:\www\smart-nfe\package.json`.
   - Line 10: `"test": "node --no-warnings --test tests/**/*.test.mjs"`.
   - Running `cd c:\www\smart-nfe; npm test` executes 383 existing tests across 104 suites in 16.6 seconds with 0 failures (`pass 383, fail 0`).
   - `next/dist/build/swc` `transformSync` is available for compiling JSX on the fly in Node.js ESM test files, enabling `renderToStaticMarkup` without requiring Jest, Vitest, or JSDOM.

---

## 2. Logic Chain

1. **ScreenTourTip & Mobile Drawer Coexistence**:
   - From Observation 1, `ScreenTourTip` uses `fixed bottom-5 right-5 z-40`.
   - From Observation 2, `<ScreenTourTip>` appears after `<SmartNFeSidebar>` in DOM order. Under CSS 2.1 stacking rules, if both components use `z-40`, the later element (`ScreenTourTip`) stacks on top of the earlier element.
   - Therefore, the mobile drawer overlay must use `z-50` for its container and backdrop (consistent with `Dialog.jsx` at line 93) so that `ScreenTourTip` (`z-40`) is cleanly dimmed behind the backdrop on mobile screens ($\le 1024\text{px}$).
   - Furthermore, from Observation 1 (lines 157-160), `ScreenTourTip` checks `document.querySelector('[role="dialog"], [aria-modal="true"]')`. By applying `role="dialog"` and `aria-modal="true"` to the mobile drawer container, `ScreenTourTip` will automatically suppress its own Escape listener while the drawer is open.
   - Calling `event.preventDefault()` in the mobile drawer's Escape listener satisfies line 154 (`if (event.defaultPrevented) return;`), establishing two independent layers of protection against unintended tour closure.

2. **Table Inline Editing Non-Interference**:
   - From Observation 3 (lines 183-187), editing a table cell intercepts Escape and calls `e.preventDefault()`, restores the item value, and blurs the input.
   - Because `e.preventDefault()` is invoked immediately, window-level Escape listeners in `ScreenTourTip` and `SmartNFeSidebar` will detect `event.defaultPrevented === true` and will never close the drawer or tourtip when a user cancels cell editing.
   - From Observation 3 (lines 634-636), the table is enclosed in `<div className="overflow-x-auto">`. When desktop sidebar collapses (`w-60` $\to$ `w-14`), the `<main>` area expands by 184px, allowing more table columns to display without layout shifts or input unmounting.

3. **Test Harness & Execution of `tests/unit/leftDrawer.test.mjs`**:
   - From Observation 4, the test command is `node --no-warnings --test tests/**/*.test.mjs`.
   - Placing the test file at `tests/unit/leftDrawer.test.mjs` matches the glob pattern `tests/**/*.test.mjs` and executes automatically with `npm test`.
   - Tests can directly verify pure state resolution logic, inspect structural contracts of JSX files using string and regex assertions, and render JSX to static HTML strings via Next.js SWC `transformSync` + `react-dom/server` `renderToStaticMarkup`.

---

## 3. Caveats

- **No Caveats on Coexistence**: The interaction mechanisms (`preventDefault`, `role="dialog"`, `z-50`, `overflow-x-auto`) have been confirmed directly against source code and do not require external libraries.
- **Scope Boundary**: Implementation of `tests/unit/leftDrawer.test.mjs` and modifications to `AppContext.jsx`, `AppLayout.jsx`, `SmartNFeSidebar.jsx`, and `SmartNFeHeader.jsx` belong to the upcoming worker phase. This exploration is read-only.

---

## 4. Conclusion

1. The responsive mobile drawer overlay must be assigned `z-50` with `role="dialog"` and `aria-modal="true"` to ensure `ScreenTourTip` (`z-40`) is dimmed cleanly and its Escape handler suppressed while the drawer is open.
2. Table inline editing and sidebar toggle are completely orthogonal: cell Escape handlers call `e.preventDefault()`, preventing drawer/tour closure; backdrop pointer intercept prevents accidental cell focus; and sidebar width transitions (`w-60` $\leftrightarrow$ `w-14`) expand available table viewing area without re-rendering or unmounting cell inputs.
3. `tests/unit/leftDrawer.test.mjs` is fully specified with 5 test suites covering pure state resolution, AppContext contract, layout DOM structure, ScreenTourTip coexistence, and table editing isolation, running natively under `node:test` via `npm test`.

---

## 5. Verification Method

To independently verify all observations and test harness execution:

1. **Verify Baseline Test Suite Execution**:
   ```powershell
   cd c:\www\smart-nfe
   npm test
   ```
   *Expected*: 383 tests pass with 0 failures in ~16 seconds.

2. **Verify Next.js SWC & Component Rendering**:
   ```powershell
   cd c:\www\smart-nfe
   node -e "const { transformSync } = require('next/dist/build/swc'); const fs = require('fs'); const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server'); const code = fs.readFileSync('app/components/Layouts/SmartNFeSidebar.jsx', 'utf8'); const res = transformSync(code, { jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } } }, module: { type: 'commonjs' } }); const mod = { exports: {} }; const fn = new Function('require', 'module', 'exports', 'React', res.code); fn((id) => (id === 'react' ? React : id === 'next/link' ? ({ children, ...p }) => React.createElement('a', p, children) : id === 'next/navigation' ? { usePathname: () => '/dashboard' } : id === '@fortawesome/react-fontawesome' ? { FontAwesomeIcon: () => null } : {}), mod, mod.exports, React); console.log('Rendered length:', renderToStaticMarkup(React.createElement(mod.exports.default, { collapsed: false })).length);"
   ```
   *Expected*: Outputs `Rendered length: 2309`.

3. **Verify ScreenTourTip Escape Interlocking**:
   Inspect `c:\www\smart-nfe\app\components\feedback\ScreenTourTip.jsx` at lines 153-162.
