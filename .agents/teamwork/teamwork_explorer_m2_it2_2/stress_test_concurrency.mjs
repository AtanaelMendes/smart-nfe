import assert from 'node:assert/strict';

let queue = Promise.resolve();
function withMutationLock(fn) {
  const next = queue.then(() => fn(), () => fn());
  queue = next.catch(() => {});
  return next;
}

let state = {
  invoices: [
    {
      id: 'demo-01',
      itens: Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i + 1}`,
        descricao: `Original ${i + 1}`,
        valorUnitario: '10.00',
        quantidade: 1,
        valorTotal: '10.00'
      }))
    }
  ]
};

async function updateItemMock(invoiceId, itemId, partial) {
  return withMutationLock(async () => {
    // Simulate async I/O delay
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 10)));
    const inv = state.invoices.find(x => x.id === invoiceId);
    const it = inv.itens.find(x => x.id === itemId);
    Object.assign(it, partial);
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 10)));
    return JSON.parse(JSON.stringify(inv));
  });
}

async function testHighConcurrency() {
  console.log('Dispatching 10 concurrent updates across all 10 items...');
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      updateItemMock('demo-01', `item-${i + 1}`, {
        descricao: `UPDATED ${i + 1}`,
        valorUnitario: `${(i + 1) * 5}.00`
      })
    );
  }

  await Promise.all(promises);

  const finalInv = state.invoices[0];
  let allUpdated = true;
  for (let i = 0; i < 10; i++) {
    const it = finalInv.itens[i];
    if (it.descricao !== `UPDATED ${i + 1}`) {
      allUpdated = false;
      console.error(`Item ${i + 1} was LOST:`, it);
    }
  }

  console.log('All 10 concurrent updates successfully persisted?', allUpdated);
  assert.strictEqual(allUpdated, true);
}

testHighConcurrency().catch(console.error);
