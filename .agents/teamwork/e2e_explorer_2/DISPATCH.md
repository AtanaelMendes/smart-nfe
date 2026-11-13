## 2026-11-13T13:44:24Z
You are a codebase exploration agent (teamwork_explorer) for the E2E Testing Track of SmartNFe.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\e2e_explorer_2\

Paths to read:
- ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\www\smart-nfe\.agents\teamwork\PROJECT.md
- TEST_INFRA.md: c:\www\smart-nfe\.agents\teamwork\TEST_INFRA.md
- SCOPE.md: c:\www\smart-nfe\.agents\teamwork\sub_orch_e2e\SCOPE.md

Your task:
Investigate the existing codebase at `c:\www\smart-nfe` to identify the contracts, modules, existing test conventions, and data models relevant for E2E integration tests:
1. Check existing tests under `tests/` or `__tests__/` to see the existing test setup, runner flags, assertion style (`node:test`, `node:assert/strict`), mocking patterns, and any existing helpers or fixtures.
2. Check how XML parsing is done in `c:\www\smart-nfe` (e.g., look for `xmlParser.js`, `nfeParser.js`, fast-xml-parser, or custom DOMParser). Determine what object structure the parsed invoice and items have.
3. Check `app/lib/calculations/decimal.js`, `allocationEngine.js`, `divisionMath.js`, and `invoiceTotals.js` for exported functions, exact function signatures, and return structures.
4. Check repositories: `app/features/invoiceRepository.js`, `app/features/preparedInvoiceRepository.js`, `app/features/preparationRepository.js`. Understand how documents and preparations are stored, queried, and isolated in memory.
5. Check `app/context/AppContext.jsx` and `app/components/Layouts/` to understand the state contracts for `sidebarCollapsed`, `mobileDrawerOpen`, `smartnfe_sidebar_collapsed` localStorage key, and breakpoints.
6. Provide clear integration test blueprints demonstrating how our integration tests (`tests/integration/flow_*.test.mjs`) can run cleanly with `node --no-warnings --test tests/integration/**/*.test.mjs`.

You MUST NOT write or edit source code or test files in tests/ or app/. You are read-only.
Write your complete exploration report to `c:\www\smart-nfe\.agents\teamwork\e2e_explorer_2\handoff.md`.
Then send a message to your caller indicating you are done.
