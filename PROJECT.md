# Project: SmartNFe — Frontend MVP (Fase 1 com Dados Mockados)

## Architecture
- **Stack**: Next.js 16 (App Router), React 19, JavaScript/JSX (zero TypeScript), Tailwind CSS 4, Font Awesome 7, pnpm, Node 24 native test runner (`node:test`).
- **Mode**: Pure Frontend MVP with Mock Data & LocalStorage persistence. No real HTTP calls to backend `smart-nfe-api`.
- **Layout Shell**: `AppLayout` wrapping `SmartNFeSidebar`, `SmartNFeHeader`, `ToastContainer`, `DemoBadge` ("Modo Demonstração" visible on all screens).
- **Domain Layer**:
  - `app/lib/data/`: 5 realistic export NF-e demo scenarios (`demo-01` to `demo-05`).
  - `app/lib/calculations/`: Pure decimal string arithmetic (unitPrice * qty, discounts, freight, invoice totals, splitting balances). No binary float imprecision.
  - `app/lib/formatters/`: Currency BRL, Brazilian dates (native Intl, no moment), numbers/quantities, and status labels.
  - `app/lib/storage/`: Versioned `localStorageService.js` (schema `1.0.0`) with `save`, `load`, `reset`, `resetAll`.
  - `app/features/`: Async repositories (`invoiceRepository.js`, `preparedInvoiceRepository.js`) providing `list`, `findById`, `update`, `updateItem`, `getValidationIssues`.
- **Routes & Screens**:
  - `/dashboard`: KPI summary cards, quick demo load, recent documents table.
  - `/documentos/importar`: Drag-and-drop XML/PDF + 5 quick scenario cards.
  - `/documentos`: Filterable, paginated documents list with action buttons.
  - `/documentos/[id]/conferencia`: Dense inline editable table with Tab/Enter navigation, real-time decimal recalculation, auto-save.
  - `/documentos/[id]/divisao`: Multi-invoice destination allocation with real-time balance validation.
  - `/documentos/[id]/validacao`: Visual validation panel for simulated fiscal issues (`demo-04`) with assistance.
  - `/notas-preparadas`: List of generated split invoices with preview and simulated XML download.
  - `/configuracoes`: User UI preferences (density, theme, limits, master resetAll).

## Code Layout
```
c:\www\smart-nfe\
├── app/
│   ├── components/
│   │   ├── Layouts/           # AppLayout, SmartNFeSidebar, SmartNFeHeader, DemoBadge, ToastContainer, Dialog, etc.
│   │   ├── buttons/           # Button
│   │   ├── cards/             # Card, CardTitle, CardBody, CardActions
│   │   ├── inputs/            # InputText, InputNumber, InputFile
│   │   ├── table/             # DataTable (explicit columns support)
│   │   └── fiscal/            # FiscalBadge, InvoiceSummaryCard, etc.
│   ├── context/
│   │   └── AppContext.jsx     # Global provider (toasts, darkMode, settings)
│   ├── lib/
│   │   ├── data/              # mockInvoices.js (demo-01 to demo-05)
│   │   ├── calculations/      # decimal.js, invoiceTotals.js, divisionMath.js
│   │   ├── formatters/        # currency.js, dates.js, numbers.js, status.js
│   │   └── storage/           # localStorageService.js (schema 1.0.0)
│   ├── features/              # invoiceRepository.js, preparedInvoiceRepository.js
│   ├── dashboard/             # /dashboard
│   ├── documentos/            # /documentos, /documentos/importar, /documentos/[id]/*
│   ├── notas-preparadas/      # /notas-preparadas
│   ├── configuracoes/         # /configuracoes
│   └── layout.jsx             # Root layout with AppContextProvider
├── tests/                     # E2E & automated test suite (node:test)
│   ├── tier1/                 # Feature coverage tests (formatters, calculations, mocks, storage)
│   ├── tier2/                 # Boundary & corner cases (quantities, zero values, balance limits)
│   ├── tier3/                 # Cross-feature & live HTTP route smoke tests (http://localhost:3000)
│   ├── tier4/                 # Real-world end-to-end user workflows
│   └── tier5/                 # Adversarial coverage hardening
├── package.json
├── next.config.js
└── eslint.config.mjs
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1 Foundation Cleanup | Remove basePath & export from next.config.js (done), fix eslint.config.mjs, avoid moment.js | M1 | Survey 1, Survey 3 |
| 2 | R1 Layout Shell | AppLayout, SmartNFeSidebar with root Importar menu, SmartNFeHeader, DemoBadge with "Modo Demonstração" | M1 | Survey 1, Acceptance Criteria 59-60 |
| 3 | R1 Component Adaptations | DataTable explicit columns, InputFile XML/PDF drag-and-drop & 10MB limit, Dialog toast integration | M1 | Survey 1, Survey 2 |
| 4 | R1 AppContext & Toasts | AppContext toasts (success, error, warning, info), settings preferences, darkMode | M1 | Survey 1, Survey 2 |
| 5 | R3.1 Dashboard Screen | `/dashboard` screen with 5 KPI summary cards, quick demo load, recent documents table, responsive AppLayout | M1 | Survey 1, Survey 2, User Priority |
| 6 | R2 Demo Scenarios (5) | `demo-01` (8 items), `demo-02` (25 items), `demo-03` (50 items), `demo-04` (errors), `demo-05` (15 repeated items) | M2 | Survey 2 |
| 7 | R2 Decimal Math Engine | Pure decimal string arithmetic for unit price * quantity, discounts, freights, invoice totals, balances | M2 | Survey 2 |
| 8 | R2 Central Formatters | BRL currency, BR dates (native Intl), quantities/numbers, status badges | M2 | Survey 2 |
| 9 | R2 Versioned LocalStorage | `localStorageService.js` schema 1.0.0 with save, load, reset, resetAll | M2 | Survey 2 |
| 10 | R2 Async Repositories | `invoiceRepository.js` & `preparedInvoiceRepository.js` (list, findById, update, updateItem, getValidationIssues) | M2 | Survey 2 |
| 11 | R3.2 Import Screen | `/documentos/importar`: drag-and-drop XML/PDF upload simulation + quick demo load cards | M3 | Survey 2 |
| 12 | R3.3 Documents List Screen | `/documentos`: list with search, status/type filters, pagination, navigation to conference/division/validation | M3 | Survey 2 |
| 13 | R3.8 Settings Screen | `/configuracoes`: table density, rows per page, demo limits, autoSave, master resetAll factory mocks | M3 | Survey 2 |
| 14 | R3.4 Conference Editor | `/documentos/[id]/conferencia`: dense table, inline cell editing, Tab/Enter keyboard nav, decimal totals recalc, auto-save | M4 | Survey 2 |
| 15 | R3.6 Validation Assistant | `/documentos/[id]/validacao`: fiscal inconsistency panel (for demo-04), error/warning categorization, fix suggestions | M4 | Survey 2 |
| 16 | R3.5 Invoice Splitting | `/documentos/[id]/divisao`: multi-destination invoice distribution, real-time remaining balance validation, excess blocking | M5 | Survey 2 |
| 17 | R3.7 Prepared Invoices Screen | `/notas-preparadas`: list of generated split invoices, Danfe mirror preview, simulated XML download, deletion | M5 | Survey 2 |
| 18 | R4 E2E Test Suite Pass | 100% of Tiers 1-4 tests pass via Node test runner (`node --test`) without breaking dev server | M6 | Survey 3 |
| 19 | R4 Adversarial Hardening | Tier 5 adversarial coverage hardening with challenger gap detection | M6 | Survey 3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | M1_Foundation_Dashboard | R1 foundation fixes, AppLayout, Sidebar (root Importar), DemoBadge ("Modo Demonstração"), AppContext toasts, `/dashboard` operational screen (USER PRIORITY 1) | none | DONE |
| M2 | M2_Core_Domain_Services | R2: 5 demo scenarios, decimal calculations, formatters, localStorage 1.0.0, async repositories | M1 | DONE |
| M3 | M3_Document_Management_Screens | R3: `/documentos/importar`, `/documentos` list with filters/pagination, `/configuracoes` UI preferences | M2 | DONE |
| M4 | M4_Conference_Validation_Screens | R3: `/documentos/[id]/conferencia` (dense table, inline edit, Tab/Enter, recalc), `/documentos/[id]/validacao` (inconsistency assistant) | M2 | DONE |
| M5 | M5_Splitting_Prepared_Invoices_Screens | R3: `/documentos/[id]/divisao` (multi-note balance distribution), `/notas-preparadas` management | M2, M4 | DONE |
| M6 | M6_Final_Integration_E2E | Final Milestone: 100% E2E tests pass (Tiers 1-4) + Tier 5 adversarial hardening | M1-M5, TEST_READY.md | PLANNED |

## Parallel E2E Testing Track
- **Orchestrator**: E2E Testing Sub-orchestrator (`teamwork_orchestrator`)
- **Scope**: Requirements-based opaque-box test suite (Tiers 1-4) using Node 24 native test runner (`node --test tests/**/*.test.mjs`). Publishes `TEST_READY.md` upon completion.
- **Dependencies**: none (derived independently from requirements in `ORIGINAL_REQUEST.md`).

## Interface Contracts

### 1. `app/lib/calculations/` ↔ UI Components
- `calculateItemTotal(unitPriceStr, quantityStr)` -> `string` (2 decimal places)
- `calculateInvoiceTotals(items, discountStr, freightStr, insuranceStr)` -> `{ totalProducts, totalDiscount, totalFreight, totalInsurance, totalInvoice }` (all strings formatted to 2 decimals)
- `calculateRemainingBalance(originalQtyStr, allocatedQtyArray)` -> `{ balanceStr, status: 'ok' | 'remaining' | 'excess' }`

### 2. `app/lib/storage/localStorageService.js` ↔ App & Repositories
- `save(key, data)` -> `boolean` (saves with `{ version: '1.0.0', timestamp: Date.now(), data }`)
- `load(key, fallback)` -> `data` (validates version '1.0.0'; returns fallback if missing/corrupt)
- `reset(key)` -> `void` (resets specific key to factory mock)
- `resetAll()` -> `void` (resets all SmartNFe storage keys to factory mocks)

### 3. `app/features/invoiceRepository.js` ↔ Screens
- `list(filters)` -> `Promise<Array<Invoice>>` (filters: `query`, `status`, `type`, `page`, `pageSize`)
- `findById(id)` -> `Promise<Invoice | null>`
- `update(id, partialData)` -> `Promise<Invoice>`
- `updateItem(id, itemId, partialItemData)` -> `Promise<Invoice>`
- `getValidationIssues(id)` -> `Promise<Array<ValidationIssue>>`
- `resetDemoData()` -> `Promise<void>`

### 4. `app/features/preparedInvoiceRepository.js` ↔ Screens
- `list(filters)` -> `Promise<Array<PreparedInvoice>>`
- `findById(id)` -> `Promise<PreparedInvoice | null>`
- `create(preparedInvoice)` -> `Promise<PreparedInvoice>`
- `delete(id)` -> `Promise<boolean>`

### 5. `app/context/AppContext.jsx` ↔ Components
- `toast`: `{ success(msg), error(msg), warning(msg), info(msg) }`
- `settings`: `{ tableDensity, rowsPerPage, demoValueLimit, showOriginalValues, autoSave }`
- `updateSettings(newSettings)` -> `void`
- `darkMode`: `boolean`, `toggleDarkMode()` -> `void`
