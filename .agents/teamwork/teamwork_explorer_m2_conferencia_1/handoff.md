# Handoff Report — Milestone 2: Stable itemId Conference Editing & Filter/Sort Safety

**Agent**: `teamwork_explorer_m2_conferencia_1`  
**Milestone**: Milestone 2 (`M2_Conference_Table_Decimal_Recalc`)  
**Scope**: Features 6 & 7 (Stable `itemId` Conference Editing and Filter/Sort Safe Editing), plus supporting decimal recalculation and UI enhancements (Features 8, 9, 10, 11, 12).  
**Target Files**: `app/documentos/[id]/conferencia/page.jsx`, `app/features/invoiceRepository.js`, `tests/integration/flow_b_conferencia_stable_edit.test.mjs`.

---

## 1. Observation

### 1.1 Current Implementation in `app/documentos/[id]/conferencia/page.jsx`

Direct inspection of `app/documentos/[id]/conferencia/page.jsx` reveals several critical defects:

#### A. Array Index Mutation in `handleItemChange`
Lines 67–83:
```javascript
// Edição direta de campo na tabela
const handleItemChange = (index, field, value) => {
  setItems((prev) => {
    const copy = [...prev];
    const item = { ...copy[index], [field]: value, modificado: true };

    // Recalcula valor total do item se mudar quantidade ou valor unitário
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

#### B. Visual Mapping Passes Filtered Array Index to `handleItemChange`
Lines 357–452:
```javascript
{filteredItems.map((item, index) => {
  const isModified = item.modificado;
  return (
    <tr
      key={item.id || index}
      className={`hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors ${
        isModified ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
      }`}
    >
      <td className="px-2 py-1.5 text-center font-mono text-slate-400">
        {item.item || index + 1}
      </td>

      {/* Código */}
      <td className="px-2 py-1.5">
        <input
          type="text"
          value={item.codigo || ''}
          onChange={(e) => handleItemChange(index, 'codigo', e.target.value)}
          ...
        />
      </td>
      {/* Descrição */}
      <td className="px-3 py-1.5">
        <input
          type="text"
          value={item.descricao || ''}
          onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
          ...
        />
      </td>
      ...
      {/* Quantidade */}
      <td className="px-2 py-1.5 text-right">
        <input
          type="text"
          value={item.quantidade || ''}
          onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
          ...
        />
      </td>
      {/* Valor Unitário */}
      <td className="px-2 py-1.5 text-right">
        <input
          type="text"
          value={item.valorUnitario || ''}
          onChange={(e) => handleItemChange(index, 'valorUnitario', e.target.value)}
          ...
        />
      </td>
      ...
    </tr>
  );
})}
```

#### C. Ancillary Expenses Wiped Out During Save
Lines 86–110:
```javascript
const handleSave = async () => {
  try {
    // Recalcula total da nota
    const totalProdutos = items.reduce((acc, curr) => {
      return acc + (parseFloat(String(curr.valorTotal).replace(',', '.')) || 0);
    }, 0);

    const updatedInvoice = {
      ...invoice,
      itens: items,
      totais: {
        ...invoice.totais,
        valorTotalProdutos: totalProdutos.toFixed(2),
        valorTotalNota: totalProdutos.toFixed(2), // BUG: Wipes freight, insurance, other expenses and discounts!
      },
    };

    await invoiceRepository.update(id, updatedInvoice);
    setInvoice(updatedInvoice);
    setHasChanges(false);
    toast.success('Alterações salvas com sucesso!');
  } catch (e) {
    toast.error('Erro ao salvar.');
  }
};
```

#### D. Missing Features in `page.jsx`
- No column sorting capability on `<thead />` columns (`item`, `codigo`, `descricao`, `ncm`, `cfop`, `quantidade`, `valorUnitario`, `valorTotal`).
- No immutable snapshot of `valorOriginal` taken on the first mutation.
- No item restore button (`handleRestoreItem(itemId)`).
- No global restore button (`handleRestoreAll()`).
- No document origin indicator (XML Session vs Demo Mock).
- No comparison display of original vs recalculated total.
- No keyboard navigation across table cells (Enter to next row, Escape to blur).

---

### 1.2 Item Identity in Data Sources

#### A. Real XML Imports (`app/features/xml/xmlToInvoiceMapper.js`)
Lines 34–38:
```javascript
export function generateItemId(chaveAcesso, nItem) {
  const cleanKey = String(chaveAcesso || '').replace(/^NFe/i, '').replace(/\D/g, '');
  const itemNum = parseInt(String(nItem), 10) || 1;
  return `nfe-${cleanKey}-item-${itemNum}`;
}
```
Every item generated from XML has an immutable, globally unique string `id: nfe-${chaveAcesso}-item-${nItem}` where `nItem` is the 1-based sequential item number from SEFAZ XML (`<det nItem="X">`).

#### B. Mock Scenarios (`app/lib/data/mockInvoices.js`)
- `demo-01`: items have `id: 'd1-1'`, `'d1-2'`, ..., `'d1-8'`.
- `demo-02`: items have `id: 'd2-1'`, `'d2-2'`, ..., `'d2-25'`.
- `demo-05`: items have `id: 'd5-1'`, `'d5-2'`, ..., `'d5-15'`.
  Notice that in `demo-05` (lines 256–278), the same product code `SOJA-GR-01` appears in 5 distinct batches (items 1, 4, 7, 10, 13). Each item has a distinct `id` (`d5-1`, `d5-4`, `d5-7`, `d5-10`, `d5-13`).
- Synthetic test fixtures (`tests/integration/flow_b_conferencia_stable_edit.test.mjs`, lines 76–102):
  Items 3 and 4 have identical `codigo: 'EXP-VAL-003'` and identical `descricao: 'Válvula de Escape Motor'`, but distinct IDs:
  `nfe-352411...-item-3` and `nfe-352411...-item-4`.

#### C. Verification via Integration Tests
Executed command:
`node --no-warnings --test tests/integration/flow_b_conferencia_stable_edit.test.mjs`
Result:
- 11 tests passed, 0 failed.
- Suite explicitly verifies:
  1. Editing exclusively the selected item when table is filtered by NCM.
  2. Editing exclusively the selected item when table is filtered by description.
  3. Distinguishing lines with identical descriptions and codes via `itemId`.
  4. Editing correct item when table is sorted descending.
  5. Pure decimal recalculation via BigInt.
  6. Reconciling and preserving freight, insurance, other expenses, and discounts.
  7. Snapshot of `valorOriginal` on first change and preservation on subsequent changes.
  8. Single item restore (`handleRestoreItem`) and batch restore (`handleRestoreAll`).

---

## 2. Logic Chain

### Step 1: Why Filters Cause Edits to Corrupt the Wrong Item
1. `filteredItems` is a derived `useMemo` array that filters `items` by `searchTerm` matching `codigo`, `descricao`, `ncm`, or `cfop`:
   ```javascript
   const filteredItems = useMemo(() => {
     if (!searchTerm) return items;
     const term = searchTerm.toLowerCase();
     return items.filter(...);
   }, [items, searchTerm]);
   ```
2. When the user renders the table, `filteredItems.map((item, index) => ...)` produces JSX inputs with `onChange={(e) => handleItemChange(index, field, e.target.value)}`.
3. In this callback, `index` is the index **inside `filteredItems`** (0, 1, 2, ...), NOT the index of that item in the master `items` array.
4. For example, in `demo-01`:
   - `items[0]` = Café (`id: 'd1-1'`)
   - `items[1]` = Soja (`id: 'd1-2'`)
   - `items[2]` = Açúcar (`id: 'd1-3'`)
5. If the user filters by NCM `"17019900"` (or searches `"Açúcar"`):
   - `filteredItems.length === 1`
   - `filteredItems[0]` is Açúcar.
6. The user changes quantity on this visible row. The input calls `handleItemChange(0, 'quantidade', '85.0000')`.
7. Inside `handleItemChange(index, ...)`:
   - `copy = [...prev]` (where `prev` is `items`).
   - `copy[0]` is accessed. But `copy[0]` is **Café**!
   - Café's quantity is changed to `85.0000`, while Açúcar's quantity remains `80.0000`.
8. The master state is corrupted: an innocent item was modified, and the intended item was untouched.

### Step 2: Why Sorting Causes the Same Corruption
1. When sorting is applied, `filteredItems` is sorted according to a column (e.g. `valorTotal` descending).
2. The item at visual row 0 is the item with the highest total (e.g. `items[5]`).
3. Calling `handleItemChange(0, ...)` mutates `copy[0]` (the first item in insertion order), corrupting `items[0]` instead of `items[5]`.

### Step 3: Why Duplicate Item Codes or Identical Descriptions Collide Without `itemId`
1. If an application attempts to locate items by `codigo` or `descricao` (`items.find(i => i.codigo === code)`):
   - In `demo-05`, `SOJA-GR-01` appears in 5 separate rows.
   - In `flow_b_conferencia_stable_edit.test.mjs`, `EXP-VAL-003` appears twice with identical descriptions and prices.
2. Searching by `codigo` or `descricao` will always match the *first* occurrence, making subsequent rows impossible to edit and causing multi-row cross-contamination.
3. Because every item has a unique, deterministic `id` (`item.id`), searching strictly by `item.id === itemId` provides 100% mathematical uniqueness and isolation.

### Step 4: Elimination of IEEE-754 Binary Floating-Point Drift
1. In `handleItemChange`:
   `parseFloat(String(item.quantidade).replace(',', '.')) * parseFloat(...)` produces binary floating-point errors (e.g. `0.1 * 0.2 = 0.020000000000000004` or `33.335 * 3 = 100.00500000000001`).
2. `PROJECT.md` specifies `calculateItemTotal(unitPrice, quantity)` from `app/lib/calculations/invoiceTotals.js`.
3. `calculateItemTotal` delegates to `decimalMultiply(unitPrice, quantity, 2)` using `BigInt` scaling and strict ABNT NBR 5891 Half-Up rounding.
4. Calling `calculateItemTotal(u, q)` guarantees zero floating point drift and exact penny accounting.

### Step 5: Ancillary Expense Preservation
1. `handleSave` currently sums product totals and sets `valorTotalNota = totalProdutos.toFixed(2)`.
2. This drops freight (`valorFrete`), insurance (`valorSeguro`), other expenses (`outrasDespesas`), and discounts (`valorDesconto`).
3. By replacing this with `calculateInvoiceTotals(items, invoice.totais || {})`:
   - Formula: $\text{valorTotalNota} = \text{valorProdutos} - \text{valorDesconto} + \text{valorFrete} + \text{valorSeguro} + \text{outrasDespesas}$.
   - All ancillary expenses are preserved exactly.

---

## 3. Caveats

1. **Local vs Persistent State in `ConferenciaPage`**:
   The table allows interactive edits in React state (`items`). Changes are staged locally and committed to `invoiceRepository.update(id, updatedInvoice)` when clicking "Salvar Edições". The Worker must ensure that `hasChanges` accurately reflects whether any item differs from the persisted baseline.
2. **React Re-render Focus Loss Prevention**:
   Using `key={item.id}` on each `<tr>` ensures React reconciliation preserves input focus and DOM identity during state updates. Do NOT use composite keys like `${item.id}-${item.quantidade}` or index keys, as that would unmount the `<input>` on every keystroke.
3. **Number Formatting in Inputs**:
   During active typing in input fields, the user may type commas or partial decimals (`25,5` or `10.`). The input value should remain what the user types (`value={item.quantidade ?? ''}`), while `calculateItemTotal` automatically sanitizes the decimal string via `cleanDecimalString`.
4. **No Direct Code Modifications by Explorer**:
   Per Explorer constraints, this investigation is read-only. Detailed proposed code snippets and step-by-step guidance are provided in Section 4 for the Worker.

---

## 4. Conclusion & Implementation Guidance for Worker

### 4.1 Recommended State & Handler Refactoring

In `app/documentos/[id]/conferencia/page.jsx`:

#### 1. Import Domain Calculation Engines and Icons
```javascript
import {
  calculateItemTotal,
  calculateInvoiceTotals,
} from '@/lib/calculations/invoiceTotals';
import { decimalCompare } from '@/lib/calculations/decimal';
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
  faSort,
  faSortUp,
  faSortDown,
} from '@fortawesome/free-solid-svg-icons';
```

#### 2. Replace `handleItemChange` with Immutable `itemId`-Keyed Reducer
```javascript
// Edição direta de campo na tabela orientada exclusivamente por itemId estável
const handleItemChange = (itemId, field, value) => {
  setItems((prevItems) =>
    prevItems.map((item) => {
      if (item.id !== itemId) return item;

      // Snapshot imutável no primeiro toque
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

      // Recálculo automático do total da linha com precisão decimal pura
      if (field === 'quantidade' || field === 'valorUnitario') {
        const q = field === 'quantidade' ? value : item.quantidade;
        const u = field === 'valorUnitario' ? value : item.valorUnitario;
        updated.valorTotal = calculateItemTotal(u, q);
      }

      return updated;
    })
  );
  setHasChanges(true);
};
```

#### 3. Add Item-Level and Global Restoration Handlers
```javascript
// Restaura um único item para o snapshot de valor original
const handleRestoreItem = (itemId) => {
  setItems((prevItems) => {
    const next = prevItems.map((item) => {
      if (item.id !== itemId || !item.valorOriginal) return item;
      return {
        ...item,
        ...item.valorOriginal,
        modificado: false,
        valorOriginal: null,
      };
    });
    const anyModified = next.some((it) => it.modificado);
    setHasChanges(anyModified);
    return next;
  });
  toast.info('Item restaurado para o valor original.');
};

// Restaura todos os itens modificados de volta ao baseline original
const handleRestoreAll = () => {
  setItems((prevItems) =>
    prevItems.map((item) => {
      if (!item.valorOriginal) return item;
      return {
        ...item,
        ...item.valorOriginal,
        modificado: false,
        valorOriginal: null,
      };
    })
  );
  setHasChanges(false);
  toast.info('Todos os itens foram restaurados.');
};
```

#### 4. Add Sorting Support
```javascript
const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

const handleSort = (key) => {
  setSortConfig((prev) => {
    if (prev.key === key) {
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    }
    return { key, direction: 'asc' };
  });
};

const filteredAndSortedItems = useMemo(() => {
  let result = items;

  // Filtro por busca textual (código, descrição, NCM ou CFOP)
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    result = result.filter(
      (it) =>
        it.codigo?.toLowerCase().includes(term) ||
        it.descricao?.toLowerCase().includes(term) ||
        it.ncm?.toLowerCase().includes(term) ||
        it.cfop?.toLowerCase().includes(term)
    );
  }

  // Ordenação de colunas
  if (sortConfig.key) {
    result = [...result].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      // Ordenação numérica decimal para campos monetários / quantitativos
      if (['quantidade', 'valorUnitario', 'valorTotal'].includes(sortConfig.key)) {
        const cmp = decimalCompare(valA || '0', valB || '0');
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      }

      if (sortConfig.key === 'item') {
        const numA = Number(valA || 0);
        const numB = Number(valB || 0);
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }

      // Ordenação alfanumérica padrão
      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      const cmp = strA.localeCompare(strB);
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }

  return result;
}, [items, searchTerm, sortConfig]);
```

#### 5. Safe Decimal Recalculation for Totals & Save
```javascript
// Totais calculados dinamicamente via motor fiscal centralizado
const computedTotals = useMemo(() => {
  return calculateInvoiceTotals(items, invoice?.totais || {});
}, [items, invoice?.totais]);

// Salvar alterações preservando frete, seguro, descontos e outras despesas
const handleSave = async () => {
  try {
    const updatedInvoice = {
      ...invoice,
      itens: items,
      totais: {
        ...invoice.totais,
        ...computedTotals,
      },
    };

    await invoiceRepository.update(id, updatedInvoice);
    setInvoice(updatedInvoice);
    setHasChanges(false);
    toast.success('Alterações salvas com sucesso!');
  } catch (e) {
    toast.error('Erro ao salvar.');
  }
};
```

#### 6. Keyboard Navigation Handler
```javascript
const handleKeyDown = (e, rowIndex, colKey) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const nextInput = document.querySelector(
      `input[data-row="${rowIndex + 1}"][data-col="${colKey}"]`
    );
    if (nextInput) {
      nextInput.focus();
      nextInput.select?.();
    }
  } else if (e.key === 'Escape') {
    e.target.blur();
  }
};
```

#### 7. Table Rendering Adjustments
- In each `<tr>`: use `key={item.id}`.
- In each `<input>`: pass `item.id`, `data-row={index}`, `data-col="fieldName"`, and `onKeyDown={(e) => handleKeyDown(e, index, 'fieldName')}`.
  Example:
  ```jsx
  <input
    type="text"
    data-row={index}
    data-col="quantidade"
    value={item.quantidade || ''}
    onChange={(e) => handleItemChange(item.id, 'quantidade', e.target.value)}
    onKeyDown={(e) => handleKeyDown(e, index, 'quantidade')}
    className="w-full px-1.5 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent font-mono text-right focus:bg-white dark:focus:bg-slate-900"
  />
  ```
- Add action column with restore button when modified:
  ```jsx
  <td className="px-2 py-1.5 text-center">
    {item.modificado && item.valorOriginal && (
      <button
        type="button"
        onClick={() => handleRestoreItem(item.id)}
        className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
        title="Restaurar valor original"
      >
        <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3" />
      </button>
    )}
  </td>
  ```
- In the Total column: display current total, and if modified, show strikethrough original total:
  ```jsx
  <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
    <div>{formatBRL(item.valorTotal)}</div>
    {item.modificado && item.valorOriginal && (
      <div className="text-[10px] text-slate-400 line-through">
        {formatBRL(item.valorOriginal.valorTotal)}
      </div>
    )}
  </td>
  ```
- In top bar: add "Restaurar Tudo" button when `items.some(i => i.modificado)`:
  ```jsx
  {items.some((i) => i.modificado) && (
    <Button
      buttonType="secondary"
      size="small"
      outline
      onClick={handleRestoreAll}
    >
      <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5 mr-1" />
      Restaurar Todos
    </Button>
  )}
  ```
- Add origin badge in header:
  ```jsx
  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
    invoice.isRealImport
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  }`}>
    {invoice.isRealImport ? 'XML Modelo 55 (Sessão)' : 'Demonstração'}
  </span>
  ```

---

## 5. Verification Method

### 5.1 Automated Test Execution

Run the following test suites to verify that the domain calculations and conference editing flow remain 100% compliant:

```powershell
# 1. Flow B Integration Test (Conferência com Edição Estável e Recálculo Decimal)
node --no-warnings --test tests/integration/flow_b_conferencia_stable_edit.test.mjs

# 2. Tier 1 M2 Domain Services (Decimal, InvoiceTotals, Division, Repository)
node --no-warnings --test tests/tier1/m2_domain.test.mjs

# 3. Tier 5 M2 Stress and Concurrency
node --no-warnings --test tests/tier5/m2_*.test.mjs
```

### 5.2 Manual Browser Verification

1. Start dev server: `pnpm dev`
2. Open `http://localhost:3000/documentos/demo-01/conferencia`
3. Filter by NCM `12019000` (Soja). Only Soja appears in the table.
4. Edit quantity from `120.0000` to `150.0000`.
5. Clear the search bar.
6. Verify:
   - Item 1 (Café) is STILL `500.0000` (untouched).
   - Item 2 (Soja) is `150.0000` and flagged with amber background / modified status.
   - Original total `R$ 42.000,00` is displayed in strikethrough next to `R$ 52.500,00`.
7. Click the restore icon on Item 2. Verify it reverts to `120.0000`.
8. Sort by Total descending. Edit the first row. Verify the correct item is modified.
9. Click "Salvar Edições". Check that the total NF-e includes `valorFrete` (`R$ 5.000,00`) and `valorSeguro` (`R$ 1.200,00`) without being overwritten.
10. Open `demo-05` (15 items with repeated codes `SOJA-GR-01`). Edit item 4 (Lote L02). Verify item 1 (Lote L01) remains untouched.

### 5.3 Invalidation Conditions
- Any occurrence of `copy[index]` indexed by visual array index in `handleItemChange`.
- Any call to `parseFloat(...)` or `.toFixed(2)` in `app/documentos/[id]/conferencia/page.jsx`.
- Replacement of `totais.valorTotalNota` with a sum of products lacking freight and insurance.
- Failure of any test in `flow_b_conferencia_stable_edit.test.mjs`.
