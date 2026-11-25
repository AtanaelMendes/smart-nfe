/**
 * SmartNFe — Repositório Assíncrono de Documentos Manuais (NF-e e NFS-e)
 *
 * Características:
 * - Suporta criação de NF-e modelo 55 (produtos) e NFS-e (serviços / MEI)
 * - Dual-Storage: Documentos reais mantidos em memória de sessão volátil (sessionDocuments),
 *   e cenários mockados persistidos via localStorageService (STORAGE_KEYS.MANUAL_DOCUMENTS)
 * - Serialização atômica contra race conditions via fila de mutações
 * - Operações assíncronas padrão Promise para desacoplamento e futura API PHP
 * - Integração controlada com o motor de preparações N:M para NF-e de mercadorias
 * - Bloqueio estrito de alocação de serviços em preparações
 */

import { localStorageService, STORAGE_KEYS } from '../lib/storage/localStorageService.js';
import { getMockManualDocuments } from '../lib/data/mockManualDocuments.js';
import { calculateItemTotal, calculateInvoiceTotals } from '../lib/calculations/invoiceTotals.js';
import { cleanDecimalString, decimalAdd, decimalSubtract, decimalCompare } from '../lib/calculations/decimal.js';
import { validateNFe } from './validation/nfeValidator.js';
import { validateNFSe } from './validation/nfseValidator.js';
import { sessionInvoices, invoiceRepository } from './invoiceRepository.js';

// Registra fábrica de mocks no storage
const STORAGE_KEY_MANUAL = STORAGE_KEYS.MANUAL_DOCUMENTS || 'smartnfe_manual_documents';
localStorageService.registerDefault(STORAGE_KEY_MANUAL, () => getMockManualDocuments());

// ============================================================================
// Coleção Volátil em Memória de Sessão (Isolamento de Documentos Reais)
// ============================================================================
export const sessionDocuments = new Map();

// Mutex Queue
let mutationQueue = Promise.resolve();

function withMutationLock(fn) {
  const resultPromise = mutationQueue.then(
    () => fn(),
    () => fn()
  );
  mutationQueue = resultPromise.catch(() => {});
  return resultPromise;
}

function deepClone(value) {
  if (value === undefined || value === null) return value;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

/**
 * Recalcula totais de NF-e com o motor decimal central
 */
function recalculateNFeTotals(doc) {
  const itens = Array.isArray(doc.itens) ? doc.itens : [];
  const normalizedItems = itens.map((item, idx) => {
    const qClean = cleanDecimalString(item.quantidade || '0');
    const vuClean = cleanDecimalString(item.valorUnitario || '0');
    const descClean = cleanDecimalString(item.desconto || '0');

    // Totais SEFAZ do item
    const computedTotal = calculateItemTotal(vuClean, qClean);

    return {
      ...item,
      item: item.item || idx + 1,
      itemId: item.itemId || `item-${doc.id || 'draft'}-${idx + 1}`,
      quantidade: qClean,
      valorUnitario: vuClean,
      desconto: descClean,
      valorTotal: computedTotal,
    };
  });

  const frete = cleanDecimalString(doc.totais?.valorFrete || '0.00');
  const seguro = cleanDecimalString(doc.totais?.valorSeguro || '0.00');
  const outras = cleanDecimalString(doc.totais?.outrasDespesas || '0.00');
  const descGeral = cleanDecimalString(doc.totais?.valorDesconto || '0.00');

  const totals = calculateInvoiceTotals(normalizedItems, {
    freight: frete,
    insurance: seguro,
    discount: descGeral,
    otherExpenses: outras,
  });

  return {
    ...doc,
    itens: normalizedItems,
    totais: {
      valorProdutos: totals.valorProdutos,
      valorFrete: frete,
      valorSeguro: seguro,
      valorDesconto: totals.valorDesconto,
      outrasDespesas: outras,
      valorTotalNota: totals.valorTotalNota,
    },
  };
}

/**
 * Recalcula valores de NFS-e com precisão decimal
 */
function recalculateNFSeValues(doc) {
  const vals = doc.valores || {};
  const vBruto = cleanDecimalString(vals.valorBruto || '0.00');
  const descIncond = cleanDecimalString(vals.valorDescontoIncondicionado || '0.00');
  const descCond = cleanDecimalString(vals.valorDescontoCondicionado || '0.00');
  const deducoes = cleanDecimalString(vals.valorDeducoes || '0.00');

  const retencoes = vals.retencoesFederais || {};
  const pis = cleanDecimalString(retencoes.pis || '0.00');
  const cofins = cleanDecimalString(retencoes.cofins || '0.00');
  const inss = cleanDecimalString(retencoes.inss || '0.00');
  const ir = cleanDecimalString(retencoes.ir || '0.00');
  const csll = cleanDecimalString(retencoes.csll || '0.00');
  const issRetido = cleanDecimalString(vals.valorIssRetido || '0.00');

  // Soma das retenções que reduzem o valor líquido
  let totalRetencoes = '0.00';
  if (vals.issRetido) {
    totalRetencoes = decimalAdd(totalRetencoes, issRetido, 2);
  }
  totalRetencoes = decimalAdd(totalRetencoes, pis, 2);
  totalRetencoes = decimalAdd(totalRetencoes, cofins, 2);
  totalRetencoes = decimalAdd(totalRetencoes, inss, 2);
  totalRetencoes = decimalAdd(totalRetencoes, ir, 2);
  totalRetencoes = decimalAdd(totalRetencoes, csll, 2);

  // Valor Líquido = Valor Bruto - Descontos Incondicionados - Retenções
  const basePosDesconto = decimalSubtract(vBruto, descIncond, 2);
  const vLiquidoCalculado = decimalSubtract(basePosDesconto, totalRetencoes, 2);

  return {
    ...doc,
    valores: {
      ...vals,
      valorBruto: vBruto,
      valorDescontoIncondicionado: descIncond,
      valorDescontoCondicionado: descCond,
      valorDeducoes: deducoes,
      valorIssRetido: issRetido,
      retencoesFederais: {
        pis,
        cofins,
        inss,
        ir,
        csll,
      },
      valorLiquido: decimalCompare(vLiquidoCalculado, '0.00') < 0 ? '0.00' : vLiquidoCalculado,
    },
  };
}

export const documentRepository = {
  /**
   * Lista documentos manuais e rascunhos aplicando filtros e paginação
   */
  async list(filters = {}) {
    const {
      documentType,
      status,
      emitenteId,
      query,
      startDate,
      endDate,
      minValue,
      maxValue,
      page = 1,
      limit = 20,
    } = filters;

    // 1. Carrega dados persistidos (mocks / demos)
    const stored = localStorageService.load(STORAGE_KEY_MANUAL, getMockManualDocuments()) || [];

    // 2. Mescla com documentos voláteis de sessão
    const sessionList = Array.from(sessionDocuments.values());
    const all = [...sessionList, ...stored];

    let result = all;

    // Filtro por tipo de documento (NFE | NFSE)
    if (documentType) {
      result = result.filter((d) => d.documentType === documentType);
    }

    // Filtro por status
    if (status) {
      result = result.filter((d) => d.status === status);
    }

    // Filtro por emitente / prestador
    if (emitenteId) {
      result = result.filter((d) => d.emitenteId === emitenteId || d.prestadorId === emitenteId);
    }

    // Busca textual flexível
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter((d) => {
        const titulo = (d.titulo || '').toLowerCase();
        const num = (d.numeroPrevisto || '').toLowerCase();
        const em = (d.emitente?.razaoSocial || d.prestador?.razaoSocial || '').toLowerCase();
        const cl = (d.destinatario?.nomeOuRazao || d.tomador?.nomeOuRazao || '').toLowerCase();
        const doc = (d.destinatario?.documento || d.tomador?.documento || '').replace(/\D/g, '');
        return titulo.includes(q) || num.includes(q) || em.includes(q) || cl.includes(q) || doc.includes(q.replace(/\D/g, ''));
      });
    }

    // Filtro por data
    if (startDate) {
      result = result.filter((d) => (d.dataPrevistaEmissao || d.createdAt || '') >= startDate);
    }
    if (endDate) {
      result = result.filter((d) => (d.dataPrevistaEmissao || d.createdAt || '') <= endDate);
    }

    // Filtro por valor
    if (minValue) {
      const minClean = cleanDecimalString(String(minValue));
      result = result.filter((d) => {
        const v = d.documentType === 'NFE' ? d.totais?.valorTotalNota : d.valores?.valorBruto;
        return decimalCompare(cleanDecimalString(v || '0'), minClean) >= 0;
      });
    }
    if (maxValue) {
      const maxClean = cleanDecimalString(String(maxValue));
      result = result.filter((d) => {
        const v = d.documentType === 'NFE' ? d.totais?.valorTotalNota : d.valores?.valorBruto;
        return decimalCompare(cleanDecimalString(v || '0'), maxClean) <= 0;
      });
    }

    const total = result.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = result.slice(startIndex, startIndex + limitNum);

    return {
      data: deepClone(paginated),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    };
  },

  /**
   * Localiza um documento por ID (na sessão ou no storage)
   */
  async findById(id) {
    if (!id) return null;

    if (sessionDocuments.has(id)) {
      return deepClone(sessionDocuments.get(id));
    }

    const stored = localStorageService.load(STORAGE_KEY_MANUAL, getMockManualDocuments()) || [];
    const found = stored.find((d) => d.id === id);
    return deepClone(found || null);
  },

  /**
   * Cria um novo documento manual (NF-e ou NFS-e)
   */
  async create(data) {
    return withMutationLock(async () => {
      if (!data || !data.documentType) {
        throw new Error('Tipo de documento obrigatório (NFE ou NFSE).');
      }

      const id = data.id || `draft-${data.documentType.toLowerCase()}-${Date.now()}`;
      const now = new Date().toISOString();

      let newDoc = {
        ...deepClone(data),
        id,
        origin: data.origin || 'MANUAL',
        status: data.status || 'DRAFT',
        createdAt: data.createdAt || now,
        updatedAt: now,
      };

      // Recalcula totais específicos
      if (newDoc.documentType === 'NFE') {
        newDoc = recalculateNFeTotals(newDoc);
      } else if (!newDoc.valores?.preservarValoresOriginais) {
        newDoc = recalculateNFSeValues(newDoc);
      }

      // Regra de segurança e privacidade:
      // Se for explicitamente identificado como mock/demo, salva no storage.
      // Se for dado real inserido manualmente no protótipo, isola em sessionDocuments.
      if (newDoc.isDemo) {
        const stored = localStorageService.load(STORAGE_KEY_MANUAL, getMockManualDocuments()) || [];
        stored.unshift(newDoc);
        localStorageService.save(STORAGE_KEY_MANUAL, stored);
      } else {
        sessionDocuments.set(id, newDoc);
      }

      return deepClone(newDoc);
    });
  },

  /**
   * Atualiza um documento existente
   */
  async update(id, data) {
    return withMutationLock(async () => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Documento "${id}" não encontrado para atualização.`);
      }

      let updated = {
        ...existing,
        ...deepClone(data),
        id,
        updatedAt: new Date().toISOString(),
      };

      if (updated.documentType === 'NFE') {
        updated = recalculateNFeTotals(updated);
      } else if (!updated.valores?.preservarValoresOriginais) {
        updated = recalculateNFSeValues(updated);
      }

      if (sessionDocuments.has(id)) {
        sessionDocuments.set(id, updated);
      } else {
        const stored = localStorageService.load(STORAGE_KEY_MANUAL, getMockManualDocuments()) || [];
        const idx = stored.findIndex((d) => d.id === id);
        if (idx >= 0) {
          stored[idx] = updated;
          localStorageService.save(STORAGE_KEY_MANUAL, stored);
        } else {
          sessionDocuments.set(id, updated);
        }
      }

      return deepClone(updated);
    });
  },

  /**
   * Remove um documento manual
   */
  async delete(id) {
    return withMutationLock(async () => {
      if (sessionDocuments.has(id)) {
        sessionDocuments.delete(id);
        return true;
      }

      const stored = localStorageService.load(STORAGE_KEY_MANUAL, getMockManualDocuments()) || [];
      const filtered = stored.filter((d) => d.id !== id);
      localStorageService.save(STORAGE_KEY_MANUAL, filtered);
      return true;
    });
  },

  /**
   * Duplica um documento existente gerando um novo rascunho independente
   */
  async duplicate(id) {
    const original = await this.findById(id);
    if (!original) {
      throw new Error(`Documento "${id}" não encontrado para duplicação.`);
    }

    const newId = `draft-${original.documentType.toLowerCase()}-${Date.now()}`;
    const now = new Date().toISOString();

    const duplicated = {
      ...deepClone(original),
      id: newId,
      titulo: `${original.titulo || 'Documento'} (Cópia)`,
      numeroPrevisto: '',
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };

    if (duplicated.documentType === 'NFE' && Array.isArray(duplicated.itens)) {
      duplicated.itens = duplicated.itens.map((it, idx) => ({
        ...it,
        itemId: `item-${newId}-${idx + 1}`,
      }));
    }

    return this.create(duplicated);
  },

  /**
   * Valida a integridade do documento
   */
  async validate(id) {
    const doc = await this.findById(id);
    if (!doc) {
      throw new Error(`Documento "${id}" não encontrado para validação.`);
    }

    if (doc.documentType === 'NFE') {
      return validateNFe(doc);
    }
    return validateNFSe(doc);
  },

  /**
   * Converte uma NF-e de produtos manual para que ela possa ser utilizada como fonte no motor de preparações N:M.
   * Bloqueia terminantemente NFS-e de serviços!
   */
  async convertToPreparationSource(id) {
    const doc = await this.findById(id);
    if (!doc) {
      throw new Error(`Documento "${id}" não encontrado.`);
    }

    if (doc.documentType === 'NFSE') {
      throw new Error(
        'Operação bloqueada: NFS-e de serviços não pode ser alocada como mercadoria no motor N:M de preparação de exportação.'
      );
    }

    // Converte a NF-e manual em um formato compatível com o invoiceRepository
    const invoiceAdapted = {
      id: doc.id,
      numero: doc.numeroPrevisto || `MAN-${doc.id.slice(-6)}`,
      serie: doc.seriePrevista || '1',
      chaveAcesso: doc.chaveAcesso || `MANUAL-${doc.id}`,
      tipoDocumento: 'MANUAL',
      naturezaOperacao: doc.naturezaOperacao || 'EXPORTACAO DE MERCADORIAS',
      emissao: (doc.dataPrevistaEmissao || doc.createdAt || '').slice(0, 10),
      dataEmissao: doc.dataPrevistaEmissao || doc.createdAt,
      status: 'em_conferencia',
      isDemo: Boolean(doc.isDemo),
      emitente: {
        cnpj: doc.emitente?.cnpj || '',
        razaoSocial: doc.emitente?.razaoSocial || 'Emitente Manual',
        uf: doc.emitente?.uf || 'SP',
        municipio: doc.emitente?.municipio || 'Santos',
      },
      destinatario: {
        nome: doc.destinatario?.nomeOuRazao || 'Destinatário Manual',
        pais: doc.destinatario?.pais || 'Brasil',
        paisCodigo: doc.destinatario?.paisCodigo || 'BR',
        idEstrangeiro: doc.destinatario?.documento || '',
      },
      itens: (doc.itens || []).map((it, idx) => ({
        id: it.itemId || `man-${doc.id}-${idx + 1}`,
        item: it.item || idx + 1,
        codigo: it.codigo || `COD-${idx + 1}`,
        descricao: it.descricao || 'Produto sem descrição',
        ncm: it.ncm || '00000000',
        cfop: it.cfop || '7101',
        unidade: it.unidade || 'UN',
        quantidade: cleanDecimalString(it.quantidade || '0'),
        valorUnitario: cleanDecimalString(it.valorUnitario || '0'),
        valorTotal: cleanDecimalString(it.valorTotal || '0'),
        situacao: 'conferido',
        modificado: false,
      })),
      totais: {
        valorProdutos: doc.totais?.valorProdutos || '0.00',
        valorFrete: doc.totais?.valorFrete || '0.00',
        valorSeguro: doc.totais?.valorSeguro || '0.00',
        valorDesconto: doc.totais?.valorDesconto || '0.00',
        outrasDespesas: doc.totais?.outrasDespesas || '0.00',
        valorTotalNota: doc.totais?.valorTotalNota || '0.00',
        pesoLiquido: '0.000',
        pesoBruto: '0.000',
      },
    };

    // Disponibiliza na sessão do invoiceRepository
    sessionInvoices.set(doc.id, invoiceAdapted);

    return invoiceAdapted;
  },

  /**
   * Reseta os documentos de demonstração para os valores de fábrica
   */
  async resetAll() {
    sessionDocuments.clear();
    localStorageService.reset(STORAGE_KEY_MANUAL);
    return true;
  },
};

export default documentRepository;
