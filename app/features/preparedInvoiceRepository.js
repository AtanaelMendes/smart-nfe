/**
 * SmartNFe — Repositório Assíncrono de Notas Fiscais Preparadas
 *
 * Características:
 * - Gerencia notas resultantes de desmembramento, agrupamento e divisão de exportação (N -> M)
 * - Isolamento de Sessão Fiscal: XMLs reais importados e notas preparadas originadas de documentos
 *   reais são mantidos exclusivamente em memória volátil (sessionPreparedInvoices = new Map()),
 *   SEM persistência em localStorage (proteção de privacidade e prevenção de vazamento de dados fiscais)
 * - Persistência versionada via localStorageService apenas para cenários de demonstração (demo-01 a demo-05)
 * - Geração automática de identificadores e data de criação
 * - Suporte a consultas tanto por parentInvoiceId quanto por sourceInvoiceIds / documentoOrigemId
 */

import { localStorageService, STORAGE_KEYS } from '../lib/storage/localStorageService.js';
import { getMockPreparedInvoices } from '../lib/data/mockInvoices.js';
import { sessionInvoices } from './invoiceRepository.js';

// ============================================================================
// Coleção Volátil em Memória de Sessão (Isolamento Fiscal R4 / R5)
// ============================================================================
export const sessionPreparedInvoices = new Map();

// Registro automático da fábrica de mocks para autorrecuperação e reset
localStorageService.registerDefault(
  STORAGE_KEYS.PREPARED_INVOICES,
  () => getMockPreparedInvoices()
);

// ==========================================
// Mutex Queue para Serialização de Mutações
// ==========================================
let preparedMutationQueue = Promise.resolve();

/**
 * Enfileira uma mutação assíncrona para garantir execução serializada e atômica.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
function withMutationLock(fn) {
  const resultPromise = preparedMutationQueue.then(
    () => fn(),
    () => fn()
  );
  preparedMutationQueue = resultPromise.catch(() => {});
  return resultPromise;
}

/**
 * Clona profundamente um valor para evitar vazamentos de referência.
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
 * Determina se a nota preparada provém de importação real de XML fiscal.
 * @param {object} p - Objeto da nota preparada
 * @returns {boolean}
 */
export function isRealPreparedInvoice(p) {
  if (!p) return false;
  if (p.isRealImport === true) return true;
  if (p.isDemo === false) return true;

  // Verifica parentInvoiceId
  const parentId = p.parentInvoiceId || p.documentoOrigemId;
  if (typeof parentId === 'string' && parentId.length > 0) {
    if (!parentId.startsWith('demo-')) return true;
    if (sessionInvoices && sessionInvoices.has(parentId)) return true;
  }

  // Verifica array sourceInvoiceIds
  if (Array.isArray(p.sourceInvoiceIds) && p.sourceInvoiceIds.length > 0) {
    if (p.sourceInvoiceIds.some((id) => typeof id === 'string' && (!id.startsWith('demo-') || (sessionInvoices && sessionInvoices.has(id))))) {
      return true;
    }
  }

  // Verifica array de origens
  if (Array.isArray(p.origens) && p.origens.length > 0) {
    if (p.origens.some((o) => {
      const oId = o.invoiceId || o.id;
      return (oId && !String(oId).startsWith('demo-')) || o.isRealImport === true;
    })) {
      return true;
    }
  }

  return false;
}

/**
 * Obtém todas as notas preparadas salvas no storage persistente (apenas demo).
 */
async function getAllPrepared() {
  const loaded = localStorageService.load(STORAGE_KEYS.PREPARED_INVOICES, null);
  if (Array.isArray(loaded)) {
    return loaded;
  }
  const initial = getMockPreparedInvoices();
  localStorageService.save(STORAGE_KEYS.PREPARED_INVOICES, initial);
  return initial;
}

/**
 * Salva a lista de notas preparadas no localStorage.
 */
async function saveAllPrepared(list) {
  localStorageService.save(STORAGE_KEYS.PREPARED_INVOICES, list);
}

export const preparedInvoiceRepository = {
  /**
   * Lista notas preparadas com filtros opcionais.
   * Mescla documentos reais da sessão volátil com as notas demo do storage.
   * @param {Object} filters
   * @param {string} [filters.query] Busca textual (número, destinatário, lote, descrição)
   * @param {string} [filters.parentInvoiceId] Filtro por NF original
   * @param {string} [filters.sourceInvoiceId] Filtro por NF de origem (sinônimo de parentInvoiceId)
   * @param {string} [filters.status] Filtro por status
   * @returns {Promise<Array<Object>>}
   */
  async list(filters = {}) {
    const sessionList = Array.from(sessionPreparedInvoices.values());
    const persistedList = await getAllPrepared();

    // Elimina eventuais duplicatas de ID, priorizando a versão em sessão
    const sessionIds = new Set(sessionList.map((p) => p.id));
    let list = [...sessionList, ...persistedList.filter((p) => !sessionIds.has(p.id))];

    // 1. Busca textual
    if (filters.query && typeof filters.query === 'string' && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      list = list.filter((p) => {
        const num = String(p.numero || '').toLowerCase();
        const origem = String(p.origemNumero || p.numeroOrigem || '').toLowerCase();
        const dest = String(p.destinatario?.nome || p.destinatario?.razaoSocial || '').toLowerCase();
        const desc = String(p.descricaoLote || p.nomePreparacao || '').toLowerCase();
        return num.includes(q) || origem.includes(q) || dest.includes(q) || desc.includes(q);
      });
    }

    // 2. Filtro por NF de origem (suporte dual a parentInvoiceId e sourceInvoiceIds)
    const targetParentId = filters.parentInvoiceId || filters.sourceInvoiceId;
    if (targetParentId) {
      list = list.filter((p) => {
        if (p.parentInvoiceId === targetParentId) return true;
        if (p.documentoOrigemId === targetParentId) return true;
        if (Array.isArray(p.sourceInvoiceIds) && p.sourceInvoiceIds.includes(targetParentId)) return true;
        if (Array.isArray(p.origens) && p.origens.some((o) => (o.invoiceId === targetParentId || o.id === targetParentId))) return true;
        return false;
      });
    }

    // 3. Filtro por status
    if (filters.status && filters.status !== 'todos' && filters.status !== 'all') {
      list = list.filter((p) => p.status === filters.status);
    }

    return deepClone(list);
  },

  /**
   * Busca nota preparada por ID (verifica sessão volátil primeiro, depois localStorage).
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!id) return null;

    if (sessionPreparedInvoices.has(id)) {
      return deepClone(sessionPreparedInvoices.get(id));
    }

    const list = await getAllPrepared();
    const found = list.find((p) => p.id === id);
    return found ? deepClone(found) : null;
  },

  /**
   * Sinônimo de findById para conformidade com a interface getById.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    return this.findById(id);
  },

  /**
   * Cadastra uma nova nota preparada.
   * Se for proveniente de importação real, armazena EXCLUSIVAMENTE em sessionPreparedInvoices (Map).
   * Se for nota de demonstração, armazena no localStorageService.
   * @param {Object} preparedInvoice Dados da nota preparada
   * @returns {Promise<Object>}
   */
  async create(preparedInvoice) {
    return withMutationLock(async () => {
      if (!preparedInvoice) {
        throw new Error('Dados da nota preparada são obrigatórios');
      }

      const id =
        preparedInvoice.id ||
        `prep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const isReal = isRealPreparedInvoice(preparedInvoice);

      const newEntry = {
        ...preparedInvoice,
        id,
        isRealImport: isReal ? true : Boolean(preparedInvoice.isRealImport),
        isDemo: isReal ? false : (preparedInvoice.isDemo ?? true),
        status: preparedInvoice.status || 'preparado',
        dataCriacao: preparedInvoice.dataCriacao || new Date().toISOString(),
      };

      if (isReal) {
        // Armazenamento estritamente em memória de sessão — ZERO vazamento para localStorage!
        sessionPreparedInvoices.set(id, newEntry);
        return deepClone(newEntry);
      }

      // Preparações puramente de demonstração vão para o localStorage
      const list = await getAllPrepared();
      const updated = [newEntry, ...list.filter((p) => p.id !== id)];
      await saveAllPrepared(updated);
      return deepClone(newEntry);
    });
  },

  /**
   * Remove uma nota preparada pelo ID.
   * @param {string} id
   * @returns {Promise<boolean>} true se foi removida, false se não encontrada
   */
  async delete(id) {
    return withMutationLock(async () => {
      if (!id) return false;

      let wasRemoved = false;
      if (sessionPreparedInvoices.has(id)) {
        sessionPreparedInvoices.delete(id);
        wasRemoved = true;
      }

      const list = await getAllPrepared();
      const filtered = list.filter((p) => p.id !== id);
      if (filtered.length !== list.length) {
        await saveAllPrepared(filtered);
        wasRemoved = true;
      }

      return wasRemoved;
    });
  },

  /**
   * Atualiza dados parciais de uma nota preparada.
   * @param {string} id
   * @param {Object} partialData
   * @returns {Promise<Object>}
   */
  async update(id, partialData) {
    return withMutationLock(async () => {
      if (!id) throw new Error('ID é obrigatório para atualização');

      // Se a nota reside na sessão volátil
      if (sessionPreparedInvoices.has(id)) {
        const existing = sessionPreparedInvoices.get(id);
        const updated = {
          ...existing,
          ...partialData,
          id,
          atualizadoEm: new Date().toISOString(),
        };
        sessionPreparedInvoices.set(id, updated);
        return deepClone(updated);
      }

      // Se a nota reside no storage persistente
      const list = await getAllPrepared();
      const index = list.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error(`Nota preparada não encontrada: ${id}`);
      }

      const updated = {
        ...list[index],
        ...partialData,
        id: list[index].id,
        atualizadoEm: new Date().toISOString(),
      };

      // Se a atualização a marcou como real, migra para session e remove do localStorage
      if (isRealPreparedInvoice(updated)) {
        sessionPreparedInvoices.set(id, updated);
        const filtered = list.filter((p) => p.id !== id);
        await saveAllPrepared(filtered);
        return deepClone(updated);
      }

      list[index] = updated;
      await saveAllPrepared(list);
      return deepClone(updated);
    });
  },

  /**
   * Restaura as notas preparadas de fábrica e limpa a sessão volátil.
   * @returns {Promise<void>}
   */
  async resetDemoData() {
    return withMutationLock(async () => {
      sessionPreparedInvoices.clear();
      localStorageService.reset(STORAGE_KEYS.PREPARED_INVOICES);
    });
  },

  /**
   * Limpa exclusivamente a coleção volátil de sessão.
   */
  clearSession() {
    sessionPreparedInvoices.clear();
  },
};

export default preparedInvoiceRepository;
