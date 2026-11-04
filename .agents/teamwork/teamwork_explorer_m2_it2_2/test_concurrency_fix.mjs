import assert from 'node:assert/strict';
import { invoiceRepository } from '../../../app/features/invoiceRepository.js';
import { setCustomStorage } from '../../../app/lib/storage/localStorageService.js';

let mutationQueue = Promise.resolve();
function withMutationLock(fn) {
  const next = mutationQueue.then(() => fn(), () => fn());
  mutationQueue = next.catch(() => {});
  return next;
}

// Monkey-patch updateItem with withMutationLock
const originalUpdateItem = invoiceRepository.updateItem.bind(invoiceRepository);
invoiceRepository.updateItem = function(...args) {
  return withMutationLock(() => originalUpdateItem(...args));
};

async function run() {
  setCustomStorage(null);
  await invoiceRepository.resetDemoData();

  console.log('Testing concurrent updateItem WITH withMutationLock:');
  const p1 = invoiceRepository.updateItem('demo-01', 'd1-1', { descricao: 'PRODUTO 1 CONCORRENTE' });
  const p2 = invoiceRepository.updateItem('demo-01', 'd1-2', { descricao: 'PRODUTO 2 CONCORRENTE' });

  await Promise.all([p1, p2]);

  const finalInvoice = await invoiceRepository.findById('demo-01');
  const item1 = finalInvoice.itens.find((it) => it.id === 'd1-1');
  const item2 = finalInvoice.itens.find((it) => it.id === 'd1-2');

  console.log('Item 1 descricao:', item1?.descricao);
  console.log('Item 2 descricao:', item2?.descricao);
  const raceDetected = item1?.descricao !== 'PRODUTO 1 CONCORRENTE' || item2?.descricao !== 'PRODUTO 2 CONCORRENTE';
  console.log('Race condition detected?', raceDetected);
  assert.strictEqual(raceDetected, false, 'Race condition should NOT occur with mutex lock');
  console.log('SUCCESS! Both concurrent updates persisted!');
}

run().catch(console.error);
