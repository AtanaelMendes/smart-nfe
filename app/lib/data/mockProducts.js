/**
 * Baseline do Catálogo de Produtos — SmartNFe
 *
 * Contempla produtos industriais, agrícolas e manufaturados com NCM, CEST e unidades comerciais.
 */

export const MOCK_PRODUCTS = [
  {
    id: 'prod-01',
    codigo: 'MOT-IND-001',
    descricao: 'Motor Básico 6.10T Industrial 4 Cilindros',
    ncm: '84089090',
    cfopPadrao: '5101',
    unidadeComercial: 'PC',
    unidadeTributavel: 'PC',
    precoPadrao: '42056.88',
    cest: '0100100',
    gtin: 'SEM GTIN',
    origemMercadoria: '0', // Nacional
  },
  {
    id: 'prod-02',
    codigo: 'MOT-IND-002',
    descricao: 'Motor 6.12TCA 216,2kW Industrial',
    ncm: '84089090',
    cfopPadrao: '5101',
    unidadeComercial: 'PC',
    unidadeTributavel: 'PC',
    precoPadrao: '55469.08',
    cest: '0100100',
    gtin: 'SEM GTIN',
    origemMercadoria: '0',
  },
  {
    id: 'prod-03',
    codigo: 'EXP-CAF-001',
    descricao: 'Café em Grão Cru Arábica Tipo 6 Especial',
    ncm: '09011110',
    cfopPadrao: '7101',
    unidadeComercial: 'SC',
    unidadeTributavel: 'KG',
    precoPadrao: '25.50',
    gtin: '7891234567890',
    origemMercadoria: '0',
  },
  {
    id: 'prod-04',
    codigo: 'EXP-SOJ-002',
    descricao: 'Soja em Grãos Não Transgênica Export',
    ncm: '12019000',
    cfopPadrao: '7101',
    unidadeComercial: 'TON',
    unidadeTributavel: 'TON',
    precoPadrao: '350.00',
    gtin: 'SEM GTIN',
    origemMercadoria: '0',
  },
  {
    id: 'prod-05',
    codigo: 'CMP-RAD-005',
    descricao: 'Radiador de Alumínio Reforçado para Motor Pesado',
    ncm: '87089100',
    cfopPadrao: '5405',
    unidadeComercial: 'UN',
    unidadeTributavel: 'UN',
    precoPadrao: '3450.00',
    cest: '0100200',
    gtin: '7898765432109',
    origemMercadoria: '0',
  },
  {
    id: 'prod-06',
    codigo: 'PEC-FIL-006',
    descricao: 'Elemento Filtrante Óleo Lubrificante Alta Pressão',
    ncm: '84212300',
    cfopPadrao: '5405',
    unidadeComercial: 'UN',
    unidadeTributavel: 'UN',
    precoPadrao: '185.50',
    cest: '0100300',
    gtin: '7895554443322',
    origemMercadoria: '0',
  },
];

export function getMockProducts() {
  return JSON.parse(JSON.stringify(MOCK_PRODUCTS));
}
