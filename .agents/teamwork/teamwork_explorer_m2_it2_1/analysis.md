# In-Depth Analysis: Defect 1 — Dynamic Validation Engine in `invoiceRepository.js`

**Date:** 2026-11-04  
**Author:** Explorer 1 (`teamwork_explorer_m2_it2_1`)  
**Target:** `app/features/invoiceRepository.js` (lines 265–374 and 233–263)  
**Trigger:** Adversarial Test 4.1 failure in `.agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs`

---

## 1. Problem Statement & Root Cause

### 1.1 The Failure in Test 4.1
In `.agents/teamwork/teamwork_challenger_m2_2/adversarial_m2_storage_repo.mjs`:
```javascript
it('4.1: Corrigir CFOP 5102 para 7102 no item d4-3 de demo-04 remove dinamicamente o erro?', async () => {
  const beforeIssues = await invoiceRepository.getValidationIssues('demo-04');
  const cfopIssueBefore = beforeIssues.find((i) => i.itemId === 'd4-3' && i.campo === 'cfop');
  assert.ok(cfopIssueBefore, 'demo-04 deve ter erro de CFOP inicial no item d4-3');

  // Executa a correção do usuário: altera de 5102 para 7102
  await invoiceRepository.updateItem('demo-04', 'd4-3', { cfop: '7102' });

  // Consulta os apontamentos novamente
  const afterIssues = await invoiceRepository.getValidationIssues('demo-04');
  const cfopIssueAfter = afterIssues.find((i) => i.itemId === 'd4-3' && i.campo === 'cfop');

  assert.strictEqual(
    cfopIssueAfter,
    undefined,
    'A correção do CFOP para 7102 DEVERIA remover o erro de CFOP em demo-04'
  );
});
```

Empirical output:
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
```

### 1.2 Root Cause Analysis
In `app/features/invoiceRepository.js`:
Lines 277–298 (Section 1) implemented a naive pass over `item.inconsistencias`:
```javascript
// 1. Apontamentos estáticos pré-anotados nos itens (cenário demo-04)
if (Array.isArray(invoice.itens)) {
  for (const item of invoice.itens) {
    if (Array.isArray(item.inconsistencias)) {
      for (const inc of item.inconsistencias) {
        issues.push({
          id: `issue-${item.id}-${inc.campo}`,
          itemId: item.id,
          ...
          encontrado: inc.encontrado || '',
          ...
        });
      }
    }
  }
}
```
Flaws of this approach:
1. **Unconditional push:** It iterates over `item.inconsistencias` and unconditionally adds an issue without inspecting the item's current state (`item.cfop`, `item.ncm`, `item.valorTotal`, `item.unidade`).
2. **Stale payload:** Even though `item.cfop` was updated to `'7102'`, `inc.encontrado` remained hardcoded to `'5102'` from the initial mock object.
3. **Shadowing dynamic rules:** Lines 300–371 (Section 2) attempt dynamic validation, but guard with `const already = issues.some(...)`. Because Section 1 already pushed the issue, Section 2 is bypassed. Even if Section 2 were evaluated, Section 1's stale issue is already in `issues`.
4. **Line math divergence and NCM errors also affected:**
   - In test 4.3, correcting `valorUnitario: '45.0000'` on `d4-5` recalculated `valorTotal: '4500.00'`, eliminating the math divergence. Yet `issue-d4-5-valorTotal` was still returned.
   - If a user corrects `ncm: '64035910'` on `d4-8`, `issue-d4-8-ncm` would still be returned.
   - If a user corrects `unidade: 'PAR'` on `d4-11`, `issue-d4-11-unidade` would still be returned.

---

## 2. Fiscal Domain Rules & Requirements

SmartNFe is an export NF-e platform (Fase 1 com dados mockados). Fiscal validation must behave dynamically:

| Rule Category | Condition for Error | Valid Condition (Issue Removed) | Error Output Details |
|---|---|---|---|
| **CFOP (Export)** | Operation with foreign country (`destinatario.pais !== 'Brasil'` & `paisCodigo !== 'BR'`) AND `!item.cfop \|\| !item.cfop.startsWith('7')` | `item.cfop && item.cfop.startsWith('7')` (e.g. 7101, 7102) | `tipo: 'erro'`, `regra: 'CFOP de Exportação'`, `campo: 'cfop'`, `esperado: '7101'` |
| **CFOP (Domestic)** | Domestic operation (`destinatario.pais === 'Brasil'`) AND `item.cfop.startsWith('7')` | `!item.cfop.startsWith('7')` | `tipo: 'erro'`, `regra: 'CFOP Nacional'`, `campo: 'cfop'` |
| **NCM (Length)** | Digits length `cleanNcm.length !== 8` (`cleanNcm = item.ncm.replace(/\D/g, '')`) | `cleanNcm.length === 8` (e.g. `64035910` or `6403.59.10`) | `tipo: 'erro'`, `regra: 'Classificação Fiscal NCM'`, `campo: 'ncm'`, `esperado: '8 dígitos numéricos'` |
| **Math Divergence** | `Math.abs(calculateItemTotal(unitPrice, qty) - recordedTotal) > 0.01` | `Math.abs(expectedTotal - recordedTotal) <= 0.01` | `tipo: 'erro'`, `regra: 'Conferência Matemática'`, `campo: 'valorTotal'` |
| **Customs Unit** | Footwear items (NCM 64xx) standard customs unit is `PAR`. Divergent unit in mock is `METROS`. | `item.unidade === 'PAR'` | `tipo: 'aviso'`, `regra: 'Unidade Aduaneira'`, `campo: 'unidade'`, `esperado: 'PAR'` |
| **Generic Pre-annotated** | Any other mock inconsistency where `item[campo] !== inc.esperado` | `item[campo] === inc.esperado` | `tipo: inc.tipo`, `regra: 'Conferência Fiscal'` |

---

## 3. Architecture of the Solution

### 3.1 Unification of `getValidationIssues(id)`
Instead of two conflicting sections (static loop followed by dynamic loop), execute **unified dynamic evaluation** over all items in the invoice:

1. For each `item` in `invoice.itens`:
   - Build a lookup map of pre-annotated mock metadata (`mockIncMap = new Map()`) from `item.inconsistencias`. This allows preserving the rich human-friendly messages, expected suggestions, and historical mock annotations if the error is still present.
   - **Evaluate CFOP:** If export operation and `!cleanCfop.startsWith('7')`, emit issue. If `cleanCfop.startsWith('7')`, issue is resolved and omitted.
   - **Evaluate NCM:** If `cleanNcm.length !== 8`, emit issue. If `cleanNcm.length === 8`, issue is resolved and omitted.
   - **Evaluate Math Divergence:** If `|expectedTotal - recordedTotal| > 0.01`, emit issue. If `<= 0.01`, issue is resolved and omitted.
   - **Evaluate Customs Unit:** If item has a unit inconsistency, check `item.unidade.toUpperCase() === expectedUnit`. If matching, issue is resolved and omitted.
   - **Evaluate Other Mock Inconsistencies:** If `item[campo] === inc.esperado`, issue is resolved and omitted.

### 3.2 Synchronization in `updateItem(invoiceId, itemId, partialItemData)`
When an item is updated via `invoiceRepository.updateItem`:
1. It updates fields and calculates `updatedItem.valorTotal = calculateItemTotal(unitPrice, qty)`.
2. It filters `updatedItem.inconsistencias` so that any resolved inconsistencies are removed from the item's stored array.
3. If `updatedItem.inconsistencias.length === 0`, it updates `updatedItem.situacao = 'conferido'`.
4. If an invalid value was introduced (e.g. 7-digit NCM or non-7 CFOP), it sets `updatedItem.situacao = 'inconsistente'`.
This guarantees that both `invoiceRepository.findById(id)` and `invoiceRepository.getValidationIssues(id)` report consistent, truthful state.
