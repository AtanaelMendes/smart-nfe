# BRIEFING — 2026-11-04T19:15:20Z

## Mission
Implement and polish screens /documentos/importar, /notas-preparadas, and /configuracoes for SmartNFe MVP.

## 🔒 My Identity
- Archetype: teamwork_worker
- Roles: implementer, qa, specialist
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_screens_a
- Original parent: a9e44541-179a-4e3d-a02e-7a5492fb14f5
- Milestone: M3 / M5 Screen Implementation (Importar, Notas Preparadas, Configuracoes)

## 🔒 Key Constraints
- O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário).
- NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente.
- Apenas crie, edite arquivos e realize testes ou verificações que não derrubem nem conflitem com o servidor já ativo (use node --test ou node -e "fetch(...)" para checar HTTP 200 nas rotas).
- EXCLUSIVE WRITE OWNERSHIP:
  - c:\www\smart-nfe\app\documentos\importar\page.jsx
  - c:\www\smart-nfe\app\notas-preparadas\page.jsx
  - c:\www\smart-nfe\app\configuracoes\page.jsx

## Current Parent
- Conversation ID: a9e44541-179a-4e3d-a02e-7a5492fb14f5
- Updated: not yet

## Task Summary
- **What to build**: Polish and implement 3 screens:
  1. `/documentos/importar`: Interactive drag-and-drop XML/PDF simulation (name, size, progress/simulation, extraction summary), 5 quick demo cards (`demo-01` to `demo-05`) with realistic descriptions, badges, and 1-click loading/redirecting to `/documentos/[id]/conferencia` or `/documentos`.
  2. `/notas-preparadas`: List of prepared/split invoices from `preparedInvoiceRepository.list()`. Display items, destination company (Razão Social/CNPJ), total value (BRL), date, actions (Visualizar Espelho DANFE modal, Download XML simulado com toast, Excluir com confirmação). Empty state with CTA.
  3. `/configuracoes`: UI preferences (density, items per page: 10/25/50, theme toggle, autoSave toggle), master "Restaurar Dados de Demonstração (resetAll)" with confirmation modal and toast.
- **Success criteria**: Genuine UI behavior, wrapped in AppLayout/DemoBadge, toasts, clean ESLint (0 errors, 0 warnings), 200 OK on live routes, 54/54 tier1 tests passing.
- **Interface contracts**: PROJECT.md § Interface Contracts
- **Code layout**: PROJECT.md § Code Layout

## Change Tracker
- **Files modified**:
  - `app/documentos/importar/page.jsx`: Added drag-and-drop XML/PDF simulation with progress bar and extraction summary, all 5 quick demo scenarios (`demo-01` to `demo-05`) with 1-click redirect and toast notifications.
  - `app/notas-preparadas/page.jsx`: Added full DANFE mirror preview modal, simulated XML download with Blob/toast, delete action with Dialog confirmation, and responsive empty state with CTA to documents.
  - `app/configuracoes/page.jsx`: Added UI preferences for table density, items per page (10, 25, 50), theme toggle, autoSave toggle, and master resetAll with confirmation dialog and toast.
- **Build status**: PASS (ESLint 0 errors 0 warnings, live routes 200 OK, Tier 1 54/54 pass)
- **Pending issues**: None

## Quality Status
- **Build/test result**: All 54 tests pass in 1092ms
- **Lint status**: 0 errors, 0 warnings
- **Tests added/modified**: Verified against baseline suite tests/tier1/*.test.mjs

## Loaded Skills
- None

## Key Decisions Made
- Used native Next.js router and Blob download for zero external dependencies.
- Reused existing Dialog component for delete and reset confirmations to preserve consistent UI patterns.
- Resolved exhaustive-deps warning in notas-preparadas with useCallback.

## Artifact Index
- DISPATCH.md — Task assignment
- BRIEFING.md — Working memory
- progress.md — Liveness heartbeat
- handoff.md — Final completion report
