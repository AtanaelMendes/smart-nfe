/**
 * SmartNFe — Parser de XML de NF-e Modelo 55 para Navegador e Node.js
 *
 * Características:
 * - Execução nativa no navegador via DOMParser (application/xml).
 * - Fallback embutido para testes em Node.js (node --test) com zero dependências npm.
 * - Imunidade total a namespaces SEFAZ (xmlns="http://www.portalfiscal.inf.br/nfe") e prefixos (ex: nfe:).
 * - Suporte a layouts nfeProc (com protNFe) e NFe avulso (sem protocolo).
 * - Suporte a schemas SEFAZ v4.00 e v3.10.
 * - Extração detalhada: ide, emit, dest, det (produtos e tributos), total/ICMSTot, transp/vol e protNFe.
 * - Tratamento gracioso de <parsererror> com mensagens claras em português.
 * - Preservação estrita de strings decimais para precisão monetária.
 */

// =========================================================================
// 1. Parser Leve para Ambiente Node.js (Fallback de Testes sem dependências)
// =========================================================================

function decodeXmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

class MiniElement {
  constructor(nodeName) {
    this.nodeName = nodeName;
    this.localName = nodeName.replace(/^.*:/, '');
    this.nodeType = 1; // ELEMENT_NODE
    this.attributes = {};
    this.children = [];
    this.childNodes = [];
    this.parentNode = null;
    this.textContent = '';
  }

  getAttribute(name) {
    if (this.attributes[name] !== undefined) return this.attributes[name];
    const lower = name.toLowerCase();
    for (const key of Object.keys(this.attributes)) {
      if (key.toLowerCase() === lower) return this.attributes[key];
    }
    return null;
  }

  getElementsByTagName(name) {
    const results = [];
    const target = name.replace(/^.*:/, '');
    function walk(node) {
      for (const child of node.children) {
        if (child.localName === target || child.nodeName === name || name === '*') {
          results.push(child);
        }
        walk(child);
      }
    }
    walk(this);
    return results;
  }

  getElementsByTagNameNS(ns, localName) {
    const results = [];
    function walk(node) {
      for (const child of node.children) {
        if (child.localName === localName || localName === '*') {
          results.push(child);
        }
        walk(child);
      }
    }
    walk(this);
    return results;
  }
}

class MiniDocument {
  constructor() {
    this.documentElement = null;
  }

  getElementsByTagName(name) {
    if (!this.documentElement) return [];
    const list = this.documentElement.getElementsByTagName(name);
    const target = name.replace(/^.*:/, '');
    if (this.documentElement.localName === target || this.documentElement.nodeName === name || name === '*') {
      return [this.documentElement, ...list];
    }
    return list;
  }

  getElementsByTagNameNS(ns, localName) {
    if (!this.documentElement) return [];
    const list = this.documentElement.getElementsByTagNameNS(ns, localName);
    if (this.documentElement.localName === localName || localName === '*') {
      return [this.documentElement, ...list];
    }
    return list;
  }
}

export class NodeXmlDomParser {
  parseFromString(xmlString, mimeType = 'application/xml') {
    const doc = new MiniDocument();
    if (!xmlString || typeof xmlString !== 'string' || !xmlString.trim()) {
      const errEl = new MiniElement('parsererror');
      errEl.textContent = 'XML vazio ou formato inválido.';
      doc.documentElement = errEl;
      return doc;
    }

    const clean = xmlString
      .replace(/<\?xml[^>]*\?>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    const tagRegex = /<(\/?)([\w:.-]+)([^>]*?)(\/?)>|([^<]+)/g;
    let match;
    const stack = [];
    let root = null;

    while ((match = tagRegex.exec(clean)) !== null) {
      const [fullMatch, isClosing, tagName, attrString, isSelfClosing, textContent] = match;

      if (textContent !== undefined && textContent.trim()) {
        if (stack.length > 0) {
          stack[stack.length - 1].textContent += decodeXmlEntities(textContent.trim());
        }
        continue;
      }

      if (isClosing) {
        if (stack.length > 0) {
          const top = stack[stack.length - 1];
          if (top.nodeName === tagName) {
            stack.pop();
          } else {
            const errDoc = new MiniDocument();
            const errEl = new MiniElement('parsererror');
            errEl.textContent = `Tag mismatch: esperada tag de fechamento </${top.nodeName}> mas encontrada </${tagName}>`;
            errDoc.documentElement = errEl;
            return errDoc;
          }
        }
        continue;
      }

      if (tagName) {
        const el = new MiniElement(tagName);
        if (attrString) {
          const attrRegex = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
          let attrMatch;
          while ((attrMatch = attrRegex.exec(attrString)) !== null) {
            const rawVal = attrMatch[2] !== undefined ? attrMatch[2] : attrMatch[3];
            el.attributes[attrMatch[1]] = decodeXmlEntities(rawVal);
          }
        }

        if (!root) {
          root = el;
          doc.documentElement = root;
        }

        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          el.parentNode = parent;
          parent.children.push(el);
          parent.childNodes.push(el);
        }

        if (!isSelfClosing) {
          stack.push(el);
        }
      }
    }

    if (stack.length > 0) {
      const errDoc = new MiniDocument();
      const errEl = new MiniElement('parsererror');
      errEl.textContent = `Tag não fechada: <${stack[stack.length - 1].nodeName}>`;
      errDoc.documentElement = errEl;
      return errDoc;
    }

    if (!root) {
      const errDoc = new MiniDocument();
      const errEl = new MiniElement('parsererror');
      errEl.textContent = 'Documento XML sem tag raiz válida.';
      errDoc.documentElement = errEl;
      return errDoc;
    }

    return doc;
  }
}

// =========================================================================
// 2. Auxiliares DOM Tolerantes a Namespaces e Prefixos
// =========================================================================

/**
 * Retorna o localName limpo do nó, ignorando prefixos de namespace.
 * Ex: 'nfe:infNFe' -> 'infNFe', 'infNFe' -> 'infNFe'.
 */
export function getElementLocalName(node) {
  if (!node) return '';
  return node.localName || (node.nodeName ? node.nodeName.replace(/^.*:/, '') : '');
}

/**
 * Encontra todos os elementos filhos diretos com o localName especificado.
 * Previne colisão de tags de mesmo nome em níveis distintos (ex: total/ICMSTot/vProd vs det/prod/vProd).
 */
export function findDirectChildren(parent, localName) {
  if (!parent) return [];
  const results = [];
  const children = parent.children || parent.childNodes || [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === 1 || (!child.nodeType && child.tagName)) {
      if (getElementLocalName(child) === localName) {
        results.push(child);
      }
    }
  }
  return results;
}

/**
 * Encontra o primeiro elemento filho direto com o localName especificado.
 */
export function findDirectChild(parent, localName) {
  if (!parent) return null;
  const children = parent.children || parent.childNodes || [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === 1 || (!child.nodeType && child.tagName)) {
      if (getElementLocalName(child) === localName) {
        return child;
      }
    }
  }
  return null;
}

/**
 * Busca recursiva profunda por elementos com o localName informado.
 */
export function findElements(parent, localName) {
  if (!parent) return [];
  if (typeof parent.getElementsByTagNameNS === 'function') {
    try {
      const list = parent.getElementsByTagNameNS('*', localName);
      if (list && list.length > 0) return Array.from(list);
    } catch {}
  }
  if (typeof parent.getElementsByTagName === 'function') {
    try {
      const list = parent.getElementsByTagName(localName);
      if (list && list.length > 0) return Array.from(list);
    } catch {}
  }
  const results = [];
  function walk(node) {
    if (!node) return;
    const children = node.children || node.childNodes || [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.nodeType === 1 || (!child.nodeType && child.tagName)) {
        if (getElementLocalName(child) === localName) results.push(child);
        walk(child);
      }
    }
  }
  walk(parent);
  return results;
}

/**
 * Encontra o primeiro elemento correspondente (priorizando filho direto, depois busca profunda).
 */
export function findFirstElement(parent, localName) {
  if (!parent) return null;
  const direct = findDirectChild(parent, localName);
  if (direct) return direct;
  const list = findElements(parent, localName);
  return list.length > 0 ? list[0] : null;
}

/**
 * Extrai texto limpo de uma tag filha, com valor default de fallback.
 */
export function getTextContent(parent, localName, defaultValue = '') {
  if (!parent) return defaultValue;
  const el = findFirstElement(parent, localName);
  if (!el || el.textContent === null || el.textContent === undefined) {
    return defaultValue;
  }
  return String(el.textContent).trim();
}

/**
 * Extrai atributo de um elemento de forma segura e case-insensitive.
 */
export function getAttributeValue(element, attrName) {
  if (!element || typeof element.getAttribute !== 'function') return null;
  const val = element.getAttribute(attrName);
  if (val !== null && val !== undefined) return val;
  const valLower = element.getAttribute(attrName.toLowerCase());
  if (valLower !== null && valLower !== undefined) return valLower;
  return null;
}

/**
 * Normaliza valores decimais lidos de XML, preservando representação textual exata.
 */
export function cleanDecimal(val, defaultValue = '0.00') {
  if (val === null || val === undefined || val === '') return defaultValue;
  const s = String(val).trim().replace(',', '.');
  return s || defaultValue;
}

/**
 * Formata mensagens nativas do DOMParser para exibição amigável ao usuário.
 */
export function formatParserErrorMessage(rawErrorText) {
  if (!rawErrorText) return 'Arquivo XML malformado ou corrompido.';
  const lineMatch = rawErrorText.match(/line\s+(\d+)/i) || rawErrorText.match(/linha\s+(\d+)/i);
  const colMatch = rawErrorText.match(/column\s+(\d+)/i) || rawErrorText.match(/coluna\s+(\d+)/i);

  let summary = rawErrorText
    .replace(/^error on line \d+ at column \d+:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (summary.length > 150) {
    summary = summary.slice(0, 147) + '...';
  }

  if (lineMatch && colMatch) {
    return `XML com erro sintático na linha ${lineMatch[1]}, coluna ${colMatch[1]}: ${summary}`;
  } else if (lineMatch) {
    return `XML com erro sintático na linha ${lineMatch[1]}: ${summary}`;
  }
  return `XML malformado ou corrompido: ${summary}`;
}

// =========================================================================
// 3. Função Principal: parseNFeXml(xmlString, options)
// =========================================================================

/**
 * Realiza o parsing completo de uma string XML de NF-e modelo 55.
 *
 * @param {string} xmlString Conteúdo bruto do arquivo XML
 * @param {Object} [options] Opções de parsing
 * @param {typeof DOMParser} [options.DOMParser] Injeção opcional de construtor DOMParser
 * @param {boolean} [options.strictMod55=true] Exigir que o modelo fiscal seja '55'
 * @returns {{ success: boolean, data?: Object, error?: string, details?: Object }}
 */
export function parseNFeXml(xmlString, options = {}) {
  if (!xmlString || typeof xmlString !== 'string' || !xmlString.trim()) {
    return {
      success: false,
      error: 'O conteúdo do arquivo XML está vazio.',
      details: { code: 'EMPTY_CONTENT' },
    };
  }

  // 1. Resolução do DOMParser (opção injetada -> window -> globalThis -> Node fallback)
  let ParserClass = options.DOMParser;
  if (!ParserClass && typeof window !== 'undefined' && window.DOMParser) {
    ParserClass = window.DOMParser;
  }
  if (!ParserClass && typeof globalThis !== 'undefined' && globalThis.DOMParser) {
    ParserClass = globalThis.DOMParser;
  }
  if (!ParserClass) {
    ParserClass = NodeXmlDomParser;
  }

  let xmlDoc;
  try {
    const parser = new ParserClass();
    xmlDoc = parser.parseFromString(xmlString, 'application/xml');
  } catch (err) {
    return {
      success: false,
      error: `Falha ao processar o arquivo XML: ${err.message}`,
      details: { code: 'PARSER_EXCEPTION', rawError: err.message },
    };
  }

  // 2. Detecção de erros sintáticos (<parsererror>)
  const root = xmlDoc ? xmlDoc.documentElement : null;
  if (!root) {
    return {
      success: false,
      error: 'Documento XML vazio ou não interpretável.',
      details: { code: 'EMPTY_DOCUMENT' },
    };
  }

  const rootLocalName = getElementLocalName(root);
  if (rootLocalName === 'parsererror') {
    const msg = formatParserErrorMessage(root.textContent);
    return {
      success: false,
      error: msg,
      details: { code: 'PARSER_ERROR', rawMessage: root.textContent.trim() },
    };
  }

  const parserErrors = findElements(xmlDoc, 'parsererror');
  if (parserErrors.length > 0) {
    const raw = parserErrors[0].textContent.trim();
    return {
      success: false,
      error: formatParserErrorMessage(raw),
      details: { code: 'PARSER_ERROR', rawMessage: raw },
    };
  }

  // 3. Localização dos nós NFe e protNFe (compatível com nfeProc e NFe avulso)
  let nfeNode = null;
  let protNode = null;

  if (rootLocalName === 'nfeProc') {
    nfeNode = findDirectChild(root, 'NFe') || findFirstElement(root, 'NFe');
    protNode = findDirectChild(root, 'protNFe') || findFirstElement(root, 'protNFe');
  } else if (rootLocalName === 'NFe') {
    nfeNode = root;
    protNode = findFirstElement(xmlDoc, 'protNFe');
  } else {
    nfeNode = findFirstElement(xmlDoc, 'NFe');
    protNode = findFirstElement(xmlDoc, 'protNFe');
  }

  if (!nfeNode) {
    return {
      success: false,
      error: 'Documento XML não contém a tag <NFe>. O arquivo não parece ser uma Nota Fiscal Eletrônica.',
      details: { code: 'INVALID_ROOT', rootTag: rootLocalName },
    };
  }

  const infNFe = findDirectChild(nfeNode, 'infNFe') || findFirstElement(nfeNode, 'infNFe');
  if (!infNFe) {
    return {
      success: false,
      error: 'Estrutura XML inválida: tag <infNFe> não encontrada dentro de <NFe>.',
      details: { code: 'MISSING_INF_NFE' },
    };
  }

  // Chave de acesso e versão
  const rawId = getAttributeValue(infNFe, 'Id') || '';
  let chaveAcesso = rawId.replace(/^NFe/i, '').replace(/\D/g, '');
  const versao = getAttributeValue(infNFe, 'versao') || '4.00';

  // 4. Extração do nó <ide> (Identificação)
  const ide = findDirectChild(infNFe, 'ide') || findFirstElement(infNFe, 'ide');
  if (!ide) {
    return {
      success: false,
      error: 'Estrutura XML inválida: tag <ide> não encontrada.',
      details: { code: 'MISSING_IDE' },
    };
  }

  const modelo = getTextContent(ide, 'mod', '55');
  if (options.strictMod55 !== false && modelo !== '55') {
    return {
      success: false,
      error: `Modelo fiscal inválido: ${modelo}. O SmartNFe aceita exclusivamente NF-e modelo 55.`,
      details: { code: 'INVALID_MODEL', modelo },
    };
  }

  const cUF = getTextContent(ide, 'cUF');
  const cNF = getTextContent(ide, 'cNF');
  const natOp = getTextContent(ide, 'natOp');
  const serie = getTextContent(ide, 'serie', '1');
  const nNF = getTextContent(ide, 'nNF');
  const dhEmi = getTextContent(ide, 'dhEmi') || getTextContent(ide, 'dEmi');
  const tpNF = parseInt(getTextContent(ide, 'tpNF', '1'), 10);
  const idDest = parseInt(getTextContent(ide, 'idDest', '1'), 10);
  const tpAmb = parseInt(getTextContent(ide, 'tpAmb', '1'), 10);

  // 5. Extração do nó <emit> (Emitente)
  const emit = findDirectChild(infNFe, 'emit') || findFirstElement(infNFe, 'emit');
  const emitCnpj = getTextContent(emit, 'CNPJ') || getTextContent(emit, 'CPF');
  const emitRazao = getTextContent(emit, 'xNome');
  const emitFantasia = getTextContent(emit, 'xFant');
  const emitIe = getTextContent(emit, 'IE');
  const enderEmit = emit ? (findDirectChild(emit, 'enderEmit') || findFirstElement(emit, 'enderEmit')) : null;
  const emitUf = enderEmit ? getTextContent(enderEmit, 'UF') : '';
  const emitMun = enderEmit ? getTextContent(enderEmit, 'xMun') : '';

  // 6. Extração do nó <dest> (Destinatário)
  const dest = findDirectChild(infNFe, 'dest') || findFirstElement(infNFe, 'dest');
  const destCnpj = getTextContent(dest, 'CNPJ') || getTextContent(dest, 'CPF');
  const destIdExt = getTextContent(dest, 'idEstrangeiro');
  const destNome = getTextContent(dest, 'xNome');
  const destIe = getTextContent(dest, 'IE');
  const enderDest = dest ? (findDirectChild(dest, 'enderDest') || findFirstElement(dest, 'enderDest')) : null;
  const destUf = enderDest ? getTextContent(enderDest, 'UF') : '';
  const destMun = enderDest ? getTextContent(enderDest, 'xMun') : '';
  const destPais = enderDest ? getTextContent(enderDest, 'xPais', 'Brasil') : 'Brasil';
  const destPaisCod = enderDest ? getTextContent(enderDest, 'cPais', '1058') : '1058';

  // 7. Extração dos nós <det> (Itens de Produtos)
  const detList = findDirectChildren(infNFe, 'det');
  const safeDetList = detList.length > 0 ? detList : findElements(infNFe, 'det');

  if (safeDetList.length === 0) {
    return {
      success: false,
      error: 'A NF-e não contém nenhum item na tag <det>.',
      details: { code: 'NO_ITEMS' },
    };
  }

  const itens = safeDetList.map((detEl, idx) => {
    const rawNItem = getAttributeValue(detEl, 'nItem');
    const nItem = rawNItem ? parseInt(rawNItem, 10) : idx + 1;
    const prod = findDirectChild(detEl, 'prod') || findFirstElement(detEl, 'prod');

    const cProd = getTextContent(prod, 'cProd');
    const cEAN = getTextContent(prod, 'cEAN', 'SEM GTIN');
    const xProd = getTextContent(prod, 'xProd');
    const ncm = getTextContent(prod, 'NCM');
    const cfop = getTextContent(prod, 'CFOP');
    const uCom = getTextContent(prod, 'uCom');
    const qCom = cleanDecimal(getTextContent(prod, 'qCom', '0.0000'), '0.0000');
    const vUnCom = cleanDecimal(getTextContent(prod, 'vUnCom', '0.0000'), '0.0000');
    const vProd = cleanDecimal(getTextContent(prod, 'vProd', '0.00'), '0.00');

    const cEANTrib = getTextContent(prod, 'cEANTrib', 'SEM GTIN');
    const uTrib = getTextContent(prod, 'uTrib', uCom);
    const qTrib = cleanDecimal(getTextContent(prod, 'qTrib', qCom), qCom);
    const vUnTrib = cleanDecimal(getTextContent(prod, 'vUnTrib', vUnCom), vUnCom);

    const vFrete = cleanDecimal(getTextContent(prod, 'vFrete', '0.00'), '0.00');
    const vSeg = cleanDecimal(getTextContent(prod, 'vSeg', '0.00'), '0.00');
    const vDesc = cleanDecimal(getTextContent(prod, 'vDesc', '0.00'), '0.00');
    const vOutro = cleanDecimal(getTextContent(prod, 'vOutro', '0.00'), '0.00');

    // Impostos do item
    const imposto = findDirectChild(detEl, 'imposto') || findFirstElement(detEl, 'imposto');
    let icmsData = { cst: '', orig: '0', vBC: '0.00', pICMS: '0.00', vICMS: '0.00' };
    let ipiData = { cst: '', vBC: '0.00', pIPI: '0.00', vIPI: '0.00' };
    let pisData = { cst: '', vBC: '0.00', pPIS: '0.00', vPIS: '0.00' };
    let cofinsData = { cst: '', vBC: '0.00', pCOFINS: '0.00', vCOFINS: '0.00' };

    if (imposto) {
      const icms = findFirstElement(imposto, 'ICMS');
      if (icms) {
        const icmsChildren = icms.children || [];
        const icmsGroup = icmsChildren.length > 0 ? icmsChildren[0] : icms;
        icmsData = {
          cst: getTextContent(icmsGroup, 'CST') || getTextContent(icmsGroup, 'CSOSN', ''),
          orig: getTextContent(icmsGroup, 'orig', '0'),
          vBC: cleanDecimal(getTextContent(icmsGroup, 'vBC', '0.00'), '0.00'),
          pICMS: cleanDecimal(getTextContent(icmsGroup, 'pICMS', '0.00'), '0.00'),
          vICMS: cleanDecimal(getTextContent(icmsGroup, 'vICMS', '0.00'), '0.00'),
        };
      }

      const ipi = findFirstElement(imposto, 'IPI');
      if (ipi) {
        const ipiTrib = findFirstElement(ipi, 'IPITrib') || findFirstElement(ipi, 'IPINT') || ipi;
        ipiData = {
          cst: getTextContent(ipiTrib, 'CST', ''),
          vBC: cleanDecimal(getTextContent(ipiTrib, 'vBC', '0.00'), '0.00'),
          pIPI: cleanDecimal(getTextContent(ipiTrib, 'pIPI', '0.00'), '0.00'),
          vIPI: cleanDecimal(getTextContent(ipiTrib, 'vIPI', '0.00'), '0.00'),
        };
      }

      const pis = findFirstElement(imposto, 'PIS');
      if (pis) {
        const pisGroup = pis.children && pis.children.length > 0 ? pis.children[0] : pis;
        pisData = {
          cst: getTextContent(pisGroup, 'CST', ''),
          vBC: cleanDecimal(getTextContent(pisGroup, 'vBC', '0.00'), '0.00'),
          pPIS: cleanDecimal(getTextContent(pisGroup, 'pPIS', '0.00'), '0.00'),
          vPIS: cleanDecimal(getTextContent(pisGroup, 'vPIS', '0.00'), '0.00'),
        };
      }

      const cofins = findFirstElement(imposto, 'COFINS');
      if (cofins) {
        const cofinsGroup = cofins.children && cofins.children.length > 0 ? cofins.children[0] : cofins;
        cofinsData = {
          cst: getTextContent(cofinsGroup, 'CST', ''),
          vBC: cleanDecimal(getTextContent(cofinsGroup, 'vBC', '0.00'), '0.00'),
          pCOFINS: cleanDecimal(getTextContent(cofinsGroup, 'pCOFINS', '0.00'), '0.00'),
          vCOFINS: cleanDecimal(getTextContent(cofinsGroup, 'vCOFINS', '0.00'), '0.00'),
        };
      }
    }

    return {
      nItem,
      cProd,
      cEAN,
      xProd,
      ncm,
      cfop,
      uCom,
      qCom,
      vUnCom,
      vProd,
      cEANTrib,
      uTrib,
      qTrib,
      vUnTrib,
      vFrete,
      vSeg,
      vDesc,
      vOutro,
      tributos: {
        icms: icmsData,
        ipi: ipiData,
        pis: pisData,
        cofins: cofinsData,
      },
    };
  });

  // 8. Extração do nó <total> / <ICMSTot> (Totais)
  const total = findDirectChild(infNFe, 'total') || findFirstElement(infNFe, 'total');
  const icmsTot = total ? (findDirectChild(total, 'ICMSTot') || findFirstElement(total, 'ICMSTot')) : null;

  const totais = {
    valorProdutos: cleanDecimal(getTextContent(icmsTot, 'vProd', '0.00'), '0.00'),
    valorFrete: cleanDecimal(getTextContent(icmsTot, 'vFrete', '0.00'), '0.00'),
    valorSeguro: cleanDecimal(getTextContent(icmsTot, 'vSeg', '0.00'), '0.00'),
    valorDesconto: cleanDecimal(getTextContent(icmsTot, 'vDesc', '0.00'), '0.00'),
    outrasDespesas: cleanDecimal(getTextContent(icmsTot, 'vOutro', '0.00'), '0.00'),
    valorTotalNota: cleanDecimal(getTextContent(icmsTot, 'vNF', '0.00'), '0.00'),
    valorICMS: cleanDecimal(getTextContent(icmsTot, 'vICMS', '0.00'), '0.00'),
    valorIPI: cleanDecimal(getTextContent(icmsTot, 'vIPI', '0.00'), '0.00'),
    valorPIS: cleanDecimal(getTextContent(icmsTot, 'vPIS', '0.00'), '0.00'),
    valorCOFINS: cleanDecimal(getTextContent(icmsTot, 'vCOFINS', '0.00'), '0.00'),
    pesoLiquido: '0.000',
    pesoBruto: '0.000',
  };

  // 9. Extração do nó <transp> e volumes
  const transp = findDirectChild(infNFe, 'transp') || findFirstElement(infNFe, 'transp');
  let transporte = { modFrete: '9', transporta: null, volumes: null };

  if (transp) {
    const modFrete = getTextContent(transp, 'modFrete', '9');
    const vol = findFirstElement(transp, 'vol');
    if (vol) {
      const pesoL = cleanDecimal(getTextContent(vol, 'pesoL', '0.000'), '0.000');
      const pesoB = cleanDecimal(getTextContent(vol, 'pesoB', '0.000'), '0.000');
      totais.pesoLiquido = pesoL;
      totais.pesoBruto = pesoB;
      transporte.volumes = {
        qVol: getTextContent(vol, 'qVol', '0'),
        esp: getTextContent(vol, 'esp', ''),
        pesoL,
        pesoB,
      };
    }
    transporte.modFrete = modFrete;
  }

  // 10. Extração do nó <protNFe> (Protocolo de Autorização)
  let protocolo = null;
  if (protNode) {
    const infProt = findDirectChild(protNode, 'infProt') || findFirstElement(protNode, 'infProt');
    if (infProt) {
      protocolo = {
        presente: true,
        tpAmb: getTextContent(infProt, 'tpAmb'),
        chNFe: getTextContent(infProt, 'chNFe'),
        dhRecbto: getTextContent(infProt, 'dhRecbto'),
        nProt: getTextContent(infProt, 'nProt'),
        cStat: getTextContent(infProt, 'cStat'),
        xMotivo: getTextContent(infProt, 'xMotivo'),
      };
    }
  }

  // Fallback para chave de acesso se infNFe/@Id estava vazia
  if (!chaveAcesso && protocolo?.chNFe) {
    chaveAcesso = protocolo.chNFe;
  }

  return {
    success: true,
    data: {
      rawRoot: rootLocalName,
      versao,
      chaveAcesso,
      infNFeId: rawId,
      ide: {
        cUF,
        cNF,
        natOp,
        mod: modelo,
        serie,
        nNF,
        dhEmi,
        tpNF,
        idDest,
        tpAmb,
      },
      emit: {
        cnpj: emitCnpj,
        razaoSocial: emitRazao,
        nomeFantasia: emitFantasia,
        inscricaoEstadual: emitIe,
        uf: emitUf,
        municipio: emitMun,
      },
      dest: {
        cnpj: destCnpj,
        idEstrangeiro: destIdExt,
        nome: destNome,
        inscricaoEstadual: destIe,
        uf: destUf,
        municipio: destMun,
        pais: destPais,
        paisCodigo: destPaisCod,
      },
      itens,
      totais,
      transporte,
      protocolo,
    },
  };
}
