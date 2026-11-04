# Handoff Report — Explorer 3: DataTable Sparse Array Vulnerability & Holistic Verification Strategy

**Agent:** `teamwork_explorer_m2_it2_3`  
**Milestone:** Milestone 2 Iteration 2 (Remediation of Challenger 2 Findings)  
**Caller / Parent:** `3aeeebdd-68a6-49e6-8f40-494114a9f1f7`  
**Date:** 2026-11-04  
**Type:** Hard Handoff (Task Complete)

---

## 1. Observation

### 1.1 Verbatim Error in Challenger 2 Handoff & Test Harness
In `c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m2_2\adversarial_m2_storage_repo.mjs`, Suite 5 test 5.4 documented:
```javascript
  it('5.4: DataTable com array contendo elementos null/undefined (verificação de vulnerabilidade)', () => {
    // Documenta a vulnerabilidade encontrada:
    assert.throws(
      () => {
        renderToStaticMarkup(
          React.createElement(DataTable, {
            data: [null, undefined, { id: 'valid', nome: 'Linha Válida' }],
            columns: [{ key: 'nome', label: 'Nome' }],
          })
        );
      },
      /Cannot read properties of null/,
      'Vulnerabilidade confirmada: DataTable falha quando elementos internos do array são null/undefined'
    );
  });
```
When executed against the current codebase:
```
TypeError: Cannot read properties of null (reading 'id')
    at DataTable (app/components/table/DataTable.jsx:132)
```

### 1.2 Exact Code Locations in `app/components/table/DataTable.jsx`
- **Line 41**:
  ```javascript
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  ```
  `Array.isArray(data)` evaluates to `true` for arrays like `[null, undefined, { id: 'valid' }]`. Non-object and nullish items are preserved in `safeData`.
- **Lines 58–69**:
  ```javascript
  const filteredData = useMemo(() => {
    if (!filterText.trim()) return safeData;
    ...
  ```
  When the search input `filterText` is empty (`!filterText.trim()`), `filteredData` directly returns `safeData`, passing nullish and non-object elements directly to rendering.
- **Lines 130–134**:
  ```javascript
  filteredData.map((row, rowIndex) => (
    <tr
      key={row.id || `row_${rowIndex}`}
  ```
  Attempting `row.id` when `row` is `null` or `undefined` throws `TypeError: Cannot read properties of null (reading 'id')`.
- **Lines 42–55**:
  ```javascript
  const useExplicitColumns = Array.isArray(columns) && columns.length > 0;
  ...
  return header.map((h, index) => ({
    key: `col_${index}`,
    label: h.label,
    align: h.align || 'left',
    title: h.title,
  }));
  ```
  Neither `columns` nor `header` filters out nullish elements. If `columns = [null, { key: 'nome', label: 'Nome' }]` or `header = [null, { label: 'Nome' }]`, dereferencing `col.align`, `col.key`, or `h.label` causes secondary crashes.
- **Line 135–136**:
  ```javascript
  {useExplicitColumns
    ? columns.map((col, colIndex) => {
  ```
  In body cell rendering, it maps over raw `columns` instead of the normalized/filtered column array.

### 1.3 Behavior of Challenger 2 Test Harness
Running `node --no-warnings --test .agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs`:
- Test 4.1 (`CFOP 5102 to 7102`) FAILS (Defect 1).
- Test 3.1 logs `[CHALLENGE LOG] 3.1 Concurrency race condition detected?: true` without `assert` (Defect 2).
- Test 2.2 logs `[CHALLENGE LOG] 2.2 loaded value under QuotaExceeded: null` without `assert` (Defect 3).
- Test 5.4 PASSES *only because* it expects `assert.throws(...)`. Once `DataTable.jsx` is remediated, test 5.4 will FAIL with `AssertionError: Missing expected exception` unless updated to assert resilience (`assert.doesNotThrow`).

### 1.4 Prototype Verification Script
A prototype test script was created and executed at `.agents/teamwork/teamwork_explorer_m2_it2_3/test_datatable_fix.mjs`:
- Tested 6 adversarial scenarios: sparse rows (`[null, undefined, { id: 'valid' }]`), primitive noise (`[42, 'str', true, [1, 2]]`), pure nullish arrays (`[null, undefined]`), sparse `columns` (`[null, col]`), sparse `header` (`[null, h]`), and null/undefined `data`.
- Output: 6 tests, 6 passing (0 failures).

---

## 2. Logic Chain

### 2.1 Why `data.filter(Boolean)` is Insufficient and What to Use Instead
1. `data.filter(Boolean)` removes falsy values (`null`, `undefined`, `false`, `0`, `""`, `NaN`).
2. However, truthy primitive values (e.g. `"string"`, `123`, `true`) and arrays (`[]`) are NOT falsy.
3. If an array contains primitive noise or nested arrays:
   - `row.id` on a number returns `undefined`.
   - `row[col.key]` on a number returns `undefined`.
   - `Object.keys(row)` on a string returns an array of character indices (`['0', '1', ...]`), distorting table columns.
4. Therefore, the robust guard for each item must be:
   ```javascript
   (item) => item != null && typeof item === 'object' && !Array.isArray(item)
   ```
   - `item != null`: eliminates both `null` and `undefined`.
   - `typeof item === 'object'`: eliminates numbers, strings, booleans, and symbols.
   - `!Array.isArray(item)`: eliminates nested arrays.
   - Preserves only valid record objects.

### 2.2 Full Protection Surface in `DataTable.jsx`
1. **`safeData`**:
   Filter `data` so `safeData` contains exclusively valid record objects.
2. **`safeColumns` & `useExplicitColumns`**:
   ```javascript
   const safeColumns = useMemo(
     () =>
       Array.isArray(columns)
         ? columns.filter((col) => col != null && typeof col === 'object')
         : [],
     [columns]
   );
   const useExplicitColumns = safeColumns.length > 0;
   ```
3. **`effectiveColumns`**:
   - If `useExplicitColumns`, return `safeColumns`.
   - If fallback `header`, filter `header` with `h != null && typeof h === 'object'`, and map safely with `h?.label || ''`.
4. **`tbody` rendering**:
   - Use `effectiveColumns.map(...)` instead of `columns.map(...)`.
   - Key fallback: `key={row?.id || row?.key || row?.codigo || `row_${rowIndex}`}`.
5. **`tfoot` count**:
   - `Exibindo {filteredData.length} de {safeData.length} registros`.
   - When `data = [null, undefined, { id: 'valid' }]`, `safeData.length === 1` and `filteredData.length === 1`.
   - When `data = [null, undefined]`, `safeData.length === 0` and `filteredData.length === 0`.
   - Displays accurate counts with zero risk of `NaN` or unhandled exceptions.

### 2.3 Paradox of Test 5.4 in `adversarial_m2_storage_repo.mjs`
1. Test 5.4 was authored as a bug-reproduction test:
   ```javascript
   assert.throws(() => renderToStaticMarkup(...), /Cannot read properties of null/);
   ```
2. When the Worker fixes `DataTable.jsx`, `renderToStaticMarkup` will succeed without throwing.
3. The Node test runner will raise:
   `AssertionError [ERR_ASSERTION]: Missing expected exception (Cannot read properties of null)`.
4. Therefore, remediating `DataTable.jsx` requires updating test 5.4 in `adversarial_m2_storage_repo.mjs` from `assert.throws` to `assert.doesNotThrow` and verifying the rendered output.
5. Furthermore, to make this protection permanent beyond the challenger scratch directory, a regression test must be added to the official test suite `tests/tier1/m2_domain.test.mjs` (Suite 9).

---

## 3. Caveats

- **No mutations during exploration**: No source files or challenger files were edited during this investigation; prototype verification was executed cleanly in `teamwork_explorer_m2_it2_3/test_datatable_fix.mjs`.
- **Live Server Uninterrupted**: The live Next.js development server running on `http://localhost:3000/dashboard` was confirmed healthy (HTTP 200, length 62639, "Modo Demonstração" present). No `pnpm build`, `npm run build`, `pnpm dev`, or `npm run dev` commands were executed.
- **Pagination and Row Selection**: `DataTable.jsx` currently does not implement pagination controls or row selection checkboxes; if these features are added in later milestones, they will automatically benefit from `safeData`.

---

## 4. Conclusion & Concrete Recommendations for Worker M2

### 4.1 Recommendation 1: Remediate `app/components/table/DataTable.jsx`

Apply the following changes to `app/components/table/DataTable.jsx`:

#### Chunk A: Sanitize `safeData`, `safeColumns`, and `effectiveColumns` (lines 41–56)
```javascript
<<<<<<< BEFORE
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const useExplicitColumns = Array.isArray(columns) && columns.length > 0;

  // Derivação de colunas com memoização
  const effectiveColumns = useMemo(() => {
    if (useExplicitColumns) {
      return columns;
    }
    return header.map((h, index) => ({
      key: `col_${index}`,
      label: h.label,
      align: h.align || 'left',
      title: h.title,
    }));
  }, [columns, header, useExplicitColumns]);
=======
  const safeData = useMemo(
    () =>
      Array.isArray(data)
        ? data.filter(
            (item) => item != null && typeof item === 'object' && !Array.isArray(item)
          )
        : [],
    [data]
  );

  const safeColumns = useMemo(
    () =>
      Array.isArray(columns)
        ? columns.filter((col) => col != null && typeof col === 'object')
        : [],
    [columns]
  );
  const useExplicitColumns = safeColumns.length > 0;

  // Derivação de colunas com memoização
  const effectiveColumns = useMemo(() => {
    if (useExplicitColumns) {
      return safeColumns;
    }
    const safeHeader = Array.isArray(header)
      ? header.filter((h) => h != null && typeof h === 'object')
      : [];
    return safeHeader.map((h, index) => ({
      key: `col_${index}`,
      label: h?.label || '',
      align: h?.align || 'left',
      title: h?.title || '',
    }));
  }, [safeColumns, header, useExplicitColumns]);
>>>>>>> AFTER
```

#### Chunk B: Map sanitized `effectiveColumns` and safe keys in `tbody` (lines 130–148)
```javascript
<<<<<<< BEFORE
              filteredData.map((row, rowIndex) => (
                <tr
                  key={row.id || `row_${rowIndex}`}
                  className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-800/40 hover:bg-blue-50/60 dark:hover:bg-slate-800/80 transition-colors"
                >
                  {useExplicitColumns
                    ? columns.map((col, colIndex) => {
=======
              filteredData.map((row, rowIndex) => (
                <tr
                  key={row?.id || row?.key || row?.codigo || `row_${rowIndex}`}
                  className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-800/40 hover:bg-blue-50/60 dark:hover:bg-slate-800/80 transition-colors"
                >
                  {useExplicitColumns
                    ? effectiveColumns.map((col, colIndex) => {
>>>>>>> AFTER
```

---

### 4.2 Recommendation 2: Update Test 5.4 in `adversarial_m2_storage_repo.mjs`

In `.agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs`, update lines 355–369 from expecting a crash to asserting resilience:

```javascript
<<<<<<< BEFORE
  it('5.4: DataTable com array contendo elementos null/undefined (verificação de vulnerabilidade)', () => {
    // Documenta a vulnerabilidade encontrada:
    assert.throws(
      () => {
        renderToStaticMarkup(
          React.createElement(DataTable, {
            data: [null, undefined, { id: 'valid', nome: 'Linha Válida' }],
            columns: [{ key: 'nome', label: 'Nome' }],
          })
        );
      },
      /Cannot read properties of null/,
      'Vulnerabilidade confirmada: DataTable falha quando elementos internos do array são null/undefined'
    );
  });
=======
  it('5.4: DataTable com array contendo elementos null/undefined (resiliência confirmada)', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [null, undefined, { id: 'valid', nome: 'Linha Válida' }],
          columns: [{ key: 'nome', label: 'Nome' }],
        })
      );
      assert.match(html, /Linha Válida/);
      assert.match(html, /Exibindo 1 de 1 registros/);
    });
  });
>>>>>>> AFTER
```

Also, recommend that Worker M2 update test 2.2 and 3.1 in that same file to formalize assertions:
- Test 2.2: Add `assert.deepStrictEqual(loaded, { resilient: true }, 'load() deve ler fallback de memória sob quota excedida');`
- Test 3.1: Add `assert.strictEqual(raceLost, false, 'Chamadas concorrentes de updateItem() não devem sofrer race condition');`

---

### 4.3 Recommendation 3: Add Permanent Regression Test in `tests/tier1/m2_domain.test.mjs`

Append to Suite 9 (`M2 Components: DataTable Null Safety Protection`) in `tests/tier1/m2_domain.test.mjs`:
```javascript
  it('DataTable não quebra com elementos esparsos null ou undefined no array data', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [null, undefined, { id: 'item-1', nome: 'Item Válido' }],
          columns: [{ key: 'nome', label: 'Nome' }],
        })
      );
      assert.match(html, /Item Válido/);
      assert.match(html, /Exibindo 1 de 1 registros/);
    });
  });
```

---

## 5. Verification Method

Worker M2 must follow this exact step-by-step verification pipeline:

### Step 1: ESLint Sanity
Verify that no syntax, import, or lint errors were introduced:
```powershell
npx eslint app/features/ app/lib/storage/ app/components/table/DataTable.jsx
```
*Expected Result:* Exit code 0, 0 errors, 0 warnings.

### Step 2: Adversarial Storage & Repo Harness
Run the Challenger 2 adversarial suite:
```powershell
node --no-warnings --test .agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs
```
*Expected Result:*
- All 7 suites pass.
- Total tests: 23.
- Pass: 23, Fail: 0.
- Test 4.1: Passes (CFOP 5102 -> 7102 dynamically clears issue).
- Test 3.1: Passes (`raceLost: false`).
- Test 2.2: Passes (`loaded: { resilient: true }`).
- Test 5.4: Passes (Resilience confirmed without throwing).

### Step 3: Decimal Math Adversarial Stress Suite
```powershell
node --no-warnings --test tests/tier5/m2_decimal_adversarial_stress.test.mjs
```
*Expected Result:* 25 tests, 5 suites, 25 pass, 0 fail.

### Step 4: M2 Domain Unit Test Suite
```powershell
node --no-warnings --test tests/tier1/m2_domain.test.mjs
```
*Expected Result:* 44 tests, 9 suites, 44 pass, 0 fail.

### Step 5: Full Regression Test Suite
```powershell
node --no-warnings --test tests/**/*.test.mjs
```
*Expected Result:* All 138+ tests pass, 0 fail across all tiers.

### Step 6: Live Server Smoke Verification (Zero Interruption Check)
```powershell
node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(t => console.log('HTTP 200 length:', t.length, 'Modo Demo:', t.includes('Modo Demonstração')))"
```
*Expected Result:* `HTTP 200 length: ~62639 Modo Demo: true`  
*Warning:* NEVER execute `pnpm build`, `npm run build`, `pnpm dev`, or `npm run dev`.
