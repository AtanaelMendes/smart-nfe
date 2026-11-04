## 2026-11-04T17:03:21Z
You are Explorer 1 for Milestone 3 (Document Management Screens).
Your working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_1\

Read authoritative files:
1. ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
2. PROJECT.md: c:\www\smart-nfe\PROJECT.md
3. Existing Foundations:
   - c:\www\smart-nfe\app\components\Layouts\AppLayout.jsx
   - c:\www\smart-nfe\app\components\inputs\InputFile.jsx
   - c:\www\smart-nfe\app\features\invoiceRepository.js
   - c:\www\smart-nfe\app\lib\data\mockInvoices.js
   - c:\www\smart-nfe\app\context\AppContext.jsx

MISSION / FOCUS:
Design the implementation specification for `/documentos/importar` (`app/documentos/importar/page.jsx`):
1. **Simulated File Upload**:
   - Integrate `InputFile` with drag-and-drop support for `.xml` and `.pdf` files up to 10MB.
   - When a user uploads a valid XML or PDF, simulate parsing:
     - Show loading state / simulated progress bar.
     - Add simulated new imported invoice via `invoiceRepository.create()` with status `importado`.
     - Show success toast via `useApp().toast('Documento importado com sucesso!', 'success')`.
     - Provide button or automatic redirect to conference editor `/documentos/[id]/conferencia`.
   - Error handling: simulate error toast when an invalid file (e.g. non-XML/PDF or >10MB) is dropped.
2. **5 Quick Demo Scenario Cards**:
   - Display 5 interactive quick-load cards for the demo scenarios:
     - Demo 01: Exportação Simples (8 itens, café em grão)
     - Demo 02: Grande Volume (25 itens de calçados)
     - Demo 03: Pré-Conferido (50 itens para divisão direta)
     - Demo 04: Inconsistências Fiscais (CFOP, NCM, divergência matemática para validação)
     - Demo 05: Lote de Divisão (15 itens repetidos para divisão em 2 notas preparadas)
   - Clicking a card: loads the scenario from `invoiceRepository`, triggers info toast, and navigates immediately to `/documentos/[id]/conferencia`.
3. **UI & Layout**:
   - Wrapped in `<AppLayout>` with breadcrumbs: `Home > Documentos > Importar`.
   - Permanent "Modo Demonstração" badge visible (provided by AppLayout).
   - Responsive design with Tailwind CSS 4 and Font Awesome 7 icons.

CRITICAL USER CONSTRAINT:
DO NOT run `pnpm build`, `npm run build`, `pnpm dev`, or `npm run dev`. The live dev server on `http://localhost:3000/dashboard` must stay uninterrupted.
You are read-only. Do NOT modify source code files.

Write a clear, concrete component design and step-by-step recommendation for the Worker in `handoff.md`, and notify orchestrator via `send_message`.
