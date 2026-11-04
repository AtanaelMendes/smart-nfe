# Survey 3: Verification, Test, and Build Infrastructure

**Author**: `teamwork_explorer_survey_3`  
**Date**: 2026-11-04  
**Workspace**: `c:\www\smart-nfe`  
**Environment**: Windows, Node v24.11.0, pnpm 10.22.0, Next.js 16.0.10, React 19.2.0  

---

## 1. Executive Summary

1. **Current State**: The repository is currently a **greenfield** from a test automation perspective: there are **zero test files**, **zero test dependencies** (no Vitest, Jest, Playwright, or Cypress), and no `"test"` script defined in `package.json`.
2. **Build Verification**:
   - `pnpm build` (`next build` with Turbopack) was verified in isolation: **compiled successfully in 6.8s with exit code 0** (generating 7 static routes).
   - **CRITICAL CONSTRAINT**: The user currently has an active Next.js development server running externally at `http://localhost:3000/dashboard`. Per explicit instruction, **NO `pnpm build` and NO `pnpm dev` commands may be executed** during implementation/verification to avoid port conflicts and process deadlocks.
3. **Lint Verification**:
   - `pnpm lint` (`eslint`) currently fails with **228 problems (58 errors, 170 warnings)**.
   - The errors are isolated to **legacy template files** inherited from a previous SaaS starter (`Dialog.jsx`, `Iframe.jsx`, `InputFile.jsx`, `photo-modal.js`, `dashboard/page.jsx`) due to React 19 / React Compiler rules (e.g. `react-hooks/set-state-in-effect`, `react-hooks/preserve-manual-memoization`) and an erroneous TypeScript config import (`nextTs`) in `eslint.config.mjs` for a pure JS project.
   - Foundation component refactoring (Requirement R1) and minor config tuning in `eslint.config.mjs` will resolve these completely.
4. **Recommended Automated Testing Architecture**:
   - Utilize Node.js 24’s native test runner (`node:test` + `node:assert`).
   - Requires **0 new dependencies** (respects `pnpm-lock.yaml` and stack constraints).
   - Instant execution (<20ms per suite).
   - Supports 4-tier requirement-driven verification (Tiers 1–4) plus live route smoke testing against the already-running server at `http://localhost:3000`.

---

## 2. Package.json, Dependencies & Environment Deep Dive

### 2.1 Manifest Analysis (`package.json`)

```json
{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@fortawesome/fontawesome-svg-core": "^7.1.0",
    "@fortawesome/free-brands-svg-icons": "^7.1.0",
    "@fortawesome/free-regular-svg-icons": "^7.1.0",
    "@fortawesome/free-solid-svg-icons": "^7.1.0",
    "@fortawesome/react-fontawesome": "^3.1.0",
    "clsx": "^2.1.1",
    "next": "16.0.10",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "16.0.3",
    "tailwindcss": "^4"
  }
}
```

### 2.2 Dependency Findings

| Item | Finding | Assessment |
|---|---|---|
| **Test Runner** | None present in `scripts` or `devDependencies` | Built-in Node 24 `node:test` solves this without package additions. |
| **TypeScript** | None installed, no `typescript` in devDependencies | Project must remain pure JS/JSX per R4. `jsconfig.json` is configured with `@/*` aliases. |
| **ESLint** | ESLint v9.39.1 installed with flat config | Flat config `eslint.config.mjs` is active. `.eslintrc.json` is ignored by ESLint 9. |
| **Tailwind CSS** | Tailwind v4 (`@tailwindcss/postcss: ^4`, `tailwindcss: ^4`) | PostCSS plugin configured via `postcss.config.mjs`. |
| **Phantom Dependency** | `plugins/moment.js` imports `moment`, but `moment` is NOT installed in `package.json` | `moment` is not in `package.json`. R2 requires formatters in `app/lib/formatters/dates.js` using native `Intl.DateTimeFormat`. `plugins/moment.js` must be avoided or cleaned up. |
| **Phantom Client** | `plugins/axios.js` uses native `fetch` with axios-like signature | R4 prohibits real HTTP calls; repositories must use mock data in `app/lib/data/`. |

### 2.3 Runtime Environment

- **Node.js**: `v24.11.0`
- **pnpm**: `10.22.0`
- **OS**: Windows (PowerShell)
- **Node 24 Capabilities**:
  - Native test runner (`node:test`, `node:assert`, `node:assert/strict`).
  - Automatic ESM re-parsing for `.js` files using `import`/`export`.
  - Built-in global `fetch` API for live HTTP route inspection.

---

## 3. Build & Lint Pipeline Analysis

### 3.1 Next.js 16 Build Behavior

- **Build Command**: `next build` (triggered via `pnpm build`).
- **Compiler**: Turbopack (`▲ Next.js 16.0.10 (Turbopack)`).
- **Environment**: Reads `.env.local` (`NEXT_PUBLIC_APP_MODE=demo`, `NEXT_PUBLIC_APP_NAME=SmartNFe`).
- **Verified Build Output**:
  - `Compiled successfully in 6.8s`
  - 7 static routes generated (`/`, `/_not-found`, `/dashboard`, `/dev`, `/login`, etc.)
  - Exit code: `0`
- **Critical Operation Rule**: Because the user has the dev server running on `http://localhost:3000`, **do NOT run `pnpm build` or `pnpm dev`** in automated commands to prevent port blocking or process disruption. Verification in CI or final acceptance can run build, but during development we verify via Node tests and live HTTP queries.

### 3.2 ESLint 9 Flat Config Analysis

- **Configuration File**: `eslint.config.mjs`
- **Current Content**:
  ```javascript
  import { defineConfig, globalIgnores } from "eslint/config";
  import nextVitals from "eslint-config-next/core-web-vitals";
  import nextTs from "eslint-config-next/typescript";

  const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    globalIgnores([
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ]),
  ]);

  export default eslintConfig;
  ```
- **Root Cause of Lint Failures (58 Errors, 170 Warnings)**:
  1. **`...nextTs` imported into a pure JS project**: Triggers `@typescript-eslint/no-unused-vars` across JavaScript files.
  2. **React 19 / Compiler Hook Rules in `nextVitals`**:
     - `react-hooks/set-state-in-effect`: In `Dialog.jsx`, `Iframe.jsx`, `InputFile.jsx`, `dashboard/page.jsx`, `useEffect` calls `setState` synchronously (e.g. `useEffect(() => { setDescription(""); }, [props.showDialog])`).
     - `react-hooks/preserve-manual-memoization`: In `Iframe.jsx`, manual `useCallback` dependencies mismatch compiler inference.
     - `react/display-name`: In legacy inputs.
  3. **Legacy Template Artifacts**:
     - `app/assets/photo-modal.js` and `app/dev/page.jsx` contain dozens of unused variables from the old face detection template.
- **Recommended Action for Implementation Track (Etapa B/F)**:
  1. In `eslint.config.mjs`, remove `import nextTs from "eslint-config-next/typescript"` and `...nextTs`.
  2. In `eslint.config.mjs`, add ignores for legacy templates if kept for reference:
     ```javascript
     globalIgnores([
       ".next/**",
       "out/**",
       "build/**",
       "next-env.d.ts",
       "app/dev/**",
       "app/assets/photo-modal.js",
     ])
     ```
  3. In `Dialog.jsx` and `InputFile.jsx` (mandated by R1): Refactor `useEffect` to avoid synchronous `setState` in effect bodies (e.g. compute state or reset on trigger).
  4. With these fixes, individual files (like `app/layout.jsx`) already pass with **0 errors**.

---

## 4. E2E Testing Track Architecture (Tiers 1–4)

### 4.1 Test Runner Evaluation

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **Node.js Native Test Runner (`node:test`)** | • Built into Node 24 (zero installs)<br>• Fully respects `pnpm-lock.yaml`<br>• Sub-millisecond execution<br>• Built-in assert & mock<br>• Native ESM support | • Does not render DOM/JSX directly in Node (tests logic, data, calculations, formatters, repos, and live HTTP) | **CHOSEN RUNNER** ⭐ |
| **Vitest** | • Fast, ESM native, jsdom support | • Requires adding multiple devDependencies (`vitest`, `@testing-library/react`, etc.)<br>• Risk of lockfile/version drift | Not recommended for Phase 1 MVP |
| **Playwright / Cypress** | • Full browser interaction | • Heavy install (browsers download ~500MB)<br>• Requires running its own server or extra configs | Overkill for Phase 1 mock frontend |
| **Custom Test Runner Script** | • Full control | • Reinvents what `node:test` already provides out-of-the-box | Unnecessary given `node:test` |

### 4.2 Test File Organization

```
tests/
├── fixtures/
│   └── testHelpers.mjs            → HTTP request helper, mock localStorage helper
├── tier1/
│   ├── formatters.test.mjs        → Currency, dates, numbers, status
│   ├── calculations.test.mjs      → String decimal invoice totals & division balances
│   ├── mockData.test.mjs          → 5 mock scenarios schema and integrity
│   ├── localStorage.test.mjs      → Versioned schema 1.0.0, save/load/reset
│   └── repositories.test.mjs      → Async contracts (list, findById, update, etc.)
├── tier2/
│   ├── invoiceMutation.test.mjs   → Updating items recalculates totals
│   ├── divisionLogic.test.mjs     → Multi-note allocation, balance check, over/under alerts
│   └── validationRules.test.mjs   → Inconsistency detection (demo-04 flags, demo-01 clean)
├── tier3/
│   └── liveRoutes.test.mjs        → HTTP 200, HTML title, demonstration badge on live server
└── tier4/
    └── userJourneys.test.mjs      → Synthetic end-to-end multi-step flows
```

### 4.3 Execution Commands

- **Run all automated tests**:
  ```bash
  node --no-warnings --test tests/**/*.test.mjs
  ```
- **Run by tier**:
  ```bash
  node --no-warnings --test tests/tier1/*.test.mjs
  node --no-warnings --test tests/tier2/*.test.mjs
  node --no-warnings --test tests/tier3/*.test.mjs
  node --no-warnings --test tests/tier4/*.test.mjs
  ```
- **Recommended `package.json` Script**:
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "node --no-warnings --test tests/**/*.test.mjs"
  }
  ```

---

## 5. Detailed Tier Specifications (Requirement-Driven)

### Tier 1: Foundation & Data Integrity (Unit / Contract Tests)

Tests core isolated functions, mathematical calculations, formatters, and mock schemas.

1. **Formatters (`app/lib/formatters/`)**:
   - `currency.js`: `formatBRL("1250.50")` → `"R$ 1.250,50"`; `parseBRL("R$ 1.250,50")` → `"1250.50"`.
   - `dates.js`: `formatDateBR("2026-11-04")` → `"04/11/2026"`; handles ISO timestamps, null/empty fallback.
   - `numbers.js`: `formatQuantity("10.000", 3)` → `"10,000"`; `formatDecimal("25.5000", 4)` → `"25,5000"`.
   - `status.js`: Validates status dictionary (`pendente`, `conferido`, `inconsistente`, `dividido`, `preparado`) and corresponding color tokens.
2. **Calculations (`app/lib/calculations/`)**:
   - `invoiceTotals.js`:
     - Multiplies `quantidade` and `valorUnitario` using string decimal logic.
     - Avoids float precision drift: `0.1 + 0.2` string decimal check equals `"0.30"`.
     - Sums items and adds impostos/frete to compute total `valorNota`.
   - `division.js`:
     - Calculates residual quantities: `saldo = quantidadeOriginal - somaAlocada`.
     - Validates that over-allocation yields negative balance and invalid flag.
3. **Mock Data Integrity (`app/lib/data/`)**:
   - `demo-01`: Standard XML scenario with exactly 8 items.
   - `demo-02`: PDF export scenario with exactly 25 items.
   - `demo-03`: Large scenario with exactly 50 items.
   - `demo-04`: Inconsistencies scenario with 12 items (CFOP/NCM/aliquota flags).
   - `demo-05`: Duplicate products scenario with 15 items.
   - All scenario documents contain required root fields: `id`, `numero`, `serie`, `emissao`, `destinatario`, `itens`, `totais`, `status`.
4. **LocalStorage Service (`app/lib/storage/localStorageService.js`)**:
   - Version schema constant is `"1.0.0"`.
   - Payload wraps `{ version: "1.0.0", timestamp: ..., data: ... }`.
   - Incompatible version returns null and resets safely.
   - `resetAll()` restores initial state for all 5 demo scenarios.
5. **Mock Repository Contract (`app/features/`)**:
   - Follows async method signature: `list(filters)`, `findById(id)`, `update(id, data)`, `updateItem(id, itemId, data)`, `getValidationIssues(id)`.
   - Returns Promises resolving to clean data copies (preventing in-place mutations).

### Tier 2: Business Logic & Workflow Integration

Tests state interactions and multi-component domain rules.

1. **Item Mutation & Recalculation**:
   - Calling `updateItem("demo-01", "item-1", { quantidade: "20.000" })` updates line item total and automatically recalculates overall document totals.
   - Preserves original item data in `valorOriginal` to track `modificado: true`.
2. **Division Logic**:
   - Allocating item 1 (quantity 10) into Note A (quantity 6) and Note B (quantity 4) results in residual balance `0.000` (`valido: true`).
   - Allocating quantity 12 when 10 is available flags an excess error (`saldo: -2.000`, `valido: false`).
   - Partial allocation (e.g. Note A: 6, Note B: 0) flags remaining unallocated quantity (`saldo: 4.000`).
3. **Validation Engine**:
   - Executing `getValidationIssues("demo-04")` returns array of specific simulated issues (e.g., "NCM incompatível com exportação", "CFOP divergente").
   - Executing `getValidationIssues("demo-01")` returns an empty issues list (`[]`).

### Tier 3: Route & Rendering Verification (Live HTTP / Smoke)

Leverages the running dev server at `http://localhost:3000` to verify routes without starting or stopping any processes.

1. **HTTP Status 200 on all 8 Mandatory Screens**:
   - `GET http://localhost:3000/dashboard` → HTTP 200
   - `GET http://localhost:3000/documentos/importar` → HTTP 200
   - `GET http://localhost:3000/documentos` → HTTP 200
   - `GET http://localhost:3000/documentos/demo-01/conferencia` → HTTP 200
   - `GET http://localhost:3000/documentos/demo-01/divisao` → HTTP 200
   - `GET http://localhost:3000/documentos/demo-04/validacao` → HTTP 200
   - `GET http://localhost:3000/notas-preparadas` → HTTP 200
   - `GET http://localhost:3000/configuracoes` → HTTP 200
2. **Static Layout & SSR Markup Assertions**:
   - Response contains `<title>SmartNFe` in `<head>`.
   - Response contains `"Modo Demonstração"` badge text.
   - Response contains Sidebar navigation items (Dashboard, Documentos, Importar, Notas Preparadas, Configurações).
   - No old recruitment/HR menu text is present in the rendered HTML.

### Tier 4: Synthetic User Journeys (E2E Contract Testing)

Validates multi-step flows simulating real user sessions via storage and service simulation.

1. **Journey 1: Document Review & Edit (`/conferencia`)**:
   - Load `demo-01` → verify 8 items loaded.
   - Simulate inline edit of item 3 (price changed from 15.00 to 20.00).
   - Verify `recalcularNota` updates subtotal and total note value.
   - Verify document status updates to `"conferido"`.
   - Verify state persists in `localStorageService`.
2. **Journey 2: Export Invoice Splitting (`/divisao`)**:
   - Load `demo-02` (25 items).
   - Create 2 destination invoices (`NF-A`, `NF-B`).
   - Distribute items 1–15 to `NF-A` and 16–25 to `NF-B`.
   - Validate balance is 0 for all items.
   - Trigger division save → verify 2 prepared invoices generated in `mockDivisionRepository`.
   - Verify generated notes appear in `notasPreparadasService.list()`.
3. **Journey 3: Fiscal Validation Assistant (`/validacao`)**:
   - Load `demo-04`.
   - Query validation issues → verify issues are detected.
   - Apply suggested corrections → revalidate → verify issue count decrements.
4. **Journey 4: UI Preferences (`/configuracoes`)**:
   - Set table density preference to `"compact"`.
   - Verify setting is saved to `localStorageService`.
   - Re-fetch preferences → verify `"compact"` is returned.

---

## 6. Risks, Missing DevDependencies, and Build Blockers

### 6.1 Identified Risks & Mitigations

| Risk | Severity | Impact | Mitigation Strategy |
|---|---|---|---|
| **Port Conflict / Environment Freeze** | **CRITICAL** | Running `pnpm dev` or `pnpm build` could crash or freeze the user's active session on port 3000. | Strictly forbid subagents and workers from running `pnpm dev` or `pnpm build`. Rely on `node --test` for logic verification and native `fetch` against `http://localhost:3000` for route testing. |
| **ESLint 9 Flat Config Errors** | **HIGH** | `pnpm lint` currently exits with code 1 due to 58 errors in legacy template code. | Remove `nextTs` from `eslint.config.mjs`, refactor `Dialog.jsx`/`InputFile.jsx` to eliminate `setState` in `useEffect`, ignore dead template files (`app/dev/`, `photo-modal.js`). |
| **Phantom Dependency `moment`** | **MEDIUM** | `plugins/moment.js` imports `moment`, which is missing from `package.json`. If imported, runtime will crash. | Do not use `moment` or `plugins/moment.js`. Centralize all date handling in `app/lib/formatters/dates.js` using standard JavaScript `Intl.DateTimeFormat`. |
| **Binary Floating Point Precision Drift** | **MEDIUM** | In fiscal applications, standard JS floats (`0.1 + 0.2 = 0.30000000000000004`) lead to incorrect note totals. | Enforce string decimal calculations in `app/lib/calculations/` (e.g. scale to integer cents or use decimal string helper). |
| **Direct Mutation of Mock Data** | **MEDIUM** | If repositories mutate `mockInvoices` directly in-memory, resets and isolated test runs will become nondeterministic. | Ensure all mock repository operations deep-clone data (`structuredClone` or `JSON.parse(JSON.stringify())`) and persist via `localStorageService`. |

---

## 7. Concrete Next Steps for Implementation and Testing Tracks

1. **Milestone 1 Testing Setup**:
   - Create `tests/fixtures/testHelpers.mjs`.
   - Add `"test": "node --no-warnings --test tests/**/*.test.mjs"` to `package.json`.
   - Author `tests/tier1/` and `tests/tier3/liveRoutes.test.mjs` immediately to verify `/dashboard` and base components.
2. **ESLint Clean-Up (Etapa B/F)**:
   - Apply clean JS config in `eslint.config.mjs`.
   - Ensure `pnpm lint` returns code 0.
3. **Execution Guardrails**:
   - All worker dispatches must include the constraint: `"DO NOT run pnpm build or pnpm dev; run node --test tests/... for verification."`
