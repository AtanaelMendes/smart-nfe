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

/**
 * Formata um valor decimal com escala informada e arredondamento fiscal Half-Up.
 * Alias para roundDecimal.
 * @param {string|number|null|undefined} val
 * @param {number} [scale=2]
 * @returns {string}
 */
export function formatDecimal(val, scale = 2) {
  return roundDecimal(val, scale);
}

/**
 * Verifica se o valor decimal é estritamente positivo (> 0).
 * @param {string|number|null|undefined} val
 * @returns {boolean}
 */
export function isDecimalPositive(val) {
  return decimalCompare(val, '0') > 0;
}

/**
 * Soma um vetor/array de valores decimais utilizando BigInt sem arredondamento intermediário.
 * @param {Array<string|number|null|undefined>} array - Lista de valores decimais
 * @param {number|null} [targetScale=2] - Escala de saída desejada (null = escala máxima observada)
 * @returns {string} Soma formatada
 */
export function decimalSum(array, targetScale = 2) {
  if (!Array.isArray(array) || array.length === 0) {
    if (targetScale === null || targetScale === undefined) return '0';
    return targetScale > 0 ? '0.' + '0'.repeat(targetScale) : '0';
  }

  const parsed = array.map((item) => parseDecimal(item));
  const maxScale = Math.max(0, ...parsed.map((p) => p.scale));

  let totalBigInt = 0n;
  for (const p of parsed) {
    if (p.intVal !== 0n) {
      const factor = 10n ** BigInt(maxScale - p.scale);
      totalBigInt += p.sign * p.intVal * factor;
    }
  }

  const sign = totalBigInt < 0n ? -1n : 1n;
  const absVal = totalBigInt < 0n ? -totalBigInt : totalBigInt;

  if (targetScale !== null && targetScale !== undefined && targetScale >= 0) {
    const rounded = roundSignedBigInt(sign, absVal, maxScale, targetScale);
    return formatBigInt(rounded.sign, rounded.absVal, rounded.scale);
  }

  return formatBigInt(sign, absVal, maxScale);
}

/**
 * Retorna o menor valor decimal entre os argumentos informados.
 * Aceita múltiplos argumentos ou um array único.
 * @param  {...any} args
 * @returns {string}
 */
export function decimalMin(...args) {
  const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  if (!list || list.length === 0) return '0';

  let minVal = list[0];
  for (let i = 1; i < list.length; i++) {
    if (decimalCompare(list[i], minVal) < 0) {
      minVal = list[i];
    }
  }
  return cleanDecimalString(minVal);
}

/**
 * Retorna o maior valor decimal entre os argumentos informados.
 * Aceita múltiplos argumentos ou um array único.
 * @param  {...any} args
 * @returns {string}
 */
export function decimalMax(...args) {
  const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  if (!list || list.length === 0) return '0';

  let maxVal = list[0];
  for (let i = 1; i < list.length; i++) {
    if (decimalCompare(list[i], maxVal) > 0) {
      maxVal = list[i];
    }
  }
  return cleanDecimalString(maxVal);
}

/**
 * Verifica se dois valores decimais são numericamente equivalentes (a === b).
 * @param {string|number|null|undefined} a
 * @param {string|number|null|undefined} b
 * @returns {boolean}
 */
export function decimalEquals(a, b) {
  return decimalCompare(a, b) === 0;
}

/**
 * Verifica se o primeiro valor decimal é estritamente maior que o segundo (a > b).
 * @param {string|number|null|undefined} a
 * @param {string|number|null|undefined} b
 * @returns {boolean}
 */
export function decimalGreaterThan(a, b) {
  return decimalCompare(a, b) > 0;
}

/**
 * Verifica se o primeiro valor decimal é maior ou igual ao segundo (a >= b).
 * @param {string|number|null|undefined} a
 * @param {string|number|null|undefined} b
 * @returns {boolean}
 */
export function decimalGreaterThanOrEqual(a, b) {
  return decimalCompare(a, b) >= 0;
}

/**
 * Verifica se o primeiro valor decimal é estritamente menor que o segundo (a < b).
 * @param {string|number|null|undefined} a
 * @param {string|number|null|undefined} b
 * @returns {boolean}
 */
export function decimalLessThan(a, b) {
  return decimalCompare(a, b) < 0;
}

/**
 * Verifica se o primeiro valor decimal é menor ou igual ao segundo (a <= b).
 * @param {string|number|null|undefined} a
 * @param {string|number|null|undefined} b
 * @returns {boolean}
 */
export function decimalLessThanOrEqual(a, b) {
  return decimalCompare(a, b) <= 0;
}

/**
 * Restringe o valor decimal ao intervalo [min, max].
 * @param {string|number} val
 * @param {string|number} min
 * @param {string|number} max
 * @returns {string}
 */
export function decimalClamp(val, min, max) {
  if (decimalCompare(val, min) < 0) return cleanDecimalString(min);
  if (decimalCompare(val, max) > 0) return cleanDecimalString(max);
  return cleanDecimalString(val);
}

/**
 * Calcula a média aritmética de um array de decimais.
 * @param {Array<string|number>} array
 * @param {number} [scale=2]
 * @returns {string}
 */
export function decimalAverage(array, scale = 2) {
  if (!Array.isArray(array) || array.length === 0) {
    return scale >= 0 ? '0.' + '0'.repeat(scale) : '0.00';
  }
  const sum = decimalSum(array);
  return decimalDivide(sum, String(array.length), scale);
}

/**
 * Divide uma quantidade ou valor em partes estritamente iguais entre N partes,
 * utilizando divisão inteira BigInt pura com alocação do resíduo (resto)
 * na última parte para garantir conservação exata (zero drift).
 * 
 * Exemplo: '10.0000' em 3 notas -> ['3.3333', '3.3333', '3.3334']
 * Exemplo: '1.0000' em 7 notas -> 6 x '0.1428', 1 x '0.1432'
 * 
 * @param {string|number} totalValue - Valor total a dividir
 * @param {number} numParts - Quantidade de partes (N >= 1)
 * @param {number} [scale=4] - Casas decimais de saída (padrão fiscal: 4)
 * @returns {Array<string>} Array com N strings com soma idêntica ao total de entrada
 */
export function decimalDistributeEqually(totalValue, numParts, scale = 4) {
  const n = parseInt(numParts, 10);
  if (isNaN(n) || n <= 0) return [];

  const p = parseDecimal(totalValue);
  const targetScale = Math.max(scale >= 0 ? scale : 4, p.scale);

  if (p.intVal === 0n || p.sign < 0n) {
    return Array.from({ length: n }, () => formatBigInt(1n, 0n, targetScale));
  }

  if (n === 1) {
    const factor = 10n ** BigInt(targetScale - p.scale);
    return [formatBigInt(p.sign, p.intVal * factor, targetScale)];
  }

  const scaledTotal = p.intVal * (10n ** BigInt(targetScale - p.scale));
  const bigN = BigInt(n);

  const baseInt = scaledTotal / bigN;
  const remInt = scaledTotal % bigN;

  const result = [];
  const baseFormatted = formatBigInt(1n, baseInt, targetScale);

  for (let i = 0; i < n - 1; i++) {
    result.push(baseFormatted);
  }

  const lastInt = baseInt + remInt;
  result.push(formatBigInt(1n, lastInt, targetScale));

  return result;
}

/**
 * Rateia um valor total proporcionalmente a um array de pesos (valores ou quantidades),
 * garantindo conservação exata de centavos ao absorver o resíduo no último elemento ativo.
 * 
 * @param {string|number} totalAmount - Valor total a ser rateado
 * @param {Array<string|number>} weights - Pesos de cada destino (ex: valor dos produtos)
 * @param {number} [scale=2] - Precisão decimal de saída (padrão monetário: 2)
 * @returns {Array<string>} Array de valores rateados com soma identicamente igual ao totalAmount
 */
export function decimalApportionProportional(totalAmount, weights = [], scale = 2) {
  if (!Array.isArray(weights) || weights.length === 0) return [];

  const targetScale = scale >= 0 ? scale : 2;
  const totalClean = roundDecimal(totalAmount || '0', targetScale);

  if (weights.length === 1) {
    return [totalClean];
  }

  const totalWeight = decimalSum(weights);

  // Caso patológico: soma dos pesos é zero ou negativa -> divide igualmente
  if (decimalCompare(totalWeight, '0') <= 0) {
    return decimalDistributeEqually(totalClean, weights.length, targetScale);
  }

  // Identifica o índice do último item ativo com peso > 0
  let lastActiveIdx = -1;
  for (let i = weights.length - 1; i >= 0; i--) {
    if (decimalCompare(weights[i], '0') > 0) {
      lastActiveIdx = i;
      break;
    }
  }

  if (lastActiveIdx === -1) {
    return decimalDistributeEqually(totalClean, weights.length, targetScale);
  }

  const result = new Array(weights.length).fill(formatBigInt(1n, 0n, targetScale));
  let allocatedSum = formatBigInt(1n, 0n, targetScale);

  for (let i = 0; i < weights.length; i++) {
    const w = cleanDecimalString(weights[i]);
    if (decimalCompare(w, '0') <= 0) {
      result[i] = formatBigInt(1n, 0n, targetScale);
      continue;
    }

    if (i !== lastActiveIdx) {
      // ratio = w / totalWeight com 8 casas decimais de precisão interna
      const ratio = decimalDivide(w, totalWeight, 8);
      const slice = decimalMultiply(totalClean, ratio, targetScale);
      result[i] = slice;
      allocatedSum = decimalAdd(allocatedSum, slice, targetScale);
    } else {
      // O último item ativo absorve o resíduo exato (totalClean - allocatedSum)
      result[i] = decimalSubtract(totalClean, allocatedSum, targetScale);
    }
  }

  return result;
}


