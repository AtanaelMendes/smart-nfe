import assert from 'node:assert/strict';

function createTestHarness() {
  const STORAGE_SCHEMA_VERSION = '1.0.0';
  const defaultRegistry = new Map();
  function registerDefault(key, fn) { defaultRegistry.set(key, fn); }

  const memoryStore = new Map();
  const memStorage = {
    getItem: (k) => memoryStore.get(k) || null,
    setItem: (k, v) => memoryStore.set(k, String(v)),
    removeItem: (k) => memoryStore.delete(k),
    clear: () => memoryStore.clear(),
  };

  let activeBackend = null;
  function getBackend() { return activeBackend || memStorage; }
  function setCustomStorage(s) { activeBackend = s; }

  function deepClone(v) {
    if (!v) return v;
    return JSON.parse(JSON.stringify(v));
  }

  function save(key, data) {
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
      memStorage.removeItem(key);
      return true;
    } catch {
      memStorage.setItem(key, JSON.stringify(envelope));
      return false;
    }
  }

  function load(key, fallback = null) {
    if (!key) return fallback;
    const backend = getBackend();
    let raw = null;

    try {
      raw = backend.getItem(key);
    } catch {
      raw = null;
    }

    if (backend !== memStorage) {
      const memRaw = memStorage.getItem(key);
      if (memRaw !== null && memRaw !== undefined) {
        raw = memRaw;
      }
    }

    if (raw === null || raw === undefined) {
      if (defaultRegistry.has(key)) {
        const defaultData = defaultRegistry.get(key)();
        save(key, defaultData);
        return deepClone(defaultData);
      }
      return fallback;
    }

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

    if (!envelope || typeof envelope !== 'object' || !('version' in envelope) || !('data' in envelope)) {
      if (defaultRegistry.has(key)) {
        const defaultData = defaultRegistry.get(key)();
        save(key, defaultData);
        return deepClone(defaultData);
      }
      return fallback;
    }

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

  return { save, load, setCustomStorage, memoryStore };
}

const h = createTestHarness();
let throwOnSet = false;
const store = new Map();
const quotaStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => {
    if (throwOnSet) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    store.set(k, v);
  },
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
h.setCustomStorage(quotaStorage);

// Step 1: Save while quota is available
h.save('my_doc', { title: 'v1' });
assert.deepStrictEqual(h.load('my_doc'), { title: 'v1' });

// Step 2: Quota becomes full
throwOnSet = true;
const res = h.save('my_doc', { title: 'v2-updated-under-quota-full' });
assert.strictEqual(res, false);

// Step 3: Load should return v2, not the stale v1 from quotaStorage!
const loaded = h.load('my_doc');
console.log('Loaded after quota-exceeded update:', loaded);
assert.deepStrictEqual(loaded, { title: 'v2-updated-under-quota-full' });

console.log('SUCCESS: Stale primary storage correctly overridden by memory fallback!');
