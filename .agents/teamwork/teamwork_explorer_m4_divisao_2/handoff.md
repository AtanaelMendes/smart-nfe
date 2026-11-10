# Handoff Report — Feature 17: Remaining Balance Allocation & Equal Division Math

**Agent**: `teamwork_explorer_m4_divisao_2`  
**Milestone**: `M4_Invoice_Splitting_Balance_Conservation`  
**Scope**: Feature 17 (Remaining Balance Allocation & Equal Division Math)  
**Parent Orchestrator**: `71db8a14-4c80-4575-92ba-b52ae572b170`  
**Date**: 2026-11-09T21:17:00Z  

---

## 1. Observation

### 1.1 Verbatim Code in `app/documentos/[id]/divisao/page.jsx`
In `app/documentos/[id]/divisao/page.jsx`, lines 282–307, the quick action "Distribuir Igualmente" currently performs binary floating-point calculations using `parseFloat`, `Math.floor`, and `Math.round`:

```javascript
// app/documentos/[id]/divisao/page.jsx (lines 282-307)
  // Assistente: Distribuir igualmente 50/50 entre as 2 primeiras notas
  const handleDistributeEqually = () => {
    if (!invoice?.itens || targetNotes.length < 2) return;

    const numNotes = targetNotes.length;
    const updatedNotes = targetNotes.map((note) => ({ ...note, itens: {} }));

    invoice.itens.forEach((it) => {
      const origQty = parseFloat(cleanDecimalString(it.quantidade)) || 0;
      const piece = Math.floor((origQty / numNotes) * 10000) / 10000;
      let allocatedSoFar = 0;

      updatedNotes.forEach((note, idx) => {
        if (idx === numNotes - 1) {
          // Última nota fica com a diferença exata para somar 100%
          const lastPiece = Math.round((origQty - allocatedSoFar) * 10000) / 10000;
          note.itens[it.id] = lastPiece > 0 ? String(lastPiece) : '0';
        } else {
          note.itens[it.id] = String(piece);
          allocatedSoFar += piece;
        }
      });
    });

    setTargetNotes(updatedNotes);
    toast.success(`Itens distribuídos igualmente entre as ${numNotes} notas.`);
  };
```

**Direct Observations & Failures**:
1. **IEEE-754 binary floating-point operations**: `parseFloat`, `Math.floor`, `Math.round`, native `/`, `*`, `+`, `-`.
2. **Precision loss & formatting**: `String(piece)` produces non-canonical decimal strings (e.g., `'33.33'` or `'1'` instead of `'33.3300'` or `'1.0000'`).
3. **Floating-point drift on subtraction**: `origQty - allocatedSoFar` is susceptible to binary float imprecision (e.g., `0.30000000000000004 - 0.2` = `0.10000000000000003`).
4. **Wipes existing allocations**: Clears all destination notes (`itens: {}`) rather than offering an option to distribute remaining balance for partially allocated items.
5. **No row-level action**: In the table rows (lines 856–935), there is an action `+` to allocate 100% of the remaining balance to a single destination note (`handleAllocateRemaining(note.id, it)`), but there is NO action to divide the remaining balance of an individual product equally across the destination notes.

### 1.2 Local Definition in `tests/integration/flow_c_division_balances.test.mjs`
In `tests/integration/flow_c_division_balances.test.mjs`, lines 74–95, a utility function `distributeEqually` is defined privately inside the test file:

```javascript
// tests/integration/flow_c_division_balances.test.mjs (lines 74-95)
function distributeEqually(quantityStr, numNotes, scale = 4) {
  const qStr = String(quantityStr).trim();
  const n = parseInt(numNotes, 10);
  if (n <= 0) return [];
  if (n === 1) return [qStr];

  // Base dividida arredondando para baixo na escala
  const baseQty = decimalDivide(qStr, String(n), scale);
  const result = [];
  let allocatedSum = '0.' + '0'.repeat(scale);

  for (let i = 0; i < n - 1; i++) {
    result.push(baseQty);
    allocatedSum = decimalAdd(allocatedSum, baseQty, scale);
  }

  // A última nota recebe o saldo exato (quantidade original - soma das anteriores)
  const lastQty = decimalSubtract(qStr, allocatedSum, scale);
  result.push(lastQty);

  return result;
}
```

**Observation**: `distributeEqually` is NOT exported by `app/lib/calculations/divisionMath.js`. It exists only as a local helper in the test file.

### 1.3 Critical Flaw in Half-Up Division for Equal Split
Notice the comment in `flow_c_division_balances.test.mjs:80`:
`// Base dividida arredondando para baixo na escala`
However, `decimalDivide(qStr, String(n), scale)` in `app/lib/calculations/decimal.js` performs **Half-Up** rounding (`rem * 2n >= divisor => quot += 1n`), NOT floor rounding!

**Empirical Verification of Edge Case Failure with Half-Up**:
When dividing `0.0004` into 6 notes at scale 4:
- $0.0004 / 6 = 0.0000666...$
- Half-up rounding rounds $0.0000666...$ UP to `0.0001`!
- The first 5 notes each receive `0.0001`.
- `allocatedSum` = $5 \times 0.0001 = 0.0005$.
- The 6th note receives: $0.0004 - 0.0005 = \mathbf{-0.0001}$!
- Result verified in Node 24:
  `baseQty: 0.0001 | allocatedSum: 0.0005 | lastQty: -0.0001` (Negative quantity generated!).

Therefore, equal distribution **MUST NOT** use Half-Up rounding; it **MUST** use exact integer floor division (`scaledTotal / bigN`) in BigInt.

---

## 2. Logic Chain

### Step 1: Strict Conservation Law
In fiscal document splitting (NF-e Modelo 55), the total quantity of each item across all destination split notes must exactly equal the original quantity:
$$\sum_{j=1}^{N} Q_{i, j} = Q_{i, \text{original}}$$
$$\text{Remaining Balance} = Q_{i, \text{original}} - \sum_{j=1}^{N} Q_{i, j} \equiv 0.0000$$

Any floating-point inaccuracy, fractional drift, or negative allocation invalidates the fiscal document and causes SEFAZ rejection.

### Step 2: Formulation of the BigInt Equal Division Algorithm
Using `parseDecimal` from `app/lib/calculations/decimal.js`:
1. Parse `quantityStr`: decomposes into `{ sign, intVal, scale: valScale }`.
2. Determine target scale: `targetScale = Math.max(scale, valScale)`. For fiscal quantities, `scale = 4`.
3. Normalize to target scale integer:
   $$\text{scaledTotal} = \text{intVal} \times 10^{\text{targetScale} - \text{valScale}}$$
4. Given $N$ destination notes ($N = \text{BigInt}(numNotes)$):
   $$\text{baseInt} = \text{scaledTotal} / N \quad (\text{integer floor division in BigInt})$$
   $$\text{remInt} = \text{scaledTotal} \pmod N \quad (\text{exact residual BigInt})$$
5. Distribution:
   - For note $j = 0, \dots, N - 2$:
     $$\text{note}[j] = \text{formatBigInt}(1\text{n}, \text{baseInt}, \text{targetScale})$$
   - For the last note ($j = N - 1$):
     $$\text{note}[N - 1] = \text{formatBigInt}(1\text{n}, \text{baseInt} + \text{remInt}, \text{targetScale})$$
6. Mathematical Proof of Exact Balance:
   $$\sum_{j=0}^{N-1} \text{note}[j] = (N - 1) \times \text{baseInt} + (\text{baseInt} + \text{remInt}) = N \times \text{baseInt} + \text{remInt} = \text{scaledTotal}$$
7. Mathematical Proof of Zero Negative Allocations:
   Since $\text{scaledTotal} \ge 0$, $\text{baseInt} \ge 0$, and $\text{remInt} \ge 0$:
   $$\forall j, \; \text{note}[j] \ge 0$$
   Even when $\text{scaledTotal} < N$ (e.g., $0.0004$ across 6 notes), $\text{baseInt} = 0$, $\text{remInt} = 4$. Notes $0..4$ receive $0.0000$, and Note $5$ receives $0.0004$. No negative numbers ever occur.

### Step 3: Analysis of Item and Bulk Balance Allocation Actions
There are two primary balance allocation user interactions:

#### Action 1: "Distribuir saldo restante para Nota X" (100% to Note X)
- **Use Case**: User manually specifies some notes, and assigns the entire remaining balance of an item to destination Note X.
- **Mathematical Formula**:
  $$\text{balance} = \text{calculateRemainingBalance}(Q_{\text{orig}}, [Q_1, Q_2, \dots, Q_N]).\text{balanceStr}$$
  $$\text{If } \text{balance} > 0: \quad Q_{\text{new}, X} = \text{decimalAdd}(Q_{\text{current}, X}, \text{balance}, 4)$$
- **Guaranteed Result**:
  New sum $= \sum Q + \text{balance} = Q_{\text{orig}}$.
  New balance $= 0.0000$. Status transitions to `ok` ($100\%$).

#### Action 2: "Dividir saldo igualmente entre notas" (Equal split across all notes)
- **Use Case A (Item-level)**: On a specific table row with remaining balance, user clicks "Dividir saldo igualmente":
  $$\text{balance} = \text{report.balanceStr}$$
  $$\text{slices} = \text{distributeEqually}(\text{balance}, N, 4)$$
  $$\forall j \in [0..N-1]: \quad Q_{\text{new}, j} = \text{decimalAdd}(Q_{\text{current}, j}, \text{slices}[j], 4)$$
- **Use Case B (Bulk / All Items)**:
  - **Option 1 ("Distribuir Igualmente Todos")**: Resets all notes and divides $100\%$ of $Q_{\text{orig}}$ of each item into $N$ equal parts with exact residual compensation on Note $N$.
  - **Option 2 ("Distribuir Saldos Restantes Igualmente")**: For every item where $\text{status} == \text{'remaining'}$, takes $\text{balanceStr}$ and divides it equally among the $N$ notes, adding to their existing allocations.

---

## 3. Caveats

1. **Boundary Conditions**:
   - If $numNotes \le 0$: returns `[]`.
   - If $numNotes == 1$: returns `[formatQuantity(quantityStr)]`.
   - If $quantityStr \le 0$: returns array of $numNotes$ elements formatted as `'0.0000'`.
2. **Residual Assignment Placement**:
   The residual is assigned to the last note ($N - 1$), matching accounting conventions and the existing integration test in `flow_c_division_balances.test.mjs:91-93`.
3. **Module Ownership Division**:
   - Feature 16 & 18 (Input validation traps, strict `canSave: false` blocking on excess/remaining) are within `explorer_1`'s scope.
   - Feature 19 (Ancillary expense proration and `preparedInvoiceRepository` creation) is within `explorer_3`'s scope.
   - Feature 17 (this scope) provides the BigInt division engine and allocation actions for both item-level and bulk UI.

---

## 4. Conclusion & Implementation Guidance for Worker

### 4.1 Changes in `app/lib/calculations/divisionMath.js`

Add and export the following functions in `app/lib/calculations/divisionMath.js`:

```javascript
import {
  parseDecimal,
  formatBigInt,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalCompare,
  cleanDecimalString,
} from './decimal.js';

/**
 * Distribui uma quantidade em partes estritamente iguais entre N notas
 * utilizando divisão inteira BigInt pura com alocação do resíduo (resto)
 * na última nota para garantir conservação exata da quantidade (0.0000 de sobra).
 * 
 * Exemplo: '10.0000' em 3 notas -> ['3.3333', '3.3333', '3.3334']
 * Exemplo: '100.0000' em 3 notas -> ['33.3333', '33.3333', '33.3334']
 * Exemplo: '0.0004' em 6 notas -> ['0.0000', '0.0000', '0.0000', '0.0000', '0.0000', '0.0004']
 * 
 * @param {string|number} quantityStr - Quantidade total ou saldo a dividir
 * @param {number} numNotes - Número de notas de destino (N >= 1)
 * @param {number} [scale=4] - Casas decimais de saída (padrão fiscal: 4)
 * @returns {Array<string>} Array com N strings decimais com soma identicamente igual à entrada
 */
export function distributeEqually(quantityStr, numNotes, scale = 4) {
  const n = parseInt(numNotes, 10);
  if (isNaN(n) || n <= 0) return [];

  const p = parseDecimal(quantityStr);
  const targetScale = Math.max(scale >= 0 ? scale : 4, p.scale);

  // Trata zero ou valores negativos
  if (p.intVal === 0n || p.sign < 0n) {
    return Array.from({ length: n }, () => formatBigInt(1n, 0n, targetScale));
  }

  // 1 única nota recebe 100% da quantidade
  if (n === 1) {
    const factor = 10n ** BigInt(targetScale - p.scale);
    return [formatBigInt(p.sign, p.intVal * factor, targetScale)];
  }

  const scaledTotal = p.intVal * (10n ** BigInt(targetScale - p.scale));
  const bigN = BigInt(n);

  // Divisão inteira (piso) e resto exato em BigInt
  const baseInt = scaledTotal / bigN;
  const remInt = scaledTotal % bigN;

  const result = [];
  const baseFormatted = formatBigInt(1n, baseInt, targetScale);

  for (let i = 0; i < n - 1; i++) {
    result.push(baseFormatted);
  }

  // A última nota recebe o piso + o resíduo exato (resto da divisão)
  const lastInt = baseInt + remInt;
  result.push(formatBigInt(1n, lastInt, targetScale));

  return result;
}

/**
 * Distribui o saldo restante de um item igualmente entre as notas de destino,
 * adicionando a fração correspondente às alocações já existentes.
 * 
 * @param {string|number} originalQtyStr - Quantidade original do produto
 * @param {Array<string|number|object>} currentAllocations - Alocações atuais
 * @param {number} [scale=4] - Precisão decimal
 * @returns {Array<string>} Novo array de alocações com saldo zerado
 */
export function distributeRemainingEqually(originalQtyStr, currentAllocations, scale = 4) {
  const arr = Array.isArray(currentAllocations) ? currentAllocations : [];
  const n = arr.length;
  if (n === 0) return [];

  const { balanceStr } = calculateRemainingBalance(originalQtyStr, arr);
  if (decimalCompare(balanceStr, '0') <= 0) {
    return arr.map((item) => extractQuantity(item));
  }

  const slices = distributeEqually(balanceStr, n, scale);
  return arr.map((item, idx) => {
    const current = extractQuantity(item);
    return decimalAdd(current, slices[idx], scale);
  });
}
```

### 4.2 Changes in `app/lib/calculations/index.js`
Ensure `distributeEqually` and `distributeRemainingEqually` are re-exported:
```javascript
export * from './decimal.js';
export * from './invoiceTotals.js';
export * from './divisionMath.js';
```

### 4.3 Changes in `app/documentos/[id]/divisao/page.jsx`

1. **Import `distributeEqually`**:
   ```javascript
   import {
     validateDivisionBatch,
     calculateRemainingBalance,
     distributeEqually,
   } from '@/lib/calculations/divisionMath';
   ```

2. **Rewrite `handleDistributeEqually` using `distributeEqually` (Zero Floats)**:
   ```javascript
   // Assistente: Distribuir igualmente entre todas as notas de destino
   const handleDistributeEqually = () => {
     if (!invoice?.itens || targetNotes.length < 2) return;

     const numNotes = targetNotes.length;
     const updatedNotes = targetNotes.map((note) => ({ ...note, itens: {} }));

     invoice.itens.forEach((it) => {
       const slices = distributeEqually(it.quantidade, numNotes, 4);
       updatedNotes.forEach((note, idx) => {
         note.itens[it.id] = slices[idx] || '0.0000';
       });
     });

     setTargetNotes(updatedNotes);
     toast.success(`Itens distribuídos igualmente entre as ${numNotes} notas.`);
   };
   ```

3. **Add Bulk Action "Distribuir Saldos Restantes Igualmente"**:
   ```javascript
   // Assistente: Distribuir o saldo restante de todos os itens pendentes igualmente
   const handleDistributeRemainingAll = () => {
     if (!invoice?.itens || targetNotes.length < 2) return;

     const numNotes = targetNotes.length;
     setTargetNotes((prev) => {
       const notesCopy = prev.map((n) => ({ ...n, itens: { ...n.itens } }));

       invoice.itens.forEach((it) => {
         const report = itemReportsMap.get(it.id);
         const balance = report ? report.balanceStr : it.quantidade;

         if (decimalCompare(balance, '0') > 0) {
           const slices = distributeEqually(balance, numNotes, 4);
           notesCopy.forEach((note, idx) => {
             const current = cleanDecimalString(note.itens[it.id] || '0');
             note.itens[it.id] = decimalAdd(current, slices[idx], 4);
           });
         }
       });

       return notesCopy;
     });

     toast.success(`Saldos restantes distribuídos igualmente entre as ${numNotes} notas.`);
   };
   ```

4. **Add Row-Level Action "Dividir Saldo deste Item Igualmente"**:
   ```javascript
   // Alocar o saldo restante deste item individual igualmente entre as notas
   const handleDistributeItemEqually = (item) => {
     const report = itemReportsMap.get(item.id);
     const balance = report ? report.balanceStr : item.quantidade;

     if (decimalCompare(balance, '0') <= 0) {
       toast.info('Este item não possui saldo restante para alocar.');
       return;
     }

     const numNotes = targetNotes.length;
     const slices = distributeEqually(balance, numNotes, 4);

     setTargetNotes((prev) =>
       prev.map((note, idx) => {
         const current = cleanDecimalString(note.itens[item.id] || '0');
         const newQty = decimalAdd(current, slices[idx], 4);
         return {
           ...note,
           itens: {
             ...note.itens,
             [item.id]: newQty,
           },
         };
       })
     );

     toast.success(`Saldo de ${formatQuantity(balance)} dividido igualmente.`);
   };
   ```

5. **Enhance UI Affordances in Table and Toolbar**:
   - In Quick Actions Toolbar:
     ```jsx
     <button
       type="button"
       onClick={handleDistributeEqually}
       className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
       title="Distribuir 100% das quantidades em partes iguais entre as notas"
     >
       Distribuir Igualmente ({targetNotes.length} Notas)
     </button>
     {batchResult.hasRemaining && (
       <button
         type="button"
         onClick={handleDistributeRemainingAll}
         className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
         title="Distribuir apenas o saldo pendente de cada item igualmente"
       >
         Dividir Saldos Restantes ({targetNotes.length} Notas)
       </button>
     )}
     ```
   - In Table Row (under or next to Saldo Restante):
     When `isRemaining` is true:
     ```jsx
     <td className="px-3 py-2 text-right font-mono font-bold">
       <span className={...}>
         {formatQuantity(report.balanceStr)}
       </span>
       {isRemaining && (
         <button
           type="button"
           onClick={() => handleDistributeItemEqually(it)}
           title="Dividir este saldo restante igualmente entre todas as notas"
           className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:hover:bg-amber-800 dark:text-amber-200 inline-flex items-center gap-1 transition-colors"
         >
           <FontAwesomeIcon icon={faScaleBalanced} className="w-2.5 h-2.5" />
           <span>÷ Dividir</span>
         </button>
       )}
     </td>
     ```
   - In Table Row (per note cell):
     Improve the tooltip on the `+` button:
     ```jsx
     {isRemaining && (
       <button
         type="button"
         onClick={() => handleAllocateRemaining(note.id, it)}
         title={`Distribuir 100% do saldo restante (${formatQuantity(report.balanceStr)}) para esta nota`}
         className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:hover:bg-amber-800 dark:text-amber-200 transition-colors"
       >
         +
       </button>
     )}
     ```

### 4.4 Update `tests/integration/flow_c_division_balances.test.mjs`
Import `distributeEqually` directly from `divisionMath.js`:
```javascript
import {
  calculateRemainingBalance,
  validateDivisionBatch,
  distributeEqually,
} from '../../app/lib/calculations/divisionMath.js';
```
And remove the duplicate local declaration.

---

## 5. Verification Method

To independently verify this feature:

1. **Run Flow C Integration Suite**:
   ```powershell
   node --no-warnings --test tests/integration/flow_c_division_balances.test.mjs
   ```
   **Expected Outcome**: 11 out of 11 tests pass with 0 failures, including:
   - Equal division with periodic decimals (`100.0000 / 3` -> `33.3333`, `33.3333`, `33.3334`, balance `0.0000`).
   - Single note residual allocation (`500.0000` with `315.5000` allocated, allocating `184.5000` to Note 2 leaves `0.0000`).

2. **Run All Domain and Adversarial Test Suites**:
   ```powershell
   node --no-warnings --test tests/tier1/m2_domain.test.mjs tests/tier5/m2_decimal_adversarial_stress.test.mjs
   ```
   **Expected Outcome**: All 69 tests pass.

3. **Check Algorithm Edge Cases**:
   Run the following verification snippet in Node:
   ```powershell
   node -e "
   import('./app/lib/calculations/divisionMath.js').then(({ distributeEqually }) => {
     const r1 = distributeEqually('10.0000', 3, 4);
     console.assert(JSON.stringify(r1) === JSON.stringify(['3.3333', '3.3333', '3.3334']), '10 / 3 failed');
     const r2 = distributeEqually('0.0004', 6, 4);
     console.assert(r2.every(x => !x.startsWith('-')), 'Negative allocation detected in 0.0004 / 6!');
     console.assert(r2[5] === '0.0004', 'Residual allocation failed in 0.0004 / 6');
     console.log('All BigInt division edge cases VERIFIED!');
   });
   "
   ```

4. **Verify No Floating-Point Operations in Division**:
   ```powershell
   rg "Math\.(floor|round)|parseFloat" app/lib/calculations/divisionMath.js app/documentos/[id]/divisao/page.jsx
   ```
   **Expected Outcome**: 0 matches for binary float rounding or conversion functions.
