# BRIEFING — 2026-11-13T13:45:00Z

## Mission
Deliver Milestone 1 (Core Allocation Engine & Repositories) for SmartNFe per PROJECT.md and SCOPE.md.

## 🔒 My Identity
- Archetype: sub_orch
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\www\smart-nfe
- State folder: c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\
- Original parent: parent
- Original parent conversation ID: c09bc610-72fd-41ec-bb07-185334e1e0d5

## 🔒 My Workflow
- **Pattern**: Project Pattern (Sub-orchestrator)
- **Scope document**: c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\SCOPE.md
1. **Decompose**: Assessed scope - fits single iteration loop 2B for Milestone 1.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Project Pattern 2B Iteration Loop:
     a. Spawn 3 Explorers in parallel to detail exact changes and design
     b. Spawn 1 Worker with mandatory integrity warning to implement code and run build/tests
     c. Spawn 2 Reviewers independently to verify correctness, completeness, and 383 baseline tests
     d. Spawn 2 Challengers to empirically verify edge cases and stress tests
     e. Spawn 1 Forensic Auditor (teamwork_auditor) for integrity verification
     f. Gate: record results in GATE_STATUS.md. All must pass.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical, never skip auditor)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: at 16 spawns, write handoff.md, spawn successor
- **Work items**:
  1. Milestone 1 Core Allocation Engine & Repositories [in-progress]
- **Current phase**: 2B Iteration Loop
- **Current focus**: Explorers running (1, 2, 3)

## 🔒 Key Constraints
- Branch: MUST work strictly on feature/preparacoes-unificadas
- NEVER write, modify, or create source code files directly (DISPATCH-ONLY)
- NEVER run build/test commands yourself — require workers to do so
- ZERO third-party packages for core arithmetic: use pure native BigInt
- Conservation rule: disponível = original - soma(alocações ativas)
- Storage leakage fix: real XMLs strictly in volatile memory (sessionPreparedInvoices = new Map())
- Exclusive write ownership: app/lib/calculations/decimal.js, allocationEngine.js, divisionMath.js, app/features/preparationRepository.js, app/features/preparedInvoiceRepository.js, tests/unit/allocationEngine.test.mjs
- 100% backward compatibility: existing 383 tests must continue passing
- Binary veto: if Forensic Auditor reports INTEGRITY VIOLATION, iteration FAILS immediately
- Never reuse a subagent after it has delivered its handoff — always spawn fresh

## Current Parent
- Conversation ID: c09bc610-72fd-41ec-bb07-185334e1e0d5
- Updated: 2026-11-13T13:43:09Z

## Key Decisions Made
- Milestone 1 fits Project Pattern 2B Iteration Loop directly.
- Dispatched 3 Explorers in parallel.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_1 | teamwork_explorer | Investigate Decimal Math & Allocation Engine | in-progress | 91ce1157-7c05-4fbc-94ad-51281ab524cd |
| explorer_2 | teamwork_explorer | Investigate Storage Leakage & Prep Repo | in-progress | 20aa84d9-4d23-4009-bb95-446b6eb20fcf |
| explorer_3 | teamwork_explorer | Investigate Legacy Division & Test Baseline | in-progress | 32ea5c72-6721-4b31-9061-d325f17bcba6 |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: 91ce1157-7c05-4fbc-94ad-51281ab524cd, 20aa84d9-4d23-4009-bb95-446b6eb20fcf, 32ea5c72-6721-4b31-9061-d325f17bcba6
- Predecessor: none
- Successor spawned: not yet spawned
- Successor generation: none
- Successor state folder: none

## Active Timers
- Heartbeat cron: f64908f7-618d-4f21-bf78-58657f1ff50c/task-26
- Safety timer: f64908f7-618d-4f21-bf78-58657f1ff50c/task-28
- On succession: kill all timers before spawning successor
- On context truncation: handle timers as step 4 of the State Recovery section of your prompt says

## Artifact Index
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md — Original user request
- c:\www\smart-nfe\.agents\teamwork\PROJECT.md — Global project architecture & milestones
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\SCOPE.md — M1 scope specification
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\DISPATCH.md — Incoming parent dispatch messages
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\progress.md — Sub-orchestrator progress tracking
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\GATE_STATUS.md — Milestone gate status
