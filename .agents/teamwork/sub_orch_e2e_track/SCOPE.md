# Scope: E2E Testing Track — Automated Integration & Synthetic Fixtures

## Architecture
- Root reference: `TEST_INFRA.md` and `ORIGINAL_REQUEST.md`.
- Test harness: Native Node 24 test runner (`node --test`).
- Opaque-box test suite independent of implementation details.
- Fixtures: `tests/fixtures/` with synthetic NF-e 55 XMLs (`nfeProc`, `NFe`, invalid keys, malformed XML).
- Integration test suites: `tests/integration/` covering:
  - Fluxo A: Importação real de XML e conferência de totais (`flow_a_xml_import.test.mjs`).
  - Fluxo B: Conferência com filtros, edição por `itemId`, recálculo e restauração (`flow_b_conferencia_stable_edit.test.mjs`).
  - Fluxo C: Divisão entre notas com validação de saldos (`flow_c_division_balances.test.mjs`).
  - Fluxo D: Validação com revisão de sugestões fiscais e undo (`flow_d_validation_safe_fix_undo.test.mjs`).
- Output: Publishes `TEST_READY.md` at project root when complete.

## File Boundaries & Write Ownership
- `tests/fixtures/**`
- `tests/integration/**`
- `TEST_READY.md`

## Verification
- Run all integration tests via `node --no-warnings --test tests/integration/*.test.mjs`.
