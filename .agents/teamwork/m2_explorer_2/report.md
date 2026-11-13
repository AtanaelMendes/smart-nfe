# Investigation Report: SmartNFeSidebar & SmartNFeHeader Architecture (Milestone 2 / R1)

**Author**: `m2_explorer_2` (teamwork_explorer)  
**Date**: 2026-11-13  
**Target Milestone**: Milestone 2 — Left Drawer & Responsive Layout (R1)  
**Working Directory**: `c:\www\smart-nfe`  
**State Folder**: `c:\www\smart-nfe\.agents\teamwork\m2_explorer_2\`  

---

## Executive Summary

This investigation report provides a comprehensive architectural analysis and concrete specification for `app/components/Layouts/SmartNFeSidebar.jsx` and `app/components/Layouts/SmartNFeHeader.jsx` in `c:\www\smart-nfe`. 

Key findings:
1. **Current Sidebar Limitations**: `SmartNFeSidebar.jsx` is rendered as an inline flex child (`aside.flex.flex-col`) that shifts between `w-14` (56px) and `w-60` (240px). On mobile and tablet viewports ($\le 1024\text{px}$), it remains in the normal document flow, severely cramping content without providing an overlay drawer or backdrop.
2. **Header Breakpoint Mismatch**: In `SmartNFeHeader.jsx`, the mobile menu toggle button uses `md:hidden` (`< 768px`). Between 768px and 1024px (tablets, iPad landscape, compact laptops), the toggle button is completely hidden, locking users out of navigation. It must be updated to `lg:hidden` (`< 1024px`), with full WAI-ARIA attributes (`aria-expanded`, `aria-controls`, `aria-label`).
3. **Mobile Drawer Overlay Requirements ($\le 1024\text{px}$)**: A slide-over drawer (`fixed inset-y-0 left-0 z-50 w-64`) with a dimmed backdrop (`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs`), dedicated close button (`X`), global `Escape` key listener invoking `e.preventDefault()`, and body scroll lock.
4. **Seamless Coexistence**: Desktop collapse (`sidebarCollapsed`, persisted in `localStorage`) and mobile drawer (`mobileDrawerOpen`, transient memory state) are strictly decoupled. When viewports resize above 1024px, the mobile drawer automatically closes. The mobile drawer's `role="dialog"`, `aria-modal="true"`, and `e.preventDefault()` on Escape prevent unintended dismissal of `ScreenTourTip` or interference with inline table editing.

---

## 1. Current Sidebar DOM Structure, Styling Classes & Collapse Transitions

### 1.1 DOM Hierarchy in `SmartNFeSidebar.jsx`

Direct inspection of `app/components/Layouts/SmartNFeSidebar.jsx` (lines 72-124):

```html
<aside class="flex flex-col bg-slate-800 text-white transition-all duration-200 flex-shrink-0 select-none ${collapsed ? 'w-14' : 'w-60'}" aria-label="Menu principal">
  <!-- 1. Header / Logo Brand -->
  <div class="flex items-center border-b border-slate-700 h-12 ${collapsed ? 'justify-center px-2' : 'px-4 gap-2'}">
    <div class="flex items-center justify-center w-7 h-7 bg-blue-600 rounded-md flex-shrink-0">
      <FontAwesomeIcon icon={faFileInvoice} class="w-4 h-4 text-white" />
    </div>
    {!collapsed && <span class="font-bold text-base tracking-tight text-white">SmartNFe</span>}
  </div>

  <!-- 2. Scrollable Navigation List -->
  <nav class="flex-1 overflow-y-auto py-3 px-2">
    <ul class="space-y-1">
      <!-- 5 Menu Items (NavItem) -->
    </ul>
  </nav>

  <!-- 3. Desktop Footer Toggle Button -->
  <div class="border-t border-slate-700 p-2">
    <button onClick={onToggle} title={...} aria-label={...} class="w-full flex items-center justify-center py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
      <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} class="w-3 h-3" />
      {!collapsed && <span class="ml-2 text-xs">Recolher</span>}
    </button>
  </div>
</aside>
```

### 1.2 Layout & Styling Analysis

| Component Section | Tailwind Classes | Visual / Functional Role |
|---|---|---|
| **Root `<aside>`** | `flex flex-col bg-slate-800 text-white transition-all duration-200 flex-shrink-0 select-none` | Vertical container with slate-800 background, prevents flex shrinking, smooth 200ms width transition. |
| **Width Modes** | Expanded: `w-60` (240px / 15rem)<br>Collapsed: `w-14` (56px / 3.5rem) | Matches CSS variables `--sidebar-width: 240px` and `--sidebar-collapsed-width: 56px` in `globals.css`. |
| **Brand / Logo** | `h-12 border-b border-slate-700` | Fixed 48px height matching `SmartNFeHeader` (`h-12`). Contains 28px blue square icon badge (`w-7 h-7 bg-blue-600 rounded-md`) with `faFileInvoice`. |
| **Brand Text** | `font-bold text-base tracking-tight text-white` | Rendered conditionally (`{!collapsed && ...}`). |
| **Navigation `<nav>`** | `flex-1 overflow-y-auto py-3 px-2` | Vertically elastic, enables scrolling if screen height is constrained. |
| **List Container `<ul>`** | `space-y-1` | 4px vertical gap between navigation buttons. |
| **Bottom Toggle Footer** | `border-t border-slate-700 p-2` | Contains full-width button with `faChevronLeft` (expanded) or `faChevronRight` (collapsed). |

### 1.3 NavItem Architecture

```javascript
function NavItem({ item, collapsed, pathname, onItemClick }) {
  const isCurrent = pathname === item.href;
  const isNestedDocument =
    item.href === '/documentos' &&
    pathname.startsWith('/documentos/') &&
    pathname !== '/documentos/importar';
  const isActive = isCurrent || isNestedDocument;

  return (
    <li>
      <Link
        href={item.href}
        title={collapsed ? item.label : ''}
        onClick={onItemClick}
        className={`
          flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150
          ${isActive
            ? 'bg-blue-700 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <FontAwesomeIcon icon={item.icon} className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );
}
```

- **Active State Detection**:
  - `isCurrent = pathname === item.href`.
  - `isNestedDocument`: highlights `/documentos` when browsing sub-routes like `/documentos/[id]/conferencia` or `/documentos/[id]/divisao`, while correctly excluding `/documentos/importar` (which has its own dedicated menu entry).
- **Styling**:
  - Active: `bg-blue-700 text-white` (solid primary blue).
  - Inactive: `text-slate-300 hover:bg-slate-700 hover:text-white` (subtle slate with high-contrast hover).
- **Collapsed Mode**:
  - `justify-center`: centers the icon.
  - Text label unmounted (`!collapsed && <span ...>`).
  - Tooltip: `title={collapsed ? item.label : ''}` allows native browser hover tooltip.

### 1.4 Menu Items Inventory & Invariants

The sidebar defines exactly 5 root menus:
1. `Dashboard` (`/dashboard`, icon: `faChartBar`)
2. `Documentos` (`/documentos`, icon: `faFileInvoice`)
3. `Importar` (`/documentos/importar`, icon: `faFileImport`)
4. `Notas Preparadas` (`/notas-preparadas`, icon: `faClipboardCheck`)
5. `Configurações` (`/configuracoes`, icon: `faGear`)

> **Invariant**: Existing test suites (`tests/tier1/m1_foundation.test.mjs` and `tests/tier5/live_dashboard_adversarial.test.mjs`) verify that `SmartNFeSidebar.jsx` contains exactly these 5 menus and zero legacy RH terms. The refactoring MUST preserve these 5 items verbatim.

---

## 2. Responsive Mobile Drawer Overlay Requirements ($\le 1024\text{px}$)

### 2.1 Viewport Breakpoint Justification
In `app/globals.css` (lines 32-38):
```css
  /* Breakpoints */
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
```
Tailwind CSS maps `lg:` to `@media (min-width: 1024px)`.
Per user requirements (ORIGINAL_REQUEST.md line 18 and SCOPE.md line 9-12):
- Above 1024px ($> 1024\text{px}$): Desktop mode with docked sidebar (`hidden lg:flex`).
- LG or lower ($\le 1024\text{px}$): Mobile mode with overlay drawer (`lg:hidden`).

### 2.2 Component Architecture: Dual-Mode `SmartNFeSidebar.jsx`

Rather than duplicating navigation menus across separate files, `SmartNFeSidebar.jsx` cleanly encapsulates both presentations:
1. **Desktop Docked Sidebar**: rendered with `hidden lg:flex`.
2. **Mobile Overlay Drawer & Backdrop**: rendered with `lg:hidden`.

```jsx
return (
  <>
    {/* 1. Desktop Docked Sidebar (>= 1024px) */}
    <aside
      className={`
        hidden lg:flex flex-col bg-slate-800 text-white transition-all duration-200 flex-shrink-0 select-none
        ${collapsed ? 'w-14' : 'w-60'}
      `}
      aria-label="Menu principal"
    >
      {/* Brand Header */}
      {/* Nav Items */}
      {/* Footer Toggle Button */}
    </aside>

    {/* 2. Mobile Drawer Overlay (<= 1024px) */}
    <div className="lg:hidden">
      {/* Dimmed Backdrop */}
      {mobileOpen && (
        <div
          data-testid="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* Slide-over Drawer Container */}
      <aside
        id="mobile-sidebar-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu principal móvel"
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col w-64 max-w-[85vw] bg-slate-800 text-white shadow-2xl transition-transform duration-300 ease-in-out select-none
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'}
        `}
      >
        {/* Mobile Header with Brand & Close Button */}
        <div className="flex items-center justify-between border-b border-slate-700 h-12 px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 bg-blue-600 rounded-md flex-shrink-0">
              <FontAwesomeIcon icon={faFileInvoice} className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">SmartNFe</span>
          </div>
          <button
            type="button"
            data-testid="sidebar-close-button"
            onClick={onCloseMobile}
            title="Fechar menu lateral"
            aria-label="Fechar menu lateral"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Navigation List (Always expanded labels) */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-1">
            {menuItems.map(item => (
              <NavItem
                key={item.href}
                item={item}
                collapsed={false}
                pathname={pathname}
                onItemClick={onCloseMobile}
              />
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  </>
);
```

### 2.3 Detailed Mobile Drawer Requirements

#### Requirement 1: Dimmed Backdrop (`click-to-close`)
- **Tag & Test ID**: `<div data-testid="sidebar-backdrop" ... />`.
- **Z-Index Layering**: `z-40` (behind the drawer `z-50`, above standard page content).
- **Styling**: `fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300`.
- **Accessibility**: `aria-hidden="true"`.
- **Behavior**: Clicking anywhere on the backdrop immediately triggers `onCloseMobile()`.

#### Requirement 2: Slide-Over Drawer Container
- **Tag & ID**: `<aside id="mobile-sidebar-drawer" ... />`.
- **ARIA Semantics**:
  - `role="dialog"`: Establishes a modal dialog container.
  - `aria-modal="true"`: Informs assistive tech that content outside is inert while open.
  - `aria-label="Menu principal móvel"`.
- **Dimensions & Positioning**: `fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw]`.
- **Slide Animation**: `transition-transform duration-300 ease-in-out`.
  - When open: `translate-x-0`.
  - When closed: `-translate-x-full pointer-events-none`.

#### Requirement 3: Explicit Close Button Inside Drawer Header
- **Tag & Test ID**: `<button type="button" data-testid="sidebar-close-button" ... />`.
- **Icon**: `faXmark` from `@fortawesome/free-solid-svg-icons`.
- **Labels**: `aria-label="Fechar menu lateral"` and `title="Fechar menu lateral"`.
- **Behavior**: Clicking invokes `onCloseMobile()`.

#### Requirement 4: Auto-Close on Navigation
- When a user taps any navigation item inside the mobile drawer (`Dashboard`, `Documentos`, `Importar`, etc.), `onItemClick` invokes `onCloseMobile()`.
- The drawer automatically slides closed as the new route renders, eliminating the need for an extra manual tap.

#### Requirement 5: Escape Key Listener (`e.preventDefault()`)
Inside `SmartNFeSidebar.jsx`:
```javascript
useEffect(() => {
  if (!mobileOpen) return;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault(); // Prevents propagation to background elements or ScreenTourTip
      e.stopPropagation();
      if (onCloseMobile) onCloseMobile();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [mobileOpen, onCloseMobile]);
```

**Why `e.preventDefault()` is mandatory**:
In `app/components/feedback/ScreenTourTip.jsx` (lines 151-163):
```javascript
if (event.key === 'Escape') {
  if (event.defaultPrevented) return;
  const hasActiveModal = Boolean(
    typeof document !== 'undefined' &&
      document.querySelector('[role="dialog"], [aria-modal="true"]')
  );
  if (hasActiveModal) return;
  // closes tour...
}
```
1. Calling `e.preventDefault()` flags the event as `defaultPrevented === true`, guaranteeing that `ScreenTourTip` will not dismiss itself when the user presses Escape to close the mobile navigation drawer.
2. The attributes `role="dialog"` and `aria-modal="true"` provide a redundant fail-safe via `hasActiveModal`.

#### Requirement 6: Body Scroll Lock
```javascript
useEffect(() => {
  if (!mobileOpen || typeof document === 'undefined') return;
  const originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = originalOverflow;
  };
}, [mobileOpen]);
```
Locks body scrolling while the mobile drawer is open to prevent background viewport jitter on touch devices.

---

## 3. Accessible Toggle Button in `SmartNFeHeader.jsx`

### 3.1 Deficiencies in Current Implementation
In `app/components/Layouts/SmartNFeHeader.jsx` (lines 48-57):
```jsx
{/* Mobile menu toggle */}
{onMenuToggle && (
  <button
    onClick={onMenuToggle}
    className="md:hidden p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
    title="Menu"
    aria-label="Abrir menu"
  >
    <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
  </button>
)}
```
1. **Breakpoint Bug (`md:hidden`)**: At screens between 768px and 1024px (tablets / iPad landscape), the button is completely hidden, but the desktop sidebar is also hidden or cramped. The button must be visible for all screens $< 1024\text{px}$ (`lg:hidden`).
2. **Missing `aria-expanded`**: Screen readers cannot announce whether the drawer is currently open or closed.
3. **Missing `aria-controls`**: Should point to `mobile-sidebar-drawer`.
4. **Static `aria-label`**: Always announces "Abrir menu" even when open.
5. **Missing `type="button"`**: Good practice in React forms/headers.

### 3.2 Target Specification for Header Toggle Button

```jsx
{/* Accessible Mobile Menu Toggle Button */}
{onMenuToggle && (
  <button
    type="button"
    data-testid="header-mobile-toggle"
    onClick={onMenuToggle}
    aria-controls="mobile-sidebar-drawer"
    aria-expanded={Boolean(mobileOpen)}
    aria-label={mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
    title={mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
    className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
  </button>
)}
```

---

## 4. Seamless Coexistence: Desktop Collapse vs Mobile Drawer Overlay

### 4.1 State Matrix & Separation of Concerns

| Attribute | Desktop Docked Mode (`> 1024px`) | Mobile Overlay Drawer (`<= 1024px`) |
|---|---|---|
| **State Variable** | `sidebarCollapsed` (`boolean`) | `mobileDrawerOpen` (`boolean`) |
| **Storage Persistence** | `localStorage.getItem('smartnfe_sidebar_collapsed')` | None (ephemeral in-memory state) |
| **Initial Value** | `false` (expanded by default unless saved) | `false` (closed by default) |
| **Trigger Controls** | Bottom button in sidebar footer (`faChevronLeft` / `faChevronRight`) | Hamburger button in `SmartNFeHeader` (`faBars`) |
| **Dismissal Controls** | Click bottom toggle button | Backdrop click, `X` button, `Escape` key, menu link click, window resize |
| **CSS Visibility** | `hidden lg:flex` | `lg:hidden` |
| **Main Content Layout** | Sibling in horizontal flex: main gets `flex-1 min-w-0` | Main gets 100% full width; drawer floats on top (`fixed z-50`) |

### 4.2 Handling Window Resize Transitions
In `AppContext.jsx`:
```javascript
useEffect(() => {
  const handleResize = () => {
    const isLg = window.innerWidth > 1024;
    setIsLgScreen(isLg);
    // If resized to desktop (> 1024px), automatically dismiss mobile drawer and backdrop
    if (isLg) {
      setMobileDrawerOpen(false);
    }
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```
- If a user opens the mobile drawer on an iPad in portrait mode (768px) and rotates to landscape or a laptop expands the viewport past 1024px:
  - `mobileDrawerOpen` is immediately set to `false`.
  - The mobile backdrop is unmounted.
  - The desktop docked sidebar takes over seamlessly with its persisted `sidebarCollapsed` width (`w-60` or `w-14`).

### 4.3 Coexistence with ScreenTourTip & Table Inline Editing

1. **`ScreenTourTip` Modal Immunity**:
   - `ScreenTourTip` checks `document.querySelector('[role="dialog"], [aria-modal="true"]')` and `event.defaultPrevented`.
   - The mobile drawer provides `role="dialog"`, `aria-modal="true"`, and calls `event.preventDefault()` on `Escape`.
   - Result: Pressing Escape while the mobile drawer is open dismisses only the drawer; `ScreenTourTip` remains visible.
2. **Table Inline Editing (`conferencia/page.jsx`)**:
   - Inline cell editing in the conference table handles Escape by executing `e.preventDefault(); handleRestoreItem(); e.target.blur();`.
   - Because it calls `e.preventDefault()`, neither the mobile drawer nor `ScreenTourTip` intercepts Escape during table cell editing.
3. **Z-Index Layer Hierarchy**:
   - Background main content & tables: `z-0` to `z-10`.
   - Header bar: `z-20` (or standard flex flow).
   - `DemoBadge`: `fixed bottom-4 left-4 z-30`.
   - `ScreenTourTip`: `fixed bottom-5 right-5 z-40`.
   - Mobile Backdrop: `fixed inset-0 z-40 bg-slate-900/60`.
   - Mobile Overlay Drawer: `fixed inset-y-0 left-0 z-50 w-64`.
   - ToastContainer: `fixed top-4 right-4 z-50`.
   - This strict layering ensures the mobile drawer is accessible without clipping, while toasts remain visible.

---

## 5. Verification & Test Plan for Worker & Challenger

The following automated checks must pass in `tests/`:

1. **Sidebar Menu Invariants**:
   - Renders exactly 5 root menus (`Dashboard`, `Documentos`, `Importar`, `Notas Preparadas`, `Configurações`).
   - `Importar` points to `/documentos/importar`.
   - Zero legacy RH terms.
2. **Desktop Responsive Classes**:
   - Docked sidebar has `hidden lg:flex`.
   - Header menu toggle button has `lg:hidden`.
3. **Mobile Overlay Structure**:
   - Drawer container has `role="dialog"`, `aria-modal="true"`, `id="mobile-sidebar-drawer"`.
   - Backdrop has `data-testid="sidebar-backdrop"`.
   - Close button has `data-testid="sidebar-close-button"` and `aria-label="Fechar menu lateral"`.
   - Toggle button has `aria-controls="mobile-sidebar-drawer"` and dynamic `aria-expanded`.
4. **Interactive Behavior**:
   - Backdrop click invokes `onCloseMobile`.
   - Close button click invokes `onCloseMobile`.
   - Escape key invokes `onCloseMobile` and calls `event.preventDefault()`.
   - Navigation link click invokes `onCloseMobile`.
5. **Existing Regression Baseline**:
   - Full test run (`npm test`) passes with 100% of 383 existing tests.
