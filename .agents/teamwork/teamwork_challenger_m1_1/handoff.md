# Handoff Report — Milestone 1: Core Allocation Engine & Pure Decimal Arithmetic

**Agent**: Challenger 1 (`teamwork_challenger_m1_1`)  
**Parent Orchestrator**: `f64908f7-618d-4f21-bf78-58657f1ff50c`  
**Milestone**: Milestone 1 — Core Allocation Engine & Repositories  
**Branch**: `feature/preparacoes-unificadas`  
**Timestamp**: 2026-11-13T14:30:00Z  
**Verdict**: **FAIL**  

---

## 1. Observation

### 1.1 Empirical Verification Scope
Empirical stress testing and adversarial challenge were performed on:
- `app/lib/calculations/decimal.js` (619 lines)
- `app/lib/calculations/allocationEngine.js` (964 lines)

An independent adversarial stress harness was authored at:
- `tests/tier5/m1_challenger1_allocation_adversarial.test.mjs` (819 lines, 26 tests across 5 suites).

### 1.2 Tool Commands and Execution Results
- **Execution Command**:
  ```powershell
  cd c:\www\smart-nfe; node --no-warnings --test tests/tier5/m1_challenger1_allocation_adversarial.test.mjs
  ```
- **Execution Output**:
  ```text
  ▶ ADVERSARIAL SUITE 1: Cent Conservation Remainder Stress (8 tests passed)
    ✔ 1.1: Apportion indivisible 100.00 across 3 destinations (33.33, 33.33, 33.34) with exact cent conservation
    ✔ 1.2: Apportion indivisible 10.00 across 7 destinations without losing or creating a single cent
    ✔ 1.3: Apportion indivisible 1.00 across 11 destinations (prime division)
    ✔ 1.4: Extreme sub-cent remainder: 0.01 across 10 destinations
    ✔ 1.5: Proportional apportionment (decimalApportionProportional) with asymmetric irrational-like weights
    ✔ 1.6: Multi-source accessory expenses with prime values apportioned across 7 destinations
    ✔ 1.7: Destinations with 0.00 product total strictly receive 0.00 expenses without bleeding cents
    ✔ 1.8: Fuzzing Loop (100 random indivisible amounts across 2 to 37 destinations)
  ▶ ADVERSARIAL SUITE 2: BigInt Extreme Precision & Massive Values (5 tests passed)
    ✔ 2.1: Multiplies quantity with 4 decimals by unit price with 10 decimals without IEEE-754 drift
    ✔ 2.2: Computes astronomical values > Number.MAX_SAFE_INTEGER (9e15) without overflow
    ✔ 2.3: Preserves 10 decimal places in unit price in calculateAllocationMatrix
    ✔ 2.4: Extreme division precision and zero division defense
    ✔ 2.5: Vector operations (decimalSum, decimalMin, decimalMax, decimalClamp) with extreme numbers
  ▶ ADVERSARIAL SUITE 3: Conservation Invariant Oracle (N->M Random Allocations) (2 tests passed)
    ✔ 3.1: Monte Carlo Invariant Oracle over 200 randomized N->M scenarios
    ✔ 3.2: Provenance Identity Isolation: Items with same code from different invoices NEVER merge
  ▶ ADVERSARIAL SUITE 4: Negative Quantity Injection Attack (5 tests passed)
    ✔ 4.1: Direct negative allocation in destination note is strictly blocked
    ✔ 4.2: Trojan Horse Zero-Sum Attack (+15.0000 and -5.0000 on original 10.0000) is foiled
    ✔ 4.3: Negative original quantity or negative active allocations are strictly blocked
    ✔ 4.4: Negative string representations and formatting variants (-0 vs -0.01 vs - 10)
    ✔ 4.5: validateAllocationBatch rejects negative quantities across batch reports
  ▶ ADVERSARIAL SUITE 5: Unit Compatibility Oracle & SEFAZ Physical Families (5 passed, 1 failed)
    ✔ 5.1: Validates compatibility for single-word canonical SEFAZ synonyms across families
    ✔ 5.2: Strictly rejects cross-family incompatible unit pairs
    ✔ 5.3: Normalizes Brazilian Portuguese diacritics, case variations and whitespace for single-word units
    ✔ 5.4: Supports item objects with various fiscal property keys (uCom, uTrib, unidade, unit)
    ✔ 5.5: Graceful fallback for empty, null, or identical unrecognized units
    ✖ 5.6: [DEFECT REPRODUCTION] Multi-word synonyms with spaces (METRO QUADRADO, METRO CUBICO) in UNIT_FAMILIES fail checkUnitCompatibility due to normalizeUnit regex
  
  ℹ tests 26
  ℹ suites 5
  ℹ pass 25
  ℹ fail 1
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ```

- **Verbatim Failure Output**:
  ```text
  ✖ 5.6: [DEFECT REPRODUCTION] Multi-word synonyms with spaces (METRO QUADRADO, METRO CUBICO) in UNIT_FAMILIES fail checkUnitCompatibility due to normalizeUnit regex (1.12ms)
    AssertionError [ERR_ASSERTION]: Defect in allocationEngine.js: M2 and METRO QUADRADO must be compatible, but getUnitFamily returned null due to space stripping in normalizeUnit
    
    false !== true
    
        at TestContext.<anonymous> (file:///C:/www/smart-nfe/tests/tier5/m1_challenger1_allocation_adversarial.test.mjs:812:12)
  ```

### 1.3 Exact Code Defect in `app/lib/calculations/allocationEngine.js`
In `app/lib/calculations/allocationEngine.js`:
1. Lines 51-52 define:
   ```javascript
   AREA_M2: ['M2', 'M²', 'MT2', 'METRO QUADRADO', 'METROS QUADRADOS'],
   VOLUME_M3: ['M3', 'M³', 'MT3', 'METRO CUBICO', 'METROS CUBICOS'],
   ```
2. Lines 137-147 define:
   ```javascript
   export function normalizeUnit(unitStr) {
     if (!unitStr) return '';
     return String(unitStr)
       .trim()
       .toUpperCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .replace(/[²]/g, '2')
       .replace(/[³]/g, '3')
       .replace(/[^A-Z0-9]/g, ''); // <--- REMOVES ALL SPACES
   }
   ```
   Calling `normalizeUnit('METRO QUADRADO')` strips spaces and returns `'METROQUADRADO'`.
3. Lines 154-162 define:
   ```javascript
   function getUnitFamily(normalizedUnit) {
     if (!normalizedUnit) return null;
     for (const [family, members] of Object.entries(UNIT_FAMILIES)) {
       if (members.includes(normalizedUnit)) { // <--- CHECKS UN-NORMALIZED MEMBERS ARRAY
         return family;
       }
     }
     return null;
   }
   ```
   `members` contains `'METRO QUADRADO'` (with space).
   `members.includes('METROQUADRADO')` evaluates to `false`.
   `getUnitFamily('METROQUADRADO')` returns `null`.
   Therefore:
   - `checkUnitCompatibility('M2', 'METRO QUADRADO')` returns `false` (should be `true`).
   - `checkUnitCompatibility('M3', 'METRO CUBICO')` returns `false` (should be `true`).
   - `checkUnitCompatibility('MT2', 'METROS QUADRADOS')` returns `false` (should be `true`).
   - `checkUnitCompatibility('MT3', 'METROS CUBICOS')` returns `false` (should be `true`).

---

## 2. Logic Chain

1. **Intended Domain Architecture**:
   The worker intended for Brazilian fiscal units with synonyms like `METRO QUADRADO` and `M2` to be fully compatible under canonical family `AREA_M2`, and `METRO CUBICO` and `M3` under `VOLUME_M3`. This is evidenced by their explicit presence in `UNIT_FAMILIES` (lines 51-52).

2. **Regex Normalization Side Effect**:
   In `normalizeUnit`, the regex `.replace(/[^A-Z0-9]/g, '')` sanitizes input by removing spaces and punctuation. While this works well for diacritics (`PEÇA` -> `PECA`), it condenses multi-word units (`'METRO QUADRADO'` -> `'METROQUADRADO'`).

3. **Array Membership Inconsistency**:
   In `getUnitFamily`, the normalized token `'METROQUADRADO'` is searched inside the raw `members` array using `members.includes(normalizedUnit)`. Because `members` was not normalized, the string `'METRO QUADRADO'` never matches `'METROQUADRADO'`.

4. **False Rejection Blast Radius**:
   When comparing an item in `M2` with an item in `METRO QUADRADO`, `uA` normalizes to `M2` (found in `AREA_M2`), but `uB` normalizes to `METROQUADRADO` (family `null`). Since `famA !== famB`, the engine returns `false`, erroneously rejecting valid exports of timber, flooring, textiles, liquids, and bulk materials.

---

## 3. Caveats

- **Aritmética e Conservação Impecáveis**:
  Aside from the unit compatibility lookup bug, the core mathematical architecture is exceptional:
  - BigInt math completely eliminates IEEE-754 drift across additions, subtractions, multiplications, and divisions.
  - Cent conservation is strictly maintained: 100 random fuzzing splits across prime numbers of parts generated zero penny drift.
  - Multi-source expense apportionment strictly conserves freight, insurance, and other expenses down to the exact cent, with destinations with 0.00 products receiving strictly 0.00 expenses.
  - Conservation invariant $remainingQty = originalQty - prior - sum(allocations)$ passed 200/200 randomized Monte Carlo stress trials.
  - Negative quantity attacks (including trojan $+15/-5$ zero-sum compensations) are strictly blocked with `hasNegative: true` and `canSave: false`.
- **Review-Only Constraint**:
  In accordance with Teamwork protocol rules, the Challenger is strictly review-only and does not modify implementation files. The bug must be remediated by the Worker.

---

## 4. Conclusion

**Verdict: FAIL**

The implementation in `app/lib/calculations/allocationEngine.js` fails Adversarial Scenario 5 due to the space-stripping discrepancy between `normalizeUnit` and `getUnitFamily`.

### Required Worker Fix:
In `app/lib/calculations/allocationEngine.js`, update `getUnitFamily` (lines 154-162) to normalize members during lookup:
```javascript
function getUnitFamily(normalizedUnit) {
  if (!normalizedUnit) return null;
  for (const [family, members] of Object.entries(UNIT_FAMILIES)) {
    if (members.some((m) => normalizeUnit(m) === normalizedUnit)) {
      return family;
    }
  }
  return null;
}
```
Alternatively, include the normalized forms (`'METROQUADRADO'`, `'METROSQUADRADOS'`, `'METROCUBICO'`, `'METROSCUBICOS'`) directly in `UNIT_FAMILIES`.

---

## 5. Verification Method

To independently verify the defect and validate the subsequent fix:

1. **Reproduce the Defect**:
   ```powershell
   cd c:\www\smart-nfe
   node --no-warnings --test tests/tier5/m1_challenger1_allocation_adversarial.test.mjs
   ```
   *Current Result*: 25 passed, 1 failed (test 5.6 fails with `false !== true`).

2. **Verify Quick Node Reproduction**:
   ```powershell
   cd c:\www\smart-nfe
   node -e "import('./app/lib/calculations/allocationEngine.js').then(m => console.log('M2 vs METRO QUADRADO:', m.checkUnitCompatibility('M2', 'METRO QUADRADO')))"
   ```
   *Current Result*: outputs `M2 vs METRO QUADRADO: false`. Expected: `true`.

3. **Post-Fix Invalidation Condition**:
   Once the worker applies the fix in `getUnitFamily`, both commands must exit with code 0, and all 26 tests in `m1_challenger1_allocation_adversarial.test.mjs` must pass.
