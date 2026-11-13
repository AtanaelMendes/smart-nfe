# BRIEFING — 2026-11-13T13:49:00Z

## Mission
Investigate AppContext.jsx and AppLayout.jsx to formulate exact design for elevating sidebarCollapsed and mobileDrawerOpen with safe hydration.

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: explorer
- Working directory: c:\www\smart-nfe
- State folder: c:\www\smart-nfe\.agents\teamwork\m2_explorer_1\
- Original parent: 744fe86f-d6f1-40a4-833e-217247dbf06e
- Milestone: M2 - Left Drawer & Responsive Layout

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Working on branch feature/preparacoes-unificadas
- Avoid React 19 hydration mismatch
- No pre-built libraries for core functionality

## Current Parent
- Conversation ID: 744fe86f-d6f1-40a4-833e-217247dbf06e
- Updated: not yet

## Investigation State
- **Explored paths**: ORIGINAL_REQUEST.md, PROJECT.md, sub_orch_m2/SCOPE.md, DISPATCH.md, app/context/AppContext.jsx, app/components/Layouts/AppLayout.jsx, SmartNFeSidebar.jsx, SmartNFeHeader.jsx, app/layout.jsx, explorer_survey_2/report.md
- **Key findings**: Root cause of navigation reset is local useState in AppLayout. React 19 safe hydration requires identical initial SSR/client state (false) and post-mount sync via useEffect with localStorage read and viewport check. AppContext elevation design fully formulated with exact exports.
- **Unexplored areas**: None for explorer 1. Peer explorer 2 handles sidebar/header internal markup; peer explorer 3 handles test harness and ScreenTourTip coexistence.

## Key Decisions Made
- Elevate sidebarCollapsed, mobileDrawerOpen, isLgScreen, and toggle/setter helpers to AppContext.
- Initial state: sidebarCollapsed = false, mobileDrawerOpen = false, isLgScreen = true.
- Use post-mount useEffect with ref guard to read localStorage and check window.innerWidth (> 1024 expanded, <= 1024 collapsed).
- Add resize listener to update isLgScreen and auto-close mobileDrawerOpen when resizing to desktop (> 1024px).
- Restructure AppLayout to consume useAppContext() and remove local useState.

## Artifact Index
- c:\www\smart-nfe\.agents\teamwork\m2_explorer_1\report.md — Analysis and design for AppContext and AppLayout
- c:\www\smart-nfe\.agents\teamwork\m2_explorer_1\handoff.md — 5-component handoff report
