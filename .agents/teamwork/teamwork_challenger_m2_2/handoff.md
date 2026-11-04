# Handoff Report — Milestone 2: Adversarial Challenge of Storage, Repositories & Data Integrity

**Agent:** `teamwork_challenger_m2_2`  
**Milestone:** Milestone 2 (Core Domain Services & Calculations)  
**Parent / Caller:** `3aeeebdd-68a6-49e6-8f40-494114a9f1f7`  
**Date:** 2026-11-04  
**Verdict:** **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Verbatim Errors & Empirical Outputs

Running the adversarial test harness at `.agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs`:
Command:
```powershell
node --no-warnings --test .agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs
```

1. **Dynamic Validation Engine Failure on CFOP Correction (`demo-04`)**:
   ```
   ✖ 4.1: Corrigir CFOP 5102 para 7102 no item d4-3 de demo-04 remove dinamicamente o erro? (9.8739ms)
     AssertionError [ERR_ASSERTION]: A correção do CFOP para 7102 DEVERIA remover o erro de CFOP em demo-04
     + actual - expected
     + {
     +   campo: 'cfop',
     +   encontrado: '5102',
     +   esperado: '7101',
     +   id: 'issue-d4-3-cfop',
     +   itemDescricao: 'Bota Cano Curto Feminina Couro',
     +   itemId: 'd4-3',
     +   itemNumero: 3,
     +   mensagem: 'CFOP 5102 não permitido em operação para o exterior. CFOP deve iniciar com 7 (ex: 7101).',
     +   regra: 'CFOP de Exportação',
     +   sugestao: 'Corrigir para "7101"',
     +   tipo: 'erro'
     + }
     - undefined
   ```

2. **Concurrency Race Condition in `invoiceRepository.updateItem`**:
   ```
   [CHALLENGE LOG] 3.1 Concurrency item1 descricao: Café em Grão Cru Arábica Tipo 6
   [CHALLENGE LOG] 3.1 Concurrency item2 descricao: PRODUTO 2 CONCORRENTE
   [CHALLENGE LOG] 3.1 Concurrency race condition detected?: true
   ```

3. **QuotaExceeded Fallback Loss on Subsequent `load()`**:
   ```
   [CHALLENGE LOG] 2.2 loaded value under QuotaExceeded: null
   ```

4. **DataTable Crash on Sparse Array Elements**:
   ```
   Actual message: "Cannot read properties of null (reading 'id')"
   TypeError: Cannot read properties of null (reading 'id')
       at DataTable (app/components/table/DataTable.jsx:132)
   ```

### 1.2 Exact Code Locations
- `app/features/invoiceRepository.js` lines 277-298: `getValidationIssues` iterates unconditionally through `item.inconsistencias` without comparing current field values or checking `item.modificado`.
- `app/features/invoiceRepository.js` lines 199-263: `updateItem` has no mutex or promise serialization queue around the async `getAllInvoices()` / `saveAllInvoices()` cycle.
- `app/lib/storage/localStorageService.js` lines 126-130: `save()` catches QuotaExceededError and writes to `memoryStore`, but does not set `activeBackend = memoryStore`. Lines 143-159 in `load()` calls `backend.getItem()` which returns `null` without throwing, never checking `memoryStore`.
- `app/components/table/DataTable.jsx` lines 58-69 & 130-134: `filteredData` returns `safeData` when `filterText` is empty, failing to filter out `null` elements before `filteredData.map(row => ...)`.

---

## 2. Logic Chain

1. **Dynamic Fiscal Validation Breakdown**:
   - The user dispatch explicitly required: *"verify that fixing CFOP 5102 to 7102 in demo-04 dynamically removes the issue"*.
   - In `demo-04`, item `d4-3` is configured with `cfop: '5102'` and an embedded array `inconsistencias: [{ tipo: 'erro', campo: 'cfop', ... }]` (`app/lib/data/mockInvoices.js:201`).
   - When a user updates the item via `invoiceRepository.updateItem('demo-04', 'd4-3', { cfop: '7102' })`, `updateItem` preserves `currentItem.inconsistencias` in `updatedItem` (`invoiceRepository.js:233-240`).
   - Subsequent calls to `invoiceRepository.getValidationIssues('demo-04')` iterate over `item.inconsistencias` in Section 1 (lines 277-298) and push `issue-d4-3-cfop` without verifying if `item.cfop` was already corrected to `7102`.
   - Therefore, the issue is NOT removed dynamically. This directly violates the interface requirement and will break the user's ability to demonstrate fixing issues in Milestone 4.

2. **Concurrency Data Loss**:
   - `updateItem` performs asynchronous non-atomic operations: `getAllInvoices()`, mutates the retrieved in-memory array clone, and calls `saveAllInvoices()`.
   - When two items on the same invoice are updated concurrently (`Promise.all([updateItem('d1-1'), updateItem('d1-2')])`), both promises read the same initial array snapshot.
   - The second promise to resolve overwrites the entire stored array with its clone, which does not contain the modifications made by the first promise.
   - Therefore, concurrent updates cause silent data loss.

3. **QuotaExceeded Fallback Asymmetry**:
   - When primary storage is full, `save()` saves to `memoryStore` and returns `false`.
   - However, `getBackend()` still returns `window.localStorage` (or `customStorage`).
   - `load()` calls `backend.getItem(key)`. On full storage, `getItem` succeeds and returns `null` (item was never written).
   - Because `getItem` does not throw, the `catch` block in `load()` is never reached, and `memoryStore` is never queried.
   - Therefore, data saved under storage exhaustion cannot be loaded, defeating the purpose of the MemoryStorage fallback.

4. **Array Element Safety in `DataTable.jsx`**:
   - `DataTable.jsx` implemented `const safeData = useMemo(() => Array.isArray(data) ? data : [], [data])`.
   - When `data` is an array containing null items (e.g. `[null, item]`), `Array.isArray(data)` evaluates to `true`.
   - When `filterText` is empty, `filteredData` evaluates directly to `safeData`.
   - The render mapping `filteredData.map(row => row.id)` attempts to dereference property `id` on `null`, causing an unhandled crash.

---

## 3. Caveats

- Pure calculation arithmetic (`decimal.js`, `invoiceTotals.js`) was reviewed and stress-tested in parallel by peer challenger `teamwork_challenger_m2_1`.
- The live development server running on `http://localhost:3000/dashboard` was not disrupted; no forbidden build/dev commands were executed.
- The storage corruption auto-healing mechanism for invalid JSON strings and schema versions was tested and confirmed fully working.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 2 cannot be approved in its current state due to 1 Critical, 2 High, and 1 Medium defects:
1. **[CRITICAL] Dynamic validation fails**: Modifying `cfop` from 5102 to 7102 in `demo-04` does not remove the inconsistency from `getValidationIssues`.
2. **[HIGH] Concurrency race condition**: Parallel `updateItem` calls result in silent lost updates.
3. **[HIGH] Storage exhaustion fallback**: Data saved to `memoryStore` during quota exhaustion cannot be retrieved by `load()`.
4. **[MEDIUM] DataTable crash**: Passing an array containing `null` elements throws an unhandled `TypeError`.

The worker (`teamwork_worker_m2`) must remediate these 4 specific items before Milestone 2 can be marked complete.

---

## 5. Verification Method

To independently reproduce the failures:

1. **Run the Adversarial Test Suite**:
   ```powershell
   node --no-warnings --test .agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs
   ```
   *Expected Failure Point:* Test 4.1 (`CFOP 5102 to 7102`) fails with assertion error showing `issue-d4-3-cfop` still present.

2. **Verify Concurrency Race Condition**:
   Observe console output of Test 3.1:
   `[CHALLENGE LOG] 3.1 Concurrency race condition detected?: true`

3. **Verify QuotaExceeded Fallback Loss**:
   Observe console output of Test 2.2:
   `[CHALLENGE LOG] 2.2 loaded value under QuotaExceeded: null`

4. **Verify Live Server Status**:
   ```powershell
   node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(t => console.log('HTTP 200 length:', t.length, 'Modo Demo:', t.includes('Modo Demonstração')))"
   ```
   *Expected Output:* `HTTP 200 length: ~62638 Modo Demo: true`
