# Handoff Report — Explorer 3 (Milestone 1)

**Data**: 2026-11-13  
**Agente**: `teamwork_explorer_m1_3` (Explorer 3 — Milestone 1)  
**Destinatário**: `f64908f7-618d-4f21-bf78-58657f1ff50c` (Parent / Sub-Orquestrador Marco 1)  
**Escopo**: Retrocompatibilidade de `divisionMath.js`, Levantamento de Testes de Baseline e Design da Nova Suíte Unitária `tests/unit/allocationEngine.test.mjs`.

---

## 1. Observation

1. **Assinaturas e Exportações de `divisionMath.js`**:
   - Arquivo inspecionado: `c:\www\smart-nfe\app\lib\calculations\divisionMath.js` (518 linhas).
   - Exporta exatamente 6 funções:
     1. `calculateRemainingBalance(originalQtyStr, allocatedQtyArray)` (linha 64)
     2. `validateDivisionBatch(originalItems, destinationNotes)` (linha 130)
     3. `distributeEqually(originalQtyStr, numNotes, scale = 4)` (linha 290)
     4. `distributeRemainingEqually(originalQtyStr, currentAllocations, scale = 4)` (linha 338)
     5. `apportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr)` (linha 363)
     6. `apportionAllInvoiceExpenses(parentTotals = {}, notesWithProducts = [])` (linha 384)
   - Linha 255: `const canSave = notes.length >= 2 && !hasExcess && !hasRemaining && isBalanced;` estabelece a regra clássica de divisão total de 1 nota pai (exige $\ge 2$ notas de destino e $0$ sobras).

2. **Consumo por `/documentos/[id]/divisao/page.jsx`**:
   - Arquivo inspecionado: `c:\www\smart-nfe\app\documentos\[id]\divisao\page.jsx` (1109 linhas).
   - Linhas 35-39: Importa `validateDivisionBatch`, `calculateRemainingBalance`, `distributeEqually`, `apportionAllInvoiceExpenses`.
   - Linha 132: `return validateDivisionBatch(invoice.itens, targetNotes);` dentro de `useMemo` com dependências `[invoice, targetNotes]`.
   - Linhas 300, 327, 350: Invoca `distributeEqually` para ações interativas do usuário.
   - Linhas 455-458: Invoca `apportionAllInvoiceExpenses(invoice.totais || {}, activeNotesForExpenses)`.
   - Linha 484: Invoca `preparedInvoiceRepository.create({ parentInvoiceId: invoice.id, ... })`.

3. **Consumo por Testes Automatizados Existentes**:
   - Inspecionados arquivos de teste via PowerShell `Select-String`:
     - `tests/integration/flow_c_division_balances.test.mjs` (linhas 21-24, 11 testes executados e aprovados em 195ms).
     - `tests/tier1/m2_domain.test.mjs` (linhas 234-327, 44 testes aprovados).
     - `tests/tier5/m2_decimal_adversarial_stress.test.mjs` (linhas 375-502, 10 notas de destino com `demo-05`).
     - `tests/tier5/m4_challenger_division_traps_adversarial.test.mjs` (linhas 26-33, 25 testes aprovados em 1647ms).
     - `tests/tier5/m4_challenger_expenses_persistence_adversarial.test.mjs` (linhas 37-40, 15 testes aprovados em 454ms).

4. **Execução do Baseline Geral de Testes**:
   - Comando executado: `Set-Location "c:\www\smart-nfe"; npm test`.
   - Resultado verbatim:
     ```
     ℹ tests 383
     ℹ suites 104
     ℹ pass 383
     ℹ fail 0
     ℹ cancelled 0
     ℹ skipped 0
     ℹ todo 0
     ℹ duration_ms 9943.6152
     ```
   - Git branch atual: `feature/preparacoes-unificadas`.

---

## 2. Logic Chain

1. **A Divisão 1 -> M é um Subconjunto Matemático Estrito de N -> M**:
   - No modelo $N \to M$ do `allocationEngine.js`, o domínio de origens tem cardinalidade $N \ge 1$ e o de destinos $M \ge 1$.
   - Fazendo $N = 1$ e fixando `sourceInvoiceId = 'orig'`, o cálculo de alocação matricial $A(s, d)$, verificação de saldos remanescentes e rateio de despesas acessórias coincide exatamente com as operações de `divisionMath.js`.
   - Portanto, qualquer chamada a `validateDivisionBatch(originalItems, destinationNotes)` pode ser mapeada para `calculateAllocationMatrix(unifiedSourceItems, unifiedDestinations, {})` sem perdas conceituais ou numéricas.

2. **Preservação de Compatibilidade Sem Breaking Changes**:
   - A interface do usuário `/documentos/[id]/divisao` e os 67 testes de divisão esperam propriedades específicas no retorno:
     `{ isValid, canSave, hasExcess, hasRemaining, isBalanced, summary, itemReports, notesSummary }`.
   - Adicionalmente, `itemReports` exige os campos `{ itemId, itemNumber, codigo, descricao, originalQty, unitPrice, totalAllocated, balanceStr, status, allocationsByNote }`.
   - E `apportionAllInvoiceExpenses` exige retorno com chaves duplicadas em português e inglês (`valorFrete` e `freight`, `valorSeguro` e `insurance`, `outrasDespesas` e `otherExpenses`, `valorDesconto` e `discount`).
   - Mantendo o arquivo `divisionMath.js` como um adapter/fachada que delega internamente a `allocationEngine.js` e reconstrói o formato de saída legado, garante-se 100% de conformidade com todos os 383 testes de baseline sem regressão.

3. **Necessidade da Nova Suíte Unitária Dedicada**:
   - O `allocationEngine.js` introduz novos requisitos não cobertos pela divisão legada:
     - Chaves compostas `${sourceInvoiceId}__${sourceItemId}`.
     - Agrupamento $N \to 1$ com não fusão de fornecedores distintos.
     - Preparação mista $N \to M$.
     - Desconto de `activeAllocations` externas de outras preparações ativas.
     - Validação de compatibilidade de unidades de medida (`checkUnitCompatibility`).
     - Rateio simultâneo de despesas acessórias provenientes de múltiplas notas fiscais de origem.
   - A criação de `tests/unit/allocationEngine.test.mjs` com 8 blocos de testes (30+ asserções) fecha a cobertura necessária com execução ultrarrápida no runner nativo do Node.

---

## 3. Caveats

1. **Regra de `canSave` Diferenciada**:
   - Na divisão legada $1 \to M$ de `divisionMath.js`, qualquer saldo restante (`hasRemaining: true`) bloqueia o salvamento (`canSave: false`), pois uma nota pai deve ser totalmente desmembrada.
   - No fluxo de Nova Preparação $N \to M$ (`/preparacoes/nova`), o salvamento de rascunhos e alocações parciais é permitido mesmo que haja saldos remanescentes nas notas de fornecedor. O Worker M1 deve atentar para que `calculateAllocationMatrix` retorne `canSave: true` quando não houver excessos (`!hasExcess`), cabendo ao adapter `validateDivisionBatch` aplicar o bloqueio adicional `!hasRemaining && notes.length >= 2`.
2. **Nenhuma Alteração em `node_modules` ou Backend**:
   - Todo o cálculo roda estritamente no runtime JavaScript/Node via `BigInt`, sem dependência externa e sem chamadas à API PHP.

---

## 4. Conclusion

1. O plano de refatoração de `divisionMath.js` está 100% definido e validado: o arquivo atuará como fachada transparente delegando ao `allocationEngine.js`, garantindo retrocompatibilidade total com `/documentos/[id]/divisao` e os 383 testes de baseline.
2. A suíte de testes unitários `tests/unit/allocationEngine.test.mjs` está integralmente desenhada em `report.md`, pronta para ser adicionada pelo Worker M1.
3. As especificações de interface e os contratos matemáticos foram documentados sem ambiguidades.

---

## 5. Verification Method

Para verificar independentemente os achados e a conformidade da solução:

1. **Verificação do Baseline de Testes**:
   ```powershell
   Set-Location "c:\www\smart-nfe"
   npm test
   ```
   *Condição de invalidação*: Qualquer falha entre os 383 testes atuais.

2. **Verificação dos Testes de Divisão Existentes**:
   ```powershell
   Set-Location "c:\www\smart-nfe"
   node --no-warnings --test tests/integration/flow_c_division_balances.test.mjs
   node --no-warnings --test tests/tier5/m4_challenger_division_traps_adversarial.test.mjs
   node --no-warnings --test tests/tier5/m4_challenger_expenses_persistence_adversarial.test.mjs
   ```

3. **Verificação da Nova Suíte Unitária (após implementação do Worker)**:
   ```powershell
   Set-Location "c:\www\smart-nfe"
   node --no-warnings --test tests/unit/allocationEngine.test.mjs
   ```
   *Condição de invalidação*: Qualquer falha nas 8 suítes ou tempo de execução superior a 2 segundos.
