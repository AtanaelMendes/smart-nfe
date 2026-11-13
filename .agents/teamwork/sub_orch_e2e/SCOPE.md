# Scope: E2E Testing Track — Infrastructure & Test Suite Creation

## Mission
Design and implement the comprehensive opaque-box E2E test infrastructure and test suites per PROJECT.md and TEST_INFRA.md:
- Synthetic XML Fixture Generator (`tests/fixtures/xmlFixtureGenerator.mjs`):
  - Valid NF-e 4.00 XMLs with valid Modulo 11 access keys.
  - Covers scenarios: 2->1 grouping, 1->M division, N->M mixed, multi-supplier, repeated product codes, incompatible units (SC vs KG vs TON), and 50->5 scale stress batch.
- Comprehensive Test Suites in `tests/integration/`:
  - `flow_a_drawer_layout.test.mjs` (R1 Left Drawer persistence, safe hydration, mobile overlay, Escape key)
  - `flow_b_multi_xml_import.test.mjs` (R2 Multi-XML batch queue, concurrency 3, duplicate checks, memory isolation)
  - `flow_c_documents_filters.test.mjs` (R2 Debounced search, 8 filters, visual grouping, stable selection, client assignment)
  - `flow_d_allocation_engine.test.mjs` (R4 BigInt math, conservation invariant, unit compatibility, zero-drift apportioning)
  - `flow_e_preparation_n_to_m.test.mjs` (R3 N->1, 1->M, N->M end-to-end workflows, drafts, session memory isolation)
  - `flow_f_scale_50_invoices.test.mjs` (R5 50->5 scale stress, heap stability, memory protection)
- Meet 4-Tier test coverage thresholds: Tier 1 (>=5/feat), Tier 2 (>=5/feat boundaries), Tier 3 (pairwise combinations), Tier 4 (real-world scenarios).
- Publish `c:\www\smart-nfe\TEST_READY.md` upon completion.

## Code Layout Ownership (Exclusive)
- `tests/fixtures/xmlFixtureGenerator.mjs`
- `tests/integration/*.test.mjs`
- `c:\www\smart-nfe\TEST_READY.md`

## Key Constraints & Rules
- Branch: MUST work strictly on `feature/preparacoes-unificadas`.
- Test harness: Native Node.js test runner (`node:test`, `node:assert/strict`).
- Requirement-driven, opaque-box: tests must exercise public contracts and user behaviors without coupling to uncommitted internal helper functions.
- DO NOT modify application source code in `app/` (owned by Implementation Track).
- Publish `TEST_READY.md` at project root once the suites are verified and ready.

## References
- `c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\www\smart-nfe\.agents\teamwork\PROJECT.md`
- `c:\www\smart-nfe\.agents\teamwork\TEST_INFRA.md`
- `c:\www\smart-nfe\.agents\teamwork\explorer_survey_3\report.md`
