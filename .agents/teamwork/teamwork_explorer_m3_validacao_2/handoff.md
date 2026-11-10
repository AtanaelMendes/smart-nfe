# Handoff Report: Undo Mechanism & Automatic Re-validation (Feature 14 / Milestone 3)

**Author**: `teamwork_explorer_m3_validacao_2`  
**Role**: Explorer (Read-only Investigation & Synthesis)  
**Target Milestone**: `Milestone 3: M3_Validation_Safety_Assistant_Undo`  
**Scope**: Feature 14 (Undo Mechanism & Automatic Re-validation), synthesized with Feature 13 (Explicit Confirmation) and Feature 15 (Safe Bulk Fix)  
**Date**: 2026-11-09T20:46:00Z  

---

## 1. Observation

### 1.1 Current Fix Application & State Loss in `app/documentos/[id]/validacao/page.jsx`
Direct examination of `app/documentos/[id]/validacao/page.jsx` demonstrates that fiscal fixes currently overwrite item values immediately without capturing or storing prior values:

- **Lines 81–99 (`handleApplyFix`)**:
```javascript
  // Assistente: Aplicar correção de 1-Clique em um apontamento individual
  const handleApplyFix = async (issue) => {
    try {
      setFixingId(issue.id);
      const patch = { [issue.campo]: issue.esperado };

      await invoiceRepository.updateItem(id, issue.itemId, patch);
      toast.success(
        `Item ${issue.itemNumero}: ${issue.campo} ajustado para "${issue.esperado}".`
      );

      // Recarrega os dados após a mutação
      await loadData();
    } catch {
      toast.error('Erro ao aplicar correção.');
    } finally {
      setFixingId(null);
    }
  };
```

- **Lines 101–119 (`handleFixAll`)**:
```javascript
  // Assistente: Aplicar todas as correções sugeridas automaticamente (1-Clique global)
  const handleFixAll = async () => {
    if (issues.length === 0) return;

    try {
      setIsFixingAll(true);
      for (const issue of issues) {
        const patch = { [issue.campo]: issue.esperado };
        await invoiceRepository.updateItem(id, issue.itemId, patch);
      }

      toast.success(`Todas as ${issues.length} pendências foram corrigidas com sucesso!`);
      await loadData();
    } catch {
      toast.error('Erro ao aplicar correções automáticas.');
    } finally {
      setIsFixingAll(false);
    }
  };
```

**Deficiencies Observed**:
1. Neither `handleApplyFix` nor `handleFixAll` inspects `invoice.itens` to capture the previous value of `item[issue.campo]`.
2. There is no `undoStack` or history tracking in React state.
3. Once `invoiceRepository.updateItem` is called, the document in storage (session Map or LocalStorage) is immediately mutated.
4. Calling `loadData()` replaces `invoice` and `issues` state with the newly mutated data. The user has no way to reverse the correction.

---

### 1.2 Deep Repository Investigation: `app/features/invoiceRepository.js`
An investigation of `invoiceRepository.updateItem` (lines 273–409) revealed two critical behavioral traps that would break Undo if not addressed:

#### A. Trap 1: Premature Recalculation of `valorTotal` (Line 333)
Lines 330–334:
```javascript
      // Recalcula o valor total da linha com precisão decimal se preço ou quantidade mudaram
      const qty = updatedItem.quantidade;
      const unitPrice = updatedItem.valorUnitario;
      updatedItem.valorTotal = calculateItemTotal(unitPrice, qty);
```
Although the code comment states *"se preço ou quantidade mudaram"*, line 333 executes **unconditionally**.  
When a user attempts to undo a math discrepancy correction (e.g., reverting `d4-5.valorTotal` from `4500.00` back to `4000.00`), passing `{ valorTotal: '4000.00' }` to `updateItem` has its `valorTotal` immediately overwritten by `calculateItemTotal(45, 100) = 4500.00`!

**Direct Verification via Node Execution**:
```bash
node -e "import('./app/features/invoiceRepository.js').then(async ({ invoiceRepository }) => {
  await invoiceRepository.resetDemoData();
  await invoiceRepository.updateItem('demo-04', 'd4-5', { valorTotal: '4500.00' });
  await invoiceRepository.updateItem('demo-04', 'd4-5', { valorTotal: '4000.00' });
  const doc = await invoiceRepository.findById('demo-04');
  console.log('valorTotal after undo attempt:', doc.itens.find(i => i.id === 'd4-5').valorTotal);
})"
```
**Output**:
```
valorTotal after undo attempt: 4500.00
```
*Result*: Without a guard, `valorTotal` cannot be undone because line 333 forces it back to the mathematically calculated value.

#### B. Trap 2: Destructive Filtering of Mock Inconsistencies (Line 358)
Lines 357–371:
```javascript
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
```
When `unidade` is fixed to `PAR`, `updatedItem.inconsistencias` filters out `unidade` and becomes `[]`.  
If the user subsequently clicks Undo to revert `unidade` back to `METROS`, line 431 of `getValidationIssues` checks:
```javascript
      if (mockIncMap.has('unidade')) {
```
Because `item.inconsistencias` was emptied, `mockIncMap` does not have `unidade`, and the issue fails to reappear!

**Direct Verification via Node Execution**:
```bash
node -e "import('./app/features/invoiceRepository.js').then(async ({ invoiceRepository }) => {
  await invoiceRepository.resetDemoData();
  await invoiceRepository.updateItem('demo-04', 'd4-11', { unidade: 'PAR' });
  await invoiceRepository.updateItem('demo-04', 'd4-11', { unidade: 'METROS' });
  const issues = await invoiceRepository.getValidationIssues('demo-04');
  console.log('issues count after undo METROS:', issues.length, issues.map(i => i.campo));
})"
```
**Output**:
```
issues count after undo METROS: 3 [ 'cfop', 'valorTotal', 'ncm' ]
```
*Result*: Only 3 issues re-appear instead of 4 because `unidade` was permanently purged from `item.inconsistencias`.

---

### 1.3 Behavioral Contracts in `tests/integration/flow_d_validation_safe_fix_undo.test.mjs`
Inspection of `tests/integration/flow_d_validation_safe_fix_undo.test.mjs` demonstrates the formal testing contract:

- **Undo Entry Contract (lines 93–101)**:
```javascript
    const undoEntry = {
      issueId: issue.id,
      itemId: issue.itemId,
      campo: issue.campo,
      valorAnterior,
      valorNovo,
      timestamp: new Date().toISOString(),
    };
    this.undoStack.push(undoEntry);
```

- **Undo Execution Contract (lines 153–171)**:
```javascript
  async undo() {
    if (this.undoStack.length === 0) {
      return { success: false, reason: 'Pilha de Undo vazia' };
    }

    const lastAction = this.undoStack.pop();
    await invoiceRepository.updateItem(this.invoiceId, lastAction.itemId, {
      [lastAction.campo]: lastAction.valorAnterior,
    });

    // Reexecuta validações para atualizar a interface
    const revalidatedIssues = await this.getIssues();

    return {
      success: true,
      restored: lastAction,
      remainingIssues: revalidatedIssues,
    };
  }
```

- **Test Suite Results**:
```bash
node --no-warnings --test tests/integration/flow_d_validation_safe_fix_undo.test.mjs
```
```text
▶ Fluxo D — Detecção de Apontamentos Fiscais (R2)
  ✔ Detecta os 4 apontamentos fiscais previstos no cenário demo-04 (4.38ms)
▶ Fluxo D — Exigência de Confirmação Explícita e Cancelamento (R2)
  ✔ Gera payload completo para o modal de confirmação com valores e origem da regra (2.79ms)
  ✔ Não altera o documento quando o usuário clica em Cancelar no modal de confirmação (4.15ms)
  ✔ Aplica a correção quando o usuário confirma explicitamente e registra no Undo (8.41ms)
▶ Fluxo D — Bloqueio de Aplicação em Massa para Campos Sensíveis (R2)
  ✔ Corrigir Todas aplica apenas correções mecânicas e bloqueia CFOP e NCM em massa (11.68ms)
▶ Fluxo D — Mecanismo de Undo com Reversão Atômica e Reexecução (R2)
  ✔ Executa Undo de uma correção revertendo o valor e reabrindo o apontamento fiscal (8.39ms)
  ✔ Suporta múltiplos Undos sequenciais em ordem LIFO restaurando o estado original completo (13.17ms)
ℹ tests 7 | pass 7 | fail 0
```

---

### 1.4 Toast System in `app/context/AppContext.jsx` and `ToastContainer.jsx`
- In `app/context/AppContext.jsx`:
```javascript
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);
```
- In `app/components/Layouts/ToastContainer.jsx`:
```jsx
  <span className="flex-1 text-sm font-medium">{toast.message}</span>
```
Because `toast.message` is rendered inside a React span, passing a JSX node as the toast message is fully supported, allowing an interactive "Desfazer" action button inside the toast notification.

---

## 2. Logic Chain

1. **Safety Requirement (R2)**:
   Per `ORIGINAL_REQUEST.md` R2, every fiscal alteration must preserve previous values and provide an immediate Undo capability that restores previous state and automatically re-executes validations.

2. **State Storage (`undoStack`)**:
   `undoStack` should be maintained in `ValidacaoPage` as a state array:
   ```javascript
   const [undoStack, setUndoStack] = useState([]);
   ```
   Each entry must contain:
   `{ id, issueId, itemId, itemNumero, itemDescricao, campo, valorAnterior, valorNovo, timestamp, batchId, regra }`.
   This satisfies the dispatch requirement and aligns with `flow_d_validation_safe_fix_undo.test.mjs`.

3. **Pre-Fix Value Capture**:
   Immediately before any fix is applied (in single confirmation modal or bulk mechanical review), the system locates the target item in `invoice.itens` and reads `currentItem[issue.campo]`. If missing, it falls back to `issue.encontrado`. This guarantees capturing the actual value in state prior to mutation.

4. **Reversion Mechanism (`handleUndo`)**:
   - Pops the top entry (or targets a specified entry) from `undoStack`.
   - Reverts the field in the database:
     `await invoiceRepository.updateItem(id, entry.itemId, { [entry.campo]: entry.valorAnterior })`.
   - Removes the entry from `undoStack`.
   - Issues a notification toast: *"Alteração desfeita: Item #X (campo) restaurado para Y"*.
   - Automatically executes `await loadData()`.
   - `loadData()` fetches the updated invoice and calls `invoiceRepository.getValidationIssues(id)`. Because the value is back to its uncorrected state, the validation engine dynamically recreates the issue card, restoring the item to "inconsistente" and updating KPI counters.

5. **Multi-Step & Bulk Undo Consistency**:
   - **Multi-step sequential (LIFO)**: Pops one entry at a time in reverse chronological order. Each step restores the state of that specific item/field and triggers `loadData()`.
   - **Bulk Batch Undo**: When mechanical fixes are applied together, they receive a shared `batchId`. The user can undo the entire batch in one click: the system reverses all entries belonging to `batchId` in reverse order, removes them from `undoStack`, and triggers a single re-validation `loadData()`.
   - **Selective Undo (via History Modal)**: In the validation screen, each item has at most one issue per field (`cfop`, `ncm`, `valorTotal`, `unidade`). Thus, undoing an entry from the history list is orthogonal to other items and fields, maintaining total state consistency.

6. **Repository Hardening in `invoiceRepository.js`**:
   To ensure that `updateItem` does not corrupt or block rollbacks:
   - Guard `valorTotal` recalculation: do not overwrite `partialItemData.valorTotal` when passed explicitly without `quantidade` or `valorUnitario`.
   - In `valorOriginal`, preserve `inconsistencias: deepClone(currentItem.inconsistencias || [])`.
   - In `updateItem`, filter inconsistencies against `sourceInconsistencias = currentItem.valorOriginal?.inconsistencias || currentItem.inconsistencias || []`, allowing mock issues (like `unidade`) to reappear dynamically upon undo.

7. **UI Presentation for Undo**:
   - **In Toast**: Render an inline button `[Desfazer]` within the success toast notification.
   - **Top Header Action Bar**: A visible button `"Desfazer Última Alteração ({undoStack.length})"` with icon `faRotateLeft`.
   - **Interactive Banner**: An amber alert strip positioned above the issue cards showing the last modification with a prominent `"Desfazer Alteração"` button and `"Ver Histórico ({undoStack.length})"`.
   - **"Histórico de Alterações" Modal**: Detailed modal listing all applied alterations in reverse order, showing before/after values, timestamps, and individual "Desfazer Esta" buttons as well as a "Desfazer Todas" bulk action.

---

## 3. Caveats

- **Scope Boundary**: As an Explorer, this agent operates under strict read-only constraints. Code source files are not modified directly. Complete code replacements, diffs, and step-by-step guidance are provided for the implementation Worker.
- **Session Scope of `undoStack`**: The `undoStack` is held in React component state. If the user navigates away to another page (e.g. `/documentos`) and returns, the validation screen initializes clean. This is standard behavior; permanent historical auditing is not required by R2.
- **Synthesis with Features 13 & 15**: Features 13 (single confirmation modal by Explorer 1) and 15 (safe "Corrigir todas" review modal by Explorer 3) both trigger mutations. The Worker must integrate the pre-fix capture into both `handleConfirmFix` (Feature 13) and `handleApplySelectedMechanicalFixes` (Feature 15).

---

## 4. Conclusion & Step-by-Step Implementation Guidance for the Worker

The Worker should perform the following changes in order:

### 4.1 Update `app/features/invoiceRepository.js`

#### Change 1: Guard `valorTotal` recalculation in `updateItem`
In `app/features/invoiceRepository.js`, replace lines 330–334:
```javascript
<<<< CURRENT CODE (lines 330–334):
      // Recalcula o valor total da linha com precisão decimal se preço ou quantidade mudaram
      const qty = updatedItem.quantidade;
      const unitPrice = updatedItem.valorUnitario;
      updatedItem.valorTotal = calculateItemTotal(unitPrice, qty);
==== PROPOSED REPLACEMENT:
      // Preserva valorTotal quando passado explicitamente sem alteração de preço/quantidade (ex: undo/correção matemática)
      if (
        partialItemData.valorTotal !== undefined &&
        partialItemData.quantidade === undefined &&
        partialItemData.valorUnitario === undefined
      ) {
        updatedItem.valorTotal = partialItemData.valorTotal;
      } else if (
        partialItemData.quantidade !== undefined ||
        partialItemData.valorUnitario !== undefined
      ) {
        const qty = updatedItem.quantidade;
        const unitPrice = updatedItem.valorUnitario;
        updatedItem.valorTotal = calculateItemTotal(unitPrice, qty);
      }
>>>>
```

#### Change 2: Preserve snapshot of `inconsistencias` in `valorOriginal` and non-destructive filter
In `app/features/invoiceRepository.js`, replace lines 309–321 and 357–372:
```javascript
<<<< CURRENT CODE (lines 309–321):
      // Cria snapshot imutável do valor original na primeira alteração
      if (!currentItem.valorOriginal) {
        currentItem.valorOriginal = {
          codigo: currentItem.codigo,
          descricao: currentItem.descricao,
          ncm: currentItem.ncm,
          cfop: currentItem.cfop,
          unidade: currentItem.unidade,
          quantidade: currentItem.quantidade,
          valorUnitario: currentItem.valorUnitario,
          valorTotal: currentItem.valorTotal,
        };
      }
==== PROPOSED REPLACEMENT:
      // Cria snapshot imutável do valor original na primeira alteração
      if (!currentItem.valorOriginal) {
        currentItem.valorOriginal = {
          codigo: currentItem.codigo,
          descricao: currentItem.descricao,
          ncm: currentItem.ncm,
          cfop: currentItem.cfop,
          unidade: currentItem.unidade,
          quantidade: currentItem.quantidade,
          valorUnitario: currentItem.valorUnitario,
          valorTotal: currentItem.valorTotal,
          inconsistencias: deepClone(currentItem.inconsistencias || []),
        };
      }
>>>>
```
And replace lines 357–372:
```javascript
<<<< CURRENT CODE (lines 357–372):
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
==== PROPOSED REPLACEMENT:
      const sourceInconsistencias =
        currentItem.valorOriginal?.inconsistencias || currentItem.inconsistencias || [];
      if (Array.isArray(sourceInconsistencias) && sourceInconsistencias.length > 0) {
        updatedItem.inconsistencias = sourceInconsistencias.filter((inc) => {
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
>>>>
```

---

### 4.2 Update `app/documentos/[id]/validacao/page.jsx`

#### Step 1: Icons Import
At the top of `page.jsx`, add `faClockRotateLeft`, `faTrashCan`, `faHistory` to FontAwesome imports if desired (note: `faRotateLeft` is already imported).

#### Step 2: State Declarations
In `ValidacaoPage`:
```javascript
  // Feature 14: Mecanismo de Desfazer (Undo Stack)
  const [undoStack, setUndoStack] = useState([]);
  const [isUndoing, setIsUndoing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
```

#### Step 3: Pre-Fix Helper Function
```javascript
  /**
   * Captura o valor anterior e cria uma entrada padronizada para a pilha de Undo.
   */
  const captureUndoEntry = (issue, batchId = null) => {
    const currentItem = invoice?.itens?.find((i) => i.id === issue.itemId);
    const valorAnterior = currentItem ? currentItem[issue.campo] : issue.encontrado;
    const valorNovo = issue.esperado;

    return {
      id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      issueId: issue.id,
      itemId: issue.itemId,
      itemNumero: issue.itemNumero,
      itemDescricao: issue.itemDescricao,
      campo: issue.campo,
      valorAnterior,
      valorNovo,
      timestamp: new Date().toISOString(),
      batchId,
      regra: issue.regra || 'Regra Fiscal',
    };
  };
```

#### Step 4: `handleUndo` and `handleUndoBatch` Implementation
```javascript
  /**
   * Desfaz uma alteração individual (LIFO ou entrada específica do histórico).
   */
  const handleUndo = async (targetEntry = null) => {
    const entryToUndo = targetEntry || undoStack[undoStack.length - 1];
    if (!entryToUndo) return;

    try {
      setIsUndoing(true);

      // 1. Reverte o valor no repositório
      await invoiceRepository.updateItem(id, entryToUndo.itemId, {
        [entryToUndo.campo]: entryToUndo.valorAnterior,
      });

      // 2. Remove a entrada da pilha de Undo
      setUndoStack((prev) => prev.filter((e) => e.id !== entryToUndo.id));

      // 3. Notifica o usuário
      toast.info(
        `Alteração desfeita: Item #${entryToUndo.itemNumero} (${entryToUndo.campo}) revertido para "${entryToUndo.valorAnterior}".`
      );

      // 4. Reexecuta auditoria fiscal automaticamente
      await loadData();
    } catch (err) {
      console.error('Erro ao desfazer alteração:', err);
      toast.error('Erro ao desfazer alteração.');
    } finally {
      setIsUndoing(false);
    }
  };

  /**
   * Desfaz todas as alterações de um lote gerado em massa ("Corrigir todas").
   */
  const handleUndoBatch = async (batchId) => {
    const batchEntries = undoStack.filter((e) => e.batchId === batchId);
    if (batchEntries.length === 0) return;

    try {
      setIsUndoing(true);

      // Reverte em ordem inversa à aplicação
      for (const entry of [...batchEntries].reverse()) {
        await invoiceRepository.updateItem(id, entry.itemId, {
          [entry.campo]: entry.valorAnterior,
        });
      }

      const batchIdsSet = new Set(batchEntries.map((e) => e.id));
      setUndoStack((prev) => prev.filter((e) => !batchIdsSet.has(e.id)));

      toast.info(`Lote de ${batchEntries.length} correções revertido com sucesso.`);
      await loadData();
    } catch (err) {
      console.error('Erro ao reverter lote:', err);
      toast.error('Erro ao reverter lote de alterações.');
    } finally {
      setIsUndoing(false);
    }
  };

  /**
   * Desfaz todas as alterações presentes na pilha de Undo (restauração completa).
   */
  const handleUndoAll = async () => {
    if (undoStack.length === 0) return;

    try {
      setIsUndoing(true);
      for (const entry of [...undoStack].reverse()) {
        await invoiceRepository.updateItem(id, entry.itemId, {
          [entry.campo]: entry.valorAnterior,
        });
      }
      setUndoStack([]);
      toast.info('Todas as alterações foram desfeitas com sucesso.');
      setShowHistoryModal(false);
      await loadData();
    } catch {
      toast.error('Erro ao desfazer todas as alterações.');
    } finally {
      setIsUndoing(false);
    }
  };
```

#### Step 5: Integration with Fix Handlers
When applying a fix (e.g., in `handleConfirmFix` for Feature 13 or `handleApplyFix`):
```javascript
  // Grava na pilha de Undo e notifica com botão de desfazer na notificação toast
  const undoEntry = captureUndoEntry(issue);
  await invoiceRepository.updateItem(id, issue.itemId, { [issue.campo]: issue.esperado });
  setUndoStack((prev) => [...prev, undoEntry]);

  // Toast com ação interativa de Desfazer
  toast.success(
    <div className="flex items-center justify-between gap-3 w-full">
      <span>Item #{issue.itemNumero}: {issue.campo} ajustado para &quot;{issue.esperado}&quot;.</span>
      <button
        type="button"
        onClick={() => handleUndo(undoEntry)}
        className="font-bold underline hover:opacity-80 text-xs px-1.5 py-0.5 rounded bg-green-600/40 cursor-pointer"
      >
        Desfazer
      </button>
    </div>,
    6000
  );

  await loadData();
```

When applying batch mechanical fixes (Feature 15):
```javascript
  const batchId = `batch-${Date.now()}`;
  const batchEntries = [];
  for (const issue of issuesToApply) {
    const entry = captureUndoEntry(issue, batchId);
    batchEntries.push(entry);
    await invoiceRepository.updateItem(id, issue.itemId, { [issue.campo]: issue.esperado });
  }
  setUndoStack((prev) => [...prev, ...batchEntries]);
  toast.success(`${issuesToApply.length} correções mecânicas aplicadas com sucesso!`);
  await loadData();
```

---

#### Step 6: UI Components for Undo

##### A. Header Action Buttons
In the top header flex bar (around line 210 of `page.jsx`):
```jsx
{undoStack.length > 0 && (
  <div className="flex items-center gap-1.5">
    <Button
      buttonType="secondary"
      size="small"
      outline
      onClick={() => handleUndo()}
      disabled={isUndoing}
      title={`Desfazer última alteração: ${undoStack[undoStack.length - 1].campo} no Item #${undoStack[undoStack.length - 1].itemNumero}`}
    >
      <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5 mr-1 text-amber-500" />
      {isUndoing ? 'Desfazendo...' : `Desfazer Última (${undoStack.length})`}
    </Button>

    <Button
      buttonType="secondary"
      size="small"
      outline
      onClick={() => setShowHistoryModal(true)}
      title="Ver histórico detalhado de alterações"
    >
      <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5 mr-1 text-slate-500" />
      Histórico
    </Button>
  </div>
)}
```

##### B. Persistent Undo Notification Banner
Immediately below the KPI summary grid (around line 292 of `page.jsx`):
```jsx
{undoStack.length > 0 && (
  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
    <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
      <div className="w-8 h-8 rounded-full bg-amber-200/70 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
        <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4 text-amber-700 dark:text-amber-400" />
      </div>
      <div>
        <p className="font-bold">
          Última alteração aplicada: Item #{undoStack[undoStack.length - 1].itemNumero} ({undoStack[undoStack.length - 1].campo})
        </p>
        <p className="text-[11px] text-amber-800 dark:text-amber-300">
          Modificado de <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">{String(undoStack[undoStack.length - 1].valorAnterior)}</code> para{' '}
          <code className="font-mono font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 px-1 py-0.5 rounded">{String(undoStack[undoStack.length - 1].valorNovo)}</code>.
          {undoStack.length > 1 && (
            <span className="ml-1 font-semibold text-amber-700 dark:text-amber-400">
              ({undoStack.length} alterações na pilha)
            </span>
          )}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        type="button"
        onClick={() => handleUndo()}
        disabled={isUndoing}
        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3" />
        {isUndoing ? 'Desfazendo...' : 'Desfazer Última Alteração'}
      </button>

      {undoStack.length > 1 && (
        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
        >
          Histórico ({undoStack.length})
        </button>
      )}
    </div>
  </div>
)}
```

##### C. "Histórico de Alterações" Modal
Rendered at the bottom of `ValidacaoPage`:
```jsx
{showHistoryModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="history-modal-title"
  >
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4" />
          </div>
          <div>
            <h2 id="history-modal-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Histórico de Alterações Fiscais (Pilha de Desfazer)
            </h2>
            <span className="text-[11px] text-slate-500">
              {undoStack.length} {undoStack.length === 1 ? 'modificação registrada' : 'modificações registradas'} nesta sessão
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHistoryModal(false)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
        >
          ✕
        </button>
      </div>

      {/* Lista de Entradas em Ordem LIFO (Mais recente no topo) */}
      <div className="p-5 overflow-y-auto space-y-2.5 flex-1 text-xs">
        {undoStack.length === 0 ? (
          <p className="text-center text-slate-500 py-6">Nenhuma alteração registrada.</p>
        ) : (
          [...undoStack].reverse().map((entry, idx) => (
            <div
              key={entry.id}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Item #{entry.itemNumero} — {entry.itemDescricao}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    {entry.campo}
                  </span>
                  {idx === 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Topo da Pilha
                    </span>
                  )}
                  {entry.batchId && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                      Lote
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500">Antes:</span>
                  <span className="font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-1 rounded">
                    {String(entry.valorAnterior)}
                  </span>
                  <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 text-slate-400" />
                  <span className="text-slate-500">Agora:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1 rounded">
                    {String(entry.valorNovo)}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-2">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <Button
                buttonType="secondary"
                size="small"
                outline
                onClick={() => handleUndo(entry)}
                disabled={isUndoing}
                title="Desfazer esta alteração específica"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3 mr-1 text-amber-500" />
                Desfazer
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Rodapé com Desfazer Todas */}
      <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
        <Button
          buttonType="danger"
          size="small"
          outline
          onClick={handleUndoAll}
          disabled={isUndoing || undoStack.length === 0}
          title="Desfaz todas as alterações e restaura estado inicial da sessão"
        >
          Desfazer Todas as Alterações
        </Button>

        <Button
          buttonType="secondary"
          size="small"
          onClick={() => setShowHistoryModal(false)}
        >
          Fechar
        </Button>
      </div>

    </div>
  </div>
)}
```

---

## 5. Verification Method

### 5.1 Automated Test Execution
Run the full integration test suite covering Fluxo D:
```powershell
node --no-warnings --test tests/integration/flow_d_validation_safe_fix_undo.test.mjs
```
**Expected Outcome**: 7 passing tests, 0 failures.  
Specifically confirms:
- Pilha LIFO de Undo: `undoStack` registra e reverte sequencialmente (`pass`).
- Reexecução automática de validações reabrindo o apontamento (`pass`).

Run all integration tests:
```powershell
node --no-warnings --test tests/integration/*.test.mjs
```
**Expected Outcome**: 43 passing tests across Fluxos A, B, C, D with 0 failures.

### 5.2 Manual Browser Verification Steps
1. In development (`pnpm dev`), open `http://localhost:3000/documentos/demo-04/validacao`.
2. Verify 4 initial inconsistencies are displayed.
3. Apply fix on Item 3 (CFOP 5102 -> 7101):
   - **Check**: Success toast appears with an interactive "Desfazer" link.
   - **Check**: Header displays `"Desfazer Última (1)"`.
   - **Check**: Amber banner appears below KPIs showing the CFOP change.
4. Apply fix on Item 5 (Math discrepancy 4000.00 -> 4500.00):
   - **Check**: Header updates to `"Desfazer Última (2)"`.
   - **Check**: Banner reflects Item 5 as latest change and indicates `(2 alterações na pilha)`.
5. Click `"Desfazer Última Alteração"`:
   - **Check**: Reverts Item 5 back to `4000.00`.
   - **Check**: `loadData()` automatically re-runs; math discrepancy re-appears in the list.
   - **Check**: Stack count decrements to 1.
6. Click `"Desfazer Última Alteração"` again:
   - **Check**: Reverts Item 3 CFOP back to `5102`.
   - **Check**: CFOP issue re-appears; all 4 initial issues are back.
   - **Check**: Undo buttons and banner cleanly unmount.

### 5.3 Invalidation Conditions
- If calling Undo does not automatically re-execute `loadData()` and leave issues stale.
- If reverting `valorTotal` fails to restore `4000.00` because `invoiceRepository.js` line 333 recalculated it prematurely.
- If reverting `unidade` fails to restore the mock inconsistency because line 358 deleted it destructively.
- If `undoStack` corrupts or does not preserve exact previous values.

---
*Report complete and ready for Milestone 3 implementation worker.*
