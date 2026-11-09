# Relatório de Handoff — Feature 15: Modal de Revisão Segura para "Corrigir Todas" e Bloqueio de Campos Sensíveis

**Agente**: `teamwork_explorer_m3_validacao_3`  
**Milestone**: `Milestone 3: M3_Validation_Safety_Assistant_Undo`  
**Escopo**: `Feature 15 (Safe "Corrigir todas" Review Modal & Sensitive Field Locks)`  
**Data**: 2026-11-09  

---

## 1. Observation (Observações Diretas)

### 1.1 Código Atual de "Corrigir Todas" em `app/documentos/[id]/validacao/page.jsx`
No arquivo `c:\www\smart-nfe\app\documentos\[id]\validacao\page.jsx`:
- **Linhas 101–119**:
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
- **Linhas 312–325**:
```javascript
          {!isAllGreen && (
            <Button
              buttonType="success"
              size="small"
              onClick={handleFixAll}
              disabled={isFixingAll}
              className="flex-shrink-0"
              title="Aplica todas as correções sugeridas automaticamente"
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5 mr-1" />
              {isFixingAll ? 'Aplicando Correções...' : 'Corrigir Todas em 1-Clique'}
            </Button>
          )}
```

### 1.2 Requisitos Formais em `ORIGINAL_REQUEST.md` (R2)
No arquivo `c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md` (Linhas 16–19 e 56):
```text
R2. Segurança das Correções Sugeridas e Assistente de Validação:
- Impedir aplicação silenciosa de correções fiscais em app/documentos/[id]/validacao/page.jsx. Antes de qualquer alteração, exibir os valores atual e proposto, a origem da sugestão, exigir confirmação explícita, permitir cancelamento, preservar valores anteriores com capacidade de desfazer (undo) e reexecutar validações após a correção.
- Para a opção "Corrigir todas", exibir revisão de todas as alterações, separar correções mecânicas de sugestões fiscais, permitir aprovação individual e desabilitar aplicação em massa de propostas que possam alterar tributação, CFOP, NCM ou outros campos sensíveis. Manter as explicações do assistente identificadas como demonstração.
Critério de Aceitação:
- [ ] A funcionalidade "Corrigir todas" bloqueia aplicação em massa de campos fiscais sensíveis (tributação, CFOP, NCM) e exige revisão individual.
```

### 1.3 Contrato de Testes em `tests/integration/flow_d_validation_safe_fix_undo.test.mjs`
O teste de integração oficial cobre a classificação e a execução segura (Linhas 28–37, 114–148 e 271–303):
- Definição de campos fiscais sensíveis:
```javascript
const SENSITIVE_FIELDS = ['cfop', 'ncm', 'cst', 'aliquota', 'tributos', 'origem'];

function isSensitiveIssue(issue) {
  const campo = String(issue.campo || '').toLowerCase().trim();
  return SENSITIVE_FIELDS.includes(campo);
}
```
- Resultado da execução de `node --no-warnings --test tests/integration/flow_d_validation_safe_fix_undo.test.mjs`:
```text
▶ Fluxo D — Bloqueio de Aplicação em Massa para Campos Sensíveis (R2)
  ✔ Corrigir Todas aplica apenas correções mecânicas e bloqueia CFOP e NCM em massa (10.8723ms)
✔ Fluxo D — Bloqueio de Aplicação em Massa para Campos Sensíveis (R2) (11.0753ms)
ℹ tests 7 | pass 7 | fail 0
```
- No cenário `demo-04`, há exatamente 4 pendências:
  1. `cfop` (5102 -> 7101): Sensível -> Bloqueado em massa.
  2. `ncm` (6403590 -> 64035910): Sensível -> Bloqueado em massa.
  3. `valorTotal` (4000.00 -> 4500.00): Mecânico -> Permitido em lote.
  4. `unidade` (METROS -> PAR): Mecânico -> Permitido em lote.
- O método seguro `applySafeBulkFix` aplica 2 correções mecânicas, bloqueia 2 correções sensíveis, preserva o histórico de Undo e revalida o documento deixando as 2 sensíveis pendentes para revisão humana.

---

## 2. Logic Chain (Cadeia Lógica de Raciocínio)

1. **Vulnerabilidade do comportamento atual**: A função `handleFixAll` atual itera indiscriminadamente sobre todas as pendências da NF-e e sobrescreve valores no banco em memória via `invoiceRepository.updateItem` com um único clique.
2. **Infração do Requisito R2**: Esta ação em lote altera CFOP e NCM de forma cega, sem revisão do usuário, sem separação de correções mecânicas de fiscais, e sem guardar o histórico para reversão (Undo).
3. **Necessidade do Modal de Revisão Segura ("Corrigir Todas")**:
   - O botão principal no banner do assistente não deve chamar diretamente a mutação; ele deve acionar o estado `setShowBulkReviewModal(true)`.
   - O modal deve categorizar e segregar visualmente os apontamentos em dois blocos:
     - **Bloco A (Correções Mecânicas)**: Cálculos matemáticos (`valorTotal`), normalização de unidades aduaneiras (`unidade`), formatações. Apresenta checkboxes selecionáveis por padrão, botão de "Selecionar/Desmarcar Todas", comparativo de valores (Antes vs Proposto) e justificativa.
     - **Bloco B (Campos Fiscais Sensíveis)**: `cfop`, `ncm`, `cst`, `csosn`, `aliquota`, `tributos`, `origem`. O checkbox deve permanecer **desabilitado/travado**, acompanhado de ícone de cadeado (`faLock`), tarja visual de alerta `"Alteração sensível — requer revisão individual"` e botão de atalho `"Revisar Individualmente"` (que abre o modal individual da Feature 13).
4. **Identificação do Assistente como Demonstração (R2)**:
   - Todas as explicações e sugestões fiscais do assistente no modal e no card devem ser identificadas visualmente com tags como `[Demonstração]` ou `Sugestão Fiscal Demonstrativa (R2)` para deixar evidente ao operador que se trata de uma ferramenta demonstrativa e que a responsabilidade pela validação legal é do emissor/operador.
5. **Integração com Mecanismo de Undo (Feature 14)**:
   - Ao confirmar a aplicação das correções mecânicas selecionadas, cada item alterado deve capturar previamente seu `valorAnterior` (`item[issue.campo]`) e registrar uma entrada na pilha `undoStack`.
   - Após a mutação em lote, `loadData()` deve ser chamado para re-auditar os documentos, atualizando a interface e liberando a ação de Desfazer.

---

## 3. Caveats (Ressalvas e Suposições)

1. **Não Modificação Direta do Código**: Por atuar como `teamwork_explorer_m3_validacao_3`, nenhuma alteração foi escrita diretamente em arquivos do código-fonte (`app/documentos/[id]/validacao/page.jsx`). Todo o código e arquitetura detalhados abaixo destinam-se ao Worker (`teamwork_worker_m3` ou equivalente).
2. **Dependência das Features 13 e 14**:
   - A Feature 13 implementa o modal individual de confirmação. O botão "Revisar Individualmente" no bloco sensível deve fechar o modal em lote e abrir o modal da Feature 13.
   - A Feature 14 gerencia o estado `undoStack` e a função de desfazer. A função de aplicação em lote deve popular esse mesmo `undoStack`.
3. **Persistência de Sessão**: Documentos reais importados residem em memória de sessão (`sessionInvoices`); mutações em `invoiceRepository.updateItem` funcionam de forma idêntica tanto para mocks (`demo-04`) quanto para documentos reais.

---

## 4. Conclusion & Especificação Técnica para o Worker

A implementação da Feature 15 em `app/documentos/[id]/validacao/page.jsx` divide-se nos seguintes passos práticos:

### 4.1 Constantes e Helpers de Classificação

Adicionar ao topo de `page.jsx` (ou em arquivo auxiliar se aplicável):

```javascript
/**
 * Campos considerados sensíveis fiscalmente pela especificação R2.
 * NUNCA podem ser alterados via aplicação em massa ("Corrigir todas").
 */
export const SENSITIVE_FIELDS = ['cfop', 'ncm', 'cst', 'csosn', 'aliquota', 'tributos', 'origem'];

/**
 * Classifica um apontamento fiscal como sensível (fiscal) ou mecânico (seguro).
 */
export function isSensitiveIssue(issue) {
  if (!issue || !issue.campo) return false;
  const campo = String(issue.campo).toLowerCase().trim();
  return SENSITIVE_FIELDS.includes(campo) ||
    campo.startsWith('tributo') ||
    campo.startsWith('aliquota') ||
    campo.startsWith('cst');
}
```

### 4.2 Novos Estados no Componente `ValidacaoPage`

```javascript
// Feature 15: Modal de Revisão Segura de "Corrigir Todas"
const [showBulkReviewModal, setShowBulkReviewModal] = useState(false);
const [selectedMechanicalIssueIds, setSelectedMechanicalIssueIds] = useState(new Set());
const [isApplyingBatch, setIsApplyingBatch] = useState(false);
```

### 4.3 Separação Memoizada de Issues

```javascript
// Segregação entre correções mecânicas (lote permitido) e campos sensíveis (lote bloqueado)
const mechanicalIssues = useMemo(
  () => issues.filter((iss) => !isSensitiveIssue(iss)),
  [issues]
);

const sensitiveIssues = useMemo(
  () => issues.filter((iss) => isSensitiveIssue(iss)),
  [issues]
);
```

### 4.4 Handlers de Controle do Modal de Revisão em Lote

```javascript
// Abrir modal de revisão segura com pré-seleção de todas as correções mecânicas
const handleOpenBulkReview = () => {
  setSelectedMechanicalIssueIds(new Set(mechanicalIssues.map((iss) => iss.id)));
  setShowBulkReviewModal(true);
};

// Alternar seleção de um item mecânico específico
const handleToggleMechanicalIssue = (issueId) => {
  setSelectedMechanicalIssueIds((prev) => {
    const next = new Set(prev);
    if (next.has(issueId)) {
      next.delete(issueId);
    } else {
      next.add(issueId);
    }
    return next;
  });
};

// Alternar seleção de todas as correções mecânicas
const handleToggleAllMechanical = () => {
  if (selectedMechanicalIssueIds.size === mechanicalIssues.length) {
    setSelectedMechanicalIssueIds(new Set());
  } else {
    setSelectedMechanicalIssueIds(new Set(mechanicalIssues.map((iss) => iss.id)));
  }
};

// Aplicar em lote apenas as correções mecânicas selecionadas (com registro no undoStack)
const handleApplySelectedMechanicalFixes = async () => {
  const issuesToApply = mechanicalIssues.filter((iss) =>
    selectedMechanicalIssueIds.has(iss.id)
  );

  if (issuesToApply.length === 0) return;

  try {
    setIsApplyingBatch(true);
    const newUndoEntries = [];

    for (const issue of issuesToApply) {
      // Localiza o item atual no documento para capturar o valor original antes da alteração
      const currentItem = invoice?.itens?.find((i) => i.id === issue.itemId);
      const valorAnterior = currentItem ? currentItem[issue.campo] : undefined;
      const valorNovo = issue.esperado;

      // Executa a mutação
      await invoiceRepository.updateItem(id, issue.itemId, {
        [issue.campo]: valorNovo,
      });

      // Cria a entrada de Undo (compatível com Feature 14)
      newUndoEntries.push({
        id: `undo-${Date.now()}-${issue.id}`,
        issueId: issue.id,
        itemId: issue.itemId,
        itemNumero: issue.itemNumero,
        itemDescricao: issue.itemDescricao,
        campo: issue.campo,
        valorAnterior,
        valorNovo,
        timestamp: new Date().toISOString(),
      });
    }

    // Registra na pilha de Undo (LIFO)
    if (typeof setUndoStack === 'function') {
      setUndoStack((prev) => [...newUndoEntries.reverse(), ...prev]);
    }

    toast.success(
      `${issuesToApply.length} ${
        issuesToApply.length === 1 ? 'correção mecânica aplicada' : 'correções mecânicas aplicadas'
      } com sucesso!`
    );

    if (sensitiveIssues.length > 0) {
      toast.info(
        `${sensitiveIssues.length} ${
          sensitiveIssues.length === 1 ? 'pendência fiscal sensível mantida' : 'pendências fiscais sensíveis mantidas'
        } para conferência individual.`
      );
    }

    setShowBulkReviewModal(false);
    await loadData();
  } catch (err) {
    toast.error('Erro ao aplicar correções em lote.');
  } finally {
    setIsApplyingBatch(false);
  }
};
```

### 4.5 Atualização do Botão de Acionamento no Banner do Assistente

Substituir o botão da linha 312 por:
```jsx
{!isAllGreen && (
  <Button
    buttonType="success"
    size="small"
    onClick={handleOpenBulkReview}
    disabled={isFixingAll || isApplyingBatch}
    className="flex-shrink-0"
    title="Revisar e aprovar correções antes de aplicar"
  >
    <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5 mr-1" />
    Revisar e Corrigir Pendências
  </Button>
)}
```

### 4.6 JSX Completo do Modal de Revisão Segura (`BulkReviewModal`)

Renderizado no final de `ValidacaoPage`:

```jsx
{showBulkReviewModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    role="dialog"
    aria-modal="true"
    aria-labelledby="bulk-review-title"
  >
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
      
      {/* 1. Header do Modal com Rótulo de Demonstração (R2) */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <FontAwesomeIcon icon={faShieldHalved} className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="bulk-review-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Revisão de Correções Sugeridas
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Sugestão Fiscal Demonstrativa (R2)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              NF-e {invoice?.numero} • Avalie as correções antes de efetivar alterações no documento
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowBulkReviewModal(false)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Fechar"
        >
          ✕
        </button>
      </div>

      {/* 2. Corpo do Modal (com Scroll) */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
        
        {/* Banner Informativo sobre a Trava de Segurança Fiscal */}
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3.5 flex items-start gap-3">
          <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold text-xs">
              Segurança e Conformidade Fiscal (Requisito R2):
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Campos com impacto tributário direto (CFOP, NCM, CST e alíquotas) têm a aplicação em massa desabilitada e exigem validação individual por operador fiscal. Correções mecânicas (divergências de cálculo e unidades) podem ser aplicadas em lote após sua seleção.
            </p>
          </div>
        </div>

        {/* SEÇÃO 1: Correções Mecânicas (Elegíveis para Lote) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Correções Mecânicas e Formatações
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                {mechanicalIssues.length} {mechanicalIssues.length === 1 ? 'item elegível' : 'itens elegíveis'}
              </span>
            </div>

            {mechanicalIssues.length > 0 && (
              <button
                type="button"
                onClick={handleToggleAllMechanical}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                {selectedMechanicalIssueIds.size === mechanicalIssues.length
                  ? 'Desmarcar todas'
                  : 'Selecionar todas as mecânicas'}
              </button>
            )}
          </div>

          {mechanicalIssues.length === 0 ? (
            <div className="p-4 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
              Nenhuma correção mecânica pendente.
            </div>
          ) : (
            <div className="space-y-2.5">
              {mechanicalIssues.map((issue) => {
                const isSelected = selectedMechanicalIssueIds.has(issue.id);
                return (
                  <label
                    key={issue.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20 shadow-xs'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 opacity-80'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleMechanicalIssue(issue.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          Item #{issue.itemNumero} — {issue.itemDescricao}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Campo: {issue.campo}
                        </span>
                        {issue.regra && (
                          <span className="text-[10px] text-slate-500">
                            Regra: {issue.regra}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">
                        <span className="text-slate-500">Valor Atual:</span>
                        <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                          {String(issue.encontrado || 'vazio')}
                        </span>
                        <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 text-slate-400" />
                        <span className="text-slate-500">Proposto:</span>
                        <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          {String(issue.esperado || 'Conforme')}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">[Demonstração]:</span> {issue.sugestao || issue.mensagem}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* SEÇÃO 2: Campos Fiscais Sensíveis (BLOQUEADOS PARA LOTE) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Campos Fiscais Sensíveis (Aplicação em Massa Bloqueada)
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                {sensitiveIssues.length} {sensitiveIssues.length === 1 ? 'pendência retida' : 'pendências retidas'}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <FontAwesomeIcon icon={faShieldHalved} className="w-3 h-3" />
              Requer revisão individual
            </span>
          </div>

          {sensitiveIssues.length === 0 ? (
            <div className="p-4 text-center text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              Nenhum campo fiscal sensível inconsistente.
            </div>
          ) : (
            <div className="space-y-2.5">
              {sensitiveIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-4 h-4 text-amber-500 flex items-center justify-center" title="Bloqueado para lote">
                      <FontAwesomeIcon icon={faShieldHalved} className="w-3.5 h-3.5 text-amber-600" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          Item #{issue.itemNumero} — {issue.itemDescricao}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
                          {issue.campo} [Sensível]
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                          Alteração sensível — requer revisão individual
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">
                        <span className="text-slate-500">Valor Atual:</span>
                        <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                          {String(issue.encontrado || 'vazio')}
                        </span>
                        <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 text-slate-400" />
                        <span className="text-slate-500">Proposto:</span>
                        <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          {String(issue.esperado || 'Conforme')}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">[Demonstração]:</span> {issue.mensagem}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 sm:self-center">
                    <Button
                      buttonType="secondary"
                      size="small"
                      outline
                      onClick={() => {
                        setShowBulkReviewModal(false);
                        // Aciona o modal individual da Feature 13 se existir
                        if (typeof handleOpenSingleFixModal === 'function') {
                          handleOpenSingleFixModal(issue);
                        } else {
                          handleApplyFix(issue);
                        }
                      }}
                      title="Abrir confirmação explícita para este item"
                    >
                      Revisar Individualmente
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 3. Rodapé com Resumo de Seleção e Ações */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <strong className="text-slate-800 dark:text-slate-200">{selectedMechanicalIssueIds.size}</strong> de {mechanicalIssues.length} mecânicas selecionadas • <strong className="text-amber-700 dark:text-amber-400">{sensitiveIssues.length}</strong> sensíveis bloqueadas
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            buttonType="secondary"
            outline
            size="small"
            onClick={() => setShowBulkReviewModal(false)}
            disabled={isApplyingBatch}
          >
            Cancelar
          </Button>

          <Button
            buttonType="success"
            size="small"
            disabled={selectedMechanicalIssueIds.size === 0 || isApplyingBatch}
            onClick={handleApplySelectedMechanicalFixes}
          >
            <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5 mr-1.5" />
            {isApplyingBatch
              ? 'Aplicando...'
              : `Aplicar Selecionadas (${selectedMechanicalIssueIds.size})`}
          </Button>
        </div>
      </div>

    </div>
  </div>
)}
```

---

## 5. Verification Method (Método de Verificação Independente)

Para auditar e verificar a integridade da implementação:

1. **Execução do Teste de Integração Automatizado**:
   ```powershell
   node --no-warnings --test tests/integration/flow_d_validation_safe_fix_undo.test.mjs
   ```
   **Critério de Sucesso**: Todos os 7 testes devem passar (`pass 7`, `fail 0`), especialmente a suite:
   `Fluxo D — Bloqueio de Aplicação em Massa para Campos Sensíveis (R2)`
   onde se valida:
   - `bulkResult.appliedCount === 2` (apenas `valorTotal` e `unidade`).
   - `bulkResult.blockedCount === 2` (bloqueio estrito de `cfop` e `ncm`).
   - `bulkResult.remainingIssues.length === 2` (os campos sensíveis continuam pendentes).

2. **Verificação no Navegador (`pnpm dev` em `/documentos/demo-04/validacao`)**:
   - Clicar no botão `"Revisar e Corrigir Pendências"`.
   - Verificar abertura do modal com os 2 blocos claramente segregados.
   - Constatar que os itens `cfop` e `ncm` estão na seção "Campos Fiscais Sensíveis" com aviso visual e checkbox desabilitado.
   - Constatar que os itens `valorTotal` e `unidade` possuem checkboxes interativos na seção "Correções Mecânicas".
   - Aplicar a seleção mecânica e constatar que apenas essas 2 pendências foram sanadas, restando as 2 pendências fiscais sensíveis para análise individual.
   - Verificar presença dos rótulos `[Demonstração]` / `Sugestão Fiscal Demonstrativa (R2)`.

3. **Condições de Invalidação**:
   - Se o clique em "Corrigir todas" alterar CFOP ou NCM sem confirmação individual explícita.
   - Se os campos fiscais sensíveis forem selecionáveis no lote.
   - Se as sugestões forem apresentadas como consultoria jurídica definitiva sem o aviso de demonstração.
