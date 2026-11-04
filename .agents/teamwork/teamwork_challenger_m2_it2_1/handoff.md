# Handoff Report — Milestone 2 Iteration 2 Gate Verification

**Agent**: `teamwork_challenger_m2_it2_1`  
**Archetype**: EMPIRICAL CHALLENGER (critic, specialist)  
**Parent / Caller**: `3aeeebdd-68a6-49e6-8f40-494114a9f1f7`  
**Date**: 2026-11-04  
**Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

### 1.1 Empirical Concurrency Verification (100% Passed)
An adversarial test suite was implemented in `tests/tier5/m2_challenger1_concurrency_validation.test.mjs` and executed via Node native runner:
```powershell
node --no-warnings --test tests/tier5/m2_challenger1_concurrency_validation.test.mjs
```

The concurrency stress tests verified:
1. **25 simultaneous `updateItem` mutations on `demo-02` (items `d2-1` to `d2-25`)**:
   - `[CHALLENGE 1.1] 25 parallel mutations finished in 67ms. Lost updates: 0`
   - Verified that all 25 items retained their updated descriptions, quantities, and recalculated `valorTotal` with 0 lost updates.
2. **20 rapid successive mutations to the SAME item (`d1-1` in `demo-01`)**:
   - `[CHALLENGE 1.2] Final d1-1 state after 20 concurrent updates: SEQUENTIAL CONCURRENT VERSION 20, qty: 20.0000`
   - Verified strict FIFO promise mutex execution ordering.
3. **50 simultaneous `updateItem` mutations across `demo-03`**:
   - `[CHALLENGE 1.3] 50 parallel mutations finished in 111ms. Lost count: 0`
4. **Mixed concurrent operations on `preparedInvoiceRepository` (10 creates, 2 updates, 1 delete)**:
   - `[CHALLENGE 2.1] Final prepared list count: 11, Operations logged: 13`
   - All 10 created items persisted, `prep-01` updated, `prep-02` deleted cleanly.
5. **Queue healing under interspersed rejections**:
   - `[CHALLENGE 3.1] Queue execution trace: ['P1_OK', 'P2_EXPECTED_ERR: Item "ghost-item-does-not-exist" não encontrado...', 'P3_OK', 'P4_EXPECTED_ERR: Documento fiscal não encontrado...', 'P5_OK']`
   - Neither `invoiceRepository` nor `preparedInvoiceRepository` stalled when invalid calls rejected. The `.catch(() => {})` recovery on the mutex queue functions as designed.

### 1.2 Dynamic Validation Engine Failures (Observed Verbatim Errors)
When stress-testing dynamic corrections on `demo-04`, three tests failed with verbatim AssertionErrors:

#### Failure 1: Test 4.3 — Item `situacao` permanently stuck in `'inconsistente'` after correcting an introduced error on a clean item
```
✖ 4.3: NCM cycle on originally clean item (d4-1) and situacao transition test (33.56ms)
  AssertionError [ERR_ASSERTION]: Item situacao must transition back to "conferido" when introduced errors are resolved
  + actual - expected
  
  + 'inconsistente'
  - 'conferido'
  
      at TestContext.<anonymous> (file:///C:/www/smart-nfe/tests/tier5/m2_challenger1_concurrency_validation.test.mjs:418:12)
```
- Empirical log:
  ```
  [CHALLENGE 4.3] d4-1 after 7-digit NCM: { situacao: 'inconsistente' }
  [CHALLENGE 4.3] d4-1 after fixing back to 8-digit NCM: { situacao: 'inconsistente', inconsistencias: undefined }
  ```
- Code inspection at `app/features/invoiceRepository.js` lines 284–318:
  ```javascript
  284: if (Array.isArray(updatedItem.inconsistencias)) {
  285:   updatedItem.inconsistencias = updatedItem.inconsistencias.filter((inc) => { ... });
  ...
  305:   if (updatedItem.inconsistencias.length === 0) {
  306:     updatedItem.situacao = 'conferido';
  307:   }
  308: }
  309: 
  310: // Se o usuário introduziu um erro fiscal em item previamente sem inconsistências
  311: const hasIntroducedError =
  312:   (isExport && cleanCfop && !cleanCfop.startsWith('7')) ||
  313:   (cleanNcm.length > 0 && cleanNcm.length !== 8) ||
  314:   hasMathDiff;
  315: if (hasIntroducedError) {
  316:   updatedItem.situacao = 'inconsistente';
  317: }
  ```
- Because `d4-1` (and all clean items across `demo-01` to `demo-05`) does NOT have an initial `inconsistencias` array (`inconsistencias: undefined`), line 284 evaluates to `false`. Once line 316 sets `updatedItem.situacao = 'inconsistente'`, no subsequent correction can ever transition `situacao` back to `'conferido'`.

#### Failure 2: Test 4.3b — Identical permanent trap for CFOP on clean items (`d4-2`)
```
✖ 4.3b: CFOP cycle on originally clean item (d4-2) and situacao transition test (11.6805ms)
  AssertionError [ERR_ASSERTION]: d4-2 situacao must transition back to "conferido" when CFOP error is resolved
  + actual - expected
  
  + 'inconsistente'
  - 'conferido'
  
      at TestContext.<anonymous> (file:///C:/www/smart-nfe/tests/tier5/m2_challenger1_concurrency_validation.test.mjs:454:12)
```

#### Failure 3: Test 4.3c — Asymmetry between `updateItem` and `getValidationIssues` on empty fields
```
✖ 4.3c: Empty NCM and empty CFOP must trigger inconsistente situacao in sync with getValidationIssues (4.8515ms)
  AssertionError [ERR_ASSERTION]: Item with empty NCM must have situacao "inconsistente"
  + actual - expected
  
  + 'conferido'
  - 'inconsistente'
  
      at TestContext.<anonymous> (file:///C:/www/smart-nfe/tests/tier5/m2_challenger1_concurrency_validation.test.mjs:471:12)
```
- Empirical log:
  ```
  d4-4 with empty NCM - situacao: conferido
  d4-4 with empty NCM - issue in getValidationIssues: NCM "" inválido. A Nomenclatura Comum do Mercosul deve conter exatamente 8 dígitos (encontrado: 0).
  ```
- In `app/features/invoiceRepository.js` line 313:
  `(cleanNcm.length > 0 && cleanNcm.length !== 8)` requires `length > 0`. An empty string NCM has `length === 0`, causing `hasIntroducedError` to evaluate to `false`. The item remains `'conferido'` despite failing fiscal validation in `getValidationIssues`.

---

## 2. Logic Chain

1. **Premise 1 (Item Status Lifecycle)**: The application specification requires item `situacao` to reflect item validity dynamically: `'conferido'` when all errors are resolved, and `'inconsistente'` when an error is present.
2. **Observation from 1.2**: In `app/features/invoiceRepository.js`, `updateItem` has two decoupled blocks:
   - Block 1 (lines 284–308) filters `updatedItem.inconsistencias` and sets `situacao = 'conferido'` if length is 0. This block ONLY runs if `Array.isArray(updatedItem.inconsistencias)` is true.
   - Block 2 (lines 311–317) sets `situacao = 'inconsistente'` if `hasIntroducedError` is true.
3. **Logical Inference**:
   - For an item that had no initial `inconsistencias` array (like `d4-1` or items from `demo-01`), introducing an invalid NCM (e.g. 7 digits) triggers Block 2 and sets `situacao = 'inconsistente'`.
   - When the user fixes the NCM back to 8 digits, `hasIntroducedError` becomes `false`.
   - However, Block 1 is skipped because `updatedItem.inconsistencias` is `undefined`.
   - There is no `else` or default branch to reset `situacao = 'conferido'` when `!hasIntroducedError` on an item without `inconsistencias`.
   - Therefore, the item remains stuck in `'inconsistente'` indefinitely.
4. **Logical Inference on Empty Fields**:
   - `getValidationIssues` flags `cleanNcm.length !== 8` (which includes empty string `0 !== 8`) and `!cleanCfop || !cleanCfop.startsWith('7')`.
   - `updateItem` lines 312–313 check `cleanCfop && !cleanCfop.startsWith('7')` and `cleanNcm.length > 0 && cleanNcm.length !== 8`.
   - When a field is cleared to `""`, `updateItem` does not flag `hasIntroducedError`, leaving the item as `'conferido'` while `getValidationIssues` flags a critical error.
5. **Conclusion**:
   - Concurrency serialization is robust and verified.
   - However, dynamic item state management in `invoiceRepository.js` has a logic flaw that causes items to remain stuck in `'inconsistente'` and miss empty field validation.

---

## 3. Caveats

- **Dev Server Isolation**: The external development server running on `http://localhost:3000/dashboard` remained online and untouched throughout testing (verified responding HTTP 200 length: 62643, `Modo Demonstração: true`).
- **Review-Only Constraint**: In strict adherence to challenger role guidelines, implementation files (`app/features/invoiceRepository.js`) were NOT modified by this agent.
- **Scope of Pass**: All concurrency tests (25 parallel, 50 parallel, 20 same-item, prepared invoice mutations, queue recovery) passed with 0 defects. The issue is strictly isolated to lines 270–320 of `app/features/invoiceRepository.js`.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

The concurrency implementation (`withMutationLock`) is **APPROVED**.
The dynamic validation engine in `invoiceRepository.js` requires **REMEDIATION** for the following defect:
- Resolving errors on clean items leaves `situacao` stuck in `'inconsistente'`.
- Empty CFOP and empty NCM are not flagged as inconsistent by `updateItem`.

### Actionable Remediation for the Worker
In `app/features/invoiceRepository.js`, lines 270–320:
Replace the divergent blocks with unified validation logic:
```javascript
      // Sincroniza inconsistências e situação do item modificado
      const isExport = Boolean(
        invoice.destinatario?.pais &&
        invoice.destinatario?.pais.toLowerCase() !== 'brasil' &&
        invoice.destinatario?.paisCodigo !== 'BR'
      );
      const cleanCfop = String(updatedItem.cfop || '').trim();
      const cleanNcm = String(updatedItem.ncm || '').replace(/\D/g, '');
      const expectedTotal = calculateItemTotal(updatedItem.valorUnitario, updatedItem.quantidade);
      const cleanRec = cleanDecimalString(updatedItem.valorTotal);
      const recordedTotal = cleanRec ? parseFloat(cleanRec).toFixed(2) : '0.00';
      const hasMathDiff = Math.abs(parseFloat(expectedTotal) - parseFloat(recordedTotal)) > 0.01;

      const hasCfopError = isExport
        ? (!cleanCfop || !cleanCfop.startsWith('7'))
        : cleanCfop.startsWith('7');
      const hasNcmError = cleanNcm.length !== 8;
      const hasFiscalError = hasCfopError || hasNcmError || hasMathDiff;

      if (Array.isArray(updatedItem.inconsistencias)) {
        updatedItem.inconsistencias = updatedItem.inconsistencias.filter((inc) => {
          if (inc.campo === 'cfop') return hasCfopError;
          if (inc.campo === 'ncm') return hasNcmError;
          if (inc.campo === 'valorTotal') return hasMathDiff;
          if (inc.campo === 'unidade') {
            const expectedUnit = (inc.esperado || 'PAR').trim().toUpperCase();
            return String(updatedItem.unidade || '').trim().toUpperCase() !== expectedUnit;
          }
          if (inc.esperado) {
            return String(updatedItem[inc.campo] || '').trim() !== String(inc.esperado).trim();
          }
          return true;
        });
      }

      const hasRemainingMockIssues =
        Array.isArray(updatedItem.inconsistencias) && updatedItem.inconsistencias.length > 0;

      if (hasFiscalError || hasRemainingMockIssues) {
        updatedItem.situacao = 'inconsistente';
      } else {
        updatedItem.situacao = 'conferido';
      }
```

---

## 5. Verification Method

1. **Execute Challenger 1 Adversarial Suite**:
   ```powershell
   node --no-warnings --test tests/tier5/m2_challenger1_concurrency_validation.test.mjs
   ```
   - Current: 10 passed, 3 failed (`4.3`, `4.3b`, `4.3c`).
   - Expected after remediation: 13 passed, 0 failed.

2. **Execute Full Project Test Suite**:
   ```powershell
   node --no-warnings --test tests/**/*.test.mjs
   ```

3. **Verify Dev Server Integrity**:
   ```powershell
   node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(t => console.log('HTTP 200 length:', t.length, 'Modo Demo:', t.includes('Modo Demonstração')))"
   ```
   - Expected: `HTTP 200 length: ~62643 Modo Demo: true`
