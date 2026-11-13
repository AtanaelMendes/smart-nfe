# Investigation Report: Viewport Boundaries & Hydration Consistency in AppContext.jsx

**Agent**: `m2_it2_explorer_2` (teamwork_explorer)  
**Date**: 2026-11-13  
**Target File**: `app/context/AppContext.jsx`  
**Milestone**: Milestone 2 — Left Drawer & Responsive Layout (Iteration 2)  
**Reference Documents**:
- `c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md` (R1)
- `c:\www\smart-nfe\.agents\teamwork\PROJECT.md` (Features 8 & 9)
- `c:\www\smart-nfe\.agents\teamwork\sub_orch_m2\SCOPE.md`
- `c:\www\smart-nfe\.agents\teamwork\m2_challenger_1\handoff.md`
- `c:\www\smart-nfe\.agents\teamwork\m2_challenger_2\handoff.md`

---

## Executive Summary

Challengers 1 and 2 recommended changing `window.innerWidth > 1024` to `window.innerWidth >= 1024` in `app/context/AppContext.jsx` (lines 57 and 86) to achieve 100% alignment with Tailwind CSS `--breakpoint-lg: 1024px` (`@media (min-width: 1024px)`).

Our investigation confirms:
1. **The 1024px Anomaly is Real**: At exactly `1024px`, CSS activates desktop mode (`hidden lg:flex` displays desktop sidebar; `lg:hidden` hides mobile drawer and header toggle), while JavaScript evaluates `1024 > 1024` as `false`. This causes a **Body Scroll Lock Trap**: if a user opens the mobile drawer on a tablet/mobile viewport and resizes or rotates to 1024px, the mobile drawer is hidden by CSS, but `mobileDrawerOpen` remains `true` in React state, leaving `document.body.style.overflow = 'hidden'` with no visible hamburger button to dismiss it.
2. **The Architectural Conflict with Requirement R1**: While changing `handleResize` to `>= 1024` resolves the scroll lock trap, blindly changing line 57 (`isLg` initial resolution) to `>= 1024` causes `sidebarCollapsed` to default to `false` (expanded) at 1024px. This directly contradicts Requirement R1 in `ORIGINAL_REQUEST.md`: *"recolhido por padrão em LG ou inferior (até 1024px)"* and *"Em telas LG ou inferior (até 1024px), o drawer inicia recolhido por padrão"*. Furthermore, it will immediately break four existing test suites that specifically assert that at 1024px without saved preference, the sidebar starts collapsed (`sidebarCollapsed: true`), as well as the regex check `/window\.innerWidth\s*>\s*1024/` in `tests/tier5/m2_challenger_drawer_adversarial.test.mjs:52`.
3. **Other Hydration Adjustments Needed**:
   - **Premature Hydration Write (Race Condition)**: In lines 59-78, `sidebarHydratedRef.current = true;` is set synchronously before `setTimeout(..., 0)`. On initial mount, Effect 2 (`useEffect([sidebarCollapsed])`) fires immediately and writes `'false'` to `localStorage` before the timer loads the stored preference or viewport default.
   - **Impure State Updater**: In `setSidebarCollapsed` (lines 97-107), `localStorage.setItem` is called inside `setSidebarCollapsedState(prev => ...)`, which violates React 19 functional updater purity.

---

## 1. Deep Dive: Viewport Boundary Analysis (`> 1024` vs `>= 1024`)

### 1.1 CSS Breakpoint Definition in Tailwind CSS v4
In `app/globals.css` (lines 32-38):
```css
/* Breakpoints */
--breakpoint-sm: 576px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-tc: 1280px;
--breakpoint-xl: 1560px;
--breakpoint-2xl: 1920px;
```
Tailwind CSS compiles utility prefixes (`lg:flex`, `lg:hidden`) into `@media (min-width: 1024px)`.
Per W3C CSS Media Queries specifications:
- `min-width: 1024px` evaluates to **true** for all viewports where `viewport width >= 1024px`.

### 1.2 Boundary Pixel Matrix: 1023px vs 1024px vs 1025px

| Width | CSS `@media (min-width: 1024px)` | Desktop Aside (`hidden lg:flex`) | Mobile Drawer Root (`lg:hidden`) | Header Toggle (`lg:hidden`) | JS `window.innerWidth > 1024` | JS `window.innerWidth >= 1024` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1023px** | **FALSE** | `display: none` | `display: block` (when open) | `display: block` | `false` | `false` |
| **1024px** | **TRUE** | `display: flex` | `display: none` | `display: none` | **`false` (MISMATCH)** | **`true` (ALIGNED)** |
| **1025px** | **TRUE** | `display: flex` | `display: none` | `display: none` | `true` | `true` |

### 1.3 The Runtime Discrepancies at Exactly 1024px

When `window.innerWidth > 1024` is used:
1. **The Mobile Drawer Body Scroll Lock Trap**:
   - `SmartNFeSidebar.jsx` locks scroll when `mobileOpen === true`:
     ```javascript
     useEffect(() => {
       if (!mobileOpen) return;
       const originalOverflow = document.body.style.overflow;
       document.body.style.overflow = 'hidden';
       return () => { document.body.style.overflow = originalOverflow; };
     }, [mobileOpen]);
     ```
   - In `AppContext.jsx` (lines 85-91):
     ```javascript
     const handleResize = () => {
       const isLg = window.innerWidth > 1024;
       setIsLgScreen(isLg);
       if (isLg) {
         setMobileDrawerOpen(false);
       }
     };
     ```
   - If a mobile user has `mobileDrawerOpen === true` and rotates/resizes to `1024px`:
     - CSS immediately hides the mobile drawer and hides the header toggle (`lg:hidden`).
     - `handleResize` evaluates `1024 > 1024` as `false`, so `setMobileDrawerOpen(false)` is **NOT called**.
     - `document.body.style.overflow` remains `'hidden'`.
     - The user is stuck on a desktop view where page scrolling is disabled, with no hamburger button to dismiss the drawer.
2. **Context State Desynchronization**:
   - `isLgScreen` in `AppContext` is set to `false`, even though CSS is rendering desktop styles (`lg:flex`). Any child component consuming `isLgScreen` behaves as if it is in mobile mode.

---

## 2. The Core Conflict: Tailwind Breakpoint vs Requirement R1 Acceptance Criteria

### 2.1 The Requirement Text in `ORIGINAL_REQUEST.md`
- **Line 18**:
  > *"O drawer deve permanecer expandido por padrão acima de 1024px quando não houver preferência salva e recolhido por padrão em LG ou inferior (até 1024px)..."*
- **Line 39 (Acceptance Criteria)**:
  > *"- [ ] Em telas LG ou inferior (até 1024px), o drawer inicia recolhido por padrão, e o menu móvel opera em overlay com backdrop, tecla Escape e botão de fechar."*

Notice the explicit distinction:
- **"acima de 1024px"** $\implies > 1024\text{px}$ (expanded by default, `sidebarCollapsed: false`)
- **"em LG ou inferior (até 1024px)"** $\implies \le 1024\text{px}$ (collapsed by default, `sidebarCollapsed: true`)

Why was this specified?
In high-density fiscal applications with wide data tables (NF-e line items, export preparation worksheets, item apportioning), a 1024px viewport (such as an iPad landscape or netbook) has tight horizontal space. Defaulting the sidebar to collapsed (`w-14` / 56px instead of `w-60` / 240px) yields an additional **184px of width** for data tables.

### 2.2 What Happens if Line 57 is Changed Naively to `>= 1024`?
In `AppContext.jsx` lines 57-68:
```javascript
const isLg = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
...
if (storedCollapsed !== null) {
  setSidebarCollapsedState(storedCollapsed === 'true');
} else {
  setSidebarCollapsedState(!isLg);
}
```
If `isLg` is evaluated as `window.innerWidth >= 1024`:
- At 1024px, `isLg` becomes `true`.
- Without a stored preference, `setSidebarCollapsedState(!isLg)` sets `sidebarCollapsedState(false)` (**EXPANDED**).
- **Result**: Directly violates the requirement *"recolhido por padrão em LG ou inferior (até 1024px)"*.

### 2.3 Impact on Existing Test Suites
If lines 57 and 86 are changed to `>= 1024` without adjusting tests, the following tests will immediately fail:

1. `tests/tier5/m2_challenger_drawer_adversarial.test.mjs` (Line 52):
   ```javascript
   assert.match(appContextSource, /window\.innerWidth\s*>\s*1024/, 'AppContext usa window.innerWidth > 1024');
   ```
   *Fails*: Regex does not match `>= 1024`.
2. `tests/tier5/m2_challenger_drawer_adversarial.test.mjs` (Lines 95-96):
   ```javascript
   assert.strictEqual(vp1024.jsIsLg, false, '1024px: JS avalia 1024 > 1024 como false');
   assert.strictEqual(vp1024.jsDefaultCollapsed, true, '1024px: default recolhido (w-14) no aside desktop');
   ```
   *Fails*: `jsDefaultCollapsed` evaluates to `false` instead of `true`.
3. `tests/unit/leftDrawer.test.mjs` (Lines 162-178):
   ```javascript
   assert.strictEqual(resolveInitialState(null, 1024), true);
   ```
   *Fails*: If resolution logic changes at 1024px.
4. `tests/integration/flow_a_drawer_layout.test.mjs` (Lines 161-175):
   ```javascript
   it('2.2: Em telas <= 1024px (breakpoint LG), inicia recolhido por padrão (sidebarCollapsed: true)', () => {
     mockWindow.innerWidth = 1024;
     ...
     assert.strictEqual(resolvedState, true, 'Até 1024px deve iniciar recolhido (true)');
   });
   ```

---

## 3. Analysis of Clean Hydration & Storage Synchronization in `AppContext.jsx`

Beyond the viewport boundary, our investigation identified two hydration/synchronization adjustments needed in `AppContext.jsx`:

### 3.1 Premature `sidebarHydratedRef` Write (Initial Mount Race Condition)
- **Current Code** (`AppContext.jsx` lines 59-78 & 122-127):
  ```javascript
  // Effect 1 (Mount):
  sidebarHydratedRef.current = true; // Line 59 (SYNCHRONOUS!)

  const timer = setTimeout(() => {
    setIsLgScreen(isLg);
    if (storedCollapsed !== null) {
      setSidebarCollapsedState(storedCollapsed === 'true');
    } else {
      setSidebarCollapsedState(!isLg);
    }
  }, 0);

  // Effect 2 (Persistence):
  useEffect(() => {
    if (!sidebarHydratedRef.current) return;
    try {
      localStorage.setItem('smartnfe_sidebar_collapsed', String(sidebarCollapsed));
    } catch (e) {}
  }, [sidebarCollapsed]);
  ```
- **Observed Mechanism**:
  1. During initial mount, `sidebarCollapsed` is initialized to `false` (snapshot for safe SSR).
  2. Effect 1 runs: sets `sidebarHydratedRef.current = true;` synchronously, and schedules the timer macrotask.
  3. React immediately executes Effect 2 on initial mount.
  4. Because `sidebarHydratedRef.current` is already `true`, Effect 2 runs and calls `localStorage.setItem('smartnfe_sidebar_collapsed', 'false')`.
  5. If the user previously had `smartnfe_sidebar_collapsed = 'true'`, the stored preference is temporarily overwritten with `'false'` during that initial tick until the timer runs.
  6. Furthermore, for a first-time visitor with NO saved preference (`storedCollapsed === null`), Effect 2 writes `'false'` into `localStorage` before the user has ever interacted with the drawer.
- **Recommended Adjustment**:
  Move `sidebarHydratedRef.current = true;` **inside** the `setTimeout` callback, after the initial state is hydrated.
  ```javascript
  const timer = setTimeout(() => {
    setIsLgScreen(isLg);
    if (storedCollapsed !== null) {
      setSidebarCollapsedState(storedCollapsed === 'true');
    } else {
      setSidebarCollapsedState(!isLg);
    }
    sidebarHydratedRef.current = true; // <- MOVE HERE
    ...
  }, 0);
  ```

### 3.2 Impure State Updater in `setSidebarCollapsed`
- **Current Code** (`AppContext.jsx` lines 97-107):
  ```javascript
  const setSidebarCollapsed = useCallback((valueOrUpdater) => {
    setSidebarCollapsedState(prev => {
      const nextVal = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : Boolean(valueOrUpdater);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('smartnfe_sidebar_collapsed', String(nextVal));
        } catch (e) {}
      }
      return nextVal;
    });
  }, []);
  ```
- **Observed Issue**:
  In React 19, functional state updaters (`prev => ...`) must remain pure functions without side effects. Placing `localStorage.setItem` inside the updater can cause duplicate writes if React re-runs updaters in concurrent mode.
  Furthermore, Effect 2 (`useEffect([sidebarCollapsed])`) already synchronizes `sidebarCollapsed` to `localStorage` once hydrated.
- **Recommended Adjustment**:
  Remove the side effect from inside the updater callback. Let Effect 2 handle persistence once `sidebarHydratedRef.current` is true, or perform the write synchronously before/after updating state.

---

## 4. Architectural Solutions & Recommendations

### Option A: Clean Decoupling (RECOMMENDED)
Decouple the **Responsive Display Breakpoint** from the **Default Sidebar Expansion State**:

1. **Responsive Mode & Drawer Auto-Close (`isLgScreen` & `handleResize`)**:
   - Uses `>= 1024` (or `window.matchMedia('(min-width: 1024px)').matches`).
   - At $\ge 1024\text{px}$, CSS hides the mobile drawer; therefore, `handleResize` calls `setMobileDrawerOpen(false)`, eliminating the body scroll lock trap.
   - `isLgScreen` returns `true` at $\ge 1024\text{px}$, matching Tailwind CSS `@media (min-width: 1024px)`.
2. **Default Sidebar State Without Preference (`sidebarCollapsed`)**:
   - The desktop sidebar at 1024px can be either expanded (`w-60`) or collapsed (`w-14`).
   - By evaluating `const defaultCollapsed = typeof window !== 'undefined' ? window.innerWidth <= 1024 : false;`, the sidebar starts collapsed (`w-14`) at 1024px, exactly satisfying Requirement R1: *"recolhido por padrão em LG ou inferior (até 1024px)"*.
   - Above 1024px (`> 1024px`), it starts expanded (`w-60`).
   - The user can toggle between `w-14` and `w-60` at any time via the bottom chevron button.

#### Proposed Code for Option A in `AppContext.jsx`:
```javascript
// AppContext.jsx

// 1. Initial hydration effect (lines 57-78):
const isLg = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
// Default: expandido (>1024px) sem preferência salva, recolhido em LG ou inferior (<=1024px)
const defaultCollapsed = typeof window !== 'undefined' ? window.innerWidth <= 1024 : false;

const timer = setTimeout(() => {
  setIsLgScreen(isLg);
  if (storedCollapsed !== null) {
    setSidebarCollapsedState(storedCollapsed === 'true');
  } else {
    setSidebarCollapsedState(defaultCollapsed);
  }
  sidebarHydratedRef.current = true; // Hydration guard placed after state assignment
  if (isDark) {
    setDarkMode(true);
    document.documentElement.classList.toggle('dark', true);
  }
  if (loadedSettings) {
    setSettings(loadedSettings);
  }
}, 0);

// 2. Resize listener (lines 85-92):
const handleResize = () => {
  const isLg = window.innerWidth >= 1024;
  setIsLgScreen(isLg);
  if (isLg) {
    setMobileDrawerOpen(false);
  }
};
```

### Option B: Full `>= 1024px` Unification
If the team desires strictly `window.innerWidth >= 1024` for both responsive display and default state:
- At 1024px, `sidebarCollapsed` will default to `false` (expanded).
- **Required Action**: The team/orchestrator must acknowledge this redefinition of R1 at 1024px and update the four test files (`tests/unit/leftDrawer.test.mjs`, `tests/integration/flow_a_drawer_layout.test.mjs`, and `tests/tier5/m2_challenger_drawer_adversarial.test.mjs`) to align their assertions with `>= 1024`.

---

## 5. Synthesis & Worker Action Plan

| Item | Problem | Recommended Solution | Affected Files |
| :--- | :--- | :--- | :--- |
| **1. Resize Scroll Trap** | At 1024px, `handleResize` does not close mobile drawer because `1024 > 1024` is false. | Use `window.innerWidth >= 1024` in `handleResize`. | `app/context/AppContext.jsx:86` |
| **2. Breakpoint Alignment** | `isLgScreen` says `false` at 1024px while CSS applies `lg:` rules. | Set `isLgScreen = window.innerWidth >= 1024`. | `app/context/AppContext.jsx:87` |
| **3. R1 Default State** | Requirement R1 requires collapsed at $\le 1024\text{px}$ ("até 1024px"). | Decouple default state: `defaultCollapsed = window.innerWidth <= 1024`. | `app/context/AppContext.jsx:67` |
| **4. Premature Storage Write** | `sidebarHydratedRef.current = true` runs before `setTimeout`, causing Effect 2 to write `'false'`. | Move `sidebarHydratedRef.current = true;` inside `setTimeout`. | `app/context/AppContext.jsx:59` |
| **5. Updater Impurity** | `localStorage.setItem` inside `setSidebarCollapsedState(prev => ...)`. | Remove side effect from updater; let Effect 2 or outer function handle storage. | `app/context/AppContext.jsx:101-104` |
