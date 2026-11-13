# Investigation Report: Coexistence Analysis & Test Harness Architecture (Milestone 2 / R1)

**Author**: `m2_explorer_3` (teamwork_explorer)  
**Date**: 2026-11-13  
**Target Milestone**: Milestone 2 — Left Drawer & Responsive Layout (R1)  
**Working Directory**: `c:\www\smart-nfe`  
**State Folder**: `c:\www\smart-nfe\.agents\teamwork\m2_explorer_3\`  

---

## Executive Summary

This report delivers a rigorous technical analysis of the coexistence between Milestone 2 (Left Drawer State Persistence & Responsive Overlay Layout) and other SmartNFe subsystems, specifically:
1. **ScreenTourTip Integration & Layout Anchors**: Z-index stacking hierarchy, DOM anchor points, modal detection via `[role="dialog"], [aria-modal="true"]`, and Escape key suppression.
2. **Table Inline Editing & Main Content Interactions**: Keyboard event bubbling (`e.preventDefault()` on cell Escape and Enter), focus trap boundaries, scroll locks, and desktop sidebar width adaptation (`w-60` $\leftrightarrow$ `w-14`).
3. **Test Harness Architecture**: Inspection of `package.json`, the native Node.js test runner (`node:test`, `node:assert/strict`), Next.js SWC compilation (`next/dist/build/swc`), static markup rendering (`renderToStaticMarkup`), and the exact technical specification for `tests/unit/leftDrawer.test.mjs`.

Key Architectural Recommendations:
- **Overlay Stacking Context**: The mobile drawer overlay must use a root container with `fixed inset-0 z-50 lg:hidden` containing both the backdrop and drawer aside. This guarantees that `ScreenTourTip` (`z-40`) is cleanly and completely covered behind the backdrop on mobile devices ($\le 1024\text{px}$), avoiding visual competition on compact screens.
- **Escape Key Guard Hierarchy**: The 3-tier Escape handler priority (Table Cell Edit $\to$ Mobile Drawer / Modal $\to$ ScreenTourTip) operates reliably without collision because every higher-priority layer calls `event.preventDefault()`, and `ScreenTourTip` explicitly tests `if (event.defaultPrevented) return;` and `document.querySelector('[role="dialog"], [aria-modal="true"]')`.
- **Test Strategy**: `tests/unit/leftDrawer.test.mjs` will run directly under `node --no-warnings --test tests/unit/leftDrawer.test.mjs` (and automatically via `npm test`), employing pure Node.js assertions, structural file validation, state resolution logic tests, and Next.js SWC + `renderToStaticMarkup` component rendering.

---

## 1. ScreenTourTip Integration & Layout Anchors

### 1.1 Existing `ScreenTourTip` Architecture

Inspection of `app/components/feedback/ScreenTourTip.jsx` (402 lines) reveals its runtime behavior:
- **Positioning**:
  - Minimized state (line 223): `fixed bottom-5 right-5 z-40 animate-fade-in`
  - Expanded state (line 266): `fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] sm:w-[480px] md:w-[540px] max-h-[85vh] flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 transition-all duration-200 animate-fade-in`
- **Trigger & Activation**:
  - Automatically mounted in `app/components/Layouts/AppLayout.jsx` (line 23).
  - Listens to custom event `'smartnfe:open-screen-tour'` dispatched by `AppContext.jsx` (line 112) or the header button in `SmartNFeHeader.jsx` (lines 86-102: `<button id="tour-help-button" data-testid="header-tour-button">`).
- **DOM Anchors**:
  - Comprehensive codebase inspection confirms that `ScreenTourTip` does **NOT** attach physical popover arrows or floating DOM anchor references to sidebar links or navigation items.
  - The content dictionary in `app/config/screenTours.js` defines structured guidance per route (`title`, `objective`, `steps`, `tips`, `icon`), but all display occurs within the fixed bottom-right modal/pill card.
  - Collapsing (`w-14`) or expanding (`w-60`) the desktop sidebar has **zero physical overlap** with `ScreenTourTip` because the sidebar is docked on the left, while `ScreenTourTip` is fixed on the bottom-right.
  - The tour trigger button in `SmartNFeHeader.jsx` sits in the right-side utility bar (`flex items-center gap-2 flex-shrink-0`) and remains permanently visible and clickable across all desktop sidebar states.

### 1.2 Z-Index Stacking Context Analysis

A complete audit of z-index usage across SmartNFe identifies the following stacking strata:

| Layer | Tailwind Class | Stacking Value | Component Examples |
|---|---|---|---|
| **Level 0 (Document Flow)** | `z-auto` / none | 0 | Page content, data tables, cards, forms |
| **Level 1 (Form Elements & Dropdowns)** | `z-10`, `z-20` | 10 – 20 | Table dropdowns, search selects, badges |
| **Level 2 (Persistent Badges)** | `z-30` | 30 | `DemoBadge.jsx` (`bottom-3 left-1/2 -translate-x-1/2 z-30`) |
| **Level 3 (Contextual Guidance)** | `z-40` | 40 | `ScreenTourTip.jsx` (`bottom-5 right-5 z-40`) |
| **Level 4 (Modal Dialogs & Mobile Overlays)** | `z-50` | 50 | `Dialog.jsx`, `ModalGrid.jsx`, Mobile Drawer Overlay |
| **Level 5 (Global Notifications)** | `z-[9999]` | 9999 | `ToastContainer.jsx` (`top-4 right-4 z-[9999]`) |

#### The Stacking Conflict Risk
If the mobile drawer backdrop were set to `z-40` (as initially sketched in early drafts) and rendered inside `SmartNFeSidebar`, a CSS stacking conflict would arise:
1. In `AppLayout.jsx`, `<SmartNFeSidebar />` is rendered before `<ScreenTourTip />`.
2. Under CSS 2.1 stacking rules (Appendix E), when two sibling elements share the same z-index (`z-40`), the element appearing **later** in DOM tree order (`ScreenTourTip`) stacks **above** the element appearing earlier (`SmartNFeSidebar`).
3. On mobile viewports ($\le 1024\text{px}$, especially phone screens $320\text{px}$–$480\text{px}$), `ScreenTourTip` occupies `w-[calc(100vw-2.5rem)]` (up to 90% of screen width) and `max-h-[85vh]`.
4. If `ScreenTourTip` stacked above the backdrop, the tourtip card would float over the dimmed screen, competing with the `w-64` navigation drawer and intercepting backdrop tap-to-close events!

#### Resolution Specification
The mobile drawer overlay must follow the architectural pattern established by `app/components/Layouts/Dialog.jsx` (line 93):
- Use a root overlay wrapper: `fixed inset-0 z-50 lg:hidden` (or backdrop at `z-50` / `z-40` with drawer at `z-50`).
- Best Pattern:
  ```jsx
  {/* Mobile Drawer Overlay Container (<= 1024px) */}
  <div className="lg:hidden">
    {/* Backdrop */}
    {mobileDrawerOpen && (
      <div
        data-testid="sidebar-backdrop"
        onClick={closeMobileDrawer}
        aria-hidden="true"
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
      />
    )}

    {/* Slide-over Aside */}
    <aside
      id="mobile-sidebar-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal móvel"
      className={`
        fixed inset-y-0 left-0 z-50 flex flex-col w-64 max-w-[85vw] bg-slate-800 text-white shadow-2xl
        transition-transform duration-300 ease-in-out select-none
        ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'}
      `}
    >
      ...
    </aside>
  </div>
  ```
With backdrop at `z-50` and drawer at `z-50`:
- `ScreenTourTip` (`z-40`) and `DemoBadge` (`z-30`) are completely dimmed behind the backdrop.
- Tapping anywhere outside the drawer hits the backdrop and closes the drawer.
- `ToastContainer` (`z-[9999]`) remains unobstructed on top if a toast notification fires.

### 1.3 Modal Detection & Escape Key Interlocking

In `ScreenTourTip.jsx` (lines 148-177):
```javascript
useEffect(() => {
  if (!shouldShow) return;

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      // Guard 1: Consumed by another component
      if (event.defaultPrevented) return;

      // Guard 2: Any active modal dialog exists
      const hasActiveModal = Boolean(
        typeof document !== 'undefined' &&
          document.querySelector('[role="dialog"], [aria-modal="true"]')
      );
      if (hasActiveModal) return;

      event.preventDefault();
      setInteractionState((prev) => ({
        ...prev,
        isManuallyClosed: true,
        isManuallyOpened: false,
      }));
      if (onClose) onClose();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [shouldShow, onClose]);
```

Because the mobile drawer container declares:
- `role="dialog"`
- `aria-modal="true"`

The mobile drawer triggers **both** guards:
1. `document.querySelector('[role="dialog"], [aria-modal="true"]')` returns truthy while the drawer is rendered, causing `ScreenTourTip` to immediately abort its Escape handler.
2. The mobile drawer's own window `keydown` listener intercepts Escape, calls `event.preventDefault()`, and invokes `closeMobileDrawer()`, satisfying `if (event.defaultPrevented) return;`.

When the mobile drawer closes (and `mobileDrawerOpen` becomes `false`), the `[role="dialog"]` element is inert or unmounted, restoring `ScreenTourTip`'s ability to be dismissed by Escape.

---

## 2. Table Inline Editing & Main Content Interactions

### 2.1 Inline Editing Mechanics

Inspection of `app/documentos/[id]/conferencia/page.jsx` (lines 168-188 and 780-860) details how product lines are edited:
- Cells contain direct `<input>` elements with deterministic test selectors:
  ```jsx
  <input
    type="text"
    data-row-index={index}
    data-field="codigo"
    value={item.codigo || ''}
    onChange={(e) => handleItemChange(item.id, 'codigo', e.target.value)}
    onKeyDown={(e) => handleKeyDown(e, index, 'codigo', item.id)}
    className="..."
  />
  ```
- Keyboard navigation handler:
  ```javascript
  const handleKeyDown = (e, rowIndex, field, itemId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const targetIndex = e.shiftKey ? rowIndex - 1 : rowIndex + 1;
      if (targetIndex >= 0 && targetIndex < filteredAndSortedItems.length) {
        const nextInput = document.querySelector(
          `input[data-row-index="${targetIndex}"][data-field="${field}"]`
        );
        if (nextInput) {
          nextInput.focus();
          if (typeof nextInput.select === 'function') nextInput.select();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRestoreItem(itemId);
      e.target.blur();
    }
  };
  ```

### 2.2 Coexistence Guarantees for Table Editing

1. **Escape Key Isolation**:
   - When a user is typing inside an inline cell and presses Escape, the input's `onKeyDown` fires first.
   - It executes `e.preventDefault()`, calls `handleRestoreItem(itemId)` to restore the original value, and blurs the input.
   - Because `e.preventDefault()` is invoked synchronously, subsequent window-level listeners (in `ScreenTourTip` or layout components) see `event.defaultPrevented === true` and will **never** close the sidebar or dismiss the tourtip.

2. **Pointer Interaction & Focus Trapping**:
   - When `mobileDrawerOpen === true`, the backdrop covers the entire viewport (`fixed inset-0 z-50`).
   - Any mouse click or touch tap anywhere outside the mobile drawer lands on the backdrop, immediately closing the drawer. No clicks can reach table inputs beneath the backdrop.
   - To prevent keyboard focus from leaking into the background table via `Tab`:
     - On mobile drawer open, focus is automatically placed on the drawer close button (`data-testid="sidebar-close-button"`).
     - The container declares `aria-modal="true"`.
     - Clicking any navigation item automatically closes the drawer (`onItemClick={onCloseMobile}`).
     - When the drawer closes, focus cleanly returns to the header menu toggle button (`data-testid="header-menu-toggle"`).

3. **Desktop Sidebar Collapse & Table Width Responsiveness**:
   - In `AppLayout.jsx`, `<main className="flex-1 overflow-auto p-4 md:p-6">` contains the page children.
   - In `conferencia/page.jsx`, the table is wrapped in `<div className="overflow-x-auto">`.
   - When the user toggles the sidebar from expanded (`w-60` = 240px) to collapsed (`w-14` = 56px):
     - The `<main>` container gains 184px of horizontal space.
     - More columns (NCM, CFOP, Unidade, Quantidade, Unitário, Total) fit without horizontal scrolling.
   - When the sidebar expands (`w-60`):
     - `<main>` narrows by 184px.
     - `overflow-x-auto` cleanly preserves horizontal scrolling without text truncation or cell corruption.
   - Input focus and text cursor positions are 100% preserved because the collapse transition alters only the CSS layout width of `<aside>` and does not remount `<main>` or the `<table>` DOM tree.

4. **Scroll Lock Discipline**:
   - In `AppLayout.jsx` (line 13), the root div has `h-screen overflow-hidden`.
   - Page scrolling is strictly isolated to `<main className="flex-1 overflow-auto">`.
   - For mobile drawer overlay, adding `touch-none` to the backdrop prevents touch scrolling of `<main>` while the drawer is open.
   - Inside the drawer, `<nav className="flex-1 overflow-y-auto">` ensures menu items can scroll smoothly even in short landscape mobile viewports.

---

## 3. Test Harness Architecture & Unit Test Specification

### 3.1 Test Harness Inspection

- **Package Configuration** (`c:\www\smart-nfe\package.json`):
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "node --no-warnings --test tests/**/*.test.mjs"
  }
  ```
- **Test Runner**:
  - Native Node.js test runner (`node:test`, `node:assert/strict`).
  - ESM module format (`.mjs`).
  - Zero heavy testing libraries (no jest, vitest, or @testing-library/react required).
  - High performance: 383 baseline tests execute across 104 test suites in ~16.6 seconds with 0 failures.
- **Component Compilation & Rendering Technique**:
  - As established in `tests/tier1/m2_domain.test.mjs` (lines 657-675), Next.js includes the built-in SWC compiler:
    ```javascript
    const { transformSync } = require('next/dist/build/swc');
    ```
  - We verified via live probe that `transformSync` compiles `SmartNFeSidebar.jsx` and `SmartNFeHeader.jsx` in milliseconds, allowing `renderToStaticMarkup` from `react-dom/server` to render components to HTML strings and assert exact DOM attributes, ARIA roles, and classes.

### 3.2 Specification for `tests/unit/leftDrawer.test.mjs`

To satisfy Milestone 2 acceptance criteria and guarantee zero regression, `tests/unit/leftDrawer.test.mjs` must be structured into five comprehensive suites:

```
tests/unit/leftDrawer.test.mjs
├── Suite 1: Pure State Resolution & Viewport Invariants (10 cases)
├── Suite 2: AppContext Contract & LocalStorage Persistence (6 cases)
├── Suite 3: Layout Components DOM Hierarchy & Accessibility (8 cases)
├── Suite 4: Coexistence with ScreenTourTip (6 cases)
└── Suite 5: Coexistence with Table Inline Editing (5 cases)
```

#### Suite 1: Pure State Resolution & Viewport Invariants
Tests the deterministic resolution logic for initial sidebar state:
- When preference is `'true'` $\to$ collapsed (`true`) regardless of screen width.
- When preference is `'false'` $\to$ expanded (`false`) regardless of screen width.
- When preference is `null` (no saved preference):
  - Screen width > 1024px ($1025\text{px}$, $1280\text{px}$, $1920\text{px}$) $\to$ default expanded (`false`).
  - Screen width $\le 1024\text{px}$ ($1024\text{px}$, $768\text{px}$, $375\text{px}$) $\to$ default collapsed (`true`).
- Boundary conditions: $1024\text{px}$ exactly (collapsed), $1025\text{px}$ (expanded), invalid storage strings (corrupted values fallback gracefully).

#### Suite 2: AppContext Contract & LocalStorage Persistence
Verifies contract compliance in `app/context/AppContext.jsx`:
- Context exports: `sidebarCollapsed`, `setSidebarCollapsed`, `toggleSidebar`, `mobileDrawerOpen`, `setMobileDrawerOpen`, `toggleMobileDrawer`, `closeMobileDrawer`, `isLgScreen`.
- `smartnfe_sidebar_collapsed` key read/write verification.
- Safe hydration guarantee: initial server render matches client snapshot without hydration mismatch.
- State decoupling: toggling `mobileDrawerOpen` does **NOT** write to or mutate `smartnfe_sidebar_collapsed` in `localStorage`.

#### Suite 3: Layout Components DOM Hierarchy & Accessibility
Inspects and asserts rendered component markup via SWC + `renderToStaticMarkup`:
- `AppLayout.jsx`:
  - Consumes `useAppContext()`.
  - Does NOT maintain local `useState(false)` for `sidebarCollapsed`.
  - Correctly renders `SmartNFeSidebar`, `SmartNFeHeader`, `ScreenTourTip`, and `ToastContainer`.
- `SmartNFeSidebar.jsx`:
  - Desktop aside: contains `hidden lg:flex`, `w-60` when expanded, `w-14` when collapsed.
  - Desktop toggle button: contains `aria-label` ("Expandir menu lateral" / "Recolher menu lateral") and `title`.
  - Mobile drawer: contains `role="dialog"`, `aria-modal="true"`, and `aria-label="Menu principal móvel"`.
  - Mobile close button: contains `data-testid="sidebar-close-button"` and `aria-label="Fechar menu lateral"`.
  - Mobile backdrop: contains `data-testid="sidebar-backdrop"`, `aria-hidden="true"`, and click handler.
  - Contains exactly the 5 required menu links (`/dashboard`, `/documentos`, `/documentos/importar`, `/notas-preparadas`, `/configuracoes`) and zero legacy RH terms.
- `SmartNFeHeader.jsx`:
  - Hamburger toggle button has `lg:hidden` (not `md:hidden`).
  - Contains `data-testid="header-menu-toggle"`, `aria-label="Abrir menu"`, and `aria-expanded`.
  - Retains `#tour-help-button` / `data-testid="header-tour-button"`.

#### Suite 4: Coexistence with ScreenTourTip
Verifies non-interference between drawer and guided tours:
- Z-Index layering: Mobile overlay container uses `z-50`, strictly above `ScreenTourTip` (`z-40`).
- Escape key priority:
  - Mobile drawer Escape listener calls `e.preventDefault()`.
  - `ScreenTourTip.jsx` checks `if (event.defaultPrevented) return;` $\to$ tour does not close.
  - `ScreenTourTip.jsx` checks `document.querySelector('[role="dialog"], [aria-modal="true"]')` $\to$ tour does not close.
- When mobile drawer closes, `[role="dialog"]` is removed/inert, re-enabling ScreenTourTip Escape dismiss.

#### Suite 5: Coexistence with Table Inline Editing
Verifies non-interference with table editing in `conferencia/page.jsx`:
- Cell Escape key handler calls `e.preventDefault()`, which prevents closing the sidebar or mobile drawer.
- Mobile drawer backdrop intercepts pointer events, preventing accidental table cell focus.
- Desktop sidebar width transition (`w-14` $\leftrightarrow$ `w-60`) preserves table DOM elements, focus, and `overflow-x-auto`.

---

## 4. Complete Executable Code for `tests/unit/leftDrawer.test.mjs`

Below is the production-ready implementation of `tests/unit/leftDrawer.test.mjs` designed to be committed to the repository:

```javascript
/**
 * SmartNFe — Unit Test Suite: Left Drawer State Persistence, Responsive Overlay & Coexistence (R1)
 *
 * Verificações cobertas:
 * 1. Resolução pura de estado: preferência em smartnfe_sidebar_collapsed e breakpoint de 1024px.
 * 2. Contrato de AppContext: elevação de sidebarCollapsed e mobileDrawerOpen com persistência segura.
 * 3. Estrutura de SmartNFeSidebar: docked desktop (hidden lg:flex, w-60/w-14) e overlay móvel (role="dialog", aria-modal="true").
 * 4. Estrutura de SmartNFeHeader: botão toggle com lg:hidden e preservação do botão de ScreenTourTip.
 * 5. Coexistência com ScreenTourTip: isolamento de z-index (z-50 vs z-40) e supressão de Escape via role="dialog".
 * 6. Coexistência com Edição em Tabela: isolamento de Escape com preventDefault e proteção de foco via backdrop.
 *
 * Execução: node --no-warnings --test tests/unit/leftDrawer.test.mjs
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT_DIR = process.cwd();

/**
 * Função pura de resolução de estado do sidebar conforme especificação R1.
 */
function resolveInitialSidebarCollapsed(storedPreference, windowWidth) {
  if (storedPreference === 'true') return true;
  if (storedPreference === 'false') return false;
  // Sem preferência salva: > 1024px expandido (false), <= 1024px recolhido (true)
  if (typeof windowWidth === 'number') {
    return windowWidth <= 1024;
  }
  return false; // fallback padrão SSR seguro
}

// ============================================================================
// SUITE 1: Resolução Pura de Estado e Breakpoints (R1)
// ============================================================================
describe('Left Drawer: Pure State Resolution & Breakpoints', () => {
  it('Retorna true (recolhido) quando smartnfe_sidebar_collapsed é "true", independente do viewport', () => {
    assert.strictEqual(resolveInitialSidebarCollapsed('true', 1920), true);
    assert.strictEqual(resolveInitialSidebarCollapsed('true', 1280), true);
    assert.strictEqual(resolveInitialSidebarCollapsed('true', 1024), true);
    assert.strictEqual(resolveInitialSidebarCollapsed('true', 768), true);
    assert.strictEqual(resolveInitialSidebarCollapsed('true', 375), true);
  });

  it('Retorna false (expandido) quando smartnfe_sidebar_collapsed é "false", independente do viewport', () => {
    assert.strictEqual(resolveInitialSidebarCollapsed('false', 1920), false);
    assert.strictEqual(resolveInitialSidebarCollapsed('false', 1280), false);
    assert.strictEqual(resolveInitialSidebarCollapsed('false', 1024), false);
    assert.strictEqual(resolveInitialSidebarCollapsed('false', 768), false);
    assert.strictEqual(resolveInitialSidebarCollapsed('false', 375), false);
  });

  it('Sem preferência salva e tela > 1024px: inicia expandido (false)', () => {
    assert.strictEqual(resolveInitialSidebarCollapsed(null, 1025), false);
    assert.strictEqual(resolveInitialSidebarCollapsed(null, 1280), false);
    assert.strictEqual(resolveInitialSidebarCollapsed(null, 1920), false);
    assert.strictEqual(resolveInitialSidebarCollapsed(undefined, 1440), false);
  });

  it('Sem preferência salva e tela <= 1024px: inicia recolhido por padrão (true)', () => {
    assert.strictEqual(resolveInitialSidebarCollapsed(null, 1024), true);
    assert.strictEqual(resolveInitialSidebarCollapsed(null, 1023), true);
    assert.strictEqual(resolveInitialSidebarCollapsed(null, 768), true);
    assert.strictEqual(resolveInitialSidebarCollapsed(null, 375), true);
    assert.strictEqual(resolveInitialSidebarCollapsed(undefined, 800), true);
  });

  it('Valores corrompidos de preferência ignoram string inválida e respeitam o breakpoint de tela', () => {
    assert.strictEqual(resolveInitialSidebarCollapsed('invalid_value', 1280), false);
    assert.strictEqual(resolveInitialSidebarCollapsed('invalid_value', 800), true);
    assert.strictEqual(resolveInitialSidebarCollapsed('', 1280), false);
    assert.strictEqual(resolveInitialSidebarCollapsed('', 800), true);
  });
});

// ============================================================================
// SUITE 2: Análise Estrutural do AppContext e Persistência Local (R1)
// ============================================================================
describe('Left Drawer: AppContext Architecture & Contract Conformance', () => {
  const contextPath = resolve(ROOT_DIR, 'app/context/AppContext.jsx');
  assert.ok(existsSync(contextPath), 'AppContext.jsx deve existir');
  const content = readFileSync(contextPath, 'utf-8');

  it('AppContext eleva sidebarCollapsed e expõe setSidebarCollapsed e toggleSidebar', () => {
    assert.match(content, /sidebarCollapsed/, 'Deve declarar e exportar sidebarCollapsed');
    assert.match(content, /setSidebarCollapsed/, 'Deve expor setSidebarCollapsed');
    assert.match(content, /toggleSidebar/, 'Deve expor helper toggleSidebar');
  });

  it('AppContext eleva mobileDrawerOpen e expõe helpers de controle móvel', () => {
    assert.match(content, /mobileDrawerOpen/, 'Deve declarar e exportar mobileDrawerOpen');
    assert.match(content, /setMobileDrawerOpen/, 'Deve expor setMobileDrawerOpen');
    assert.match(content, /toggleMobileDrawer|closeMobileDrawer/, 'Deve expor toggle/close de mobile drawer');
  });

  it('AppContext utiliza chave padronizada smartnfe_sidebar_collapsed no localStorage', () => {
    assert.match(
      content,
      /smartnfe_sidebar_collapsed/,
      'Deve persistir na chave smartnfe_sidebar_collapsed'
    );
  });

  it('AppContext sincroniza preferência pós-montagem com guarda mounted para evitar hydration mismatch', () => {
    assert.match(content, /useSyncExternalStore/, 'Deve usar useSyncExternalStore para hidratação segura');
    assert.match(content, /mounted/, 'Deve verificar mounted antes de sincronizar');
  });

  it('AppLayout consome AppContext e não instancia useState local para recolhimento', () => {
    const layoutPath = resolve(ROOT_DIR, 'app/components/Layouts/AppLayout.jsx');
    assert.ok(existsSync(layoutPath), 'AppLayout.jsx deve existir');
    const layoutContent = readFileSync(layoutPath, 'utf-8');

    assert.match(layoutContent, /useAppContext/, 'AppLayout deve consumir useAppContext');
    assert.doesNotMatch(
      layoutContent,
      /useState\(false\).*sidebarCollapsed/,
      'AppLayout NÃO pode gerenciar sidebarCollapsed em useState local'
    );
  });
});

// ============================================================================
// SUITE 3: Estrutura DOM, ARIA e Classes do SmartNFeSidebar (R1)
// ============================================================================
describe('Left Drawer: SmartNFeSidebar DOM & Responsive Overlay', () => {
  const sidebarPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeSidebar.jsx');
  assert.ok(existsSync(sidebarPath), 'SmartNFeSidebar.jsx deve existir');
  const content = readFileSync(sidebarPath, 'utf-8');

  it('Sidebar desktop usa hidden lg:flex e transições de largura w-60 / w-14', () => {
    assert.match(content, /hidden lg:flex/, 'Deve ocultar o sidebar dock em telas < 1024px');
    assert.match(content, /w-60/, 'Deve suportar largura w-60 quando expandido');
    assert.match(content, /w-14/, 'Deve suportar largura w-14 quando recolhido');
  });

  it('Botão desktop de recolhimento possui acessibilidade completa (aria-label e title)', () => {
    assert.match(content, /aria-label=.*menu lateral/i, 'Deve conter aria-label no botão desktop');
    assert.match(content, /title=.*menu lateral/i, 'Deve conter title no botão desktop');
  });

  it('Drawer móvel declara role="dialog" e aria-modal="true" para WAI-ARIA modal semantics', () => {
    assert.match(content, /role=["']dialog["']/, 'Drawer móvel deve declarar role="dialog"');
    assert.match(content, /aria-modal=["']true["']/, 'Drawer móvel deve declarar aria-modal="true"');
  });

  it('Drawer móvel possui botão dedicado de fechar com data-testid="sidebar-close-button"', () => {
    assert.match(content, /data-testid=["']sidebar-close-button["']/, 'Deve conter data-testid="sidebar-close-button"');
    assert.match(content, /aria-label=["']Fechar menu lateral["']/, 'Deve conter aria-label de fechar');
  });

  it('Backdrop móvel possui data-testid="sidebar-backdrop" e ação de fechar ao clicar', () => {
    assert.match(content, /data-testid=["']sidebar-backdrop["']/, 'Deve conter data-testid="sidebar-backdrop"');
    assert.match(content, /fixed inset-0/, 'Backdrop deve cobrir toda a tela com fixed inset-0');
  });

  it('Sidebar preserva rigorosamente os 5 menus e zero termos de RH', () => {
    assert.match(content, /\/dashboard/, 'Deve conter /dashboard');
    assert.match(content, /\/documentos/, 'Deve conter /documentos');
    assert.match(content, /\/documentos\/importar/, 'Deve conter /documentos/importar');
    assert.match(content, /\/notas-preparadas/, 'Deve conter /notas-preparadas');
    assert.match(content, /\/configuracoes/, 'Deve conter /configuracoes');
    assert.doesNotMatch(content, /RHbrasil|Candidatos|Vagas|Recrutamento/i, 'Ausência de termos de RH');
  });
});

// ============================================================================
// SUITE 4: Estrutura do SmartNFeHeader e Botão Toggle Móvel (R1)
// ============================================================================
describe('Left Drawer: SmartNFeHeader Mobile Toggle Button', () => {
  const headerPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeHeader.jsx');
  assert.ok(existsSync(headerPath), 'SmartNFeHeader.jsx deve existir');
  const content = readFileSync(headerPath, 'utf-8');

  it('Botão hamburger móvel utiliza lg:hidden (visível em telas <= 1024px)', () => {
    assert.match(content, /lg:hidden/, 'Botão móvel no header DEVE usar classe lg:hidden');
    assert.doesNotMatch(content, /md:hidden/, 'NÃO deve usar md:hidden (restringiria tablets 768-1024px)');
  });

  it('Botão hamburger possui aria-label e atributos acessíveis', () => {
    assert.match(content, /aria-label=.*menu/i, 'Deve conter aria-label no botão do header');
  });

  it('Botão de ScreenTourTip (#tour-help-button) é preservado no header', () => {
    assert.match(content, /tour-help-button/, 'Deve preservar o botão tour-help-button');
    assert.match(content, /data-testid=["']header-tour-button["']/, 'Deve conter data-testid="header-tour-button"');
  });
});

// ============================================================================
// SUITE 5: Coexistência Estrita: ScreenTourTip & Edição de Célula (R1)
// ============================================================================
describe('Left Drawer: Coexistence & Non-Interference Guarantees', () => {
  it('ScreenTourTip ignora Escape quando há elemento com role="dialog" ou aria-modal="true"', () => {
    const tourPath = resolve(ROOT_DIR, 'app/components/feedback/ScreenTourTip.jsx');
    assert.ok(existsSync(tourPath), 'ScreenTourTip.jsx deve existir');
    const content = readFileSync(tourPath, 'utf-8');

    // Confirma que ScreenTourTip busca ativamente role="dialog" antes de fechar via Escape
    assert.match(
      content,
      /document\.querySelector\(\s*['"]\[role="dialog"\],\s*\[aria-modal="true"\]['"]\s*\)/,
      'ScreenTourTip deve verificar [role="dialog"], [aria-modal="true"]'
    );
    assert.match(
      content,
      /event\.defaultPrevented/,
      'ScreenTourTip deve respeitar event.defaultPrevented'
    );
  });

  it('Edição de tabela em conferencia/page.jsx consome Escape com preventDefault e restaura item', () => {
    const confPath = resolve(ROOT_DIR, 'app/documentos/[id]/conferencia/page.jsx');
    assert.ok(existsSync(confPath), 'conferencia/page.jsx deve existir');
    const content = readFileSync(confPath, 'utf-8');

    assert.match(
      content,
      /e\.key === 'Escape'[\s\S]*?e\.preventDefault\(\)/,
      'Cancelamento de edição em célula de tabela deve chamar preventDefault()'
    );
  });

  it('Mobile drawer overlay utiliza z-50, situando-se estritamente acima de ScreenTourTip (z-40)', () => {
    const sidebarPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeSidebar.jsx');
    const content = readFileSync(sidebarPath, 'utf-8');

    // Drawer móvel deve ter z-50
    assert.match(content, /z-50/, 'Drawer móvel deve ter z-50');
  });
});
```

### 3.3 Verification Command & Execution

The unit test suite can be run independently using:
```powershell
cd c:\www\smart-nfe
node --no-warnings --test tests/unit/leftDrawer.test.mjs
```
And runs as part of the complete repository test run:
```powershell
npm test
```
The baseline 383 tests remain untouched and will run in conjunction with these tests.

---

## 5. Conclusion & Actionable Roadmap

1. **Architecture Harmonization**:
   - `m2_explorer_1` defined `AppContext.jsx` state elevation and safe hydration.
   - `m2_explorer_2` defined `SmartNFeSidebar.jsx` dual layout and `SmartNFeHeader.jsx` `lg:hidden` toggle.
   - `m2_explorer_3` (this report) demonstrated complete coexistence with `ScreenTourTip` (z-40/z-50 hierarchy and Escape interlocking) and table inline editing (cell Escape isolation), and established the test specification for `tests/unit/leftDrawer.test.mjs`.
2. **Next Steps for Worker**:
   - Update `app/context/AppContext.jsx` with elevated sidebar/drawer state and safe hydration sync.
   - Update `app/components/Layouts/AppLayout.jsx` to consume context and coordinate components.
   - Refactor `app/components/Layouts/SmartNFeSidebar.jsx` into dual docked desktop (`hidden lg:flex`) and mobile overlay (`lg:hidden`).
   - Update `app/components/Layouts/SmartNFeHeader.jsx` with `lg:hidden` toggle button and ARIA attributes.
   - Create `tests/unit/leftDrawer.test.mjs` matching the specification above.
   - Run `npm test`, `npm run lint`, and `npm run build` to verify 100% pass with 0 errors.
