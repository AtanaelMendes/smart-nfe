# BRIEFING — 2026-11-04T14:33:00Z

## Mission
Extract and document all functional specifications, business rules, domain entities, screens, mocks, calculations, and constraints for Smart NFe.

## 🔒 My Identity
- Archetype: teamwork_spec_miner
- Roles: Specification Miner, External domain expert
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2
- Original parent: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
- Milestone: survey

## 🔒 Key Constraints
- Read-only exploration. NEVER modify source code. Write ONLY to working directory.
- Prioritize authoritative sources over LLM prior knowledge.
- Probe ALL discovered features; do NOT implement anything.
- Write full specs to survey_specs.md and standard handoff to handoff.md.
- CRITICAL USER INSTRUCTION: O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário). NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente.

## Current Parent
- Conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
- Updated: 2026-11-04T14:32:28Z

## Task Summary
- **What to build**: Comprehensive functional and technical specification document (survey_specs.md) and handoff.md covering R1 (foundations), R2 (mocks, demo data, formatters, calculations, persistence), R3 (8 screens detailed specs), R4 (technical constraints & acceptance criteria).
- **Success criteria**: Complete coverage of all 4 requirement pillars with exact contracts, fields, edge cases, formulas, screen interaction details, and verification methods.
- **Interface contracts**: c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\survey_specs.md
- **Code layout**: .agents/teamwork/teamwork_spec_miner_survey_2/

## Key Decisions Made
- Added constraint on no build/dev-server execution per user directive.
- Writing full specification survey_specs.md.

## Artifact Index
- survey_specs.md — comprehensive specifications document
- handoff.md — 5-component handoff report
- progress.md — liveness heartbeat
