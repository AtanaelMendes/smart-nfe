# Handoff Report — Explorer Survey 2: Left Drawer & Layout (R1), Multi-XML Import & Document Management (R2)

**Agent**: Explorer Survey 2  
**Date**: 2026-11-13  
**Target Recipient**: Parent Orchestrator (`c09bc610-72fd-41ec-bb07-185334e1e0d5`)  
**Scope**: Codebase Survey & Architecture Plan for R1 & R2  

---

## 1. Observation

Direct observations from inspecting `c:\www\smart-nfe`:

1. **Sidebar State in `AppLayout.jsx`**:
   - In `app/components/Layouts/AppLayout.jsx` (lines 9-11):
     ```javascript
     export default function AppLayout({ children, breadcrumbs = [] }) {
       const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
     ```
   - Each route page (`/dashboard`, `/documentos`, `/documentos/importar`, `/notas-preparadas`, `/configuracoes`, `/documentos/[id]/*`) directly renders `<AppLayout>`.
   - On every client route navigation, `<AppLayout>` unmounts and remounts, completely resetting `sidebarCollapsed` to `false`.
   - The key `smartnfe_sidebar_collapsed` is never referenced in `AppLayout.jsx`, `SmartNFeSidebar.jsx`, `SmartNFeHeader.jsx`, or `AppContext.jsx`.

2. **Mobile Drawer Breakpoint & Layout**:
   - In `app/components/Layouts/SmartNFeHeader.jsx` (lines 50-57):
     ```javascript
     {onMenuToggle && (
       <button
         onClick={onMenuToggle}
         className="md:hidden p-1.5 rounded text-gray-500 ..."
       >
         <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
       </button>
     )}
     ```
   - The button uses `md:hidden` ($768\text{px}$) instead of the required LG breakpoint ($1024\text{px}$). Between 768px and 1024px, the hamburger button is hidden.
   - `SmartNFeSidebar.jsx` (lines 76-82) renders exclusively as an inline flex aside (`w-60` or `w-14`). There is no slide-over drawer overlay, backdrop, close button, or Escape key listener for $\le 1024\text{px}$.

3. **ScreenTourTip & Table Editing Escape Key Invariants**:
   - In `app/components/feedback/ScreenTourTip.jsx` (lines 151-163):
     ```javascript
     if (event.key === 'Escape') {
       if (event.defaultPrevented) return;
       const hasActiveModal = Boolean(
         typeof document !== 'undefined' &&
           document.querySelector('[role="dialog"], [aria-modal="true"]')
       );
       if (hasActiveModal) return;
     ```
   - In `app/documentos/[id]/conferencia/page.jsx` (lines 183-187):
     ```javascript
     } else if (e.key === 'Escape') {
       e.preventDefault();
       handleRestoreItem(itemId);
       e.target.blur();
     }
     ```
   - Product table inline editing already calls `e.preventDefault()`, which prevents `ScreenTourTip` from closing.

4. **Single-File Import Bottleneck**:
   - In `app/documentos/importar/page.jsx`:
     - Line 320: `<input type="file" id="file-upload" accept=".xml,.pdf" onChange={handleFileInput} className="hidden" />` (lacks `multiple`).
     - Line 116: `processFile(e.dataTransfer.files[0])`.
     - Line 122: `processFile(e.target.files[0])`.
   - In `app/features/invoiceRepository.js` (lines 26, 645-667):
     - `sessionInvoices = new Map()` stores real imported XMLs strictly in volatile memory.
     - `create(invoiceData)` sets `sessionInvoices.set(newDoc.id, deepClone(newDoc))` without writing to `localStorage`.
     - However, duplicate access keys silently overwrite the existing Map entry without notifying the user or tracking intra-batch duplicates.

5. **Document List UI Limitations**:
   - In `app/documentos/page.jsx` (lines 74-87, 243-266):
     - Search input updates `searchTerm` directly on every keystroke with zero debounce.
     - Single status filter dropdown (`statusFilter`).
     - No filters for supplier, assigned export client, NCM, product, dates, values, or balances.
     - No checkboxes or selection state in `DataTable.jsx` or `DocumentosPage`.
     - No grouping support (flat table only).
     - No concept of assigned export client (`clienteAtribuido`).

6. **Current Test Suite Baseline**:
   - Executing `node --no-warnings --test tests/**/*.test.mjs` in `c:\www\smart-nfe`:
     ```
     ℹ tests 383
     ℹ suites 104
     ℹ pass 383
     ℹ fail 0
     ℹ duration_ms 7219.4107
     ```
   - All 383 existing automated tests pass with 0 failures.

---

## 2. Logic Chain

1. **R1 Sidebar Navigation Persistence**:
   - Because `AppLayout` is instantiated separately by every page (Observation 1), any state stored inside `AppLayout.jsx` via `useState` is destroyed and re-initialized on navigation.
   - Moving `sidebarCollapsed` and `mobileDrawerOpen` into `AppContext.jsx` ensures the state survives route transitions because `AppProvider` wraps the entire app at `app/layout.jsx`.
   - Persisting to `localStorage.getItem('smartnfe_sidebar_collapsed')` must only synchronize after mount (via `mounted` or post-mount effect) to ensure the server-rendered HTML matches initial client hydration, avoiding React 19 hydration mismatch errors.

2. **R1 Responsive Mobile Overlay**:
   - At screens $\le 1024\text{px}$, an inline sidebar consumes valuable horizontal space needed for tables and forms.
   - Replacing the desktop sidebar with an overlay drawer on viewports $\le 1024\text{px}$ requires:
     - Backdrop (`fixed inset-0 bg-slate-900/60 z-40`).
     - Drawer container (`fixed inset-y-0 left-0 z-50 w-64`).
     - Hamburger toggle visible at `lg:hidden` (fixing the gap between 768px and 1024px identified in Observation 2).
     - Escape key listener and close button (`faXmark`).
   - By tagging the mobile drawer with `role="dialog"` and `aria-modal="true"` and calling `event.preventDefault()` when closing via Escape, `ScreenTourTip` will safely ignore the Escape key (Observation 3).

3. **R2 Multi-XML Concurrency & In-Memory Isolation**:
   - Allowing multi-selection (`<input multiple>` and array drop handling) unlocks batch uploads (Observation 4).
   - If 50 XMLs are parsed simultaneously, the DOMParser and memory allocations could choke the browser UI.
   - Implementing a queue with a concurrency limit of 3 workers with `setTimeout(0)` yields between tasks maintains 60fps responsiveness.
   - Cross-referencing extracted 44-digit access keys against `sessionInvoices` and an intra-batch `Set` flags duplicates without crashing or overwriting.
   - Per-file progress tracking and a retry function ensure that a single corrupt XML does not invalidate the other 49 successfully parsed files.
   - Storing exclusively in `sessionInvoices = new Map()` preserves fiscal data confidentiality without touching `localStorage`.

4. **R2 Document Search, Multi-Facet Filters & Visual Grouping**:
   - Adding a 300ms debounce prevents CPU-intensive re-filtering of 50+ documents and hundreds of items on every keystroke.
   - Searching across invoice number, access key, supplier, recipient, assigned client, NCM, and product names satisfies user discovery requirements.
   - Supporting combined filters (client, supplier, NCM, product, dates, values, balances) enables rapid slicing of origin notes for export preparations.
   - Visual grouping by supplier or assigned client (with group headers, totals, item counts, and group select-all) organizes origin notes naturally.

5. **R2 Stable Selection & Operational Client Assignment**:
   - Holding selected IDs in a top-level `Set<string>` guarantees that sorting, changing pages, or adjusting filters does not wipe selections.
   - Floating action bar dynamically computes live counters (selected invoices, items, BigInt monetary totals, distinct suppliers) using `decimalAdd`.
   - Introducing `invoice.clienteAtribuido` (with default "Sem cliente atribuído") enables categorizing documents for export without altering the legally immutable `invoice.destinatario` from SEFAZ.

---

## 3. Caveats

1. **Branch Compliance**: Work is currently on branch `master`. Per R5, actual implementation must take place on branch `feature/preparacoes-unificadas`. This survey is strictly read-only.
2. **Backend Execution**: The application runs purely in-browser (Vercel autonomous mode). Real XML data is intentionally volatile; refreshing or closing the browser clears `sessionInvoices`. This is an intended architectural design and not a defect.
3. **Old Dead Template Components**: Unused components in `app/components/inputs/DebouncedSearch/` contain stale code/imports (e.g. `react-tailwindcss-select`, `axiosInstance`). Implementations for R1/R2 should use clean, self-contained native React/Next.js/Tailwind components without importing unused legacy packages.

---

## 4. Conclusion

The current codebase is in excellent health (383/383 tests passing, modular XML engine, solid BigInt arithmetic foundation), but has clear, localized architectural gaps for R1 and R2:
- R1 requires centralizing sidebar state in `AppContext`, hydrating safely from `smartnfe_sidebar_collapsed`, and adding the $\le 1024\text{px}$ overlay drawer with backdrop and Escape handling.
- R2 requires upgrading `/documentos/importar` into a multi-file batch engine with concurrency pool (3), duplicate detection, progress bars, and retry.
- R2 requires overhauling `/documentos` with debounced search, 8 combinable filters, visual grouping (supplier/client), stable multi-selection with live aggregate counters, and the operational `clienteAtribuido` domain model.

### Proposed Feature Inventory Items for `PROJECT.md`

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

## 5. Verification Method

1. **Verify Baseline Tests**:
   - Command: `Set-Location "c:\www\smart-nfe"; node --no-warnings --test tests/**/*.test.mjs`
   - Expected Result: 383 passed, 0 failed.
2. **Inspect Survey Report**:
   - File: `c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\report.md`
   - Verify all 5 sections are populated with concrete code citations, architectural gap comparisons, and technical blueprints.
3. **Invalidation Conditions**:
   - If `smartnfe_sidebar_collapsed` is read during SSR causing hydration warnings in browser console.
   - If real XML files are found inside `localStorage.getItem('smartnfe_invoices')`.
   - If assigning a client mutates `invoice.destinatario`.
   - If multi-file upload freezes the browser tab or drops below 30fps during XML batch parsing.
