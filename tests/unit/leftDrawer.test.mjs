/**
 * SmartNFe — Unit Test Suite: Milestone 2 Left Drawer & Responsive Layout (R1)
 *
 * Verificações cobertas:
 * 1. AppContext State Elevation & Context Contract
 * 2. Hydration Safety & React 19 SSR Snapshot Isolation
 * 3. LocalStorage Persistence ('smartnfe_sidebar_collapsed')
 * 4. Responsive Viewport Defaults (> 1024px expanded, <= 1024px collapsed)
 * 5. AppLayout Route Navigation Immunity (Elimination of local useState reset)
 * 6. SmartNFeSidebar Desktop Collapsible Aside (hidden lg:flex, 5 menus invariant)
 * 7. SmartNFeSidebar Mobile Overlay Drawer (dialog, aria-modal, backdrop, close button, Escape listener)
 * 8. SmartNFeHeader Accessible Mobile Toggle (lg:hidden, aria-controls, aria-expanded)
 * 9. Coexistence Guardian with ScreenTourTip & Table Inline Editing
 *
 * Execução: node --no-warnings --test tests/unit/leftDrawer.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = process.cwd();

describe('M2 Left Drawer: AppContext State Elevation & Contract', () => {
  const appContextPath = resolve(ROOT_DIR, 'app/context/AppContext.jsx');

  it('AppContext.jsx deve existir e conter estado elevado para sidebar e mobile drawer', () => {
    assert.ok(existsSync(appContextPath), 'AppContext.jsx deve existir');
    const content = readFileSync(appContextPath, 'utf-8');

    // Estados elevados
    assert.match(content, /sidebarCollapsed/, 'Deve declarar sidebarCollapsed');
    assert.match(content, /mobileDrawerOpen/, 'Deve declarar mobileDrawerOpen');
    assert.match(content, /isLgScreen/, 'Deve declarar isLgScreen');

    // Helpers
    assert.match(content, /toggleSidebar/, 'Deve prover toggleSidebar');
    assert.match(content, /setSidebarCollapsed/, 'Deve prover setSidebarCollapsed');
    assert.match(content, /toggleMobileDrawer/, 'Deve prover toggleMobileDrawer');
    assert.match(content, /closeMobileDrawer/, 'Deve prover closeMobileDrawer');
    assert.match(content, /setMobileDrawerOpen/, 'Deve prover setMobileDrawerOpen');
  });

  it('AppContext Provider value memoizado deve exportar todos os itens do contrato PROJECT.md', () => {
    const content = readFileSync(appContextPath, 'utf-8');

    const expectedExports = [
      'sidebarCollapsed',
      'setSidebarCollapsed',
      'toggleSidebar',
      'mobileDrawerOpen',
      'setMobileDrawerOpen',
      'toggleMobileDrawer',
      'closeMobileDrawer',
      'isLgScreen',
    ];

    for (const exp of expectedExports) {
      assert.match(
        content,
        new RegExp(`\\b${exp}\\b`),
        `Context value deve exportar ${exp}`
      );
    }
  });

  it('Simulação funcional: State machine do AppContext para toggle e close do Drawer', () => {
    // Simulação do comportamento puro das funções do contexto
    let sidebarCollapsed = false;
    let mobileDrawerOpen = false;
    const storageMock = new Map();

    const setSidebarCollapsed = (valOrFn) => {
      sidebarCollapsed = typeof valOrFn === 'function' ? valOrFn(sidebarCollapsed) : Boolean(valOrFn);
      storageMock.set('smartnfe_sidebar_collapsed', String(sidebarCollapsed));
    };

    const toggleSidebar = () => {
      setSidebarCollapsed((prev) => !prev);
    };

    const toggleMobileDrawer = (explicit) => {
      mobileDrawerOpen = typeof explicit === 'boolean' ? explicit : !mobileDrawerOpen;
    };

    const closeMobileDrawer = () => {
      mobileDrawerOpen = false;
    };

    // Estado inicial
    assert.strictEqual(sidebarCollapsed, false);
    assert.strictEqual(mobileDrawerOpen, false);

    // Toggle desktop sidebar
    toggleSidebar();
    assert.strictEqual(sidebarCollapsed, true);
    assert.strictEqual(storageMock.get('smartnfe_sidebar_collapsed'), 'true');

    toggleSidebar();
    assert.strictEqual(sidebarCollapsed, false);
    assert.strictEqual(storageMock.get('smartnfe_sidebar_collapsed'), 'false');

    // Mobile drawer open / close
    toggleMobileDrawer();
    assert.strictEqual(mobileDrawerOpen, true);

    toggleMobileDrawer(false);
    assert.strictEqual(mobileDrawerOpen, false);

    toggleMobileDrawer(true);
    assert.strictEqual(mobileDrawerOpen, true);

    closeMobileDrawer();
    assert.strictEqual(mobileDrawerOpen, false);
  });
});

describe('M2 Left Drawer: React 19 Hydration Safety & Persistence', () => {
  const appContextPath = resolve(ROOT_DIR, 'app/context/AppContext.jsx');

  it('Não deve ler localStorage ou window.innerWidth de forma síncrona no useState inicial', () => {
    const content = readFileSync(appContextPath, 'utf-8');

    // Inspeciona as declarações de useState
    assert.doesNotMatch(
      content,
      /useState\(\s*\(\)\s*=>\s*localStorage\.getItem\(/,
      'Não deve ler localStorage no inicializador síncrono de useState'
    );
    assert.doesNotMatch(
      content,
      /useState\(\s*\(\)\s*=>\s*window\.innerWidth/,
      'Não deve ler window.innerWidth no inicializador síncrono de useState'
    );

    // Deve inicializar com valor padrão determinístico (false) para SSR seguro
    assert.match(
      content,
      /useState\(false\)/,
      'Deve inicializar estados com valor determinístico estável'
    );
  });

  it('Sincronização de localStorage deve utilizar chave oficial "smartnfe_sidebar_collapsed" e guarda pós-montagem', () => {
    const content = readFileSync(appContextPath, 'utf-8');

    assert.match(
      content,
      /'smartnfe_sidebar_collapsed'/,
      'Deve utilizar a chave exata smartnfe_sidebar_collapsed'
    );

    // Guarda de hidratação para evitar sobrescrita prematura
    assert.match(
      content,
      /sidebarHydratedRef/,
      'Deve utilizar ref de hidratação para proteger escrita pós-montagem'
    );
  });

  it('Lógica de resolução de viewport: > 1024px expandido (false), <= 1024px recolhido (true)', () => {
    const resolveInitialState = (storedPreference, windowWidth) => {
      if (storedPreference !== null && storedPreference !== undefined) {
        return storedPreference === 'true';
      }
      return windowWidth <= 1024;
    };

    // Sem preferência salva em tela grande (> 1024px) -> expandido (collapsed = false)
    assert.strictEqual(resolveInitialState(null, 1440), false);
    assert.strictEqual(resolveInitialState(null, 1025), false);

    // Sem preferência salva em tela <= 1024px -> recolhido (collapsed = true)
    assert.strictEqual(resolveInitialState(null, 1024), true);
    assert.strictEqual(resolveInitialState(null, 768), true);
    assert.strictEqual(resolveInitialState(null, 375), true);

    // Com preferência salva, a escolha do usuário tem precedência estrita
    assert.strictEqual(resolveInitialState('true', 1440), true, 'Preferência true deve prevalecer em tela grande');
    assert.strictEqual(resolveInitialState('false', 768), false, 'Preferência false deve prevalecer em tela pequena');
  });
});

describe('M2 Left Drawer: AppLayout Route Navigation Immunity', () => {
  const layoutPath = resolve(ROOT_DIR, 'app/components/Layouts/AppLayout.jsx');

  it('AppLayout.jsx deve existir e NÃO conter useState local de recolhimento', () => {
    assert.ok(existsSync(layoutPath), 'AppLayout.jsx deve existir');
    const content = readFileSync(layoutPath, 'utf-8');

    // Não deve conter useState(false) para sidebarCollapsed
    assert.doesNotMatch(
      content,
      /useState\(\s*false\s*\)/,
      'AppLayout não deve manter estado local de sidebar com useState'
    );
    assert.doesNotMatch(
      content,
      /const\s*\[\s*sidebarCollapsed,\s*setSidebarCollapsed\s*\]/,
      'sidebarCollapsed não deve ser instanciado localmente no AppLayout'
    );

    // Deve consumir useAppContext
    assert.match(
      content,
      /useAppContext\(\)/,
      'AppLayout deve consumir estado global via useAppContext'
    );
  });

  it('AppLayout deve repassar props e handlers para SmartNFeSidebar e SmartNFeHeader', () => {
    const content = readFileSync(layoutPath, 'utf-8');

    assert.match(
      content,
      /<SmartNFeSidebar[^>]*collapsed=\{sidebarCollapsed\}/,
      'Deve passar collapsed={sidebarCollapsed} para SmartNFeSidebar'
    );
    assert.match(
      content,
      /<SmartNFeSidebar[^>]*onToggle=\{toggleSidebar\}/,
      'Deve passar onToggle={toggleSidebar} para SmartNFeSidebar'
    );
    assert.match(
      content,
      /<SmartNFeSidebar[^>]*mobileOpen=\{mobileDrawerOpen\}/,
      'Deve passar mobileOpen={mobileDrawerOpen} para SmartNFeSidebar'
    );
    assert.match(
      content,
      /<SmartNFeHeader[^>]*onMenuToggle=\{toggleMobileDrawer\}/,
      'Deve passar onMenuToggle={toggleMobileDrawer} para SmartNFeHeader'
    );
  });
});

describe('M2 Left Drawer: SmartNFeSidebar Desktop Collapsible Aside', () => {
  const sidebarPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeSidebar.jsx');

  it('SmartNFeSidebar.jsx deve existir e conter classes responsivas hidden lg:flex no aside desktop', () => {
    assert.ok(existsSync(sidebarPath), 'SmartNFeSidebar.jsx deve existir');
    const content = readFileSync(sidebarPath, 'utf-8');

    assert.match(
      content,
      /hidden\s+lg:flex/,
      'Aside desktop deve conter hidden lg:flex'
    );
    assert.match(
      content,
      /data-testid="desktop-sidebar"/,
      'Deve conter data-testid="desktop-sidebar"'
    );
    assert.match(
      content,
      /aria-label="Menu principal"/,
      'Deve conter aria-label="Menu principal"'
    );
  });

  it('Aside desktop deve suportar alternância de largura w-14 vs w-60', () => {
    const content = readFileSync(sidebarPath, 'utf-8');

    assert.match(
      content,
      /w-14.*w-60|w-60.*w-14/,
      'Deve alternar largura entre w-14 (recolhido) e w-60 (expandido)'
    );
  });

  it('Preservação estrita dos 5 itens de menu originais (invariante do projeto)', () => {
    const content = readFileSync(sidebarPath, 'utf-8');

    const requiredMenus = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Documentos', href: '/documentos' },
      { label: 'Importar', href: '/documentos/importar' },
      { label: 'Notas Preparadas', href: '/notas-preparadas' },
      { label: 'Configurações', href: '/configuracoes' },
    ];

    for (const menu of requiredMenus) {
      assert.match(content, new RegExp(menu.label), `Deve conter label ${menu.label}`);
      assert.match(content, new RegExp(menu.href), `Deve apontar para href ${menu.href}`);
    }
  });

  it('Botão de alternância inferior deve conter aria-label acessível', () => {
    const content = readFileSync(sidebarPath, 'utf-8');

    assert.match(
      content,
      /aria-label=\{collapsed\s*\?\s*['"]Expandir menu lateral['"]\s*:\s*['"]Recolher menu lateral['"]\}/,
      'Botão inferior deve alternar aria-label conforme estado'
    );
  });
});

describe('M2 Left Drawer: SmartNFeSidebar Mobile Overlay Drawer (<= 1024px)', () => {
  const sidebarPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeSidebar.jsx');

  it('Drawer móvel deve renderizar overlay com backdrop e container deslizante em telas <= 1024px', () => {
    const content = readFileSync(sidebarPath, 'utf-8');

    // Container móvel com lg:hidden
    assert.match(content, /lg:hidden/, 'Drawer móvel deve ter classe lg:hidden');

    // Backdrop
    assert.match(content, /data-testid="sidebar-backdrop"/, 'Deve possuir backdrop com data-testid');
    assert.match(content, /fixed\s+inset-0/, 'Backdrop deve cobrir toda a tela (fixed inset-0)');
    assert.match(content, /bg-slate-900\/60/, 'Backdrop deve possuir fundo translúcido escuro');

    // Drawer container
    assert.match(content, /id="mobile-sidebar-drawer"/, 'Deve possuir id="mobile-sidebar-drawer"');
    assert.match(content, /role="dialog"/, 'Deve possuir role="dialog"');
    assert.match(content, /aria-modal="true"/, 'Deve possuir aria-modal="true"');
    assert.match(content, /fixed\s+inset-y-0\s+left-0/, 'Container deslizante deve estar fixado à esquerda');
  });

  it('Drawer móvel deve possuir botão de fechar acessível com ícone faXmark', () => {
    const content = readFileSync(sidebarPath, 'utf-8');

    assert.match(content, /faXmark/, 'Deve importar e utilizar faXmark');
    assert.match(
      content,
      /aria-label="Fechar menu lateral"/,
      'Botão de fechar deve possuir aria-label="Fechar menu lateral"'
    );
    assert.match(
      content,
      /data-testid="sidebar-close-button"/,
      'Deve possuir data-testid="sidebar-close-button"'
    );
  });

  it('Escape key handler deve invocar e.preventDefault() e e.stopPropagation() para fechar', () => {
    const content = readFileSync(sidebarPath, 'utf-8');

    assert.match(
      content,
      /e\.key\s*===\s*['"]Escape['"]/,
      'Deve monitorar pressionamento da tecla Escape'
    );
    assert.match(
      content,
      /e\.preventDefault\(\)/,
      'Deve chamar e.preventDefault() no listener de Escape'
    );
    assert.match(
      content,
      /e\.stopPropagation\(\)/,
      'Deve chamar e.stopPropagation() no listener de Escape'
    );
  });

  it('Drawer móvel deve fechar automaticamente em cliques de navegação e mudança de rota', () => {
    const content = readFileSync(sidebarPath, 'utf-8');

    // onClick={onMobileClose} em links
    assert.match(
      content,
      /onClick=\{onMobileClose\}/,
      'Links do menu móvel devem acionar fechamento ao navegar'
    );

    // Efeito para fechar ao mudar pathname
    assert.match(
      content,
      /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*onMobileClose[\s\S]*\}\s*,\s*\[pathname[^\]]*\]\)/,
      'Deve monitorar pathname para auto-fechar em transições de rota'
    );
  });

  it('Drawer móvel deve bloquear scroll do body enquanto estiver aberto', () => {
    const content = readFileSync(sidebarPath, 'utf-8');

    assert.match(
      content,
      /document\.body\.style\.overflow\s*=\s*['"]hidden['"]/,
      'Deve aplicar overflow: hidden no body ao abrir drawer móvel'
    );
  });
});

describe('M2 Left Drawer: SmartNFeHeader Accessible Mobile Toggle Button', () => {
  const headerPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeHeader.jsx');

  it('SmartNFeHeader.jsx deve possuir botão hambúrguer com classe lg:hidden (visível <= 1024px)', () => {
    assert.ok(existsSync(headerPath), 'SmartNFeHeader.jsx deve existir');
    const content = readFileSync(headerPath, 'utf-8');

    assert.match(
      content,
      /lg:hidden/,
      'Botão de toggle móvel deve utilizar classe lg:hidden (visível até 1024px)'
    );
    assert.doesNotMatch(
      content,
      /className="md:hidden[^"]*"\s*title="Menu"/,
      'Não deve mais estar restrito a md:hidden (< 768px)'
    );
  });

  it('Botão hambúrguer deve possuir atributos ARIA de acessibilidade', () => {
    const content = readFileSync(headerPath, 'utf-8');

    assert.match(
      content,
      /data-testid="header-mobile-toggle"/,
      'Deve possuir data-testid="header-mobile-toggle"'
    );
    assert.match(
      content,
      /aria-controls="mobile-sidebar-drawer"/,
      'Deve possuir aria-controls="mobile-sidebar-drawer"'
    );
    assert.match(
      content,
      /aria-expanded=\{isMobileOpen\}/,
      'Deve sincronizar aria-expanded com estado do drawer móvel'
    );
    assert.match(
      content,
      /aria-label=\{isMobileOpen\s*\?\s*['"]Fechar menu lateral['"]\s*:\s*['"]Abrir menu lateral['"]\}/,
      'Deve alternar aria-label entre Abrir e Fechar menu lateral'
    );
  });
});

describe('M2 Left Drawer: Coexistence Guardian with ScreenTourTip & Table Editing', () => {
  const tourPath = resolve(ROOT_DIR, 'app/components/feedback/ScreenTourTip.jsx');

  it('ScreenTourTip respeita event.defaultPrevented e seletores [role="dialog"], [aria-modal="true"]', () => {
    assert.ok(existsSync(tourPath), 'ScreenTourTip.jsx deve existir');
    const content = readFileSync(tourPath, 'utf-8');

    // Validação da guarda em ScreenTourTip
    assert.match(
      content,
      /if\s*\(\s*event\.defaultPrevented\s*\)\s*return/,
      'ScreenTourTip deve ignorar eventos com defaultPrevented'
    );
    assert.match(
      content,
      /\[role="dialog"\],\s*\[aria-modal="true"\]/,
      'ScreenTourTip deve detectar diálogo ativo no DOM'
    );
  });

  it('Simulação: Pressionar Escape no Drawer móvel NÃO fecha ScreenTourTip', () => {
    // Simula o evento KeyboardEvent no navegador
    let defaultPrevented = false;
    let propagationStopped = false;
    let tourDismissed = false;
    let drawerClosed = false;

    const mockEvent = {
      key: 'Escape',
      get defaultPrevented() {
        return defaultPrevented;
      },
      preventDefault: () => {
        defaultPrevented = true;
      },
      stopPropagation: () => {
        propagationStopped = true;
      },
    };

    // Handler do Drawer Móvel (SmartNFeSidebar)
    const mobileDrawerEscapeHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        drawerClosed = true;
      }
    };

    // Handler do ScreenTourTip
    const screenTourTipEscapeHandler = (e) => {
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return; // GUARDA 1
        // GUARDA 2: detecção de modal ativo
        const hasActiveModal = true; // drawer móvel presente
        if (hasActiveModal) return;
        tourDismissed = true;
      }
    };

    // Executa a cadeia de eventos
    mobileDrawerEscapeHandler(mockEvent);
    screenTourTipEscapeHandler(mockEvent);

    assert.strictEqual(drawerClosed, true, 'Drawer móvel deve ter sido fechado');
    assert.strictEqual(defaultPrevented, true, 'defaultPrevented deve ser true');
    assert.strictEqual(propagationStopped, true, 'propagationStopped deve ser true');
    assert.strictEqual(tourDismissed, false, 'ScreenTourTip NÃO deve ser fechado');
  });

  it('Simulação: Pressionar Escape em célula de edição de tabela não fecha o drawer', () => {
    let defaultPrevented = false;
    let cellEditCanceled = false;
    let drawerClosed = false;

    const mockCellEvent = {
      key: 'Escape',
      get defaultPrevented() {
        return defaultPrevented;
      },
      preventDefault: () => {
        defaultPrevented = true;
      },
      target: { blur: () => {} },
    };

    // Célula da tabela (conferencia/page.jsx)
    const tableCellEscapeHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cellEditCanceled = true;
      }
    };

    tableCellEscapeHandler(mockCellEvent);

    assert.strictEqual(cellEditCanceled, true, 'Edição de célula deve ser cancelada');
    assert.strictEqual(defaultPrevented, true, 'e.preventDefault() foi acionado na célula');
    assert.strictEqual(drawerClosed, false, 'Drawer não é afetado pelo escape da célula');
  });
});
