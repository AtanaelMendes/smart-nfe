# DISPATCH — Explorer Survey 3 (Preparation UI N->M, Test Infra, Build & Mocks)

## Mission
Survey the existing SmartNFe codebase for R3 (New Preparation N->M Flow & UI), R5 (Infrastructure, Mocks, Tours), and Verification Resources (test runner, fixtures), in accordance with ORIGINAL_REQUEST.md.

## Path to ORIGINAL_REQUEST.md
`c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md`

## Focus Areas
1. Preparation Flow & UI (`/preparacoes/nova` and `/preparacoes`):
   - Grouping (N -> 1), division (1 -> M), mixed (N -> M) workflows.
   - High-density compact UI requirements: wide table, fixed header, collapsible filters, sticky totals, tabbed source/destination panels, inline quick editing of quantities and balances.
   - Origin preservation (`sourceInvoiceId + sourceItemId`), temporary memory draft saving with explicit session loss notice.
2. Infrastructure, Git & Config (R5):
   - Current git branches, current working tree. Verify that branch `feature/preparacoes-unificadas` needs to be created from existing repo without touching master.
   - Project dependencies, Next.js version, package.json scripts (`npm run build`, `npm run lint`, test runner).
   - Vercel autonomous execution requirements (without PHP backend).
   - `app/config/screenTours.js` structure and tour updates.
3. Verification & Mock Scenarios:
   - Existing tests directory (`tests/`), current test harness (Vitest / Jest / Playwright / etc. or lack thereof).
   - Mock XML fixtures strategy (2 to 50 invoices, multi-supplier, multi-client, repeated products, incompatible units).

## Output
Write a comprehensive report to `c:\www\smart-nfe\.agents\teamwork\explorer_survey_3\report.md` detailing:
- Existing code structure & file paths
- Gaps and required changes
- Proposed test infrastructure and mock fixture structure
- Specific feature inventory items for PROJECT.md
Send a summary message when done.


## 2026-11-13T13:28:14Z
You are Explorer 3 for the SmartNFe project survey.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\explorer_survey_3\
Path to ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Path to DISPATCH.md: c:\www\smart-nfe\.agents\teamwork\explorer_survey_3\DISPATCH.md

Read ORIGINAL_REQUEST.md and DISPATCH.md first.
Survey the SmartNFe codebase focusing on:
1. Preparation Flow & UI (R3):
   - Routes /preparacoes/nova and /preparacoes.
   - Workflows for grouping (N -> 1), division (1 -> M), and mixed (N -> M).
   - High-density compact UI requirements: wide table, fixed header, collapsible filters, persistent totals, tabbed source/destination panels, inline quick editing of quantities and balances in real time.
   - Origin preservation (sourceInvoiceId + sourceItemId), temporary memory draft saving with explicit session loss notice.
2. Infrastructure, Git & Config (R5):
   - Current git branches, current working tree. Verify branch feature/preparacoes-unificadas requirement (must branch from existing repo without modifying master directly).
   - Project dependencies, Next.js version, package.json scripts (npm run build, npm run lint, test runner).
   - Vercel autonomous execution requirements (without PHP backend).
   - app/config/screenTours.js structure and tour updates.
3. Verification & Mock Scenarios:
   - Existing tests directory (tests/), current test harness (Vitest / Jest / Playwright / etc.).
   - Mock XML fixtures strategy (2 to 50 invoices, multi-supplier, multi-client, repeated products, incompatible units).

Investigate the actual code in c:\www\smart-nfe. Produce a comprehensive report in c:\www\smart-nfe\.agents\teamwork\explorer_survey_3\report.md and a handoff report at c:\www\smart-nfe\.agents\teamwork\explorer_survey_3\handoff.md following the Handoff Protocol. Include concrete feature inventory items with descriptions for PROJECT.md.
Send a message to your parent when completed.
