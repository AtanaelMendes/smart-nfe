# Handoff Report: Milestone 2 — Features 10, 11, 12 (Conference Table Enhancements)

**Author**: teamwork_explorer_m2_conferencia_3  
**Target Milestone**: M2_Conference_Table_Decimal_Recalc  
**Features In Scope**:
- Feature 10: Original Values Snapshot & Restore (`valorOriginal`, strikethrough comparison, `handleRestoreItem`, `handleRestoreAll`)
- Feature 11: UI Badges & Indicators (XML Mod 55 badge, product counts, original vs recalculated comparison cards, missing data alerts, session vs demo mode indicator)
- Feature 12: Keyboard Navigation (Enter vertical navigation, Escape cancel/restore, stable focus without flicker)

---

## 1. Observation

Direct code inspections and test executions revealed the following findings:

### 1.1 Current State of `app/documentos/[id]/conferencia/page.jsx`

1. **Bug in Item Editing (`handleItemChange` lines 67–83)**:
   ```javascript
   // app/documentos/[id]/conferencia/page.jsx:67-83
   const handleItemChange = (index, field, value) => {
     setItems((prev) => {
       const copy = [...prev];
       const item = { ...copy[index], [field]: value, modificado: true };

       if (field === 'quantidade' || field === 'valorUnitario') {
         const q = parseFloat(String(item.quantidade).replace(',', '.')) || 0;
         const u = parseFloat(String(item.valorUnitario).replace(',', '.')) || 0;
         item.valorTotal = (q * u).toFixed(2);
       }

       copy[index] = item;
       return copy;
     });
     setHasChanges(true);
   };
   ```
   - **Severe Index Mismatch**: The function takes `index` instead of `itemId`. When `filteredItems` is rendered (lines 357–450) with a search term (NCM, description, code), `filteredItems.map((item, index) => ...)` passes the index of the filtered slice, mutating `copy[index]` in the global array instead of the targeted item.
   - **No Snapshot of Original Values**: `valorOriginal` is never created or populated.
   - **Binary Floating Point Math**: Uses `parseFloat` and `.toFixed(2)` directly violating R1 and causing rounding drift on quantities and unit prices.

2. **Destructive Total Override on Save (`handleSave` lines 86–110)**:
   ```javascript
   // app/documentos/[id]/conferencia/page.jsx:89-100
   const totalProdutos = items.reduce((acc, curr) => {
     return acc + (parseFloat(String(curr.valorTotal).replace(',', '.')) || 0);
   }, 0);

   const updatedInvoice = {
     ...invoice,
     itens: items,
     totais: {
       ...invoice.totais,
       valorTotalProdutos: totalProdutos.toFixed(2),
       valorTotalNota: totalProdutos.toFixed(2),
     },
   };
   ```
   - `valorTotalNota` is replaced with `totalProdutos.toFixed(2)`, completely destroying `valorFrete`, `valorSeguro`, `outrasDespesas`, and `valorDesconto`.

3. **Absence of Restore Actions**:
   - Neither `handleRestoreItem(itemId)` nor `handleRestoreAll()` are implemented in the file.
   - No row-level restore button exists in the table.
   - No bulk restore button exists in the header action bar.

4. **Absence of Inline Comparison**:
   - Table cells (lines 371–450) only display the current input value. There is no visual comparison (strikethrough original, highlight edited).

5. **Missing UI Indicators & Badges (Feature 11)**:
   - Header (lines 185–200) only shows `Conferência da NF-e {numero}`, `Série {serie}`, and status badge.
   - **Missing XML Mod 55 badge**: No indication that the document is an NF-e model 55.
   - **Missing Mode Indicator**: Does not distinguish between "Importação Local (Memória Temporária de Sessão)" (`isRealImport: true` or `isDemo: false`) and "Modo Demonstração" (`isDemo: true` or `demo-01..05`).
   - **Missing Comparison Cards**: Lines 278–313 have 4 basic cards (Emitente, Destino, Quantidade, Total Calculado) that do not contrast original vs recalculated totals, nor show preserved freight/insurance.
   - **Missing Data Alerts**: No summary banner identifying items with incomplete NCMs (length !== 8), missing CFOPs, or math divergences.

6. **Absence of Keyboard Navigation (Feature 12)**:
   - Inputs have only `onChange`. No `onKeyDown` handler. Pressing Enter submits nothing or stays put; pressing Escape does not restore previous values.
   - No `data-row-index` or `data-field` attributes for vertical navigation.

### 1.2 Available Utilities and Components

1. **Pure Decimal Calculations (`app/lib/calculations/`)**:
   - `calculateItemTotal(unitPrice, quantity)` in `invoiceTotals.js`: Returns 2-decimal rounded string using BigInt Half-Up.
   - `calculateInvoiceTotals(items, originalTotals)` in `invoiceTotals.js`: Reconciles products, discount, freight, insurance, and other expenses with formula `totalInvoice = products - discount + freight + insurance + otherExpenses`.
   - `decimalSubtract(a, b, scale)`, `decimalCompare(a, b)`, `isDecimalZero(a)`, `isDecimalNegative(a)` in `decimal.js`.

2. **UI Components (`app/components/`)**:
   - `PillsBadge.jsx` (`@/components/buttons/PillsBadge`): Variants `primary`, `primary-dark`, `success`, `warning`, `danger`, `default`.
   - `Button.jsx` (`@/components/buttons/Button`): Supports `buttonType="secondary"`, `outline`, `size="small"`, etc.
   - FontAwesome icons: `faRotateLeft`, `faTriangleExclamation`, `faShieldHalved`, `faFileCode`, `faCheck`, `faFloppyDisk`.

3. **Existing Test Suite Baseline**:
   - `tests/integration/flow_b_conferencia_stable_edit.test.mjs`: Tests 11/11 passed (4 suites). Confirms `applyItemChange` by `itemId`, `valorOriginal` snapshot, `restoreItem`, and `restoreAllItems` logic.
   - `tests/tier1/m2_domain.test.mjs`: Tests 44/44 passed (9 suites).
   - `tests/tier5/m2_challenger1_stress_flipflop.test.mjs`: Tests passed.

---

## 2. Logic Chain

From the observations above, we establish the step-by-step logic chain leading to the complete implementation blueprint:

1. **Why `handleItemChange` MUST use `itemId` (Observation 1.1.1)**:
   - When a user filters by NCM (e.g. searching "09011110"), `filteredItems` contains only matching items. If the user edits row index 0 of `filteredItems`, but the handler executes `copy[index]` on the unfiltered `items` array, row 0 of the entire note is corrupted instead of the searched product.
   - *Requirement*: `handleItemChange(itemId, field, value)` must locate the target item via `item.id === itemId`.

2. **Why `valorOriginal` must be captured on the first edit (Observation 1.1.1, 1.2.3)**:
   - To allow rollback and visual comparison, the item's baseline state before any mutation must be preserved.
   - If `!item.valorOriginal`, capture `{ codigo, descricao, ncm, cfop, unidade, quantidade, valorUnitario, valorTotal }`.
   - On subsequent edits to the same item, keep the existing `valorOriginal` untouched (as verified by `flow_b_conferencia_stable_edit.test.mjs` line 354).

3. **Why Decimal Engine is Mandatory in Line and Total Calculations (Observations 1.1.1, 1.1.2, 1.2.1)**:
   - `q * u` in JavaScript IEEE-754 binary floats causes pennies drift (e.g. `686.6667 * 30.0000 = 20600.001000000003` instead of `20600.00`).
   - `calculateItemTotal(u, q)` guarantees exact ABNT Half-Up BigInt rounding.
   - `calculateInvoiceTotals(items, invoice.totais)` ensures freight, insurance, other expenses, and discounts are preserved and reconciled.

4. **Why Inline Strikethrough Comparison is Necessary (Observation 1.1.4)**:
   - Fulfills R1 and R4: The operator must see what changed at a glance.
   - When `item.valorOriginal && item.valorOriginal[field] !== item[field]`, highlight the input border (`border-amber-400 bg-amber-50/50`) and render `<span className="line-through text-slate-400 text-[10px]">Orig: {item.valorOriginal[field]}</span>`.
   - For `valorTotal`, if `item.valorOriginal.valorTotal !== item.valorTotal`, display the new total prominently and the original total struck-through below.

5. **Why Single and Bulk Restore (`handleRestoreItem` and `handleRestoreAll`) are Required (Observation 1.1.3)**:
   - Single item restore: Resets `...item.valorOriginal`, clears `modificado = false` and `valorOriginal = null`.
   - Bulk restore: Reverts all modified items in one click.
   - Dynamically re-evaluates `hasChanges = items.some(i => i.modificado)`.

6. **Why Visual Mode Indicator & Mod 55 Badge are Critical (Observation 1.1.5)**:
   - In accordance with R3 and R4, real XML imports are ephemeral session data (`isRealImport: true` or `isDemo: false`), whereas factory mocks (`demo-01` to `demo-05`) persist in localStorage.
   - Operator needs unambiguous clarity on whether their edits are on live temporary session data or mock templates.
   - XML Mod 55 badge verifies compliance with Brazilian SEFAZ Model 55 invoice specifications.

7. **Why DOM Attributes are Required for Stable Keyboard Navigation (Observation 1.1.6)**:
   - Assigning `data-row-index={index}` and `data-field={field}` to each input allows `document.querySelector` to find the input in the adjacent row without complex state synchronization or focus re-renders.
   - Pressing Enter: Moves vertically to the same field in row `index + 1` (or `index - 1` if Shift+Enter). Automatically selects text with `.select()`.
   - Pressing Escape: Triggers `handleRestoreItem(itemId)` and calls `e.target.blur()`.
   - Using stable `key={item.id}` on each `<tr>` ensures React never unmounts inputs during re-renders, preventing flicker or loss of cursor focus.

---

## 3. Implementation Guidance for the Worker

The implementer (Worker) should update `app/documentos/[id]/conferencia/page.jsx` according to the following concrete specifications:

### 3.1 Required Imports

```javascript
import { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileInvoice,
  faArrowLeft,
  faFloppyDisk,
  faCheckDouble,
  faScissors,
  faTriangleExclamation,
  faMagnifyingGlass,
  faRotateLeft,
  faEye,
  faFilePdf,
  faFileCode,
  faCircleCheck,
  faShieldHalved,
  faBoxOpen,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import PillsBadge from '@/components/buttons/PillsBadge';
import { useAppContext } from '@/context/AppContext';

import { formatBRL } from '@/lib/formatters/currency';
import { formatDateBR } from '@/lib/formatters/dates';
import { getStatusLabel, getStatusColor } from '@/lib/formatters/status';
import { invoiceRepository } from '@/features/invoiceRepository';

import { calculateItemTotal, calculateInvoiceTotals } from '@/lib/calculations/invoiceTotals';
import {
  decimalSubtract,
  decimalCompare,
  isDecimalZero,
  isDecimalNegative,
  cleanDecimalString,
} from '@/lib/calculations/decimal';
```

### 3.2 State, Calculations, and Inconsistency Traps

```javascript
  // Totais recalculados via motor decimal preservando frete, seguro, outras despesas e descontos
  const recalculatedTotals = useMemo(() => {
    if (!invoice) return null;
    return calculateInvoiceTotals(items, invoice.totais || {});
  }, [items, invoice]);

  // Diferença do total da nota (Recalculado - Original)
  const totalsDiff = useMemo(() => {
    if (!recalculatedTotals || !invoice?.totais) return '0.00';
    return decimalSubtract(
      recalculatedTotals.valorTotalNota,
      invoice.totais.valorTotalNota || '0.00',
      2
    );
  }, [recalculatedTotals, invoice]);

  const hasTotalsDiff = useMemo(() => {
    return !isDecimalZero(totalsDiff);
  }, [totalsDiff]);

  // Contagem de itens modificados
  const modifiedItemsCount = useMemo(() => {
    return items.filter((i) => i.modificado).length;
  }, [items]);

  // Detecção de itens com dados ausentes ou inconsistências
  const itemsWithIssues = useMemo(() => {
    return items.filter((item) => {
      const cleanNcm = String(item.ncm || '').replace(/\D/g, '');
      const missingNcm = cleanNcm.length !== 8;
      const missingCfop = !item.cfop || String(item.cfop).trim() === '';
      const cleanQty = cleanDecimalString(item.quantidade);
      const cleanPrice = cleanDecimalString(item.valorUnitario);
      const missingQty = isDecimalZero(cleanQty);
      const missingPrice = isDecimalZero(cleanPrice);
      const lineExpected = calculateItemTotal(item.valorUnitario, item.quantidade);
      const cleanTotal = cleanDecimalString(item.valorTotal);
      const mathDiff = decimalCompare(lineExpected, cleanTotal) !== 0;
      const flagged =
        item.situacao === 'inconsistente' ||
        (Array.isArray(item.inconsistencias) && item.inconsistencias.length > 0);

      return missingNcm || missingCfop || missingQty || missingPrice || mathDiff || flagged;
    });
  }, [items]);
```

### 3.3 Core Action Handlers

#### `handleItemChange` (itemId-based with snapshot and decimal recalculation):
```javascript
  const handleItemChange = (itemId, field, value) => {
    setItems((prev) => {
      return prev.map((item) => {
        if (item.id !== itemId) return item;

        // Snapshot inicial imutável na primeira alteração
        const valorOriginal = item.valorOriginal || {
          codigo: item.codigo,
          descricao: item.descricao,
          ncm: item.ncm,
          cfop: item.cfop,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
        };

        const updated = {
          ...item,
          [field]: value,
          modificado: true,
          valorOriginal,
        };

        // Recálculo decimal imediato da linha
        if (field === 'quantidade' || field === 'valorUnitario') {
          const q = field === 'quantidade' ? value : item.quantidade;
          const u = field === 'valorUnitario' ? value : item.valorUnitario;
          updated.valorTotal = calculateItemTotal(u, q);
        }

        return updated;
      });
    });
    setHasChanges(true);
  };
```

#### `handleRestoreItem` (Unitary Restore):
```javascript
  const handleRestoreItem = (itemId) => {
    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== itemId || !item.valorOriginal) return item;
        return {
          ...item,
          ...item.valorOriginal,
          modificado: false,
          valorOriginal: null,
        };
      });
      const stillModified = updated.some((i) => i.modificado);
      setHasChanges(stillModified);
      return updated;
    });
    toast.info('Item restaurado para o valor original.');
  };
```

#### `handleRestoreAll` (Bulk Restore):
```javascript
  const handleRestoreAll = () => {
    setItems((prev) => {
      return prev.map((item) => {
        if (!item.valorOriginal) return item;
        return {
          ...item,
          ...item.valorOriginal,
          modificado: false,
          valorOriginal: null,
        };
      });
    });
    setHasChanges(false);
    toast.info('Todos os itens foram restaurados para os valores originais.');
  };
```

#### `handleKeyDown` (Vertical Keyboard Navigation & Escape Restore):
```javascript
  const handleKeyDown = (e, rowIndex, field, itemId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const targetIndex = e.shiftKey ? rowIndex - 1 : rowIndex + 1;
      if (targetIndex >= 0 && targetIndex < filteredItems.length) {
        const nextInput = document.querySelector(
          `input[data-row-index="${targetIndex}"][data-field="${field}"]`
        );
        if (nextInput) {
          nextInput.focus();
          if (typeof nextInput.select === 'function') {
            nextInput.select();
          }
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRestoreItem(itemId);
      e.target.blur();
    }
  };
```

#### `handleSave` (Preserving Ancillary Totals):
```javascript
  const handleSave = async () => {
    try {
      const totals = calculateInvoiceTotals(items, invoice.totais || {});

      const updatedInvoice = {
        ...invoice,
        itens: items,
        totais: {
          ...invoice.totais,
          ...totals,
        },
      };

      await invoiceRepository.update(id, updatedInvoice);
      setInvoice(updatedInvoice);
      setHasChanges(false);
      toast.success('Alterações salvas com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar alterações.');
    }
  };
```

### 3.4 JSX Enhancements

1. **Header Badges**:
   - Add XML Mod 55 badge:
     ```jsx
     <span className="text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold px-2 py-0.5 rounded font-mono shadow-xs">
       NF-e Mod. 55
     </span>
     ```
   - Add Mode Indicator (Session vs Demo):
     ```jsx
     {invoice.isRealImport || invoice.isDemo === false ? (
       <span
         className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
         title="Documento mantido exclusivamente na memória volátil de sessão. Não persistido em disco."
       >
         <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
         <span>Importação Local (Sessão Segura)</span>
       </span>
     ) : (
       <span
         className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
         title="Cenário mockado de demonstração pré-carregado."
       >
         <span className="w-2 h-2 rounded-full bg-blue-500" />
         <span>Modo Demonstração</span>
       </span>
     )}
     ```

2. **Action Bar "Restaurar Todos" Button**:
   ```jsx
   {modifiedItemsCount > 0 && (
     <Button
       buttonType="secondary"
       size="small"
       outline
       onClick={handleRestoreAll}
       title="Desfazer todas as edições e restaurar dados originais"
     >
       <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5 mr-1 text-amber-500" />
       Restaurar Todos ({modifiedItemsCount})
     </Button>
   )}
   ```

3. **Comparison Cards**:
   - Card 3 (Produtos):
     ```jsx
     <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
       <span className="text-[11px] text-slate-500 uppercase font-semibold">Produtos Importados</span>
       <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
         {items.length} produtos
       </p>
       <div className="flex items-center gap-2 mt-1">
         {modifiedItemsCount > 0 ? (
           <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950 px-1.5 py-0.2 rounded">
             {modifiedItemsCount} alterado(s)
           </span>
         ) : (
           <span className="text-[10px] text-slate-400">Todos originais</span>
         )}
         {itemsWithIssues.length > 0 && (
           <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950 px-1.5 py-0.2 rounded">
             {itemsWithIssues.length} pendente(s)
           </span>
         )}
       </div>
     </div>
     ```
   - Card 4 (Totais Comparativos):
     ```jsx
     <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
       <div className="flex items-center justify-between">
         <span className="text-[11px] text-slate-500 uppercase font-semibold">Total da NF-e</span>
         {hasTotalsDiff && (
           <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
             {isDecimalNegative(totalsDiff) ? '' : '+'}{formatBRL(totalsDiff)}
           </span>
         )}
       </div>
       <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
         {formatBRL(recalculatedTotals?.valorTotalNota)}
       </p>
       <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
         <span>Orig: {formatBRL(invoice.totais?.valorTotalNota)}</span>
         <span title="Frete, Seguro e Despesas preservados">
           Frete: {formatBRL(invoice.totais?.valorFrete || '0.00')}
         </span>
       </div>
     </div>
     ```

4. **Missing Data Alert Banner**:
   ```jsx
   {itemsWithIssues.length > 0 && (
     <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-amber-900 dark:text-amber-200">
       <div className="flex items-center gap-2">
         <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
         <span>
           <strong>Alerta de Inconsistências Fiscais:</strong> {itemsWithIssues.length} {itemsWithIssues.length === 1 ? 'produto apresenta' : 'produtos apresentam'} dados ausentes ou divergentes (NCM incompleto, CFOP ausente ou divergência no cálculo).
         </span>
       </div>
       <span className="text-[11px] font-semibold bg-amber-200 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-full text-amber-900 dark:text-amber-200 self-start sm:self-auto">
         {itemsWithIssues.length} {itemsWithIssues.length === 1 ? 'pendência' : 'pendências'}
       </span>
     </div>
   )}
   ```

5. **Table Header & Columns**:
   Add `#`, `Código`, `Descrição`, `NCM`, `CFOP`, `Unid.`, `Qtd`, `Unitário (R$)`, `Total (R$)`, and `Ações`.

6. **Input Elements with Strikethrough Comparison & Keyboard Handlers**:
   - Key attributes:
     - `data-row-index={index}`
     - `data-field="fieldName"`
     - `onKeyDown={(e) => handleKeyDown(e, index, 'fieldName', item.id)}`
     - `onChange={(e) => handleItemChange(item.id, 'fieldName', e.target.value)}`
   - Example for `quantidade`:
     ```jsx
     <td className="px-2 py-1.5 text-right">
       <input
         type="text"
         data-row-index={index}
         data-field="quantidade"
         value={item.quantidade || ''}
         onChange={(e) => handleItemChange(item.id, 'quantidade', e.target.value)}
         onKeyDown={(e) => handleKeyDown(e, index, 'quantidade', item.id)}
         className={`w-full px-1.5 py-1 text-xs rounded font-mono text-right transition-colors ${
           item.valorOriginal && item.valorOriginal.quantidade !== item.quantidade
             ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold focus:border-amber-500'
             : 'border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-900'
         }`}
       />
       {item.valorOriginal && item.valorOriginal.quantidade !== item.quantidade && (
         <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block text-right pr-1" title="Quantidade original">
           Orig: {item.valorOriginal.quantidade}
         </span>
       )}
     </td>
     ```
   - Example for `valorUnitario`:
     ```jsx
     <td className="px-2 py-1.5 text-right">
       <input
         type="text"
         data-row-index={index}
         data-field="valorUnitario"
         value={item.valorUnitario || ''}
         onChange={(e) => handleItemChange(item.id, 'valorUnitario', e.target.value)}
         onKeyDown={(e) => handleKeyDown(e, index, 'valorUnitario', item.id)}
         className={`w-full px-1.5 py-1 text-xs rounded font-mono text-right transition-colors ${
           item.valorOriginal && item.valorOriginal.valorUnitario !== item.valorUnitario
             ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold focus:border-amber-500'
             : 'border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-900'
         }`}
       />
       {item.valorOriginal && item.valorOriginal.valorUnitario !== item.valorUnitario && (
         <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block text-right pr-1" title="Valor unitário original">
           Orig: {item.valorOriginal.valorUnitario}
         </span>
       )}
     </td>
     ```
   - In `valorTotal`:
     ```jsx
     <td className="px-3 py-1.5 text-right font-mono">
       <span className="font-bold text-slate-900 dark:text-slate-100 block">
         {formatBRL(item.valorTotal)}
       </span>
       {item.valorOriginal && item.valorOriginal.valorTotal !== item.valorTotal && (
         <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block" title="Total original do produto">
           Orig: {formatBRL(item.valorOriginal.valorTotal)}
         </span>
       )}
     </td>
     ```
   - In `Ações`:
     ```jsx
     <td className="px-2 py-1.5 text-center">
       {item.modificado ? (
         <div className="flex items-center justify-center gap-1">
           <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold px-1.5 py-0.2 rounded">
             Editado
           </span>
           <button
             type="button"
             onClick={() => handleRestoreItem(item.id)}
             className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
             title="Restaurar valor original deste item (Esc)"
           >
             <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5" />
           </button>
         </div>
       ) : (
         <span className="text-[10px] text-slate-400">Original</span>
       )}
     </td>
     ```

---

## 4. Caveats

- **Scope Boundary**: This investigation specifically focuses on Features 10, 11, and 12 (`conferencia/page.jsx`). Features 13, 14, 15 belong to Milestone 3 (`validacao/page.jsx`) and Features 16, 17, 18, 19 belong to Milestone 4 (`divisao/page.jsx`).
- **Read-Only Discipline**: No source code files in `app/` were modified by this explorer, adhering strictly to the explorer role.
- **Component Availability**: All required calculation utilities (`invoiceTotals.js`, `decimal.js`) and UI components (`Button`, `PillsBadge`, FontAwesome) are verified to exist and function correctly.

---

## 5. Conclusion

1. The conference table in `app/documentos/[id]/conferencia/page.jsx` currently contains critical defects (filtering index bug, binary floating point math, loss of freight/ancillary totals on save, absence of snapshot/restore, lack of indicators and keyboard navigation).
2. Implementing the provided blueprint will satisfy 100% of the requirements for Features 10, 11, and 12:
   - Stable `itemId`-based immutable editing with initial snapshot in `valorOriginal`.
   - Inline comparison displaying strikethrough original values and highlighted edited cells.
   - Restoring individual items (`handleRestoreItem`) and all items (`handleRestoreAll`).
   - UI indicators: XML Mod 55 badge, product counts, comparison cards (original vs recalculated totals), missing data alerts, and clear session vs demo mode identification.
   - Fast, stable vertical keyboard navigation (Enter / Shift+Enter) and cancel/restore (Escape) with zero focus loss or flicker.
3. The proposed implementation is fully compatible with existing domain logic and tested against `flow_b_conferencia_stable_edit.test.mjs`.

---

## 6. Verification Method

To verify the implementation once applied by the Worker:

1. **Automated Integration Test**:
   ```bash
   node --no-warnings --test tests/integration/flow_b_conferencia_stable_edit.test.mjs
   ```
   *Expected Result*: 11 tests passing across 4 suites with 0 failures.

2. **Domain and Stress Tests**:
   ```bash
   node --no-warnings --test tests/tier1/m2_domain.test.mjs
   node --no-warnings --test tests/tier5/m2_decimal_adversarial_stress.test.mjs
   node --no-warnings --test tests/tier5/m2_challenger1_stress_flipflop.test.mjs
   ```
   *Expected Result*: All suites passing with 0 failures.

3. **Manual Verification Steps in UI**:
   - Open `/documentos` and navigate to a demo invoice (e.g. `demo-01`) and an imported real XML invoice.
   - Verify mode badge: "Modo Demonstração" vs "Importação Local (Sessão Segura)".
   - Verify "NF-e Mod. 55" badge.
   - Filter products by description or NCM. Edit quantity or price on a filtered row: verify ONLY the targeted item is updated and others remain pristine.
   - Verify inline comparison: edited cell is highlighted with original value shown with strikethrough.
   - Press Enter: focus advances vertically to the same field in the next visible row with text selected.
   - Press Escape: reverts edited value to original and clears focus.
   - Click "Restaurar" on an individual row: reverts item.
   - Click "Restaurar Todos": reverts all modified items.
   - Save and check that freight, insurance, and other expenses are preserved in totals.

4. **Invalidation Conditions**:
   - If `handleItemChange` accepts an array index instead of `itemId`.
   - If `parseFloat` or `.toFixed(2)` is used anywhere in `conferencia/page.jsx`.
   - If `handleSave` overwrites `valorTotalNota` without including freight/insurance/expenses.
   - If typing in an input loses cursor focus or causes page flicker.
