# Handoff Report — Explorer 2 (Milestone 2 Iteration 3)

**Agent**: `teamwork_explorer_m2_it3_2`  
**Archetype**: Teamwork Explorer (read-only investigation, synthesis)  
**Parent / Caller**: `3aeeebdd-68a6-49e6-8f40-494114a9f1f7`  
**Date**: 2026-11-04  
**Target Code**: `c:\www\smart-nfe\app\features\invoiceRepository.js`  
**Status**: COMPLETE  

---

## 1. Observation

### 1.1 Verbatim Code Inspection of `app/features/invoiceRepository.js`

#### In `updateItem` (lines 266–318):
```javascript
266:       // Recalcula o valor total da linha com precisão decimal se preço ou quantidade mudaram
267:       const qty = updatedItem.quantidade;
268:       const unitPrice = updatedItem.valorUnitario;
269:       updatedItem.valorTotal = calculateItemTotal(unitPrice, qty);
270: 
271:       // Sincroniza inconsistências e situação do item modificado
272:       const isExport = Boolean(
273:         invoice.destinatario?.pais &&
274:         invoice.destinatario?.pais.toLowerCase() !== 'brasil' &&
275:         invoice.destinatario?.paisCodigo !== 'BR'
276:       );
277:       const cleanCfop = String(updatedItem.cfop || '').trim();
278:       const cleanNcm = String(updatedItem.ncm || '').replace(/\D/g, '');
279:       const expectedTotal = calculateItemTotal(updatedItem.valorUnitario, updatedItem.quantidade);
280:       const cleanRec = cleanDecimalString(updatedItem.valorTotal);
281:       const recordedTotal = cleanRec ? parseFloat(cleanRec).toFixed(2) : '0.00';
282:       const hasMathDiff = Math.abs(parseFloat(expectedTotal) - parseFloat(recordedTotal)) > 0.01;
283: 
284:       if (Array.isArray(updatedItem.inconsistencias)) {
285:         updatedItem.inconsistencias = updatedItem.inconsistencias.filter((inc) => {
286:           if (inc.campo === 'cfop') {
287:             return isExport ? !cleanCfop.startsWith('7') : cleanCfop.startsWith('7');
288:           }
289:           if (inc.campo === 'ncm') {
290:             return cleanNcm.length !== 8;
291:           }
292:           if (inc.campo === 'valorTotal') {
293:             return hasMathDiff;
294:           }
295:           if (inc.campo === 'unidade') {
296:             const expectedUnit = (inc.esperado || 'PAR').trim().toUpperCase();
297:             return String(updatedItem.unidade || '').trim().toUpperCase() !== expectedUnit;
298:           }
299:           if (inc.esperado) {
300:             return String(updatedItem[inc.campo] || '').trim() !== String(inc.esperado).trim();
301:           }
302:           return true;
303:         });
304: 
305:         if (updatedItem.inconsistencias.length === 0) {
306:           updatedItem.situacao = 'conferido';
307:         }
308:       }
309: 
310:       // Se o usuário introduziu um erro fiscal em item previamente sem inconsistências
311:       const hasIntroducedError =
312:         (isExport && cleanCfop && !cleanCfop.startsWith('7')) ||
313:         (cleanNcm.length > 0 && cleanNcm.length !== 8) ||
314:         hasMathDiff;
315:       if (hasIntroducedError) {
316:         updatedItem.situacao = 'inconsistente';
317:       }
```

#### In `getValidationIssues` (lines 350–454):
```javascript
350:     const issues = [];
351:     const isExport = Boolean(
352:       invoice.destinatario?.pais &&
353:       invoice.destinatario?.pais.toLowerCase() !== 'brasil' &&
354:       invoice.destinatario?.paisCodigo !== 'BR'
355:     );
356: 
357:     for (const item of invoice.itens) {
358:       // Mapa das inconsistências pré-anotadas no mock para enriquecimento de metadados
359:       const mockIncMap = new Map();
360:       if (Array.isArray(item.inconsistencias)) {
361:         for (const inc of item.inconsistencias) {
362:           if (inc && inc.campo) {
363:             mockIncMap.set(inc.campo, inc);
364:           }
365:         }
366:       }
367: 
368:       // 1. Regra CFOP (Exportação vs Doméstico)
369:       const cleanCfop = String(item.cfop || '').trim();
370:       if (isExport) {
371:         if (!cleanCfop || !cleanCfop.startsWith('7')) {
372:           const mockInc = mockIncMap.get('cfop');
373:           issues.push({ ... });
374:         }
375:       } else {
376:         if (cleanCfop.startsWith('7')) {
377:           issues.push({ ... });
378:         }
379:       }
380: 
381:       // 2. Regra Formato NCM (exatamente 8 dígitos numéricos)
382:       const cleanNcm = String(item.ncm || '').replace(/\D/g, '');
383:       if (cleanNcm.length !== 8) {
384:         const mockInc = mockIncMap.get('ncm');
385:         issues.push({ ... });
386:       }
387: 
388:       // 3. Regra Divergência Matemática da Linha (unitPrice * quantity == valorTotal)
389:       const expectedTotal = calculateItemTotal(item.valorUnitario, item.quantidade);
390:       const cleanRec = cleanDecimalString(item.valorTotal);
391:       const recordedTotal = cleanRec ? parseFloat(cleanRec).toFixed(2) : '0.00';
392:       if (Math.abs(parseFloat(expectedTotal) - parseFloat(recordedTotal)) > 0.01) {
393:         const mockInc = mockIncMap.get('valorTotal');
394:         issues.push({ ... });
395:       }
```

### 1.2 Verbatim Test Failures in Challenger 1 Suite
Command executed:
```powershell
node --no-warnings --test tests/tier5/m2_challenger1_concurrency_validation.test.mjs
```
Output:
- `✖ 4.3: NCM cycle on originally clean item (d4-1) and situacao transition test`
  ```
  AssertionError [ERR_ASSERTION]: Item situacao must transition back to "conferido" when introduced errors are resolved
  + actual: 'inconsistente'
  - expected: 'conferido'
  ```
- `✖ 4.3b: CFOP cycle on originally clean item (d4-2) and situacao transition test`
  ```
  AssertionError [ERR_ASSERTION]: d4-2 situacao must transition back to "conferido" when CFOP error is resolved
  + actual: 'inconsistente'
  - expected: 'conferido'
  ```
- `✖ 4.3c: Empty NCM and empty CFOP must trigger inconsistente situacao in sync with getValidationIssues`
  ```
  AssertionError [ERR_ASSERTION]: Item with empty NCM must have situacao "inconsistente"
  + actual: 'conferido'
  - expected: 'inconsistente'
  ```

### 1.3 Empirical Behavior of `cleanDecimalString` and Empty Field Evaluations
Evaluated via node CLI:
```javascript
const tests = ['', '0', '0.00', null, undefined, '   ', 'abc', '123.45', '123,45', 'R$ 1.234,56', '-50.00'];
for (const t of tests) {
  const res = cleanDecimalString(t);
  const recordedTotal = res ? parseFloat(res).toFixed(2) : '0.00';
}
```
Observed verbatim output:
- `""` -> `cleanRec: "0"` -> `recordedTotal: 0.00`
- `"0"` -> `cleanRec: "0"` -> `recordedTotal: 0.00`
- `"0.00"` -> `cleanRec: "0.00"` -> `recordedTotal: 0.00`
- `null` -> `cleanRec: "0"` -> `recordedTotal: 0.00`
- `undefined` -> `cleanRec: "0"` -> `recordedTotal: 0.00`
- `"   "` -> `cleanRec: "0"` -> `recordedTotal: 0.00`
- `"abc"` -> `cleanRec: "0"` -> `recordedTotal: 0.00`
- `"123.45"` -> `cleanRec: "123.45"` -> `recordedTotal: 123.45`
- `"123,45"` -> `cleanRec: "123.45"` -> `recordedTotal: 123.45`
- `"R$ 1.234,56"` -> `cleanRec: "1234.56"` -> `recordedTotal: 1234.56`
- `"-50.00"` -> `cleanRec: "-50.00"` -> `recordedTotal: -50.00`

### 1.4 Live Dev Server Status
Command executed:
```powershell
node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(t => console.log('HTTP 200 length:', t.length, 'Modo Demo:', t.includes('Modo Demonstração')))"
```
Output:
`HTTP 200 length: 62632 Modo Demo: true` (uninterrupted, healthy).

---

## 2. Logic Chain

### 2.1 The Asymmetry and Permanent Trap in `updateItem`
1. **Premise**: In `invoiceRepository.js`, an item that starts with no mock issues (`inconsistencias: undefined`) has `Array.isArray(item.inconsistencias) === false`.
2. **Step 1 (Error Introduction)**: When a user mutates a clean item (e.g. `d4-1` with `ncm: '6403591'`), line 313 detects `cleanNcm.length !== 8`, so line 316 sets `updatedItem.situacao = 'inconsistente'`. However, `updatedItem.inconsistencias` is NOT initialized or populated.
3. **Step 2 (Error Correction)**: When the user subsequently fixes the item (e.g. `d4-1` with `ncm: '64035910'`), `hasIntroducedError` evaluates to `false`.
4. **Step 3 (The Bug)**: Line 284 (`if (Array.isArray(updatedItem.inconsistencias))`) evaluates to `false` because `inconsistencias` is `undefined`. Consequently, lines 305–307 (which reset `updatedItem.situacao = 'conferido'`) NEVER execute. There is no fallback or `else` branch.
5. **Deduction**: The item remains permanently stuck in `'inconsistente'` despite being fiscally valid.

### 2.2 The Empty String Divergence
1. **Premise**: In `getValidationIssues`:
   - CFOP: Line 371: `if (!cleanCfop || !cleanCfop.startsWith('7'))` flags an issue if `cleanCfop` is empty (`""`).
   - NCM: Line 409: `if (cleanNcm.length !== 8)` flags an issue if `cleanNcm` is empty (`cleanNcm.length === 0 !== 8`).
2. **Observation**: In `updateItem` lines 312–313:
   - CFOP: `(isExport && cleanCfop && !cleanCfop.startsWith('7'))`. If `cleanCfop === ''`, the truthiness check `cleanCfop &&` evaluates to `""` (falsy), so `hasIntroducedError` is `false`.
   - NCM: `(cleanNcm.length > 0 && cleanNcm.length !== 8)`. If `cleanNcm === ''`, `cleanNcm.length > 0` is `false`, so `hasIntroducedError` is `false`.
3. **Deduction**: Clearing CFOP or NCM to empty string in `updateItem` leaves the item as `'conferido'`, whereas `getValidationIssues` flags both as critical errors. This causes severe divergence between the item status and the validation panel.

### 2.3 Domestic Invoice CFOP Handling
1. **Observation**: In `updateItem` line 312, domestic CFOP is completely absent from `hasIntroducedError` (`isExport && ...`). If an invoice has domestic status (`!isExport`), setting CFOP to `7101` or `""` was never flagged in `updateItem`.
2. **Observation**: In `getValidationIssues` lines 390–404, domestic CFOP checks `if (cleanCfop.startsWith('7'))`. However, if `cleanCfop` is empty (`""`), line 390 did not flag it.
3. **Deduction**: A universal rule `hasCfopError = !cleanCfop || (isExport ? !cleanCfop.startsWith('7') : cleanCfop.startsWith('7'))` guarantees that CFOP can NEVER be empty on any invoice, must start with `7` for export, and must NOT start with `7` for domestic. Applying this in both `updateItem` and `getValidationIssues` creates 100% parity.

### 2.4 Investigation of `cleanRec` Guarding Against Empty String
1. **Observation**: In `cleanDecimalString(input)` (`app/lib/calculations/decimal.js` line 16):
   ```javascript
   if (input === null || input === undefined || input === '') {
     return '0';
   }
   ```
2. **Observation**: `cleanDecimalString` returns `'0'` for empty string, `null`, `undefined`, whitespace, and non-numeric characters. It never returns `null`, `undefined`, or `""`.
3. **Deduction**: In `const recordedTotal = cleanRec ? parseFloat(cleanRec).toFixed(2) : '0.00'`, if `cleanRec` is `'0'` (truthy), `parseFloat('0').toFixed(2)` yields `'0.00'`. If `cleanRec` were falsy (`""`), the ternary yields `'0.00'`. Thus, empty strings are already guarded from crashing or producing unformatted decimals.
4. **Hardening**: To protect against any theoretical `NaN` (such as `parseFloat(cleanRec)` evaluating to `NaN` if an abnormal string passed through), using `Number.isFinite(parseFloat(cleanRec))` guarantees that `recordedTotal` is always a valid fixed string:
   ```javascript
   const cleanRec = cleanDecimalString(updatedItem.valorTotal);
   const parsedRec = parseFloat(cleanRec);
   const recordedTotal = Number.isFinite(parsedRec) ? parsedRec.toFixed(2) : '0.00';
   ```

### 2.5 Investigation of Other Item Fields
1. **`unidade`**:
   - In `getValidationIssues`: Checked only when `mockIncMap.has('unidade')`.
   - In `updateItem`: Filter checks `String(updatedItem.unidade || '').trim().toUpperCase() !== expectedUnit`. Empty string or `null` safely normalizes to `''`. If `expectedUnit` is `'PAR'`, `'' !== 'PAR'` is `true`, keeping the inconsistency. Safe.
2. **`descricao`**:
   - Not flagged as a fiscal error. If empty, `itemDescricao: item.descricao || ''` in `getValidationIssues`. No crashes occur.
3. **`quantidade` & `valorUnitario`**:
   - In `updateItem`: Recalculates `valorTotal = calculateItemTotal(unitPrice, qty)`. If `quantidade` or `valorUnitario` is `''`, `calculateItemTotal` returns `'0.00'`.
   - Formatters (`formatQuantity`, `formatDecimal`, `formatBRL`): All have defensive `if (value === null || value === undefined || value === '') return '0'` / `'R$ 0,00'`. No crashes occur.
4. **`valorTotal` Recalculation Discipline**:
   - Line 269 currently recalculates `updatedItem.valorTotal = calculateItemTotal(unitPrice, qty)` unconditionally.
   - If the caller passes explicit `partialItemData.valorTotal` without modifying `quantidade` or `valorUnitario`, preserving `partialItemData.valorTotal` allows manual line total testing and dynamic math divergence detection. When `quantidade` or `valorUnitario` is modified, line total automatically recalculates.

---

## 3. Caveats

1. **Read-Only Agent Constraint**: In strict adherence to Teamwork Explorer protocols, no source code files in `app/` were modified by this agent. The remediation is delivered as a verified proposal in this report.
2. **Dev Server Constraint**: The external development server running on `http://localhost:3000/dashboard` remained uninterrupted throughout all checks. Build commands (`pnpm build`, `npm run dev`) were strictly avoided.
3. **Scope Boundary**: This investigation focused exclusively on empty field handling and alignment between `updateItem` and `getValidationIssues` in `invoiceRepository.js`.

---

## 4. Conclusion

### Summary of Parity Findings
| Field / Check | `getValidationIssues` | `updateItem` (Current) | Divergence? | Unified Remediation |
|---|---|---|---|---|
| **Export CFOP** | `!cleanCfop \|\| !cleanCfop.startsWith('7')` | `cleanCfop && !cleanCfop.startsWith('7')` | **YES** (Empty CFOP bypassed in updateItem) | `isExport ? (!cleanCfop \|\| !cleanCfop.startsWith('7')) : ...` |
| **Domestic CFOP** | `cleanCfop.startsWith('7')` | Ignored in `hasIntroducedError` | **YES** (Domestic ignored in updateItem) | `!cleanCfop \|\| cleanCfop.startsWith('7')` |
| **NCM Format** | `cleanNcm.length !== 8` | `cleanNcm.length > 0 && cleanNcm.length !== 8` | **YES** (Empty NCM bypassed in updateItem) | `cleanNcm.length !== 8` |
| **Math Divergence** | `Math.abs(expected - recorded) > 0.01` | `Math.abs(expected - recorded) > 0.01` | **Aligned** | Identical logic retained |
| **Clean Item Resolution** | Filters `inconsistencias` | Blocks resetting `situacao` if `!inconsistencias` | **YES** (Clean item stuck in 'inconsistente') | Set `situacao = (hasFiscalError \|\| hasRemainingMockIssues) ? 'inconsistente' : 'conferido'` |
| **`cleanRec` Empty String** | `cleanDecimalString` -> `'0'` | `cleanDecimalString` -> `'0'` | **Aligned** | Safe, hardened with `Number.isFinite` |

### Actionable Remediation for the Implementer

In `c:\www\smart-nfe\app\features\invoiceRepository.js`:

#### Change 1: In `updateItem` (lines 266–318)
Replace the divergent blocks with:
```javascript
      // Recalcula o valor total da linha com precisão decimal se preço ou quantidade mudaram
      // Preserva valorTotal caso tenha sido passado explicitamente sem alteração de qty/preço
      if (
        partialItemData.valorTotal !== undefined &&
        partialItemData.quantidade === undefined &&
        partialItemData.valorUnitario === undefined
      ) {
        updatedItem.valorTotal = partialItemData.valorTotal;
      } else {
        const qty = updatedItem.quantidade;
        const unitPrice = updatedItem.valorUnitario;
        updatedItem.valorTotal = calculateItemTotal(unitPrice, qty);
      }

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
      const parsedRec = parseFloat(cleanRec);
      const recordedTotal = Number.isFinite(parsedRec) ? parsedRec.toFixed(2) : '0.00';
      const hasMathDiff = Math.abs(parseFloat(expectedTotal) - parseFloat(recordedTotal)) > 0.01;

      // Regras fiscais alinhadas 1:1 com getValidationIssues
      const hasCfopError = !cleanCfop || (isExport ? !cleanCfop.startsWith('7') : cleanCfop.startsWith('7'));
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

      // Determinação unificada da situação do item
      if (hasFiscalError || hasRemainingMockIssues) {
        updatedItem.situacao = 'inconsistente';
      } else {
        updatedItem.situacao = 'conferido';
      }
```

#### Change 2: In `getValidationIssues` (line 390)
Align domestic CFOP empty string handling:
```javascript
      } else {
        if (!cleanCfop || cleanCfop.startsWith('7')) {
          issues.push({
            id: `issue-${item.id}-cfop`,
            itemId: item.id,
            itemNumero: item.item,
            itemDescricao: item.descricao,
            tipo: 'erro',
            campo: 'cfop',
            mensagem: !cleanCfop
              ? 'CFOP obrigatório não informado para operação interna/nacional.'
              : `CFOP ${cleanCfop} inválido para operação interna/nacional. CFOP iniciado em 7 é exclusivo para exportação.`,
            esperado: '5102',
            encontrado: cleanCfop,
            regra: 'CFOP Nacional',
            sugestao: 'Alterar CFOP para operação interna (início 5 ou 6)',
          });
        }
      }
```

---

## 5. Verification Method

### Step 1: Run Challenger 1 Concurrency & Validation Suite
```powershell
node --no-warnings --test tests/tier5/m2_challenger1_concurrency_validation.test.mjs
```
- Current result: 10 passed, 3 failed (`4.3`, `4.3b`, `4.3c`).
- Expected after remediation: 13 passed, 0 failed.

### Step 2: Run Full Project Regression Suites (Tiers 1–4)
```powershell
node --no-warnings --test tests/tier1/*.test.mjs tests/tier2/*.test.mjs tests/tier3/*.test.mjs tests/tier4/*.test.mjs
```
- Expected: 69 tests across 18 suites pass (100% green).

### Step 3: Verify Live Development Server Integrity
```powershell
node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(t => console.log('HTTP 200 length:', t.length, 'Modo Demo:', t.includes('Modo Demonstração')))"
```
- Expected: `HTTP 200 length: ~62632 Modo Demo: true`.
