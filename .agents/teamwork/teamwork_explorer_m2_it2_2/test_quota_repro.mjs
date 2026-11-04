import assert from 'node:assert/strict';
import {
  save,
  load,
  setCustomStorage,
} from '../../../app/lib/storage/localStorageService.js';

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
  key: (i) => Array.from(store.keys())[i] || null,
  get length() { return store.size; },
};

setCustomStorage(quotaStorage);

const saved = save('ephemeral_key', { resilient: true });
console.log('Saved result:', saved);

const loaded = load('ephemeral_key', null);
console.log('Loaded result:', loaded);
