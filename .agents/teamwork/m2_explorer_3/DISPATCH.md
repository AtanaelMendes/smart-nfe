# Dispatch for Explorer 3

Investigate coexistence with other features and test harness in `c:\www\smart-nfe`:
1. Check `ScreenTourTip` integration in `SmartNFeSidebar.jsx` or layout components — ensure mobile drawer and sidebar collapse don't break tour anchor elements or overlay z-indexes.
2. Check how table inline editing or other main content interactions might be affected (e.g. z-index layers, focus traps, scroll locks).
3. Investigate the test harness in SmartNFe (package.json scripts, existing unit test runner e.g. node:test, vitest, or jest). Determine how `tests/unit/leftDrawer.test.mjs` should be written and executed.
Write your analysis and recommendations to `c:\www\smart-nfe\.agents\teamwork\m2_explorer_3\report.md`.


## 2026-11-13T13:44:31Z
You are m2_explorer_3 (teamwork_explorer).
Working directory: c:\www\smart-nfe
Your state folder: c:\www\smart-nfe\.agents\teamwork\m2_explorer_3\

MANDATORY FIRST STEP:
Read c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Also read:
- c:\www\smart-nfe\.agents\teamwork\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m2\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\m2_explorer_3\DISPATCH.md

Your Task:
Investigate coexistence with other features and test harness in `c:\www\smart-nfe`:
1. Check `ScreenTourTip` integration in `SmartNFeSidebar.jsx` or layout components — ensure mobile drawer and sidebar collapse don't break tour anchor elements or overlay z-indexes.
2. Check how table inline editing or other main content interactions might be affected (e.g. z-index layers, focus traps, scroll locks).
3. Investigate the test harness in SmartNFe (package.json scripts, existing unit test runner e.g. node:test, vitest, or jest). Determine how `tests/unit/leftDrawer.test.mjs` should be written and executed.

Write your findings to `c:\www\smart-nfe\.agents\teamwork\m2_explorer_3\report.md` and write your `handoff.md` in your state folder.
When finished, send a message to the caller with a summary and the path to your report.
