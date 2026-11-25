/**
 * SmartNFe — Mapeador de XML NF-e Modelo 55 para o Contrato de Invoice
 *
 * Características:
 * - Mapeia dados extraídos de XML (nfeProc ou NFe) para o contrato de invoiceRepository
 * - Gera identificadores determinísticos estáveis para produtos: `nfe-${chaveAcesso}-item-${nItem}`
 * - Normaliza quantidades com precisão de até 4 casas decimais via motor decimal
 * - Preserva valores unitários com precisão estendida (4 a 10 casas decimais)
 * - Garante flags de segurança: `isRealImport: true` e `isDemo: false`
 * - Preserva totais fiscais (produtos, frete, seguro, outras despesas, descontos, total da NF-e)
 * - Reconcilia totais ausentes via `calculateInvoiceTotals`
 */

import {
  cleanDecimalString,
  roundDecimal,
  parseDecimal,
  decimalAdd,
  isDecimalZero,
} from '../../lib/calculations/decimal.js';

import {
  calculateItemTotal,
  calculateInvoiceTotals,
} from '../../lib/calculations/invoiceTotals.js';

/**
 * Gera o identificador determinístico e estável de um item de NF-e.
 *
 * @param {string} chaveAcesso Chave de acesso de 44 dígitos
 * @param {number|string} nItem Número sequencial do item (1-based)
 * @returns {string} Identificador estável (ex: "nfe-35241112345678000190550010001458921001234562-item-1")
 */
export function generateItemId(chaveAcesso, nItem) {
  const cleanKey = String(chaveAcesso || '').replace(/^NFe/i, '').replace(/\D/g, '');
  const itemNum = parseInt(String(nItem), 10) || 1;
  return `nfe-${cleanKey}-item-${itemNum}`;
}

/**
 * Formata o número da nota fiscal com zeros à esquerda e separadores de milhar (padrão 9 dígitos).
 * Exemplo: "145892" -> "000.145.892"
 *
 * @param {string|number} nNF
 * @returns {string}
 */
export function formatInvoiceNumber(nNF) {
  if (nNF === null || nNF === undefined || nNF === '') {
    return '000.000.000';
  }
  const digits = String(nNF).replace(/\D/g, '');
  if (!digits) return '000.000.000';
  const padded = digits.padStart(9, '0');
  return `${padded.slice(0, 3)}.${padded.slice(3, 6)}.${padded.slice(6, 9)}`;
}

/**
 * Formata documento brasileiro (CNPJ com 14 dígitos ou CPF com 11 dígitos).
 *
 * @param {string} value
 * @returns {string}
 */
export function formatCNPJorCPF(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return String(value).trim();
}

/**
 * Normaliza quantidades fiscais para string decimal com até 4 casas decimais.
 *
 * @param {string|number|null|undefined} value
 * @returns {string} Ex: "500.0000" ou "12.3456"
 */
export function normalizeQuantity(value) {
  const cleaned = cleanDecimalString(value);
  return roundDecimal(cleaned, 4);
}

/**
 * Normaliza valores unitários preservando precisão estendida (mínimo 4 casas, até 10 casas).
 *
 * @param {string|number|null|undefined} value
 * @returns {string} Ex: "25.5000" ou "686.6667" ou "0.123456"
 */
export function normalizeUnitPrice(value) {
  const cleaned = cleanDecimalString(value);
  const parsed = parseDecimal(cleaned);
  // Escala mínima de 4 decimais para conformidade com os mocks, até 10 decimais para commodities
  const targetScale = Math.max(4, Math.min(10, parsed.scale));
  return roundDecimal(cleaned, targetScale);
}

/**
 * Normaliza valores monetários padrão com exatamente 2 casas decimais.
 *
 * @param {string|number|null|undefined} value
 * @returns {string} Ex: "12750.00"
 */
export function normalizeMonetary(value) {
  const cleaned = cleanDecimalString(value);
  return roundDecimal(cleaned, 2);
}

/**
 * Normaliza pesos de transporte com 3 casas decimais.
 *
 * @param {string|number|null|undefined} value
 * @returns {string} Ex: "45000.000"
 */
export function normalizeWeight(value) {
  const cleaned = cleanDecimalString(value);
  return roundDecimal(cleaned, 3);
}

/**
 * Mapeia os dados brutos extraídos do XML de NF-e para o contrato estrito de Invoice.
 *
 * @param {Object} extractedData Objeto contendo os dados extraídos pelo parser
 * @returns {Object} Invoice em total conformidade com o contrato de invoiceRepository
 */
export function mapXmlToInvoice(extractedData) {
  if (!extractedData || typeof extractedData !== 'object') {
    throw new Error('Dados do XML não fornecidos ou formato inválido para mapeamento.');
  }

  // 1. Chave de acesso e Identificador
  const rawChave = extractedData.chaveAcesso ||
    extractedData.chNFe ||
    extractedData.ide?.chaveAcesso ||
    (extractedData.protocolo && extractedData.protocolo.chNFe) ||
    '';
  const chaveAcesso = String(rawChave).replace(/^NFe/i, '').replace(/\D/g, '');
  const invoiceId = `nfe-${chaveAcesso}`;

  // 2. Dados de identificação (ide)
  const ide = extractedData.ide || {};
  const numeroNF = ide.nNF || extractedData.numero || '';
  const serie = String(ide.serie || extractedData.serie || '1');
  const dhEmi = ide.dhEmi || extractedData.dataEmissao || '';
  const dEmi = ide.dEmi || extractedData.emissao || '';

  const emissao = dhEmi ? dhEmi.slice(0, 10) : (dEmi ? dEmi.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const dataEmissao = dhEmi || (dEmi ? `${dEmi}T00:00:00Z` : new Date().toISOString());

  // 3. Emitente
  const emit = extractedData.emitente || extractedData.emit || {};
  const enderEmit = emit.enderEmit || emit.endereco || {};
  const emitente = {
    cnpj: formatCNPJorCPF(emit.CNPJ || emit.CPF || emit.cnpj || ''),
    razaoSocial: String(emit.xNome || emit.razaoSocial || '').trim(),
    nomeFantasia: String(emit.xFant || emit.nomeFantasia || emit.xNome || emit.razaoSocial || '').trim(),
    inscricaoEstadual: String(emit.IE || emit.inscricaoEstadual || '').trim(),
    crt: String(emit.CRT || emit.crt || '').trim(),
    uf: String(enderEmit.UF || emit.uf || '').trim().toUpperCase(),
    municipio: String(enderEmit.xMun || emit.municipio || '').trim(),
    endereco: emit.endereco || (Object.keys(enderEmit).length > 0 ? enderEmit : null),
  };

  // 4. Destinatário
  const dest = extractedData.destinatario || extractedData.dest || {};
  const enderDest = dest.enderDest || dest.endereco || {};
  const destUf = String(enderDest.UF || dest.uf || '').trim().toUpperCase();
  const destIdEstrangeiro = String(dest.idEstrangeiro || '').trim();
  const isExterior = destUf === 'EX' || Boolean(destIdEstrangeiro);

  const destinatario = {
    nome: String(dest.xNome || dest.nome || '').trim(),
    cnpj: (dest.CNPJ || dest.CPF || dest.cnpj) ? formatCNPJorCPF(dest.CNPJ || dest.CPF || dest.cnpj) : '',
    idEstrangeiro: destIdEstrangeiro,
    pais: String(enderDest.xPais || dest.pais || (isExterior ? '' : 'Brasil')).trim(),
    paisCodigo: String(enderDest.cPais || dest.paisCodigo || (isExterior ? '' : 'BR')).trim(),
    uf: destUf || (isExterior ? 'EX' : ''),
    municipio: String(enderDest.xMun || dest.municipio || '').trim(),
    inscricaoEstadual: String(dest.IE || dest.inscricaoEstadual || '').trim(),
    indicadorIeDestinatario: String(dest.indicadorIeDestinatario || dest.indIEDest || '').trim(),
    email: String(dest.email || enderDest.email || '').trim(),
    endereco: dest.endereco || (Object.keys(enderDest).length > 0 ? enderDest : null),
  };

  // 5. Itens e Produtos
  const rawDet = Array.isArray(extractedData.itens)
    ? extractedData.itens
    : (Array.isArray(extractedData.det) ? extractedData.det : []);

  const itens = rawDet.map((rawItem, index) => {
    const nItem = rawItem.nItem ?? rawItem.item ?? (index + 1);
    const prod = rawItem.prod || rawItem;
    const imposto = rawItem.imposto || rawItem.tributos || {};

    const itemId = generateItemId(chaveAcesso, nItem);
    const quantidade = normalizeQuantity(prod.qCom ?? prod.quantidade);
    const valorUnitario = normalizeUnitPrice(prod.vUnCom ?? prod.valorUnitario);

    // Se vProd estiver presente, normaliza; senão, calcula via motor decimal
    const rawVProd = prod.vProd ?? prod.valorTotal;
    const valorTotal = rawVProd !== undefined && rawVProd !== null && rawVProd !== ''
      ? normalizeMonetary(rawVProd)
      : calculateItemTotal(valorUnitario, quantidade);

    const valorFrete = normalizeMonetary(prod.vFrete ?? prod.valorFrete ?? '0.00');
    const valorSeguro = normalizeMonetary(prod.vSeg ?? prod.valorSeguro ?? '0.00');
    const valorDesconto = normalizeMonetary(prod.vDesc ?? prod.valorDesconto ?? '0.00');
    const outrasDespesas = normalizeMonetary(prod.vOutro ?? prod.outrasDespesas ?? '0.00');

    // Mapeamento de dados tributários
    const icms = imposto.icms || imposto.ICMS || {};
    const ipi = imposto.ipi || imposto.IPI || {};
    const pis = imposto.pis || imposto.PIS || {};
    const cofins = imposto.cofins || imposto.COFINS || {};
    const ibsCbs = imposto.ibsCbs || imposto.IBSCBS || null;

    return {
      id: itemId,
      item: Number(nItem),
      codigo: String(prod.cProd ?? prod.codigo ?? '').trim(),
      cEAN: String(prod.cEAN ?? prod.ean ?? 'SEM GTIN').trim(),
      cEANTrib: String(prod.cEANTrib ?? prod.cEAN ?? 'SEM GTIN').trim(),
      descricao: String(prod.xProd ?? prod.descricao ?? '').trim(),
      ncm: String(prod.NCM ?? prod.ncm ?? '').trim(),
      cest: String(prod.CEST ?? prod.cest ?? '').trim(),
      cfop: String(prod.CFOP ?? prod.cfop ?? '').trim(),
      unidade: String(prod.uCom ?? prod.unidade ?? '').trim().toUpperCase(),
      unidadeTributavel: String(prod.uTrib ?? prod.uCom ?? prod.unidade ?? '').trim().toUpperCase(),
      quantidade,
      quantidadeTributavel: normalizeQuantity(prod.qTrib ?? prod.qCom ?? prod.quantidade),
      valorUnitario,
      valorUnitarioTributavel: normalizeUnitPrice(prod.vUnTrib ?? prod.vUnCom ?? prod.valorUnitario),
      valorTotal,
      valorFrete,
      valorSeguro,
      valorDesconto,
      outrasDespesas,
      indicadorComposicaoTotal: String(prod.indTot ?? prod.indicadorComposicaoTotal ?? '').trim(),
      pedido: prod.xPed || prod.pedido || '',
      itemPedido: prod.nItemPed || prod.itemPedido || '',
      informacoesAdicionais: prod.infAdProd || prod.informacoesAdicionais || '',
      valorItem: prod.vItem !== undefined ? normalizeMonetary(prod.vItem) : undefined,
      situacao: 'pendente',
      modificado: false,
      valorOriginal: null,
      inconsistencias: [],
      tributos: {
        icms: {
          cst: String(icms.cst || icms.CST || icms.CSOSN || '').trim(),
          csosn: String(icms.csosn || icms.CSOSN || '').trim(),
          origem: String(icms.origem ?? icms.orig ?? '').trim(),
          modalidadeBase: String(icms.modalidadeBase ?? icms.modBC ?? '').trim(),
          vBC: normalizeMonetary(icms.vBC || '0.00'),
          pRedBC: normalizeMonetary(icms.pRedBC || '0.00'),
          pICMS: normalizeMonetary(icms.pICMS || '0.00'),
          vICMS: normalizeMonetary(icms.vICMS || '0.00'),
        },
        ipi: {
          cst: String(ipi.cst || ipi.CST || '').trim(),
          cEnq: String(ipi.cEnq || ipi.enquadramento || '').trim(),
          vBC: normalizeMonetary(ipi.vBC || '0.00'),
          pIPI: normalizeMonetary(ipi.pIPI || '0.00'),
          vIPI: normalizeMonetary(ipi.vIPI || '0.00'),
        },
        pis: {
          cst: String(pis.cst || pis.CST || '').trim(),
          vBC: normalizeMonetary(pis.vBC || '0.00'),
          pPIS: normalizeMonetary(pis.pPIS || '0.00'),
          vPIS: normalizeMonetary(pis.vPIS || '0.00'),
        },
        cofins: {
          cst: String(cofins.cst || cofins.CST || '').trim(),
          vBC: normalizeMonetary(cofins.vBC || '0.00'),
          pCOFINS: normalizeMonetary(cofins.pCOFINS || '0.00'),
          vCOFINS: normalizeMonetary(cofins.vCOFINS || '0.00'),
        },
        ibsCbs: ibsCbs
          ? {
              cst: String(ibsCbs.cst || ibsCbs.CST || '').trim(),
              cClassTrib: String(ibsCbs.cClassTrib || '').trim(),
              vBC: normalizeMonetary(ibsCbs.vBC || '0.00'),
              pIBSUF: normalizeMonetary(ibsCbs.pIBSUF || '0.00'),
              vIBSUF: normalizeMonetary(ibsCbs.vIBSUF || '0.00'),
              pIBSMun: normalizeMonetary(ibsCbs.pIBSMun || '0.00'),
              vIBSMun: normalizeMonetary(ibsCbs.vIBSMun || '0.00'),
              vIBS: normalizeMonetary(ibsCbs.vIBS || '0.00'),
              pCBS: normalizeMonetary(ibsCbs.pCBS || '0.00'),
              vCBS: normalizeMonetary(ibsCbs.vCBS || '0.00'),
            }
          : null,
      },
    };
  });

  // 6. Totais Fiscais
  const totalObj = extractedData.totais || extractedData.total?.ICMSTot || extractedData.total || {};
  let valorProdutos = normalizeMonetary(totalObj.valorProdutos ?? totalObj.vProd);
  const valorFrete = normalizeMonetary(totalObj.valorFrete ?? totalObj.vFrete ?? '0.00');
  const valorSeguro = normalizeMonetary(totalObj.valorSeguro ?? totalObj.vSeg ?? '0.00');
  const valorDesconto = normalizeMonetary(totalObj.valorDesconto ?? totalObj.vDesc ?? '0.00');
  const outrasDespesas = normalizeMonetary(totalObj.outrasDespesas ?? totalObj.vOutro ?? '0.00');
  const valorIPI = normalizeMonetary(totalObj.valorIPI ?? totalObj.vIPI ?? '0.00');
  let valorTotalNota = normalizeMonetary(totalObj.valorTotalNota ?? totalObj.vNF);

  // Reconciliação se produtos totalizados estiverem zerados e existirem itens
  let sumProducts = '0.00';
  for (const it of itens) {
    sumProducts = decimalAdd(sumProducts, it.valorTotal, 2);
  }
  if (isDecimalZero(valorProdutos) && !isDecimalZero(sumProducts)) {
    valorProdutos = sumProducts;
  }

  // Reconciliação do total da nota caso esteja zerado
  if (isDecimalZero(valorTotalNota)) {
    const calc = calculateInvoiceTotals(itens, {
      valorDesconto,
      valorFrete,
      valorSeguro,
      outrasDespesas,
      valorIPI,
    });
    valorTotalNota = calc.valorTotalNota;
  }

  // Pesos de transporte
  const transp = extractedData.transporte || extractedData.transp || {};
  const vol = transp.volumes || transp.vol || {};
  const pesoLiquido = normalizeWeight(totalObj.pesoLiquido ?? vol.pesoL ?? '0.000');
  const pesoBruto = normalizeWeight(totalObj.pesoBruto ?? vol.pesoB ?? '0.000');

  // 7. Protocolo de autorização (se presente em nfeProc)
  const prot = extractedData.protocolo || (extractedData.protNFe ? {
    numero: String(extractedData.protNFe.nProt || ''),
    dataAutorizacao: String(extractedData.protNFe.dhRecbto || ''),
    status: String(extractedData.protNFe.cStat || '100'),
    motivo: String(extractedData.protNFe.xMotivo || 'Autorizado o uso da NF-e'),
  } : null);

  const nowIso = new Date().toISOString();

  // 8. Documento Final Normalizado
  return {
    id: invoiceId,
    numero: formatInvoiceNumber(numeroNF),
    serie,
    chaveAcesso,
    tipoDocumento: 'XML',
    modelo: String(ide.mod || '55'),
    naturezaOperacao: String(ide.natOp || extractedData.naturezaOperacao || 'VENDA DE MERCADORIAS').trim(),
    emissao,
    dataEmissao,
    dataSaida: ide.dhSaiEnt || '',
    ambiente: String(ide.tpAmb ?? ''),
    status: 'importado',
    isDemo: false,          // MANDATÓRIO: Impede gravação em LocalStorage e identifica documento real
    isRealImport: true,     // MANDATÓRIO: Destina para memória de sessão e exibe banner
    ide: {
      cUF: ide.cUF || '',
      cNF: ide.cNF || '',
      cMunFG: ide.cMunFG || '',
      tpNF: ide.tpNF ?? null,
      idDest: ide.idDest ?? null,
      tpAmb: ide.tpAmb ?? null,
      tpImp: ide.tpImp || '',
      tpEmis: ide.tpEmis || '',
      finNFe: ide.finNFe || '',
      indFinal: ide.indFinal || '',
      indPres: ide.indPres || '',
      indIntermed: ide.indIntermed || '',
      procEmi: ide.procEmi || '',
      verProc: ide.verProc || '',
      cDV: ide.cDV || '',
    },
    emitente,
    destinatario,
    itens,
    totais: {
      valorProdutos,
      valorFrete,
      valorSeguro,
      valorDesconto,
      outrasDespesas,
      valorIPI,
      valorII: normalizeMonetary(totalObj.valorII ?? totalObj.vII ?? '0.00'),
      valorTotTrib: normalizeMonetary(totalObj.valorTotTrib ?? totalObj.vTotTrib ?? '0.00'),
      valorTotalNota,
      pesoLiquido,
      pesoBruto,
      ibsCbs: totalObj.ibsCbs || null,
    },
    transporte: {
      modalidadeFrete: String(transp.modFrete ?? transp.modalidadeFrete ?? '9'),
      transportador: transp.transporta || null,
      volumes: Array.isArray(transp.volumesList)
        ? transp.volumesList
        : (transp.volumes ? [transp.volumes] : []),
    },
    cobranca: extractedData.cobranca || null,
    pagamento: extractedData.pagamento || null,
    informacoesAdicionais: extractedData.informacoesAdicionais || null,
    assinatura: extractedData.assinatura || null,
    protocolo: prot,
    criadoEm: nowIso,
    atualizadoEm: nowIso,
  };
}
