# Handoff Report: E2E Test Suite Specification Mining (Flows A–F)

**Agent**: `teamwork_spec_miner` (`e2e_spec_miner_3`)  
**Mission**: Authoritative specification mining and 4-Tier test case mapping for the 6 SmartNFe integration test suites (`flow_a` through `flow_f`).  
**Working Directory**: `c:\www\smart-nfe`  
**State Folder**: `c:\www\smart-nfe\.agents\teamwork\e2e_spec_miner_3\`  
**Date**: 2026-11-13  
**Integrity Mode**: demo / read-only  

---

## 1. Observation

Direct code and specification observations gathered across authoritative sources:

1. **Test Runner & Harness**:
   - `package.json:20`: `"test": "node --no-warnings --test tests/**/*.test.mjs"`. Tests run on Node.js native test runner (`node:test`) and strict assertions (`node:assert/strict`) without external testing dependencies.
   - Baseline test execution: 104 suites, 383 tests passing in 10.7 seconds with zero failures.
   - Current `tests/integration/` contains legacy test files (`flow_a_xml_import.test.mjs`, `flow_b_conferencia_stable_edit.test.mjs`, `flow_c_division_balances.test.mjs`, `flow_d_validation_safe_fix_undo.test.mjs`). The 6 unified integration test suites defined in `TEST_INFRA.md` (`flow_a_drawer_layout.test.mjs` through `flow_f_scale_50_invoices.test.mjs`) and `tests/fixtures/xmlFixtureGenerator.mjs` do not yet exist.

2. **Left Drawer & Layout (R1)**:
   - `app/components/Layouts/AppLayout.jsx:10`: `const [sidebarCollapsed, setSidebarCollapsed] = useState(false);` currently isolates sidebar state locally in React component state instead of `AppContext.jsx`.
   - `app/components/Layouts/AppLayout.jsx:13-17`: Does not synchronize with `localStorage.getItem('smartnfe_sidebar_collapsed')`, does not inspect viewport width $\le 1024$px, and lacks a mobile drawer overlay backdrop and Escape key listener.
   - `app/context/AppContext.jsx:21-26`: Employs `useSyncExternalStore` for hydration safety (`mounted`), but lacks sidebar collapse/expand state, mobile drawer state (`mobileDrawerOpen`), and responsive listener.

3. **Multi-XML Importer & Batch Queue (R2)**:
   - `app/documentos/importar/page.jsx:96`: `const [selectedFile, setSelectedFile] = useState(null);` processes only a single file at a time; `<input type="file">` lacks `multiple` attribute.
   - `app/documentos/importar/page.jsx`: Lacks batch queue concurrency pool (target: 3 concurrent workers), per-file retry button, and intra-batch 44-digit access key duplicate detection.
   - `app/features/invoiceRepository.js:26`: `export const sessionInvoices = new Map();` correctly isolates imported real XMLs in volatile memory, avoiding localStorage leakage.

4. **Document Search & 8-Facet Filters (R2)**:
   - `app/documentos/page.jsx:74-87`: Currently filters documents only by raw text `searchTerm` and a single `statusFilter`, without debouncing (target: 300ms debounce).
   - Missing 8-facet filter state: assigned export client (`clienteAtribuido`), supplier, NCM, product code/description, date range, monetary range, balance status (`Disponível`, `Parcial`, `Esgotado`), and status.
   - Visual grouping and stable multi-selection across paging/filters do not yet exist in `app/documentos/page.jsx`.

5. **BigInt Allocation Engine (R4)**:
   - `app/lib/calculations/decimal.js:1-336`: Full BigInt arbitrary precision fixed-point math implemented (`decimalAdd`, `decimalSubtract`, `decimalMultiply`, `decimalDivide`, `decimalCompare`, `roundDecimal` with ABNT NBR 5891 Half-Up).
   - `app/lib/calculations/divisionMath.js:64-100`: `calculateRemainingBalance` computes balances for single-invoice splitting (1 -> M), but multi-invoice matrix allocation (`app/lib/calculations/allocationEngine.js`) is not yet implemented.
   - `app/features/preparedInvoiceRepository.js:1-206`: Currently lacks `sessionPreparedInvoices = new Map()`, which causes real prepared notes to leak into localStorage.

6. **Preparation Routes & Workflows (R3)**:
   - `app/preparacoes/page.jsx` and `app/preparacoes/nova/page.jsx`: Routes do not exist yet.
   - `app/features/preparationRepository.js`: Does not exist yet.
   - `app/config/screenTours.js:26-483`: Contains 8 tour keys but lacks entries for `preparacoes` and `preparacoes_nova`.

7. **Synthetic XML Fixtures (R5)**:
   - `tests/fixtures/`: Contains only 4 static synthetic XML files. Programmatic generator for 2 to 50 XMLs (`xmlFixtureGenerator.mjs`) is absent.

---

## 2. Logic Chain

1. **Deduction from R1 & AppLayout.jsx**: To prevent React 19 hydration mismatch while persisting desktop drawer state, `sidebarCollapsed` must be initialized safely post-mount using `smartnfe_sidebar_collapsed` in localStorage. For viewports $\le 1024$px, default must be collapsed, opening as an overlay with backdrop, Escape key handler with `e.preventDefault()`, and close button. Tests in `flow_a_drawer_layout.test.mjs` must assert persistence, hydration invariants, mobile overlay behavior, and keyboard event cancellation without breaking table layouts or `ScreenTourTip`.
2. **Deduction from R2 & Importar/Documentos**: Ingesting multiple XMLs simultaneously requires a batch queue with bounded concurrency ($\le 3$ workers) to prevent UI thread starvation. Real XMLs must reside exclusively in volatile memory (`sessionInvoices`), duplicate 44-digit keys must be trapped both against session and within the batch, and failed files must be individually retryable. On `/documentos`, 300ms debouncing, 8 combinable facets, visual grouping, and stable selection across state mutations are mandatory.
3. **Deduction from R4 & Decimal Calculations**: The unified allocation engine must handle $N \to 1$, $1 \to M$, and $N \to M$ under the conservation invariant:
   $$\text{disponível}(S, i) = \text{original}(S, i) - \sum_{k=1}^M \text{alocado}(k, S, i) - \text{ativas}(S, i)$$
   Allocating $> \text{disponível}$ or $< 0$ must flag `hasExcess: true` and block saving (`canSave: false`). Accessory expenses (`frete`, `seguro`, `outrasDespesas`, `desconto`) must be apportioned with zero floating-point drift, absorbing leftover cents into the last active destination note. Units must be strictly checked (`checkUnitCompatibility`).
4. **Deduction from R3 & High-Density UI**: Workspace at `/preparacoes/nova` must preserve origin identity using composite key `${sourceInvoiceId}__${sourceItemId}`. Products sharing identical product codes across suppliers must not merge. Drafts containing real XMLs must stay in volatile memory (`sessionPreparations`), triggering explicit session loss warnings on navigation or reload.
5. **Deduction from R5 & Scale 50 Invoices**: Generating 50 XMLs with 10 suppliers and 200+ line items tests the upper bound of client-side execution. Ingestion through the 3-worker concurrency pool, allocation across 5 containers, memory heap stability (no memory leaks), and 100% quarantine from localStorage must be asserted.

---

## 3. Caveats

1. Implementation code in `app/` and `tests/` is actively being authored by companion worker agents under the orchestration plan; this report specifies authoritative criteria, test matrices, and verification assertions without writing implementation code.
2. In Node.js testing environment (`node:test`), DOM/browser globals (`window`, `localStorage`, `DOMParser`) are emulated via lightweight fixtures, `localStorageService` fallback maps, and `MiniElement` in `nfeXmlParser.js`. Tests must exercise contracts both in Node.js test runner and browser runtime.
3. Real XML fixtures must never be committed to git or stored in localStorage. All test fixtures must be synthetically generated using valid Modulo 11 access keys.

---

## 4. Conclusion

The specification mining for SmartNFe's E2E Testing Track is complete. The 6 integration test suites (`flow_a` through `flow_f`) have been mapped into 36 distinct feature sub-domains across all 5 user requirements (R1–R5). Every feature has been specified with $\ge 5$ Tier 1 isolated functional tests, $\ge 5$ Tier 2 boundary/corner cases, 25+ Tier 3 pairwise interactions, and 6 full Tier 4 real-world workload scenarios.

---

## 5. Verification Method

- **Full Project Test Execution**:
  ```bash
  node --no-warnings --test tests/**/*.test.mjs
  ```
- **Targeted Integration Test Execution**:
  ```bash
  node --no-warnings --test tests/integration/flow_a_drawer_layout.test.mjs
  node --no-warnings --test tests/integration/flow_b_multi_xml_import.test.mjs
  node --no-warnings --test tests/integration/flow_c_documents_filters.test.mjs
  node --no-warnings --test tests/integration/flow_d_allocation_engine.test.mjs
  node --no-warnings --test tests/integration/flow_e_preparation_n_to_m.test.mjs
  node --no-warnings --test tests/integration/flow_f_scale_50_invoices.test.mjs
  ```
- **Lint & Build Verification**:
  ```bash
  npm run lint
  npm run build
  ```
- **Pass Threshold**: Exit code 0, 0 test failures, 100% mathematical balance conservation, zero localStorage leakage for real XMLs.

---

# Authoritative Feature & Specification Inventory

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Layout (R1) | Desktop Drawer Persistence | Stores and retrieves sidebar collapse state in `smartnfe_sidebar_collapsed` in localStorage. Defaults to expanded ($>1024$px). | User click on sidebar toggle button | Sidebar width toggles between `w-60` (expanded) and `w-14` (collapsed); localStorage updated | Fallback to expanded if localStorage is unavailable or corrupted | `AppLayout.jsx`, `SmartNFeSidebar.jsx`, PROJECT.md F8 |
| 2 | Layout (R1) | Safe Hydration Initialization | Prevents React 19 SSR/client mismatch by deferring localStorage state sync until post-mount via `useSyncExternalStore` or `useEffect`. | SSR HTML render vs Client hydration | Identical initial DOM structure during hydration; smooth transition post-mount | No console `hydration-error` or DOM mismatch warnings | `AppContext.jsx`, PROJECT.md F8 |
| 3 | Layout (R1) | Mobile Drawer Overlay ($\le 1024$px) | On screens $\le 1024$px, drawer renders as a sliding overlay with fixed backdrop rather than pushing page content. | Viewport width $\le 1024$px; toggle click | Drawer slides out over content; semi-transparent backdrop (`fixed inset-0 bg-black/50`) renders | Automatic dismissal on window resize to $>1024$px | `AppLayout.jsx`, `SmartNFeHeader.jsx`, PROJECT.md F9 |
| 4 | Layout (R1) | Escape Key Listener with `preventDefault` | Closes mobile drawer upon pressing the `Escape` key, preventing event propagation to parent modals or tour tips. | `KeyboardEvent { key: 'Escape' }` | `mobileDrawerOpen` set to `false`; backdrop removed | `e.preventDefault()` called; listener safely detached on unmount | `AppLayout.jsx`, PROJECT.md F9 |
| 5 | Layout (R1) | Accessible Header Mobile Toggle | Always-visible menu button in header on screens $\le 1024$px with standard ARIA accessibility attributes. | Screen reader navigation, click, or `Enter`/`Space` | Toggles mobile drawer; updates `aria-expanded` (`true`/`false`) and `aria-label` | Graceful fallback if context unmounted | `SmartNFeHeader.jsx`, PROJECT.md F9 |
| 6 | Layout (R1) | TourTip & Product Table Coexistence | Layout shifts from expanding/collapsing sidebar do not break table column headers or obscure open `ScreenTourTip` modals. | Sidebar toggle while data table or `ScreenTourTip` is rendered | Table recalculates width smoothly; `ScreenTourTip` remains visible at `z-50` | No table horizontal overflow clipping or broken tour positioning | `ScreenTourTip.jsx`, `AppLayout.jsx`, PROJECT.md F8, F9 |
| 7 | Import (R2) | Multi-XML Drag-and-Drop Ingestion | Allows simultaneous drag-and-drop or file picker selection of multiple NF-e XML files into a batch ingestion queue. | Multiple `.xml` files via `dataTransfer.files` or `<input multiple>` | Batch queue populated with file entries in `pending` state | Non-XML files rejected immediately with format warning | `app/documentos/importar/page.jsx`, PROJECT.md F10 |
| 8 | Import (R2) | Concurrency-Limited Worker Pool | Processes batch queue with maximum 3 concurrent XML parsing tasks, yielding execution to prevent UI thread lockup. | Array of enqueued XML files | Up to 3 active worker promises running simultaneously; subsequent files wait | Promise rejection handled per file; remaining pool continues | PROJECT.md F11, TEST_INFRA.md F4 |
| 9 | Import (R2) | Dual-Level Progress Tracking | Real-time tracking displaying individual file progress (`pending`, `parsing`, `imported`, `error`) and global percentage bar. | Queue progress state events | Individual status badges + global progress bar (`0%` to `100%`) | Failed files marked with red badge; global bar completes to 100% | `app/documentos/importar/page.jsx`, PROJECT.md F12 |
| 10 | Import (R2) | One-Click Failure Retry | Enables retrying individual failed files or all failed files without re-uploading or re-parsing successfully imported files. | Click on "Tentar novamente" or "Repetir falhas" | Failed items re-enqueued to worker pool; state reset to `pending` | If file remains invalid, error badge reappears with specific cause | `app/documentos/importar/page.jsx`, PROJECT.md F12 |
| 11 | Import (R2) | 44-Digit Access Key Duplicate Detection | Validates 44-digit key with Modulo 11 check digit; detects duplicates against session documents and within the batch. | Extracted `chaveAcesso` (44 digits) | Duplicate detected: item flagged `DUPLICATE_KEY` with existing document reference | Clear warning: "Chave de acesso já importada no lote/sessão"; file skipped | `accessKeyValidator.js`, PROJECT.md F13 |
| 12 | Import (R2) | Fiscal Session Isolation & Privacy Notice | Real imported XML documents stored exclusively in volatile memory (`sessionInvoices = new Map()`); zero localStorage leakage. | Valid parsed NF-e object | Stored in `sessionInvoices`; warning banner displayed regarding session loss | Attempt to write real XML to localStorage blocked | `invoiceRepository.js`, PROJECT.md F14 |
| 13 | Documents (R2) | 300ms Debounced Search | Debounces input queries by 300ms across invoice number, access key, supplier, recipient, assigned client, NCM, and product. | Text input string | Document list filtered after 300ms of typing inactivity | Rapid keystrokes trigger only 1 pipeline evaluation; empty input clears | `app/documentos/page.jsx`, PROJECT.md F15 |
| 14 | Documents (R2) | Combinable 8-Facet Document Filters | Multi-facet filtering by assigned client, supplier, NCM, product, date range, monetary range, balance, and status. | 8 filter parameters (individually or combined) | Filtered array of invoices matching all active criteria (logical AND) | Empty result displays "Nenhum documento encontrado" with reset action | `app/documentos/page.jsx`, PROJECT.md F16 |
| 15 | Documents (R2) | Switchable Visual Grouping | Groups document table visually by Supplier (`emitente`) or Assigned Export Client (`clienteAtribuido`). | Grouping mode toggle (`none`, `supplier`, `client`) | Accordion/collapsible group sections with subtotal headers and item counts | Unassigned documents grouped under "Sem cliente atribuído" | `app/documentos/page.jsx`, PROJECT.md F17 |
| 16 | Documents (R2) | Stable Multi-Selection Across Views | Selected document IDs maintained in a Set/Map across filtering, sorting, pagination, and grouping changes. | Checkbox toggles across documents | `selectedInvoiceIds` Set preserved; items stay checked upon returning to page | Deselecting removes ID; bulk group check toggles all items in group | `app/documentos/page.jsx`, PROJECT.md F18 |
| 17 | Documents (R2) | Selection Floating Action Bar & Counters | Floating bottom bar displaying real-time counters: selected documents, line items, BigInt monetary total, and distinct suppliers. | `selectedInvoiceIds` Set | Bottom toolbar visible when $\ge 1$ item selected; primary CTA: "Nova Preparação" | Automatically hides when all items are deselected | `app/documentos/page.jsx`, PROJECT.md F18 |
| 18 | Documents (R2) | Operational Assigned Export Client | Assigns operational export client (`clienteAtribuido`) without modifying immutable legal SEFAZ `destinatario`. | Document ID + Assigned Client Name | `invoice.clienteAtribuido` updated; SEFAZ `destinatario` unchanged | Cannot overwrite legal SEFAZ fields; assignment filterable | `invoiceRepository.js`, PROJECT.md F19 |
| 19 | Engine (R4) | BigInt Arbitrary Precision Arithmetic | Vectorized BigInt fixed-point arithmetic (`decimal.js`) eliminating binary floating-point drift (IEEE 754). | Decimal strings or numbers | Exact decimal strings; Half-Up rounding ABNT NBR 5891 | Div by zero returns `'0.00'` without throwing unhandled exception | `decimal.js`, PROJECT.md F3 |
| 20 | Engine (R4) | N $\to$ M Conservation Invariant Model | Enforces invariant: $\text{disponível} = \text{original} - \sum \text{alocado} - \text{ativas}$ across arbitrary sources and destinations. | `sourceItems`, `destinationNotes`, `activeAllocations` | Allocation matrix, `sourceBalances`, `canSave` boolean | Excess allocation ($> \text{original}$) sets `canSave: false` and `hasExcess: true` | `allocationEngine.js`, PROJECT.md F4 |
| 21 | Engine (R4) | Non-Negativity & Excess Blocking | Prevents negative allocations and blocks saving if any item allocation exceeds its available balance. | Numeric allocation input per item/destination cell | Real-time status: `ok` (green), `remaining` (amber), `excess` (red) | Red banner blocks finalization; save button disabled | `allocationEngine.js`, PROJECT.md F4 |
| 22 | Engine (R4) | Accessory Expense Cent Conservation | Proportional apportionment of freight, insurance, expenses, and discounts with remainder cent absorption into last active note. | Total accessory expenses + allocated ratios | Apportioned expenses per destination summing exactly to original | Zero cent drift: $\sum E_{\text{dest}} \equiv E_{\text{orig}}$ down to R$ 0.01 | `allocationEngine.js`, PROJECT.md F4 |
| 23 | Engine (R4) | Unit Compatibility Enforcement | Validates that source items sharing a destination line have compatible physical units (e.g., `SC` vs `KG` vs `TON`). | Item units (`uCom` / `unidade`) | `checkUnitCompatibility()` returns `true` (compatible) or `false` | Incompatible units flagged; combining blocked without explicit conversion | `allocationEngine.js`, PROJECT.md F4 |
| 24 | Engine (R4) | Legacy Division Backward Compatibility | `/documentos/[id]/divisao` and `parentInvoiceId` remain fully functional by delegating internally to `allocationEngine.js`. | Legacy 1 $\to$ M division inputs | Destination notes with `parentInvoiceId` and composite origin keys | 100% allocation rule enforced for legacy completion | `divisionMath.js`, PROJECT.md F7 |
| 25 | Preparation (R3) | Grouping Workflow ($N \to 1$) | Aggregates items from $N$ source invoices from multiple suppliers into 1 export destination note. | $N$ selected invoices, 1 destination note | Destination note containing all allocated items, preserving origin identity | Cannot merge items from different suppliers into an artificial single item | `app/preparacoes/nova/page.jsx`, PROJECT.md F20 |
| 26 | Preparation (R3) | Division Workflow ($1 \to M$) | Splits items from 1 source invoice across $M$ export destination shipping notes. | 1 source invoice, $M$ destination notes | $M$ prepared notes; source invoice marked `DIVIDIDA` upon 100% allocation | Partial allocation leaves source status as `PARCIAL` | `app/preparacoes/nova/page.jsx`, PROJECT.md F20 |
| 27 | Preparation (R3) | Mixed Preparation Workflow ($N \to M$) | Distributes items from $N$ source invoices across $M$ export destination notes with residual balances preserved. | $N$ source invoices, $M$ destination notes | Matrix allocations; partial unallocated quantities remain available | Any cell $> \text{available}$ triggers excess blocking | `app/preparacoes/nova/page.jsx`, PROJECT.md F20 |
| 28 | Preparation (R3) | Origin Identity Preservation | Each allocated item retains composite key `${sourceInvoiceId}__${sourceItemId}` and supplier metadata. | Source item and destination assignment | Line item with `sourceInvoiceId`, `sourceItemId`, `sourceSupplierName` | Identical product codes (`cProd`) across suppliers never clash | PROJECT.md F22, Explorer Survey 3 |
| 29 | Preparation (R3) | In-Memory Session Drafts & Lifecycle | Saves in-progress preparation drafts; real XML drafts stored in volatile memory, demo drafts in localStorage. | Preparation state object | Saved draft with ID, status `rascunho`, and timestamp | Active draft allocations count against available balances | `preparationRepository.js`, PROJECT.md F21 |
| 30 | Preparation (R3) | Session Loss Warning Banner | Prominent warning banner and `beforeunload` listener alerting user that real XML drafts reside in volatile session memory. | Navigation or reload attempt while session data active | Warning banner displayed; browser prompt on unload | Accidental reload blocked without user confirmation | `app/preparacoes/nova/page.jsx`, PROJECT.md F14, F20 |
| 31 | Scale (R5) | 50-XML Synthetic Fixture Generator | Programmatic generation of 50 valid NF-e 4.00 XMLs across 10 suppliers and 200+ line items with Modulo 11 access keys. | Generator parameters (count, suppliers, items) | Valid NF-e 4.00 XML strings with exact tax reconciliations | Corrupted key option available for negative testing | `xmlFixtureGenerator.mjs`, PROJECT.md F24 |
| 32 | Scale (R5) | Concurrency Queue Scale Ingestion | Ingestion of 50 XMLs simultaneously via concurrency pool limit 3 without UI thread starvation or call-stack overflow. | 50 XML files in single batch drop | All 50 files parsed and ingested into `sessionInvoices` | Graceful per-file error handling; queue drainage complete | `flow_f_scale_50_invoices.test.mjs`, PROJECT.md F25 |
| 33 | Scale (R5) | Multi-Destination Scale Allocation ($50 \to 5$) | Apportioning 200+ items across 5 destination shipping containers within performance threshold (<500ms matrix calculation). | 50 source documents, 5 destination notes | 1000 matrix cells calculated with zero drift | High-density table renders without scroll lagging | `flow_f_scale_50_invoices.test.mjs`, PROJECT.md F25 |
| 34 | Scale (R5) | Heap Memory Stability & Protection | Node.js heap memory usage monitored before, during, and after 50-invoice batch processing; no memory runaway. | 50 XML parse and allocation lifecycle | Memory consumption returns to baseline post-GC; no detached references | Heap growth bounded; zero unclosed event listeners | `flow_f_scale_50_invoices.test.mjs`, PROJECT.md F25 |
| 35 | Scale (R5) | Dual-Storage Quarantine Audit | Exhaustive scan verifying 0 bytes of real XML data or access keys exist in localStorage after processing 50 XMLs. | Post-import localStorage contents | `localStorage.getItem('smartnfe_invoices')` contains only demo data | Any real access key found in localStorage fails the audit | `flow_f_scale_50_invoices.test.mjs`, PROJECT.md F5, F14 |
| 36 | Scale (R5) | Zero Floating-Point Drift at Scale | Mathematical proof that $\sum \text{allocated} + \sum \text{remaining} \equiv \sum \text{original}$ across 200+ items and 10,000+ BigInt operations. | 200+ line item quantities and monetary values | Zero discrepancy down to 4 decimal places (qty) and 2 places (cents) | Any drift $> 0.0000$ fails verification | `flow_f_scale_50_invoices.test.mjs`, PROJECT.md F3, F4 |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Desktop Drawer Persistence | `localStorage.getItem('smartnfe_sidebar_collapsed')` returns invalid string `'undefined'` or `'foo'` | Defaults gracefully to expanded (`false`) on $>1024$px; resets invalid key |
| 2 | Safe Hydration Initialization | Browser window resized between SSR render and client mount | Post-mount listener correctly evaluates active window width without React hydration mismatch |
| 3 | Mobile Drawer Overlay | Rapid viewport resizing toggling across 1024px boundary | Overlay automatically unmounts when width exceeds 1024px; desktop sidebar restores smoothly |
| 4 | Escape Key Handler | Pressing `Escape` when mobile drawer is closed but `ScreenTourTip` is open | `ScreenTourTip` closes; mobile drawer handler ignores event; no error thrown |
| 5 | Escape Key Handler | Multiple Escape keypresses in rapid succession | First event closes drawer with `e.preventDefault()`; subsequent events ignored safely |
| 6 | Coexistence with Tables | Collapsing sidebar while editing inline input on wide matrix table | Table automatically expands horizontally; focused input retains cursor and focus state |
| 7 | Multi-XML Drag-and-Drop | Dropping folder or 0-byte file alongside valid XMLs | 0-byte file rejected with "Arquivo vazio"; valid XMLs continue processing |
| 8 | Multi-XML Drag-and-Drop | File with `.xml` extension containing binary or image data | DOMParser detects invalid XML syntax; file marked `error` ("Sintaxe XML inválida") |
| 9 | Concurrency Pool | 1 worker throws unhandled promise rejection (e.g., malformed tag) | Rejection trapped in worker scope; worker freed to process next file; batch completes |
| 10 | Concurrency Pool | Exact batch size equal to pool size (3 files) | All 3 process in parallel; completes simultaneously without deadlock |
| 11 | Concurrency Pool | Single file batch (1 file) | Worker pool processes 1 file immediately without waiting for pool fill |
| 12 | Duplicate Access Key | Dropping identical XML twice in the same multi-file drop | First instance parses successfully; second instance flagged `DUPLICATE_KEY` and skipped |
| 13 | Duplicate Access Key | Uploading XML whose access key matches existing active session invoice | Flagged as duplicate against session; user given option to view existing invoice |
| 14 | Retry Mechanism | Retrying file that was corrected while preserving already imported items | Retried file parses; previous successful items remain intact in session |
| 15 | Fiscal Session Isolation | Operator forces page reload with real XMLs in session | Volatile `sessionInvoices` cleared; browser warning displayed prior to reload |
| 16 | Debounced Search | Operator types query and clears it within 150ms (before debounce timeout) | Timeout cancelled; full unfiltered list immediately displayed |
| 17 | Debounced Search | Search string containing regex metacharacters (`*`, `+`, `?`, `[`, `(`, `)`) | Special characters sanitized or escaped; treated as literal substring match |
| 18 | 8-Facet Filters | Filter combination yields 0 matches across all criteria | Empty state displayed: "Nenhum documento encontrado"; "Limpar Filtros" resets all 8 facets |
| 19 | 8-Facet Filters | Filter by date range where `dataInicio > dataFim` | Validation message displayed; filter automatically swaps or clears dates |
| 20 | Visual Grouping | All documents belong to a single supplier | Single group header rendered with 100% item count; bulk select selects all |
| 21 | Stable Selection | Selecting 10 items, changing filter to show 0 items, then clearing filter | Selection set remains intact with all 10 items still selected and counted |
| 22 | Stable Selection | Deleting a document that was currently selected in the selection set | Deleted document ID automatically removed from `selectedInvoiceIds` Set |
| 23 | Operational Client | Assigning client to document with existing legal foreign `destinatario` | `clienteAtribuido` updated; legal SEFAZ `destinatario.nome` remains strictly unchanged |
| 24 | BigInt Decimal Math | Division resulting in repeating decimal (e.g. $10 / 3$) | Formats to exact target scale (e.g. `'3.3333'`) using Half-Up rounding ABNT NBR 5891 |
| 25 | BigInt Decimal Math | Apportioning R$ 0.01 across 3 destination shipping containers | Destination 1: R$ 0.01, Dest 2: R$ 0.00, Dest 3: R$ 0.00; Sum $\equiv$ R$ 0.01 |
| 26 | Conservation Invariant | Allocating exactly available balance ($100.0000 - 100.0000$) | Balance becomes `'0.0000'`, status `'ok'`, green badge, `canSave: true` |
| 27 | Conservation Invariant | Allocating 0.0001 above available balance ($100.0001$ of $100.0000$) | Balance becomes `'-0.0001'`, status `'excess'`, red badge, `canSave: false` |
| 28 | Conservation Invariant | Allocating negative quantity (`-5.0000`) | Flagged as invalid negative allocation; status `'excess'`, `canSave: false` |
| 29 | Unit Compatibility | Combining item with unit `'SC'` (sacas) and `'KG'` (quilogramas) | `checkUnitCompatibility()` returns `false`; aggregation blocked |
| 30 | Unit Compatibility | Combining items with units `'kg'` (lowercase) and `'KG'` (uppercase) | Case-insensitive normalization; returns `true` (compatible) |
| 31 | Legacy Division | Dividing invoice with 1 item into 2 destinations with 50%/50% split | Both destination items receive composite key `${id}__${itemId}` and root `parentInvoiceId` |
| 32 | Grouping ($N \to 1$) | Grouping 2 invoices containing identical product code `'PROD-01'` from different suppliers | Items remain separate rows with distinct `sourceInvoiceId` and supplier names |
| 33 | Mixed ($N \to M$) | Source item distributed across 5 destinations with partial remaining balance | Sum of 5 allocations + remaining balance strictly equals original quantity |
| 34 | Draft Lifecycle | Saving draft with 50% allocation, then modifying source invoice in session | Draft flags discrepancy on reload; operator prompted to reconcile |
| 35 | Scale Stress (50 XMLs) | Rapid simultaneous import of 50 XMLs totaling 25MB of text | Worker pool of 3 prevents heap overflow; total duration $< 5$s; 0 unhandled rejections |
| 36 | Scale Apportioning | 200 items distributed across 5 containers with accessory expenses | Aggregate sum of all apportioned lines exactly matches sum of original invoices to the cent |

---

# 4-Tier Test Case Mapping

## Tier 1: Isolated Functional Tests (≥5 per feature)

### Suite 1: `flow_a_drawer_layout.test.mjs` (Features 1–6)
- **Feature 1: Desktop Drawer Persistence**
  - Case A1.1: Given no saved preference and desktop viewport ($>1024$px), assert sidebar defaults to expanded (`w-60`).
  - Case A1.2: Clicking sidebar toggle button updates `smartnfe_sidebar_collapsed` in localStorage to `'true'`.
  - Case A1.3: Upon page reload with `'true'` in localStorage, sidebar initializes to collapsed (`w-14`).
  - Case A1.4: Clicking toggle button in collapsed state updates localStorage to `'false'` and expands sidebar.
  - Case A1.5: Navigating between routes (`/documentos` $\to$ `/preparacoes`) preserves sidebar collapsed state without resetting.
- **Feature 2: Safe Hydration Initialization**
  - Case A2.1: Initial SSR render produces deterministic HTML without reading `window.localStorage`.
  - Case A2.2: Hydration pass matches server-rendered markup with zero React hydration warnings.
  - Case A2.3: `useSyncExternalStore` or `useEffect` updates client state post-mount without cascading renders.
  - Case A2.4: Storage changes in another tab synchronize state via `storage` event listener.
  - Case A2.5: Unmounting layout safely unregisters storage listeners without memory leaks.
- **Feature 3: Mobile Drawer Overlay ($\le 1024$px)**
  - Case A3.1: Given viewport width $\le 1024$px, drawer defaults to closed/collapsed.
  - Case A3.2: Clicking header menu toggle opens mobile drawer overlay with semi-transparent backdrop.
  - Case A3.3: Mobile drawer overlay is styled with `fixed inset-y-0 left-0 z-40` or higher.
  - Case A3.4: Clicking on mobile backdrop calls dismiss handler and sets `mobileDrawerOpen: false`.
  - Case A3.5: Clicking dedicated close button inside mobile drawer closes overlay.
- **Feature 4: Escape Key Listener with `preventDefault`**
  - Case A4.1: Pressing `Escape` when mobile drawer is open closes the drawer.
  - Case A4.2: Escape keydown event executes `e.preventDefault()`.
  - Case A4.3: Pressing `Escape` when drawer is closed triggers no state mutation.
  - Case A4.4: Keydown listener is attached to `window` only when mobile drawer is open.
  - Case A4.5: Unmounting mobile drawer removes keydown listener from `window`.
- **Feature 5: Accessible Header Mobile Toggle**
  - Case A5.1: Mobile toggle button in header has `aria-label="Abrir menu"` when closed.
  - Case A5.2: Mobile toggle button updates to `aria-label="Fechar menu"` and `aria-expanded="true"` when open.
  - Case A5.3: Toggle button has `aria-controls` referencing drawer navigation id.
  - Case A5.4: Pressing `Enter` or `Space` on focused toggle button toggles drawer state.
  - Case A5.5: Toggle button is hidden on desktop viewports via `lg:hidden` class.
- **Feature 6: TourTip & Product Table Coexistence**
  - Case A6.1: Toggling sidebar between expanded and collapsed preserves wide table horizontal scrollability.
  - Case A6.2: `ScreenTourTip` modal renders at higher z-index (`z-50`) than sidebar (`z-30`/`z-40`).
  - Case A6.3: Pressing `Escape` when both drawer and `ScreenTourTip` are active prioritizes active top modal.
  - Case A6.4: Sidebar collapse animation triggers window resize event for responsive chart/table relayout.
  - Case A6.5: Tour target elements (e.g. `#tour-help-button`) remain clickable regardless of sidebar state.

### Suite 2: `flow_b_multi_xml_import.test.mjs` (Features 7–12)
- **Feature 7: Multi-XML Drag-and-Drop Ingestion**
  - Case B7.1: Dragging files over drop zone sets `dragActive: true` and applies visual hover styling.
  - Case B7.2: Dropping 5 valid XML files populates batch queue with 5 items in `pending` state.
  - Case B7.3: File input `<input type="file" multiple>` correctly accepts multiple file selections.
  - Case B7.4: Dropping a non-XML file (e.g., `invoice.pdf`) displays format rejection message.
  - Case B7.5: Drag leave event resets `dragActive: false` without triggering file processing.
- **Feature 8: Concurrency-Limited Worker Pool**
  - Case B8.1: Given 10 enqueued files, exactly 3 workers start parsing simultaneously.
  - Case B8.2: As worker 1 finishes, file 4 is dequeued and starts parsing immediately.
  - Case B8.3: Instantaneous count of active parsing promises never exceeds 3 at any timestamp.
  - Case B8.4: Worker pool yields control to event loop via `setTimeout(..., 0)` between tasks.
  - Case B8.5: Queue with 1 file processes immediately through a single worker.
- **Feature 9: Dual-Level Progress Tracking**
  - Case B9.1: Each file entry displays transitions: `pending` $\to$ `parsing` $\to$ `imported`.
  - Case B9.2: Global progress bar updates proportionally (e.g., 5 of 10 completed = 50%).
  - Case B9.3: Total, completed, failed, and remaining counters display accurate counts.
  - Case B9.4: Individual file progress bar reflects parsing stage completion.
  - Case B9.5: Global bar reaches 100% when all enqueued files reach terminal state (`imported` or `error`).
- **Feature 10: One-Click Failure Retry**
  - Case B10.1: Malformed XML triggers `error` status with error description.
  - Case B10.2: Failed file item displays dedicated "Tentar novamente" action button.
  - Case B10.3: Clicking retry re-enqueues only the failed file without affecting imported files.
  - Case B10.4: Global "Repetir todas as falhas" button re-enqueues all failed files at once.
  - Case B10.5: Successful retry transitions item state from `error` to `imported` and updates totals.
- **Feature 11: 44-Digit Access Key Duplicate Detection**
  - Case B11.1: Valid 44-digit access key is verified against SEFAZ Modulo 11 check digit.
  - Case B11.2: Importing an XML with access key matching an active session invoice flags `DUPLICATE_KEY`.
  - Case B11.3: Importing two identical XMLs in the same batch flags the second as duplicate.
  - Case B11.4: Duplicate warning displays invoice number, supplier, and original import timestamp.
  - Case B11.5: Duplicate item provides "Ignorar duplicata" action button to dismiss.
- **Feature 12: Fiscal Session Isolation & Privacy Notice**
  - Case B12.1: Successfully imported real XML files are saved to `sessionInvoices = new Map()`.
  - Case B12.2: `localStorage.getItem('smartnfe_invoices')` is verified to NOT contain real XML data.
  - Case B12.3: Prominent amber banner warns operator that data resides in volatile temporary memory.
  - Case B12.4: Calling `invoiceRepository.clearSession()` removes all real invoices from memory.
  - Case B12.5: Demo invoices (`demo-01` to `demo-05`) remain accessible in localStorage independently.

### Suite 3: `flow_c_documents_filters.test.mjs` (Features 13–18)
- **Feature 13: 300ms Debounced Search**
  - Case C13.1: Typing in search input delays filter execution by exactly 300ms.
  - Case C13.2: 5 rapid keystrokes within 150ms trigger exactly 1 filtering operation.
  - Case C13.3: Search matches invoice number (e.g., `'145892'`).
  - Case C13.4: Search matches supplier company name (`'Agroexport'`).
  - Case C13.5: Search matches product description or NCM across nested line items.
- **Feature 14: Combinable 8-Facet Document Filters**
  - Case C14.1: Filter by assigned client returns only documents matching selected `clienteAtribuido`.
  - Case C14.2: Filter by supplier (`emitente`) returns only documents from that supplier.
  - Case C14.3: Filter by date range (`dataInicio` to `dataFim`) filters issue dates correctly.
  - Case C14.4: Filter by monetary value range (`valorMin` to `valorMax`) filters by `valorTotal`.
  - Case C14.5: Combining 4 active facets applies strict logical AND intersection.
- **Feature 15: Switchable Visual Grouping**
  - Case C15.1: Switching to "Agrupar por Fornecedor" groups table rows under supplier headers.
  - Case C15.2: Supplier group header displays supplier name, CNPJ, document count, and total value.
  - Case C15.3: Switching to "Agrupar por Cliente" groups rows by assigned export client.
  - Case C15.4: Documents with no assigned client are grouped under "Sem cliente atribuído".
  - Case C15.5: Group header accordion toggle collapses and expands group items.
- **Feature 16: Stable Multi-Selection Across Views**
  - Case C16.1: Checking an invoice adds its ID to `selectedInvoiceIds` Set.
  - Case C16.2: Navigating from page 1 to page 2 and back maintains selected checkbox state.
  - Case C16.3: Applying a filter that hides a selected item does not remove it from the selection Set.
  - Case C16.4: Group header bulk-checkbox selects all documents currently visible in that group.
  - Case C16.5: Unchecking group header bulk-checkbox deselects all items in that group.
- **Feature 17: Selection Floating Action Bar & Counters**
  - Case C17.1: Floating action bar appears at bottom of screen when $\ge 1$ document is selected.
  - Case C17.2: Selected documents counter displays exact count of selected invoices.
  - Case C17.3: Total line items counter sums all line items across selected documents.
  - Case C17.4: Monetary total displays exact BigInt sum formatted in BRL currency.
  - Case C17.5: Clicking "Limpar Seleção" empties selection Set and dismisses floating bar.
- **Feature 18: Operational Assigned Export Client**
  - Case C18.1: Document model includes `clienteAtribuido` field defaulting to `null`.
  - Case C18.2: Assigning export client updates `clienteAtribuido` to `'Rotterdam Grain B.V.'`.
  - Case C18.3: SEFAZ legal `destinatario.nome` remains strictly unmodified after assignment.
  - Case C18.4: Bulk assignment updates `clienteAtribuido` across all currently selected documents.
  - Case C18.5: Filtering by "Sem cliente atribuído" returns all unassigned documents.

### Suite 4: `flow_d_allocation_engine.test.mjs` (Features 19–24)
- **Feature 19: BigInt Arbitrary Precision Arithmetic**
  - Case D19.1: `decimalAdd('0.1', '0.2', 2)` returns `'0.30'` (eliminating IEEE 754 drift).
  - Case D19.2: `decimalSubtract('100.0000', '33.3333', 4)` returns `'66.6667'`.
  - Case D19.3: `decimalMultiply('12.5000', '10.00', 2)` returns `'125.00'`.
  - Case D19.4: `decimalDivide('100.00', '3', 2)` returns `'33.33'` (Half-Up ABNT NBR 5891).
  - Case D19.5: `decimalCompare('10.0001', '10.0000')` returns `1`.
- **Feature 20: N $\to$ M Conservation Invariant Model**
  - Case D20.1: Given 1 item with quantity 100, allocating 40 to Dest 1 and 60 to Dest 2 yields balance `'0.0000'`.
  - Case D20.2: Given active allocation of 20 from prior preparation, available balance is calculated as 80.
  - Case D20.3: Engine calculates balances using composite key `${sourceInvoiceId}__${sourceItemId}`.
  - Case D20.4: `calculateAllocationMatrix` outputs `matrix`, `sourceBalances`, `canSave`, and `totals`.
  - Case D20.5: Invariant holds: $\sum \text{allocated} + \sum \text{remaining} \equiv \sum \text{original}$.
- **Feature 21: Non-Negativity & Excess Blocking**
  - Case D21.1: Allocating negative quantity (`'-10.0000'`) sets `hasNegative: true` and `canSave: false`.
  - Case D21.2: Allocating 105 when available is 100 sets `hasExcess: true` and `canSave: false`.
  - Case D21.3: Item with excess allocation receives `status: 'excess'` and red visual badge.
  - Case D21.4: Correcting excess allocation restores `hasExcess: false` and `canSave: true`.
  - Case D21.5: Finalize preparation call throws error or returns rejected promise if `canSave === false`.
- **Feature 22: Accessory Expense Cent Conservation**
  - Case D22.1: Proportional freight apportionment across 2 equal destinations splits freight exactly 50/50.
  - Case D22.2: Dividing R$ 100.01 freight across 3 equal destinations produces 33.34, 33.34, 33.33 (sum = 100.01).
  - Case D22.3: Zero cent drift: sum of destination insurance values matches original invoice insurance.
  - Case D22.4: Zero cent drift: sum of destination discount values matches original invoice discount.
  - Case D22.5: Zero cent drift: sum of destination other expenses matches original invoice other expenses.
- **Feature 23: Unit Compatibility Enforcement**
  - Case D23.1: Combining two items with identical unit `'KG'` returns `checkUnitCompatibility: true`.
  - Case D23.2: Combining items with `'SC'` (sacas) and `'KG'` returns `checkUnitCompatibility: false`.
  - Case D23.3: Combining items with `'TON'` and `'UN'` returns `checkUnitCompatibility: false`.
  - Case D23.4: Case-insensitive check: `'kg'` vs `'KG'` returns `true`.
  - Case D23.5: Incompatible units flag warning banner in preparation matrix.
- **Feature 24: Legacy Division Backward Compatibility**
  - Case D24.1: Single-invoice division in `divisionMath.js` returns identical output structure.
  - Case D24.2: Generated destination notes retain `parentInvoiceId` reference.
  - Case D24.3: Legacy division requires 100% allocation (zero residual balance) to allow saving.
  - Case D24.4: Route `/documentos/[id]/divisao` functions without regressions.
  - Case D24.5: `preparedInvoiceRepository.list({ parentInvoiceId })` returns legacy prepared notes.

### Suite 5: `flow_e_preparation_n_to_m.test.mjs` (Features 25–30)
- **Feature 25: Grouping Workflow ($N \to 1$)**
  - Case E25.1: Selecting 3 source invoices creates 1 export destination note.
  - Case E25.2: Destination note contains line items from all 3 source invoices.
  - Case E25.3: Destination note assigns foreign recipient data (`idEstrangeiro`, foreign address).
  - Case E25.4: Destination note applies export CFOP 7101.
  - Case E25.5: Finalizing grouping marks source invoices as conciliated and creates 1 prepared note.
- **Feature 26: Division Workflow ($1 \to M$)**
  - Case E26.1: Selecting 1 source invoice allows creating $M = 3$ destination shipping notes.
  - Case E26.2: Line items are apportioned across the 3 destination notes.
  - Case E26.3: Allocating 100% of all items transitions source invoice status to `DIVIDIDA`.
  - Case E26.4: Each generated destination note is registered in `preparedInvoiceRepository`.
  - Case E26.5: Destination notes maintain link to original invoice via `parentInvoiceId`.
- **Feature 27: Mixed Preparation Workflow ($N \to M$)**
  - Case E27.1: Selecting 4 source invoices allows distributing across 2 destination notes.
  - Case E27.2: Partial allocation leaves positive residual balance on source items.
  - Case E27.3: Source invoices with partial allocations receive status `PARCIAL`.
  - Case E27.4: Unallocated residual balances remain available for subsequent preparation batches.
  - Case E27.5: Finalizing mixed preparation creates preparation record in `preparationRepository`.
- **Feature 28: Origin Identity Preservation**
  - Case E28.1: Every allocated item retains `sourceInvoiceId` and `sourceItemId`.
  - Case E28.2: Every allocated item retains `sourceSupplierName` and `sourceSupplierCnpj`.
  - Case E28.3: Two source items with identical product code `'SOJA-01'` remain separate destination rows.
  - Case E28.4: Querying destination item by origin key returns original source line item data.
  - Case E28.5: XML export simulator generates separate `<det>` tags preserving distinct origins.
- **Feature 29: In-Memory Session Drafts & Lifecycle**
  - Case E29.1: Clicking "Salvar Rascunho" creates draft with status `rascunho`.
  - Case E29.2: Draft preserves destination configurations and matrix allocation quantities.
  - Case E29.3: Drafts containing real XMLs are saved exclusively to `sessionPreparations = new Map()`.
  - Case E29.4: Resuming a saved draft restores matrix inputs and balance indicators.
  - Case E29.5: Deleting a draft frees its allocated quantities back to available balances.
- **Feature 30: Session Loss Warning Banner**
  - Case E30.1: Preparation referencing real session XML displays prominent amber warning banner.
  - Case E30.2: Navigating away from `/preparacoes/nova` with active draft displays exit confirmation.
  - Case E30.3: `window.beforeunload` event triggers browser reload protection prompt.
  - Case E30.4: Discarding session explicitly clears draft from memory.
  - Case E30.5: Demo-only preparations do not show the volatile session warning banner.

### Suite 6: `flow_f_scale_50_invoices.test.mjs` (Features 31–36)
- **Feature 31: 50-XML Synthetic Fixture Generator**
  - Case F31.1: `generateSyntheticXmlBatch(50)` generates array of 50 valid XML strings.
  - Case F31.2: Batch includes 10 distinct suppliers across MT, SP, PR, GO, and SC.
  - Case F31.3: Total line item count across batch exceeds 200 items.
  - Case F31.4: Every 44-digit access key has a valid Modulo 11 check digit.
  - Case F31.5: Total values reconcile: $\sum vProd + vFrete + vSeg + vOutro - vDesc \equiv vNF$.
- **Feature 32: Concurrency Queue Scale Ingestion**
  - Case F32.1: Ingesting 50 XMLs simultaneously completes without unhandled promise rejections.
  - Case F32.2: Concurrency pool maintains active tasks $\le 3$ throughout ingestion.
  - Case F32.3: All 50 XMLs are successfully parsed and stored in `sessionInvoices`.
  - Case F32.4: Ingestion of 50 XMLs finishes within 5000ms in Node.js test runner.
  - Case F32.5: Queue progress events fire sequentially from 1 to 50.
- **Feature 33: Multi-Destination Scale Allocation ($50 \to 5$)**
  - Case F33.1: 50 source documents (200+ items) loaded into allocation engine matrix.
  - Case F33.2: Allocating 200+ items across 5 shipping containers executes in $< 500$ms.
  - Case F33.3: Matrix accurately computes balances across 1000 allocation cells ($200 \times 5$).
  - Case F33.4: All 5 destination notes receive allocated items with proper origin keys.
  - Case F33.5: Finalizing scale preparation creates 5 prepared notes in `preparationRepository`.
- **Feature 34: Heap Memory Stability & Protection**
  - Case F34.1: `process.memoryUsage().heapUsed` measured before and after batch processing.
  - Case F34.2: Heap growth remains bounded ($< 50$MB net delta after GC).
  - Case F34.3: XML string buffers are released from memory post-parsing.
  - Case F34.4: Event listener count on `window`/`document` does not grow unbounded.
  - Case F34.5: Temporary DOM tree instances (`MiniElement`) are garbage-collected cleanly.
- **Feature 35: Dual-Storage Quarantine Audit**
  - Case F35.1: After ingesting 50 real XMLs, `localStorage.getItem('smartnfe_invoices')` is scanned.
  - Case F35.2: Zero access keys from the 50 XMLs are found in localStorage.
  - Case F35.3: Zero supplier names or CNPJs from the 50 XMLs are found in localStorage.
  - Case F35.4: `localStorage.getItem('smartnfe_prepared_invoices')` contains zero real prepared notes.
  - Case F35.5: Only predefined demo keys (`demo-01` to `demo-05`) exist in localStorage.
- **Feature 36: Zero Floating-Point Drift at Scale**
  - Case F36.1: Sum of all 200+ allocated quantities + remaining balances strictly equals original sum.
  - Case F36.2: Aggregate monetary value across 5 containers reconciles down to R$ 0.00.
  - Case F36.3: Total accessory expenses apportioned across 5 containers match original sum to the cent.
  - Case F36.4: Executing 10,000 BigInt operations yields 0.000000000% floating-point drift.
  - Case F36.5: Comparison with binary floating-point math demonstrates drift in float vs zero drift in BigInt.

---

## Tier 2: Boundary and Corner Cases (≥5 per feature)

### Suite 1: `flow_a_drawer_layout.test.mjs`
- **Feature 1**:
  - Edge A1.1: `smartnfe_sidebar_collapsed` in localStorage contains empty string `""` $\to$ falls back to expanded default.
  - Edge A1.2: localStorage throws `QuotaExceededError` on setItem $\to$ gracefully falls back to in-memory state.
  - Edge A1.3: User rapidly clicks toggle button 20 times in 1 second $\to$ state alternates cleanly without race conditions.
  - Edge A1.4: Value `'TRUE'` (uppercase) in localStorage $\to$ normalized to boolean `true`.
  - Edge A1.5: Private/incognito mode blocking localStorage $\to$ operates via MemoryStorage fallback.
- **Feature 2**:
  - Edge A2.1: Server render receives desktop user-agent, client mounts on mobile $\to$ no hydration mismatch.
  - Edge A2.2: Mount occurs during rapid page transition $\to$ cleanup function cancels pending timeouts.
  - Edge A2.3: Custom event `'smartnfe:sidebar-toggled'` dispatched with null detail $\to$ handled safely.
  - Edge A2.4: React strict mode double-invoking mount effect $\to$ no duplicate listeners registered.
  - Edge A2.5: Document `classList` toggling during hydration $\to$ no DOM attribute mismatch warnings.
- **Feature 3**:
  - Edge A3.1: Viewport width exactly 1024px $\to$ treated as mobile ($\le 1024$px), drawer collapsed by default.
  - Edge A3.2: Viewport width 1025px $\to$ treated as desktop ($> 1024$px), drawer expanded by default.
  - Edge A3.3: Rapid viewport resizing oscillating around 1024px $\to$ overlay cleans up without ghost backdrops.
  - Edge A3.4: Backdrop clicked while mobile drawer is still animating $\to$ dismisses immediately.
  - Edge A3.5: Mobile drawer opened, device orientation changes from portrait to landscape ($>1024$px) $\to$ overlay closes.
- **Feature 4**:
  - Edge A4.1: Escape pressed while focus is inside an active text input inside drawer $\to$ closes drawer with `preventDefault`.
  - Edge A4.2: Escape pressed when mobile drawer is closed $\to$ event propagates normally (no `preventDefault`).
  - Edge A4.3: Escape pressed during ScreenTourTip modal $\to$ ScreenTourTip closes first; mobile drawer remains as-is.
  - Edge A4.4: Holding Escape key down (key repeat) $\to$ first event closes; subsequent repeated events ignored.
  - Edge A4.5: Escape key event with `e.defaultPrevented === true` prior to handler $\to$ handled without duplicate action.
- **Feature 5**:
  - Edge A5.1: Toggle button clicked via touch event on mobile with high latency $\to$ triggers once without double-fire.
  - Edge A5.2: Screen reader virtual click (accessibility trigger) $\to$ toggles drawer and announces updated state.
  - Edge A5.3: Focus rings on toggle button in high-contrast mode $\to$ visible outline maintained.
  - Edge A5.4: Toggle button rendered while header breadcrumbs overflow $\to$ toggle button maintains fixed size and visibility.
  - Edge A5.5: Rapid keyboard navigation Tab through header $\to$ toggle button receives focus in correct tab order.
- **Feature 6**:
  - Edge A6.1: Sidebar toggled while table has 50 columns with horizontal scrolling $\to$ table scroll position preserved.
  - Edge A6.2: Sidebar collapsed while cell editor is open $\to$ cell input retains focus and cursor position.
  - Edge A6.3: Sidebar expanded while ScreenTourTip is positioned near left edge $\to$ tour tip repositions without clipping.
  - Edge A6.4: Zero-row empty table rendered during sidebar toggle $\to$ empty state message remains centered.
  - Edge A6.5: High-DPI zoom (200%) on desktop $\to$ sidebar layout maintains proportions without text overflow.

### Suite 2: `flow_b_multi_xml_import.test.mjs`
- **Feature 7**:
  - Edge B7.1: Dropping 0-byte file (`empty.xml`) $\to$ error badge "Arquivo vazio (0 bytes)" displayed.
  - Edge B7.2: Dropping file with uppercase extension `.XML` $\to$ accepted and processed normally.
  - Edge B7.3: Dropping 100 XML files at once $\to$ all 100 enqueued safely without memory freeze.
  - Edge B7.4: Dragging and dropping non-file data (e.g., text selection) $\to$ ignored safely without error.
  - Edge B7.5: Dropping XML containing invalid UTF-8 byte sequences $\to$ parsed with error message "Codificação inválida".
- **Feature 8**:
  - Edge B8.1: 1 worker takes 5000ms while other 2 finish in 10ms $\to$ other workers continue processing queue.
  - Edge B8.2: All 3 workers reject simultaneously $\to$ queue continues without breaking pool state.
  - Edge B8.3: Batch cancelled mid-execution $\to$ active workers finish cleanly; pending queue is cleared.
  - Edge B8.4: Worker pool receives 0 files $\to$ returns immediately with empty result.
  - Edge B8.5: Worker pool receives massive single file (10MB XML) $\to$ worker processes without crashing sibling workers.
- **Feature 9**:
  - Edge B9.1: Queue contains 1 file $\to$ progress jumps from 0% to 100% cleanly.
  - Edge B9.2: All files fail $\to$ global progress reaches 100%, failed counter equals total, success counter = 0.
  - Edge B9.3: Queue completion timestamp recorded accurately for audit trail.
  - Edge B9.4: File name containing 255 characters $\to$ truncated with ellipsis in UI without breaking row layout.
  - Edge B9.5: Progress bar rendered on ultra-narrow mobile screen $\to$ text and percentage wrap gracefully.
- **Feature 10**:
  - Edge B10.1: Retrying a file while another file is currently parsing $\to$ retried file joins queue cleanly.
  - Edge B10.2: Retrying file 3 times consecutively $\to$ each attempt increments attempt counter.
  - Edge B10.3: Retrying file after its underlying network resource was disconnected $\to$ flags descriptive network error.
  - Edge B10.4: Clicking "Repetir falhas" when 0 files failed $\to$ button disabled or no-op.
  - Edge B10.5: File fails due to temporary memory pressure, succeeds on retry $\to$ state becomes `imported`.
- **Feature 11**:
  - Edge B11.1: 44-digit key with corrupted check digit (DV) $\to$ flagged `INVALID_DV` with expected vs found digit.
  - Edge B11.2: 43-digit key (missing 1 digit) $\to$ flagged `INVALID_LENGTH` (43 of 44 digits).
  - Edge B11.3: 45-digit key (extra digit) $\to$ flagged `INVALID_LENGTH` (45 of 44 digits).
  - Edge B11.4: Key with model `65` (NFC-e) instead of `55` (NF-e) $\to$ flagged `UNSUPPORTED_MODEL`.
  - Edge B11.5: Key with invalid UF code `99` $\to$ flagged `INVALID_UF_CODE`.
- **Feature 12**:
  - Edge B12.1: Calling `localStorage.setItem` directly inside XML import handler $\to$ blocked by architecture.
  - Edge B12.2: Session invoice map reaches 100 invoices $\to$ volatile memory holds data without storage quota limits.
  - Edge B12.3: Browser tab duplicated via right-click $\to$ session storage isolation verified per tab.
  - Edge B12.4: Operator opens demo invoice while real XMLs are in session $\to$ demo and session co-exist without collision.
  - Edge B12.5: User clicks "Limpar Sessão" with 50 XMLs $\to$ map cleared in $< 5$ms.

### Suite 3: `flow_c_documents_filters.test.mjs`
- **Feature 13**:
  - Edge C13.1: Search query with leading/trailing spaces (`"  145892  "`) $\to$ trimmed and matched.
  - Edge C13.2: Search query with accented characters (`"São Paulo"`) $\to$ normalized and matched against `"Sao Paulo"`.
  - Edge C13.3: Search query of 1 character $\to$ filtered without minimum length restriction.
  - Edge C13.4: Search query matching 0 documents $\to$ displays "Nenhum documento encontrado para '{termo}'".
  - Edge C13.5: Search query cleared via keyboard `Backspace` $\to$ debounced 300ms before restoring full list.
- **Feature 14**:
  - Edge C14.1: Date range where `dataInicio === dataFim` $\to$ returns documents emitted on that exact day.
  - Edge C14.2: Monetary range where `min === max` $\to$ returns documents with exact matching total.
  - Edge C14.3: Status filter set to non-existent status $\to$ returns empty array safely.
  - Edge C14.4: Balance filter set to `'Esgotado'` $\to$ returns documents with 0 remaining balance.
  - Edge C14.5: Resetting filters resets all 8 facets back to defaults in a single atomic update.
- **Feature 15**:
  - Edge C15.1: Switching grouping with 500 documents rendered $\to$ group headers computed in $< 50$ms.
  - Edge C15.2: Supplier name contains special characters (`"A & B Grãos S/A"`) $\to$ renders correctly.
  - Edge C15.3: Collapsing all groups then expanding all groups $\to$ states toggle smoothly.
  - Edge C15.4: Single invoice has 0 line items $\to$ group subtotal reflects 0 items without division by zero.
  - Edge C15.5: Visual grouping combined with active search filter $\to$ only matching items appear under headers.
- **Feature 16**:
  - Edge C16.1: Selecting all items across 10 pages $\to$ selection set contains all 100 IDs.
  - Edge C16.2: Deselecting 1 item on page 3 $\to$ selection count decrements by 1; other 99 remain selected.
  - Edge C16.3: Changing page size from 20 to 50 $\to$ selected items remain checked on newly paginated view.
  - Edge C16.4: Select-all in group when group has 1 item $\to$ toggles that single item cleanly.
  - Edge C16.5: Sorting table columns by date $\to$ row order changes but checked states remain bound to correct IDs.
- **Feature 17**:
  - Edge C17.1: Exactly 1 document selected $\to$ action bar reads "1 documento selecionado".
  - Edge C17.2: 10 documents selected from 1 supplier $\to$ action bar displays "1 fornecedor distinto".
  - Case C17.3: Total monetary value exceeds R$ 10,000,000.00 $\to$ formats correctly without currency truncation.
  - Case C17.4: Deselecting the last selected document $\to$ action bar smoothly unmounts/hides.
  - Case C17.5: Clicking "Nova Preparação" with selected items $\to$ passes selected IDs via URL query or state.
- **Feature 18**:
  - Edge C18.1: Assigning export client with name of 200 characters $\to$ accepted and rendered with truncation.
  - Edge C18.2: Assigning export client to already assigned document $\to$ overwrites assignment cleanly.
  - Edge C18.3: Removing assignment $\to$ resets `clienteAtribuido` to `null` ("Sem cliente atribuído").
  - Edge C18.4: Assigning client while offline / in memory mode $\to$ persisted in volatile session.
  - Edge C18.5: Assigning client containing quotes or XML entities $\to$ sanitized without XSS risk.

### Suite 4: `flow_d_allocation_engine.test.mjs`
- **Feature 19**:
  - Edge D19.1: Division by zero (`decimalDivide('10.00', '0', 2)`) $\to$ returns `'0.00'` without crash.
  - Edge D19.2: Numbers with 18 decimal places $\to$ BigInt preserves all 18 digits without scientific notation.
  - Edge D19.3: Subtracting larger number from smaller $\to$ returns negative decimal string (e.g., `'-5.50'`).
  - Edge D19.4: Clean decimal string with Brazilian format `"1.234.567,89"` $\to$ parses to `'1234567.89'`.
  - Edge D19.5: Zero representation (`"0"`, `"0.00"`, `"-0.0000"`) $\to$ canonicalized to `'0'`.
- **Feature 20**:
  - Edge D20.1: Source item quantity is zero (`'0.0000'`) $\to$ balance is `'0.0000'`, allocating $> 0$ flags excess.
  - Edge D20.2: 5 destination notes with allocations of `'20.0000'` each (total 100) $\to$ balance is `'0.0000'`.
  - Edge D20.3: Active preparation from previous session has allocated 100% of item $\to$ available balance is `'0.0000'`.
  - Edge D20.4: Matrix calculation with 0 source items $\to$ returns empty matrix and `canSave: true`.
  - Edge D20.5: Item with 4 decimal places (`'0.0001'`) $\to$ allocated fully with 0 residual balance.
- **Feature 21**:
  - Edge D21.1: Allocating `'0.0000'` $\to$ valid, does not trigger excess, status `'remaining'`.
  - Edge D21.2: Allocating `'-0.0001'` $\to$ negative flag triggered, `canSave: false`.
  - Edge D21.3: Total allocated is $100.0000001$ against $100.0000$ $\to$ flags excess, `canSave: false`.
  - Edge D21.4: 1 item out of 50 has excess $\to$ entire preparation `canSave` becomes `false`.
  - Edge D21.5: Clearing the excess item restores `canSave: true` immediately.
- **Feature 22**:
  - Edge D22.1: Invoice has 0 freight, 0 insurance, 0 expenses $\to$ apportioned values are all `'0.00'`.
  - Edge D22.2: R$ 0.05 freight split across 4 destinations $\to$ Dest 1: 0.02, Dest 2: 0.01, Dest 3: 0.01, Dest 4: 0.01 (sum = 0.05).
  - Edge D22.3: Discount exceeds product value (invalid invoice edge) $\to$ engine preserves exact cent balance.
  - Edge D22.4: 1 destination receives 100% of items $\to$ receives 100% of accessory expenses.
  - Edge D22.5: Only 1 item allocated out of 10 $\to$ accessory expense apportioned relative to allocated value ratio.
- **Feature 23**:
  - Edge D23.1: Unit with whitespace (`' KG '`) $\to$ trimmed and matched as compatible.
  - Edge D23.2: Unit `'M3'` (cubic meters) vs `'L'` (liters) without conversion factor $\to$ returns `false`.
  - Edge D23.3: Unit missing or empty string `""` $\to$ flagged as unknown unit; compatibility `false`.
  - Edge D23.4: Special unit symbols (`'M²'`, `'M³'`) $\to$ matched accurately.
  - Edge D23.5: User forces override of unit mismatch $\to$ audit warning recorded.
- **Feature 24**:
  - Edge D24.1: Legacy note with `parentInvoiceId` has no item-level origin keys $\to$ items fallback to root parent ID.
  - Edge D24.2: Legacy division page loaded with invalid invoice ID $\to$ displays "Documento não encontrado".
  - Edge D24.3: Splitting invoice into 10 destinations in legacy division $\to$ delegates to allocation engine cleanly.
  - Edge D24.4: Legacy division partial allocation attempt $\to$ blocked by legacy 100% allocation requirement.
  - Edge D24.5: Saving legacy division creates prepared notes readable by new `/preparacoes` dashboard.

### Suite 5: `flow_e_preparation_n_to_m.test.mjs`
- **Feature 25**:
  - Edge E25.1: Grouping 50 invoices into 1 destination $\to$ executes and renders in high-density table.
  - Edge E25.2: Invoices from 10 different states (UF) grouped $\to$ destination note handles multi-origin items.
  - Edge E25.3: Grouping invoices with different payment terms $\to$ destination note sets unified export term.
  - Edge E25.4: Destination foreign client has no tax ID (`idEstrangeiro` blank) $\to$ validation flags required foreign ID.
  - Edge E25.5: Grouping cancelled mid-way $\to$ no persistent prepared notes created.
- **Feature 26**:
  - Edge E26.1: Division into 10 destination notes $\to$ tabbed panel displays all 10 destination tabs.
  - Edge E26.2: Dividing invoice with 100 items into 2 destinations $\to$ table pagination handles 100 items smoothly.
  - Edge E26.3: Destination note has empty allocation (0 items allocated) $\to$ flagged before finalization.
  - Edge E26.4: Removing destination note redistributes allocations or restores them to available balance.
  - Edge E26.5: Changing destination client details updates corresponding prepared note draft.
- **Feature 27**:
  - Edge E27.1: Mixed preparation with 10 sources and 5 destinations ($10 \to 5$) $\to$ matrix computes 50 allocations.
  - Edge E27.2: Unallocated balance of 0.0001 left on source item $\to$ item retains balance for future batches.
  - Edge E27.3: Allocation matrix with alternating zero and full allocations $\to$ correctly aggregates totals.
  - Edge E27.4: Adding a new destination note dynamically while matrix has data $\to$ adds column without wiping data.
  - Edge E27.5: Adding a new source invoice dynamically $\to$ adds rows to matrix without clearing inputs.
- **Feature 28**:
  - Edge E28.1: 5 suppliers all have item with code `'001'` $\to$ composite keys `${id}__${item}` prevent collisions.
  - Edge E28.2: Two items from same supplier with same product code but different prices $\to$ origins kept distinct.
  - Edge E28.3: Source invoice ID contains special characters or hyphens $\to$ composite key parser handles cleanly.
  - Edge E28.4: Destination note simulated XML export includes `<infAdProd>` with original invoice number and supplier.
  - Edge E28.5: Traceability lookup: clicking allocated item opens original source invoice details modal.
- **Feature 29**:
  - Edge E29.1: Saving draft with 0 items allocated $\to$ rejected with "Nenhuma alocação informada".
  - Edge E29.2: Saving draft with partial excess $\to$ draft saved as `rascunho`, but finalization blocked.
  - Edge E29.3: Loading draft after one of its source invoices was deleted $\to$ draft flags missing source cleanly.
  - Edge E29.4: Draft auto-save triggered every 30 seconds $\to$ performs non-blocking background save.
  - Edge E29.5: Updating draft title to empty string $\to$ defaults to "Preparação sem título".
- **Feature 30**:
  - Edge E30.1: Reloading page with demo draft $\to$ reloads from localStorage without warning.
  - Edge E30.2: Reloading page with real XML draft $\to$ browser displays beforeunload warning.
  - Edge E30.3: Navigating to `/dashboard` via sidebar link while editing real draft $\to$ confirmation dialog shown.
  - Edge E30.4: User confirms navigation $\to$ temporary draft discarded; session invoices retained.
  - Edge E30.5: User cancels navigation $\to$ remains on `/preparacoes/nova` with all inputs intact.

### Suite 6: `flow_f_scale_50_invoices.test.mjs`
- **Feature 31**:
  - Edge F31.1: Generating XML with 50 items in a single invoice $\to$ valid XML with 50 `<det>` elements generated.
  - Edge F31.2: Generating XML with 4 decimal places in quantity (`1234.5678`) $\to$ `<qCom>` formats correctly.
  - Edge F31.3: Generating XML with 0 freight and 0 insurance $\to$ `<vFrete>0.00</vFrete>` valid tags emitted.
  - Edge F31.4: Access key Modulo 11 remainder of 0 or 1 $\to$ check digit correctly computed as 0.
  - Edge F31.5: Access key Modulo 11 remainder of 2..10 $\to$ check digit correctly computed as $11 - \text{remainder}$.
- **Feature 32**:
  - Edge F32.1: Batch of 50 XMLs with 5 malformed files scattered at random indices $\to$ 45 succeed, 5 fail.
  - Edge F32.2: Concurrency queue execution under simulated CPU throttling (slow device) $\to$ completes without timeout.
  - Edge F32.3: 50 XMLs containing 10 duplicate keys within the batch $\to$ 40 imported, 10 flagged duplicate.
  - Edge F32.4: Queue drainage callback fires exactly once when the 50th item terminates.
  - Edge F32.5: Network disconnect during local file read $\to$ local file unaffected; parsing completes.
- **Feature 33**:
  - Edge F33.1: Matrix with 200 rows and 5 columns (1000 cells) $\to$ recalculates on input change in $< 100$ms.
  - Edge F33.2: Distribute equally action ("Distribuir Igualmente") on 200 items $\to$ splits all items across 5 notes.
  - Edge F33.3: Apportioning when 200 items have prime number quantities $\to$ remainder cents absorbed without error.
  - Edge F33.4: All 5 destination notes exported as simulated XML in bulk $\to$ 5 XML files generated in $< 1$s.
  - Edge F33.5: Matrix rendered in compact high-density mode $\to$ row height 32px with virtual scrolling.
- **Feature 34**:
  - Edge F34.1: Running 50-XML test suite 10 times consecutively in same process $\to$ memory does not leak.
  - Edge F34.2: GC execution between suites releases unreferenced parsed DOM elements.
  - Edge F34.3: Heap profiling shows closures do not retain XML string references after mapper completes.
  - Edge F34.4: Memory leak test: registering and unregistering 1000 event listeners $\to$ listener count reaches 0.
  - Edge F34.5: Bounded heap growth: peak heap remains $< 250$MB during 50-XML parsing.
- **Feature 35**:
  - Edge F35.1: `localStorage.clear()` called before test $\to$ after 50 real XMLs, localStorage size is $< 10$KB.
  - Edge F35.2: Checking `sessionStorage` $\to$ zero real XML payloads leaked to sessionStorage.
  - Edge F35.3: Checking `IndexedDB` $\to$ zero real XML payloads stored in IndexedDB.
  - Edge F35.4: Checking cookies $\to$ zero fiscal data in cookies.
  - Edge F35.5: Tampering with localStorage does not affect active session invoices in memory.
- **Feature 36**:
  - Edge F36.1: Multiplying R$ 1,234,567.89 by 0.3333 with scale 2 $\to$ exact BigInt Half-Up match.
  - Edge F36.2: Apportioning R$ 0.03 across 5 destinations $\to$ 0.01, 0.01, 0.01, 0.00, 0.00 (sum = 0.03).
  - Edge F36.3: Apportioning 200 items with 4 decimals $\to$ total residual quantity $\equiv$ 0.0000.
  - Edge F36.4: Summing 1,000,000 cents in BigInt $\to$ exact arithmetic without 64-bit float precision loss.
  - Edge F36.5: Financial totals check: $\sum vProd + vFrete + vSeg + vOutro - vDesc \equiv vNF$ across all 5 containers.

---

## Tier 3: Pairwise Combinations Across Features (≥25 Interaction Cases)

1. **Filter (Client) + Visual Grouping (Supplier)**: Filter by assigned client `'Rotterdam Grain B.V.'` while grouping by Supplier $\to$ shows only suppliers with documents assigned to Rotterdam; group subtotals recalculate for filtered subset.
2. **Filter (NCM) + Stable Selection Across Paging**: Filter by NCM `'1201.90.00'` (Soybeans), select all items on page 1, clear NCM filter $\to$ soy items remain checked in full list.
3. **Debounced Search + 8-Facet Filter Combination**: Type search query `"Cooperativa"` while filter `status: 'CONFERENCIA'` and date range are active $\to$ search executes after 300ms, returning intersection of all 3 conditions.
4. **Visual Grouping (Client) + Group Bulk-Select**: Group by Assigned Client, click select-all on "Sem cliente atribuído" header $\to$ selects only unassigned documents; assigned documents remain unchecked.
5. **Stable Selection + Floating Action Bar + Nova Preparação**: Select 4 documents from 3 suppliers across 2 pages $\to$ floating bar shows 4 documents, 18 items, R$ 540,000.00, 3 suppliers; clicking "Nova Preparação" transfers all 4 to matrix.
6. **Mobile Drawer Overlay + Escape Key + ScreenTourTip**: On mobile viewport ($\le 1024$px), open ScreenTourTip, then open mobile drawer $\to$ pressing Escape closes mobile drawer; pressing Escape second time closes ScreenTourTip.
7. **Desktop Drawer Collapse + High-Density Nova Preparação Matrix**: Collapse sidebar to `w-14` while viewing 10-destination matrix $\to$ matrix table smoothly expands to fill extra 184px horizontal space without scrollbar snapping.
8. **Batch Queue Concurrency + Duplicate Key Detection**: Upload batch of 10 XMLs containing 2 duplicate keys $\to$ concurrency pool processes 3 at a time; duplicates flagged when encountered without stalling remaining worker threads.
9. **Batch Queue Failure + One-Click Retry + Progress Tracking**: Batch of 6 files where file 2 fails $\to$ global progress reaches 100% (5 success, 1 error); clicking retry on file 2 processes it, transitioning global state to 6 success.
10. **Fiscal Session Isolation + Draft Saving**: Import 3 real XMLs, build N $\to$ M preparation, save as draft $\to$ draft is saved exclusively in volatile `sessionPreparations = new Map()`; 0 bytes in localStorage.
11. **Demo Invoices + Real XMLs in Document List**: Load demo scenarios and import 2 real XMLs $\to$ list displays real XMLs pinned at top with "Sessão" badge, followed by demo invoices with "Demo" badge.
12. **BigInt Decimal Apportioning + Accessory Expenses + Cent Absorption**: Apportion R$ 100.00 item with R$ 10.01 freight across 3 destinations (30%, 30%, 40%) $\to$ freight splits: 3.00, 3.00, 4.01 (sum = 10.01); zero cent drift.
13. **Unit Compatibility Check + Repeated Product Codes**: Supplier A and Supplier B both sell code `'MILHO-01'`, but Supplier A uses `'KG'` and Supplier B uses `'SC'` $\to$ unit compatibility flags mismatch; prevents merging into same container line.
14. **Non-Negativity Trap + Excess Blocking + canSave**: Allocate 50 to Dest 1, 51 to Dest 2 for item with available 100 $\to$ cell turns red (`excess`), `canSave: false`; correcting Dest 2 to 50 turns cells green (`ok`), `canSave: true`.
15. **Active Allocation from Prior Preparation + New Preparation**: Preparation 1 allocates 60 of 100 items; in Preparation 2, available balance for item displays 40; allocating 41 flags excess.
16. **Legacy Division (`/documentos/[id]/divisao`) + Unified Allocation Engine**: Open legacy division on `demo-01`, split across 2 destinations $\to$ `divisionMath.js` delegates to `allocationEngine.js`, producing identical legacy UI result.
17. **Group Bulk-Select + Operational Client Assignment**: Group by Supplier, select all items from "Agroexport Brasil", click "Atribuir Cliente" $\to$ all Agroexport items assigned to `'Asian Grain Corp'` in one batch.
18. **Mobile Viewport ($\le 1024$px) + Floating Selection Bar**: On mobile screen, select 2 documents $\to$ floating selection bar renders responsively with stacked counters; buttons remain touch-friendly ($>44$px target).
19. **Hydration Sync + LocalStorage Preference Recall**: User sets sidebar collapsed on desktop, navigates to `/preparacoes/nova`, refreshes page $\to$ page loads without SSR mismatch; sidebar starts collapsed.
20. **Mixed Preparation ($N \to M$) + Partial Allocations + Balance Filter**: In Nova Preparação, allocate 50% of items and finalize $\to$ source documents on `/documentos` update status to `PARCIAL`; balance filter `'Disponível'` still includes them.
21. **In-Memory Draft + Session Loss Warning on Route Change**: Operator with unsaved real XML draft clicks "Dashboard" in sidebar $\to$ dialog warns: "Preparação contém documentos em memória temporária. Deseja descartar?"; cancel preserves draft.
22. **50-XML Scale Batch + High-Density Virtual Scrolling**: 50 XMLs (200+ items) rendered in Nova Preparação $\to$ table virtualization maintains 60fps scrolling; sticky header remains fixed at `top-0`.
23. **Scale Allocation + Dual-Storage Quarantine Audit**: Complete 50 $\to$ 5 scale allocation with real XMLs $\to$ audit script verifies `localStorage` contains zero real access keys, items, or supplier names.
24. **Search Filter + Group Bulk-Select**: Filter documents by text `"Soja"`, click group bulk-select $\to$ selects only the filtered "Soja" documents, ignoring hidden non-soy documents in that group.
25. **ScreenTourTip Open + Sidebar Toggle + Window Resize**: Open ScreenTourTip on `/preparacoes/nova`, toggle desktop sidebar, resize window to mobile $\to$ tour tip repositions dynamically; mobile drawer defaults to closed.

---

## Tier 4: Real-World Workload Scenarios (The 6 Test Scenarios)

### Scenario 1: Agricultural Coffee Export (5 Cooperative Invoices $N \to 1$ Shipment to Rotterdam)
- **Features Exercised**: F10, F13, F15, F16, F17, F20, F22, F28.
- **Fixture Setup**:
  - 5 synthetic XML invoices from 5 distinct coffee cooperatives across Minas Gerais and São Paulo (Cooperativa Guaxupé, Cooxupé, Coopfam, Cooparaíso, Minasul).
  - Each invoice contains 2 line items: Café Arábica Tipo 6 (SC) and Café Conilon Especial (SC).
  - Quantities: 100.0000 SC per item (Total: 1,000 SC across 10 lines).
  - Distinct access keys with valid Modulo 11 check digits.
- **Operational Workflow**:
  1. Operator ingests all 5 XMLs via `/documentos/importar` batch queue.
  2. Operator verifies all 5 are stored in `sessionInvoices`.
  3. On `/documentos`, operator selects all 5 invoices using stable multi-selection; floating bar displays: 5 NF-e, 10 itens, R$ 850,000.00, 5 fornecedores.
  4. Operator initiates Nova Preparação ($N \to 1$), configuring 1 destination note:
     - Foreign Client: `Rotterdam Coffee Logistics B.V.`
     - Country: Holanda (NL), ID Estrangeiro: `NL992817263B01`
     - Destination CFOP: `7101` (Exportação de produção do estabelecimento).
  5. Operator clicks "Alocar 100% no Destino 1".
- **Mathematical Invariant & Assertion Criteria**:
  - Total allocated quantity $\equiv 1,000.0000$ SC.
  - Remaining balance for every source line $\equiv 0.0000$ SC (`status: 'ok'`).
  - Total origin monetary value $\equiv$ Total destination monetary value down to R$ 0.00.
  - All 10 destination items retain original composite keys `${sourceInvoiceId}__${sourceItemId}`.
  - No items from different cooperatives are merged into artificial single lines.

### Scenario 2: Soy Cargo Division (1 Massive Agro-Industry Invoice $1 \to M$ Across 4 Destination Contracts)
- **Features Exercised**: F11, F13, F15, F16, F18, F20, F22, F24, F26.
- **Fixture Setup**:
  - 1 massive synthetic XML invoice from Agroindustrial Centro-Oeste S.A.
  - 4 line items: Soja em Grão Transgênica (TON), Farelo de Soja (TON), Óleo Bruto de Soja (TON), Soja Convencional (TON).
  - Total Quantity: 10,000.0000 TON; Total Value: R$ 24,500,000.00; Freight: R$ 450,000.00; Insurance: R$ 25,000.00.
- **Operational Workflow**:
  1. Operator loads invoice and selects Division workflow ($1 \to 4$).
  2. Configures 4 international destination contracts:
     - Dest 1: China National Cereals Corp (CN) — 40% allocation
     - Dest 2: Hamburg Grain Terminal GmbH (DE) — 25% allocation
     - Dest 3: Yokohama Agri-Trade Inc (JP) — 20% allocation
     - Dest 4: Casablanca Feed Mills S.A. (MA) — 15% allocation
  3. Operator enters proportional splits across all 4 items.
- **Mathematical Invariant & Assertion Criteria**:
  - For each line item: $\sum_{k=1}^4 \text{allocated}_k \equiv \text{originalQuantity}$ (zero residual balance).
  - Freight apportionment: R$ 180,000.00 (CN), R$ 112,500.00 (DE), R$ 90,000.00 (JP), R$ 67,500.00 (MA) $\to$ Sum $\equiv$ R$ 450,000.00 exactly.
  - Insurance apportionment sums strictly to R$ 25,000.00 (zero cent drift).
  - Source invoice status transitions to `DIVIDIDA`.
  - Backward compatibility: prepared notes include root `parentInvoiceId`.

### Scenario 3: Multimodal Mixed Batch (12 Invoices from 6 Suppliers $N \to M$ Across 3 Export Destinations with Residual Balances)
- **Features Exercised**: F12, F13, F14, F15, F16, F17, F20, F22, F27, F28, F29.
- **Fixture Setup**:
  - 12 synthetic XML invoices from 6 distinct suppliers (2 invoices per supplier).
  - Total of 36 line items (grain, packaging, bulk commodities).
  - Total Value: R$ 3,200,000.00.
- **Operational Workflow**:
  1. Ingest all 12 invoices into session.
  2. Select all 12 on `/documentos` and open Nova Preparação.
  3. Define 3 destination export notes:
     - Dest 1: Container A (Antuérpia - BE)
     - Dest 2: Container B (Roterdã - NL)
     - Dest 3: Container C (Gênova - IT)
  4. Operator performs partial allocation: allocates 70% of available stock across the 3 containers, leaving 30% unallocated.
  5. Operator saves preparation as draft, verifies draft, then finalizes.
- **Mathematical Invariant & Assertion Criteria**:
  - For every line item $i$: $\text{remaining}_i = \text{original}_i - (\text{dest1}_i + \text{dest2}_i + \text{dest3}_i) > 0$.
  - Engine validates $\text{canSave: true}$ because partial allocations are permitted in mixed mode ($N \to M$).
  - Source invoices receive status `PARCIAL`.
  - On `/documentos`, residual balances are displayed and remain selectable for a subsequent preparation batch.

### Scenario 4: Repeated Product Codes Across Suppliers (3 Distinct Suppliers with Code `SOJA-01`)
- **Features Exercised**: F13, F16, F22, F28.
- **Fixture Setup**:
  - Supplier 1: Agrícola Cerrado Ltda (CNPJ 11.111.111/0001-11) emitting item `cProd: 'SOJA-01'`, `xProd: 'Soja em Grãos Padronizada'`, price R$ 130.00/SC.
  - Supplier 2: Fazenda Boa Esperança (CNPJ 22.222.222/0001-22) emitting item `cProd: 'SOJA-01'`, `xProd: 'Soja Grão Safra 2026'`, price R$ 132.50/SC.
  - Supplier 3: Grãos do Sul S.A. (CNPJ 33.333.333/0001-33) emitting item `cProd: 'SOJA-01'`, `xProd: 'Soja Granel Export'`, price R$ 128.00/SC.
- **Operational Workflow**:
  1. Group all 3 invoices into 1 export shipment to Spain (`Barcelona Agrologística S.L.`).
  2. Verify allocation matrix representation.
  3. Finalize preparation and inspect generated prepared invoice items.
- **Mathematical Invariant & Assertion Criteria**:
  - The destination prepared invoice contains exactly 3 separate line items (not 1 merged line).
  - Line 1 carries composite key `${nfe1}__item1`, Supplier 1 CNPJ, price R$ 130.00.
  - Line 2 carries composite key `${nfe2}__item1`, Supplier 2 CNPJ, price R$ 132.50.
  - Line 3 carries composite key `${nfe3}__item1`, Supplier 3 CNPJ, price R$ 128.00.
  - Verification proves origin identity is strictly preserved without cross-supplier data clashing.

### Scenario 5: Incompatible Units Trap (Attempting to Combine `SC` and `KG` Without Conversion Factor)
- **Features Exercised**: F16, F23, F24.
- **Fixture Setup**:
  - Invoice A: Cooperativa dos Cafeicultores (MG), item: Café Beneficiado, unit: `'SC'` (sacas de 60kg), quantity: `500.0000`.
  - Invoice B: Armazéns Gerais do Porto (SP), item: Café Beneficiado, unit: `'KG'` (quilogramas), quantity: `30000.0000`.
- **Operational Workflow**:
  1. Operator attempts to create a unified destination item aggregating Invoice A and Invoice B into a single destination line.
  2. System invokes `checkUnitCompatibility(itemA, itemB)`.
- **Mathematical Invariant & Assertion Criteria**:
  - `checkUnitCompatibility('SC', 'KG')` returns `false`.
  - UI flags unit mismatch alert: "Unidades incompatíveis detectadas: SC vs KG. Não é permitido somar quantidades de naturezas físicas distintas sem conversão fiscal formal."
  - System forces items into distinct destination lines, preventing invalid arithmetic addition ($500 + 30000 = 30500$ meaningless units).
  - Validation trap succeeds; mathematical and fiscal integrity preserved.

### Scenario 6: Large-Scale Batch (50 XML Invoices, 10 Suppliers, 200+ Line Items Across 5 Destination Shipping Containers)
- **Features Exercised**: F3, F4, F5, F10, F12, F16, F25, F31, F32, F33, F34, F35, F36.
- **Fixture Setup**:
  - Programmatic generation of 50 synthetic XML invoices via `xmlFixtureGenerator.mjs`.
  - 10 distinct suppliers across MT, SP, PR, GO, SC.
  - Total of 215 distinct line items with quantities with up to 4 decimal places.
  - Total aggregate merchandise value: R$ 18,452,918.42.
  - Total accessory expenses (freight + insurance + other): R$ 892,104.30.
- **Operational Workflow**:
  1. Batch ingestion: all 50 XMLs dropped simultaneously into `/documentos/importar`.
  2. Concurrency pool limit 3 processes the queue in sequential worker waves; progress updates to 100%.
  3. All 50 invoices verified in `sessionInvoices = new Map()`.
  4. On `/documentos`, all 50 invoices selected; operator navigates to `/preparacoes/nova`.
  5. 5 destination shipping containers configured:
     - Container 1: Rotterdam (NL) — 25% allocation
     - Container 2: Shanghai (CN) — 25% allocation
     - Container 3: Hamburg (DE) — 20% allocation
     - Container 4: Savannah (US) — 15% allocation
     - Container 5: Santos Port Terminal (BR/EX) — 15% allocation
  6. Operator clicks "Distribuir Igualmente" and adjusts residual balances.
  7. Preparation finalized.
- **Mathematical Invariant & Assertion Criteria**:
  - Execution duration for matrix calculation of 1,075 cells ($215 \times 5$) is $< 350$ms.
  - Sum of allocated quantities across all 5 containers $\equiv 100\%$ of original quantities.
  - Total origin merchandise value ($\text{R\$} 18,452,918.42$) matches sum of 5 destination values down to R$ 0.00.
  - Total accessory expenses ($\text{R\$} 892,104.30$) reconcile to the exact cent across all 5 containers (0.00 cent residual).
  - Memory audit: Node.js heap delta $< 40$MB post-GC; zero real XML keys, CNPJs, or data written to `localStorage`.
  - Verification demonstrates complete scale resilience, BigInt zero-drift precision, and fiscal privacy quarantine.
