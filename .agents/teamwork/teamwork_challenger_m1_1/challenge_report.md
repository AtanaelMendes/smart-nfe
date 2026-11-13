# Challenge Report — Milestone 1: Allocation Engine & BigInt Decimal Math

**Agent**: Challenger 1 (`teamwork_challenger_m1_1`)  
**Parent Orchestrator**: `f64908f7-618d-4f21-bf78-58657f1ff50c`  
**Milestone**: Milestone 1 — Core Allocation Engine & Repositories  
**Target Files**: `app/lib/calculations/decimal.js`, `app/lib/calculations/allocationEngine.js`  
**Timestamp**: 2026-11-13T14:25:00Z  

---

## Challenge Summary

**Overall risk assessment**: MEDIUM  
**Verdict**: **FAIL** (1 critical defect discovered in `checkUnitCompatibility` for multi-word SEFAZ physical families).

While the BigInt pure decimal arithmetic (`decimal.js`), conservation invariant oracle (N->M matrix), cent conservation under indivisible apportionments, and negative quantity Trojan injection defenses are exceptionally robust and passed 100% of adversarial stress tests (25/26 assertions passed across 5 adversarial suites), the unit compatibility validator (`checkUnitCompatibility`) fails on multi-word synonyms with spaces (e.g., `METRO QUADRADO`, `METROS QUADRADOS`, `METRO CUBICO`, `METROS CUBICOS`).

---

## Challenges

### [Medium] Challenge 1: Space Stripping in `normalizeUnit` Breaks Multi-Word Synonyms in `UNIT_FAMILIES`

- **Assumption challenged**: The worker assumed that `normalizeUnit(unitStr)` would safely normalize all units and that `getUnitFamily(normalizedUnit)` could look up the normalized string directly in `members.includes(normalizedUnit)` against the `UNIT_FAMILIES` dictionary.
- **Attack scenario**: An imported fiscal invoice contains items with unit `'METRO QUADRADO'` (or `'METRO CUBICO'`). Another invoice or user target uses `'M2'` (or `'M3'`). When `checkUnitCompatibility('M2', 'METRO QUADRADO')` or `checkUnitCompatibility('M3', 'METRO CUBICO')` is invoked:
  1. `normalizeUnit('METRO QUADRADO')` executes `.replace(/[^A-Z0-9]/g, '')`, stripping the space and producing `'METROQUADRADO'`.
  2. `getUnitFamily('METROQUADRADO')` checks `members.includes('METROQUADRADO')`.
  3. Since `UNIT_FAMILIES.AREA_M2` stores the un-normalized string `'METRO QUADRADO'` (with a space), `'METROQUADRADO'` does not match!
  4. `getUnitFamily` returns `null` for `'METRO QUADRADO'`.
  5. `checkUnitCompatibility('M2', 'METRO QUADRADO')` returns `false`!
- **Blast radius**: Prevents valid N->M allocation of goods measured in square meters (`M2` vs `METRO QUADRADO`) or cubic meters (`M3` vs `METRO CUBICO`), generating false-positive incompatibility errors and blocking export preparations in real customs operations.
- **Mitigation / Recommended Fix**:
  In `app/lib/calculations/allocationEngine.js`:
  Either update `getUnitFamily` (lines 154-162) to normalize dictionary members during comparison:
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
  Or ensure `UNIT_FAMILIES` includes pre-normalized forms (e.g. `'METROQUADRADO'`, `'METROCUBICO'`).

---

## Stress Test Results

Executed via automated test harness: `tests/tier5/m1_challenger1_allocation_adversarial.test.mjs`

### Suite 1: Cent Conservation Remainder Stress (Adversarial Indivisible Apportionment)
- `100.00 / 3 parts` → `['33.33', '33.33', '33.34']` → `sum === '100.00'` → **PASS**
- `10.00 / 7 parts (scale 2)` → 6 x `1.42` + 1 x `1.48` → `sum === '10.00'` → **PASS**
- `10.0000 / 7 parts (scale 4)` → 6 x `1.4285` + 1 x `1.4290` → `sum === '10.0000'` → **PASS**
- `1.00 / 11 parts (scale 2)` → 10 x `0.09` + 1 x `0.10` → `sum === '1.00'` → **PASS**
- `0.01 / 10 parts (extreme sub-cent)` → 9 x `0.00` + 1 x `0.01` → `sum === '0.01'` → **PASS**
- `decimalApportionProportional` with asymmetric irrational-like weights `['3.1415', '2.7182', '1.4142', '0.5772', '1.6180']` on `12345.67` → all parts positive, `sum === '12345.67'` → **PASS**
- Multi-source accessory expenses with prime values (Frete: 33.33, 99.99, 100.00, 0.01 across 7 destinations) → sums match to exact cent across all categories → **PASS**
- Destinations with 0.00 product total receive 0.00 expenses without leaking cents → **PASS**
- Fuzzing loop (100 random indivisible amounts across 2 to 37 destinations) → 100% exact cent conservation → **PASS**

### Suite 2: BigInt Extreme Precision & Massive Value Boundaries
- 4-decimal quantity `1234567.8901` * 10-decimal unit price `0.1234567891` → `152415.78763770767791` (Half-Up 2 decimals: `152415.79`) → **PASS**
- Astronomical numbers > `Number.MAX_SAFE_INTEGER` ($9 \times 10^{15}$): $10^{18}$ addition, subtraction, and $10^{12} \times 10^{12} = 10^{24}$ multiplication without scientific notation or precision loss → **PASS**
- Unit price with 10 decimal places (`0.0001234567`) in `calculateAllocationMatrix` → preserved intact, line total rounded Half-Up → **PASS**
- Recurring division half-up rounding (`100.00 / 3` scale 6 = `33.333333`) and division by zero defense (`500.00 / 0 = 0.00`) → **PASS**
- Vector operations (`decimalSum`, `decimalMin`, `decimalMax`, `decimalClamp`) with extreme negative and positive values → **PASS**

### Suite 3: Conservation Invariant Oracle (Monte Carlo / Randomized N->M Fuzzing)
- 200 randomized N->M scenarios ($N \in [1..4]$, $M \in [1..4]$, random quantities, unit prices, prior active allocations, and balanced/partial/excess modes):
  - Invariant 1: `availableQty === originalQty - priorAllocatedQty` (verified 100% of trials) → **PASS**
  - Invariant 2: `allocatedQtyTotal === sum(destAllocations)` (verified 100% of trials) → **PASS**
  - Invariant 3: `remainingQty === availableQty - allocatedQtyTotal` (verified 100% of trials) → **PASS**
  - Invariant 4: Excess detection oracle (`hasExcess: true`, `status: 'excess'`, `canSave: false`) (verified 100% of trials) → **PASS**
  - Invariant 5: Balanced detection oracle (`remainingQty === '0.0000'`, `status: 'ok'`, `canSave: true`) (verified 100% of trials) → **PASS**
- Provenance Identity Isolation: Items with identical product code `SAME-PRODUCT-100` from different invoices (`nfe-alpha` and `nfe-beta`) are NEVER merged into a single destination line → **PASS**

### Suite 4: Negative Quantity Injection Attack (Adversarial Integrity Attacks)
- Direct negative allocation in destination note (`-5.0000` on `50.0000` original) → `hasNegative: true`, `hasExcess: true`, `canSave: false`, `isValid: false` → **PASS**
- Trojan Horse Zero-Sum Attack (+15.0000 to Dest A and -5.0000 to Dest B on 10.0000 original) → blocked (`canSave: false`, `hasNegative: true`) → **PASS**
- Negative in original quantity (`-100.0000`) or prior allocation → blocked (`hasExcess: true`, `status: 'excess'`) → **PASS**
- Negative formatting variants (`'-0'` treated as zero; `'-0.0001'` treated as strictly negative) → **PASS**
- `validateAllocationBatch` rejects negative quantities in batch reports → **PASS**

### Suite 5: Unit Compatibility Oracle & SEFAZ Physical Families
- Compatibility for single-word synonyms across 15 families (KG/KGS/QUILOGRAMA, UN/PC/PECA, L/LITRO, TON/T, etc.) → **PASS**
- Cross-family rejection of incompatible pairs (`KG` vs `UN`, `L` vs `M`, `CX` vs `KG`, `TON` vs `KG`, `DZ` vs `PAR`, etc.) → **PASS**
- Diacritics and casing for single words (`PEÇA` -> `PECA`, `PÇA` -> `PCA`, `DÚZIA` -> `DUZIA`, `M²` -> `M2`, `M³` -> `M3`) → **PASS**
- Object input formats (`uCom`, `uTrib`, `unidade`, `unit`) → **PASS**
- Permissive fallback for empty/null and custom unrecognized units → **PASS**
- Multi-word synonyms with spaces (`checkUnitCompatibility('M2', 'METRO QUADRADO')`, `checkUnitCompatibility('M3', 'METRO CUBICO')`) → **FAIL** (returns `false` instead of `true`).

---

## Unchallenged Areas

- UI component rendering of matrix cells (`/preparacoes/nova`) — strictly Milestone 4 scope.
- Database persistence to external SQL backend — out of scope (SmartNFe is client-only architecture).
