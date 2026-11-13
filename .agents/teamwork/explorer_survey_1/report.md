# Relatório Abrangente de Levantamento Técnico — Explorer Survey 1
**Data**: 2026-11-13  
**Escopo**: R4 (Motor Unificado de Alocação, Cálculos BigInt e Repositórios) e Fluxo de Dados R3  
**Ambiente**: `c:\www\smart-nfe` (Next.js 16, React 19, JavaScript/JSX puro, Tailwind CSS 4, Node 24 native test runner)

---

## 1. Resumo Executivo
O SmartNFe possui uma base sólida de aritmética decimal BigInt pura (`decimal.js`) e isolamento de sessão em `invoiceRepository.js`. No entanto, a lógica de divisão (`divisionMath.js` e `/documentos/[id]/divisao`) está restrita a `1 origem → M destinos`, não preserva as chaves `sourceInvoiceId` e `sourceItemId`, e existe uma vulnerabilidade crítica de privacidade fiscal em `preparedInvoiceRepository.js` onde notas preparadas de XMLs reais são salvas indevidamente no `localStorageService`. Uma evolução arquitetural unificada é necessária para introduzir o `preparationRepository`, suportar `N origens → M destinos`, sanar o vazamento de dados reais no storage e garantir 100% de retrocompatibilidade com preparações legadas (`parentInvoiceId`).

---

## 2. Inventário Estrutural e Análise do Código Existente

| Componente / Arquivo | Caminho | Estado Atual | Responsabilidade |
|---|---|---|---|
| **Motor Decimal BigInt** | `app/lib/calculations/decimal.js` | Funcional (336 linhas) | Aritmética decimal de precisão arbitrária baseada em `BigInt` nativo (sem libs externas), Half-Up ABNT NBR 5891. |
| **Matemática de Divisão** | `app/lib/calculations/divisionMath.js` | Funcional (518 linhas) | Validação e distribuição restrita a `1 origem → M destinos`, rateio de despesas acessórias de 1 nota pai. |
| **Totais Fiscais** | `app/lib/calculations/invoiceTotals.js` | Funcional (130 linhas) | Consolidação de totais com fórmula oficial SEFAZ: Produtos - Descontos + Frete + Seguro + Outras Despesas. |
| **Repositório de Invoices** | `app/features/invoiceRepository.js` | Funcional (725 linhas) | Dual-storage: `sessionInvoices = new Map()` para XMLs reais; `localStorageService` para mocks `demo-01` a `demo-05`. Mutex lock concorrente. |
| **Repositório de Notas Preparadas** | `app/features/preparedInvoiceRepository.js` | Incompleto / Vazamento (206 linhas) | Grava **tudo** em `localStorageService` sem segregação de sessão. Restrito a `parentInvoiceId: string`. |
| **Repositório de Preparações** | `app/features/preparationRepository.js` | **Inexistente** | Necessário para gerenciar o ciclo de vida das preparações (N origens → M destinos), rascunhos e controle de alocações ativas. |
| **Serviço de Armazenamento** | `app/lib/storage/localStorageService.js` | Funcional (373 linhas) | Envelope versionado `1.0.0`, fallback para `MemoryStorage`, probe de browser/Node. |
| **Tela de Divisão Legada** | `app/documentos/[id]/divisao/page.jsx` | Funcional (1109 linhas) | Divisão de 1 NF em M lotes. Não anota `sourceInvoiceId` nem `sourceItemId` nos itens gerados. |
| **Tela de Notas Preparadas** | `app/notas-preparadas/page.jsx` | Funcional (684 linhas) | Listagem, visualização DANFE e download de XML mockado/preparado. |
| **Suíte de Testes** | `tests/` (383 testes) | 100% Passing (16.5s) | Testes de integração (Fluxos A, B, C, D) e testes adversariais Tiers 1 a 5 via `node:test`. |

---

## 3. Investigação Aprofundada dos 5 Eixos do Dispatch

### Eixo 1: Camada de Cálculos (`decimal.js`, `divisionMath.js`, `invoiceTotals.js`)

#### 1.1 `decimal.js`
- **Diagnóstico**: O arquivo já utiliza `BigInt` puro e elimina completamente os desvios de ponto flutuante IEEE-754. Todas as operações aritméticas (`decimalAdd`, `decimalSubtract`, `decimalMultiply`, `decimalDivide`, `decimalCompare`, `roundDecimal`) decompõem strings decimais em `{ sign: bigint, intVal: bigint, scale: number }`.
- **Conformidade de Restrições**: Não há qualquer dependência de pacotes externos (`bignumber.js`, `decimal.js`, `mathjs` etc.), respeitando a regra estrita do projeto.
- **Lacunas Identificadas**:
  1. *Falta de utilitários vetoriais*: Somatórios de listas de strings decimais sem arredondamento intermediário prematuro (`decimalSum(array, targetScale)`).
  2. *Operações relacionais avançadas*: Necessidade de `decimalMin(a, b)`, `decimalMax(a, b)` e `isDecimalPositive(val)` para simplificar o motor de saldos.
  3. *Escalas diferenciadas*: No fluxo fiscal, quantidades exigem escala 4 (`0.0000`), valores monetários escala 2 (`0.00`), enquanto preços unitários e coeficientes de rateio exigem de 4 a 10 casas decimais.

#### 1.2 `divisionMath.js`
- **Diagnóstico**: Atualmente projetado exclusivamente para desmembramento simples `1 origem → M destinos`:
  - `calculateRemainingBalance(originalQtyStr, allocatedQtyArray)`: opera sobre um único item de uma única nota.
  - `validateDivisionBatch(originalItems, destinationNotes)`: itera sobre `originalItems` assumindo que todos pertencem a uma mesma NF pai.
  - `apportionAllInvoiceExpenses(parentTotals, notesWithProducts)`: rateia as despesas acessórias de uma única nota de origem com absorção do resíduo na última nota ativa.
- **Lacunas para N origens → M destinos**:
  1. *Ausência de rastreamento de origens compostas*: Não há conceito de item composto ou identificador bidimensional `(sourceInvoiceId, sourceItemId)`.
  2. *Incapacidade de rateio multi-origem*: Quando a Nota Destino 1 recebe mercadorias do Fornecedor A e do Fornecedor B, o frete e as despesas acessórias de A devem ser rateados na proporção dos produtos de A, e os de B na proporção dos produtos de B. O algoritmo atual só suporta uma única tupla de `parentTotals`.
  3. *Ausência de suporte a alocações parciais*: `validateDivisionBatch` força `canSave: false` se houver qualquer sobra (`hasRemaining: true`), o que é adequado para `/documentos/[id]/divisao` (divisão total de 1 nota), mas incompatível com `/preparacoes/nova` onde o usuário pode preparar uma exportação com apenas parte do saldo de uma ou mais notas recebidas.

#### 1.3 `invoiceTotals.js`
- **Diagnóstico**: `calculateInvoiceTotals` consolida corretamente produtos, frete, seguro, outras despesas e descontos com precisão de 2 casas decimais.
- **Adaptação**: Precisa continuar sendo a autoridade de totalização para qualquer nota fiscal (seja nota de fornecedor, rascunho ou nota preparada de destino), recebendo itens que preservem sua proveniência.

---

### Eixo 2: Repositórios e Gerenciamento de Estado

#### 2.1 `invoiceRepository.js`
- **Arquitetura Atual**: Possui fila de mutação assíncrona (`withMutationLock`), clone profundo estruturado (`deepClone`) e o mapa `sessionInvoices = new Map()`.
- **Lacunas para R2 e R3**:
  1. *Filtros avançados ausentes*: O método `list(filters)` atual só filtra por `query`, `status` e `tipoDocumento`. Faltam filtros combinados por:
     - Fornecedor / Emitente (`emitenteCnpj` / `emitenteNome`)
     - Cliente de exportação atribuído (`clienteExportacao`)
     - NCM (busca em `itens[].ncm`)
     - Produto (busca em `itens[].codigo` e `itens[].descricao`)
     - Período de datas (`dataInicio`, `dataFim`)
     - Faixa de valor (`valorMin`, `valorMax`)
     - Estado de saldo (`com_saldo`, `totalmente_alocada`, `sem_alocacoes`)
  2. *Atribuição de Cliente de Exportação*: A NF-e de entrada possui `destinatario` original (geralmente a própria empresa compradora nacional). O requisito R2 exige atribuir um cliente de exportação aos documentos sem alterar o `destinatario` original do XML. É necessário suportar o campo `clienteExportacao: { id, nome, pais, paisCodigo }` e a categoria `"Sem cliente atribuído"`.
  3. *Cálculo de Saldos Disponíveis*: O repositório precisa fornecer uma consulta rápida do saldo disponível de cada item descontando as alocações ativas em preparações.

#### 2.2 `preparedInvoiceRepository.js` — **ALERTA DE VULNERABILIDADE CRÍTICA**
- **Falha Encontrada**: O arquivo `app/features/preparedInvoiceRepository.js` **NÃO possui coleção em memória de sessão**. Todas as chamadas a `create(preparedInvoice)` invocam:
  ```javascript
  const list = await getAllPrepared(); // Lê STORAGE_KEYS.PREPARED_INVOICES do localStorageService
  ...
  await saveAllPrepared(updated);      // Grava no localStorageService!
  ```
  **Consequência**: Quando o usuário divide ou prepara uma nota importada via XML real (que reside estritamente em `sessionInvoices`), a nota preparada resultante, contendo os dados fiscais reais, produtos e valores, **é gravada no `localStorage` do navegador**!
  Isso viola frontalmente a restrição do projeto e o critério de aceitação:
  > *"Dados fiscais reais e preparações com origens reais permanecem em memória temporária... sem persistir XMLs reais no localStorage."*
- **Ação Obrigatória**: Refatorar `preparedInvoiceRepository.js` para incorporar `sessionPreparedInvoices = new Map()`. Se `preparedInvoice.isRealImport === true` ou se qualquer uma das notas de origem for de sessão, armazenar exclusivamente em memória volátil.

#### 2.3 `preparationRepository.js` — **NOVO COMPONENTE ESSENCIAL**
- O repositório de preparações não existe atualmente. Ele deve ser criado para gerenciar o objeto de negócio "Preparação" (que engloba o processo $N \to M$), rascunhos (`rascunhos`), seleção de origens, configuração de destinos e a matriz de alocações.
- Deve implementar o mesmo padrão dual-storage:
  - `sessionPreparations = new Map()` para preparações que utilizem qualquer documento real.
  - `STORAGE_KEYS.PREPARATIONS` no `localStorageService` apenas para preparações exclusivamente compostas por notas de demonstração (`demo-01` a `demo-05`).

---

### Eixo 3: Requisitos do Motor Unificado de Alocação (`allocationEngine.js`)

1. **A Regra de Conservação Estrita**:
   $$\text{Quantidade Disponível}(s, i) = \text{Quantidade Original}(s, i) - \sum_{d \in \text{Destinos Ativos}} \text{Quantidade Alocada}(s, i, d)$$
   - $\text{Quantidade Alocada}(s, i, d) \ge 0$ (Alocações negativas são terminantemente bloqueadas).
   - $\sum_d \text{Quantidade Alocada}(s, i, d) \le \text{Quantidade Original}(s, i)$ (Excesso é estritamente bloqueado: `hasExcess: true`, `canSave: false`).
   - $\text{Saldo Disponível} \ge 0$ em tempo real.
2. **Preservação Absoluta da Identidade do Item (`sourceInvoiceId + sourceItemId`)**:
   - Cada linha alocada na nota de destino deve carregar indelevelmente:
     - `sourceInvoiceId`: ID da nota fiscal de origem (ex: `nfe-352411...` ou `demo-01`).
     - `sourceItemId`: ID estável do item na origem (ex: `nfe-352411...-item-1` ou `d1-1`).
     - `sourceInvoiceNumero`: Número da NF original para rastreabilidade fiscal.
     - `sourceEmitente`: Dados do fornecedor original (`razaoSocial`, `cnpj`, `uf`).
     - Metadados tributários originais (`ncm`, `cfop`, `unidade`, `tributos`).
3. **Proibição de Agrupamentos Arbitrários de Fornecedores Diferentes**:
   - Mesmo que o Fornecedor 1 e o Fornecedor 2 entreguem o mesmo produto (mesmo NCM `12019000`, mesma descrição "Soja em Grãos"), **o motor JAMAIS deve fundir ou somar essas duas linhas em uma única linha no destino**.
   - No destino, cada mercadoria permanece como uma linha distinta amarrada ao seu respectivo fornecedor de origem. Isso é exigência regulatória aduaneira para Drawback, comprovação de exportação e rastreamento de crédito presumido.
4. **Rateio Proporcional de Despesas Acessórias em $N \to M$**:
   - Para cada nota fiscal de origem $s$ que possui despesas acessórias ($F_s$ frete, $S_s$ seguro, $O_s$ outras despesas, $D_s$ descontos):
     - Calcula-se o valor total dos produtos de $s$ alocados para cada destino $d$: $V_{s, d}$.
     - Calcula-se o total de produtos de $s$ alocados na preparação: $V_s = \sum_d V_{s, d}$.
     - Se $V_s > 0$, a fatia de despesa para o destino $d$ proveniente de $s$ é:
       $$\text{Despesa}_{s, d} = \text{round}\left( \text{Despesa}_s \times \frac{V_{s, d}}{V_s}, 2 \right)$$
     - O último destino ativo que recebe mercadorias de $s$ absorve o resíduo exato de centavos de $s$.
     - O total de despesas do destino $d$ é o somatório das parcelas absorvidas de todas as suas origens:
       $$\text{TotalDespesa}_d = \sum_{s} \text{Despesa}_{s, d}$$
   - Isso garante **conservação exata ao centavo** das despesas de cada uma das $N$ notas originais sem geração espontânea ou perda de valores.

---

### Eixo 4: Estratégia de Retrocompatibilidade com `parentInvoiceId` e `/documentos/[id]/divisao`

1. **Compatibilidade com `parentInvoiceId`**:
   - No modelo legado, uma nota preparada possuía `parentInvoiceId: 'demo-05'`.
   - No modelo unificado, a nota preparada suportará múltiplas origens via array `sourceInvoiceIds: ['id1', 'id2', ...]`.
   - **Regra de Compatibilidade**:
     - Para divisões de 1 nota (ou compatibilidade legada), preencher `parentInvoiceId: sourceInvoiceIds[0]`.
     - `preparedInvoiceRepository.list(filters)` deve filtrar tanto por `p.parentInvoiceId === filters.parentInvoiceId` quanto por `p.sourceInvoiceIds?.includes(filters.parentInvoiceId)`.
     - Na visualização de `/notas-preparadas`, exibir o número de origem principal ou um badge indicando "Origem Múltipla (N notas)" com tooltip detalhando os números de origem.
2. **Compatibilidade com a Rota `/documentos/[id]/divisao`**:
   - A rota `/documentos/[id]/divisao` é o caso particular $1 \to M$ do motor unificado.
   - Refatorar internamente a chamada de validação para utilizar as funções do motor unificado (ou manter as funções utilitárias em `divisionMath.js` delegando ao motor unificado), garantindo que os 383 testes existentes continuem executando com 100% de sucesso.
   - Adicionar o preenchimento de `sourceInvoiceId` e `sourceItemId` nos itens gerados por `/documentos/[id]/divisao`.

---

### Eixo 5: Regras de Retenção Temporária em Memória e Segurança Fiscal

1. **Tríplice Isolamento de Sessão**:
   - `invoiceRepository.sessionInvoices = new Map()`
   - `preparedInvoiceRepository.sessionPreparedInvoices = new Map()`
   - `preparationRepository.sessionPreparations = new Map()`
2. **Detecção Automática de Modo Real vs Demonstração**:
   - Uma preparação ou nota preparada é marcada como `isRealImport: true` / `isDemo: false` se **pelo menos uma** de suas notas fiscais de origem for proveniente de importação real de XML.
   - Preparações reais NUNCA invocam `localStorageService.save()`.
3. **Banner Informativo de Sessão**:
   - Em `/preparacoes/nova`, `/preparacoes`, `/documentos` e `/notas-preparadas`, exibir aviso persistente caso existam dados reais em memória:
     > *"Sessão Temporária Ativa: Existem documentos fiscais reais em memória volátil. Não recarregue ou feche a aba para não perder suas alocações."*
4. **Autonomia Completa na Vercel**:
   - Nenhuma chamada para a API PHP legada (`http://localhost...` ou similar). Toda a inteligência fiscal roda no navegador via Client Components do Next.js 16 com React 19.

---

## 4. Estruturas de Dados e Interfaces Propostas

### 4.1 Modelo da Preparação (`Preparation`)
```javascript
{
  id: "prep-20261113-a8f2",
  numero: "PREP-0001",
  titulo: "Preparação Exportação Lote Soja/Milho Holanda",
  tipo: "mista", // "agrupamento" (N->1) | "divisao" (1->M) | "mista" (N->M)
  status: "rascunho", // "rascunho" | "concluida" | "cancelada"
  isRealImport: false, // true se alguma origem for real
  isDemo: true,
  clienteExportacao: {
    id: "cli-exp-01",
    nome: "Global Trading Logistics B.V.",
    pais: "Holanda",
    paisCodigo: "NL"
  },
  origens: [
    {
      invoiceId: "demo-01",
      numero: "000.145.892",
      emitente: { razaoSocial: "Agroexport Brasil S.A.", cnpj: "12.345.678/0001-90" },
      totais: { ... }
    },
    {
      invoiceId: "demo-05",
      numero: "000.205.670",
      emitente: { razaoSocial: "Cooperativa Agroindustrial Centro-Oeste", cnpj: "44.555.666/0001-33" },
      totais: { ... }
    }
  ],
  destinos: [
    {
      id: "dest-1",
      numero: "EXP-2026-001-A",
      nome: "Lote Principal Rotterdam",
      destinatario: { nome: "Global Trading Logistics B.V.", pais: "Holanda", paisCodigo: "NL" },
      observacoes: ""
    },
    {
      id: "dest-2",
      numero: "EXP-2026-001-B",
      nome: "Lote Secundário Amsterdã",
      destinatario: { nome: "Global Trading Logistics B.V.", pais: "Holanda", paisCodigo: "NL" },
      observacoes: ""
    }
  ],
  alocacoes: {
    // Chave: `${sourceInvoiceId}__${sourceItemId}__${destinationId}`
    "demo-01__d1-1__dest-1": "300.0000",
    "demo-01__d1-1__dest-2": "200.0000",
    "demo-05__d5-1__dest-1": "1000.0000"
  },
  totais: {
    totalItensOrigem: 23,
    totalItensAlocados: 3,
    quantidadeTotalAlocada: "1500.0000",
    valorTotalProdutos: "182750.00",
    valorTotalPreparacao: "185350.00"
  },
  criadoEm: "2026-11-13T13:30:00.000Z",
  atualizadoEm: "2026-11-13T13:30:00.000Z"
}
```

### 4.2 Modelo de Item de Nota Preparada de Destino (`PreparedInvoiceItem`)
```javascript
{
  id: "dest-1-item-1",
  item: 1,
  // Rastreabilidade estrita de proveniência
  sourceInvoiceId: "demo-01",
  sourceItemId: "d1-1",
  sourceInvoiceNumero: "000.145.892",
  sourceEmitente: {
    razaoSocial: "Agroexport Brasil S.A.",
    cnpj: "12.345.678/0001-90",
    uf: "SP"
  },
  // Dados fiscais do produto herdados
  codigo: "EXP-CAF-001",
  cEAN: "SEM GTIN",
  descricao: "Café em Grão Cru Arábica Tipo 6",
  ncm: "09011110",
  cfop: "7101",
  unidade: "SC",
  quantidade: "300.0000",
  valorUnitario: "25.5000",
  valorTotal: "7650.00",
  tributos: { ... }
}
```

### 4.3 Interface do Motor Unificado de Alocação (`app/lib/calculations/allocationEngine.js`)
```javascript
/**
 * Calcula balanços de alocação em tempo real para qualquer configuração N -> M
 * @param {Array<Object>} sourceInvoices - Lista completa de N notas fiscais de origem com seus itens
 * @param {Array<Object>} destinations - Lista de M notas de destino configuradas
 * @param {Object|Array} allocations - Matriz ou mapa de alocações efetuadas
 * @returns {AllocationAuditReport} Relatório com diagnósticos, saldos por item, resumos por destino e travas
 */
export function calculateUnifiedAllocationBalances(sourceInvoices, destinations, allocations);

/**
 * Rateia proporcionalmente as despesas acessórias de todas as N origens para os M destinos
 * @param {Array<Object>} sourceInvoices - Notas fiscais de origem com totais
 * @param {Array<Object>} destinations - Notas de destino
 * @param {Object} allocations - Matriz de alocações
 * @returns {Record<string, DestinationExpenses>} Despesas consolidadas por destino
 */
export function apportionMultiSourceExpenses(sourceInvoices, destinations, allocations);

/**
 * Valida se um lote de preparação atende a todos os critérios fiscais e de conservação
 * @returns {{ canSave: boolean, canFinalize: boolean, errors: Array<string>, warnings: Array<string> }}
 */
export function validatePreparationState(sourceInvoices, destinations, allocations, options);
```

---

## 5. Itens Concretos de Feature para o `PROJECT.md`

Para inclusão na tabela de *Feature Inventory* e marcos do `PROJECT.md`, propõem-se os seguintes itens numerados:

| # | Feature | Descrição Detalhada | Marco | Requisito Origem |
|---|---|---|---|---|
| **23** | **BigInt Decimal Vector & Scaling Math** | Expansão de `app/lib/calculations/decimal.js` com somas vetoriais sem perda de precisão, `decimalMin/Max`, `isDecimalPositive`, e divisão proporcional com absorção exata de restos. Zero bibliotecas de terceiros. | M_ENGINE | R4 |
| **24** | **Unified Allocation Engine (N $\to$ M)** | Criação do motor unificado (`allocationEngine.js` e evolução de `divisionMath.js`) capaz de processar agrupamentos (N $\to$ 1), divisões (1 $\to$ M) e matrizes mistas (N $\to$ M) sob a regra estrita de conservação decimal ($disponível = original - soma$). | M_ENGINE | R4 |
| **25** | **Item Identity Preservation & Provenance Guard** | Preservação mandatória de `sourceInvoiceId`, `sourceItemId`, `sourceInvoiceNumero` e fornecedor original em cada item alocado, impedindo terminantemente a fusão ou agrupamento de itens de fornecedores distintos. | M_ENGINE | R4, R3 |
| **26** | **Multi-Source Ancillary Expense Apportionment** | Algoritmo de rateio proporcional de frete, seguro, despesas e descontos por nota de origem para cada nota de destino proporcional ao valor de produtos alocado de cada fornecedor, com conservação exata de centavos. | M_ENGINE | R4 |
| **27** | **Preparation Repository (`preparationRepository.js`)** | Repositório assíncrono para gerenciar o ciclo de vida completo de preparações e rascunhos, controle de alocações ativas em tempo real e deduplicação de saldos. | M_REPO | R4, R3 |
| **28** | **Prepared Invoice Repository Session Isolation** | Correção da vulnerabilidade de vazamento fiscal em `preparedInvoiceRepository.js` com criação de `sessionPreparedInvoices = new Map()`, impedindo que preparações de XMLs reais sejam gravadas em LocalStorage. | M_REPO | R4, R5 |
| **29** | **Invoice Repository Advanced Filtering & Client Tagging** | Evolução de `invoiceRepository.js` com busca com debounce, filtros combináveis (cliente exportação, fornecedor, NCM, produto, datas, valores, saldos) e atribuição de cliente de exportação sem alteração do destinatário original. | M_REPO | R2 |
| **30** | **Backward Compatibility Bridge (divisao & parentInvoiceId)** | Garantia de operação contínua e transparente de `/documentos/[id]/divisao` e consultas por `parentInvoiceId` utilizando internamente o motor unificado de alocação, mantendo 100% dos testes existentes íntegros. | M_REPO | R4 |
| **31** | **In-Memory Retention Banners & Session Alerts** | Indicadores visuais explícitos de sessão volátil nas telas de preparação e listagem quando houver documentos reais importados, com alerta de descarte por recarga. | M_UI | R3, R5 |
| **32** | **Synthetic XML Fixtures & Multi-Scenario Test Harness** | Fixtures sintéticas de teste cobrindo 2$\to$1 até 50$\to$5, fornecedores múltiplos, produtos homônimos e incompatibilidade de unidades, integrados à suíte `tests/`. | M_TESTS | R5 |

---

## 6. Próximos Passos Recomendados para a Coordenação
1. **Atualizar `PROJECT.md`** incorporando os itens de feature 23 a 32 e os contratos de interface do motor unificado.
2. **Priorizar no Roadmap**:
   - Fase 1: Motor Unificado de Alocação (`allocationEngine.js`) + Correção do vazamento de sessão em `preparedInvoiceRepository.js`.
   - Fase 2: Criação do `preparationRepository.js` + Evolução dos filtros em `invoiceRepository.js`.
   - Fase 3: Telas de Nova Preparação (`/preparacoes/nova`) e Gerenciamento (`/preparacoes`), e adaptação de `/documentos/[id]/divisao`.
