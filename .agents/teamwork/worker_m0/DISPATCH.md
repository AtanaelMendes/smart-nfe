# DISPATCH — Worker M0 (Branch Setup & Baseline Verification)

## Mission
Initialize the feature branch `feature/preparacoes-unificadas` from the current clean `master` branch in `c:\www\smart-nfe` without modifying `master` directly. Verify baseline tests, lint, and build.

## Path to ORIGINAL_REQUEST.md
`c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md`

## Path to PROJECT.md
`c:\www\smart-nfe\.agents\teamwork\PROJECT.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Tasks
1. Verify working directory is `c:\www\smart-nfe`.
2. Check `git status` to ensure working tree is clean (apart from `.agents/teamwork/` metadata).
3. Create and switch to branch `feature/preparacoes-unificadas`:
   `git checkout -b feature/preparacoes-unificadas`
4. Verify current active branch is `feature/preparacoes-unificadas`.
5. Run baseline verification commands:
   - `npm test` (must report 383 passed, 0 failed)
   - `npm run lint` (must pass with 0 errors)
   - `npm run build` (must compile successfully)
6. Write a comprehensive report to `c:\www\smart-nfe\.agents\teamwork\worker_m0\handoff.md` with command outputs and verification evidence.
7. Send a message to parent when done.


## 2026-11-13T13:39:02Z
You are Worker M0 for SmartNFe.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\worker_m0\
Path to ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Path to DISPATCH.md: c:\www\smart-nfe\.agents\teamwork\worker_m0\DISPATCH.md
Path to PROJECT.md: c:\www\smart-nfe\.agents\teamwork\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Follow the instructions in DISPATCH.md:
1. In c:\www\smart-nfe, create and switch to feature branch: `git checkout -b feature/preparacoes-unificadas`.
2. Verify active branch is `feature/preparacoes-unificadas` and git status is clean (except .agents/teamwork/ metadata).
3. Run baseline verification: `npm test`, `npm run lint`, `npm run build`.
4. Document all outputs and results in c:\www\smart-nfe\.agents\teamwork\worker_m0\handoff.md.
5. Send a message to parent when finished.
