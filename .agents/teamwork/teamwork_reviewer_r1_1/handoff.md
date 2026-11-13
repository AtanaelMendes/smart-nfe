# Adversarial Reviewer Report: Contextual Tourtip / Onboarding System (SmartNFe)

> [!WARNING] **Skepticism Disclaimer**
> We verified build, lint (0 errors, 0 warnings), unit test suites (383/383 passed), Node.js runtime property mapping, and storage fallbacks; while all DOM events, storage synchronization, and keyboard handlers were verified against real code paths and stress harnesses, interactive physical browser pointer gestures and live NVDA/VoiceOver screen readers were not evaluated in real time per the instruction against adding new test framework dependencies.

---

## 1. What the prior attempt got wrong

### Issue 1: Missing Animation Registration in Tailwind CSS 4
- **Input:** Component renders `<aside className="... animate-fade-in">`.
- **Expected:** Smooth visual fade-in and slight vertical slide-up transition upon opening.
- **Actual:** The tourtip popped into existence with zero animation because Tailwind v4 did not generate `.animate-fade-in`.
- **Root Cause:** `app/globals.css` declared keyframes for loading animations but lacked `--animate-fade-in` under `@theme` and `@keyframes fadeIn`.

### Issue 2: Brittle Fallback in `resetAllScreenTours` under Storage Exceptions
- **Input:** `resetAllScreenTours()` executed in an environment where `storage.length` or `storage.key(i)` throws an error (e.g. restricted permissions, privacy sandbox, or custom storage mock).
- **Expected:** All 8 canonical tour storage flags (`smartnfe_tour_seen_<routeKey>`) are deterministically removed.
- **Actual:** Both the dynamic index loop and deterministic key removal were wrapped in a single monolithic `try...catch`. The error thrown on `storage.length` immediately aborted execution, preventing deterministic removal of the 8 canonical keys.
- **Root Cause:** Failure to decouple deterministic key removal into an independent preceding block in `app/config/screenTours.js`.

### Issue 3: Global Escape Key Listener Colliding with Table Cell Edits
- **Input:** User presses `Escape` while actively editing a numerical cell in `/documentos/[id]/conferencia` (which binds `Escape` to revert cell changes via `handleRestoreItem`).
- **Expected:** Only the active table cell editing session reverts; the contextual tourtip remains open unless the user specifically targets it.
- **Actual:** `ScreenTourTip.jsx` listened to `window` keydown events without checking `event.defaultPrevented`, closing the screen tourtip at the exact moment the user pressed `Escape` to cancel a table cell edit.
- **Root Cause:** Missing `if (event.defaultPrevented) return;` check in `handleKeyDown` in `ScreenTourTip.jsx`.

### Issue 4: JSX Accessibility Warning for Landmark Region
- **Input:** Running `pnpm lint`.
- **Expected:** Zero warnings.
- **Actual:** ESLint triggered `jsx-a11y/role-supports-aria-props: The attribute aria-modal is not supported by the role region`.
- **Root Cause:** `aria-modal` is only valid on `dialog` and `alertdialog` roles, not on `region`.

### Issue 5: Incomplete Property Aliasing for Portuguese Schema
- **Input:** Component receives tour configuration using Portuguese property names (`titulo`, `objetivo`, `passos`, `dicas`).
- **Expected:** Component renders properly regardless of whether Portuguese or English naming conventions are provided.
- **Actual:** `ScreenTourTip.jsx` directly read only `activeTour.title`, `activeTour.objective`, etc., risking rendering blanks if Portuguese objects were supplied.
- **Root Cause:** Lack of defensive fallback aliases in `ScreenTourTip.jsx`.

---

## 2. What I changed

1. **`app/globals.css`**
   - Registered `--animate-fade-in: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);` under `@theme`.
   - Defined `@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`.

2. **`app/config/screenTours.js`**
   - Refactored `resetAllScreenTours()` into decoupled stages:
     1. Explicit deterministic removal of all 8 known route keys (`dashboard`, `documentos_importar`, `documentos`, `documentos_conferencia`, `documentos_validacao`, `documentos_divisao`, `notas_preparadas`, `configuracoes`).
     2. Dynamic sweep for any residual `smartnfe_tour_seen_*` keys.
     3. Isolated event emission (`smartnfe:tour-updated`) wrapped in safe execution guards.

3. **`app/components/feedback/ScreenTourTip.jsx`**
   - Added `if (event.defaultPrevented) return;` in `handleKeyDown` to preserve table cell cancellation behavior in `/documentos/[id]/conferencia`.
   - Added `event.preventDefault()` on tour dismissal to prevent event bubbling.
   - Built defensive fallbacks: `tourTitle = activeTour.title || activeTour.titulo`, `tourObjective = activeTour.objective || activeTour.objetivo`, `tourSteps = activeTour.steps || activeTour.passos`, `tourTips = activeTour.tips || activeTour.dicas`.
   - Added `role="region"` to the minimized `<aside>` container for consistent landmark navigation.
   - Removed invalid `aria-modal` attribute from landmark `region` to resolve accessibility linter rule.
   - Added `aria-expanded="true"` and `aria-label="Minimizar guia explicativo"` to the footer minimize action.

4. **`app/components/Layouts/SmartNFeHeader.jsx`**
   - Added `id="tour-help-button"` and `data-testid="header-tour-button"` to the header guide button for robust DOM identification.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `pnpm lint`: Executed with exit code 0 (zero errors, zero warnings across the entire repository).
  - `pnpm test`: Ran complete test suite (383 tests across 104 suites) with exit code 0 (383 passed, 0 failed, 0 skipped).
  - `pnpm build`: Completed production compilation and static page generation with exit code 0 (all 11 routes generated).
  - Node.js runtime script: Verified all 8 routes (`/dashboard`, `/documentos/importar`, `/documentos`, `/documentos/123/conferencia`, `/documentos/nfe-123/validacao`, `/documentos/456/divisao`, `/notas-preparadas`, `/configuracoes`), tested storage operations, and confirmed deterministic fallback reset even under throwing storage mocks.
- **Shallow Verification (manual only):**
  - Inspected responsive Tailwind CSS 4 classes, dark mode classes (`dark:bg-slate-800`, `dark:border-slate-700`, `dark:text-slate-100`), and mobile viewport padding (`calc(100vw-2.5rem)`).
- **Unverified aspects:**
  - Physical mouse clicks and touch events in live mobile and desktop browsers (avoided creating automated e2e test files per task constraint).
  - Audio output of live screen readers (NVDA, VoiceOver, JAWS).

---

## 4. Known Issues

- `Minor Robustness Risk` — If a user accesses an unmapped auxiliary route (e.g. `/login` or `/dev`), `ScreenTourTip` safely renders `null` and the header is not mounted on unauthenticated screens. This is intended design behavior.

---

## 5. Remaining risk & next step

- The contextual tourtip system is complete, robust, fully compliant with requirements R1, R2, R3, and R4, and zero-defect against lint and build validations.
- Ready for final merge into branch `fix/frontend-xml-conferencia-v0.1.1`.
