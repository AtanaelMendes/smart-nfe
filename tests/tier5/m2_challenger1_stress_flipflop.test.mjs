/**
 * SmartNFe — Tier 5 Empirical Stress Suite: Milestone 2 Iteration 3
 * Challenger 1: Rapid Flip-Flops & Mixed Error Remediations
 *
 * Verificações empíricas e adversariais:
 * 1. Rapid Flip-Flop cycle: conferido -> inconsistente (CFOP) -> inconsistente (NCM) -> inconsistente (NCM fixed) -> conferido (all fixed)
 * 2. Multi-round oscillation loops on the same item (10 consecutive cycles)
 * 3. Mixed errors (CFOP + math divergence + unit mismatch) with partial fixes
 * 4. Multi-error permutations and alternative resolution orders
 * 5. Formatting edge cases (masked NCM, spaces, empty string fields)
 *
 * Execução: node --no-warnings --test tests/tier5/m2_challenger1_stress_flipflop.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { invoiceRepository } from '../../app/features/invoiceRepository.js';
import { localStorageService } from '../../app/lib/storage/localStorageService.js';

describe('CHALLENGER 1 STRESS: Rapid Flip-Flops and Mixed Error Remediations', () => {
  beforeEach(async () => {
    localStorageService.resetAll();
  });

  describe('Suite 1: Rapid Flip-Flops on Originally Clean Item', () => {
    it('1.1: Step-by-step flip-flop: conferido -> +CFOP error -> +NCM error -> -NCM error -> -CFOP error -> conferido', async () => {
      // Estado inicial: d4-1 é limpo e conferido
      let doc = await invoiceRepository.findById('demo-04');
      let item = doc.itens.find((i) => i.id === 'd4-1');
      assert.strictEqual(item.situacao, 'conferido', 'Passo 0: d4-1 deve iniciar como conferido');

      let issues = await invoiceRepository.getValidationIssues('demo-04');
      assert.strictEqual(
        issues.filter((iss) => iss.itemId === 'd4-1').length,
        0,
        'Passo 0: d4-1 não deve ter issues iniciais'
      );

      // Passo 1: Introduz erro de CFOP (5102 em nota de exportação)
      await invoiceRepository.updateItem('demo-04', 'd4-1', { cfop: '5102' });
      doc = await invoiceRepository.findById('demo-04');
      item = doc.itens.find((i) => i.id === 'd4-1');
      assert.strictEqual(
        item.situacao,
        'inconsistente',
        'Passo 1: situacao deve ser inconsistente após erro de CFOP'
      );

      issues = await invoiceRepository.getValidationIssues('demo-04');
      let d41Issues = issues.filter((iss) => iss.itemId === 'd4-1');
      assert.strictEqual(d41Issues.length, 1);
      assert.strictEqual(d41Issues[0].campo, 'cfop');

      // Passo 2: Introduz erro de NCM (7 dígitos: 6403591) mantendo CFOP inválido
      await invoiceRepository.updateItem('demo-04', 'd4-1', { ncm: '6403591' });
      doc = await invoiceRepository.findById('demo-04');
      item = doc.itens.find((i) => i.id === 'd4-1');
      assert.strictEqual(
        item.situacao,
        'inconsistente',
        'Passo 2: situacao deve permanecer inconsistente com 2 erros'
      );

      issues = await invoiceRepository.getValidationIssues('demo-04');
      d41Issues = issues.filter((iss) => iss.itemId === 'd4-1');
      assert.strictEqual(d41Issues.length, 2, 'Passo 2: deve registrar exatamente 2 erros (CFOP + NCM)');
      assert.ok(d41Issues.some((iss) => iss.campo === 'cfop'));
      assert.ok(d41Issues.some((iss) => iss.campo === 'ncm'));

      // Passo 3: Corrige NCM de volta para 8 dígitos (64035910), mantendo CFOP inválido (5102)
      await invoiceRepository.updateItem('demo-04', 'd4-1', { ncm: '64035910' });
      doc = await invoiceRepository.findById('demo-04');
      item = doc.itens.find((i) => i.id === 'd4-1');
      assert.strictEqual(
        item.situacao,
        'inconsistente',
        'Passo 3: situacao DEVE PERMANECER inconsistente pois CFOP ainda é inválido'
      );

      issues = await invoiceRepository.getValidationIssues('demo-04');
      d41Issues = issues.filter((iss) => iss.itemId === 'd4-1');
      assert.strictEqual(d41Issues.length, 1, 'Passo 3: NCM foi corrigido, resta apenas CFOP');
      assert.strictEqual(d41Issues[0].campo, 'cfop');

      // Passo 4: Corrige CFOP de volta para 7101
      await invoiceRepository.updateItem('demo-04', 'd4-1', { cfop: '7101' });
      doc = await invoiceRepository.findById('demo-04');
      item = doc.itens.find((i) => i.id === 'd4-1');
      assert.strictEqual(
        item.situacao,
        'conferido',
        'Passo 4: situacao DEVE RETORNAR para conferido com todos os erros corrigidos'
      );

      issues = await invoiceRepository.getValidationIssues('demo-04');
      d41Issues = issues.filter((iss) => iss.itemId === 'd4-1');
      assert.strictEqual(d41Issues.length, 0, 'Passo 4: nenhuma inconsistência deve restar no item');
    });

    it('1.2: Multi-round oscillation (10 consecutive cycles on the same item)', async () => {
      // Executa 10 ciclos rápidos consecutivos no mesmo item
      for (let round = 1; round <= 10; round++) {
        // Quebra CFOP
        await invoiceRepository.updateItem('demo-04', 'd4-1', { cfop: '5102' });
        let doc = await invoiceRepository.findById('demo-04');
        let item = doc.itens.find((i) => i.id === 'd4-1');
        assert.strictEqual(item.situacao, 'inconsistente', `Round ${round} - break CFOP`);

        // Quebra NCM
        await invoiceRepository.updateItem('demo-04', 'd4-1', { ncm: '12345' });
        doc = await invoiceRepository.findById('demo-04');
        item = doc.itens.find((i) => i.id === 'd4-1');
        assert.strictEqual(item.situacao, 'inconsistente', `Round ${round} - break NCM`);

        // Conserta NCM (CFOP continua quebrado)
        await invoiceRepository.updateItem('demo-04', 'd4-1', { ncm: '64035910' });
        doc = await invoiceRepository.findById('demo-04');
        item = doc.itens.find((i) => i.id === 'd4-1');
        assert.strictEqual(item.situacao, 'inconsistente', `Round ${round} - fix NCM only`);

        // Conserta CFOP
        await invoiceRepository.updateItem('demo-04', 'd4-1', { cfop: '7101' });
        doc = await invoiceRepository.findById('demo-04');
        item = doc.itens.find((i) => i.id === 'd4-1');
        assert.strictEqual(item.situacao, 'conferido', `Round ${round} - fix all`);
      }

      // Validação final de saúde
      const issues = await invoiceRepository.getValidationIssues('demo-04');
      const d41Issues = issues.filter((iss) => iss.itemId === 'd4-1');
      assert.strictEqual(d41Issues.length, 0);
    });
  });

  describe('Suite 2: Mixed Errors Stress Testing (CFOP + Math + Unit Mismatch)', () => {
    it('2.1: Item with 3 mixed errors (CFOP + Math Divergence + Unit Mismatch) resolved step by step', async () => {
      // Prepara d4-5: possui divergência matemática (4000 vs 4500)
      // Agrega CFOP 5102 e unidade METROS
      let doc = await invoiceRepository.findById('demo-04');
      let d45 = doc.itens.find((i) => i.id === 'd4-5');
      d45.cfop = '5102';
      d45.unidade = 'METROS';
      d45.inconsistencias = [
        { tipo: 'erro', campo: 'valorTotal', mensagem: 'Divergência matemática', esperado: '4500.00', encontrado: '4000.00' },
        { tipo: 'aviso', campo: 'unidade', mensagem: 'Unidade METROS divergente', esperado: 'PAR', encontrado: 'METROS' },
      ];
      await invoiceRepository.update('demo-04', { itens: doc.itens });

      let issues = await invoiceRepository.getValidationIssues('demo-04');
      let d45Issues = issues.filter((iss) => iss.itemId === 'd4-5');
      assert.strictEqual(d45Issues.length, 3, 'Deve acusar 3 inconsistências iniciais: CFOP, valorTotal e unidade');
      assert.ok(d45Issues.some((iss) => iss.campo === 'cfop'));
      assert.ok(d45Issues.some((iss) => iss.campo === 'valorTotal'));
      assert.ok(d45Issues.some((iss) => iss.campo === 'unidade'));

      // Correção Parcial 1: Usuário edita quantidade (100.0000), o que recalcula a linha e resolve a divergência matemática
      await invoiceRepository.updateItem('demo-04', 'd4-5', { quantidade: '100.0000' });
      doc = await invoiceRepository.findById('demo-04');
      d45 = doc.itens.find((i) => i.id === 'd4-5');
      assert.strictEqual(
        d45.situacao,
        'inconsistente',
        'Após sanar matemática, CFOP e Unidade ainda persistem -> deve continuar inconsistente'
      );

      issues = await invoiceRepository.getValidationIssues('demo-04');
      d45Issues = issues.filter((iss) => iss.itemId === 'd4-5');
      assert.strictEqual(d45Issues.length, 2, 'Restam exatamente 2 erros (cfop e unidade)');
      assert.strictEqual(d45Issues.some((iss) => iss.campo === 'valorTotal'), false, 'Divergência matemática sanada');

      // Correção Parcial 2: Usuário corrige CFOP para 7101
      await invoiceRepository.updateItem('demo-04', 'd4-5', { cfop: '7101' });
      doc = await invoiceRepository.findById('demo-04');
      d45 = doc.itens.find((i) => i.id === 'd4-5');
      assert.strictEqual(
        d45.situacao,
        'inconsistente',
        'Após sanar CFOP, aviso de Unidade ainda persiste -> deve continuar inconsistente'
      );

      issues = await invoiceRepository.getValidationIssues('demo-04');
      d45Issues = issues.filter((iss) => iss.itemId === 'd4-5');
      assert.strictEqual(d45Issues.length, 1, 'Resta exatamente 1 erro (unidade)');
      assert.strictEqual(d45Issues[0].campo, 'unidade');

      // Correção Final: Usuário corrige unidade para PAR
      await invoiceRepository.updateItem('demo-04', 'd4-5', { unidade: 'PAR' });
      doc = await invoiceRepository.findById('demo-04');
      d45 = doc.itens.find((i) => i.id === 'd4-5');
      assert.strictEqual(
        d45.situacao,
        'conferido',
        'Com todos os 3 erros sanados, situacao DEVE transicionar para conferido'
      );

      issues = await invoiceRepository.getValidationIssues('demo-04');
      d45Issues = issues.filter((iss) => iss.itemId === 'd4-5');
      assert.strictEqual(d45Issues.length, 0, 'Zero inconsistências restantes');
    });

    it('2.2: Item d4-11 with 3 errors (CFOP + NCM + Unit) resolved in reverse order', async () => {
      // d4-11 já possui aviso de unidade (METROS vs PAR)
      // Injeta CFOP 5102 e NCM de 7 dígitos (6403591)
      await invoiceRepository.updateItem('demo-04', 'd4-11', { cfop: '5102', ncm: '6403591' });

      let doc = await invoiceRepository.findById('demo-04');
      let item = doc.itens.find((i) => i.id === 'd4-11');
      assert.strictEqual(item.situacao, 'inconsistente');

      let issues = await invoiceRepository.getValidationIssues('demo-04');
      let d411Issues = issues.filter((iss) => iss.itemId === 'd4-11');
      assert.strictEqual(d411Issues.length, 3, 'CFOP, NCM e Unidade');

      // Ordem reversa de resolução:
      // 1. Corrige a Unidade primeiro (para 'PAR')
      await invoiceRepository.updateItem('demo-04', 'd4-11', { unidade: 'PAR' });
      doc = await invoiceRepository.findById('demo-04');
      item = doc.itens.find((i) => i.id === 'd4-11');
      assert.strictEqual(item.situacao, 'inconsistente', '1/3 corrigido (unidade) -> continua inconsistente');

      issues = await invoiceRepository.getValidationIssues('demo-04');
      d411Issues = issues.filter((iss) => iss.itemId === 'd4-11');
      assert.strictEqual(d411Issues.length, 2, 'Restam CFOP e NCM');

      // 2. Corrige a NCM em segundo (para 8 dígitos: '64035910')
      await invoiceRepository.updateItem('demo-04', 'd4-11', { ncm: '64035910' });
      doc = await invoiceRepository.findById('demo-04');
      item = doc.itens.find((i) => i.id === 'd4-11');
      assert.strictEqual(item.situacao, 'inconsistente', '2/3 corrigidos (unidade e NCM) -> continua inconsistente');

      issues = await invoiceRepository.getValidationIssues('demo-04');
      d411Issues = issues.filter((iss) => iss.itemId === 'd4-11');
      assert.strictEqual(d411Issues.length, 1, 'Resta apenas CFOP');

      // 3. Corrige o CFOP em terceiro (para '7101')
      await invoiceRepository.updateItem('demo-04', 'd4-11', { cfop: '7101' });
      doc = await invoiceRepository.findById('demo-04');
      item = doc.itens.find((i) => i.id === 'd4-11');
      assert.strictEqual(
        item.situacao,
        'conferido',
        '3/3 corrigidos -> DEVE transicionar para conferido'
      );

      issues = await invoiceRepository.getValidationIssues('demo-04');
      d411Issues = issues.filter((iss) => iss.itemId === 'd4-11');
      assert.strictEqual(d411Issues.length, 0);
    });

    it('2.3: Clean item d4-2 with CFOP + NCM + Math Divergence injected and cleared', async () => {
      // Injeta math divergence via update()
      let doc = await invoiceRepository.findById('demo-04');
      let d42 = doc.itens.find((i) => i.id === 'd4-2');
      d42.valorTotal = '11111.00'; // 120 * 75 = 9000
      d42.cfop = '5102';
      d42.ncm = '123456'; // 6 dígitos
      await invoiceRepository.update('demo-04', { itens: doc.itens });

      let issues = await invoiceRepository.getValidationIssues('demo-04');
      let d42Issues = issues.filter((iss) => iss.itemId === 'd4-2');
      assert.strictEqual(d42Issues.length, 3, 'CFOP, NCM e divergência matemática');

      // Passo 1: Corrige CFOP para 7101 mantendo NCM e math quebrados
      // Atenção: updateItem recalcula valorTotal por padrão, então testamos a correção de CFOP
      // mantendo NCM incorreta
      await invoiceRepository.updateItem('demo-04', 'd4-2', { cfop: '7101' });
      doc = await invoiceRepository.findById('demo-04');
      d42 = doc.itens.find((i) => i.id === 'd4-2');
      assert.strictEqual(
        d42.situacao,
        'inconsistente',
        'CFOP e matemática corrigidos, mas NCM continua inválida (6 dígitos) -> deve ser inconsistente'
      );

      issues = await invoiceRepository.getValidationIssues('demo-04');
      d42Issues = issues.filter((iss) => iss.itemId === 'd4-2');
      assert.strictEqual(d42Issues.length, 1, 'Resta apenas NCM');
      assert.strictEqual(d42Issues[0].campo, 'ncm');

      // Passo 2: Corrige NCM para 8 dígitos
      await invoiceRepository.updateItem('demo-04', 'd4-2', { ncm: '64035910' });
      doc = await invoiceRepository.findById('demo-04');
      d42 = doc.itens.find((i) => i.id === 'd4-2');
      assert.strictEqual(
        d42.situacao,
        'conferido',
        'Todos os erros sanados -> deve transicionar para conferido'
      );

      issues = await invoiceRepository.getValidationIssues('demo-04');
      d42Issues = issues.filter((iss) => iss.itemId === 'd4-2');
      assert.strictEqual(d42Issues.length, 0);
    });
  });

  describe('Suite 3: Formatting and Boundary Cases', () => {
    it('3.1: Formatted NCM with dots/dashes (e.g. "6403.59.10") is recognized as 8 digits', async () => {
      await invoiceRepository.updateItem('demo-04', 'd4-1', { ncm: '6403.59.10' });
      let doc = await invoiceRepository.findById('demo-04');
      let item = doc.itens.find((i) => i.id === 'd4-1');
      assert.strictEqual(item.situacao, 'conferido', 'NCM formatado com pontuação deve ser válido');

      let issues = await invoiceRepository.getValidationIssues('demo-04');
      let ncmIssue = issues.find((iss) => iss.itemId === 'd4-1' && iss.campo === 'ncm');
      assert.strictEqual(ncmIssue, undefined);
    });

    it('3.2: CFOP with leading/trailing spaces (e.g. " 7101 ") is trimmed and recognized', async () => {
      await invoiceRepository.updateItem('demo-04', 'd4-1', { cfop: ' 7101 ' });
      let doc = await invoiceRepository.findById('demo-04');
      let item = doc.itens.find((i) => i.id === 'd4-1');
      assert.strictEqual(item.situacao, 'conferido', 'CFOP com espaços deve ser aceito');

      let issues = await invoiceRepository.getValidationIssues('demo-04');
      let cfopIssue = issues.find((iss) => iss.itemId === 'd4-1' && iss.campo === 'cfop');
      assert.strictEqual(cfopIssue, undefined);
    });

    it('3.3: Empty string values immediately trigger inconsistente', async () => {
      // NCM vazio
      await invoiceRepository.updateItem('demo-04', 'd4-1', { ncm: '' });
      let doc = await invoiceRepository.findById('demo-04');
      let item = doc.itens.find((i) => i.id === 'd4-1');
      assert.strictEqual(item.situacao, 'inconsistente');

      // Restaura NCM
      await invoiceRepository.updateItem('demo-04', 'd4-1', { ncm: '64035910' });
      doc = await invoiceRepository.findById('demo-04');
      item = doc.itens.find((i) => i.id === 'd4-1');
      assert.strictEqual(item.situacao, 'conferido');

      // CFOP vazio
      await invoiceRepository.updateItem('demo-04', 'd4-1', { cfop: '' });
      doc = await invoiceRepository.findById('demo-04');
      item = doc.itens.find((i) => i.id === 'd4-1');
      assert.strictEqual(item.situacao, 'inconsistente');

      // Restaura CFOP
      await invoiceRepository.updateItem('demo-04', 'd4-1', { cfop: '7101' });
      doc = await invoiceRepository.findById('demo-04');
      item = doc.itens.find((i) => i.id === 'd4-1');
      assert.strictEqual(item.situacao, 'conferido');
    });
  });
});
