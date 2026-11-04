## 2026-11-04T17:03:33Z

You are Explorer 2 for Milestone 3 (Document Management Screens).
Your working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_2\

Read authoritative files:
1. ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
2. PROJECT.md: c:\www\smart-nfe\PROJECT.md
3. Existing Foundations:
   - c:\www\smart-nfe\app\components\Layouts\AppLayout.jsx
   - c:\www\smart-nfe\app\components\table\DataTable.jsx
   - c:\www\smart-nfe\app\features\invoiceRepository.js
   - c:\www\smart-nfe\app\lib\formatters\currency.js
   - c:\www\smart-nfe\app\lib\formatters\dates.js
   - c:\www\smart-nfe\app\lib\formatters\status.js
   - c:\www\smart-nfe\app\dashboard\page.jsx

MISSION / FOCUS:
Design the implementation specification for `/documentos` (`app/documentos/page.jsx`):
1. **Documents List & Table**:
   - Query documents via `invoiceRepository.list()`.
   - Integrate `DataTable` with explicit columns:
     - Número NF-e (`numero` + `serie`)
     - Data Emissão (`dataEmissao`, formatted via `formatDateBR`)
     - Destinatário / País (`destinatario.razaoSocial` + flag/badge do país)
     - Itens (`itens.length`)
     - Valor Total (formatted via `formatCurrencyBRL`)
     - Status (`status`, badge via `getStatusBadge` or custom status pill)
     - Ações (Action dropdown / buttons: "Conferir" -> `/documentos/[id]/conferencia`, "Validar" -> `/documentos/[id]/validacao`, "Dividir" -> `/documentos/[id]/divisao`)
2. **Filters & Search**:
   - Global search input filtering across number, emitente, destinatario, chave.
   - Status filter pills:
     - "Todos" (count)
     - "Importado" (count)
     - "Em Conferência" (count)
     - "Conferido" (count)
     - "Com Inconsistências" (count)
     - "Dividido" (count)
   - Quick action: "Importar Novo Documento" button linking to `/documentos/importar`.
3. **UI & Layout**:
   - Wrapped in `<AppLayout>` with breadcrumbs: `Home > Documentos`.
   - Permanent "Modo Demonstração" badge visible (provided by AppLayout).
   - Empty state when search or filters return 0 items.
   - Responsive with Tailwind CSS 4 and Font Awesome 7 icons.

CRITICAL USER CONSTRAINT:
DO NOT run `pnpm build`, `npm run build`, `pnpm dev`, or `npm run dev`. The live dev server on `http://localhost:3000/dashboard` must stay uninterrupted.
You are read-only. Do NOT modify source code files.

Write a clear, concrete component design and step-by-step recommendation for the Worker in `handoff.md`, and notify orchestrator via `send_message`.
