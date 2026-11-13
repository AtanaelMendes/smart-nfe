# BRIEFING — 2026-11-13T13:59:00Z

## Mission
Implement Milestone 2: Left Drawer & Responsive Layout in `c:\www\smart-nfe` on branch `feature/preparacoes-unificadas`.

## 🔒 My Identity
- Archetype: teamwork_worker
- Roles: implementer, qa, specialist
- Working directory: c:\www\smart-nfe
- State folder: c:\www\smart-nfe\.agents\teamwork\m2_worker_1\
- Original parent: 744fe86f-d6f1-40a4-833e-217247dbf06e
- Milestone: M2 — Left Drawer & Responsive Layout

## 🔒 Key Constraints
- Branch: MUST work strictly on `feature/preparacoes-unificadas`.
- No hydration mismatch warnings in Next.js / React 19.
- Preserve all existing routes, navigation, and ScreenTourTip integration.
- Storage key: `smartnfe_sidebar_collapsed`.
- Default expanded (>1024px) without stored preference, default collapsed (<=1024px).
- DO NOT CHEAT: zero tolerance for hardcoded tests, dummy facades, or shortcuts. Real implementation and state.
- Exclusive Write Ownership:
  - app/context/AppContext.jsx
  - app/components/Layouts/AppLayout.jsx
  - app/components/Layouts/SmartNFeSidebar.jsx
  - app/components/Layouts/SmartNFeHeader.jsx
  - tests/unit/leftDrawer.test.mjs

## Current Parent
- Conversation ID: 744fe86f-d6f1-40a4-833e-217247dbf06e
- Updated: 2026-11-13T13:54:48Z

## Task Summary
- **What to build**: Left drawer state elevation to AppContext, React 19 safe hydration, localStorage persistence, responsive mobile drawer overlay with backdrop, Escape key handling, close button, accessible toggle button in header, and unit tests.
- **Success criteria**: 0 regressions on 383 baseline tests, new unit tests passing, Next.js build clean.
- **Interface contracts**: PROJECT.md § AppContext.jsx ↔ Layout Components
- **Code layout**: PROJECT.md § Code Layout

## Change Tracker
- **Files modified**:
  - `app/context/AppContext.jsx`: Elevated sidebarCollapsed, mobileDrawerOpen, isLgScreen, safe post-mount hydration, localStorage sync.
  - `app/components/Layouts/AppLayout.jsx`: Replaced local useState with useAppContext, passing props to sidebar and header.
  - `app/components/Layouts/SmartNFeSidebar.jsx`: Desktop collapsible aside (`hidden lg:flex`, 5 menus invariant) + Mobile overlay drawer (`lg:hidden`, backdrop z-50, dialog/aria-modal, faXmark close, Escape listener with e.preventDefault & e.stopPropagation, auto-close on navigate).
  - `app/components/Layouts/SmartNFeHeader.jsx`: Accessible mobile hamburger button (`lg:hidden`, aria-controls, aria-expanded, aria-label).
  - `tests/unit/leftDrawer.test.mjs`: Comprehensive 22-test unit suite covering all M2 behaviors.
- **Build status**: Pass (`next build` compiled in 7.0s, all static pages generated).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: 405 passed (383 baseline + 22 unit tests), 0 failed.
- **Lint status**: 0 errors on modified files (`npm run lint` clean).
- **Tests added/modified**: `tests/unit/leftDrawer.test.mjs` (22 tests, 7 suites).

## Loaded Skills
- None required

## Key Decisions Made
- Post-mount deferred state initialization (`setTimeout(..., 0)` inside post-mount `useEffect`) guarantees zero React 19 SSR hydration mismatch and satisfies ESLint `react-hooks/set-state-in-effect`.
- Default to expanded on >1024px, collapsed on <=1024px when no stored preference exists.
- Mobile drawer uses `role="dialog"`, `aria-modal="true"`, `z-50` backdrop, and Escape key listener with `e.preventDefault()` + `e.stopPropagation()`. This guarantees `ScreenTourTip` (`z-40`) is dimmed cleanly and never dismissed prematurely.

## Artifact Index
- `c:\www\smart-nfe\.agents\teamwork\m2_worker_1\BRIEFING.md` — persistent memory
- `c:\www\smart-nfe\.agents\teamwork\m2_worker_1\progress.md` — heartbeat and progress tracker
- `c:\www\smart-nfe\.agents\teamwork\m2_worker_1\handoff.md` — handoff report
