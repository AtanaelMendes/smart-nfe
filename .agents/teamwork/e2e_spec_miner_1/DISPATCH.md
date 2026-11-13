## 2026-11-13T13:44:17Z
You are an authoritative specification investigator (teamwork_spec_miner) for the E2E Testing Track of SmartNFe.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\e2e_spec_miner_1\

Paths to read:
- ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\www\smart-nfe\.agents\teamwork\PROJECT.md
- TEST_INFRA.md: c:\www\smart-nfe\.agents\teamwork\TEST_INFRA.md
- SCOPE.md: c:\www\smart-nfe\.agents\teamwork\sub_orch_e2e\SCOPE.md

Your task:
Analyze all requirements and technical specifications for generating synthetic NF-e 4.00 XML fixtures in `tests/fixtures/xmlFixtureGenerator.mjs`.
Specifically investigate and specify:
1. Exact NF-e 4.00 XML structure, namespaces, and mandatory tags required by SmartNFe's XML parser (ide, emit, dest, det/prod/imposto, total/ICMSTot, etc.).
2. The Modulo 11 check digit algorithm for Brazilian NF-e 44-digit access keys (`chNFe`): weights 2 to 9 from right to left, remainder calculation, check digit formula, and formatting.
3. Parametric generator design to produce:
   - 2->1 grouping scenarios (multiple supplier XMLs destined for 1 shipment)
   - 1->M division scenarios (1 large invoice to split across M contracts)
   - N->M mixed scenarios (arbitrary origins to arbitrary destinations)
   - Multiple distinct suppliers with valid CNPJ/names
   - Repeated product codes across different suppliers (e.g. `SOJA-01`)
   - Incompatible units (e.g. `SC` bags vs `KG` vs `TON`)
   - Scale batch: 50 XMLs (10 suppliers, 200+ line items) for 50->5 stress testing
4. How to structure `tests/fixtures/xmlFixtureGenerator.mjs` as an ES module (`.mjs`) exporting helper functions to generate single XMLs, multi-XML batches, and pre-configured scenario bundles cleanly.

You MUST NOT write implementation code in tests/ or app/. You are read-only.
Write your complete specification report to `c:\www\smart-nfe\.agents\teamwork\e2e_spec_miner_1\handoff.md`.
Then send a message to your caller indicating you are done.
