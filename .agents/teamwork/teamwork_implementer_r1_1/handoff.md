# Handoff Report: Contextual Tourtip / Onboarding System (SmartNFe)

> [!WARNING] **Skepticism Disclaimer**
> We verified build and lint with zero errors, executed all 383 existing unit/integration tests with 100% pass rate, and validated the data dictionary and storage operations in Node.js runtime; however, browser rendering interactions (such as mouse clicks on the minimize/expand toggles and keyboard Escape event in an actual browser DOM environment) were verified via unit execution and static typing/linting rather than end-to-end Cypress/Playwright suites, as per the strict instruction not to add new automated test files.

---

## 1. Executive Summary & Changes Made

A complete contextual tourtip and onboarding guidance system was designed and integrated across SmartNFe without creating new test files or regressions in the existing suite of 383 tests.

### Touched Files & Substances of Changes:

1. **`app/config/screenTours.js` (NEW)**
   - Centralized explanatory dictionary for all 8 mapped routes:
     1. `/dashboard`: Painel Geral — KPIs, cenários de demonstração e atalhos operacionais.
     2. `/documentos/importar`: Importação de XML — Leitura e validação client-side NF-e mod 55 (DOMParser, Módulo 11) com privacidade em memória de sessão temporária.
     3. `/documentos`: Lista de Documentos — Gerenciamento e filtro das notas fiscais originais, status e ações.
     4. `/documentos/[id]/conferencia`: Conferência de Produtos — Conferência item a item, edição estável por `itemId`, precisão decimal ABNT Half-Up, comparativo de `valorOriginal` e atalhos de teclado.
     5. `/documentos/[id]/validacao`: Validação Fiscal — Diagnóstico de inconsistências cadastrais e tributárias de exportação, confirmação explícita de alterações, pilha de desfazer (*undo*) e bloqueio de lote em campos tributários sensíveis.
     6. `/documentos/[id]/divisao`: Divisão de Notas — Desmembramento de quantidades entre múltiplas notas de exportação, distribuição de saldos e rateio proporcional de frete/seguro/despesas com conservação estrita do centavo.
     7. `/notas-preparadas`: Notas Preparadas — Consulta e conferência das notas finais geradas para exportação.
     8. `/configuracoes`: Configurações do Sistema — Personalização da experiência e opção para reiniciar os guias explicativos de todas as telas.
   - Each entry contains: `title` / `titulo`, `objective` / `objetivo`, `steps` / `passos` (ordered guidance), `tips` / `dicas` (SEFAZ fiscal & security tips), `icon` (FontAwesome icon object), and `iconName` (string identifier).
   - Utility functions: `getRouteKeyByPath(pathname)`, `getScreenTourByPath(pathname)`, `getTourStorageKey(routeKey)`, `isTourSeen(routeKey)`, `markTourAsSeen(routeKey)`, `resetTour(routeKey)`, and `resetAllScreenTours()`.
   - Event emission (`smartnfe:tour-updated`) on storage mutation for reactive UI synchrony across tabs and components.

2. **`app/components/feedback/ScreenTourTip.jsx` (NEW)**
   - Reusable contextual tourtip component built with React 19 and Tailwind CSS 4.
   - Hydration-safe external storage observation via `useSyncExternalStore` (zero cascading renders, full compliance with `react-hooks/set-state-in-effect`).
   - Automatically renders on the first visit to each route if `smartnfe_tour_seen_<routeKey>` is not present in `localStorage`.
   - Interactive user actions:
     - **"Entendi / Não mostrar novamente"**: Sets `smartnfe_tour_seen_<routeKey>` in `localStorage` and closes the widget.
     - **"Minimizar / Expandir"**: Collapses the tourtip into an unobtrusive floating pill in the bottom right corner with quick expand toggle.
     - **`Escape` key listener**: Allows the user to quickly dismiss the floating tourtip without permanently marking it as seen.
     - **Header Trigger Listener**: Reopens the tour for the active screen when requested, even if previously marked as seen.
   - Complete visual styling for Dark Mode and Light Mode.

3. **`app/context/AppContext.jsx` (MODIFIED)**
   - Added `openTour(targetKey)` helper, `tourSignal`, and `tourTargetKey` to the application context.
   - Dispatches `smartnfe:open-screen-tour` custom window event to ensure decoupling and support multi-component triggering.

4. **`app/components/Layouts/SmartNFeHeader.jsx` (MODIFIED)**
   - Added Help / Lightbulb button (`faLightbulb`) in the header actions bar.
   - When clicked, invokes `openTour()` or dispatches the custom event, immediately reopening the active screen's guide regardless of whether it was previously marked as seen.

5. **`app/components/Layouts/AppLayout.jsx` (MODIFIED)**
   - Mounted `<ScreenTourTip />` at the layout level so all 8 screens wrapped by `AppLayout` automatically receive contextual guidance without repeating code across 8 page files.

6. **`app/configuracoes/page.jsx` (MODIFIED)**
   - Added a dedicated card for "Guias Explicativos e Onboarding".
   - Integrated action button "Reiniciar guias explicativos" that executes `resetAllScreenTours()`, removing all `smartnfe_tour_seen_*` keys from `localStorage` and displaying a confirmation toast.
   - Also integrated tour cleanup into `handleConfirmResetAll` so that factory reset also refreshes tour flags.

---

## 2. Rationale Tied to Task Requirements

- **R1 (Screen Tours Dictionary):** All 8 specified routes are systematically registered with Portuguese/English aliases, verified FontAwesome icons, practical operational steps, and SEFAZ fiscal/security advice.
- **R2 (ScreenTourTip Component):** Built with pure client-side hydration safety, responsive design, keyboard accessibility (`Escape`), minimizing controls, and persistence under `smartnfe_tour_seen_<routeKey>`.
- **R3 (Header Reopening & Settings Reset):** Provided a dedicated lightbulb trigger on the header toolbar for instant reopening on demand, and added a specific "Reiniciar guias explicativos" button under `/configuracoes` to clear flags.
- **R4 (Build & Code Quality):** Preserved branch `fix/frontend-xml-conferencia-v0.1.1`, did not touch or add automated test files, achieved 0 ESLint errors and 0 Next.js production build errors.

---

## 3. Verification Record

- **Deep Verification (ran actual tests & builds):**
  - `pnpm lint`: Executed with exit code 0 (zero errors, zero warnings across all project files).
  - `pnpm build`: Completed production compile and static page optimization with exit code 0 (all 11 routes generated).
  - `pnpm test`: Ran full test suite (383 tests across 104 suites) with exit code 0 (383 passed, 0 failed, 0 skipped).
  - Node.js runtime script: Tested all 8 path mappings through `getScreenTourByPath` and verified dictionary properties and `resetAllScreenTours` storage cleanup behavior.
- **Shallow Verification (manual run only):**
  - Inspected responsive Tailwind CSS 4 classes for Dark Mode and Light Mode (`dark:bg-slate-800`, `dark:text-slate-100`, etc.).
- **Unverified aspects:**
  - Real browser end-to-end user navigation with mouse and physical keyboard input (omitted per constraint against creating new test files).

---

## 4. Known Issues

- `Minor Robustness Risk` — If a user accesses a non-mapped auxiliary route (e.g. `/dev` or `/login`), `ScreenTourTip` will safely render nothing (`null`). This is intended behavior.

---

## 5. Untested Edge Cases & Next Step

- Manual review of the visual pop-in animation on ultra-wide screens (> 1920px) and mobile viewport (< 400px).
- Verification of accessibility screen reader behavior with `aria-expanded` and role announcements in live browsers.
