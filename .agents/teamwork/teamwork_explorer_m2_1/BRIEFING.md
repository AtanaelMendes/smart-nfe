# BRIEFING — 2026-11-04T15:21:00Z

## Mission
Formulate exact architecture, algorithms, and code strategy for the Decimal Calculation Engine in `app/lib/calculations/` (decimal.js, invoiceTotals.js, divisionMath.js).

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: investigation, synthesis
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_1\
- Original parent: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
- Milestone: M2 Core Engine - Decimal Calculations

## 🔒 Key Constraints
- Read-only investigation — do NOT implement in source tree directly
- The dev server is active at http://localhost:3000/dashboard. DO NOT run `pnpm build` or `pnpm dev`.
- Output strategy_calculations.md and handoff.md in own directory
- Notify caller via send_message when complete

## Current Parent
- Conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
- Updated: 2026-11-04T15:21:00Z

## Investigation State
- **Explored paths**: `app/lib/`, `tests/`, `mockInvoices.js`, `currency.js`, `PROJECT.md`, `SCOPE.md`, `survey_specs.md`
- **Key findings**:
  - Pure string decimal arithmetic with BigInt scaling completely resolves IEEE 754 float drift without any external npm packages.
  - Arredondamento Half-Up ABNT NBR 5891 proved mathematically via exact remainder condition (`rem * 2n >= divisor`).
  - `invoiceTotals.js` supports dual signatures (positional and options object) and SEFAZ MOC 4.0 formula.
  - `divisionMath.js` supports full multi-column division validation (`canSave`, `isValid`, `isBalanced`, `hasRemaining`, `hasExcess`) and summaries per destination note.
- **Unexplored areas**: None for M2.1 calculation scope.

## Key Decisions Made
- Use native BigInt scaling for arbitrary precision decimal string arithmetic.
- Do not introduce external npm dependencies to package.json.
- Provide comprehensive, drop-in ready code implementations in `strategy_calculations.md`.

## Artifact Index
- DISPATCH.md — Initial dispatch log
- progress.md — Liveness heartbeat
- BRIEFING.md — Situational awareness
- strategy_calculations.md — Complete architectural blueprint and drop-in code for decimal.js, invoiceTotals.js, divisionMath.js
- handoff.md — 5-component handoff report
