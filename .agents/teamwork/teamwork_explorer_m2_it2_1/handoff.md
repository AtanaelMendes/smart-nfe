# Handoff Report — Explorer 1: Investigation of Defect 1 (Dynamic Validation Engine)

**Agent:** `teamwork_explorer_m2_it2_1`  
**Milestone:** Milestone 2 Iteration 2 (Remediation of Challenger 2 Findings)  
**Parent / Caller:** `3aeeebdd-68a6-49e6-8f40-494114a9f1f7`  
**Date:** 2026-11-04  
**Subject:** Root cause analysis and step-by-step remediation plan for Defect 1 (Dynamic Validation Engine in `invoiceRepository.js`)

---

## 1. Observation

### 1.1 Empirical Reproduction of the Defect
Running the Challenger 2 adversarial test suite:
```powershell
node --no-warnings --test .agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs
```

Verbatim failure output:
```
✖ 4.1: Corrigir CFOP 5102 para 7102 no item d4-3 de demo-04 remove dinamicamente o erro? (9.1672ms)
  AssertionError [ERR_ASSERTION]: A correção do CFOP para 7102 DEVERIA remover o erro de CFOP em demo-04
  + actual - expected
  + {
  +   campo: 'cfop',
  +   encontrado: '5102',
  +   esperado: '7101',
  +   id: 'issue-d4-3-cfop',
  +   itemDescricao: 'Bota Cano Curto Feminina Couro',
  +   itemId: 'd4-3',
  +   itemNumero: 3,
  +   mensagem: 'CFOP 5102 não permitido em operação para o exterior. CFOP deve iniciar com 7 (ex: 7101).',
  +   regra: 'CFOP de Exportação',
  +   sugestao: 'Corrigir para "7101"',
  +   tipo: 'erro'
  + }
  - undefined

      at TestContext.<anonymous> (file:///C:/www/smart-nfe/.agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs:254:12)
```

In addition, Test 4.3 output logged:
```
[CHALLENGE LOG] 4.3 Math divergence issue after updateItem: {
  id: 'issue-d4-5-valorTotal',
  itemId: 'd4-5',
  itemNumero: 5,
  itemDescricao: 'Sapatilha Casual Couro Natural',
  tipo: 'erro',
  campo: 'valorTotal',
  mensagem: 'Divergência matemática: 100 x 45,00 resulta em 4.500,00, mas valor total gravado é 4.000,00.',
  esperado: '4500.00',
  encontrado: '4000.00',
  regra: 'Conferência Fiscal',
  sugestao: 'Corrigir para "4500.00"'
}
```
Even after `updateItem` recalculated `valorTotal: '4500.00'` (`100 * 45 = 4500.00`), `issue-d4-5-valorTotal` was still returned.

### 1.2 Exact Code Locations & Mechanism
- `app/features/invoiceRepository.js` lines 277–298:
  ```javascript
  // 1. Apontamentos estáticos pré-anotados nos itens (cenário demo-04)
  if (Array.isArray(invoice.itens)) {
    for (const item of invoice.itens) {
      if (Array.isArray(item.inconsistencias)) {
        for (const inc of item.inconsistencias) {
          issues.push({
            id: `issue-${item.id}-${inc.campo}`,
            itemId: item.id,
            itemNumero: item.item,
            itemDescricao: item.descricao,
            tipo: inc.tipo || 'erro',
            campo: inc.campo,
            mensagem: inc.mensagem,
            esperado: inc.esperado || '',
            encontrado: inc.encontrado || '',
            regra: inc.campo === 'cfop' ? 'CFOP de Exportação' : inc.campo === 'ncm' ? 'Validação de NCM' : inc.campo === 'unidade' ? 'Unidade Aduaneira' : 'Conferência Fiscal',
            sugestao: inc.esperado ? `Corrigir para "${inc.esperado}"` : 'Verificar documentação aduaneira',
          });
        }
      }
    }
  }
  ```
- `app/features/invoiceRepository.js` lines 233–240 (`updateItem`):
  ```javascript
  const updatedItem = {
    ...currentItem,
    ...partialItemData,
    id: currentItem.id,
    item: currentItem.item,
    modificado: true,
  };
  ```
  `currentItem.inconsistencias` is preserved in `updatedItem` across updates without evaluating whether any inconsistencies were resolved or newly introduced.

---

## 2. Logic Chain

1. **Why Test 4.1 Fails**:
   - `demo-04` item `d4-3` is seeded in `app/lib/data/mockInvoices.js:201` with `cfop: '5102'` and `inconsistencias: [{ tipo: 'erro', campo: 'cfop', encontrado: '5102', ... }]`.
   - When test 4.1 invokes `updateItem('demo-04', 'd4-3', { cfop: '7102' })`, `d4-3.cfop` is changed to `'7102'`.
   - However, `updateItem` spreads `...currentItem` into `updatedItem`, leaving `inconsistencias: [{ tipo: 'erro', campo: 'cfop', ... }]` unmodified on the item.
   - When `getValidationIssues('demo-04')` is called, Section 1 (lines 277–298) loops unconditionally through `item.inconsistencias` and pushes `issue-d4-3-cfop`.
   - Because Section 1 never inspects the item's current `cfop` value (`'7102'`), the issue is emitted even though CFOP 7102 is fully valid for export operations.
   - Therefore, `cfopIssueAfter` is defined, failing the assertion `assert.strictEqual(cfopIssueAfter, undefined)`.

2. **Systemic Issue Across All Fiscal Fields**:
   - **CFOP**: Any export item corrected to start with `'7'` (or matching expected CFOP) still emits the CFOP error.
   - **Math Divergence (`valorTotal`)**: In `d4-5`, correcting `valorUnitario` to `'45.0000'` causes `updateItem` to set `valorTotal = '4500.00'`. Line total `100 * 45 = 4500.00` is now mathematically exact, but `issue-d4-5-valorTotal` continues to be emitted by Section 1.
   - **NCM (`ncm`)**: In `d4-8`, correcting `ncm` to `'64035910'` (8 digits) still emits `issue-d4-8-ncm` because of Section 1.
   - **Customs Unit (`unidade`)**: In `d4-11`, correcting `unidade` from `'METROS'` to `'PAR'` still emits `issue-d4-11-unidade`.

3. **Two-Part Architectural Solution**:
   - **Part A (Dynamic Engine in `getValidationIssues`)**: Replace the static iteration in lines 277–298 with a unified dynamic evaluation loop over all items. Use `item.inconsistencias` only as a metadata lookup (to preserve human-friendly messages and suggestions from the mock), but determine issue presence strictly by evaluating the item's live fields against fiscal rules.
   - **Part B (Item State Synchronization in `updateItem`)**: When an item is updated, filter resolved inconsistencies from `updatedItem.inconsistencias`, update `updatedItem.situacao` to `'conferido'` if clean, or set `'inconsistente'` if an error is introduced.

---

## 3. Caveats

- **Mock Baseline Integrity**: Do NOT modify the initial mock definitions in `app/lib/data/mockInvoices.js`. `tests/tier5/m1_adversarial_stress.test.mjs` lines 628–647 explicitly asserts that `MOCK_INVOICES` contains `d4-5` with `valorTotal: '4000.00'`, `situacao: 'inconsistente'`, and `inconsistencias.length > 0`. All dynamic behavior must live in `invoiceRepository.js`.
- **Scope Boundary**: This report focuses on Defect 1 (Dynamic Validation Engine). Defects 2 (concurrency), 3 (quota fallback), and 4 (DataTable null safety) are handled in parallel by peer explorers.
- **Forbidden Commands**: Dev server on `http://localhost:3000/dashboard` must stay uninterrupted. No `pnpm build`, `npm run build`, `pnpm dev`, or `npm run dev` commands may be executed.

---

## 4. Conclusion & Step-by-Step Remediation for Worker

### Concrete Implementation Steps for `teamwork_worker_m2`

#### Step 1: Import `cleanDecimalString` in `app/features/invoiceRepository.js`
At line 15:
```javascript
import { calculateItemTotal, calculateInvoiceTotals } from '../lib/calculations/invoiceTotals.js';
import { cleanDecimalString } from '../lib/calculations/decimal.js';
```

#### Step 2: Synchronize Item State in `updateItem` (`app/features/invoiceRepository.js`)
Inside `updateItem(invoiceId, itemId, partialItemData)`, right after lines 244 (`updatedItem.valorTotal = calculateItemTotal(unitPrice, qty);`), add state synchronization:

```javascript
    // Recalcula o valor total da linha com precisão decimal se preço ou quantidade mudaram
    const qty = updatedItem.quantidade;
    const unitPrice = updatedItem.valorUnitario;
    updatedItem.valorTotal = calculateItemTotal(unitPrice, qty);

    // Sincroniza inconsistências e situação do item modificado
    const isExport = Boolean(
      invoice.destinatario?.pais &&
      invoice.destinatario?.pais.toLowerCase() !== 'brasil' &&
      invoice.destinatario?.paisCodigo !== 'BR'
    );
    const cleanCfop = String(updatedItem.cfop || '').trim();
    const cleanNcm = String(updatedItem.ncm || '').replace(/\D/g, '');
    const expectedTotal = calculateItemTotal(updatedItem.valorUnitario, updatedItem.quantidade);
    const recordedTotal = parseFloat(cleanDecimalString(updatedItem.valorTotal)).toFixed(2);
    const hasMathDiff = Math.abs(parseFloat(expectedTotal) - parseFloat(recordedTotal)) > 0.01;

    if (Array.isArray(updatedItem.inconsistencias)) {
      updatedItem.inconsistencias = updatedItem.inconsistencias.filter((inc) => {
        if (inc.campo === 'cfop') {
          return isExport ? !cleanCfop.startsWith('7') : cleanCfop.startsWith('7');
        }
        if (inc.campo === 'ncm') {
          return cleanNcm.length !== 8;
        }
        if (inc.campo === 'valorTotal') {
          return hasMathDiff;
        }
        if (inc.campo === 'unidade') {
          const expectedUnit = (inc.esperado || 'PAR').trim().toUpperCase();
          return String(updatedItem.unidade || '').trim().toUpperCase() !== expectedUnit;
        }
        if (inc.esperado) {
          return String(updatedItem[inc.campo] || '').trim() !== String(inc.esperado).trim();
        }
        return true;
      });

      if (updatedItem.inconsistencias.length === 0) {
        updatedItem.situacao = 'conferido';
      }
    }

    // Se o usuário introduziu um erro fiscal em item previamente sem inconsistências
    const hasIntroducedError =
      (isExport && cleanCfop && !cleanCfop.startsWith('7')) ||
      (cleanNcm.length > 0 && cleanNcm.length !== 8) ||
      hasMathDiff;
    if (hasIntroducedError) {
      updatedItem.situacao = 'inconsistente';
    }
```

#### Step 3: Rewrite `getValidationIssues(id)` with Unified Dynamic Validation (`app/features/invoiceRepository.js`)
Replace lines 271–374 with the unified dynamic validation method:

```javascript
  /**
   * Obtém os apontamentos fiscais (erros e avisos) de um documento.
   * Consolida regras dinâmicas de conferência e metadados de inconsistências mockadas.
   * @param {string} id ID do documento
   * @returns {Promise<Array<Object>>}
   */
  async getValidationIssues(id) {
    const invoice = await this.findById(id);
    if (!invoice || !Array.isArray(invoice.itens)) return [];

    const issues = [];
    const isExport = Boolean(
      invoice.destinatario?.pais &&
      invoice.destinatario?.pais.toLowerCase() !== 'brasil' &&
      invoice.destinatario?.paisCodigo !== 'BR'
    );

    for (const item of invoice.itens) {
      // Mapa das inconsistências pré-anotadas no mock para enriquecimento de metadados
      const mockIncMap = new Map();
      if (Array.isArray(item.inconsistencias)) {
        for (const inc of item.inconsistencias) {
          if (inc && inc.campo) {
            mockIncMap.set(inc.campo, inc);
          }
        }
      }

      // 1. Regra CFOP (Exportação vs Doméstico)
      const cleanCfop = String(item.cfop || '').trim();
      if (isExport) {
        if (!cleanCfop || !cleanCfop.startsWith('7')) {
          const mockInc = mockIncMap.get('cfop');
          issues.push({
            id: `issue-${item.id}-cfop`,
            itemId: item.id,
            itemNumero: item.item,
            itemDescricao: item.descricao,
            tipo: 'erro',
            campo: 'cfop',
            mensagem:
              mockInc && cleanCfop === String(mockInc.encontrado || '').trim()
                ? mockInc.mensagem
                : `CFOP ${cleanCfop || 'vazio'} não permitido em operação para o exterior (${invoice.destinatario?.pais || 'Exterior'}). CFOP deve iniciar com 7 (ex: 7101).`,
            esperado: mockInc?.esperado || '7101',
            encontrado: cleanCfop,
            regra: 'CFOP de Exportação',
            sugestao: mockInc?.sugestao || 'Alterar CFOP para 7101 (Exportação de produção própria)',
          });
        }
      } else {
        if (cleanCfop.startsWith('7')) {
          issues.push({
            id: `issue-${item.id}-cfop`,
            itemId: item.id,
            itemNumero: item.item,
            itemDescricao: item.descricao,
            tipo: 'erro',
            campo: 'cfop',
            mensagem: `CFOP ${cleanCfop} inválido para operação interna/nacional. CFOP iniciado em 7 é exclusivo para exportação.`,
            esperado: '5102',
            encontrado: cleanCfop,
            regra: 'CFOP Nacional',
            sugestao: 'Alterar CFOP para operação interna (início 5 ou 6)',
          });
        }
      }

      // 2. Regra Formato NCM (exatamente 8 dígitos numéricos)
      const cleanNcm = String(item.ncm || '').replace(/\D/g, '');
      if (cleanNcm.length !== 8) {
        const mockInc = mockIncMap.get('ncm');
        issues.push({
          id: `issue-${item.id}-ncm`,
          itemId: item.id,
          itemNumero: item.item,
          itemDescricao: item.descricao,
          tipo: 'erro',
          campo: 'ncm',
          mensagem:
            mockInc && cleanNcm === String(mockInc.encontrado || '').replace(/\D/g, '')
              ? mockInc.mensagem
              : `NCM "${item.ncm || ''}" inválido. A Nomenclatura Comum do Mercosul deve conter exatamente 8 dígitos (encontrado: ${cleanNcm.length}).`,
          esperado: mockInc?.esperado || '8 dígitos numéricos',
          encontrado: item.ncm || '',
          regra: 'Classificação Fiscal NCM',
          sugestao: mockInc?.esperado
            ? `Corrigir para "${mockInc.esperado}"`
            : 'Completar os dígitos faltantes da NCM na tabela TIPI.',
        });
      }

      // 3. Regra Divergência Matemática da Linha (unitPrice * quantity == valorTotal)
      const expectedTotal = calculateItemTotal(item.valorUnitario, item.quantidade);
      const recordedTotal = parseFloat(cleanDecimalString(item.valorTotal)).toFixed(2);
      if (Math.abs(parseFloat(expectedTotal) - parseFloat(recordedTotal)) > 0.01) {
        const mockInc = mockIncMap.get('valorTotal');
        issues.push({
          id: `issue-${item.id}-valorTotal`,
          itemId: item.id,
          itemNumero: item.item,
          itemDescricao: item.descricao,
          tipo: 'erro',
          campo: 'valorTotal',
          mensagem:
            mockInc && String(item.valorTotal) === String(mockInc.encontrado)
              ? mockInc.mensagem
              : `Divergência matemática: ${item.quantidade} x ${item.valorUnitario} = ${expectedTotal}, mas valor total gravado é ${item.valorTotal}.`,
          esperado: mockInc?.esperado || expectedTotal,
          encontrado: item.valorTotal || '',
          regra: 'Conferência Matemática',
          sugestao: `Ajustar valor total da linha para R$ ${expectedTotal}`,
        });
      }

      // 4. Regra Unidade Aduaneira (aviso pré-anotado do mock)
      if (mockIncMap.has('unidade')) {
        const mockUnitInc = mockIncMap.get('unidade');
        const expectedUnit = (mockUnitInc.esperado || 'PAR').trim().toUpperCase();
        const currentUnit = String(item.unidade || '').trim().toUpperCase();
        if (currentUnit !== expectedUnit) {
          issues.push({
            id: `issue-${item.id}-unidade`,
            itemId: item.id,
            itemNumero: item.item,
            itemDescricao: item.descricao,
            tipo: mockUnitInc.tipo || 'aviso',
            campo: 'unidade',
            mensagem: mockUnitInc.mensagem,
            esperado: mockUnitInc.esperado || 'PAR',
            encontrado: item.unidade || '',
            regra: 'Unidade Aduaneira',
            sugestao: `Corrigir para "${mockUnitInc.esperado || 'PAR'}"`,
          });
        }
      }

      // 5. Outras inconsistências pré-anotadas personalizadas
      for (const [campo, inc] of mockIncMap.entries()) {
        if (['cfop', 'ncm', 'valorTotal', 'unidade'].includes(campo)) continue;
        if (inc.esperado && String(item[campo] || '').trim() === String(inc.esperado).trim()) {
          continue;
        }
        issues.push({
          id: `issue-${item.id}-${campo}`,
          itemId: item.id,
          itemNumero: item.item,
          itemDescricao: item.descricao,
          tipo: inc.tipo || 'erro',
          campo: inc.campo,
          mensagem: inc.mensagem,
          esperado: inc.esperado || '',
          encontrado: item[campo] || inc.encontrado || '',
          regra: 'Conferência Fiscal',
          sugestao: inc.esperado ? `Corrigir para "${inc.esperado}"` : 'Verificar documentação aduaneira',
        });
      }
    }

    return issues;
  },
```

---

## 5. Verification Method

To independently verify the fix:

1. **Verify Adversarial Test Suite Pass**:
   ```powershell
   node --no-warnings --test .agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs
   ```
   *Expected Result:* Test 4.1 passes (`✔ 4.1: Corrigir CFOP 5102 para 7102 no item d4-3 de demo-04 remove dinamicamente o erro?`). Test 4.2 passes. Test 4.3 logs `mathAfter: undefined`.

2. **Verify Baseline Domain Tests Pass**:
   ```powershell
   node --no-warnings --test tests/tier1/m2_domain.test.mjs
   ```
   *Expected Result:* 43 tests pass (100% green), including `getValidationIssues() retorna apontamentos fiscais de demo-04 com regras dinâmicas`.

3. **Verify Boundary & Stress Suites**:
   ```powershell
   node --no-warnings --test tests/tier2/m1_boundary_stress.test.mjs tests/tier5/m1_adversarial_stress.test.mjs tests/tier5/m2_decimal_adversarial_stress.test.mjs
   ```
   *Expected Result:* 0 failures across all suites.

4. **Verify Live Development Server**:
   ```powershell
   node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(t => console.log('HTTP 200 length:', t.length, 'Modo Demo:', t.includes('Modo Demonstração')))"
   ```
   *Expected Output:* `HTTP 200 length: ~62644 Modo Demo: true` (uninterrupted).
