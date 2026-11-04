/**
 * SmartNFe — Tier 1 Test Suite: Milestone 1 Foundation & Dashboard
 *
 * Verificações cobertas:
 * - R1: Menus da Sidebar (Dashboard, Documentos, Importar, Notas Preparadas, Configurações)
 * - R1: DemoBadge ("Modo Demonstração" visível)
 * - R1: Componentes base (DataTable colunas explícitas, InputFile XML/PDF, Dialog sem effect setState)
 * - R2: Formatadores centrais (moeda BRL, datas nativas Intl sem moment, status)
 * - R2: Baseline de dados mockados (5 cenários: demo-01 a demo-05 com contagens exatas)
 * - R4: Live HTTP Smoke Check contra http://localhost:3000/dashboard
 *
 * Execução: node --test tests/tier1/m1_foundation.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT_DIR = process.cwd();

describe('M1 Foundation: Layout & Shell', () => {
  it('Sidebar contém exatamente os 5 menus do SmartNFe com Importar na raiz', () => {
    const sidebarPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeSidebar.jsx');
    assert.ok(existsSync(sidebarPath), 'SmartNFeSidebar.jsx deve existir');
    const content = readFileSync(sidebarPath, 'utf-8');

    // Menus obrigatórios
    assert.match(content, /Dashboard/i, 'Deve conter menu Dashboard');
    assert.match(content, /Documentos/i, 'Deve conter menu Documentos');
    assert.match(content, /Importar/i, 'Deve conter menu Importar');
    assert.match(content, /Notas Preparadas/i, 'Deve conter menu Notas Preparadas');
    assert.match(content, /Configurações/i, 'Deve conter menu Configurações');

    // Importar na raiz apontando para /documentos/importar
    assert.match(content, /\/documentos\/importar/, 'Menu Importar deve apontar para /documentos/importar');

    // Ausência absoluta de menus e termos legados de RH
    assert.doesNotMatch(content, /RHbrasil/i, 'Não deve conter RHbrasil');
    assert.doesNotMatch(content, /Candidatos/i, 'Não deve conter Candidatos');
    assert.doesNotMatch(content, /Vagas/i, 'Não deve conter Vagas');
    assert.doesNotMatch(content, /Recrutamento/i, 'Não deve conter Recrutamento');
  });

  it('DemoBadge exibe expressamente "Modo Demonstração"', () => {
    const badgePath = resolve(ROOT_DIR, 'app/components/Layouts/DemoBadge.jsx');
    assert.ok(existsSync(badgePath), 'DemoBadge.jsx deve existir');
    const content = readFileSync(badgePath, 'utf-8');

    assert.match(
      content,
      /Modo Demonstração/,
      'DemoBadge deve conter expressamente "Modo Demonstração"'
    );
  });
});

describe('M1 Foundation: Componentes Base Adaptados', () => {
  it('DataTable suporta colunas explícitas, callback render e modo denso', () => {
    const dtPath = resolve(ROOT_DIR, 'app/components/table/DataTable.jsx');
    assert.ok(existsSync(dtPath), 'DataTable.jsx deve existir');
    const content = readFileSync(dtPath, 'utf-8');

    assert.match(content, /columns/, 'Deve aceitar prop columns');
    assert.match(content, /render/, 'Deve suportar função render para células');
    assert.match(content, /dense/, 'Deve suportar prop dense');

    // Integridade de renderização limpa no React
    assert.doesNotMatch(
      content,
      /setThead\(/,
      'Não deve guardar thead JSX em useState'
    );
    assert.doesNotMatch(
      content,
      /setTableBody\(/,
      'Não deve guardar tableBody JSX em useState'
    );
  });

  it('InputFile suporta .xml e .pdf, limite de 10MB, botão de remoção e toast.error', () => {
    const inputFilePath = resolve(ROOT_DIR, 'app/components/inputs/InputFile.jsx');
    assert.ok(existsSync(inputFilePath), 'InputFile.jsx deve existir');
    const content = readFileSync(inputFilePath, 'utf-8');

    assert.match(content, /\.xml/, 'Deve aceitar arquivos .xml');
    assert.match(content, /\.pdf/, 'Deve aceitar arquivos .pdf');
    assert.match(content, /10/, 'Deve limitar o tamanho a 10MB');
    assert.match(content, /clearFile|Remover/, 'Deve prover botão de limpar/remover arquivo');
    assert.match(content, /toast\.error/, 'Deve emitir toast.error na rejeição');
  });

  it('Dialog elimina setState síncrono dentro de useEffect', () => {
    const dialogPath = resolve(ROOT_DIR, 'app/components/Layouts/Dialog.jsx');
    assert.ok(existsSync(dialogPath), 'Dialog.jsx deve existir');
    const content = readFileSync(dialogPath, 'utf-8');

    assert.match(content, /confirmActionCallback/, 'Deve suportar confirmActionCallback');
    // Validação estrita da ausência do setState síncrono no effect
    assert.doesNotMatch(
      content,
      /useEffect\(\s*\(\)\s*=>\s*\{\s*setDescription\(/,
      'Não deve chamar setDescription síncrono dentro de useEffect'
    );
  });
});

describe('M1 Foundation: Formatadores Centrais', () => {
  it('currency.js formata valores monetários em padrão BRL', async () => {
    const currencyPath = resolve(ROOT_DIR, 'app/lib/formatters/currency.js');
    assert.ok(existsSync(currencyPath), 'app/lib/formatters/currency.js deve existir');

    const { formatBRL, parseBRL } = await import(pathToFileURL(currencyPath).href);

    const formatted = formatBRL(1250.5);
    assert.ok(
      formatted.includes('1.250,50'),
      `Esperado "1.250,50", recebido: "${formatted}"`
    );
    assert.ok(
      formatted.includes('R$'),
      `Esperado prefixo "R$", recebido: "${formatted}"`
    );

    assert.ok(formatBRL(0).includes('0,00'));
    assert.ok(formatBRL(null).includes('0,00'));

    if (typeof parseBRL === 'function') {
      const parsed = parseBRL('R$ 1.250,50');
      assert.strictEqual(parsed, 1250.5);
    }
  });

  it('dates.js utiliza Intl nativo e NÃO importa moment.js', async () => {
    const datesPath = resolve(ROOT_DIR, 'app/lib/formatters/dates.js');
    assert.ok(existsSync(datesPath), 'app/lib/formatters/dates.js deve existir');

    const fileContent = readFileSync(datesPath, 'utf-8');
    assert.doesNotMatch(
      fileContent,
      /import.*moment|require\(.*moment/,
      'Não deve importar moment.js'
    );

    const { formatDateBR } = await import(pathToFileURL(datesPath).href);
    const result = formatDateBR('2026-11-04');
    assert.strictEqual(result, '04/11/2026');
  });

  it('status.js mapeia rótulos e classes visuais dos status fiscais', async () => {
    const statusPath = resolve(ROOT_DIR, 'app/lib/formatters/status.js');
    assert.ok(existsSync(statusPath), 'app/lib/formatters/status.js deve existir');

    const { getStatusLabel, getStatusBadgeClass } = await import(pathToFileURL(statusPath).href);

    assert.strictEqual(getStatusLabel('pendente'), 'Pendente');
    assert.strictEqual(getStatusLabel('conferido'), 'Conferido');
    assert.ok(typeof getStatusBadgeClass('pendente') === 'string');
    assert.ok(typeof getStatusBadgeClass('conferido') === 'string');
  });
});

describe('M1 Foundation: Baseline de Dados Mockados', () => {
  it('mockInvoices.js disponibiliza os 5 cenários com itens e campos obrigatórios', async () => {
    const mockPath = resolve(ROOT_DIR, 'app/lib/data/mockInvoices.js');
    assert.ok(existsSync(mockPath), 'app/lib/data/mockInvoices.js deve existir');

    const { MOCK_INVOICES } = await import(pathToFileURL(mockPath).href);

    assert.ok(Array.isArray(MOCK_INVOICES), 'MOCK_INVOICES deve ser um array');
    assert.strictEqual(MOCK_INVOICES.length, 5, 'Deve conter exatamente 5 cenários');

    const d1 = MOCK_INVOICES.find((i) => i.id === 'demo-01');
    const d2 = MOCK_INVOICES.find((i) => i.id === 'demo-02');
    const d3 = MOCK_INVOICES.find((i) => i.id === 'demo-03');
    const d4 = MOCK_INVOICES.find((i) => i.id === 'demo-04');
    const d5 = MOCK_INVOICES.find((i) => i.id === 'demo-05');

    assert.ok(d1 && d1.itens.length === 8, 'demo-01 deve conter 8 itens');
    assert.ok(d2 && d2.itens.length === 25, 'demo-02 deve conter 25 itens');
    assert.ok(d3 && d3.itens.length === 50, 'demo-03 deve conter 50 itens');
    assert.ok(d4 && d4.itens.length >= 10, 'demo-04 deve conter itens com inconsistências');
    assert.ok(d5 && d5.itens.length === 15, 'demo-05 deve conter 15 itens');

    const camposObrigatorios = ['id', 'numero', 'serie', 'emissao', 'destinatario', 'itens', 'totais', 'status'];
    for (const campo of camposObrigatorios) {
      assert.ok(campo in d1, `demo-01 não possui o campo: ${campo}`);
    }
  });
});

describe('M1 Foundation: Live HTTP Smoke Check', () => {
  it('GET http://localhost:3000/dashboard responde HTTP 200 com título SmartNFe', async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('http://localhost:3000/dashboard', {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      assert.strictEqual(response.status, 200, 'HTTP status deve ser 200');

      const html = await response.text();
      assert.ok(html.includes('SmartNFe'), 'HTML deve conter "SmartNFe"');
      assert.doesNotMatch(
        html,
        /<meta[^>]*http-equiv=["']refresh["'][^>]*login/i,
        'Não deve realizar redirecionamento para login'
      );
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        assert.fail('Timeout de 5000ms atingido ao conectar em http://localhost:3000/dashboard');
      }
      throw err;
    }
  });
});
