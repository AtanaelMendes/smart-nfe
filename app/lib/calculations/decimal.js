/**
 * Motor de Aritmética Decimal Pura — SmartNFe
 * 
 * Implementa operações aritméticas com strings decimais de precisão arbitrária
 * utilizando BigInt para eliminar completamente erros de ponto flutuante binário (IEEE 754).
 * Suporta escalas arbitrárias e regras de arredondamento fiscal ABNT NBR 5891 (Half-Up).
 */

/**
 * Higieniza entradas brutas (string, number, nulo) para formato numérico limpo.
 * Trata vírgulas brasileiras, símbolos de moeda (R$) e espaços.
 * @param {string|number|null|undefined} input
 * @returns {string} String limpa (ex: "-1234.56" ou "0")
 */
export function cleanDecimalString(input) {
  if (input === null || input === undefined || input === '') {
    return '0';
  }

  let s = String(input).trim().replace(/[R$\s]/g, '');
  if (!s) return '0';

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    if (s.indexOf('.') < s.indexOf(',')) {
      // Formato brasileiro: 1.234,56 -> 1234.56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato americano: 1,234.56 -> 1234.56
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Formato com vírgula decimal simples: 1250,50 -> 1250.50
    s = s.replace(',', '.');
  }

  let sign = '';
  if (s.startsWith('-')) {
    sign = '-';
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  // Remove quaisquer caracteres residuais que não sejam dígitos ou ponto
  s = s.replace(/[^\d.]/g, '');

  const parts = s.split('.');
  if (parts.length > 2) {
    // Preserva apenas o primeiro ponto decimal caso existam múltiplos
    s = parts[0] + '.' + parts.slice(1).join('');
  }

  if (!s || s === '.') return '0';
  return sign + s;
}

/**
 * Decompõe a string decimal em componentes BigInt com sinal e escala.
 * @param {string|number|null|undefined} val
 * @returns {{ sign: bigint, intVal: bigint, scale: number }}
 */
export function parseDecimal(val) {
  const s = cleanDecimalString(val);
  let sign = 1n;
  let numStr = s;

  if (s.startsWith('-')) {
    sign = -1n;
    numStr = s.slice(1);
  }

  const [iPart = '0', fPart = ''] = numStr.split('.');
  const cleanIPart = iPart.replace(/^0+(?=\d)/, '') || '0';
  const scale = fPart.length;
  const digits = cleanIPart + fPart;
  const intVal = BigInt(digits);

  // Zero nunca tem sinal negativo
  if (intVal === 0n) {
    sign = 1n;
  }

  return { sign, intVal, scale };
}

/**
 * Formata componentes BigInt em string decimal canônica.
 * @param {bigint} sign
 * @param {bigint} absVal
 * @param {number} scale
 * @returns {string}
 */
export function formatBigInt(sign, absVal, scale) {
  if (absVal === 0n) {
    return scale > 0 ? '0.' + '0'.repeat(scale) : '0';
  }

  let s = absVal.toString();
  const signPrefix = sign < 0n ? '-' : '';

  if (scale === 0) {
    return signPrefix + s;
  }

  if (s.length <= scale) {
    s = s.padStart(scale + 1, '0');
  }

  const intPart = s.slice(0, s.length - scale);
  const fracPart = s.slice(s.length - scale);
  return signPrefix + intPart + '.' + fracPart;
}

/**
 * Executa arredondamento Half-Up formal em componentes BigInt.
 * @param {bigint} sign
 * @param {bigint} absVal
 * @param {number} currentScale
 * @param {number} targetScale
 * @returns {{ sign: bigint, absVal: bigint, scale: number }}
 */
function roundSignedBigInt(sign, absVal, currentScale, targetScale) {
  if (absVal === 0n) {
    return { sign: 1n, absVal: 0n, scale: targetScale };
  }

  if (currentScale === targetScale) {
    return { sign, absVal, scale: targetScale };
  }

  if (currentScale < targetScale) {
    const factor = 10n ** BigInt(targetScale - currentScale);
    return { sign, absVal: absVal * factor, scale: targetScale };
  }

  // currentScale > targetScale
  const diff = BigInt(currentScale - targetScale);
  const divisor = 10n ** diff;
  const half = divisor / 2n;
  const rem = absVal % divisor;
  let quot = absVal / divisor;

  // Arredondamento Half-Up (>= 0.5 incrementa)
  if (rem >= half) {
    quot += 1n;
  }

  if (quot === 0n) {
    return { sign: 1n, absVal: 0n, scale: targetScale };
  }

  return { sign, absVal: quot, scale: targetScale };
}

/**
 * Soma duas strings decimais.
 * @param {string|number} a
 * @param {string|number} b
 * @param {number|null} [scale=null] - Escala de saída opcional
 * @returns {string}
 */
export function decimalAdd(a, b, scale = null) {
  const pA = parseDecimal(a);
  const pB = parseDecimal(b);
  const maxScale = Math.max(pA.scale, pB.scale);

  const sA = pA.sign * pA.intVal * (10n ** BigInt(maxScale - pA.scale));
  const sB = pB.sign * pB.intVal * (10n ** BigInt(maxScale - pB.scale));
  const sum = sA + sB;

  const sign = sum < 0n ? -1n : 1n;
  const absVal = sum < 0n ? -sum : sum;

  if (scale !== null && scale !== undefined) {
    const rounded = roundSignedBigInt(sign, absVal, maxScale, scale);
    return formatBigInt(rounded.sign, rounded.absVal, rounded.scale);
  }

  return formatBigInt(sign, absVal, maxScale);
}

/**
 * Subtrai a segunda string decimal da primeira (a - b).
 * @param {string|number} a
 * @param {string|number} b
 * @param {number|null} [scale=null] - Escala de saída opcional
 * @returns {string}
 */
export function decimalSubtract(a, b, scale = null) {
  const pA = parseDecimal(a);
  const pB = parseDecimal(b);
  const maxScale = Math.max(pA.scale, pB.scale);

  const sA = pA.sign * pA.intVal * (10n ** BigInt(maxScale - pA.scale));
  const sB = pB.sign * pB.intVal * (10n ** BigInt(maxScale - pB.scale));
  const diff = sA - sB;

  const sign = diff < 0n ? -1n : 1n;
  const absVal = diff < 0n ? -diff : diff;

  if (scale !== null && scale !== undefined) {
    const rounded = roundSignedBigInt(sign, absVal, maxScale, scale);
    return formatBigInt(rounded.sign, rounded.absVal, rounded.scale);
  }

  return formatBigInt(sign, absVal, maxScale);
}

/**
 * Multiplica duas strings decimais (a * b).
 * @param {string|number} a
 * @param {string|number} b
 * @param {number|null} [scale=null] - Escala de saída opcional
 * @returns {string}
 */
export function decimalMultiply(a, b, scale = null) {
  const pA = parseDecimal(a);
  const pB = parseDecimal(b);

  const prodSign = (pA.sign * pB.sign) < 0n ? -1n : 1n;
  const prodAbs = pA.intVal * pB.intVal;
  const prodScale = pA.scale + pB.scale;

  if (scale !== null && scale !== undefined) {
    const rounded = roundSignedBigInt(prodSign, prodAbs, prodScale, scale);
    return formatBigInt(rounded.sign, rounded.absVal, rounded.scale);
  }

  return formatBigInt(prodSign, prodAbs, prodScale);
}

/**
 * Divide a primeira string decimal pela segunda (a / b).
 * Trata divisão por zero graciosamente retornando zeros formatados na escala.
 * Utiliza o teste exato do resto (rem * 2n >= divisor) para Half-Up matemático.
 * @param {string|number} a
 * @param {string|number} b
 * @param {number} [scale=2] - Escala de saída desejada (default: 2)
 * @returns {string}
 */
export function decimalDivide(a, b, scale = 2) {
  const pA = parseDecimal(a);
  const pB = parseDecimal(b);

  const targetScale = scale >= 0 ? scale : 2;

  if (pB.intVal === 0n) {
    return targetScale > 0 ? '0.' + '0'.repeat(targetScale) : '0';
  }

  const dividend = pA.intVal * (10n ** BigInt(pB.scale + targetScale));
  const divisor = pB.intVal * (10n ** BigInt(pA.scale));

  let quot = dividend / divisor;
  const rem = dividend % divisor;

  if (rem * 2n >= divisor) {
    quot += 1n;
  }

  const divSign = (pA.sign * pB.sign) < 0n && quot !== 0n ? -1n : 1n;
  return formatBigInt(divSign, quot, targetScale);
}

/**
 * Arredonda uma string decimal para a escala informada seguindo regra Half-Up.
 * @param {string|number} val
 * @param {number} [scale=2]
 * @returns {string}
 */
export function roundDecimal(val, scale = 2) {
  const p = parseDecimal(val);
  const targetScale = scale >= 0 ? scale : 2;
  const rounded = roundSignedBigInt(p.sign, p.intVal, p.scale, targetScale);
  return formatBigInt(rounded.sign, rounded.absVal, rounded.scale);
}

/**
 * Compara dois valores decimais.
 * @param {string|number} a
 * @param {string|number} b
 * @returns {number} -1 se a < b, 0 se a === b, 1 se a > b
 */
export function decimalCompare(a, b) {
  const pA = parseDecimal(a);
  const pB = parseDecimal(b);
  const maxScale = Math.max(pA.scale, pB.scale);

  const sA = pA.sign * pA.intVal * (10n ** BigInt(maxScale - pA.scale));
  const sB = pB.sign * pB.intVal * (10n ** BigInt(maxScale - pB.scale));

  if (sA < sB) return -1;
  if (sA > sB) return 1;
  return 0;
}

/**
 * Verifica se o valor decimal é numericamente igual a zero.
 * @param {string|number|null|undefined} val
 * @returns {boolean}
 */
export function isDecimalZero(val) {
  return decimalCompare(val, '0') === 0;
}

/**
 * Verifica se o valor decimal é estritamente negativo.
 * @param {string|number|null|undefined} val
 * @returns {boolean}
 */
export function isDecimalNegative(val) {
  return decimalCompare(val, '0') < 0;
}

/**
 * Retorna o valor absoluto de uma string decimal.
 * @param {string|number|null|undefined} val
 * @returns {string}
 */
export function decimalAbs(val) {
  const p = parseDecimal(val);
  return formatBigInt(1n, p.intVal, p.scale);
}

/**
 * Normaliza e padroniza uma entrada em string decimal com escala garantida.
 * @param {string|number|null|undefined} val
 * @param {number} [scale=2]
 * @returns {string}
 */
export function normalizeDecimal(val, scale = 2) {
  return roundDecimal(val, scale);
}
