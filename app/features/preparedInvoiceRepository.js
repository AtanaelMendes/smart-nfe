/**
 * SmartNFe — Repositório Assíncrono de Notas Fiscais Preparadas
 *
 * Características:
 * - Gerencia notas resultantes de desmembramento e divisão de exportação
 * - Persistência versionada via localStorageService (STORAGE_KEYS.PREPARED_INVOICES)
 * - Geração automática de identificadores e data de criação
 * - Suporte a filtros por NF original (parentInvoiceId) e busca textual
 */

import { localStorageService, STORAGE_KEYS } from '../lib/storage/localStorageService.js';
import { getMockPreparedInvoices } from '../lib/data/mockInvoices.js';

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
 * Clona profundamente um valor.
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
 * Obtém todas as notas preparadas salvas no storage.
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
 * Salva a lista de notas preparadas.
 */
async function saveAllPrepared(list) {
  localStorageService.save(STORAGE_KEYS.PREPARED_INVOICES, list);
}

export const preparedInvoiceRepository = {
  /**
   * Lista notas preparadas com filtros opcionais.
   * @param {Object} filters
   * @param {string} [filters.query] Busca textual (número, destinatário, lote)
   * @param {string} [filters.parentInvoiceId] Filtro por NF original
   * @param {string} [filters.status] Filtro por status
   * @returns {Promise<Array<Object>>}
   */
  async list(filters = {}) {
    let list = await getAllPrepared();

    // 1. Busca textual
    if (filters.query && typeof filters.query === 'string' && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      list = list.filter((p) => {
        const num = String(p.numero || '').toLowerCase();
        const origem = String(p.origemNumero || '').toLowerCase();
        const dest = String(p.destinatario?.nome || '').toLowerCase();
        const desc = String(p.descricaoLote || '').toLowerCase();
        return num.includes(q) || origem.includes(q) || dest.includes(q) || desc.includes(q);
      });
    }

    // 2. Filtro por NF de origem
    if (filters.parentInvoiceId) {
      list = list.filter((p) => p.parentInvoiceId === filters.parentInvoiceId);
    }

    // 3. Filtro por status
    if (filters.status && filters.status !== 'todos' && filters.status !== 'all') {
      list = list.filter((p) => p.status === filters.status);
    }

    return deepClone(list);
  },

  /**
   * Busca nota preparada por ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!id) return null;
    const list = await getAllPrepared();
    const found = list.find((p) => p.id === id);
    return found ? deepClone(found) : null;
  },

  /**
   * Cadastra uma nova nota preparada.
   * @param {Object} preparedInvoice Dados da nota preparada
   * @returns {Promise<Object>}
   */
  async create(preparedInvoice) {
    return withMutationLock(async () => {
      if (!preparedInvoice) {
        throw new Error('Dados da nota preparada são obrigatórios');
      }

      const list = await getAllPrepared();
      const id =
        preparedInvoice.id ||
        `prep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const newEntry = {
        ...preparedInvoice,
        id,
        status: preparedInvoice.status || 'preparado',
        dataCriacao: preparedInvoice.dataCriacao || new Date().toISOString(),
      };

      const updated = [newEntry, ...list];
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
      const list = await getAllPrepared();
      const filtered = list.filter((p) => p.id !== id);
      const wasRemoved = filtered.length !== list.length;
      if (wasRemoved) {
        await saveAllPrepared(filtered);
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

      list[index] = updated;
      await saveAllPrepared(list);
      return deepClone(updated);
    });
  },

  /**
   * Restaura as notas preparadas de fábrica.
   * @returns {Promise<void>}
   */
  async resetDemoData() {
    return withMutationLock(async () => {
      localStorageService.reset(STORAGE_KEYS.PREPARED_INVOICES);
    });
  },
};

export default preparedInvoiceRepository;
