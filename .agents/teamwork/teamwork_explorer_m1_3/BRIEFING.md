# BRIEFING — 2026-11-09T19:41:00Z

## Mission
Elaborar a estratégia de implementação e arquitetura exata para o isolamento em memória no repositório (`app/features/invoiceRepository.js`) e a tela de importação (`app/documentos/importar/page.jsx`).

## 🔒 My Identity
- Archetype: explorer
- Roles: Milestone 1 Explorer 3
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_3
- Original parent: 71db8a14-4c80-4575-92ba-b52ae572b170
- Milestone: Milestone 1 - XML Import & Repository Memory Isolation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement / modify source code directly
- Strict isolation: real XML imports must NEVER be written to localStorage
- Session invoices in-memory via `new Map()`
- Maintain demo data functionality while seamlessly layering session invoices
- Comprehensive handoff with ready-to-implement code snippets for the worker

## Current Parent
- Conversation ID: 71db8a14-4c80-4575-92ba-b52ae572b170
- Updated: 2026-11-09T19:41:00Z

## Investigation State
- **Explored paths**:
  - `app/features/invoiceRepository.js`
  - `app/documentos/importar/page.jsx`
  - `app/documentos/page.jsx`
  - `app/documentos/[id]/conferencia/page.jsx`
  - `app/dashboard/page.jsx`
  - `tests/tier1/m2_domain.test.mjs`
  - `teamwork_spec_miner_survey_2/handoff.md`
- **Key findings**:
  - `invoiceRepository.js`: Currently unconditionally saves every document to localStorage with `isDemo: true`.
  - In-memory architecture: `const sessionInvoices = new Map()`, checking session first in `findById`, routing `create`, `update`, `updateItem` to memory when `isRealImport === true` or `isDemo === false`, and merging in `list` with real documents on top.
  - Adding `delete(id)` and alias `resetAll = resetDemoData` solves missing methods currently called from `app/documentos/page.jsx`.
  - `app/documentos/importar/page.jsx`: Currently uses dummy `setInterval` hardcoded to `demo-01`.
  - Replacement: Real File API (`file.text()`), `parseNFeXml`, `validateAccessKey`, and `mapXmlToInvoice`. UI feedback: success card with details and direct CTA button to `/documentos/[id]/conferencia`, or error alert card. Added explicit banner regarding temporary in-memory session.
- **Unexplored areas**: None. Ready for handoff compilation.

## Key Decisions Made
- `sessionInvoices = new Map()` exported as named export along with helper functions (`clearSession`, `getSessionCount`, `isSessionInvoice`).
- In `create`, check `isRealImport === true || isDemo === false`.
- In `list`, session invoices placed at the beginning of the merged list (`[...sessionInvoices.values(), ...persistedFiltered]`).
- In `app/documentos/importar/page.jsx`, maintain the 5 demo scenario cards at the bottom for demo testing.

## Artifact Index
- DISPATCH.md — Recorded dispatch message
- progress.md — Liveness heartbeat and step tracking
- handoff.md — Final 5-component handoff report with complete code snippets for Worker
