/**
 * SmartNFe — Serviço Central de Persistência Local Versionada
 *
 * Características:
 * - Envelope padronizado: { version: "1.0.0", timestamp, data }
 * - Versionamento estrito com STORAGE_SCHEMA_VERSION = "1.0.0"
 * - Multi-ambiente: Browser, SSR (Next.js) e Node.js test runner
 * - Fallback em memória transparente (MemoryStorage) para modo anônimo e quota cheia
 * - Auto-restauração contra JSON corrompido e version mismatch
 * - Registro desacoplado de mocks de fábrica (registerDefault)
 */

export const STORAGE_SCHEMA_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  INVOICES: 'smartnfe_invoices',
  PREPARED_INVOICES: 'smartnfe_prepared_invoices',
  SETTINGS: 'smartnfe_settings',
  DIVISIONS: 'smartnfe_divisions',
};

/**
 * Provedor de armazenamento em memória volátil.
 * Utilizado em SSR, Node.js e quando localStorage estiver bloqueado.
 */
function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    clear: () => { map.clear(); },
    key: (index) => Array.from(map.keys())[index] || null,
    get length() { return map.size; },
  };
}

// Armazenamento em memória para fallbacks
const memoryStore = createMemoryStorage();

// Registro de fábricas de mock padrão para autorrecuperação
const defaultRegistry = new Map();

/**
 * Backend ativo de storage.
 */
let activeBackend = null;
let quotaExceeded = false;

function getBackend() {
  if (activeBackend) return activeBackend;

  // 1. Verifica se estamos no browser e se window.localStorage responde
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const probeKey = '__smartnfe_storage_probe__';
      window.localStorage.setItem(probeKey, '1');
      window.localStorage.removeItem(probeKey);
      activeBackend = window.localStorage;
      return activeBackend;
    } catch {
      // LocalStorage inacessível (ex: modo anônimo restritivo)
    }
  }

  // 2. Verifica se estamos em Node.js com globalThis.localStorage funcional
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    try {
      const probeKey = '__smartnfe_storage_probe__';
      globalThis.localStorage.setItem(probeKey, '1');
      globalThis.localStorage.removeItem(probeKey);
      activeBackend = globalThis.localStorage;
      return activeBackend;
    } catch {
      // ignore
    }
  }

  // 3. Fallback seguro para armazenamento em memória
  activeBackend = memoryStore;
  return activeBackend;
}

/**
 * Clona profundamente um valor para evitar mutações acidentais por referência.
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
 * Registra uma função geradora de dados de fábrica para uma determinada chave.
 * @param {string} key
 * @param {Function} factoryFn
 */
export function registerDefault(key, factoryFn) {
  if (typeof factoryFn === 'function') {
    defaultRegistry.set(key, factoryFn);
  }
}

/**
 * Salva dados no storage sob envelope versionado.
 * @param {string} key Chave de armazenamento
 * @param {any} data Dados a persistir
 * @returns {boolean} true se persistido com sucesso, false caso contrário
 */
export function save(key, data) {
  if (!key) return false;

  const envelope = {
    version: STORAGE_SCHEMA_VERSION,
    timestamp: Date.now(),
    data: deepClone(data),
  };

  try {
    const serialized = JSON.stringify(envelope);
    const backend = getBackend();
    backend.setItem(key, serialized);
    // Limpa cópia em memória caso tenha sido resolvida no storage primário
    if (backend !== memoryStore) {
      memoryStore.removeItem(key);
    }
    quotaExceeded = false;
    return true;
  } catch {
    // Tratamento de QuotaExceededError ou falha de escrita
    quotaExceeded = true;
    memoryStore.setItem(key, JSON.stringify(envelope));
    return false;
  }
}

/**
 * Carrega dados do storage validando envelope e versão de schema.
 * @param {string} key Chave de armazenamento
 * @param {any} fallback Valor padrão caso não exista ou esteja corrompido
 * @returns {any} Dados desempacotados
 */
export function load(key, fallback = null) {
  if (!key) return fallback;

  const backend = getBackend();
  let raw = null;

  try {
    raw = backend.getItem(key);
  } catch {
    raw = null;
  }

  // Se o backend primário não for memoryStore, verifica se há dados salvos sob fallback
  if (backend !== memoryStore) {
    try {
      const memRaw = memoryStore.getItem(key);
      if (memRaw !== null && memRaw !== undefined) {
        raw = memRaw;
      }
    } catch {
      // ignore
    }
  }

  // 1. Caso a chave não exista no storage
  if (raw === null || raw === undefined) {
    if (defaultRegistry.has(key)) {
      const defaultData = defaultRegistry.get(key)();
      save(key, defaultData);
      return deepClone(defaultData);
    }
    return fallback;
  }

  // 2. Tenta fazer parse do envelope JSON
  let envelope = null;
  try {
    envelope = JSON.parse(raw);
  } catch {
    if (defaultRegistry.has(key)) {
      const defaultData = defaultRegistry.get(key)();
      save(key, defaultData);
      return deepClone(defaultData);
    }
    return fallback;
  }

  // 3. Validação estrutural do envelope
  if (!envelope || typeof envelope !== 'object' || !('version' in envelope) || !('data' in envelope)) {
    if (defaultRegistry.has(key)) {
      const defaultData = defaultRegistry.get(key)();
      save(key, defaultData);
      return deepClone(defaultData);
    }
    return fallback;
  }

  // 4. Validação de versão de schema (version mismatch)
  if (envelope.version !== STORAGE_SCHEMA_VERSION) {
    if (defaultRegistry.has(key)) {
      const defaultData = defaultRegistry.get(key)();
      save(key, defaultData);
      return deepClone(defaultData);
    }
    return fallback;
  }

  return deepClone(envelope.data);
}

/**
 * Restaura uma chave específica para o valor de fábrica registrado.
 * @param {string} key
 * @returns {any} Dados restaurados ou null
 */
export function reset(key) {
  if (!key) return null;

  if (defaultRegistry.has(key)) {
    const defaultData = defaultRegistry.get(key)();
    save(key, defaultData);
    return deepClone(defaultData);
  }

  remove(key);
  return null;
}

/**
 * Remove uma chave do storage e da memória.
 * @param {string} key
 */
export function remove(key) {
  if (!key) return;
  try {
    getBackend().removeItem(key);
  } catch {
    // ignore
  }
  memoryStore.removeItem(key);
}

/**
 * Restaura TODAS as chaves do SmartNFe para o estado inicial de fábrica.
 */
export function resetAll() {
  // 1. Restaura todas as chaves padrão conhecidas
  for (const key of Object.values(STORAGE_KEYS)) {
    reset(key);
  }

  // 2. Limpa qualquer chave residual smartnfe_* não registrada
  try {
    const backend = getBackend();
    const toRemove = [];
    for (let i = 0; i < backend.length; i++) {
      const k = backend.key(i);
      if (k && k.startsWith('smartnfe_') && !Object.values(STORAGE_KEYS).includes(k)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => backend.removeItem(k));
  } catch {
    // ignore
  }

  memoryStore.clear();
  quotaExceeded = false;
}

/**
 * Verifica se uma chave existe e está na versão de schema correta.
 * @param {string} key
 * @returns {boolean}
 */
export function has(key) {
  if (!key) return false;
  try {
    const backend = getBackend();
    let raw = backend.getItem(key);
    if (backend !== memoryStore) {
      const memRaw = memoryStore.getItem(key);
      if (memRaw !== null && memRaw !== undefined) {
        raw = memRaw;
      }
    }
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && parsed.version === STORAGE_SCHEMA_VERSION);
  } catch {
    return false;
  }
}

/**
 * Informações de diagnóstico sobre uma chave.
 * @param {string} key
 * @returns {Object}
 */
export function getInfo(key) {
  try {
    const backend = getBackend();
    let raw = backend.getItem(key);
    if (backend !== memoryStore) {
      const memRaw = memoryStore.getItem(key);
      if (memRaw !== null && memRaw !== undefined) {
        raw = memRaw;
      }
    }
    if (!raw) return { exists: false };
    const parsed = JSON.parse(raw);
    return {
      exists: true,
      version: parsed.version,
      timestamp: parsed.timestamp,
      dataSize: raw.length,
      isCurrentSchema: parsed.version === STORAGE_SCHEMA_VERSION,
    };
  } catch {
    return { exists: false, corrupted: true };
  }
}

/**
 * Informa se o localStorage nativo do navegador está ativo.
 * @returns {boolean}
 */
export function isAvailable() {
  return typeof window !== 'undefined' && getBackend() === window.localStorage;
}

/**
 * Permite injetar backend customizado nos testes (ex: simulação de erro de quota).
 * @param {Storage|null} custom
 */
export function setCustomStorage(custom) {
  activeBackend = custom;
  quotaExceeded = false;
}

/**
 * Informa se o armazenamento em fallback de memória está ativo devido a erro de quota.
 * @returns {boolean}
 */
export function isQuotaExceeded() {
  return quotaExceeded;
}

/**
 * Exportação default agrupada para facilitar importação por desestruturação.
 */
export const localStorageService = {
  STORAGE_SCHEMA_VERSION,
  STORAGE_KEYS,
  save,
  load,
  reset,
  resetAll,
  remove,
  has,
  getInfo,
  isAvailable,
  isQuotaExceeded,
  registerDefault,
  setCustomStorage,
};

export default localStorageService;
