# Challenge Report — Milestone 2: Storage, Repositories & Data Integrity

**Agent:** `teamwork_challenger_m2_2`  
**Milestone:** Milestone 2 (Core Domain Services & Calculations)  
**Parent:** `3aeeebdd-68a6-49e6-8f40-494114a9f1f7`  
**Date:** 2026-11-04  
**Scope:** Storage (`localStorageService.js`), Repositories (`invoiceRepository.js`, `preparedInvoiceRepository.js`), Validation Engine, DataTable Component Resilience  

---

## Challenge Summary

**Overall risk assessment**: **CRITICAL**

While `localStorageService.js` exhibits solid envelope versioning (`1.0.0`) and robust auto-healing against invalid JSON, defasated schemas ("0.9.0"), and unversioned payloads, rigorous empirical stress-testing has exposed 4 distinct failure modes across repositories, storage fallback, and components:

1. **[CRITICAL] Dynamic Validation Failure**: Fixing fiscal inconsistencies (e.g. changing CFOP 5102 to 7102, or recalculating mismatched totals in `demo-04`) does NOT remove the reported issues in `invoiceRepository.getValidationIssues()`. The repository unconditionally dumps pre-annotated static items from `item.inconsistencias` regardless of current item state.
2. **[HIGH] Concurrency Race Condition**: Parallel calls to `updateItem()` on the same invoice (e.g. fast inline edits or concurrent background auto-saves) silently overwrite each other, causing complete data loss of earlier concurrent mutations.
3. **[HIGH] Broken Quota Exhaustion Fallback**: When `localStorage` throws `QuotaExceededError`, `save()` writes to `memoryStore` but fails to update `activeBackend`. Subsequent `load()` calls invoke `backend.getItem()` (which returns `null` without throwing), bypassing `memoryStore` entirely and losing all persisted data.
4. **[MEDIUM] DataTable Crash on Sparse/Null Arrays**: `DataTable.jsx` protects against `data={null}` and `data={undefined}`, but crashes with `TypeError: Cannot read properties of null (reading 'id')` if the `data` array contains any `null` or `undefined` entries.

---

## Challenges

### [Critical] Challenge 1: Static Pre-annotated Inconsistencies Ignore Real-Time Edits & Fixes

- **Assumption challenged**: The worker assumed that returning pre-annotated mock inconsistencies (`item.inconsistencias`) alongside dynamic rules fulfills the contract of a responsive validation engine for conference and assistance workflows.
- **Attack scenario**:
  1. User opens `demo-04` where item `d4-3` has `cfop: '5102'` and static inconsistency `issue-d4-3-cfop`.
  2. User fixes the error by calling `await invoiceRepository.updateItem('demo-04', 'd4-3', { cfop: '7102' })`.
  3. Client calls `await invoiceRepository.getValidationIssues('demo-04')`.
- **Observed Behavior**:
  `invoiceRepository.js` lines 277-298 loops unconditionally over `item.inconsistencias` without checking if `item.cfop` has changed.
  The returned issues list STILL contains:
  ```json
  {
    "id": "issue-d4-3-cfop",
    "itemId": "d4-3",
    "itemNumero": 3,
    "campo": "cfop",
    "mensagem": "CFOP 5102 não permitido em operação para o exterior. CFOP deve iniciar com 7 (ex: 7101).",
    "esperado": "7101",
    "encontrado": "5102"
  }
  ```
  Even though `item.cfop` is now `"7102"`. The exact same defect occurs for mathematical divergences (`d4-5`) and 7-digit NCMs (`d4-8`): once edited to valid values, the errors remain permanently.
- **Blast radius**: Breaks Milestone 4 screens (`/documentos/[id]/conferencia` and `/documentos/[id]/validacao`). The user will resolve fiscal issues in the UI, but the validation panel will continue to report them as broken errors.
- **Mitigation**:
  In `invoiceRepository.getValidationIssues`:
  1. Only emit an entry from `item.inconsistencias` if the current item value still matches the error condition (e.g. `item[inc.campo] === inc.encontrado` and `!item.modificado`).
  2. In `updateItem`, filter out or clear `item.inconsistencias` for any field present in `partialItemData`.
  3. Allow Section 2 (the dynamic rule engine) to govern CFOP, NCM, and line totals validation.

---

### [High] Challenge 2: Lost Updates via Concurrency Race Condition in `invoiceRepository.updateItem`

- **Assumption challenged**: That async read-modify-write on local state without synchronization is safe for repository callers.
- **Attack scenario**:
  Execute concurrent updates on two different items of the same invoice:
  ```javascript
  const p1 = invoiceRepository.updateItem('demo-01', 'd1-1', { descricao: 'MOD_1' });
  const p2 = invoiceRepository.updateItem('demo-01', 'd1-2', { descricao: 'MOD_2' });
  await Promise.all([p1, p2]);
  ```
- **Observed Behavior**:
  Both calls execute `const invoices = await getAllInvoices();` before either completes.
  `p1` updates item `d1-1` in its clone and writes to storage.
  `p2` updates item `d1-2` in its clone (which still has `d1-1` unmodified) and writes to storage, completely obliterating `p1`'s modifications.
  Empirical result: `finalInvoice.itens[0].descricao` remained `"Café em Grão Cru Arábica Tipo 6"` (MOD_1 was lost).
- **Blast radius**: Silent data loss in multi-field inline editing, fast keyboard tab navigation in the conference table, or concurrent background tasks.
- **Mitigation**:
  Serialize mutation operations in `invoiceRepository` using a promise queue / sequential lock:
  ```javascript
  let writeQueue = Promise.resolve();
  async function withLock(fn) {
    const next = writeQueue.then(fn);
    writeQueue = next.catch(() => {});
    return next;
  }
  ```

---

### [High] Challenge 3: QuotaExceeded Fallback Orphans Data on Subsequent `load()`

- **Assumption challenged**: That writing to `memoryStore` in `save()`'s `catch` block provides complete transparent fallback for storage exhaustion.
- **Attack scenario**:
  1. Primary storage throws `QuotaExceededError` on `setItem()`.
  2. `save('key', data)` catches the error, writes to `memoryStore.setItem('key', ...)`, and returns `false`.
  3. Client calls `load('key')`.
- **Observed Behavior**:
  In `load()`:
  ```javascript
  const backend = getBackend();
  let raw = null;
  try {
    raw = backend.getItem(key);
  } catch {
    raw = memoryStore.getItem(key);
  }
  ```
  `backend.getItem(key)` returns `null` (it does NOT throw, because reads succeed even when quota is full).
  Because it does not throw, the `catch` block never executes.
  `raw` remains `null`.
  `load()` then returns `fallback` (or re-initializes from factory mock), completely ignoring the value stored in `memoryStore`.
- **Blast radius**: In browsers with full quota or restricted localStorage, users will lose all recent edits and configurations upon refreshing or navigating screens.
- **Mitigation**:
  1. In `save()`, if `QuotaExceededError` is caught, permanently switch active backend: `activeBackend = memoryStore;`.
  2. In `load()`, if `raw === null` and `backend !== memoryStore`, check `memoryStore.getItem(key)` before returning fallback.

---

### [Medium] Challenge 4: `DataTable.jsx` Crashes on Arrays Containing Null / Undefined Elements

- **Assumption challenged**: That `safeData = useMemo(() => Array.isArray(data) ? data : [], [data])` is sufficient for table resilience.
- **Attack scenario**:
  Pass an array containing `null` or `undefined` items (e.g. from sparse pagination, pending async slots, or filtered lists):
  ```javascript
  <DataTable data={[null, undefined, { id: 'valid', nome: 'Item' }]} />
  ```
- **Observed Behavior**:
  In `DataTable.jsx` line 59:
  `if (!filterText.trim()) return safeData;`
  When `filterText` is empty, `safeData` is returned without filtering elements.
  At line 132: `filteredData.map((row) => <tr key={row.id}>` throws:
  `TypeError: Cannot read properties of null (reading 'id')`.
- **Blast radius**: Unhandled white-screen crashes if any upstream repository or API returns an array with holes or null elements.
- **Mitigation**:
  Filter invalid row elements during `safeData` derivation:
  ```javascript
  const safeData = useMemo(() => (Array.isArray(data) ? data.filter(Boolean) : []), [data]);
  ```

---

## Stress Test Results

| Test Scenario | Expected Behavior | Actual Behavior | Verdict |
|---|---|---|---|
| 1.1 LocalStorage JSON corruption | Detect corruption, auto-heal with 5 mocks, repair envelope | Auto-healed with 5 mocks, saved valid envelope | **PASS** |
| 1.2 LocalStorage schema `0.9.0` | Detect version mismatch, discard stale data, restore 1.0.0 | Discarded v0.9.0, restored 5 mocks under v1.0.0 | **PASS** |
| 1.3 LocalStorage missing version tag | Detect invalid envelope, restore mocks | Auto-healed, restored 5 mocks | **PASS** |
| 1.4 Primitive values (`42`, `true`, `null`) | Reject and restore mocks | Auto-healed cleanly | **PASS** |
| 2.1 Storage QuotaExceeded in `save()` | Catch error, return false without uncaught throw | Caught error, returned false without throwing | **PASS** |
| 2.2 Storage QuotaExceeded read in `load()` | Read data from `memoryStore` fallback | Returned `null`, orphaned `memoryStore` data | **FAIL** |
| 3.1 Concurrent `updateItem()` calls | Both item updates persist without race loss | Race condition: first update overwritten & lost | **FAIL** |
| 3.2 Update non-existent item | Reject with informative Error | Threw `Item "item-fantasma-999" não encontrado` | **PASS** |
| 3.3 Update item in non-existent invoice | Reject with informative Error | Threw `Documento fiscal não encontrado` | **PASS** |
| 3.4 Update non-existent invoice via `update()` | Reject with informative Error | Threw `Documento fiscal não encontrado` | **PASS** |
| 4.1 Fix CFOP 5102 to 7102 in `demo-04` | Dynamically remove CFOP error from `getValidationIssues` | Static error remains permanently attached | **FAIL** |
| 4.2 Introduce 7-digit NCM in `demo-04` | Dynamically create NCM validation error | Dynamically created NCM error with 8-digit rule | **PASS** |
| 4.3 Fix math divergence in `demo-04` | Dynamically remove math error from `getValidationIssues` | Static math error remains permanently attached | **FAIL** |
| 5.1 DataTable with `data={null}` | Render 0 rows and empty state without throwing | Rendered cleanly ("Exibindo 0 de 0 registros") | **PASS** |
| 5.2 DataTable with `data={undefined}` | Render 0 rows and empty state without throwing | Rendered cleanly ("Exibindo 0 de 0 registros") | **PASS** |
| 5.3 DataTable with `data={[]}` | Render 0 rows and empty state without throwing | Rendered cleanly ("Exibindo 0 de 0 registros") | **PASS** |
| 5.4 DataTable with sparse array `[null, item]` | Render valid items without crashing | Crashed with `Cannot read properties of null ('id')` | **FAIL** |
| 6.1 `preparedInvoiceRepository.findById(null)` | Return null without throwing | Returned `null` cleanly | **PASS** |
| 6.2 `preparedInvoiceRepository.delete('invalid')`| Return false without throwing | Returned `false` cleanly | **PASS** |
| 6.3 `preparedInvoiceRepository.create(null)` | Reject with descriptive error | Rejected with `Dados da nota preparada são obrigatórios` | **PASS** |
| 6.4 Query with whitespace (`"   "`) | Treat as empty query, return all records | Returned full record set | **PASS** |
| 7.1 `resetAll()` master factory reset | Purge residual `smartnfe_*` keys and restore official mocks | Residual purged, official mocks restored | **PASS** |

---

## Unchallenged Areas

- **Floating-point mathematical core (`decimal.js`, `invoiceTotals.js`)**: Assigned to and verified by peer challenger agent `teamwork_challenger_m2_1`.
- **UI page routes for subsequent milestones (`/documentos`, `/conferencia`, `/divisao`)**: Out of scope for Milestone 2.
