/**
 * SmartNFe — Repositório Assíncrono de Invoices (Documentos Fiscais)
 *
 * Características:
 * - Interface baseada em Promises para desacoplamento e futura migração REST
 * - Persistência versionada via localStorageService (STORAGE_KEYS.INVOICES)
 * - Busca textual flexível, filtros de status, tipo e paginação
 * - Recálculo em tempo real de itens e totais da nota com cálculo decimal exato
 * - Snapshot imutável de valores originais (valorOriginal) para rollback seguro
 * - Validador fiscal dinâmico integrado para conferência e assistência (demo-04)
 */

import { localStorageService, STORAGE_KEYS } from '../lib/storage/localStorageService.js';
import { getMockInvoices } from '../lib/data/mockInvoices.js';
import { calculateItemTotal, calculateInvoiceTotals } from '../lib/calculations/invoiceTotals.js';

// Registro automático da fábrica de mocks para autorrecuperação e reset
localStorageService.registerDefault(STORAGE_KEYS.INVOICES, () => getMockInvoices());

/**
 * Clona profundamente um objeto.
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
  // Se ainda não existir no storage, inicializa
  const initial = getMockInvoices();
  localStorageService.save(STORAGE_KEYS.INVOICES, initial);
  return initial;
}

/**
 * Salva a lista completa de documentos no storage.
 */
async function saveAllInvoices(invoices) {
  localStorageService.save(STORAGE_KEYS.INVOICES, invoices);
}

export const invoiceRepository = {
  /**
   * Lista documentos fiscais aplicando filtros e paginação.
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
    const invoices = await getAllInvoices();
    let result = invoices;

    // 1. Busca textual abrangente (número, emitente, destinatário, chave de acesso)
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

    // 2. Filtro por status
    if (filters.status && filters.status !== 'todos' && filters.status !== 'all') {
      if (Array.isArray(filters.status)) {
        result = result.filter((inv) => filters.status.includes(inv.status));
      } else {
        result = result.filter((inv) => inv.status === filters.status);
      }
    }

    // 3. Filtro por tipo de documento (XML / PDF)
    const typeFilter = filters.type || filters.tipoDocumento;
    if (typeFilter && typeFilter !== 'todos' && typeFilter !== 'all') {
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
   * @param {string} id ID do documento (ex: 'demo-01')
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!id) return null;
    const invoices = await getAllInvoices();
    const found = invoices.find((inv) => inv.id === id);
    return found ? deepClone(found) : null;
  },

  /**
   * Atualiza dados de um documento e persiste.
   * @param {string} id
   * @param {Object} partialData
   * @returns {Promise<Object>} Documento atualizado
   */
  async update(id, partialData) {
    const invoices = await getAllInvoices();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) {
      throw new Error(`Documento fiscal não encontrado: ${id}`);
    }

    const existing = invoices[index];
    const updated = {
      ...existing,
      ...partialData,
      id: existing.id, // preserva ID original
      atualizadoEm: new Date().toISOString(),
    };

    // Recalcula totais caso a lista de itens tenha sido alterada sem novos totais
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
  },

  /**
   * Atualiza um item individual na NF-e, recalcula a linha e os totais da nota.
   * @param {string} invoiceId ID da NF-e
   * @param {string|number} itemId ID do item ou número sequencial
   * @param {Object} partialItemData Campos a atualizar (quantidade, valorUnitario, etc)
   * @returns {Promise<Object>} Documento fiscal atualizado
   */
  async updateItem(invoiceId, itemId, partialItemData) {
    const invoices = await getAllInvoices();
    const invoice = invoices.find((inv) => inv.id === invoiceId);
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

    await saveAllInvoices(invoices);
    return deepClone(invoice);
  },

  /**
   * Obtém os apontamentos fiscais (erros e avisos) de um documento.
   * Consolida inconsistências mockadas e executa regras dinâmicas de conferência.
   * @param {string} id ID do documento
   * @returns {Promise<Array<Object>>}
   */
  async getValidationIssues(id) {
    const invoice = await this.findById(id);
    if (!invoice) return [];

    const issues = [];

    // 1. Apontamentos estáticos pré-anotados nos itens (cenário demo-04)
    if (Array.isArray(invoice.itens)) {
      for (const item of invoice.itens) {
        if (Array.isArray(item.inconsistencias)) {
          for (const inc of item.inconsistencias) {
            issues.push({
              id: `issue-${item.id}-${inc.campo}`,
              itemId: item.id,
              itemNumero: item.item,
              itemDescricao: item.descricao,
              tipo: inc.tipo || 'erro',
              campo: inc.campo,
              mensagem: inc.mensagem,
              esperado: inc.esperado || '',
              encontrado: inc.encontrado || '',
              regra: inc.campo === 'cfop' ? 'CFOP de Exportação' : inc.campo === 'ncm' ? 'Validação de NCM' : inc.campo === 'unidade' ? 'Unidade Aduaneira' : 'Conferência Fiscal',
              sugestao: inc.esperado ? `Corrigir para "${inc.esperado}"` : 'Verificar documentação aduaneira',
            });
          }
        }
      }
    }

    // 2. Validação dinâmica de regras de comércio exterior
    const isExport =
      invoice.destinatario?.pais &&
      invoice.destinatario?.pais.toLowerCase() !== 'brasil' &&
      invoice.destinatario?.paisCodigo !== 'BR';

    if (Array.isArray(invoice.itens)) {
      for (const item of invoice.itens) {
        // Regra CFOP de Exportação
        if (isExport && item.cfop && !item.cfop.startsWith('7')) {
          const already = issues.some((iss) => iss.itemId === item.id && iss.campo === 'cfop');
          if (!already) {
            issues.push({
              id: `rule-cfop-${item.id}`,
              itemId: item.id,
              itemNumero: item.item,
              itemDescricao: item.descricao,
              tipo: 'erro',
              campo: 'cfop',
              mensagem: `CFOP ${item.cfop} inválido para operação com exterior (${invoice.destinatario?.pais}). CFOP de exportação deve iniciar com 7 (ex: 7101).`,
              esperado: '7101',
              encontrado: item.cfop,
              regra: 'CFOP de Exportação',
              sugestao: 'Alterar CFOP para 7101 (Exportação de produção própria)',
            });
          }
        }

        // Regra Formato NCM (8 dígitos)
        const cleanNcm = String(item.ncm || '').replace(/\D/g, '');
        if (cleanNcm.length > 0 && cleanNcm.length !== 8) {
          const already = issues.some((iss) => iss.itemId === item.id && iss.campo === 'ncm');
          if (!already) {
            issues.push({
              id: `rule-ncm-${item.id}`,
              itemId: item.id,
              itemNumero: item.item,
              itemDescricao: item.descricao,
              tipo: 'erro',
              campo: 'ncm',
              mensagem: `NCM "${item.ncm}" inválido. A Nomenclatura Comum do Mercosul deve conter exatamente 8 dígitos (encontrado: ${cleanNcm.length}).`,
              esperado: '8 dígitos numéricos',
              encontrado: item.ncm,
              regra: 'Classificação Fiscal NCM',
              sugestao: 'Completar os dígitos faltantes da NCM na tabela TIPI.',
            });
          }
        }

        // Regra Divergência Matemática
        const expectedTotal = calculateItemTotal(item.valorUnitario, item.quantidade);
        const recordedTotal = parseFloat(String(item.valorTotal || '0').replace(',', '.')).toFixed(2);
        if (Math.abs(parseFloat(expectedTotal) - parseFloat(recordedTotal)) > 0.01) {
          const already = issues.some((iss) => iss.itemId === item.id && iss.campo === 'valorTotal');
          if (!already) {
            issues.push({
              id: `rule-math-${item.id}`,
              itemId: item.id,
              itemNumero: item.item,
              itemDescricao: item.descricao,
              tipo: 'erro',
              campo: 'valorTotal',
              mensagem: `Divergência matemática: ${item.quantidade} x ${item.valorUnitario} = ${expectedTotal}, mas valor total gravado é ${item.valorTotal}.`,
              esperado: expectedTotal,
              encontrado: item.valorTotal,
              regra: 'Conferência Matemática',
              sugestao: `Ajustar valor total da linha para R$ ${expectedTotal}`,
            });
          }
        }
      }
    }

    return issues;
  },

  /**
   * Restaura todos os documentos para os 5 cenários de demonstração originais.
   * @returns {Promise<void>}
   */
  async resetDemoData() {
    localStorageService.reset(STORAGE_KEYS.INVOICES);
  },

  /**
   * Restaura uma única nota para o valor de fábrica correspondente.
   * @param {string} id ID da nota a restaurar
   * @returns {Promise<Object>} Nota restaurada
   */
  async resetInvoice(id) {
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
  },

  /**
   * Cria ou importa um novo documento fiscal.
   * @param {Object} invoiceData
   * @returns {Promise<Object>}
   */
  async create(invoiceData) {
    const invoices = await getAllInvoices();
    const id = invoiceData.id || `doc-${Date.now()}`;
    const newDoc = {
      ...invoiceData,
      id,
      status: invoiceData.status || 'importado',
      isDemo: true,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    if (!newDoc.totais && Array.isArray(newDoc.itens)) {
      newDoc.totais = calculateInvoiceTotals(newDoc.itens, {});
    }

    const updated = [newDoc, ...invoices];
    await saveAllInvoices(updated);
    return deepClone(newDoc);
  },
};

export default invoiceRepository;
