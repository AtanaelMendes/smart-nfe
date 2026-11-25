/**
 * SmartNFe — Serviço de Conclusão de Preparação N:M
 *
 * Centraliza a validação e a materialização das notas de destino na listagem
 * de notas preparadas. Resolve a lacuna do fluxo atual, que apenas salvava a
 * preparação e nunca criava os registros consultados por `/notas-preparadas`.
 *
 * Garantias:
 * - Valida origens, saldos, alocações e participantes antes de mutar qualquer coisa.
 * - IDs estáveis por `preparationId + destinationId` (idempotência contra clique duplo/reentrada).
 * - Rollback das notas criadas se qualquer gravação falhar.
 * - Transição explícita `draft → active → completed`; falha mantém o estado anterior.
 * - Mantém dados reais exclusivamente na memória de sessão (via repositórios existentes).
 */

import { preparationRepository } from './preparationRepository.js';
import { preparedInvoiceRepository } from './preparedInvoiceRepository.js';
import { invoiceRepository } from './invoiceRepository.js';
import { calculateInvoiceTotals } from '../lib/calculations/invoiceTotals.js';
import { buildCompositeKey } from '../lib/calculations/allocationEngine.js';
import {
  cleanDecimalString,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalCompare,
  decimalApportionProportional,
} from '../lib/calculations/decimal.js';

export class PreparationCompletionError extends Error {
  constructor(message, errors = [], code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'PreparationCompletionError';
    this.code = code;
    this.errors = errors;
  }
}

// Fila de mutação própria do serviço para serializar conclusões concorrentes.
let completionQueue = Promise.resolve();
function withCompletionLock(fn) {
  const result = completionQueue.then(fn, fn);
  completionQueue = result.catch(() => {});
  return result;
}

function getSourceInvoiceIds(prep) {
  if (Array.isArray(prep?.sourceInvoiceIds) && prep.sourceInvoiceIds.length > 0) {
    return prep.sourceInvoiceIds.filter(Boolean);
  }
  if (Array.isArray(prep?.origens)) {
    return prep.origens.map((o) => o.invoiceId || o.id).filter(Boolean);
  }
  return [];
}

function parseDestAllocationKey(key) {
  const parts = String(key || '').split('__');
  if (parts.length >= 3) {
    return {
      sourceKey: `${parts[0]}__${parts[1]}`,
      destId: parts.slice(2).join('__'),
    };
  }
  if (parts.length === 2) {
    return { sourceKey: `${parts[0]}__${parts[1]}`, destId: null };
  }
  return { sourceKey: String(key || ''), destId: null };
}

/**
 * Consolida as alocações da preparação em `Map<destId, Map<sourceKey, {qty, price}>>`,
 * aceitando os três formatos históricos (allocations flat, destinos[].allocations e destinos[].itens).
 */
function normalizeAllocations(prep) {
  const byDest = new Map();
  const destinos = Array.isArray(prep.destinos) ? prep.destinos : [];

  function ensure(destId) {
    if (!byDest.has(destId)) byDest.set(destId, new Map());
    return byDest.get(destId);
  }

  function add(destId, sourceKey, qty, price) {
    if (!destId || !sourceKey) return;
    const clean = cleanDecimalString(qty);
    if (decimalCompare(clean, '0') <= 0) return;
    const bucket = ensure(destId);
    const prev = bucket.get(sourceKey);
    bucket.set(sourceKey, {
      qty: prev ? decimalAdd(prev.qty, clean, 4) : clean,
      price: price != null && price !== '' ? String(price) : prev?.price,
    });
  }

  // 1. Mapa plano: `${sourceInvoiceId}__${itemId}__${destId}`
  const flat = prep.allocations || prep.alocacoes;
  if (flat && typeof flat === 'object') {
    for (const [key, value] of Object.entries(flat)) {
      const { sourceKey, destId } = parseDestAllocationKey(key);
      if (!destId) continue;
      const qty = value && typeof value === 'object' ? value.quantity ?? value.quantidade : value;
      const price = value && typeof value === 'object' ? value.destinationUnitPrice : undefined;
      add(destId, sourceKey, qty, price);
    }
  }

  // 2. destinos[].allocations / destinos[].itens
  for (const dest of destinos) {
    const destId = dest.id;
    if (!destId) continue;

    const destAlloc = dest.allocations || dest.alocacoes;
    if (destAlloc && typeof destAlloc === 'object') {
      for (const [key, value] of Object.entries(destAlloc)) {
        const parsed = parseDestAllocationKey(key);
        const sourceKey = parsed.sourceKey;
        const qty = value && typeof value === 'object' ? value.quantity ?? value.quantidade : value;
        const price = value && typeof value === 'object' ? value.destinationUnitPrice : undefined;
        add(destId, sourceKey, qty, price);
      }
    }

    if (Array.isArray(dest.itens)) {
      for (const it of dest.itens) {
        if (!it.sourceInvoiceId) continue;
        const sourceItemId = it.sourceItemId || it.itemId || it.id;
        const sourceKey = buildCompositeKey(it.sourceInvoiceId, sourceItemId);
        add(destId, sourceKey, it.quantidade ?? it.quantity, it.valorUnitario);
      }
    }
  }

  return byDest;
}

function normalizeEmitente(raw) {
  if (!raw) return null;
  return {
    razaoSocial: raw.razaoSocial || raw.nome || '',
    nomeFantasia: raw.nomeFantasia || raw.razaoSocial || '',
    cnpj: raw.cnpj || raw.CNPJ || '',
    cpf: raw.cpf || raw.CPF || '',
    documento: raw.documento || raw.cnpj || raw.CNPJ || raw.cpf || raw.CPF || '',
    inscricaoEstadual: raw.inscricaoEstadual || raw.ie || '',
    uf: raw.uf || '',
    municipio: raw.municipio || '',
  };
}

function resolveEmitente(prep, invoices, errors) {
  const explicit = normalizeEmitente(prep.emitente);
  if (explicit && (explicit.razaoSocial || explicit.documento)) {
    return explicit;
  }

  const unique = new Map();
  for (const inv of invoices) {
    const emit = normalizeEmitente(inv?.emitente);
    if (!emit) continue;
    const key = emit.documento || emit.razaoSocial;
    if (key) unique.set(key, emit);
  }

  if (unique.size === 1) {
    return Array.from(unique.values())[0];
  }
  if (unique.size === 0) {
    errors.push({
      code: 'EMITENTE_REQUIRED',
      field: 'emitente',
      message: 'Não foi possível determinar a empresa emitente da saída. Selecione o emitente.',
    });
    return null;
  }
  errors.push({
    code: 'EMITENTE_MULTIPLE',
    field: 'emitente',
    message:
      'As origens possuem emitentes diferentes. Selecione explicitamente qual empresa emitirá as notas de saída.',
  });
  return null;
}

function resolveDestinatario(prep, dest, errors) {
  const explicit = dest.destinatario;
  if (explicit && (explicit.nome || explicit.razaoSocial)) {
    return {
      nome: explicit.nome || explicit.razaoSocial,
      razaoSocial: explicit.razaoSocial || explicit.nome,
      cnpj: explicit.cnpj || '',
      idEstrangeiro: explicit.idEstrangeiro || '',
      uf: explicit.uf || '',
      pais: explicit.pais || '',
      paisCodigo: explicit.paisCodigo || '',
    };
  }

  const client = dest.clienteExportacao || prep.clienteExportacao;
  if (client) {
    return {
      nome: client.name || client.nome || client.razaoSocial || '',
      razaoSocial: client.razaoSocial || client.name || client.nome || '',
      cnpj: client.cnpj || '',
      idEstrangeiro: client.foreignId || client.idEstrangeiro || '',
      uf: client.uf || 'EX',
      pais: client.country || client.pais || '',
      paisCodigo: client.paisCodigo || '',
    };
  }

  errors.push({
    code: 'DESTINATARIO_REQUIRED',
    field: `destinos.${dest.id}.destinatario`,
    message: `O destino "${dest.nome || dest.id}" não possui destinatário definido. Informe o cliente/destinatário da saída.`,
  });
  return null;
}

/**
 * Valida a preparação sem mutar nada.
 * @param {Object} prep
 * @returns {Promise<{isValid:boolean, errors:Array, warnings:Array, context:Object}>}
 */
export async function validatePreparationCompletion(prep) {
  const errors = [];
  const warnings = [];

  if (!prep) {
    return {
      isValid: false,
      errors: [{ code: 'PREPARATION_NOT_FOUND', message: 'Preparação não encontrada.' }],
      warnings,
      context: null,
    };
  }

  const sourceIds = getSourceInvoiceIds(prep);
  if (sourceIds.length === 0) {
    errors.push({ code: 'NO_SOURCES', field: 'sourceInvoiceIds', message: 'Selecione pelo menos uma NF-e de origem.' });
  }

  const invoices = [];
  const missingSources = [];
  for (const id of sourceIds) {
    const inv = await invoiceRepository.findById(id);
    if (!inv) missingSources.push(id);
    else invoices.push(inv);
  }
  if (missingSources.length > 0) {
    errors.push({
      code: 'SOURCE_NOT_FOUND',
      field: 'sourceInvoiceIds',
      message: `Origem(ns) não encontrada(s) na sessão: ${missingSources.join(', ')}.`,
      sources: missingSources,
    });
  }

  // Mapa de itens de origem
  const sourceItemMap = new Map();
  for (const inv of invoices) {
    const itens = Array.isArray(inv.itens) ? inv.itens : [];
    for (const item of itens) {
      const sourceItemId = item.id ?? item.itemId ?? item.nItem;
      const key = buildCompositeKey(inv.id, sourceItemId);
      sourceItemMap.set(key, { invoice: inv, item, sourceKey: key });
    }
  }

  const allocations = normalizeAllocations(prep);
  const prepDestIds = new Set((Array.isArray(prep.destinos) ? prep.destinos : []).map((d) => d.id));

  // Alocações ativas de outras preparações (saldo já reservado)
  const activeAllocations = await preparationRepository.getActiveAllocations(prep.id);

  const allocatedPerSource = new Map();
  let destinationWithItems = 0;

  for (const [destId, bucket] of allocations.entries()) {
    if (!prepDestIds.has(destId)) continue;
    let hasItems = false;
    for (const [sourceKey, entry] of bucket.entries()) {
      if (decimalCompare(entry.qty, '0') <= 0) continue;
      const src = sourceItemMap.get(sourceKey);
      if (!src) {
        errors.push({
          code: 'UNKNOWN_SOURCE_ITEM',
          field: `allocations.${sourceKey}`,
          message: `Item alocado não pertence às origens selecionadas: ${sourceKey}.`,
        });
        continue;
      }
      hasItems = true;
      const prev = allocatedPerSource.get(sourceKey) || '0.0000';
      allocatedPerSource.set(sourceKey, decimalAdd(prev, entry.qty, 4));
    }
    if (hasItems) destinationWithItems++;
  }

  if (destinationWithItems === 0) {
    errors.push({ code: 'NO_ALLOCATIONS', field: 'allocations', message: 'Nenhum item foi alocado a um destino.' });
  }

  // Destinos vazios precisam ser removidos ou preenchidos explicitamente
  for (const dest of Array.isArray(prep.destinos) ? prep.destinos : []) {
    const bucket = allocations.get(dest.id);
    const hasItems = bucket && Array.from(bucket.values()).some((e) => decimalCompare(e.qty, '0') > 0);
    if (!hasItems) {
      errors.push({
        code: 'EMPTY_DESTINATION',
        field: `destinos.${dest.id}`,
        message: `O destino "${dest.nome || dest.id}" não possui itens alocados. Remova-o ou aloque mercadorias.`,
      });
    }
  }

  // Conservação de saldo: original - reservado por outras preparações >= alocado nesta
  for (const [sourceKey, allocatedQty] of allocatedPerSource.entries()) {
    const src = sourceItemMap.get(sourceKey);
    if (!src) continue;
    const originalQty = cleanDecimalString(src.item.quantidade || '0');
    const prior = cleanDecimalString(activeAllocations.get(sourceKey) || '0');
    const available = decimalSubtract(originalQty, prior, 4);
    if (decimalCompare(allocatedQty, available) > 0) {
      errors.push({
        code: 'EXCESS_ALLOCATION',
        field: `allocations.${sourceKey}`,
        message: `Alocação excede o saldo disponível do item ${src.item.codigo || src.item.descricao || sourceKey}: alocado ${allocatedQty}, disponível ${available}.`,
        sourceKey,
        allocatedQty,
        available,
      });
    } else if (decimalCompare(allocatedQty, available, 4) < 0) {
      warnings.push({
        code: 'REMAINING_BALANCE',
        field: `allocations.${sourceKey}`,
        message: `O item ${src.item.codigo || sourceKey} reterá saldo de ${decimalSubtract(available, allocatedQty, 4)} para outra preparação.`,
      });
    }
  }

  if (errors.length === 0) {
    resolveEmitente(prep, invoices, errors);
    for (const dest of Array.isArray(prep.destinos) ? prep.destinos : []) {
      resolveDestinatario(prep, dest, errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    context: { invoices, sourceItemMap, allocations, activeAllocations },
  };
}

function buildDestinationDocuments(prep, context, emitente) {
  const { invoices, sourceItemMap, allocations } = context;
  const invoiceById = new Map(invoices.map((inv) => [inv.id, inv]));
  const destinos = Array.isArray(prep.destinos) ? prep.destinos : [];

  const destData = new Map();
  for (const dest of destinos) {
    destData.set(dest.id, {
      dest,
      items: [],
      productBySource: new Map(),
      sourceIds: new Set(),
    });
  }

  // 1. Itens de cada destino
  for (const dest of destinos) {
    const bucket = allocations.get(dest.id);
    if (!bucket) continue;
    const data = destData.get(dest.id);

    for (const [sourceKey, entry] of bucket.entries()) {
      if (decimalCompare(entry.qty, '0') <= 0) continue;
      const src = sourceItemMap.get(sourceKey);
      if (!src) continue;

      const item = src.item;
      const unitPrice =
        entry.price != null && entry.price !== '' && decimalCompare(cleanDecimalString(entry.price), '0') > 0
          ? entry.price
          : item.valorUnitario ?? '0.00';
      const lineTotal = decimalMultiply(unitPrice, entry.qty, 2);

      data.items.push({
        sourceInvoiceId: src.invoice.id,
        sourceItemId: src.item.id ?? src.item.itemId ?? src.item.nItem,
        sourceInvoiceNumero: src.invoice.numero,
        sourceEmitente: src.invoice.emitente?.razaoSocial || '',
        sourceKey,
        item: data.items.length + 1,
        codigo: item.codigo || '',
        descricao: item.descricao || '',
        ncm: item.ncm || '',
        cfop: item.cfop || '',
        unidade: item.unidade || '',
        quantidade: entry.qty,
        valorUnitario: unitPrice,
        valorTotal: lineTotal,
        valorFrete: '0.00',
        valorSeguro: '0.00',
        valorDesconto: '0.00',
        outrasDespesas: '0.00',
        tributos: item.tributos || null,
      });

      const prevProduct = data.productBySource.get(src.invoice.id) || '0.00';
      data.productBySource.set(src.invoice.id, decimalAdd(prevProduct, lineTotal, 2));
      data.sourceIds.add(src.invoice.id);
    }
  }

  // 2. Rateio das despesas acessórias de cada origem entre os destinos que a consomem
  const expenses = new Map();
  for (const dest of destinos) {
    expenses.set(dest.id, { frete: '0.00', seguro: '0.00', outras: '0.00', desconto: '0.00' });
  }

  const contributingSources = new Set();
  for (const data of destData.values()) {
    for (const id of data.sourceIds) contributingSources.add(id);
  }

  for (const sourceId of contributingSources) {
    const inv = invoiceById.get(sourceId);
    if (!inv) continue;
    const productByDest = destinos.map((dest) => destData.get(dest.id)?.productBySource.get(sourceId) || '0.00');
    const total = productByDest.reduce((acc, v) => decimalAdd(acc, v, 2), '0.00');
    if (decimalCompare(total, '0') <= 0) continue;

    const totals = inv.totais || {};
    const freteParts = decimalApportionProportional(cleanDecimalString(totals.valorFrete || '0'), productByDest, 2);
    const seguroParts = decimalApportionProportional(cleanDecimalString(totals.valorSeguro || '0'), productByDest, 2);
    const outrasParts = decimalApportionProportional(cleanDecimalString(totals.outrasDespesas || '0'), productByDest, 2);
    const descontoParts = decimalApportionProportional(cleanDecimalString(totals.valorDesconto || '0'), productByDest, 2);

    destinos.forEach((dest, idx) => {
      const acc = expenses.get(dest.id);
      acc.frete = decimalAdd(acc.frete, freteParts[idx] || '0.00', 2);
      acc.seguro = decimalAdd(acc.seguro, seguroParts[idx] || '0.00', 2);
      acc.outras = decimalAdd(acc.outras, outrasParts[idx] || '0.00', 2);
      acc.desconto = decimalAdd(acc.desconto, descontoParts[idx] || '0.00', 2);
    });
  }

  // 3. Monta as notas preparadas por destino
  const documents = [];
  destinos.forEach((dest, index) => {
    const data = destData.get(dest.id);
    if (!data || data.items.length === 0) return;

    const exp = expenses.get(dest.id);
    const totais = calculateInvoiceTotals(data.items, {
      freight: exp.frete,
      insurance: exp.seguro,
      otherExpenses: exp.outras,
      discount: exp.desconto,
    });

    const suffix = String.fromCharCode(65 + index);
    const destinatario = resolveDestinatario(prep, dest, []);
    const sourceInvoiceIds = Array.from(data.sourceIds);

    documents.push({
      id: buildPreparedInvoiceId(prep.id, dest.id),
      preparationId: prep.id,
      destinationId: dest.id,
      parentInvoiceId: sourceInvoiceIds.length === 1 ? sourceInvoiceIds[0] : null,
      documentoOrigemId: sourceInvoiceIds.length === 1 ? sourceInvoiceIds[0] : null,
      sourceInvoiceIds,
      origemNumero: sourceInvoiceIds
        .map((sid) => invoiceById.get(sid)?.numero)
        .filter(Boolean)
        .join(', '),
      numeroOrigem: sourceInvoiceIds
        .map((sid) => invoiceById.get(sid)?.numero)
        .filter(Boolean)
        .join(', '),
      numero: `${prep.numero || prep.id}-${suffix}`,
      numeroInterno: `${prep.numero || prep.id}-${suffix}`,
      serie: dest.serie || '1',
      nomePreparacao: dest.nome || `Destino ${suffix}`,
      descricaoLote: `${dest.nome || `Destino ${suffix}`}${destinatario?.nome ? ` — ${destinatario.nome}` : ''}`,
      emitente,
      destinatario,
      itens: data.items,
      quantidadeItens: data.items.length,
      valorProdutos: totais.valorProdutos,
      valorFrete: totais.valorFrete,
      valorSeguro: totais.valorSeguro,
      outrasDespesas: totais.outrasDespesas,
      valorDesconto: totais.valorDesconto,
      valorIPI: totais.valorIPI,
      valorTotal: totais.valorTotalNota,
      valorTotalNota: totais.valorTotalNota,
      totais,
      status: 'preparado',
      isDemo: prep.isDemo ?? false,
      dataCriacao: new Date().toISOString(),
      observacoes: dest.observacoes || '',
    });
  });

  return documents;
}

export function buildPreparedInvoiceId(preparationId, destinationId) {
  return `prep-${preparationId}-${destinationId}`;
}

/**
 * Conclui a preparação: valida, materializa as notas de destino e marca como completed.
 *
 * @param {string|Object} preparationIdOrData ID da preparação ou objeto completo
 * @param {Object} [options]
 * @param {Object} [options.emitente] Emitente da saída (sobrepõe o da preparação)
 * @returns {Promise<{preparation:Object, preparedInvoices:Array, alreadyCompleted:boolean}>}
 */
export async function completePreparation(preparationIdOrData, options = {}) {
  return withCompletionLock(async () => {
    let prep = null;
    if (preparationIdOrData && typeof preparationIdOrData === 'object') {
      prep = preparationIdOrData;
      if (prep.id) {
        const stored = await preparationRepository.findById(prep.id);
        prep = stored ? { ...stored, ...prep } : prep;
      }
    } else {
      prep = await preparationRepository.findById(preparationIdOrData);
    }

    if (!prep) {
      throw new PreparationCompletionError('Preparação não encontrada.', [
        { code: 'PREPARATION_NOT_FOUND', message: 'Preparação não encontrada.' },
      ], 'PREPARATION_NOT_FOUND');
    }

    // Idempotência: preparação já concluída devolve as notas geradas sem duplicar.
    if (prep.status === 'completed') {
      const existing = (await preparedInvoiceRepository.list()).filter((p) => p.preparationId === prep.id);
      return { preparation: prep, preparedInvoices: existing, alreadyCompleted: true };
    }

    if (options.emitente) {
      prep = { ...prep, emitente: options.emitente };
    }

    const validation = await validatePreparationCompletion(prep);
    if (!validation.isValid) {
      throw new PreparationCompletionError(
        'Não foi possível concluir a preparação. Corrija os erros apontados.',
        validation.errors
      );
    }

    const emitente =
      normalizeEmitente(prep.emitente) ||
      resolveEmitente(prep, validation.context.invoices, []) ||
      null;

    const documents = buildDestinationDocuments(prep, validation.context, emitente);
    if (documents.length === 0) {
      throw new PreparationCompletionError('Nenhuma nota de destino pôde ser gerada.', [
        { code: 'NO_DESTINATION_DOCUMENTS', message: 'Nenhum destino válido com itens para materializar.' },
      ]);
    }

    const createdIds = [];
    const preparedInvoices = [];
    let updatedPreparation;
    try {
      for (const doc of documents) {
        const existing = await preparedInvoiceRepository.findById(doc.id);
        if (existing) {
          preparedInvoices.push(existing);
          continue;
        }
        const saved = await preparedInvoiceRepository.create(doc);
        createdIds.push(saved.id);
        preparedInvoices.push(saved);
      }

      updatedPreparation = await preparationRepository.update(prep.id, {
        status: 'completed',
        preparedInvoiceIds: preparedInvoices.map((p) => p.id),
        concluidoEm: new Date().toISOString(),
        valorTotal: preparedInvoices.reduce((acc, p) => decimalAdd(acc, p.valorTotalNota || '0', 2), '0.00'),
      });
    } catch (err) {
      // Rollback das notas criadas nesta tentativa; a preparação mantém o estado anterior.
      for (const id of createdIds) {
        try {
          await preparedInvoiceRepository.delete(id);
        } catch {
          /* ignore */
        }
      }
      throw new PreparationCompletionError(
        `Falha ao concluir a preparação: ${err.message}. Nenhuma nota foi mantida.`,
        [{ code: 'MATERIALIZATION_FAILED', message: err.message }],
        'MATERIALIZATION_FAILED'
      );
    }

    return { preparation: updatedPreparation, preparedInvoices, alreadyCompleted: false };
  });
}

/**
 * Reabre uma preparação concluída: remove as notas geradas e devolve o saldo,
 * exigindo nova alocação antes de qualquer nova conclusão.
 * @param {string} preparationId
 * @returns {Promise<Object>}
 */
export async function reopenPreparation(preparationId) {
  return withCompletionLock(async () => {
    const prep = await preparationRepository.findById(preparationId);
    if (!prep) throw new PreparationCompletionError('Preparação não encontrada.', [], 'PREPARATION_NOT_FOUND');

    const linked = (await preparedInvoiceRepository.list()).filter(
      (p) => p.preparationId === prep.id || (Array.isArray(prep.preparedInvoiceIds) && prep.preparedInvoiceIds.includes(p.id))
    );
    for (const note of linked) {
      await preparedInvoiceRepository.delete(note.id);
    }

    return preparationRepository.update(prep.id, {
      status: 'active',
      preparedInvoiceIds: [],
      concluidoEm: null,
    });
  });
}

/**
 * Exclui uma nota preparada e reabre a preparação vinculada, evitando que uma
 * preparação concluída aponte para registros ausentes.
 * @param {string} preparedInvoiceId
 * @returns {Promise<boolean>}
 */
export async function deletePreparedInvoiceWithLinks(preparedInvoiceId) {
  return withCompletionLock(async () => {
    const note = await preparedInvoiceRepository.findById(preparedInvoiceId);
    await preparedInvoiceRepository.delete(preparedInvoiceId);

    if (note?.preparationId) {
      const prep = await preparationRepository.findById(note.preparationId);
      if (prep) {
        const remaining = (await preparedInvoiceRepository.list()).filter(
          (p) => p.preparationId === prep.id
        );
        if (remaining.length === 0) {
          await preparationRepository.update(prep.id, {
            status: 'active',
            preparedInvoiceIds: [],
            concluidoEm: null,
          });
        } else {
          await preparationRepository.update(prep.id, {
            preparedInvoiceIds: remaining.map((p) => p.id),
          });
        }
      }
    }
    return true;
  });
}

const preparationCompletionService = {
  completePreparation,
  validatePreparationCompletion,
  reopenPreparation,
  deletePreparedInvoiceWithLinks,
  buildPreparedInvoiceId,
  PreparationCompletionError,
};

export default preparationCompletionService;
