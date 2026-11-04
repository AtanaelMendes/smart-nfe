## 2026-11-04T19:08:35Z
From: a9e44541-179a-4e3d-a02e-7a5492fb14f5
Content:
You are Screen Worker B (teamwork_worker).
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_screens_b\
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
- c:\www\smart-nfe\app\documentos\[id]\divisao\page.jsx
- c:\www\smart-nfe\app\documentos\[id]\validacao\page.jsx

TASKS:
1. Inspect and polish `app/documentos/[id]/divisao/page.jsx`:
   - Multi-destination invoice splitting: loads document via `invoiceRepository.findById(id)`.
   - Allows defining 2 or more destination notes (Nota Destino 1, Nota Destino 2, etc.) with CNPJ, Razão Social, and UF/País.
   - Table of items with original quantity, and inputs for quantity assigned to each destination.
   - Real-time remaining balance calculations (`divisionMath.js` or `decimal.js`), showing status badges (OK verde 100% distribuído, Restante amarelo saldo restante, Excesso vermelho saldo excedido).
   - Validation blocking: cannot finalize if any item has excess or unallocated remaining balance.
   - Action: "Finalizar Divisão / Gerar Notas Preparadas", which creates entries in `preparedInvoiceRepository.create()`, updates original invoice status to 'dividida', displays success toast, and redirects to `/notas-preparadas`.
   - Wrap in AppLayout, DemoBadge, AppContext toast notifications.
2. Inspect and polish `app/documentos/[id]/validacao/page.jsx`:
   - Loads document via `invoiceRepository.findById(id)` and `invoiceRepository.getValidationIssues(id)`.
   - Displays fiscal inconsistencies especially for `demo-04` (e.g. CFOP vs Destino exportação divergente, NCM incompleto, alíquotas).
   - Categorizes issues by severity: Erros bloqueantes vs Alertas.
   - Interactive Assistente de Correção with suggested solutions and 1-click action to fix or link to `/documentos/[id]/conferencia`.
   - Clean empty state when document has zero errors (all green / "Nenhuma inconsistência fiscal detectada").
   - Wrap in AppLayout, DemoBadge, AppContext toast notifications.
3. Verification:
   - Run ESLint on the touched files (`npx eslint app/documentos/[id]/divisao app/documentos/[id]/validacao`).
   - Smoke test live routes using fetch:
     - `http://localhost:3000/documentos/demo-01/divisao` -> 200 OK
     - `http://localhost:3000/documentos/demo-04/validacao` -> 200 OK
   - Run existing unit tests: `node --no-warnings --test tests/tier1/*.test.mjs` to ensure no regressions.
4. Delivery:
   - Write your handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_worker_screens_b\handoff.md`.
   - Send completion message to orchestrator with summary of changes and verification results.
