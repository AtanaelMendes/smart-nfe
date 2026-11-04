# BRIEFING — 2026-11-04T14:35:10Z

## Mission
Survey the existing codebase at c:\www\smart-nfe (routes, components, contexts, leftover RH vs SmartNFe, and R1 foundation items) in read-only mode.

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: explorer, codebase survey
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1
- Original parent: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
- Milestone: M0 Survey & Codebase Exploration

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- NEVER edit or create source code files. Write ONLY to working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1\
- Adhere strictly to Teamwork explorer and handoff guidelines
- CRITICAL USER INSTRUCTION: External dev server running at http://localhost:3000/dashboard. DO NOT execute build commands (`pnpm build`, `npm run build`) and DO NOT launch dev servers (`pnpm dev`, `npm run dev`) to avoid port conflicts and environment hanging.

## Current Parent
- Conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
- Updated: 2026-11-04T14:32:28Z

## Investigation State
- **Explored paths**:
  - `package.json`, `next.config.js`, `.env.local`, `eslint.config.mjs`, `globals.css`
  - `app/layout.jsx`, `app/page.jsx`, `app/dashboard/page.jsx`, `app/login/page.jsx`, `app/dev/page.jsx`
  - `app/context/AppContext.jsx`
  - `app/components/Layouts/*` (`Sidebar.jsx`, `SmartNFeSidebar.jsx`, `SmartNFeHeader.jsx`, `AppLayout.jsx`, `DemoBadge.jsx`, `ToastContainer.jsx`, `Loading.jsx`, `Dialog.jsx`, `Pagination.jsx`, `Skeleton.jsx`, `NoDataFound.jsx`, `PageTabs.jsx`, `Confirm.jsx`, `Accordion.jsx`, `Typography.jsx`, `TooltipComponent.jsx`)
  - `app/components/buttons/*` (`Button.jsx`, `ButtonGroup.jsx`, `ButtonToggle.jsx`, `ButtonDropDown.jsx`, `PillsBadge.jsx`)
  - `app/components/cards/*` (`Card.jsx`)
  - `app/components/inputs/*` (`InputText.jsx`, `InputNumber.jsx`, `InputFile.jsx`, `Select.jsx`, `Checkbox.jsx`, `InputTextArea.jsx`, legacy Select2 and range sliders)
  - `app/components/table/*` (`DataTable.jsx`)
  - `app/assets/*` (`utils.js`, `dateUtils.js`, `permissoes.js`, `photo-modal.js`, `RefreshTokenCredentials.js`)
  - `plugins/*` (`axios.js`, `moment.js`)
- **Key findings**:
  - `next.config.js` is already modified in working tree removing `basePath` and `output: 'export'`.
  - Foundation components in working tree already have initial adaptations: `AppContext.jsx` has `toast` and `settings`; `InputFile.jsx` accepts XML/PDF with clear; `DataTable.jsx` accepts `columns`; `Loading.jsx` removed RH logo; `SmartNFeSidebar`, `SmartNFeHeader`, `ToastContainer`, `DemoBadge`, `AppLayout` created.
  - `DemoBadge.jsx` text is "DEMO", whereas requirement says "Modo Demonstração".
  - `app/dashboard/page.jsx` is still the legacy template with fake auth check redirecting to `/login`!
  - No SmartNFe screens (Documentos, Importar, Conferencia, Divisao, Validacao, Notas Preparadas, Configuracoes) exist yet.
  - No mocks (`app/lib/data`), formatters (`app/lib/formatters`), calculations (`app/lib/calculations`), storage (`app/lib/storage`), or features (`app/features/`) exist yet.
  - `moment` is referenced in `plugins/moment.js`, `utils.js`, and legacy components, but is NOT installed in `package.json`.
  - ESLint reports 228 problems (58 errors) due to legacy files and React 19 rules.
- **Unexplored areas**: None for M0 scope.

## Key Decisions Made
- Fully documented all existing vs legacy components, APIs, props, integration points, and remaining requirements.

## Artifact Index
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1\survey_codebase.md` — Full detailed codebase survey report
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1\handoff.md` — 5-component handoff report
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1\progress.md` — Liveness heartbeat
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1\DISPATCH.md` — Record of dispatches and messages
