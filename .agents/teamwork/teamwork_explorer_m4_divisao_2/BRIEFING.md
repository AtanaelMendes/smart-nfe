# BRIEFING — 2026-11-09T21:16:00Z

## Mission
Investigate invoice splitting balance allocation and equal division math (Feature 17) in `divisionMath.js`, `divisao/page.jsx`, and tests, formulating the BigInt 4-decimal exact residual allocation algorithm.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, analyzer, synthesizer
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_2
- Original parent: 71db8a14-4c80-4575-92ba-b52ae572b170
- Milestone: M4_Invoice_Splitting_Balance_Conservation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT edit codebase source files directly
- Write all findings and guidance to handoff.md and communicate via send_message

## Current Parent
- Conversation ID: 71db8a14-4c80-4575-92ba-b52ae572b170
- Updated: 2026-11-09T21:16:00Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`
  - `app/lib/calculations/decimal.js`
  - `app/lib/calculations/divisionMath.js`
  - `app/documentos/[id]/divisao/page.jsx`
  - `tests/integration/flow_c_division_balances.test.mjs`
  - `tests/tier1/m2_domain.test.mjs`, `tests/tier5/m2_decimal_adversarial_stress.test.mjs`
- **Key findings**:
  - `divisao/page.jsx` contains severe binary float operations in `handleDistributeEqually` (`parseFloat`, `Math.floor`, `Math.round`, lines 289-302), violating R1 and causing IEEE-754 drift.
  - `distributeEqually` is defined as a local helper in `flow_c_division_balances.test.mjs` (lines 74-95) but is completely missing from `divisionMath.js`.
  - Half-up division (`decimalDivide`) has a critical edge case when used for equal distribution: `0.0004` divided into 6 notes produces `baseQty = 0.0001`, allocating `0.0005` in the first 5 notes and yielding a NEGATIVE `-0.0001` in the 6th note!
  - Formulated the exact BigInt floor division algorithm `(scaledTotal / bigN)` with remainder `(scaledTotal % bigN)` assigned to the last note: guarantees 0 negative values, 0 float drift, exact 4 decimal places, and $\sum = \text{total}$ with 0.0000 balance.
  - Item-level allocation action "Distribuir saldo restante para Nota X" currently exists as a `+` button in Note X cell, but per-item equal division action is missing from the table row.
  - Formulated both item-level and bulk-level action handlers and domain functions for Worker implementation.
- **Unexplored areas**: None within Feature 17 scope. Features 16 & 18 handled by explorer_1; Feature 19 handled by explorer_3.

## Key Decisions Made
- `distributeEqually` must be exported from `app/lib/calculations/divisionMath.js` and re-exported in `index.js`.
- Floor division in BigInt (`baseInt = scaledTotal / bigN`) MUST be used rather than Half-Up division (`decimalDivide`), to eliminate the risk of negative allocations on the last note.
- `flow_c_division_balances.test.mjs` should import `distributeEqually` directly from `divisionMath.js`.

## Artifact Index
- DISPATCH.md — Initial dispatch message
- BRIEFING.md — Persistent context & memory
- progress.md — Liveness heartbeat and milestone tracking
- handoff.md — Complete 5-component report and Worker implementation guide
