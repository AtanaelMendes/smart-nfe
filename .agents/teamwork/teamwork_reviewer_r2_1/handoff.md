# Adversarial Reviewer Report (Round 2): Contextual Tourtip / Onboarding System (SmartNFe)

> [!WARNING] **Skepticism Disclaimer**
> While static compilation, production builds, full test suites (383/383 passed), route mappings across all 8 routes, modal escape guards, and z-index stacking orders have been verified programmatically, physical pointer drag interactions and auditory output from assistive screen readers were not verified in live browser sessions per the constraint against new test harness dependencies.

---

## 1. What the prior attempt got wrong

### Issue 1: Header Lightbulb Button Lacked Route Awareness, Screen Titles, and Disabled State
- **Input:** User navigates to a non-tour screen (such as `/dev` or `/login`), or accesses the header on any mapped screen.
- **Expected:** When on an unmapped screen, the lightbulb button should be disabled (`disabled={true}`, `aria-disabled="true"`), grayed out (`cursor-not-allowed opacity-50`), and show title/aria-label stating `"Nenhum guia explicativo disponível para esta tela"`. When on a mapped screen, it should display a screen-specific tooltip and aria-label matching the active route (e.g., `"Guia explicativo: Painel Geral"`).
- **Actual:** `SmartNFeHeader.jsx` did not inspect `usePathname()` or `getScreenTourByPath()`. The button was permanently enabled with a generic `"Guia explicativo da tela"` title. On unmapped screens, clicking the button silently fired events into the void with zero feedback.
- **Root Cause:** Missing route-awareness and state computation via `usePathname()` and `getScreenTourByPath()` in `SmartNFeHeader.jsx`.

### Issue 2: DemoBadge z-index (z-50) Obscuring ScreenTourTip Footer on Mobile Viewports
- **Input:** Mobile user (< 640px viewport) views the expanded tourtip (`w-[calc(100vw-2.5rem)]`).
- **Expected:** `ScreenTourTip` card and its primary action button ("Entendi / Não mostrar novamente") are unobstructed and easily clickable.
- **Actual:** `DemoBadge.jsx` was hardcoded to `z-50` at `bottom-3 left-1/2 -translate-x-1/2`, while `ScreenTourTip` was set to `z-40`. On compact screens, the fixed demo badge rendered directly on top of the tourtip footer.
- **Root Cause:** Inverted stacking context order: decorative badge was set higher (`z-50`) than interactive onboarding feedback components (`z-40`).

### Issue 3: Escape Key Collision Between Dialog Modals and Contextual Tourtip
- **Input:** User has `ScreenTourTip` open and triggers a modal dialog (such as confirmation modal in `/configuracoes` or `/documentos/[id]/validacao`), then presses `Escape` to cancel the modal.
- **Expected:** Only the foreground modal dialog closes; the contextual tourtip in the background remains in its current state.
- **Actual:** `Dialog.jsx` handled `Escape` without calling `e.preventDefault()`, and `ScreenTourTip.jsx` listened unconditionally to `window.addEventListener('keydown')` without checking for foreground modal dialogs. Consequently, pressing `Escape` dismissed both the modal AND the tourtip simultaneously.
- **Root Cause:** Missing active modal guard (`document.querySelector('[role="dialog"], [aria-modal="true"]')`) in `ScreenTourTip.jsx` and missing `e.preventDefault()` in `Dialog.jsx`.

### Issue 4: Fragmented React State Updates During Render in ScreenTourTip
- **Input:** Next.js client-side route navigation changes `activeRouteKey`.
- **Expected:** Atomic state reset without multiple successive re-renders during render phase.
- **Actual:** Four distinct `setState` calls (`setCurrentRouteKey`, `setIsManuallyOpened`, `setIsManuallyClosed`, `setIsMinimized`) were executed sequentially in the render body.
- **Root Cause:** Lack of state consolidation into a single atomic `interactionState` object.

### Issue 5: Settings "Reiniciar guias explicativos" Did Not Re-enable Tours in Same Page Session
- **Input:** User on `/configuracoes` manually dismisses the tour, then clicks "Reiniciar guias explicativos".
- **Expected:** Local storage flags are removed AND the manual closure state is reset so the guide can re-display.
- **Actual:** `isManuallyClosed` remained `true` in React state because `ScreenTourTip` only listened for storage events but did not reset manual dismissal on `smartnfe:tour-updated`.
- **Root Cause:** Absence of a listener for `smartnfe:tour-updated` resetting `isManuallyClosed` in `ScreenTourTip.jsx`.

---

## 2. What I changed

1. **`app/components/Layouts/SmartNFeHeader.jsx`**
   - Imported `usePathname` and `getScreenTourByPath`.
   - Added dynamic computation of `hasTour = Boolean(onOpenTour || activeTour)`.
   - Added disabled states (`disabled={!hasTour}`, `aria-disabled={!hasTour}`) with disabled styling (`text-gray-300 dark:text-slate-600 cursor-not-allowed opacity-50`).
   - Added contextual tooltips and aria-labels: `"Guia explicativo: <Nome da Tela>"` when available, and `"Nenhum guia explicativo disponível para esta tela"` when unavailable.

2. **`app/components/Layouts/DemoBadge.jsx`**
   - Lowered z-index from `z-50` to `z-30` so interactive contextual tourtips (`z-40`) and modal dialogs (`z-50`) sit strictly on top of the demonstration badge across mobile and desktop breakpoints.

3. **`app/components/Layouts/Dialog.jsx`**
   - Added `e.preventDefault()` to the Escape keyboard handler before invoking `closeDialog()`.

4. **`app/components/feedback/ScreenTourTip.jsx`**
   - Consolidated state into atomic `interactionState` (`routeKey`, `isManuallyOpened`, `isManuallyClosed`, `isMinimized`), eliminating cascading `setState` calls in render.
   - Added active modal detection guard on `Escape`: `document.querySelector('[role="dialog"], [aria-modal="true"]')`. If a foreground modal is active, the tourtip ignores the `Escape` key.
   - Added event listener for `smartnfe:tour-updated` to reset `isManuallyClosed: false` when tours are reset from the settings page.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `pnpm lint`: Executed with exit code 0 (zero errors, zero warnings across all files).
  - `pnpm test`: Executed complete test suite (383 tests in 104 suites, 383 passed, 0 failed, 0 skipped).
  - `pnpm build`: Next.js Turbopack production compilation completed with exit code 0; all 11 routes generated successfully (Static & Dynamic).
  - Ephemeral Node.js verification script: Verified all 8 canonical routes (`/dashboard`, `/documentos/importar`, `/documentos`, `/documentos/[id]/conferencia`, `/documentos/[id]/validacao`, `/documentos/[id]/divisao`, `/notas-preparadas`, `/configuracoes`), query parameters, hash anchors, trailing slashes, unmapped routes returning null, storage key format `smartnfe_tour_seen_<routeKey>`, and deterministic removal logic.
- **Shallow Verification (manual only):**
  - Verified visual dark mode classes, Tailwind 4 keyframes, and z-index hierarchy (`z-30` DemoBadge, `z-40` ScreenTourTip, `z-50` Dialog, `z-[9999]` ToastContainer).
- **Unverified aspects:**
  - Real browser hardware pointer gestures and touch events on physical mobile devices.
  - Live assistive screen reader vocalization (NVDA / VoiceOver / JAWS).

---

## 4. Known Issues

- `Minor Robustness Risk` — If a user has `localStorage` disabled entirely by strict browser security policies (e.g. Incognito in some restrictive environments), `getSafeStorage` falls back gracefully without throwing exceptions, meaning the tour may display on every fresh visit rather than persisting the dismissal.

---

## 5. Remaining risk & next step

- All 4 requirements (R1, R2, R3, R4) are verified and fulfilled with 0 lint errors, 0 build errors, and 383/383 passing tests.
- Task is complete and ready for pull request merge on branch `fix/frontend-xml-conferencia-v0.1.1`.
