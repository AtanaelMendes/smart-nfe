# BRIEFING — 2026-11-13T13:52:00Z

## Mission
Investigar o vazamento de armazenamento em `app/features/preparedInvoiceRepository.js` (introduzindo isolamento volátil com `sessionPreparedInvoices = new Map()`) e projetar a arquitetura e implementação completa de `app/features/preparationRepository.js` para o Milestone 1.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\
- Original parent: 71db8a14-4c80-4575-92ba-b52ae572b170
- Milestone: milestone-1
- Current dispatch: Explorer 2 (Milestone 1 — Core Allocation Engine & Repositories)
- Working directory: c:\www\smart-nfe
- State folder: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\
- Dispatch parent: f64908f7-618d-4f21-bf78-58657f1ff50c

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do not modify source code directly
- Adhere to Teamwork protocol and layout compliance
- Focus on accessKeyValidator.js and xmlToInvoiceMapper.js
- ZERO third-party packages for core arithmetic: use pure native BigInt
- Conservation rule: disponível = original - soma das alocações ativas
- Real XML data retention strictly in volatile memory (sessionPreparedInvoices = new Map(), sessionPreparations = new Map())
- 100% backward compatibility: existing 383 tests must continue passing

## Current Parent
- Conversation ID: f64908f7-618d-4f21-bf78-58657f1ff50c
- Updated: 2026-11-13T13:44:25Z

## Investigation State
- **Explored paths**:
  - `app/features/preparedInvoiceRepository.js` (diagnosed storage leakage: all prepared invoices unconditionally written to localStorage)
  - `app/features/invoiceRepository.js` (analyzed in-memory session isolation pattern: sessionInvoices = new Map(), withMutationLock, deepClone, isReal/isDemo detection)
  - `app/documentos/[id]/divisao/page.jsx` (traced division flow and invocation of preparedInvoiceRepository.create)
  - `app/lib/storage/localStorageService.js` (STORAGE_KEYS, envelope, registration of defaults)
  - `app/lib/calculations/decimal.js` (BigInt pure decimal functions: decimalAdd, decimalSum, cleanDecimalString, roundDecimal)
  - `tests/tier5/m4_challenger_expenses_persistence_adversarial.test.mjs` (lifecycle of prepared invoices)
  - `tests/tier5/m2_challenger1_concurrency_validation.test.mjs` (concurrency stress and queue healing)
  - `tests/tier5/m1_challenger2_session_integrity.test.mjs` (session leak tests via localStorageService.save spying)
  - `tests/tier1/m2_domain.test.mjs` (baseline repository tests)
- **Key findings**:
  - `preparedInvoiceRepository.js` has a critical data privacy leak: prepared invoices from real XMLs are saved in `localStorageService.save(STORAGE_KEYS.PREPARED_INVOICES)`.
  - Introduced blueprint for `sessionPreparedInvoices = new Map()` with origin detection checking `sessionInvoices.has(id)` for parent and source invoice IDs.
  - `resetDemoData()` must clear `sessionPreparedInvoices` to prevent test cross-contamination.
  - `app/features/preparationRepository.js` designed with full dual-storage, async CRUD, lifecycle state machine (`'draft'`, `'active'`, `'completed'`, `'cancelled'`), and BigInt `getActiveAllocations(excludePreparationId)` extraction.
- **Unexplored areas**: None for M1-2 Explorer scope.

## Key Decisions Made
- `preparedInvoiceRepository.js` will automatically detect real invoices via `isRealPreparedInvoice()` checking parent and source IDs against `sessionInvoices`.
- `preparationRepository.js` provides `getActiveAllocations` returning a `Map` augmented with `.toObject()` for seamless interoperability.
- All quantity summations in `getActiveAllocations` use `decimalAdd(current, qty, 4)` from `decimal.js`, maintaining pure BigInt arithmetic.
- Full proposed implementations written to `report.md` and synthesized in `handoff.md`.

## Artifact Index
- `DISPATCH.md` — incoming dispatch instructions
- `BRIEFING.md` — persistent working memory
- `progress.md` — liveness heartbeat
- `report.md` — comprehensive technical analysis and ready-to-use proposed code
- `handoff.md` — 5-component handoff report
