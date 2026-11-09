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
          inconsistencias: deepClone(currentItem.inconsistencias || []),
        };
      }

      const updatedItem = {
        ...currentItem,
        ...partialItemData,
        id: currentItem.id,
        item: currentItem.item,
        modificado: true,
      };

      // Preserva valorTotal quando passado explicitamente sem alteração de preço/quantidade (ex: undo/correção matemática)
      if (
        partialItemData.valorTotal !== undefined &&
        partialItemData.quantidade === undefined &&
        partialItemData.valorUnitario === undefined
      ) {
        updatedItem.valorTotal = String(partialItemData.valorTotal);
      } else {
        const qty = updatedItem.quantidade;
        const unitPrice = updatedItem.valorUnitario;
        updatedItem.valorTotal = calculateItemTotal(unitPrice, qty);
      }

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

      const sourceInconsistencias =
        currentItem.valorOriginal?.inconsistencias || currentItem.inconsistencias || [];
      if (Array.isArray(sourceInconsistencias) && sourceInconsistencias.length > 0) {
        updatedItem.inconsistencias = sourceInconsistencias.filter((inc) => {
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
      const allIncs = [
        ...(Array.isArray(item.valorOriginal?.inconsistencias) ? item.valorOriginal.inconsistencias : []),
        ...(Array.isArray(item.inconsistencias) ? item.inconsistencias : []),
      ];
      for (const inc of allIncs) {
        if (inc && inc.campo) {
          mockIncMap.set(inc.campo, inc);
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

  /**
   * Restaura todos os documentos para os 5 cenários de demonstração originais no localStorage.
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
