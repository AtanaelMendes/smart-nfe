/**
 * Central de Formatação Numérica e Quantidades Fiscais — SmartNFe
 * Padrão brasileiro de pontuação (milhar com ponto, decimal com vírgula).
 */

/**
 * Converte com segurança entradas numéricas ou textuais (pt-BR ou decimal padrão) para float.
 * @param {string|number|null|undefined} value
 * @returns {number}
 */
export function parseDecimal(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  let cleaned = String(value).trim();
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // Formato BR: "1.250,50" -> remove ponto, substitui vírgula
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato US: "1,250.50" -> remove vírgula
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(',', '.');
  } else if (hasDot) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? 0 : parsed;
}

/**
 * Formata quantidade fiscal (com até maxDecimals casas decimais, padrão 4).
 * Suporta inteiros sem decimais forçados ou com minDecimals configurável.
 * Ex: formatQuantity(500) -> "500"
 * Ex: formatQuantity("500.1234", 4) -> "500,1234"
 * Ex: formatQuantity("0.0010", 4) -> "0,001"
 * @param {string|number|null|undefined} value
 * @param {number} [maxDecimals=4]
 * @param {number} [minDecimals=0]
 * @returns {string}
 */
export function formatQuantity(value, maxDecimals = 4, minDecimals = 0) {
  if (value === null || value === undefined || value === '') {
    return minDecimals > 0 ? `0,${'0'.repeat(minDecimals)}` : '0';
  }

  const num = parseDecimal(value);
  if (num === 0 && (value === 0 || value === '0' || value === '0.00' || value === '0,00')) {
    return minDecimals > 0 ? `0,${'0'.repeat(minDecimals)}` : '0';
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Math.max(0, minDecimals),
    maximumFractionDigits: Math.max(0, maxDecimals),
  }).format(num);
}

/**
 * Formata número decimal genérico com número fixo de casas decimais (padrão 2).
 * Ex: formatDecimal(1250.5, 2) -> "1.250,50"
 * Ex: formatDecimal("1250.555", 2) -> "1.250,56"
 * @param {string|number|null|undefined} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatDecimal(value, decimals = 2) {
  if (value === null || value === undefined || value === '') {
    return decimals > 0 ? `0,${'0'.repeat(decimals)}` : '0';
  }

  const num = parseDecimal(value);

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
