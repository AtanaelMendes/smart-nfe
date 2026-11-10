# Handoff Report: Milestone 2 — Pure Decimal Recalculation and Ancillary Expense Preservation (Features 8 & 9)

**Agent**: `teamwork_explorer_m2_conferencia_2`  
**Working Directory**: `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_conferencia_2\`  
**Target Milestone**: Milestone 2: `M2_Conference_Table_Decimal_Recalc`  
**Scope**: Features 8 & 9 (Pure Decimal Recalculation, Ancillary Expense Preservation, 4-Decimal Quantities, Extended Unit Prices, and Robust Input Validation)

---

## 1. Observation

### 1.1 Codebase Floating-Point Operations in `app/documentos/[id]/conferencia/page.jsx`

Direct inspection of `app/documentos/[id]/conferencia/page.jsx` identified the following binary floating-point operations:

1. **Item Editing Math (`handleItemChange`, lines 73–77)**:
   ```javascript
   73:       // Recalcula valor total do item se mudar quantidade ou valor unitário
   74:       if (field === 'quantidade' || field === 'valorUnitario') {
   75:         const q = parseFloat(String(item.quantidade).replace(',', '.')) || 0;
   76:         const u = parseFloat(String(item.valorUnitario).replace(',', '.')) || 0;
   77:         item.valorTotal = (q * u).toFixed(2);
   78:       }
   ```
   - **Issues observed**:
     - Uses `parseFloat` which introduces IEEE-754 binary floating-point representation errors (e.g. `0.1 + 0.2 = 0.30000000000000004`).
     - Uses naive `.replace(',', '.')` which corrupts Brazilian thousand-separated inputs (e.g. `"1.250,50"` becomes `"1.250.50"` and parses to `1.25`).
     - Uses native float multiplication `q * u`.
     - Uses `.toFixed(2)` which suffers from JavaScript's floating-point rounding bias (banker's round-to-even with float inaccuracies, e.g. `1.005.toFixed(2)` returns `"1.00"` instead of `"1.01"`).

2. **Save Totals Overwrite & Ancillary Expense Destruction (`handleSave`, lines 88–101)**:
   ```javascript
   88:       // Recalcula total da nota
   89:       const totalProdutos = items.reduce((acc, curr) => {
   90:         return acc + (parseFloat(String(curr.valorTotal).replace(',', '.')) || 0);
   91:       }, 0);
   92: 
   93:       const updatedInvoice = {
   94:         ...invoice,
   95:         itens: items,
   96:         totais: {
   97:           ...invoice.totais,
   98:           valorTotalProdutos: totalProdutos.toFixed(2),
   99:           valorTotalNota: totalProdutos.toFixed(2),
   100:         },
   101:       };
   ```
   - **Critical bug observed**:
     - Line 99 explicitly sets `valorTotalNota: totalProdutos.toFixed(2)`.
     - This **destroys all ancillary expenses** (`valorFrete`, `valorSeguro`, `outrasDespesas`) and ignores deductions (`valorDesconto`).
     - In `demo-01` (`totais: { valorProdutos: '284500.00', valorFrete: '5000.00', valorSeguro: '1200.00', outrasDespesas: '500.00', valorTotalNota: '291200.00' }`), saving any edit overwrites `valorTotalNota` with only the product total (e.g. `284500.00`), silently wiping out R$ 6.700,00 of ancillary expenses.
     - Line 98 uses `valorTotalProdutos` whereas `mockInvoices.js`, `xmlToInvoiceMapper.js`, and `invoiceRepository.js` standardly use `valorProdutos`.

3. **Invoice Totals Accumulator (`totalGeral` `useMemo`, lines 143–147)**:
   ```javascript
   143:   // Totais calculados
   144:   const totalGeral = useMemo(() => {
   145:     return items.reduce((acc, curr) => {
   146:       return acc + (parseFloat(String(curr.valorTotal).replace(',', '.')) || 0);
   147:     }, 0);
   148:   }, [items]);
   ```
   - **Issues observed**:
     - Accumulates floating-point values via `parseFloat` and `+`.
     - Only sums product line totals, completely omitting `frete`, `seguro`, `outras despesas`, and `desconto`.
     - In the UI (line 307), `totalGeral` is displayed under the label `"Total Calculado"`, causing ambiguity because it represents only the product sum, not the total invoice value.

4. **Missing Validation on Negative and Invalid Inputs**:
   - Neither `handleItemChange` nor `handleSave` checks for negative quantities (`item.quantidade < 0`) or negative prices (`item.valorUnitario < 0`).
   - Typing `-10` multiplies without error and saves negative financial totals to the repository, in direct violation of Brazilian NF-e rules (SEFAZ requires `qCom > 0` and `vUnCom > 0`).

### 1.2 Existing BigInt Decimal Libraries

Inspection of `app/lib/calculations/`:

1. **`app/lib/calculations/decimal.js`**:
   - `cleanDecimalString(input)`: Sanitizes Brazilian currency strings (`"R$ 1.250,50"` -> `"1250.50"`), handles dots/commas safely, retains negative sign if present.
   - `parseDecimal(val)`: Decomposes string into `{ sign: bigint, intVal: bigint, scale: number }`.
   - `decimalMultiply(a, b, scale)`: Pure BigInt multiplication with formal ABNT NBR 5891 Half-Up rounding.
   - `decimalAdd(a, b, scale)` / `decimalSubtract(a, b, scale)`: Arbitrary-scale BigInt addition and subtraction.
   - `decimalCompare(a, b)`: Returns -1, 0, or 1.
   - `isDecimalZero(val)`: Returns `true` if `decimalCompare(val, '0') === 0`.
   - `isDecimalNegative(val)`: Returns `true` if `decimalCompare(val, '0') < 0`.
   - `roundDecimal(val, scale)`: Half-Up rounding to specified scale.

2. **`app/lib/calculations/invoiceTotals.js`**:
   - `calculateItemTotal(unitPriceStr, quantityStr)`:
     - Returns `decimalMultiply(unitPriceStr, quantityStr, 2)`.
     - Safely returns `'0.00'` for `null`, `undefined`, or empty string.
     - Implements exact ABNT NBR 5891 Half-Up rounding to 2 decimal places.
   - `calculateInvoiceTotals(items, discountOrOptions, freightStr, insuranceStr, otherExpensesStr)`:
     - Accepts `(items, invoice.totais)` via options object or positional arguments.
     - Sums items' `valorTotal` using `decimalAdd(..., 2)`.
     - Applies SEFAZ formula: `Total NF = Produtos - Desconto + Frete + Seguro + Outras Despesas`.
     - Returns both English and Portuguese aliases:
       ```javascript
       {
         totalProducts, totalDiscount, totalFreight, totalInsurance, totalOtherExpenses, totalInvoice,
         valorProdutos, valorDesconto, valorFrete, valorSeguro, outrasDespesas, valorTotalNota
       }
       ```

3. **Existing Integration Test Verification**:
   - Executed: `node --no-warnings --test tests/integration/flow_b_conferencia_stable_edit.test.mjs`
   - Result: 11 tests passed in 141ms (0 failures).
   - Confirmed test expectation:
     ```javascript
     // flow_b_conferencia_stable_edit.test.mjs:326-333
     it('Não substitui o total da NF-e por uma soma simplificada de produtos', () => {
       const invoice = createConferenceInvoiceFixture();
       const totais = calculateInvoiceTotals(invoice.itens, invoice.totais);
       assert.notStrictEqual(totais.valorTotalNota, totais.valorProdutos);
       assert.strictEqual(totais.valorTotalNota, '193200.00');
     });
     ```

---

## 2. Logic Chain

1. **Premise 1**: Financial calculations in Brazilian NF-e require exact arithmetic without binary floating-point leakage.
   - `parseFloat("0.1") + parseFloat("0.2")` yields `0.30000000000000004`.
   - In commodity items (such as `demo-01` item 8 with unit price `686.6667` and quantity `30.0000`), binary floats produce fractional cent drift.
   - Using `calculateItemTotal(u, q)` guarantees exact BigInt arithmetic with ABNT NBR 5891 Half-Up rounding to 2 decimal places.

2. **Premise 2**: Premature rounding during user input destroys usability and precision.
   - A quantity can have up to 4 decimal places (e.g. `12.3456`, `0.0010`, `500.0000`).
   - A unit price can have 4 to 10 decimal places (e.g. `25.5000`, `686.6667`).
   - If `roundDecimal` or formatting is forced on `onChange`, the user cannot type decimal separators or intermediate numbers (e.g. typing `"12."` would jump or truncate).
   - Therefore, the raw input string must be retained in `item.quantidade` and `item.valorUnitario`, while `item.valorTotal` is recalculated on every keystroke using `calculateItemTotal(u, q)`.

3. **Premise 3**: Ancillary expenses are an integral part of NF-e totals.
   - SEFAZ NF-e model 55 total formula is: $vNF = vProd - vDesc + vFrete + vSeg + vOutro$.
   - Replacing `valorTotalNota` with `totalProdutos` in `handleSave` violates fiscal reconciliation.
   - Passing `invoice.totais` to `calculateInvoiceTotals(items, invoice.totais)` extracts and reconciles all ancillary expenses without loss.

4. **Premise 4**: Input validation must be graceful and non-blocking during typing, but strict on save.
   - During typing, typing `"-"` or temporary invalid characters should not crash the page.
   - `cleanDecimalString` handles malformed or empty strings gracefully by falling back to `'0'`.
   - `isDecimalNegative(item.quantidade)` or `isDecimalNegative(item.valorUnitario)` can be used to dynamically toggle red warning classes in the UI (`border-red-500 bg-red-50 text-red-700`).
   - On `handleSave` and `handleMarkAsChecked`, a validation loop checks all items. If any item has a negative quantity or negative unit price, or zero quantity on finalization, the action is blocked with an informative `toast.error()`.

---

## 3. Implementation Blueprint for the Worker

### 3.1 Required Imports in `app/documentos/[id]/conferencia/page.jsx`

Add imports from `@/lib/calculations/invoiceTotals` and `@/lib/calculations/decimal`:

```javascript
import {
  calculateItemTotal,
  calculateInvoiceTotals,
} from '@/lib/calculations/invoiceTotals';
import {
  decimalCompare,
  isDecimalNegative,
  isDecimalZero,
  cleanDecimalString,
  roundDecimal,
} from '@/lib/calculations/decimal';
```

### 3.2 Pure Decimal Totals Recalculation (`calculatedTotals`)

Replace the legacy `totalGeral` `useMemo` (lines 143–148) with:

```javascript
  // Totais calculados da nota com reconciliação decimal e conservação de despesas acessórias
  const calculatedTotals = useMemo(() => {
    if (!invoice) {
      return {
        valorProdutos: '0.00',
        valorTotalNota: '0.00',
        valorFrete: '0.00',
        valorSeguro: '0.00',
        valorDesconto: '0.00',
        outrasDespesas: '0.00',
      };
    }
    return calculateInvoiceTotals(items, invoice.totais || {});
  }, [items, invoice]);
```

### 3.3 Stable Item Editing with Pure Decimal Math (`handleItemChange`)

Replace `handleItemChange` (lines 67–83) with an implementation keyed strictly by stable `itemId` and using `calculateItemTotal`:

```javascript
  // Edição direta de campo na tabela orientada a itemId estável
  const handleItemChange = (itemId, field, value) => {
    setItems((prev) => {
      return prev.map((item) => {
        if (item.id !== itemId) return item;

        // Snapshot inicial no primeiro toque (preservado em edições sucessivas)
        const valorOriginal = item.valorOriginal || {
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
          descricao: item.descricao,
          codigo: item.codigo,
          ncm: item.ncm,
          cfop: item.cfop,
          unidade: item.unidade,
        };

        const updatedItem = {
          ...item,
          [field]: value,
          modificado: true,
          valorOriginal,
        };

        // Recálculo automático do valor total do produto via motor decimal BigInt
        if (field === 'quantidade' || field === 'valorUnitario') {
          const q = field === 'quantidade' ? value : item.quantidade;
          const u = field === 'valorUnitario' ? value : item.valorUnitario;
          updatedItem.valorTotal = calculateItemTotal(u, q);
        }

        return updatedItem;
      });
    });
    setHasChanges(true);
  };
```

### 3.4 Strict Ancillary Preservation & Validation on Save (`handleSave`)

Replace `handleSave` (lines 86–110) with:

```javascript
  // Salvar alterações no storage com preservação integral de despesas acessórias
  const handleSave = async () => {
    try {
      // 1. Validação de integridade numérica
      for (const item of items) {
        if (isDecimalNegative(item.quantidade)) {
          toast.error(`Item ${item.item || item.codigo || item.id}: A quantidade não pode ser negativa.`);
          return;
        }
        if (isDecimalNegative(item.valorUnitario)) {
          toast.error(`Item ${item.item || item.codigo || item.id}: O valor unitário não pode ser negativo.`);
          return;
        }
        if (isDecimalZero(item.quantidade) || String(item.quantidade).trim() === '') {
          toast.error(`Item ${item.item || item.codigo || item.id}: A quantidade deve ser maior que zero.`);
          return;
        }
      }

      // 2. Recálculo consolidado via motor fiscal
      const newTotals = calculateInvoiceTotals(items, invoice.totais || {});

      const updatedInvoice = {
        ...invoice,
        itens: items,
        totais: {
          ...invoice.totais,
          valorProdutos: newTotals.valorProdutos,
          valorTotalProdutos: newTotals.valorProdutos, // compatibilidade
          valorFrete: newTotals.valorFrete,
          valorSeguro: newTotals.valorSeguro,
          valorDesconto: newTotals.valorDesconto,
          outrasDespesas: newTotals.outrasDespesas,
          valorTotalNota: newTotals.valorTotalNota,
        },
      };

      await invoiceRepository.update(id, updatedInvoice);
      setInvoice(updatedInvoice);
      setHasChanges(false);
      toast.success('Alterações salvas com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar as alterações.');
    }
  };
```

### 3.5 Mark as Checked with Validation & Totals Sync (`handleMarkAsChecked`)

Update `handleMarkAsChecked` (lines 113–128) to validate and synchronize totals:

```javascript
  // Marcar nota como conferida
  const handleMarkAsChecked = async () => {
    try {
      // Validação prévia
      for (const item of items) {
        if (isDecimalNegative(item.quantidade) || isDecimalNegative(item.valorUnitario)) {
          toast.error('Não é possível concluir conferência com quantidades ou preços negativos.');
          return;
        }
      }

      const newTotals = calculateInvoiceTotals(items, invoice.totais || {});
      const updated = {
        ...invoice,
        status: 'PRONTO_REVISAO',
        itens: items.map((i) => ({ ...i, situacao: 'conferido' })),
        totais: {
          ...invoice.totais,
          valorProdutos: newTotals.valorProdutos,
          valorTotalProdutos: newTotals.valorProdutos,
          valorFrete: newTotals.valorFrete,
          valorSeguro: newTotals.valorSeguro,
          valorDesconto: newTotals.valorDesconto,
          outrasDespesas: newTotals.outrasDespesas,
          valorTotalNota: newTotals.valorTotalNota,
        },
      };

      await invoiceRepository.update(id, updated);
      setInvoice(updated);
      setItems(updated.itens);
      setHasChanges(false);
      toast.success('Nota marcada como CONFERIDA com sucesso!');
    } catch (e) {
      toast.error('Erro ao atualizar status.');
    }
  };
```

### 3.6 UI Integration: Input Calling & Visual Feedback

In the table rendering:

1. **Quantidade input** (lines 428–434):
   ```jsx
   <td className="px-2 py-1.5 text-right">
     <input
       type="text"
       value={item.quantidade || ''}
       onChange={(e) => handleItemChange(item.id, 'quantidade', e.target.value)}
       className={`w-full px-1.5 py-1 text-xs rounded font-mono text-right transition-colors ${
         isDecimalNegative(item.quantidade)
           ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-1 ring-red-500'
           : 'border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-900'
       }`}
       title={isDecimalNegative(item.quantidade) ? 'Quantidade não pode ser negativa' : undefined}
     />
   </td>
   ```

2. **Valor Unitário input** (lines 437–444):
   ```jsx
   <td className="px-2 py-1.5 text-right">
     <input
       type="text"
       value={item.valorUnitario || ''}
       onChange={(e) => handleItemChange(item.id, 'valorUnitario', e.target.value)}
       className={`w-full px-1.5 py-1 text-xs rounded font-mono text-right transition-colors ${
         isDecimalNegative(item.valorUnitario)
           ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-1 ring-red-500'
           : 'border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-900'
       }`}
       title={isDecimalNegative(item.valorUnitario) ? 'Valor unitário não pode ser negativo' : undefined}
     />
   </td>
   ```

3. **Table Footer Totals** (lines 454–464):
   ```jsx
   <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-700">
     <tr>
       <td colSpan={6} className="px-4 py-2 text-slate-700 dark:text-slate-200">
         Total dos Produtos ({items.length} itens)
       </td>
       <td colSpan={3} className="px-4 py-2 text-right text-sm text-blue-600 dark:text-blue-400 font-mono">
         {formatBRL(calculatedTotals.valorProdutos)}
       </td>
     </tr>
     {/* Exibição condicional de componentes acessórios quando presentes */}
     {(calculatedTotals.valorFrete !== '0.00' ||
       calculatedTotals.valorSeguro !== '0.00' ||
       calculatedTotals.outrasDespesas !== '0.00' ||
       calculatedTotals.valorDesconto !== '0.00') && (
       <tr className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/40 font-normal">
         <td colSpan={6} className="px-4 py-1.5">
           Composição: Produtos ({formatBRL(calculatedTotals.valorProdutos)})
           {calculatedTotals.valorDesconto !== '0.00' && ` − Desconto (${formatBRL(calculatedTotals.valorDesconto)})`}
           {calculatedTotals.valorFrete !== '0.00' && ` + Frete (${formatBRL(calculatedTotals.valorFrete)})`}
           {calculatedTotals.valorSeguro !== '0.00' && ` + Seguro (${formatBRL(calculatedTotals.valorSeguro)})`}
           {calculatedTotals.outrasDespesas !== '0.00' && ` + Outras (${formatBRL(calculatedTotals.outrasDespesas)})`}
         </td>
         <td colSpan={3} className="px-4 py-1.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
           Total NF: {formatBRL(calculatedTotals.valorTotalNota)}
         </td>
       </tr>
     )}
   </tfoot>
   ```

4. **Totals Info Card** (lines 304–313):
   Display recalculated invoice total (`calculatedTotals.valorTotalNota`) alongside product total:
   ```jsx
   <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
     <div className="flex items-center justify-between">
       <span className="text-[11px] text-slate-500 uppercase font-semibold">Total da Nota (NF-e)</span>
       {hasChanges && (
         <span className="text-[10px] text-amber-500 font-medium">● Editado</span>
       )}
     </div>
     <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
       {formatBRL(calculatedTotals.valorTotalNota)}
     </p>
     <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
       <span>Produtos: {formatBRL(calculatedTotals.valorProdutos)}</span>
       {invoice.totais?.valorTotalNota && invoice.totais.valorTotalNota !== calculatedTotals.valorTotalNota && (
         <span className="line-through text-slate-400">Orig: {formatBRL(invoice.totais.valorTotalNota)}</span>
       )}
     </div>
   </div>
   ```

---

## 4. Caveats

1. **Browser Input Locale Behavior**: Users on pt-BR keyboards may type commas instead of dots (`12,50`). `cleanDecimalString` within `decimal.js` transparently translates commas to dots without user friction.
2. **Input Cursor Jump Avoidance**: Controlled inputs must NOT replace the active typed string with formatted strings (e.g. adding `.0000`) on `onChange`. Formatting should strictly occur on `valorTotal`, while `item.quantidade` and `item.valorUnitario` reflect the user's keystrokes.
3. **Collaboration with Explorer 1 and Explorer 3**:
   - Explorer 1 specifies `item.id === itemId` filtering/sorting independence.
   - Explorer 3 specifies `valorOriginal` snapshotting, single/all restore buttons, and keyboard navigation.
   - The Worker should integrate these specifications without conflict, as the methods and state properties (`valorOriginal`, `modificado`, `itemId`, `calculateItemTotal`, `calculateInvoiceTotals`) are strictly complementary and co-designed.

---

## 5. Conclusion

1. All occurrences of binary floating point in `app/documentos/[id]/conferencia/page.jsx` (`parseFloat`, `.toFixed(2)`, `*`, `+`) can and must be completely replaced with `calculateItemTotal(u, q)` and `calculateInvoiceTotals(items, invoice.totais)`.
2. The catastrophic bug on line 99 (`valorTotalNota: totalProdutos.toFixed(2)`) is fully eliminated by adopting `newTotals.valorTotalNota`, guaranteeing full preservation of freight, insurance, ancillary expenses, and discounts.
3. Quantities with up to 4 decimal places and extended unit prices are computed with zero precision loss using the existing BigInt-based `decimal.js` and `invoiceTotals.js` engine.
4. Input validation gracefully warns against negative values inline and blocks saving invalid data to the repository.

---

## 6. Verification Method

To independently verify the implementation:

1. **Automated Integration Test Execution**:
   ```powershell
   node --no-warnings --test tests/integration/flow_b_conferencia_stable_edit.test.mjs
   ```
   *Expected outcome*: 11/11 tests pass, confirming:
   - Recalculation with 4-decimal quantities and extended prices.
   - Exact ABNT NBR 5891 Half-Up rounding.
   - Full preservation of freight, insurance, other expenses, and discount in recalculated totals.
   - Zero float drift.

2. **Domain & Adversarial Suite Execution**:
   ```powershell
   node --no-warnings --test tests/tier1/m2_domain.test.mjs tests/tier5/m2_decimal_adversarial_stress.test.mjs
   ```
   *Expected outcome*: 69/69 tests pass with 0 errors.

3. **Grep Search for Floating Point Operations in `conferencia/page.jsx`**:
   Verify that `parseFloat`, `.toFixed`, `Math.round`, and `Math.floor` no longer appear in `app/documentos/[id]/conferencia/page.jsx`.
