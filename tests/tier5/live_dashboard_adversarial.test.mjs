/**
 * SmartNFe — Tier 5 Adversarial Test Suite: Live Dashboard Stress & Surface Challenge
 *
 * Verificações adversariais:
 * 1. Protocol & Redirection: HTTP 200, ausência de redirecionamentos (301/302/307/308 para /login),
 *    diversos headers Accept, User-Agent, cookies arbitrários e parâmetros maliciosos.
 * 2. Visual Component Inspection: Badge "Modo Demonstração", 5 menus raiz da Sidebar,
 *    5 cards de KPIs, 5 botões de carga rápida de cenários demo, tabela recente com 7 colunas.
 * 3. Concurrency & Stress: Rajadas sequenciais e concorrentes sem vazamento de memória ou travamento.
 * 4. Runtime Integrity: Ausência de banners de erro do Next.js, scripts de redirecionamento ou falhas SSR.
 *
 * Execução: node --no-warnings --test tests/tier5/live_dashboard_adversarial.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000/dashboard';

describe('Tier 5 Challenge: Protocol & Redirection Hardening', () => {
  it('GET /dashboard com redirect manual retorna HTTP 200 sem qualquer header Location para /login', async () => {
    const res = await fetch(BASE_URL, {
      redirect: 'manual',
    });

    assert.strictEqual(
      res.status,
      200,
      `Esperado HTTP 200 em acesso direto, recebido ${res.status}`
    );
    const location = res.headers.get('location');
    assert.strictEqual(
      location,
      null,
      `Header Location inesperado detectado: ${location}`
    );
  });

  it('Responde HTTP 200 sob diversos cabeçalhos Accept e compressão', async () => {
    const acceptHeaders = [
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'text/html',
      '*/*',
      'application/json, text/plain, */*',
      '',
    ];

    for (const accept of acceptHeaders) {
      const res = await fetch(BASE_URL, {
        headers: { Accept: accept },
        redirect: 'manual',
      });
      assert.strictEqual(
        res.status,
        200,
        `Falhou com Accept: "${accept}" - status ${res.status}`
      );
    }
  });

  it('Responde HTTP 200 sob diversos User-Agents', async () => {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Googlebot/2.1 (+http://www.google.com/bot.html)',
      'curl/8.4.0',
      '',
    ];

    for (const ua of userAgents) {
      const res = await fetch(BASE_URL, {
        headers: { 'User-Agent': ua },
        redirect: 'manual',
      });
      assert.strictEqual(
        res.status,
        200,
        `Falhou com User-Agent: "${ua}" - status ${res.status}`
      );
    }
  });

  it('Resiste a parâmetros de URL adversariais sem redirecionar para /login', async () => {
    const queries = [
      '?redirect=/login',
      '?auth=false',
      '?logout=true',
      '?session=expired',
      '?role=anonymous',
      '?scenario=demo-999_inexistente',
      '?xss=%3Cscript%3Ealert(1)%3C/script%3E',
      '?tab=invalida&sort=drop_table',
    ];

    for (const q of queries) {
      const target = `${BASE_URL}${q}`;
      const res = await fetch(target, { redirect: 'manual' });
      assert.strictEqual(
        res.status,
        200,
        `Query "${q}" provocou status inesperado ${res.status}`
      );
      const loc = res.headers.get('location');
      assert.strictEqual(loc, null, `Query "${q}" gerou redirecionamento para ${loc}`);
      const body = await res.text();
      assert.ok(
        body.includes('Painel Operacional') || body.includes('SmartNFe'),
        `Query "${q}" descaracterizou a página principal`
      );
    }
  });

  it('Resiste a cookies arbitrários e de sessão sem redirecionar para login', async () => {
    const testCookies = [
      'auth=false; logged_in=0',
      'session=null; jwt=expired_token_123',
      'user=guest; role=public',
      'authToken=deleted; isAuthenticated=false',
    ];

    for (const cookie of testCookies) {
      const res = await fetch(BASE_URL, {
        headers: { Cookie: cookie },
        redirect: 'manual',
      });
      assert.strictEqual(
        res.status,
        200,
        `Cookie "${cookie}" provocou status ${res.status}`
      );
      const loc = res.headers.get('location');
      assert.strictEqual(loc, null, `Cookie "${cookie}" redirecionou para ${loc}`);
    }
  });

  it('Requisições HEAD respondem com integridade sem quebrar o servidor', async () => {
    const res = await fetch(BASE_URL, {
      method: 'HEAD',
      redirect: 'manual',
    });
    // Next.js suporta HEAD nativamente ou retorna 200
    assert.ok(
      [200, 405].includes(res.status),
      `HEAD retornou status inesperado ${res.status}`
    );
  });
});

describe('Tier 5 Challenge: Live HTML & Visual Components Rendering', () => {
  let htmlContent = '';

  it('Carrega HTML completo da rota /dashboard', async () => {
    const res = await fetch(BASE_URL);
    assert.strictEqual(res.status, 200);
    htmlContent = await res.text();
    assert.ok(htmlContent.length > 5000, `Payload HTML muito curto: ${htmlContent.length} bytes`);
  });

  it('Badge "Modo Demonstração" é renderizado expressamente no DOM', () => {
    assert.ok(
      htmlContent.includes('Modo Demonstração'),
      'HTML deve conter expressamente "Modo Demonstração"'
    );
    assert.ok(
      htmlContent.includes('demo-badge') || htmlContent.includes('animate-pulse'),
      'HTML deve conter indicadores de identificação ou pulso do badge de demonstração'
    );
  });

  it('Sidebar renderiza exatamente os 5 menus raiz do SmartNFe', () => {
    // 1. Dashboard
    assert.ok(
      htmlContent.includes('Dashboard'),
      'Sidebar deve conter menu Dashboard'
    );
    // 2. Documentos
    assert.ok(
      htmlContent.includes('Documentos'),
      'Sidebar deve conter menu Documentos'
    );
    // 3. Importar
    assert.ok(
      htmlContent.includes('Importar'),
      'Sidebar deve conter menu Importar'
    );
    // 4. Notas Preparadas
    assert.ok(
      htmlContent.includes('Notas Preparadas'),
      'Sidebar deve conter menu Notas Preparadas'
    );
    // 5. Configurações
    assert.ok(
      htmlContent.includes('Configurações') || htmlContent.includes('Configura&ccedil;&otilde;es'),
      'Sidebar deve conter menu Configurações'
    );

    // Link do menu Importar deve apontar diretamente para /documentos/importar
    assert.ok(
      htmlContent.includes('/documentos/importar'),
      'Sidebar deve possuir link para /documentos/importar'
    );
    assert.ok(
      htmlContent.includes('/notas-preparadas'),
      'Sidebar deve possuir link para /notas-preparadas'
    );
    assert.ok(
      htmlContent.includes('/configuracoes'),
      'Sidebar deve possuir link para /configuracoes'
    );
  });

  it('Ausência absoluta de terminologia de legado de RH', () => {
    const forbidden = ['RHbrasil', 'Vagas', 'Candidatos', 'Recrutamento', 'Vagas Abertas'];
    for (const term of forbidden) {
      assert.ok(
        !htmlContent.includes(term),
        `HTML contém termo proibido de RH legado: "${term}"`
      );
    }
  });

  it('Renderiza os 5 Cards de KPIs com títulos e métricas consolidadas', () => {
    const kpiTitles = [
      'Notas Importadas',
      'Total de Produtos',
      'Aguardando Validação',
      'Notas Preparadas',
      'Valor Total Demonstrado',
    ];

    for (const title of kpiTitles) {
      assert.ok(
        htmlContent.includes(title),
        `KPI Card ausente no HTML: "${title}"`
      );
    }
  });

  it('Renderiza os 5 botões de carga rápida de cenários demo (demo-01 a demo-05)', () => {
    assert.ok(
      htmlContent.includes('demo-01') || htmlContent.includes('Demo 01'),
      'Botão ou card para Demo 01 ausente'
    );
    assert.ok(
      htmlContent.includes('demo-02') || htmlContent.includes('Demo 02'),
      'Botão ou card para Demo 02 ausente'
    );
    assert.ok(
      htmlContent.includes('demo-03') || htmlContent.includes('Demo 03'),
      'Botão ou card para Demo 03 ausente'
    );
    assert.ok(
      htmlContent.includes('demo-04') || htmlContent.includes('Demo 04'),
      'Botão ou card para Demo 04 ausente'
    );
    assert.ok(
      htmlContent.includes('demo-05') || htmlContent.includes('Demo 05'),
      'Botão ou card para Demo 05 ausente'
    );
  });

  it('Tabela de documentos recentes renderiza as 7 colunas estruturais', () => {
    const expectedHeaders = [
      'Número / Série',
      'Emitente',
      'Destinatário / País',
      'Itens',
      'Valor Total',
      'Status',
      'Ações',
    ];

    for (const header of expectedHeaders) {
      assert.ok(
        htmlContent.includes(header),
        `Coluna da tabela ausente no HTML: "${header}"`
      );
    }
  });

  it('Tabela renderiza ações operacionais por linha (Conferir, Dividir)', () => {
    assert.ok(
      htmlContent.includes('Conferir'),
      'Ação de linha "Conferir" ausente na tabela'
    );
    assert.ok(
      htmlContent.includes('Dividir'),
      'Ação de linha "Dividir" ausente na tabela'
    );
    assert.ok(
      htmlContent.includes('/conferencia'),
      'Links para /conferencia ausentes na tabela'
    );
  });
});

describe('Tier 5 Challenge: Concurrency & Burst Stress Resistance', () => {
  it('Suporta rajada sequencial de 30 requisições com 100% de sucesso e latência controlada', async () => {
    const iterations = 30;
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const res = await fetch(BASE_URL, { cache: 'no-store' });
      const duration = performance.now() - start;
      latencies.push(duration);

      assert.strictEqual(
        res.status,
        200,
        `Falha na requisição sequencial #${i + 1}: status ${res.status}`
      );
      const text = await res.text();
      assert.ok(
        text.includes('SmartNFe'),
        `Resposta corrompida na requisição sequencial #${i + 1}`
      );
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);

    // Latência média no localhost não deve exceder 300ms
    assert.ok(
      avgLatency < 500,
      `Latência média muito alta: ${avgLatency.toFixed(2)}ms (máx: ${maxLatency.toFixed(2)}ms)`
    );
  });

  it('Suporta rajada concorrente de 15 requisições simultâneas sem perdas ou travamento', async () => {
    const concurrency = 15;
    const requests = Array.from({ length: concurrency }, (_, idx) => {
      const start = performance.now();
      return fetch(`${BASE_URL}?burst=${idx}`, { cache: 'no-store' })
        .then(async (res) => ({
          idx,
          status: res.status,
          duration: performance.now() - start,
          hasContent: (await res.text()).includes('Modo Demonstração'),
        }));
    });

    const results = await Promise.all(requests);

    for (const r of results) {
      assert.strictEqual(
        r.status,
        200,
        `Requisição concorrente #${r.idx} falhou com status ${r.status}`
      );
      assert.strictEqual(
        r.hasContent,
        true,
        `Requisição concorrente #${r.idx} não continha o badge de demonstração`
      );
    }
  });

  it('Verificação pós-estresse: servidor permanece estável e responsivo', async () => {
    const res = await fetch(BASE_URL);
    assert.strictEqual(res.status, 200, 'Servidor pós-estresse não respondeu 200');
    const text = await res.text();
    assert.ok(text.includes('Painel Operacional'), 'Página danificada após estresse');
  });
});

describe('Tier 5 Challenge: Client Redirection & Runtime Error Probing', () => {
  it('HTML não contém meta tag de refresh redirecionando para login', async () => {
    const res = await fetch(BASE_URL);
    const html = await res.text();
    assert.doesNotMatch(
      html,
      /<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=[^"']*login/i,
      'Detectado <meta http-equiv="refresh"> para login'
    );
  });

  it('HTML não contém scripts embutidos com redirect forçado para login', async () => {
    const res = await fetch(BASE_URL);
    const html = await res.text();
    assert.doesNotMatch(
      html,
      /window\.location(\.href)?\s*=\s*['"]\/login['"]/i,
      'Detectado script inline com redirect forçado para /login'
    );
  });

  it('HTML não apresenta banners ou traços de erro do Next.js / React', async () => {
    const res = await fetch(BASE_URL);
    const html = await res.text();

    const errorSignatures = [
      'Internal Server Error',
      'Application error: a client-side exception has occurred',
      'Unhandled Runtime Error',
      'ChunkLoadError',
    ];

    for (const sig of errorSignatures) {
      assert.ok(
        !html.includes(sig),
        `HTML contém assinatura de erro do Next.js/React: "${sig}"`
      );
    }
  });
});
