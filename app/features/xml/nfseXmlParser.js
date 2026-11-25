/**
 * SmartNFe — Parser de XML de NFS-e Nacional (versão 1.01)
 *
 * Extrai os grupos da NFS-e nacional e da DPS que a originou, preservando os
 * códigos, datas completas e strings decimais originais. A leitura é feita por
 * caminho/contexto (filhos diretos) porque nomes como `vBC` e `CST` se repetem
 * em grupos distintos (ISS, PIS/COFINS, IBS/CBS).
 *
 * Este parser NÃO valida assinatura criptográfica; apenas registra a presença
 * dos elementos de assinatura.
 */

import {
  NodeXmlDomParser,
  getElementLocalName,
  findDirectChild,
  findElements,
  getAttributeValue,
} from './nfeXmlParser.js';

function resolveParserClass(options = {}) {
  if (options.DOMParser) return options.DOMParser;
  if (typeof window !== 'undefined' && window.DOMParser) return window.DOMParser;
  if (typeof globalThis !== 'undefined' && globalThis.DOMParser) return globalThis.DOMParser;
  return NodeXmlDomParser;
}

function dc(el, name) {
  return findDirectChild(el, name);
}

function textOf(el) {
  if (!el || el.textContent === null || el.textContent === undefined) return '';
  return String(el.textContent).trim();
}

function ct(el, name, def = '') {
  const child = dc(el, name);
  const value = textOf(child);
  return value === '' ? def : value;
}

function attr(el, name) {
  const value = getAttributeValue(el, name);
  return value === null || value === undefined ? '' : String(value);
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function readEndereco(endGroup) {
  if (!endGroup) return null;
  const endNac = dc(endGroup, 'endNac');
  const endExt = dc(endGroup, 'endExt');
  const end = endNac || endExt;
  if (!end) {
    // Alguns layouts trazem os campos de endereço diretamente no grupo end.
    return {
      tipo: 'NAO_INFORMADO',
      cMun: ct(endGroup, 'cMun'),
      cep: ct(endGroup, 'CEP'),
      logradouro: ct(endGroup, 'xLgr'),
      numero: ct(endGroup, 'nro'),
      complemento: ct(endGroup, 'xCpl'),
      bairro: ct(endGroup, 'xBairro'),
      uf: ct(endGroup, 'UF'),
      pais: '',
    };
  }
  const isNacional = Boolean(endNac);
  return {
    tipo: isNacional ? 'NACIONAL' : 'EXTERIOR',
    cMun: ct(end, 'cMun'),
    cep: ct(end, 'CEP'),
    logradouro: ct(end, 'xLgr'),
    numero: ct(end, 'nro'),
    complemento: ct(end, 'xCpl'),
    bairro: ct(end, 'xBairro'),
    uf: ct(end, 'UF'),
    pais: isNacional ? '' : ct(end, 'xPais'),
    codigoPais: isNacional ? '' : ct(end, 'cPais'),
  };
}

function readPrestador(prestEl, emitEl) {
  const source = prestEl || emitEl;
  if (!source) return null;
  const regTrib = dc(source, 'regTrib');
  const cnpj = ct(source, 'CNPJ');
  const cpf = ct(source, 'CPF');
  return {
    documento: cnpj || cpf,
    cnpj,
    cpf,
    inscricaoMunicipal: ct(source, 'IM'),
    razaoSocial: ct(source, 'xNome'),
    endereco: readEndereco(dc(source, 'end') || dc(source, 'enderNac')),
    telefone: ct(source, 'fone'),
    email: ct(source, 'email'),
    regimeTributario: {
      opSimpNac: ct(regTrib, 'opSimpNac'),
      regApTribSN: ct(regTrib, 'regApTribSN'),
      regEspTrib: ct(regTrib, 'regEspTrib'),
    },
  };
}

function readTomador(tomaEl) {
  if (!tomaEl) return null;
  const cnpj = ct(tomaEl, 'CNPJ');
  const cpf = ct(tomaEl, 'CPF');
  const nif = ct(tomaEl, 'NIF');
  return {
    documento: cnpj || cpf || nif,
    cnpj,
    cpf,
    nif,
    razaoSocial: ct(tomaEl, 'xNome'),
    endereco: readEndereco(dc(tomaEl, 'end')),
    telefone: ct(tomaEl, 'fone'),
    email: ct(tomaEl, 'email'),
  };
}

function readPisCofins(tribFed) {
  const group = dc(tribFed, 'piscofins');
  if (!group) return null;
  return {
    cst: ct(group, 'CST'),
    vBC: ct(group, 'vBCPisCofins'),
    pPis: ct(group, 'pAliqPis'),
    pCofins: ct(group, 'pAliqCofins'),
    vPis: ct(group, 'vPis'),
    vCofins: ct(group, 'vCofins'),
    tpRetPisCofins: ct(group, 'tpRetPisCofins'),
  };
}

function readValoresDps(infDPS) {
  const valores = dc(infDPS, 'valores');
  if (!valores) return null;

  const vServPrest = dc(valores, 'vServPrest');
  const vDedRed = dc(valores, 'vDedRed');
  const trib = dc(valores, 'trib');
  const tribMun = dc(trib, 'tribMun');
  const tribFed = dc(trib, 'tribFed');
  const totTrib = dc(trib, 'totTrib');
  const vTotTrib = dc(totTrib, 'vTotTrib');
  const pTotTrib = dc(totTrib, 'pTotTrib');
  const pTotTribSN = ct(totTrib, 'pTotTribSN');

  return {
    vServ: ct(vServPrest, 'vServ'),
    vDR: ct(vDedRed, 'vDR'),
    vCalcDR: ct(vDedRed, 'vCalcDR'),
    tribISSQN: ct(tribMun, 'tribISSQN'),
    tpRetISSQN: ct(tribMun, 'tpRetISSQN'),
    piscofins: readPisCofins(tribFed),
    vRetIRRF: ct(tribFed, 'vRetIRRF'),
    vRetCSLL: ct(tribFed, 'vRetCSLL'),
    vTotTrib: vTotTrib
      ? {
          federal: ct(vTotTrib, 'vTotTribFed'),
          estadual: ct(vTotTrib, 'vTotTribEst'),
          municipal: ct(vTotTrib, 'vTotTribMun'),
        }
      : null,
    pTotTrib: pTotTrib || pTotTribSN
      ? {
          federal: ct(pTotTrib, 'pTotTribFed'),
          estadual: ct(pTotTrib, 'pTotTribEst'),
          municipal: ct(pTotTrib, 'pTotTribMun'),
          simplesNacional: ct(pTotTrib, 'pTotTribSN', pTotTribSN),
        }
      : null,
  };
}

function readIbsCbsApurado(infNFSe) {
  const group = dc(infNFSe, 'IBSCBS');
  if (!group) return null;
  const valores = dc(group, 'valores');
  const uf = dc(valores, 'uf');
  const mun = dc(valores, 'mun');
  const fed = dc(valores, 'fed');
  const tot = dc(group, 'totCIBS');
  const gIBS = dc(tot, 'gIBS');
  const gIBSUF = dc(gIBS, 'gIBSUFTot');
  const gIBSMun = dc(gIBS, 'gIBSMunTot');
  const gCBS = dc(tot, 'gCBS');

  return {
    cLocalidadeIncid: ct(group, 'cLocalidadeIncid'),
    xLocalidadeIncid: ct(group, 'xLocalidadeIncid'),
    vBC: ct(valores, 'vBC'),
    vCalcReeRepRes: ct(valores, 'vCalcReeRepRes'),
    uf: {
      pIBSUF: ct(uf, 'pIBSUF'),
      pRedAliqUF: ct(uf, 'pRedAliqUF'),
      pAliqEfetUF: ct(uf, 'pAliqEfetUF'),
    },
    mun: {
      pIBSMun: ct(mun, 'pIBSMun'),
      pRedAliqMun: ct(mun, 'pRedAliqMun'),
      pAliqEfetMun: ct(mun, 'pAliqEfetMun'),
    },
    fed: {
      pCBS: ct(fed, 'pCBS'),
      pRedAliqCBS: ct(fed, 'pRedAliqCBS'),
      pAliqEfetCBS: ct(fed, 'pAliqEfetCBS'),
    },
    totais: {
      vTotNF: ct(tot, 'vTotNF'),
      vIBSTot: ct(gIBS, 'vIBSTot'),
      vIBSUF: ct(gIBSUF, 'vIBSUF'),
      vIBSMun: ct(gIBSMun, 'vIBSMun'),
      vCBS: ct(gCBS, 'vCBS'),
    },
  };
}

function readIbsCbsDeclarado(infDPS) {
  const group = dc(infDPS, 'IBSCBS');
  if (!group) return null;
  const trib = dc(dc(group, 'valores'), 'trib');
  const gIBSCBS = dc(trib, 'gIBSCBS');
  return {
    finNFSe: ct(group, 'finNFSe'),
    indFinal: ct(group, 'indFinal'),
    cIndOp: ct(group, 'cIndOp'),
    indDest: ct(group, 'indDest'),
    cst: ct(gIBSCBS, 'CST'),
    cClassTrib: ct(gIBSCBS, 'cClassTrib'),
  };
}

/**
 * Realiza o parsing de uma NFS-e nacional.
 *
 * @param {string} xmlString
 * @param {Object} [options]
 * @param {typeof DOMParser} [options.DOMParser]
 * @returns {{ success: boolean, data?: Object, error?: string, details?: Object }}
 */
export function parseNFSeXml(xmlString, options = {}) {
  if (!xmlString || typeof xmlString !== 'string' || !xmlString.trim()) {
    return { success: false, error: 'O conteúdo do arquivo XML está vazio.', details: { code: 'EMPTY_CONTENT' } };
  }

  const ParserClass = resolveParserClass(options);
  let xmlDoc;
  try {
    xmlDoc = new ParserClass().parseFromString(xmlString, 'application/xml');
  } catch (err) {
    return {
      success: false,
      error: `Falha ao processar o arquivo XML: ${err.message}`,
      details: { code: 'PARSER_EXCEPTION' },
    };
  }

  const root = xmlDoc ? xmlDoc.documentElement : null;
  if (!root) {
    return { success: false, error: 'Documento XML vazio ou não interpretável.', details: { code: 'EMPTY_DOCUMENT' } };
  }

  const rootTag = getElementLocalName(root);
  if (rootTag === 'parsererror') {
    return { success: false, error: 'XML malformado ou corrompido.', details: { code: 'PARSER_ERROR' } };
  }
  if (rootTag !== 'NFSe') {
    return {
      success: false,
      error: `Documento não é uma NFS-e nacional (tag raiz <${rootTag}>).`,
      details: { code: 'INVALID_ROOT', rootTag },
    };
  }

  const versao = attr(root, 'versao') || '1.01';
  const infNFSe = dc(root, 'infNFSe');
  if (!infNFSe) {
    return { success: false, error: 'Estrutura inválida: <infNFSe> não encontrada.', details: { code: 'MISSING_INF_NFSE' } };
  }

  const infNFSeId = attr(infNFSe, 'Id');
  const chaveAcesso = digits(infNFSeId);

  const dps = dc(infNFSe, 'DPS');
  const infDPS = dps ? dc(dps, 'infDPS') : null;
  const emit = dc(infNFSe, 'emit');
  const prest = infDPS ? dc(infDPS, 'prest') : null;
  const toma = infDPS ? dc(infDPS, 'toma') : null;
  const serv = infDPS ? dc(infDPS, 'serv') : null;
  const cServ = dc(serv, 'cServ');
  const locPrest = dc(serv, 'locPrest');
  const infValores = dc(infNFSe, 'valores');

  const nNFSe = ct(infNFSe, 'nNFSe');
  if (!nNFSe && !chaveAcesso) {
    return { success: false, error: 'NFS-e sem número e sem identificador.', details: { code: 'MISSING_IDENTITY' } };
  }

  const signatures = findElements(root, 'Signature');
  const certificates = findElements(root, 'X509Certificate');

  return {
    success: true,
    data: {
      tipoFiscal: 'NFSE',
      layout: 'NFSE_NACIONAL',
      versao,
      chaveAcesso,
      infNFSeId,
      nNFSe,
      nDFSe: ct(infNFSe, 'nDFSe'),
      cStat: ct(infNFSe, 'cStat'),
      dhProc: ct(infNFSe, 'dhProc'),
      ambGer: ct(infNFSe, 'ambGer'),
      tpEmis: ct(infNFSe, 'tpEmis'),
      procEmi: ct(infNFSe, 'procEmi'),
      verAplic: ct(infNFSe, 'verAplic'),
      xLocEmi: ct(infNFSe, 'xLocEmi'),
      xLocPrestacao: ct(infNFSe, 'xLocPrestacao'),
      cLocIncid: ct(infNFSe, 'cLocIncid'),
      xLocIncid: ct(infNFSe, 'xLocIncid'),
      xTribNac: ct(infNFSe, 'xTribNac'),
      xNBS: ct(infNFSe, 'xNBS'),
      emit: readPrestador(null, emit),
      dps: infDPS
        ? {
            id: attr(infDPS, 'Id'),
            versao: attr(dps, 'versao') || attr(infDPS, 'versao') || versao,
            tpAmb: ct(infDPS, 'tpAmb'),
            dhEmi: ct(infDPS, 'dhEmi'),
            verAplic: ct(infDPS, 'verAplic'),
            serie: ct(infDPS, 'serie'),
            nDPS: ct(infDPS, 'nDPS'),
            dCompet: ct(infDPS, 'dCompet'),
            tpEmit: ct(infDPS, 'tpEmit'),
            cLocEmi: ct(infDPS, 'cLocEmi'),
          }
        : null,
      prest: readPrestador(prest, null),
      toma: readTomador(toma),
      serv: serv
        ? {
            cLocPrestacao: ct(locPrest, 'cLocPrestacao'),
            cTribNac: ct(cServ, 'cTribNac'),
            xDescServ: ct(cServ, 'xDescServ'),
            cNBS: ct(cServ, 'cNBS'),
          }
        : null,
      valoresInf: infValores
        ? {
            vCalcDR: ct(infValores, 'vCalcDR'),
            vBC: ct(infValores, 'vBC'),
            pAliqAplic: ct(infValores, 'pAliqAplic'),
            vISSQN: ct(infValores, 'vISSQN'),
            vTotalRet: ct(infValores, 'vTotalRet'),
            vLiq: ct(infValores, 'vLiq'),
          }
        : null,
      valoresDps: infDPS ? readValoresDps(infDPS) : null,
      ibsCbsApurado: readIbsCbsApurado(infNFSe),
      ibsCbsDeclarado: infDPS ? readIbsCbsDeclarado(infDPS) : null,
      assinatura: {
        presente: signatures.length > 0,
        certificadoPresente: certificates.length > 0,
      },
    },
  };
}

export default parseNFSeXml;
