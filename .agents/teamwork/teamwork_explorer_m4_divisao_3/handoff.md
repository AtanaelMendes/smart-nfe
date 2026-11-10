# Relatório de Handoff — Feature 19: Rateio de Despesas Acessórias e Persistência de Notas Preparadas
**Milestone**: M4_Invoice_Splitting_Balance_Conservation  
**Agente**: `teamwork_explorer_m4_divisao_3`  
**Data/Hora**: 2026-11-09T21:18:00Z  
**Target Files**:
- `app/documentos/[id]/divisao/page.jsx`
- `app/lib/calculations/divisionMath.js`
- `app/lib/calculations/invoiceTotals.js`
- `app/features/preparedInvoiceRepository.js`
- `app/features/invoiceRepository.js`
- `app/notas-preparadas/page.jsx`
- `tests/integration/flow_c_division_balances.test.mjs`

---

## 1. Observation (O que foi diretamente observado)

### 1.1. Omissão de Despesas Acessórias em `handleFinalizeDivision` (`app/documentos/[id]/divisao/page.jsx`)
Na função `handleFinalizeDivision` (linhas 356–405 de `app/documentos/[id]/divisao/page.jsx`):
```javascript
358:      for (let i = 0; i < targetNotes.length; i++) {
359:        const note = targetNotes[i];
360:        const distributedItems = invoice.itens
361:          .map((origItem) => {
362:            const raw = note.itens[origItem.id] || '0';
363:            const qtyStr = cleanDecimalString(raw);
364:            if (decimalCompare(qtyStr, '0') <= 0) return null;
365:
366:            const lineTotal = decimalMultiply(origItem.valorUnitario, qtyStr, 2);
367:            return {
368:              ...origItem,
369:              quantidade: qtyStr,
370:              valorTotal: lineTotal,
371:            };
372:          })
373:          .filter(Boolean);
374:
375:        if (distributedItems.length > 0) {
376:          const suffix = String.fromCharCode(65 + i);
377:          const totalNota = noteTotals[note.id] || '0.00';
378:
379:          await preparedInvoiceRepository.create({
380:            parentInvoiceId: invoice.id,
381:            documentoOrigemId: invoice.id,
382:            origemNumero: invoice.numero,
383:            numeroOrigem: invoice.numero,
384:            numero: `${invoice.numero}-${suffix}`,
385:            serie: invoice.serie || '1',
386:            nomePreparacao: note.nome || `Nota Destino ${suffix}`,
387:            descricaoLote: `${note.nome} — Destino: ${note.razaoSocial || 'Exterior'}`,
388:            emitente: invoice.emitente,
389:            destinatario: {
390:              nome: note.razaoSocial || invoice.destinatario?.nome || 'Destinatário',
391:              cnpj: note.cnpj || invoice.destinatario?.cnpj || invoice.destinatario?.idEstrangeiro || '',
392:              uf: note.uf || invoice.destinatario?.uf || '',
393:              pais: note.pais || invoice.destinatario?.pais || 'Exterior',
394:              paisCodigo: invoice.destinatario?.paisCodigo || '',
395:            },
396:            itens: distributedItems,
397:            quantidadeItens: distributedItems.length,
398:            valorTotal: totalNota,
399:            valorTotalNota: totalNota,
400:            status: 'preparado',
401:            dataCriacao: new Date().toISOString(),
402:          });
403:          createdCount++;
404:        }
405:      }
```
**Constatação crítica**:
1. `totalNota` é obtido exclusivamente de `noteTotals[note.id]`, que calcula apenas a soma dos produtos (`lineTotal` dos itens alocados, linhas 144–162).
2. As despesas acessórias da nota de origem (`invoice.totais.valorFrete`, `invoice.totais.valorSeguro`, `invoice.totais.outrasDespesas`, `invoice.totais.valorDesconto`) são **completamente ignoradas**.
3. O payload enviado a `preparedInvoiceRepository.create` **não possui** o objeto `totais` nem as propriedades `valorFrete`, `valorSeguro`, `outrasDespesas`, `valorDesconto`, `valorProdutos`.
4. Em uma nota como `demo-01` (produtos R$ 284.500,00, frete R$ 5.000,00, seguro R$ 1.200,00, outras despesas R$ 500,00, total R$ 291.200,00), as notas preparadas geradas somavam apenas R$ 284.500,00, perdendo **R$ 6.700,00** em despesas acessórias e violando os requisitos R1 e R4.

### 1.2. Omissão de Despesas Acessórias no XML Gerado (`app/notas-preparadas/page.jsx`)
Nas linhas 170–185 de `app/notas-preparadas/page.jsx`:
```javascript
170:      <total>
171:        <ICMSTot>
172:          <vBC>0.00</vBC>
173:          <vICMS>0.00</vICMS>
174:          <vProd>${note.valorTotalNota || note.valorTotal || '0.00'}</vProd>
175:          <vFrete>0.00</vFrete>
176:          <vSeg>0.00</vSeg>
177:          <vDesc>0.00</vDesc>
178:          <vII>0.00</vII>
179:          <vIPI>0.00</vIPI>
180:          <vPIS>0.00</vPIS>
181:          <vCOFINS>0.00</vCOFINS>
182:          <vOutro>0.00</vOutro>
183:          <vNF>${note.valorTotalNota || note.valorTotal || '0.00'}</vNF>
184:        </ICMSTot>
185:      </total>
```
As tags `<vFrete>`, `<vSeg>`, `<vDesc>`, `<vOutro>` estão fixadas em `0.00` porque `note.totais` não estava presente.

### 1.3. Contrato de Cálculo de Totais (`app/lib/calculations/invoiceTotals.js`)
Em `invoiceTotals.js` (linhas 65–130), a função `calculateInvoiceTotals` já suporta o cálculo decimal puro:
```javascript
calculateInvoiceTotals(items, { discount, freight, insurance, otherExpenses })
```
Retornando:
```javascript
{
  totalProducts, totalDiscount, totalFreight, totalInsurance, totalOtherExpenses, totalInvoice,
  valorProdutos, valorDesconto, valorFrete, valorSeguro, outrasDespesas, valorTotalNota
}
```
utilizando a fórmula oficial SEFAZ:
`totalInvoice = totalProducts - totalDiscount + totalFreight + totalInsurance + totalOtherExpenses`.

### 1.4. Gestão Dinâmica de Notas (`app/documentos/[id]/divisao/page.jsx`)
- `handleAddNote` (linhas 212–230): Adiciona nota com `itens: {}`. O `validateDivisionBatch` reexecuta via `useMemo` instantaneamente.
- `handleRemoveNote` (linhas 233–241):
  ```javascript
  if (targetNotes.length <= 2) {
    toast.warning('A divisão exige no mínimo 2 notas de destino.');
    return;
  }
  setTargetNotes(targetNotes.filter((n) => n.id !== noteId));
  ```
  Ao remover uma nota que possuía alocações, os itens vinculados a ela deixam de estar alocados. `totalAllocated` cai, `balanceStr` sobe, os itens voltam ao status `remaining`, `isBalanced` passa a `false`, e `canFinalize` passa imediatamente para `false`.

### 1.5. Contratos de Persistência
- `preparedInvoiceRepository.js` (linhas 126–147):
  `create(preparedInvoice)`: Gera ID (`prep-...`), `status: 'preparado'`, `dataCriacao`, serializa via `withMutationLock` e persiste em `STORAGE_KEYS.PREPARED_INVOICES`.
- `invoiceRepository.js` (linhas 211–263):
  `update(id, { status: 'dividida' })`: Atualiza o documento no Map em memória de sessão (se importado real) ou no localStorage (se mock), sem alterar os itens ou totais originais do documento pai.

### 1.6. Teste de Referência (`tests/integration/flow_c_division_balances.test.mjs`)
Nas linhas 98–104 e 305–321:
```javascript
function apportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr) {
  if (decimalCompare(originalProductTotalStr, '0') <= 0) return '0.00';
  const ratio = decimalDivide(noteProductTotalStr, originalProductTotalStr, 8);
  return decimalMultiply(originalExpenseStr, ratio, 2);
}
...
it('Rateia despesas acessórias (frete de 5.000,00) proporcionalmente entre notas preservando total', () => { ... });
```
O teste exige que:
`const sumFrete = decimalAdd(note1Frete, note2Frete, 2);`
`assert.strictEqual(sumFrete, totalFrete);`

---

## 2. Logic Chain (Cadeia de Raciocínio)

```
[Observação 1.1] handleFinalizeDivision ignora despesas acessórias do documento pai
         │
         ▼
[Premissa Fiscal R1/R4] Toda despesa acessória (frete, seguro, outras despesas e desconto)
                        deve ser rateada proporcionalmente ao valor dos produtos alocados,
                        conservando estritamente 100% dos totais originais.
         │
         ▼
[Análise de Arredondamento]
   Se usarmos apenas o rateio proporcional padrão com arredondamento Half-Up em todas as notas:
   Exemplo: R$ 100,00 de frete em 3 notas com produtos iguais (33,33%, 33,33%, 33,34%):
   Nota 1: 100 * 0.3333 = 33.33
   Nota 2: 100 * 0.3333 = 33.33
   Nota 3: 100 * 0.3333 = 33.33 -> Soma = 99.99 (Perda de R$ 0,01!)
   Exemplo Crítico de Subtração (Over-allocation):
   Se as primeiras notas arredondarem para cima, a soma pode superar o total original se não houver trava.
         │
         ▼
[Algoritmo de Conservação Estrita de Saldos]
   Para N notas ativas (que receberam produtos):
   1. Para as notas de 0 até N-2 (primeiras N-1 notas):
      noteExpense = apportionExpenses(originalExpense, noteProductTotal, totalActiveProducts);
      // Trava de segurança: nunca alocar mais do que o saldo remanescente da despesa
      if (decimalCompare(noteExpense, remainingExpense) > 0) noteExpense = remainingExpense;
      allocatedExpense = decimalAdd(allocatedExpense, noteExpense, 2);
      remainingExpense = decimalSubtract(originalExpense, allocatedExpense, 2);
   2. Para a última nota ativa (índice N-1):
      noteExpense = remainingExpense; // Absorve a diferença exata (conservação a 100%)
         │
         ▼
[Garantia Matemática]
   - Soma das despesas rateadas == Total da despesa original (ZERO perda de centavos).
   - Nenhuma despesa rateada fica negativa.
   - Aplica-se uniformemente a: valorFrete, valorSeguro, outrasDespesas, valorDesconto.
         │
         ▼
[Integração com calculateInvoiceTotals]
   Para cada nota preparada:
   noteTotais = calculateInvoiceTotals(distributedItems, {
     discount: exp.valorDesconto,
     freight: exp.valorFrete,
     insurance: exp.valorSeguro,
     otherExpenses: exp.outrasDespesas,
   });
   -> totalNota = noteTotais.valorTotalNota
   -> sum(totalNota) == invoice.totais.valorTotalNota
         │
         ▼
[Persistência Completa]
   preparedInvoiceRepository.create recebe tanto as propriedades de compatibilidade direta
   (valorFrete, valorSeguro, outrasDespesas, valorDesconto, valorProdutos, valorTotalNota)
   quanto o objeto padronizado `totais: noteTotais`.
```

---

## 3. Caveats (Ressalvas e Casos de Borda)

1. **Notas sem produtos alocados (`distributedItems.length === 0`)**:
   - Um usuário pode ter 3 notas configuradas, mas alocar 100% dos produtos nas notas 1 e 2.
   - A nota 3 **não deve** receber rateio de frete nem ser criada no repositório de notas preparadas. O rateio de despesas acessórias deve considerar exclusivamente as notas com produtos efetivamente alocados (`activeNotes`).
2. **Documento de Origem sem Despesas Acessórias**:
   - Caso `invoice.totais` não possua frete/seguro/despesas (ou estejam como `0.00`), o algoritmo deve atribuir `0.00` com segurança, sem erros de divisão por zero.
3. **Documento de Origem com Produtos Zerados (`totalProducts === '0.00'`)**:
   - Caso o valor total de produtos seja zero (caso patológico), as despesas devem ser rateadas igualmente entre as notas ativas.
4. **Renumeração Sequencial dos Itens**:
   - Se uma nota de destino receber os itens 2 e 5 da nota original, na nota preparada eles devem possuir propriedade sequencial `item: 1` e `item: 2` para manter conformidade com a tag `<det nItem="...">` da NF-e SEFAZ.
5. **Atualização do XML em `app/notas-preparadas/page.jsx`**:
   - Para que o XML simulado baixado pelo usuário reflita as despesas rateadas, as tags `<vFrete>`, `<vSeg>`, `<vDesc>`, `<vOutro>` em `handleDownloadXml` devem ser atualizadas para ler `note.totais` ou `note.valorFrete`.

---

## 4. Conclusion & Step-by-Step Implementation Guidance for Worker

### Passo 1: Adicionar funções de rateio em `app/lib/calculations/divisionMath.js`
Exportar as funções `apportionExpenses` e `apportionAllInvoiceExpenses`:

```javascript
/**
 * Rateia uma despesa acessória com base na proporção do valor dos produtos.
 * @param {string|number} originalExpenseStr - Valor original da despesa
 * @param {string|number} noteProductTotalStr - Valor dos produtos da nota destino
 * @param {string|number} originalProductTotalStr - Valor total dos produtos da nota de origem
 * @returns {string} Valor rateado com 2 casas decimais
 */
export function apportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr) {
  const origExp = String(originalExpenseStr || '0').trim();
  const noteProd = String(noteProductTotalStr || '0').trim();
  const origProd = String(originalProductTotalStr || '0').trim();

  if (decimalCompare(origProd, '0') <= 0 || decimalCompare(origExp, '0') === 0) {
    return '0.00';
  }
  const ratio = decimalDivide(noteProd, origProd, 8);
  return decimalMultiply(origExp, ratio, 2);
}

/**
 * Rateia todas as despesas acessórias (frete, seguro, outras despesas, desconto)
 * entre as notas de destino com conservação estrita de saldos (sem perda de centavos).
 * A última nota ativa absorve o resíduo para garantir soma exata ao original.
 * 
 * @param {object} parentTotals - Totais da nota fiscal de origem (totais)
 * @param {Array<{id: string, productTotal: string}>} notesWithProducts - Lista de notas ativas
 * @returns {Record<string, { valorProdutos: string, valorFrete: string, valorSeguro: string, outrasDespesas: string, valorDesconto: string }>}
 */
export function apportionAllInvoiceExpenses(parentTotals = {}, notesWithProducts = []) {
  const origFrete = String(parentTotals.valorFrete ?? parentTotals.freight ?? '0.00').trim();
  const origSeguro = String(parentTotals.valorSeguro ?? parentTotals.insurance ?? '0.00').trim();
  const origOutras = String(parentTotals.outrasDespesas ?? parentTotals.otherExpenses ?? '0.00').trim();
  const origDesconto = String(parentTotals.valorDesconto ?? parentTotals.discount ?? '0.00').trim();

  const totalProducts = notesWithProducts.reduce(
    (acc, n) => decimalAdd(acc, n.productTotal || '0.00', 2),
    '0.00'
  );

  const numNotes = notesWithProducts.length;
  const result = {};

  if (numNotes === 0) return result;

  if (numNotes === 1) {
    result[notesWithProducts[0].id] = {
      valorProdutos: notesWithProducts[0].productTotal || '0.00',
      valorFrete: roundDecimal(origFrete, 2),
      valorSeguro: roundDecimal(origSeguro, 2),
      outrasDespesas: roundDecimal(origOutras, 2),
      valorDesconto: roundDecimal(origDesconto, 2),
    };
    return result;
  }

  let allocatedFrete = '0.00';
  let allocatedSeguro = '0.00';
  let allocatedOutras = '0.00';
  let allocatedDesconto = '0.00';

  let remainingFrete = roundDecimal(origFrete, 2);
  let remainingSeguro = roundDecimal(origSeguro, 2);
  let remainingOutras = roundDecimal(origOutras, 2);
  let remainingDesconto = roundDecimal(origDesconto, 2);

  for (let i = 0; i < numNotes; i++) {
    const note = notesWithProducts[i];
    const isLast = i === numNotes - 1;

    let noteFrete;
    let noteSeguro;
    let noteOutras;
    let noteDesconto;

    if (!isLast) {
      noteFrete = apportionExpenses(origFrete, note.productTotal, totalProducts);
      if (decimalCompare(noteFrete, remainingFrete) > 0) noteFrete = remainingFrete;

      noteSeguro = apportionExpenses(origSeguro, note.productTotal, totalProducts);
      if (decimalCompare(noteSeguro, remainingSeguro) > 0) noteSeguro = remainingSeguro;

      noteOutras = apportionExpenses(origOutras, note.productTotal, totalProducts);
      if (decimalCompare(noteOutras, remainingOutras) > 0) noteOutras = remainingOutras;

      noteDesconto = apportionExpenses(origDesconto, note.productTotal, totalProducts);
      if (decimalCompare(noteDesconto, remainingDesconto) > 0) noteDesconto = remainingDesconto;

      allocatedFrete = decimalAdd(allocatedFrete, noteFrete, 2);
      allocatedSeguro = decimalAdd(allocatedSeguro, noteSeguro, 2);
      allocatedOutras = decimalAdd(allocatedOutras, noteOutras, 2);
      allocatedDesconto = decimalAdd(allocatedDesconto, noteDesconto, 2);

      remainingFrete = decimalSubtract(origFrete, allocatedFrete, 2);
      remainingSeguro = decimalSubtract(origSeguro, allocatedSeguro, 2);
      remainingOutras = decimalSubtract(origOutras, allocatedOutras, 2);
      remainingDesconto = decimalSubtract(origDesconto, allocatedDesconto, 2);
    } else {
      // Última nota recebe o saldo remanescente exato (conservação estrita)
      noteFrete = remainingFrete;
      noteSeguro = remainingSeguro;
      noteOutras = remainingOutras;
      noteDesconto = remainingDesconto;
    }

    result[note.id] = {
      valorProdutos: note.productTotal,
      valorFrete: noteFrete,
      valorSeguro: noteSeguro,
      outrasDespesas: noteOutras,
      valorDesconto: noteDesconto,
    };
  }

  return result;
}
```

### Passo 2: Atualizar `handleFinalizeDivision` em `app/documentos/[id]/divisao/page.jsx`
1. Importar `calculateInvoiceTotals` de `@/lib/calculations/invoiceTotals`:
   ```javascript
   import { calculateInvoiceTotals } from '@/lib/calculations/invoiceTotals';
   import {
     validateDivisionBatch,
     calculateRemainingBalance,
     apportionAllInvoiceExpenses,
   } from '@/lib/calculations/divisionMath';
   ```
2. Refatorar `handleFinalizeDivision` (linhas 341–419):
   ```javascript
   const handleFinalizeDivision = async () => {
     if (!canFinalize) {
       if (batchResult.hasExcess) {
         toast.error('Bloqueio: existem itens com quantidade alocada em excesso.');
       } else if (batchResult.hasRemaining) {
         toast.warning('Atenção: 100% dos itens devem ser distribuídos antes de finalizar.');
       } else if (targetNotes.length < 2) {
         toast.warning('É necessário manter no mínimo 2 notas de destino para realizar a divisão.');
       }
       return;
     }

     try {
       setIsSaving(true);

       // 1. Mapeia itens alocados para cada nota de destino
       const preparedNotesData = [];
       for (let i = 0; i < targetNotes.length; i++) {
         const note = targetNotes[i];
         const distributedItems = invoice.itens
           .map((origItem, itemIdx) => {
             const raw = note.itens[origItem.id] || '0';
             const qtyStr = cleanDecimalString(raw);
             if (decimalCompare(qtyStr, '0') <= 0) return null;

             const lineTotal = decimalMultiply(origItem.valorUnitario, qtyStr, 2);
             return {
               ...origItem,
               item: itemIdx + 1,
               quantidade: qtyStr,
               valorTotal: lineTotal,
             };
           })
           .filter(Boolean);

         if (distributedItems.length > 0) {
           const productTotal = distributedItems.reduce(
             (acc, it) => decimalAdd(acc, it.valorTotal, 2),
             '0.00'
           );
           preparedNotesData.push({
             note,
             index: i,
             distributedItems,
             productTotal,
           });
         }
       }

       // 2. Executa o rateio proporcional de despesas acessórias da NF de origem
       const activeNotesForExpenses = preparedNotesData.map((p) => ({
         id: p.note.id,
         productTotal: p.productTotal,
       }));
       const expensesByNote = apportionAllInvoiceExpenses(
         invoice.totais || {},
         activeNotesForExpenses
       );

       // 3. Cria cada nota preparada com totais reconciliados
       let createdCount = 0;
       for (let pIdx = 0; pIdx < preparedNotesData.length; pIdx++) {
         const { note, index, distributedItems } = preparedNotesData[pIdx];
         const suffix = String.fromCharCode(65 + index);
         const exp = expensesByNote[note.id] || {
           valorProdutos: noteTotals[note.id] || '0.00',
           valorFrete: '0.00',
           valorSeguro: '0.00',
           outrasDespesas: '0.00',
           valorDesconto: '0.00',
         };

         // Calcula totais completos com fórmula oficial SEFAZ
         const noteTotais = calculateInvoiceTotals(
           distributedItems,
           {
             discount: exp.valorDesconto,
             freight: exp.valorFrete,
             insurance: exp.valorSeguro,
             otherExpenses: exp.outrasDespesas,
           }
         );

         await preparedInvoiceRepository.create({
           parentInvoiceId: invoice.id,
           documentoOrigemId: invoice.id,
           origemNumero: invoice.numero,
           numeroOrigem: invoice.numero,
           numero: `${invoice.numero}-${suffix}`,
           serie: invoice.serie || '1',
           nomePreparacao: note.nome || `Nota Destino ${suffix}`,
           descricaoLote: `${note.nome} — Destino: ${note.razaoSocial || 'Exterior'}`,
           emitente: invoice.emitente,
           destinatario: {
             nome: note.razaoSocial || invoice.destinatario?.nome || 'Destinatário',
             cnpj: note.cnpj || invoice.destinatario?.cnpj || invoice.destinatario?.idEstrangeiro || '',
             uf: note.uf || invoice.destinatario?.uf || '',
             pais: note.pais || invoice.destinatario?.pais || 'Exterior',
             paisCodigo: invoice.destinatario?.paisCodigo || '',
           },
           itens: distributedItems,
           quantidadeItens: distributedItems.length,
           valorProdutos: noteTotais.valorProdutos,
           valorFrete: noteTotais.valorFrete,
           valorSeguro: noteTotais.valorSeguro,
           outrasDespesas: noteTotais.outrasDespesas,
           valorDesconto: noteTotais.valorDesconto,
           valorTotal: noteTotais.valorTotalNota,
           valorTotalNota: noteTotais.valorTotalNota,
           totais: noteTotais,
           status: 'preparado',
           dataCriacao: new Date().toISOString(),
         });
         createdCount++;
       }

       // 4. Marca status da nota pai como 'dividida'
       await invoiceRepository.update(invoice.id, { status: 'dividida' });

       toast.success(
         `Divisão concluída com sucesso! ${createdCount} notas preparadas foram geradas.`
       );
       router.push('/notas-preparadas');
     } catch {
       toast.error('Erro ao finalizar a divisão de notas.');
     } finally {
       setIsSaving(false);
     }
   };
   ```

### Passo 3: Atualizar `app/notas-preparadas/page.jsx`
Em `handleDownloadXml` (linhas 174–184):
Substituir valores fixos `0.00` por valores presentes em `note.totais` ou nas propriedades diretas:
```javascript
<vProd>${note.totais?.valorProdutos || note.valorProdutos || note.valorTotalNota || '0.00'}</vProd>
<vFrete>${note.totais?.valorFrete || note.valorFrete || '0.00'}</vFrete>
<vSeg>${note.totais?.valorSeguro || note.valorSeguro || '0.00'}</vSeg>
<vDesc>${note.totais?.valorDesconto || note.valorDesconto || '0.00'}</vDesc>
<vII>0.00</vII>
<vIPI>0.00</vIPI>
<vPIS>0.00</vPIS>
<vCOFINS>0.00</vCOFINS>
<vOutro>${note.totais?.outrasDespesas || note.outrasDespesas || '0.00'}</vOutro>
<vNF>${note.totais?.valorTotalNota || note.valorTotalNota || note.valorTotal || '0.00'}</vNF>
```

---

## 5. Verification Method (Método de Verificação Independente)

### 5.1. Execução de Testes Automatizados
Executar o runner nativo do Node 24:
```powershell
node --no-warnings --test tests/integration/flow_c_division_balances.test.mjs
```
Condição de sucesso: 100% dos testes passando com 0 falhas.

### 5.2. Novos Casos de Teste a serem Adicionados em `flow_c_division_balances.test.mjs`
1. **Rateio Integral de Frete, Seguro, Outras Despesas e Desconto com Reconciliação Total**:
   ```javascript
   it('Rateia frete, seguro, outras despesas e desconto conservando 100% dos totais originais da NF-e', () => {
     const parentTotals = {
       valorProdutos: '100000.00',
       valorFrete: '5000.00',
       valorSeguro: '1200.00',
       outrasDespesas: '500.00',
       valorDesconto: '200.00',
       valorTotalNota: '106500.00',
     };

     const notes = [
       { id: 'nota-1', productTotal: '60000.00' }, // 60%
       { id: 'nota-2', productTotal: '40000.00' }, // 40%
     ];

     const result = apportionAllInvoiceExpenses(parentTotals, notes);

     assert.strictEqual(result['nota-1'].valorFrete, '3000.00');
     assert.strictEqual(result['nota-2'].valorFrete, '2000.00');
     assert.strictEqual(result['nota-1'].valorSeguro, '720.00');
     assert.strictEqual(result['nota-2'].valorSeguro, '480.00');
     assert.strictEqual(result['nota-1'].outrasDespesas, '300.00');
     assert.strictEqual(result['nota-2'].outrasDespesas, '200.00');
     assert.strictEqual(result['nota-1'].valorDesconto, '120.00');
     assert.strictEqual(result['nota-2'].valorDesconto, '80.00');

     const totalFrete = decimalAdd(result['nota-1'].valorFrete, result['nota-2'].valorFrete, 2);
     const totalSeguro = decimalAdd(result['nota-1'].valorSeguro, result['nota-2'].valorSeguro, 2);
     const totalOutras = decimalAdd(result['nota-1'].outrasDespesas, result['nota-2'].outrasDespesas, 2);
     const totalDesconto = decimalAdd(result['nota-1'].valorDesconto, result['nota-2'].valorDesconto, 2);

     assert.strictEqual(totalFrete, parentTotals.valorFrete);
     assert.strictEqual(totalSeguro, parentTotals.valorSeguro);
     assert.strictEqual(totalOutras, parentTotals.outrasDespesas);
     assert.strictEqual(totalDesconto, parentTotals.valorDesconto);
   });
   ```

2. **Rateio em 3 Notas com Frações Críticas e Conservação do Centavo Remanescente**:
   ```javascript
   it('Rateia despesa ímpar entre 3 notas sem perda de centavos na última nota', () => {
     const parentTotals = {
       valorProdutos: '1000.00',
       valorFrete: '100.00',
       valorSeguro: '50.00',
       outrasDespesas: '10.00',
       valorDesconto: '0.00',
     };

     const notes = [
       { id: 'nota-1', productTotal: '333.33' },
       { id: 'nota-2', productTotal: '333.33' },
       { id: 'nota-3', productTotal: '333.34' },
     ];

     const result = apportionAllInvoiceExpenses(parentTotals, notes);

     const sumFrete = decimalAdd(
       decimalAdd(result['nota-1'].valorFrete, result['nota-2'].valorFrete, 2),
       result['nota-3'].valorFrete,
       2
     );
     assert.strictEqual(sumFrete, '100.00');

     const sumSeguro = decimalAdd(
       decimalAdd(result['nota-1'].valorSeguro, result['nota-2'].valorSeguro, 2),
       result['nota-3'].valorSeguro,
       2
     );
     assert.strictEqual(sumSeguro, '50.00');
   });
   ```

### 5.3. Inspeção de Código e Lint
Executar a verificação estática do ESLint:
```powershell
pnpm lint
```
Condição de sucesso: 0 erros e 0 warnings no código da aplicação.
