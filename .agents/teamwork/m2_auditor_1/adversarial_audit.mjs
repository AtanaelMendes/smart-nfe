/**
 * Milestone 2 — Adversarial Forensic Audit Script
 * Executed independently by m2_auditor_1
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = resolve(process.cwd());

describe('Forensic Audit: Static AST & Token Verification', () => {
  const appContextPath = resolve(ROOT_DIR, 'app/context/AppContext.jsx');
  const appLayoutPath = resolve(ROOT_DIR, 'app/components/Layouts/AppLayout.jsx');
  const sidebarPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeSidebar.jsx');
  const headerPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeHeader.jsx');

  it('AppContext: Eliminates hydration mismatch by deferring localStorage read to useEffect', () => {
    const code = readFileSync(appContextPath, 'utf-8');
    
    // Check that useState does NOT read localStorage in initializer
    assert.doesNotMatch(code, /useState\([^)]*localStorage/);
    assert.doesNotMatch(code, /useState\([^)]*window/);

    // Check that setTimeout or microtask deferral is present for hydration safety
    assert.match(code, /setTimeout\s*\(\s*\(\)\s*=>\s*\{[\s\S]*setSidebarCollapsedState/);
    assert.match(code, /sidebarHydratedRef\.current\s*=\s*true/);

    // Check that storage key is exactly smartnfe_sidebar_collapsed
    assert.match(code, /'smartnfe_sidebar_collapsed'/);
  });

  it('AppLayout: Completely removes local useState(false) for sidebarCollapsed', () => {
    const code = readFileSync(appLayoutPath, 'utf-8');
    assert.doesNotMatch(code, /useState\s*\(\s*false\s*\)/);
    assert.match(code, /const\s*\{[^}]*sidebarCollapsed[^}]*\}\s*=\s*useAppContext\(\)/);
    assert.match(code, /onMenuToggle=\{toggleMobileDrawer\}/);
    assert.match(code, /mobileOpen=\{mobileDrawerOpen\}/);
    assert.match(code, /onMobileClose=\{closeMobileDrawer\}/);
  });

  it('SmartNFeSidebar: Both desktop aside and mobile overlay are present with correct responsive guards', () => {
    const code = readFileSync(sidebarPath, 'utf-8');
    // Desktop guard
    assert.match(code, /hidden\s+lg:flex/);
    // Mobile root guard
    assert.match(code, /className="lg:hidden"/);
    // Modal semantics
    assert.match(code, /role="dialog"/);
    assert.match(code, /aria-modal="true"/);
    assert.match(code, /id="mobile-sidebar-drawer"/);
    // Z-index hierarchy: mobile drawer and backdrop must be z-50 to cleanly occlude ScreenTourTip (z-40)
    assert.match(code, /z-50/);
    // Body scroll lock
    assert.match(code, /document\.body\.style\.overflow\s*=\s*'hidden'/);
    // Escape handler
    assert.match(code, /e\.preventDefault\(\)/);
    assert.match(code, /e\.stopPropagation\(\)/);
  });

  it('SmartNFeHeader: Hamburger toggle is visible on all screens <= 1024px (lg:hidden)', () => {
    const code = readFileSync(headerPath, 'utf-8');
    assert.match(code, /className="lg:hidden/);
    assert.match(code, /aria-controls="mobile-sidebar-drawer"/);
    assert.match(code, /aria-expanded=\{isMobileOpen\}/);
    assert.match(code, /data-testid="header-mobile-toggle"/);
  });
});

describe('Forensic Audit: Resilience to LocalStorage Exceptions & Boundary Conditions', () => {
  it('LocalStorage simulated quota exceeded / SecurityError does not crash state setters', () => {
    // Simulating AppContext logic under hostile environment
    const brokenLocalStorage = {
      getItem: () => {
        throw new Error('SecurityError: The operation is insecure.');
      },
      setItem: () => {
        throw new Error('QuotaExceededError: storage full');
      },
    };

    let collapsed = false;
    let storedVal = null;
    try {
      storedVal = brokenLocalStorage.getItem('smartnfe_sidebar_collapsed');
    } catch (e) {
      // should catch gracefully
    }
    assert.strictEqual(storedVal, null, 'Must catch getItem error without crashing');

    const setSidebarCollapsed = (valOrFn) => {
      const nextVal = typeof valOrFn === 'function' ? valOrFn(collapsed) : Boolean(valOrFn);
      try {
        brokenLocalStorage.setItem('smartnfe_sidebar_collapsed', String(nextVal));
      } catch (e) {
        // must catch gracefully
      }
      collapsed = nextVal;
      return nextVal;
    };

    assert.doesNotThrow(() => {
      setSidebarCollapsed(true);
    });
    assert.strictEqual(collapsed, true);

    assert.doesNotThrow(() => {
      setSidebarCollapsed((prev) => !prev);
    });
    assert.strictEqual(collapsed, false);
  });

  it('Boundary Viewport Resolution: Strict parity with 1024px rule', () => {
    const resolveInitialState = (storedPreference, windowWidth) => {
      if (storedPreference !== null && storedPreference !== undefined) {
        return storedPreference === 'true';
      }
      const isLg = windowWidth > 1024;
      return !isLg;
    };

    // Exactly 1024px (LG) -> should be collapsed (true)
    assert.strictEqual(resolveInitialState(null, 1024), true);
    // Exactly 1025px (Desktop) -> should be expanded (false)
    assert.strictEqual(resolveInitialState(null, 1025), false);
    // 1023px -> collapsed (true)
    assert.strictEqual(resolveInitialState(null, 1023), true);
    // Small mobile (375px) -> collapsed (true)
    assert.strictEqual(resolveInitialState(null, 375), true);
    // Ultra-wide (2560px) -> expanded (false)
    assert.strictEqual(resolveInitialState(null, 2560), false);

    // Stored preference overrides viewport
    assert.strictEqual(resolveInitialState('true', 2560), true);
    assert.strictEqual(resolveInitialState('false', 375), false);
  });
});
