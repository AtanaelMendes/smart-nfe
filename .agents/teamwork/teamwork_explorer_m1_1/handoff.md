# Relatório de Handoff — Explorer 1 (Milestone 1)

**Data**: 2026-11-13  
**Para**: Worker Milestone 1 / Sub-Orquestrador M1  
**De**: Explorer 1 (`teamwork_explorer_m1_1`)  
**Missão**: Investigação de `decimal.js` e Arquitetura do `allocationEngine.js`

---

## 1. Observation

1. **Aritmética Decimal Atual (`app/lib/calculations/decimal.js`)**:
   - O arquivo possui 336 linhas implementando operações aritméticas puras com `BigInt` sem bibliotecas de terceiros.
   - Linhas 15–58: `cleanDecimalString` trata pontuação brasileira e americana.
   - Linhas 65–87: `parseDecimal` decompõe strings em `{ sign: bigint, intVal: bigint, scale: number }`.
   - Linhas 125–156: `roundSignedBigInt` implementa arredondamento fiscal Half-Up ABNT NBR 5891 via BigInt.
   - Linhas 165–270: Operações básicas `decimalAdd`, `decimalSubtract`, `decimalMultiply`, `decimalDivide`, `roundDecimal`.
   - Linhas 287–336: Comparações simples `decimalCompare`, `isDecimalZero`, `isDecimalNegative`, `decimalAbs`, `normalizeDecimal`.
   - **Lacuna direta**: Não existem funções vetoriais (`decimalSum`, `decimalAverage`), predicados relacionais estritos (`isDecimalPositive`, `decimalEquals`, `decimalMin`, `decimalMax`, `decimalClamp`) nem utilitários de rateio proporcional com garantia de conservação exata de centavos (`decimalApportionProportional`, `decimalDistributeEqually`).

2. **Divisão Legada Atual (`app/lib/calculations/divisionMath.js`)**:
   - Linhas 64–105: `calculateRemainingBalance` opera sobre um item único de uma nota única.
   - Linhas 130–274: `validateDivisionBatch` assume que todos os itens pertencem a uma mesma NF de origem, bloqueia `canSave: false` se houver qualquer sobra remanescente (`hasRemaining: true`) e não preserva a tupla `(sourceInvoiceId, sourceItemId)`.
   - Linhas 384–518: `apportionAllInvoiceExpenses` rateia frete, seguro, outras despesas e desconto para uma única nota de origem com absorção de resíduo na última nota ativa, incapaz de ratear despesas quando o destino recebe mercadorias de $N$ notas fiscais de fornecedores distintos.

3. **Ambiente e Suíte de Testes Existente**:
   - Execução do comando `node --test` em `c:\www\smart-nfe`:
     ```
     ℹ tests 383
     ℹ suites 104
     ℹ pass 383
     ℹ fail 0
     ℹ duration_ms 12785.0957
     ```
   - 383 testes passam com 100% de sucesso.
   - O branch ativo é `feature/preparacoes-unificadas` e o runtime é Node 24 com Next.js 16 e React 19.

4. **Diretrizes e Contratos do Projeto (`PROJECT.md` e `SCOPE.md`)**:
   - `PROJECT.md` linhas 54–65 definem o contrato de interface para `calculateAllocationMatrix(sourceItems, destinationNotes, activeAllocations)` com saídas `matrix`, `sourceBalances`, `canSave`, `totals` e `checkUnitCompatibility(itemA, itemB)`.
   - A regra de conservação estrita: $\text{disponível} = \text{original} - \text{soma(alocações ativas)}$.
   - Preservação da chave composta: `${sourceInvoiceId}__${sourceItemId}`.
   - Proibição absoluta de fusão arbitrária de itens de fornecedores distintos no destino.

---

## 2. Logic Chain

1. **A partir da Observação 1 (estrutura de `decimal.js`)**:
   - O motor `decimal.js` já possui a infraestrutura matemática ideal (`parseDecimal`, `formatBigInt`, `roundSignedBigInt`), dispensando pacotes externos.
   - Adicionar `decimalSum(array, scale)` acumulando os `intVal` escalonados para a escala máxima natural da coleção antes de formatar evita os erros cumulativos decorrentes de sucessivos `decimalAdd` com arredondamento prematuro.
   - Adicionar `decimalDistributeEqually` e `decimalApportionProportional` com absorção de resíduo na última parcela ativa fornece uma primitiva matemática universal de "zero-drift" utilizável tanto pelo novo `allocationEngine.js` quanto pelo legado `divisionMath.js`.

2. **A partir da Observação 2 (limitações de `divisionMath.js`)**:
   - O suporte ao modelo $N \text{ origens} \to M \text{ destinos}$ não pode ser implementado remendando `divisionMath.js`, pois o modelo mental de divisão assume uma única nota pai e obriga $100\%$ de distribuição (`isBalanced && !hasRemaining`).
   - É mandatório criar o módulo isolado `app/lib/calculations/allocationEngine.js` como autoridade primária de cálculos matriciais.
   - `divisionMath.js` deve ser mantido como camada de fachada retrocompatível, delegando suas chamadas internamente para as funções de `allocationEngine.js` e `decimal.js`, mantendo inalteradas as assinaturas e o formato de resposta que alimentam `/documentos/[id]/divisao` e os testes de regressão do Challenger M4.

3. **A partir das Observações 1 e 4 (regra de conservação e rateio multi-origem)**:
   - Para cada item na matriz, o saldo remanescente deve ser avaliado em relação à quantidade disponível líquida:
     $$\text{disponível} = \text{quantidadeOriginal} - \text{alocaçõesAtivasOutrasPreparacoes}$$
   - Para o rateio de despesas acessórias (frete, seguro, outras despesas e desconto), a atribuição deve ocorrer em nível de origem: para cada fornecedor/nota de origem $s$, calcula-se a fração do valor de seus produtos entregue a cada destino $d$, distribuindo as despesas de $s$ proporcionalmente e atribuindo o resíduo exato de centavos ao último destino que recebeu itens de $s$. As despesas totais do destino $d$ são o somatório das cotas de todas as suas origens. Isso prova matematicamente a conservação do centavo em $N \to M$.

4. **A partir da Observação 4 (compatibilidade de unidades)**:
   - Fornecedores enviam unidades em formatos diversos (`KG`, `KGS`, `QUILOGRAMA`, `UN`, `PÇA`, `PC`).
   - A implementação de `checkUnitCompatibility` baseada em 15 famílias canônicas SEFAZ e normalização de strings permite validar com segurança e bloquear operações entre grandezas heterogêneas (ex: `KG` vs `UN`) sem rejeitar sinônimos válidos.

---

## 3. Caveats

- **Persistência em Memória Volátil**: O repositório de preparações (`preparationRepository.js`) e as alterações no repositório de notas preparadas (`preparedInvoiceRepository.js`) estão sob escopo de investigação do Explorer 2. O `allocationEngine.js` recebe `activeAllocations` puramente como estrutura de dados em memória (Map ou Object), mantendo-se agnóstico em relação à camada de armazenamento.
- **Modo Divisão Estrita vs Parcial**: No fluxo de divisão legada `/documentos/[id]/divisao`, sobras remanescentes (`hasRemaining: true`) bloqueiam o salvamento (`canSave: false`). No fluxo novo de preparação `/preparacoes/nova`, alocações parciais são permitidas. Por esse motivo, `calculateAllocationMatrix` aceita a opção `requireBalanced: true/false` (default: `false`), garantindo que ambos os fluxos operem com conformidade máxima.

---

## 4. Conclusion

1. **`app/lib/calculations/decimal.js`**:
   - Está apto a receber as extensões propostas de vetores (`decimalSum`, `decimalAverage`), comparações relacionais (`isDecimalPositive`, `decimalEquals`, `decimalGreaterThan`, `decimalLessThan`, `decimalMin`, `decimalMax`, `decimalClamp`) e rateio proporcional zero-drift (`decimalDistributeEqually`, `decimalApportionProportional`).
   - O código completo foi documentado na Seção 4 de `report.md`.

2. **`app/lib/calculations/allocationEngine.js`**:
   - O desenho arquitetural, interfaces, estruturas de dados e implementação completa foram finalizados e documentados na Seção 5 de `report.md`.
   - O módulo entrega cálculo matricial $N \to M$, conservação de saldos em tempo real, preservação da chave composta `${sourceInvoiceId}__${sourceItemId}`, compatibilidade de unidades fiscais e rateio de despesas multi-origem com conservação exata de centavos.

3. **Retrocompatibilidade**:
   - `divisionMath.js` pode delegar com segurança para `allocationEngine.js` e `decimal.js`, garantindo que os 383 testes existentes continuem passando.

---

## 5. Verification Method

Para verificar de forma independente as conclusões e projetos apresentados:

1. **Inspeção de Arquivos**:
   - Inspecionar `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\report.md` para revisão detalhada do código proposto e arquitetura matemática.
   - Inspecionar `app/lib/calculations/decimal.js` e `app/lib/calculations/divisionMath.js` para certificar as linhas e assinaturas referenciadas.

2. **Execução da Suíte de Testes Baseline**:
   - Executar no terminal:
     ```powershell
     cd c:\www\smart-nfe
     node --test
     ```
   - Condição de validação: 383 testes passando sem qualquer falha ou aviso bloqueante.

3. **Critérios de Invalidação**:
   - A descoberta de que qualquer cenário fiscal legítimo exija dependência de bibliotecas npm externas invalidaria a proposta (o desenho atual utiliza 100% BigInt nativo).
   - Qualquer regressão na suíte de 383 testes após a inclusão das extensões invalidaria o design (o Worker deve executar os testes após aplicar o código).
