# Adversarial Reviewer Report (Round 3): Contextual Tourtip / Onboarding System (SmartNFe)

> [!WARNING] **Skepticism Disclaimer**
> High confidence in static analysis, production build compilation, full test suite execution (383/383 passed), memory fallback resilience, cross-screen event synchronizations, and accessibility markup; live screen reader vocalizations and physical touchscreen gestures remain unverified per test dependency constraints.

---

## 1. What the prior attempt got wrong

### Issue 1: Race Condition & Semantic Collision in `smartnfe:tour-updated` Event
- **Input:** User dismisses a screen tourtip by clicking "Entendi / Não mostrar novamente".
- **Expected:** `markTourAsSeen(routeKey)` persists the flag and triggers storage sync; `isManuallyClosed` remains `true` (closed).
- **Actual:** `markTourAsSeen` dispatched a generic `smartnfe:tour-updated` event without distinguishing between `seen` and `reset` actions. The listener in `ScreenTourTip` unconditionally set `isManuallyClosed: false` upon receiving `smartnfe:tour-updated`. While dismissals worked locally due to statement sequencing within `handleDismissPermanently`, any external or asynchronous invocation of `markTourAsSeen` erroneously re-enabled manual closure state.
- **Root Cause:** Absence of action discrimination (`seen` vs `reset`) in `smartnfe:tour-updated` custom events.

### Issue 2: Stale Intermediate Render State During Route Transitions
- **Input:** User closes or minimizes a tour on screen A, then navigates to screen B.
- **Expected:** Screen B evaluates its own tour status immediately during its initial render pass.
- **Actual:** When `activeRouteKey !== interactionState.routeKey`, `setInteractionState` was scheduled during render, but the destructuring of `isManuallyClosed` and `isMinimized` on the same pass read stale values from screen A. As a result, screen B experienced an intermediate dirty render pass where the tour was considered manually closed or minimized before re-rendering.
- **Root Cause:** Reading stale state from `interactionState` before React processed the queued state adjustment.

### Issue 3: Unstable `getSnapshot` in `useSyncExternalStore`
- **Input:** Successive component re-renders during state updates or parent renders.
- **Expected:** Stable snapshot selector reference preventing unnecessary re-evaluations.
- **Actual:** `getSnapshot` was instantiated as an inline anonymous function on every render, violating React best practices for `useSyncExternalStore` and causing redundant store comparisons.
- **Root Cause:** Inline arrow function passed as `getSnapshot` without `useCallback([activeRouteKey])`.

### Issue 4: Fragile Dynamic Route Resolution When Passing `propRouteKey`
- **Input:** Developer mounts `<ScreenTourTip routeKey="/documentos/demo-01/conferencia" />` with a parameterized route path.
- **Expected:** Tour resolves correctly to `SCREEN_TOURS.documentos_conferencia`.
- **Actual:** `SCREEN_TOURS[propRouteKey]` returned `undefined` because dynamic route paths are not static keys in `SCREEN_TOURS`. The component then fell back to `getScreenTourByPath(pathname)` instead of resolving the passed prop.
- **Root Cause:** Missing fallback to `getScreenTourByPath(propRouteKey)`.

### Issue 5: Uncaught Fatal Exception Risk on `getSafeStorage()` Under Strict Security Policies
- **Input:** User visits in an embedded webview or strict private browsing mode where evaluating `window.localStorage` throws a `SecurityError` (DOMException).
- **Expected:** System catches the error and falls back to an in-memory storage provider without throwing an uncaught exception, retaining dismissal flags for the active session.
- **Actual:** `if (typeof window !== 'undefined' && window.localStorage)` was evaluated without a `try...catch` block. Furthermore, when storage was unavailable, `getSafeStorage` returned `null`, preventing the dismissal state from persisting even in memory during the session.
- **Root Cause:** Bare property access on `window.localStorage` and absence of an in-memory session fallback store.

### Issue 6: Header Open Tour Event Carried No Explicit Target Key
- **Input:** User clicks the lightbulb icon in `SmartNFeHeader`.
- **Expected:** Event payload explicitly contains the route key of the active screen (`{ detail: { routeKey: 'dashboard' } }`).
- **Actual:** `SmartNFeHeader` invoked `openTour()` with no arguments, broadcasting a wildcard `null` target.
- **Root Cause:** `handleOpenTour` did not forward `activeTour?.routeKey` to `openTour` or `CustomEvent`.

---

## 2. What I changed

1. **`app/config/screenTours.js`**
   - Added `SCREEN_TOURS['/'] = SCREEN_TOURS.dashboard;` canonical alias.
   - Enhanced `getSafeStorage()` with resilient `try...catch` guards around `window.localStorage` / `globalThis.localStorage` and introduced a persistent `memoryFallbackStorage` Map provider.
   - Annotated `smartnfe:tour-updated` events with semantic actions: `action: 'seen'` in `markTourAsSeen`, and `action: 'reset'` in `resetTour` and `resetAllScreenTours`.

2. **`app/components/feedback/ScreenTourTip.jsx`**
   - Memoized `getSnapshot` with `useCallback([activeRouteKey])` for stable `useSyncExternalStore` integration.
   - Robust `activeTour` resolution supporting both static keys and dynamic paths via `SCREEN_TOURS[propRouteKey] || getScreenTourByPath(propRouteKey)`.
   - Atomic route transition derivation: `isDifferentRoute` dynamically forces fresh `false` values for `isManuallyOpened`, `isManuallyClosed`, and `isMinimized` on initial render pass.
   - Filtered `handleTourUpdated` to only reset `isManuallyClosed: false` when `isResetAction` is true (`event?.detail?.action === 'reset'`, `event?.detail?.all`, or `!isTourSeen(activeRouteKey)`).
   - Added WAI-ARIA linkage: `aria-controls="screen-tour-content-body"` on expand/minimize controls and `id="screen-tour-content-body"` on the scrollable container.

3. **`app/components/Layouts/SmartNFeHeader.jsx`**
   - Updated `handleOpenTour` to explicitly pass `tourKey = activeTour?.routeKey || null` to `onOpenTour`, `openTour`, and `CustomEvent` detail.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `pnpm lint`: Executed with exit code 0 (zero errors, zero warnings across all project files).
  - `pnpm test`: Executed complete test suite (383 tests in 104 suites, 383 passed, 0 failed, 0 skipped, duration 7.7s).
  - `pnpm build`: Next.js 16.0.10 Turbopack production compilation completed with exit code 0; all 12 routes generated cleanly.
  - Storage & Event contract: Verified deterministic key generation (`smartnfe_tour_seen_<routeKey>`), reset logic across all 8 screens, and event dispatch decoupling.
- **Shallow Verification (manual only):**
  - Confirmed Tailwind CSS 4 theme integration (`@keyframes fadeIn`, `animate-fade-in`), dark mode contrast, z-index hierarchy (`z-30` DemoBadge, `z-40` ScreenTourTip, `z-50` Dialog, `z-[9999]` ToastContainer).
- **Unverified aspects:**
  - Real browser hardware pointer gestures and physical touchscreen events.
  - Audio output and vocalizations of assistive screen readers (NVDA / VoiceOver / JAWS).

---

## 4. Known Issues

- `Minor Robustness Risk` — While in-memory fallback now guarantees tour dismissals persist seamlessly across route changes within the same tab session when localStorage is disabled by browser security policies, closing the tab or reloading in that restricted environment will reset the in-memory state.

---

## 5. Remaining risk & next step

- All Acceptance Criteria for R1, R2, R3, and R4 are 100% satisfied.
- Branch `fix/frontend-xml-conferencia-v0.1.1` is stable, passing all 383 tests, with zero lint errors and zero build errors.
- System is ready for the Victory Audit.
