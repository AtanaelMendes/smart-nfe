/**
 * SmartNFe — Challenger 1 Adversarial Suite: Repository Concurrency & Dynamic Validation
 *
 * Scenarios tested:
 * 1. High-load parallel updateItem mutations (25 parallel on demo-02, 20 sequential-in-parallel on demo-01, 50 parallel on demo-03).
 * 2. Parallel create, update, delete operations on preparedInvoiceRepository with zero lost updates.
 * 3. Queue resilience: interspersed rejected mutations (ghost items, ghost docs, null payloads) followed by valid mutations.
 * 4. Dynamic Validation Engine:
 *    - CFOP flip-flop (5102 -> 7102 -> 5102 -> 7101)
 *    - NCM flip-flop on item with mock inconsistencias (d4-8)
 *    - NCM flip-flop on originally clean item (d4-1) and situacao transition
 *    - Math divergence dynamic appear / disappear
 *    - Full remediation of demo-04 and situacao === 'conferido' check across all items
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  localStorageService,
  STORAGE_KEYS,
  setCustomStorage,
} from '../../app/lib/storage/localStorageService.js';
import { invoiceRepository } from '../../app/features/invoiceRepository.js';
import { preparedInvoiceRepository } from '../../app/features/preparedInvoiceRepository.js';

describe('CHALLENGER 1 SUITE 1: High-Concurrency Repository Stress', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await invoiceRepository.resetDemoData();
    await preparedInvoiceRepository.resetDemoData();
  });

  it('1.1: 25 parallel updateItem mutations simultaneously on demo-02 (0 lost updates)', async () => {
    const start = Date.now();
    const promises = [];

    // demo-02 contains 25 items: d2-1 to d2-25
    for (let i = 1; i <= 25; i++) {
      promises.push(
        invoiceRepository.updateItem('demo-02', `d2-${i}`, {
          descricao: `PRODUTO CONCORRENTE ${i}`,
          quantidade: `${i * 10}.0000`,
          valorUnitario: '100.0000',
        })
      );
    }

    const settled = await Promise.all(promises);
    assert.strictEqual(settled.length, 25, 'All 25 promises must settle successfully');

    // Load final consolidated invoice from repository
    const finalDoc = await invoiceRepository.findById('demo-02');
    assert.ok(finalDoc, 'demo-02 must exist');
    assert.strictEqual(finalDoc.itens.length, 25, 'demo-02 must retain all 25 items');

    const lostUpdates = [];
    for (let i = 1; i <= 25; i++) {
      const it = finalDoc.itens.find((item) => item.id === `d2-${i}`);
      const expectedDesc = `PRODUTO CONCORRENTE ${i}`;
      const expectedQty = `${i * 10}.0000`;
      const expectedTotal = `${i * 1000}.00`;

      if (!it) {
        lostUpdates.push({ id: `d2-${i}`, reason: 'item missing' });
      } else if (it.descricao !== expectedDesc || it.quantidade !== expectedQty || it.valorTotal !== expectedTotal) {
        lostUpdates.push({
          id: `d2-${i}`,
          actual: { desc: it.descricao, qty: it.quantidade, total: it.valorTotal },
          expected: { desc: expectedDesc, qty: expectedQty, total: expectedTotal },
        });
      }
    }

    console.log(`[CHALLENGE 1.1] 25 parallel mutations finished in ${Date.now() - start}ms. Lost updates: ${lostUpdates.length}`);
    assert.deepStrictEqual(lostUpdates, [], 'Zero lost updates allowed among 25 concurrent item mutations');
  });

  it('1.2: 20 parallel updateItem mutations to the SAME item (d1-1 in demo-01)', async () => {
    const promises = [];
    for (let i = 1; i <= 20; i++) {
      promises.push(
        invoiceRepository.updateItem('demo-01', 'd1-1', {
          descricao: `SEQUENTIAL CONCURRENT VERSION ${i}`,
          quantidade: `${i}.0000`,
        })
      );
    }

    await Promise.all(promises);

    const finalDoc = await invoiceRepository.findById('demo-01');
    const item = finalDoc.itens.find((it) => it.id === 'd1-1');

    // Because promise locks queue synchronously in dispatch order, the 20th mutation must win
    console.log(`[CHALLENGE 1.2] Final d1-1 state after 20 concurrent updates: ${item.descricao}, qty: ${item.quantidade}`);
    assert.strictEqual(item.descricao, 'SEQUENTIAL CONCURRENT VERSION 20');
    assert.strictEqual(item.quantidade, '20.0000');
  });

  it('1.3: 50 parallel updateItem mutations simultaneously across demo-03 (0 lost updates)', async () => {
    const start = Date.now();
    const promises = [];

    // demo-03 contains 50 items: d3-1 to d3-50
    for (let i = 1; i <= 50; i++) {
      promises.push(
        invoiceRepository.updateItem('demo-03', `d3-${i}`, {
          descricao: `ITEM 50-STRESS ${i}`,
          quantidade: '5.0000',
          valorUnitario: '20.0000',
        })
      );
    }

    await Promise.all(promises);

    const finalDoc = await invoiceRepository.findById('demo-03');
    assert.strictEqual(finalDoc.itens.length, 50);

    let lostCount = 0;
    for (let i = 1; i <= 50; i++) {
      const it = finalDoc.itens.find((x) => x.id === `d3-${i}`);
      if (!it || it.descricao !== `ITEM 50-STRESS ${i}` || it.valorTotal !== '100.00') {
        lostCount++;
      }
    }

    console.log(`[CHALLENGE 1.3] 50 parallel mutations finished in ${Date.now() - start}ms. Lost count: ${lostCount}`);
    assert.strictEqual(lostCount, 0, 'Zero lost updates allowed among 50 concurrent mutations');
  });
});

describe('CHALLENGER 1 SUITE 2: PreparedInvoiceRepository Concurrency Stress', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await preparedInvoiceRepository.resetDemoData();
  });

  it('2.1: Concurrent mix of 10 creates, 2 updates, and 1 delete in parallel', async () => {
    const ops = [];
    const log = [];

    // 10 concurrent creates
    for (let i = 1; i <= 10; i++) {
      ops.push(
        preparedInvoiceRepository.create({
          id: `prep-stress-${i}`,
          numero: `000.999.0${i < 10 ? '0' + i : i}`,
          parentInvoiceId: 'demo-02',
          descricaoLote: `Lote de Teste Concorrente ${i}`,
        }).then(() => log.push(`create-${i}-ok`))
      );
    }

    // 2 concurrent updates on existing records (prep-01 and prep-02)
    ops.push(
      preparedInvoiceRepository.update('prep-01', {
        descricaoLote: 'Lote 01 Atualizado Concorrentemente',
      }).then(() => log.push('update-prep01-ok'))
    );
    ops.push(
      preparedInvoiceRepository.update('prep-02', {
        descricaoLote: 'Lote 02 Atualizado Concorrentemente',
      }).then(() => log.push('update-prep02-ok'))
    );

    // 1 concurrent delete on prep-02
    ops.push(
      preparedInvoiceRepository.delete('prep-02').then((res) => log.push(`delete-prep02-${res}`))
    );

    await Promise.all(ops);

    const finalList = await preparedInvoiceRepository.list();
    console.log(`[CHALLENGE 2.1] Final prepared list count: ${finalList.length}, Operations logged: ${log.length}`);

    // Verify all 10 creates exist
    for (let i = 1; i <= 10; i++) {
      const found = finalList.find((p) => p.id === `prep-stress-${i}`);
      assert.ok(found, `prep-stress-${i} must exist in storage`);
    }

    // Verify prep-01 exists and has updated description
    const p1 = finalList.find((p) => p.id === 'prep-01');
    assert.ok(p1, 'prep-01 must exist');
    assert.strictEqual(p1.descricaoLote, 'Lote 01 Atualizado Concorrentemente');

    // Verify prep-02 was deleted
    const p2 = finalList.find((p) => p.id === 'prep-02');
    assert.strictEqual(p2, undefined, 'prep-02 must be removed after delete');
  });
});

describe('CHALLENGER 1 SUITE 3: Queue Healing Under Interspersed Rejections', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await invoiceRepository.resetDemoData();
    await preparedInvoiceRepository.resetDemoData();
  });

  it('3.1: Interspersed invalid updateItem calls do not stall the mutation queue', async () => {
    const executionResults = [];

    // Interleave valid and invalid calls in a single parallel batch
    const p1 = invoiceRepository
      .updateItem('demo-01', 'd1-1', { descricao: 'VALID-STEP-1' })
      .then(
        () => executionResults.push('P1_OK'),
        (err) => executionResults.push(`P1_FAIL: ${err.message}`)
      );

    const p2_rejected = invoiceRepository
      .updateItem('demo-01', 'ghost-item-does-not-exist', { valorUnitario: '999.00' })
      .then(
        () => executionResults.push('P2_UNEXPECTED_OK'),
        (err) => executionResults.push(`P2_EXPECTED_ERR: ${err.message}`)
      );

    const p3 = invoiceRepository
      .updateItem('demo-01', 'd1-2', { descricao: 'VALID-STEP-3' })
      .then(
        () => executionResults.push('P3_OK'),
        (err) => executionResults.push(`P3_FAIL: ${err.message}`)
      );

    const p4_rejected = invoiceRepository
      .updateItem('ghost-invoice-does-not-exist', 'd1-1', { descricao: 'SHOULD_FAIL' })
      .then(
        () => executionResults.push('P4_UNEXPECTED_OK'),
        (err) => executionResults.push(`P4_EXPECTED_ERR: ${err.message}`)
      );

    const p5 = invoiceRepository
      .updateItem('demo-01', 'd1-3', { descricao: 'VALID-STEP-5' })
      .then(
        () => executionResults.push('P5_OK'),
        (err) => executionResults.push(`P5_FAIL: ${err.message}`)
      );

    await Promise.all([p1, p2_rejected, p3, p4_rejected, p5]);

    console.log('[CHALLENGE 3.1] Queue execution trace:', executionResults);

    assert.strictEqual(executionResults[0], 'P1_OK');
    assert.match(executionResults[1], /P2_EXPECTED_ERR: Item "ghost-item-does-not-exist" não encontrado/);
    assert.strictEqual(executionResults[2], 'P3_OK');
    assert.match(executionResults[3], /P4_EXPECTED_ERR: Documento fiscal não encontrado/);
    assert.strictEqual(executionResults[4], 'P5_OK');

    // Confirm that valid updates persisted
    const doc = await invoiceRepository.findById('demo-01');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd1-1').descricao, 'VALID-STEP-1');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd1-2').descricao, 'VALID-STEP-3');
    assert.strictEqual(doc.itens.find((i) => i.id === 'd1-3').descricao, 'VALID-STEP-5');
  });

  it('3.2: preparedInvoiceRepository heals queue after null create and invalid update', async () => {
    const results = [];

    // Rejected create (null)
    const p1 = preparedInvoiceRepository.create(null).then(
      () => results.push('P1_FAIL'),
      (err) => results.push(`P1_REJECT: ${err.message}`)
    );

    // Valid create
    const p2 = preparedInvoiceRepository
      .create({ id: 'prep-healed-1', numero: '000.111.222' })
      .then(
        () => results.push('P2_OK'),
        (err) => results.push(`P2_FAIL: ${err.message}`)
      );

    // Rejected update (non-existent id)
    const p3 = preparedInvoiceRepository
      .update('prep-non-existent', { descricaoLote: 'Ghost' })
      .then(
        () => results.push('P3_FAIL'),
        (err) => results.push(`P3_REJECT: ${err.message}`)
      );

    // Valid update
    const p4 = preparedInvoiceRepository
      .update('prep-01', { descricaoLote: 'Prep 01 Healed' })
      .then(
        () => results.push('P4_OK'),
        (err) => results.push(`P4_FAIL: ${err.message}`)
      );

    await Promise.all([p1, p2, p3, p4]);

    console.log('[CHALLENGE 3.2] Prepared queue execution trace:', results);
    assert.match(results[0], /P1_REJECT/);
    assert.strictEqual(results[1], 'P2_OK');
    assert.match(results[2], /P3_REJECT/);
    assert.strictEqual(results[3], 'P4_OK');

    const item = await preparedInvoiceRepository.findById('prep-healed-1');
    assert.ok(item);
  });
});

describe('CHALLENGER 1 SUITE 4: Dynamic Validation Engine & situacao Transitions', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await invoiceRepository.resetDemoData();
  });

  it('4.1: Sequential CFOP flip-flop on demo-04 item d4-3 (5102 -> 7102 -> 5102 -> 7101)', async () => {
    // 1. Initial State: CFOP 5102 is flagged
    let issues = await invoiceRepository.getValidationIssues('demo-04');
    let cfopIssue = issues.find((i) => i.itemId === 'd4-3' && i.campo === 'cfop');
    assert.ok(cfopIssue, 'Initial CFOP error must exist on d4-3');
    let doc = await invoiceRepository.findById('demo-04');
    let item = doc.itens.find((i) => i.id === 'd4-3');
    assert.strictEqual(item.situacao, 'inconsistente');

    // 2. Fix CFOP to 7102 -> error disappears, situacao becomes conferido
    await invoiceRepository.updateItem('demo-04', 'd4-3', { cfop: '7102' });
    issues = await invoiceRepository.getValidationIssues('demo-04');
    cfopIssue = issues.find((i) => i.itemId === 'd4-3' && i.campo === 'cfop');
    assert.strictEqual(cfopIssue, undefined, 'CFOP error must disappear after setting 7102');
    doc = await invoiceRepository.findById('demo-04');
    item = doc.itens.find((i) => i.id === 'd4-3');
    console.log('[CHALLENGE 4.1] d4-3 after fixing to 7102:', { situacao: item.situacao });
    assert.strictEqual(item.situacao, 'conferido', 'Item situacao must be "conferido" when CFOP is fixed');

    // 3. Revert CFOP back to 5102 -> error reappears dynamically, situacao becomes inconsistente
    await invoiceRepository.updateItem('demo-04', 'd4-3', { cfop: '5102' });
    issues = await invoiceRepository.getValidationIssues('demo-04');
    cfopIssue = issues.find((i) => i.itemId === 'd4-3' && i.campo === 'cfop');
    assert.ok(cfopIssue, 'CFOP error must dynamically reappear after reverting to 5102');
    doc = await invoiceRepository.findById('demo-04');
    item = doc.itens.find((i) => i.id === 'd4-3');
    console.log('[CHALLENGE 4.1] d4-3 after breaking back to 5102:', { situacao: item.situacao });
    assert.strictEqual(item.situacao, 'inconsistente', 'Item situacao must be "inconsistente" when CFOP error introduced');

    // 4. Fix CFOP to 7101 -> error disappears again, situacao becomes conferido
    await invoiceRepository.updateItem('demo-04', 'd4-3', { cfop: '7101' });
    issues = await invoiceRepository.getValidationIssues('demo-04');
    cfopIssue = issues.find((i) => i.itemId === 'd4-3' && i.campo === 'cfop');
    assert.strictEqual(cfopIssue, undefined, 'CFOP error must disappear after setting 7101');
    doc = await invoiceRepository.findById('demo-04');
    item = doc.itens.find((i) => i.id === 'd4-3');
    console.log('[CHALLENGE 4.1] d4-3 after re-fixing to 7101:', { situacao: item.situacao });
    assert.strictEqual(item.situacao, 'conferido', 'Item situacao must return to "conferido"');
  });

  it('4.2: NCM flip-flop on item with mock inconsistencias (d4-8)', async () => {
    // 1. Initial State: NCM 6403590 has 7 digits
    let issues = await invoiceRepository.getValidationIssues('demo-04');
    let ncmIssue = issues.find((i) => i.itemId === 'd4-8' && i.campo === 'ncm');
    assert.ok(ncmIssue, 'd4-8 must have initial NCM error');

    // 2. Fix NCM to 8 digits (64035910)
    await invoiceRepository.updateItem('demo-04', 'd4-8', { ncm: '64035910' });
    issues = await invoiceRepository.getValidationIssues('demo-04');
    ncmIssue = issues.find((i) => i.itemId === 'd4-8' && i.campo === 'ncm');
    assert.strictEqual(ncmIssue, undefined, 'NCM error must disappear');
    let doc = await invoiceRepository.findById('demo-04');
    let item = doc.itens.find((i) => i.id === 'd4-8');
    assert.strictEqual(item.situacao, 'conferido');

    // 3. Break NCM to 7 digits (6403590)
    await invoiceRepository.updateItem('demo-04', 'd4-8', { ncm: '6403590' });
    issues = await invoiceRepository.getValidationIssues('demo-04');
    ncmIssue = issues.find((i) => i.itemId === 'd4-8' && i.campo === 'ncm');
    assert.ok(ncmIssue, 'NCM error must dynamically reappear');
    doc = await invoiceRepository.findById('demo-04');
    item = doc.itens.find((i) => i.id === 'd4-8');
    assert.strictEqual(item.situacao, 'inconsistente');

    // 4. Fix back to 8 digits
    await invoiceRepository.updateItem('demo-04', 'd4-8', { ncm: '64035910' });
    issues = await invoiceRepository.getValidationIssues('demo-04');
    ncmIssue = issues.find((i) => i.itemId === 'd4-8' && i.campo === 'ncm');
    assert.strictEqual(ncmIssue, undefined);
    doc = await invoiceRepository.findById('demo-04');
    item = doc.itens.find((i) => i.id === 'd4-8');
    assert.strictEqual(item.situacao, 'conferido');
  });

  it('4.3: NCM cycle on originally clean item (d4-1) and situacao transition test', async () => {
    // 1. Initial State: d4-1 is clean
    let doc = await invoiceRepository.findById('demo-04');
    let item = doc.itens.find((i) => i.id === 'd4-1');
    assert.strictEqual(item.situacao, 'conferido', 'd4-1 starts as conferido');
    assert.strictEqual(item.inconsistencias, undefined);

    // 2. Introduce 7-digit NCM on d4-1
    await invoiceRepository.updateItem('demo-04', 'd4-1', { ncm: '6403591' });
    let issues = await invoiceRepository.getValidationIssues('demo-04');
    let ncmIssue = issues.find((i) => i.itemId === 'd4-1' && i.campo === 'ncm');
    assert.ok(ncmIssue, 'NCM error must appear for d4-1');
    doc = await invoiceRepository.findById('demo-04');
    item = doc.itens.find((i) => i.id === 'd4-1');
    console.log('[CHALLENGE 4.3] d4-1 after 7-digit NCM:', { situacao: item.situacao });
    assert.strictEqual(item.situacao, 'inconsistente', 'situacao must become inconsistente');

    // 3. Fix NCM back to 8 digits on d4-1
    await invoiceRepository.updateItem('demo-04', 'd4-1', { ncm: '64035910' });
    issues = await invoiceRepository.getValidationIssues('demo-04');
    ncmIssue = issues.find((i) => i.itemId === 'd4-1' && i.campo === 'ncm');
    assert.strictEqual(ncmIssue, undefined, 'NCM error must disappear');

    doc = await invoiceRepository.findById('demo-04');
    item = doc.itens.find((i) => i.id === 'd4-1');
    console.log('[CHALLENGE 4.3] d4-1 after fixing back to 8-digit NCM:', {
      situacao: item.situacao,
      inconsistencias: item.inconsistencias,
    });

    // CHALLENGE ASSERTION:
    // When all errors are resolved, situacao MUST be 'conferido'.
    // If the repository leaves situacao as 'inconsistente' because item.inconsistencias is undefined,
    // this assertion catches the bug!
    assert.strictEqual(
      item.situacao,
      'conferido',
      'Item situacao must transition back to "conferido" when introduced errors are resolved'
    );
  });

  it('4.3b: CFOP cycle on originally clean item (d4-2) and situacao transition test', async () => {
    // 1. Initial State: d4-2 is clean (CFOP 7101, situacao: conferido)
    let doc = await invoiceRepository.findById('demo-04');
    let item = doc.itens.find((i) => i.id === 'd4-2');
    assert.strictEqual(item.situacao, 'conferido');
    assert.strictEqual(item.inconsistencias, undefined);

    // 2. Introduce domestic CFOP 5102 on export invoice
    await invoiceRepository.updateItem('demo-04', 'd4-2', { cfop: '5102' });
    let issues = await invoiceRepository.getValidationIssues('demo-04');
    let cfopIssue = issues.find((i) => i.itemId === 'd4-2' && i.campo === 'cfop');
    assert.ok(cfopIssue, 'CFOP error must appear for d4-2');
    doc = await invoiceRepository.findById('demo-04');
    item = doc.itens.find((i) => i.id === 'd4-2');
    assert.strictEqual(item.situacao, 'inconsistente', 'situacao must become inconsistente');

    // 3. Fix CFOP back to 7101 on d4-2
    await invoiceRepository.updateItem('demo-04', 'd4-2', { cfop: '7101' });
    issues = await invoiceRepository.getValidationIssues('demo-04');
    cfopIssue = issues.find((i) => i.itemId === 'd4-2' && i.campo === 'cfop');
    assert.strictEqual(cfopIssue, undefined, 'CFOP error must disappear');

    doc = await invoiceRepository.findById('demo-04');
    item = doc.itens.find((i) => i.id === 'd4-2');
    console.log('[CHALLENGE 4.3b] d4-2 after fixing back to 7101:', {
      situacao: item.situacao,
      inconsistencias: item.inconsistencias,
    });

    assert.strictEqual(
      item.situacao,
      'conferido',
      'd4-2 situacao must transition back to "conferido" when CFOP error is resolved'
    );
  });

  it('4.3c: Empty NCM and empty CFOP must trigger inconsistente situacao in sync with getValidationIssues', async () => {
    // 1. Empty NCM
    await invoiceRepository.updateItem('demo-04', 'd4-4', { ncm: '' });
    let issues = await invoiceRepository.getValidationIssues('demo-04');
    let ncmIssue = issues.find((i) => i.itemId === 'd4-4' && i.campo === 'ncm');
    assert.ok(ncmIssue, 'Empty NCM must be flagged as issue in getValidationIssues');

    let doc = await invoiceRepository.findById('demo-04');
    let item = doc.itens.find((i) => i.id === 'd4-4');
    console.log('[CHALLENGE 4.3c] d4-4 with empty NCM situacao:', item.situacao);
    assert.strictEqual(
      item.situacao,
      'inconsistente',
      'Item with empty NCM must have situacao "inconsistente"'
    );
  });

  it('4.4: Math divergence dynamic appearance and resolution', async () => {
    // 1. Initial State: d4-5 has math divergence (100 * 45 = 4500, recorded 4000)
    let issues = await invoiceRepository.getValidationIssues('demo-04');
    let mathIssue = issues.find((i) => i.itemId === 'd4-5' && i.campo === 'valorTotal');
    assert.ok(mathIssue, 'demo-04 item d4-5 must have initial math divergence');

    // 2. User edits unitPrice or quantity via updateItem -> math divergence dynamically disappears
    await invoiceRepository.updateItem('demo-04', 'd4-5', { valorUnitario: '45.0000' });
    issues = await invoiceRepository.getValidationIssues('demo-04');
    mathIssue = issues.find((i) => i.itemId === 'd4-5' && i.campo === 'valorTotal');
    assert.strictEqual(mathIssue, undefined, 'Math divergence on d4-5 must disappear after updateItem');
    let doc = await invoiceRepository.findById('demo-04');
    let item = doc.itens.find((i) => i.id === 'd4-5');
    assert.strictEqual(item.situacao, 'conferido');

    // 3. Math divergence dynamically appears when item total diverges (e.g. via update())
    const d42 = doc.itens.find((i) => i.id === 'd4-2');
    d42.valorTotal = '99999.00'; // 120 * 75 = 9000
    await invoiceRepository.update('demo-04', { itens: doc.itens });

    issues = await invoiceRepository.getValidationIssues('demo-04');
    const d42Issue = issues.find((i) => i.itemId === 'd4-2' && i.campo === 'valorTotal');
    assert.ok(d42Issue, 'Math divergence on d4-2 must be detected by getValidationIssues');
    assert.match(d42Issue.mensagem, /Divergência matemática/);

    // 4. Fixing via updateItem recalculates line total and removes issue
    await invoiceRepository.updateItem('demo-04', 'd4-2', { quantidade: '120.0000' });
    issues = await invoiceRepository.getValidationIssues('demo-04');
    const d42Fixed = issues.find((i) => i.itemId === 'd4-2' && i.campo === 'valorTotal');
    assert.strictEqual(d42Fixed, undefined, 'Math divergence on d4-2 must disappear after updateItem');
  });

  it('4.5: Full remediation of demo-04: all issues cleared and all items conferido', async () => {
    // Fix all 4 items with inconsistencies:
    await invoiceRepository.updateItem('demo-04', 'd4-3', { cfop: '7102' });
    await invoiceRepository.updateItem('demo-04', 'd4-5', { valorUnitario: '45.0000' });
    await invoiceRepository.updateItem('demo-04', 'd4-8', { ncm: '64035910' });
    await invoiceRepository.updateItem('demo-04', 'd4-11', { unidade: 'PAR' });

    const issues = await invoiceRepository.getValidationIssues('demo-04');
    console.log(`[CHALLENGE 4.5] Remaining validation issues on demo-04: ${issues.length}`);
    assert.strictEqual(issues.length, 0, 'All validation issues on demo-04 must be resolved');

    const doc = await invoiceRepository.findById('demo-04');
    const nonConferidoItems = doc.itens.filter((it) => it.situacao !== 'conferido');
    console.log(
      '[CHALLENGE 4.5] Non-conferido items count:',
      nonConferidoItems.length,
      nonConferidoItems.map((i) => ({ id: i.id, situacao: i.situacao }))
    );
    assert.strictEqual(
      nonConferidoItems.length,
      0,
      'Every item in demo-04 must have situacao === "conferido" when all issues are fixed'
    );
  });
});
