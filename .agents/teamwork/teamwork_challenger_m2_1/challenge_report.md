# Adversarial Challenge Report: Decimal Calculation Engine (Milestone 2)

**Agent:** `teamwork_challenger_m2_1`  
**Milestone:** M2 — Core Calculations & Business Logic  
**Date:** 2026-11-04  
**Target:** `app/lib/calculations/` (`decimal.js`, `invoiceTotals.js`, `divisionMath.js`, `index.js`)  
**Test Suite Created:** `tests/tier5/m2_decimal_adversarial_stress.test.mjs` (25 tests, 5 suites, 0 failures)

---

## Challenge Summary

**Overall risk assessment**: **LOW**

The Decimal Calculation Engine in `app/lib/calculations/` is mathematically robust, clean, and completely eliminates IEEE 754 binary floating-point imprecision through string-based decomposition and scaled `BigInt` arithmetic. It strictly complies with ABNT NBR 5891 Half-Up rounding, gracefully handles division by zero and extreme values (including 20 decimal places and values beyond `Number.MAX_SAFE_INTEGER`), and provides flawless multi-item invoice recalculation and multi-destination batch division across up to 10 destination notes.

Two minor non-blocking edge cases were discovered regarding explicit `null` scale arguments and raw scientific notation numbers, for which clear mitigations are documented below.

---

## Challenges

### [Low] Challenge 1: Explicit `scale = null` produces trailing decimal point (`"12."`)

- **Assumption challenged**: The function assumes callers pass either a valid non-negative integer or omit the scale argument (relying on default `scale = 2`).
- **Attack scenario**: If a caller explicitly passes `null` as the second argument, e.g., `roundDecimal('12.3456', null)` or `decimalDivide('10', '3', null)`.
- **Underlying cause**: In JavaScript, `null >= 0` evaluates to `true` (since `Number(null) === 0`), causing `targetScale` to be assigned `null`. In `formatBigInt`, strict check `scale === 0` evaluates to `false` (`null === 0` is false), and string slicing computes `fracPart = s.slice(s.length - null)` which produces an empty string, yielding `"12."` instead of `"12.00"` or `"12"`.
- **Blast radius**: Low. Internal UI code and standard usage omit `scale` or pass explicit numbers (2, 4, etc.). No crash or exception occurs.
- **Mitigation**: Update the scale check in `decimal.js` (`roundDecimal` and `decimalDivide`):
  ```javascript
  const targetScale = (typeof scale === 'number' && scale >= 0) ? Math.floor(scale) : 2;
  ```

### [Low] Challenge 2: Raw Number scientific notation inputs strip exponent characters

- **Assumption challenged**: Inputs to `cleanDecimalString` are fiscal strings (`"0.0000001"`, `"1250.50"`).
- **Attack scenario**: If a caller passes a raw JavaScript Number primitive in scientific notation, such as `1e-7` or `1e21`.
- **Underlying cause**: `cleanDecimalString` executes `s.replace(/[^\d.]/g, '')`. When `1e-7` is coerced via `String(1e-7)`, it produces `"1e-7"`, which has the `e` and `-` stripped, resulting in `"17"`.
- **Blast radius**: Low. In SmartNFe, all fiscal data originates from XML strings, form inputs, or mock data strings. Strings with 20 decimal places (`"0.00000000000000000001"`) are parsed with 100% precision.
- **Mitigation**: If scientific notation Number primitives must be supported in future milestones, format numbers via `Intl.NumberFormat` or convert exponentials to full decimal notation prior to stripping.

### [Low] Challenge 3: Negative discounts add to invoice grand total

- **Assumption challenged**: Discount inputs are non-negative.
- **Attack scenario**: Passing `discount = "-20.00"` to `calculateInvoiceTotals(items, '-20.00')`.
- **Underlying cause**: The formula strictly follows SEFAZ ($Produtos - Desconto + Frete + Seguro + Outras$). Mathematically, $100.00 - (-20.00) = 120.00$.
- **Blast radius**: Low. UI inputs must validate/sanitize negative discounts to `0.00`. The calculation engine faithfully respects pure arithmetic.
- **Mitigation**: In UI components or repository update hooks, sanitize discount inputs with `decimalCompare(discount, '0') < 0 ? '0.00' : discount`.

---

## Stress Test Results

Comprehensive adversarial testing was performed via `tests/tier5/m2_decimal_adversarial_stress.test.mjs`:

| Category | Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **Float Killer** | `0.1 + 0.2` (scale natural) | `"0.3"` (zero float error) | `"0.3"` | **PASS** |
| **Float Killer** | `0.1 + 0.2` (scales 2, 4, 8) | `"0.30"`, `"0.3000"`, `"0.30000000"` | Exactly as expected | **PASS** |
| **Float Killer** | `0.3 - 0.2` | `"0.1"` (not `0.09999999999999998`) | `"0.1"` | **PASS** |
| **Float Killer** | `0.7 + 0.1` | `"0.8"` (not `0.7999999999999999`) | `"0.8"` | **PASS** |
| **Float Killer** | `0.0001 * 0.0001` (scales natural, 8, 4, 2, 12) | `"0.00000001"`, `"0.0000"`, `"0.00"`, `"0.000000010000"` | Exactly as expected | **PASS** |
| **Float Killer** | `0.001 * 333.3333` (scales natural, 2, 4, 8, 12) | `"0.3333333"`, `"0.33"`, `"0.3333"`, `"0.33333330"`, `"0.333333300000"` | Exactly as expected | **PASS** |
| **Float Killer** | `1 / 3` (scales 2, 4, 8, 12) | `"0.33"`, `"0.3333"`, `"0.33333333"`, `"0.333333333333"` | Exactly as expected | **PASS** |
| **Float Killer** | `2 / 3` (scales 2, 4, 8, 12) | `"0.67"`, `"0.6667"`, `"0.66666667"`, `"0.666666666667"` | Exactly as expected | **PASS** |
| **Float Killer** | Division by zero (`100.00 / 0`) | Returns zeros format (`"0.00"`, `"0.0000"`), no `Infinity` | Returns formatted zeros | **PASS** |
| **Extreme Values** | Zero quantities and prices in `calculateItemTotal` | Returns `"0.00"` | `"0.00"` | **PASS** |
| **Extreme Values** | Null, undefined, empty string in `calculateItemTotal` | Returns `"0.00"` gracefully | `"0.00"` | **PASS** |
| **Extreme Values** | 20 decimal places addition & subtraction | Full 20-digit precision preserved | `1.11111111011111111100`, `0.99999999999999999999` | **PASS** |
| **Extreme Values** | Numbers in trillions (`1.000.000.000.000,00 * 1000`) | Exact arithmetic without truncation | `"1000000000000000.00"` | **PASS** |
| **Extreme Values** | pt-BR strings (`R$ 1.234.567,89`, `-R$ 1.250,50`) | Cleaned to `"1234567.89"`, `"-1250.50"` | Cleaned correctly | **PASS** |
| **ABNT NBR 5891** | Exact half `0.005` to `0.095` to 2 decimals (10 tests) | Increment up: `0.01` to `0.10` | 10/10 matched | **PASS** |
| **ABNT NBR 5891** | Exact half `1.005` to 2 decimals | `"1.01"` (avoids float `1.00` bug) | `"1.01"` | **PASS** |
| **ABNT NBR 5891** | Below half: `0.00499999`, `1.234999999` | Round down: `"0.00"`, `"1.23"` | `"0.00"`, `"1.23"` | **PASS** |
| **ABNT NBR 5891** | Above half: `0.00500001`, `1.235000001` | Round up: `"0.01"`, `"1.24"` | `"0.01"`, `"1.24"` | **PASS** |
| **ABNT NBR 5891** | Symmetric negative half: `-0.005`, `-1.005`, `-2.5` | Round away from zero: `"-0.01"`, `"-1.01"`, `"-3"` | Exactly as expected | **PASS** |
| **ABNT NBR 5891** | Negative below half: `-0.004999` | Round to zero: `"0.00"` (no `"-0.00"`) | `"0.00"` | **PASS** |
| **ABNT NBR 5891** | Cascading 9s: `0.999`, `99.995`, `999999999.995` | Rollover: `"1.00"`, `"100.00"`, `"1000000000.00"` | Exactly as expected | **PASS** |
| **Invoice Totals** | 100 items recalculation with fractional cents | Zero cumulative error; vProd = sum(items) | `"1005.00"`, Total NF `"1013.50"` | **PASS** |
| **Invoice Totals** | Mixed property names (EN/PT) and null items | Ignores nulls, computes correct product total | `"100.00"` | **PASS** |
| **Batch Division** | 10 destination notes: exact distribution | Balance `"0.0000"`, status `"ok"` | Exactly as expected | **PASS** |
| **Batch Division** | 10 destination notes: remainder distribution | Balance `"0.0001"`, status `"remaining"` | Exactly as expected | **PASS** |
| **Batch Division** | 10 destination notes: excess distribution | Balance `"-0.0010"`, status `"excess"` | Exactly as expected | **PASS** |
| **Batch Division** | 10 destination notes: zero intermediate notes | Balance `"0.0000"`, status `"ok"` | Exactly as expected | **PASS** |
| **Batch Division** | 10 destination notes across 3 items via `validateDivisionBatch` | 10 note summaries, each $1.750,00, `isBalanced: true` | Fully balanced | **PASS** |
| **Batch Division** | Split `demo-05` (15 items) across 10 destination notes | 15 items balanced, `canSave: true` | Fully balanced | **PASS** |

---

## Unchallenged Areas

- **SEFAZ Tax Calculation Matrix (ICMS-ST, IPI, PIS/COFINS, Difal)**:
  - Reason not challenged: Out of scope for Milestone 2 MVP. Export invoices in SmartNFe are non-taxable / tax-exempt (imunidade de exportação), and the scope contract focuses on product line totals, discounts, freights, insurance, and balance allocation.
- **Client-Side Currency Mask Input UI**:
  - Reason not challenged: Input masking components (`InputNumber`, `InputText`) are part of UI screens scheduled for M3 and M4. The domain calculation functions accept sanitized strings.
