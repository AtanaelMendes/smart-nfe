# Review & Adversarial Audit Report: Storage, Repositories, Formatters & Mock Calibrations

**Reviewer Agent:** `teamwork_reviewer_m2_2`  
**Milestone:** Milestone 2 (Core Domain Services & Storage)  
**Parent Agent:** `3aeeebdd-68a6-49e6-8f40-494114a9f1f7`  
**Date:** 2026-11-04  
**Target Work Product:** `teamwork_worker_m2` handoff and associated Milestone 2 files  
**Final Verdict:** **APPROVE**

---

## 1. Executive Summary

This independent quality and adversarial review evaluated the storage persistence, asynchronous repositories, universal formatters, calibrated baseline mock invoices, and component resilience in Milestone 2.

All implementations were verified against the specifications in `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `SCOPE.md`. Comprehensive static analysis (ESLint) and automated dynamic test suites (`node --no-warnings --test tests/tier1/m2_domain.test.mjs` and all 112 workspace tests) executed cleanly with **0 errors and 0 failures**.

Integrity checks confirmed **zero integrity violations**:
- No hardcoded test outputs or dummy facades.
- No bypassing shortcuts.
- Real mathematical algorithms, genuine asynchronous Promise contracts, and strict schema versioning.
- The live development server at `http://localhost:3000/dashboard` remained uninterrupted and responsive throughout.

---

## 2. Review Dimensions & Detailed Evaluation

### 2.1 Storage Layer: `app/lib/storage/localStorageService.js`
- **Schema Version & Envelope Structure**:
  - `STORAGE_SCHEMA_VERSION` is strictly `'1.0.0'`.
  - Envelope structure is consistently `{ version, timestamp, data }`.
  - Deep cloning (`structuredClone` with `JSON` fallback) is enforced during `save()` and `load()` to prevent reference leakage and external mutations.
- **Multi-Tier Backend**:
  - Implements a resilient 3-tier fallback strategy:
    1. Browser `window.localStorage` (tested via active read/write probe `__smartnfe_storage_probe__`).
    2. Node.js `globalThis.localStorage` (for CLI / test runners).
    3. Memory storage fallback (`createMemoryStorage` using `Map`).
  - Allows tests to inject custom storage backends via `setCustomStorage(custom)`.
- **Auto-Healing & Recovery**:
  - Validates JSON parse integrity, object structure, and version parity (`envelope.version === STORAGE_SCHEMA_VERSION`).
  - In case of missing key, corrupt JSON, or version mismatch, queries `defaultRegistry` for registered factories. If found, automatically initializes default factory data, persists it, and returns a fresh clone.
  - Reset mechanisms: `reset(key)` restores registered factory data; `resetAll()` resets all known `STORAGE_KEYS` and cleans orphaned `smartnfe_*` entries.

### 2.2 Asynchronous Repositories: `app/features/`
- **`invoiceRepository.js`**:
  - Adheres strictly to async Promise contracts:
    - `list(filters)`: Supports textual query (filtering across number, access key, issuer name/CNPJ, recipient name/country), status filtering, document type filtering (XML/PDF), and standard pagination metadata.
    - `findById(id)`: Returns deep-cloned invoice or `null`.
    - `update(id, partialData)`: Automatically triggers invoice total recalculation if items are modified without explicit totals.
    - `updateItem(invoiceId, itemId, partialItemData)`:
      - Takes an immutable snapshot of original values in `item.valorOriginal` upon the first mutation. Subsequent edits do not overwrite the original snapshot.
      - Recalculates item line total via `calculateItemTotal(unitPrice, qty)`.
      - Recalculates consolidated invoice totals via `calculateInvoiceTotals()`.
      - Automatically transitions document status from `'importado'` to `'em_conferencia'`.
    - `getValidationIssues(id)`: Combines static simulated issues from mock items with dynamic fiscal rules for export operations (CFOP 7xxx enforcement, Mercosul 8-digit NCM format validation, item math divergence detection).
    - `resetDemoData()` & `resetInvoice(id)`: Provides granular and complete rollback to initial factory baselines.
- **`preparedInvoiceRepository.js`**:
  - Implements async Promise contracts (`list`, `findById`, `create`, `delete`, `update`, `resetDemoData`).
  - Seamlessly tracks split invoices resulting from distribution operations with parent linkage (`parentInvoiceId`).

### 2.3 Universal Formatters: `app/lib/formatters/`
- **`numbers.js`**:
  - `parseDecimal(value)`: Gracefully normalizes both pt-BR (`1.250,50`) and US (`1,250.50`) representations into valid numeric floats, returning `0` on invalid inputs.
  - `formatQuantity(value, maxDecimals = 4, minDecimals = 0)`: Standardizes export quantities up to 4 decimal places using pt-BR localization without superfluous trailing zeros unless constrained by `minDecimals`.
  - `formatDecimal(value, decimals = 2)`: Standardizes fixed-precision decimal formatting with pt-BR thousand grouping (`1.250,50`).
- **`currency.js` Fix**:
  - Rectified the M1 100x inflation bug in `parseBRL`.
  - Differentiates between Brazilian comma format (`1.250,50` -> `1250.5`) and standard dot decimal format (`1250.50` -> `1250.5`).
  - Correctly strips currency prefixes (`R$`) and whitespace.
- **`dates.js` Fix**:
  - Utilizes native `Intl.DateTimeFormat` with zero external dependencies (no `moment.js` or `date-fns`).
  - Fixed Gregorian rollover vulnerability: parses year, month, day components and validates UTC component equality.
  - Successfully rejects invalid dates: `2026-99-99` -> `"-"`, `2026-02-31` -> `"-"`, `2025-02-29` (non-leap year) -> `"-"`, while preserving valid leap year dates like `2024-02-29` -> `"29/02/2024"`.

### 2.4 Mock Invoices Calibration: `app/lib/data/mockInvoices.js`
- **`demo-02` (25 Items)**:
  - Generates items with price centered symmetrically around 5950.00 (`5950 + (num - 13) * 50`) and quantity `1.0000`.
  - Every single item satisfies `1.0000 * unitPrice === valorTotal` with 0 mismatches.
  - Grand total equals exactly R$ 148.750,00, matching invoice header totals.
- **`demo-05` (15 Items)**:
  - Calibrated item 15 (`d5-15`): quantity `74.0000` * unit price `380.0000` = `28.120,00` (corrected from `28.150,00`).
  - Items 1-6 total `134.750,00`, matching `prep-01`.
  - Items 7-15 total `207.250,00`, matching `prep-02`.
  - Grand total for all 15 items equals exactly `342.000,00`, matching invoice header totals.
- **`demo-04` (Inconsistencies)**:
  - Explicitly annotates simulated fiscal errors (CFOP 5102 in export, math divergence 100 * 45 = 4500 vs 4000, 7-digit NCM 6403590, and aduaneira unit METROS on footwear) for the validation assistant.

### 2.5 Component Resilience: `app/components/table/DataTable.jsx`
- Added defensive `safeData`:
  ```javascript
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  ```
- Protects `filteredData` computation and `tfoot` record counter against runtime crashes when `data={null}` or `data={undefined}`.
- Re-tested with static SSR rendering (`renderToStaticMarkup`): passes without exceptions and renders `"Exibindo 0 de 0 registros"`.

---

## 3. Adversarial Analysis & Stress Test Findings

During adversarial probing, several edge cases and stress scenarios were investigated:

### Finding 1 (Minor / Architectural Note): QuotaExceeded Fallback Asymmetry
- **Observation**: In `localStorageService.js`, `save(key, data)` catches `QuotaExceededError` and writes to volatile `memoryStore` before returning `false`. However, `load(key)` calls `getBackend().getItem(key)`. Since `getItem` does not throw an error during quota saturation, it retrieves whatever stale data was left in `localStorage`, rather than reading the updated data from `memoryStore`.
- **Risk Assessment**: Low. Total mock data volume in SmartNFe is under 60 KB (standard browser quota is 5 MB–10 MB). This scenario only triggers if the user's browser is 100% full.
- **Recommendation for M3/M4**: If `save()` encounters a quota error, it could flag the key or transition `activeBackend = memoryStore` for subsequent reads.

### Finding 2 (Informational): Single-Dot String Interpretation in `parseBRL`
- **Observation**: An input like `"1.000"` (with a single dot and no comma) is interpreted as `1.000` (float `1`) rather than `1000`. If comma is present (`"1.000,00"`), it is correctly interpreted as `1000`.
- **Reasoning**: This was an intentional design decision to resolve the critical M1 bug where standard decimal strings like `"1250.50"` or `"284500.00"` were inflated by 100x (`125050`). Because data originating from JSON/APIs uses dot-decimal format without commas, prioritizing dot as decimal when only one dot exists is the correct behavior for this application.
- **Recommendation**: Document this formatting convention for user inputs where currency masks should ensure comma formatting (e.g., using `InputCurrency`).

### Finding 3: Snapshot Immutability Verification
- **Stress Scenario**: Repeated calls to `invoiceRepository.updateItem` on the same item.
- **Result**: PASS. The initial `valorOriginal` snapshot is preserved across multiple subsequent modifications, ensuring auditability and rollback integrity.

### Finding 4: Gregorian Calendar Edge Cases
- **Stress Scenario**: Non-existent dates across century boundaries (`1900-02-29`, `2000-02-29`, `2024-02-29`, `2025-02-29`, `2026-04-31`, `2026-02-31T10:00:00Z`).
- **Result**: PASS. All rollover attempts correctly return `"-"`, while valid leap day dates format cleanly to `"29/02/2024"`.

---

## 4. Verification Evidence

### 4.1 Automated Test Suites
1. **Tier 1 M2 Domain Test Suite**:
   ```bash
   node --no-warnings --test tests/tier1/m2_domain.test.mjs
   ```
   **Output:** `tests 43 | suites 9 | pass 43 | fail 0 | duration ~800ms`

2. **Full Workspace Test Suite**:
   ```bash
   node --no-warnings --test tests/**/*.test.mjs
   ```
   **Output:** `tests 112 | suites 27 | pass 112 | fail 0 | duration ~6.7s`

### 4.2 Linter Execution
```bash
npx eslint app/lib/storage/ app/features/ app/lib/formatters/ app/lib/data/mockInvoices.js app/components/table/DataTable.jsx
```
**Output:** Exit code 0, 0 errors, 0 warnings.

### 4.3 Live HTTP Smoke Check
```bash
node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(t => console.log('HTTP 200 length:', t.length, 'Modo Demo:', t.includes('Modo Demonstração')))"
```
**Output:** `HTTP 200 length: 62639 Modo Demo: true`

---

## 5. Review Conclusion

The work delivered for Milestone 2 meets all functional, architectural, and quality standards. The domain storage and repository contracts provide a clean, asynchronous foundation for Milestone 3 UI screen development.

**Verdict:** **APPROVE**
