# Handoff Report — Explorer 2 (Milestone 1)

**Archetype**: explorer  
**Role**: investigation, synthesis  
**Milestone**: Milestone 1 (M1)  
**Agent ID**: teamwork_explorer_m1_2  
**Target Recipient**: sub_orch_m1 (Conversation ID: `f64908f7-618d-4f21-bf78-58657f1ff50c`)  
**Artifact References**:
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\report.md` (Relatório Técnico Completo com Código Proposto)
- `app/features/preparedInvoiceRepository.js`
- `app/features/invoiceRepository.js`
- `app/features/preparationRepository.js`

---

## 1. Observation

1. **Estado do Repositório de Invoices (`invoiceRepository.js`)**:
   - Em `app/features/invoiceRepository.js:26`:
     ```javascript
     export const sessionInvoices = new Map();
     ```
   - Em `app/features/invoiceRepository.js:647-668`:
     ```javascript
     const isReal = invoiceData.isRealImport === true || invoiceData.isDemo === false;
     ...
     if (isReal) {
       sessionInvoices.set(newDoc.id, deepClone(newDoc));
       return deepClone(newDoc);
     }
     ```
   - Em `app/features/invoiceRepository.js:194-196`:
     ```javascript
     if (sessionInvoices.has(id)) {
       return deepClone(sessionInvoices.get(id));
     }
     ```
   - Em `app/features/invoiceRepository.js:97-105`:
     ```javascript
     const persisted = await getAllInvoices();
     const sessionDocs = Array.from(sessionInvoices.values());
     const sessionIds = new Set(sessionDocs.map((doc) => doc.id));
     const uniquePersisted = persisted.filter((doc) => !sessionIds.has(doc.id));
     let result = [...sessionDocs, ...uniquePersisted];
     ```
   - Em `app/features/invoiceRepository.js:31-47`: Fila assíncrona com mutex `withMutationLock(fn)` com autocura de rejeições (`mutationQueue = resultPromise.catch(() => {})`).

2. **Vulnerabilidade de Armazenamento em `preparedInvoiceRepository.js`**:
   - Em `app/features/preparedInvoiceRepository.js:55-70`:
     ```javascript
     async function getAllPrepared() {
       const loaded = localStorageService.load(STORAGE_KEYS.PREPARED_INVOICES, null);
       if (Array.isArray(loaded)) return loaded;
       const initial = getMockPreparedInvoices();
       localStorageService.save(STORAGE_KEYS.PREPARED_INVOICES, initial);
       return initial;
     }
     async function saveAllPrepared(list) {
       localStorageService.save(STORAGE_KEYS.PREPARED_INVOICES, list);
     }
     ```
   - Em `app/features/preparedInvoiceRepository.js:144-146`:
     ```javascript
     const updated = [newEntry, ...list];
     await saveAllPrepared(updated);
     return deepClone(newEntry);
     ```
   - Em `app/documentos/[id]/divisao/page.jsx:484-513`: A criação de notas preparadas a partir de desmembramento invoca diretamente `preparedInvoiceRepository.create(...)` passando `parentInvoiceId: invoice.id`.
   - **Fato Observado**: O arquivo `preparedInvoiceRepository.js` **NÃO possui mapa em memória (`sessionPreparedInvoices`)**. Todas as notas preparadas — mesmo aquelas originadas de documentos fiscais reais que residem estritamente em `sessionInvoices` — são salvas no `localStorageService` (`STORAGE_KEYS.PREPARED_INVOICES`).

3. **Inexistência de `preparationRepository.js`**:
   - Execução de `Test-Path "c:\www\smart-nfe\app\features\preparationRepository.js"` retornou `False`.
   - Nenhuma definição para gerenciar entidades de preparação ($N \to M$), rascunhos ou alocações ativas existe atualmente.

4. **Operações Decimais Disponíveis em `decimal.js`**:
   - `app/lib/calculations/decimal.js` exporta `cleanDecimalString`, `decimalAdd`, `decimalSubtract`, `decimalMultiply`, `decimalDivide`, `roundDecimal`, `decimalCompare`, `decimalSum`, `decimalMin`, `decimalMax` e `isDecimalPositive`. Todas construídas exclusivamente em `BigInt` nativo sem bibliotecas externas.

5. **Baseline de Testes Existentes**:
   - Execução de `npm test` em `c:\www\smart-nfe` executou 383 testes em 104 suítes com **383 pass, 0 fail, 0 cancelled, 0 skipped**.
   - Em `tests/tier1/m2_domain.test.mjs:513-521`, o teste de `preparedInvoiceRepository` assume que `list()` retorna exatamente as 2 notas de fábrica (`prep-01` e `prep-02`), exigindo que `resetDemoData()` limpe a memória de sessão para evitar contaminação entre testes.
   - Em `tests/tier5/m2_challenger1_concurrency_validation.test.mjs:140-192` e `258-300`, testa-se estritamente concorrência de 10 creates + 2 updates + 1 delete paralelos e autocura da fila sob rejeições de Promises.

---

## 2. Logic Chain

1. A partir da **Observação 2**, constatamos que notas preparadas derivadas de NF-e reais importadas vazam para o `localStorage` do navegador. Como o SmartNFe exige em R4 e R5 retenção estritamente volátil de dados fiscais reais, `preparedInvoiceRepository.js` precisa implementar o padrão de isolamento já consolidado em `invoiceRepository.js` (**Observação 1**).
2. Para sanar o vazamento sem quebrar código chamador (`/documentos/[id]/divisao`), a determinação de voluntariedade/sessão deve inspecionar tanto flags explícitas (`isRealImport: true` ou `isDemo: false`) quanto a proveniência dos IDs de origem (`parentInvoiceId`, `documentoOrigemId`, `sourceInvoiceIds`, `origens`, `itens[].sourceInvoiceId`) consultando `sessionInvoices.has(id)`.
3. Ao isolar em `sessionPreparedInvoices = new Map()`, as operações de `create`, `update`, `delete`, `findById` e `list` devem tratar a memória volátil como fonte prioritária, mesclando-a com o storage de demonstração apenas para listagens e fallback.
4. Para garantir que os testes existentes (**Observação 5**) continuem passando sem regressão, `preparedInvoiceRepository.resetDemoData()` deve invocar `sessionPreparedInvoices.clear()`, assegurando isolamento limpo entre ciclos de teste.
5. A partir da **Observação 3**, o novo repositório `preparationRepository.js` deve ser construído do zero adotando o mesmo padrão dual-storage:
   - `sessionPreparations = new Map()` para preparações contendo qualquer documento real.
   - `STORAGE_KEYS.PREPARATIONS` no `localStorageService` para preparações de demonstração.
6. A máquina de estados da preparação deve gerenciar `'draft'`, `'active'`, `'completed'`, `'cancelled'` (e sinônimos em PT-BR), onde preparações canceladas liberam imediatamente seus saldos.
7. Para implementar a conservação estrita $disponível = original - soma(alocações ativas)$, o método `getActiveAllocations(excludePreparationId)` deve extrair e somar as quantidades alocadas de todas as preparações ativas e rascunhos (exceto a preparação sendo editada e as canceladas), utilizando estritamente `decimalAdd(..., 4)` de `decimal.js` (**Observação 4**), prevenindo distorções de ponto flutuante IEEE-754.

---

## 3. Caveats

1. **Dependência de Chave de Storage**: A chave `STORAGE_KEYS.PREPARATIONS` precisa ser registrada em `app/lib/storage/localStorageService.js`. O código de `preparationRepository.js` foi desenhado com fallback seguro: `STORAGE_KEYS.PREPARATIONS || 'smartnfe_preparations'`.
2. **Exportação Central**: O arquivo `app/features/index.js` deve ser atualizado para incluir `export * from './preparationRepository.js';`.
3. **Escopo de Rascunho em Saldos**: Por padrão, `getActiveAllocations` considera alocações de preparações em status `'draft'` como saldos comprometidos (reserva temporária). Caso um fluxo futuro exija ignorar rascunhos, a opção `{ includeDrafts: false }` já está implementada e suportada no contrato.

---

## 4. Conclusion

1. O vazamento de dados em `preparedInvoiceRepository.js` é uma falha de conformidade fiscal e privacidade crítica, com solução clara e de baixo risco através da introdução de `sessionPreparedInvoices = new Map()` e detecção automática de IDs em `sessionInvoices`.
2. O design completo de `app/features/preparationRepository.js` está concluído, fornecendo todos os métodos assíncronos requisitados (`create`, `update`, `findById`, `list`, `delete`, `getActiveAllocations`), controle de concorrência (`withMutationLock`), precisão decimal BigInt e ciclo de vida de rascunhos.
3. Ambos os códigos completos, testáveis e prontos para aplicação direta pelo Worker foram documentados na íntegra em `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\report.md`.

---

## 5. Verification Method

Para verificar de forma independente as conclusões e os códigos propostos:

1. **Inspeção de Código do Vazamento**:
   - Inspecionar `app/features/preparedInvoiceRepository.js:55-70` e constatar a ausência de mapa em memória.
   - Inspecionar `app/features/invoiceRepository.js:26` e constatar o padrão `sessionInvoices = new Map()`.
2. **Execução da Suíte de Testes Atual**:
   ```powershell
   npm --prefix c:\www\smart-nfe test
   ```
   Deve executar os 383 testes existentes e passar com 100% de sucesso.
3. **Verificação de Implementação (Pós-Worker)**:
   - Aplicar as modificações propostas em `report.md`.
   - Executar suíte de testes de integridade e concorrência:
     ```powershell
     node --no-warnings --test tests/tier1/m2_domain.test.mjs
     node --no-warnings --test tests/tier5/m1_challenger2_session_integrity.test.mjs
     node --no-warnings --test tests/tier5/m2_challenger1_concurrency_validation.test.mjs
     ```
   - Executar os novos testes unitários `tests/tier1/m1_preparation_repository.test.mjs`.
   - Verificar que nenhuma chamada a `localStorageService.save` ocorre ao cadastrar ou desmembrar notas fiscais com `isRealImport: true` ou IDs registrados em `sessionInvoices`.
