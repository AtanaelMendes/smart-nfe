/**
 * Motor de Divisão e Distribuição de NF-e — SmartNFe
 * 
 * Executa o cálculo de saldos remanescentes e a validação em tempo real da distribuição
 * de itens entre duas ou mais notas fiscais de destino preparadas.
 * 
 * Implementa conservação estrita de decimais (escala 4 para quantidades fiscais e
 * escala 2 para valores monetários), eliminação total de ponto flutuante binário (IEEE 754),
 * divisão exata BigInt e rateio proporcional de despesas acessórias com absorção de resíduos.
 */

import {
  parseDecimal,
  formatBigInt,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  decimalCompare,
  cleanDecimalString,
  isDecimalNegative,
  roundDecimal,
} from './decimal.js';

/**
 * Extrai a quantidade numérica em string a partir de diversos formatos de entrada.
 * @param {string|number|object} val
 * @returns {string}
 */
function extractQuantity(val) {
  if (val === null || val === undefined) return '0';
  if (typeof val === 'object') {
    return cleanDecimalString(val.quantidade ?? val.quantity ?? val.allocatedQty ?? val.qty ?? '0');
  }
  return cleanDecimalString(val);
}

/**
 * Obtém a quantidade de casas decimais de uma string numérica.
 * @param {string} str
 * @returns {number}
 */
function getDecimalPlaces(str) {
  const s = cleanDecimalString(str);
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
 *   hasExcess: boolean,
 *   hasNegative: boolean
 * }}
 */
export function calculateRemainingBalance(originalQtyStr, allocatedQtyArray) {
  const origStr = cleanDecimalString(originalQtyStr || '0');
  const arr = Array.isArray(allocatedQtyArray) ? allocatedQtyArray : [];

  // Garante escala mínima de 4 casas decimais para quantidades fiscais
  const maxScale = Math.max(
    4,
    getDecimalPlaces(origStr),
    ...arr.map((item) => getDecimalPlaces(extractQuantity(item)))
  );

  let totalAllocated = '0.' + '0'.repeat(maxScale);
  let hasNegative = false;

  for (const item of arr) {
    const q = extractQuantity(item);
    if (isDecimalNegative(q)) {
      hasNegative = true;
    }
    totalAllocated = decimalAdd(totalAllocated, q, maxScale);
  }

  const balanceStr = decimalSubtract(origStr, totalAllocated, maxScale);
  const cmp = decimalCompare(balanceStr, '0');

  let status = 'ok';
  if (hasNegative || cmp < 0) {
    status = 'excess';
  } else if (cmp > 0) {
    status = 'remaining';
  }

  return {
    balanceStr,
    status,
    totalAllocatedStr: totalAllocated,
    isOk: status === 'ok',
    hasRemaining: status === 'remaining',
    hasExcess: status === 'excess',
    hasNegative,
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
      } else if (note.itens && typeof note.itens === 'object') {
        noteItems = Object.entries(note.itens).map(([id, qty]) => ({ id, quantidade: qty }));
      } else if (note.items && typeof note.items === 'object') {
        noteItems = Object.entries(note.items).map(([id, qty]) => ({ id, quantidade: qty }));
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
    const originalQtyStr = cleanDecimalString(origItem.quantidade || '0');
    const unitPriceStr = cleanDecimalString(origItem.valorUnitario || '0');

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
          ? cleanDecimalString(orig.valorUnitario || '0')
          : cleanDecimalString(item.valorUnitario || '0');

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

  // canSave: Requer ao menos duas notas de destino (divisão), ZERO excessos e ZERO sobras remanescentes
  const canSave = notes.length >= 2 && !hasExcess && !hasRemaining && isBalanced;
  const isValid = !hasExcess && !hasRemaining && isBalanced;

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

/**
 * Distribui uma quantidade em partes estritamente iguais entre N notas
 * utilizando divisão inteira BigInt pura com alocação do resíduo (resto)
 * na última nota para garantir conservação exata da quantidade (0.0000 de sobra).
 * 
 * Exemplo: '10.0000' em 3 notas -> ['3.3333', '3.3333', '3.3334']
 * Exemplo: '100.0000' em 3 notas -> ['33.3333', '33.3333', '33.3334']
 * Exemplo: '0.0004' em 6 notas -> ['0.0000', '0.0000', '0.0000', '0.0000', '0.0000', '0.0004']
 * 
 * @param {string|number} originalQtyStr - Quantidade total ou saldo a dividir
 * @param {number} numNotes - Número de notas de destino (N >= 1)
 * @param {number} [scale=4] - Casas decimais de saída (padrão fiscal: 4)
 * @returns {Array<string>} Array com N strings decimais com soma identicamente igual à entrada
 */
export function distributeEqually(originalQtyStr, numNotes, scale = 4) {
  const n = parseInt(numNotes, 10);
  if (isNaN(n) || n <= 0) return [];

  const p = parseDecimal(originalQtyStr);
  const targetScale = Math.max(scale >= 0 ? scale : 4, p.scale);

  // Trata zero ou valores negativos
  if (p.intVal === 0n || p.sign < 0n) {
    return Array.from({ length: n }, () => formatBigInt(1n, 0n, targetScale));
  }

  // 1 única nota recebe 100% da quantidade
  if (n === 1) {
    const factor = 10n ** BigInt(targetScale - p.scale);
    return [formatBigInt(p.sign, p.intVal * factor, targetScale)];
  }

  const scaledTotal = p.intVal * (10n ** BigInt(targetScale - p.scale));
  const bigN = BigInt(n);

  // Divisão inteira (piso) e resto exato em BigInt
  const baseInt = scaledTotal / bigN;
  const remInt = scaledTotal % bigN;

  const result = [];
  const baseFormatted = formatBigInt(1n, baseInt, targetScale);

  for (let i = 0; i < n - 1; i++) {
    result.push(baseFormatted);
  }

  // A última nota recebe o piso + o resíduo exato (resto da divisão)
  const lastInt = baseInt + remInt;
  result.push(formatBigInt(1n, lastInt, targetScale));

  return result;
}

/**
 * Distribui o saldo restante de um item igualmente entre as notas de destino,
 * somando a fração calculada às alocações já existentes.
 * 
 * @param {string|number} originalQtyStr - Quantidade original
 * @param {Array<string|number|object>} currentAllocations - Alocações atuais
 * @param {number} [scale=4] - Precisão decimal
 * @returns {Array<string>} Novo array de alocações com saldo perfeitamente zerado
 */
export function distributeRemainingEqually(originalQtyStr, currentAllocations, scale = 4) {
  const arr = Array.isArray(currentAllocations) ? currentAllocations : [];
  const n = arr.length;
  if (n === 0) return [];

  const { balanceStr } = calculateRemainingBalance(originalQtyStr, arr);
  if (decimalCompare(balanceStr, '0') <= 0) {
    return arr.map((item) => extractQuantity(item));
  }

  const slices = distributeEqually(balanceStr, n, scale);
  return arr.map((item, idx) => {
    const current = extractQuantity(item);
    return decimalAdd(current, slices[idx] || '0.0000', scale);
  });
}

/**
 * Rateia uma despesa acessória com base na proporção do valor dos produtos.
 * 
 * @param {string|number} originalExpenseStr - Valor original da despesa
 * @param {string|number} noteProductTotalStr - Valor dos produtos da nota destino
 * @param {string|number} originalProductTotalStr - Valor total dos produtos da nota de origem
 * @returns {string} Valor rateado com 2 casas decimais
 */
export function apportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr) {
  const origExp = cleanDecimalString(originalExpenseStr);
  const noteProd = cleanDecimalString(noteProductTotalStr);
  const origProd = cleanDecimalString(originalProductTotalStr);

  if (decimalCompare(origProd, '0') <= 0 || decimalCompare(origExp, '0') === 0) {
    return '0.00';
  }
  const ratio = decimalDivide(noteProd, origProd, 8);
  return decimalMultiply(origExp, ratio, 2);
}

/**
 * Rateia todas as despesas acessórias (frete, seguro, outras despesas, desconto)
 * entre as notas de destino com conservação estrita de saldos (sem perda de centavos).
 * A última nota ativa absorve o resíduo para garantir soma exata ao total original.
 * 
 * @param {object} parentTotals - Totais da nota fiscal de origem (totais)
 * @param {Array<{id?: string, noteId?: string, productTotal?: string, totalProducts?: string}>} notesWithProducts - Lista de notas ativas
 * @returns {Record<string, { valorProdutos: string, valorFrete: string, valorSeguro: string, outrasDespesas: string, valorDesconto: string, freight: string, insurance: string, otherExpenses: string, discount: string }>}
 */
export function apportionAllInvoiceExpenses(parentTotals = {}, notesWithProducts = []) {
  const origFrete = cleanDecimalString(
    parentTotals.valorFrete ?? parentTotals.freight ?? parentTotals.totalFreight ?? '0.00'
  );
  const origSeguro = cleanDecimalString(
    parentTotals.valorSeguro ?? parentTotals.insurance ?? parentTotals.totalInsurance ?? '0.00'
  );
  const origOutras = cleanDecimalString(
    parentTotals.outrasDespesas ?? parentTotals.otherExpenses ?? parentTotals.totalOtherExpenses ?? '0.00'
  );
  const origDesconto = cleanDecimalString(
    parentTotals.valorDesconto ?? parentTotals.discount ?? parentTotals.totalDiscount ?? '0.00'
  );

  const numNotes = notesWithProducts.length;
  const result = {};

  if (numNotes === 0) return result;

  const getNoteId = (n, idx) => n.id || n.noteId || `nota-${idx + 1}`;
  const getProductTotal = (n) => cleanDecimalString(n.productTotal ?? n.totalProducts ?? '0.00');

  if (numNotes === 1) {
    const singleId = getNoteId(notesWithProducts[0], 0);
    const prodTotal = getProductTotal(notesWithProducts[0]);
    result[singleId] = {
      valorProdutos: roundDecimal(prodTotal, 2),
      valorFrete: roundDecimal(origFrete, 2),
      valorSeguro: roundDecimal(origSeguro, 2),
      outrasDespesas: roundDecimal(origOutras, 2),
      valorDesconto: roundDecimal(origDesconto, 2),
      freight: roundDecimal(origFrete, 2),
      insurance: roundDecimal(origSeguro, 2),
      otherExpenses: roundDecimal(origOutras, 2),
      discount: roundDecimal(origDesconto, 2),
    };
    return result;
  }

  const totalProducts = notesWithProducts.reduce(
    (acc, n) => decimalAdd(acc, getProductTotal(n), 2),
    '0.00'
  );

  // Caso patológico: valor de produtos total é zero -> divide igualmente
  if (decimalCompare(totalProducts, '0') <= 0) {
    const freteParts = distributeEqually(origFrete, numNotes, 2);
    const seguroParts = distributeEqually(origSeguro, numNotes, 2);
    const outrasParts = distributeEqually(origOutras, numNotes, 2);
    const descontoParts = distributeEqually(origDesconto, numNotes, 2);

    for (let i = 0; i < numNotes; i++) {
      const noteId = getNoteId(notesWithProducts[i], i);
      const prodTotal = getProductTotal(notesWithProducts[i]);
      result[noteId] = {
        valorProdutos: roundDecimal(prodTotal, 2),
        valorFrete: freteParts[i],
        valorSeguro: seguroParts[i],
        outrasDespesas: outrasParts[i],
        valorDesconto: descontoParts[i],
        freight: freteParts[i],
        insurance: seguroParts[i],
        otherExpenses: outrasParts[i],
        discount: descontoParts[i],
      };
    }
    return result;
  }

  let allocatedFrete = '0.00';
  let allocatedSeguro = '0.00';
  let allocatedOutras = '0.00';
  let allocatedDesconto = '0.00';

  let remainingFrete = roundDecimal(origFrete, 2);
  let remainingSeguro = roundDecimal(origSeguro, 2);
  let remainingOutras = roundDecimal(origOutras, 2);
  let remainingDesconto = roundDecimal(origDesconto, 2);

  for (let i = 0; i < numNotes; i++) {
    const note = notesWithProducts[i];
    const noteId = getNoteId(note, i);
    const noteProd = getProductTotal(note);
    const isLast = i === numNotes - 1;

    let noteFrete;
    let noteSeguro;
    let noteOutras;
    let noteDesconto;

    if (!isLast) {
      noteFrete = apportionExpenses(origFrete, noteProd, totalProducts);
      if (decimalCompare(noteFrete, remainingFrete) > 0) noteFrete = remainingFrete;

      noteSeguro = apportionExpenses(origSeguro, noteProd, totalProducts);
      if (decimalCompare(noteSeguro, remainingSeguro) > 0) noteSeguro = remainingSeguro;

      noteOutras = apportionExpenses(origOutras, noteProd, totalProducts);
      if (decimalCompare(noteOutras, remainingOutras) > 0) noteOutras = remainingOutras;

      noteDesconto = apportionExpenses(origDesconto, noteProd, totalProducts);
      if (decimalCompare(noteDesconto, remainingDesconto) > 0) noteDesconto = remainingDesconto;

      allocatedFrete = decimalAdd(allocatedFrete, noteFrete, 2);
      allocatedSeguro = decimalAdd(allocatedSeguro, noteSeguro, 2);
      allocatedOutras = decimalAdd(allocatedOutras, noteOutras, 2);
      allocatedDesconto = decimalAdd(allocatedDesconto, noteDesconto, 2);

      remainingFrete = decimalSubtract(roundDecimal(origFrete, 2), allocatedFrete, 2);
      remainingSeguro = decimalSubtract(roundDecimal(origSeguro, 2), allocatedSeguro, 2);
      remainingOutras = decimalSubtract(roundDecimal(origOutras, 2), allocatedOutras, 2);
      remainingDesconto = decimalSubtract(roundDecimal(origDesconto, 2), allocatedDesconto, 2);
    } else {
      // A última nota ativa absorve o saldo remanescente exato (conservação estrita)
      noteFrete = remainingFrete;
      noteSeguro = remainingSeguro;
      noteOutras = remainingOutras;
      noteDesconto = remainingDesconto;
    }

    result[noteId] = {
      valorProdutos: roundDecimal(noteProd, 2),
      valorFrete: noteFrete,
      valorSeguro: noteSeguro,
      outrasDespesas: noteOutras,
      valorDesconto: noteDesconto,
      freight: noteFrete,
      insurance: noteSeguro,
      otherExpenses: noteOutras,
      discount: noteDesconto,
    };
  }

  return result;
}
