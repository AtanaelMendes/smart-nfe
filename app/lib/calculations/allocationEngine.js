/**
 * Motor Unificado de Alocação e Matriz de Conservação N:M — SmartNFe
 * 
 * Suporta os cenários de Agrupamento (N -> 1), Divisão (1 -> M) e Preparação Mista (N -> M).
 * Implementa precisão decimal arbitrária baseada em BigInt puro (sem IEEE 754),
 * conservação matemática estrita de saldos, preservação perpétua da identidade do item
 * (sourceInvoiceId + sourceItemId), validação de compatibilidade de unidades fiscais
 * e rateio multi-origem de despesas acessórias com absorção de resíduos ao centavo.
 */

import {
  cleanDecimalString,
  parseDecimal,
  formatBigInt,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  roundDecimal,
  decimalCompare,
  isDecimalNegative,
  isDecimalZero,
  isDecimalPositive,
  decimalSum,
  decimalDistributeEqually,
  decimalApportionProportional,
} from './decimal.js';

import { calculateInvoiceTotals, calculateItemTotal } from './invoiceTotals.js';

// ============================================================================
// CONSTANTES E FAMÍLIAS CANÔNICAS DE UNIDADES FISCAIS SEFAZ
// ============================================================================

export const ALLOCATION_STATUS = {
  OK: 'ok',
  PARTIAL: 'partial',
  EXCESS: 'excess',
};

export const UNIT_FAMILIES = {
  MASS_KG: ['KG', 'KGS', 'QUILO', 'QUILOS', 'KILO', 'KILOS', 'QUILOGRAMA', 'QUILOGRAMAS'],
  MASS_TON: ['TON', 'TONS', 'TONELADA', 'TONELADAS', 'T'],
  MASS_G: ['G', 'GR', 'GRAMA', 'GRAMAS'],
  UNIT: ['UN', 'UND', 'UNID', 'UNIDADE', 'UNIDADES', 'PC', 'PCA', 'PÇA', 'PECA', 'PECAS', 'PEÇAS', 'ITEM', 'ITENS'],
  BOX: ['CX', 'CXS', 'CAIXA', 'CAIXAS'],
  SACK: ['SC', 'SCS', 'SACO', 'SACOS', 'SAC'],
  PACKAGE: ['PCT', 'PCTE', 'PACOTE', 'PACOTES'],
  VOLUME_L: ['L', 'LT', 'LTS', 'LITRO', 'LITROS'],
  LENGTH_M: ['M', 'MT', 'MTS', 'METRO', 'METROS'],
  AREA_M2: ['M2', 'M²', 'MT2', 'METRO QUADRADO', 'METROS QUADRADOS'],
  VOLUME_M3: ['M3', 'M³', 'MT3', 'METRO CUBICO', 'METROS CUBICOS'],
  PAIR: ['PAR', 'PARES', 'PR'],
  DOZEN: ['DZ', 'DUZIA', 'DUZIAS'],
  BALE: ['FARDO', 'FARDOS', 'FD'],
  PALLET: ['PAL', 'PALETE', 'PALETES', 'PALLET', 'PALLETS'],
};

// ============================================================================
// AUXILIARES DE CHAVE COMPOSTA E IDENTIDADE DO ITEM
// ============================================================================

/**
 * Constrói a chave composta única do item de origem: `${sourceInvoiceId}__${sourceItemId}`.
 * Garante a preservação absoluta da identidade fiscal e fornecedor original.
 * @param {object|string} itemOrSourceInvoiceId
 * @param {string} [sourceItemId]
 * @returns {string}
 */
export function buildCompositeKey(itemOrSourceInvoiceId, sourceItemId) {
  if (typeof itemOrSourceInvoiceId === 'object' && itemOrSourceInvoiceId !== null) {
    return buildSourceItemKey(itemOrSourceInvoiceId);
  }
  const inv = String(itemOrSourceInvoiceId ?? '').trim();
  const item = String(sourceItemId ?? '').trim();
  if (inv && item) return `${inv}__${item}`;
  return String(item || inv || 'unknown');
}

/**
 * Constrói a chave composta única do item de origem a partir de objeto item.
 * @param {object} item
 * @returns {string}
 */
export function buildSourceItemKey(item) {
  if (!item) return '';
  const invId = item.sourceInvoiceId ?? item.invoiceId ?? item.parentInvoiceId ?? '';
  const itmId = item.sourceItemId ?? item.itemId ?? item.id ?? item.nItem ?? item.codigo ?? '';
  if (invId && itmId) {
    return `${invId}__${itmId}`;
  }
  return String(itmId || invId || 'unknown');
}

export const makeSourceKey = buildCompositeKey;

/**
 * Decompõe a chave composta em sourceInvoiceId e sourceItemId.
 * @param {string} key
 * @returns {{ sourceInvoiceId: string|null, sourceItemId: string }}
 */
export function parseCompositeKey(key) {
  return parseSourceItemKey(key);
}

export const parseSourceKey = parseCompositeKey;

/**
 * Decompõe a chave composta em sourceInvoiceId e sourceItemId.
 * @param {string} key
 * @returns {{ sourceInvoiceId: string|null, sourceItemId: string }}
 */
export function parseSourceItemKey(key) {
  const s = String(key || '');
  const sepIdx = s.indexOf('__');
  if (sepIdx !== -1) {
    return {
      sourceInvoiceId: s.substring(0, sepIdx),
      sourceItemId: s.substring(sepIdx + 2),
    };
  }
  return {
    sourceInvoiceId: null,
    sourceItemId: s,
  };
}

// ============================================================================
// VALIDAÇÃO DE COMPATIBILIDADE DE UNIDADES FISCAIS
// ============================================================================

/**
 * Normaliza strings de unidade de medida comercial e tributária da SEFAZ.
 * @param {string} unitStr
 * @returns {string}
 */
export function normalizeUnit(unitStr) {
  if (!unitStr) return '';
  return String(unitStr)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[²]/g, '2')
    .replace(/[³]/g, '3')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Obtém a família canônica correspondente à unidade normalizada.
 * @param {string} normalizedUnit
 * @returns {string|null}
 */
function getUnitFamily(normalizedUnit) {
  if (!normalizedUnit) return null;
  for (const [family, members] of Object.entries(UNIT_FAMILIES)) {
    if (members.includes(normalizedUnit)) {
      return family;
    }
  }
  return null;
}

/**
 * Verifica se duas unidades de medida são compatíveis entre si.
 * @param {object|string} itemOrUnitA
 * @param {object|string} itemOrUnitB
 * @returns {boolean}
 */
export function checkUnitCompatibility(itemOrUnitA, itemOrUnitB) {
  const rawA = typeof itemOrUnitA === 'object' && itemOrUnitA !== null
    ? (itemOrUnitA.unidade ?? itemOrUnitA.uCom ?? itemOrUnitA.uTrib ?? itemOrUnitA.unit ?? '')
    : itemOrUnitA;
  const rawB = typeof itemOrUnitB === 'object' && itemOrUnitB !== null
    ? (itemOrUnitB.unidade ?? itemOrUnitB.uCom ?? itemOrUnitB.uTrib ?? itemOrUnitB.unit ?? '')
    : itemOrUnitB;

  const uA = normalizeUnit(rawA);
  const uB = normalizeUnit(rawB);

  if (!uA || !uB) return true;
  if (uA === uB) return true;

  const famA = getUnitFamily(uA);
  const famB = getUnitFamily(uB);

  if (famA && famB && famA === famB) {
    return true;
  }

  return false;
}

// ============================================================================
// CÁLCULO DE SALDO DE CONSERVAÇÃO INDIVIDUAL
// ============================================================================

/**
 * Calcula o saldo remanescente de um item aplicando a regra de conservação:
 * disponível = originalQty - priorAllocatedQty - currentAllocatedQtyTotal
 * 
 * @param {string|number} originalQty
 * @param {Array<string|number|object>|object} currentAllocations
 * @param {string|number} [priorAllocatedQty='0.0000']
 * @param {number} [scale=4]
 * @returns {{
 *   originalQty: string,
 *   priorAllocatedQty: string,
 *   availableQty: string,
 *   allocatedQtyTotal: string,
 *   remainingQty: string,
 *   hasExcess: boolean,
 *   hasNegative: boolean,
 *   hasRemaining: boolean,
 *   isBalanced: boolean,
 *   status: 'ok' | 'partial' | 'excess'
 * }}
 */
export function calculateItemConservationBalance(
  originalQty,
  currentAllocations,
  priorAllocatedQty = '0.0000',
  scale = 4
) {
  const origStr = roundDecimal(originalQty || '0', scale);
  const priorStr = roundDecimal(priorAllocatedQty || '0', scale);

  const availableStr = decimalSubtract(origStr, priorStr, scale);

  let allocList = [];
  if (Array.isArray(currentAllocations)) {
    allocList = currentAllocations;
  } else if (currentAllocations && typeof currentAllocations === 'object') {
    allocList = Object.values(currentAllocations);
  }

  let allocatedTotal = '0.' + '0'.repeat(scale);
  let hasNegative = false;

  for (const alloc of allocList) {
    const qStr = typeof alloc === 'object' && alloc !== null
      ? cleanDecimalString(alloc.quantidade ?? alloc.quantity ?? alloc.allocatedQty ?? '0')
      : cleanDecimalString(alloc ?? '0');

    if (isDecimalNegative(qStr)) {
      hasNegative = true;
    }
    allocatedTotal = decimalAdd(allocatedTotal, qStr, scale);
  }

  const remainingStr = decimalSubtract(availableStr, allocatedTotal, scale);
  const cmpRemaining = decimalCompare(remainingStr, '0');
  const cmpAvailable = decimalCompare(availableStr, '0');

  const hasExcess = hasNegative || cmpRemaining < 0 || cmpAvailable < 0;
  const hasRemaining = !hasExcess && cmpRemaining > 0;
  const isBalanced = !hasExcess && cmpRemaining === 0 && decimalCompare(allocatedTotal, '0') > 0;

  let status = ALLOCATION_STATUS.PARTIAL;
  if (hasExcess) {
    status = ALLOCATION_STATUS.EXCESS;
  } else if (cmpRemaining === 0) {
    status = ALLOCATION_STATUS.OK;
  } else {
    status = ALLOCATION_STATUS.PARTIAL;
  }

  return {
    originalQty: origStr,
    priorAllocatedQty: priorStr,
    availableQty: availableStr,
    allocatedQtyTotal: allocatedTotal,
    remainingQty: remainingStr,
    hasExcess,
    hasNegative,
    hasRemaining,
    isBalanced,
    status,
  };
}

/**
 * Alias compatível com os testes unitários do Explorer 3 para auditoria de saldo de item.
 */
export function calculateItemBalance(originalQtyStr, allocatedQtyArray, activeAllocationsTotal = '0.0000', scale = 4) {
  const res = calculateItemConservationBalance(originalQtyStr, allocatedQtyArray, activeAllocationsTotal, scale);
  return {
    ...res,
    balanceStr: res.remainingQty,
    totalAllocatedStr: res.allocatedQtyTotal,
    isOk: res.status === ALLOCATION_STATUS.OK,
  };
}

// ============================================================================
// RATEIO DE DESPESAS ACESSÓRIAS E DISTRIBUIÇÃO EXATA
// ============================================================================

/**
 * Distribui uma quantidade em partes estritamente iguais entre N notas.
 * Delega para decimalDistributeEqually de decimal.js.
 */
export function distributeEqually(originalQtyStr, numNotes, scale = 4) {
  return decimalDistributeEqually(originalQtyStr, numNotes, scale);
}

/**
 * Distribui o saldo restante de um item igualmente entre as notas de destino.
 */
export function distributeRemainingEqually(originalQtyStr, currentAllocations, scale = 4) {
  const arr = Array.isArray(currentAllocations) ? currentAllocations : [];
  const n = arr.length;
  if (n === 0) return [];

  const { remainingQty } = calculateItemConservationBalance(originalQtyStr, arr, '0', scale);
  if (decimalCompare(remainingQty, '0') <= 0) {
    return arr.map((item) => typeof item === 'object' && item ? cleanDecimalString(item.quantidade ?? item.qty ?? '0') : cleanDecimalString(item));
  }

  const slices = distributeEqually(remainingQty, n, scale);
  return arr.map((item, idx) => {
    const current = typeof item === 'object' && item ? cleanDecimalString(item.quantidade ?? item.qty ?? '0') : cleanDecimalString(item);
    return decimalAdd(current, slices[idx] || '0.0000', scale);
  });
}

/**
 * Rateia uma despesa acessória com base na proporção do valor dos produtos.
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
 * Rateia todas as despesas acessórias de uma ou mais notas de origem entre notas de destino
 * com absorção de centavos exata na última nota ativa.
 * 
 * @param {Record<string, object>|object} sourceInvoicesTotals - Totais das notas de origem
 * @param {Array<object>} notesWithProducts - Lista de notas de destino com productTotal
 * @param {string|null} [targetSourceId=null] - ID específico da origem a ratear (opcional)
 * @returns {Record<string, object>}
 */
export function apportionMultiSourceExpenses(sourceInvoicesTotals = {}, notesWithProducts = [], targetSourceId = null) {
  const numNotes = notesWithProducts.length;
  const result = {};

  if (numNotes === 0) return result;

  const getNoteId = (n, idx) => n.id || n.noteId || `nota-${idx + 1}`;
  const getProductTotal = (n) => cleanDecimalString(n.productTotal ?? n.totalProducts ?? '0.00');

  for (let i = 0; i < numNotes; i++) {
    const noteId = getNoteId(notesWithProducts[i], i);
    const prodTotal = getProductTotal(notesWithProducts[i]);
    result[noteId] = {
      valorProdutos: roundDecimal(prodTotal, 2),
      valorFrete: '0.00',
      valorSeguro: '0.00',
      outrasDespesas: '0.00',
      valorDesconto: '0.00',
      freight: '0.00',
      insurance: '0.00',
      otherExpenses: '0.00',
      discount: '0.00',
    };
  }

  let sourcesToProcess = [];
  if (targetSourceId) {
    const totals = sourceInvoicesTotals[targetSourceId] || sourceInvoicesTotals;
    sourcesToProcess.push({ sourceId: targetSourceId, totals });
  } else if (sourceInvoicesTotals && typeof sourceInvoicesTotals === 'object') {
    if (sourceInvoicesTotals.valorFrete !== undefined || sourceInvoicesTotals.freight !== undefined) {
      sourcesToProcess.push({ sourceId: 'single', totals: sourceInvoicesTotals });
    } else {
      for (const [sId, totals] of Object.entries(sourceInvoicesTotals)) {
        sourcesToProcess.push({ sourceId: sId, totals });
      }
    }
  }

  if (sourcesToProcess.length === 0) {
    return result;
  }

  for (const { totals } of sourcesToProcess) {
    const origFrete = cleanDecimalString(totals.valorFrete ?? totals.freight ?? totals.totalFreight ?? '0.00');
    const origSeguro = cleanDecimalString(totals.valorSeguro ?? totals.insurance ?? totals.totalInsurance ?? '0.00');
    const origOutras = cleanDecimalString(totals.outrasDespesas ?? totals.otherExpenses ?? totals.totalOtherExpenses ?? '0.00');
    const origDesconto = cleanDecimalString(totals.valorDesconto ?? totals.discount ?? totals.totalDiscount ?? '0.00');

    const totalProducts = notesWithProducts.reduce(
      (acc, n) => decimalAdd(acc, getProductTotal(n), 2),
      '0.00'
    );

    if (decimalCompare(totalProducts, '0') <= 0) {
      const fParts = distributeEqually(origFrete, numNotes, 2);
      const sParts = distributeEqually(origSeguro, numNotes, 2);
      const oParts = distributeEqually(origOutras, numNotes, 2);
      const dParts = distributeEqually(origDesconto, numNotes, 2);

      for (let i = 0; i < numNotes; i++) {
        const noteId = getNoteId(notesWithProducts[i], i);
        result[noteId].valorFrete = decimalAdd(result[noteId].valorFrete, fParts[i], 2);
        result[noteId].valorSeguro = decimalAdd(result[noteId].valorSeguro, sParts[i], 2);
        result[noteId].outrasDespesas = decimalAdd(result[noteId].outrasDespesas, oParts[i], 2);
        result[noteId].valorDesconto = decimalAdd(result[noteId].valorDesconto, dParts[i], 2);
        result[noteId].freight = result[noteId].valorFrete;
        result[noteId].insurance = result[noteId].valorSeguro;
        result[noteId].otherExpenses = result[noteId].outrasDespesas;
        result[noteId].discount = result[noteId].valorDesconto;
      }
      continue;
    }

    let lastActiveIdx = -1;
    for (let i = numNotes - 1; i >= 0; i--) {
      if (decimalCompare(getProductTotal(notesWithProducts[i]), '0') > 0) {
        lastActiveIdx = i;
        break;
      }
    }

    let allocatedFrete = '0.00';
    let allocatedSeguro = '0.00';
    let allocatedOutras = '0.00';
    let allocatedDesconto = '0.00';

    for (let i = 0; i < numNotes; i++) {
      const note = notesWithProducts[i];
      const noteId = getNoteId(note, i);
      const noteProd = getProductTotal(note);

      if (decimalCompare(noteProd, '0') <= 0) {
        continue;
      }

      const isLastActive = (i === lastActiveIdx);

      let noteFrete, noteSeguro, noteOutras, noteDesconto;

      if (!isLastActive) {
        noteFrete = apportionExpenses(origFrete, noteProd, totalProducts);
        noteSeguro = apportionExpenses(origSeguro, noteProd, totalProducts);
        noteOutras = apportionExpenses(origOutras, noteProd, totalProducts);
        noteDesconto = apportionExpenses(origDesconto, noteProd, totalProducts);

        allocatedFrete = decimalAdd(allocatedFrete, noteFrete, 2);
        allocatedSeguro = decimalAdd(allocatedSeguro, noteSeguro, 2);
        allocatedOutras = decimalAdd(allocatedOutras, noteOutras, 2);
        allocatedDesconto = decimalAdd(allocatedDesconto, noteDesconto, 2);
      } else {
        noteFrete = decimalSubtract(roundDecimal(origFrete, 2), allocatedFrete, 2);
        noteSeguro = decimalSubtract(roundDecimal(origSeguro, 2), allocatedSeguro, 2);
        noteOutras = decimalSubtract(roundDecimal(origOutras, 2), allocatedOutras, 2);
        noteDesconto = decimalSubtract(roundDecimal(origDesconto, 2), allocatedDesconto, 2);
      }

      result[noteId].valorFrete = decimalAdd(result[noteId].valorFrete, noteFrete, 2);
      result[noteId].valorSeguro = decimalAdd(result[noteId].valorSeguro, noteSeguro, 2);
      result[noteId].outrasDespesas = decimalAdd(result[noteId].outrasDespesas, noteOutras, 2);
      result[noteId].valorDesconto = decimalAdd(result[noteId].valorDesconto, noteDesconto, 2);
      result[noteId].freight = result[noteId].valorFrete;
      result[noteId].insurance = result[noteId].valorSeguro;
      result[noteId].otherExpenses = result[noteId].outrasDespesas;
      result[noteId].discount = result[noteId].valorDesconto;
    }
  }

  return result;
}

// ============================================================================
// MOTOR MATRICIAL UNIFICADO N -> M (calculateAllocationMatrix)
// ============================================================================

/**
 * Calcula a matriz de alocação de itens de N origens para M destinos.
 * 
 * @param {Array<object>} sourceItems - Itens de origem com identificação e valores
 * @param {Array<object>|object} destinationNotes - Notas de destino com alocações
 * @param {Map|object} [activeAllocations={}] - Alocações ativas externas para subtração
 * @param {object} [options={}] - Opções: minDestinations, requireBalanced, sourceInvoiceTotals
 * @returns {object} Matriz, saldos por item, resumos por nota, canSave e totais
 */
export function calculateAllocationMatrix(
  sourceItems = [],
  destinationNotes = [],
  activeAllocations = {},
  options = {}
) {
  const minDestinations = options.minDestinations ?? 1;
  const requireBalanced = options.requireBalanced ?? false;
  const sourceInvoiceTotals = options.sourceInvoiceTotals ?? {};

  const safeSourceItems = Array.isArray(sourceItems) ? sourceItems : [];

  // 1. Normaliza as notas de destino para formato padrão
  let notes = [];
  if (Array.isArray(destinationNotes)) {
    notes = destinationNotes.map((note, idx) => {
      const id = note.id || note.noteId || `dest-${idx + 1}`;
      const numero = note.numero || note.number || `EXP-${String(idx + 1).padStart(3, '0')}`;
      let allocations = {};

      if (note.allocations && typeof note.allocations === 'object') {
        allocations = { ...note.allocations };
      } else if (Array.isArray(note.itens || note.items)) {
        const arr = note.itens || note.items;
        for (const item of arr) {
          const key = buildSourceItemKey(item) || item.id || item.codigo;
          const q = item.quantidade ?? item.quantity ?? item.allocatedQty ?? '0';
          allocations[key] = q;
        }
      }
      return { id, numero, allocations, raw: note };
    });
  } else if (destinationNotes && typeof destinationNotes === 'object') {
    notes = Object.entries(destinationNotes).map(([id, allocs], idx) => ({
      id,
      numero: `EXP-${String(idx + 1).padStart(3, '0')}`,
      allocations: typeof allocs === 'object' && allocs !== null ? allocs : {},
      raw: allocs,
    }));
  }

  // 2. Mapeia itens de origem por chave composta única
  const sourceMap = new Map();
  for (const item of safeSourceItems) {
    const key = buildSourceItemKey(item);
    sourceMap.set(key, item);
  }

  // 3. Processa saldos de conservação para cada item de origem
  const sourceBalances = {};
  const matrix = {};
  for (const note of notes) {
    matrix[note.id] = {};
  }

  let totalAllocatedItems = 0;
  let hasAnyExcess = false;
  let hasAnyNegative = false;
  let hasAnyRemaining = false;
  let allBalanced = safeSourceItems.length > 0;
  let hasAtLeastOneAllocation = false;

  let totalSourceValue = '0.00';
  let totalAllocatedValue = '0.00';

  let balancedCount = 0;
  let partialCount = 0;
  let excessCount = 0;
  let unallocatedCount = 0;

  for (const [key, item] of sourceMap.entries()) {
    const parsed = parseSourceItemKey(key);
    const sourceInvoiceId = item.sourceInvoiceId || parsed.sourceInvoiceId || '';
    const sourceItemId = item.sourceItemId || parsed.sourceItemId || '';
    const originalQtyStr = cleanDecimalString(item.quantidade ?? '0');
    const unitPriceStr = cleanDecimalString(item.valorUnitario ?? '0');

    const origItemTotal = item.valorTotal ?? calculateItemTotal(unitPriceStr, originalQtyStr);
    totalSourceValue = decimalAdd(totalSourceValue, origItemTotal, 2);

    let priorAllocated = '0.0000';
    if (activeAllocations instanceof Map) {
      priorAllocated = activeAllocations.get(key) || '0.0000';
    } else if (activeAllocations && typeof activeAllocations === 'object') {
      priorAllocated = activeAllocations[key] || '0.0000';
    }

    const currentAllocationsByNote = {};
    for (const note of notes) {
      let allocatedQty = note.allocations[key];
      if (allocatedQty === undefined && note.allocations[sourceItemId] !== undefined) {
        allocatedQty = note.allocations[sourceItemId];
      }
      if (allocatedQty === undefined && item.id && note.allocations[item.id] !== undefined) {
        allocatedQty = note.allocations[item.id];
      }
      currentAllocationsByNote[note.id] = cleanDecimalString(allocatedQty || '0');
    }

    const balance = calculateItemConservationBalance(
      originalQtyStr,
      currentAllocationsByNote,
      priorAllocated,
      4
    );

    if (balance.hasExcess) hasAnyExcess = true;
    if (balance.hasNegative) hasAnyNegative = true;
    if (balance.hasRemaining) hasAnyRemaining = true;
    if (!balance.isBalanced) allBalanced = false;

    if (decimalCompare(balance.allocatedQtyTotal, '0') > 0) {
      hasAtLeastOneAllocation = true;
    }

    if (balance.status === ALLOCATION_STATUS.OK) balancedCount++;
    else if (balance.status === ALLOCATION_STATUS.EXCESS) excessCount++;
    else {
      if (decimalCompare(balance.allocatedQtyTotal, '0') === 0) unallocatedCount++;
      else partialCount++;
    }

    sourceBalances[key] = {
      sourceKey: key,
      sourceInvoiceId,
      sourceItemId,
      codigo: item.codigo || '',
      descricao: item.descricao || '',
      unidade: item.unidade || '',
      ncm: item.ncm || '',
      itemNumber: item.item,
      ...balance,
      isOk: balance.status === ALLOCATION_STATUS.OK,
    };

    for (const note of notes) {
      const qAlloc = currentAllocationsByNote[note.id];
      const lineTotal = decimalMultiply(unitPriceStr, qAlloc, 2);

      if (decimalCompare(qAlloc, '0') > 0) {
        totalAllocatedItems++;
        totalAllocatedValue = decimalAdd(totalAllocatedValue, lineTotal, 2);
      }

      matrix[note.id][key] = {
        sourceKey: key,
        sourceInvoiceId,
        sourceItemId,
        allocatedQty: roundDecimal(qAlloc, 4),
        remainingQty: balance.remainingQty,
        unitPrice: unitPriceStr,
        lineTotal,
        apportionedExpenses: {
          freight: '0.00',
          insurance: '0.00',
          otherExpenses: '0.00',
          discount: '0.00',
          valorFrete: '0.00',
          valorSeguro: '0.00',
          outrasDespesas: '0.00',
          valorDesconto: '0.00',
        },
      };
    }
  }

  // 4. Rateio Proporcional de Despesas Acessórias Multi-Origem (Zero-Drift)
  const uniqueOrigins = new Set();
  for (const item of safeSourceItems) {
    const invId = item.sourceInvoiceId || parseSourceItemKey(buildSourceItemKey(item)).sourceInvoiceId;
    if (invId) uniqueOrigins.add(invId);
  }

  const destinationExpenseTotals = {};
  for (const note of notes) {
    destinationExpenseTotals[note.id] = {
      freight: '0.00',
      insurance: '0.00',
      otherExpenses: '0.00',
      discount: '0.00',
    };
  }

  for (const originId of uniqueOrigins) {
    let originTotals = sourceInvoiceTotals[originId];
    if (!originTotals) {
      let sumFrete = '0.00';
      let sumSeguro = '0.00';
      let sumOutras = '0.00';
      let sumDesc = '0.00';
      for (const item of safeSourceItems) {
        const invId = item.sourceInvoiceId || parseSourceItemKey(buildSourceItemKey(item)).sourceInvoiceId;
        if (invId === originId) {
          sumFrete = decimalAdd(sumFrete, item.frete ?? item.valorFrete ?? '0.00', 2);
          sumSeguro = decimalAdd(sumSeguro, item.seguro ?? item.valorSeguro ?? '0.00', 2);
          sumOutras = decimalAdd(sumOutras, item.outrasDespesas ?? '0.00', 2);
          sumDesc = decimalAdd(sumDesc, item.desconto ?? item.valorDesconto ?? '0.00', 2);
        }
      }
      originTotals = {
        valorFrete: sumFrete,
        valorSeguro: sumSeguro,
        outrasDespesas: sumOutras,
        valorDesconto: sumDesc,
      };
    }

    const origFrete = cleanDecimalString(originTotals.valorFrete ?? originTotals.freight ?? '0.00');
    const origSeguro = cleanDecimalString(originTotals.valorSeguro ?? originTotals.insurance ?? '0.00');
    const origOutras = cleanDecimalString(originTotals.outrasDespesas ?? originTotals.otherExpenses ?? '0.00');
    const origDesconto = cleanDecimalString(originTotals.valorDesconto ?? originTotals.discount ?? '0.00');

    const originProdByDest = notes.map((note) => {
      let prodSum = '0.00';
      for (const [key, item] of sourceMap.entries()) {
        const parsed = parseSourceItemKey(key);
        const invId = item.sourceInvoiceId || parsed.sourceInvoiceId;
        if (invId === originId) {
          const cell = matrix[note.id][key];
          if (cell) {
            prodSum = decimalAdd(prodSum, cell.lineTotal, 2);
          }
        }
      }
      return prodSum;
    });

    const totalAllocatedOriginProd = decimalSum(originProdByDest);

    if (decimalCompare(totalAllocatedOriginProd, '0') > 0) {
      const freteParts = decimalApportionProportional(origFrete, originProdByDest, 2);
      const seguroParts = decimalApportionProportional(origSeguro, originProdByDest, 2);
      const outrasParts = decimalApportionProportional(origOutras, originProdByDest, 2);
      const descontoParts = decimalApportionProportional(origDesconto, originProdByDest, 2);

      for (let i = 0; i < notes.length; i++) {
        const destId = notes[i].id;
        destinationExpenseTotals[destId].freight = decimalAdd(
          destinationExpenseTotals[destId].freight,
          freteParts[i] || '0.00',
          2
        );
        destinationExpenseTotals[destId].insurance = decimalAdd(
          destinationExpenseTotals[destId].insurance,
          seguroParts[i] || '0.00',
          2
        );
        destinationExpenseTotals[destId].otherExpenses = decimalAdd(
          destinationExpenseTotals[destId].otherExpenses,
          outrasParts[i] || '0.00',
          2
        );
        destinationExpenseTotals[destId].discount = decimalAdd(
          destinationExpenseTotals[destId].discount,
          descontoParts[i] || '0.00',
          2
        );
      }
    }
  }

  // 5. Consolida os resumos financeiros e fiscais de cada nota de destino
  const destinationSummaries = notes.map((note) => {
    let noteTotalProducts = '0.00';
    let noteTotalQty = '0.0000';
    let allocatedItemsCount = 0;
    const destItems = [];

    for (const [key, cell] of Object.entries(matrix[note.id])) {
      if (decimalCompare(cell.allocatedQty, '0') > 0) {
        allocatedItemsCount++;
        noteTotalQty = decimalAdd(noteTotalQty, cell.allocatedQty, 4);
        noteTotalProducts = decimalAdd(noteTotalProducts, cell.lineTotal, 2);

        const src = sourceMap.get(key);
        destItems.push({
          sourceKey: key,
          sourceInvoiceId: src?.sourceInvoiceId || parseSourceItemKey(key).sourceInvoiceId,
          sourceItemId: src?.sourceItemId || parseSourceItemKey(key).sourceItemId,
          codigo: src?.codigo || '',
          descricao: src?.descricao || '',
          ncm: src?.ncm || '',
          unidade: src?.unidade || '',
          quantidade: cell.allocatedQty,
          valorUnitario: cell.unitPrice,
          valorTotal: cell.lineTotal,
          sourceInvoiceNumero: src?.sourceInvoiceNumero,
          sourceEmitente: src?.sourceEmitente,
        });
      }
    }

    const expenses = destinationExpenseTotals[note.id];
    const totals = calculateInvoiceTotals(destItems, {
      discount: expenses.discount,
      freight: expenses.freight,
      insurance: expenses.insurance,
      otherExpenses: expenses.otherExpenses,
    });

    return {
      destinationId: note.id,
      noteId: note.id,
      numero: note.numero,
      allocatedItemsCount,
      totalQuantity: noteTotalQty,
      totalProducts: totals.totalProducts,
      totalFreight: totals.totalFreight,
      totalSeguro: totals.totalInsurance,
      totalFrete: totals.totalFreight,
      totalInsurance: totals.totalInsurance,
      totalOtherExpenses: totals.totalOtherExpenses,
      totalOutrasDespesas: totals.totalOtherExpenses,
      totalDiscount: totals.totalDiscount,
      totalDesconto: totals.totalDiscount,
      totalInvoice: totals.totalInvoice,
      totalNote: totals.totalInvoice,
      items: destItems,
    };
  });

  const destinationTotals = {};
  for (const ds of destinationSummaries) {
    destinationTotals[ds.destinationId] = ds;
  }

  // 6. Avaliação de elegibilidade para salvamento (canSave)
  let canSave = true;

  if (notes.length < minDestinations && safeSourceItems.length > 0) {
    canSave = false;
  }
  if (hasAnyExcess || hasAnyNegative) {
    canSave = false;
  }
  if (requireBalanced && (!allBalanced || hasAnyRemaining)) {
    canSave = false;
  }

  const isValid = !hasAnyExcess && !hasAnyNegative && (!requireBalanced || !hasAnyRemaining);

  return {
    matrix,
    sourceBalances,
    destinationSummaries,
    destinationTotals,
    canSave,
    isValid,
    hasExcess: hasAnyExcess,
    hasNegative: hasAnyNegative,
    hasRemaining: hasAnyRemaining,
    isBalanced: allBalanced,
    totals: {
      totalSourceValue,
      totalAllocatedValue,
      totalSourceItems: safeSourceItems.length,
      totalAllocatedItems,
    },
    summary: {
      totalSourceItemsCount: safeSourceItems.length,
      totalItemsCount: safeSourceItems.length,
      destinationNotesCount: notes.length,
      balancedCount,
      partialCount,
      remainingCount: partialCount + unallocatedCount,
      excessCount,
      unallocatedCount,
    },
  };
}

/**
 * Validador de lote de preparação unificado, fornecendo adapter compatível
 * tanto com os contratos modernos quanto com o validador legado de divisão.
 * 
 * @param {Array<object>} sourceItems
 * @param {Array<object>|object} destinationNotes
 * @param {Map|object} [activeAllocations={}]
 * @param {object} [options={}]
 * @returns {object}
 */
export function validateAllocationBatch(
  sourceItems = [],
  destinationNotes = [],
  activeAllocations = {},
  options = {}
) {
  const result = calculateAllocationMatrix(sourceItems, destinationNotes, activeAllocations, options);

  const itemReports = Object.values(result.sourceBalances).map((b) => ({
    itemId: b.sourceItemId || b.sourceKey,
    itemNumber: b.itemNumber,
    codigo: b.codigo,
    descricao: b.descricao,
    unidade: b.unidade,
    sourceKey: b.sourceKey,
    sourceInvoiceId: b.sourceInvoiceId,
    sourceItemId: b.sourceItemId,
    originalQty: b.originalQty,
    availableQty: b.availableQty,
    unitPrice: b.unitPrice ?? '0.00',
    totalAllocated: b.allocatedQtyTotal,
    balanceStr: b.remainingQty,
    status: b.status === ALLOCATION_STATUS.PARTIAL ? 'remaining' : b.status,
    allocationsByNote: Object.fromEntries(
      Object.keys(result.matrix).map((destId) => [
        destId,
        result.matrix[destId][b.sourceKey]?.allocatedQty || '0.0000',
      ])
    ),
  }));

  const notesSummary = result.destinationSummaries.map((ds) => ({
    noteId: ds.destinationId,
    numero: ds.numero,
    allocatedItemsCount: ds.allocatedItemsCount,
    totalQuantity: ds.totalQuantity,
    totalProducts: ds.totalProducts,
    totalFrete: ds.totalFreight,
    totalSeguro: ds.totalInsurance,
    totalOutrasDespesas: ds.totalOtherExpenses,
    totalDesconto: ds.totalDiscount,
    totalNote: ds.totalInvoice,
  }));

  return {
    isValid: result.isValid,
    canSave: result.canSave,
    hasExcess: result.hasExcess,
    hasRemaining: result.hasRemaining,
    isBalanced: result.isBalanced,
    summary: {
      totalItemsCount: result.summary.totalItemsCount,
      destinationNotesCount: result.summary.destinationNotesCount,
      balancedCount: result.summary.balancedCount,
      remainingCount: result.summary.remainingCount,
      excessCount: result.summary.excessCount,
    },
    itemReports,
    notesSummary,
    matrix: result.matrix,
    sourceBalances: result.sourceBalances,
    destinationSummaries: result.destinationSummaries,
    destinationTotals: result.destinationTotals,
    totals: result.totals,
  };
}

const allocationEngine = {
  ALLOCATION_STATUS,
  UNIT_FAMILIES,
  buildCompositeKey,
  buildSourceItemKey,
  makeSourceKey,
  parseCompositeKey,
  parseSourceKey,
  parseSourceItemKey,
  normalizeUnit,
  checkUnitCompatibility,
  calculateItemConservationBalance,
  calculateItemBalance,
  distributeEqually,
  distributeRemainingEqually,
  apportionExpenses,
  apportionMultiSourceExpenses,
  calculateAllocationMatrix,
  validateAllocationBatch,
};

export default allocationEngine;
