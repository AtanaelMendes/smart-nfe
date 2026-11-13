# DISPATCH — Explorer Survey 2 (Layout, Left Drawer, Import & Documents UI)

## Mission
Survey the existing SmartNFe codebase for R1 (Left Drawer & Layout) and R2 (Multi-XML Import & Document Management), in accordance with ORIGINAL_REQUEST.md.

## Path to ORIGINAL_REQUEST.md
`c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md`

## Focus Areas
1. Left Drawer & Layout:
   - `app/components/Layouts/AppLayout.jsx`, `SmartNFeSidebar.jsx`, `SmartNFeHeader.jsx`, `app/context/AppContext.jsx`.
   - Persistence in `smartnfe_sidebar_collapsed` without hydration mismatch.
   - Behavior above 1024px vs LG or lower (<= 1024px) with backdrop, Escape key, close button.
   - Interaction with ScreenTourTip and product editor.
2. Multi-XML Import (`/documentos/importar`):
   - Existing single/multi file upload handling, XML parsing logic.
   - Architecture for drag-and-drop, concurrency-limited batch processing in browser.
   - Progress tracking (individual + global), retry mechanism, duplicate detection by access key (chave de acesso).
   - In-memory processing without writing real XMLs to localStorage.
3. Document Management (`/documentos`):
   - Debounced search, combined filters (assigned export client, supplier, NCM, product, dates, values, balances).
   - Visual grouping by client or supplier.
   - Stable multi-item selection across pagination/filtering/sorting with counters for invoices, items, values, suppliers.
   - Organization by assigned export client (including "Sem cliente atribuído") without modifying original NF-e recipient.

## Output
Write a comprehensive report to `c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\report.md` detailing:
- Existing code structure & file paths
- Gaps and required changes
- Proposed component architecture & state handling
- Specific feature inventory items for PROJECT.md
Send a summary message when done.

## 2026-11-13T13:28:09Z
[Parent Message]
You are Explorer 2 for the SmartNFe project survey.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\
Path to ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Path to DISPATCH.md: c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\DISPATCH.md

Read ORIGINAL_REQUEST.md and DISPATCH.md first.
Survey the SmartNFe codebase focusing on:
1. Left Drawer & Layout (R1):
   - app/components/Layouts/AppLayout.jsx, SmartNFeSidebar.jsx, SmartNFeHeader.jsx, app/context/AppContext.jsx.
   - Persistence of user preference in `smartnfe_sidebar_collapsed` without hydration mismatch.
   - Behavior above 1024px vs LG or lower (<= 1024px) with backdrop, Escape key, close button.
   - Interaction with ScreenTourTip and product editor.
2. Multi-XML Import (R2):
   - Route /documentos/importar: current import code, XML parsing logic.
   - Browser-based batch processing with limited concurrency, individual and overall progress bars, failure retry, duplicate detection by access key (chave de acesso).
   - In-memory processing without saving real XMLs to localStorage.
3. Documents View & Management (R2):
   - Route /documentos: debounced search, combinable filters (assigned export client, supplier, NCM, product, dates, values, balances).
   - Visual grouping by client or supplier.
   - Stable multi-item selection across pagination, sorting, grouping with counters for invoices, items, values, suppliers.
   - Organization by assigned export client (including "Sem cliente atribuído") without modifying original NF-e recipient.

Investigate the actual code in c:\www\smart-nfe. Produce a comprehensive report in c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\report.md and a handoff report at c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\handoff.md following the Handoff Protocol. Include concrete feature inventory items with descriptions for PROJECT.md.
Send a message to your parent when completed.
