/**
 * SmartNFe — Tier 5 Adversarial Hardening Suite: Milestone 1 Foundation & Dashboard
 *
 * Testes empíricos rigorosos projetados por agente Adversarial Challenger.
 * Desafia suposições, limites numéricos, injeção de caracteres, robustez a nulos/indefinidos,
 * consistência matemática de dados mockados e integridade de componentes de renderização.
 *
 * Execução: node --no-warnings --test tests/tier5/m1_adversarial_stress.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT_DIR = process.cwd();

// ============================================================================
// SUITE 1: formatters/currency.js — Testes de Estresse Monetário
// ============================================================================
describe('Adversarial Challenger: formatters/currency.js', async () => {
  const currencyPath = resolve(ROOT_DIR, 'app/lib/formatters/currency.js');
  assert.ok(existsSync(currencyPath), 'currency.js deve existir');
  const { formatBRL, parseBRL, formatNumberBRL } = await import(
    pathToFileURL(currencyPath).href
  );

  it('Lida com zeros absolutos e representações decimais variadas', () => {
    assert.strictEqual(formatBRL(0), 'R$\u00a00,00');
    assert.strictEqual(formatBRL('0'), 'R$\u00a00,00');
    assert.strictEqual(formatBRL('0.00'), 'R$\u00a00,00');
    assert.strictEqual(formatBRL('0,00'), 'R$\u00a00,00');

    // Nota empírica: -0 produz -R$ 0,00 devido à especificação IEEE 754 no Intl pt-BR
    const negZero = formatBRL(-0);
    assert.ok(
      negZero.includes('0,00'),
      `formatBRL(-0) deve formatar 0,00, recebido: ${negZero}`
    );
  });

  it('Lida com valores negativos sem corrupção ou perda de sinal', () => {
    const neg1 = formatBRL(-150.5);
    assert.ok(
      neg1.includes('150,50'),
      `Esperado conter 150,50, recebido: ${neg1}`
    );
    assert.ok(
      neg1.includes('-'),
      `Esperado conter sinal negativo, recebido: ${neg1}`
    );

    const negStr = formatBRL('-150.50');
    assert.ok(
      negStr.includes('150,50'),
      `Esperado conter 150,50 para string negativa, recebido: ${negStr}`
    );

    const negSmall = formatBRL(-0.01);
    assert.ok(
      negSmall.includes('0,01'),
      `Esperado conter 0,01 para centavo negativo, recebido: ${negSmall}`
    );
  });

  it('Lida com números extremamente grandes (bilhões e trilhões) sem overflow', () => {
    const bilhao = formatBRL(1000000000.0);
    assert.ok(
      bilhao.includes('1.000.000.000,00'),
      `Esperado 1.000.000.000,00, recebido: ${bilhao}`
    );

    const bilhaoStr = formatBRL('1000000000.00');
    assert.ok(
      bilhaoStr.includes('1.000.000.000,00'),
      `Esperado 1.000.000.000,00 de string, recebido: ${bilhaoStr}`
    );

    const trilhao = formatBRL(1e12);
    assert.ok(
      trilhao.includes('1.000.000.000.000,00'),
      `Esperado 1 trilhão formatado, recebido: ${trilhao}`
    );
  });

  it('Degrada graciosamente e com segurança em inputs inválidos ou hostis', () => {
    const inputsHostis = [
      null,
      undefined,
      '',
      '   ',
      'abc',
      'NaN',
      NaN,
      Infinity,
      -Infinity,
      'R$ 100,00',
      '--150',
      '0x10',
      {},
      [],
    ];

    for (const input of inputsHostis) {
      assert.doesNotThrow(() => {
        const res = formatBRL(input);
        assert.ok(
          typeof res === 'string',
          `formatBRL(${String(input)}) deve retornar string`
        );
        assert.ok(
          !res.includes('NaN'),
          `formatBRL(${String(input)}) não pode conter NaN, recebido: ${res}`
        );
        assert.ok(
          !res.includes('undefined'),
          `formatBRL(${String(input)}) não pode conter undefined`
        );
      }, `formatBRL quebrou com input: ${String(input)}`);
    }
  });

  it('parseBRL converte formato brasileiro BRL e revela armadilha com formato decimal cru', () => {
    // Casos válidos brasileiros
    assert.strictEqual(parseBRL('R$ 1.250,50'), 1250.5);
    assert.strictEqual(parseBRL('1.250,50'), 1250.5);
    assert.strictEqual(parseBRL('0,00'), 0);
    assert.strictEqual(parseBRL(null), 0);
    assert.strictEqual(parseBRL(undefined), 0);
    assert.strictEqual(parseBRL('texto_invalido'), 0);
    assert.strictEqual(parseBRL(2500), 2500);

    // Resolução M2: parseBRL agora suporta formato decimal simples sem inflacionar por 100
    const parsedDotDecimal = parseBRL('1250.50');
    assert.strictEqual(
      parsedDotDecimal,
      1250.5,
      'parseBRL("1250.50") converte com precisão para 1250.5'
    );
  });

  it('formatNumberBRL formata decimais puros com precisão customizada', () => {
    assert.strictEqual(formatNumberBRL(1250.5, 2), '1.250,50');
    assert.strictEqual(formatNumberBRL('1250.5000', 4), '1.250,5000');
    assert.strictEqual(formatNumberBRL(null), '0,00');
    assert.strictEqual(formatNumberBRL('invalido'), '0,00');
  });
});

// ============================================================================
// SUITE 2: formatters/dates.js — Testes de Estresse de Datas
// ============================================================================
describe('Adversarial Challenger: formatters/dates.js', async () => {
  const datesPath = resolve(ROOT_DIR, 'app/lib/formatters/dates.js');
  assert.ok(existsSync(datesPath), 'dates.js deve existir');
  const { formatDateBR, formatDateTimeBR } = await import(
    pathToFileURL(datesPath).href
  );

  it('Ausência estrita de moment.js no código e no projeto', () => {
    const content = readFileSync(datesPath, 'utf-8');
    assert.doesNotMatch(
      content,
      /(import|require).*moment/i,
      'dates.js não pode importar nem requerer moment'
    );

    const pkg = JSON.parse(readFileSync(resolve(ROOT_DIR, 'package.json'), 'utf-8'));
    assert.strictEqual(pkg.dependencies?.moment, undefined, 'moment não deve estar em dependencies');
    assert.strictEqual(pkg.devDependencies?.moment, undefined, 'moment não deve estar em devDependencies');
  });

  it('formatDateBR lida com formatos ISO e previne timezone shift', () => {
    assert.strictEqual(formatDateBR('2026-10-15'), '15/10/2026');
    assert.strictEqual(formatDateBR('2026-01-01'), '01/01/2026');
    assert.strictEqual(formatDateBR('2026-12-31'), '31/12/2026');

    // Ano bissexto
    assert.strictEqual(formatDateBR('2024-02-29'), '29/02/2024');

    // ISO timestamp com Z
    const isoWithZ = formatDateBR('2026-10-15T10:30:00Z');
    assert.strictEqual(isoWithZ, '15/10/2026');

    // Objeto Date
    const dateObj = new Date(Date.UTC(2026, 9, 15));
    assert.strictEqual(formatDateBR(dateObj), '15/10/2026');
  });

  it('formatDateBR retorna "-" em inputs nulos, indefinidos ou strings inválidas', () => {
    const invalidInputs = [
      null,
      undefined,
      '',
      'invalid-date',
      'abc',
      NaN,
      {},
      [],
    ];

    for (const input of invalidInputs) {
      assert.doesNotThrow(() => {
        const res = formatDateBR(input);
        assert.strictEqual(
          res,
          '-',
          `formatDateBR(${String(input)}) deve retornar "-", mas retornou: ${res}`
        );
      });
    }

    // Resolução M2: Prevenção estrita de rollover em datas inválidas (2026-99-99 retorna "-")
    const rolloverResult = formatDateBR('2026-99-99');
    assert.strictEqual(
      rolloverResult,
      '-',
      'formatDateBR valida limites estritos de calendário e não faz rollover'
    );
  });

  it('formatDateTimeBR formata data e hora com separador nativo pt-BR', () => {
    const valid = formatDateTimeBR('2026-10-15T10:30:00Z');
    // Em Node pt-BR Intl, o formato gerado é "15/10/2026, HH:mm"
    assert.ok(
      /^\d{2}\/\d{2}\/\d{4}(,)? \d{2}:\d{2}$/.test(valid),
      `Formato esperado DD/MM/AAAA, HH:mm, recebido: ${valid}`
    );

    assert.strictEqual(formatDateTimeBR(null), '-');
    assert.strictEqual(formatDateTimeBR(''), '-');
    assert.strictEqual(formatDateTimeBR('invalid'), '-');
  });
});

// ============================================================================
// SUITE 3: formatters/status.js — Testes de Estresse de Status
// ============================================================================
describe('Adversarial Challenger: formatters/status.js', async () => {
  const statusPath = resolve(ROOT_DIR, 'app/lib/formatters/status.js');
  assert.ok(existsSync(statusPath), 'status.js deve existir');
  const {
    STATUS_CONFIG,
    getStatusLabel,
    getStatusColor,
    getStatusBadgeClass,
    getStatusBadge,
    getStatusDot,
  } = await import(pathToFileURL(statusPath).href);

  const knownStatuses = [
    'pendente',
    'importado',
    'em_conferencia',
    'conferido',
    'dividido',
    'com_inconsistencias',
    'preparado',
  ];

  it('Mapeia com precisão todos os 7 status conhecidos do ecossistema fiscal', () => {
    for (const st of knownStatuses) {
      assert.ok(STATUS_CONFIG[st], `STATUS_CONFIG deve conter chave: ${st}`);
      assert.ok(
        typeof getStatusLabel(st) === 'string' && getStatusLabel(st).length > 0,
        `getStatusLabel(${st}) deve retornar string não-vazia`
      );
      assert.ok(
        typeof getStatusColor(st) === 'string' && getStatusColor(st).includes('bg-'),
        `getStatusColor(${st}) deve retornar classes Tailwind`
      );
      assert.ok(
        typeof getStatusDot(st) === 'string' && getStatusDot(st).includes('bg-'),
        `getStatusDot(${st}) deve retornar classe de cor da bolinha`
      );
    }
  });

  it('Não falha e provê fallbacks seguros para códigos de status desconhecidos ou nulos', () => {
    const unknownInputs = [
      'status_inexistente',
      'cancelado',
      'rejeitado',
      '',
      null,
      undefined,
      123,
    ];

    for (const input of unknownInputs) {
      assert.doesNotThrow(() => {
        const label = getStatusLabel(input);
        assert.ok(typeof label === 'string' || typeof label === 'number');

        const color = getStatusColor(input);
        assert.ok(typeof color === 'string' && color.includes('bg-'));

        const badge = getStatusBadge(input);
        assert.strictEqual(badge, color);

        const badgeClass = getStatusBadgeClass(input);
        assert.strictEqual(badgeClass, color);

        const dot = getStatusDot(input);
        assert.ok(typeof dot === 'string' && dot.includes('bg-'));
      }, `Falha ao processar status: ${String(input)}`);
    }
  });
});

// ============================================================================
// SUITE 4: DataTable.jsx — Testes de Estresse de Renderização e Filtragem
// ============================================================================
describe('Adversarial Challenger: DataTable.jsx Render & Search Suite', () => {
  const dtPath = resolve(ROOT_DIR, 'app/components/table/DataTable.jsx');
  assert.ok(existsSync(dtPath), 'DataTable.jsx deve existir');

  // Compilar DataTable via SWC para execução em Node.js com stub de InputText
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

  it('Renderiza com data vazia [] sem erros', () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable, {
        data: [],
        mainText: 'Tabela Vazia',
      })
    );
    assert.ok(html.includes('Tabela Vazia'));
    assert.ok(html.includes('Não há dados para exibir...'));
    assert.ok(html.includes('Exibindo 0 de 0 registros'));
  });

  it('Renderiza com colunas explícitas e renderers customizados', () => {
    const columns = [
      { key: 'id', label: 'ID', align: 'left' },
      {
        key: 'nome',
        label: 'Nome Formatado',
        align: 'center',
        render: (row) => `SR. ${row.nome.toUpperCase()}`,
      },
      {
        key: 'preco',
        label: 'Preço',
        align: 'right',
        render: (row) => (row.preco ? `R$ ${row.preco}` : 'Grátis'),
      },
    ];

    const data = [
      { id: '1', nome: 'Carlos', preco: 100 },
      { id: '2', nome: 'Ana', preco: null },
    ];

    const html = renderToStaticMarkup(
      React.createElement(DataTable, {
        data,
        columns,
        mainText: 'Produtos',
      })
    );

    assert.ok(html.includes('SR. CARLOS'));
    assert.ok(html.includes('SR. ANA'));
    assert.ok(html.includes('R$ 100'));
    assert.ok(html.includes('Grátis'));
    assert.ok(html.includes('text-left'));
    assert.ok(html.includes('text-center'));
    assert.ok(html.includes('text-right'));
  });

  it('Lida com linhas contendo propriedades nulas, indefinidas ou ausentes', () => {
    const columns = [
      { key: 'colA', label: 'Coluna A' },
      { key: 'colB', label: 'Coluna B' },
      { key: 'colInexistente', label: 'Inexistente' },
    ];

    const sparseData = [
      { id: '1', colA: null, colB: undefined },
      { id: '2' }, // todas as colunas ausentes
      { id: '3', colA: 'Presente' },
    ];

    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: sparseData,
          columns,
        })
      );
      assert.ok(html.includes('Presente'));
      assert.ok(html.includes('Exibindo 3 de 3 registros'));
    });
  });

  it('Suporta modo compacto (dense=true) com padding reduzido', () => {
    const normalHtml = renderToStaticMarkup(
      React.createElement(DataTable, {
        data: [{ id: '1', col: 'Normal' }],
        columns: [{ key: 'col', label: 'Col' }],
        dense: false,
      })
    );
    assert.ok(normalHtml.includes('px-4 py-2.5 text-sm'));

    const denseHtml = renderToStaticMarkup(
      React.createElement(DataTable, {
        data: [{ id: '1', col: 'Denso' }],
        columns: [{ key: 'col', label: 'Col' }],
        dense: true,
      })
    );
    assert.ok(denseHtml.includes('px-2.5 py-1 text-xs'));
  });

  it('Empírico: Filtro de busca com caracteres de regex não quebra', () => {
    const data = [
      { id: '1', nome: 'Arquivo (Versão 1.0).xml', desc: 'Preço: $100 [teste]' },
      { id: '2', nome: 'Outro Arquivo', desc: 'Café & Açúcar' },
    ];

    const hostilTerms = [
      '.*',
      '[0-9]+',
      '(foo|bar)',
      '\\d',
      '^inicio',
      '$fim',
      '?',
      '+',
      '{1,3}',
      '$$$',
    ];

    for (const term of hostilTerms) {
      assert.doesNotThrow(() => {
        const cleanTerm = term.toLowerCase().trim();
        const filtered = data.filter((item) => {
          if (!item || typeof item !== 'object') return false;
          return Object.values(item).some((val) => {
            if (val === null || val === undefined) return false;
            return String(val).toLowerCase().includes(cleanTerm);
          });
        });
        assert.ok(Array.isArray(filtered));
      }, `Falha ao filtrar termo: ${term}`);
    }
  });

  it('Vulnerabilidade Detectada: Comportamento ao receber data={null}', () => {
    // Testamos se renderizar com data={null} quebra em data.length no tfoot
    let threwError = false;
    let errorMessage = '';
    try {
      renderToStaticMarkup(
        React.createElement(DataTable, {
          data: null,
          columns: [{ key: 'col', label: 'Col' }],
        })
      );
    } catch (err) {
      threwError = true;
      errorMessage = err.message;
    }

    // Resolução M2: DataTable agora é resiliente a data={null} graças a safeData
    assert.strictEqual(
      threwError,
      false,
      'DataTable não deve lançar exceção ao receber data={null}'
    );
  });
});

// ============================================================================
// SUITE 5: mockInvoices.js — Auditoria Matemática e Consistência de Dados
// ============================================================================
describe('Adversarial Challenger: mockInvoices.js Mathematical Audit Suite', async () => {
  const mockPath = resolve(ROOT_DIR, 'app/lib/data/mockInvoices.js');
  assert.ok(existsSync(mockPath), 'mockInvoices.js deve existir');
  const {
    MOCK_INVOICES,
    MOCK_PREPARED_INVOICES,
    getMockInvoices,
    getMockInvoiceById,
    getDashboardKPIs,
  } = await import(pathToFileURL(mockPath).href);

  it('Auditoria Matemática: Cenário 1 (demo-01, 8 itens)', () => {
    const d1 = MOCK_INVOICES.find((i) => i.id === 'demo-01');
    assert.ok(d1, 'demo-01 deve existir');

    let sumProdutos = 0;
    for (const item of d1.itens) {
      const qtd = parseFloat(item.quantidade);
      const unit = parseFloat(item.valorUnitario);
      const total = parseFloat(item.valorTotal);
      const calcTotal = qtd * unit;

      // Tolerância de centavos devido a frações unitárias (ex: 686.6667)
      const diff = Math.abs(calcTotal - total);
      assert.ok(
        diff < 0.05,
        `Item ${item.codigo}: Qtd (${qtd}) * Unit (${unit}) = ${calcTotal.toFixed(2)}, mas gravado ${total}`
      );
      sumProdutos += total;
    }

    const valorProdutos = parseFloat(d1.totais.valorProdutos);
    assert.strictEqual(
      sumProdutos.toFixed(2),
      valorProdutos.toFixed(2),
      'Soma dos itens de demo-01 deve coincidir com totais.valorProdutos'
    );

    const totalNotaCalc =
      valorProdutos +
      parseFloat(d1.totais.valorFrete || '0') +
      parseFloat(d1.totais.valorSeguro || '0') +
      parseFloat(d1.totais.outrasDespesas || '0') -
      parseFloat(d1.totais.valorDesconto || '0');

    assert.strictEqual(
      totalNotaCalc.toFixed(2),
      parseFloat(d1.totais.valorTotalNota).toFixed(2),
      'Cálculo do total da nota demo-01 deve ser consistente'
    );
  });

  it('Auditoria Matemática: Cenário 2 (demo-02, 25 itens metalmecânicos)', () => {
    const d2 = MOCK_INVOICES.find((i) => i.id === 'demo-02');
    assert.ok(d2, 'demo-02 deve existir');
    assert.strictEqual(d2.itens.length, 25);

    let sumProdutos = 0;
    let unitQtyMismatches = 0;

    for (const item of d2.itens) {
      const qtd = parseFloat(item.quantidade);
      const unit = parseFloat(item.valorUnitario);
      const total = parseFloat(item.valorTotal);
      const calcTotal = qtd * unit;

      if (Math.abs(calcTotal - total) > 0.01) {
        unitQtyMismatches++;
      }
      sumProdutos += total;
    }

    // Resolução M2: Preços de demo-02 foram calibrados de forma simétrica garantindo unit * qtd = total
    assert.strictEqual(
      unitQtyMismatches,
      0,
      'Todos os 25 itens de demo-02 possuem integridade matemática exata entre unitário e total'
    );

    // O total da nota 25 * 5950 = 148750.00 está consistente com a soma dos totais individuais:
    const valorProdutos = parseFloat(d2.totais.valorProdutos);
    assert.strictEqual(
      sumProdutos.toFixed(2),
      valorProdutos.toFixed(2),
      'Soma de valorTotal dos 25 itens coincide perfeitamente com valorProdutos'
    );
    assert.strictEqual(
      parseFloat(d2.totais.valorTotalNota).toFixed(2),
      valorProdutos.toFixed(2),
      'Total da nota demo-02 coincide com valor dos produtos'
    );
  });

  it('Auditoria Matemática: Cenário 3 (demo-03, 50 itens de autopeças)', () => {
    const d3 = MOCK_INVOICES.find((i) => i.id === 'demo-03');
    assert.ok(d3, 'demo-03 deve existir');
    assert.strictEqual(d3.itens.length, 50);

    let sumProdutos = 0;
    for (const item of d3.itens) {
      const qtd = parseFloat(item.quantidade);
      const unit = parseFloat(item.valorUnitario);
      const total = parseFloat(item.valorTotal);
      const calcTotal = qtd * unit;

      assert.strictEqual(
        calcTotal.toFixed(2),
        total.toFixed(2),
        `Item ${item.codigo}: cálculo Qtd * Unit coincide exatamente`
      );
      sumProdutos += total;
    }

    const valorProdutos = parseFloat(d3.totais.valorProdutos);
    assert.strictEqual(
      sumProdutos.toFixed(2),
      valorProdutos.toFixed(2),
      'Soma dos 50 itens coincide exatamente com valorProdutos (625800.00)'
    );
  });

  it('Auditoria Matemática: Cenário 4 (demo-04, inconsistências simuladas)', () => {
    const d4 = MOCK_INVOICES.find((i) => i.id === 'demo-04');
    assert.ok(d4, 'demo-04 deve existir');
    assert.strictEqual(d4.itens.length, 12);

    // Verifica que inconsistência matemática no item 5 foi documentada
    const item5 = d4.itens.find((i) => i.id === 'd4-5');
    assert.ok(item5, 'Item d4-5 deve existir');
    assert.strictEqual(item5.situacao, 'inconsistente');
    assert.strictEqual(item5.quantidade, '100.0000');
    assert.strictEqual(item5.valorUnitario, '45.0000');
    assert.strictEqual(item5.valorTotal, '4000.00'); // Divergência deliberada: 100 * 45 = 4500 != 4000
    assert.ok(item5.inconsistencias.length > 0);

    // Soma dos itens gravados = 91300.00 vs valorProdutos = 89300.00
    const sumItens = d4.itens.reduce((acc, it) => acc + parseFloat(it.valorTotal), 0);
    assert.strictEqual(sumItens, 91300);
    assert.strictEqual(parseFloat(d4.totais.valorProdutos), 89300);
    assert.strictEqual(d4.status, 'com_inconsistencias');
  });

  it('Auditoria Matemática: Cenário 5 (demo-05, 15 itens em lotes)', () => {
    const d5 = MOCK_INVOICES.find((i) => i.id === 'demo-05');
    assert.ok(d5, 'demo-05 deve existir');
    assert.strictEqual(d5.itens.length, 15);

    // Resolução M2: Item 15 calibrado: 74 * 380 = 28120.00
    const item15 = d5.itens.find((i) => i.id === 'd5-15');
    assert.strictEqual(item15.valorTotal, '28120.00');
    const calc15 = parseFloat(item15.quantidade) * parseFloat(item15.valorUnitario);
    assert.strictEqual(calc15, 28120);

    // Verifica divisão das notas preparadas
    const preps = MOCK_PREPARED_INVOICES.filter((p) => p.parentInvoiceId === 'demo-05');
    assert.strictEqual(preps.length, 2);
    const sumPrep = preps.reduce((acc, p) => acc + parseFloat(p.valorTotalNota), 0);
    assert.strictEqual(
      sumPrep.toFixed(2),
      '342000.00',
      'Soma das notas preparadas coincide exatamente com o total da nota demo-05 (342000.00)'
    );
  });

  it('Auditoria dos KPIs do Dashboard', () => {
    const kpis = getDashboardKPIs();

    assert.strictEqual(kpis.totalNotas, 5, 'Total de notas deve ser 5');
    assert.strictEqual(
      kpis.totalProdutos,
      8 + 25 + 50 + 12 + 15,
      'Total de produtos somados deve ser 110'
    );
    assert.strictEqual(
      kpis.aguardandoValidacao,
      2, // demo-01 (em_conferencia) e demo-04 (com_inconsistencias)
      'Notas aguardando validação deve ser 2'
    );
    assert.strictEqual(kpis.notasPreparadas, 2, 'Notas preparadas deve ser 2');

    // Valor total demonstrado: soma de valorTotalNota dos 5 cenários
    const expectedTotal =
      291200.0 + 148750.0 + 625800.0 + 89300.0 + 342000.0;
    assert.strictEqual(
      kpis.valorTotalDemonstrado,
      expectedTotal,
      `Valor total demonstrado deve ser ${expectedTotal}`
    );
  });
});
