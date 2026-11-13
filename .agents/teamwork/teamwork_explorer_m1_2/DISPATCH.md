# Dispatch for Explorer 2 (M1)
Task: Investigate Storage Leakage Fix (preparedInvoiceRepository.js) & Preparation Repository (preparationRepository.js).
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\


## 2026-11-13T13:44:25Z
You are Explorer 2 for Milestone 1 of SmartNFe.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\
Path to ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\www\smart-nfe\.agents\teamwork\PROJECT.md
Path to SCOPE.md: c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\SCOPE.md

Objective:
Read ORIGINAL_REQUEST.md, PROJECT.md, and SCOPE.md. Investigate app/features/preparedInvoiceRepository.js, app/features/invoiceRepository.js, and design app/features/preparationRepository.js.
Specifically:
1. Investigate storage leakage in app/features/preparedInvoiceRepository.js:
   - How is localStorage currently used?
   - How does invoiceRepository.js implement volatile in-memory session isolation (sessionInvoices = new Map())?
   - How to introduce sessionPreparedInvoices = new Map() in preparedInvoiceRepository.js so real imported XMLs and their preparations are kept strictly in memory, out of localStorage, while demo data remains in localStorage?
2. Detail the exact design and implementation strategy for app/features/preparationRepository.js:
   - Async methods: create(preparationData), update(id, partialData), findById(id), list({ status, type }), delete(id), getActiveAllocations(excludePreparationId)
   - Dual-storage pattern: sessionPreparations = new Map() for preparations originating from real invoices, localStorage for demo preparations
   - Draft management and lifecycle ('draft', 'active', 'completed', 'cancelled')
   - Active allocations map extraction: for all active (non-cancelled, non-draft if applicable, or drafts depending on design) preparations, summing allocated quantities per `${sourceInvoiceId}__${sourceItemId}`
3. Write your findings and proposed code design to c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\report.md and c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\handoff.md.
Send a message when complete.
