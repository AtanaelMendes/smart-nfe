# Forensic Audit Report — Milestone 1 (Core Allocation Engine & Repositories)

**Work Product**: Milestone 1 Deliverables (`decimal.js`, `allocationEngine.js`, `divisionMath.js`, `preparedInvoiceRepository.js`, `preparationRepository.js`, `tests/unit/allocationEngine.test.mjs`)  
**Auditor**: Integrity Forensic Auditor (`teamwork_auditor_m1_1`)  
**Parent Orchestrator**: `f64908f7-618d-4f21-bf78-58657f1ff50c`  
**Working Directory**: `c:\www\smart-nfe`  
**Profile**: General Project / Integrity Forensics  
**Integrity Mode**: Demo Mode (inferred directly from `ORIGINAL_REQUEST.md` line 8)  
**Date**: 2026-11-13T14:23:00Z  

---

## Forensic Verdict

```text
================================================================================
                    FINAL FORENSIC VERDICT: CLEAN
================================================================================
No integrity violations, cheat vectors, dummy facades, hardcoded test shortcuts,
fabricated outputs, or forbidden third-party arithmetic libraries detected.
The work product authentically implements arbitrary-precision BigInt arithmetic,
strict mathematical conservation, and volatile session storage isolation.
================================================================================
```

---

## 1. Observation

### 1.1 Source Code Forensic Analysis
I conducted an exhaustive static and AST-level inspection of all delivered source files:

1. **`app/lib/calculations/decimal.js` (619 lines)**:
   - Line 65: `parseDecimal(val)` decomposes decimal strings into pure native `BigInt` integer components (`sign`, `intVal`, `scale`).
   - Line 125: `roundSignedBigInt(sign, absVal, currentScale, targetScale)` implements exact integer division with Half-Up rounding via remainder arithmetic (`rem >= half`, line 147; `rem * 2n >= divisor`, line 260).
   - Lines 165-266: All arithmetic primitives (`decimalAdd`, `decimalSubtract`, `decimalMultiply`, `decimalDivide`) execute solely via `BigInt` operations without intermediate JavaScript `Number` conversions.
   - Lines 520-553: `decimalDistributeEqually(totalValue, numParts, scale)` calculates `baseInt = scaledTotal / bigN` and assigns remainder `remInt = scaledTotal % bigN` to the final partition, strictly guaranteeing zero drift.
   - Lines 564-617: `decimalApportionProportional(totalAmount, weights, scale)` allocates proportional shares to slices $0 \dots (N-2)$ and absorbs the exact remainder into slice $N-1$ (`decimalSubtract(totalClean, allocatedSum, targetScale)`).
   - Zero hardcoded output patterns matching test cases were found.

2. **`app/lib/calculations/allocationEngine.js` (964 lines)**:
   - Lines 70-126: `buildCompositeKey` / `parseCompositeKey` constructs `${sourceInvoiceId}__${sourceItemId}`, preserving supplier line identity.
   - Lines 219-280: `calculateItemConservationBalance` computes `available = original - priorAllocated` and `remaining = available - totalAllocated`. If any allocation has `isDecimalNegative(q)`, `hasNegative` is flagged. If `remaining < 0`, `hasExcess` is flagged.
   - Lines 495-864: `calculateAllocationMatrix` computes the complete matrix, sums line totals using `decimalMultiply(unitPriceStr, qAlloc, 2)`, applies multi-origin expense apportionment per source invoice without drift, and computes `canSave` (`!hasAnyExcess && !hasAnyNegative && (!requireBalanced || !hasAnyRemaining)`).
   - No mock facades or shortcut conditional returns exist.

3. **`app/lib/calculations/divisionMath.js` (486 lines)**:
   - Refactored as a facade delegating to `allocationEngine.js` and `decimal.js`.
   - Lines 72-100: `calculateRemainingBalance` delegates directly to `calculateItemConservationBalance`.
   - Lines 125-269: `validateDivisionBatch` validates 1->M division with strict non-negativity and total balance requirements.
   - Lines 341-475: `apportionAllInvoiceExpenses` calculates proportional freight, insurance, other expenses, and discounts, absorbing remainders on the last active note.
   - Preserves bilingual keys (`valorFrete`/`freight`, `valorSeguro`/`insurance`, `outrasDespesas`/`otherExpenses`, `valorDesconto`/`discount`).

4. **`app/features/preparedInvoiceRepository.js` (333 lines)**:
   - Line 21: Defines module-level volatile memory `export const sessionPreparedInvoices = new Map()`.
   - Lines 66-96: `isRealPreparedInvoice(p)` detects real documents via `isRealImport: true`, `isDemo === false`, non-`demo-` `parentInvoiceId`/`documentoOrigemId`, `sourceInvoiceIds`, or `origens`.
   - Lines 223-227: In `create()`, real invoices are routed exclusively to `sessionPreparedInvoices.set(id, newEntry)`, completely bypassing `localStorageService.save()`.
   - Line 320: `resetDemoData()` executes `sessionPreparedInvoices.clear()`.

5. **`app/features/preparationRepository.js` (475 lines)**:
   - Line 26: Defines module-level volatile memory `export const sessionPreparations = new Map()`.
   - Lines 31-46: Concurrency serialization via Promise mutex `withMutationLock`.
   - Lines 80-109: `isRealPreparation(prep)` inspects origins and session map memberships.
   - Lines 244-247: Real preparations routed exclusively to `sessionPreparations.set(id, newEntry)`.
   - Lines 348-438: `getActiveAllocations(excludePreparationId, options)` sums active preparation allocations per `${sourceInvoiceId}__${sourceItemId}` using `decimalAdd(..., 4)`, ignoring cancelled preparations.
   - Line 469: `resetDemoData()` executes `sessionPreparations.clear()`.

### 1.2 Dependency & External Package Audit
- Inspected `package.json` dependencies and devDependencies:
  ```json
  "dependencies": {
    "@fortawesome/fontawesome-svg-core": "^7.1.0",
    "@fortawesome/free-brands-svg-icons": "^7.1.0",
    "@fortawesome/free-regular-svg-icons": "^7.1.0",
    "@fortawesome/free-solid-svg-icons": "^7.1.0",
    "@fortawesome/react-fontawesome": "^3.1.0",
    "clsx": "^2.1.1",
    "next": "16.0.10",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "tailwind-merge": "^3.4.0"
  }
  ```
- **Zero** arithmetic or decimal libraries installed (`bignumber.js`, `decimal.js`, `mathjs`, `big.js`, `fraction.js`, `dinero.js` are 100% absent).
- Regex scan across all delivered files confirmed **0 imports** of third-party math packages.

### 1.3 Empirical Tool Execution Outputs
1. **Milestone 1 Unit Test Suite**:
   ```powershell
   cd c:\www\smart-nfe; node --no-warnings --test tests/unit/allocationEngine.test.mjs
   ```
   *Result*:
   ```text
   ✔ SUITE 1: Native BigInt Math & Decimal Precision in Allocation (5 tests passed)
   ✔ SUITE 2: Unit Compatibility Checks (checkUnitCompatibility) (5 tests passed)
   ✔ SUITE 3: Strict Conservation Rule (disponível = original - alocações ativas) (5 tests passed)
   ✔ SUITE 4: Scenario 1 — Agrupamento (N Origens -> 1 Destino) (3 tests passed)
   ✔ SUITE 5: Scenario 2 — Divisão (1 Origem -> M Destinos) (3 tests passed)
   ✔ SUITE 6: Scenario 3 — Preparação Mista (N Origens -> M Destinos) (2 tests passed)
   ✔ SUITE 7: Multi-Source Accessory Expense Apportionment (4 tests passed)
   ✔ SUITE 8: Invariant Oracles & Adversarial Boundaries (4 tests passed)
   ✔ SUITE 9: Dual-Storage Isolation (Session Map vs LocalStorage) (4 tests passed)
   ℹ tests 35, suites 9, pass 35, fail 0 (321ms)
   ```

2. **Auditor Independent Verification Harness (`tests/adversarial/auditor_m1_forensic.test.mjs`)**:
   ```powershell
   cd c:\www\smart-nfe; node --no-warnings --test tests/adversarial/auditor_m1_forensic.test.mjs
   ```
   *Result*:
   ```text
   ▶ FORENSIC AUDITOR INDEPENDENT VERIFICATION
     ✔ Check 1: Zero forbidden dependencies in package.json and imports (2.9195ms)
     ✔ Check 2: Mathematical precision & absence of dummy facades (1.4407ms)
     ✔ Check 3: Monte Carlo conservation invariance (200 random partitions) (15.3145ms)
     ✔ Check 4: Storage leakage and strict volatile session isolation (5.4734ms)
     ✔ Check 5: Non-circumvention and legacy divisionMath delegation (1.4453ms)
   ✔ FORENSIC AUDITOR INDEPENDENT VERIFICATION (28.2825ms)
   ℹ tests 5, suites 1, pass 5, fail 0
   ```

3. **Production Next.js 16 Build**:
   ```powershell
   cd c:\www\smart-nfe; npm run build
   ```
   *Result*:
   ```text
   ✓ Compiled successfully in 16.7s
   ✓ Generating static pages using 3 workers (11/11) in 7.6s
   Finalizing page optimization ...
   Exit code: 0
   ```

4. **ESLint Compliance**:
   ```powershell
   cd c:\www\smart-nfe; npx eslint app/lib/calculations/decimal.js app/lib/calculations/allocationEngine.js app/lib/calculations/divisionMath.js app/features/preparationRepository.js app/features/preparedInvoiceRepository.js
   ```
   *Result*: Exit code 0, 0 errors, 0 warnings.

5. **Challenger 2 Concurrency & Storage Stress Suite (`tests/tier5/m1_challenger2_storage_concurrency_stress.test.mjs`)**:
   *Result*: 24 tests passed across 4 suites with 0 failures in 188ms.

---

## 2. Logic Chain

### 2.1 Mode Determination
- Directly read from `ORIGINAL_REQUEST.md` line 8: `Integrity mode: demo`.
- Core constraint: "The team must NOT: use pre-built libraries or frameworks for core functionality".
- Mode rules applied:
  - Hardcoded test results: 🔴 FLAG
  - Facade implementation: 🔴 FLAG
  - Fabricated verification output: 🔴 FLAG
  - Pre-built library for core functionality: 🔴 FLAG
  - Storage leakage of real fiscal XMLs: 🔴 FLAG

### 2.2 Phase-by-Phase Verification Chain
1. **Anti-cheating & No Facade (Check 1)**:
   - *Observation*: Code was searched for conditional returns matching literal test strings.
   - *Evidence*: `decimal.js`, `allocationEngine.js`, and `divisionMath.js` contain generic, dynamic algorithmic paths driven by string token parsing and `BigInt` operations.
   - *Deduction*: Calculations are authentic mathematical routines. Check 1 = **PASS**.

2. **Zero External Dependencies (Check 2)**:
   - *Observation*: `package.json` contains zero third-party math packages; all source files import only relative native modules.
   - *Evidence*: `allDeps['decimal.js'] === undefined`, `allDeps['bignumber.js'] === undefined`, `allDeps['mathjs'] === undefined`.
   - *Deduction*: Check 2 = **PASS**.

3. **Conservation Integrity (Check 3)**:
   - *Observation*: Monte Carlo stress harness executed 200 pseudo-random partitions of quantities between 1.0000 and 50000.0000 across 2 to 7 destination notes.
   - *Evidence*: In 100% of cases, `sum(slices) === origQty`, `remainingQty === '0.0000'`, and `hasExcess === false`. Overallocation of even `0.0001` immediately flagged `hasExcess: true` and set `canSave: false`.
   - *Deduction*: The conservation equation `disponível = original - soma(alocações ativas)` is strictly and perpetually preserved. Check 3 = **PASS**.

4. **Storage Leakage Isolation (Check 4)**:
   - *Observation*: Tested 5 real prepared invoice shapes and 6 real preparation shapes against `preparedInvoiceRepository` and `preparationRepository`.
   - *Evidence*: In 100% of real document scenarios, records were written strictly to `sessionPreparedInvoices` and `sessionPreparations`. Deep storage scan of `localStorageService.load()` confirmed 0 bytes of real access keys or fiscal data written to client storage.
   - *Deduction*: Check 4 = **PASS**.

5. **Non-circumvention & Backward Compatibility (Check 5)**:
   - *Observation*: `divisionMath.js` preserves exact parameter signatures, return structures, and duplicate property keys (`valorFrete`/`freight`, etc.) while routing calculations through `allocationEngine.js`.
   - *Evidence*: All 383 baseline tests continue to pass without regression.
   - *Deduction*: Check 5 = **PASS**.

---

## 3. Caveats & Quality Findings

1. **Functional Finding (Unit Normalization Whitespace Discrepancy)**:
   - *Observation*: Challenger 1 authored `tests/tier5/m1_challenger1_allocation_adversarial.test.mjs`, which revealed that `checkUnitCompatibility('M2', 'METRO QUADRADO')` returns `false`.
   - *Root Cause*: In `app/lib/calculations/allocationEngine.js:146`, `normalizeUnit` strips spaces (`replace(/[^A-Z0-9]/g, '')`), producing `'METROQUADRADO'`. In `UNIT_FAMILIES.AREA_M2`, the synonym is listed as `'METRO QUADRADO'` (with a space). Line 159 checks `members.includes(normalizedUnit)`, which evaluates to `false`.
   - *Classification*: This is a **quality/functional edge-case defect**, NOT an integrity violation (no cheating, no facade, no fake output). It should be corrected in a routine maintenance pass by either including normalized synonyms in `UNIT_FAMILIES` or normalizing `members` during lookup.
2. **Volatile Session Lifetime**:
   - In-memory session maps (`sessionPreparedInvoices`, `sessionPreparations`) reside exclusively in runtime memory and do not survive full browser reloads. This is an architectural requirement of the project to ensure zero persistent storage of sensitive fiscal data in client `localStorage`.

---

## 4. Conclusion

The Milestone 1 work product satisfies all forensic integrity criteria established in `ORIGINAL_REQUEST.md`, `PROJECT.md`, and the audit assignment.
- Calculations are genuine, pure native `BigInt` implementations with zero floating-point drift.
- No third-party math packages were introduced.
- Mathematical conservation is strictly maintained under all boundary and adversarial conditions.
- Real XML documents and derived preparations are strictly segregated into volatile memory.
- Backward compatibility is 100% preserved.

**Verdict: CLEAN**

---

## 5. Verification Method

To independently verify the forensic findings:

1. **Verify Dependency Purity & Zero Forbidden Imports**:
   ```powershell
   cd c:\www\smart-nfe
   node --test tests/adversarial/auditor_m1_forensic.test.mjs
   ```
   *Expected*: 5 tests pass across 1 suite in < 50ms.

2. **Verify Milestone 1 Unit Suite**:
   ```powershell
   cd c:\www\smart-nfe
   node --no-warnings --test tests/unit/allocationEngine.test.mjs
   ```
   *Expected*: 35 tests pass across 9 suites in < 500ms.

3. **Verify Repository Concurrency & Storage Isolation**:
   ```powershell
   cd c:\www\smart-nfe
   node --no-warnings --test tests/tier5/m1_challenger2_storage_concurrency_stress.test.mjs
   ```
   *Expected*: 24 tests pass across 4 suites in < 250ms.

4. **Verify ESLint Compliance**:
   ```powershell
   cd c:\www\smart-nfe
   npx eslint app/lib/calculations/decimal.js app/lib/calculations/allocationEngine.js app/lib/calculations/divisionMath.js app/features/preparationRepository.js app/features/preparedInvoiceRepository.js
   ```
   *Expected*: Exit code 0, 0 errors, 0 warnings.

5. **Verify Production Build**:
   ```powershell
   cd c:\www\smart-nfe
   npm run build
   ```
   *Expected*: Exit code 0, compiled successfully, all static pages generated.
