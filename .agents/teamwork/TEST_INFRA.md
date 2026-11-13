# E2E Test Infra: SmartNFe Export Preparation (N:M)

## Test Philosophy
- Opaque-box, requirement-driven, testing SmartNFe from the user perspective.
- Native Node.js test runner (`node:test`, `node:assert/strict`) — zero extra dependencies, instantaneous execution.
- Complete coverage across all 5 requirements (R1 Left Drawer, R2 Import & Docs, R3 Preparation N:M, R4 BigInt Allocation Engine, R5 Mocks & Autonomy).
- Strict adherence to the 4-tier methodology + Tier 5 adversarial hardening.

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Unit/Isolated) | Tier 2 (Boundary/Edge) | Tier 3 (Interactions) | Tier 4 (Workloads) |
|---|---------|-------------|:----------------------:|:----------------------:|:---------------------:|:------------------:|
| 1 | Left Drawer Desktop Persistence | R1 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 2 | Mobile Overlay Drawer (<=1024px) | R1 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 3 | Multi-XML Drag & Drop Importer | R2 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 4 | Batch Queue & Concurrency Pool | R2 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 5 | Duplicate Access Key Detection | R2 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 6 | Debounced Search & 8-Facet Filters | R2 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 7 | Visual Grouping & Bulk Select | R2 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 8 | Stable Multi-Selection & Counters | R2 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 9 | Operational Export Client Assignment | R2 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 10 | Grouping Workflow (N -> 1) | R3 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 11 | Division Workflow (1 -> M) | R3 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 12 | Mixed Preparation Workflow (N -> M) | R3 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 13 | Origin Preservation (`sourceInvoiceId + sourceItemId`) | R3 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 14 | In-Memory Session Drafts & Loss Warning | R3, R5 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 15 | BigInt Decimal Math (No Floats) | R4 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 16 | Conservation Invariant & Excess Blocking | R4 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 17 | Accessory Expense Cent Conservation | R4 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 18 | Backward Compatibility (`parentInvoiceId` & division) | R4 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 19 | Autonomous Vercel Execution (No PHP) | R5 | ≥5 cases | ≥5 cases | ✓ | ✓ |
| 20 | Screen Tours Registration | R5 | ≥5 cases | ≥5 cases | ✓ | ✓ |

## Test Architecture
- **Runner**: `node --no-warnings --test tests/integration/**/*.test.mjs`
- **Pass/Fail Semantics**: Exit code 0, 0 test failures, strict assertions on balance conservation, DOM invariants, and memory isolation.
- **Fixtures Generator**: `tests/fixtures/xmlFixtureGenerator.mjs` generating synthetic XMLs with valid Modulo 11 access keys, valid NF-e 4.00 tags, configurable items, quantities, and prices.
- **Directory Layout**:
  - `tests/integration/flow_a_drawer_layout.test.mjs`
  - `tests/integration/flow_b_multi_xml_import.test.mjs`
  - `tests/integration/flow_c_documents_filters.test.mjs`
  - `tests/integration/flow_d_allocation_engine.test.mjs`
  - `tests/integration/flow_e_preparation_n_to_m.test.mjs`
  - `tests/integration/flow_f_scale_50_invoices.test.mjs`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Agricultural Coffee Export: 5 cooperative invoices (N) grouped into 1 shipment to Rotterdam (1) | F10, F13, F15, F16, F17 | High |
| 2 | Soy Cargo Division: 1 massive agro-industry invoice (1) divided across 4 international destination contracts (M) | F11, F13, F15, F16, F18 | Medium |
| 3 | Multimodal Mixed Batch: 12 invoices from 6 suppliers (N) allocated partially across 3 export destinations (M) with residual balances preserved | F12, F13, F14, F15, F16, F17 | High |
| 4 | Repeated Product Codes across Suppliers: 3 distinct suppliers using same internal code `SOJA-01`, verifying item preservation without clashing | F13, F16, F22 | High |
| 5 | Incompatible Units Trap: Attempting to combine `SC` (bags) and `KG` (kilograms) without conversion factor, verifying strict validation trap | F16, F24 | Medium |
| 6 | Large-Scale Batch: 50 XML invoices (10 suppliers, 200+ line items) imported via batch queue and allocated across 5 destination shipping containers | F3, F4, F5, F10, F12, F16, F25 | Very High |

## Coverage Thresholds
- Tier 1: ≥5 per feature (≥100 test cases)
- Tier 2: ≥5 boundary/corner cases per feature (≥100 test cases)
- Tier 3: Pairwise combinations across filters, groups, selections, allocations (≥25 test cases)
- Tier 4: ≥6 realistic end-to-end multi-document export scenarios
- Tier 5: Adversarial edge cases and coverage gap hardening
