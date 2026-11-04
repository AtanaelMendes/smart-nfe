## 2026-11-04T14:51:03Z
[Message] timestamp=2026-11-04T14:51:03Z sender=3aeeebdd-68a6-49e6-8f40-494114a9f1f7 priority=MESSAGE_PRIORITY_HIGH content=You are an implementation worker agent (teamwork_worker).
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m1\
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUTS:
Read these before writing code:
1. c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\www\smart-nfe\PROJECT.md
3. c:\www\smart-nfe\.agents\teamwork\sub_orch_m1_foundation\SCOPE.md
4. c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\strategy_layout.md (layout, sidebar, demo badge, app context)
5. c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\strategy_dashboard.md (dashboard page, mock data baseline, formatters)
6. c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_3\strategy_components_verification.md (DataTable, InputFile, Dialog, eslint.config, test script)

CRITICAL USER CONSTRAINT:
The project is already running at http://localhost:3000/dashboard (active dev server run externally by user).
DO NOT run build commands (`pnpm build`, `npm run build`) and DO NOT start dev servers (`pnpm dev`, `npm run dev`), to avoid port conflicts or environment freezes.

OBJECTIVE & OWNED FILES:
Implement Milestone 1 (Foundation & Dashboard) completely and cleanly:
1. `app/components/Layouts/DemoBadge.jsx`: Set text to "Modo Demonstração" with amber indicator and data-testid="demo-badge".
2. `app/components/Layouts/SmartNFeSidebar.jsx`: 5 root menus (Dashboard, Documentos, Importar [/documentos/importar], Notas Preparadas, Configurações). Refined active route highlighting.
3. `app/components/Layouts/SmartNFeHeader.jsx`, `AppLayout.jsx`, `ToastContainer.jsx`: Dark mode classes, breadcrumbs, non-blocking toast container.
4. `app/context/AppContext.jsx`: Memoized `toast` (`success`, `error`, `warning`, `info`) and `settings`, lazy initializer for darkMode, export `DEFAULT_SETTINGS`.
5. `app/components/table/DataTable.jsx`: Refactor to eliminate React 19 / ESLint 9 cascading re-renders, useMemo for data derivation, explicit `columns` support with `render(item, index)`, static Tailwind 4 ALIGN_MAP, dense mode, dark mode.
6. `app/components/inputs/InputFile.jsx`: Case-insensitive XML/PDF support, 10MB limit, clear button, toast integration.
7. `app/components/Layouts/Dialog.jsx`: Remove synchronous setState in effect, clean event-based state reset, dark mode.
8. `eslint.config.mjs`: Remove `nextTs` import, ignore dead template code (`app/dev/`, `photo-modal.js`, `plugins/`).
9. `app/lib/formatters/currency.js`: `formatBRL`, `parseBRL`.
10. `app/lib/formatters/dates.js`: `formatDateBR`, `formatDateTimeBR` using native `Intl.DateTimeFormat` (NO moment).
11. `app/lib/formatters/status.js`: `getStatusBadge`, `getStatusLabel`.
12. `app/lib/data/mockInvoices.js`: 5 rich demo scenarios (`demo-01` to `demo-05`) and `getDashboardKPIs()`.
13. `app/dashboard/page.jsx`: Complete re-implementation using `AppLayout`. Zero auth check / no login redirect. 5 KPI summary cards, quick action demo buttons, recent documents table using `DataTable` with explicit columns.
14. `tests/tier1/m1_foundation.test.mjs`: Automated test script using Node 24 test runner (`node:test`).

VERIFICATION REQUIREMENTS:
Run these commands and document exact outputs in your handoff report:
1. `node --no-warnings --test tests/tier1/m1_foundation.test.mjs`
2. `npx eslint app/dashboard/page.jsx app/components/Layouts/SmartNFeSidebar.jsx app/components/Layouts/DemoBadge.jsx app/components/table/DataTable.jsx app/components/Layouts/Dialog.jsx app/context/AppContext.jsx app/lib/formatters/currency.js app/lib/formatters/dates.js app/lib/formatters/status.js app/lib/data/mockInvoices.js`
3. `node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(t => console.log('HTTP 200 length:', t.length, 'Modo Demo:', t.includes('Modo Demonstração'), 'Painel:', t.includes('Painel Operacional')))"`

OUTPUT:
- Write standard handoff to: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m1\handoff.md
- When done, send message to caller (3aeeebdd-68a6-49e6-8f40-494114a9f1f7) with summary, verified test results, and report path.
