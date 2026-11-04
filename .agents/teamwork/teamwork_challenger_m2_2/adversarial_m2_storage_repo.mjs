/**
 * SmartNFe — Adversarial Test Suite for M2 Storage & Repositories
 *
 * Verificações adversariais:
 * 1. LocalStorage corruption (invalid JSON, version 0.9.0, missing version tag)
 * 2. Storage exhaustion simulation (QuotaExceededError & MemoryStorage fallback)
 * 3. Repository concurrency (race conditions, non-existent items, non-existent invoices)
 * 4. Dynamic validation engine (fixing CFOP 5102->7102 in demo-04, introducing 7-digit NCM)
 * 5. DataTable with data={null} and data={undefined}
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT_DIR = process.cwd();

import {
  localStorageService,
  STORAGE_SCHEMA_VERSION,
  STORAGE_KEYS,
  save,
  load,
  reset,
  resetAll,
  has,
  getInfo,
  setCustomStorage,
} from '../../../app/lib/storage/localStorageService.js';

import { invoiceRepository } from '../../../app/features/invoiceRepository.js';
import { preparedInvoiceRepository } from '../../../app/features/preparedInvoiceRepository.js';

describe('ADVERSARIAL SUITE 1: LocalStorage Corruption & Auto-Healing', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = new Map();
    const storageMock = {
      getItem: (k) => (mockStore.has(k) ? mockStore.get(k) : null),
      setItem: (k, v) => { mockStore.set(k, String(v)); },
      removeItem: (k) => { mockStore.delete(k); },
      clear: () => { mockStore.clear(); },
      key: (i) => Array.from(mockStore.keys())[i] || null,
      get length() { return mockStore.size; },
    };
    setCustomStorage(storageMock);
    resetAll();
  });

  it('1.1: Injeta string JSON totalmente inválida e verifica auto-healing', () => {
    mockStore.set(STORAGE_KEYS.INVOICES, '{corrupted: json [missing closing brackets');

    assert.strictEqual(has(STORAGE_KEYS.INVOICES), false, 'has() deve ser falso para JSON inválido');
    const info = getInfo(STORAGE_KEYS.INVOICES);
    assert.strictEqual(info.corrupted, true, 'getInfo() deve marcar corrupted: true');

    // Executa load() com fallback
    const result = load(STORAGE_KEYS.INVOICES, []);
    assert.ok(Array.isArray(result), 'load() deve retornar array');
    assert.strictEqual(result.length, 5, 'load() deve restaurar os 5 mocks padrão via auto-healing');

    // Verifica se após auto-healing o storage foi curado com envelope versionado
    assert.strictEqual(has(STORAGE_KEYS.INVOICES), true, 'Storage deve ser auto-curado');
    const stored = JSON.parse(mockStore.get(STORAGE_KEYS.INVOICES));
    assert.strictEqual(stored.version, STORAGE_SCHEMA_VERSION);
    assert.strictEqual(stored.data.length, 5);
  });

  it('1.2: Injeta schema version defasada "0.9.0" e verifica migração/restauração', () => {
    const staleEnvelope = {
      version: '0.9.0',
      timestamp: Date.now() - 1000000,
      data: [{ id: 'stale-doc', numero: '000.000.001' }],
    };
    mockStore.set(STORAGE_KEYS.INVOICES, JSON.stringify(staleEnvelope));

    assert.strictEqual(has(STORAGE_KEYS.INVOICES), false, 'has() deve ser false para versão 0.9.0');
    const info = getInfo(STORAGE_KEYS.INVOICES);
    assert.strictEqual(info.isCurrentSchema, false, 'isCurrentSchema deve ser false');

    const result = load(STORAGE_KEYS.INVOICES, null);
    assert.strictEqual(result.length, 5, 'load() deve descartar v0.9.0 e restaurar os 5 mocks oficiais');

    const healed = JSON.parse(mockStore.get(STORAGE_KEYS.INVOICES));
    assert.strictEqual(healed.version, STORAGE_SCHEMA_VERSION);
  });

  it('1.3: Injeta payload sem tag de versão (formato não empacotado)', () => {
    // Objeto sem envelope { version, timestamp, data }
    mockStore.set(STORAGE_KEYS.INVOICES, JSON.stringify([{ id: 'unwrapped-doc' }]));

    assert.strictEqual(has(STORAGE_KEYS.INVOICES), false);
    const result = load(STORAGE_KEYS.INVOICES, null);
    assert.strictEqual(result.length, 5, 'load() deve auto-curar formato sem version tag');
  });

  it('1.4: Injeta valores primitivos inválidos (número, boolean, null literal)', () => {
    mockStore.set(STORAGE_KEYS.INVOICES, '42');
    assert.strictEqual(has(STORAGE_KEYS.INVOICES), false);
    let result = load(STORAGE_KEYS.INVOICES, null);
    assert.strictEqual(result.length, 5);

    mockStore.set(STORAGE_KEYS.INVOICES, 'true');
    result = load(STORAGE_KEYS.INVOICES, null);
    assert.strictEqual(result.length, 5);

    mockStore.set(STORAGE_KEYS.INVOICES, 'null');
    result = load(STORAGE_KEYS.INVOICES, null);
    assert.strictEqual(result.length, 5);
  });
});

describe('ADVERSARIAL SUITE 2: Storage Exhaustion & Fallback Simulation', () => {
  it('2.1: Simula QuotaExceededError em setItem e verifica se save() trata graciosamente', () => {
    const quotaExceededStorage = {
      getItem: () => null,
      setItem: () => {
        const err = new Error('QuotaExceededError: DOM Exception 22');
        err.name = 'QuotaExceededError';
        err.code = 22;
        throw err;
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };

    setCustomStorage(quotaExceededStorage);

    // Salvar não deve lançar exceção não capturada
    assert.doesNotThrow(() => {
      const ok = save('test_quota_key', { foo: 'bar' });
      assert.strictEqual(ok, false, 'save() deve retornar false indicando falha no storage primário');
    });
  });

  it('2.2: Verifica se dados salvos durante QuotaExceeded podem ser lidos por load()', () => {
    let throwOnSet = true;
    const store = new Map();
    const quotaStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => {
        if (throwOnSet) {
          throw new Error('QuotaExceededError');
        }
        store.set(k, v);
      },
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      key: (i) => Array.from(store.keys())[i] || null,
      get length() { return store.size; },
    };

    setCustomStorage(quotaStorage);

    // Tenta salvar sob quota cheia
    const saved = save('ephemeral_key', { resilient: true });
    assert.strictEqual(saved, false);

    // O que acontece ao tentar dar load?
    // CHALLENGE: O load() consegue recuperar os dados de memoryStore?
    const loaded = load('ephemeral_key', null);
    console.log('[CHALLENGE LOG] 2.2 loaded value under QuotaExceeded:', loaded);
    assert.deepStrictEqual(loaded, { resilient: true }, 'load() deve ler fallback de memória sob quota excedida');
  });
});

describe('ADVERSARIAL SUITE 3: Repository Concurrency & Missing Entities', () => {
  beforeEach(async () => {
    setCustomStorage(null); // Volta ao padrão
    await invoiceRepository.resetDemoData();
  });

  it('3.1: Chamadas concorrentes de updateItem() na mesma nota fiscal', async () => {
    // Cenário: duas edições simultâneas disparadas quase ao mesmo instante (ex: inline edits rápidas)
    const p1 = invoiceRepository.updateItem('demo-01', 'd1-1', { descricao: 'PRODUTO 1 CONCORRENTE' });
    const p2 = invoiceRepository.updateItem('demo-01', 'd1-2', { descricao: 'PRODUTO 2 CONCORRENTE' });

    const [res1, res2] = await Promise.all([p1, p2]);

    // Busca a nota consolidada no storage final
    const finalInvoice = await invoiceRepository.findById('demo-01');
    const item1 = finalInvoice.itens.find((it) => it.id === 'd1-1');
    const item2 = finalInvoice.itens.find((it) => it.id === 'd1-2');

    console.log('[CHALLENGE LOG] 3.1 Concurrency item1 descricao:', item1?.descricao);
    console.log('[CHALLENGE LOG] 3.1 Concurrency item2 descricao:', item2?.descricao);

    // Verifica se ambas as atualizações persistiram ou se uma sobrescreveu a outra
    const raceLost = item1?.descricao !== 'PRODUTO 1 CONCORRENTE' || item2?.descricao !== 'PRODUTO 2 CONCORRENTE';
    console.log('[CHALLENGE LOG] 3.1 Concurrency race condition detected?:', raceLost);
    assert.strictEqual(raceLost, false, 'Chamadas concorrentes de updateItem() não devem sofrer race condition');
  });

  it('3.2: Atualizar item não existente em documento existente', async () => {
    await assert.rejects(
      async () => {
        await invoiceRepository.updateItem('demo-01', 'item-fantasma-999', { valorUnitario: '10.00' });
      },
      /Item "item-fantasma-999" não encontrado/,
      'Deve rejeitar com erro explicativo de item não encontrado'
    );
  });

  it('3.3: Atualizar item em documento não existente', async () => {
    await assert.rejects(
      async () => {
        await invoiceRepository.updateItem('doc-inexistente-xyz', 'd1-1', { valorUnitario: '10.00' });
      },
      /Documento fiscal não encontrado/,
      'Deve rejeitar com erro explicativo de documento não encontrado'
    );
  });

  it('3.4: Atualizar documento não existente via update()', async () => {
    await assert.rejects(
      async () => {
        await invoiceRepository.update('doc-inexistente-xyz', { status: 'conferido' });
      },
      /Documento fiscal não encontrado/,
      'Deve rejeitar update() em doc inexistente'
    );
  });
});

describe('ADVERSARIAL SUITE 4: Dynamic Validation Engine (demo-04 & Fiscal Rules)', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await invoiceRepository.resetDemoData();
  });

  it('4.1: Corrigir CFOP 5102 para 7102 no item d4-3 de demo-04 remove dinamicamente o erro?', async () => {
    const beforeIssues = await invoiceRepository.getValidationIssues('demo-04');
    const cfopIssueBefore = beforeIssues.find((i) => i.itemId === 'd4-3' && i.campo === 'cfop');
    assert.ok(cfopIssueBefore, 'demo-04 deve ter erro de CFOP inicial no item d4-3');

    // Executa a correção do usuário: altera de 5102 para 7102
    await invoiceRepository.updateItem('demo-04', 'd4-3', { cfop: '7102' });

    // Consulta os apontamentos novamente
    const afterIssues = await invoiceRepository.getValidationIssues('demo-04');
    const cfopIssueAfter = afterIssues.find((i) => i.itemId === 'd4-3' && i.campo === 'cfop');

    console.log('[CHALLENGE LOG] 4.1 CFOP issue after changing to 7102:', cfopIssueAfter);

    // O teste adversarial verifica se o erro SUMIU ou PERMANECEU
    // Se ainda houver issue de CFOP para d4-3, o motor NÃO é dinâmico para inconsistências pré-anotadas!
    assert.strictEqual(
      cfopIssueAfter,
      undefined,
      'A correção do CFOP para 7102 DEVERIA remover o erro de CFOP em demo-04'
    );
  });

  it('4.2: Introduzir NCM de 7 dígitos em demo-04 (ou demo-01) gera validação dinâmica de NCM?', async () => {
    // Altera d4-1 (que era válido 64035910) para um NCM truncado de 7 dígitos '6403591'
    await invoiceRepository.updateItem('demo-04', 'd4-1', { ncm: '6403591' });

    const issues = await invoiceRepository.getValidationIssues('demo-04');
    const ncmIssue = issues.find((i) => i.itemId === 'd4-1' && i.campo === 'ncm');

    console.log('[CHALLENGE LOG] 4.2 Dynamic NCM issue generated:', ncmIssue);
    assert.ok(ncmIssue, 'Motor dinâmico deve detectar NCM de 7 dígitos como erro');
    assert.strictEqual(ncmIssue.tipo, 'erro');
    assert.match(ncmIssue.mensagem, /8 dígitos/);
  });

  it('4.3: Corrigir divergência matemática no item d4-5 de demo-04 remove dinamicamente o erro?', async () => {
    const beforeIssues = await invoiceRepository.getValidationIssues('demo-04');
    const mathBefore = beforeIssues.find((i) => i.itemId === 'd4-5' && i.campo === 'valorTotal');
    assert.ok(mathBefore, 'demo-04 deve ter erro de divergência matemática inicial no item d4-5');

    // Atualiza o item (recalcula valorTotal automaticamente no updateItem)
    await invoiceRepository.updateItem('demo-04', 'd4-5', { valorUnitario: '45.0000' });

    const afterIssues = await invoiceRepository.getValidationIssues('demo-04');
    const mathAfter = afterIssues.find((i) => i.itemId === 'd4-5' && i.campo === 'valorTotal');
    console.log('[CHALLENGE LOG] 4.3 Math divergence issue after updateItem:', mathAfter);
    assert.strictEqual(mathAfter, undefined, 'A correção da divergência matemática no item d4-5 DEVERIA remover o erro');
  });
});

describe('ADVERSARIAL SUITE 5: DataTable Resiliência & Edge Cases', () => {
  const dtPath = resolve(ROOT_DIR, 'app/components/table/DataTable.jsx');
  assert.ok(existsSync(dtPath));

  const { transformSync } = require('next/dist/build/swc');
  const dtSource = readFileSync(dtPath, 'utf-8');
  const stubbedSource = dtSource.replace(
    /import InputText from ['"].*InputText['"];/,
    `const InputText = ({ value, onChange, placeholder, id }) => React.createElement('input', {
      id: id,
      value: value,
      placeholder: placeholder,
      onChange: (e) => onChange && onChange(id, e.target.value)
    });`
  );

  const { code } = transformSync(stubbedSource, {
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'classic' } },
    },
    module: { type: 'commonjs' },
  });

  const moduleEnv = { exports: {} };
  const compileFn = new Function('require', 'module', 'exports', 'React', code);
  compileFn(require, moduleEnv, moduleEnv.exports, React);
  const DataTable = moduleEnv.exports.default || moduleEnv.exports;

  it('5.1: DataTable não lança exceção com data={null}', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: null,
          columns: [{ key: 'col1', label: 'Coluna 1' }],
        })
      );
      assert.match(html, /Exibindo 0 de 0 registros/);
      assert.match(html, /Não há dados para exibir.../);
    });
  });

  it('5.2: DataTable não lança exceção com data={undefined}', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: undefined,
          columns: [{ key: 'col1', label: 'Coluna 1' }],
        })
      );
      assert.match(html, /Exibindo 0 de 0 registros/);
      assert.match(html, /Não há dados para exibir.../);
    });
  });

  it('5.3: DataTable não lança exceção com data={[]}', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [],
          columns: [{ key: 'col1', label: 'Coluna 1' }],
        })
      );
      assert.match(html, /Exibindo 0 de 0 registros/);
    });
  });

  it('5.4: DataTable com array contendo elementos null/undefined (resiliência confirmada)', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [null, undefined, { id: 'valid', nome: 'Linha Válida' }],
          columns: [{ key: 'nome', label: 'Nome' }],
        })
      );
      assert.match(html, /Linha Válida/);
      assert.match(html, /Exibindo 1 de 1 registros/);
    });
  });
});

describe('ADVERSARIAL SUITE 6: PreparedInvoiceRepository & Query Edge Cases', () => {
  beforeEach(async () => {
    setCustomStorage(null);
    await preparedInvoiceRepository.resetDemoData();
  });

  it('6.1: preparedInvoiceRepository.findById com ID null/vazio retorna null', async () => {
    assert.strictEqual(await preparedInvoiceRepository.findById(null), null);
    assert.strictEqual(await preparedInvoiceRepository.findById(''), null);
    assert.strictEqual(await preparedInvoiceRepository.findById('nao-existe'), null);
  });

  it('6.2: preparedInvoiceRepository.delete com ID inexistente retorna false sem lançar', async () => {
    const deleted = await preparedInvoiceRepository.delete('prep-fantasma-999');
    assert.strictEqual(deleted, false);
  });

  it('6.3: preparedInvoiceRepository.create com payload nulo lança erro explicativo', async () => {
    await assert.rejects(
      async () => {
        await preparedInvoiceRepository.create(null);
      },
      /Dados da nota preparada são obrigatórios/
    );
  });

  it('6.4: list com query de espaços em branco não quebra nem filtra incorretamente', async () => {
    const all = await preparedInvoiceRepository.list();
    const spaces = await preparedInvoiceRepository.list({ query: '     ' });
    assert.strictEqual(spaces.length, all.length, 'Query de espaços em branco deve retornar todos os itens');
  });

  it('6.5: invoiceRepository.list com parâmetros de paginação extremos ou inválidos', async () => {
    const p1 = await invoiceRepository.list({ page: -5, pageSize: -10, returnPagination: true });
    assert.ok(p1.data.length >= 0);

    const p2 = await invoiceRepository.list({ page: 'abc', pageSize: 'xyz', returnPagination: true });
    assert.ok(p2.data.length >= 0);
  });
});

describe('ADVERSARIAL SUITE 7: resetAll & Master Factory Reset', () => {
  it('7.1: resetAll limpa chaves residuais smartnfe_* e restaura chaves oficiais', async () => {
    const store = new Map();
    const custom = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      key: (i) => Array.from(store.keys())[i] || null,
      get length() { return store.size; },
    };
    setCustomStorage(custom);

    // Injeta chaves oficiais e chave residual não registrada
    save(STORAGE_KEYS.INVOICES, [{ id: 'modified-doc' }]);
    save('smartnfe_custom_residual', { garbage: true });

    assert.ok(store.has('smartnfe_custom_residual'));

    // Executa resetAll
    resetAll();

    // A chave residual deve ter sido removida
    assert.strictEqual(store.has('smartnfe_custom_residual'), false, 'Chaves residuais smartnfe_* devem ser removidas');
    // As chaves oficiais devem ter sido restauradas para a fábrica
    const restored = load(STORAGE_KEYS.INVOICES);
    assert.strictEqual(restored.length, 5, 'INVOICES deve ter sido restaurado para os 5 mocks');
  });
});

