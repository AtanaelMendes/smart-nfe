# Project: SmartNFe — Export Preparation N:M & Unified Allocation Architecture

## Architecture
- **Framework**: Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS 4.
- **Core Domain Principles**:
  - Pure client-side browser execution: autonomous on Vercel without PHP backend dependency.
  - Zero third-party libraries for core arithmetic: arbitrary precision decimal mathematics exclusively built on native `BigInt`.
  - Unified Allocation Engine: handles N origins → 1 destination, 1 origin → M destinations, and N origins → M destinations under a single mathematical conservation model (`disponível = original - soma(alocações ativas)`).
  - Item Identity Preservation: each allocated unit carries composite origin `(sourceInvoiceId, sourceItemId)`, preserving supplier identity and preventing unintended merging of line items.
  - Fiscal Session Isolation: real imported XML documents and their derived preparations reside exclusively in volatile memory (`sessionInvoices = new Map()`, `sessionPreparedInvoices = new Map()`, `sessionPreparations = new Map()`), never written to `localStorage`. Only demo scenarios persist in `localStorage`.
  - Non-breaking backward compatibility: legacy single-invoice division (`/documentos/[id]/divisao`) and root `parentInvoiceId` remain fully functional, powered under the hood by the unified allocation engine.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Git Branch `feature/preparacoes-unificadas` | Create feature branch from existing repository without touching `master`, without unauthorized deployments, merges, or actions. | M0 | R5 |
| 2 | Baseline Verification | Ensure baseline of 383 existing tests, ESLint, and Next.js build pass with 0 errors. | M0 | Verification |
| 3 | BigInt Decimal Calculation Extensions | Native `BigInt` arbitrary precision arithmetic in `decimal.js` for vector operations, strict comparisons, and cent-conserved apportioning without floating-point errors. | M1 | R4 |
| 4 | Unified Allocation Engine (`allocationEngine.js`) | Core allocation engine managing N → M matrix, calculating available balances in real time, enforcing conservation rule, non-negativity, unit compatibility, and zero-drift accessory expense apportionment. | M1 | R4 |
| 5 | Storage Leakage Fix in `preparedInvoiceRepository` | Introduce `sessionPreparedInvoices = new Map()` to isolate real imported invoices and their prepared destinations from `localStorage`. | M1 | R4, R5 |
| 6 | Preparation Repository (`preparationRepository.js`) | Async repository managing preparation lifecycles, drafts, active allocations, and dual-storage persistence (volatile session for real XMLs, localStorage for demo). | M1 | R3, R4 |
| 7 | Legacy Division Refactoring | Refactor `app/lib/calculations/divisionMath.js` to delegate internally to `allocationEngine.js`, maintaining 100% backward compatibility for `/documentos/[id]/divisao`. | M1 | R4 |
| 8 | Left Drawer State Persistence & Safe Hydration | Elevate `sidebarCollapsed` to `AppContext.jsx`, synchronize with `smartnfe_sidebar_collapsed` in `localStorage` post-mount to eliminate React 19 hydration mismatch; default expanded $>1024\text{px}$, collapsed $\le 1024\text{px}$. | M2 | R1 |
| 9 | Responsive Mobile Drawer Overlay | Mobile drawer overlay for viewports $\le 1024\text{px}$ with backdrop, Escape key handler (`e.preventDefault()`), close button, and toggle in header (`lg:hidden`), coexisting safely with ScreenTourTip and table editing. | M2 | R1 |
| 10 | Multi-XML Drag & Drop Importer | Evolve `/documentos/importar` to accept multiple XML files simultaneously via `<input multiple>` and drag-and-drop. | M3 | R2 |
| 11 | Browser Concurrency-Limited Batch Queue | Concurrency worker pool (pool = 3) with event-loop yielding for parsing up to 50+ XMLs smoothly without freezing the UI. | M3 | R2 |
| 12 | Dual-Level Progress & Retry Mechanism | Individual progress/status per file and global progress bar, with one-click retry for failed files. | M3 | R2 |
| 13 | Access Key Duplicate Detection | Detect duplicate 44-digit access keys against active session invoices and within the upload batch with explicit user notification. | M3 | R2 |
| 14 | In-Memory Session Security Banner | Clear notification regarding volatile in-memory retention and session loss on reload for real XMLs. | M3 | R2, R5 |
| 15 | Debounced Multi-Field Document Search | 300ms debounced search on `/documentos` querying invoice numbers, access keys, suppliers, recipients, assigned clients, NCMs, and product descriptions/codes. | M3 | R2 |
| 16 | Combinable 8-Facet Document Filters | Unified filter bar supporting assigned client, supplier, NCM, product, date range, value range, balances (available, partial, exhausted), and status. | M3 | R2 |
| 17 | Visual Document Grouping | Switchable grouping by Supplier or Assigned Export Client, with group headers, summaries, item counts, and group bulk-select. | M3 | R2 |
| 18 | Stable Multi-Item Selection & Metric Counters | Persistent selection of documents across pagination, filtering, and grouping, with floating action bar displaying counters for selected invoices, items, BigInt monetary totals, and distinct suppliers. | M3 | R2 |
| 19 | Operational Assigned Export Client Domain Model | Assign export client (`clienteAtribuido`, default "Sem cliente atribuído") to documents without modifying the legally immutable SEFAZ `destinatario`. | M3 | R2 |
| 20 | High-Density Nova Preparação UI (`/preparacoes/nova`) | High-density workspace supporting N->1, 1->M, N->M with wide table, fixed headers, collapsible filters, persistent totals bar, tabbed panels, inline quick-editing with color feedback, and session loss warning. | M4 | R3 |
| 21 | Preparation Management Dashboard (`/preparacoes`) | Dashboard for managing preparations and drafts, status filters, simulated XML export, backward-compatible aliasing with `/notas-preparadas`. | M4 | R3 |
| 22 | Origin Identity Preservation | Allocated products preserve `sourceInvoiceId` and `sourceItemId`, preventing unintended merging of lines from different suppliers. | M4 | R3, R4 |
| 23 | Screen Tours Update | Add onboarding tours for `/preparacoes` and `/preparacoes/nova` in `app/config/screenTours.js` with path resolution and reset support. | M4 | R5 |
| 24 | Synthetic XML Fixtures Generator (2..50) | Programmatic generator (`tests/fixtures/xmlFixtureGenerator.mjs`) for NF-e 4.00 XMLs covering 2->1 grouping, 1->M division, N->M mixed, multi-supplier, repeated product codes, incompatible units, and 50->5 scale batches. | M5 | R5, Verification |
| 25 | E2E Automated Test Suite & Coverage Hardening | Test suites in `tests/` covering Tiers 1-4 (Features, Boundaries, Combinations, Real-World Workloads) + Tier 5 adversarial hardening, passing with `npm test`, `npm run lint`, and `npm run build`. | M5 | R5, Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Branch & Baseline Setup | Create branch `feature/preparacoes-unificadas`, verify clean baseline. | none | DONE |
| M1 | Core Allocation Engine & Repositories | BigInt math extension, `allocationEngine.js`, `preparationRepository.js`, storage leakage fix in `preparedInvoiceRepository.js`, `divisionMath.js` delegation. | M0 | IN_PROGRESS |
| M2 | Left Drawer & Responsive Layout | `AppContext.jsx` persistence, safe hydration, mobile drawer overlay (<= 1024px) with backdrop/Escape, header toggle. | M0 | IN_PROGRESS |
| M3 | Multi-XML Import & Document Management | `/documentos/importar` batch queue, progress, retry, duplicate check; `/documentos` debounced search, 8 filters, grouping, stable selection, `clienteAtribuido`. | M1 | PLANNED |
| M4 | Preparation Flow & Management UI | `/preparacoes/nova` workspace, `/preparacoes` dashboard, origin preservation, `screenTours.js` updates. | M1, M2, M3 | PLANNED |
| M5 | E2E Test Suite & Adversarial Hardening | Fixture generator, Tiers 1-4 E2E test suites, 100% pass, Tier 5 adversarial hardening, full verification. | M4 | PLANNED |

## Interface Contracts

### `app/lib/calculations/allocationEngine.js` ↔ UI / Repositories
- `calculateAllocationMatrix(sourceItems, destinationNotes, activeAllocations)`:
  - Input:
    - `sourceItems`: Array of `{ id, sourceInvoiceId, sourceItemId, codigo, descricao, ncm, unidade, quantidade, valorUnitario, valorTotal, frete, seguro, outrasDespesas, desconto }`
    - `destinationNotes`: Array of `{ id, foreignClient, allocations: { [sourceKey]: string } }` where `sourceKey = `${sourceInvoiceId}__${sourceItemId}``
    - `activeAllocations`: Map/Object of existing allocations from other active preparations to subtract from original quantity
  - Output:
    - `matrix`: `{ [destinationId]: { [sourceKey]: { allocatedQty, remainingQty, lineTotal, apportionedExpenses } } }`
    - `sourceBalances`: `{ [sourceKey]: { originalQty, allocatedQtyTotal, remainingQty, hasExcess, status: 'ok'|'partial'|'excess' } }`
    - `canSave`: Boolean (true iff no negative balances, all allocated $\le$ available)
    - `totals`: `{ totalSourceValue, totalAllocatedValue, totalSourceItems, totalAllocatedItems }`
- `checkUnitCompatibility(itemA, itemB)`: returns Boolean.

### `app/features/preparationRepository.js` ↔ Pages
- `create(preparationData)`: async, returns saved preparation object.
- `update(id, partialData)`: async, returns updated object.
- `findById(id)`: async, returns preparation object or null.
- `list({ status, type })`: async, returns Array of preparations.
- `delete(id)`: async, deletes draft or preparation.
- `getActiveAllocations(excludePreparationId)`: async, returns Map of `{ [sourceKey]: BigIntQuantity }` for conservation across active preparations.

### `AppContext.jsx` ↔ Layout Components
- Context exports: `{ sidebarCollapsed, setSidebarCollapsed, toggleSidebar, mobileDrawerOpen, setMobileDrawerOpen, toggleMobileDrawer, isLgScreen }`.
- LocalStorage key: `smartnfe_sidebar_collapsed` (`'true'` / `'false'`).
- Hydration guarantee: initial render uses default state based on window width check post-mount, avoiding SSR/client mismatch.

## Code Layout
```
c:\www\smart-nfe\
├── app/
│   ├── components/
│   │   └── Layouts/
│   │       ├── AppLayout.jsx             # Shell layout with desktop/mobile drawer orchestration
│   │       ├── SmartNFeSidebar.jsx       # Navigation drawer with desktop & mobile modes
│   │       └── SmartNFeHeader.jsx        # Top header with accessible mobile toggle
│   ├── context/
│   │   └── AppContext.jsx                # Global UI state (sidebar persistence, mobile drawer)
│   ├── config/
│   │   └── screenTours.js                # Guided tour steps (including /preparacoes routes)
│   ├── features/
│   │   ├── invoiceRepository.js          # Invoices repository with memory session isolation
│   │   ├── preparedInvoiceRepository.js  # Prepared invoices repository with memory session isolation
│   │   └── preparationRepository.js      # Preparation lifecycle & active allocations repository
│   ├── lib/
│   │   └── calculations/
│   │       ├── decimal.js                # BigInt arbitrary precision fixed-point arithmetic
│   │       ├── allocationEngine.js       # Unified N -> M allocation & conservation engine
│   │       ├── divisionMath.js           # Legacy division calculations delegating to allocationEngine
│   │       └── invoiceTotals.js          # Tax and document totals calculation
│   ├── documentos/
│   │   ├── page.jsx                      # Document list with debounced search, 8 filters, grouping, selection
│   │   └── importar/
│   │       └── page.jsx                  # Multi-XML drag-and-drop batch importer with queue & retry
│   ├── preparacoes/
│   │   ├── page.jsx                      # Preparation management dashboard
│   │   └── nova/
│   │       └── page.jsx                  # High-density N -> M preparation workspace
└── tests/
    ├── fixtures/
    │   └── xmlFixtureGenerator.mjs       # Programmatic XML fixture generator (2 to 50 notes)
    └── integration/
        ├── flow_a_drawer_layout.test.mjs # Left drawer persistence & mobile overlay tests
        ├── flow_b_multi_xml_import.test.mjs # Multi-XML batch queue & duplicate checks
        ├── flow_c_documents_filters.test.mjs # Debounced search, grouping, selection tests
        ├── flow_d_allocation_engine.test.mjs # BigInt math & N->M conservation tests
        ├── flow_e_preparation_n_to_m.test.mjs # N->1, 1->M, N->M end-to-end preparation tests
        └── flow_f_scale_50_invoices.test.mjs # 50->5 stress & memory isolation tests
```
