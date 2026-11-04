/**
 * Central de Formatação Monetária (BRL) — SmartNFe
 * Formata valores numéricos e strings decimais para o padrão monetário brasileiro.
 */

/**
 * Formata um valor numérico ou string decimal para moeda brasileira (BRL).
 * @param {string|number|null|undefined} value - Valor bruto a formatar (ex: "284500.00" ou 284500)
 * @returns {string} String formatada (ex: "R$ 284.500,00")
 */
export function formatBRL(value) {
  if (value === null || value === undefined || value === '') {
    return 'R$ 0,00';
  }

  let num;
  if (typeof value === 'number') {
    num = value;
  } else {
    // Normaliza separador decimal e remove espaços
    const sanitized = String(value).trim().replace(',', '.');
    num = parseFloat(sanitized);
  }

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Converte valor formatado em reais (ex: "R$ 1.250,50" ou "1.250,50") para número de ponto flutuante.
 * @param {string|number} strVal
 * @returns {number} Valor numérico (ex: 1250.5)
 */
export function parseBRL(strVal) {
  if (strVal === null || strVal === undefined || strVal === '') {
    return 0;
  }

  if (typeof strVal === 'number') {
    return Number.isFinite(strVal) ? strVal : 0;
  }

  const cleaned = String(strVal)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? 0 : parsed;
}

/**
 * Formata número decimal sem o símbolo R$ (ex: "1.234,56").
 * @param {string|number} value
 * @param {number} decimals
 * @returns {string}
 */
export function formatNumberBRL(value, decimals = 2) {
  if (value === null || value === undefined || value === '') {
    return '0,00';
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return '0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
