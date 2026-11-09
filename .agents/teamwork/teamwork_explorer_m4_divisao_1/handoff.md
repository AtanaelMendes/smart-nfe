# Handoff Report — Milestone 4: M4_Invoice_Splitting_Balance_Conservation

**Agent**: `teamwork_explorer_m4_divisao_1`  
**Working Directory**: `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_1\`  
**Target Milestone**: Milestone 4 (`M4_Invoice_Splitting_Balance_Conservation`)  
**Scope**: Features 16 & 18 (Splitting Pure Decimal Engine & Strict Validation Traps), plus Feature 17 (Remaining Balance Allocation) & Feature 19 (Ancillary Expense Apportionment)  
**Date**: 2026-11-09T21:16:00Z  

---

## 1. Observation

### Obs 1: Binary Floating-Point Leakage in `app/documentos/[id]/divisao/page.jsx`
Direct examination of `app/documentos/[id]/divisao/page.jsx` revealed native IEEE 754 floating-point operations in `handleDistributeEqually` (lines 288–303):
```javascript
288:    invoice.itens.forEach((it) => {
289:      const origQty = parseFloat(cleanDecimalString(it.quantidade)) || 0;
290:      const piece = Math.floor((origQty / numNotes) * 10000) / 10000;
291:      let allocatedSoFar = 0;
292:
293:      updatedNotes.forEach((note, idx) => {
294:        if (idx === numNotes - 1) {
295:          // Última nota fica com a diferença exata para somar 100%
296:          const lastPiece = Math.round((origQty - allocatedSoFar) * 10000) / 10000;
297:          note.itens[it.id] = lastPiece > 0 ? String(lastPiece) : '0';
298:        } else {
299:          note.itens[it.id] = String(piece);
300:          allocatedSoFar += piece;
301:        }
302:      });
303:    });
```
- **Violations observed**:
  - `parseFloat(cleanDecimalString(it.quantidade))` converts high-precision decimal strings to binary floats.
  - `(origQty / numNotes) * 10000` performs binary floating division and multiplication.
  - `Math.floor(...) / 10000` truncates with binary float division.
  - `allocatedSoFar += piece` accumulates floating-point values, susceptible to classic IEEE 754 rounding artifacts (e.g. `0.1 + 0.2 = 0.30000000000000004`).
  - `Math.round((origQty - allocatedSoFar) * 10000) / 10000` performs binary subtraction and rounding.
  - For non-terminating decimal expansions (e.g. `333.3333 / 3` or `100.0000 / 3`), this logic produces precision drift or loss of trailing 4th-decimal digits.

### Obs 2: Critical Validation Hole in `divisionMath.js` (`canSave: true` with Remaining Unallocated Balances)
Direct inspection of `app/lib/calculations/divisionMath.js` lines 237–240 showed:
```javascript
237:  // canSave: Requer ao menos uma nota de destino e NENHUM item com alocação em excesso
238:  const canSave = notes.length > 0 && !hasExcess;
239:  const isValid = !hasExcess;
```
- **Bug observed**: `canSave` is calculated as `notes.length > 0 && !hasExcess`.
- Even if `hasRemaining === true` (e.g. only 200 out of 500 units allocated across destination notes), `canSave` evaluates to `true` and `isValid` evaluates to `true`!
- This directly violates Requirement R4 in `ORIGINAL_REQUEST.md` ("bloquear a finalização de divisões com inconsistências ou saldos pendentes") and Feature 18 in `PROJECT.md` ("update `divisionMath.js` to set `canSave: false` when remaining balance exists").

### Obs 3: Lack of Negative Allocation Guards in `divisionMath.js`
In `app/lib/calculations/divisionMath.js` (lines 53–88):
```javascript
64:  let totalAllocated = '0.' + '0'.repeat(maxScale);
65:  for (const item of arr) {
66:    const q = extractQuantity(item);
67:    totalAllocated = decimalAdd(totalAllocated, q, maxScale);
68:  }
69:
70:  const balanceStr = decimalSubtract(origStr, totalAllocated, maxScale);
```
- If an allocation is negative (e.g. `"-5.0000"`), `decimalAdd('0.0000', '-5.0000', 4)` results in `"-5.0000"`.
- If another note has `"+15.0000"` for an original quantity of `"10.0000"`, `totalAllocated` computes `-5 + 15 = 10.0000`, `balanceStr` computes `0.0000`, and `status` computes `'ok'`!
- **Hazard**: A negative allocation in one note can mask an illegal excess in another note, subverting conservation of mass and balance integrity.

### Obs 4: Orphaned Helper Functions in `tests/integration/flow_c_division_balances.test.mjs`
In `tests/integration/flow_c_division_balances.test.mjs` lines 74–104:
- `distributeEqually` (lines 74–95) and `apportionExpenses` (lines 100–104) are implemented locally inside the test file rather than being imported from `app/lib/calculations/divisionMath.js`.
- As a consequence, `divisao/page.jsx` cannot reuse them and rolled its own buggy float implementation (Obs 1).

### Obs 5: Missing Ancillary Expense Apportionment in `divisao/page.jsx` Finalization
In `app/documentos/[id]/divisao/page.jsx` lines 358–405:
- In `handleFinalizeDivision`, prepared invoices are created with:
  ```javascript
  valorTotal: totalNota,
  valorTotalNota: totalNota,
  ```
  where `totalNota` is purely `noteTotals[note.id]` (products sum).
- The original invoice's `totais.valorFrete`, `totais.valorSeguro`, `totais.outrasDespesas`, and `totais.valorDesconto` are completely omitted when creating the prepared invoice records in `preparedInvoiceRepository.create`.
- This violates Feature 19 ("Prorate and preserve freight, insurance, and other expenses across prepared split invoices").

---

## 2. Logic Chain

1. **Premise (Requirement R1, R4)**: Fiscal split operations in SmartNFe must operate strictly with arbitrary-precision decimal strings and BigInt arithmetic, without IEEE 754 binary floats (`parseFloat`, `Math.floor`, `Math.round`).
2. **From Obs 1**: `divisao/page.jsx` uses `parseFloat`, `Math.floor`, and `Math.round` to divide quantities across notes in `handleDistributeEqually`. Replacing this logic with `distributeEqually(quantityStr, numNotes, 4)` using `decimalDivide`, `decimalAdd`, and `decimalSubtract` eliminates all float leakage and guarantees that `sum(allocations) === originalQuantity` exactly.
3. **From Obs 2**: Setting `canSave: false` whenever `hasRemaining === true` or `hasExcess === true` or `!isBalanced` ensures that the user cannot bypass balance conservation or finalize partial divisions.
4. **From Obs 3**: Sanitizing all allocation inputs with `cleanDecimalString` and explicitly rejecting negative allocations (`isDecimalNegative(q)`) prevents cross-note offset vulnerabilities where negative numbers simulate balance.
5. **From Obs 4 & 5**: Moving `distributeEqually` and `apportionExpenses` into `divisionMath.js` (and exporting them through `calculations/index.js`) allows both `divisao/page.jsx` and `tests/integration/flow_c_division_balances.test.mjs` to share the single source of truth for distribution and prorated expense preservation.

---

## 3. Caveats

- **Scale default**: Quantities are standardized to 4 decimal places (`scale = 4`) per NF-e SEFAZ standards (tag `qCom`), while monetary totals and ancillary expenses use 2 decimal places (`scale = 2`).
- **Minimum notes constraint**: While `validateDivisionBatch` mathematically supports any `notes.length > 0`, business logic in `divisao/page.jsx` requires at least 2 destination notes (`targetNotes.length >= 2`) to perform an export split.
- **Read-only compliance**: This explorer has made **zero edits** to production files (`divisao/page.jsx`, `divisionMath.js`, etc.). All code proposals below are prepared as drop-in replacements for the Worker.

---

## 4. Conclusion & Step-by-Step Implementation Guidance for Worker

### Target 1: `app/lib/calculations/divisionMath.js`

#### Edits required:
1. **Import additional decimal utilities**:
   ```javascript
   import {
     decimalAdd,
     decimalSubtract,
     decimalMultiply,
     decimalDivide,
     decimalCompare,
     cleanDecimalString,
     isDecimalNegative,
     roundDecimal,
   } from './decimal.js';
   ```

2. **Harden `calculateRemainingBalance` against negative allocations and non-numeric inputs**:
   ```javascript
   export function calculateRemainingBalance(originalQtyStr, allocatedQtyArray) {
     const origStr = cleanDecimalString(originalQtyStr || '0');
     const arr = Array.isArray(allocatedQtyArray) ? allocatedQtyArray : [];

     // Garante escala mínima de 4 casas decimais para quantidades fiscais
     const maxScale = Math.max(
       4,
       getDecimalPlaces(origStr),
       ...arr.map((item) => getDecimalPlaces(extractQuantity(item)))
     );

     let totalAllocated = '0.' + '0'.repeat(maxScale);
     let hasNegative = false;

     for (const item of arr) {
       const rawQ = extractQuantity(item);
       const q = cleanDecimalString(rawQ);
       if (isDecimalNegative(q)) {
         hasNegative = true;
       }
       totalAllocated = decimalAdd(totalAllocated, q, maxScale);
     }

     const balanceStr = decimalSubtract(origStr, totalAllocated, maxScale);
     const cmp = decimalCompare(balanceStr, '0');

     let status = 'ok';
     if (hasNegative || cmp < 0) {
       status = 'excess';
     } else if (cmp > 0) {
       status = 'remaining';
     }

     return {
       balanceStr,
       status,
       totalAllocatedStr: totalAllocated,
       isOk: status === 'ok',
       hasRemaining: status === 'remaining',
       hasExcess: status === 'excess',
       hasNegative,
     };
   }
   ```

3. **Harden `validateDivisionBatch` to enforce strict `canSave: false` when remaining or excess exists**:
   At lines 233–243:
   ```javascript
     const hasExcess = excessCount > 0;
     const hasRemaining = remainingCount > 0;
     const isBalanced = origList.length > 0 && balancedCount === origList.length;

     // canSave: Requer ao menos uma nota de destino, ZERO excessos, ZERO sobras remanescentes e 100% dos itens balanceados
     const canSave = notes.length > 0 && !hasExcess && !hasRemaining && isBalanced;
     const isValid = !hasExcess && !hasRemaining && isBalanced;
   ```

4. **Export `distributeEqually(quantityStr, numNotes, scale = 4)`**:
   ```javascript
   /**
    * Rateio equilibrado de quantidade em N notas com conservação de 100% da quantidade original.
    * Atribui o resíduo da dízima periódica à última nota.
    * 
    * @param {string|number} quantityStr
    * @param {number} numNotes
    * @param {number} [scale=4]
    * @returns {Array<string>}
    */
   export function distributeEqually(quantityStr, numNotes, scale = 4) {
     const qStr = cleanDecimalString(quantityStr);
     const n = parseInt(numNotes, 10);
     if (isNaN(n) || n <= 0) return [];
     if (n === 1) return [roundDecimal(qStr, scale)];

     const baseQty = decimalDivide(qStr, String(n), scale);
     const result = [];
     let allocatedSum = '0.' + '0'.repeat(scale);

     for (let i = 0; i < n - 1; i++) {
       result.push(baseQty);
       allocatedSum = decimalAdd(allocatedSum, baseQty, scale);
     }

     const lastQty = decimalSubtract(qStr, allocatedSum, scale);
     result.push(lastQty);

     return result;
   }
   ```

5. **Export `apportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr)`**:
   ```javascript
   /**
    * Rateio proporcional de despesas acessórias (frete, seguro, outras despesas, descontos)
    * com base no valor de produtos alocado na nota.
    * 
    * @param {string|number} originalExpenseStr
    * @param {string|number} noteProductTotalStr
    * @param {string|number} originalProductTotalStr
    * @returns {string}
    */
   export function apportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr) {
     const origExpense = cleanDecimalString(originalExpenseStr);
     const origProduct = cleanDecimalString(originalProductTotalStr);
     const noteProduct = cleanDecimalString(noteProductTotalStr);

     if (decimalCompare(origProduct, '0') <= 0) return '0.00';
     const ratio = decimalDivide(noteProduct, origProduct, 8);
     return decimalMultiply(origExpense, ratio, 2);
   }
   ```

---

### Target 2: `app/documentos/[id]/divisao/page.jsx`

#### Edits required:
1. **Update imports**:
   ```javascript
   import {
     validateDivisionBatch,
     calculateRemainingBalance,
     distributeEqually,
     apportionExpenses,
   } from '@/lib/calculations/divisionMath';
   import {
     decimalAdd,
     decimalMultiply,
     decimalSubtract,
     decimalCompare,
     cleanDecimalString,
     isDecimalNegative,
     roundDecimal,
   } from '@/lib/calculations/decimal';
   import { calculateInvoiceTotals } from '@/lib/calculations/invoiceTotals';
   ```

2. **Replace `handleDistributeEqually` with pure decimal implementation**:
   Replace lines 282–307 with:
   ```javascript
   // Assistente: Distribuir igualmente entre todas as notas configuradas com conservação decimal de 100%
   const handleDistributeEqually = () => {
     if (!invoice?.itens || targetNotes.length < 2) return;

     const numNotes = targetNotes.length;
     const updatedNotes = targetNotes.map((note) => ({ ...note, itens: {} }));

     invoice.itens.forEach((it) => {
       const allocations = distributeEqually(it.quantidade, numNotes, 4);
       updatedNotes.forEach((note, idx) => {
         note.itens[it.id] = allocations[idx] || '0.0000';
       });
     });

     setTargetNotes(updatedNotes);
     toast.success(`Itens distribuídos igualmente entre as ${numNotes} notas.`);
   };
   ```

3. **Synchronize `canFinalize` with `batchResult.canSave`**:
   Replace lines 336–340 with:
   ```javascript
   const canFinalize = useMemo(() => {
     if (!invoice?.itens || targetNotes.length < 2) return false;
     return Boolean(batchResult.canSave && targetNotes.length >= 2);
   }, [invoice, targetNotes, batchResult]);
   ```

4. **Integrate Ancillary Expense Apportionment in `handleFinalizeDivision`**:
   In `handleFinalizeDivision` (lines 357–410):
   Calculate apportioned freight, insurance, other expenses, and discounts for each destination note:
   ```javascript
   // Total original de produtos e despesas acessórias para rateio
   const origProductTotal = invoice.totais?.valorProdutos || '0.00';
   const origFrete = invoice.totais?.valorFrete || '0.00';
   const origSeguro = invoice.totais?.valorSeguro || '0.00';
   const origOutrasDespesas = invoice.totais?.outrasDespesas || '0.00';
   const origDesconto = invoice.totais?.valorDesconto || '0.00';

   // Acumuladores para atribuição exata da sobra na última nota
   let sumFrete = '0.00';
   let sumSeguro = '0.00';
   let sumOutrasDespesas = '0.00';
   let sumDesconto = '0.00';

   // Identifica notas que possuem itens alocados
   const activeNotesIndices = [];
   for (let i = 0; i < targetNotes.length; i++) {
     const hasItems = invoice.itens.some((origItem) => {
       const q = cleanDecimalString(targetNotes[i].itens[origItem.id] || '0');
       return decimalCompare(q, '0') > 0;
     });
     if (hasItems) activeNotesIndices.push(i);
   }

   for (let i = 0; i < targetNotes.length; i++) {
     const note = targetNotes[i];
     const distributedItems = invoice.itens
       .map((origItem) => {
         const raw = note.itens[origItem.id] || '0';
         const qtyStr = cleanDecimalString(raw);
         if (decimalCompare(qtyStr, '0') <= 0) return null;

         const lineTotal = decimalMultiply(origItem.valorUnitario, qtyStr, 2);
         return {
           ...origItem,
           quantidade: qtyStr,
           valorTotal: lineTotal,
         };
       })
       .filter(Boolean);

     if (distributedItems.length > 0) {
       const suffix = String.fromCharCode(65 + i);
       const noteProductTotal = noteTotals[note.id] || '0.00';
       const isLastActive = activeNotesIndices[activeNotesIndices.length - 1] === i;

       let noteFrete = '0.00';
       let noteSeguro = '0.00';
       let noteOutrasDesp = '0.00';
       let noteDesc = '0.00';

       if (isLastActive) {
         // Última nota fica com a diferença exata para garantir 100% de conservação
         noteFrete = decimalSubtract(origFrete, sumFrete, 2);
         noteSeguro = decimalSubtract(origSeguro, sumSeguro, 2);
         noteOutrasDesp = decimalSubtract(origOutrasDespesas, sumOutrasDespesas, 2);
         noteDesc = decimalSubtract(origDesconto, sumDesconto, 2);
       } else {
         noteFrete = apportionExpenses(origFrete, noteProductTotal, origProductTotal);
         noteSeguro = apportionExpenses(origSeguro, noteProductTotal, origProductTotal);
         noteOutrasDesp = apportionExpenses(origOutrasDespesas, noteProductTotal, origProductTotal);
         noteDesc = apportionExpenses(origDesconto, noteProductTotal, origProductTotal);

         sumFrete = decimalAdd(sumFrete, noteFrete, 2);
         sumSeguro = decimalAdd(sumSeguro, noteSeguro, 2);
         sumOutrasDespesas = decimalAdd(sumOutrasDespesas, noteOutrasDesp, 2);
         sumDesconto = decimalAdd(sumDesconto, noteDesc, 2);
       }

       const consolidatedTotals = calculateInvoiceTotals(
         distributedItems,
         noteDesc,
         noteFrete,
         noteSeguro,
         noteOutrasDesp
       );

       await preparedInvoiceRepository.create({
         parentInvoiceId: invoice.id,
         documentoOrigemId: invoice.id,
         origemNumero: invoice.numero,
         numeroOrigem: invoice.numero,
         numero: `${invoice.numero}-${suffix}`,
         serie: invoice.serie || '1',
         nomePreparacao: note.nome || `Nota Destino ${suffix}`,
         descricaoLote: `${note.nome} — Destino: ${note.razaoSocial || 'Exterior'}`,
         emitente: invoice.emitente,
         destinatario: {
           nome: note.razaoSocial || invoice.destinatario?.nome || 'Destinatário',
           cnpj: note.cnpj || invoice.destinatario?.cnpj || invoice.destinatario?.idEstrangeiro || '',
           uf: note.uf || invoice.destinatario?.uf || '',
           pais: note.pais || invoice.destinatario?.pais || 'Exterior',
           paisCodigo: invoice.destinatario?.paisCodigo || '',
         },
         itens: distributedItems,
         quantidadeItens: distributedItems.length,
         valorTotal: consolidatedTotals.valorTotalNota,
         valorTotalNota: consolidatedTotals.valorTotalNota,
         totais: consolidatedTotals,
         status: 'preparado',
         dataCriacao: new Date().toISOString(),
       });
       createdCount++;
     }
   }
   ```

---

### Target 3: `tests/integration/flow_c_division_balances.test.mjs`

#### Edits required:
1. Update top imports:
   ```javascript
   import {
     calculateRemainingBalance,
     validateDivisionBatch,
     distributeEqually,
     apportionExpenses,
   } from '../../app/lib/calculations/divisionMath.js';
   ```
2. Remove local definitions of `distributeEqually` (lines 74–95) and `apportionExpenses` (lines 100–104).
3. In `Bloqueio de Finalização com Saldos Pendentes` (line 227):
   Add assertion:
   ```javascript
   assert.strictEqual(report.canSave, false, 'Deve bloquear canSave quando há saldos remanescentes');
   ```
4. Add test case for negative allocation trap:
   ```javascript
   it('Bloqueia alocações negativas como excesso impeditivo (hasExcess: true)', () => {
     const originalQty = '10.0000';
     const note1Alloc = '-2.0000';
     const note2Alloc = '12.0000';

     const balance = calculateRemainingBalance(originalQty, [note1Alloc, note2Alloc]);
     assert.strictEqual(balance.hasExcess, true, 'Alocação negativa deve ser tratada como excesso');
     assert.strictEqual(balance.status, 'excess');
     assert.strictEqual(balance.isOk, false);
   });
   ```

---

## 5. Verification Method

To verify the implementation once applied by the Worker:

1. **Run Integration Suite**:
   ```bash
   node --no-warnings --test tests/integration/flow_c_division_balances.test.mjs
   ```
   **Expected**: 100% pass (all suites and tests pass with 0 failures).

2. **Run Tier 1 Domain Tests**:
   ```bash
   node --no-warnings --test tests/tier1/m2_domain.test.mjs
   ```
   **Expected**: All Division & Distribution Engine tests pass.

3. **Run Tier 5 Decimal Adversarial Stress Tests**:
   ```bash
   node --no-warnings --test tests/tier5/m2_decimal_adversarial_stress.test.mjs
   ```
   **Expected**: 25/25 tests pass, confirming zero float leakage.

4. **Run Full Integration Suite**:
   ```bash
   node --no-warnings --test tests/integration/*.test.mjs
   ```
   **Expected**: 43/43 tests pass (Fluxos A, B, C, D).

5. **Linting Check**:
   ```bash
   pnpm lint
   ```
