# Relatório de Exploração Técnica e Blueprints E2E — SmartNFe (E2E Testing Track)

**Agente**: `e2e_explorer_2` (teamwork_explorer)  
**Data**: 2026-11-13  
**Working Directory**: `c:\www\smart-nfe`  
**State Folder**: `c:\www\smart-nfe\.agents\teamwork\e2e_explorer_2\`  
**Branch de Trabalho**: `feature/preparacoes-unificadas`  
**Destinatário**: `sub_orch_e2e` (`b46dc906-80ec-4470-92da-f6c8e7476b34`)

---

## 1. Observation

### 1.1 Test Runner, Framework e Asserções
- **Comando oficial de testes** (`package.json`, linha 10):
  ```json
  "test": "node --no-warnings --test tests/**/*.test.mjs"
  ```
- **Execução observada do baseline**:
  - Comando: `npm test`
  - Resultado: **104 suites, 383 testes, 383 passando, 0 falhas**, duração de **7.62s**.
- **Convenção de Asserções e Módulos de Teste**:
  - Test Runner: Módulo nativo `node:test` (`describe`, `it`, `beforeEach`).
  - Asserções: Módulo nativo `node:assert/strict` (`assert.strictEqual`, `assert.deepStrictEqual`, `assert.ok`, `assert.throws`, `assert.rejects`).
  - Tipagem e formato de arquivo: ECMAScript Modules nativos com terminação `.test.mjs`.
  - Dependências externas de teste no `package.json`: **Zero** (sem Jest, Vitest, Mocha, Chai, jsdom).

### 1.2 Mecanismo de Parsing de XML e Estrutura dos Documentos Fiscais
- **Arquivos investigados**:
  - `app/features/xml/nfeXmlParser.js` (740 linhas)
  - `app/features/xml/accessKeyValidator.js` (190 linhas)
  - `app/features/xml/xmlToInvoiceMapper.js` (336 linhas)
  - `app/features/xml/index.js` (7 linhas)
- **Implementação do DOMParser**:
  - No navegador: utiliza `window.DOMParser` com mimeType `'application/xml'`.
  - No Node.js (execução de testes): fallback embutido via classe `NodeXmlDomParser` (linhas 105-199 de `nfeXmlParser.js`) com `MiniDocument` e `MiniElement`. Suporta `getElementsByTagName`, `getElementsByTagNameNS`, `getAttribute`, `textContent`, com imunidade total a namespaces SEFAZ (`xmlns="http://www.portalfiscal.inf.br/nfe"`) e prefixos (ex: `<nfe:NFe>`).
- **Validação de Chave de Acesso (Módulo 11)**:
  - 44 dígitos numéricos, modelo 55 na posição 20-22 (`cleanKey.slice(20, 22)`).
  - Pesos 2 a 9 da direita para a esquerda. Resto da divisão por 11. Se resto for 0 ou 1, DV = 0; senão DV = 11 - resto.
- **Contrato de Saída do Invoice Normalizado** (`mapXmlToInvoice` em `xmlToInvoiceMapper.js`, linhas 307-336):
  ```js
  {
    id: `nfe-${chaveAcesso}`,                    // ex: 'nfe-35241112345678000190550010001458921001234562'
    numero: '000.145.892',                       // formatado com 9 dígitos e separadores
    serie: '1',
    chaveAcesso: '35241112345678000190550010001458921001234562',
    tipoDocumento: 'XML',
    naturezaOperacao: 'VENDA DE MERCADORIAS',
    emissao: '2024-11-01',
    dataEmissao: '2024-11-01T10:30:00-03:00',
    status: 'importado',
    isDemo: false,                               // Identifica documento real
    isRealImport: true,                          // Roteamento exclusivo para sessionInvoices
    emitente: {
      cnpj: '12.345.678/0001-90',
      razaoSocial: 'Agroexport Brasil S.A.',
      nomeFantasia: 'Agroexport',
      inscricaoEstadual: '123456789',
      uf: 'SP',
      municipio: 'Santos',
    },
    destinatario: {
      nome: 'Rotterdam Grain Logistics B.V.',
      cnpj: '',
      idEstrangeiro: 'NL884920192B01',
      pais: 'Holanda',
      paisCodigo: 'NL',
      uf: 'EX',
      municipio: 'Rotterdam',
    },
    itens: [
      {
        id: `nfe-${chaveAcesso}-item-1`,         // Identificador determinístico estável
        item: 1,
        codigo: 'EXP-CAF-001',
        cEAN: 'SEM GTIN',
        descricao: 'Café em Grão Cru Arábica Tipo 6',
        ncm: '09011110',
        cfop: '7101',
        unidade: 'SC',
        quantidade: '500.0000',                 // Escala 4 para quantidades fiscais
        valorUnitario: '25.5000',               // Escala 4 a 10 para preços unitários
        valorTotal: '12750.00',                 // Escala 2 para valores monetários
        valorFrete: '250.00',
        valorSeguro: '50.00',
        valorDesconto: '0.00',
        outrasDespesas: '0.00',
        situacao: 'pendente',
        modificado: false,
        valorOriginal: null,
        inconsistencias: [],
        tributos: {
          icms: { cst: '40', vBC: '0.00', pICMS: '0.00', vICMS: '0.00' },
          ipi: { cst: '53', vBC: '0.00', pIPI: '0.00', vIPI: '0.00' },
          pis: { cst: '08', vBC: '0.00', pPIS: '0.00', vPIS: '0.00' },
          cofins: { cst: '08', vBC: '0.00', pCOFINS: '0.00', vCOFINS: '0.00' },
        },
      },
    ],
    totais: {
      valorProdutos: '12750.00',
      valorFrete: '250.00',
      valorSeguro: '50.00',
      valorDesconto: '0.00',
      outrasDespesas: '0.00',
      valorTotalNota: '13050.00',
      pesoLiquido: '30000.000',
      pesoBruto: '30150.000',
    },
    protocolo: {
      numero: '135240001234567',
      dataAutorizacao: '2024-11-01T10:31:00-03:00',
      status: '100',
      motivo: 'Autorizado o uso da NF-e',
    },
    criadoEm: '2026-11-13T...',
    atualizadoEm: '2026-11-13T...',
  }
  ```

### 1.3 Módulos de Cálculo e Aritmética BigInt
- **`app/lib/calculations/decimal.js`**:
  - Operações aritméticas nativas `BigInt` sem ponto flutuante:
    - `cleanDecimalString(input)`
    - `parseDecimal(val)` -> `{ sign: 1n|-1n, intVal: bigint, scale: number }`
    - `formatBigInt(sign, absVal, scale)`
    - `decimalAdd(a, b, scale = null)`
    - `decimalSubtract(a, b, scale = null)`
    - `decimalMultiply(a, b, scale = null)`
    - `decimalDivide(a, b, scale = 2)` (arredondamento Half-Up ABNT NBR 5891 exato via `rem * 2n >= divisor`)
    - `roundDecimal(val, scale = 2)`
    - `decimalCompare(a, b)` -> `-1 | 0 | 1`
    - `isDecimalZero(val)` -> `boolean`
    - `isDecimalNegative(val)` -> `boolean`
    - `decimalAbs(val)` -> `string`
    - `normalizeDecimal(val, scale = 2)` -> `string`
  - Extensões adicionadas no Milestone 1 (`git diff` observado na branch):
    - `formatDecimal(val, scale = 2)`
    - `isDecimalPositive(val)` -> `boolean`
    - `decimalSum(array, targetScale = 2)` -> somatório vetorial em BigInt sem arredondamento prematuro
    - `decimalMin(a, b, ...rest)`
    - `decimalMax(a, b, ...rest)`
- **`app/lib/calculations/invoiceTotals.js`**:
  - `calculateItemTotal(unitPriceStr, quantityStr)` -> string (escala 2).
  - `calculateInvoiceTotals(items, discountOrOptions, freightStr, insuranceStr, otherExpensesStr)`:
    - Fórmula autoritativa SEFAZ: $\text{Total NF} = \text{Produtos} - \text{Desconto} + \text{Frete} + \text{Seguro} + \text{Outras Despesas}$.
    - Retorna objeto com chaves duplas para interoperabilidade (`totalProducts`/`valorProdutos`, `totalFreight`/`valorFrete`, `totalInvoice`/`valorTotalNota`).
- **`app/lib/calculations/divisionMath.js`**:
  - `calculateRemainingBalance(originalQtyStr, allocatedQtyArray)` -> `{ balanceStr, status: 'ok'|'remaining'|'excess', totalAllocatedStr, isOk, hasRemaining, hasExcess, hasNegative }`.
  - `validateDivisionBatch(originalItems, destinationNotes)` -> `{ isValid, canSave, hasExcess, hasRemaining, isBalanced, summary, itemReports, notesSummary }`.
  - `distributeEqually(originalQtyStr, numNotes, scale = 4)` -> array com conservação estrita (divisão inteira BigInt + absorção do resto na última nota).
  - `distributeRemainingEqually(originalQtyStr, currentAllocations, scale = 4)` -> array de novas alocações.
  - `apportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr)` -> string.
  - `apportionAllInvoiceExpenses(parentTotals, notesWithProducts)` -> rateio com absorção de resíduos de centavos no último lote.
- **`app/lib/calculations/allocationEngine.js`** (Contrato da Feature 4 / Milestone 1):
  - `calculateAllocationMatrix(sourceItems, destinationNotes, activeAllocations)`:
    - Chave composta de alocação: `${sourceInvoiceId}__${sourceItemId}`.
    - Matriz de cálculo multi-origem $N \to M$.
    - Retorna `{ matrix, sourceBalances, canSave, totals }`.
    - Regra de conservação: $\text{saldoDisponivel} = \text{original} - \text{alocações de outras preparações ativas} - \sum \text{alocações na preparação atual}$.
    - Bloqueio imediato (`canSave: false`) se houver qualquer saldo negativo ou excesso.
  - `checkUnitCompatibility(itemA, itemB)`: verifica compatibilidade de unidades de medida (ex: `SC` vs `SC` ok, `SC` vs `KG` incompatível sem fator de conversão).
  - `apportionMultiSourceExpenses(sourceInvoicesWithTotals, destinationNotesWithAllocations)`: rateia despesas acessórias de cada nota de origem separadamente entre os destinos que contêm mercadorias daquela origem.

### 1.4 Repositórios e Tríplice Isolamento de Sessão em Memória
- **`app/features/invoiceRepository.js`**:
  - Memória volátil: `export const sessionInvoices = new Map()`.
  - Métodos: `list(filters)`, `findById(id)`, `create(invoiceData)`, `update(id, partialData)`, `updateItem(invoiceId, itemId, partialItemData)`, `delete(id)`, `clearSession()`, `getSessionCount()`, `isSessionInvoice(id)`.
  - Regra de isolamento: Se `invoiceData.isRealImport === true || invoiceData.isDemo === false`, o registro é gravado única e exclusivamente em `sessionInvoices`. `saveAllInvoices` (localStorage) JAMAIS é acionado para documentos reais.
- **`app/features/preparedInvoiceRepository.js`**:
  - Contrato corrigido para M1: introdução de `export const sessionPreparedInvoices = new Map()`. Se a nota preparada contiver qualquer origem real (`isRealImport: true` ou `sourceInvoiceIds` em `sessionInvoices`), gravação restrita à memória de sessão volátil.
  - Métodos: `list(filters)`, `findById(id)`, `create(preparedInvoice)`, `update(id, partialData)`, `delete(id)`, `resetDemoData()`.
- **`app/features/preparationRepository.js`**:
  - Repositório de preparações $N \to M$ e rascunhos.
  - Tríplice isolamento: `export const sessionPreparations = new Map()` para preparações que utilizam documentos reais; persistência em `localStorageService` (chave `smartnfe_preparations`) apenas para demonstrações.
  - Métodos: `create(preparationData)`, `update(id, partialData)`, `findById(id)`, `list({ status, type })`, `delete(id)`, `getActiveAllocations(excludePreparationId)`.

### 1.5 Left Drawer e Contratos de Layout em `AppContext.jsx`
- **Chave de armazenamento**: `smartnfe_sidebar_collapsed` (`'true'` ou `'false'`).
- **Estados expostos em `AppContext`**:
  - `sidebarCollapsed`: booleano indicando se a barra lateral desktop está recolhida.
  - `setSidebarCollapsed(bool | updater)`: mutador com persistência automática no `localStorage`.
  - `toggleSidebar()`: inverte `sidebarCollapsed`.
  - `mobileDrawerOpen`: booleano indicando abertura do drawer deslizante mobile.
  - `setMobileDrawerOpen(bool)`
  - `toggleMobileDrawer(bool?)`
  - `closeMobileDrawer()`
  - `isLgScreen`: booleano (`window.innerWidth > 1024`).
- **Garantia de Hidratação Segura (React 19 SSR)**:
  - Na renderização inicial do servidor (SSR), `mounted` retorna `false` via `useSyncExternalStore(emptySubscribe, () => true, () => false)`.
  - O valor inicial de `sidebarCollapsed` em SSR é `false`.
  - No cliente, dentro do hook pós-montagem `useEffect`:
    1. Se existir `localStorage.getItem('smartnfe_sidebar_collapsed')`, carrega a preferência do usuário.
    2. Se NÃO existir preferência gravada: se a tela for $> 1024\text{px}$, permanece expandido (`false`); se for $\le 1024\text{px}$ (breakpoint `lg`), inicia recolhido (`true`).
  - Resultado: **Zero hydration mismatch** entre SSR e client.
- **Breakpoint e Comportamento Responsivo**:
  - Telas $> 1024\text{px}$ (Desktop): Sidebar inline (`w-60` expandido, `w-14` recolhido). Botão hambúrguer no cabeçalho fica oculto (`lg:hidden`).
  - Telas $\le 1024\text{px}$ (Mobile/Tablet): Sidebar inline oculta (`hidden lg:flex`). Botão hambúrguer acessível visível no header (`lg:hidden`). Drawer opera em slide-over overlay com `role="dialog"`, `aria-modal="true"`, backdrop com clique para fechar, botão de fechar explícito e interceptor de tecla Escape com `e.preventDefault()`.

---

## 2. Logic Chain

1. **Premissa de Execução Limpa**: Os testes de integração devem executar de forma opaca via `node --no-warnings --test tests/integration/**/*.test.mjs`, sem depender de servidor web ligado ou navegador headless, assegurando compatibilidade com CI/CD e execução ultra-rápida.
2. **Derivação de Ambiente**: Como `localStorageService.js` já possui fallback transparente para `MemoryStorage` em ambiente Node.js e `nfeXmlParser.js` possui fallback embutido para `NodeXmlDomParser`, toda a suíte de integração pode instanciar as funções de domínio, repositórios e validadores diretamente em Node.js com isolamento estrito por teste (`beforeEach`).
3. **Derivação de Isolamento Fiscal**: Documentos reais importados (`isRealImport: true`) residem estritamente em `sessionInvoices = new Map()`, notas preparadas derivadas em `sessionPreparedInvoices = new Map()` e preparações em `sessionPreparations = new Map()`. Para verificar o critério de privacidade fiscal, os testes de integração do Fluxo B, E e F devem assertar diretamente que `localStorageService.load(STORAGE_KEYS.INVOICES)` e `STORAGE_KEYS.PREPARED_INVOICES` não contêm os dados reais.
4. **Derivação dos Cenários $N \to M$**:
   - Agrupamento ($N \to 1$): $N$ notas fiscais alocadas em 1 destino de exportação. Os itens de origens diferentes mantêm chaves distintas `${sourceInvoiceId}__${sourceItemId}`.
   - Divisão ($1 \to M$): 1 nota dividida em $M$ destinos. Retrocompatível com `divisionMath.js` e `/documentos/[id]/divisao`.
   - Misto ($N \to M$): $N$ notas distribuídas em $M$ destinos com sobras parciais preservadas. O motor valida conservação estrita e saldo remanescente em tempo real.
5. **Derivação das Fixtures Paramétricas**: O gerador sintético `tests/fixtures/xmlFixtureGenerator.mjs` deve produzir XMLs em conformidade exata com NF-e 4.00, com chave de 44 dígitos e dígito verificador Módulo 11 matematicamente válido, viabilizando testes unitários, combinatórios e o teste de estresse de escala 50 notas $\to$ 5 contêineres.

---

## 3. Caveats

1. **Ambiente DOM em Testes de Componentes JSX**: O Node.js puro não possui `window` nem `document` nativos. Para testar o comportamento do Left Drawer (`flow_a_drawer_layout.test.mjs`), os testes devem exercitar os contratos de estado, hooks, lógicas de persistência em `localStorageService` e regras de breakpoint através de emulação limpa de eventos (`CustomEvent`, `keydown` de Escape) ou focar na máquina de estados de `AppContext` e nas funções de cálculo/layout, sem tentar renderizar JSX com React DOM sem um runner DOM.
2. **Concorrência de Arquivos em Execução Paralela**: O runner `node:test` pode executar arquivos em paralelo. Para garantir isolamento de estado, cada suite de integração deve invocar `invoiceRepository.clearSession()`, `localStorageService.clearAll()` e resetar mapas em blocos `beforeEach`.
3. **Implementações em Andamento**: Os arquivos `allocationEngine.js` e `preparationRepository.js` estão sendo finalizados pela equipe de Milestone 1. Os blueprints de teste elaborados abaixo são baseados estritamente nos contratos autoritativos firmados em `PROJECT.md` e `SCOPE.md`.

---

## 4. Conclusion

A base técnica do SmartNFe está perfeitamente alinhada para suportar a suíte completa de testes de integração com o runner nativo do Node.js (`node:test` e `node:assert/strict`).

As 6 suítes de integração a serem implementadas no diretório `tests/integration/` são:
1. `flow_a_drawer_layout.test.mjs` (R1: Persistência do drawer, hidratação segura, overlay mobile, tecla Escape).
2. `flow_b_multi_xml_import.test.mjs` (R2: Upload em lote, pool de concorrência 3, detecção de duplicatas por chave, isolamento de sessão).
3. `flow_c_documents_filters.test.mjs` (R2: Busca com debounce, 8 filtros combináveis, agrupamento visual, seleção persistente entre páginas, cliente atribuído).
4. `flow_d_allocation_engine.test.mjs` (R4: Aritmética decimal BigInt, conservação estrita, bloqueio de excessos, rateio de despesas acessórias, compatibilidade de unidades).
5. `flow_e_preparation_n_to_m.test.mjs` (R3: Workflows $N \to 1$, $1 \to M$ e $N \to M$, preservação de origem `sourceInvoiceId + sourceItemId`, repositório e rascunhos em memória).
6. `flow_f_scale_50_invoices.test.mjs` (R5: Teste de estresse de 50 notas fiscais para 5 destinos, estabilidade de memória e conservação ao centavo).

---

## 5. Blueprints de Integração

Abaixo estão os blueprints de implementação detalhados e prontos para orientar a escrita dos testes em `tests/integration/`.

```javascript
// ============================================================================
// BLUEPRINT 1: tests/integration/flow_a_drawer_layout.test.mjs
// ============================================================================
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Fluxo A — Left Drawer, Persistência e Layout Responsivo (R1)', () => {
  beforeEach(() => {
    // Reset de armazenamento e variáveis de viewport
  });

  describe('Tier 1: Persistência Desktop em smartnfe_sidebar_collapsed', () => {
    it('Persiste a escolha do usuário como "true" quando o drawer é recolhido', () => {
      // Simula toggle e verifica gravação de 'true' em localStorage
    });
    it('Persiste a escolha do usuário como "false" quando o drawer é expandido', () => {
      // Simula toggle e verifica gravação de 'false' em localStorage
    });
    it('Mantém o estado entre múltiplas navegações sem resetar para o padrão', () => {
      // Verifica persistência de leitura entre montagens
    });
    it('Permite sincronização síncrona/reativa via helper toggleSidebar', () => {
      // Testa alternância de estado de colapso
    });
    it('Não lança exceção caso localStorage esteja inacessível ou quota cheia', () => {
      // Fallback gracioso
    });
  });

  describe('Tier 2: Hidratação Segura (React 19 SSR Safe) e Breakpoints', () => {
    it('Em telas > 1024px sem preferência salva, adota expandido por padrão (sidebarCollapsed: false)', () => {
      // Viewport desktop padrão
    });
    it('Em telas <= 1024px (breakpoint LG), inicia recolhido por padrão (sidebarCollapsed: true)', () => {
      // Viewport mobile/tablet padrão
    });
    it('Garante renderização inicial idêntica no SSR para eliminar hydration mismatch', () => {
      // useSyncExternalStore padrão snapshot server false
    });
    it('Preferência explícita do usuário em localStorage sobrepõe o padrão do viewport', () => {
      // Usuário desktop que preferiu recolhido mantém recolhido
    });
    it('Transição dinâmica de resize atualiza isLgScreen e fecha drawer móvel se expandir para desktop', () => {
      // Evento de resize fechando mobileDrawerOpen
    });
  });

  describe('Tier 3: Drawer Móvel em Overlay (<= 1024px) e Tecla Escape', () => {
    it('Abertura do drawer móvel altera mobileDrawerOpen para true sem alterar sidebarCollapsed desktop', () => {
      // Segregação entre mobileDrawerOpen e sidebarCollapsed
    });
    it('Pressionar a tecla Escape com mobileDrawerOpen ativo aciona closeMobileDrawer e e.preventDefault()', () => {
      // Escape interceptado com preventDefault para proteger ScreenTourTip
    });
    it('Clique no backdrop fecha o drawer móvel', () => {
      // Fechamento por backdrop
    });
    it('Botão de fechar (faXmark) possui aria-label acessível e fecha o drawer', () => {
      // Acessibilidade do close button
    });
    it('Navegação para nova rota fecha automaticamente o drawer móvel', () => {
      // Auto-close na seleção de item de menu
    });
  });

  describe('Tier 4: Coexistência com ScreenTourTip e Edição de Tabelas', () => {
    it('Mobile drawer com role="dialog" e aria-modal="true" impede fechamento acidental de ScreenTourTip', () => {
      // Guardian modal check em ScreenTourTip
    });
    it('Pressionar Escape durante edição de célula na conferência cancela a edição sem fechar o drawer', () => {
      // Cell editing consome Escape primeiro
    });
  });
});
```

```javascript
// ============================================================================
// BLUEPRINT 2: tests/integration/flow_b_multi_xml_import.test.mjs
// ============================================================================
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Fluxo B — Upload Múltiplo de XML e Fila de Lotes (R2)', () => {
  beforeEach(() => {
    // invoiceRepository.clearSession()
  });

  describe('Tier 1: Concorrência Limitada (Pool = 3) e Progresso', () => {
    it('Enfileira lote de múltiplos XMLs e processa com concorrência máxima de 3 workers', async () => {
      // Simula pool de concorrência com 10 arquivos
    });
    it('Calcula progresso individual por arquivo (0% -> 50% -> 100% / erro)', async () => {
      // Validação de callbacks de progresso por arquivo
    });
    it('Calcula progresso global do lote proporcionalmente ao total de arquivos processados', async () => {
      // Progresso consolidado
    });
    it('Yield de event-loop entre lotes garante que a thread principal não congele', async () => {
      // setTimeout(0) yield
    });
    it('Mecanismo de repetição (retry) reprocessa apenas os arquivos que falharam no lote', async () => {
      // Retry de arquivos com erro sintático após correção
    });
  });

  describe('Tier 2: Detecção Estrita de Chaves de Acesso Duplicadas', () => {
    it('Detecta duplicidade de chave de 44 dígitos dentro do mesmo lote de upload', async () => {
      // Rejeição ou alerta de arquivo duplicado no lote
    });
    it('Detecta duplicidade contra notas já importadas na sessão ativa de memória', async () => {
      // Conflito com chave existente em sessionInvoices
    });
    it('Permite reimportação com confirmação ou descarte da nota anterior', async () => {
      // Política de substituição explícita
    });
  });

  describe('Tier 3: Isolamento de Sessão e Privacidade Fiscal', () => {
    it('XMLs reais importados residem 100% em sessionInvoices sem qualquer gravação no localStorage', async () => {
      // Asserção estrita de zero vazamento no storage
    });
    it('Notas de demonstração persistem normalmente no storage sem contaminação por notas reais', async () => {
      // Dual-storage intacto
    });
  });
});
```

```javascript
// ============================================================================
// BLUEPRINT 3: tests/integration/flow_c_documents_filters.test.mjs
// ============================================================================
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Fluxo C — Busca Debounced, Filtros Combináveis e Seleção Estável (R2)', () => {
  describe('Tier 1: Busca Multi-Campo com Debounce de 300ms', () => {
    it('Filtra documentos por número de nota fiscal', async () => {});
    it('Filtra documentos por razão social do emitente', async () => {});
    it('Filtra documentos por chave de acesso de 44 dígitos', async () => {});
    it('Filtra documentos por código ou descrição de produtos internos', async () => {});
    it('Debounce de 300ms descarta buscas intermediárias e executa apenas a consulta final', async () => {});
  });

  describe('Tier 2: Filtros Combináveis em 8 Facetas', () => {
    it('Combina filtro de Fornecedor + Faixa de Valor sem perda de precisão', async () => {});
    it('Combina filtro de NCM + Estado de Saldo (com saldo disponível)', async () => {});
    it('Filtra por Cliente de Exportação Atribuído (incluindo "Sem cliente atribuído")', async () => {});
    it('Atribuição de cliente exportação não altera o destinatário original do XML SEFAZ', async () => {});
  });

  describe('Tier 3: Agrupamento Visual e Seleção Estável de Documentos', () => {
    it('Agrupa visualmente documentos por Fornecedor exibindo subtotais e contadores', async () => {});
    it('Agrupa visualmente documentos por Cliente de Exportação Atribuído', async () => {});
    it('Seleção de documentos permanece estável ao alternar paginação, ordenação e filtros', async () => {});
    it('Barra flutuante de ações exibe contadores exatos: notas, itens, fornecedores e valor total BigInt', async () => {});
  });
});
```

```javascript
// ============================================================================
// BLUEPRINT 4: tests/integration/flow_d_allocation_engine.test.mjs
// ============================================================================
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Fluxo D — Motor Unificado de Alocação e Aritmética BigInt (R4)', () => {
  describe('Tier 1: Precisão Decimal BigInt e Eliminação do IEEE-754', () => {
    it('decimalSum consolida somas vetoriais sem desvios de ponto flutuante binário', () => {});
    it('decimalMultiply com quantidades fiscais (escala 4) e preços (escala 4..10) aplica Half-Up NBR 5891', () => {});
    it('decimalDivide garante arredondamento no teste exato do resto (rem * 2n >= divisor)', () => {});
  });

  describe('Tier 2: Regra de Conservação e Bloqueio de Excesso', () => {
    it('Conservação: disponível = original - alocações ativas em tempo real', () => {});
    it('Bloqueio estrito: qualquer alocação superior ao saldo disponível define canSave: false e hasExcess: true', () => {});
    it('Alocações negativas são terminantemente rejeitadas como excesso/inválidas', () => {});
    it('checkUnitCompatibility valida estritamente a compatibilidade entre unidades (ex: SC vs KG falha)', () => {});
  });

  describe('Tier 3: Rateio Multi-Origem de Despesas Acessórias ao Centavo', () => {
    it('Rateia frete, seguro e outras despesas de N origens distintas proporcionalmente para M destinos', () => {});
    it('A última nota de destino que recebe itens de uma origem absorve o resíduo exato de centavos dessa origem', () => {});
    it('Soma das despesas rateadas entre os destinos é identicamente igual à soma das despesas das origens', () => {});
  });

  describe('Tier 4: Retrocompatibilidade com parentInvoiceId e Divisão Legada', () => {
    it('Mantém 100% de compatibilidade com divisionMath.js e a rota /documentos/[id]/divisao', () => {});
    it('Preenche parentInvoiceId derivado de sourceInvoiceIds[0] para notas preparadas de origem única', () => {});
  });
});
```

```javascript
// ============================================================================
// BLUEPRINT 5: tests/integration/flow_e_preparation_n_to_m.test.mjs
// ============================================================================
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Fluxo E — Preparação N:M, Rascunhos e Preservação de Origem (R3)', () => {
  describe('Tier 1: Preservação da Identidade do Item (sourceInvoiceId + sourceItemId)', () => {
    it('Itens alocados no destino preservam sourceInvoiceId, sourceItemId e metadados do fornecedor', async () => {});
    it('Não agrupa automaticamente produtos idênticos de fornecedores distintos em uma única linha', async () => {});
    it('Gera chave composta única `${sourceInvoiceId}__${sourceItemId}` no mapa de alocações', async () => {});
  });

  describe('Tier 2: Workflows de Agrupamento (N -> 1) e Divisão (1 -> M)', () => {
    it('Agrupa N notas fiscais de diferentes fornecedores em 1 nota de exportação de destino', async () => {});
    it('Divide 1 nota fiscal de origem em M notas de exportação com alocação total de saldo', async () => {});
  });

  describe('Tier 3: Workflow Misto (N -> M) e Gestão de Rascunhos', () => {
    it('Permite alocação mista de N notas para M destinos com sobras parciais remanescentes', async () => {});
    it('Salva rascunho de preparação preservando matriz incompleta para retomada posterior', async () => {});
    it('Preparações contendo XMLs reais residem estritamente em sessionPreparations (memória volátil)', async () => {});
    it('Exibe aviso explícito de retenção temporária e perda de sessão em caso de reload', async () => {});
  });
});
```

```javascript
// ============================================================================
// BLUEPRINT 6: tests/integration/flow_f_scale_50_invoices.test.mjs
// ============================================================================
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Fluxo F — Teste de Estresse em Escala: 50 Notas -> 5 Destinos (R5)', () => {
  it('Gera 50 XMLs válidos com 10 fornecedores e 200+ itens via xmlFixtureGenerator.mjs', async () => {
    // Geração paramétrica de 50 fixtures
  });

  it('Importa o lote de 50 XMLs na fila com pool de concorrência 3 sem estourar o heap', async () => {
    // Processamento de lote em larga escala
  });

  it('Distribui os 200+ itens em 5 contêineres de exportação com conservação exata ao centavo', async () => {
    // Matriz de grande porte 200 x 5 com cálculo de saldos em tempo real
  });

  it('Comprova que nenhum dos 50 documentos fiscais reais vazou para o LocalStorage', async () => {
    // Garantia final de isolamento fiscal de memória
  });
});
```

---

## 6. Verification Method

Para verificar este relatório e a prontidão da suíte de testes de integração:

1. **Executar a suíte de testes atual do projeto**:
   ```powershell
   cd c:\www\smart-nfe
   npm test
   ```
   *Condição de sucesso*: 383 testes passando, 0 falhas, saída com exit code 0.

2. **Executar isoladamente as suítes de integração**:
   ```powershell
   cd c:\www\smart-nfe
   node --no-warnings --test tests/integration/**/*.test.mjs
   ```

3. **Verificar a sintaxe e conformidade do linter e do build**:
   ```powershell
   cd c:\www\smart-nfe
   npm run lint
   npm run build
   ```
   *Condição de sucesso*: ESLint sem erros e `next build` compilado com exit code 0.

4. **Verificar isolamento de sessão em memória**:
   - Inspecionar `app/features/invoiceRepository.js` linhas 26-28 e 640-675 para comprovar que `isRealImport: true` direciona exclusivamente para `sessionInvoices = new Map()`.
