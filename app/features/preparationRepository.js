/**
 * SmartNFe — Repositório Assíncrono de Preparações de Exportação (N:M)
 *
 * Características:
 * - Gerencia o ciclo de vida completo de preparações (Agrupamento N->1, Divisão 1->M, Mista N->M)
 * - Dual-Storage: Isolamento estrito de sessão (sessionPreparations = new Map()) para origens reais
 *   e persistência versionada via localStorageService (STORAGE_KEYS.PREPARATIONS) para demonstrações
 * - Controle de concorrência com fila atômica serializada (withMutationLock) e autocura de falhas
 * - Gestão de rascunhos (drafts) e máquina de estados ('draft' | 'active' | 'completed' | 'cancelled')
 * - Extrator de alocações ativas (getActiveAllocations) com precisão decimal BigInt (decimal.js)
 *   para garantia da regra estrita de conservação: disponível = original - soma(alocações ativas)
 */

import { localStorageService, STORAGE_KEYS } from '../lib/storage/localStorageService.js';
import { cleanDecimalString, decimalAdd, roundDecimal } from '../lib/calculations/decimal.js';
import { sessionInvoices } from './invoiceRepository.js';

const STORAGE_KEY_PREPARATIONS = STORAGE_KEYS?.PREPARATIONS || 'smartnfe_preparations';

// Registro automático de fábrica no localStorageService
localStorageService.registerDefault(STORAGE_KEY_PREPARATIONS, () => []);

// ============================================================================
// Coleção Volátil em Memória de Sessão (Isolamento Fiscal / R3, R4 e R5)
// ============================================================================
export const sessionPreparations = new Map();

// ============================================================================
// Mutex Queue para Serialização de Mutações Concorrentes
// ============================================================================
let preparationMutationQueue = Promise.resolve();

/**
 * Enfileira uma mutação assíncrona garantindo execução atômica serializada.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
function withMutationLock(fn) {
  const resultPromise = preparationMutationQueue.then(
    () => fn(),
    () => fn()
  );
  preparationMutationQueue = resultPromise.catch(() => {});
  return resultPromise;
}

/**
 * Clona profundamente um valor para evitar efeitos colaterais de mutação externa.
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
 * Normaliza o status para padrão canônico minúsculo.
 * @param {string} status
 * @returns {'draft'|'active'|'completed'|'cancelled'}
 */
export function normalizePreparationStatus(status) {
  if (!status) return 'draft';
  const s = String(status).trim().toLowerCase();
  if (s === 'rascunho' || s === 'draft') return 'draft';
  if (s === 'ativa' || s === 'active') return 'active';
  if (s === 'concluida' || s === 'concluido' || s === 'concluído' || s === 'completed') return 'completed';
  if (s === 'cancelada' || s === 'cancelado' || s === 'cancelled' || s === 'canceled') return 'cancelled';
  return s;
}

/**
 * Determina se a preparação envolve qualquer documento fiscal real em memória volátil.
 * @param {Object} prep
 * @returns {boolean}
 */
export function isRealPreparation(prep) {
  if (!prep) return false;
  if (prep.isRealImport === true) return true;
  if (prep.isDemo === false) return true;

  // 1. Origens declaradas
  if (Array.isArray(prep.origens)) {
    for (const orig of prep.origens) {
      const origId = orig.invoiceId || orig.id;
      if (origId && sessionInvoices && sessionInvoices.has(origId)) return true;
      if (origId && !String(origId).startsWith('demo-')) return true;
      if (orig.isRealImport === true || orig.isDemo === false) return true;
    }
  }

  // 2. Chaves de origens múltiplas
  if (Array.isArray(prep.sourceInvoiceIds)) {
    if (prep.sourceInvoiceIds.some((id) => (sessionInvoices && sessionInvoices.has(id)) || !id.startsWith('demo-'))) return true;
  }

  // 3. Nota pai individual
  if (prep.parentInvoiceId && ((sessionInvoices && sessionInvoices.has(prep.parentInvoiceId)) || !prep.parentInvoiceId.startsWith('demo-'))) return true;

  // 4. Itens individuais com chave de origem
  if (Array.isArray(prep.itens)) {
    if (prep.itens.some((it) => it.sourceInvoiceId && ((sessionInvoices && sessionInvoices.has(it.sourceInvoiceId)) || !it.sourceInvoiceId.startsWith('demo-')))) return true;
  }

  return false;
}

/**
 * Obtém todas as preparações salvas no storage persistente.
 */
async function getAllPersistedPreparations() {
  const loaded = localStorageService.load(STORAGE_KEY_PREPARATIONS, null);
  if (Array.isArray(loaded)) return loaded;
  localStorageService.save(STORAGE_KEY_PREPARATIONS, []);
  return [];
}

/**
 * Salva a lista de preparações no storage persistente.
 */
async function saveAllPersistedPreparations(list) {
  localStorageService.save(STORAGE_KEY_PREPARATIONS, list);
}

export const preparationRepository = {
  /**
   * Lista preparações com filtros opcionais.
   * Mescla a sessão volátil em memória no topo com as preparações do LocalStorage.
   * @param {Object} filters
   * @param {string|string[]} [filters.status] Filtro de status ('draft', 'active', 'completed', 'cancelled', 'todos')
   * @param {string} [filters.type] Filtro de tipo ('agrupamento', 'divisao', 'mista')
   * @param {string} [filters.query] Busca textual (número, título, cliente de exportação)
   * @param {string} [filters.clienteExportacaoId] Filtro por ID do cliente de exportação
   * @returns {Promise<Array<Object>>}
   */
  async list(filters = {}) {
    const persisted = await getAllPersistedPreparations();
    const sessionDocs = Array.from(sessionPreparations.values());

    const sessionIds = new Set(sessionDocs.map((doc) => doc.id));
    const uniquePersisted = persisted.filter((doc) => !sessionIds.has(doc.id));

    let list = [...sessionDocs, ...uniquePersisted];

    // 1. Filtro por status
    const statusFilter = filters.status;
    if (statusFilter && statusFilter !== 'todos' && statusFilter !== 'all' && statusFilter !== 'ALL') {
      const allowed = Array.isArray(statusFilter)
        ? statusFilter.map(normalizePreparationStatus)
        : [normalizePreparationStatus(statusFilter)];

      list = list.filter((p) => allowed.includes(normalizePreparationStatus(p.status)));
    }

    // 2. Filtro por tipo
    const typeFilter = filters.type || filters.tipo;
    if (typeFilter && typeFilter !== 'todos' && typeFilter !== 'all') {
      const targetType = String(typeFilter).toLowerCase();
      list = list.filter((p) => String(p.tipo || '').toLowerCase() === targetType);
    }

    // 3. Filtro por cliente de exportação atribuído
    if (filters.clienteExportacaoId) {
      list = list.filter((p) => p.clienteExportacao?.id === filters.clienteExportacaoId);
    }

    // 4. Busca textual
    if (filters.query && typeof filters.query === 'string' && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      list = list.filter((p) => {
        const num = String(p.numero || '').toLowerCase();
        const tit = String(p.titulo || '').toLowerCase();
        const cli = String(p.clienteExportacao?.nome || '').toLowerCase();
        const obs = String(p.observacoes || '').toLowerCase();
        const destMatch = Array.isArray(p.destinos) && p.destinos.some((d) => String(d.nome || '').toLowerCase().includes(q));
        const origMatch = Array.isArray(p.origens) && p.origens.some((o) => String(o.numero || '').toLowerCase().includes(q));
        return num.includes(q) || tit.includes(q) || cli.includes(q) || obs.includes(q) || destMatch || origMatch;
      });
    }

    return deepClone(list);
  },

  /**
   * Busca preparação por ID.
   * Consulta primeiro a sessão volátil em memória e, em seguida, o LocalStorage.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!id) return null;

    if (sessionPreparations.has(id)) {
      return deepClone(sessionPreparations.get(id));
    }

    const list = await getAllPersistedPreparations();
    const found = list.find((p) => p.id === id);
    return found ? deepClone(found) : null;
  },

  /**
   * Cria uma nova preparação ou rascunho.
   * Se envolver documentos reais de XML, salva exclusivamente na sessão volátil.
   * @param {Object} preparationData
   * @returns {Promise<Object>}
   */
  async create(preparationData) {
    return withMutationLock(async () => {
      if (!preparationData) {
        throw new Error('Dados da preparação são obrigatórios');
      }

      const isReal = isRealPreparation(preparationData);
      const id =
        preparationData.id ||
        `prep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const numero =
        preparationData.numero ||
        `PREP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

      const status = normalizePreparationStatus(preparationData.status || 'draft');

      const newEntry = {
        ...preparationData,
        id,
        numero,
        titulo: preparationData.titulo || `Preparação ${numero}`,
        tipo: preparationData.tipo || 'mista',
        status,
        isDemo: isReal ? false : (preparationData.isDemo ?? true),
        isRealImport: isReal,
        origens: Array.isArray(preparationData.origens) ? preparationData.origens : [],
        destinos: Array.isArray(preparationData.destinos) ? preparationData.destinos : [],
        alocacoes: preparationData.alocacoes || preparationData.allocations || {},
        criadoEm: preparationData.criadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };

      if (isReal) {
        sessionPreparations.set(newEntry.id, deepClone(newEntry));
        return deepClone(newEntry);
      }

      const list = await getAllPersistedPreparations();
      const updated = [newEntry, ...list.filter((p) => p.id !== id)];
      await saveAllPersistedPreparations(updated);
      return deepClone(newEntry);
    });
  },

  /**
   * Atualiza dados parciais de uma preparação existente.
   * Preserva a segregação de armazenamento e atualiza o timestamp atualizadoEm.
   * @param {string} id
   * @param {Object} partialData
   * @returns {Promise<Object>}
   */
  async update(id, partialData) {
    return withMutationLock(async () => {
      if (!id) {
        throw new Error('ID da preparação é obrigatório para atualização');
      }

      const status = partialData.status ? normalizePreparationStatus(partialData.status) : undefined;

      // 1. Caso resida na sessão volátil
      if (sessionPreparations.has(id)) {
        const existing = sessionPreparations.get(id);
        const updated = {
          ...existing,
          ...partialData,
          ...(status ? { status } : {}),
          id: existing.id,
          atualizadoEm: new Date().toISOString(),
        };
        sessionPreparations.set(id, deepClone(updated));
        return deepClone(updated);
      }

      // 2. Caso seja persistida no LocalStorage
      const list = await getAllPersistedPreparations();
      const index = list.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error(`Preparação não encontrada: ${id}`);
      }

      const existing = list[index];
      const updated = {
        ...existing,
        ...partialData,
        ...(status ? { status } : {}),
        id: existing.id,
        atualizadoEm: new Date().toISOString(),
      };

      if (isRealPreparation(updated)) {
        sessionPreparations.set(id, deepClone(updated));
        const filtered = list.filter((p) => p.id !== id);
        await saveAllPersistedPreparations(filtered);
        return deepClone(updated);
      }

      list[index] = updated;
      await saveAllPersistedPreparations(list);
      return deepClone(updated);
    });
  },

  /**
   * Exclui uma preparação pelo ID (da sessão ou do LocalStorage).
   * Libera imediatamente as alocações vinculadas.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    return withMutationLock(async () => {
      if (!id) return false;

      if (sessionPreparations.has(id)) {
        sessionPreparations.delete(id);
        return true;
      }

      const list = await getAllPersistedPreparations();
      const filtered = list.filter((p) => p.id !== id);
      const wasRemoved = filtered.length !== list.length;
      if (wasRemoved) {
        await saveAllPersistedPreparations(filtered);
      }
      return wasRemoved;
    });
  },

  /**
   * Extrai o mapa consolidado de alocações ativas em preparações válidas,
   * somando as quantidades comprometidas por chave `${sourceInvoiceId}__${sourceItemId}`.
   *
   * @param {string} [excludePreparationId] ID da preparação a ignorar (ex: edição atual)
   * @param {Object} [options]
   * @param {boolean} [options.includeDrafts=true] Se rascunhos devem reservar saldo
   * @returns {Promise<Map<string, string> & { toObject: () => Record<string, string> }>}
   */
  async getActiveAllocations(excludePreparationId = null, options = {}) {
    const includeDrafts = options.includeDrafts !== false;

    // Obtém todas as preparações existentes em sessão e persistentes
    const list = await this.list();
    const allocationsMap = new Map();

    /**
     * Soma com precisão decimal BigInt de 4 casas
     */
    function accumulate(sourceKey, rawQty) {
      if (!sourceKey || rawQty === undefined || rawQty === null) return;
      const clean = cleanDecimalString(rawQty);
      if (clean === '0' || clean === '0.0000') return;

      const current = allocationsMap.get(sourceKey) || '0.0000';
      const sum = decimalAdd(current, clean, 4);
      allocationsMap.set(sourceKey, sum);
    }

    for (const prep of list) {
      // 1. Ignora a preparação corrente sendo editada
      if (excludePreparationId && prep.id === excludePreparationId) {
        continue;
      }

      const st = normalizePreparationStatus(prep.status);

      // 2. Preparações canceladas NUNCA retêm alocações
      if (st === 'cancelled') {
        continue;
      }

      // 3. Rascunhos só retêm saldo se includeDrafts for true
      if (st === 'draft' && !includeDrafts) {
        continue;
      }

      // 4. Extração de prep.alocacoes ou prep.allocations (Record<chave, quantidade>)
      const alocObj = prep.alocacoes || prep.allocations;
      if (alocObj && typeof alocObj === 'object') {
        for (const [key, qty] of Object.entries(alocObj)) {
          const parts = key.split('__');
          // Formato: sourceInvoiceId__sourceItemId__destId OU sourceInvoiceId__sourceItemId
          const sourceKey = parts.length >= 2 ? `${parts[0]}__${parts[1]}` : key;
          accumulate(sourceKey, qty);
        }
      }

      // 5. Extração de destinos[].allocations
      if (Array.isArray(prep.destinos)) {
        for (const dest of prep.destinos) {
          const destAlloc = dest.allocations || dest.alocacoes;
          if (destAlloc && typeof destAlloc === 'object') {
            for (const [key, qty] of Object.entries(destAlloc)) {
              const parts = key.split('__');
              const sourceKey = parts.length >= 2 ? `${parts[0]}__${parts[1]}` : key;
              accumulate(sourceKey, qty);
            }
          }
          if (Array.isArray(dest.itens)) {
            for (const it of dest.itens) {
              const sInv = it.sourceInvoiceId;
              const sItm = it.sourceItemId || it.id;
              if (sInv && sItm) {
                accumulate(`${sInv}__${sItm}`, it.quantidade);
              }
            }
          }
        }
      }

      // 6. Extração de itens diretos
      if (Array.isArray(prep.itens)) {
        for (const it of prep.itens) {
          const sInv = it.sourceInvoiceId;
          const sItm = it.sourceItemId || it.id;
          if (sInv && sItm) {
            accumulate(`${sInv}__${sItm}`, it.quantidade);
          }
        }
      }
    }

    // Adiciona método ergonômico toObject() para interoperabilidade com objetos planos
    allocationsMap.toObject = function () {
      return Object.fromEntries(allocationsMap.entries());
    };

    return allocationsMap;
  },

  /**
   * Limpa a memória volátil de preparações.
   */
  clearSession() {
    sessionPreparations.clear();
  },

  /**
   * Retorna a contagem de preparações na sessão volátil.
   */
  getSessionCount() {
    return sessionPreparations.size;
  },

  /**
   * Verifica se uma preparação reside na sessão volátil.
   * @param {string} id
   * @returns {boolean}
   */
  isSessionPreparation(id) {
    return sessionPreparations.has(id);
  },

  /**
   * Restaura o repositório de preparações: limpa a memória volátil e reseta o LocalStorage.
   * @returns {Promise<void>}
   */
  async resetDemoData() {
    return withMutationLock(async () => {
      sessionPreparations.clear();
      localStorageService.reset(STORAGE_KEY_PREPARATIONS);
    });
  },
};

export default preparationRepository;
