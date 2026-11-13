# BRIEFING — 2026-11-13T13:34:10Z

## Mission
Survey SmartNFe codebase for R4 (Unified Allocation Engine, BigInt decimal math, repositories) and R3 data flow, ensuring conservation rule, item identity preservation, backward compatibility, and in-memory temporary retention rules.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, analyzer, synthesizer
- Working directory: c:\www\smart-nfe
- State folder: c:\www\smart-nfe\.agents\teamwork\explorer_survey_1\
- Original parent: c09bc610-72fd-41ec-bb07-185334e1e0d5
- Milestone: Project Survey & Architecture Analysis

## 🔒 Key Constraints
- Read-only investigation — do NOT implement core changes to codebase
- The team must NOT: use pre-built libraries or frameworks for core functionality (BigInt arbitrary precision decimal math must be custom)
- Maintain backward compatibility with parentInvoiceId and /documentos/[id]/divisao
- Real XMLs and real tax data must not be persisted to localStorage (in-memory temporary retention)
- Output detailed report.md and handoff.md in state folder

## Current Parent
- Conversation ID: c09bc610-72fd-41ec-bb07-185334e1e0d5
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `app/lib/calculations/decimal.js`
  - `app/lib/calculations/divisionMath.js`
  - `app/lib/calculations/invoiceTotals.js`
  - `app/features/invoiceRepository.js`
  - `app/features/preparedInvoiceRepository.js`
  - `app/lib/storage/localStorageService.js`
  - `app/lib/data/mockInvoices.js`
  - `app/features/xml/xmlToInvoiceMapper.js`
  - `app/documentos/[id]/divisao/page.jsx`
  - `app/notas-preparadas/page.jsx`
  - `app/documentos/page.jsx`
  - `app/documentos/importar/page.jsx`
  - `tests/integration/flow_c_division_balances.test.mjs`
- **Key findings**:
  1. `decimal.js` is already implemented using custom `BigInt` fixed-point arithmetic without external libraries, but lacks vector utilities and multi-source proration helpers.
  2. `divisionMath.js` is strictly designed for `1 origem → M destinos` and lacks N-source support, multi-origin conservation matrices, and composite provenance tracking.
  3. `preparedInvoiceRepository.js` has a CRITICAL DATA PRIVACY LEAK: it unconditionally saves to `localStorageService`, leaking real XML data when dividing session invoices! It must be upgraded to support `sessionPreparedInvoices = new Map()`.
  4. `preparationRepository.js` does not exist yet and must be created to manage preparations, drafts, active allocations, and item balances.
  5. In `app/documentos/[id]/divisao/page.jsx`, items currently do not retain `sourceInvoiceId` or `sourceItemId`.
  6. All 383 existing tests pass in `c:\www\smart-nfe` via native `node:test`.
- **Unexplored areas**: None for R4/survey scope. All required areas inspected.

## Key Decisions Made
- Architecture for Unified Allocation Engine defined: pure BigInt, N-source to M-destination matrix, per-source expense proration, strict conservation traps.
- Dual-storage architecture must be enforced across all three repositories (`invoiceRepository`, `preparedInvoiceRepository`, and new `preparationRepository`).
- Full backward compatibility strategy for `parentInvoiceId` and `/documentos/[id]/divisao` formulated.

## Artifact Index
- c:\www\smart-nfe\.agents\teamwork\explorer_survey_1\report.md — Comprehensive survey report
- c:\www\smart-nfe\.agents\teamwork\explorer_survey_1\handoff.md — Handoff report following Handoff Protocol
- c:\www\smart-nfe\.agents\teamwork\explorer_survey_1\progress.md — Liveness heartbeat
