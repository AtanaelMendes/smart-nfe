# E2E Test Infra: SmartNFe Frontend XML & Fiscal Engine

## Test Philosophy
- Opaque-box, requirement-driven, derived strictly from `ORIGINAL_REQUEST.md`.
- No reliance on backend; executed locally via Node 24 native test runner (`node:test`).
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory & Test Mapping
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 | Integration Flow |
|---|---------|----------------------|:------:|:------:|:------:|:----------------:|
| 1 | Browser XML NF-e 55 Parser | R3 | 5 | 5 | ✓ | Fluxo A |
| 2 | Chave de Acesso & Modulo 11 | R3 | 5 | 5 | ✓ | Fluxo A |
| 3 | XML to Invoice Contract Mapper | R3 | 5 | 5 | ✓ | Fluxo A |
| 4 | In-Memory Session Storage Boundary | R3 | 5 | 5 | ✓ | Fluxo A |
| 5 | XML Importer UI Feedback | R3 | 5 | 5 | ✓ | Fluxo A |
| 6 | Stable `itemId` Conference Editing | R1 | 5 | 5 | ✓ | Fluxo B |
| 7 | Filter (NCM/Desc) & Sort Safe Editing | R1 | 5 | 5 | ✓ | Fluxo B |
| 8 | Pure Decimal Totals Recalculation | R1 | 5 | 5 | ✓ | Fluxo B |
| 9 | Ancillary Expenses Preservation | R1 | 5 | 5 | ✓ | Fluxo B |
| 10 | Original Values Snapshot & Restore | R1, R4 | 5 | 5 | ✓ | Fluxo B |
| 11 | Conference UI Badges & Indicators | R4 | 5 | 5 | ✓ | Fluxo B |
| 12 | Keyboard Navigation (Enter/Escape) | R4 | 5 | 5 | ✓ | Fluxo B |
| 13 | Explicit Fiscal Fix Confirmation | R2 | 5 | 5 | ✓ | Fluxo D |
| 14 | Undo Mechanism for Fiscal Fixes | R2 | 5 | 5 | ✓ | Fluxo D |
| 15 | Safe "Corrigir todas" Review | R2 | 5 | 5 | ✓ | Fluxo D |
| 16 | Splitting Pure Decimal Engine | R1, R4 | 5 | 5 | ✓ | Fluxo C |
| 17 | Remaining Balance Distribution | R4 | 5 | 5 | ✓ | Fluxo C |
| 18 | Strict Splitting Traps (canSave: false) | R4 | 5 | 5 | ✓ | Fluxo C |
| 19 | Ancillary Expense Apportionment | R1, R4 | 5 | 5 | ✓ | Fluxo C |
| 20 | Automated Integration Suite (A, B, C, D) | R5 | 5 | 5 | ✓ | Fluxos A, B, C, D |
| 21 | ESLint 0 Errors / Clean Config | R5 | 5 | 5 | ✓ | All |
| 22 | Build Gate & Branch Compliance | R5 | 5 | 5 | ✓ | All |

## Test Architecture
- **Runner**: Node.js 24 native test runner (`node --no-warnings --test tests/**/*.test.mjs`).
- **Integration Test Directory**: `tests/integration/`
  - `flow_a_xml_import.test.mjs`: Tests real XML parsing (`nfeProc`, `NFe`), key verification, session memory isolation, and error handling.
  - `flow_b_conferencia_stable_edit.test.mjs`: Tests conference table editing by `itemId`, filtering stability, decimal math, diff snapshot, and restore.
  - `flow_c_division_balances.test.mjs`: Tests invoice splitting, equal/single remainder distribution, strict excess & unallocated traps, and expense apportionment.
  - `flow_d_validation_safe_fix_undo.test.mjs`: Tests fiscal validation confirmation, sensitive bulk fix blocking, undo state restoration, and re-validation.
- **Fixtures Directory**: `tests/fixtures/`
  - `synthetic_nfe_export_proc.xml`: Full `nfeProc` v4.00 with export CFOP 7101 and valid Modulo 11 access key.
  - `synthetic_nfe_simple.xml`: `NFe` root without `nfeProc` wrapper.
  - `synthetic_nfe_invalid_key.xml`: NF-e with deliberately corrupted check digit.
  - `synthetic_malformed.xml`: Truncated/corrupted XML tag for error testing.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Import to Conference to Split Workflow | F1, F2, F3, F4, F6, F8, F9, F16, F17, F18, F19 | High |
| 2 | Import Real NF-e, Edit Filtered Line, Restore Original | F1, F3, F4, F6, F7, F8, F10, F11 | Medium |
| 3 | Validation Assistant with Single Fix, Undo, and Safe Bulk Review | F4, F13, F14, F15 | High |
| 4 | Multi-Note Splitting with Odd Quantity & Ancillary Expenses | F8, F16, F17, F18, F19 | High |
| 5 | Invalid XML Upload Resilience and Recovery | F1, F2, F4, F5 | Medium |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature
- Tier 3: Pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
- Integration Suite: 4 automated flow suites (A, B, C, D) passing with 100% success
