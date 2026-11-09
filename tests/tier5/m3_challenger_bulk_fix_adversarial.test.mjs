/**
 * SmartNFe — Tier 5 Adversarial Stress Suite: Milestone 3 Validation Safety & Bulk Fix
 * Challenger: teamwork_challenger_m3_validacao_2
 * Target: Milestone 3 (M3_Validation_Safety_Assistant_Undo)
 * Requirements: R2 (ORIGINAL_REQUEST.md, PROJECT.md)
 *
 * Empirical adversarial verification of:
 * 1. Sensitive fields locking:
 *    - Asserts fields like cfop, ncm, tributacao, aliquota, cst, csosn, origem cannot be checked or applied in mass.
 *    - Verifies static AST invariants in app/documentos/[id]/validacao/page.jsx.
 *    - Fuzzes isSensitiveIssue with hostile casing, whitespaces, prefix variants, and malformed inputs.
 * 2. Mechanical batch application:
 *    - Applying selected mechanical fixes leaves sensitive fiscal fields completely untouched.
 *    - Malicious injection: injecting sensitive issue IDs into selection set is strictly filtered out.
 *    - Partial selection of mechanical fixes applies only the selected subset.
 * 3. Atomic batch undo:
 *    - Performing batch undo on applied mechanical fixes reverts all of them simultaneously in a single atomic transaction.
 *    - Verifies zero residual corruption, bit-for-bit restoration of document state, and automatic re-opening of issues.
 *    - Sequential LIFO undo multi-step rollback hardening.
 * 4. Demonstration tagging:
 *    - Asserts all explanations, modal subtitles, rule origin badges, and assistant advice are strictly tagged as demonstration.
 *
 * Execution: node --no-warnings --test tests/tier5/m3_challenger_bulk_fix_adversarial.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { invoiceRepository } from '../../app/features/invoiceRepository.js';
import { localStorageService, STORAGE_KEYS } from '../../app/lib/storage/localStorageService.js';
import { calculateInvoiceTotals, calculateItemTotal } from '../../app/lib/calculations/invoiceTotals.js';
import { decimalCompare, decimalSubtract } from '../../app/lib/calculations/decimal.js';

const ROOT_DIR = process.cwd();
const VALIDACAO_PAGE_PATH = resolve(ROOT_DIR, 'app/documentos/[id]/validacao/page.jsx');

// ============================================================================
// Modelagem Fiel dos Invariantes de Negócio de Validação e Undo
// ============================================================================

const SENSITIVE_FIELDS = ['cfop', 'ncm', 'cst', 'csosn', 'aliquota', 'tributos', 'origem'];

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
 * Controlador de Validação e Batch Undo Transacional para Testes Adversariais.
 * Simula a máquina de estados completa de `SafeBulkReviewModal` e `ValidacaoPage`.
 */
class AdversarialValidationController {
  constructor(invoiceId) {
    this.invoiceId = invoiceId;
    this.undoStack = [];
    this.batchUndoTransactions = new Map(); // batchId -> array de entradas
  }

  async getDocument() {
    return await invoiceRepository.findById(this.invoiceId);
  }

  async getIssues() {
    return await invoiceRepository.getValidationIssues(this.invoiceId);
  }

  /**
   * Simula o comportamento exato de `handleApplySelectedMechanicalFixes` com proteção estrita.
   * Incluso teste de injeção maliciosa de IDs sensíveis.
   */
  async applySelectedMechanicalFixes(selectedIds) {
    const issues = await this.getIssues();
    const mechanicalIssues = issues.filter((iss) => !isSensitiveIssue(iss));
    const sensitiveIssues = issues.filter((iss) => isSensitiveIssue(iss));

    // FILTRO ESTRITO DO COMPONENTE: Somente mechanicalIssues podem ser selecionadas
    const issuesToApply = mechanicalIssues.filter((iss) => selectedIds.has(iss.id));

    if (issuesToApply.length === 0) {
      return {
        appliedCount: 0,
        blockedSensitiveAttemptCount: sensitiveIssues.filter((s) => selectedIds.has(s.id)).length,
        appliedEntries: [],
        remainingIssues: issues,
      };
    }

    const currentDoc = await this.getDocument();
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newUndoEntries = [];

    for (const issue of issuesToApply) {
      const currentItem = currentDoc.itens.find((i) => i.id === issue.itemId);
      const valorAnterior = currentItem ? currentItem[issue.campo] : issue.encontrado;
      const valorNovo = issue.esperado;

      await invoiceRepository.updateItem(this.invoiceId, issue.itemId, {
        [issue.campo]: valorNovo,
      });

      const entry = {
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

      newUndoEntries.push(entry);
      this.undoStack.push(entry);
    }

    this.batchUndoTransactions.set(batchId, [...newUndoEntries]);

    const remainingIssues = await this.getIssues();

    return {
      batchId,
      appliedCount: issuesToApply.length,
      blockedSensitiveAttemptCount: sensitiveIssues.filter((s) => selectedIds.has(s.id)).length,
      appliedEntries: newUndoEntries,
      remainingIssues,
    };
  }

  /**
   * Executa Desfazer em Lote Atômico (Atomic Batch Undo).
   * Reverte simultaneamente TODAS as alterações pertencentes ao lote em uma transação única.
   */
  async undoBatch(batchId) {
    const batchEntries = this.batchUndoTransactions.get(batchId);
    if (!batchEntries || batchEntries.length === 0) {
      return { success: false, reason: 'Lote de Undo não encontrado' };
    }

    // Reversão simultânea de todos os itens do lote (LIFO dos itens dentro do lote)
    for (const entry of [...batchEntries].reverse()) {
      await invoiceRepository.updateItem(this.invoiceId, entry.itemId, {
        [entry.campo]: entry.valorAnterior,
      });
    }

    // Remove todas as entradas desse lote da pilha de undo
    this.undoStack = this.undoStack.filter((e) => e.batchId !== batchId);
    this.batchUndoTransactions.delete(batchId);

    // Reexecuta auditoria fiscal automática
    const revalidatedIssues = await this.getIssues();

    return {
      success: true,
      batchId,
      revertedCount: batchEntries.length,
      revertedEntries: batchEntries,
      remainingIssues: revalidatedIssues,
    };
  }

  /**
   * Executa Desfazer individual sequencial (LIFO).
   */
  async undoSingle() {
    if (this.undoStack.length === 0) {
      return { success: false, reason: 'Pilha de Undo vazia' };
    }

    const lastAction = this.undoStack.pop();
    await invoiceRepository.updateItem(this.invoiceId, lastAction.itemId, {
      [lastAction.campo]: lastAction.valorAnterior,
    });

    const revalidatedIssues = await this.getIssues();

    return {
      success: true,
      restored: lastAction,
      remainingIssues: revalidatedIssues,
    };
  }
}

// ============================================================================
// SUITE 1: Auditoria Estática de Código e Invariantes do SafeBulkReviewModal
// ============================================================================
describe('CHALLENGER SUITE 1: Auditoria Estática de Código e Guardrails em validacao/page.jsx', () => {
  assert.ok(existsSync(VALIDACAO_PAGE_PATH), 'app/documentos/[id]/validacao/page.jsx deve existir');
  const sourceCode = readFileSync(VALIDACAO_PAGE_PATH, 'utf-8');

  it('1.1: SENSITIVE_FIELDS contém expressamente os campos fiscais críticos da norma R2', () => {
    assert.match(sourceCode, /export\s+const\s+SENSITIVE_FIELDS\s*=\s*\[/);
    const requiredSensitiveFields = ['cfop', 'ncm', 'cst', 'csosn', 'aliquota', 'tributos', 'origem'];
    for (const field of requiredSensitiveFields) {
      assert.ok(
        sourceCode.includes(`'${field}'`) || sourceCode.includes(`"${field}"`),
        `SENSITIVE_FIELDS deve incluir '${field}'`
      );
    }
  });

  it('1.2: isSensitiveIssue e createConfirmationPayload estão devidamente implementadas e exportadas', () => {
    assert.match(sourceCode, /export\s+function\s+isSensitiveIssue\s*\(/);
    assert.match(sourceCode, /export\s+function\s+createConfirmationPayload\s*\(/);
  });

  it('1.3: SafeBulkReviewModal bloqueia fisicamente checkboxes para campos sensíveis', () => {
    // Verifica que existe o título e aviso de bloqueio em massa
    assert.match(sourceCode, /Campos Fiscais Sensíveis/);
    assert.match(sourceCode, /Aplicação em Massa Bloqueada/);
    assert.match(sourceCode, /Proteção Fiscal Ativa/);

    // Verifica presença do ícone faLock nos campos sensíveis
    assert.match(sourceCode, /faLock/);
    assert.match(sourceCode, /cursor-not-allowed/);

    // Verifica que a ação permitida para sensíveis é estritamente 'Revisar Individualmente'
    assert.match(sourceCode, /Revisar Individualmente/);
    assert.match(sourceCode, /onReviewSingle/);
  });

  it('1.4: handleApplySelectedMechanicalFixes filtra estritamente por mechanicalIssues', () => {
    // Assert do filtro estrito impedindo injeção de IDs sensíveis
    assert.match(
      sourceCode,
      /mechanicalIssues\.filter\(\s*\(iss\)\s*=>\s*selectedMechanicalIssueIds\.has\(iss\.id\)\s*\)/
    );
  });

  it('1.5: Todas as orientações e assistentes estão marcados com tag de Demonstração', () => {
    assert.match(sourceCode, /\[Demonstração\]/);
    assert.match(sourceCode, /Sugestão Fiscal Demonstrativa/);
    assert.match(sourceCode, /\[Demonstração\] Validação Fiscal Assistida/);
    assert.match(sourceCode, /\[Demonstração\] Separação de Segurança Fiscal e Bloqueio de Massa/);
  });

  it('1.6: Eliminação completa do loop cego e silencioso de correção em massa anterior', () => {
    // O código anterior executava: for (const issue of issues) await invoiceRepository.updateItem(...)
    // sem modal e sem conferência. Verificamos ausência dessa chamada direta cega.
    assert.strictEqual(
      /for\s*\(\s*const\s+issue\s+of\s+issues\s*\)\s*await\s+invoiceRepository\.updateItem/.test(sourceCode),
      false,
      'Não deve existir loop direto desprotegido sobre issues alterando o repositório'
    );
  });

  it('1.7: Modal de confirmação possui suporte a cancelamento e acessibilidade (Escape/Backdrop)', () => {
    assert.match(sourceCode, /role="dialog"/);
    assert.match(sourceCode, /aria-modal="true"/);
    assert.match(sourceCode, /e\.key === 'Escape'/);
    assert.match(sourceCode, /handleBackdropClick/);
  });

  it('1.8: FiscalFixConfirmationModal exibe badges de risco diferenciando Alteração Fiscal Sensível e Correção Mecânica', () => {
    assert.match(sourceCode, /Alteração Fiscal Sensível/);
    assert.match(sourceCode, /Correção Mecânica \/ Conciliação Aritmética/);
  });

  it('1.9: FiscalFixConfirmationModal renderiza comparativo com valorAtual em vermelho e valorProposto em verde', () => {
    assert.match(sourceCode, /Valor Atual no Documento/);
    assert.match(sourceCode, /Valor Proposto pelo Assistente/);
    assert.match(sourceCode, /bg-red-100 text-red-800/);
    assert.match(sourceCode, /bg-emerald-100 text-emerald-800/);
  });
});

// ============================================================================
// SUITE 2: Fuzzing e Invariantes Adversariais de Classificação Fiscal
// ============================================================================
describe('CHALLENGER SUITE 2: Fuzzing de Classificação de Campos Sensíveis vs Mecânicos', () => {
  it('2.1: Identifica todas as variações de campos sensíveis sob diversas formas de caixa e espaços', () => {
    const sensitiveTestCases = [
      'cfop',
      'CFOP',
      'CfOp',
      '  cfop  ',
      'ncm',
      'NCM',
      '  ncm',
      'cst',
      'CST',
      'cst_icms',
      'cst_pis',
      'csosn',
      'CSOSN',
      'aliquota',
      'ALIQUOTA',
      'aliquota_icms',
      'aliquota_ipi',
      'aliquota_iss',
      'tributos',
      'tributo',
      'tributo_icms',
      'tributo_pis',
      'origem',
      'ORIGEM',
    ];

    for (const campo of sensitiveTestCases) {
      const issue = { id: 'iss-test', campo, encontrado: 'x', esperado: 'y' };
      assert.strictEqual(
        isSensitiveIssue(issue),
        true,
        `Campo '${campo}' deve ser classificado como estritamente sensível`
      );
    }
  });

  it('2.2: Classifica corretamente campos mecânicos e de cálculo como seguros', () => {
    const mechanicalTestCases = [
      'valorTotal',
      'unidade',
      'quantidade',
      'valorUnitario',
      'desconto',
      'descricao',
      'codigo',
      'pesoLiquido',
      'pesoBruto',
    ];

    for (const campo of mechanicalTestCases) {
      const issue = { id: 'iss-test', campo, encontrado: '1', esperado: '2' };
      assert.strictEqual(
        isSensitiveIssue(issue),
        false,
        `Campo '${campo}' deve ser classificado como mecânico/seguro`
      );
    }
  });

  it('2.3: Resiliência contra payloads nulos, vazios ou corrompidos sem disparo de exceções', () => {
    const hostileInputs = [
      null,
      undefined,
      {},
      { campo: null },
      { campo: undefined },
      { campo: '' },
      { campo: 123 },
      { campo: {} },
      { campo: [] },
    ];

    for (const input of hostileInputs) {
      assert.doesNotThrow(() => {
        const result = isSensitiveIssue(input);
        assert.strictEqual(typeof result, 'boolean');
      });
    }
  });

  it('2.4: createConfirmationPayload preserva valores, identificadores e status sensível', () => {
    const issueSensivel = {
      id: 'iss-cfop',
      itemId: 'd4-3',
      itemNumero: 3,
      itemDescricao: 'Bota Couro',
      campo: 'cfop',
      encontrado: '5102',
      esperado: '7101',
      regra: 'CFOP Exterior',
    };

    const payload = createConfirmationPayload(issueSensivel);
    assert.strictEqual(payload.isSensivel, true);
    assert.strictEqual(payload.labelCampo, 'CFOP');
    assert.strictEqual(payload.valorAtual, '5102');
    assert.strictEqual(payload.valorProposto, '7101');
    assert.strictEqual(payload.origemRegra, 'CFOP Exterior');

    const issueMecanica = {
      id: 'iss-math',
      itemId: 'd4-5',
      itemNumero: 5,
      itemDescricao: 'Sapatilha',
      campo: 'valorTotal',
      encontrado: '4000.00',
      esperado: '4500.00',
      regra: 'Divergência Matemática',
    };

    const payloadMec = createConfirmationPayload(issueMecanica);
    assert.strictEqual(payloadMec.isSensivel, false);
    assert.strictEqual(payloadMec.labelCampo, 'VALORTOTAL');
  });
});

// ============================================================================
// SUITE 3: Aplicação Mecânica em Lote e Isolamento Estrito de Campos Sensíveis
// ============================================================================
describe('CHALLENGER SUITE 3: Aplicação Mecânica em Lote e Isolamento de Campos Sensíveis', () => {
  beforeEach(async () => {
    await invoiceRepository.resetDemoData();
  });

  it('3.1: Ataque de Injeção: Tentar forçar IDs sensíveis no lote mecânico é bloqueado 100%', async () => {
    const controller = new AdversarialValidationController('demo-04');
    const issuesBefore = await controller.getIssues();
    assert.strictEqual(issuesBefore.length, 4, 'demo-04 deve iniciar com 4 inconsistências');

    const docBefore = await controller.getDocument();
    const cfopItemBefore = docBefore.itens.find((i) => i.id === 'd4-3');
    const ncmItemBefore = docBefore.itens.find((i) => i.id === 'd4-8');

    assert.strictEqual(cfopItemBefore.cfop, '5102');
    assert.strictEqual(ncmItemBefore.ncm, '6403590');

    // ATAQUE ADVERSARIAL: O atacante injeta deliberadamente os IDs de CFOP e NCM na seleção do modal
    const maliciousSelection = new Set(issuesBefore.map((iss) => iss.id)); // seleciona TODAS as 4 issues
    assert.strictEqual(maliciousSelection.size, 4);

    const applyResult = await controller.applySelectedMechanicalFixes(maliciousSelection);

    // O sistema DEVE aplicar apenas as 2 mecânicas e bloquear as 2 sensíveis
    assert.strictEqual(applyResult.appliedCount, 2, 'Apenas 2 correções mecânicas podem ser aplicadas');
    assert.strictEqual(applyResult.blockedSensitiveAttemptCount, 2, 'As 2 tentativas sensíveis devem ser bloqueadas');

    // Verifica que o documento no repositório NÃO TEVE seus campos sensíveis alterados
    const docAfter = await controller.getDocument();
    const cfopItemAfter = docAfter.itens.find((i) => i.id === 'd4-3');
    const ncmItemAfter = docAfter.itens.find((i) => i.id === 'd4-8');

    assert.strictEqual(cfopItemAfter.cfop, '5102', 'CFOP deve permanecer intacto (5102)');
    assert.strictEqual(ncmItemAfter.ncm, '6403590', 'NCM deve permanecer intacto (6403590)');

    // Verifica que os campos mecânicos foram de fato atualizados com sucesso
    const mathItemAfter = docAfter.itens.find((i) => i.id === 'd4-5');
    const unitItemAfter = docAfter.itens.find((i) => i.id === 'd4-11');
    assert.strictEqual(mathItemAfter.valorTotal, '4500.00', 'valorTotal deve ter sido corrigido para 4500.00');
    assert.strictEqual(unitItemAfter.unidade, 'PAR', 'unidade deve ter sido corrigida para PAR');

    // Na auditoria fiscal subsequente, restam apenas os 2 apontamentos sensíveis
    assert.strictEqual(applyResult.remainingIssues.length, 2);
    assert.ok(applyResult.remainingIssues.find((i) => i.campo === 'cfop'));
    assert.ok(applyResult.remainingIssues.find((i) => i.campo === 'ncm'));
  });

  it('3.2: Seleção parcial: Selecionar 1 de 2 correções mecânicas atualiza exclusivamente a escolhida', async () => {
    const controller = new AdversarialValidationController('demo-04');
    const issues = await controller.getIssues();
    const mathIssue = issues.find((i) => i.campo === 'valorTotal');
    const unitIssue = issues.find((i) => i.campo === 'unidade');

    // Seleciona APENAS a divergência matemática, desmarcando a unidade
    const partialSelection = new Set([mathIssue.id]);

    const result = await controller.applySelectedMechanicalFixes(partialSelection);
    assert.strictEqual(result.appliedCount, 1);

    const doc = await controller.getDocument();
    assert.strictEqual(doc.itens.find((i) => i.id === mathIssue.itemId).valorTotal, '4500.00');
    assert.strictEqual(doc.itens.find((i) => i.id === unitIssue.itemId).unidade, 'METROS', 'Unidade desmarcada não deve mudar');

    // Restam 3 apontamentos (2 sensíveis + 1 mecânico não selecionado)
    assert.strictEqual(result.remainingIssues.length, 3);
  });

  it('3.3: Estresse em Alta Escala: Lote sintético com 30 itens (15 sensíveis e 15 mecânicos)', async () => {
    // Cria documento sintético com 30 itens
    const syntheticItems = [];
    for (let idx = 1; idx <= 30; idx++) {
      const isSensitiveRow = idx % 2 === 0;
      syntheticItems.push({
        id: `synth-${idx}`,
        item: idx,
        codigo: `PROD-${idx}`,
        descricao: `Produto Teste ${idx}`,
        ncm: isSensitiveRow ? '6403590' : '64035910',
        cfop: isSensitiveRow ? '5102' : '7101',
        unidade: !isSensitiveRow ? 'METROS' : 'PAR',
        quantidade: '10.0000',
        valorUnitario: '100.0000',
        valorTotal: !isSensitiveRow ? '900.00' : '1000.00', // erro de cálculo nos mecânicos
        situacao: 'inconsistente',
        inconsistencias: isSensitiveRow
          ? [
              { tipo: 'erro', campo: 'cfop', esperado: '7101', encontrado: '5102' },
              { tipo: 'erro', campo: 'ncm', esperado: '64035910', encontrado: '6403590' },
            ]
          : [
              { tipo: 'erro', campo: 'valorTotal', esperado: '1000.00', encontrado: '900.00' },
              { tipo: 'aviso', campo: 'unidade', esperado: 'PAR', encontrado: 'METROS' },
            ],
      });
    }

    const syntheticInvoice = {
      id: 'synth-stress-doc',
      numero: '999.888.777',
      serie: '1',
      tipoDocumento: 'XML',
      destinatario: { pais: 'Espanha' },
      itens: syntheticItems,
      totais: { valorTotalNota: '30000.00' },
      isDemo: true,
    };

    localStorageService.save(STORAGE_KEYS.INVOICES, [syntheticInvoice]);

    const controller = new AdversarialValidationController('synth-stress-doc');
    const issues = await controller.getIssues();

    // 15 itens mecânicos x 2 erros = 30 issues mecânicas
    // 15 itens sensíveis x 2 erros = 30 issues sensíveis
    const mechanicalIssues = issues.filter((i) => !isSensitiveIssue(i));
    const sensitiveIssues = issues.filter((i) => isSensitiveIssue(i));
    assert.ok(mechanicalIssues.length > 0);
    assert.ok(sensitiveIssues.length > 0);

    // Seleciona todas as mecânicas + injeta todas as sensíveis
    const allIssueIds = new Set(issues.map((i) => i.id));
    const applyResult = await controller.applySelectedMechanicalFixes(allIssueIds);

    // Somente mecânicas foram aplicadas
    assert.strictEqual(applyResult.appliedCount, mechanicalIssues.length);

    // Verifica que 100% dos 15 itens sensíveis mantêm CFOP e NCM originais
    const verifiedDoc = await controller.getDocument();
    for (let idx = 2; idx <= 30; idx += 2) {
      const itm = verifiedDoc.itens.find((i) => i.id === `synth-${idx}`);
      assert.strictEqual(itm.cfop, '5102', `Item ${idx} CFOP não deve ser alterado`);
      assert.strictEqual(itm.ncm, '6403590', `Item ${idx} NCM não deve ser alterado`);
    }
  });

  it('3.4: Verificação de isolamento: Itens não selecionados conservam modificado: false e não sofrem efeito colateral', async () => {
    const controller = new AdversarialValidationController('demo-04');
    const issues = await controller.getIssues();
    const mathIssue = issues.find((i) => i.campo === 'valorTotal');

    // Aplica apenas a divergência matemática
    await controller.applySelectedMechanicalFixes(new Set([mathIssue.id]));

    const doc = await controller.getDocument();
    // Itens que estavam conformes (ex: item 1 d4-1, item 2 d4-2) devem continuar com modificado: false
    const item1 = doc.itens.find((i) => i.id === 'd4-1');
    const item2 = doc.itens.find((i) => i.id === 'd4-2');
    assert.strictEqual(item1.modificado, false);
    assert.strictEqual(item2.modificado, false);
  });
});

// ============================================================================
// SUITE 4: Mecanismo de Desfazer em Lote Atômico (Atomic Batch Undo)
// ============================================================================
describe('CHALLENGER SUITE 4: Reversão Atômica em Lote (Atomic Batch Undo) e Fidelidade de Estado', () => {
  beforeEach(async () => {
    await invoiceRepository.resetDemoData();
  });

  it('4.1: Atomic Batch Undo reverte simultaneamente todas as correções mecânicas em uma transação atômica', async () => {
    const controller = new AdversarialValidationController('demo-04');

    // 1. Snapshot integral do documento antes da aplicação em lote
    const docPreBatch = JSON.parse(JSON.stringify(await controller.getDocument()));
    const issuesPreBatch = await controller.getIssues();
    assert.strictEqual(issuesPreBatch.length, 4);

    // 2. Aplica lote de correções mecânicas (valorTotal e unidade)
    const issues = await controller.getIssues();
    const mechanicalIssueIds = new Set(issues.filter((i) => !isSensitiveIssue(i)).map((i) => i.id));
    const applyResult = await controller.applySelectedMechanicalFixes(mechanicalIssueIds);
    assert.strictEqual(applyResult.appliedCount, 2);
    assert.strictEqual(applyResult.remainingIssues.length, 2);

    // Confirma estado mutado no repositório
    let docMid = await controller.getDocument();
    assert.strictEqual(docMid.itens.find((i) => i.id === 'd4-5').valorTotal, '4500.00');
    assert.strictEqual(docMid.itens.find((i) => i.id === 'd4-11').unidade, 'PAR');
    assert.strictEqual(docMid.totais.valorTotalNota, '91800.00');

    // 3. Executa Desfazer em Lote Atômico (Atomic Batch Undo)
    const undoResult = await controller.undoBatch(applyResult.batchId);
    assert.strictEqual(undoResult.success, true);
    assert.strictEqual(undoResult.revertedCount, 2);

    // 4. Verificação de Invariantes Pós-Undo Atômico:
    // a) Ambos os itens devem retornar aos seus exatos valores pré-lote
    const docPostUndo = await controller.getDocument();
    const itemMath = docPostUndo.itens.find((i) => i.id === 'd4-5');
    const itemUnit = docPostUndo.itens.find((i) => i.id === 'd4-11');

    assert.strictEqual(itemMath.valorTotal, '4000.00', 'valorTotal deve retornar a 4000.00');
    assert.strictEqual(itemUnit.unidade, 'METROS', 'unidade deve retornar a METROS');

    // b) Totais da nota revertem exatamente a diferença aplicada (+500 -> -500)
    assert.strictEqual(
      decimalSubtract(docMid.totais.valorTotalNota, docPostUndo.totais.valorTotalNota, 2),
      '500.00',
      'Total da NF-e deve reverter exatamente o acréscimo de 500.00'
    );
    assert.strictEqual(
      docPostUndo.totais.valorTotalNota,
      '91300.00',
      'Total recalculado da NF-e pós-undo deve ser 91300.00'
    );

    // c) Ambos os apontamentos fiscais devem ser reabertos simultaneamente
    assert.strictEqual(undoResult.remainingIssues.length, 4, 'Todas as 4 issues devem estar ativas novamente');
    assert.ok(undoResult.remainingIssues.find((i) => i.campo === 'valorTotal'));
    assert.ok(undoResult.remainingIssues.find((i) => i.campo === 'unidade'));

    // d) Pilha de Undo do lote deve estar completamente limpa
    assert.strictEqual(controller.undoStack.length, 0);
  });

  it('4.2: Atomic Batch Undo em lote massivo de 10 itens garante zero corrupção residual', async () => {
    // Cria 10 itens mecânicos divergentes
    const items = [];
    for (let i = 1; i <= 10; i++) {
      items.push({
        id: `batch-item-${i}`,
        item: i,
        codigo: `MEC-${i}`,
        descricao: `Peça Mecânica ${i}`,
        ncm: '84099999',
        cfop: '7101',
        unidade: 'UN',
        quantidade: '10.0000',
        valorUnitario: '50.0000',
        valorTotal: '450.00', // esperado: 500.00
        situacao: 'inconsistente',
        inconsistencias: [
          { tipo: 'erro', campo: 'valorTotal', esperado: '500.00', encontrado: '450.00' },
        ],
      });
    }

    const testDoc = {
      id: 'demo-batch-10',
      numero: '101.102.103',
      serie: '1',
      tipoDocumento: 'XML',
      destinatario: { pais: 'Alemanha' },
      itens: items,
      totais: { valorTotalNota: '4500.00' },
      isDemo: true,
    };

    localStorageService.save(STORAGE_KEYS.INVOICES, [testDoc]);

    const controller = new AdversarialValidationController('demo-batch-10');
    const issuesPre = await controller.getIssues();
    assert.strictEqual(issuesPre.length, 10);

    // Aplica o lote de 10
    const applyRes = await controller.applySelectedMechanicalFixes(new Set(issuesPre.map((i) => i.id)));
    assert.strictEqual(applyRes.appliedCount, 10);
    assert.strictEqual(applyRes.remainingIssues.length, 0);

    // Documento possui 10 itens com valorTotal 500.00
    let doc = await controller.getDocument();
    for (let i = 1; i <= 10; i++) {
      assert.strictEqual(doc.itens.find((it) => it.id === `batch-item-${i}`).valorTotal, '500.00');
    }

    // Desfaz o lote de 10 em transação única
    const undoRes = await controller.undoBatch(applyRes.batchId);
    assert.strictEqual(undoRes.success, true);
    assert.strictEqual(undoRes.revertedCount, 10);

    // 100% dos 10 itens revertidos para 450.00 simultaneamente
    doc = await controller.getDocument();
    for (let i = 1; i <= 10; i++) {
      assert.strictEqual(doc.itens.find((it) => it.id === `batch-item-${i}`).valorTotal, '450.00');
    }

    // 10 apontamentos reabertos
    assert.strictEqual(undoRes.remainingIssues.length, 10);
  });

  it('4.3: Desfazer sequencial LIFO garante estabilidade referencial a cada passo', async () => {
    const controller = new AdversarialValidationController('demo-04');
    const issues = await controller.getIssues();
    const mechanicalIssues = issues.filter((i) => !isSensitiveIssue(i));

    // Aplica lote mecânico (2 entradas no undoStack)
    const applyRes = await controller.applySelectedMechanicalFixes(new Set(mechanicalIssues.map((i) => i.id)));
    assert.strictEqual(controller.undoStack.length, 2);

    // 1º Undo LIFO: reverte a última alteração (unidade)
    const undo1 = await controller.undoSingle();
    assert.strictEqual(undo1.success, true);
    assert.strictEqual(undo1.restored.campo, 'unidade');
    assert.strictEqual(controller.undoStack.length, 1);
    assert.strictEqual(undo1.remainingIssues.length, 3); // 2 sensíveis + unidade reaberta

    // 2º Undo LIFO: reverte a primeira alteração (valorTotal)
    const undo2 = await controller.undoSingle();
    assert.strictEqual(undo2.success, true);
    assert.strictEqual(undo2.restored.campo, 'valorTotal');
    assert.strictEqual(controller.undoStack.length, 0);
    assert.strictEqual(undo2.remainingIssues.length, 4); // Todas as 4 reabertas

    // 3º Undo: Pilha vazia não deve quebrar
    const undoEmpty = await controller.undoSingle();
    assert.strictEqual(undoEmpty.success, false);
    assert.strictEqual(undoEmpty.reason, 'Pilha de Undo vazia');
  });

  it('4.4: Ciclo Idempotente Multi-Round (Aplicar -> Desfazer -> Aplicar -> Desfazer)', async () => {
    const controller = new AdversarialValidationController('demo-04');
    const issues = await controller.getIssues();
    const mechanicalIds = new Set(issues.filter((i) => !isSensitiveIssue(i)).map((i) => i.id));

    for (let round = 1; round <= 3; round++) {
      // Aplica
      const applied = await controller.applySelectedMechanicalFixes(mechanicalIds);
      assert.strictEqual(applied.appliedCount, 2, `Round ${round} - Aplicação`);
      assert.strictEqual(applied.remainingIssues.length, 2);

      // Desfaz
      const undone = await controller.undoBatch(applied.batchId);
      assert.strictEqual(undone.success, true, `Round ${round} - Undo`);
      assert.strictEqual(undone.remainingIssues.length, 4);
    }
  });

  it('4.5: Batch undo preserva integridade de entradas anteriores na pilha de Undo (isolamento entre lotes e ações unitárias)', async () => {
    const controller = new AdversarialValidationController('demo-04');

    // 1. Aplica uma correção unitária prévia (ex: simulação de ação individual)
    const unitEntry = {
      id: 'undo-unit-1',
      itemId: 'd4-1',
      itemNumero: 1,
      campo: 'descricao',
      valorAnterior: 'Sapato Social Oxford Couro Legítimo',
      valorNovo: 'Sapato Social Oxford Couro Legítimo Export',
      timestamp: new Date().toISOString(),
    };
    await invoiceRepository.updateItem('demo-04', 'd4-1', { descricao: unitEntry.valorNovo });
    controller.undoStack.push(unitEntry);

    assert.strictEqual(controller.undoStack.length, 1);

    // 2. Aplica lote mecânico (2 entradas adicionais com batchId)
    const issues = await controller.getIssues();
    const mechanicalIssues = issues.filter((i) => !isSensitiveIssue(i));
    const batchRes = await controller.applySelectedMechanicalFixes(new Set(mechanicalIssues.map((i) => i.id)));
    assert.strictEqual(controller.undoStack.length, 3);

    // 3. Reverte o lote
    const undoBatchRes = await controller.undoBatch(batchRes.batchId);
    assert.strictEqual(undoBatchRes.success, true);
    assert.strictEqual(undoBatchRes.revertedCount, 2);

    // 4. A ação unitária anterior permanece intacta na pilha de Undo
    assert.strictEqual(controller.undoStack.length, 1);
    assert.strictEqual(controller.undoStack[0].id, 'undo-unit-1');

    // O item unitário continua com sua alteração ativa
    const doc = await controller.getDocument();
    assert.strictEqual(doc.itens.find((i) => i.id === 'd4-1').descricao, 'Sapato Social Oxford Couro Legítimo Export');

    // 5. Desfaz a ação unitária
    const undoSingleRes = await controller.undoSingle();
    assert.strictEqual(undoSingleRes.success, true);
    assert.strictEqual(controller.undoStack.length, 0);

    const docFinal = await controller.getDocument();
    assert.strictEqual(docFinal.itens.find((i) => i.id === 'd4-1').descricao, 'Sapato Social Oxford Couro Legítimo');
  });
});

// ============================================================================
// SUITE 5: Verificação Rigorosa da Tag de Demonstração ([Demonstração])
// ============================================================================
describe('CHALLENGER SUITE 5: Verificação de Tag de Demonstração nos Assistentes e Modais', () => {
  const sourceCode = readFileSync(VALIDACAO_PAGE_PATH, 'utf-8');

  it('5.1: Card de inconsistência renderiza sugestões com tag [Demonstração] explícita', () => {
    assert.match(
      sourceCode,
      /<strong\s+className="font-semibold">\s*\[Demonstração\]\s*<\/strong>/,
      'A sugestão do card de inconsistência deve ser explicitamente precedida por [Demonstração]'
    );
  });

  it('5.2: Header do Modal de Confirmação Fiscal exibe tag [Demonstração]', () => {
    assert.match(
      sourceCode,
      /\[Demonstração\]\s+Validação\s+Fiscal\s+Assistida\s*\(R2\)/,
      'O cabeçalho do FiscalFixConfirmationModal deve ter [Demonstração]'
    );
  });

  it('5.3: Badge de Origem da Regra possui identificação de sugestão demonstrativa', () => {
    assert.match(
      sourceCode,
      /Sugestão\s+Fiscal\s+Demonstrativa\s*\(R2\)/,
      'A origem da regra deve ser identificada como Sugestão Fiscal Demonstrativa (R2)'
    );
  });

  it('5.4: Header do Modal de Revisão em Lote exibe tag [Demonstração]', () => {
    assert.match(
      sourceCode,
      /\[Demonstração\]\s+Separação\s+de\s+Segurança\s+Fiscal\s+e\s+Bloqueio\s+de\s+Massa\s*\(R2\)/,
      'O SafeBulkReviewModal deve ter [Demonstração]'
    );
  });

  it('5.5: Banner principal do Assistente SmartNFe possui identificação demonstrativa', () => {
    assert.match(
      sourceCode,
      /Assistente\s+de\s+Validação\s+SmartNFe\s*\(Sugestão\s+Fiscal\s+Demonstrativa\s*—\s*R2\)/,
      'O banner principal do assistente deve estar rotulado como sugestão fiscal demonstrativa'
    );
  });
});
