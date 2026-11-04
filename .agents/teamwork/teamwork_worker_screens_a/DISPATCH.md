## 2026-11-04T19:08:24Z
You are Screen Worker A (teamwork_worker).
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_screens_a\
Original Request path: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Scope document: c:\www\smart-nfe\PROJECT.md

MANDATORY: Read c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md and c:\www\smart-nfe\PROJECT.md before doing any modifications.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL USER INSTRUCTIONS:
- O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário).
- NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente.
- Apenas crie, edite arquivos e realize testes ou verificações que não derrubem nem conflitem com o servidor já ativo (use node --test ou node -e "fetch(...)" para checar HTTP 200 nas rotas).

EXCLUSIVE WRITE OWNERSHIP:
You own and may ONLY edit the following files:
- c:\www\smart-nfe\app\documentos\importar\page.jsx
- c:\www\smart-nfe\app\notas-preparadas\page.jsx
- c:\www\smart-nfe\app\configuracoes\page.jsx

TASKS:
1. Inspect and polish `app/documentos/importar/page.jsx`:
   - Interactive drag-and-drop XML/PDF simulation (accepts XML/PDF, displays file name, size, parsing progress/simulation).
   - 5 quick demo cards (`demo-01` to `demo-05`) with realistic descriptions, badge, and 1-click loading/redirecting to `/documentos/[id]/conferencia` or `/documentos`.
   - Wrap in AppLayout, DemoBadge, AppContext toast notifications.
2. Inspect and polish `app/notas-preparadas/page.jsx`:
   - List of prepared/split invoices from `preparedInvoiceRepository.list()`.
   - Display number of items, destination company (Razão Social/CNPJ), total value (formatted BRL), date, actions (Visualizar Espelho DANFE modal, Download XML simulado com toast de sucesso, Excluir com confirmação).
   - Empty state when no prepared invoices exist, with clear call-to-action button to navigate to `/documentos` or split an invoice.
3. Inspect and polish `app/configuracoes/page.jsx`:
   - UI preferences: table density (confortável / compacta), items per page (10, 25, 50), theme toggle, autoSave toggle.
   - Master "Restaurar Dados de Demonstração (resetAll)" with confirmation modal and success toast, properly calling `localStorageService.resetAll()` and `invoiceRepository.resetDemoData()`.
4. Verification:
   - Run ESLint on the touched files (`npx eslint app/documentos/importar app/notas-preparadas app/configuracoes`).
   - Smoke test live routes using fetch:
     - `http://localhost:3000/documentos/importar` -> 200 OK
     - `http://localhost:3000/notas-preparadas` -> 200 OK
     - `http://localhost:3000/configuracoes` -> 200 OK
   - Run existing unit tests: `node --no-warnings --test tests/tier1/*.test.mjs` to ensure no regressions.
5. Delivery:
   - Write your handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_worker_screens_a\handoff.md`.
   - Send completion message to orchestrator with summary of changes and verification results.
