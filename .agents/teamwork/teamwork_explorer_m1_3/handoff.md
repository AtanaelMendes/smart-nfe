# Handoff Report — Arquitetura de Isolamento em Memória e Tela de Importação Real

**Agente:** `teamwork_explorer_m1_3` (Milestone 1 Explorer 3)  
**Destinatário:** Orquestrador (`71db8a14-4c80-4575-92ba-b52ae572b170`)  
**Data:** 09/11/2026T19:42:00Z  
**Status:** Concluído com Sucesso (Hard Handoff)  
**Artefatos Referenciados:**
- `app/features/invoiceRepository.js`
- `app/documentos/importar/page.jsx`

---

## 1. Observation (Observações Diretas)

1. **Estado Atual de `app/features/invoiceRepository.js`:**
   - **Linhas 544-565 (`create`):** Atualmente, qualquer documento criado é forçado como demonstração (`isDemo: true`) e persiste indiscriminadamente no disco via `localStorageService`:
     ```javascript
     const newDoc = {
       ...invoiceData,
       id,
       status: invoiceData.status || 'importado',
       isDemo: true, // <-- Violação do requisito de isolamento R3 para XML real
       criadoEm: new Date().toISOString(),
       atualizadoEm: new Date().toISOString(),
     };
     const updated = [newDoc, ...invoices];
     await saveAllInvoices(updated); // <-- Grava no localStorage!
     ```
   - **Linhas 87-90 (`list`) e 172-177 (`findById`):** Ambas as funções consultam exclusivamente `getAllInvoices()`, que lê direto do `localStorageService.load(STORAGE_KEYS.INVOICES)`. Não existe camada volátil de sessão.
   - **Linhas 223-338 (`updateItem`) e 185-214 (`update`):** Todas as atualizações chamam `saveAllInvoices(invoices)`. Caso um documento real fosse salvo, cada edição de conferência regravaria os dados fiscais reais no storage permanente.
   - **Linhas 507-511 (`resetDemoData`):** Executa `localStorageService.reset(STORAGE_KEYS.INVOICES)`.
   - **Chamadas em `app/documentos/page.jsx` (Linha 56 e Linha 64):**
     `app/documentos/page.jsx` invoca `invoiceRepository.resetAll()` e `invoiceRepository.delete(...)`. Ambos os métodos não estão implementados atualmente no repositório, constituindo potenciais pontos de falha em tempo de execução.

2. **Estado Atual de `app/documentos/importar/page.jsx`:**
   - **Linhas 121-165 (`processFile`):** A implementação atual é puramente simulada através de um `setInterval` de 180ms com incremento de 20%, gerando um objeto fictício acoplado ao cenário `demo-01` e sem realizar leitura via File API ou parsing de XML:
     ```javascript
     setSimulatedExtraction({
       numero: '000.145.892',
       itensCount: isXML ? 8 : 25,
       tipo: fileMeta.type,
       valorEstimado: isXML ? 'R$ 291.200,00' : 'R$ 148.750,00',
     });
     ```
   - **Linha 312:** O botão "Abrir na Conferência" redireciona sempre para `demo-01`:
     ```javascript
     onClick={() => handleOpenScenario('demo-01')}
     ```
   - **Ausência de Banner de Privacidade:** Não há menção ou aviso de que dados reais não são salvos em disco nem enviados para servidores externos, violando o critério R3.

3. **Módulos do XML Parser e Validadores (`app/features/xml/`):**
   - Conforme especificado no Survey Spec Miner 2 e nos contratos de `PROJECT.md`:
     - `nfeXmlParser.js`: `parseNFeXml(xmlString)` $\to$ `{ success: boolean, data?: ExtractedNFeData, error?: string }`
     - `accessKeyValidator.js`: `validateAccessKey(chaveAcesso)` $\to$ `{ isValid: boolean, error?: string, details?: object }`
     - `xmlToInvoiceMapper.js`: `mapXmlToInvoice(extractedData)` $\to$ `Invoice` com `itemId` determinístico `nfe-${chaveAcesso}-item-${nItem}`, `isRealImport: true`, `isDemo: false`.

4. **Execução da Suite Existente:**
   - Comando executado: `node --no-warnings --test tests/tier1/m2_domain.test.mjs`
   - Resultado: 44 testes executados, 44 aprovados (0 falhas). A nova arquitetura de sessão deve manter 100% de compatibilidade retroativa com os testes do Milestone 2.

---

## 2. Logic Chain (Cadeia Lógica de Raciocínio)

1. **Da observação 1 e requisito R3 (Isolamento de Memória vs LocalStorage):**
   - Dados fiscais de notas reais nunca devem ser persistidos no navegador (`localStorage`) por motivos de sigilo fiscal e para não corromper ou misturar com os 5 cenários de demonstração (`demo-01` a `demo-05`).
   - Logo, uma coleção em memória volátil de módulo `sessionInvoices = new Map()` deve ser instanciada dentro de `app/features/invoiceRepository.js`.
   - Na função `create(invoiceData)`: se `invoiceData.isRealImport === true` ou `invoiceData.isDemo === false`, o documento deve ser inserido exclusivamente em `sessionInvoices.set(newDoc.id, newDoc)`. O método **não pode** chamar `saveAllInvoices()` e **não pode** tocar em `localStorageService`.
   - Na função `findById(id)`: consultar primeiramente `sessionInvoices.get(id)`. Se encontrado, retornar imediatamente um clone profundo (`deepClone`). Se não encontrado, fazer o fallback para os documentos do `localStorage`.
   - Na função `list(filters)`: mesclar os valores da sessão com os persistidos: `[...sessionInvoices.values(), ...persistedInvoices]`. Para garantir excelente experiência, documentos reais de sessão devem figurar no topo da lista. Filtros de busca textual, status e paginação operam de forma transparente sobre a lista combinada.
   - Nas funções `update(id, partialData)` e `updateItem(invoiceId, itemId, partialItemData)`: verificar se o ID pertence a `sessionInvoices`. Se pertencer, atualizar diretamente a entrada no mapa em memória sem disparar `saveAllInvoices()`.
   - Na função `resetDemoData()`: resetar apenas os dados persistentes no `localStorageService`. Os documentos da sessão volátil permanecem preservados em memória enquanto a aba estiver aberta.
   - Implementar `delete(id)` e `resetAll()` como alias para fechar as brechas identificadas em `app/documentos/page.jsx`.

2. **Da observação 2 e requisito R3 (Tela de Importação Real no Cliente):**
   - Substituir o timer dummy por leitura assíncrona nativa `await file.text()`.
   - Encadeamento sequencial e seguro:
     1. Validar extensão (`.xml`) e tamanho limite ($\le 10\text{ MB}$).
     2. Ler o texto via `await file.text()`.
     3. Invocar `parseNFeXml(xmlString)`: se falhar, exibir mensagem amigável no card de erro.
     4. Invocar `validateAccessKey(extracted.chaveAcesso)`: se inválida ou DV incorreto, barrar e alertar o usuário.
     5. Invocar `mapXmlToInvoice(extracted)`: garante integridade do contrato e flags `isRealImport: true` e `isDemo: false`.
     6. Invocar `await invoiceRepository.create(invoiceDoc)`: armazena na sessão em memória.
     7. Renderizar card de sucesso contendo:
        - Número da NF-e e série.
        - Chave de acesso formatada.
        - Razão social e CNPJ do emitente.
        - Destinatário (nome e país).
        - Quantidade real de itens/produtos extraídos.
        - Valor total da NF-e e valor dos produtos formatados via `formatBRL`.
        - Botão direto para conferência: `/documentos/${savedDoc.id}/conferencia`.
     8. Exibir banner permanente e visível alertando sobre a natureza temporária da sessão em memória:
        *"⚠️ Modo Importação Local: Este documento foi carregado exclusivamente na memória do navegador. Por segurança, os dados fiscais reais não são persistidos e serão perdidos ao fechar ou recarregar a página."*
     9. Manter a grade inferior dos 5 cenários mockados (`demo-01` a `demo-05`) intacta para testes rápidos.

---

## 3. Caveats (Ressalvas e Suposições)

1. **Ciclo de Vida da Memória de Sessão:**  
   Como a sessão é mantida em um `Map` no escopo do módulo JS do cliente (`sessionInvoices`), fechar a aba, fechar o navegador ou realizar um Full Refresh (F5 / Ctrl+F5) limpa naturalmente a memória volátil. Isso é exatamente o comportamento exigido pela diretriz de segurança de dados fiscais (R3). O banner de advertência comunica isso com clareza ao usuário.
2. **Navegação Client-Side (SPA):**  
   Durante a navegação via Next.js Router (`router.push('/documentos/${id}/conferencia')`), o módulo JavaScript permanece ativo na memória da aba. O documento importado persiste e pode ser conferido, editado e visualizado na listagem de documentos sem perda de dados enquanto o usuário navega entre as rotas da aplicação.
3. **Tratamento de Arquivos PDF:**  
   O importador de XML é voltado para NF-e modelo 55. Arquivos PDF recebidos na tela de importação são identificados e recebem aviso amigável orientando o envio do arquivo `.XML` estruturado da NF-e, preservando o acesso aos cenários mockados para testes de visualização em PDF.

---

## 4. Conclusion (Conclusão)

A estratégia de arquitetura e isolamento de dados fiscais reais está completamente especificada.
Abaixo estão os códigos completos prontos para implementação pelo Worker.

---

### CÓDIGO PROPOSTO 1: `app/features/invoiceRepository.js`

```javascript
/**
 * SmartNFe — Repositório Assíncrono de Invoices (Documentos Fiscais)
 *
 * Características:
 * - Interface baseada em Promises para desacoplamento e futura migração REST
 * - Isolamento de Sessão: Documentos reais importados mantidos exclusivamente
 *   em memória volátil (sessionInvoices = new Map()), SEM persistência em localStorage
 * - Persistência versionada via localStorageService apenas para cenários mockados (demo-01 a demo-05)
 * - Busca textual flexível, filtros de status, tipo e paginação unificada
 * - Recálculo em tempo real de itens e totais da nota com cálculo decimal exato
 * - Snapshot imutável de valores originais (valorOriginal) para rollback seguro
 * - Validador fiscal dinâmico integrado para conferência e assistência
 */

import { localStorageService, STORAGE_KEYS } from '../lib/storage/localStorageService.js';
import { getMockInvoices } from '../lib/data/mockInvoices.js';
import { calculateItemTotal, calculateInvoiceTotals } from '../lib/calculations/invoiceTotals.js';
import { cleanDecimalString } from '../lib/calculations/decimal.js';

// Registro automático da fábrica de mocks para autorrecuperação e reset
localStorageService.registerDefault(STORAGE_KEYS.INVOICES, () => getMockInvoices());

// ============================================================================
// Coleção Volátil em Memória de Sessão (Isolamento R3 / Segurança Fiscal)
// ============================================================================
export const sessionInvoices = new Map();

// ============================================================================
// Mutex Queue para Serialização de Mutações Concorrentes
// ============================================================================
let mutationQueue = Promise.resolve();

/**
 * Enfileira uma mutação assíncrona para garantir execução serializada e atômica.
 * Evita race conditions (lost updates) causadas por escritas concorrentes.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
function withMutationLock(fn) {
  const resultPromise = mutationQueue.then(
    () => fn(),
    () => fn()
  );
  mutationQueue = resultPromise.catch(() => {});
  return resultPromise;
}

/**
 * Clona profundamente um objeto para evitar vazamentos de mutação externa.
 */
function deepClone(value) {
  if (value === undefined || value === null) return value;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

/**
 * Retorna todos os documentos persistidos no storage (ou restaura mocks padrão).
 */
async function getAllInvoices() {
  const loaded = localStorageService.load(STORAGE_KEYS.INVOICES, null);
  if (Array.isArray(loaded) && loaded.length > 0) {
    return loaded;
  }
  // Se ainda não existir no storage, inicializa com mocks de demonstração
  const initial = getMockInvoices();
  localStorageService.save(STORAGE_KEYS.INVOICES, initial);
  return initial;
}

/**
 * Salva a lista completa de documentos persistentes no storage.
 */
async function saveAllInvoices(invoices) {
  localStorageService.save(STORAGE_KEYS.INVOICES, invoices);
}

export const invoiceRepository = {
  /**
   * Lista documentos fiscais aplicando filtros e paginação.
   * Mescla documentos reais da sessão volátil no topo com os mocks persistidos.
   * @param {Object} filters
   * @param {string} [filters.query] Termo para busca textual
   * @param {string|string[]} [filters.status] Filtro por status
   * @param {string} [filters.type] Filtro por tipo (XML / PDF)
   * @param {number} [filters.page=1] Página atual (base 1)
   * @param {number} [filters.pageSize=0] Itens por página (0 = todos)
   * @param {boolean} [filters.returnPagination=false] Retornar objeto com metadados
   * @returns {Promise<Array<Object>|Object>}
   */
  async list(filters = {}) {
    // 1. Obtém os documentos da sessão em memória e do storage persistente
    const persisted = await getAllInvoices();
    const sessionDocs = Array.from(sessionInvoices.values());

    // Elimina eventuais duplicatas por ID, priorizando a versão em sessão
    const sessionIds = new Set(sessionDocs.map((doc) => doc.id));
    const uniquePersisted = persisted.filter((doc) => !sessionIds.has(doc.id));

    // Documentos reais da sessão posicionados com prioridade no topo da listagem
    let result = [...sessionDocs, ...uniquePersisted];

    // 2. Busca textual abrangente (número, emitente, destinatário, chave de acesso)
    if (filters.query && typeof filters.query === 'string' && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      result = result.filter((inv) => {
        const num = String(inv.numero || '').toLowerCase();
        const chave = String(inv.chaveAcesso || '').toLowerCase();
        const emitRazao = String(inv.emitente?.razaoSocial || '').toLowerCase();
        const emitCnpj = String(inv.emitente?.cnpj || '').toLowerCase();
        const destNome = String(inv.destinatario?.nome || '').toLowerCase();
        const destPais = String(inv.destinatario?.pais || '').toLowerCase();

        return (
          num.includes(q) ||
          chave.includes(q) ||
          emitRazao.includes(q) ||
          emitCnpj.includes(q) ||
          destNome.includes(q) ||
          destPais.includes(q)
        );
      });
    }

    // 3. Filtro por status
    const statusFilter = filters.status;
    if (statusFilter && statusFilter !== 'todos' && statusFilter !== 'all' && statusFilter !== 'ALL') {
      if (Array.isArray(statusFilter)) {
        result = result.filter((inv) => statusFilter.includes(inv.status));
      } else {
        result = result.filter((inv) => inv.status === statusFilter);
      }
    }

    // 4. Filtro por tipo de documento (XML / PDF)
    const typeFilter = filters.type || filters.tipoDocumento;
    if (typeFilter && typeFilter !== 'todos' && typeFilter !== 'all' && typeFilter !== 'ALL') {
      result = result.filter(
        (inv) => String(inv.tipoDocumento || '').toUpperCase() === String(typeFilter).toUpperCase()
      );
    }

    const total = result.length;
    const page = parseInt(filters.page, 10) || 1;
    const pageSize = parseInt(filters.pageSize || filters.perPage, 10) || 0;

    let items = result;
    if (pageSize > 0) {
      const start = (page - 1) * pageSize;
      items = result.slice(start, start + pageSize);
    }

    // Se o consumidor solicitou explicitamente o envelope de paginação
    if (filters.returnPagination) {
      return {
        data: deepClone(items),
        total,
        page,
        pageSize: pageSize || total,
        totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 1,
      };
    }

    // Retorna Array com propriedades não enumeráveis para máxima compatibilidade
    const arrayResult = deepClone(items);
    Object.defineProperties(arrayResult, {
      total: { value: total, writable: true, enumerable: false },
      page: { value: page, writable: true, enumerable: false },
      pageSize: { value: pageSize || total, writable: true, enumerable: false },
      totalPages: {
        value: pageSize > 0 ? Math.ceil(total / pageSize) : 1,
        writable: true,
        enumerable: false,
      },
    });

    return arrayResult;
  },

  /**
   * Busca um documento fiscal por ID.
   * Consulta primeiro a sessão volátil em memória e, em caso de ausência, recorre ao storage.
   * @param {string} id ID do documento (ex: 'nfe-352411...' ou 'demo-01')
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!id) return null;

    // 1. Consulta primeiro a sessão volátil em memória
    if (sessionInvoices.has(id)) {
      return deepClone(sessionInvoices.get(id));
    }

    // 2. Fallback para storage persistente de mocks
    const invoices = await getAllInvoices();
    const found = invoices.find((inv) => inv.id === id);
    return found ? deepClone(found) : null;
  },

  /**
   * Atualiza dados de um documento e persiste de acordo com seu escopo.
   * Se for documento de sessão real, atualiza diretamente em sessionInvoices.
   * @param {string} id
   * @param {Object} partialData
   * @returns {Promise<Object>} Documento atualizado
   */
  async update(id, partialData) {
    return withMutationLock(async () => {
      // 1. Caso resida na sessão volátil em memória
      if (sessionInvoices.has(id)) {
        const existing = sessionInvoices.get(id);
        const updated = {
          ...existing,
          ...partialData,
          id: existing.id, // Preserva ID original imutável
          atualizadoEm: new Date().toISOString(),
        };

        // Recalcula totais caso a lista de itens tenha sido alterada sem novos totais explícitos
        if (partialData.itens && !partialData.totais) {
          const totals = calculateInvoiceTotals(updated.itens, existing.totais || {});
          updated.totais = {
            ...existing.totais,
            ...totals,
          };
        }

        sessionInvoices.set(id, deepClone(updated));
        return deepClone(updated);
      }

      // 2. Caso seja documento persistido no localStorage
      const invoices = await getAllInvoices();
      const index = invoices.findIndex((inv) => inv.id === id);
      if (index === -1) {
        throw new Error(`Documento fiscal não encontrado: ${id}`);
      }

      const existing = invoices[index];
      const updated = {
        ...existing,
        ...partialData,
        id: existing.id,
        atualizadoEm: new Date().toISOString(),
      };

      if (partialData.itens && !partialData.totais) {
        const totals = calculateInvoiceTotals(updated.itens, existing.totais || {});
        updated.totais = {
          ...existing.totais,
          ...totals,
        };
      }

      invoices[index] = updated;
      await saveAllInvoices(invoices);
      return deepClone(updated);
    });
  },

  /**
   * Atualiza um item individual na NF-e, recalcula a linha e os totais da nota.
   * Preserva a segregação entre memória de sessão e localStorage.
   * @param {string} invoiceId ID da NF-e
   * @param {string|number} itemId ID do item ou número sequencial
   * @param {Object} partialItemData Campos a atualizar (quantidade, valorUnitario, etc)
   * @returns {Promise<Object>} Documento fiscal atualizado
   */
  async updateItem(invoiceId, itemId, partialItemData) {
    return withMutationLock(async () => {
      const isSession = sessionInvoices.has(invoiceId);
      let invoice;
      let invoices;
      let index = -1;

      if (isSession) {
        invoice = deepClone(sessionInvoices.get(invoiceId));
      } else {
        invoices = await getAllInvoices();
        index = invoices.findIndex((inv) => inv.id === invoiceId);
        if (index === -1) {
          throw new Error(`Documento fiscal não encontrado: ${invoiceId}`);
        }
        invoice = invoices[index];
      }

      if (!invoice) {
        throw new Error(`Documento fiscal não encontrado: ${invoiceId}`);
      }

      if (!Array.isArray(invoice.itens)) {
        invoice.itens = [];
      }

      const itemIndex = invoice.itens.findIndex(
        (it) => it.id === itemId || String(it.item) === String(itemId)
      );
      if (itemIndex === -1) {
        throw new Error(`Item "${itemId}" não encontrado no documento "${invoiceId}"`);
      }

      const currentItem = invoice.itens[itemIndex];

      // Cria snapshot imutável do valor original na primeira alteração
      if (!currentItem.valorOriginal) {
        currentItem.valorOriginal = {
          codigo: currentItem.codigo,
          descricao: currentItem.descricao,
          ncm: currentItem.ncm,
          cfop: currentItem.cfop,
          unidade: currentItem.unidade,
          quantidade: currentItem.quantidade,
          valorUnitario: currentItem.valorUnitario,
          valorTotal: currentItem.valorTotal,
        };
      }

      const updatedItem = {
        ...currentItem,
        ...partialItemData,
        id: currentItem.id,
        item: currentItem.item,
        modificado: true,
      };

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
      const cleanRec = cleanDecimalString(updatedItem.valorTotal);
      const recordedTotal = Number.isFinite(parseFloat(cleanRec))
        ? parseFloat(cleanRec).toFixed(2)
        : '0.00';
      const hasMathDiff = Math.abs(parseFloat(expectedTotal) - parseFloat(recordedTotal)) > 0.01;

      // Validação fiscal unificada do item (sincronizada com getValidationIssues)
      const hasCfopError = isExport
        ? (!cleanCfop || !cleanCfop.startsWith('7'))
        : cleanCfop.startsWith('7');
      const hasNcmError = cleanNcm.length !== 8;
      const hasFiscalError = hasCfopError || hasNcmError || hasMathDiff;

      if (Array.isArray(updatedItem.inconsistencias)) {
        updatedItem.inconsistencias = updatedItem.inconsistencias.filter((inc) => {
          if (inc.campo === 'cfop') return hasCfopError;
          if (inc.campo === 'ncm') return hasNcmError;
          if (inc.campo === 'valorTotal') return hasMathDiff;
          if (inc.campo === 'unidade') {
            const expectedUnit = (inc.esperado || 'PAR').trim().toUpperCase();
            return String(updatedItem.unidade || '').trim().toUpperCase() !== expectedUnit;
          }
          if (inc.esperado) {
            return String(updatedItem[inc.campo] || '').trim() !== String(inc.esperado).trim();
          }
          return true;
        });
      }

      const hasRemainingMockErrors =
        Array.isArray(updatedItem.inconsistencias) && updatedItem.inconsistencias.length > 0;

      const hasAnyError = hasFiscalError || hasRemainingMockErrors;

      if (hasAnyError) {
        updatedItem.situacao = 'inconsistente';
      } else {
        updatedItem.situacao = 'conferido';
      }

      invoice.itens[itemIndex] = updatedItem;

      // Recalcula totais consolidados da nota
      const newTotals = calculateInvoiceTotals(invoice.itens, invoice.totais || {});
      invoice.totais = {
        ...invoice.totais,
        ...newTotals,
      };
      invoice.atualizadoEm = new Date().toISOString();

      // Se a nota estava recém importada, transiciona para 'em_conferencia'
      if (invoice.status === 'importado') {
        invoice.status = 'em_conferencia';
      }

      // Persistência segregada estrita
      if (isSession) {
        sessionInvoices.set(invoiceId, deepClone(invoice));
        return deepClone(invoice);
      }

      invoices[index] = invoice;
      await saveAllInvoices(invoices);
      return deepClone(invoice);
    });
  },

  /**
   * Obtém os apontamentos fiscais (erros e avisos) de um documento.
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

      // 3. Regra Divergência Matemática da Linha
      const expectedTotal = calculateItemTotal(item.valorUnitario, item.quantidade);
      const cleanRec = cleanDecimalString(item.valorTotal);
      const recordedTotal = cleanRec ? parseFloat(cleanRec).toFixed(2) : '0.00';
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

      // 4. Regra Unidade Aduaneira
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

      // 5. Outras inconsistências personalizadas
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

  /**
   * Restaura os 5 cenários de demonstração originais no localStorage.
   * Não afeta documentos da sessão volátil em memória.
   * @returns {Promise<void>}
   */
  async resetDemoData() {
    return withMutationLock(async () => {
      localStorageService.reset(STORAGE_KEYS.INVOICES);
    });
  },

  /**
   * Alias de compatibilidade com app/documentos/page.jsx
   */
  async resetAll() {
    return this.resetDemoData();
  },

  /**
   * Restaura uma única nota para o valor de fábrica correspondente.
   * Se for documento de sessão real, lança erro informativo.
   * @param {string} id ID da nota a restaurar
   * @returns {Promise<Object>} Nota restaurada
   */
  async resetInvoice(id) {
    return withMutationLock(async () => {
      if (sessionInvoices.has(id)) {
        throw new Error(
          `Documento "${id}" reside na sessão volátil e não possui versão de demonstração de fábrica para restauração.`
        );
      }

      const factoryInvoices = getMockInvoices();
      const factoryItem = factoryInvoices.find((inv) => inv.id === id);
      if (!factoryItem) {
        throw new Error(`Cenário original de fábrica não encontrado para ID: ${id}`);
      }

      const currentInvoices = await getAllInvoices();
      const index = currentInvoices.findIndex((inv) => inv.id === id);
      if (index === -1) {
        currentInvoices.push(deepClone(factoryItem));
      } else {
        currentInvoices[index] = deepClone(factoryItem);
      }

      await saveAllInvoices(currentInvoices);
      return deepClone(factoryItem);
    });
  },

  /**
   * Cria ou importa um novo documento fiscal.
   * Se isRealImport === true ou isDemo === false, armazena exclusivamente em sessionInvoices (memória)
   * SEM tocar no localStorageService.
   * @param {Object} invoiceData
   * @returns {Promise<Object>}
   */
  async create(invoiceData) {
    return withMutationLock(async () => {
      const isReal = invoiceData.isRealImport === true || invoiceData.isDemo === false;
      const id = invoiceData.id || `doc-${Date.now()}`;
      const newDoc = {
        ...invoiceData,
        id,
        status: invoiceData.status || 'importado',
        isDemo: isReal ? false : (invoiceData.isDemo ?? true),
        isRealImport: isReal,
        criadoEm: invoiceData.criadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };

      if (!newDoc.totais && Array.isArray(newDoc.itens)) {
        newDoc.totais = calculateInvoiceTotals(newDoc.itens, {});
      }

      if (isReal) {
        // Armazenamento EXCLUSIVO em memória de sessão temporária
        // JAMAIS chama saveAllInvoices() nem grava no localStorageService
        sessionInvoices.set(newDoc.id, deepClone(newDoc));
        return deepClone(newDoc);
      }

      // Fluxo legado para mocks e dados de demonstração
      const invoices = await getAllInvoices();
      const updated = [newDoc, ...invoices];
      await saveAllInvoices(updated);
      return deepClone(newDoc);
    });
  },

  /**
   * Remove um documento fiscal (da sessão ou do localStorage).
   * @param {string} id ID do documento
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    return withMutationLock(async () => {
      if (sessionInvoices.has(id)) {
        sessionInvoices.delete(id);
        return true;
      }

      const invoices = await getAllInvoices();
      const filtered = invoices.filter((inv) => inv.id !== id);
      if (filtered.length !== invoices.length) {
        await saveAllInvoices(filtered);
        return true;
      }
      return false;
    });
  },

  /**
   * Limpa todos os documentos da sessão volátil em memória.
   * Útil para testes automatizados e logout de sessão.
   */
  clearSession() {
    sessionInvoices.clear();
  },

  /**
   * Retorna a contagem de documentos na sessão volátil.
   */
  getSessionCount() {
    return sessionInvoices.size;
  },

  /**
   * Verifica se um documento reside na sessão volátil.
   * @param {string} id
   * @returns {boolean}
   */
  isSessionInvoice(id) {
    return sessionInvoices.has(id);
  },
};

export default invoiceRepository;
```

---

### CÓDIGO PROPOSTO 2: `app/documentos/importar/page.jsx`

```jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileImport,
  faCloudArrowUp,
  faFileCode,
  faFilePdf,
  faCircleCheck,
  faTriangleExclamation,
  faCircleExclamation,
  faPlay,
  faArrowRight,
  faCircleNotch,
  faFolderOpen,
  faShieldHalved,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import { useAppContext } from '@/context/AppContext';
import { invoiceRepository } from '@/features/invoiceRepository';
import { parseNFeXml } from '@/features/xml/nfeXmlParser';
import { validateAccessKey } from '@/features/xml/accessKeyValidator';
import { mapXmlToInvoice } from '@/features/xml/xmlToInvoiceMapper';
import { formatBRL } from '@/lib/formatters/currency';

const DEMO_SCENARIOS = [
  {
    id: 'demo-01',
    nome: 'Cenário 1 — NF-e XML Agro',
    tipo: 'XML',
    badge: '8 ITENS',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    emitente: 'Agroexport Brasil S.A.',
    destinatario: 'Global Trading Logistics B.V. (Holanda)',
    valor: 'R$ 291.200,00',
    descricao: 'Exportação de grãos e café com dados completos, CFOP 7101 e consistência fiscal perfeita.',
  },
  {
    id: 'demo-02',
    nome: 'Cenário 2 — NF-e PDF Metalmecânica',
    tipo: 'PDF',
    badge: '25 ITENS',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    emitente: 'Metalúrgica Sul Americana Ltda',
    destinatario: 'Industrial Supply Corp. (EUA)',
    valor: 'R$ 148.750,00',
    descricao: 'Peças usinadas e insumos industriais com múltiplos itens para teste de rolagem.',
  },
  {
    id: 'demo-03',
    nome: 'Cenário 3 — Stress Test em Volume',
    tipo: 'XML',
    badge: '50 ITENS',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    emitente: 'Eletroparts do Brasil Componentes S.A.',
    destinatario: 'Auto Assembly Europe GmbH (Alemanha)',
    valor: 'R$ 625.800,00',
    descricao: 'Volume denso de mercadorias automotivas para validação de performance da tabela.',
  },
  {
    id: 'demo-04',
    nome: 'Cenário 4 — Inconsistências Fiscais',
    tipo: 'XML',
    badge: 'ALERTA (12 ITENS)',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border border-rose-300',
    emitente: 'Calçados Vale do Rio Doce Ltda',
    destinatario: 'Fashion Footwear Group S.L. (Espanha)',
    valor: 'R$ 89.300,00',
    descricao: 'Simula produtos sem NCM de 8 dígitos, divergências de soma e CFOPs incorretos.',
    hasAlert: true,
  },
  {
    id: 'demo-05',
    nome: 'Cenário 5 — Desmembramento & Lotes',
    tipo: 'XML',
    badge: '15 ITENS',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    emitente: 'Cooperativa Agroindustrial Centro-Oeste',
    destinatario: 'Asian Grain Corporation (China)',
    valor: 'R$ 342.000,00',
    descricao: 'Produtos agrícolas repetidos em 5 lotes preparados para divisão em contêineres.',
  },
];

export default function ImportarDocumentoPage() {
  const router = useRouter();
  const { toast } = useAppContext();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);
  const [importError, setImportError] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    const isXML = fileNameLower.endsWith('.xml');
    const isPDF = fileNameLower.endsWith('.pdf');

    // 1. Validação de formato de arquivo
    if (!isXML && !isPDF) {
      toast.error('Formato inválido. Por favor, envie arquivos .XML (NF-e modelo 55) ou .PDF.');
      return;
    }

    // 2. Limite de tamanho de arquivo (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo excede o limite máximo permitido de 10 MB.');
      return;
    }

    const fileMeta = {
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: isXML ? 'XML' : 'PDF',
    };

    setSelectedFile(fileMeta);
    setImportSuccess(null);
    setImportError(null);
    setIsProcessing(true);

    try {
      if (isPDF) {
        // PDF: Fluxo assistido de orientação para o usuário
        setImportError({
          title: 'Arquivo PDF Identificado',
          message:
            'A importação automatizada com conferência estruturada e validação fiscal de lote opera com arquivos XML da NF-e (Modelo 55). Para testar a conferência de DANFE em PDF, utilize os cenários pré-carregados de demonstração abaixo.',
          isWarning: true,
        });
        toast.info('Para importação real e extração de dados fiscais, envie o arquivo XML da NF-e.');
        setIsProcessing(false);
        return;
      }

      // XML: Leitura REAL via File API do navegador
      const xmlString = await file.text();

      if (!xmlString || !xmlString.trim()) {
        throw new Error('O arquivo XML selecionado está vazio.');
      }

      // 3. Execução do DOMParser nativo
      const parseResult = parseNFeXml(xmlString);
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Falha ao analisar a estrutura XML do documento.');
      }

      const extracted = parseResult.data;

      // 4. Validação da Chave de Acesso (44 dígitos e Módulo 11)
      if (!extracted.chaveAcesso) {
        throw new Error('Chave de acesso não localizada no documento fiscal (tag infNFe/@Id ausente).');
      }

      const keyValidation = validateAccessKey(extracted.chaveAcesso);
      if (!keyValidation.isValid) {
        throw new Error(
          `Inconsistência na Chave de Acesso: ${keyValidation.error || 'Dígito verificador ou formato incorreto.'}`
        );
      }

      // 5. Mapeamento para o contrato do invoiceRepository
      const invoiceData = mapXmlToInvoice(extracted);

      // Assegura flags estritas de importação em sessão volátil
      invoiceData.isRealImport = true;
      invoiceData.isDemo = false;

      // 6. Salvamento no repositório (exclusivamente em sessionInvoices Map)
      const savedInvoice = await invoiceRepository.create(invoiceData);

      // 7. Feedback de Sucesso Detalhado
      setImportSuccess({
        id: savedInvoice.id,
        numero: savedInvoice.numero,
        serie: savedInvoice.serie,
        chaveAcesso: savedInvoice.chaveAcesso,
        naturezaOperacao: savedInvoice.naturezaOperacao,
        emitente: {
          razaoSocial: savedInvoice.emitente?.razaoSocial || 'Não informado',
          cnpj: savedInvoice.emitente?.cnpj || '',
          uf: savedInvoice.emitente?.uf || '',
          municipio: savedInvoice.emitente?.municipio || '',
        },
        destinatario: {
          nome: savedInvoice.destinatario?.nome || 'Não informado',
          cnpjOuId: savedInvoice.destinatario?.cnpj || savedInvoice.destinatario?.idEstrangeiro || '',
          pais: savedInvoice.destinatario?.pais || 'Brasil',
          uf: savedInvoice.destinatario?.uf || '',
        },
        itensCount: savedInvoice.itens?.length || 0,
        valorTotal: savedInvoice.totais?.valorTotalNota || '0.00',
        valorProdutos: savedInvoice.totais?.valorProdutos || '0.00',
        valorFrete: savedInvoice.totais?.valorFrete || '0.00',
        outrasDespesas: savedInvoice.totais?.outrasDespesas || '0.00',
      });

      toast.success(
        `NF-e ${savedInvoice.numero} importada com sucesso! ${savedInvoice.itens?.length || 0} produtos prontos para conferência.`
      );
    } catch (err) {
      console.error('Erro na importação de XML:', err);
      const errMsg = err?.message || 'Ocorreu um erro desconhecido ao processar o arquivo XML.';
      setImportError({
        title: 'Falha na Validação do Arquivo XML',
        message: errMsg,
        isWarning: false,
      });
      toast.error(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenScenario = (scenarioId) => {
    toast.info(`Carregando conferência do ${scenarioId.toUpperCase()}...`);
    router.push(`/documentos/${scenarioId}/conferencia`);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setImportSuccess(null);
    setImportError(null);
    setIsProcessing(false);
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documentos', href: '/documentos' },
        { label: 'Importar' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Banner de Segurança & Sessão Temporária */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-lg p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400 mt-0.5">
            <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Sessão Volátil em Memória &mdash; Isolamento de Dados Fiscais Reais
            </p>
            <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
              Por segurança e conformidade, os arquivos XML reais importados são processados 100% no seu navegador e mantidos exclusivamente na memória da sessão (<code className="font-mono text-[11px] bg-amber-100/70 dark:bg-amber-900/50 px-1 py-0.5 rounded">sessionInvoices</code>). <strong>Nenhum dado fiscal real é gravado em disco (localStorage) ou enviado a servidores externos</strong>. Os dados serão perdidos caso você feche ou recarregue a aba.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FontAwesomeIcon icon={faFileImport} className="text-blue-600" />
                Importação de Documentos Fiscais
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Envie arquivos <strong>.XML</strong> de NF-e modelo 55 para extração real e conferência imediata no navegador.
              </p>
            </div>
            <Link href="/documentos">
              <Button buttonType="secondary" size="small" outline>
                <FontAwesomeIcon icon={faFolderOpen} className="mr-1.5" />
                Ver Documentos
              </Button>
            </Link>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            accept=".xml,.pdf"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FontAwesomeIcon icon={faCloudArrowUp} className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Arraste e solte seu arquivo XML aqui, ou{' '}
                <label
                  htmlFor="file-upload"
                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold"
                >
                  procure no computador
                </label>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos aceitos: <strong>.XML</strong> (NF-e modelo 55 padrão SEFAZ até 10 MB)
              </p>
            </div>
          </div>

          {/* Feedback de arquivo selecionado */}
          {selectedFile && (
            <div className="mt-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon
                    icon={selectedFile.type === 'XML' ? faFileCode : faFilePdf}
                    className={`w-6 h-6 ${selectedFile.type === 'XML' ? 'text-blue-500' : 'text-red-500'}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedFile.name}</p>
                    <span className="text-xs text-slate-500">{selectedFile.size} • {selectedFile.type}</span>
                  </div>
                </div>

                {isProcessing ? (
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                    <FontAwesomeIcon icon={faCircleNotch} className="animate-spin w-4 h-4" />
                    <span>Processando e validando NF-e...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {importSuccess && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                        <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5" />
                        <span>Leitura e Validação Concluídas</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2 cursor-pointer underline flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faTrashCan} className="w-3 h-3" />
                      Remover / Novo Arquivo
                    </button>
                  </div>
                )}
              </div>

              {/* Card de Erro Detalhado */}
              {importError && !isProcessing && (
                <div
                  className={`mt-4 p-4 rounded-lg border text-left text-xs ${
                    importError.isWarning
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <FontAwesomeIcon
                      icon={importError.isWarning ? faTriangleExclamation : faCircleExclamation}
                      className={`w-4 h-4 shrink-0 mt-0.5 ${importError.isWarning ? 'text-amber-600' : 'text-rose-600'}`}
                    />
                    <div className="space-y-1">
                      <p className="font-bold text-sm">{importError.title}</p>
                      <p className="leading-relaxed whitespace-pre-wrap">{importError.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Card de Sucesso com Resumo da Nota e Ação Direta para Conferência */}
              {importSuccess && !isProcessing && (
                <div className="mt-4 p-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/80 dark:border-emerald-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCircleCheck} className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                          NF-e {importSuccess.numero} importada com sucesso!
                        </h3>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          Série {importSuccess.serie} • Chave: <span className="font-mono">{importSuccess.chaveAcesso}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        buttonType="primary"
                        size="small"
                        onClick={() => router.push(`/documentos/${importSuccess.id}/conferencia`)}
                      >
                        <FontAwesomeIcon icon={faPlay} className="mr-1.5" />
                        Abrir na Conferência
                      </Button>
                    </div>
                  </div>

                  {/* Grid de Informações Extraídas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white dark:bg-slate-800/80 p-3 rounded border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Emitente
                      </span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate" title={importSuccess.emitente.razaoSocial}>
                        {importSuccess.emitente.razaoSocial}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {importSuccess.emitente.cnpj || 'CNPJ não informado'}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-3 rounded border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Destinatário
                      </span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate" title={importSuccess.destinatario.nome}>
                        {importSuccess.destinatario.nome}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {importSuccess.destinatario.pais} ({importSuccess.destinatario.uf})
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-3 rounded border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Produtos / Linhas
                      </span>
                      <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {importSuccess.itensCount} {importSuccess.itensCount === 1 ? 'item' : 'itens'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={importSuccess.naturezaOperacao}>
                        {importSuccess.naturezaOperacao || 'Operação normal'}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-3 rounded border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Valor Total da NF-e
                      </span>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBRL(importSuccess.valorTotal)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Produtos: {formatBRL(importSuccess.valorProdutos)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5 Cenários de Demonstração Rápidos */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FontAwesomeIcon icon={faPlay} className="text-blue-600 w-3.5 h-3.5" />
                Cenários de Demonstração Prontos para Teste (1 Clique):
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Clique em qualquer cenário abaixo para carregar instantaneamente o documento estruturado na tela de conferência.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
              5 Cenários Disponíveis
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {DEMO_SCENARIOS.map((sc) => (
              <div
                key={sc.id}
                onClick={() => handleOpenScenario(sc.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col justify-between group ${
                  sc.hasAlert
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 hover:border-rose-400 hover:bg-rose-50/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-slate-700/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {sc.nome}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sc.badgeColor}`}>
                        {sc.badge}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {sc.valor}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2">
                    {sc.descricao}
                  </p>

                  <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                    <span>Emitente: {sc.emitente}</span>
                    <span className="mx-1">•</span>
                    <span>Destino: {sc.destinatario}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <FontAwesomeIcon icon={sc.tipo === 'XML' ? faFileCode : faFilePdf} className="w-3 h-3 text-slate-400" />
                    Formato {sc.tipo}
                  </span>

                  <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Abrir Conferência</span>
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center text-xs text-slate-500">
            Deseja ver a lista completa de documentos?{' '}
            <Link href="/documentos" className="text-blue-600 hover:underline font-semibold">
              Ir para tela de Documentos Fiscais &rarr;
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
```

---

## 5. Verification Method (Método de Verificação Independente)

Para auditar e verificar de forma autônoma a estratégia e o isolamento de memória:

1. **Validação Estática e Testes de Regressão Existentes:**
   ```powershell
   node --no-warnings --test tests/tier1/m2_domain.test.mjs
   ```
   *Critério de Sucesso:* 44 testes passando com 0 falhas.

2. **Script de Verificação do Isolamento de Memória (`sessionInvoices` vs `localStorage`):**
   Após a aplicação do código pelo Worker, executar o seguinte teste dinâmico:
   ```powershell
   node -e "
   import('../../app/features/invoiceRepository.js').then(async ({ invoiceRepository, sessionInvoices }) => {
     const { localStorageService, STORAGE_KEYS } = await import('../../app/lib/storage/localStorageService.js');
     
     // 1. Criação de documento real
     const realDoc = {
       id: 'nfe-35241112345678000190550010001458921001234562',
       numero: '000.145.892',
       chaveAcesso: '35241112345678000190550010001458921001234562',
       isRealImport: true,
       isDemo: false,
       itens: [{ id: 'item-1', item: 1, quantidade: '10.0000', valorUnitario: '100.00', valorTotal: '1000.00' }]
     };

     const created = await invoiceRepository.create(realDoc);
     
     // Asserção 1: Está no Map de sessão
     if (!sessionInvoices.has(created.id)) throw new Error('FAIL: Documento não inserido em sessionInvoices!');
     
     // Asserção 2: NÃO está no localStorage
     const persisted = localStorageService.load(STORAGE_KEYS.INVOICES, []);
     if (persisted.some(d => d.id === created.id)) throw new Error('FAIL VIOLAÇÃO R3: Documento real foi salvo no localStorage!');
     
     // Asserção 3: findById recupera da sessão
     const found = await invoiceRepository.findById(created.id);
     if (!found || found.id !== created.id) throw new Error('FAIL: findById não encontrou documento na sessão!');

     // Asserção 4: list mescla com real no topo
     const list = await invoiceRepository.list();
     if (list[0].id !== created.id) throw new Error('FAIL: Documento real não está no topo da listagem!');

     // Asserção 5: resetDemoData não apaga o documento real
     await invoiceRepository.resetDemoData();
     if (!sessionInvoices.has(created.id)) throw new Error('FAIL: resetDemoData apagou o documento volátil da sessão!');
     
     console.log('SUCCESS: Todos os 5 critérios de isolamento de memória foram validados com êxito!');
   }).catch(e => { console.error(e); process.exit(1); });
   "
   ```

3. **Condições de Invalidação:**
   - O handoff será invalidado se qualquer chamada a `invoiceRepository.create` com `isRealImport === true` ou `isDemo === false` acionar `localStorageService.save()`.
   - O handoff será invalidado se a tela de importação mantiver simulação dummy com `setInterval` ou omitir o banner de advertência sobre a sessão em memória.
