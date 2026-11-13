# SmartNFe Survey Report — Left Drawer, Multi-XML Import & Document Management (R1 & R2)

**Author**: Explorer Survey 2  
**Date**: 2026-11-13  
**Working Directory**: `c:\www\smart-nfe`  
**State Folder**: `c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\`  
**Target Milestone**: Survey & Baseline Architecture for R1 & R2  

---

## Executive Summary

This report delivers a comprehensive architectural survey of the SmartNFe codebase for requirements **R1** (Left Drawer & Layout Stabilization) and **R2** (Multi-XML Batch Import & Advanced Document Management), based on direct source code inspection of `c:\www\smart-nfe`.

Key findings:
1. **Left Drawer (R1)**: The sidebar collapse state is currently held in local `useState(false)` within `AppLayout.jsx`. Because each Next.js App Router route page mounts its own `<AppLayout>`, any navigation immediately resets the sidebar. No persistence in `localStorage` (`smartnfe_sidebar_collapsed`) exists, and no mobile overlay drawer exists for viewports $\le 1024\text{px}$ (LG breakpoint). Tying state to `AppContext` with `useSyncExternalStore` or safe mounted hydration will eliminate hydration mismatch, ensure navigation persistence, and enable a slide-over mobile drawer with backdrop, close button, and Escape key handling that does not conflict with `ScreenTourTip` or product table inline editing.
2. **Multi-XML Import (R2)**: `app/documentos/importar/page.jsx` currently processes only a single file (`files[0]`). While the underlying parsing engine (`nfeXmlParser.js`, `accessKeyValidator.js`, `xmlToInvoiceMapper.js`) is robust, there is no multi-file drag-and-drop, concurrency-controlled batch queue, individual/overall progress bars, per-file retry, or duplicate detection by access key. Real XMLs are already kept in-memory in `sessionInvoices = new Map()`, which complies with privacy rules and will be preserved.
3. **Document Management (R2)**: `app/documentos/page.jsx` provides only basic un-debounced search and a single status dropdown. It lacks combinable multi-facet filters (assigned export client, supplier, NCM, product, dates, values, balances), visual grouping, and stable item selection across pagination/sorting. Crucially, the concept of operational "Assigned Export Client" (`clienteAtribuido`) does not yet exist and must be introduced without altering the immutable fiscal `destinatario` extracted from XML.

---

## 1. Left Drawer & Layout (R1)

### 1.1 Existing Code Analysis

The layout architecture spans four key files:
- `c:\www\smart-nfe\app\layout.jsx`: Root layout wrapping `{children}` with `<AppProvider>`.
- `c:\www\smart-nfe\app\context\AppContext.jsx`: Global React context managing `loading`, `toasts`, `darkMode`, `settings`, `mounted`, `openTour`.
- `c:\www\smart-nfe\app\components\Layouts\AppLayout.jsx`: Page-level shell component rendering `SmartNFeSidebar`, `SmartNFeHeader`, `ToastContainer`, `DemoBadge`, and `ScreenTourTip`.
- `c:\www\smart-nfe\app\components\Layouts\SmartNFeSidebar.jsx`: Aside element with fixed widths (`w-60` expanded, `w-14` collapsed).
- `c:\www\smart-nfe\app\components\Layouts\SmartNFeHeader.jsx`: Top navigation bar with breadcrumbs, dark mode toggle, tour button, and mobile hamburger button.

#### The Navigation Reset Defect
In `AppLayout.jsx` (lines 9-14):
```javascript
export default function AppLayout({ children, breadcrumbs = [] }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 overflow-hidden">
      <SmartNFeSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />
```
Because Next.js route pages (`/dashboard`, `/documentos`, `/documentos/importar`, `/notas-preparadas`, etc.) each individually wrap their content in `<AppLayout>`, navigating between pages unmounts the previous page's `AppLayout` and mounts a fresh one. Consequently, `sidebarCollapsed` reverts to `false` on every click.

### 1.2 Hydration Mismatch & Persistence (`smartnfe_sidebar_collapsed`)

#### Defect & Risk
Reading `localStorage` or `window.innerWidth` during initial component render causes React 19 hydration mismatches:
- On server-side rendering (SSR), `window` and `localStorage` do not exist.
- If the client renders different initial markup than the server (e.g. collapsed `w-14` instead of expanded `w-60`), React throws `Hydration failed because the initial UI does not match what was rendered on the server`.

#### Safe Hydration Strategy
`AppContext.jsx` already implements the React 19 standard `useSyncExternalStore` pattern for SSR safety:
```javascript
const emptySubscribe = () => () => {};
const mounted = useSyncExternalStore(
  emptySubscribe,
  () => true,  // client snapshot
  () => false  // server snapshot
);
```

#### Proposed Persistence Specification
1. **Centralize state in `AppContext`**:
   - `sidebarCollapsed` (desktop collapse state): `boolean`.
   - `mobileDrawerOpen` (mobile overlay drawer open/close): `boolean`.
   - `toggleSidebar()`: toggles `sidebarCollapsed` on desktop, persists to `localStorage.setItem('smartnfe_sidebar_collapsed', String(nextState))`.
   - `toggleMobileDrawer(open?: boolean)`: controls `mobileDrawerOpen`.
2. **Initial State Evaluation Rules**:
   - Storage key: `smartnfe_sidebar_collapsed`.
   - **Default above 1024px**: If no stored preference exists, default to `false` (expanded). If stored preference exists, parse `'true'` $\to$ `true`, `'false'` $\to$ `false`.
   - **Default at $\le 1024\text{px}$ (LG or lower)**: Drawer starts closed/collapsed (`mobileDrawerOpen = false`, `sidebarCollapsed = true`).
   - Loading preference must happen inside a post-mount effect or after `mounted === true` to guarantee zero hydration mismatch.

### 1.3 Viewport Dynamics: $>1024\text{px}$ vs $\le 1024\text{px}$

#### Existing Layout Deficiencies
- `SmartNFeSidebar.jsx` is always rendered as an inline flex item:
  ```javascript
  <aside className={`... ${collapsed ? 'w-14' : 'w-60'}`}>
  ```
  On viewports $\le 1024\text{px}$, it occupies screen width instead of acting as a temporary overlay.
- `SmartNFeHeader.jsx` line 51 uses `md:hidden` (`< 768px`) for the menu toggle button. Between 768px and 1024px (tablets, iPads, laptops), the button is completely hidden, locking users out of opening the navigation.

#### Target Mobile Drawer Behavior ($\le 1024\text{px}$)
1. **Breakpoint**: Tailwind `lg` ($1024\text{px}$). At screens $\le 1024\text{px}$:
   - Desktop sidebar is hidden (`hidden lg:flex`).
   - Mobile toggle button in `SmartNFeHeader` is visible (`lg:hidden`).
2. **Overlay Drawer**:
   - Slide-over aside element positioned `fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 shadow-2xl transition-transform duration-300 ease-in-out`.
   - When closed: `translate-x-[-100%]`. When open: `translate-x-0`.
   - Header inside mobile drawer includes title "SmartNFe" and an explicit close button with `faXmark` (`aria-label="Fechar menu"`).
3. **Backdrop**:
   - `fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity duration-300`.
   - Clicking backdrop closes the mobile drawer.
4. **Escape Key Handling**:
   - When `mobileDrawerOpen === true`, global `keydown` listener intercepts `Escape`, invokes `closeMobileDrawer()`, and calls `event.preventDefault()` to prevent closing background dialogs or ScreenTourTip.
5. **Navigation Auto-close**:
   - Clicking any link in `SmartNFeSidebar` calls `closeMobileDrawer()`.

### 1.4 Coexistence: ScreenTourTip & Product Editor

#### Inspection of `ScreenTourTip.jsx`
`ScreenTourTip.jsx` (lines 148-177 and 223, 266) establishes clear coexistence rules:
- Position: `fixed bottom-5 right-5 z-40`.
- Escape Key Guardian:
  ```javascript
  if (event.defaultPrevented) return;
  const hasActiveModal = Boolean(
    typeof document !== 'undefined' &&
      document.querySelector('[role="dialog"], [aria-modal="true"]')
  );
  if (hasActiveModal) return;
  ```
- Therefore:
  - Mobile drawer must declare `role="dialog"` and `aria-modal="true"`.
  - When mobile drawer handles Escape, calling `event.preventDefault()` prevents `ScreenTourTip` from closing.

#### Inspection of Product Editor (`conferencia/page.jsx`)
In `app/documentos/[id]/conferencia/page.jsx` (lines 168-188):
- Inline cell editing handles `Escape`:
  ```javascript
  } else if (e.key === 'Escape') {
    e.preventDefault();
    handleRestoreItem(itemId);
    e.target.blur();
  }
  ```
- Because it calls `e.preventDefault()`, pressing Escape while editing a cell cancels editing without closing either the mobile drawer or `ScreenTourTip`.
- The sidebar toggle button remains fixed in the header and sidebar bottom, with `z-30` or higher, avoiding collision with dense table inputs.

---

## 2. Multi-XML Import (R2)

### 2.1 Existing Code Analysis (`/documentos/importar`)

File: `c:\www\smart-nfe\app\documentos\importar\page.jsx`
- Line 320: `<input type="file" id="file-upload" accept=".xml,.pdf" onChange={handleFileInput} className="hidden" />` $\to$ **Lacks `multiple` attribute**.
- Lines 116, 122: `processFile(e.dataTransfer.files[0])` $\to$ **Hardcoded single-file consumption**.
- `selectedFile`, `importSuccess`, `importError` state variables hold only single-item state.

Supporting XML Engine (`app/features/xml/`):
- `nfeXmlParser.js`: Browser-native DOMParser supporting `nfeProc` v4.00/v3.10 and bare `NFe`, with namespace-agnostic extraction and error diagnostics.
- `accessKeyValidator.js`: Validates 44 numeric digits and Modulo 11 check digit (weights 2 to 9).
- `xmlToInvoiceMapper.js`: Maps XML tags into `invoiceRepository` schema, generating deterministic item IDs (`nfe-${chaveAcesso}-item-${nItem}`).
- `invoiceRepository.js`:
  - `sessionInvoices = new Map()`: Real XML documents are saved strictly in this memory Map via `create()`.
  - `isRealImport: true` and `isDemo: false` flags ensure zero writes to `localStorage`.

### 2.2 Architectural Gaps for Multi-XML

| Aspect | Current State | Required Target State |
|---|---|---|
| **Input Selection** | Single file only (`files[0]`) | Multi-file selection (`<input multiple>`) and multi-file drag-and-drop |
| **Processing** | Synchronous-like execution on single file | Browser-based asynchronous queue with limited concurrency (pool = 3) |
| **Feedback** | Single spinner with success/error card | Individual progress/status per file + Global aggregate progress bar |
| **Duplicates** | Silent overwrite in `sessionInvoices.set` | Detection by 44-digit access key against session and within current batch |
| **Error Handling** | Aborts and clears previous success | Resilient per-file error tracking with "Tentar novamente" (retry) action |
| **Volume Capacity** | Tested with 1 file at a time | Arbitrary number of files (2 to 50+ XMLs) without UI freezing |
| **Persistence** | In-memory session (`sessionInvoices`) | Preserved: 100% in-memory, no XMLs or fiscal data in localStorage |

### 2.3 Concurrency-Limited Batch Queue

To process up to 50+ XML files without freezing the main UI thread:
1. **Concurrency Pool Size**: 3 concurrent file workers.
2. **Batch Item Lifecycle**:
   ```
   [queued] ──> [reading] ──> [parsing] ──> [validating] ──> [saving] ──> [completed]
                                    │               │
                                    └── [error]     └── [duplicate]
   ```
3. **Queue Implementation Pattern**:
   ```javascript
   export async function processXmlBatch(fileList, concurrency = 3, onProgressUpdate) {
     const queue = [...fileList];
     const results = [];
     const processedKeysInBatch = new Set();
     
     async function worker() {
       while (queue.length > 0) {
         const item = queue.shift();
         if (!item) break;
         
         try {
           onProgressUpdate(item.id, { status: 'processing', stage: 'reading' });
           const text = await item.file.text();
           
           onProgressUpdate(item.id, { stage: 'parsing' });
           const parseResult = parseNFeXml(text);
           if (!parseResult.success) throw new Error(parseResult.error);
           
           const extracted = parseResult.data;
           const chaveAcesso = extracted.chaveAcesso;
           
           // Validação Módulo 11
           const keyVal = validateAccessKey(chaveAcesso);
           if (!keyVal.isValid) throw new Error(`Chave inválida: ${keyVal.error}`);
           
           // Detecção de duplicidade (intra-batch e inter-session)
           if (processedKeysInBatch.has(chaveAcesso) || invoiceRepository.isSessionInvoice(`nfe-${chaveAcesso}`)) {
             onProgressUpdate(item.id, {
               status: 'duplicate',
               chaveAcesso,
               message: `Chave ${chaveAcesso.substring(0, 15)}... já existente`,
             });
             continue;
           }
           processedKeysInBatch.add(chaveAcesso);
           
           onProgressUpdate(item.id, { stage: 'saving' });
           const invoiceData = mapXmlToInvoice(extracted);
           invoiceData.isRealImport = true;
           invoiceData.isDemo = false;
           
           const saved = await invoiceRepository.create(invoiceData);
           onProgressUpdate(item.id, { status: 'completed', invoice: saved });
         } catch (err) {
           onProgressUpdate(item.id, { status: 'error', error: err.message });
         }
         
         // Cede a execução para a thread de UI renderizar (60fps)
         await new Promise((resolve) => setTimeout(resolve, 0));
       }
     }
     
     await Promise.all(Array.from({ length: concurrency }, () => worker()));
   }
   ```

### 2.4 Progress Tracking & UI Specs

1. **Global Progress Header**:
   - Overall percentage: $\frac{\text{completed} + \text{duplicate} + \text{error}}{\text{total}} \times 100\%$.
   - Live metrics badges:
     - Total de arquivos enviados
     - Sucesso (verde)
     - Duplicadas (âmbar)
     - Falhas / Inválidos (vermelho)
2. **Individual Item Cards / Rows**:
   - File name, file size, status badge.
   - For completed: NF-e number, issuer name, total items, monetary value, link to conference.
   - For duplicates: Access key alert, badge "Nota duplicada".
   - For errors: Detailed error description + "Repetir" button.
3. **Post-Import Direct Action**:
   - Primary button: "Criar Nova Preparação com as $N$ notas importadas" (navigates to `/preparacoes/nova` with imported IDs).
   - Secondary button: "Ver na Listagem de Documentos" (navigates to `/documentos`).

---

## 3. Documents View & Management (R2)

### 3.1 Existing Code Analysis (`/documentos`)

File: `c:\www\smart-nfe\app\documentos\page.jsx`
- Plain input `searchTerm` filtering on 4 fields (`numero`, `chaveAcesso`, `emitente.razaoSocial`, `destinatario.nome`) without debounce.
- Single dropdown filter `statusFilter` (`ALL`, `IMPORTADO`, etc.).
- Renders `DataTable` without selection checkboxes, pagination controls, or grouping.
- Lacks export client management.

### 3.2 Debounced Search Implementation

- **Debounce Interval**: 300ms.
- **Search Scope**:
  - `inv.numero`
  - `inv.chaveAcesso`
  - `inv.emitente.razaoSocial`, `inv.emitente.cnpj`
  - `inv.destinatario.nome`
  - `inv.clienteAtribuido?.nome`, `inv.clienteAtribuido?.pais`
  - Product lines: `inv.itens.some(it => it.codigo.includes(q) || it.descricao.toLowerCase().includes(q) || it.ncm.includes(q))`

### 3.3 Combinable Multi-Facet Filters

The filter bar must support combined criteria:
1. **Cliente de Exportação Atribuído**:
   - `TODOS` (All)
   - `SEM_CLIENTE` (Unassigned / "Sem cliente atribuído")
   - Specific clients dynamically extracted from loaded invoices.
2. **Fornecedor / Emitente**:
   - Dropdown of distinct suppliers (`emitente.razaoSocial`).
3. **NCM**:
   - Text filter matching item NCM codes.
4. **Produto**:
   - Text filter matching item code or description.
5. **Período de Emissão**:
   - Data Início (`dataEmissao >= start`) e Data Fim (`dataEmissao <= end`).
6. **Faixa de Valor**:
   - Valor Mínimo e Valor Máximo do `totais.valorTotalNota`.
7. **Saldos / Disponibilidade**:
   - `TODOS`
   - `COM_SALDO`: Invoices with at least one item having unallocated balance $> 0$.
   - `PARCIAL`: Invoices partially allocated.
   - `ESGOTADO`: Invoices where all items are fully allocated ($= 0$).
8. **Clear Action**:
   - "Limpar Filtros" button restoring all facets to defaults.

### 3.4 Visual Grouping Engine

Switchable grouping options:
1. **Sem Agrupamento (Plano)**: Standard tabular list.
2. **Agrupar por Fornecedor**:
   - Groups by `emitente.razaoSocial` (or `emitente.cnpj`).
   - Group Header: Supplier name, CNPJ, total invoices, total items, group monetary sum.
   - Checkbox in header to select/deselect all invoices in the group.
   - Accordion toggle to collapse/expand group rows.
3. **Agrupar por Cliente de Exportação Atribuído**:
   - Groups by `clienteAtribuido?.nome` or fallback `"Sem cliente atribuído"`.
   - Group Header: Client name, country badge (or "Pendente de atribuição"), total invoices, group total value.
   - Checkbox to select/deselect group.

### 3.5 Stable Multi-Item Selection & Dynamic Counters

1. **Selection Storage**:
   - `selectedInvoiceIds = new Set()` storing IDs.
   - Preserved across:
     - Page navigation / pagination changes
     - Filter modifications and search queries
     - Sorting column changes
     - Toggling between flat and grouped views
2. **Floating Summary Action Bar**:
   - Appears when `selectedInvoiceIds.size > 0`.
   - **Contador de Notas**: `$N$ notas selecionadas`.
   - **Contador de Itens**: $\sum \text{itens.length}$ across selected invoices.
   - **Contador de Valores**: $\sum \text{totais.valorTotalNota}$ using BigInt decimal addition (`decimalAdd`).
   - **Contador de Fornecedores**: Number of distinct `emitente.cnpj` among selected invoices.
   - **Action Buttons**:
     - "Iniciar Nova Preparação" $\to$ routes to `/preparacoes/nova` with selected IDs.
     - "Atribuir Cliente de Exportação" $\to$ opens assignment modal.
     - "Desmarcar Todos" $\to$ clears selection set.

### 3.6 Assigned Export Client Domain Model

#### Crucial Domain Invariant
The original fiscal recipient (`destinatario`) is extracted directly from the SEFAZ XML model 55 and represents the domestic buyer or original party. **It must NEVER be mutated or overwritten.**

#### Operational Metadata: `clienteAtribuido`
- Property added to invoice schema:
  ```typescript
  interface AssignedExportClient {
    id: string;
    nome: string;
    pais: string;
    paisCodigo: string;
    documento?: string; // Tax ID ou ID Estrangeiro
    atribuidoEm: string; // ISO date
  }
  ```
- When unassigned, `invoice.clienteAtribuido = null`. The UI classifies this as `"Sem cliente atribuído"`.
- Assigning a client updates `invoice.clienteAtribuido` via `invoiceRepository.update(id, { clienteAtribuido: clientData })` without altering `invoice.destinatario`.
- A dedicated modal in `/documentos` allows assigning a client to single or multiple selected invoices at once.

---

## 4. Feature Inventory Items for PROJECT.md

The following table details the concrete feature inventory items to be incorporated into `PROJECT.md` under Milestones M1 and M2 of the new preparation phase:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| **23** | Left Drawer State Persistence & Safe Hydration | Manage `sidebarCollapsed` in `AppContext` using `useSyncExternalStore` and `smartnfe_sidebar_collapsed` in `localStorage`; persist across route navigation without React 19 hydration mismatches. Default expanded $>1024\text{px}$, collapsed $\le 1024\text{px}$. | M1 | R1, Explorer Survey 2 |
| **24** | Responsive Mobile Drawer Overlay | Overlay drawer for viewports $\le 1024\text{px}$ with dimmed backdrop, close button, Escape key handler, and `lg:hidden` toggle button in `SmartNFeHeader`. Coexists safely with `ScreenTourTip` and table inline editing. | M1 | R1, Explorer Survey 2 |
| **25** | Multi-XML Batch Drag & Drop Importer | Evolve `/documentos/importar` to accept multiple XML files simultaneously via multi-file picker and drag-and-drop, lifting single-file constraints. | M1 | R2, Explorer Survey 2 |
| **26** | In-Browser Concurrency-Limited Batch Queue | Browser-based XML batch processing engine with worker pool concurrency limit (pool = 3) and event-loop yielding, preventing UI freezes during high-volume imports (up to 50+ files). | M1 | R2, Explorer Survey 2 |
| **27** | Multi-Level Import Progress & Retry Engine | Individual progress/status per file and aggregate global progress bar, displaying real-time phases (reading, parsing, validating, saving) with one-click retry for failed files. | M1 | R2, Explorer Survey 2 |
| **28** | Access Key Duplicate Detection | Automatic detection of duplicate NF-e by 44-digit access key against active session invoices and within the upload batch, with explicit user feedback without crashing or silent overwrites. | M1 | R2, Explorer Survey 2 |
| **29** | In-Memory Fiscal Session Isolation | Strict retention of real imported XMLs exclusively in volatile memory (`sessionInvoices = new Map()`), blocking localStorage persistence and displaying session security banner. | M1 | R2, Explorer Survey 2 |
| **30** | Debounced Multi-Field Document Search | 300ms debounced search on `/documentos` querying invoice numbers, access keys, suppliers, recipients, assigned clients, NCMs, and product descriptions/codes. | M2 | R2, Explorer Survey 2 |
| **31** | Combinable Multi-Facet Document Filters | Unified filter bar supporting combined criteria: assigned export client, supplier, NCM, product, date range, value range, balances (available, partial, exhausted), and status, with one-click filter reset. | M2 | R2, Explorer Survey 2 |
| **32** | Visual Document Grouping | Switchable grouping of documents by Supplier (`emitente.razaoSocial`) or Assigned Export Client (`clienteAtribuido`), featuring collapsible groups, group summaries (totals, item counts), and group-level bulk select. | M2 | R2, Explorer Survey 2 |
| **33** | Stable Multi-Item Selection & Metric Counters | Cross-pagination, cross-filter, and cross-sorting persistent selection of documents with real-time floating action bar displaying counters for selected invoices, total items, total monetary value (BigInt decimal precision), and distinct suppliers. | M2 | R2, Explorer Survey 2 |
| **34** | Assigned Export Client Domain Model | Operational assignment of target export client (`clienteAtribuido`) to documents, including default "Sem cliente atribuído", without modifying the immutable original fiscal recipient (`destinatario`). | M2 | R2, Explorer Survey 2 |

---

## 5. Verification Strategy & Automated Test Plan

To ensure zero regressions across the existing 383 tests while thoroughly validating R1 and R2, the following test suites should be created in `tests/`:

1. **`tests/tier1/r1_layout_drawer.test.mjs`**:
   - Verify `AppContext` initializes `sidebarCollapsed` without hydration errors.
   - Verify reading and writing `smartnfe_sidebar_collapsed` in `localStorage`.
   - Verify default expanded state $>1024\text{px}$ and default collapsed state $\le 1024\text{px}$.
   - Verify presence of mobile overlay backdrop, close button, and Escape key listener.
   - Verify non-interference with `ScreenTourTip` (Escape event `defaultPrevented` and `role="dialog"` checks).
2. **`tests/integration/flow_e_multi_xml_import.test.mjs`**:
   - Concurrency queue test: Feed 10 synthetic XML fixtures into batch processor with concurrency pool = 3; verify all 10 are processed correctly.
   - Duplicate detection test: Feed two identical access key fixtures in the same batch; verify first succeeds and second is flagged as `duplicate`.
   - Retry test: Simulate a transient parse failure on item 3; verify item 3 can be retried and completes successfully.
   - Storage isolation: Verify `sessionInvoices` holds all imported documents while `localStorage` remains 100% free of real XML data.
3. **`tests/integration/flow_f_documentos_filters_selection.test.mjs`**:
   - Combinable filter verification: Filter simultaneously by supplier + NCM + date range + balance status; verify exact matching document subset.
   - Grouping logic: Verify grouping by supplier and grouping by assigned export client (including "Sem cliente atribuído" fallback).
   - Stable selection across mutations: Select 3 documents, apply search filter that hides 2 of them, change page; verify selection set retains all 3 IDs.
   - Counters accuracy: Verify selected invoices counter, total items sum, BigInt decimal value sum, and unique suppliers count.
   - Client assignment: Assign export client to document; verify `invoice.destinatario` is strictly unchanged while `invoice.clienteAtribuido` is populated.
