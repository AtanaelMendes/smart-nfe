## 2026-11-09T20:28:49Z
You are teamwork_challenger_m2_conferencia_1.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m2_conferencia_1\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md
Study Worker handoff: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2_conferencia\handoff.md

## Target Milestone
Milestone 2: M2_Conference_Table_Decimal_Recalc (Adversarial ItemId Stability & Filter/Sort Independence)

## Your Mission
1. Conduct empirical adversarial testing of `app/documentos/[id]/conferencia/page.jsx` and `tests/integration/flow_b_conferencia_stable_edit.test.mjs`.
2. Write an adversarial stress test (e.g. `tests/tier5/m2_challenger_filter_sort_adversarial.test.mjs` or similar test runner harness) that verifies:
   - Rapid sequential edits under severe filter restrictions (filtering by partial description, 8-digit NCMs, empty filters).
   - Duplicate codes (`cProd`) such as in `demo-05`: editing row 4 must never corrupt row 1 even if codes and descriptions match.
   - Column sorting flip-flops: sorting ascending, editing an item, sorting descending, asserting that only the targeted `itemId` was modified.
   - Snapshot preservation: verifying that original values are immutably preserved and restore actions revert items exactly.
3. Run the stress test and verify 100% pass rate.
4. Issue your verdict: **APPROVE** or **REQUEST_CHANGES**.
5. Write your complete handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m2_conferencia_1\handoff.md` and send a message when complete.
