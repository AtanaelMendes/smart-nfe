# BRIEFING — 2026-11-09T19:35:00Z

## Mission
Corrigir problemas funcionais do frontend SmartNFe e implementar a importação real de XML de NF-e modelo 55 diretamente no navegador, permitindo conferência de produtos, divisão de quantidades e validação fiscal com precisão decimal e segurança, cumprindo R1-R5 na branch `fix/frontend-xml-conferencia-v0.1.1`.

## 🔒 My Identity
- Archetype: teamwork_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\www\smart-nfe\.agents\teamwork\orchestrator\
- Original parent: parent (sentinel)
- Original parent conversation ID: 5b9042e8-b7f6-4f48-b6d2-96fde9311758

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\www\smart-nfe\PROJECT.md
1. **Decompose**: Survey (3 explorers) -> Feature Inventory -> Milestones & Interface contracts in PROJECT.md -> Dispatch Sub-orchestrators + E2E Testing Orchestrator
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate
   - **Delegate (sub-orchestrator)**: Each milestone decomposed and delegated. Top-level coordinates Dual Track (Implementation + E2E Testing Track) and Final Milestone.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: At 16 spawns, write handoff.md, cancel timers, spawn successor.
- **Work items**:
  1. Survey & Feature Inventory [done]
  2. PROJECT.md & TEST_INFRA.md decomposition [done]
  3. Milestone 1 Execution: Browser XML Parser & Session Repository [in-progress]
  4. Parallel E2E Testing Track: Synthetic fixtures & Integration test suite [in-progress]
  5. Milestone 2 Execution: Conference Table & Decimal Recalc [planned]
  6. Milestone 3 Execution: Validation Assistant, Safety & Undo [planned]
  7. Milestone 4 Execution: Invoice Splitting & Balances [planned]
  8. Milestone 5 Execution: Integration Suite, Lint, Build Gate [planned]
- **Current phase**: 2 (Milestone 1 Iteration Loop + E2E Track)
- **Current focus**: Milestone 1 Explorers (3) + E2E Test Writer (1)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- Audit is a BINARY VETO — violation means milestone fails unconditionally.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Always include ORIGINAL_REQUEST.md path in every dispatch.
- Maximum subagent count: 128.
- Work exclusively on branch `fix/frontend-xml-conferencia-v0.1.1` with coherent commits, without modifying master or merging to master.
- Ensure 0 errors on pnpm install, pnpm lint, and pnpm build.
- Browser-only XML parsing via DOMParser and File API; no backend, no external HTTP calls, no dangerouslySetInnerHTML.
- In-memory session data for real XMLs; never save full XML or real fiscal data in persistent localStorage.
- Pure decimal string arithmetic via app/lib/calculations; zero binary float imprecision in money/quantities.

## Current Parent
- Conversation ID: 2abc9845-da79-48fd-bcde-ddb894009441
- Updated: 2026-11-09T19:20:00Z

## Key Decisions Made
- Project Pattern selected for R1-R5 overhaul.
- Survey completed by 3 agents: verified git branch, conference bugs, decimal math gaps, DOMParser specs, modulo 11 algorithm, validation undo architecture, and build/test status.
- PROJECT.md and TEST_INFRA.md updated with 5 milestones and 22 feature inventory items.
- Milestone 1 Iteration Loop launched with 3 parallel explorers.
- Parallel E2E Testing Track launched with teamwork_test_writer.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| teamwork_explorer_survey_1 | teamwork_explorer | Codebase & Conference Explorer | completed | 3bf64967-395c-4011-8231-94707301699e |
| teamwork_spec_miner_survey_2 | teamwork_spec_miner | XML Model 55 & Contract Spec Miner | completed | 806da47c-f601-4fc0-804e-86c08cdd8540 |
| teamwork_explorer_survey_3 | teamwork_explorer | Validation, Splitting & Test Explorer | completed | c49245ad-bd05-4b93-a4e6-e80b074bca8a |
| teamwork_explorer_m1_1 | teamwork_explorer | M1 Explorer 1: DOMParser Engine | in-progress | c4284955-3ce8-4bee-b623-125970cfd32b |
| teamwork_explorer_m1_2 | teamwork_explorer | M1 Explorer 2: Key & Mapper | in-progress | 69460c91-d15d-4649-8f6f-3552c226d59c |
| teamwork_explorer_m1_3 | teamwork_explorer | M1 Explorer 3: Session & Import UI | in-progress | 8c8f0c64-c04e-4fe3-b6e5-73e10fb55a44 |
| teamwork_test_writer_e2e | teamwork_test_writer | E2E Track: Synthetic Fixtures & Flows A-D | in-progress | dcde5986-ac98-46d0-8523-2e34a8557e0f |

## Succession Status
- Succession required: no
- Spawn count: 7 / 16
- Pending subagents: c4284955, 69460c91, 8c8f0c64, dcde5986
- Predecessor: none
- Successor: none

## Active Timers
- Heartbeat cron: 71db8a14-4c80-4575-92ba-b52ae572b170/task-102
- Safety timer: 71db8a14-4c80-4575-92ba-b52ae572b170/task-104

## Artifact Index
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md — Original user request
- c:\www\smart-nfe\.agents\teamwork\orchestrator\DISPATCH.md — Incoming dispatch log
- c:\www\smart-nfe\.agents\teamwork\orchestrator\BRIEFING.md — Persistent working memory
- c:\www\smart-nfe\.agents\teamwork\orchestrator\progress.md — Liveness & status tracking
- c:\www\smart-nfe\PROJECT.md — Global architecture, milestones, feature inventory
- c:\www\smart-nfe\TEST_INFRA.md — Test methodology, feature checklist, scenarios
