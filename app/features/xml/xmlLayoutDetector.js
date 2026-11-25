/**
 * SmartNFe — Detector de Layout de XML Fiscal
 *
 * Identifica o tipo fiscal e o layout de um XML antes de encaminhá-lo ao parser
 * correto, evitando que documentos NFS-e sejam rejeitados pelo parser de NF-e.
 *
 * Suporta:
 * - NF-e modelo 55: raiz `nfeProc` ou `NFe`, namespace portalfiscal.inf.br/nfe
 * - NFS-e nacional: raiz `NFSe`, namespace sped.fazenda.gov.br/nfse (versão 1.01)
 */

import { NodeXmlDomParser, getElementLocalName, getAttributeValue } from './nfeXmlParser.js';

function resolveParserClass(options = {}) {
  if (options.DOMParser) return options.DOMParser;
  if (typeof window !== 'undefined' && window.DOMParser) return window.DOMParser;
  if (typeof globalThis !== 'undefined' && globalThis.DOMParser) return globalThis.DOMParser;
  return NodeXmlDomParser;
}

function readNamespace(root) {
  if (!root || typeof root.getAttribute !== 'function') return '';
  return (
    getAttributeValue(root, 'xmlns') ||
    (typeof root.lookupNamespaceURI === 'function' && root.lookupNamespaceURI(null)) ||
    ''
  );
}

/**
 * Detecta o layout a partir de uma string XML fiscal.
 *
 * @param {string} xmlString
 * @param {Object} [options]
 * @param {typeof DOMParser} [options.DOMParser]
 * @returns {{
 *   success: boolean,
 *   tipoFiscal: 'NFE'|'NFSE'|null,
 *   layout: string|null,
 *   versao: string|null,
 *   rootTag: string|null,
 *   supported: boolean,
 *   error?: string,
 *   code?: string
 * }}
 */
export function detectXmlLayout(xmlString, options = {}) {
  if (!xmlString || typeof xmlString !== 'string' || !xmlString.trim()) {
    return {
      success: false,
      tipoFiscal: null,
      layout: null,
      versao: null,
      rootTag: null,
      supported: false,
      error: 'O conteúdo do arquivo XML está vazio.',
      code: 'EMPTY_CONTENT',
    };
  }

  const ParserClass = resolveParserClass(options);
  let xmlDoc;
  try {
    xmlDoc = new ParserClass().parseFromString(xmlString, 'application/xml');
  } catch (err) {
    return {
      success: false,
      tipoFiscal: null,
      layout: null,
      versao: null,
      rootTag: null,
      supported: false,
      error: `Falha ao processar o arquivo XML: ${err.message}`,
      code: 'PARSER_EXCEPTION',
    };
  }

  const root = xmlDoc ? xmlDoc.documentElement : null;
  if (!root) {
    return {
      success: false,
      tipoFiscal: null,
      layout: null,
      versao: null,
      rootTag: null,
      supported: false,
      error: 'Documento XML vazio ou não interpretável.',
      code: 'EMPTY_DOCUMENT',
    };
  }

  const rootTag = getElementLocalName(root);
  if (rootTag === 'parsererror') {
    return {
      success: false,
      tipoFiscal: null,
      layout: null,
      versao: null,
      rootTag,
      supported: false,
      error: 'XML malformado ou corrompido.',
      code: 'PARSER_ERROR',
    };
  }

  const versao = getAttributeValue(root, 'versao') || null;
  const namespace = readNamespace(root);
  const isNfse = rootTag === 'NFSe' || /sped\.fazenda\.gov\.br\/nfse/i.test(namespace);
  const isNfe = rootTag === 'nfeProc' || rootTag === 'NFe' || /portalfiscal\.inf\.br\/nfe/i.test(namespace);

  if (isNfse) {
    return {
      success: true,
      tipoFiscal: 'NFSE',
      layout: 'NFSE_NACIONAL',
      versao,
      rootTag,
      supported: String(versao || '1.01').startsWith('1.'),
    };
  }

  if (isNfe) {
    return {
      success: true,
      tipoFiscal: 'NFE',
      layout: rootTag === 'nfeProc' ? 'NFE_PROC' : 'NFE',
      versao,
      rootTag,
      supported: true,
    };
  }

  return {
    success: false,
    tipoFiscal: null,
    layout: null,
    versao,
    rootTag,
    supported: false,
    error: `Layout XML não suportado (tag raiz <${rootTag}>). São aceitos NF-e modelo 55 e NFS-e nacional.`,
    code: 'UNSUPPORTED_LAYOUT',
  };
}

export default detectXmlLayout;
