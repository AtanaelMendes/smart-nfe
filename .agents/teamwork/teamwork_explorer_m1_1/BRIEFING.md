# BRIEFING — 2026-11-13T13:49:00Z

## Mission
Investigar `app/lib/calculations/decimal.js` e desenhar a arquitetura e código de produção de `app/lib/calculations/allocationEngine.js` para o Milestone 1 do SmartNFe (preparação de exportação N:M, precisão BigInt, conservação estrita e rateio de despesas acessórias zero-drift).

## 🔒 My Identity
- Archetype: explorer
- Roles: Milestone 1 Explorer 1 (XML Parser Architecture & Schema Mapping)
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\
- Original parent: 71db8a14-4c80-4575-92ba-b52ae572b170
- Milestone: Milestone 1 (M1 - XML Parser & Core Ingestion)
- Roles (Atual): Milestone 1 Explorer 1 (Decimal Math & Core Allocation Engine Architecture)
- Parent (Atual): f64908f7-618d-4f21-bf78-58657f1ff50c
- Milestone (Atual): Milestone 1 (M1 - Core Allocation Engine & Repositories)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strictly read-only on project source code (only write to our own folder)
- Files for content delivery, Messages for coordination
- Self-contained 5-component handoff.md report
- ZERO third-party libraries for core arithmetic (pure native BigInt)
- Conservation rule: disponível = original - soma(alocações ativas)
- Preservação da chave composta: `${sourceInvoiceId}__${sourceItemId}`

## Current Parent
- Conversation ID: f64908f7-618d-4f21-bf78-58657f1ff50c
- Updated: 2026-11-13T13:44:18Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`, `sub_orch_m1/SCOPE.md`, `explorer_survey_1/report.md`
  - `app/lib/calculations/decimal.js`, `app/lib/calculations/divisionMath.js`, `app/lib/calculations/invoiceTotals.js`
  - `tests/integration/flow_c_division_balances.test.mjs`, `tests/tier1/m2_domain.test.mjs`, `tests/tier5/m4_challenger_division_traps_adversarial.test.mjs`, `tests/tier5/m2_decimal_adversarial_stress.test.mjs`
  - Baseline de testes verificado: 383 testes passando via `node --test` em 12.7s.
- **Key findings**:
  - `decimal.js` já possui a mecânica de BigInt limpa com decomposição `{ sign, intVal, scale }` e Half-Up ABNT NBR 5891. Precisa de extensões: `decimalSum`, `decimalAverage`, comparações estritas (`isDecimalPositive`, `decimalEquals`, `decimalGreaterThan`, `decimalLessThan`, `decimalMin`, `decimalMax`, `decimalClamp`) e rateio proporcional zero-drift (`decimalDistributeEqually`, `decimalApportionProportional`).
  - `allocationEngine.js` desenhado em código de produção com:
    - Matriz $N \to M$ (`calculateAllocationMatrix`).
    - Regra de conservação $\text{disponível} = \text{original} - \text{priorActive} - \text{currentAllocated}$.
    - Chave composta única `${sourceInvoiceId}__${sourceItemId}`.
    - `checkUnitCompatibility` cobrindo 15 famílias canônicas de unidades fiscais SEFAZ.
    - Rateio de frete, seguro, outras despesas e desconto multi-origem com conservação exata de centavos ao absorver resíduos no último destino ativo por origem.
    - Validação de excessos e alocações negativas com bloqueio estrito de `canSave`.
  - Retrocompatibilidade total garantida para `divisionMath.js` e rota legada `/documentos/[id]/divisao`.
- **Unexplored areas**: Nenhuma no escopo matemático de M1.

## Key Decisions Made
- `allocationEngine.js` será o motor matemático central; `divisionMath.js` delegará para ele, preservando 100% de retrocompatibilidade com os 383 testes existentes.
- A conservação de centavos em rateio multi-origem calcula a proporção do valor de produtos de cada nota de origem entregue a cada destino, absorvendo o resíduo no último destino ativo para aquela origem.
- O código completo foi entregue em `report.md` e o sumário no `handoff.md`.

## Artifact Index
- `DISPATCH.md` — Registro das instruções de dispatch
- `progress.md` — Heartbeat de vivacidade e progresso
- `BRIEFING.md` — Memória persistente de contexto e identidade
- `report.md` — Relatório técnico exaustivo com código proposto para `decimal.js` e `allocationEngine.js`
- `handoff.md` — Relatório formal de handoff em 5 seções para o Worker
