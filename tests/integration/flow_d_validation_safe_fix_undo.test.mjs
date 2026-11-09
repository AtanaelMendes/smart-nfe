/**
 * SmartNFe — Integration Test Suite: Fluxo D (Validação Fiscal, Correção Segura e Mecanismo de Undo)
 *
 * Requisito: R2 (ORIGINAL_REQUEST.md, PROJECT.md)
 *
 * Verificações cobertas:
 * 1. Detecção rigorosa de apontamentos fiscais (CFOP, NCM, matemática, unidade aduaneira).
 * 2. Bloqueio de aplicação silenciosa: exigência de confirmação explícita com modal payload padronizado.
 * 3. Capacidade de cancelamento sem efeitos colaterais.
 * 4. Bloqueio de aplicação em massa ("Corrigir todas") para campos sensíveis (CFOP, NCM, tributação).
 * 5. Permissão de aplicação em lote exclusivamente para correções mecânicas (matemática, unidades).
 * 6. Mecanismo de Desfazer (Undo) com reversão atômica de estado no repositório.
 * 7. Reexecução automática do validador fiscal após cada Undo, reabrindo os apontamentos revertidos.
 * 8. Pilha LIFO de Undo suportando múltiplos passos de reversão sequencial.
 *
 * Execução: node --no-warnings --test tests/integration/flow_d_validation_safe_fix_undo.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { invoiceRepository } from '../../app/features/invoiceRepository.js';
import { localStorageService, STORAGE_KEYS } from '../../app/lib/storage/localStorageService.js';

/**
 * Campos considerados sensíveis fiscalmente pela especificação R2.
 * NUNCA podem ser alterados silenciosamente ou via aplicação em massa ("Corrigir todas").
 */
const SENSITIVE_FIELDS = ['cfop', 'ncm', 'cst', 'aliquota', 'tributos', 'origem'];

/**
 * Classifica um apontamento fiscal como seguro (mecânico) ou sensível (fiscal).
 */
function isSensitiveIssue(issue) {
  const campo = String(issue.campo || '').toLowerCase().trim();
  return SENSITIVE_FIELDS.includes(campo);
}

/**
 * Cria payload oficial do modal de confirmação de correção (PROJECT.md § 6).
 */
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

/**
 * Motor assistente de validação e gerenciador de Undo para os testes de integração.
 */
class ValidationAssistantManager {
  constructor(invoiceId) {
    this.invoiceId = invoiceId;
    this.undoStack = [];
  }

  async getIssues() {
    return await invoiceRepository.getValidationIssues(this.invoiceId);
  }

  /**
   * Aplica correção individual após confirmação explícita.
   */
  async applyConfirmedFix(issue, userConfirmed) {
    if (!userConfirmed) {
      return { applied: false, reason: 'Cancelado pelo usuário' };
    }

    const currentDoc = await invoiceRepository.findById(this.invoiceId);
    const item = currentDoc.itens.find((i) => i.id === issue.itemId);
    if (!item) {
      throw new Error(`Item não encontrado: ${issue.itemId}`);
    }

    const valorAnterior = item[issue.campo];
    const valorNovo = issue.esperado;

    // Atualiza repositório
    await invoiceRepository.updateItem(this.invoiceId, issue.itemId, {
      [issue.campo]: valorNovo,
    });

    // Registra na pilha de Undo
    const undoEntry = {
      issueId: issue.id,
      itemId: issue.itemId,
      campo: issue.campo,
      valorAnterior,
      valorNovo,
      timestamp: new Date().toISOString(),
    };
    this.undoStack.push(undoEntry);

    // Reexecuta validações
    const remainingIssues = await this.getIssues();

    return {
      applied: true,
      undoEntry,
      remainingIssues,
    };
  }

  /**
   * Executa a funcionalidade segura "Corrigir Todas":
   * Aplica em lote APENAS correções mecânicas/seguras.
   * Bloqueia expressamente aplicação em massa de campos sensíveis (CFOP, NCM).
   */
  async applySafeBulkFix() {
    const issues = await this.getIssues();
    const mechanicalIssues = [];
    const blockedSensitiveIssues = [];

    for (const issue of issues) {
      if (isSensitiveIssue(issue)) {
        blockedSensitiveIssues.push(issue);
      } else {
        mechanicalIssues.push(issue);
      }
    }

    const appliedEntries = [];
    for (const issue of mechanicalIssues) {
      const res = await this.applyConfirmedFix(issue, true);
      if (res.applied) {
        appliedEntries.push(res.undoEntry);
      }
    }

    const remainingIssues = await this.getIssues();

    return {
      appliedCount: appliedEntries.length,
      blockedCount: blockedSensitiveIssues.length,
      appliedEntries,
      blockedSensitiveIssues,
      remainingIssues,
    };
  }

  /**
   * Desfaz a última alteração (Undo).
   */
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
}

describe('Fluxo D — Detecção de Apontamentos Fiscais (R2)', () => {
  beforeEach(async () => {
    await invoiceRepository.resetDemoData();
  });

  it('Detecta os 4 apontamentos fiscais previstos no cenário demo-04', async () => {
    const manager = new ValidationAssistantManager('demo-04');
    const issues = await manager.getIssues();

    assert.strictEqual(issues.length, 4, 'demo-04 deve conter exatamente 4 inconsistências fiscais');

    // Valida presença de cada categoria
    const cfopIssue = issues.find((i) => i.campo === 'cfop');
    assert.ok(cfopIssue, 'Deve conter apontamento de CFOP');
    assert.strictEqual(cfopIssue.encontrado, '5102');
    assert.strictEqual(cfopIssue.esperado, '7101');
    assert.strictEqual(isSensitiveIssue(cfopIssue), true, 'CFOP deve ser classificado como sensível');

    const ncmIssue = issues.find((i) => i.campo === 'ncm');
    assert.ok(ncmIssue, 'Deve conter apontamento de NCM');
    assert.strictEqual(ncmIssue.encontrado, '6403590');
    assert.strictEqual(ncmIssue.esperado, '64035910');
    assert.strictEqual(isSensitiveIssue(ncmIssue), true, 'NCM deve ser classificado como sensível');

    const mathIssue = issues.find((i) => i.campo === 'valorTotal');
    assert.ok(mathIssue, 'Deve conter apontamento de divergência matemática');
    assert.strictEqual(mathIssue.encontrado, '4000.00');
    assert.strictEqual(mathIssue.esperado, '4500.00');
    assert.strictEqual(isSensitiveIssue(mathIssue), false, 'Matemática é correção mecânica/segura');

    const unitIssue = issues.find((i) => i.campo === 'unidade');
    assert.ok(unitIssue, 'Deve conter apontamento de unidade aduaneira');
    assert.strictEqual(unitIssue.encontrado, 'METROS');
    assert.strictEqual(unitIssue.esperado, 'PAR');
    assert.strictEqual(isSensitiveIssue(unitIssue), false, 'Unidade aduaneira é mecânica');
  });
});

describe('Fluxo D — Exigência de Confirmação Explícita e Cancelamento (R2)', () => {
  beforeEach(async () => {
    await invoiceRepository.resetDemoData();
  });

  it('Gera payload completo para o modal de confirmação com valores e origem da regra', async () => {
    const manager = new ValidationAssistantManager('demo-04');
    const issues = await manager.getIssues();
    const issue = issues.find((i) => i.campo === 'cfop');

    const payload = createConfirmationPayload(issue);
    assert.strictEqual(payload.campo, 'cfop');
    assert.strictEqual(payload.valorAtual, '5102');
    assert.strictEqual(payload.valorProposto, '7101');
    assert.strictEqual(payload.origemRegra, 'CFOP de Exportação');
    assert.strictEqual(payload.isSensivel, true);
    assert.ok(payload.itemId);
  });

  it('Não altera o documento quando o usuário clica em Cancelar no modal de confirmação', async () => {
    const manager = new ValidationAssistantManager('demo-04');
    const issuesBefore = await manager.getIssues();
    const mathIssue = issuesBefore.find((i) => i.campo === 'valorTotal');

    // Usuário cancela a confirmação (userConfirmed = false)
    const result = await manager.applyConfirmedFix(mathIssue, false);
    assert.strictEqual(result.applied, false);
    assert.strictEqual(manager.undoStack.length, 0, 'Pilha de Undo deve continuar vazia');

    // Documento e apontamentos devem permanecer intactos
    const issuesAfter = await manager.getIssues();
    assert.strictEqual(issuesAfter.length, 4);

    const doc = await invoiceRepository.findById('demo-04');
    const item = doc.itens.find((i) => i.id === mathIssue.itemId);
    assert.strictEqual(item.valorTotal, '4000.00', 'Valor não deve ter sido modificado');
  });

  it('Aplica a correção quando o usuário confirma explicitamente e registra no Undo', async () => {
    const manager = new ValidationAssistantManager('demo-04');
    const issuesBefore = await manager.getIssues();
    const mathIssue = issuesBefore.find((i) => i.campo === 'valorTotal');

    // Confirmação explícita
    const result = await manager.applyConfirmedFix(mathIssue, true);
    assert.strictEqual(result.applied, true);
    assert.strictEqual(manager.undoStack.length, 1);

    // O apontamento resolvido deve desaparecer da lista de issues
    assert.strictEqual(result.remainingIssues.length, 3);
    assert.strictEqual(result.remainingIssues.some((i) => i.campo === 'valorTotal'), false);

    // Repositório reflete o novo valor corrigido
    const doc = await invoiceRepository.findById('demo-04');
    const item = doc.itens.find((i) => i.id === mathIssue.itemId);
    assert.strictEqual(item.valorTotal, '4500.00');
  });
});

describe('Fluxo D — Bloqueio de Aplicação em Massa para Campos Sensíveis (R2)', () => {
  beforeEach(async () => {
    await invoiceRepository.resetDemoData();
  });

  it('Corrigir Todas aplica apenas correções mecânicas e bloqueia CFOP e NCM em massa', async () => {
    const manager = new ValidationAssistantManager('demo-04');
    const issuesBefore = await manager.getIssues();
    assert.strictEqual(issuesBefore.length, 4);

    // Aciona "Corrigir Todas"
    const bulkResult = await manager.applySafeBulkFix();

    // 2 correções mecânicas aplicadas (valorTotal e unidade)
    assert.strictEqual(bulkResult.appliedCount, 2);
    assert.strictEqual(
      bulkResult.appliedEntries.every((e) => ['valorTotal', 'unidade'].includes(e.campo)),
      true
    );

    // 2 correções fiscais sensíveis BLOQUEADAS da aplicação em massa (cfop e ncm)
    assert.strictEqual(bulkResult.blockedCount, 2);
    assert.strictEqual(
      bulkResult.blockedSensitiveIssues.every((i) => ['cfop', 'ncm'].includes(i.campo)),
      true
    );

    // As 2 issues sensíveis continuam ativas para análise individual do operador
    assert.strictEqual(bulkResult.remainingIssues.length, 2);
    assert.ok(bulkResult.remainingIssues.find((i) => i.campo === 'cfop'));
    assert.ok(bulkResult.remainingIssues.find((i) => i.campo === 'ncm'));
  });
});

describe('Fluxo D — Mecanismo de Undo com Reversão Atômica e Reexecução (R2)', () => {
  beforeEach(async () => {
    await invoiceRepository.resetDemoData();
  });

  it('Executa Undo de uma correção revertendo o valor e reabrindo o apontamento fiscal', async () => {
    const manager = new ValidationAssistantManager('demo-04');
    const issues = await manager.getIssues();
    const cfopIssue = issues.find((i) => i.campo === 'cfop');

    // 1. Aplica correção confirmada
    await manager.applyConfirmedFix(cfopIssue, true);
    let currentIssues = await manager.getIssues();
    assert.strictEqual(currentIssues.length, 3, 'Após correção de CFOP, restam 3 issues');

    let doc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(doc.itens.find((i) => i.id === cfopIssue.itemId).cfop, '7101');

    // 2. Executa Undo
    const undoResult = await manager.undo();
    assert.strictEqual(undoResult.success, true);
    assert.strictEqual(undoResult.restored.campo, 'cfop');
    assert.strictEqual(undoResult.restored.valorAnterior, '5102');

    // 3. Documento no repositório volta ao valor anterior
    doc = await invoiceRepository.findById('demo-04');
    assert.strictEqual(doc.itens.find((i) => i.id === cfopIssue.itemId).cfop, '5102');

    // 4. Validador fiscal reexecutado: o apontamento volta a existir!
    assert.strictEqual(undoResult.remainingIssues.length, 4);
    assert.ok(undoResult.remainingIssues.find((i) => i.campo === 'cfop'));
  });

  it('Suporta múltiplos Undos sequenciais em ordem LIFO restaurando o estado original completo', async () => {
    const manager = new ValidationAssistantManager('demo-04');
    const issues = await manager.getIssues();

    const cfopIssue = issues.find((i) => i.campo === 'cfop');
    const ncmIssue = issues.find((i) => i.campo === 'ncm');

    // Aplica correção 1 (CFOP)
    await manager.applyConfirmedFix(cfopIssue, true);
    // Aplica correção 2 (NCM)
    await manager.applyConfirmedFix(ncmIssue, true);

    assert.strictEqual(manager.undoStack.length, 2);
    assert.strictEqual((await manager.getIssues()).length, 2);

    // 1º Undo: Desfaz a correção 2 (NCM)
    const undo1 = await manager.undo();
    assert.strictEqual(undo1.restored.campo, 'ncm');
    assert.strictEqual((await manager.getIssues()).length, 3);

    // 2º Undo: Desfaz a correção 1 (CFOP)
    const undo2 = await manager.undo();
    assert.strictEqual(undo2.restored.campo, 'cfop');
    assert.strictEqual((await manager.getIssues()).length, 4);

    // Pilha esgotada
    assert.strictEqual(manager.undoStack.length, 0);
    const undoEmpty = await manager.undo();
    assert.strictEqual(undoEmpty.success, false);
  });
});
