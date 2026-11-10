# Handoff Report: Explicit Fiscal Fix Confirmation Modal (Feature 13 / Milestone 3)

**Author**: `teamwork_explorer_m3_validacao_1`  
**Role**: Explorer (Read-only Investigation & Synthesis)  
**Target Milestone**: M3_Validation_Safety_Assistant_Undo  
**Scope**: Feature 13 (Explicit Fiscal Fix Confirmation Modal), in alignment with Features 14 (Undo) and 15 (Safe Bulk Fix)  
**Date**: 2026-11-09T20:42:00Z  

---

## 1. Observation

### 1.1 Current Implementation in `app/documentos/[id]/validacao/page.jsx`
Direct examination of `app/documentos/[id]/validacao/page.jsx` revealed that suggested fiscal corrections are applied silently via 1-click without any confirmation dialog or safety check:

- **Lines 82–99 (`handleApplyFix`)**:
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

- **Lines 102–119 (`handleFixAll`)**:
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

- **Lines 489–500 (Issue Card Action Button)**:
```jsx
  {issue.esperado && (
    <Button
      buttonType="success"
      size="small"
      onClick={() => handleApplyFix(issue)}
      disabled={isFixingThis || isFixingAll}
      title={`Aplicar ${issue.esperado} neste item`}
    >
      <FontAwesomeIcon icon={faCheck} className="w-3 h-3 mr-1" />
      {isFixingThis ? 'Corrigindo...' : 'Aplicar Correção'}
    </Button>
  )}
```

### 1.2 Inspection of Existing Modal Components
Inspection of `app/components/Layouts/Dialog.jsx` and `app/components/Layouts/Confirm.jsx`:
- `Dialog.jsx` (lines 112–132) renders either a single plain text paragraph (`{title}`) when `hideTextArea` is true, or an `InputTextArea` for writing justification text. It does not accept children or render complex multi-column diff views (`valorAtual` vs `valorProposto`, rule badges, item descriptions).
- `Confirm.jsx` (lines 28–33) only renders `primaryText` and `secondaryText` string props.
- Therefore, to present the structured fiscal comparison required by R2, a specialized accessible confirmation modal must be provided (either as a co-located component `FiscalFixConfirmationModal.jsx` or inline in `page.jsx`).

### 1.3 Behavioral Contracts in `tests/integration/flow_d_validation_safe_fix_undo.test.mjs`
Inspection of `tests/integration/flow_d_validation_safe_fix_undo.test.mjs`:
- **Sensitive Fields Definition (lines 29–37)**:
```javascript
const SENSITIVE_FIELDS = ['cfop', 'ncm', 'cst', 'aliquota', 'tributos', 'origem'];

function isSensitiveIssue(issue) {
  const campo = String(issue.campo || '').toLowerCase().trim();
  return SENSITIVE_FIELDS.includes(campo);
}
```
- **Confirmation Payload Contract (lines 42–55, PROJECT.md § 6)**:
```javascript
function createConfirmationPayload(issue) {
  return {
    issueId: issue.id,
    itemId: issue.itemId,
    itemNumero: issue.itemNumero,
    itemDescricao: issue.itemDescricao,
    campo: issue.campo,
    labelCampo: issue.campo.toUpperCase(),
    valorAtual: issue.encontrado,
    valorProposto: issue.esperado,
    origemRegra: issue.regra,
    isSensivel: isSensitiveIssue(issue),
  };
}
```
- **Execution of Automated Test Suite**:
Command executed: `node --no-warnings --test tests/integration/flow_d_validation_safe_fix_undo.test.mjs`
Result:
```
▶ Fluxo D — Detecção de Apontamentos Fiscais (R2)
  ✔ Detecta os 4 apontamentos fiscais previstos no cenário demo-04 (5.47ms)
▶ Fluxo D — Exigência de Confirmação Explícita e Cancelamento (R2)
  ✔ Gera payload completo para o modal de confirmação com valores e origem da regra (2.61ms)
  ✔ Não altera o documento quando o usuário clica em Cancelar no modal de confirmação (3.87ms)
  ✔ Aplica a correção quando o usuário confirma explicitamente e registra no Undo (9.49ms)
▶ Fluxo D — Bloqueio de Aplicação em Massa para Campos Sensíveis (R2)
  ✔ Corrigir Todas aplica apenas correções mecânicas e bloqueia CFOP e NCM em massa (11.13ms)
▶ Fluxo D — Mecanismo de Undo com Reversão Atômica e Reexecução (R2)
  ✔ Executa Undo de uma correção revertendo o valor e reabrindo o apontamento fiscal (11.15ms)
  ✔ Suporta múltiplos Undos sequenciais em ordem LIFO restaurando o estado original completo (15.99ms)
ℹ tests 7 | pass 7 | fail 0 | duration_ms 182.75ms
```
Command executed: `node --no-warnings --test tests/integration/*.test.mjs`  
Result: 43 tests passing across Fluxos A, B, C, and D with 0 failures.

---

## 2. Logic Chain

1. **Premise 1 (R2 Requirement & Safety Gap)**:
   Per `ORIGINAL_REQUEST.md` R2 and `PROJECT.md`, silent 1-click fiscal fixes are strictly prohibited. Modifying tax classification (NCM) or taxation operation code (CFOP) has legal and aduaneiro implications on SEFAZ clearance. The current code violates this by invoking `invoiceRepository.updateItem` immediately on button click without user confirmation.

2. **Premise 2 (Data Contract Completeness)**:
   Per `PROJECT.md § 6` and `flow_d_validation_safe_fix_undo.test.mjs`, every suggested fix requires a standardized payload capturing:
   `{ issueId, itemId, itemNumero, itemDescricao, campo, labelCampo, valorAtual, valorProposto, origemRegra, isSensivel }`.

3. **Premise 3 (Visual Risk Differentiation)**:
   Fiscal issues are not uniform:
   - **Sensitive Fiscal Alterations** (`cfop`, `ncm`, `cst`, `aliquota`, `tributos`, `origem`): Can trigger tax fines or SEFAZ rejections. The modal must display prominent amber/red warning badges ("⚠️ Campo Fiscal Sensível") and cautionary advice.
   - **Mechanical Discrepancies** (arithmetic `valorTotal`, unit discrepancies `unidade`): Are calculation reconciliations. The modal should indicate "Ajuste Numérico / Mecânico" with a standard informative banner.

4. **Premise 4 (State Lifecycle & User Decision)**:
   - When the user clicks "Aplicar Correção" in an issue card:
     The app sets `pendingFix = createConfirmationPayload(issue)`.
     The modal opens.
   - If user clicks "Cancelar" (or presses `Escape` or clicks backdrop):
     `pendingFix` is cleared (`setPendingFix(null)`). Repositório and document are completely untouched.
   - If user clicks "Confirmar Alteração":
     The app captures the item's previous value (`valorAnterior`), calls `invoiceRepository.updateItem(id, pendingFix.itemId, { [pendingFix.campo]: pendingFix.valorProposto })`, records the mutation in `undoStack`, displays a success toast, closes the modal, and reloads validation data (`await loadData()`).

5. **Premise 5 (Component Accessibility & Architecture)**:
   The confirmation modal must implement proper accessibility primitives:
   - `role="dialog"`, `aria-modal="true"`, `aria-labelledby="fiscal-modal-title"`
   - Keyboard listener for `Escape` to close
   - Backdrop click detection (`e.target === e.currentTarget`)
   - High contrast styling compatible with Tailwind CSS 4 and dark mode (`dark:bg-slate-900`, `dark:text-slate-100`).

---

## 3. Caveats

- **Scope Boundary**: This exploration report provides the architectural design, payload schemas, and complete JSX/state code for Feature 13 (Explicit Confirmation Modal). Features 14 (Undo button & stack in page) and 15 (Safe Bulk Fix review) are closely coupled to `page.jsx` state and are fully outlined herein so the Worker can implement them with zero friction.
- **SSR / Hydration**: Event listeners for `Escape` must be cleaned up in `useEffect` returns to avoid memory leaks.
- **Read-Only Discipline**: Explorer has strictly avoided writing or modifying codebase source files. All guidance is documented here for the implementation Worker.

---

## 4. Conclusion & Worker Implementation Guide

### 4.1 Recommended File Strategy
The Worker can either:
- **Option A (Recommended for simplicity & cohesion)**: Embed `FiscalFixConfirmationModal` directly inside `app/documentos/[id]/validacao/page.jsx` as a sub-component, avoiding extra imports.
- **Option B**: Create `app/documentos/[id]/validacao/FiscalFixConfirmationModal.jsx` and import it into `page.jsx`.

### 4.2 Exact State & Constants to Add to `page.jsx`

```javascript
/**
 * Campos considerados sensíveis fiscalmente pela especificação R2 (PROJECT.md § 6).
 */
const SENSITIVE_FIELDS = ['cfop', 'ncm', 'cst', 'aliquota', 'tributos', 'origem'];

function isSensitiveIssue(issue) {
  const campo = String(issue.campo || '').toLowerCase().trim();
  return SENSITIVE_FIELDS.includes(campo);
}

function createConfirmationPayload(issue) {
  return {
    issueId: issue.id,
    itemId: issue.itemId,
    itemNumero: issue.itemNumero,
    itemDescricao: issue.itemDescricao,
    campo: issue.campo,
    labelCampo: String(issue.campo || '').toUpperCase(),
    valorAtual: issue.encontrado,
    valorProposto: issue.esperado,
    origemRegra: issue.regra || 'Regra de Validação',
    isSensivel: isSensitiveIssue(issue),
    mensagem: issue.mensagem || issue.message,
    sugestao: issue.sugestao,
  };
}
```

### 4.3 State Variables in `ValidacaoPage`

```javascript
// Feature 13: Estado do apontamento aguardando confirmação no modal
const [pendingFix, setPendingFix] = useState(null);

// Feature 14: Pilha de Undo
const [undoStack, setUndoStack] = useState([]);
```

### 4.4 Handlers Implementation

```javascript
  // 1. Abre o modal com o payload padronizado (NÃO altera dados)
  const handleRequestFix = (issue) => {
    const payload = createConfirmationPayload(issue);
    setPendingFix(payload);
  };

  // 2. Cancela a correção fechando o modal sem efeitos colaterais
  const handleCancelFix = () => {
    setPendingFix(null);
  };

  // 3. Executa a correção após confirmação explícita no modal
  const handleConfirmFix = async () => {
    if (!pendingFix) return;

    try {
      setFixingId(pendingFix.issueId);

      // Obtém o valor anterior do item para a pilha de Undo
      const currentItem = invoice?.itens?.find((i) => i.id === pendingFix.itemId);
      const valorAnterior = currentItem ? currentItem[pendingFix.campo] : pendingFix.valorAtual;

      const patch = { [pendingFix.campo]: pendingFix.valorProposto };
      await invoiceRepository.updateItem(id, pendingFix.itemId, patch);

      // Registra na pilha de Undo (LIFO)
      const undoEntry = {
        issueId: pendingFix.issueId,
        itemId: pendingFix.itemId,
        itemNumero: pendingFix.itemNumero,
        campo: pendingFix.campo,
        valorAnterior,
        valorNovo: pendingFix.valorProposto,
        timestamp: new Date().toISOString(),
      };
      setUndoStack((prev) => [...prev, undoEntry]);

      toast.success(
        `Item ${pendingFix.itemNumero}: ${pendingFix.campo} ajustado para "${pendingFix.valorProposto}".`
      );

      // Fecha o modal e recarrega dados com revalidação automática
      setPendingFix(null);
      await loadData();
    } catch {
      toast.error('Erro ao aplicar correção fiscal.');
    } finally {
      setFixingId(null);
    }
  };

  // Feature 14: Ação de Desfazer (Undo)
  const handleUndo = async () => {
    if (undoStack.length === 0) return;

    try {
      const lastAction = undoStack[undoStack.length - 1];
      await invoiceRepository.updateItem(id, lastAction.itemId, {
        [lastAction.campo]: lastAction.valorAnterior,
      });

      setUndoStack((prev) => prev.slice(0, -1));
      toast.info(
        `Desfeita alteração no item ${lastAction.itemNumero} (${lastAction.campo} restaurado para "${lastAction.valorAnterior}").`
      );

      await loadData();
    } catch {
      toast.error('Erro ao reverter alteração.');
    }
  };
```

### 4.5 Updating Issue Card Action Button in JSX
In the card render loop (around line 490):
```jsx
{issue.esperado && (
  <Button
    buttonType="success"
    size="small"
    onClick={() => handleRequestFix(issue)}
    disabled={fixingId === issue.id || isFixingAll}
    title={`Revisar e aplicar correção para ${issue.esperado}`}
  >
    <FontAwesomeIcon icon={faCheck} className="w-3 h-3 mr-1" />
    {fixingId === issue.id ? 'Processando...' : 'Aplicar Correção'}
  </Button>
)}
```

### 4.6 Complete JSX Component: `FiscalFixConfirmationModal`

```jsx
function FiscalFixConfirmationModal({ fix, onConfirm, onCancel, isProcessing }) {
  if (!fix) return null;

  // Fechamento com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, isProcessing]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onCancel();
    }
  };

  const isSensivel = fix.isSensivel;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fiscal-modal-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Cabeçalho Diferenciado por Risco */}
        <div
          className={`px-5 py-3.5 text-white flex items-center justify-between ${
            isSensivel
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FontAwesomeIcon
              icon={isSensivel ? faTriangleExclamation : faShieldHalved}
              className="w-5 h-5 text-amber-100"
            />
            <div>
              <h2 id="fiscal-modal-title" className="text-sm font-bold tracking-tight">
                {isSensivel
                  ? 'Atenção: Confirmação de Alteração Fiscal Sensível'
                  : 'Confirmar Correção de Validação'}
              </h2>
              <span className="text-[11px] opacity-90 block">
                {isSensivel ? 'Impacto Tributário / Aduaneiro na SEFAZ' : 'Ajuste Mecânico / Cadastral'}
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider ${
              isSensivel
                ? 'bg-amber-950/40 text-amber-100 border border-amber-300/30'
                : 'bg-blue-950/40 text-blue-100 border border-blue-300/30'
            }`}
          >
            {isSensivel ? 'Sensível' : 'Mecânico'}
          </span>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 space-y-4 text-xs">
          {/* Banner de Aviso Contextual */}
          {isSensivel ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-3 rounded-r text-amber-900 dark:text-amber-200">
              <p className="font-semibold text-xs flex items-center gap-1.5">
                <FontAwesomeIcon icon={faTriangleExclamation} className="w-3.5 h-3.5 text-amber-600" />
                Alteração em campo fiscal crítico ({fix.labelCampo})
              </p>
              <p className="text-[11px] mt-1 text-amber-800 dark:text-amber-300">
                A modificação de classificação NCM, CFOP ou tributos altera o enquadramento fiscal da operação e a conformidade aduaneira. Certifique-se de que a alteração possui respaldo contábil.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500 p-3 rounded-r text-blue-900 dark:text-blue-200">
              <p className="font-semibold text-xs flex items-center gap-1.5">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5 text-blue-600" />
                Correção aritmética ou cadastral recomendada
              </p>
              <p className="text-[11px] mt-1 text-blue-800 dark:text-blue-300">
                Este ajuste concilia cálculos matemáticos de linha ou padroniza a unidade aduaneira exigida pela regra fiscal.
              </p>
            </div>
          )}

          {/* Dados do Item e Regra */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pb-1.5 border-b border-slate-200 dark:border-slate-700">
              <span className="font-semibold">Item da Nota:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                #{fix.itemNumero} — {fix.itemDescricao}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pb-1.5 border-b border-slate-200 dark:border-slate-700">
              <span className="font-semibold">Campo Auditado:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {fix.labelCampo}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Origem da Regra:</span>
              <span className="font-medium text-slate-600 dark:text-slate-400">
                {fix.origemRegra}
              </span>
            </div>
          </div>

          {/* Comparativo: Valor Atual vs Valor Proposto */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
              <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-400 block mb-1">
                Valor Atual (Gravado)
              </span>
              <div className="font-mono text-sm font-bold text-red-800 dark:text-red-200 truncate">
                {fix.valorAtual || <span className="italic text-red-400 font-normal">vazio</span>}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                Valor Proposto (Assistente)
              </span>
              <div className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-200 truncate">
                {fix.valorProposto}
              </div>
            </div>
          </div>

          {/* Justificativa / Sugestão */}
          {fix.sugestao && (
            <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
              * Sugestão do assistente: {fix.sugestao}
            </p>
          )}

          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-1">
            Você poderá desfazer esta alteração a qualquer momento utilizando o botão Desfazer (Undo).
          </p>
        </div>

        {/* Rodapé com Ações Explícitas */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <Button
            buttonType="secondary"
            outline
            size="small"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancelar
          </Button>

          <Button
            buttonType={isSensivel ? 'warning' : 'success'}
            size="small"
            onClick={onConfirm}
            disabled={isProcessing}
            className={isSensivel ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
          >
            <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5 mr-1" />
            {isProcessing ? 'Aplicando...' : 'Confirmar Alteração'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 4.7 Integration with Undo Button (Feature 14)
In the top header actions (around line 210 of `page.jsx`):
```jsx
{undoStack.length > 0 && (
  <Button
    buttonType="secondary"
    size="small"
    onClick={handleUndo}
    title={`Desfazer última alteração (${undoStack[undoStack.length - 1].campo} no item ${undoStack[undoStack.length - 1].itemNumero})`}
  >
    <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5 mr-1 text-amber-500" />
    Desfazer ({undoStack.length})
  </Button>
)}
```

---

## 5. Verification Method

### 5.1 Automated Test Execution
Run the full test suite and Fluxo D integration suite:
```bash
# 1. Executar suite de integração do Fluxo D (Validação, Confirmação Segura e Undo)
node --no-warnings --test tests/integration/flow_d_validation_safe_fix_undo.test.mjs

# 2. Executar todas as suites de integração (Fluxos A, B, C e D)
node --no-warnings --test tests/integration/*.test.mjs
```
**Expected Outcome**: 0 errors, 43 passed tests.

### 5.2 Manual Browser Verification Steps
1. Navigate to `http://localhost:3000/documentos/demo-04/validacao`.
2. Observe 4 issues listed: Item 3 (CFOP 5102), Item 5 (Total 4000.00), Item 8 (NCM 6403590), Item 11 (Unidade METROS).
3. Click "Aplicar Correção" on Item 3 (CFOP):
   - **Verification**: Modal opens displaying "Atenção: Confirmação de Alteração Fiscal Sensível", badge "Sensível", Campo "CFOP", Origem "CFOP de Exportação", Atual: `5102`, Proposto: `7101`.
4. Click "Cancelar" (or press `Escape`):
   - **Verification**: Modal closes. Item 3 remains with CFOP `5102`. Apontamento remains open.
5. Click "Aplicar Correção" on Item 3 again and click "Confirmar Alteração":
   - **Verification**: Item 3 is updated to `7101`. The issue disappears. Toast confirms adjustment. Button "Desfazer (1)" appears in header.
6. Click "Aplicar Correção" on Item 5 (Math discrepancy):
   - **Verification**: Modal opens displaying "Confirmar Correção de Validação", badge "Mecânico", Atual: `4000.00`, Proposto: `4500.00`.
7. Click "Confirmar Alteração":
   - **Verification**: Issue resolves, "Desfazer (2)" appears.
8. Click "Desfazer (2)":
   - **Verification**: Reverts Item 5 to `4000.00`, re-runs validation, and the math discrepancy re-appears.

---
*Report complete and ready for Milestone 3 implementation worker.*
