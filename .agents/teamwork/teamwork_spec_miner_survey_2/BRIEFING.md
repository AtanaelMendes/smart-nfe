# BRIEFING — 2026-11-09T19:35:00Z

## Mission
Minerar e estruturar as especificações detalhadas para a importação real de XML NF-e modelo 55 no navegador (R3) e o contrato de dados com invoiceRepository.

## 🔒 My Identity
- Archetype: teamwork_spec_miner
- Roles: Specification Miner, External domain expert
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2
- Original parent: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
- Milestone: survey
- New caller (2026-11-09): 71db8a14-4c80-4575-92ba-b52ae572b170 (Survey Spec Miner 2)

## 🔒 Key Constraints
- Read-only exploration. NEVER modify source code. Write ONLY to working directory.
- Prioritize authoritative sources over LLM prior knowledge.
- Probe ALL discovered features; do NOT implement anything.
- Write full specs to survey_specs.md and standard handoff to handoff.md.
- CRITICAL USER INSTRUCTION: O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário). NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente.
- 2026-11-09: Isolamento de sessão estrito — documentos reais importados NÃO podem ser salvos no localStorage (apenas memória temporária de sessão);
- Respeitar Next.js 16 App Router, React 19, JavaScript/JSX, sem backend, sem chamadas externas.

## Current Parent
- Conversation ID: 71db8a14-4c80-4575-92ba-b52ae572b170
- Updated: 2026-11-09T19:20:53Z

## Task Summary
- **What to build**: Comprehensive functional and technical specification for R3 NF-e Model 55 XML browser import, SEFAZ schema mapping, Access Key Modulo 11 check digit algorithm, DOMParser architecture, invoiceRepository contract mapping, and session storage boundary isolation.
- **Success criteria**: Full Specification Matrix, Chave de Acesso check digit algorithm spec, Browser DOMParser architecture spec, Contract Mapping spec for invoiceRepository, and Security & Session Storage boundary spec.
- **Interface contracts**: c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\handoff.md & survey_specs.md
- **Code layout**: .agents/teamwork/teamwork_spec_miner_survey_2/

## Key Decisions Made
- Confirmed absence of PDF DANFEs or synthetic XML fixtures in the existing repo.
- Confirmed git branch is already `fix/frontend-xml-conferencia-v0.1.1`.
- Verified Modulo 11 weights [2..9] algorithm mathematically; identified that mock demo keys (except demo-02) were fictitious and fail DV check, requiring clear separation between demo mocks and real XML imported documents.
- Designed in-memory session boundary for `invoiceRepository` to protect user privacy and avoid localStorage pollution.

## Artifact Index
- survey_specs.md — comprehensive specifications document
- handoff.md — 5-component handoff report
- progress.md — liveness heartbeat
