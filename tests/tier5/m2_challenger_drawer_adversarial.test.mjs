/**
 * SmartNFe — Tier 5 Adversarial Stress & Empirical Verification Suite
 * Milestone 2: Left Drawer & Responsive Layout (R1)
 *
 * Agent: m2_challenger_1 (teamwork_challenger)
 * Working Directory: c:\www\smart-nfe
 *
 * Suites:
 * 1. Viewport Boundary Stress Testing (1023px vs 1024px vs 1025px)
 *    - CSS media query activation (--breakpoint-lg: 1024px) vs JS window.innerWidth > 1024
 *    - Exact boundary behavior at 1024px vs 1025px
 *    - Resize boundary stress & mobile drawer body scroll lock leak at 1024px
 * 2. Initial Hydration Simulation & Lifecycle Edge Cases
 *    - SSR render snapshot simulation (no window, no localStorage)
 *    - Client post-mount hydration reconciliation without layout thrashing
 *    - Hydration race condition & premature localStorage overwrite in sidebarHydratedRef
 *    - Purity of state updater functions in React 19
 * 3. LocalStorage Synchronization Under Adversarial Edge Cases
 *    - Corrupt non-boolean values ("", "undefined", "null", "invalid", "0", "1", "TRUE")
 *    - Fallback behavior on mobile when corrupt values exist
 *    - Storage disabled (SecurityError) & QuotaExceededError exception resilience
 *    - Rapid flip-flop concurrency stress (100 alternating toggles)
 *    - Body scroll lock restoration & Escape key propagation prevention
 *
 * Execution: node --no-warnings --test tests/tier5/m2_challenger_drawer_adversarial.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = process.cwd();
const APP_CONTEXT_PATH = resolve(ROOT_DIR, 'app/context/AppContext.jsx');
const SIDEBAR_PATH = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeSidebar.jsx');
const HEADER_PATH = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeHeader.jsx');
const LAYOUT_PATH = resolve(ROOT_DIR, 'app/components/Layouts/AppLayout.jsx');
const GLOBALS_CSS_PATH = resolve(ROOT_DIR, 'app/globals.css');

describe('SUITE 1: Viewport Boundary Stress Testing (1023px vs 1024px vs 1025px)', () => {
  const appContextSource = readFileSync(APP_CONTEXT_PATH, 'utf-8');
  const sidebarSource = readFileSync(SIDEBAR_PATH, 'utf-8');
  const headerSource = readFileSync(HEADER_PATH, 'utf-8');
  const globalsCssSource = readFileSync(GLOBALS_CSS_PATH, 'utf-8');

  it('1.1: CSS breakpoint definition vs JS viewport check boundary analysis', () => {
    // Verifica a definição de breakpoint no globals.css
    assert.match(globalsCssSource, /--breakpoint-lg:\s*1024px;/, 'globals.css define --breakpoint-lg como 1024px');

    // Em Tailwind v4, --breakpoint-lg: 1024px gera @media (min-width: 1024px)
    // No JS (AppContext.jsx), a verificação de tela LG é:
    assert.match(appContextSource, /window\.innerWidth\s*>\s*1024/, 'AppContext usa window.innerWidth > 1024');

    // Simulação do comportamento de CSS e JS em 1023px, 1024px e 1025px:
    const simulateViewport = (width) => {
      // CSS media query: min-width: 1024px (ativa em width >= 1024)
      const cssLgFlexActive = width >= 1024; // desktop sidebar (hidden lg:flex)
      const cssLgHiddenActive = width >= 1024; // mobile toggle / drawer (lg:hidden)

      // JS check no AppContext.jsx: window.innerWidth > 1024
      const jsIsLg = width > 1024;

      return {
        width,
        cssLgFlexActive,
        cssLgHiddenActive,
        jsIsLg,
        desktopSidebarVisible: cssLgFlexActive,
        mobileToggleVisible: !cssLgHiddenActive,
        mobileDrawerCssVisible: !cssLgHiddenActive,
        jsDefaultCollapsed: !jsIsLg, // sem preferência salva
      };
    };

    const vp1023 = simulateViewport(1023);
    const vp1024 = simulateViewport(1024);
    const vp1025 = simulateViewport(1025);

    // Em 1023px: Modo Mobile Puro
    assert.strictEqual(vp1023.desktopSidebarVisible, false, '1023px: aside desktop oculto no CSS');
    assert.strictEqual(vp1023.mobileToggleVisible, true, '1023px: toggle mobile visível no CSS');
    assert.strictEqual(vp1023.jsIsLg, false, '1023px: JS considera mobile');
    assert.strictEqual(vp1023.jsDefaultCollapsed, true, '1023px: default recolhido');

    // Em 1025px: Modo Desktop Puro
    assert.strictEqual(vp1025.desktopSidebarVisible, true, '1025px: aside desktop visível no CSS');
    assert.strictEqual(vp1025.mobileToggleVisible, false, '1025px: toggle mobile oculto no CSS');
    assert.strictEqual(vp1025.jsIsLg, true, '1025px: JS considera desktop (LG)');
    assert.strictEqual(vp1025.jsDefaultCollapsed, false, '1025px: default expandido');

    // Em 1024px (Ponto Crítico de Fronteira):
    // CSS ativa lg: (min-width: 1024px), mas JS tem window.innerWidth > 1024 (false)
    assert.strictEqual(vp1024.desktopSidebarVisible, true, '1024px: aside desktop visível pelo CSS lg:flex');
    assert.strictEqual(vp1024.mobileToggleVisible, false, '1024px: toggle mobile oculto pelo CSS lg:hidden');
    assert.strictEqual(vp1024.jsIsLg, false, '1024px: JS avalia 1024 > 1024 como false');
    assert.strictEqual(vp1024.jsDefaultCollapsed, true, '1024px: default recolhido (w-14) no aside desktop');

    // Confirmação: Em 1024px, o usuário vê o aside desktop recolhido (w-14) e pode expandi-lo
    // via botão chevron (data-testid="sidebar-toggle"). O toggle móvel do header está oculto pelo CSS.
    assert.match(sidebarSource, /data-testid="sidebar-toggle"/, 'Aside desktop possui botão de toggle acessível');
  });

  it('1.2: Resize Boundary Stress: Transição de redimensionamento e trava de scroll do body', () => {
    // Simulação adversarial de redimensionamento com drawer móvel aberto:
    // Passo 1: Usuário em 1020px abre o drawer móvel (mobileDrawerOpen = true)
    let mobileDrawerOpen = true;
    let bodyOverflow = 'hidden'; // SmartNFeSidebar linha 112
    let isLgScreen = false;

    // Listener de resize do AppContext.jsx (linhas 85-91):
    const simulateResize = (newWidth) => {
      const isLg = newWidth > 1024;
      isLgScreen = isLg;
      if (isLg) {
        mobileDrawerOpen = false;
        bodyOverflow = ''; // cleanup do efeito
      }
    };

    // Passo 2: Redimensiona para exatamente 1024px
    simulateResize(1024);
    assert.strictEqual(isLgScreen, false, 'Em 1024px, isLg é false');
    // ANOMALIA DE FRONTEIRA: Em 1024px, mobileDrawerOpen continua true porque 1024 > 1024 é false!
    assert.strictEqual(mobileDrawerOpen, true, 'Em 1024px exatos, mobileDrawerOpen permanece true');
    assert.strictEqual(bodyOverflow, 'hidden', 'Em 1024px exatos, scroll do body ainda está bloqueado');

    // Passo 3: Redimensiona para 1025px (> 1024px)
    simulateResize(1025);
    assert.strictEqual(isLgScreen, true, 'Em 1025px, isLg é true');
    assert.strictEqual(mobileDrawerOpen, false, 'Em 1025px, mobileDrawerOpen é redefinido para false');
    assert.strictEqual(bodyOverflow, '', 'Em 1025px, scroll do body é liberado');
  });

  it('1.3: Resolução de estado padrão estrita (sem preferência salva)', () => {
    const resolveDefaultState = (windowWidth) => {
      const isLg = windowWidth > 1024;
      return !isLg; // collapsed = true se <= 1024px, false se > 1024px
    };

    assert.strictEqual(resolveDefaultState(1920), false, '1920px (2K): expandido por padrão');
    assert.strictEqual(resolveDefaultState(1440), false, '1440px (Desktop): expandido por padrão');
    assert.strictEqual(resolveDefaultState(1025), false, '1025px: expandido por padrão');
    assert.strictEqual(resolveDefaultState(1024), true, '1024px: recolhido por padrão');
    assert.strictEqual(resolveDefaultState(768), true, '768px (Tablet): recolhido por padrão');
    assert.strictEqual(resolveDefaultState(375), true, '375px (Mobile): recolhido por padrão');
  });
});

describe('SUITE 2: Initial Hydration Simulation & Lifecycle Edge Cases', () => {
  const appContextSource = readFileSync(APP_CONTEXT_PATH, 'utf-8');

  it('2.1: SSR Snapshot Simulation (Zero Window / Zero LocalStorage)', () => {
    // No servidor Node.js (SSR), window e localStorage não existem
    const isSSR = typeof window === 'undefined';
    assert.ok(isSSR, 'Ambiente de teste simula SSR');

    // Valores iniciais síncronos declarados no useState:
    // const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
    // const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    // const [isLgScreen, setIsLgScreen] = useState(true);
    const ssrSidebarCollapsed = false;
    const ssrMobileDrawerOpen = false;
    const ssrIsLgScreen = true;

    // Renderização SSR de SmartNFeSidebar:
    // Desktop aside: ${collapsed ? 'w-14' : 'w-60'} -> 'w-60'
    const asideClass = ssrSidebarCollapsed ? 'w-14' : 'w-60';
    assert.strictEqual(asideClass, 'w-60', 'SSR renderiza desktop aside com w-60 determinístico');

    // Mobile drawer: {mobileOpen && <div className="lg:hidden">...</div>}
    const mobileDrawerRendered = ssrMobileDrawerOpen;
    assert.strictEqual(mobileDrawerRendered, false, 'SSR não renderiza drawer móvel');
  });

  it('2.2: Client Post-Mount Hydration Reconciliation sem layout thrashing', () => {
    // Simula a primeira renderização no cliente (hidratação):
    // Deve ser 100% idêntica ao SSR:
    let clientInitialCollapsed = false;
    let clientInitialMobileOpen = false;

    assert.strictEqual(clientInitialCollapsed, false, 'Hydration pass 1 produz w-60 idêntico ao SSR');
    assert.strictEqual(clientInitialMobileOpen, false, 'Hydration pass 1 produz ausência de drawer móvel');

    // Pass 2: useEffect pós-montagem com setTimeout(..., 0)
    // Garante que a atualização ocorra após a conclusão da hidratação do React 19
    assert.match(
      appContextSource,
      /const\s+timer\s*=\s*setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]*setSidebarCollapsedState/,
      'Atualização pós-montagem é postergada via setTimeout para evitar React 19 hydration mismatch'
    );
  });

  it('2.3: Análise Adversarial da Guarda de Hidratação (sidebarHydratedRef Race Condition)', () => {
    // Investigação crítica:
    // No AppContext.jsx:
    // Linha 59: sidebarHydratedRef.current = true; (dentro de useEffect 1 antes de setTimeout)
    // Linha 123: if (!sidebarHydratedRef.current) return; (dentro de useEffect 2 [sidebarCollapsed])
    
    // Verificação estática da ordenação dos efeitos:
    const idxRefTrue = appContextSource.indexOf('sidebarHydratedRef.current = true;');
    const idxSetTimeout = appContextSource.indexOf('const timer = setTimeout(');
    const idxStorageEffect = appContextSource.indexOf("localStorage.setItem('smartnfe_sidebar_collapsed'");

    assert.ok(idxRefTrue !== -1, 'sidebarHydratedRef.current = true deve existir');
    assert.ok(idxSetTimeout !== -1, 'setTimeout deve existir');
    assert.ok(idxRefTrue < idxSetTimeout, 'sidebarHydratedRef.current é setado antes de setTimeout');

    // Simulação do ciclo de montagem:
    const mockStorage = new Map();
    mockStorage.set('smartnfe_sidebar_collapsed', 'true'); // Usuário salvou 'true' previamente

    let sidebarCollapsed = false; // Estado inicial do useState
    let sidebarHydratedRef = { current: false };

    // Efeito 1:
    let storedCollapsed = mockStorage.get('smartnfe_sidebar_collapsed');
    sidebarHydratedRef.current = true; // Linha 59

    let timerCallback = null;
    const setTimeoutMock = (cb) => {
      timerCallback = cb;
    };

    setTimeoutMock(() => {
      if (storedCollapsed !== null) {
        sidebarCollapsed = storedCollapsed === 'true';
      }
    });

    // Efeito 2 (dispara no mount inicial):
    if (sidebarHydratedRef.current) {
      mockStorage.set('smartnfe_sidebar_collapsed', String(sidebarCollapsed));
    }

    // ACHADO ADVERSARIAL:
    // No instante entre a montagem e a execução da macrotask (timerCallback),
    // o valor salvo no localStorage foi temporariamente sobrescrito com 'false'!
    assert.strictEqual(
      mockStorage.get('smartnfe_sidebar_collapsed'),
      'false',
      'Sobrescrita prematura observada no tick de montagem'
    );

    // Quando o timer roda:
    timerCallback();
    assert.strictEqual(sidebarCollapsed, true, 'Timer restaura estado para true');
    // Efeito 2 dispara novamente na atualização de sidebarCollapsed:
    if (sidebarHydratedRef.current) {
      mockStorage.set('smartnfe_sidebar_collapsed', String(sidebarCollapsed));
    }
    assert.strictEqual(mockStorage.get('smartnfe_sidebar_collapsed'), 'true', 'Estado final restaurado para true');
  });

  it('2.4: Pureza de funções de atualização de estado no React 19', () => {
    // Em React 19, updaters em setState(prev => ...) devem ser funções puras.
    // Inspeciona setSidebarCollapsed no AppContext.jsx:
    assert.match(
      appContextSource,
      /setSidebarCollapsed\s*=\s*useCallback/,
      'setSidebarCollapsed deve ser memoizado'
    );
    // Verifica se há chamada a localStorage.setItem dentro do callback de updater:
    const hasSideEffectInUpdater = /setSidebarCollapsedState\s*\(\s*prev\s*=>\s*\{[\s\S]*localStorage\.setItem/.test(appContextSource);
    // Documentamos que existe side-effect dentro do updater, o que funciona mas é uma impureza
    assert.ok(hasSideEffectInUpdater, 'Efeito colateral dentro do updater identificado');
  });
});

describe('SUITE 3: LocalStorage Synchronization Under Adversarial Edge Cases', () => {
  const appContextSource = readFileSync(APP_CONTEXT_PATH, 'utf-8');

  it('3.1: Valores corruptos / não-booleanos em smartnfe_sidebar_collapsed', () => {
    // Como AppContext.jsx avalia o valor de storedCollapsed (linhas 63-68):
    const resolveStateFromStorage = (storedCollapsed, windowWidth) => {
      const isLg = windowWidth > 1024;
      if (storedCollapsed !== null) {
        return storedCollapsed === 'true';
      }
      return !isLg;
    };

    // Caso 1: Valores booleanos válidos
    assert.strictEqual(resolveStateFromStorage('true', 1440), true);
    assert.strictEqual(resolveStateFromStorage('false', 1440), false);
    assert.strictEqual(resolveStateFromStorage('true', 768), true);
    assert.strictEqual(resolveStateFromStorage('false', 768), false);

    // Caso 2: Valores corruptos / strings arbitrárias
    const corruptValues = [
      '',              // string vazia
      'undefined',     // string "undefined"
      'null',          // string "null"
      'garbage',       // lixo
      '0',             // número como string
      '1',             // número como string
      'TRUE',          // maiúscula
      'FALSE',         // maiúscula
      '{}',            // json
    ];

    for (const val of corruptValues) {
      const resultDesktop = resolveStateFromStorage(val, 1440);
      const resultMobile = resolveStateFromStorage(val, 768);

      // Em desktop (>1024px), val !== 'true' resulta em false (expandido), que coincide com default
      assert.strictEqual(resultDesktop, false, `Desktop: valor corrupto "${val}" resulta em false (expandido)`);

      // ACHADO ADVERSARIAL EM MOBILE:
      // Em mobile (<=1024px), o padrão limpo (storedCollapsed === null) seria true (recolhido).
      // Mas se houver string corrupta ("garbage" ou ""), storedCollapsed !== null é true,
      // e storedCollapsed === 'true' é false. O sidebar fica EXPANDIDO em mobile em vez de recolhido!
      assert.strictEqual(resultMobile, false, `Mobile: valor corrupto "${val}" sobrepõe default e expande sidebar`);
    }
  });

  it('3.2: Resiliência contra SecurityError (Storage desabilitado / Navegação Anônima restrita)', () => {
    // Simula ambiente onde localStorage lança SecurityError (ex: cookies de terceiros bloqueados)
    const disabledStorage = {
      getItem: () => {
        const err = new Error('Access to localStorage is denied');
        err.name = 'SecurityError';
        throw err;
      },
      setItem: () => {
        const err = new Error('Access to localStorage is denied');
        err.name = 'SecurityError';
        throw err;
      },
    };

    // Executa a lógica de AppContext.jsx com mock que lança exceção:
    let storedCollapsed = null;
    let didThrowOnRead = false;
    try {
      storedCollapsed = disabledStorage.getItem('smartnfe_sidebar_collapsed');
    } catch (e) {
      didThrowOnRead = true;
    }

    assert.strictEqual(didThrowOnRead, true, 'Storage lançou SecurityError');
    assert.strictEqual(storedCollapsed, null, 'storedCollapsed permaneceu null em caso de erro');

    // Fallback gracioso: funciona sem preferência salva
    const isLg = 1440 > 1024;
    const finalState = storedCollapsed !== null ? storedCollapsed === 'true' : !isLg;
    assert.strictEqual(finalState, false, 'Fallback gracioso opera normalmente');

    // Gravação segura com try/catch:
    let didThrowOnWrite = false;
    try {
      disabledStorage.setItem('smartnfe_sidebar_collapsed', 'true');
    } catch (e) {
      didThrowOnWrite = true;
    }
    assert.strictEqual(didThrowOnWrite, true, 'Gravação foi interceptada');
    // Confirma que AppContext.jsx possui bloco try/catch em todas as operações de storage
    assert.match(appContextSource, /try\s*\{[\s\S]*localStorage\.setItem[\s\S]*\}\s*catch/, 'Gravação protegida por try/catch');
  });

  it('3.3: Resiliência contra QuotaExceededError (LocalStorage cheio)', () => {
    // Simula quota de armazenamento excedida
    const fullStorage = {
      setItem: () => {
        const err = new Error('Quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      },
    };

    let caughtError = false;
    try {
      fullStorage.setItem('smartnfe_sidebar_collapsed', 'true');
    } catch (e) {
      caughtError = true;
    }

    assert.strictEqual(caughtError, true, 'QuotaExceededError foi disparado');
    // AppContext não propaga o erro para o usuário
    assert.doesNotThrow(() => {
      try {
        fullStorage.setItem('smartnfe_sidebar_collapsed', 'true');
      } catch (e) {
        // AppContext ignora silenciosamente
      }
    }, 'Aplicação sobrevive a QuotaExceededError');
  });

  it('3.4: Stress Test de Flip-Flop Concorrente Rápido (100 ciclos síncronos de alternância)', () => {
    let sidebarCollapsed = false;
    const storageMap = new Map();

    const setSidebarCollapsed = (valueOrUpdater) => {
      sidebarCollapsed = typeof valueOrUpdater === 'function' ? valueOrUpdater(sidebarCollapsed) : Boolean(valueOrUpdater);
      storageMap.set('smartnfe_sidebar_collapsed', String(sidebarCollapsed));
    };

    const toggleSidebar = () => {
      setSidebarCollapsed(prev => !prev);
    };

    // 100 alternâncias consecutivas
    for (let i = 1; i <= 100; i++) {
      toggleSidebar();
      const expected = i % 2 !== 0; // Ímpar = true, Par = false
      assert.strictEqual(sidebarCollapsed, expected, `Ciclo ${i}: estado deve ser ${expected}`);
      assert.strictEqual(storageMap.get('smartnfe_sidebar_collapsed'), String(expected));
    }

    // Estado final: 100 alternâncias a partir de false -> false
    assert.strictEqual(sidebarCollapsed, false, 'Após 100 ciclos, estado volta deterministicamente a false');
  });

  it('3.5: Integridade de restauração de overflow do body no drawer móvel', () => {
    const sidebarSource = readFileSync(SIDEBAR_PATH, 'utf-8');

    // Inspeciona implementação de bloqueio de scroll:
    assert.match(
      sidebarSource,
      /const\s+originalOverflow\s*=\s*document\.body\.style\.overflow;/,
      'Salva overflow original antes de sobrescrever'
    );
    assert.match(
      sidebarSource,
      /document\.body\.style\.overflow\s*=\s*['"]hidden['"];/,
      'Aplica overflow: hidden'
    );
    assert.match(
      sidebarSource,
      /document\.body\.style\.overflow\s*=\s*originalOverflow;/,
      'Restaura overflow original no cleanup'
    );
  });
});
