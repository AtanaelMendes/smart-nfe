# DISPATCH — Explorer Survey 1 (Calculations, Allocation Engine & Repositories)

## Mission
Survey the existing SmartNFe codebase for R4 (Unified Allocation Engine & Repositories) and R3 data flow, in accordance with ORIGINAL_REQUEST.md.

## Path to ORIGINAL_REQUEST.md
`c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md`

## Focus Areas
1. `app/lib/calculations/decimal.js`, `divisionMath.js`, `invoiceTotals.js` - current calculation architecture, floating point issues, requirements for BigInt-based arbitrary precision decimal math (NO pre-built libraries for core functionality).
2. `preparationRepository`, `invoiceRepository`, `preparedInvoiceRepository` - existing storage, schema, state management, how `parentInvoiceId` works.
3. Compatibility with legacy preparations and `/documentos/[id]/divisao`.
4. The Conservation Rule (`disponível = original - soma das alocações ativas`), item preservation (`sourceInvoiceId + sourceItemId`), and prevention of arbitrary allocations/arbitrary splits.
5. In-memory temporary retention rules for real tax data without saving real XMLs to localStorage.

## Output
Write a comprehensive report to `c:\www\smart-nfe\.agents\teamwork\explorer_survey_1\report.md` detailing:
- Existing code structure & file paths
- Gaps and required changes
- Proposed data structures and interfaces
- Backward compatibility strategy
- Specific feature inventory items for PROJECT.md
Send a summary message when done.


## 2026-11-13T13:28:02Z
Sender: c09bc610-72fd-41ec-bb07-185334e1e0d5
Message: You are Explorer 1 for the SmartNFe project survey.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\explorer_survey_1\
Path to ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Path to DISPATCH.md: c:\www\smart-nfe\.agents\teamwork\explorer_survey_1\DISPATCH.md

Read ORIGINAL_REQUEST.md and DISPATCH.md first.
Survey the SmartNFe codebase focusing on:
1. Calculations: app/lib/calculations/decimal.js, divisionMath.js, invoiceTotals.js.
2. Repositories & State: preparationRepository, invoiceRepository, preparedInvoiceRepository.
3. Unified Allocation Engine requirements: BigInt arbitrary precision decimal math (NO pre-built libraries for core functionality), conservation rule (disponível = original - soma das alocações ativas), item identity preservation (sourceInvoiceId + sourceItemId), preventing arbitrary splits.
4. Backward compatibility with parentInvoiceId and /documentos/[id]/divisao.
5. In-memory temporary retention rules for real tax data without saving real XMLs to localStorage.

Investigate the actual code in c:\www\smart-nfe. Produce a comprehensive report in c:\www\smart-nfe\.agents\teamwork\explorer_survey_1\report.md and a handoff report at c:\www\smart-nfe\.agents\teamwork\explorer_survey_1\handoff.md following the Handoff Protocol. Include concrete feature inventory items with descriptions for PROJECT.md.
Send a message to your parent when completed.
