## 2026-11-04T14:39:57Z
You are an exploration agent (teamwork_explorer).
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7

MANDATORY: Read before starting:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1_foundation\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1\survey_codebase.md

OBJECTIVE:
Formulate the exact implementation and fix strategy for Milestone 1: Layout & Shell Components:
1. `app/components/Layouts/DemoBadge.jsx`: Fix badge text from "DEMO" to "Modo Demonstração" (acceptance criterion 60).
2. `app/components/Layouts/SmartNFeSidebar.jsx`: Expose "Importar" at the root level alongside Dashboard, Documentos, Notas Preparadas, Configurações (acceptance criterion 59).
3. `app/components/Layouts/SmartNFeHeader.jsx` & `AppLayout.jsx`: Review and ensure clean integration with breadcrumbs, dark mode toggle, DemoBadge, and ToastContainer.
4. `app/context/AppContext.jsx`: Review toast notifications and settings state.

HARD CONSTRAINTS:
- The project is already running at http://localhost:3000/dashboard. DO NOT run `pnpm build` or `pnpm dev`.
- Read-only exploration. DO NOT modify any code files. Recommend concrete changes with exact code snippets.

OUTPUT:
- Write strategy report to: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\strategy_layout.md
- Write standard handoff to: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\handoff.md
- Send message to caller (3aeeebdd-68a6-49e6-8f40-494114a9f1f7) when complete.
