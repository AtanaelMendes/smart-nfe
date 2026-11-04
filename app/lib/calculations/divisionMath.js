/**
 * Motor de Divisão e Distribuição de NF-e — SmartNFe
 * 
 * Executa o cálculo de saldos remanescentes e a validação em tempo real da distribuição
 * de itens entre duas ou mais notas fiscais de destino preparadas.
 */

import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalCompare,
} from './decimal.js';

/**
 * Extrai a quantidade numérica em string a partir de diversos formatos de entrada.
 * @param {string|number|object} val
 * @returns {string}
 */
function extractQuantity(val) {
  if (val === null || val === undefined) return '0';
  if (typeof val === 'object') {
    return String(val.quantidade ?? val.quantity ?? val.allocatedQty ?? val.qty ?? '0');
  }
  return String(val);
}

/**
 * Obtém a quantidade de casas decimais de uma string numérica.
 * @param {string} str
 * @returns {number}
 */
function getDecimalPlaces(str) {
  const s = String(str || '').trim().replace(',', '.');
  const parts = s.split('.');
  return parts[1] ? parts[1].length : 0;
}

/**
 * Calcula o saldo restante da distribuição de um item.
 * 
 * @param {string|number} originalQtyStr - Quantidade original da nota
 * @param {Array<string|number|object>} allocatedQtyArray - Array de alocações efetuadas
 * @returns {{
 *   balanceStr: string,
 *   status: 'ok' | 'remaining' | 'excess',
 *   totalAllocatedStr: string,
 *   isOk: boolean,
 *   hasRemaining: boolean,
 *   hasExcess: boolean
 * }}
 */
export function calculateRemainingBalance(originalQtyStr, allocatedQtyArray) {
  const origStr = String(originalQtyStr || '0').trim();
  const arr = Array.isArray(allocatedQtyArray) ? allocatedQtyArray : [];

  // Garante escala mínima de 4 casas decimais para quantidades fiscais
  const maxScale = Math.max(
    4,
    getDecimalPlaces(origStr),
    ...arr.map((item) => getDecimalPlaces(extractQuantity(item)))
  );

  let totalAllocated = '0.' + '0'.repeat(maxScale);
  for (const item of arr) {
    const q = extractQuantity(item);
    totalAllocated = decimalAdd(totalAllocated, q, maxScale);
  }

  const balanceStr = decimalSubtract(origStr, totalAllocated, maxScale);
  const cmp = decimalCompare(balanceStr, '0');

  let status = 'ok';
  if (cmp > 0) {
    status = 'remaining';
  } else if (cmp < 0) {
    status = 'excess';
  }

  return {
    balanceStr,
    status,
    totalAllocatedStr: totalAllocated,
    isOk: status === 'ok',
    hasRemaining: status === 'remaining',
    hasExcess: status === 'excess',
  };
}

/**
 * Valida o lote completo de distribuição da nota fiscal original entre notas de destino.
 * Gera relatório detalhado com diagnóstico por item, resumo por nota e flags de bloqueio.
 * 
 * @param {Array<object>} originalItems - Itens da nota fiscal original
 * @param {Array<object>|object} destinationNotes - Notas de destino configuradas
 * @returns {{
 *   isValid: boolean,
 *   canSave: boolean,
 *   hasExcess: boolean,
 *   hasRemaining: boolean,
 *   isBalanced: boolean,
 *   summary: {
 *     totalItemsCount: number,
 *     destinationNotesCount: number,
 *     balancedCount: number,
 *     remainingCount: number,
 *     excessCount: number
 *   },
 *   itemReports: Array<object>,
 *   notesSummary: Array<object>
 * }}
 */
export function validateDivisionBatch(originalItems, destinationNotes) {
  const origList = Array.isArray(originalItems) ? originalItems : [];

  // Normaliza destinationNotes para formato padronizado de array
  let notes = [];
  if (Array.isArray(destinationNotes)) {
    notes = destinationNotes.map((note, idx) => {
      const noteId = note.id || note.noteId || `nota-${idx + 1}`;
      const noteNum = note.numero || note.number || `DEST-${String(idx + 1).padStart(2, '0')}`;
      let noteItems = [];

      if (Array.isArray(note.itens)) {
        noteItems = note.itens;
      } else if (Array.isArray(note.items)) {
        noteItems = note.items;
      } else if (note.allocations && typeof note.allocations === 'object') {
        noteItems = Object.entries(note.allocations).map(([id, qty]) => ({ id, quantidade: qty }));
      }

      return { id: noteId, numero: noteNum, itens: noteItems, raw: note };
    });
  } else if (destinationNotes && typeof destinationNotes === 'object') {
    notes = Object.entries(destinationNotes).map(([noteId, allocs], idx) => {
      const noteItems = Object.entries(allocs || {}).map(([id, qty]) => ({ id, quantidade: qty }));
      return {
        id: noteId,
        numero: `DEST-${String(idx + 1).padStart(2, '0')}`,
        itens: noteItems,
        raw: allocs,
      };
    });
  }

  const itemReports = [];
  let balancedCount = 0;
  let remainingCount = 0;
  let excessCount = 0;

  for (const origItem of origList) {
    const itemId = origItem.id;
    const itemNumber = origItem.item;
    const codigo = origItem.codigo;
    const descricao = origItem.descricao;
    const originalQtyStr = String(origItem.quantidade || '0');
    const unitPriceStr = String(origItem.valorUnitario || '0');

    // Mapeia as alocações deste item em cada nota de destino
    const allocationsByNote = {};
    const allocatedArray = [];

    for (const note of notes) {
      const matched = note.itens.find(
        (i) => i.id === itemId || i.itemId === itemId || i.codigo === codigo
      );
      const allocatedQty = matched ? extractQuantity(matched) : '0.0000';
      allocationsByNote[note.id] = allocatedQty;
      allocatedArray.push(allocatedQty);
    }

    const { balanceStr, status, totalAllocatedStr } = calculateRemainingBalance(
      originalQtyStr,
      allocatedArray
    );

    if (status === 'ok') balancedCount++;
    else if (status === 'remaining') remainingCount++;
    else if (status === 'excess') excessCount++;

    itemReports.push({
      itemId,
      itemNumber,
      codigo,
      descricao,
      originalQty: originalQtyStr,
      unitPrice: unitPriceStr,
      totalAllocated: totalAllocatedStr,
      balanceStr,
      status,
      allocationsByNote,
    });
  }

  // Resumo financeiro e físico de cada nota de destino
  const notesSummary = notes.map((note) => {
    let noteProductTotal = '0.00';
    let noteTotalQty = '0.0000';
    let allocatedItemsCount = 0;

    for (const item of note.itens) {
      const q = extractQuantity(item);
      if (decimalCompare(q, '0') > 0) {
        allocatedItemsCount++;
        noteTotalQty = decimalAdd(noteTotalQty, q, 4);

        // Busca o preço unitário do item original correspondente
        const orig = origList.find(
          (o) => o.id === item.id || o.id === item.itemId || o.codigo === item.codigo
        );
        const unitPrice = orig
          ? String(orig.valorUnitario || '0')
          : String(item.valorUnitario || '0');

        const itemTotal = decimalMultiply(unitPrice, q, 2);
        noteProductTotal = decimalAdd(noteProductTotal, itemTotal, 2);
      }
    }

    return {
      noteId: note.id,
      numero: note.numero,
      allocatedItemsCount,
      totalQuantity: noteTotalQty,
      totalProducts: noteProductTotal,
    };
  });

  const hasExcess = excessCount > 0;
  const hasRemaining = remainingCount > 0;
  const isBalanced = origList.length > 0 && balancedCount === origList.length;

  // canSave: Requer ao menos uma nota de destino e NENHUM item com alocação em excesso
  const canSave = notes.length > 0 && !hasExcess;
  const isValid = !hasExcess;

  return {
    isValid,
    canSave,
    hasExcess,
    hasRemaining,
    isBalanced,
    summary: {
      totalItemsCount: origList.length,
      destinationNotesCount: notes.length,
      balancedCount,
      remainingCount,
      excessCount,
    },
    itemReports,
    notesSummary,
  };
}
