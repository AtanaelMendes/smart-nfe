# BRIEFING — 2026-11-13T13:45:00Z

## Mission
Investigate and specify authoritative technical requirements for synthetic NF-e 4.00 XML fixtures generator (`tests/fixtures/xmlFixtureGenerator.mjs`) for the SmartNFe E2E Testing Track.

## 🔒 My Identity
- Archetype: teamwork_spec_miner
- Roles: Specification Miner
- Working directory: c:\www\smart-nfe
- State folder: c:\www\smart-nfe\.agents\teamwork\e2e_spec_miner_1\
- Original parent: b46dc906-80ec-4470-92da-f6c8e7476b34
- Milestone: E2E Testing Track - XML Fixture Specification

## 🔒 Key Constraints
- Read-only on tests/ and app/ — do NOT write implementation code.
- Write only to state folder: `c:\www\smart-nfe\.agents\teamwork\e2e_spec_miner_1\`.
- Ground all requirements in SEFAZ NF-e 4.00 standards and SmartNFe's actual XML parser implementation.
- Must detail exact Modulo 11 check digit algorithm for 44-digit Brazilian NF-e keys (`chNFe`).
- Must specify parametric scenarios (2->1, 1->M, N->M, 50->5 stress scale, incompatible units, repeated codes).
- Must produce 5-component handoff report with Features Discovered and Edge Cases tables.

## Current Parent
- Conversation ID: b46dc906-80ec-4470-92da-f6c8e7476b34
- Updated: not yet

## Task Summary
- **What to build**: Authoritative specification for synthetic NF-e 4.00 XML fixtures generator
- **Success criteria**: Detailed spec for parser compatibility, SEFAZ schema, Mod 11 chNFe calculation, test scenario matrices, and ES module architecture.
- **Interface contracts**: c:\www\smart-nfe\.agents\teamwork\PROJECT.md, SCOPE.md
- **Code layout**: tests/fixtures/xmlFixtureGenerator.mjs

## Key Decisions Made
- Initializing spec mining across codebase and orchestrator documents.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- BRIEFING.md — Working memory and context
- progress.md — Heartbeat and task progress
