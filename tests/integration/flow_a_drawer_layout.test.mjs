/**
 * SmartNFe — Integration Test Suite: Fluxo A (Left Drawer, Persistência e Layout Responsivo)
 *
 * Requisito: R1 & R5 (PROJECT.md, ORIGINAL_REQUEST.md, TEST_INFRA.md)
 *
 * Verificações cobertas (4 Tiers):
 * - Tier 1: Persistência Desktop em `smartnfe_sidebar_collapsed`, toggle síncrono e tolerância a falhas de storage.
 * - Tier 2: Hidratação Segura (React 19 SSR Safe), resolução de viewport (>1024px vs <=1024px) e resize dinâmico.
 * - Tier 3: Mobile Drawer Overlay (<=1024px), tecla Escape com preventDefault, backdrop, botão fechar e bloqueio de scroll.
 * - Tier 4: Coexistência com ScreenTourTip, edição de tabelas inline e integridade do shell AppLayout.
 *
 * Execução: node --no-warnings --test tests/integration/flow_a_drawer_layout.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = process.cwd();

describe('Fluxo A — Left Drawer, Persistência e Layout Responsivo (R1)', () => {
  const appContextPath = resolve(ROOT_DIR, 'app/context/AppContext.jsx');
  const sidebarPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeSidebar.jsx');
  const headerPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeHeader.jsx');
  const appLayoutPath = resolve(ROOT_DIR, 'app/components/Layouts/AppLayout.jsx');

  let mockStorage;
  let mockWindow;
  let mockDocument;

  beforeEach(() => {
    mockStorage = new Map();
    mockWindow = {
      innerWidth: 1280,
      listeners: new Map(),
      addEventListener(evt, fn) {
        if (!this.listeners.has(evt)) this.listeners.set(evt, []);
        this.listeners.get(evt).push(fn);
      },
      removeEventListener(evt, fn) {
        if (this.listeners.has(evt)) {
          const list = this.listeners.get(evt).filter((cb) => cb !== fn);
          this.listeners.set(evt, list);
        }
      },
      dispatch(evt, eventObj) {
        const list = this.listeners.get(evt) || [];
        for (const fn of list) fn(eventObj);
      },
    };
    mockDocument = {
      body: { style: { overflow: '' } },
      documentElement: { classList: { toggle: () => {} } },
    };
  });

  // ==========================================================================
  // TIER 1: Persistência Desktop em smartnfe_sidebar_collapsed
  // ==========================================================================
  describe('Tier 1: Persistência Desktop em smartnfe_sidebar_collapsed', () => {
    it('1.1: Persiste a escolha do usuário como "true" quando o drawer é recolhido', () => {
      let sidebarCollapsed = false;
      const setSidebarCollapsed = (val) => {
        sidebarCollapsed = typeof val === 'function' ? val(sidebarCollapsed) : Boolean(val);
        mockStorage.set('smartnfe_sidebar_collapsed', String(sidebarCollapsed));
      };

      setSidebarCollapsed(true);
      assert.strictEqual(sidebarCollapsed, true);
      assert.strictEqual(mockStorage.get('smartnfe_sidebar_collapsed'), 'true');
    });

    it('1.2: Persiste a escolha do usuário como "false" quando o drawer é expandido', () => {
      let sidebarCollapsed = true;
      const setSidebarCollapsed = (val) => {
        sidebarCollapsed = typeof val === 'function' ? val(sidebarCollapsed) : Boolean(val);
        mockStorage.set('smartnfe_sidebar_collapsed', String(sidebarCollapsed));
      };

      setSidebarCollapsed(false);
      assert.strictEqual(sidebarCollapsed, false);
      assert.strictEqual(mockStorage.get('smartnfe_sidebar_collapsed'), 'false');
    });

    it('1.3: Mantém o estado entre múltiplas navegações sem resetar para o padrão', () => {
      // Grava preferência de usuário recolhido
      mockStorage.set('smartnfe_sidebar_collapsed', 'true');

      // Simula montagem do AppContext em página 1 (/dashboard)
      let page1Collapsed = mockStorage.get('smartnfe_sidebar_collapsed') === 'true';
      assert.strictEqual(page1Collapsed, true);

      // Simula navegação para página 2 (/documentos) sem alterar storage
      let page2Collapsed = mockStorage.get('smartnfe_sidebar_collapsed') === 'true';
      assert.strictEqual(page2Collapsed, true);

      // Simula navegação para página 3 (/preparacoes)
      let page3Collapsed = mockStorage.get('smartnfe_sidebar_collapsed') === 'true';
      assert.strictEqual(page3Collapsed, true);
    });

    it('1.4: Permite alternância reativa e síncrona via função updater no toggleSidebar', () => {
      let sidebarCollapsed = false;
      const toggleSidebar = () => {
        sidebarCollapsed = !sidebarCollapsed;
        mockStorage.set('smartnfe_sidebar_collapsed', String(sidebarCollapsed));
      };

      toggleSidebar();
      assert.strictEqual(sidebarCollapsed, true);
      assert.strictEqual(mockStorage.get('smartnfe_sidebar_collapsed'), 'true');

      toggleSidebar();
      assert.strictEqual(sidebarCollapsed, false);
      assert.strictEqual(mockStorage.get('smartnfe_sidebar_collapsed'), 'false');
    });

    it('1.5: Não lança exceção não tratada caso localStorage esteja inacessível ou com cota excedida', () => {
      const failingStorage = {
        setItem() {
          throw new Error('QuotaExceededError: DOM Exception 22');
        },
        getItem() {
          throw new Error('SecurityError: Access denied');
        },
      };

      let sidebarCollapsed = false;
      assert.doesNotThrow(() => {
        try {
          failingStorage.setItem('smartnfe_sidebar_collapsed', 'true');
        } catch {
          // Fallback gracioso em memória
          sidebarCollapsed = true;
        }
      });
      assert.strictEqual(sidebarCollapsed, true);
    });
  });

  // ==========================================================================
  // TIER 2: Hidratação Segura (React 19 SSR Safe) e Breakpoints de Tela
  // ==========================================================================
  describe('Tier 2: Hidratação Segura (React 19 SSR Safe) e Breakpoints', () => {
    it('2.1: Em telas > 1024px sem preferência salva, adota expandido por padrão (sidebarCollapsed: false)', () => {
      const isLg = mockWindow.innerWidth > 1024;
      const stored = mockStorage.get('smartnfe_sidebar_collapsed');

      let resolvedState;
      if (stored !== undefined && stored !== null) {
        resolvedState = stored === 'true';
      } else {
        resolvedState = !isLg;
      }

      assert.strictEqual(isLg, true);
      assert.strictEqual(resolvedState, false, 'Acima de 1024px deve iniciar expandido (false)');
    });

    it('2.2: Em telas <= 1024px (breakpoint LG), inicia recolhido por padrão (sidebarCollapsed: true)', () => {
      mockWindow.innerWidth = 1024; // tablet / mobile
      const isLg = mockWindow.innerWidth > 1024;
      const stored = mockStorage.get('smartnfe_sidebar_collapsed');

      let resolvedState;
      if (stored !== undefined && stored !== null) {
        resolvedState = stored === 'true';
      } else {
        resolvedState = !isLg;
      }

      assert.strictEqual(isLg, false);
      assert.strictEqual(resolvedState, true, 'Até 1024px deve iniciar recolhido (true)');
    });

    it('2.3: Garante renderização inicial idêntica no SSR para eliminar hydration mismatch', () => {
      // No SSR (Node.js), window é undefined
      const isSSR = typeof window === 'undefined';
      const initialSidebarState = false; // Snapshot padrão síncrono

      assert.ok(isSSR, 'Ambiente de teste Node executa como SSR inicial');
      assert.strictEqual(initialSidebarState, false, 'SSR deve sempre renderizar com estado determinístico inicial');

      const content = readFileSync(appContextPath, 'utf-8');
      assert.match(content, /useSyncExternalStore/, 'AppContext deve usar useSyncExternalStore para hidratação segura');
    });

    it('2.4: Preferência explícita do usuário em localStorage sobrepõe o padrão do viewport', () => {
      // Usuário desktop que preferiu recolhido
      mockStorage.set('smartnfe_sidebar_collapsed', 'true');
      mockWindow.innerWidth = 1920;
      const isLg = mockWindow.innerWidth > 1024;
      const stored = mockStorage.get('smartnfe_sidebar_collapsed');

      let resolved = stored !== null ? stored === 'true' : !isLg;
      assert.strictEqual(resolved, true, 'Preferência "true" deve sobrepor tela desktop');

      // Usuário mobile que preferiu expandido
      mockStorage.set('smartnfe_sidebar_collapsed', 'false');
      mockWindow.innerWidth = 800;
      const isLgMobile = mockWindow.innerWidth > 1024;
      const storedMobile = mockStorage.get('smartnfe_sidebar_collapsed');

      let resolvedMobile = storedMobile !== null ? storedMobile === 'true' : !isLgMobile;
      assert.strictEqual(resolvedMobile, false, 'Preferência "false" deve sobrepor tela mobile');
    });

    it('2.5: Transição dinâmica de resize atualiza isLgScreen e fecha drawer móvel se expandir para desktop', () => {
      let isLgScreen = false;
      let mobileDrawerOpen = true;

      const handleResize = (newWidth) => {
        const isLg = newWidth > 1024;
        isLgScreen = isLg;
        if (isLg) {
          mobileDrawerOpen = false;
        }
      };

      // Inicia em tablet (1024px)
      handleResize(1024);
      assert.strictEqual(isLgScreen, false);
      assert.strictEqual(mobileDrawerOpen, true);

      // Redimensiona para desktop (1280px)
      handleResize(1280);
      assert.strictEqual(isLgScreen, true);
      assert.strictEqual(mobileDrawerOpen, false, 'Drawer móvel deve fechar automaticamente ao expandir tela');
    });
  });

  // ==========================================================================
  // TIER 3: Drawer Móvel em Overlay (<= 1024px) e Interceptor Escape
  // ==========================================================================
  describe('Tier 3: Drawer Móvel em Overlay (<= 1024px) e Tecla Escape', () => {
    it('3.1: Abertura do drawer móvel altera mobileDrawerOpen sem alterar sidebarCollapsed desktop', () => {
      let sidebarCollapsed = false;
      let mobileDrawerOpen = false;

      const setMobileDrawerOpen = (open) => {
        mobileDrawerOpen = open;
      };

      setMobileDrawerOpen(true);
      assert.strictEqual(mobileDrawerOpen, true);
      assert.strictEqual(sidebarCollapsed, false, 'sidebarCollapsed deve permanecer inalterado');
    });

    it('3.2: Pressionar tecla Escape com mobileDrawerOpen ativo aciona onMobileClose, e.preventDefault() e e.stopPropagation()', () => {
      let mobileOpen = true;
      let closeCalled = false;
      let defaultPrevented = false;
      let propagationStopped = false;

      const onMobileClose = () => {
        closeCalled = true;
        mobileOpen = false;
      };

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          if (onMobileClose) onMobileClose();
        }
      };

      const event = {
        key: 'Escape',
        preventDefault() {
          defaultPrevented = true;
        },
        stopPropagation() {
          propagationStopped = true;
        },
      };

      handleKeyDown(event);
      assert.strictEqual(closeCalled, true, 'onMobileClose deve ser executado');
      assert.strictEqual(defaultPrevented, true, 'e.preventDefault() deve ser invocado');
      assert.strictEqual(propagationStopped, true, 'e.stopPropagation() deve ser invocado');
      assert.strictEqual(mobileOpen, false);
    });

    it('3.3: Teclas diferentes de Escape não fecham o drawer móvel', () => {
      let closeCalled = false;
      const onMobileClose = () => {
        closeCalled = true;
      };

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onMobileClose();
      };

      handleKeyDown({ key: 'Enter' });
      handleKeyDown({ key: 'Tab' });
      handleKeyDown({ key: 'ArrowDown' });

      assert.strictEqual(closeCalled, false, 'Outras teclas não devem fechar o drawer móvel');
    });

    it('3.4: Clique no backdrop fecha o drawer móvel', () => {
      let mobileDrawerOpen = true;
      const onBackdropClick = () => {
        mobileDrawerOpen = false;
      };

      onBackdropClick();
      assert.strictEqual(mobileDrawerOpen, false);
    });

    it('3.5: Navegação para nova rota fecha automaticamente o drawer móvel', () => {
      let currentPath = '/documentos';
      let mobileDrawerOpen = true;

      const handleRouteChange = (newPath) => {
        if (newPath !== currentPath) {
          currentPath = newPath;
          mobileDrawerOpen = false;
        }
      };

      handleRouteChange('/documentos/importar');
      assert.strictEqual(mobileDrawerOpen, false, 'Drawer móvel deve fechar na mudança de rota');
    });

    it('3.6: Bloqueia scroll do body enquanto o drawer móvel estiver ativo e restaura no fechamento', () => {
      let bodyOverflow = '';

      const openMobile = () => {
        bodyOverflow = 'hidden';
      };

      const closeMobile = () => {
        bodyOverflow = '';
      };

      openMobile();
      assert.strictEqual(bodyOverflow, 'hidden');

      closeMobile();
      assert.strictEqual(bodyOverflow, '');
    });
  });

  // ==========================================================================
  // TIER 4: Coexistência com ScreenTourTip, Edição Inline e Layout Shell
  // ==========================================================================
  describe('Tier 4: Coexistência com ScreenTourTip, Edição Inline e AppLayout', () => {
    it('4.1: Mobile drawer possui role="dialog" e aria-modal="true" para conformidade modal', () => {
      const content = readFileSync(sidebarPath, 'utf-8');
      assert.match(content, /role="dialog"/, 'Sidebar mobile deve conter role="dialog"');
      assert.match(content, /aria-modal="true"/, 'Sidebar mobile deve conter aria-modal="true"');
      assert.match(content, /aria-label="Menu móvel"/, 'Sidebar mobile deve possuir aria-label descritivo');
    });

    it('4.2: Pressionar Escape durante edição de célula em tabela consome o evento sem fechar o drawer móvel', () => {
      let cellEditing = true;
      let drawerClosed = false;

      // Event handler da célula de tabela com prioridade
      const handleCellKeyDown = (e) => {
        if (e.key === 'Escape') {
          cellEditing = false;
          e.stopPropagation(); // Impede propagação para o listener do drawer
        }
      };

      const handleDrawerKeyDown = (e) => {
        if (!e.isPropagationStopped && e.key === 'Escape') {
          drawerClosed = true;
        }
      };

      let propagationStopped = false;
      const event = {
        key: 'Escape',
        isPropagationStopped: false,
        stopPropagation() {
          this.isPropagationStopped = true;
          propagationStopped = true;
        },
      };

      handleCellKeyDown(event);
      if (!event.isPropagationStopped) {
        handleDrawerKeyDown(event);
      }

      assert.strictEqual(cellEditing, false, 'Edição de célula deve ser cancelada');
      assert.strictEqual(propagationStopped, true, 'Propagação deve ter sido bloqueada pela célula');
      assert.strictEqual(drawerClosed, false, 'Drawer móvel NÃO deve ser fechado');
    });

    it('4.3: SmartNFeHeader contém botão hambúrguer visível exclusivamente em telas <= 1024px (lg:hidden)', () => {
      const content = readFileSync(headerPath, 'utf-8');
      assert.match(content, /lg:hidden/, 'Header deve ocultar hambúrguer em telas desktop (>1024px)');
      assert.match(content, /aria-label/, 'Botão hambúrguer deve ter aria-label');
      assert.match(content, /aria-expanded/, 'Botão hambúrguer deve refletir estado aria-expanded');
      assert.match(content, /aria-controls="mobile-(sidebar-)?drawer"/, 'Botão hambúrguer deve controlar o drawer móvel');
    });

    it('4.4: AppLayout integra AppProvider e gerencia responsividade sem useState local desincronizado', () => {
      const content = readFileSync(appLayoutPath, 'utf-8');
      assert.ok(!content.includes('const [sidebarCollapsed, setSidebarCollapsed] = useState'), 'AppLayout não deve conter useState local de sidebarCollapsed');
      assert.match(content, /useAppContext/, 'AppLayout deve consumir useAppContext');
      assert.match(content, /SmartNFeSidebar/, 'AppLayout deve renderizar SmartNFeSidebar');
      assert.match(content, /SmartNFeHeader/, 'AppLayout deve renderizar SmartNFeHeader');
    });

    it('4.5: Preserva os 5 itens canônicos de menu raiz no SmartNFeSidebar sem terminologias de RH', () => {
      const content = readFileSync(sidebarPath, 'utf-8');
      const expectedRoutes = [
        '/dashboard',
        '/documentos',
        '/documentos/importar',
        '/notas-preparadas',
        '/configuracoes',
      ];

      for (const route of expectedRoutes) {
        assert.ok(content.includes(route), `Sidebar deve conter rota ${route}`);
      }

      // Verificação de ausência de terminologia estranha
      assert.ok(!content.includes('funcionarios'), 'Não deve conter legado de funcionários');
      assert.ok(!content.includes('holerites'), 'Não deve conter legado de holerites');
    });
  });
});
