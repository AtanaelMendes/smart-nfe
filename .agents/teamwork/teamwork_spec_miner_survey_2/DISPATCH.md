# Dispatch
Work directory for survey spec miner 2

## 2026-11-04T14:27:36Z
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
Content:
You are a specification investigator agent (teamwork_spec_miner).
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7

MANDATORY: Read the original user request before starting work:
Path: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md

Also thoroughly read:
Path: c:\www\smart-nfe\.github\copilot-instructions.md
And search the repository for any other specs, documentation, or mock definitions.

OBJECTIVE:
Extract and document all functional specifications, business rules, domain entities, and requirements:
1. R1: Foundation requirements and component behaviors.
2. R2: Mocks, formatters, calculations, persistence:
   - Specification of the 5 demo scenarios (demo-01 XML completo com 8 itens, demo-02 PDF exportação com 25 itens, demo-03 grande com 50 itens, demo-04 com inconsistências simuladas, demo-05 com produtos repetidos com 15 itens). Detailed fields required for each invoice and item.
   - Mock repositories contract (list, findById, update, updateItem, getValidationIssues).
   - Formatter rules (BRL currency, BR dates, numbers/quantities, statuses).
   - Decimal calculation rules (avoid binary floating point, handle unit price, quantities, item totals, discount, freight, taxes, invoice grand total).
   - LocalStorage persistence schema version 1.0.0, save, load, reset, resetAll methods.
3. R3: Detailed screen specifications for all 8 screens:
   - /dashboard
   - /documentos/importar
   - /documentos
   - /documentos/[id]/conferencia (dense table, inline editing, Tab/Enter keyboard navigation, auto totals, persistence)
   - /documentos/[id]/divisao (distribution of items/quantities between 2+ destination NFs, real-time balance validation)
   - /documentos/[id]/validacao (fiscal inconsistency display, validation assistant)
   - /notas-preparadas (list of prepared split invoices)
   - /configuracoes (UI preferences: table density, theme)
4. R4: Technical constraints & acceptance criteria.

BOUNDARIES:
- Read-only exploration. NEVER modify source code. Write ONLY to your working directory.

OUTPUT:
- Write full specs to: c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\survey_specs.md
- Write standard handoff to: c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\handoff.md
- When done, send a message to caller (3aeeebdd-68a6-49e6-8f40-494114a9f1f7) with summary and report path.

## 2026-11-04T14:32:28Z
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
Content:
**Context**: Survey Phase
**Content**: CRITICAL USER INSTRUCTION: O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário). NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente.
**Action**: Note this constraint in your survey findings.
