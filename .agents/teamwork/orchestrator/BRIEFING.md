# BRIEFING — 2026-11-13T13:45:30Z

## Mission
Evoluir o SmartNFe para permitir preparação N origens → M destinos com motor unificado de alocação, persistência de drawer, upload múltiplo e gestão de saldos/itens sem backend.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\www\smart-nfe
- State folder: c:\www\smart-nfe\.agents\teamwork\orchestrator\
- Original parent: parent
- Original parent conversation ID: 09293ff4-f471-4b14-b50f-3e045e70558b

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\www\smart-nfe\.agents\teamwork\PROJECT.md
1. **Decompose**: Map features via 3 Explorers Survey, partition into 3-7 milestones by module boundary, define interface contracts, assign all features in Feature Inventory, run Dual Track (Implementation + E2E Testing).
2. **Dispatch & Execute**:
   - **Delegate (sub-orchestrator)**: Each milestone delegated to a sub-orchestrator or run iteration loop (3 Explorers -> 1 Worker -> 2 Reviewers -> 2 Challengers -> 1 Auditor).
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (Project Orchestrator redesigns)
4. **Succession**: At 16 spawns, write handoff.md, cancel crons, copy state to _gen<N>, spawn successor, update Succession Status.
- **Work items**:
  1. Survey & Map Scope (3 Explorers) [done]
  2. Setup branch feature/preparacoes-unificadas & baseline verification (M0) [done]
  3. Decompose Milestones & E2E Testing Track in PROJECT.md [done]
  4. Milestone 1: Core Allocation Engine & Repositories [in-progress - expedited coding]
  5. Milestone 2: Left Drawer & Responsive Layout [in-progress - expedited coding]
  6. E2E Testing Track: Fixture Generator & E2E Suites [in-progress]
  7. Milestone 3: Multi-XML Importer & Documents UI [pending]
  8. Milestone 4: Preparation Flow & UI [pending]
  9. Milestone 5: E2E Test Verification & Hardening [pending]
- **Current phase**: 3 (Parallel Execution of M1, M2, and E2E Test Track)
- **Current focus**: Accelerated direct implementation of code and tests across M1, M2, and E2E tracks

## 🔒 Key Constraints
- Branch feature/preparacoes-unificadas must be created from current repo; do NOT touch master directly.
- No deploy, merge, or unauthorized GitHub Actions.
- Do NOT modify the PHP backend API.
- Do NOT use pre-built libraries or frameworks for core functionality (BigInt decimal math, allocation engine, etc.).
- Never write source code or run build/tests directly as orchestrator (dispatch-only).
- Maintain backward compatibility with parentInvoiceId and /documentos/[id]/divisao.
- Real tax data strictly in temporary memory; no real XMLs in localStorage; clear warning on session loss.
- Must run autonomously on Vercel without backend.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh

## Current Parent
- Conversation ID: 09293ff4-f471-4b14-b50f-3e045e70558b
- Updated: 2026-11-13T13:44:51Z

## Key Decisions Made
- Project Pattern selected with Dual Track (Implementation + E2E Testing).
- Survey completed; PROJECT.md and TEST_INFRA.md established with 25 inventoried features.
- Milestone 0 passed (branch `feature/preparacoes-unificadas` active; 383 baseline tests pass).
- Dispatched Sub-Orchestrator M1, Sub-Orchestrator M2, and E2E Testing Orchestrator in parallel.
- Accelerated execution: Instructed M1 and M2 sub-orchestrators to bypass redundant exploratory loops and dispatch implementation Workers directly.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_survey_1 | teamwork_explorer | Calculations, Allocation Engine & Repositories Survey | completed | 45ab5287-313b-4158-8393-0f3816c66512 |
| explorer_survey_2 | teamwork_explorer | Layout, Left Drawer, Import & Documents UI Survey | completed | 882cf4e4-f890-4d16-98c8-ec4bc240e311 |
| explorer_survey_3 | teamwork_explorer | Preparation Flow, Infrastructure, Tests & Mocks Survey | completed | 01608aa1-0024-408d-8058-03677b0ee197 |
| worker_m0 | teamwork_worker | M0 Branch Setup & Baseline Verification | completed | 9ceacf18-23a4-4ba1-8727-0e5448bfb1e0 |
| sub_orch_m1 | self | M1 Core Allocation Engine & Repositories | in-progress | f64908f7-618d-4f21-bf78-58657f1ff50c |
| sub_orch_m2 | self | M2 Left Drawer & Responsive Layout | in-progress | 744fe86f-d6f1-40a4-833e-217247dbf06e |
| sub_orch_e2e | self | E2E Testing Track (Fixtures & Suites) | in-progress | b46dc906-80ec-4470-92da-f6c8e7476b34 |

## Succession Status
- Succession required: no
- Spawn count: 7 / 16
- Pending subagents: f64908f7-618d-4f21-bf78-58657f1ff50c, 744fe86f-d6f1-40a4-833e-217247dbf06e, b46dc906-80ec-4470-92da-f6c8e7476b34
- Predecessor: none
- Successor spawned: not yet spawned
- Successor generation: none
- Successor state folder: none

## Active Timers
- Heartbeat cron: c09bc610-72fd-41ec-bb07-185334e1e0d5/task-22
- Safety timer: c09bc610-72fd-41ec-bb07-185334e1e0d5/task-126
- On succession: kill all timers before spawning successor
- On context truncation: handle timers as step 4 of the State Recovery section of your prompt says

## Artifact Index
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md — Original request + follow-ups
- c:\www\smart-nfe\.agents\teamwork\orchestrator\DISPATCH.md — Received dispatch messages
- c:\www\smart-nfe\.agents\teamwork\orchestrator\progress.md — Liveness & iteration tracking
- c:\www\smart-nfe\.agents\teamwork\orchestrator\GATE_STATUS.md — Gate verdicts per milestone
- c:\www\smart-nfe\.agents\teamwork\PROJECT.md — Global architecture, milestones, feature inventory
- c:\www\smart-nfe\.agents\teamwork\TEST_INFRA.md — Dual track test infrastructure specifications
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\SCOPE.md — M1 scope specification
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m2\SCOPE.md — M2 scope specification
- c:\www\smart-nfe\.agents\teamwork\sub_orch_e2e\SCOPE.md — E2E Track scope specification
