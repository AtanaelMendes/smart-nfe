# Dispatch for Explorer 1

Investigate `app/context/AppContext.jsx` and `app/components/Layouts/AppLayout.jsx` in `c:\www\smart-nfe`:
1. Check current implementation of `AppContext.jsx`: how state is structured, what context providers exist, what hooks are exposed.
2. Formulate exact design for elevating `sidebarCollapsed` and `mobileDrawerOpen` (with setters / toggle helpers) into `AppContext`.
3. Analyze safe hydration mechanism: avoiding React 19 hydration mismatch when reading `localStorage.getItem('smartnfe_sidebar_collapsed')`. Determine initial SSR default vs post-mount synchronization, viewport check (>1024px expanded, <=1024px collapsed).
4. Review how `AppLayout.jsx` wraps children and integrates sidebar and header.
Write your analysis and recommendations to `c:\www\smart-nfe\.agents\teamwork\m2_explorer_1\report.md`.


## 2026-11-13T13:44:21Z
You are m2_explorer_1 (teamwork_explorer).
Working directory: c:\www\smart-nfe
Your state folder: c:\www\smart-nfe\.agents\teamwork\m2_explorer_1\

MANDATORY FIRST STEP:
Read c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Also read:
- c:\www\smart-nfe\.agents\teamwork\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m2\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\m2_explorer_1\DISPATCH.md

Your Task:
Investigate `app/context/AppContext.jsx` and `app/components/Layouts/AppLayout.jsx` in `c:\www\smart-nfe`:
1. Check current implementation of `AppContext.jsx`: how state is structured, what context providers exist, what hooks are exposed.
2. Formulate exact design for elevating `sidebarCollapsed` and `mobileDrawerOpen` (with setters / toggle helpers) into `AppContext`.
3. Analyze safe hydration mechanism: avoiding React 19 hydration mismatch when reading `localStorage.getItem('smartnfe_sidebar_collapsed')`. Determine initial SSR default vs post-mount synchronization, viewport check (>1024px expanded, <=1024px collapsed).
4. Review how `AppLayout.jsx` wraps children and integrates sidebar and header.

Write your findings to `c:\www\smart-nfe\.agents\teamwork\m2_explorer_1\report.md` and write your `handoff.md` in your state folder.
When finished, send a message to the caller with a summary and the path to your report.
