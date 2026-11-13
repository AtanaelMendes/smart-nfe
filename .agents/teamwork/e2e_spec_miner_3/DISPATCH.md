## 2026-11-13T13:44:33Z
You are an authoritative specification investigator (teamwork_spec_miner) for the E2E Testing Track of SmartNFe.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\e2e_spec_miner_3\

Paths to read:
- ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\www\smart-nfe\.agents\teamwork\PROJECT.md
- TEST_INFRA.md: c:\www\smart-nfe\.agents\teamwork\TEST_INFRA.md
- SCOPE.md: c:\www\smart-nfe\.agents\teamwork\sub_orch_e2e\SCOPE.md

Your task:
Exhaustively map out the test cases and assertion criteria for the 6 integration test suites defined in TEST_INFRA.md, adhering strictly to the 4-Tier test methodology:
1. `flow_a_drawer_layout.test.mjs`:
   - R1 Left drawer desktop persistence, localStorage sync (`smartnfe_sidebar_collapsed`), safe hydration without SSR mismatch, mobile overlay (<=1024px), Escape key handler (`e.preventDefault()`), toggle accessibility, coexistence with ScreenTourTip and product table.
2. `flow_b_multi_xml_import.test.mjs`:
   - R2 Multi-XML drag-and-drop batch queue, concurrency pool limit (3), progress tracking (individual and global), retry mechanism, duplicate 44-digit access key detection, memory isolation (no localStorage leaks for real XMLs).
3. `flow_c_documents_filters.test.mjs`:
   - R2 Debounced search (300ms), 8-facet combinable filters (client, supplier, NCM, product, date, value, balance, status), visual grouping (by supplier or assigned export client), stable selection across filters/sorting/paging, counter metrics, assigned export client domain model (`clienteAtribuido`).
4. `flow_d_allocation_engine.test.mjs`:
   - R4 BigInt arbitrary precision decimal math (vector ops, zero floating-point drift), conservation invariant (`disponível = original - soma(ativas)`), excess blocking, cent conservation for accessory expenses (frete, seguro, outras despesas, desconto), unit compatibility check, backward compatibility with legacy single-invoice division (`parentInvoiceId`).
5. `flow_e_preparation_n_to_m.test.mjs`:
   - R3 High-density workspace workflows: Grouping (N->1), Division (1->M), Mixed Preparation (N->M), origin preservation (`sourceInvoiceId + sourceItemId`), in-memory session drafts, session loss warning.
6. `flow_f_scale_50_invoices.test.mjs`:
   - R5 Scale stress test with 50 XMLs (10 suppliers, 200+ line items) allocated across 5 destination shipping containers, heap stability, memory protection.

Ensure all 4 tiers are mapped:
- Tier 1: ≥5 test cases per feature (isolated functional tests)
- Tier 2: ≥5 boundary and corner cases per feature (limits, zero, excess, incompatible units, special chars)
- Tier 3: Pairwise combinations across features (filters + grouping + selections + allocations)
- Tier 4: Real-world multi-document workload scenarios (the 6 scenarios in TEST_INFRA.md)

You MUST NOT write implementation code in tests/ or app/. You are read-only.
Write your complete specification report to `c:\www\smart-nfe\.agents\teamwork\e2e_spec_miner_3\handoff.md`.
Then send a message to your caller indicating you are done.
