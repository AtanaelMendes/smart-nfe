# BRIEFING — 2026-11-13T13:36:40Z

## Mission
Survey SmartNFe codebase for R1 (Left Drawer & Layout) and R2 (Multi-XML Import & Document Management) to inform planning and implementation.

## 🔒 My Identity
- Archetype: explorer
- Roles: explorer, synthesis
- Working directory: c:\www\smart-nfe
- State folder: c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\
- Original parent: c09bc610-72fd-41ec-bb07-185334e1e0d5
- Milestone: M0 Survey & Architecture Analysis

## 🔒 Key Constraints
- Read-only investigation — do NOT implement changes in source code
- Focus on R1 (Left Drawer & Layout) and R2 (Multi-XML Import & Document Management)
- Do not persist real XML files to localStorage
- Deliver report.md and handoff.md with PROJECT.md feature inventory items

## Current Parent
- Conversation ID: c09bc610-72fd-41ec-bb07-185334e1e0d5
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `app/layout.jsx`, `app/context/AppContext.jsx`
  - `app/components/Layouts/AppLayout.jsx`, `SmartNFeSidebar.jsx`, `SmartNFeHeader.jsx`
  - `app/components/feedback/ScreenTourTip.jsx`, `app/config/screenTours.js`
  - `app/documentos/[id]/conferencia/page.jsx`
  - `app/documentos/importar/page.jsx`, `app/features/xml/*`, `app/features/invoiceRepository.js`
  - `app/documentos/page.jsx`, `app/components/table/DataTable.jsx`, `Pagination.jsx`
  - Existing test suite (383 tests passing)
- **Key findings**:
  - `AppLayout` reset bug: local state unmounts on each page navigation. Must centralize in `AppContext`.
  - Hydration safety via `useSyncExternalStore` or safe mounted hook with `smartnfe_sidebar_collapsed`.
  - Responsive mobile overlay drawer at $\le 1024\text{px}$ with backdrop, Escape key, close button, and `lg:hidden` toggle.
  - Multi-XML batch importer needs concurrency limiter (pool = 3), progress bars, retry, and duplicate detection by access key.
  - Documents page needs 300ms debounced search, 8 combinable filters, visual grouping (supplier/client), stable multi-selection across pagination/sorting with dynamic counters, and operational `clienteAtribuido` without mutating `destinatario`.
- **Unexplored areas**: None for R1 and R2 scope.

## Key Decisions Made
- Completed deep dive into R1 and R2 code paths and architectural requirements.
- Generated comprehensive `report.md` with complete gap analysis, data structures, and implementation specifications.
- Formulated 12 concrete feature inventory items (Features 23-34) for `PROJECT.md`.
- Completed 5-component `handoff.md`.

## Artifact Index
- `c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\report.md` — Detailed survey report
- `c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\handoff.md` — 5-component handoff report
