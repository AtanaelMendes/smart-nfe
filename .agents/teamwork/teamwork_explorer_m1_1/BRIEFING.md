# BRIEFING — 2026-11-09T19:42:00Z

## Mission
Elaborar a estratégia de implementação e arquitetura exata para o módulo `app/features/xml/nfeXmlParser.js` cobrindo layouts nfeProc/NFe, v4.00/v3.10, busca imune a namespaces, resiliência a parsererror, suporte a browser + node --test, e mapeamento completo dos nós SEFAZ.

## 🔒 My Identity
- Archetype: explorer
- Roles: Milestone 1 Explorer 1 (XML Parser Architecture & Schema Mapping)
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\
- Original parent: 71db8a14-4c80-4575-92ba-b52ae572b170
- Milestone: Milestone 1 (M1 - XML Parser & Core Ingestion)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strictly read-only on project source code (only write to our own folder)
- Files for content delivery, Messages for coordination
- Self-contained 5-component handoff.md report

## Current Parent
- Conversation ID: 71db8a14-4c80-4575-92ba-b52ae572b170
- Updated: 2026-11-09T19:33:58Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`, `SCOPE.md`, `teamwork_spec_miner_survey_2/handoff.md`
  - `app/features/invoiceRepository.js`, `app/lib/calculations/invoiceTotals.js`, `app/lib/data/mockInvoices.js`
  - `tests/tier1/m1_foundation.test.mjs`, `tests/tier1/m2_domain.test.mjs`
  - Node.js runtime DOMParser capabilities (undefined in Node 24 by default, zero external npm parser packages)
- **Key findings**:
  - Dual environment challenge: browser has `window.DOMParser`, Node test runner (`node --test`) does not. Solution: built-in lightweight `NodeXmlDomParser` fallback in `nfeXmlParser.js` plus parser injection via options (`{ DOMParser }`), achieving 100% testability with zero npm dependencies.
  - Namespace immunity: SEFAZ default `xmlns` and prefixes (like `<nfe:NFe>`) break naive selectors. Solution: helper suite combining `localName` stripping (`getElementLocalName`), `getElementsByTagNameNS('*', ...)`, and direct child navigation (`findDirectChildren`, `findDirectChild`) to prevent cross-level collision (e.g. `det/prod/vProd` vs `total/ICMSTot/vProd`).
  - Layouts: `nfeProc` contains `protNFe` (`infProt`); standalone `NFe` does not contain `protNFe`. Parser extracts protocol if present and sets `protocolo: null` if absent without failing.
  - Schema versions: v4.00 uses `dhEmi` (ISO 8601 with tz); v3.10 may use `dEmi` + `hEmi`. Parser supports fallback chain.
  - Malformed XML: `DOMParser` inserts `<parsererror>`. Parser detects this at root or anywhere in tree and formats user-friendly Portuguese error message with line/column info.
  - Validated via automated scratch script (`test_full_parser.mjs`) passing 5 test scenarios.
- **Unexplored areas**: None for M1 XML parser architecture.

## Key Decisions Made
- Architecture of `nfeXmlParser.js` combines DOM traversal helpers, built-in Node fallback parser, explicit error detection, and complete field normalization.
- No third-party npm packages needed; fully portable to browser ESM and Node.js.

## Artifact Index
- DISPATCH.md — Recorded dispatch instructions
- progress.md — Liveness heartbeat and milestone tracking
- BRIEFING.md — Situational awareness and working memory
- test_mini_parser.mjs — Verification of mini DOM parser
- test_full_parser.mjs — Comprehensive test suite for all 5 parser scenarios
- handoff.md — 5-component handoff report with production-ready code for Worker
