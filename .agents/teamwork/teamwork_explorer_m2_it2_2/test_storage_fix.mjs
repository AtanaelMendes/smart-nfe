import assert from 'node:assert/strict';

// We implement the proposed logic in a standalone test to verify all test cases
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
      // Remove any fallback copy from memory store if primary storage succeeded
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

    // Check memoryStore if backend is different from memoryStore and has fallback data
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

  function has(key) {
    if (!key) return false;
    try {
      const backend = getBackend();
      let raw = backend.getItem(key);
      if (backend !== memStorage) {
        const memRaw = memStorage.getItem(key);
        if (memRaw !== null && memRaw !== undefined) raw = memRaw;
      }
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed && parsed.version === STORAGE_SCHEMA_VERSION);
    } catch {
      return false;
    }
  }

  return { save, load, has, setCustomStorage, registerDefault, memoryStore };
}

// Test 1: QuotaExceeded write then read
const h = createTestHarness();
let throwOnSet = true;
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

const saved = h.save('ephemeral_key', { resilient: true });
assert.strictEqual(saved, false, 'save should return false on quota exceeded');
assert.strictEqual(h.has('ephemeral_key'), true, 'has should return true because key exists in memory fallback');

const loaded = h.load('ephemeral_key', null);
console.log('Loaded under QuotaExceeded:', loaded);
assert.deepStrictEqual(loaded, { resilient: true }, 'load should retrieve the data saved to memoryStore!');

// Test 2: When quota is freed, primary storage succeeds and memory copy is cleaned
throwOnSet = false;
const saved2 = h.save('ephemeral_key', { resilient: 'now_in_primary' });
assert.strictEqual(saved2, true, 'save should succeed when quota freed');
assert.strictEqual(h.memoryStore.has('ephemeral_key'), false, 'memory copy should be removed on successful primary save');
const loaded2 = h.load('ephemeral_key', null);
assert.deepStrictEqual(loaded2, { resilient: 'now_in_primary' });

console.log('ALL PROPOSED STORAGE LOGIC TESTS PASSED!');
