# Project: SmartNFe — Frontend XML Model 55 & Fiscal Conference Engine

## Architecture
- **Stack**: Next.js 16 (App Router), React 19, JavaScript/JSX (zero TypeScript), Tailwind CSS 4, Font Awesome 7, pnpm, Node 24 native test runner (`node:test`).
- **Branch**: `fix/frontend-xml-conferencia-v0.1.1` (strict zero-commit rule on master).
- **Mode**: Pure Frontend running in browser with dual-storage architecture:
  - **Mock Data**: Persisted in `localStorageService` (schema `1.0.0`) for demo scenarios (`demo-01` to `demo-05`).
  - **Real XML Imports**: Maintained exclusively in transient in-memory session (`sessionInvoices = new Map()`) inside `invoiceRepository.js`. Never saved to persistent `localStorage` to protect sensitive fiscal data and avoid polluting factory mocks.
- **XML Processing Layer (`app/features/xml/`)**:
  - `nfeXmlParser.js`: Browser-native `DOMParser` reading NF-e model 55 XML (`nfeProc` and `NFe` layouts), namespace-agnostic querying (`getElementsByTagNameNS('*', localName)`), safe error handling.
  - `accessKeyValidator.js`: 44-digit structural validation and Modulo 11 check digit verification (weights 2 to 9).
  - `xmlToInvoiceMapper.js`: Normalization to `invoiceRepository` contract with stable, deterministic item IDs (`nfe-${chaveAcesso}-item-${nItem}`).
- **Domain & Calculation Engine (`app/lib/calculations/`)**:
  - `decimal.js`: BigInt-based fixed-point arithmetic (`decimalAdd`, `decimalSubtract`, `decimalMultiply`, `decimalDivide`, `decimalCompare`). Zero IEEE-754 binary float operations.
  - `invoiceTotals.js`: `calculateItemTotal`, `calculateInvoiceTotals` with full preservation of freight, insurance, other expenses, and discounts.
  - `divisionMath.js`: Precise multi-note distribution and balance conservation with 4 decimal places.
- **UI & Presentation (`app/documentos/`)**:
  - `importar/page.jsx`: Real XML model 55 import via File API (`File.text()`), validation feedback, session storage warning banner.
  - `[id]/conferencia/page.jsx`: Dense inline editable table keyed by stable `itemId`, immutable state updates, filter/sort independence, original value snapshot and restore (`valorOriginal`), live totals comparison, keyboard navigation (Enter/Escape).
  - `[id]/validacao/page.jsx`: Fiscal validation assistant with explicit confirmation modal (current vs proposed, rule origin, risk badge), undo stack with automatic re-validation, and safe "Corrigir todas" review blocking bulk changes on sensitive fields (CFOP, NCM, tax).
  - `[id]/divisao/page.jsx`: Splitting engine distributing products with exact decimal precision, remaining balance allocation, strict excess/unallocated blocking, and ancillary expense conservation.

## Code Layout
```
c:\www\smart-nfe\
├── app/
│   ├── components/
│   │   ├── Layouts/           # AppLayout, SmartNFeSidebar, SmartNFeHeader, DemoBadge, ToastContainer, Dialog, etc.
│   │   ├── buttons/           # Button, PillsBadge
│   │   ├── cards/             # Card, CardTitle, CardBody, CardActions
│   │   ├── inputs/            # InputText, InputNumber, InputFile
│   │   └── table/             # DataTable
│   ├── context/
│   │   └── AppContext.jsx     # Global provider (toasts, darkMode, settings)
│   ├── lib/
│   │   ├── data/              # mockInvoices.js (demo-01 to demo-05)
│   │   ├── calculations/      # decimal.js, invoiceTotals.js, divisionMath.js
│   │   ├── formatters/        # currency.js, dates.js, numbers.js, status.js
│   │   └── storage/           # localStorageService.js (schema 1.0.0)
│   ├── features/
│   │   ├── invoiceRepository.js         # Async repository with in-memory session Map
│   │   ├── preparedInvoiceRepository.js # Split invoices repository
│   │   └── xml/                         # Browser XML NF-e 55 Engine
│   │       ├── nfeXmlParser.js          # DOMParser, namespaces, error handling
│   │       ├── accessKeyValidator.js    # 44-digit & Modulo 11 DV validation
│   │       └── xmlToInvoiceMapper.js    # Data contract mapper with itemId
│   ├── dashboard/             # /dashboard
│   ├── documentos/            # /documentos, /documentos/importar, /documentos/[id]/*
│   ├── notas-preparadas/      # /notas-preparadas
│   ├── configuracoes/         # /configuracoes
│   └── layout.jsx             # Root layout
├── tests/                     # Automated test suites
│   ├── integration/           # Integration tests for Fluxos A, B, C, D
│   │   ├── flow_a_xml_import.test.mjs
│   │   ├── flow_b_conferencia_stable_edit.test.mjs
│   │   ├── flow_c_division_balances.test.mjs
│   │   └── flow_d_validation_safe_fix_undo.test.mjs
│   ├── fixtures/              # Synthetic NF-e 55 XML fixtures (nfeProc, NFe, invalid)
│   ├── tier1/                 # Feature coverage tests
│   ├── tier2/                 # Boundary & corner cases
│   ├── tier3/                 # Cross-feature combinations
│   ├── tier4/                 # Real-world application scenarios
│   └── tier5/                 # Adversarial coverage hardening
├── package.json
├── next.config.js
└── eslint.config.mjs
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Browser XML NF-e 55 Parser | Native DOMParser for `nfeProc` and `NFe` layouts, namespace-safe extraction, graceful parsererror handling | M1 | R3, Spec Miner 2 |
| 2 | Chave de Acesso 44-digit & Mod 11 | Structural verification and Modulo 11 check digit calculation (weights 2 to 9) | M1 | R3, Spec Miner 2 |
| 3 | XML to Invoice Contract Mapper | Maps SEFAZ tags to `invoiceRepository` schema with deterministic `itemId` | M1 | R3, Spec Miner 2 |
| 4 | In-Memory Session Repository | Volatile `sessionInvoices = new Map()` in `invoiceRepository.js` isolating real XMLs from LocalStorage | M1 | R3, Spec Miner 2 |
| 5 | XML Import UI & Flow | `app/documentos/importar/page.jsx` File API integration, validation alerts, session privacy banner | M1 | R3, Spec Miner 2 |
| 6 | Stable `itemId` Conference Editing | Locate and update items by stable `itemId` using immutable state updates | M2 | R1, Explorer 1 |
| 7 | Filter/Sort Safe Editing | Editing products while table is filtered (NCM/description) or sorted updates exclusively the targeted item | M2 | R1, Explorer 1 |
| 8 | Pure Decimal Recalculation | Eliminate `parseFloat`, `.toFixed(2)`, `Math.round` from conference; centralize in `decimal.js` & `invoiceTotals.js` | M2 | R1, Explorer 1 |
| 9 | Ancillary Expense Preservation | Reconcile and preserve freight, insurance, other expenses, and discounts without overriding totals | M2 | R1, Explorer 1 |
| 10 | Original Values Snapshot & Restore | Preserve `valorOriginal`, render strikethrough comparison, and provide single/all item restore actions | M2 | R1, R4, Explorer 1 |
| 11 | Conference UI Enhancements | XML Mod 55 badge, product counts, original vs recalculated totals comparison, demo vs local session mode | M2 | R4, Explorer 1 |
| 12 | Keyboard Navigation | Enter key advances focus to same field in next row; Escape restores or cancels focus | M2 | R4, Explorer 1 |
| 13 | Explicit Fiscal Fix Confirmation | Modal displaying current vs proposed value, rule origin, and fiscal risk warning before applying fix | M3 | R2, Explorer 3 |
| 14 | Undo Mechanism for Fiscal Fixes | `undoStack` in validation page with one-click undo restoring previous state and re-running validations | M3 | R2, Explorer 3 |
| 15 | Safe "Corrigir todas" Review | Review modal separating mechanical fixes from sensitive fiscal fields (CFOP/NCM/tax); block bulk changes on sensitive fields | M3 | R2, Explorer 3 |
| 16 | Splitting Pure Decimal Engine | Exact product quantity distribution in `app/documentos/[id]/divisao/page.jsx` supporting 4 decimal places | M4 | R1, R4, Explorer 3 |
| 17 | Remaining Balance Allocation | Distribute residual balance to single note or equally among notes with zero float imprecision | M4 | R4, Explorer 3 |
| 18 | Strict Splitting Validation Traps | Block allocated qty > original qty; update `divisionMath.js` to set `canSave: false` when remaining balance exists | M4 | R4, Explorer 3 |
| 19 | Ancillary Expense Apportionment | Prorate and preserve freight, insurance, and other expenses across prepared split invoices | M4 | R1, R4, Explorer 3 |
| 20 | Automated Integration Test Suite | Automated integration tests for Fluxos A, B, C, D in `tests/integration/` using synthetic fixtures | M5 | R5, Explorer 3 |
| 21 | ESLint Zero-Error Resolution | Update `eslint.config.mjs` `globalIgnores` for dead HR template components, achieving 0 errors on `pnpm lint` | M5 | R5, Explorer 3 |
| 22 | Build Gate & Branch Compliance | 0 errors on `pnpm build`, 0 errors on `pnpm lint`, strict residency on branch `fix/frontend-xml-conferencia-v0.1.1` | M5 | R5, Explorer 1, 3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | M1_XML_Browser_Parser_Session_Repo | Features 1, 2, 3, 4, 5: `app/features/xml/` engine, session in-memory repo, `/documentos/importar` real XML import | none | DONE |
| M2 | M2_Conference_Table_Decimal_Recalc | Features 6, 7, 8, 9, 10, 11, 12: `itemId` stability, filter/sort safety, pure decimal math, `valorOriginal` diff/restore, UI badges & keyboard nav | none | DONE |
| M3 | M3_Validation_Safety_Assistant_Undo | Features 13, 14, 15: Explicit confirmation modal, `undoStack`, safe "Corrigir todas" blocking sensitive bulk changes | M1, M2 | DONE |
| M4 | M4_Invoice_Splitting_Balance_Conservation | Features 16, 17, 18, 19: Pure decimal division, remaining balance distribution, strict `canSave` traps, expense apportionment | M2 | DONE |
| M5 | M5_Integration_Tests_Lint_Build_Gate | Features 20, 21, 22: Integration test suite (Fluxos A, B, C, D), ESLint 0 errors, `pnpm build` 0 errors, git branch verification | M1, M2, M3, M4 | DONE |

## Parallel E2E Testing Track
- **Orchestrator**: E2E Testing Sub-orchestrator (`teamwork_orchestrator`)
- **Scope**: Requirements-based opaque-box test suite (Tiers 1-4 + Integration Fluxos A, B, C, D) using synthetic XML fixtures (`nfeProc`, `NFe`, invalid). Publishes `TEST_READY.md` upon completion.
- **Dependencies**: none (derived independently from requirements in `ORIGINAL_REQUEST.md`).

## Interface Contracts

### 1. `app/features/xml/nfeXmlParser.js` ↔ Importer UI
- `parseNFeXml(xmlString)` -> `{ success: boolean, data?: ExtractedNFeData, error?: string, details?: object }`
- Supports `nfeProc` and `NFe` roots, handles namespaces transparently, detects `parsererror`.

### 2. `app/features/xml/accessKeyValidator.js` ↔ Parser & Validator
- `validateAccessKey(accessKey)` -> `{ isValid: boolean, error?: string, details?: { uf, anoMes, cnpjEmitente, modelo, serie, numeroNF, tipoEmissao, codigoAleatorio, dv } }`
- Calculates Modulo 11 check digit with weights [2..9].

### 3. `app/features/xml/xmlToInvoiceMapper.js` ↔ `invoiceRepository.js`
- `mapXmlToInvoice(extractedData)` -> `Invoice` conforming strictly to repository contract with `id: 'nfe-' + chaveAcesso`, deterministic `itemId: 'nfe-' + chaveAcesso + '-item-' + nItem`, `isRealImport: true`, `isDemo: false`.

### 4. `app/features/invoiceRepository.js` Session Boundary
- `sessionInvoices = new Map()` holds real imported documents in memory.
- `create(invoiceData)` stores real documents in session Map without calling `localStorageService.save()`.
- `findById(id)` checks session Map first, then falls back to `localStorageService`.
- `list(filters)` combines session documents with persisted mock scenarios.
- `update(id, partialData)` / `updateItem(id, itemId, partialItem)` mutates session Map directly for real documents.
- `resetDemoData()` resets only persistent localStorage mocks, preserving the active session.

### 5. `app/documentos/[id]/conferencia/page.jsx` Editing & Snapshot Contract
- `handleItemChange(itemId, field, value)`: Finds item by `item.id === itemId`, takes initial immutable snapshot in `valorOriginal`, recalculates `valorTotal` with `calculateItemTotal(unit, qty)`, flags `modificado: true`.
- `handleRestoreItem(itemId)`: Reverts item to `item.valorOriginal`.
- `handleRestoreAll()`: Reverts all modified items to original values.
- Totals calculation uses `calculateInvoiceTotals(items, invoice.totais)` preserving freight, insurance, and discounts.

### 6. `app/documentos/[id]/validacao/page.jsx` Confirmation & Undo Contract
- Fix confirmation modal payload: `{ issueId, itemId, itemNumero, itemDescricao, campo, labelCampo, valorAtual, valorProposto, origemRegra, isSensivel }`.
- Undo stack entry: `{ issueId, itemId, campo, valorAnterior, valorNovo, timestamp }`.
- Calling undo updates `invoiceRepository.updateItem(id, itemId, { [campo]: valorAnterior })` and re-runs `loadData()`.
