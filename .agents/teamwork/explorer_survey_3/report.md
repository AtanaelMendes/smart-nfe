# Survey Report: Preparation Flow & UI (R3), Infrastructure & Config (R5), and Verification & Mocks

**Explorer**: Explorer Survey 3  
**Target Repository**: `c:\www\smart-nfe`  
**Date**: 2026-11-13  
**Status**: Completed  

---

## 1. Executive Summary

The SmartNFe codebase possesses a solid foundation for single-invoice splitting (1 -> M) and client-side XML parsing, with clean build (`next build` in 12.6s), zero lint errors (`eslint` clean), and a blazing-fast native test suite (383/383 tests passing in 10.7s via `node:test`). However, multi-origin preparation (N -> 1, N -> M) does not exist: there are no `/preparacoes` or `/preparacoes/nova` routes, no `preparationRepository`, no cross-invoice allocation engine, no multi-document XML fixture generator, and `app/config/screenTours.js` lacks mappings for preparation screens.

---

## 2. Preparation Flow & UI Survey (R3)

### 2.1 Current State of Preparation Routes
- **Existing routes**:
  - `app/documentos/[id]/divisao/page.jsx` (1,109 lines): Highly capable 1 -> M division interface, strictly tied to a single source document `id` loaded via `invoiceRepository.findById(id)`.
  - `app/notas-preparadas/page.jsx` (684 lines): Read-only listing and simulated XML export of destination notes generated from 1 -> M divisions, loaded from `preparedInvoiceRepository.list()`.
- **Missing routes**:
  - `app/preparacoes/nova/page.jsx`: Route does not exist.
  - `app/preparacoes/page.jsx`: Route does not exist.

### 2.2 Workflows to Support
The new preparation engine must support three distinct operational topologies under a single unified architecture:
1. **Grouping (N -> 1)**: Multiple source invoices (N) aggregated into a single export destination note.
   - Example: 5 coffee and grain invoices from distinct suppliers aggregated into 1 export shipment to Rotterdam.
   - Constraint: Must not merge line items from different suppliers into a single artificial item; line items preserve distinct source identity.
2. **Division (1 -> M)**: Single source invoice divided across multiple destination export notes.
   - Must remain 100% backward-compatible with `/documentos/[id]/divisao`.
   - Strict 100% allocation rule (canSave requires zero residual balance and zero excess).
3. **Mixed Allocation (N -> M)**: Arbitrary number of source invoices (N) distributed across an arbitrary number of destination export notes (M).
   - Allows partial allocations, where remaining balances on source invoices are preserved for future preparations.

### 2.3 High-Density Compact UI Requirements
To support large batches (up to 50 notes and hundreds of line items), the `/preparacoes/nova` UI requires:
- **Wide table layout with fixed/sticky header**: Table headers (`sticky top-0 bg-slate-100 dark:bg-slate-800 z-10`) with horizontal scrolling (`overflow-x-auto`) for matrix columns.
- **Collapsible multi-attribute filters**: Filter toolbar collapsible by Supplier (`emitente`), NCM, Allocation Status (`Pendente`, `Parcial`, `100% Alocado`), and text search.
- **Persistent / Sticky totals bar**: Fixed bottom or top KPIs bar showing:
  - Total Sources ($N$), Total Destinations ($M$), Total Pool Items ($T$).
  - Allocation status counts: Conciliated ($OK$), Remaining ($Pending$), Excess ($Blocking$).
  - Financial totals: Total Origin Value vs Total Allocated Value with zero drift.
- **Tabbed Panels**:
  - **Tab 1: Origens & Produtos Disponíveis**: High-density table of all source invoice items with badges indicating source invoice number, supplier, unit, unit value, original quantity, allocated quantity, and remaining balance.
  - **Tab 2: Destinos & Clientes de Exportação**: Configuration cards for destination notes (Client name, country, foreign ID, series, container/lot description).
  - **Tab 3: Matriz de Alocação Unificada**: Wide interactive matrix where rows are source items and columns are destination notes with inline numeric inputs.
- **Inline quick-editing & Real-time feedback**:
  - Sanitized numeric input (allows comma/dot typing without focus loss).
  - Real-time balance calculations with color codes:
    - `Green`: Balanced ($0.0000$ remaining).
    - `Amber`: Remaining balance pending allocation ($> 0$).
    - `Red`: Excess allocation ($< 0$ balance), triggering `canSave: false` and blocking finalization.
  - Quick action helpers: "Distribuir Igualmente", "Dividir Saldos Restantes", "Alocar 100% no Destino X", "Limpar Alocações".

### 2.4 Origin Preservation (`sourceInvoiceId + sourceItemId`)
- Current schema in `preparedInvoiceRepository.js` and `mockInvoices.js` only tracks `parentInvoiceId` at the document root level.
- Unified schema requirement:
  - Each item allocated to a destination note MUST carry:
    - `sourceInvoiceId`: String (e.g., `'nfe-352411...'` or `'demo-01'`)
    - `sourceItemId`: String (e.g., `'d1-1'` or `'nfe-352411...-item-1'`)
    - `sourceInvoiceNumber`: String (e.g., `'000.145.892'`)
    - `sourceSupplierName`: String (e.g., `'Agroexport Brasil S.A.'`)
    - `sourceSupplierCnpj`: String
  - Composite key for state maps: `${sourceInvoiceId}__${sourceItemId}`.
  - Compatibility rule: If legacy prepared note has `parentInvoiceId` without item-level `sourceInvoiceId`, items derive `sourceInvoiceId = parentInvoiceId`.

### 2.5 Draft Saving & Session Privacy Notice
- **Storage Strategy**:
  - Preparations made exclusively from demo invoices (`isDemo: true`) can be persisted in `localStorage` under `smartnfe_preparations` (schema 1.0.0).
  - Preparations referencing any real imported XML (`isRealImport: true` or present in `sessionInvoices`) MUST reside exclusively in volatile in-memory storage (`sessionPreparations = new Map()`).
- **Session Loss Notice**:
  - Prominent amber banner on `/preparacoes/nova` and `/preparacoes`:
    > *"Atenção: Esta preparação contém documentos fiscais reais em memória de sessão temporária. Os rascunhos e alocações serão descartados caso a aba seja fechada ou recarregada."*

---

## 3. Infrastructure, Git & Config Survey (R5)

### 3.1 Git Status & Branch Requirements
- **Command working directory**: `c:\www\smart-nfe`
- **Current branch**: `master` (up to date with `origin/master`).
- **Existing branches**:
  - `master`
  - `fix/frontend-xml-conferencia-v0.1.1`
  - Remote: `origin/master`, `origin/fix/frontend-xml-conferencia-v0.1.1`, `origin/vercel/react-server-components-cve-vu-w5k6aq`
- **Status**: Master branch is clean (only untracked `.agents/teamwork/` metadata files).
- **Mandatory Constraint**:
  - Branch `feature/preparacoes-unificadas` must be created from `master` without modifying `master` directly:
    ```bash
    git checkout -b feature/preparacoes-unificadas
    ```
  - Absolute prohibition on direct commits to `master`, unapproved merges, unauthorized deployments, and unapproved GitHub Actions triggers.

### 3.2 Dependencies & Build Environment
- **Node.js**: Node 20+ runtime.
- **Next.js**: `16.0.10` (App Router, Turbopack enabled).
- **React**: `19.2.0` / `react-dom: 19.2.0`.
- **CSS / Styling**: `@tailwindcss/postcss: ^4`, `tailwindcss: ^4`, `clsx: ^2.1.1`, `tailwind-merge: ^3.4.0`.
- **Icons**: `@fortawesome/fontawesome-svg-core: ^7.1.0`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/free-regular-svg-icons`, `@fortawesome/free-brands-svg-icons`, `@fortawesome/react-fontawesome: ^3.1.0`.
- **Linter**: `eslint: ^9`, `eslint-config-next: 16.0.3`.
- **Package Scripts**:
  - `npm run dev`: starts Next.js development server.
  - `npm run build`: verified clean execution (`next build` finishes with exit code 0 in ~12.6s).
  - `npm run lint`: verified clean execution (`eslint` finishes with exit code 0).
  - `npm test`: runs `node --no-warnings --test tests/**/*.test.mjs` (383 tests passing in ~10.7s).

### 3.3 Autonomous Vercel Execution (No PHP Backend)
- **Codebase Audit for Network / API Calls**:
  - Scanned all JavaScript/JSX files for `fetch(`, `http://`, `https://`, `/api/`.
  - Zero calls to `smart-nfe-api` or PHP backend.
  - Zero Next.js server API routes (`app/api/` does not exist).
  - Client-side browser execution:
    - XML reading via browser `DOMParser`.
    - Arithmetic via pure BigInt in `decimal.js`.
    - Storage via `localStorageService.js` and in-memory `Map` instances (`sessionInvoices`).
- **Conclusion**: The application is 100% self-contained and ready for standalone serverless / static deployment on Vercel without any external PHP server dependency.

### 3.4 Screen Tours Configuration (`app/config/screenTours.js`)
- **Current Screens Mapped** (8 operational routes):
  1. `dashboard` (`/dashboard`, `/`)
  2. `documentos_importar` (`/documentos/importar`)
  3. `documentos` (`/documentos`)
  4. `documentos_conferencia` (`/documentos/[id]/conferencia`)
  5. `documentos_validacao` (`/documentos/[id]/validacao`)
  6. `documentos_divisao` (`/documentos/[id]/divisao`)
  7. `notas_preparadas` (`/notas-preparadas`)
  8. `configuracoes` (`/configuracoes`)
- **Required Updates**:
  - Add `preparacoes`:
    - `routeKey: 'preparacoes'`
    - `route: '/preparacoes'`
    - `title: 'Gestão de Preparações de Exportação'`
    - Description of preparation lifecycle, draft management, and batch monitoring.
  - Add `preparacoes_nova`:
    - `routeKey: 'preparacoes_nova'`
    - `route: '/preparacoes/nova'`
    - `title: 'Nova Preparação Unificada (N → M)'`
    - Steps explaining origin selection, destination definition, matrix allocation, and decimal balance conservation.
  - Update `getRouteKeyByPath(pathname)`:
    ```js
    if (cleanPath === '/preparacoes/nova') return 'preparacoes_nova';
    if (cleanPath === '/preparacoes') return 'preparacoes';
    ```
  - Update aliases:
    ```js
    SCREEN_TOURS['/preparacoes'] = SCREEN_TOURS.preparacoes;
    SCREEN_TOURS['/preparacoes/nova'] = SCREEN_TOURS.preparacoes_nova;
    ```
  - Update `resetAllScreenTours()` `knownRouteKeys` array to include `'preparacoes'` and `'preparacoes_nova'`.

---

## 4. Verification & Mock Scenarios Survey

### 4.1 Existing Test Harness
- The test harness is built entirely upon the **Node.js native test runner** (`node:test`) and strict assertions (`node:assert/strict`).
- Native ESM modules (`.test.mjs`) allow direct asynchronous imports of application code without transpilation overhead.
- Performance:
  - 104 suites, 383 tests.
  - Total duration: **10.77 seconds**.
  - Pass rate: **100% (383 pass, 0 fail)**.
- Recommendation: Maintain the established `node:test` architecture. There is no need to introduce heavier external dependencies like Jest or Vitest, as the existing setup is already fully integrated with `package.json` (`npm test`).

### 4.2 Current Fixtures Status
Directory `tests/fixtures/` currently contains only 4 synthetic XML files:
1. `synthetic_nfe_export_proc.xml` (5,586 bytes, valid `nfeProc` v4.00, 2 items, export destination NL).
2. `synthetic_nfe_simple.xml` (5,378 bytes, valid `NFe` root, 2 items).
3. `synthetic_nfe_invalid_key.xml` (5,586 bytes, corrupted Modulo 11 check digit).
4. `synthetic_malformed.xml` (407 bytes, unclosed tag syntax error).

### 4.3 Mock XML Fixtures Strategy (2 to 50 Invoices)
To verify the requirements of R3 and R5, a programmatic fixture generator and test suites must be implemented:
- **XML Generator Helper (`tests/fixtures/xmlFixtureGenerator.mjs`)**:
  - Generates valid NF-e 4.00 XML strings with:
    - Deterministic or parameterized 44-digit access keys with valid Modulo 11 check digits.
    - Customizable `<emit>` (Suppliers 1..10 across MT, SP, SC, PR, GO).
    - Customizable `<dest>` (Foreign destinations: NL, US, CN, DE, BE, CL).
    - Customizable `<det>` items (quantities with up to 4 decimal places, unit prices, product codes, NCM, CFOP 7101, units: SC, KG, TON, UN, CX).
    - Exact SEFAZ financial totals reconciliation (`vProd`, `vFrete`, `vSeg`, `vDesc`, `vOutro`, `vNF`).
- **Required Mock Scenarios**:
  1. **Minimal Grouping (2 -> 1)**: 2 XMLs from 2 distinct suppliers (e.g., Agroexport SP and Cooperativa MT) aggregated into 1 export note (Global Trading NL).
  2. **Division (1 -> M)**: 1 XML with 10 items split into 3 destination export notes.
  3. **Mixed Allocation (N -> M)**: 5 invoices from 3 suppliers allocated across 3 destination export notes.
  4. **Multi-Supplier & Repeated Product Codes**: Multiple invoices containing identical product code (e.g., `EXP-SOJ-001`), verifying that items remain distinct by `(sourceInvoiceId, sourceItemId)` and are not merged without explicit intent.
  5. **Incompatible Units Trap**: Invoices offering the same commodity in incompatible units (e.g., `SC` vs `KG` vs `TON`), verifying that the validation engine flags unit mismatches and prevents improper arithmetic aggregation.
  6. **Scale Stress Batch (50 -> 5)**: 50 synthetic XML invoices (10 suppliers, 200+ line items) distributed into 5 shipping container export notes, verifying memory stability, UI responsiveness, and exact cent-by-cent conservation.

---

## 5. Architectural Blueprint for Implementation

### 5.1 New & Modified Files Directory Map
```
c:\www\smart-nfe\
├── app/
│   ├── config/
│   │   └── screenTours.js                      # [MODIFY] Add preparacoes & preparacoes_nova tours
│   ├── features/
│   │   ├── invoiceRepository.js                # [MODIFY] Expose active allocation balance helpers
│   │   ├── preparedInvoiceRepository.js        # [MODIFY] Support sourceInvoiceId + sourceItemId items
│   │   └── preparationRepository.js            # [NEW] Preparation & draft lifecycle repository
│   ├── lib/
│   │   ├── calculations/
│   │   │   ├── allocationEngine.js             # [NEW] Unified N -> M allocation & conservation engine
│   │   │   └── divisionMath.js                 # [MODIFY] Delegate to allocationEngine for legacy compat
│   │   └── storage/
│   │       └── localStorageService.js          # [MODIFY] Register STORAGE_KEYS.PREPARATIONS
│   ├── preparacoes/
│   │   ├── page.jsx                            # [NEW] Preparation management & drafts dashboard
│   │   └── nova/
│   │       └── page.jsx                        # [NEW] High-density N -> M preparation workspace
│   └── components/
│       └── Layouts/
│           └── SmartNFeSidebar.jsx             # [MODIFY] Include navigation link to /preparacoes
└── tests/
    ├── fixtures/
    │   └── xmlFixtureGenerator.mjs             # [NEW] Programmatic generator for 2..50 XML fixtures
    └── integration/
        ├── flow_e_preparation_n_to_m.test.mjs  # [NEW] N->1, 1->M, N->M allocation engine test suite
        └── flow_f_scale_50_invoices.test.mjs   # [NEW] 50->5 scale stress & memory isolation suite
```

### 5.2 Preparation Entity Data Contract
```js
{
  id: 'prep-20261113-001',
  tipo: 'agrupamento' | 'divisao' | 'misto',
  titulo: 'Lote Exportação Roterdã 01',
  status: 'rascunho' | 'finalizado',
  isDemo: boolean,
  hasRealInvoices: boolean,
  dataCriacao: '2026-11-13T...',
  dataAtualizacao: '2026-11-13T...',
  sourceInvoiceIds: ['demo-01', 'demo-02'],
  destinationNotes: [
    {
      id: 'dest-01',
      nome: 'Nota Destino A (Lote Holanda)',
      destinatario: {
        nome: 'Global Trading Logistics B.V.',
        pais: 'Holanda',
        paisCodigo: 'NL',
        idEstrangeiro: 'NL884920192B01',
        uf: 'EX',
      },
      // Chave composta determinística: `${sourceInvoiceId}__${sourceItemId}`
      allocations: {
        'demo-01__d1-1': '250.0000',
        'demo-02__d2-1': '10.0000',
      },
    },
  ],
}
```

### 5.3 Unified Allocation Invariants (BigInt Precision)
1. **Conservation Invariant**: For every item $i$ in source invoice $S$:
   $$\text{saldoDisponivel}(S, i) = \text{quantidadeOriginal}(S, i) - \sum_{k=1}^{M} \text{alocado}(k, S, i)$$
2. **Non-Negativity & Excess Trap**:
   $$\forall k, \text{alocado}(k, S, i) \ge 0 \quad \land \quad \text{saldoDisponivel}(S, i) \ge 0$$
   Any negative allocation or allocation exceeding available balance immediately sets `canSave: false` and flags `hasExcess: true`.
3. **Ancillary Expenses Cent-Conservation**:
   For each source invoice $S$ with accessory expenses $E_S$ (freight, insurance, expenses, discount):
   $$\sum_{k=1}^{M} E_{S, k} = E_S \quad (\text{zero cent drift via remainder absorption in last active note})$$

---

## 6. Concrete Feature Inventory Items for `PROJECT.md`

The following features must be incorporated into `PROJECT.md`:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 23 | Unified Allocation Engine (N → M) | BigInt-based allocation engine in `app/lib/calculations/allocationEngine.js` calculating real-time balances across N sources and M destinations, enforcing `disponível = original - soma(alocações)`, unit compatibility checking, and exact cent-conserved expense apportionment | M6 | R3, R4, Explorer 3 |
| 24 | Preparation & Draft Repository | Async repository `app/features/preparationRepository.js` managing preparations and memory drafts with dual-storage isolation (volatile session Maps for real XMLs vs `localStorage` for demo scenarios) and deterministic composite keys | M6 | R3, R4, Explorer 3 |
| 25 | High-Density Nova Preparação UI | Compact, high-density matrix interface at `app/preparacoes/nova/page.jsx` with wide table, fixed headers, collapsible filters, sticky totals, tabbed source/destination panels, inline quick editing, and session privacy notice | M6 | R3, Explorer 3 |
| 26 | Preparation Management Dashboard | Centralized dashboard at `app/preparacoes/page.jsx` for managing preparations and resuming drafts, with status filters, simulated XML downloads, and backward-compatible aliasing with `/notas-preparadas` | M6 | R3, Explorer 3 |
| 27 | Legacy Division Backward Compatibility | Refactor `app/documentos/[id]/divisao/page.jsx` to delegate calculations internally to `allocationEngine.js` while maintaining exact 1 -> M UI behavior and `parentInvoiceId` backward compatibility | M6 | R4, Explorer 3 |
| 28 | Screen Tours Update for Preparações | Expand `app/config/screenTours.js` with structured tourtips for `/preparacoes` and `/preparacoes/nova`, route aliases, path resolvers, and reset handlers | M6 | R5, Explorer 3 |
| 29 | Synthetic XML Fixture Generator (2..50) | Programmatic generator in `tests/fixtures/xmlFixtureGenerator.mjs` creating valid NF-e 4.00 XMLs with Modulo 11 access keys, covering 2->1 grouping, 1->M division, multi-supplier, repeated product codes, incompatible units, and 50->5 scale batches | M6 | R5, Explorer 3 |
| 30 | Automated Preparation & Scale Test Suite | Automated integration tests in `tests/integration/flow_e_preparation_n_to_m.test.mjs` and `flow_f_scale_50_invoices.test.mjs` verifying N->1, 1->M, N->M workflows, BigInt conservation, draft session isolation, and build compliance | M6 | R3, R5, Explorer 3 |

---

## 7. Build, Lint & Verification Status

| Verification Command | Observed Result | Status |
|----------------------|-----------------|--------|
| `node --no-warnings --test tests/**/*.test.mjs` | 383 passed, 0 failed, 104 suites, 10.7s | **PASSED** |
| `npm run lint` | ESLint 9 core-web-vitals completed with 0 errors / 0 warnings | **PASSED** |
| `npm run build` | Next.js 16.0.10 (Turbopack) compiled 11 static/dynamic pages in 12.6s | **PASSED** |
| `git status` | Clean master branch (only `.agents/teamwork/` metadata files modified/untracked) | **READY** |
