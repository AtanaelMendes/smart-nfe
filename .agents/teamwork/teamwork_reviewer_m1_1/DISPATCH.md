## 2026-11-04T15:02:35Z

You are a review agent (teamwork_reviewer).
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_reviewer_m1_1\
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7

MANDATORY INPUTS:
Read these before starting:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1_foundation\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m1\handoff.md

CRITICAL USER CONSTRAINT:
The dev server is active at http://localhost:3000/dashboard. DO NOT run `pnpm build` or `pnpm dev`.

OBJECTIVE:
Review the Layout & Foundation deliverables of Milestone 1:
1. `app/components/Layouts/DemoBadge.jsx`: Verify "Modo Demonstração", amber pulse, testid, non-blocking.
2. `app/components/Layouts/SmartNFeSidebar.jsx`: Verify 5 root menus (Dashboard, Documentos, Importar, Notas Preparadas, Configurações), active route logic.
3. `app/components/Layouts/SmartNFeHeader.jsx`, `AppLayout.jsx`, `ToastContainer.jsx`: Dark mode classes, breadcrumbs, toasts.
4. `app/context/AppContext.jsx`: Lazy state initialization, memoized toast and settings, DEFAULT_SETTINGS.
5. `app/components/table/DataTable.jsx`: React 19 compliance, columns support with render callback, ALIGN_MAP for Tailwind 4, dense mode.
6. `app/components/inputs/InputFile.jsx` and `app/components/Layouts/Dialog.jsx`.
7. `eslint.config.mjs`: No TypeScript, ignores dead template files.

VERIFICATION COMMANDS:
1. Run: `node --no-warnings --test tests/tier1/m1_foundation.test.mjs`
2. Run: `npx eslint app/components/Layouts/DemoBadge.jsx app/components/Layouts/SmartNFeSidebar.jsx app/components/Layouts/SmartNFeHeader.jsx app/components/Layouts/AppLayout.jsx app/context/AppContext.jsx app/components/table/DataTable.jsx app/components/inputs/InputFile.jsx app/components/Layouts/Dialog.jsx`

OUTPUT:
- Write full review to: c:\www\smart-nfe\.agents\teamwork\teamwork_reviewer_m1_1\review_layout_foundation.md
- Write standard handoff to: c:\www\smart-nfe\.agents\teamwork\teamwork_reviewer_m1_1\handoff.md with explicit verdict: APPROVE or REQUEST_CHANGES.
- Notify caller via send_message.
