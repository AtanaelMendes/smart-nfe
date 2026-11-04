## 2026-11-04T16:12:47Z
You are the Implementation Worker for Milestone 2 Iteration 2 (Remediation of Challenger 2 Defects).
Your working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2_it2\

Read the authoritative files:
1. ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
2. PROJECT.md: c:\www\smart-nfe\PROJECT.md
3. Explorer 1 Handoff: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_it2_1\handoff.md
4. Explorer 2 Handoff: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_it2_2\handoff.md
5. Explorer 3 Handoff: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_it2_3\handoff.md
6. Challenger 2 Test Harness: c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m2_2\adversarial_m2_storage_repo.mjs

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL USER CONSTRAINT:
The project is already running at http://localhost:3000/dashboard (dev server run externally by user). DO NOT run build commands (e.g. `pnpm build`, `npm run build`) and DO NOT start dev servers (`pnpm dev`, `npm run dev`), to avoid port conflicts or environment freezes. Perform only tests and verifications (e.g. unit/node test scripts, lint) that do not conflict with or bring down the active dev server.

WRITE OWNERSHIP:
You have exclusive write ownership of:
- `c:\www\smart-nfe\app\features\invoiceRepository.js`
- `c:\www\smart-nfe\app\features\preparedInvoiceRepository.js`
- `c:\www\smart-nfe\app\lib\storage\localStorageService.js`
- `c:\www\smart-nfe\app\components\table\DataTable.jsx`
- `c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m2_2\adversarial_m2_storage_repo.mjs` (test 5.4 update)
- `c:\www\smart-nfe\tests\tier1\m2_domain.test.mjs` (append sparse array test to suite 9)

IMPLEMENTATION TASKS (Synthesized from Explorers 1, 2, and 3):

1. **Defect 1: Dynamic Validation Engine in `app/features/invoiceRepository.js`**
   - Import `cleanDecimalString` from `../lib/calculations/decimal.js`.
   - In `updateItem()`: Synchronize item state. When fields change, filter out resolved inconsistencies from `updatedItem.inconsistencias` (e.g. when `cfop` is changed to 7xxx for export, or NCM to 8 digits, or unit price/qty eliminates math divergence). Set `updatedItem.situacao = 'conferido'` if clean, or `'inconsistente'` if an error is introduced.
   - In `getValidationIssues(id)`: Replace static loop with unified dynamic validation. Evaluate current item fields (`item.cfop`, `item.ncm`, `item.valorTotal`, `item.unidade`) against fiscal rules. Use `item.inconsistencias` only as metadata enrichment to preserve human-friendly messages and suggestions. If an issue is resolved, do NOT emit it. If an issue is present, emit it.

2. **Defect 2: Repository Concurrency / Lost Updates in `app/features/invoiceRepository.js` and `app/features/preparedInvoiceRepository.js`**
   - Implement the Promise-chaining mutex queue:
     ```javascript
     let mutationQueue = Promise.resolve();
     function withMutationLock(fn) {
       const resultPromise = mutationQueue.then(
         () => fn(),
         () => fn()
       );
       mutationQueue = resultPromise.catch(() => {});
       return resultPromise;
     }
     ```
   - In `invoiceRepository.js`: Wrap mutating public methods (`update`, `updateItem`, `create`, `resetDemoData`, `resetInvoice`) in `withMutationLock`. (DO NOT wrap internal helpers like `getAllInvoices`, `findById`, or `saveAllInvoices` to avoid deadlocks).
   - In `preparedInvoiceRepository.js`: Similarly wrap mutating public methods (`create`, `delete`, `update`, `resetDemoData`) with its own `withMutationLock`.

3. **Defect 3: Storage Exhaustion Fallback Asymmetry in `app/lib/storage/localStorageService.js`**
   - In `save(key, data)`: On primary backend success, purge any stale fallback copy via `memoryStore.removeItem(key)`. On write failure (catch block), write to `memoryStore.setItem(key, JSON.stringify(envelope))` and set `quotaExceeded = true`.
   - In `load(key, fallback)`: Check if `backend !== memoryStore`. If `memoryStore.getItem(key)` is non-null, use it as the authoritative payload. Otherwise query `backend.getItem(key)`.
   - In `has(key)` and `getInfo(key)`: Synchronize with `memoryStore` if `backend !== memoryStore`.
   - Export `isQuotaExceeded()`.

4. **Defect 4: DataTable Null/Sparse Array Safety in `app/components/table/DataTable.jsx`**
   - Replace `const safeData = useMemo(...)` with:
     `const safeData = useMemo(() => (Array.isArray(data) ? data.filter((item) => item != null && typeof item === 'object' && !Array.isArray(item)) : []), [data]);`
   - Also safeguard `columns` and `header` against nullish elements. Ensure `tbody` maps over `effectiveColumns` safely.

5. **Test Updates & Full Verification**:
   - In `.agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs`: Update test 5.4 from `assert.throws` to `assert.doesNotThrow` and verify clean rendering of non-null items.
   - Run verification commands:
     - `node --no-warnings --test .agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs` (must pass 100%)
     - `node --no-warnings --test tests/tier1/m2_domain.test.mjs` (must pass 100%)
     - `node --no-warnings --test tests/tier5/m2_decimal_adversarial_stress.test.mjs` (must pass 100%)
     - `node --no-warnings --test tests/**/*.test.mjs` (must pass 100%)
     - `npx eslint app/features/ app/lib/storage/ app/components/table/DataTable.jsx` (0 errors)
     - Smoke test dev server: `node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(t => console.log('HTTP 200 length:', t.length, 'Modo Demo:', t.includes('Modo Demonstração')))"`
