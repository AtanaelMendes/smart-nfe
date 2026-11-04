/**
 * Motor de Agregação de Totais Fiscais de NF-e — SmartNFe
 * 
 * Calcula totais de itens e consolida valores da nota fiscal (produtos, frete,
 * seguro, despesas, descontos e total da NF-e) com precisão decimal exata.
 */

import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  roundDecimal,
} from './decimal.js';

/**
 * Calcula o valor total do item da NF-e (preço unitário * quantidade).
 * Retorna string decimal com 2 casas decimais.
 * 
 * @param {string|number|null|undefined} unitPriceStr
 * @param {string|number|null|undefined} quantityStr
 * @returns {string} Ex: "12750.00"
 */
export function calculateItemTotal(unitPriceStr, quantityStr) {
  if (
    unitPriceStr === null ||
    unitPriceStr === undefined ||
    quantityStr === null ||
    quantityStr === undefined
  ) {
    return '0.00';
  }

  return decimalMultiply(unitPriceStr, quantityStr, 2);
}

/**
 * Consolida e calcula os totais gerais da nota fiscal.
 * Suporta assinatura posicional ou via objeto de opções.
 * 
 * Assinatura 1 (Posicional):
 *   calculateInvoiceTotals(items, discountStr, freightStr, insuranceStr, otherExpensesStr)
 * Assinatura 2 (Objeto):
 *   calculateInvoiceTotals(items, { discount, freight, insurance, otherExpenses })
 * 
 * @param {Array<object>} items - Array de itens da nota fiscal
 * @param {string|number|object} [discountOrOptions='0.00']
 * @param {string|number} [freightStr='0.00']
 * @param {string|number} [insuranceStr='0.00']
 * @param {string|number} [otherExpensesStr='0.00']
 * @returns {{
 *   totalProducts: string,
 *   totalDiscount: string,
 *   totalFreight: string,
 *   totalInsurance: string,
 *   totalOtherExpenses: string,
 *   totalInvoice: string,
 *   valorProdutos: string,
 *   valorDesconto: string,
 *   valorFrete: string,
 *   valorSeguro: string,
 *   outrasDespesas: string,
 *   valorTotalNota: string
 * }}
 */
export function calculateInvoiceTotals(
  items,
  discountOrOptions = '0.00',
  freightStr = '0.00',
  insuranceStr = '0.00',
  otherExpensesStr = '0.00'
) {
  let discountVal = '0.00';
  let freightVal = '0.00';
  let insuranceVal = '0.00';
  let otherExpensesVal = '0.00';

  if (typeof discountOrOptions === 'object' && discountOrOptions !== null) {
    discountVal = discountOrOptions.discount ?? discountOrOptions.valorDesconto ?? '0.00';
    freightVal = discountOrOptions.freight ?? discountOrOptions.valorFrete ?? '0.00';
    insuranceVal = discountOrOptions.insurance ?? discountOrOptions.valorSeguro ?? '0.00';
    otherExpensesVal = discountOrOptions.otherExpenses ?? discountOrOptions.outrasDespesas ?? '0.00';
  } else {
    discountVal = discountOrOptions || '0.00';
    freightVal = freightStr || '0.00';
    insuranceVal = insuranceStr || '0.00';
    otherExpensesVal = otherExpensesStr || '0.00';
  }

  // Soma de produtos
  const safeItems = Array.isArray(items) ? items : [];
  let totalProducts = '0.00';

  for (const item of safeItems) {
    if (!item) continue;
    // Se o item já tiver valorTotal pré-calculado e não houver indicação de recalcular,
    // verifica se deve usar ou calcular via unitPrice * qty
    const itemTotal = item.valorTotal ?? item.total ?? calculateItemTotal(
      item.valorUnitario ?? item.unitPrice,
      item.quantidade ?? item.quantity
    );
    totalProducts = decimalAdd(totalProducts, itemTotal, 2);
  }

  const totalDiscount = roundDecimal(discountVal, 2);
  const totalFreight = roundDecimal(freightVal, 2);
  const totalInsurance = roundDecimal(insuranceVal, 2);
  const totalOtherExpenses = roundDecimal(otherExpensesVal, 2);

  // Fórmula SEFAZ: Total NF = Produtos - Desconto + Frete + Seguro + Outras Despesas
  const afterDiscount = decimalSubtract(totalProducts, totalDiscount, 2);
  const withFreight = decimalAdd(afterDiscount, totalFreight, 2);
  const withInsurance = decimalAdd(withFreight, totalInsurance, 2);
  const totalInvoice = decimalAdd(withInsurance, totalOtherExpenses, 2);

  return {
    totalProducts,
    totalDiscount,
    totalFreight,
    totalInsurance,
    totalOtherExpenses,
    totalInvoice,
    // Aliases em português para interoperabilidade
    valorProdutos: totalProducts,
    valorDesconto: totalDiscount,
    valorFrete: totalFreight,
    valorSeguro: totalInsurance,
    outrasDespesas: totalOtherExpenses,
    valorTotalNota: totalInvoice,
  };
}
