# BRIEFING — 2026-11-13T13:52:00Z

## Mission
Investigate codebase at c:\www\smart-nfe for E2E integration test requirements (contracts, modules, test conventions, calculations, repositories, layouts, XML parsing).

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: codebase investigation, synthesis
- Working directory: c:\www\smart-nfe
- State folder: c:\www\smart-nfe\.agents\teamwork\e2e_explorer_2\
- Original parent: b46dc906-80ec-4470-92da-f6c8e7476b34
- Milestone: e2e_investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT write or edit source code or test files in tests/ or app/
- Write reports, plans, progress, handoff only in c:\www\smart-nfe\.agents\teamwork\e2e_explorer_2\

## Current Parent
- Conversation ID: b46dc906-80ec-4470-92da-f6c8e7476b34
- Updated: 2026-11-13T13:44:24Z

## Investigation State
- **Explored paths**:
  - `tests/` (`package.json`, `tests/fixtures/`, `tests/integration/flow_a_xml_import.test.mjs`, `tests/integration/flow_c_division_balances.test.mjs`)
  - `app/features/xml/` (`nfeXmlParser.js`, `accessKeyValidator.js`, `xmlToInvoiceMapper.js`)
  - `app/lib/calculations/` (`decimal.js`, `invoiceTotals.js`, `divisionMath.js`)
  - `app/features/` (`invoiceRepository.js`, `preparedInvoiceRepository.js`)
  - `app/context/AppContext.jsx` & `app/components/Layouts/` (`AppLayout.jsx`, `SmartNFeSidebar.jsx`, `SmartNFeHeader.jsx`)
- **Key findings**:
  - Test runner is pure native Node.js (`node --no-warnings --test tests/**/*.test.mjs`), zero extra dependencies, 383 baseline tests passing in ~7.6s.
  - XML parsing supports DOMParser in browser and embedded `NodeXmlDomParser` in Node.js, mapping to normalized invoice contracts with deterministic item IDs (`nfe-${chaveAcesso}-item-${nItem}`).
  - Pure BigInt arithmetic in `decimal.js` handles arbitrary scales and Half-Up rounding; extensions `decimalSum`, `decimalMin`, `decimalMax`, `isDecimalPositive` are being merged.
  - Repositories enforce dual-storage: real imported XMLs reside strictly in `sessionInvoices = new Map()`, never in localStorage.
  - Layout contracts elevate `sidebarCollapsed` and `mobileDrawerOpen` into `AppContext.jsx`, persisting to `smartnfe_sidebar_collapsed` post-mount without React 19 hydration mismatch.
- **Unexplored areas**: None. All 6 questions investigated and verified.

## Key Decisions Made
- Confirmed zero-dependency approach for E2E integration test suites (`node:test` + `node:assert/strict`).
- Formulated complete test blueprints for the 6 integration suites (`flow_a_drawer_layout.test.mjs` through `flow_f_scale_50_invoices.test.mjs`).
- Emitted full handoff report in `handoff.md`.

## Artifact Index
- DISPATCH.md — Parent instructions record
- BRIEFING.md — Persistent context & state
- progress.md — Liveness heartbeat & step progress
- handoff.md — 5-Component comprehensive exploration report & integration test blueprints
