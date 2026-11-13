# BRIEFING — 2026-11-13T14:32:00Z

## Mission
Empiricamente verificar e estressar o motor unificado de alocação (`app/lib/calculations/allocationEngine.js`) e aritmética decimal pura (`app/lib/calculations/decimal.js`) sob 5 cenários adversariais: (1) conservação de centavos em rateios indivisíveis, (2) extrema precisão e números gigantes em BigInt, (3) oráculo de invariante de conservação N->M com entradas randômicas, (4) ataques de injeção de quantidades negativas, e (5) oráculo de compatibilidade de unidades de medida SEFAZ. Emitir veredito APPROVE/FAIL.

## 🔒 My Identity
- Archetype: EMPIRICAL CHALLENGER
- Roles: critic, specialist
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_1\
- Original parent: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
- Milestone: Milestone 1 - Foundation & Design System Setup
- Instance: 1 of 1
- Sub-Orchestrator M1 XML Parent: 71db8a14-4c80-4575-92ba-b52ae572b170
- Milestone: Milestone 1 XML (sub_orch_m1_xml)
- Milestone 1 Allocation Engine Parent: f64908f7-618d-4f21-bf78-58657f1ff50c
- Current Milestone: Milestone 1 — Core Allocation Engine & Repositories

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code.
- CRITICAL: The dev server is active at http://localhost:3000/dashboard. DO NOT run `pnpm build` or `pnpm dev`.
- Run tests and empirical verifications directly.
- .agents/teamwork/ holds only metadata (plans, progress, handoffs, reports).
- Do not trust claims or logs; execute verification code directly and reproduce every finding empirically.
- Write tests strictly to `tests/` directory (e.g. `tests/tier5/m1_challenger1_allocation_adversarial.test.mjs`).

## Current Parent
- Conversation ID: f64908f7-618d-4f21-bf78-58657f1ff50c
- Updated: 2026-11-13T14:32:00Z

## Review Scope
- **Files to review**:
  - `app/lib/calculations/decimal.js`
  - `app/lib/calculations/allocationEngine.js`
  - `app/lib/calculations/divisionMath.js`
  - `app/features/preparationRepository.js`
  - `app/features/preparedInvoiceRepository.js`
- **Interface contracts**: `PROJECT.md`, `c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\SCOPE.md`
- **Review criteria**:
  - 1. Cent conservation remainder stress (indivisible apportionments: 100/3, 10/7, 0.01/10, etc.)
  - 2. BigInt extreme precision (4 decimals for qty, 10 decimals for unit price, numbers > 10^15 without overflow)
  - 3. Conservation invariant oracle (randomized N->M allocations, invariant remaining = original - allocs, canSave validation)
  - 4. Negative quantity attack (rejection of negative numbers, preventing balance inflation)
  - 5. Unit compatibility oracle (synonyms within 15 families, rejection of incompatible pairs, case/accent resilience)

## Attack Surface
- **Hypotheses tested**:
  - H1: Distributing indivisible cents across 3, 7, 11, 33 destinations may drop or create a cent in `decimalDistributeEqually`, `decimalApportionProportional`, `apportionExpenses`, or `calculateAllocationMatrix`. [PROVEN ROBUST — 0 cents dropped or created]
  - H2: BigInt operations may throw TypeError, overflow safe integer bounds, or truncate 10-decimal unit prices during multiplication. [PROVEN ROBUST — 10-decimal precision and 10^24 products supported without IEEE-754 drift]
  - H3: Randomized N->M allocations could violate the conservation invariant `remainingQty === originalQty - priorAllocated - sum(allocated)` due to scale mismatch or state leaks. [PROVEN ROBUST — 200/200 Monte Carlo trials passed]
  - H4: Injecting negative allocations could cause `availableQty` to increase or bypass `canSave = false`. [PROVEN ROBUST — Direct negatives and Trojan zero-sum attacks strictly blocked]
  - H5: Unit compatibility dictionary could fail on accented characters, alternate spellings, or multi-word synonyms with spaces. [VULNERABILITY FOUND — `normalizeUnit` strips spaces, causing `getUnitFamily` to return null for `METRO QUADRADO`, `METROS QUADRADOS`, `METRO CUBICO`, `METROS CUBICOS`].
- **Vulnerabilities found**:
  - In `app/lib/calculations/allocationEngine.js`: `getUnitFamily(normalizedUnit)` checks raw un-normalized members array while `normalizeUnit` strips spaces. Multi-word units (`METRO QUADRADO`, `METRO CUBICO`) return `null` and evaluate to `false` in `checkUnitCompatibility('M2', 'METRO QUADRADO')`.
- **Untested angles**: UI rendering of matrix (Milestone 4 scope).

## Loaded Skills
- None specified in dispatch.

## Key Decisions Made
- Authored `tests/tier5/m1_challenger1_allocation_adversarial.test.mjs` with 26 adversarial stress assertions across 5 suites.
- 25 assertions passed, 1 assertion failed (reproducing the unit compatibility space bug).
- Issued formal verdict: **FAIL** with concrete fix instructions for Worker M1.

## Artifact Index
- `c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_1\DISPATCH.md` — Dispatch history
- `c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_1\BRIEFING.md` — Working memory
- `c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_1\progress.md` — Liveness and progress
- `c:\www\smart-nfe\tests\tier5\m1_challenger1_allocation_adversarial.test.mjs` — Empirical adversarial test suite
- `c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_1\challenge_report.md` — Detailed stress test results
- `c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_1\handoff.md` — Handoff report with formal FAIL verdict
