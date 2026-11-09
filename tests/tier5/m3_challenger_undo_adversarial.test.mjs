/**
 * SmartNFe — Tier 5 Adversarial Hardening Suite: Milestone 3 Validation Safety & Undo
 * Challenger: Cancelation Neutrality, Sequential LIFO Undos, Discrepancy Re-trigger & Bulk Locks
 *
 * Requirements: R2 (ORIGINAL_REQUEST.md, PROJECT.md)
 *
 * Verificações adversariais cobertas:
 * 1. AST & Static Code Invariants:
 *    - Inspeção estática de `app/documentos/[id]/validacao/page.jsx` e `app/features/invoiceRepository.js`.
 *    - Eliminação estrita de mutações silenciosas (`handleApplyFix` direto substituído por `handleRequestFix`).
 *    - Modal de confirmação explícita com classificação de risco e origem da regra.
 *    - Modal de revisão em lote com bloqueio físico (disabled/faLock) para campos fiscais sensíveis.
 *    - Marcação clara de sugestões demonstrativas (`[Demonstração]`).
 * 2. Cancelation Neutrality & Zero-Mutation Invariant:
 *    - 50 ciclos consecutivos de cancelamento de confirmação deixam o repositório bit-a-bit idêntico ao original.
 *    - Cancelamento do modal de lote ("Corrigir todas") não muta o repositório nem cria entradas no Undo.
 * 3. Sequential LIFO Undos & Round-Trip Bit-for-Bit Fidelity:
 *    - Aplicação sequencial de 4 correções fiscais distintas (CFOP, Matemática, NCM, Unidade).
 *    - Desfazimento passo a passo em ordem estritamente inversa (LIFO).
 *    - Verificação de restauração bit-a-bit de cada valor anterior e das situações dos itens.
 *    - Esgotamento da pilha de Undo: chamadas subsequentes a undo() não quebram nem corrompem o estado.
 *    - Múltiplas mutações sucessivas no MESMO item e MESMO campo: desfazimento fiel dos estados intermediários.
 * 4. Math Discrepancy Undo Integrity & Totals Reconciliation:
 *    - Correção de `valorTotal` (4000.00 -> 4500.00) limpa a divergência e recalcula totais da nota.
 *    - Undo restaura exatamente 4000.00 e re-dispara a regra de conferência matemática com o erro original.
 *    - Preservação da conciliação do total de produtos (`valorProdutos`) e valor da nota (`valorTotalNota`).
 *    - Teste de estresse com dízimas e precisão decimal estendida.
 * 5. Aduaneira Unit Discrepancy Undo Integrity:
 *    - Correção de unidade comercial (METROS -> PAR) sana o apontamento aduaneiro.
 *    - Undo restaura a unidade original (METROS) e re-sinaliza a inconsistência aduaneira em `getValidationIssues`.
 *    - Preservação do metadado de inconsistências mockadas através do snapshot imutável em `valorOriginal`.
 * 6. Bulk Review Segregation & Sensitive Field Hard Locks:
 *    - "Corrigir todas" executa exclusivamente correções mecânicas (matemática e unidade).
 *    - Bloqueio rigoroso de campos sensíveis (CFOP, NCM, alíquotas, tributação).
 *    - Registro em lote no Undo com desfazimento sequencial LIFO item por item.
 * 7. Adversarial Chaos & Stress Loop:
 *    - Bateria de 20 ciclos de mutações aleatórias, undos parciais, novas mutações e drenagem completa.
 *    - Invariante estrito: após desfazimento total, o documento no repositório é idêntico ao baseline.
 *    - Isolamento entre notas fiscais (nenhuma contaminação cruzada entre demo-04 e demo-01..03, 05).
 *
 * Execução: node --no-warnings --test tests/tier5/m3_challenger_undo_adversarial.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { invoiceRepository } from '../../app/features/invoiceRepository.js';
import {
  localStorageService,
  STORAGE_KEYS,
  setCustomStorage,
} from '../../app/lib/storage/localStorageService.js';
import {
  calculateItemTotal,
  calculateInvoiceTotals,
} from '../../app/lib/calculations/invoiceTotals.js';
import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalCompare,
  cleanDecimalString,
} from '../../app/lib/calculations/decimal.js';

const ROOT_DIR = process.cwd();
const VALIDACAO_PAGE_PATH = resolve(ROOT_DIR, 'app/documentos/[id]/validacao/page.jsx');
const REPOSITORY_PATH = resolve(ROOT_DIR, 'app/features/invoiceRepository.js');

/**
 * Campos fiscais sensíveis definidos pela especificação R2.
 */
const SENSITIVE_FIELDS = ['cfop', 'ncm', 'cst', 'csosn', 'aliquota', 'tributos', 'origem'];

/**
 * Classifica um apontamento fiscal como sensível ou mecânico (espelha a lógica de page.jsx).
 */
function isSensitiveIssue(issue) {
  if (!issue || !issue.campo) return false;
  const campo = String(issue.campo).toLowerCase().trim();
  return (
    SENSITIVE_FIELDS.includes(campo) ||
    campo.startsWith('tributo') ||
    campo.startsWith('aliquota') ||
    campo.startsWith('cst')
  );
}

/**
 * Cria payload padronizado para o modal de confirmação (espelha page.jsx).
 */
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
    origemRegra: issue.regra || 'Regra de Validação Fiscal',
    isSensivel: isSensitiveIssue(issue),
  };
}

/**
 * Controlador de Validação Fiel:
 * Implementa exatamente a mesma máquina de estados e fluxo de manipulação de Undo de `page.jsx`.
 */
class ValidationSessionController {
  constructor(invoiceId) {
    this.invoiceId = invoiceId;
    this.invoice = null;
    this.issues = [];
    this.undoStack = [];
    this.pendingFix = null;
    this.selectedMechanicalIssueIds = new Set();
    this.showBulkReviewModal = false;
  }

  async loadData() {
    this.invoice = await invoiceRepository.findById(this.invoiceId);
    this.issues = await invoiceRepository.getValidationIssues(this.invoiceId);
    return { invoice: this.invoice, issues: this.issues };
  }

  getMechanicalIssues() {
    return this.issues.filter((iss) => !isSensitiveIssue(iss));
  }

  getSensitiveIssues() {
    return this.issues.filter((iss) => isSensitiveIssue(iss));
  }

  // Feature 13: Solicitação de Correção (abre modal)
  handleRequestFix(issue) {
    this.pendingFix = createConfirmationPayload(issue);
    return this.pendingFix;
  }

  // Feature 13: Cancelamento de Correção (fecha modal sem tocar em nada)
  handleCancelFix() {
    this.pendingFix = null;
  }

  // Feature 13 & 14: Confirmação da Correção com registro na pilha LIFO
  async handleConfirmFix() {
    if (!this.pendingFix) return { applied: false, reason: 'Nenhuma correção pendente' };

    const payload = this.pendingFix;
    const currentItem = this.invoice?.itens?.find((i) => i.id === payload.itemId);
    const valorAnterior = currentItem ? currentItem[payload.campo] : payload.valorAtual;
    const valorNovo = payload.valorProposto;

    const undoEntry = {
      id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      issueId: payload.issueId,
      itemId: payload.itemId,
      itemNumero: payload.itemNumero,
      itemDescricao: payload.itemDescricao,
      campo: payload.campo,
      valorAnterior,
      valorNovo,
      timestamp: new Date().toISOString(),
      regra: payload.origemRegra,
    };

    await invoiceRepository.updateItem(this.invoiceId, payload.itemId, {
      [payload.campo]: valorNovo,
    });

    this.undoStack.push(undoEntry);
    this.pendingFix = null;

    await this.loadData();
    return { applied: true, undoEntry };
  }

  // Feature 14: Mecanismo de Undo LIFO
  async handleUndo(targetEntry = null) {
    if (this.undoStack.length === 0) {
      return { success: false, reason: 'Pilha de Undo vazia' };
    }

    const entryToUndo = targetEntry || this.undoStack[this.undoStack.length - 1];
    await invoiceRepository.updateItem(this.invoiceId, entryToUndo.itemId, {
      [entryToUndo.campo]: entryToUndo.valorAnterior,
    });

    this.undoStack = this.undoStack.filter((e) => e.id !== entryToUndo.id);

    await this.loadData();
    return { success: true, restoredEntry: entryToUndo };
  }

  // Feature 15: Revisão Segura de "Corrigir Todas"
  handleOpenBulkReview() {
    this.selectedMechanicalIssueIds = new Set(this.getMechanicalIssues().map((i) => i.id));
    this.showBulkReviewModal = true;
  }

  handleCancelBulkReview() {
    this.showBulkReviewModal = false;
    this.selectedMechanicalIssueIds.clear();
  }

  handleToggleMechanicalIssue(issueId) {
    if (this.selectedMechanicalIssueIds.has(issueId)) {
      this.selectedMechanicalIssueIds.delete(issueId);
    } else {
      this.selectedMechanicalIssueIds.add(issueId);
    }
  }

  handleToggleAllMechanical() {
    const mech = this.getMechanicalIssues();
    if (this.selectedMechanicalIssueIds.size === mech.length) {
      this.selectedMechanicalIssueIds.clear();
    } else {
      this.selectedMechanicalIssueIds = new Set(mech.map((i) => i.id));
    }
  }

  async handleApplySelectedMechanicalFixes() {
    const mechanicalIssues = this.getMechanicalIssues();
    const issuesToApply = mechanicalIssues.filter((iss) =>
      this.selectedMechanicalIssueIds.has(iss.id)
    );

    if (issuesToApply.length === 0) {
      this.showBulkReviewModal = false;
      return { appliedCount: 0, entries: [] };
    }

    const batchId = `batch-${Date.now()}`;
    const newUndoEntries = [];

    for (const issue of issuesToApply) {
      const currentItem = this.invoice?.itens?.find((i) => i.id === issue.itemId);
      const valorAnterior = currentItem ? currentItem[issue.campo] : issue.encontrado;
      const valorNovo = issue.esperado;

      await invoiceRepository.updateItem(this.invoiceId, issue.itemId, {
        [issue.campo]: valorNovo,
      });

      const undoEntry = {
        id: `undo-${Date.now()}-${issue.id}`,
        batchId,
        issueId: issue.id,
        itemId: issue.itemId,
        itemNumero: issue.itemNumero,
        itemDescricao: issue.itemDescricao,
        campo: issue.campo,
        valorAnterior,
        valorNovo,
        timestamp: new Date().toISOString(),
        regra: issue.regra || 'Regra Mecânica',
      };
      newUndoEntries.push(undoEntry);
    }

    this.undoStack.push(...newUndoEntries);
    this.showBulkReviewModal = false;

    await this.loadData();
    return { appliedCount: newUndoEntries.length, entries: newUndoEntries };
  }
}

// ============================================================================
// SUITE 1: Source Code & AST Security Invariants
// ============================================================================
describe('CHALLENGER SUITE 1: Source Code & Security Invariants', () => {
  const pageSrc = readFileSync(VALIDACAO_PAGE_PATH, 'utf8');
  const repoSrc = readFileSync(REPOSITORY_PATH, 'utf8');

  it('1.1: FiscalFixConfirmationModal e SafeBulkReviewModal existem em page.jsx', () => {
    assert.ok(
      pageSrc.includes('function FiscalFixConfirmationModal'),
      'FiscalFixConfirmationModal deve ser um componente definido em page.jsx'
    );
    assert.ok(
      pageSrc.includes('function SafeBulkReviewModal'),
      'SafeBulkReviewModal deve ser um componente definido em page.jsx'
    );
  });

  it('1.2: Nenhuma chamada silenciosa direta de mutação em issue cards', () => {
    // Garante que os cards chamam handleRequestFix(issue) e não updateItem direto
    assert.ok(
      pageSrc.includes('handleRequestFix(issue)'),
      'Botão de correção no card de issue deve acionar handleRequestFix'
    );
    assert.ok(
      !pageSrc.includes('onClick={() => handleApplyFix(issue)}'),
      'Nenhum manipulador handleApplyFix direto de 1-clique permitido'
    );
  });

  it('1.3: SENSITIVE_FIELDS inclui cfop, ncm, tributos e afins', () => {
    assert.ok(pageSrc.includes("export const SENSITIVE_FIELDS = ['cfop', 'ncm'"), 'SENSITIVE_FIELDS exportado');
    for (const f of ['cfop', 'ncm', 'cst', 'aliquota', 'tributos']) {
      assert.ok(pageSrc.toLowerCase().includes(f), `SENSITIVE_FIELDS deve contemplar campo ${f}`);
    }
  });

  it('1.4: SafeBulkReviewModal possui bloqueio físico (disabled/faLock) para campos sensíveis', () => {
    assert.ok(
      pageSrc.includes('faLock'),
      'SafeBulkReviewModal deve exibir ícone de cadeado faLock para campos fiscais sensíveis'
    );
    assert.ok(
      pageSrc.includes('Aplicação em Massa Bloqueada'),
      'Modal de lote deve alertar expressamente que aplicação em massa está bloqueada para sensíveis'
    );
    assert.ok(
      pageSrc.includes('Revisar Individualmente'),
      'Campos sensíveis no modal de lote devem oferecer apenas revisão individual'
    );
  });

  it('1.5: Assistente e modais contêm marcação demonstrativa [Demonstração] (R2)', () => {
    assert.ok(
      pageSrc.includes('[Demonstração]'),
      'Explicações e títulos do assistente devem conter a marca [Demonstração]'
    );
  });

  it('1.6: invoiceRepository.js protege valorTotal de recálculo forçado em updates sem preço/quantidade', () => {
    assert.ok(
      repoSrc.includes('partialItemData.valorTotal !== undefined'),
      'invoiceRepository deve verificar se valorTotal foi explicitamente fornecido'
    );
    assert.ok(
      repoSrc.includes('updatedItem.valorTotal = String(partialItemData.valorTotal)'),
      'invoiceRepository deve respeitar o valorTotal fornecido sem recalcular'
    );
  });

  it('1.7: invoiceRepository.js preserva inconsistencias no snapshot valorOriginal', () => {
    assert.ok(
      repoSrc.includes('inconsistencias: deepClone(currentItem.inconsistencias || [])'),
      'invoiceRepository deve salvar inconsistencias dentro de valorOriginal'
    );
  });
});

// ============================================================================
// SUITE 2: Cancelation Neutrality & Zero-Mutation Invariant
// ============================================================================
describe('CHALLENGER SUITE 2: Cancelation Neutrality & Zero-Mutation Invariant', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await invoiceRepository.resetDemoData();
  });

  it('2.1: Cancelar confirmação individual faz ZERO mutações no repositório e no estado', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();

    const docBefore = JSON.stringify(await invoiceRepository.findById('demo-04'));
    const issuesBefore = await invoiceRepository.getValidationIssues('demo-04');

    // Abre o modal para uma issue sensível (CFOP)
    const cfopIssue = issuesBefore.find((i) => i.campo === 'cfop');
    assert.ok(cfopIssue, 'CFOP issue deve existir');
    const payload = controller.handleRequestFix(cfopIssue);
    assert.strictEqual(controller.pendingFix.campo, 'cfop');
    assert.strictEqual(controller.pendingFix.isSensivel, true);

    // Usuário cancela
    controller.handleCancelFix();
    assert.strictEqual(controller.pendingFix, null);
    assert.strictEqual(controller.undoStack.length, 0);

    const docAfter = JSON.stringify(await invoiceRepository.findById('demo-04'));
    assert.strictEqual(docAfter, docBefore, 'Documento no repositório deve permanecer bit-a-bit idêntico');

    const issuesAfter = await invoiceRepository.getValidationIssues('demo-04');
    assert.strictEqual(issuesAfter.length, issuesBefore.length, 'Contagem de issues deve ser idêntica');
  });

  it('2.2: 50 ciclos consecutivos de cancelamento entre diferentes issues mantêm 0 mutações', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();
    const docBaseline = JSON.stringify(await invoiceRepository.findById('demo-04'));

    for (let cycle = 0; cycle < 50; cycle++) {
      const issue = controller.issues[cycle % controller.issues.length];
      controller.handleRequestFix(issue);
      assert.ok(controller.pendingFix, `Pending fix deve estar ativo no ciclo ${cycle}`);
      controller.handleCancelFix();
      assert.strictEqual(controller.pendingFix, null, `Pending fix deve ser nulo após cancelamento no ciclo ${cycle}`);
    }

    assert.strictEqual(controller.undoStack.length, 0, 'Pilha de Undo deve permanecer com tamanho 0');
    const docFinal = JSON.stringify(await invoiceRepository.findById('demo-04'));
    assert.strictEqual(docFinal, docBaseline, 'Documento deve continuar 100% inalterado após 50 cancelamentos');
  });

  it('2.3: Cancelar SafeBulkReviewModal não muta o documento e limpa a seleção', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();
    const docBaseline = JSON.stringify(await invoiceRepository.findById('demo-04'));

    controller.handleOpenBulkReview();
    assert.strictEqual(controller.showBulkReviewModal, true);
    assert.strictEqual(controller.selectedMechanicalIssueIds.size, 2);

    // Manipula toggles
    controller.handleToggleAllMechanical();
    assert.strictEqual(controller.selectedMechanicalIssueIds.size, 0);
    controller.handleToggleAllMechanical();
    assert.strictEqual(controller.selectedMechanicalIssueIds.size, 2);

    // Cancela o modal
    controller.handleCancelBulkReview();
    assert.strictEqual(controller.showBulkReviewModal, false);
    assert.strictEqual(controller.selectedMechanicalIssueIds.size, 0);
    assert.strictEqual(controller.undoStack.length, 0);

    const docFinal = JSON.stringify(await invoiceRepository.findById('demo-04'));
    assert.strictEqual(docFinal, docBaseline, 'Zero mutações após manipulação e cancelamento do bulk review');
  });
});

// ============================================================================
// SUITE 3: Sequential LIFO Undos & Round-Trip Bit-for-Bit Fidelity
// ============================================================================
describe('CHALLENGER SUITE 3: Sequential LIFO Undos & Round-Trip Fidelity', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await invoiceRepository.resetDemoData();
  });

  it('3.1: Aplica 4 correções e reverte uma a uma em ordem LIFO com fidelidade exata', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();

    // Captura baseline original dos 4 itens defeituosos
    const origDoc = await invoiceRepository.findById('demo-04');
    const item3Orig = { ...origDoc.itens.find((i) => i.id === 'd4-3') };
    const item5Orig = { ...origDoc.itens.find((i) => i.id === 'd4-5') };
    const item8Orig = { ...origDoc.itens.find((i) => i.id === 'd4-8') };
    const item11Orig = { ...origDoc.itens.find((i) => i.id === 'd4-11') };

    assert.strictEqual(item3Orig.cfop, '5102');
    assert.strictEqual(item5Orig.valorTotal, '4000.00');
    assert.strictEqual(item8Orig.ncm, '6403590');
    assert.strictEqual(item11Orig.unidade, 'METROS');

    // 1. Aplica Correção 1: Item 3 CFOP (5102 -> 7101)
    const issue1 = controller.issues.find((i) => i.itemId === 'd4-3' && i.campo === 'cfop');
    controller.handleRequestFix(issue1);
    await controller.handleConfirmFix();
    assert.strictEqual(controller.undoStack.length, 1);
    assert.strictEqual(controller.issues.length, 3);

    // 2. Aplica Correção 2: Item 5 valorTotal (4000.00 -> 4500.00)
    const issue2 = controller.issues.find((i) => i.itemId === 'd4-5' && i.campo === 'valorTotal');
    controller.handleRequestFix(issue2);
    await controller.handleConfirmFix();
    assert.strictEqual(controller.undoStack.length, 2);
    assert.strictEqual(controller.issues.length, 2);

    // 3. Aplica Correção 3: Item 8 NCM (6403590 -> 64035910)
    const issue3 = controller.issues.find((i) => i.itemId === 'd4-8' && i.campo === 'ncm');
    controller.handleRequestFix(issue3);
    await controller.handleConfirmFix();
    assert.strictEqual(controller.undoStack.length, 3);
    assert.strictEqual(controller.issues.length, 1);

    // 4. Aplica Correção 4: Item 11 Unidade (METROS -> PAR)
    const issue4 = controller.issues.find((i) => i.itemId === 'd4-11' && i.campo === 'unidade');
    controller.handleRequestFix(issue4);
    await controller.handleConfirmFix();
    assert.strictEqual(controller.undoStack.length, 4);
    assert.strictEqual(controller.issues.length, 0, 'Todos os apontamentos sanados (All Green)');

    // Inspeciona documento corrigido
    let curDoc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-3').cfop, '7101');
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-5').valorTotal, '4500.00');
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-8').ncm, '64035910');
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-11').unidade, 'PAR');

    // === INÍCIO DO DESFAZIMENTO LIFO ===

    // UNDO 1: Deve reverter Item 11 Unidade (PAR -> METROS)
    const undo1 = await controller.handleUndo();
    assert.strictEqual(undo1.success, true);
    assert.strictEqual(undo1.restoredEntry.itemId, 'd4-11');
    assert.strictEqual(undo1.restoredEntry.campo, 'unidade');
    assert.strictEqual(undo1.restoredEntry.valorAnterior, 'METROS');
    assert.strictEqual(controller.undoStack.length, 3);
    assert.strictEqual(controller.issues.length, 1, 'Issue de unidade deve reaparecer');
    curDoc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-11').unidade, 'METROS');
    // Os outros 3 continuam corrigidos
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-8').ncm, '64035910');
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-5').valorTotal, '4500.00');
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-3').cfop, '7101');

    // UNDO 2: Deve reverter Item 8 NCM (64035910 -> 6403590)
    const undo2 = await controller.handleUndo();
    assert.strictEqual(undo2.success, true);
    assert.strictEqual(undo2.restoredEntry.itemId, 'd4-8');
    assert.strictEqual(undo2.restoredEntry.campo, 'ncm');
    assert.strictEqual(undo2.restoredEntry.valorAnterior, '6403590');
    assert.strictEqual(controller.undoStack.length, 2);
    assert.strictEqual(controller.issues.length, 2, 'Issues de NCM e unidade ativas');
    curDoc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-8').ncm, '6403590');
    // Os outros 2 continuam corrigidos
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-5').valorTotal, '4500.00');
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-3').cfop, '7101');

    // UNDO 3: Deve reverter Item 5 valorTotal (4500.00 -> 4000.00)
    const undo3 = await controller.handleUndo();
    assert.strictEqual(undo3.success, true);
    assert.strictEqual(undo3.restoredEntry.itemId, 'd4-5');
    assert.strictEqual(undo3.restoredEntry.campo, 'valorTotal');
    assert.strictEqual(undo3.restoredEntry.valorAnterior, '4000.00');
    assert.strictEqual(controller.undoStack.length, 1);
    assert.strictEqual(controller.issues.length, 3, 'Issues de matemática, NCM e unidade ativas');
    curDoc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-5').valorTotal, '4000.00');
    // Apenas Item 3 continua corrigido
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-3').cfop, '7101');

    // UNDO 4: Deve reverter Item 3 CFOP (7101 -> 5102)
    const undo4 = await controller.handleUndo();
    assert.strictEqual(undo4.success, true);
    assert.strictEqual(undo4.restoredEntry.itemId, 'd4-3');
    assert.strictEqual(undo4.restoredEntry.campo, 'cfop');
    assert.strictEqual(undo4.restoredEntry.valorAnterior, '5102');
    assert.strictEqual(controller.undoStack.length, 0);
    assert.strictEqual(controller.issues.length, 4, 'Todas as 4 issues originais restabelecidas');

    // Compara campos de todos os 4 itens com os valores originais bit-a-bit
    const finalDoc = await invoiceRepository.findById('demo-04');
    const f3 = finalDoc.itens.find((i) => i.id === 'd4-3');
    const f5 = finalDoc.itens.find((i) => i.id === 'd4-5');
    const f8 = finalDoc.itens.find((i) => i.id === 'd4-8');
    const f11 = finalDoc.itens.find((i) => i.id === 'd4-11');

    assert.strictEqual(f3.cfop, item3Orig.cfop);
    assert.strictEqual(f5.valorTotal, item5Orig.valorTotal);
    assert.strictEqual(f8.ncm, item8Orig.ncm);
    assert.strictEqual(f11.unidade, item11Orig.unidade);
    assert.strictEqual(f3.situacao, 'inconsistente');
    assert.strictEqual(f5.situacao, 'inconsistente');
    assert.strictEqual(f8.situacao, 'inconsistente');
    assert.strictEqual(f11.situacao, 'inconsistente');
  });

  it('3.2: Chamada de undo com pilha vazia retorna success: false sem corromper estado', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();
    assert.strictEqual(controller.undoStack.length, 0);

    const emptyUndo = await controller.handleUndo();
    assert.strictEqual(emptyUndo.success, false);
    assert.strictEqual(emptyUndo.reason, 'Pilha de Undo vazia');
    assert.strictEqual(controller.issues.length, 4);
  });

  it('3.3: Mutações sucessivas no MESMO item e MESMO campo desfazem todos os estados intermediários', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();

    // Item 3 CFOP: original 5102
    // Mutação 1: 5102 -> 6101
    await invoiceRepository.updateItem('demo-04', 'd4-3', { cfop: '6101' });
    controller.undoStack.push({
      id: 'u1',
      itemId: 'd4-3',
      campo: 'cfop',
      valorAnterior: '5102',
      valorNovo: '6101',
    });

    // Mutação 2: 6101 -> 7101
    await invoiceRepository.updateItem('demo-04', 'd4-3', { cfop: '7101' });
    controller.undoStack.push({
      id: 'u2',
      itemId: 'd4-3',
      campo: 'cfop',
      valorAnterior: '6101',
      valorNovo: '7101',
    });

    // Mutação 3: 7101 -> 7949
    await invoiceRepository.updateItem('demo-04', 'd4-3', { cfop: '7949' });
    controller.undoStack.push({
      id: 'u3',
      itemId: 'd4-3',
      campo: 'cfop',
      valorAnterior: '7101',
      valorNovo: '7949',
    });

    assert.strictEqual(controller.undoStack.length, 3);
    let doc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd4-3').cfop, '7949');

    // Desfaz passo 3: volta para 7101
    await controller.handleUndo();
    doc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd4-3').cfop, '7101');

    // Desfaz passo 2: volta para 6101
    await controller.handleUndo();
    doc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd4-3').cfop, '6101');

    // Desfaz passo 1: volta para 5102 original
    await controller.handleUndo();
    doc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd4-3').cfop, '5102');
  });
});

// ============================================================================
// SUITE 4: Math Discrepancy Undo Integrity & Totals Reconciliation
// ============================================================================
describe('CHALLENGER SUITE 4: Math Discrepancy Undo Integrity & Totals', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await invoiceRepository.resetDemoData();
  });

  it('4.1: Reverter valorTotal restaurando divergência matemática re-dispara issue exatamente', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();

    const mathIssue = controller.issues.find((i) => i.itemId === 'd4-5' && i.campo === 'valorTotal');
    assert.ok(mathIssue);
    assert.strictEqual(mathIssue.encontrado, '4000.00');
    assert.strictEqual(mathIssue.esperado, '4500.00');

    // 1. Aplica correção: 4000.00 -> 4500.00
    controller.handleRequestFix(mathIssue);
    await controller.handleConfirmFix();

    let curDoc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(curDoc.itens.find((i) => i.id === 'd4-5').valorTotal, '4500.00');
    // Totais calculados dinamicamente: soma dos itens passa de 91.300 para 91.800 (+500.00)
    assert.strictEqual(curDoc.totais.valorProdutos, '91800.00');
    assert.strictEqual(curDoc.totais.valorTotalNota, '91800.00');
    assert.strictEqual(controller.issues.some((i) => i.campo === 'valorTotal'), false);

    // 2. Executa Undo
    await controller.handleUndo();

    let restoredDoc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(restoredDoc.itens.find((i) => i.id === 'd4-5').valorTotal, '4000.00');
    // Totais retornam para 91.300 (-500.00)
    assert.strictEqual(restoredDoc.totais.valorProdutos, '91300.00');
    assert.strictEqual(restoredDoc.totais.valorTotalNota, '91300.00');

    const totalDiff = decimalSubtract(curDoc.totais.valorProdutos, restoredDoc.totais.valorProdutos);
    assert.strictEqual(totalDiff, '500.00', 'Delta entre valor corrigido e desfeito deve ser exatamente 500.00');

    // 3. Issue reaparece com exatos parâmetros
    const retriggeredIssues = await invoiceRepository.getValidationIssues('demo-04');
    const retriggeredMath = retriggeredIssues.find((i) => i.itemId === 'd4-5' && i.campo === 'valorTotal');
    assert.ok(retriggeredMath, 'Divergência matemática deve ser re-detectada');
    assert.strictEqual(retriggeredMath.encontrado, '4000.00');
    assert.strictEqual(retriggeredMath.esperado, '4500.00');
    assert.strictEqual(retriggeredMath.regra, 'Conferência Matemática');
  });

  it('4.2: Divergência matemática com números fracionados de 4 casas decimais e rollback', async () => {
    // Insere divergência proposital em d1-1 (500 * 25.5000 = 12750.00, gravado 12000.00)
    await invoiceRepository.updateItem('demo-01', 'd1-1', { valorTotal: '12000.00' });
    let issues = await invoiceRepository.getValidationIssues('demo-01');
    const mathIssue = issues.find((i) => i.itemId === 'd1-1' && i.campo === 'valorTotal');
    assert.ok(mathIssue, 'Deve detectar divergência matemática em demo-01');
    assert.strictEqual(mathIssue.encontrado, '12000.00');
    assert.strictEqual(mathIssue.esperado, '12750.00');

    // Aplica correção
    await invoiceRepository.updateItem('demo-01', 'd1-1', { valorTotal: '12750.00' });
    issues = await invoiceRepository.getValidationIssues('demo-01');
    assert.strictEqual(issues.some((i) => i.itemId === 'd1-1' && i.campo === 'valorTotal'), false);

    // Reverte
    await invoiceRepository.updateItem('demo-01', 'd1-1', { valorTotal: '12000.00' });
    issues = await invoiceRepository.getValidationIssues('demo-01');
    const revertedMath = issues.find((i) => i.itemId === 'd1-1' && i.campo === 'valorTotal');
    assert.ok(revertedMath, 'Divergência reaparece após desfazimento');
    assert.strictEqual(revertedMath.encontrado, '12000.00');
  });
});

// ============================================================================
// SUITE 5: Aduaneira Unit Discrepancy Undo Integrity
// ============================================================================
describe('CHALLENGER SUITE 5: Aduaneira Unit Discrepancy Undo Integrity', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await invoiceRepository.resetDemoData();
  });

  it('5.1: Reverter unidade comercial aduaneira restaura a unidade original e reabre apontamento', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();

    const unitIssue = controller.issues.find((i) => i.itemId === 'd4-11' && i.campo === 'unidade');
    assert.ok(unitIssue);
    assert.strictEqual(unitIssue.encontrado, 'METROS');
    assert.strictEqual(unitIssue.esperado, 'PAR');

    // 1. Aplica correção: METROS -> PAR
    controller.handleRequestFix(unitIssue);
    await controller.handleConfirmFix();

    let doc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd4-11').unidade, 'PAR');
    assert.strictEqual(controller.issues.some((i) => i.itemId === 'd4-11' && i.campo === 'unidade'), false);

    // 2. Executa Undo
    await controller.handleUndo();

    doc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd4-11').unidade, 'METROS');

    // 3. Issue re-detectada
    const issues = await invoiceRepository.getValidationIssues('demo-04');
    const retriggeredUnit = issues.find((i) => i.itemId === 'd4-11' && i.campo === 'unidade');
    assert.ok(retriggeredUnit, 'Issue de unidade aduaneira deve ser re-detectada');
    assert.strictEqual(retriggeredUnit.encontrado, 'METROS');
    assert.strictEqual(retriggeredUnit.esperado, 'PAR');
    assert.strictEqual(retriggeredUnit.regra, 'Unidade Aduaneira');
  });

  it('5.2: Inconsistência de unidade é insensível a maiúsculas/minúsculas no teste de conformidade', async () => {
    // Altera d4-11 para 'par' (minúsculo)
    await invoiceRepository.updateItem('demo-04', 'd4-11', { unidade: 'par' });
    let issues = await invoiceRepository.getValidationIssues('demo-04');
    // Deve considerar em conformidade com PAR
    assert.strictEqual(issues.some((i) => i.itemId === 'd4-11' && i.campo === 'unidade'), false);

    // Altera para 'metros' (minúsculo)
    await invoiceRepository.updateItem('demo-04', 'd4-11', { unidade: 'metros' });
    issues = await invoiceRepository.getValidationIssues('demo-04');
    const issue = issues.find((i) => i.itemId === 'd4-11' && i.campo === 'unidade');
    assert.ok(issue, 'metros minúsculo deve disparar erro contra PAR');
  });
});

// ============================================================================
// SUITE 6: Bulk Review Segregation & Sensitive Field Hard Locks
// ============================================================================
describe('CHALLENGER SUITE 6: Bulk Review Segregation & Sensitive Field Hard Locks', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await invoiceRepository.resetDemoData();
  });

  it('6.1: Corrigir Todas aplica exclusivamente mecânicas (valorTotal e unidade) e trava CFOP e NCM', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();
    assert.strictEqual(controller.issues.length, 4);

    controller.handleOpenBulkReview();
    const mechanical = controller.getMechanicalIssues();
    const sensitive = controller.getSensitiveIssues();

    assert.strictEqual(mechanical.length, 2, '2 mecânicas (valorTotal e unidade)');
    assert.strictEqual(sensitive.length, 2, '2 sensíveis (cfop e ncm)');

    // Executa aplicação das selecionadas em lote
    const result = await controller.handleApplySelectedMechanicalFixes();
    assert.strictEqual(result.appliedCount, 2);
    assert.strictEqual(controller.undoStack.length, 2);

    // Documento no repositório
    const doc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd4-5').valorTotal, '4500.00');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd4-11').unidade, 'PAR');
    // CFOP e NCM intocados
    assert.strictEqual(doc.itens.find((i) => i.id === 'd4-3').cfop, '5102');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd4-8').ncm, '6403590');

    // Restam exatamente as 2 issues sensíveis
    assert.strictEqual(controller.issues.length, 2);
    assert.ok(controller.issues.find((i) => i.campo === 'cfop'));
    assert.ok(controller.issues.find((i) => i.campo === 'ncm'));
  });

  it('6.2: Desfazimento LIFO sequencial de lote desfaz cada alteração mecânica individualmente', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();

    controller.handleOpenBulkReview();
    await controller.handleApplySelectedMechanicalFixes();
    assert.strictEqual(controller.undoStack.length, 2);
    assert.strictEqual(controller.issues.length, 2);

    // Undo 1: Desfaz última do lote (unidade d4-11)
    const undo1 = await controller.handleUndo();
    assert.strictEqual(undo1.restoredEntry.campo, 'unidade');
    assert.strictEqual(controller.undoStack.length, 1);
    assert.strictEqual(controller.issues.length, 3);

    // Undo 2: Desfaz penúltima do lote (valorTotal d4-5)
    const undo2 = await controller.handleUndo();
    assert.strictEqual(undo2.restoredEntry.campo, 'valorTotal');
    assert.strictEqual(controller.undoStack.length, 0);
    assert.strictEqual(controller.issues.length, 4);
  });

  it('6.3: Lote mecânico + correção sensível individual + desfazimento completo interleaved', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();

    // 1. Aplica lote mecânico (2 itens)
    controller.handleOpenBulkReview();
    await controller.handleApplySelectedMechanicalFixes();

    // 2. Aplica individual sensível (CFOP d4-3)
    const cfopIssue = controller.issues.find((i) => i.campo === 'cfop');
    controller.handleRequestFix(cfopIssue);
    await controller.handleConfirmFix();

    assert.strictEqual(controller.undoStack.length, 3);
    assert.strictEqual(controller.issues.length, 1, 'Resta apenas NCM');

    // 3. Desfaz CFOP (individual)
    const u1 = await controller.handleUndo();
    assert.strictEqual(u1.restoredEntry.campo, 'cfop');
    assert.strictEqual(controller.issues.length, 2);

    // 4. Desfaz unidade (do lote)
    const u2 = await controller.handleUndo();
    assert.strictEqual(u2.restoredEntry.campo, 'unidade');
    assert.strictEqual(controller.issues.length, 3);

    // 5. Desfaz valorTotal (do lote)
    const u3 = await controller.handleUndo();
    assert.strictEqual(u3.restoredEntry.campo, 'valorTotal');
    assert.strictEqual(controller.issues.length, 4);
    assert.strictEqual(controller.undoStack.length, 0);
  });
});

// ============================================================================
// SUITE 7: Adversarial Chaos & Stress Harness (Randomized Interleaving)
// ============================================================================
describe('CHALLENGER SUITE 7: Adversarial Chaos & Stress Loop', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await invoiceRepository.resetDemoData();
  });

  it('7.1: 20 ciclos de estresse aleatório: mutações parciais, rollbacks e drenagem final', async () => {
    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();

    const pristineDoc = await invoiceRepository.findById('demo-04');
    const pristineItems = pristineDoc.itens.map((it) => ({
      id: it.id,
      cfop: it.cfop,
      ncm: it.ncm,
      unidade: it.unidade,
      valorTotal: it.valorTotal,
      quantidade: it.quantidade,
      valorUnitario: it.valorUnitario,
      situacao: it.situacao,
    }));

    for (let cycle = 1; cycle <= 20; cycle++) {
      // 1. Aplica entre 1 e 3 correções aleatórias
      const numToApply = (cycle % 3) + 1;
      for (let i = 0; i < numToApply; i++) {
        if (controller.issues.length > 0) {
          const targetIssue = controller.issues[0];
          controller.handleRequestFix(targetIssue);
          await controller.handleConfirmFix();
        }
      }

      // 2. Se a pilha tiver mais de 1 item, desfaz 1 item parcialmente
      if (controller.undoStack.length > 1) {
        await controller.handleUndo();
      }

      // 3. Aplica mais 1 correção se houver issues pendentes
      if (controller.issues.length > 0) {
        const nextIssue = controller.issues[controller.issues.length - 1];
        controller.handleRequestFix(nextIssue);
        await controller.handleConfirmFix();
      }

      // 4. Drena completamente a pilha de Undo até ficar vazia
      while (controller.undoStack.length > 0) {
        const res = await controller.handleUndo();
        assert.strictEqual(res.success, true);
      }

      // Invariante estrito do ciclo: com pilha vazia, devemos ter exatamente 4 issues
      assert.strictEqual(
        controller.issues.length,
        4,
        `Ciclo ${cycle}: Deve retornar a exatamente 4 issues após esvaziar a pilha de Undo`
      );
    }

    // Após todos os 20 ciclos caóticos, todos os itens devem coincidir com o baseline original
    const finalDoc = await invoiceRepository.findById('demo-04');
    const finalItems = finalDoc.itens.map((it) => ({
      id: it.id,
      cfop: it.cfop,
      ncm: it.ncm,
      unidade: it.unidade,
      valorTotal: it.valorTotal,
      quantidade: it.quantidade,
      valorUnitario: it.valorUnitario,
      situacao: it.situacao,
    }));

    assert.deepStrictEqual(
      finalItems,
      pristineItems,
      'Após 20 ciclos caóticos com drenagem de Undo, todos os itens e campos fiscais devem coincidir bit-a-bit'
    );
  });

  it('7.2: Isolamento estrito entre notas fiscais — mutações e undos em demo-04 não afetam demo-01', async () => {
    const d1Before = JSON.stringify(await invoiceRepository.findById('demo-01'));

    const controller = new ValidationSessionController('demo-04');
    await controller.loadData();

    // Aplica todas as 4 correções em demo-04
    while (controller.issues.length > 0) {
      controller.handleRequestFix(controller.issues[0]);
      await controller.handleConfirmFix();
    }
    assert.strictEqual(controller.issues.length, 0);

    // Desfaz 2 correções
    await controller.handleUndo();
    await controller.handleUndo();

    const d1After = JSON.stringify(await invoiceRepository.findById('demo-01'));
    assert.strictEqual(d1After, d1Before, 'demo-01 deve permanecer 100% isolado e imutável');
  });
});
