/**
 * SmartNFe — Challenger 2 M2-IT2 Adversarial Verification Suite
 *
 * Targets:
 * 1. Storage Exhaustion Fallback (quota transitions, memory fallback, purge, auto-healing)
 * 2. DataTable Adversarial Inputs (nulls, primitives, sparse arrays, corrupted columns/headers, active search filter)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
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
  isQuotaExceeded,
  setCustomStorage,
} from '../../../app/lib/storage/localStorageService.js';

import { invoiceRepository } from '../../../app/features/invoiceRepository.js';
import { preparedInvoiceRepository } from '../../../app/features/preparedInvoiceRepository.js';

// ============================================================================
// SUITE 1: Storage Exhaustion & Fallback Transitions
// ============================================================================
describe('ADVERSARIAL STRESS 1: Storage Exhaustion & Quota Transitions', () => {
  let primaryStore;
  let throwOnSet = false;

  function createMockBackend() {
    return {
      getItem: (k) => (primaryStore.has(k) ? primaryStore.get(k) : null),
      setItem: (k, v) => {
        if (throwOnSet) {
          const err = new Error('QuotaExceededError: DOM Exception 22');
          err.name = 'QuotaExceededError';
          err.code = 22;
          throw err;
        }
        primaryStore.set(k, String(v));
      },
      removeItem: (k) => { primaryStore.delete(k); },
      clear: () => { primaryStore.clear(); },
      key: (i) => Array.from(primaryStore.keys())[i] || null,
      get length() { return primaryStore.size; },
    };
  }

  beforeEach(() => {
    primaryStore = new Map();
    throwOnSet = false;
    setCustomStorage(createMockBackend());
    resetAll();
  });

  afterEach(() => {
    setCustomStorage(null);
  });

  it('1.1: Quota cheia -> save() falha no primário, grava no memoryStore, load() recupera e has()/getInfo() detectam', () => {
    // 1. Simula quota cheia
    throwOnSet = true;

    const payload = { testId: 'quota-001', items: [1, 2, 3], status: 'em_memoria' };
    const saveResult = save('quota_test_key', payload);

    // save() deve capturar o erro e retornar false
    assert.strictEqual(saveResult, false, 'save() sob quota cheia deve retornar false');
    assert.strictEqual(isQuotaExceeded(), true, 'isQuotaExceeded() deve reportar true');

    // has() e getInfo() devem enxergar os dados no memoryStore
    assert.strictEqual(has('quota_test_key'), true, 'has() deve retornar true mesmo salvo apenas em memória');
    const info = getInfo('quota_test_key');
    assert.strictEqual(info.exists, true, 'getInfo().exists deve ser true');
    assert.strictEqual(info.isCurrentSchema, true, 'getInfo().isCurrentSchema deve ser true');
    assert.strictEqual(info.version, STORAGE_SCHEMA_VERSION);

    // load() deve recuperar fielmente os dados do memoryStore
    const loaded = load('quota_test_key', null);
    assert.deepStrictEqual(loaded, payload, 'load() deve retornar exatamente o payload salvo em memória');
  });

  it('1.2: Quota liberada -> save() subsequente tem sucesso e purga cópia obsoleta do memoryStore', () => {
    // Passo 1: Salva sob quota cheia
    throwOnSet = true;
    const initialPayload = { version_state: 'initial_memory_only', timestamp: 111 };
    save('transition_key', initialPayload);
    assert.strictEqual(isQuotaExceeded(), true);
    assert.deepStrictEqual(load('transition_key'), initialPayload);

    // Passo 2: Libera a quota do storage primário
    throwOnSet = false;
    const updatedPayload = { version_state: 'persisted_in_storage', timestamp: 222 };
    const secondSaveResult = save('transition_key', updatedPayload);

    assert.strictEqual(secondSaveResult, true, 'save() com quota liberada deve retornar true');
    assert.strictEqual(isQuotaExceeded(), false, 'isQuotaExceeded() deve voltar a false');
    assert.deepStrictEqual(load('transition_key'), updatedPayload);

    // Passo 3: Verificação de purga empírica
    // Se a cópia obsoleta initialPayload permanecesse no memoryStore,
    // ao remover a chave diretamente do storage primário, load() retornaria initialPayload.
    // Como foi purgada, load() deve retornar o fallback fornecido ('purged_clean').
    primaryStore.delete('transition_key');
    const afterDelete = load('transition_key', 'purged_clean');
    assert.strictEqual(
      afterDelete,
      'purged_clean',
      'A cópia residual em memória DEVE ter sido purgada pelo save() bem-sucedido'
    );
    assert.strictEqual(has('transition_key'), false, 'has() deve ser false após remoção');
  });

  it('1.3: Ciclos múltiplos de alternância de quota (Quota Exceeded -> Quota Freed -> Quota Exceeded)', () => {
    const key = 'flapping_quota_key';

    // Ciclo 1: Quota OK
    throwOnSet = false;
    assert.strictEqual(save(key, { cycle: 1 }), true);
    assert.strictEqual(isQuotaExceeded(), false);
    assert.deepStrictEqual(load(key), { cycle: 1 });

    // Ciclo 2: Quota Exceeded
    throwOnSet = true;
    assert.strictEqual(save(key, { cycle: 2 }), false);
    assert.strictEqual(isQuotaExceeded(), true);
    assert.deepStrictEqual(load(key), { cycle: 2 });

    // Ciclo 3: Quota Freed
    throwOnSet = false;
    assert.strictEqual(save(key, { cycle: 3 }), true);
    assert.strictEqual(isQuotaExceeded(), false);
    assert.deepStrictEqual(load(key), { cycle: 3 });

    // Ciclo 4: Quota Exceeded novamente
    throwOnSet = true;
    assert.strictEqual(save(key, { cycle: 4 }), false);
    assert.strictEqual(isQuotaExceeded(), true);
    assert.deepStrictEqual(load(key), { cycle: 4 });
  });

  it('1.4: Payload corrompido em memória -> auto-healing restaura dados de fábrica sob quota excedida', () => {
    // Configura storage primário para simular falha permanente de escrita (Quota cheia)
    // E simula que o valor lido do primário é inválido/corrompido
    const corruptStorage = {
      getItem: (k) => {
        if (k === STORAGE_KEYS.INVOICES) {
          return '{{BAD_JSON_CORRUPTED_MEM_PAYLOAD::';
        }
        return null;
      },
      setItem: () => {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      get length() { return 0; },
    };

    setCustomStorage(corruptStorage);

    // O storage tem JSON corrompido E a quota de escrita está estourada
    assert.strictEqual(has(STORAGE_KEYS.INVOICES), false, 'has() deve ser false para payload corrompido');

    // Executa load() -> deve acionar auto-healing
    // O auto-healing chama save(STORAGE_KEYS.INVOICES, defaultData)
    // Como setItem lança QuotaExceededError, o save salva o defaultData no memoryStore!
    const healed = load(STORAGE_KEYS.INVOICES, null);
    assert.ok(Array.isArray(healed), 'load() deve retornar array após auto-healing');
    assert.strictEqual(healed.length, 5, 'load() deve restaurar os 5 invoices de fábrica mesmo sob quota cheia');

    // Agora has() deve ser true porque o envelope restaurado está no memoryStore!
    assert.strictEqual(has(STORAGE_KEYS.INVOICES), true, 'has() deve ser true após auto-healing via memoryStore');
    const info = getInfo(STORAGE_KEYS.INVOICES);
    assert.strictEqual(info.exists, true);
    assert.strictEqual(info.isCurrentSchema, true);

    // Próxima leitura carrega os dados curados da memória
    const subsequentLoad = load(STORAGE_KEYS.INVOICES);
    assert.strictEqual(subsequentLoad.length, 5);
    assert.strictEqual(subsequentLoad[0].id, 'demo-01');
  });

  it('1.5: Payload corrompido em memória com versão obsoleta v0.8.0 sob quota cheia', () => {
    const outdatedStorage = {
      getItem: (k) => {
        if (k === STORAGE_KEYS.INVOICES) {
          return JSON.stringify({
            version: '0.8.0',
            timestamp: 1000,
            data: [{ id: 'outdated-doc' }],
          });
        }
        return null;
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };

    setCustomStorage(outdatedStorage);

    const healed = load(STORAGE_KEYS.INVOICES);
    assert.strictEqual(healed.length, 5, 'Deve restaurar os 5 mocks oficiais descartando v0.8.0');
    assert.strictEqual(healed[0].id, 'demo-01');
  });
});

// ============================================================================
// SUITE 2: DataTable Adversarial Inputs & Active Search Filtering
// ============================================================================
describe('ADVERSARIAL STRESS 2: DataTable Adversarial Inputs & Filtering', () => {
  const dtPath = resolve(ROOT_DIR, 'app/components/table/DataTable.jsx');
  assert.ok(existsSync(dtPath), 'DataTable.jsx deve existir');

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

  it('2.1: Adversarial Inputs Exatos: data=[null, undefined, false, 0, "", [], {}, { id: 1, name: "ok" }] com columns e header malformados', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [null, undefined, false, 0, '', [], {}, { id: 1, name: 'ok' }],
          columns: [null, undefined, { key: 'name', label: 'Name' }, {}],
          header: [null, undefined, 'Column 1'],
        })
      );

      // Verificações de integridade do HTML gerado
      assert.ok(typeof html === 'string');
      assert.ok(html.length > 0);

      // Coluna 'Name' deve estar no thead
      assert.match(html, /<th[^>]*>Name<\/th>/);

      // O elemento válido { id: 1, name: 'ok' } deve ser renderizado
      assert.match(html, /ok/);

      // O elemento objeto vazio {} deve ser renderizado com fallback '-'
      assert.match(html, /-/);

      // Rodapé deve refletir exatamente os 2 objetos válidos (filtrando null, undefined, false, 0, '', [])
      assert.match(html, /Exibindo 2 de 2 registros/);

      // Elementos primitivos falsos não devem aparecer como conteúdo isolado
      assert.doesNotMatch(html, />false</);
      assert.doesNotMatch(html, />null</);
      assert.doesNotMatch(html, />undefined</);
    });
  });

  it('2.2: Renderização em Modo Header Legado com elementos null, undefined e strings primitivas', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [null, undefined, false, 0, '', [], {}, { id: 1, name: 'ok' }],
          columns: undefined,
          header: [null, undefined, 'Column 1'],
        })
      );

      assert.ok(typeof html === 'string');
      assert.match(html, /Exibindo 2 de 2 registros/);
      assert.match(html, /ok/);
    });
  });

  it('2.3: Filtro de busca ativo com array esparso -> termo encontra registro existente', () => {
    const origUseState = React.useState;
    try {
      // Simula filterText = 'ok' via hook useState
      React.useState = (initial) => {
        if (typeof initial === 'string') {
          return ['ok', () => {}];
        }
        return origUseState(initial);
      };

      assert.doesNotThrow(() => {
        const html = renderToStaticMarkup(
          React.createElement(DataTable, {
            data: [null, undefined, false, 0, '', [], {}, { id: 1, name: 'ok' }],
            columns: [null, undefined, { key: 'name', label: 'Name' }, {}],
            header: [null, undefined, 'Column 1'],
          })
        );

        // Deve filtrar apenas a linha { id: 1, name: 'ok' }
        // 1 de 2 registros
        assert.match(html, /Exibindo 1 de 2 registros/);
        assert.match(html, /ok/);
      });
    } finally {
      React.useState = origUseState;
    }
  });

  it('2.4: Filtro de busca ativo com termo que não combina com nenhum registro', () => {
    const origUseState = React.useState;
    try {
      // Simula filterText = 'inexistente_xyz'
      React.useState = (initial) => {
        if (typeof initial === 'string') {
          return ['inexistente_xyz', () => {}];
        }
        return origUseState(initial);
      };

      assert.doesNotThrow(() => {
        const html = renderToStaticMarkup(
          React.createElement(DataTable, {
            data: [null, undefined, false, 0, '', [], {}, { id: 1, name: 'ok' }],
            columns: [null, undefined, { key: 'name', label: 'Name' }, {}],
            header: [null, undefined, 'Column 1'],
            emptyText: 'Nenhum resultado para a busca',
          })
        );

        // 0 de 2 registros exibidos
        assert.match(html, /Exibindo 0 de 2 registros/);
        assert.match(html, /Nenhum resultado para a busca/);
        // O valor 'ok' não deve estar no tbody
        assert.doesNotMatch(html, /<td[^>]*>ok<\/td>/);
      });
    } finally {
      React.useState = origUseState;
    }
  });

  it('2.5: Filtro de busca ativo por campo numérico (ex: busca por "1")', () => {
    const origUseState = React.useState;
    try {
      // Simula filterText = '1'
      React.useState = (initial) => {
        if (typeof initial === 'string') {
          return ['1', () => {}];
        }
        return origUseState(initial);
      };

      assert.doesNotThrow(() => {
        const html = renderToStaticMarkup(
          React.createElement(DataTable, {
            data: [null, undefined, false, 0, '', [], {}, { id: 1, name: 'ok' }],
            columns: [null, undefined, { key: 'name', label: 'Name' }, {}],
            header: [null, undefined, 'Column 1'],
          })
        );

        // id: 1 combina com o termo '1'
        assert.match(html, /Exibindo 1 de 2 registros/);
        assert.match(html, /ok/);
      });
    } finally {
      React.useState = origUseState;
    }
  });

  it('2.6: Entradas de tipo primitivo incorreto para props data e columns', () => {
    // data recebendo tipos inválidos não deve lançar exceção
    const invalidDataValues = ['string', 12345, true, false, { not: 'an array' }];

    for (const badData of invalidDataValues) {
      assert.doesNotThrow(() => {
        const html = renderToStaticMarkup(
          React.createElement(DataTable, {
            data: badData,
            columns: [{ key: 'name', label: 'Name' }],
          })
        );
        assert.match(html, /Exibindo 0 de 0 registros/);
        assert.match(html, /Não há dados para exibir.../);
      }, `DataTable com data=${JSON.stringify(badData)} não deve lançar exceção`);
    }

    // columns recebendo tipos inválidos não deve lançar exceção
    const invalidColumnValues = ['string', 123, true, { not: 'array' }];
    for (const badCols of invalidColumnValues) {
      assert.doesNotThrow(() => {
        const html = renderToStaticMarkup(
          React.createElement(DataTable, {
            data: [{ id: 1, name: 'ok' }],
            columns: badCols,
          })
        );
        assert.ok(typeof html === 'string');
      }, `DataTable com columns=${JSON.stringify(badCols)} não deve lançar exceção`);
    }
  });
});
