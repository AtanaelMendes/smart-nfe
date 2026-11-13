# Scope: Milestone 2 — Left Drawer & Responsive Layout (R1)

## Mission
Implement Milestone 2 per PROJECT.md on branch `feature/preparacoes-unificadas`:
- Feature 8: Left Drawer State Persistence & Safe Hydration
  - Elevate `sidebarCollapsed` and `mobileDrawerOpen` to `AppContext.jsx`.
  - Persist in `smartnfe_sidebar_collapsed` in `localStorage` post-mount without React 19 hydration mismatch.
  - Default expanded above 1024px without saved preference; default collapsed in LG or lower (<= 1024px).
- Feature 9: Responsive Mobile Drawer Overlay
  - Overlay drawer for viewports <= 1024px with backdrop, Escape key listener (`e.preventDefault()`), and close button.
  - Accessible toggle button in `SmartNFeHeader.jsx` (`lg:hidden`).
  - Coexist safely with ScreenTourTip and product table inline editing without interference.

## Code Layout Ownership (Exclusive)
- `app/components/Layouts/AppLayout.jsx`
- `app/components/Layouts/SmartNFeSidebar.jsx`
- `app/components/Layouts/SmartNFeHeader.jsx`
- `app/context/AppContext.jsx`
- `tests/unit/leftDrawer.test.mjs` (or unit tests for M2)

## Key Constraints & Rules
- Branch: MUST work strictly on `feature/preparacoes-unificadas`.
- No hydration mismatch warnings in Next.js / React 19.
- Preserve all existing routes, navigation, and ScreenTourTip integration.
- Run full iteration loop: Explorer(s) -> Worker -> Reviewer(s) -> Challenger(s) -> Forensic Auditor -> Gate.
- DO NOT CHEAT: zero tolerance for hardcoded tests, dummy facades, or shortcuts.

## References
- `c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\www\smart-nfe\.agents\teamwork\PROJECT.md`
- `c:\www\smart-nfe\.agents\teamwork\explorer_survey_2\report.md`
