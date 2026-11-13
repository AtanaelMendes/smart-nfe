# Handoff Report — Explorer Survey 1 (Calculations, Allocation Engine & Repositories)

## 1. Observation
- **Aritmética BigInt**: Em `app/lib/calculations/decimal.js:15-87`, as funções `cleanDecimalString`, `parseDecimal`, `formatBigInt` e `roundSignedBigInt` realizam operações de precisão fixa exclusivamente com `BigInt` nativo sem bibliotecas externas.
- **Lógica de Divisão Unidirecional (1 → M)**: Em `app/lib/calculations/divisionMath.js:130-274`, a função `validateDivisionBatch(originalItems, destinationNotes)` itera sobre um único vetor `origList` de itens de uma única nota fiscal de origem:
  ```javascript
  172: for (const origItem of origList) {
  173:   const itemId = origItem.id;
  ...
  185:   const matched = note.itens.find(
  186:     (i) => i.id === itemId || i.itemId === itemId || i.codigo === codigo
  187:   );
  ```
  Não há suporte a tuplas `(sourceInvoiceId, sourceItemId)` nem a $N$ notas fiscais de origem concorrentes.
- **Vazamento de Dados Reais no Storage em `preparedInvoiceRepository.js`**: Em `app/features/preparedInvoiceRepository.js:55-70` e `126-148`:
  ```javascript
  56: const loaded = localStorageService.load(STORAGE_KEYS.PREPARED_INVOICES, null);
  ...
  145: const updated = [newEntry, ...list];
  146: await saveAllPrepared(updated);
  ```
  O repositório grava incondicionalmente no `localStorageService` (chave `smartnfe_prepared_invoices`) sem verificar `isRealImport` ou se as origens residem em `sessionInvoices`. Em contrapartida, `app/features/invoiceRepository.js:26` e `663-667` isola estritamente documentos reais em memória volátil (`sessionInvoices = new Map()`).
- **Inexistência de `preparationRepository.js`**: Comando de busca `Get-ChildItem -Path "c:\www\smart-nfe" -Recurse -Filter "*preparation*"` retornou 0 resultados. Não há repositório dedicado para ciclo de vida de preparações, rascunhos e controle agregado de alocações ativas.
- **Falta de Preservação de Origem em `/documentos/[id]/divisao/page.jsx`**: Nas linhas 422–427:
  ```javascript
  422: return {
  423:   ...origItem,
  424:   item: itemIdx + 1,
  425:   quantidade: qtyStr,
  426:   valorTotal: lineTotal,
  427: };
  ```
  Os itens divididos herdam atributos de `origItem`, mas não preenchem explicitamente `sourceInvoiceId` nem `sourceItemId`.
- **Suíte de Testes Atual**: Comando executado em `c:\www\smart-nfe`:
  ```powershell
  npm test
  ```
  Resultado:
  ```
  ℹ tests 383
  ℹ suites 104
  ℹ pass 383
  ℹ fail 0
  ℹ duration_ms 16571.0386
  ```
  383 testes executados com 100% de aprovação no Node 24 native runner.

---

## 2. Logic Chain
1. A partir da **Observação 1**, constatamos que a base matemática decimal (`decimal.js`) já opera em ponto fixo com `BigInt`, eliminando desvios IEEE-754 sem pacotes NPM externos. Portanto, a evolução matemática deve estender `decimal.js` (somatórios vetoriais, operações relacionais) sem substituir sua fundação.
2. A partir da **Observação 2**, `divisionMath.js` foi desenhado sob o pressuposto de $1 \text{ origem} \to M \text{ destinos}$. Para atender R3 e R4 ($N \text{ origens} \to M \text{ destinos}$), o motor de alocação deve indexar itens bidimensionalmente por `(sourceInvoiceId, sourceItemId)` e calcular a regra de conservação:
   $$\text{disponível}(s, i) = \text{original}(s, i) - \sum_{d} \text{alocado}(s, i, d)$$
3. A partir da **Observação 3**, constatamos uma quebra crítica de segurança e conformidade: notas preparadas a partir de XMLs reais importados são salvas em `localStorageService`. Pela lógica de isolamento de sessão do SmartNFe, `preparedInvoiceRepository` deve espelhar o comportamento de `invoiceRepository`, mantendo `sessionPreparedInvoices = new Map()` e gravando no storage apenas itens de demonstração (`demo-01` a `demo-05`).
4. A partir da **Observação 4**, para atender R3 (`/preparacoes/nova` e `/preparacoes`) e R4 (deduplicação de saldos e conservação entre preparações ativas), é imprescindível criar `app/features/preparationRepository.js` com suporte a rascunhos e controle global de alocações ativas.
5. A partir da **Observação 5**, para atender aos critérios de aceitação de R3/R4 (*"Cada produto alocado preserva sua identificação de origem através de sourceInvoiceId e sourceItemId, sem agrupar automaticamente produtos de fornecedores distintos"*), tanto a nova rota de preparação quanto a rota legada `/documentos/[id]/divisao` devem gravar explicitamente `sourceInvoiceId` e `sourceItemId` em cada linha de produto alocada.
6. A partir da **Observação 6**, como todos os 383 testes existentes passam, a arquitetura unificada de alocação deve ser desenhada como uma extensão retrocompatível, garantindo que `/documentos/[id]/divisao` e `parentInvoiceId` continuem operando sem regressões.

---

## 3. Caveats
- A rota `/preparacoes/nova` e os componentes visuais de preparação ainda não foram implementados; esta investigação cobriu a camada de domínio, cálculos e repositórios necessários para sustentá-la.
- As regras de rateio de despesas acessórias para $N$ fornecedores distintos assumem o critério contábil e fiscal de proporcionalidade pelo valor de mercadorias fornecidas por cada emitente para cada nota de destino.
- Os testes atuais cobrem amplamente o fluxo legado de divisão ($1 \to M$), conferência e validação, mas não cobrem $N \to M$ ou $N \to 1$; novos testes automatizados deverão ser adicionados para cobrir o motor unificado.

---

## 4. Conclusion
1. A camada de cálculo `decimal.js` atende à exigência de `BigInt` arbitrário e ausência de bibliotecas prontas; requer apenas adição de utilitários vetoriais e de comparação.
2. É mandatório criar o Motor Unificado de Alocação (`app/lib/calculations/allocationEngine.js`) para gerenciar matrizes $N \to M$, preservação de identidade (`sourceInvoiceId + sourceItemId`) e rateio multi-origem com conservação estrita de centavos.
3. É mandatório corrigir a vulnerabilidade de vazamento em `preparedInvoiceRepository.js` adicionando `sessionPreparedInvoices = new Map()`, impedindo que XMLs reais persistam no `localStorage`.
4. É mandatório criar `preparationRepository.js` com padrão dual-storage (sessão vs storage) para gerenciar preparações, rascunhos e controle de saldos disponíveis.
5. A rota `/documentos/[id]/divisao` e o campo `parentInvoiceId` devem ser mantidos como caso particular $1 \to M$ delegando para o motor unificado.
6. Dez novas features (Features 23 a 32) foram especificadas para inclusão imediata no `PROJECT.md`.

---

## 5. Verification Method
1. **Verificação de Testes Existentes**:
   ```powershell
   cd c:\www\smart-nfe
   npm test
   ```
   Critério: 383 testes devem passar com 0 falhas.
2. **Inspeção de Código do Repositório**:
   Abrir `app/features/preparedInvoiceRepository.js` e verificar que chamadas a `create()` gravam diretamente em `saveAllPrepared()`, demonstrando a necessidade da correção com `sessionPreparedInvoices`.
3. **Inspeção de Cálculos BigInt**:
   Abrir `app/lib/calculations/decimal.js` e verificar que todas as funções usam literais `0n`, `1n`, `10n` e a classe nativa `BigInt`.
4. **Condição de Invalidação**:
   Caso qualquer alteração proposta quebre os 383 testes existentes ou introduza pacotes de terceiros no `package.json`, o design deve ser revisado.
