/**
 * SmartNFe — Validador Estrutural e Algorítmico da Chave de Acesso da NF-e Modelo 55
 *
 * Características:
 * - Validação estrita de 44 dígitos numéricos
 * - Decomposição estrutural (UF, AAMM, CNPJ, modelo 55, série, número, tpEmis, cNF, cDV)
 * - Validação do código IBGE da UF e do mês de emissão (01-12)
 * - Verificação exclusiva de conformidade com NF-e modelo 55
 * - Cálculo rigoroso do Dígito Verificador pelo Módulo 11 (pesos de 2 a 9 da direita para a esquerda)
 * - Regra SEFAZ: resto 0 ou 1 -> DV = 0; caso contrário -> DV = 11 - resto
 */

// Tabela oficial de códigos IBGE das Unidades Federativas do Brasil
export const UF_IBGE_CODES = {
  '11': 'RO',
  '12': 'AC',
  '13': 'AM',
  '14': 'RR',
  '15': 'PA',
  '16': 'AP',
  '17': 'TO',
  '21': 'MA',
  '22': 'PI',
  '23': 'CE',
  '24': 'RN',
  '25': 'PB',
  '26': 'PE',
  '27': 'AL',
  '28': 'SE',
  '29': 'BA',
  '31': 'MG',
  '32': 'ES',
  '33': 'RJ',
  '35': 'SP',
  '41': 'PR',
  '42': 'SC',
  '43': 'RS',
  '50': 'MS',
  '51': 'MT',
  '52': 'GO',
  '53': 'DF',
};

// Sequência cíclica de pesos do Módulo 11 (SEFAZ MOC Anexo I)
const WEIGHTS_MODULO_11 = [2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Calcula o Dígito Verificador (DV) de uma chave de acesso pelos primeiros 43 dígitos
 * utilizando o algoritmo oficial do Módulo 11 da SEFAZ.
 *
 * @param {string} accessKey43 String contendo os 43 primeiros dígitos da chave (ou chave completa)
 * @returns {number|null} Dígito verificador calculado (0 a 9) ou null se formato inválido
 */
export function calculateAccessKeyDV(accessKey43) {
  if (!accessKey43 || typeof accessKey43 !== 'string') {
    return null;
  }

  // Remove prefixo 'NFe', espaços, pontos e traços
  const clean = accessKey43.replace(/^NFe/i, '').replace(/[\s.-]/g, '');
  const body43 = clean.length >= 43 ? clean.slice(0, 43) : clean;

  if (!/^\d{43}$/.test(body43)) {
    return null;
  }

  let sum = 0;
  for (let i = 42; i >= 0; i--) {
    const digit = Number(body43.charAt(i));
    const weight = WEIGHTS_MODULO_11[(42 - i) % WEIGHTS_MODULO_11.length];
    sum += digit * weight;
  }

  const remainder = sum % 11;
  return (remainder === 0 || remainder === 1) ? 0 : (11 - remainder);
}

/**
 * Valida integralmente a estrutura e o dígito verificador da chave de acesso de 44 dígitos da NF-e.
 *
 * @param {string} accessKey Chave de acesso com ou sem formatação / prefixo 'NFe'
 * @returns {{
 *   isValid: boolean,
 *   error?: string,
 *   details?: {
 *     chaveCompleta: string,
 *     uf: string,
 *     ufSigla: string,
 *     anoMes: string,
 *     ano: string,
 *     mes: string,
 *     cnpjEmitente: string,
 *     modelo: string,
 *     serie: string,
 *     numeroNF: string,
 *     tipoEmissao: string,
 *     codigoAleatorio: string,
 *     dv: number,
 *     recordedDV?: number,
 *     calculatedDV?: number
 *   }
 * }}
 */
export function validateAccessKey(accessKey) {
  if (!accessKey || typeof accessKey !== 'string') {
    return {
      isValid: false,
      error: 'Chave de acesso não informada ou tipo inválido.',
    };
  }

  // 1. Limpeza de formatação e prefixo NFe
  const cleanKey = accessKey.trim().replace(/^NFe/i, '').replace(/[\s.-]/g, '');

  // 2. Validação de comprimento exato
  if (cleanKey.length !== 44) {
    return {
      isValid: false,
      error: `Chave de acesso deve conter exatamente 44 dígitos numéricos (encontrado: ${cleanKey.length}).`,
    };
  }

  // 3. Validação de caracteres exclusivamente numéricos
  if (!/^\d{44}$/.test(cleanKey)) {
    return {
      isValid: false,
      error: 'Chave de acesso contém caracteres não numéricos inválidos.',
    };
  }

  // 4. Validação da UF (Posições 01-02: Código IBGE)
  const uf = cleanKey.slice(0, 2);
  const ufSigla = UF_IBGE_CODES[uf];
  if (!ufSigla) {
    return {
      isValid: false,
      error: `Código de UF inválido na chave de acesso: "${uf}". Código IBGE não reconhecido.`,
    };
  }

  // 5. Validação do Mês de emissão (Posições 05-06: AAMM)
  const mesStr = cleanKey.slice(4, 6);
  const mes = parseInt(mesStr, 10);
  if (mes < 1 || mes > 12) {
    return {
      isValid: false,
      error: `Mês de emissão inválido na chave: "${mesStr}". Esperado valor entre 01 e 12.`,
    };
  }

  // 6. Validação do Modelo Fiscal (Posições 21-22: Estritamente 55)
  const modelo = cleanKey.slice(20, 22);
  if (modelo !== '55') {
    return {
      isValid: false,
      error: `Modelo fiscal inválido na chave: "${modelo}". O SmartNFe processa exclusivamente NF-e modelo 55.`,
    };
  }

  // 7. Validação do Tipo de Emissão (Posição 35: tpEmis 1 a 7)
  const tpEmis = cleanKey.slice(34, 35);
  if (!['1', '2', '3', '4', '5', '6', '7'].includes(tpEmis)) {
    return {
      isValid: false,
      error: `Tipo de emissão inválido na chave: "${tpEmis}".`,
    };
  }

  // 8. Cálculo e Verificação do Dígito Verificador (Posição 44)
  const recordedDV = parseInt(cleanKey.charAt(43), 10);
  const calculatedDV = calculateAccessKeyDV(cleanKey.slice(0, 43));

  if (recordedDV !== calculatedDV) {
    return {
      isValid: false,
      error: `Dígito verificador da chave de acesso inválido: encontrado ${recordedDV}, mas o cálculo oficial (Módulo 11) resultou em ${calculatedDV}.`,
      details: {
        recordedDV,
        calculatedDV,
      },
    };
  }

  // 9. Decomposição estrutural completa
  return {
    isValid: true,
    details: {
      chaveCompleta: cleanKey,
      uf,
      ufSigla,
      anoMes: cleanKey.slice(2, 6),
      ano: `20${cleanKey.slice(2, 4)}`,
      mes: mesStr,
      cnpjEmitente: cleanKey.slice(6, 20),
      modelo,
      serie: cleanKey.slice(22, 25),
      numeroNF: cleanKey.slice(25, 34),
      tipoEmissao: tpEmis,
      codigoAleatorio: cleanKey.slice(35, 43),
      dv: calculatedDV,
    },
  };
}

/**
 * Formata a chave de acesso em 11 grupos de 4 dígitos para exibição visual.
 * Exemplo: "3524 1112 3456 7800 0190 5500 1000 1458 9210 0123 4562"
 *
 * @param {string} accessKey
 * @returns {string}
 */
export function formatAccessKey(accessKey) {
  if (!accessKey || typeof accessKey !== 'string') return '';
  const clean = accessKey.replace(/^NFe/i, '').replace(/\D/g, '');
  if (clean.length !== 44) return accessKey;
  return clean.replace(/(\d{4})/g, '$1 ').trim();
}
