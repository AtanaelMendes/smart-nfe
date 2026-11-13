/**
 * SmartNFe — Gerador Paramétrico de Fixtures XML de NF-e 4.00
 * tests/fixtures/xmlFixtureGenerator.mjs
 *
 * ES Module puro sem dependências externas.
 * Gera documentos fiscais eletrônicos sintéticos compatíveis com o padrão SEFAZ NF-e 4.00,
 * chaves de acesso criptograficamente válidas com algoritmo Módulo 11 oficial,
 * e cenários de alocação N:M (agrupamento, divisão, misto, colisão de códigos, unidades incompatíveis e estresse de escala).
 */

import {
  cleanDecimalString,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  roundDecimal,
  decimalSum,
} from '../../app/lib/calculations/decimal.js';

// ============================================================================
// 1. CATÁLOGOS E TABELAS OFICIAIS SEFAZ / IBGE
// ============================================================================

export const UF_IBGE_TABLE = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27',
  SE: '28', BA: '29', MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41',
  SC: '42', RS: '43', MS: '50', MT: '51', GO: '52', DF: '53',
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

/**
 * Catálogo de 10 Fornecedores Brasileiros com CNPJs e DVs oficiais válidos
 */
export const SUPPLIERS_CATALOG = [
  {
    xNome: 'Agroexport Brasil S.A.',
    xFant: 'Agroexport',
    cnpj: '12345678000195',
    uf: 'SP',
    cUF: '35',
    xMun: 'Santos',
    cMun: '3548500',
    ie: '123456789012',
    crt: '3',
    xLgr: 'Avenida Portuária',
    nro: '1500',
    xBairro: 'Porto',
    cep: '11010000',
  },
  {
    xNome: 'Cooperativa Agroindustrial de MT - COOPAGRO',
    xFant: 'COOPAGRO',
    cnpj: '73218492000160',
    uf: 'MT',
    cUF: '51',
    xMun: 'Rondonópolis',
    cMun: '5107602',
    ie: '512345678901',
    crt: '3',
    xLgr: 'Rodovia BR-163 Km 120',
    nro: 'S/N',
    xBairro: 'Distrito Industrial',
    cep: '78700000',
  },
  {
    xNome: 'Cerealista Centro-Oeste S.A.',
    xFant: 'Cerealista Centro-Oeste',
    cnpj: '03112554000179',
    uf: 'GO',
    cUF: '52',
    xMun: 'Rio Verde',
    cMun: '5218805',
    ie: '523456789012',
    crt: '3',
    xLgr: 'Avenida das Nações',
    nro: '800',
    xBairro: 'Agropecuário',
    cep: '75900000',
  },
  {
    xNome: 'Metalúrgica Sul Americana Ltda',
    xFant: 'MetalSul',
    cnpj: '98765432000198',
    uf: 'SC',
    cUF: '42',
    xMun: 'Joinville',
    cMun: '4209102',
    ie: '423456789012',
    crt: '3',
    xLgr: 'Rua das Indústrias',
    nro: '250',
    xBairro: 'Zona Industrial Norte',
    cep: '89200000',
  },
  {
    xNome: 'Eletroparts do Brasil S.A.',
    xFant: 'Eletroparts',
    cnpj: '55544433000108',
    uf: 'RS',
    cUF: '43',
    xMun: 'Porto Alegre',
    cMun: '4314902',
    ie: '434567890123',
    crt: '3',
    xLgr: 'Avenida Severo Dullius',
    nro: '1000',
    xBairro: 'São João',
    cep: '90200000',
  },
  {
    xNome: 'Grãos do Sul Cooperativa',
    xFant: 'Grãos do Sul',
    cnpj: '88999777000152',
    uf: 'PR',
    cUF: '41',
    xMun: 'Cascavel',
    cMun: '4104808',
    ie: '415678901234',
    crt: '3',
    xLgr: 'Rodovia das Cataratas',
    nro: '450',
    xBairro: 'Parque Agrícola',
    cep: '85800000',
  },
  {
    xNome: 'Café Minas Exportadora Ltda',
    xFant: 'Café Minas',
    cnpj: '14235813000175',
    uf: 'MG',
    cUF: '31',
    xMun: 'Varginha',
    cMun: '3170701',
    ie: '316789012345',
    crt: '3',
    xLgr: 'Rua do Café Especial',
    nro: '320',
    xBairro: 'Centro',
    cep: '37000000',
  },
  {
    xNome: 'Bioenergia Canais Paulistas S.A.',
    xFant: 'Bioenergia Paulistas',
    cnpj: '21345589000130',
    uf: 'SP',
    cUF: '35',
    xMun: 'Ribeirão Preto',
    cMun: '3543402',
    ie: '357890123456',
    crt: '3',
    xLgr: 'Rodovia Anhanguera Km 312',
    nro: 'S/N',
    xBairro: 'Zona Rural',
    cep: '14000000',
  },
  {
    xNome: 'Frigorífico Pantanal Mato-Grossense',
    xFant: 'FrigoPantanal',
    cnpj: '34567890000130',
    uf: 'MS',
    cUF: '50',
    xMun: 'Campo Grande',
    cMun: '5002704',
    ie: '508901234567',
    crt: '3',
    xLgr: 'Avenida Duque de Caxias',
    nro: '5400',
    xBairro: 'Vila Alba',
    cep: '79100000',
  },
  {
    xNome: 'Algodoeira do Cerrado S.A.',
    xFant: 'Algodão Cerrado',
    cnpj: '45678901000175',
    uf: 'MT',
    cUF: '51',
    xMun: 'Sorriso',
    cMun: '5107925',
    ie: '519012345678',
    crt: '3',
    xLgr: 'Avenida dos Pioneiros',
    nro: '120',
    xBairro: 'Setor Industrial',
    cep: '78890000',
  },
];

/**
 * Catálogo de 6 Clientes Estrangeiros de Exportação
 */
export const FOREIGN_CLIENTS_CATALOG = [
  {
    id: 'client-nl-01',
    xNome: 'Global Trading Logistics B.V.',
    pais: 'Holanda',
    paisCodigo: 'NL',
    cPais: '3607',
    idEstrangeiro: 'NL884920192B01',
    xMun: 'Rotterdam',
    cMun: '9999999',
    uf: 'EX',
    xLgr: 'Maasvlakte Boulevard',
    nro: '42',
    xBairro: 'Havengebied',
    destinationPort: 'Rotterdam',
  },
  {
    id: 'client-us-02',
    xNome: 'Industrial Supply Corp.',
    pais: 'Estados Unidos',
    paisCodigo: 'US',
    cPais: '2496',
    idEstrangeiro: 'US-TX-9874125',
    xMun: 'Houston',
    cMun: '9999999',
    uf: 'EX',
    xLgr: 'Port Terminal Blvd',
    nro: '1050',
    xBairro: 'Ship Channel',
    destinationPort: 'Houston',
  },
  {
    id: 'client-de-03',
    xNome: 'Auto Assembly Europe GmbH',
    pais: 'Alemanha',
    paisCodigo: 'DE',
    cPais: '0230',
    idEstrangeiro: 'DE814523990',
    xMun: 'Hamburg',
    cMun: '9999999',
    uf: 'EX',
    xLgr: 'Am Sandtorkai',
    nro: '68',
    xBairro: 'Speicherstadt',
    destinationPort: 'Hamburg',
  },
  {
    id: 'client-cn-04',
    xNome: 'Sinochem Agro Overseas Ltd',
    pais: 'China',
    paisCodigo: 'CN',
    cPais: '1600',
    idEstrangeiro: 'CN9131000012',
    xMun: 'Shanghai',
    cMun: '9999999',
    uf: 'EX',
    xLgr: 'Pudong South Road',
    nro: '500',
    xBairro: 'Lujiazui',
    destinationPort: 'Shanghai',
  },
  {
    id: 'client-sg-05',
    xNome: 'Cargill International Trading Pte Ltd',
    pais: 'Cingapura',
    paisCodigo: 'SG',
    cPais: '1694',
    idEstrangeiro: 'SG201988231A',
    xMun: 'Singapore',
    cMun: '9999999',
    uf: 'EX',
    xLgr: 'Marina Bay Financial Centre Tower 1',
    nro: '8',
    xBairro: 'Marina Bay',
    destinationPort: 'Singapore',
  },
  {
    id: 'client-be-06',
    xNome: 'Antwerp Agribulk Terminal N.V.',
    pais: 'Bélgica',
    paisCodigo: 'BE',
    cPais: '0970',
    idEstrangeiro: 'BE0428991204',
    xMun: 'Antwerp',
    cMun: '9999999',
    uf: 'EX',
    xLgr: 'Havenhuis Zaha Hadidplein',
    nro: '1',
    xBairro: 'Antwerp Port',
    destinationPort: 'Antwerp',
  },
];

/**
 * Catálogo de 8 Commodities Agrícolas e Industriais de Exportação
 */
export const COMMODITIES_CATALOG = {
  CAFE: {
    key: 'CAFE',
    codigo: 'EXP-CAF-001',
    xProd: 'Café em Grão Cru Arábica Tipo 6',
    ncm: '09011110',
    cfop: '7101',
    uCom: 'SC',
    vUnCom: '25.5000',
    qCom: '500.0000',
  },
  SOJA: {
    key: 'SOJA',
    codigo: 'SOJA-01',
    xProd: 'Soja em Grãos Não Transgênica Padrão Exportação',
    ncm: '12019000',
    cfop: '7101',
    uCom: 'TON',
    vUnCom: '350.0000',
    qCom: '120.0000',
  },
  ACUCAR: {
    key: 'ACUCAR',
    codigo: 'EXP-ACU-002',
    xProd: 'Açúcar Cristal Branco Refinado Icumsa 45',
    ncm: '17019900',
    cfop: '7101',
    uCom: 'TON',
    vUnCom: '420.0000',
    qCom: '80.0000',
  },
  SUCO: {
    key: 'SUCO',
    codigo: 'EXP-SUC-003',
    xProd: 'Suco de Laranja Concentrado Congelado FCOJ 66 Brix',
    ncm: '20091100',
    cfop: '7101',
    uCom: 'TON',
    vUnCom: '1800.0000',
    qCom: '25.0000',
  },
  CELULOSE: {
    key: 'CELULOSE',
    codigo: 'EXP-CEL-004',
    xProd: 'Polpa de Celulose Branqueada de Eucalipto',
    ncm: '47032900',
    cfop: '7101',
    uCom: 'TON',
    vUnCom: '480.0000',
    qCom: '150.0000',
  },
  CARNE: {
    key: 'CARNE',
    codigo: 'EXP-BOV-005',
    xProd: 'Cortes Congelados de Carne Bovina Desossada Dianteiro',
    ncm: '02023000',
    cfop: '7101',
    uCom: 'KG',
    vUnCom: '12.5000',
    qCom: '3500.0000',
  },
  MILHO: {
    key: 'MILHO',
    codigo: 'MILHO-02',
    xProd: 'Milho Amarelo em Grãos Padrão Exportação Tipo 1',
    ncm: '10059010',
    cfop: '7101',
    uCom: 'TON',
    vUnCom: '180.0000',
    qCom: '200.0000',
  },
  ALGODAO: {
    key: 'ALGODAO',
    codigo: 'EXP-ALG-006',
    xProd: 'Algodão em Pluma Beneficiado Tipo 41-4',
    ncm: '52010020',
    cfop: '7101',
    uCom: 'TON',
    vUnCom: '1450.0000',
    qCom: '40.0000',
  },
};

// ============================================================================
// 2. FUNÇÕES CRIPTOGRÁFICAS E ALGORÍTMICAS DA CHAVE DE ACESSO
// ============================================================================

/**
 * Calcula o Dígito Verificador (Módulo 11) oficial SEFAZ para o corpo de 43 dígitos.
 * Pesos cíclicos [2, 3, 4, 5, 6, 7, 8, 9] aplicados da direita para a esquerda.
 * Se resto = 0 ou 1, DV = 0; senão DV = 11 - resto.
 *
 * @param {string} body43 - Cadeia de exatamente 43 dígitos numéricos
 * @returns {number} Dígito verificador de 0 a 9
 */
export function calculateModulo11(body43) {
  if (typeof body43 !== 'string' || body43.length !== 43 || !/^\d{43}$/.test(body43)) {
    throw new Error(`calculateModulo11 requer exatamente 43 dígitos numéricos (recebido: "${body43}")`);
  }

  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;

  for (let i = 42; i >= 0; i--) {
    const digit = parseInt(body43.charAt(i), 10);
    const weight = weights[(42 - i) % weights.length];
    sum += digit * weight;
  }

  const remainder = sum % 11;
  return remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
}

/**
 * Gera uma chave de acesso SEFAZ NF-e de 44 dígitos com integridade algorítmica garantida.
 *
 * @param {object} [options={}]
 * @param {string} [options.cUF='35'] - Código IBGE do Estado (2 dígitos)
 * @param {string|number} [options.year='26'] - Ano da emissão (2 dígitos)
 * @param {string|number} [options.month='10'] - Mês da emissão (01 a 12)
 * @param {string} [options.cnpj='12345678000195'] - CNPJ do emitente (14 dígitos)
 * @param {string} [options.mod='55'] - Modelo (estritamente '55')
 * @param {string|number} [options.serie='1'] - Série da NF-e (1 a 3 dígitos)
 * @param {string|number} [options.nNF='145892'] - Número sequencial da NF-e (1 a 9 dígitos)
 * @param {string|number} [options.tpEmis='1'] - Tipo de emissão ('1' = Normal)
 * @param {string|number} [options.cNF] - Código numérico aleatório de 8 dígitos
 * @returns {{ chaveAcesso: string, cDV: number, body43: string }}
 */
export function generateAccessKey(options = {}) {
  const cUF = String(options.cUF ?? '35').padStart(2, '0');
  const year = String(options.year ?? '26').padStart(2, '0');
  const month = String(options.month ?? '10').padStart(2, '0');
  const cnpj = String(options.cnpj ?? '12345678000195').replace(/\D/g, '').padStart(14, '0');
  const mod = String(options.mod ?? '55').padStart(2, '0');
  const serie = String(options.serie ?? '1').padStart(3, '0');
  const nNF = String(options.nNF ?? '145892').padStart(9, '0');
  const tpEmis = String(options.tpEmis ?? '1').padStart(1, '0');

  let cNF = options.cNF !== undefined ? String(options.cNF).padStart(8, '0') : null;
  if (!cNF) {
    // Deterministico ou semi-aleatório com 8 dígitos
    const seed = (parseInt(nNF, 10) * 73 + parseInt(serie, 10) * 17) % 100000000;
    cNF = String(seed).padStart(8, '0');
  }

  const body43 = `${cUF}${year}${month}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
  const cDV = calculateModulo11(body43);
  const chaveAcesso = `${body43}${cDV}`;

  return { chaveAcesso, cDV, body43 };
}

/**
 * Formata a chave de acesso em 11 blocos de 4 dígitos separados por espaço.
 * @param {string} key
 * @returns {string}
 */
export function formatAccessKey(key) {
  const clean = String(key || '').replace(/\D/g, '');
  if (clean.length !== 44) return key;
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// ============================================================================
// 3. FUNÇÕES CONSTRUTORAS DE XML NF-e 4.00
// ============================================================================

/**
 * Constrói o elemento XML `<det nItem="k">` para um item de mercadoria.
 *
 * @param {object} itemSpec
 * @param {number} index - 1-based index
 * @returns {string}
 */
export function buildXmlItem(itemSpec, index = 1) {
  const nItem = itemSpec.nItem || index;
  const cProd = itemSpec.codigo || itemSpec.cProd || `ITEM-${nItem}`;
  const cEAN = itemSpec.cEAN || 'SEM GTIN';
  const xProd = itemSpec.descricao || itemSpec.xProd || `Produto ${nItem}`;
  const ncm = itemSpec.ncm || itemSpec.NCM || '09011110';
  const cfop = itemSpec.cfop || itemSpec.CFOP || '7101';
  const uCom = itemSpec.unidade || itemSpec.uCom || 'SC';
  const qCom = roundDecimal(itemSpec.quantidade || itemSpec.qCom || '100.0000', 4);
  const vUnCom = roundDecimal(itemSpec.valorUnitario || itemSpec.vUnCom || '10.0000', 4);

  const calcProd = decimalMultiply(vUnCom, qCom, 2);
  const vProd = roundDecimal(itemSpec.valorTotal || itemSpec.vProd || calcProd, 2);

  const vFrete = roundDecimal(itemSpec.frete || itemSpec.valorFrete || itemSpec.vFrete || '0.00', 2);
  const vSeg = roundDecimal(itemSpec.seguro || itemSpec.valorSeguro || itemSpec.vSeg || '0.00', 2);
  const vDesc = roundDecimal(itemSpec.desconto || itemSpec.valorDesconto || itemSpec.vDesc || '0.00', 2);
  const vOutro = roundDecimal(itemSpec.outrasDespesas || itemSpec.vOutro || '0.00', 2);

  return `    <det nItem="${nItem}">
      <prod>
        <cProd>${cProd}</cProd>
        <cEAN>${cEAN}</cEAN>
        <xProd>${xProd}</xProd>
        <NCM>${ncm}</NCM>
        <CFOP>${cfop}</CFOP>
        <uCom>${uCom}</uCom>
        <qCom>${qCom}</qCom>
        <vUnCom>${vUnCom}</vUnCom>
        <vProd>${vProd}</vProd>
        <cEANTrib>${cEAN}</cEANTrib>
        <uTrib>${uCom}</uTrib>
        <qTrib>${qCom}</qTrib>
        <vUnTrib>${vUnCom}</vUnTrib>
        <vFrete>${vFrete}</vFrete>
        <vSeg>${vSeg}</vSeg>
        <vDesc>${vDesc}</vDesc>
        <vOutro>${vOutro}</vOutro>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMS40>
            <orig>0</orig>
            <CST>40</CST>
            <vBC>0.00</vBC>
            <pICMS>0.00</pICMS>
            <vICMS>0.00</vICMS>
          </ICMS40>
        </ICMS>
        <IPI>
          <IPINT>
            <CST>53</CST>
          </IPINT>
        </IPI>
        <PIS>
          <PISNT>
            <CST>08</CST>
          </PISNT>
        </PIS>
        <COFINS>
          <COFINSNT>
            <CST>08</CST>
          </COFINSNT>
        </COFINS>
      </imposto>
    </det>`;
}

/**
 * Gera um documento XML NF-e 4.00 com totais matematicamente equilibrados ao centavo.
 *
 * @param {object} [invoiceDefinition={}]
 * @param {object} [options={}]
 * @param {'nfeProc'|'NFe'} [options.envelope='nfeProc']
 * @returns {{ xml: string, chaveAcesso: string, invoiceId: string, items: Array, totais: Object }}
 */
export function generateNFeXml(invoiceDefinition = {}, options = {}) {
  const envelope = options.envelope || 'nfeProc';

  // 1. Fornecedor (Emitente)
  const supplierIdx = invoiceDefinition.supplierIndex !== undefined ? invoiceDefinition.supplierIndex : 0;
  const supplier = invoiceDefinition.emitente || SUPPLIERS_CATALOG[supplierIdx % SUPPLIERS_CATALOG.length];

  // 2. Destinatário
  const clientIdx = invoiceDefinition.clientIndex !== undefined ? invoiceDefinition.clientIndex : 0;
  const client = invoiceDefinition.destinatario || FOREIGN_CLIENTS_CATALOG[clientIdx % FOREIGN_CLIENTS_CATALOG.length];

  // 3. Identificação da NF-e
  const serie = String(invoiceDefinition.serie || '1');
  const nNF = String(invoiceDefinition.nNF || invoiceDefinition.numero || '145892').replace(/\D/g, '');
  const cUF = supplier.cUF || '35';
  const dhEmi = invoiceDefinition.dhEmi || invoiceDefinition.dataEmissao || '2026-10-15T10:30:00-03:00';
  const natOp = invoiceDefinition.natOp || invoiceDefinition.naturezaOperacao || 'EXPORTAÇÃO DE MERCADORIAS';

  // Chave de acesso e cNF
  const cNF = invoiceDefinition.cNF || String((parseInt(nNF, 10) * 137 + 10101) % 100000000).padStart(8, '0');
  const { chaveAcesso, cDV } = generateAccessKey({
    cUF,
    year: dhEmi.substring(2, 4) || '26',
    month: dhEmi.substring(5, 7) || '10',
    cnpj: supplier.cnpj,
    mod: '55',
    serie,
    nNF,
    tpEmis: '1',
    cNF,
  });

  // 4. Itens da NF-e
  const rawItems = invoiceDefinition.itens || invoiceDefinition.items;
  let itemsToBuild = [];

  if (Array.isArray(rawItems) && rawItems.length > 0) {
    itemsToBuild = rawItems;
  } else {
    // Default: 1 commodity padrão
    itemsToBuild = [COMMODITIES_CATALOG.CAFE];
  }

  // 5. Cálculo dos Totais Fiscais com BigInt/Decimal
  let sumProd = '0.00';
  let sumFrete = '0.00';
  let sumSeg = '0.00';
  let sumDesc = '0.00';
  let sumOutro = '0.00';

  const processedItems = itemsToBuild.map((item, idx) => {
    const nItem = idx + 1;
    const qCom = roundDecimal(item.quantidade || item.qCom || '100.0000', 4);
    const vUnCom = roundDecimal(item.valorUnitario || item.vUnCom || '10.0000', 4);
    const vProd = roundDecimal(item.valorTotal || item.vProd || decimalMultiply(vUnCom, qCom, 2), 2);
    const vFrete = roundDecimal(item.frete || item.valorFrete || item.vFrete || '0.00', 2);
    const vSeg = roundDecimal(item.seguro || item.valorSeguro || item.vSeg || '0.00', 2);
    const vDesc = roundDecimal(item.desconto || item.valorDesconto || item.vDesc || '0.00', 2);
    const vOutro = roundDecimal(item.outrasDespesas || item.vOutro || '0.00', 2);

    sumProd = decimalAdd(sumProd, vProd, 2);
    sumFrete = decimalAdd(sumFrete, vFrete, 2);
    sumSeg = decimalAdd(sumSeg, vSeg, 2);
    sumDesc = decimalAdd(sumDesc, vDesc, 2);
    sumOutro = decimalAdd(sumOutro, vOutro, 2);

    return {
      ...item,
      nItem,
      qCom,
      vUnCom,
      vProd,
      vFrete,
      vSeg,
      vDesc,
      vOutro,
    };
  });

  // Totais globais
  const vProdTotal = invoiceDefinition.totais?.valorProdutos || sumProd;
  const vFreteTotal = invoiceDefinition.totais?.valorFrete || sumFrete;
  const vSegTotal = invoiceDefinition.totais?.valorSeguro || sumSeg;
  const vDescTotal = invoiceDefinition.totais?.valorDesconto || sumDesc;
  const vOutroTotal = invoiceDefinition.totais?.outrasDespesas || sumOutro;

  // vNF = vProd + vFrete + vSeg + vOutro - vDesc
  const subtotal = decimalAdd(
    decimalAdd(decimalAdd(vProdTotal, vFreteTotal, 2), vSegTotal, 2),
    vOutroTotal,
    2
  );
  const vNFTotal = invoiceDefinition.totais?.valorTotalNota || decimalSubtract(subtotal, vDescTotal, 2);

  const totais = {
    valorProdutos: vProdTotal,
    valorFrete: vFreteTotal,
    valorSeguro: vSegTotal,
    valorDesconto: vDescTotal,
    outrasDespesas: vOutroTotal,
    valorTotalNota: vNFTotal,
    pesoLiquido: invoiceDefinition.totais?.pesoLiquido || '1000.000',
    pesoBruto: invoiceDefinition.totais?.pesoBruto || '1050.000',
  };

  const xmlItemsStr = processedItems.map((it, idx) => buildXmlItem(it, idx + 1)).join('\n');

  // Identificação do Destinatário (Exterior ou Nacional)
  let destXml = '';
  if (client.idEstrangeiro) {
    destXml = `    <dest>
      <idEstrangeiro>${client.idEstrangeiro}</idEstrangeiro>
      <xNome>${client.xNome}</xNome>
      <enderDest>
        <xLgr>${client.xLgr || 'Harbor Road'}</xLgr>
        <nro>${client.nro || '1'}</nro>
        <xBairro>${client.xBairro || 'Port'}</xBairro>
        <cMun>9999999</cMun>
        <xMun>${client.xMun || 'Rotterdam'}</xMun>
        <UF>EX</UF>
        <cPais>${client.cPais || '3607'}</cPais>
        <xPais>${client.pais || 'Holanda'}</xPais>
      </enderDest>
      <indIEDest>9</indIEDest>
    </dest>`;
  } else {
    destXml = `    <dest>
      <CNPJ>${client.cnpj || '99999999000199'}</CNPJ>
      <xNome>${client.xNome}</xNome>
      <enderDest>
        <xLgr>${client.xLgr || 'Rua Central'}</xLgr>
        <nro>${client.nro || '100'}</nro>
        <xBairro>${client.xBairro || 'Centro'}</xBairro>
        <cMun>${client.cMun || '3550308'}</cMun>
        <xMun>${client.xMun || 'São Paulo'}</xMun>
        <UF>${client.uf || 'SP'}</UF>
        <CEP>${client.cep || '01000000'}</CEP>
        <cPais>1058</cPais>
        <xPais>Brasil</xPais>
      </enderDest>
      <indIEDest>${client.indIEDest || '1'}</indIEDest>
      <IE>${client.ie || '123456789'}</IE>
    </dest>`;
  }

  const nfeCore = `  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${chaveAcesso}" versao="4.00">
      <ide>
        <cUF>${cUF}</cUF>
        <cNF>${cNF}</cNF>
        <natOp>${natOp}</natOp>
        <mod>55</mod>
        <serie>${serie}</serie>
        <nNF>${nNF}</nNF>
        <dhEmi>${dhEmi}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>${client.idEstrangeiro ? '3' : '1'}</idDest>
        <cMunFG>${supplier.cMun}</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${cDV}</cDV>
        <tpAmb>1</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>0</indFinal>
        <indPres>9</indPres>
        <procEmi>0</procEmi>
        <verProc>SmartNFe-4.0.0</verProc>
      </ide>
      <emit>
        <CNPJ>${supplier.cnpj}</CNPJ>
        <xNome>${supplier.xNome}</xNome>
        <xFant>${supplier.xFant || supplier.xNome}</xFant>
        <enderEmit>
          <xLgr>${supplier.xLgr}</xLgr>
          <nro>${supplier.nro}</nro>
          <xBairro>${supplier.xBairro}</xBairro>
          <cMun>${supplier.cMun}</cMun>
          <xMun>${supplier.xMun}</xMun>
          <UF>${supplier.uf}</UF>
          <CEP>${supplier.cep}</CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
        </enderEmit>
        <IE>${supplier.ie}</IE>
        <CRT>${supplier.crt}</CRT>
      </emit>
${destXml}
${xmlItemsStr}
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${totais.valorProdutos}</vProd>
          <vFrete>${totais.valorFrete}</vFrete>
          <vSeg>${totais.valorSeguro}</vSeg>
          <vDesc>${totais.valorDesconto}</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>${totais.outrasDespesas}</vOutro>
          <vNF>${totais.valorTotalNota}</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>0</modFrete>
        <vol>
          <qVol>100</qVol>
          <esp>VOLUMES</esp>
          <pesoL>${totais.pesoLiquido}</pesoL>
          <pesoB>${totais.pesoBruto}</pesoB>
        </vol>
      </transp>
    </infNFe>
  </NFe>`;

  let finalXml = '';
  if (envelope === 'NFe') {
    finalXml = `<?xml version="1.0" encoding="UTF-8"?>\n${nfeCore}`;
  } else {
    finalXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
${nfeCore}
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>SP_NFE_PL_009_V4</verAplic>
      <chNFe>${chaveAcesso}</chNFe>
      <dhRecbto>${dhEmi}</dhRecbto>
      <nProt>1${cUF}26${String(Math.floor(1000000000 + Math.random() * 9000000000))}</nProt>
      <digVal>K1J9W5eB7rK0L8z7yA6x2c1v0B4=</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
  }

  const invoiceId = `nfe-${chaveAcesso}`;

  return {
    xml: finalXml,
    chaveAcesso,
    invoiceId,
    items: processedItems,
    totais,
    emitente: supplier,
    destinatario: client,
    nNF,
    serie,
  };
}

/**
 * Produz um lote de notas fiscais sintéticas para testes de importação em lote e fila concorrente.
 *
 * @param {number|Array<object>} definitionsOrCount - Quantidade ou array de especificações
 * @param {object} [globalOptions={}]
 * @returns {Array<{ filename: string, xml: string, chaveAcesso: string, invoiceId: string, invoice: object }>}
 */
export function generateNFeBatch(definitionsOrCount = 10, globalOptions = {}) {
  let defs = [];

  if (typeof definitionsOrCount === 'number') {
    const count = definitionsOrCount;
    for (let i = 0; i < count; i++) {
      const supplierIdx = i % SUPPLIERS_CATALOG.length;
      const nNF = String(100000 + i + 1);
      defs.push({
        supplierIndex: supplierIdx,
        nNF,
        serie: '1',
      });
    }
  } else if (Array.isArray(definitionsOrCount)) {
    defs = definitionsOrCount;
  }

  return defs.map((def, idx) => {
    const res = generateNFeXml(def, globalOptions);
    const filename = `nfe_${res.chaveAcesso}.xml`;
    return {
      filename,
      xml: res.xml,
      chaveAcesso: res.chaveAcesso,
      invoiceId: res.invoiceId,
      invoice: res,
    };
  });
}

// ============================================================================
// 4. CENÁRIOS PRÉ-CONFIGURADOS (READY-TO-USE PARA TESTES E2E)
// ============================================================================

export const SCENARIOS = {
  /**
   * Cenário 1: Agrupamento (2 -> 1)
   * 2 notas fiscais de diferentes fornecedores agrupadas em 1 exportação para Global Trading NL.
   */
  createGroupingScenario(options = {}) {
    const supplierA = SUPPLIERS_CATALOG[0]; // Agroexport SP
    const supplierB = SUPPLIERS_CATALOG[1]; // Coopagro MT
    const destination = FOREIGN_CLIENTS_CATALOG[0]; // Global Trading NL

    const nfeA = generateNFeXml({
      emitente: supplierA,
      destinatario: destination,
      nNF: '145892',
      serie: '1',
      itens: [
        {
          codigo: 'EXP-CAF-001',
          descricao: 'Café em Grão Cru Arábica Tipo 6',
          ncm: '09011110',
          unidade: 'SC',
          quantidade: '500.0000',
          valorUnitario: '25.5000',
          valorTotal: '12750.00',
          frete: '100.00',
        },
      ],
    });

    const nfeB = generateNFeXml({
      emitente: supplierB,
      destinatario: destination,
      nNF: '089412',
      serie: '1',
      itens: [
        {
          codigo: 'COOP-CAF-002',
          descricao: 'Café Conilon Padrão Exportação',
          ncm: '09011110',
          unidade: 'SC',
          quantidade: '300.0000',
          valorUnitario: '22.0000',
          valorTotal: '6600.00',
          frete: '60.00',
        },
      ],
    });

    const destNote = {
      id: 'dest-nl-grouping-01',
      numero: 'EXP-GRP-001',
      foreignClient: destination,
      allocations: {
        [`${nfeA.invoiceId}__nfe-${nfeA.chaveAcesso}-item-1`]: '500.0000',
        [`${nfeB.invoiceId}__nfe-${nfeB.chaveAcesso}-item-1`]: '300.0000',
      },
    };

    return {
      invoices: [nfeA, nfeB],
      destination,
      destNote,
      expectedAllocations: {
        totalAllocatedQty: '800.0000',
        totalAllocatedValue: '19350.00',
        totalFreight: '160.00',
      },
    };
  },

  /**
   * Cenário 2: Divisão (1 -> M)
   * 1 grande nota de agroindústria dividida entre 3 contratos internacionais (M=3).
   */
  createDivisionScenario(options = {}) {
    const supplier = SUPPLIERS_CATALOG[2]; // Cerealista Centro-Oeste GO
    const sourceNFe = generateNFeXml({
      emitente: supplier,
      nNF: '500100',
      serie: '1',
      itens: [
        {
          codigo: 'SOJA-BULK-01',
          descricao: 'Soja em Grãos Não Transgênica a Granel',
          ncm: '12019000',
          unidade: 'TON',
          quantidade: '1000.0000',
          valorUnitario: '320.0000',
          valorTotal: '320000.00',
          frete: '6000.00',
        },
        {
          codigo: 'MILHO-BULK-02',
          descricao: 'Milho em Grãos Padrão Exportação',
          ncm: '10059010',
          unidade: 'TON',
          quantidade: '500.0000',
          valorUnitario: '180.0000',
          valorTotal: '90000.00',
          frete: '3000.00',
        },
      ],
    });

    const keySoja = `${sourceNFe.invoiceId}__nfe-${sourceNFe.chaveAcesso}-item-1`;
    const keyMilho = `${sourceNFe.invoiceId}__nfe-${sourceNFe.chaveAcesso}-item-2`;

    const destinations = [
      {
        id: 'dest-cargill-sg',
        numero: 'EXP-DIV-001',
        foreignClient: FOREIGN_CLIENTS_CATALOG[4], // Cargill SG
        allocations: {
          [keySoja]: '400.0000',
          [keyMilho]: '200.0000',
        },
      },
      {
        id: 'dest-bunge-nl',
        numero: 'EXP-DIV-002',
        foreignClient: FOREIGN_CLIENTS_CATALOG[0], // Global Trading NL
        allocations: {
          [keySoja]: '350.0000',
          [keyMilho]: '200.0000',
        },
      },
      {
        id: 'dest-adm-be',
        numero: 'EXP-DIV-003',
        foreignClient: FOREIGN_CLIENTS_CATALOG[5], // Antwerp BE
        allocations: {
          [keySoja]: '250.0000',
          [keyMilho]: '100.0000',
        },
      },
    ];

    return {
      sourceInvoice: sourceNFe,
      destinations,
      keys: { keySoja, keyMilho },
      expectedBalances: {
        sojaRemaining: '0.0000',
        milhoRemaining: '0.0000',
        isBalanced: true,
      },
    };
  },

  /**
   * Cenário 3: Preparação Mista (N -> M)
   * 4 fornecedores distribuídos entre 3 destinos com sobras e alocações parciais.
   */
  createMixedScenario(options = {}) {
    const invoices = [
      generateNFeXml({
        supplierIndex: 0,
        nNF: '300001',
        itens: [
          { codigo: 'PROD-A1', quantidade: '100.0000', valorUnitario: '50.0000', valorTotal: '5000.00', frete: '200.00' },
          { codigo: 'PROD-A2', quantidade: '200.0000', valorUnitario: '30.0000', valorTotal: '6000.00', frete: '100.00' },
        ],
      }),
      generateNFeXml({
        supplierIndex: 1,
        nNF: '300002',
        itens: [
          { codigo: 'PROD-B1', quantidade: '300.0000', valorUnitario: '40.0000', valorTotal: '12000.00', frete: '300.00' },
          { codigo: 'PROD-B2', quantidade: '150.0000', valorUnitario: '60.0000', valorTotal: '9000.00', frete: '150.00' },
        ],
      }),
      generateNFeXml({
        supplierIndex: 5,
        nNF: '300003',
        itens: [
          { codigo: 'PROD-C1', quantidade: '500.0000', valorUnitario: '10.0000', valorTotal: '5000.00', frete: '100.00' },
        ],
      }),
      generateNFeXml({
        supplierIndex: 6,
        nNF: '300004',
        itens: [
          { codigo: 'PROD-D1', quantidade: '80.0000', valorUnitario: '120.0000', valorTotal: '9600.00', frete: '250.00' },
        ],
      }),
    ];

    // Mapeia todas as chaves compostas
    const sourceKeys = [];
    for (const inv of invoices) {
      for (const it of inv.items) {
        sourceKeys.push(`${inv.invoiceId}__nfe-${inv.chaveAcesso}-item-${it.nItem}`);
      }
    }

    const destinations = [
      {
        id: 'dest-mixed-1',
        numero: 'EXP-MIX-001',
        foreignClient: FOREIGN_CLIENTS_CATALOG[0],
        allocations: {
          [sourceKeys[0]]: '60.0000', // Parcial (sobra 40)
          [sourceKeys[1]]: '200.0000', // 100% alocado
          [sourceKeys[2]]: '150.0000', // Parcial
        },
      },
      {
        id: 'dest-mixed-2',
        numero: 'EXP-MIX-002',
        foreignClient: FOREIGN_CLIENTS_CATALOG[1],
        allocations: {
          [sourceKeys[2]]: '150.0000', // Completa sourceKeys[2] (150+150=300)
          [sourceKeys[3]]: '150.0000', // 100% alocado
        },
      },
      {
        id: 'dest-mixed-3',
        numero: 'EXP-MIX-003',
        foreignClient: FOREIGN_CLIENTS_CATALOG[2],
        allocations: {
          [sourceKeys[4]]: '250.0000', // Parcial (sobra 250)
          // sourceKeys[5] não alocado (0%)
        },
      },
    ];

    return {
      invoices,
      sourceKeys,
      destinations,
    };
  },

  /**
   * Cenário 4: Códigos de Produto Idênticos entre Fornecedores Distintos
   * 3 fornecedores com exatamente o mesmo código 'SOJA-01', verificando que não ocorre colisão nem agrupamento forçado.
   */
  createRepeatedCodesScenario(options = {}) {
    const invA = generateNFeXml({
      supplierIndex: 0, // SP
      nNF: '400101',
      itens: [
        {
          codigo: 'SOJA-01',
          descricao: 'Soja Grãos Tipo Exportação SP',
          ncm: '12019000',
          unidade: 'TON',
          quantidade: '100.0000',
          valorUnitario: '350.0000',
        },
      ],
    });

    const invB = generateNFeXml({
      supplierIndex: 1, // MT
      nNF: '400102',
      itens: [
        {
          codigo: 'SOJA-01',
          descricao: 'Soja Grãos Não-OGM MT',
          ncm: '12019000',
          unidade: 'TON',
          quantidade: '200.0000',
          valorUnitario: '360.0000',
        },
      ],
    });

    const invC = generateNFeXml({
      supplierIndex: 5, // PR
      nNF: '400103',
      itens: [
        {
          codigo: 'SOJA-01',
          descricao: 'Soja Grãos Floculada PR',
          ncm: '12019000',
          unidade: 'TON',
          quantidade: '150.0000',
          valorUnitario: '340.0000',
        },
      ],
    });

    const keyA = `${invA.invoiceId}__nfe-${invA.chaveAcesso}-item-1`;
    const keyB = `${invB.invoiceId}__nfe-${invB.chaveAcesso}-item-1`;
    const keyC = `${invC.invoiceId}__nfe-${invC.chaveAcesso}-item-1`;

    return {
      invoices: [invA, invB, invC],
      keys: { keyA, keyB, keyC },
    };
  },

  /**
   * Cenário 5: Armadilha de Unidades Incompatíveis (SC vs KG vs TON)
   * Mercadorias de mesma natureza mas com unidades físicas conflitantes sem conversão direta.
   */
  createIncompatibleUnitsScenario(options = {}) {
    const invSacks = generateNFeXml({
      supplierIndex: 6, // MG
      nNF: '500001',
      itens: [
        {
          codigo: 'CAF-SC',
          descricao: 'Café em Sacas',
          unidade: 'SC',
          quantidade: '500.0000',
          valorUnitario: '25.0000',
        },
      ],
    });

    const invKilos = generateNFeXml({
      supplierIndex: 0, // SP
      nNF: '500002',
      itens: [
        {
          codigo: 'CAF-KG',
          descricao: 'Café a Granel em Quilos',
          unidade: 'KG',
          quantidade: '30000.0000',
          valorUnitario: '0.4167',
        },
      ],
    });

    const invTons = generateNFeXml({
      supplierIndex: 1, // MT
      nNF: '500003',
      itens: [
        {
          codigo: 'CAF-TON',
          descricao: 'Café em Toneladas',
          unidade: 'TON',
          quantidade: '30.0000',
          valorUnitario: '416.7000',
        },
      ],
    });

    return {
      invSacks,
      invKilos,
      invTons,
    };
  },

  /**
   * Cenário 6: Lote de Estresse em Escala (50 XMLs com 200+ itens alocados em 5 destinos)
   */
  createScaleBatchScenario(options = {}) {
    const count = options.count || 50;
    const batch = [];

    for (let i = 0; i < count; i++) {
      const supplierIdx = i % SUPPLIERS_CATALOG.length;
      const nNF = String(900001 + i);
      const itemsCount = 4 + (i % 2); // Alterna 4 ou 5 itens por nota = 225 itens no total

      const items = [];
      const commodityKeys = Object.keys(COMMODITIES_CATALOG);

      for (let j = 0; j < itemsCount; j++) {
        const comm = COMMODITIES_CATALOG[commodityKeys[(i + j) % commodityKeys.length]];
        items.push({
          codigo: `${comm.codigo}-L${i}`,
          descricao: `${comm.xProd} Lote ${i + 1}`,
          ncm: comm.ncm,
          unidade: comm.uCom,
          quantidade: roundDecimal(String(100 + ((i * 7 + j * 13) % 200)), 4),
          valorUnitario: comm.vUnCom,
          frete: roundDecimal(String(10 + (j * 5)), 2),
          seguro: '2.50',
          outrasDespesas: '1.00',
          desconto: '0.00',
        });
      }

      const invoice = generateNFeXml({
        supplierIndex: supplierIdx,
        nNF,
        serie: '1',
        dhEmi: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T10:00:00-03:00`,
        itens: items,
      });

      batch.push({
        index: i,
        filename: `nfe_scale_${invoice.chaveAcesso}.xml`,
        invoice,
      });
    }

    return {
      count: batch.length,
      invoices: batch,
      totalItemsCount: batch.reduce((acc, curr) => acc + curr.invoice.items.length, 0),
    };
  },
};

const xmlFixtureGenerator = {
  UF_IBGE_TABLE,
  SUPPLIERS_CATALOG,
  FOREIGN_CLIENTS_CATALOG,
  COMMODITIES_CATALOG,
  calculateModulo11,
  generateAccessKey,
  formatAccessKey,
  buildXmlItem,
  generateNFeXml,
  generateNFeBatch,
  SCENARIOS,
};

export default xmlFixtureGenerator;
