/**
 * Baseline de Dados Mockados de Demonstração — SmartNFe (Fase 1)
 * Cenários fictícios de exportação (demo-01 a demo-05) explicitamente identificados como demonstração.
 */

export const MOCK_INVOICES = [
  // -------------------------------------------------------------------------
  // CENÁRIO 1: demo-01 — XML Completo Padrão (8 itens)
  // -------------------------------------------------------------------------
  {
    id: 'demo-01',
    numero: '000.145.892',
    serie: '1',
    chaveAcesso: '35241112345678000190550010001458921001234567',
    tipoDocumento: 'XML',
    naturezaOperacao: 'EXPORTAÇÃO DE MERCADORIAS',
    emissao: '2026-10-15',
    dataEmissao: '2026-10-15T10:30:00Z',
    status: 'em_conferencia',
    isDemo: true,
    emitente: {
      cnpj: '12.345.678/0001-90',
      razaoSocial: 'Agroexport Brasil S.A.',
      uf: 'SP',
      municipio: 'Santos',
    },
    destinatario: {
      nome: 'Global Trading Logistics B.V.',
      pais: 'Holanda',
      paisCodigo: 'NL',
      idEstrangeiro: 'NL884920192B01',
    },
    itens: [
      { id: 'd1-1', item: 1, codigo: 'EXP-CAF-001', descricao: 'Café em Grão Cru Arábica Tipo 6', ncm: '09011110', cfop: '7101', unidade: 'SC', quantidade: '500.0000', valorUnitario: '25.5000', valorTotal: '12750.00', situacao: 'conferido', modificado: false },
      { id: 'd1-2', item: 2, codigo: 'EXP-SOJ-002', descricao: 'Soja em Grãos Não Transgênica', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '120.0000', valorUnitario: '350.0000', valorTotal: '42000.00', situacao: 'conferido', modificado: false },
      { id: 'd1-3', item: 3, codigo: 'EXP-ACU-003', descricao: 'Açúcar Cristal Branco Refinado Tipo Icumsa 45', ncm: '17019900', cfop: '7101', unidade: 'TON', quantidade: '80.0000', valorUnitario: '420.0000', valorTotal: '33600.00', situacao: 'conferido', modificado: false },
      { id: 'd1-4', item: 4, codigo: 'EXP-SUC-004', descricao: 'Suco de Laranja Concentrado Congelado FCOJ 66 Brix', ncm: '20091100', cfop: '7101', unidade: 'TON', quantidade: '25.0000', valorUnitario: '1800.0000', valorTotal: '45000.00', situacao: 'pendente', modificado: false },
      { id: 'd1-5', item: 5, codigo: 'EXP-CEL-005', descricao: 'Polpa de Celulose Branqueada de Eucalipto', ncm: '47032900', cfop: '7101', unidade: 'TON', quantidade: '150.0000', valorUnitario: '480.0000', valorTotal: '72000.00', situacao: 'pendente', modificado: false },
      { id: 'd1-6', item: 6, codigo: 'EXP-BOV-006', descricao: 'Cortes Congelados de Carne Bovina Desossada', ncm: '02023000', cfop: '7101', unidade: 'KG', quantidade: '3500.0000', valorUnitario: '12.5000', valorTotal: '43750.00', situacao: 'pendente', modificado: false },
      { id: 'd1-7', item: 7, codigo: 'EXP-CAS-007', descricao: 'Castanha de Caju Torrada e Salgada W1-240', ncm: '08013200', cfop: '7101', unidade: 'KG', quantidade: '800.0000', valorUnitario: '18.5000', valorTotal: '14800.00', situacao: 'pendente', modificado: false },
      { id: 'd1-8', item: 8, codigo: 'EXP-OLE-008', descricao: 'Óleo Bruto de Soja Degomado para Refino', ncm: '15071000', cfop: '7101', unidade: 'TON', quantidade: '30.0000', valorUnitario: '686.6667', valorTotal: '20600.00', situacao: 'pendente', modificado: false },
    ],
    totais: {
      valorProdutos: '284500.00',
      valorFrete: '5000.00',
      valorSeguro: '1200.00',
      valorDesconto: '0.00',
      outrasDespesas: '500.00',
      valorTotalNota: '291200.00',
      pesoLiquido: '45000.000',
      pesoBruto: '46200.000',
    },
  },

  // -------------------------------------------------------------------------
  // CENÁRIO 2: demo-02 — PDF Exportação (25 itens metalmecânicos)
  // -------------------------------------------------------------------------
  {
    id: 'demo-02',
    numero: '000.089.410',
    serie: '2',
    chaveAcesso: '41241198765432000155550020000894101007654321',
    tipoDocumento: 'PDF',
    naturezaOperacao: 'EXPORTAÇÃO DE MANUFATURADOS',
    emissao: '2026-10-18',
    dataEmissao: '2026-10-18T14:15:00Z',
    status: 'importado',
    isDemo: true,
    emitente: {
      cnpj: '98.765.432/0001-55',
      razaoSocial: 'Metalúrgica Sul Americana Ltda',
      uf: 'SC',
      municipio: 'Joinville',
    },
    destinatario: {
      nome: 'Industrial Supply Corp.',
      pais: 'Estados Unidos',
      paisCodigo: 'US',
      idEstrangeiro: 'US-TX-9874125',
    },
    itens: Array.from({ length: 25 }, (_, idx) => {
      const num = idx + 1;
      const price = 5950 + (num - 13) * 50;
      const unit = price.toFixed(4);
      const total = price.toFixed(2);
      return {
        id: `d2-${num}`,
        item: num,
        codigo: `MET-PECA-${String(num).padStart(3, '0')}`,
        descricao: `Componente Industrial Usinado Classe ${num} em Inox 316`,
        ncm: '84818099',
        cfop: '7101',
        unidade: 'UN',
        quantidade: '1.0000',
        valorUnitario: unit,
        valorTotal: total,
        situacao: 'pendente',
        modificado: false,
      };
    }),
    totais: {
      valorProdutos: '148750.00',
      valorFrete: '0.00',
      valorSeguro: '0.00',
      valorDesconto: '0.00',
      outrasDespesas: '0.00',
      valorTotalNota: '148750.00',
      pesoLiquido: '1250.000',
      pesoBruto: '1380.000',
    },
  },

  // -------------------------------------------------------------------------
  // CENÁRIO 3: demo-03 — Stress Test Grande (50 itens de autopeças)
  // -------------------------------------------------------------------------
  {
    id: 'demo-03',
    numero: '000.320.100',
    serie: '1',
    chaveAcesso: '43241155544433000188550010003201001009988776',
    tipoDocumento: 'XML',
    naturezaOperacao: 'REMESSA DE COMPONENTES AUTOMOTIVOS PARA EXPORTAÇÃO',
    emissao: '2026-10-20',
    dataEmissao: '2026-10-20T08:45:00Z',
    status: 'conferido',
    isDemo: true,
    emitente: {
      cnpj: '55.544.433/0001-88',
      razaoSocial: 'Eletroparts do Brasil Componentes S.A.',
      uf: 'RS',
      municipio: 'Porto Alegre',
    },
    destinatario: {
      nome: 'Auto Assembly Europe GmbH',
      pais: 'Alemanha',
      paisCodigo: 'DE',
      idEstrangeiro: 'DE814523990',
    },
    itens: Array.from({ length: 50 }, (_, idx) => {
      const num = idx + 1;
      const unit = (125.16).toFixed(4);
      const qtd = '100.0000';
      const total = '12516.00';
      return {
        id: `d3-${num}`,
        item: num,
        codigo: `AUT-ELE-${String(num).padStart(3, '0')}`,
        descricao: `Chicote Elétrico Automotivo Mod. Turbo Série ${num}`,
        ncm: '85443000',
        cfop: '7101',
        unidade: 'PC',
        quantidade: qtd,
        valorUnitario: unit,
        valorTotal: total,
        situacao: 'conferido',
        modificado: false,
      };
    }),
    totais: {
      valorProdutos: '625800.00',
      valorFrete: '0.00',
      valorSeguro: '0.00',
      valorDesconto: '0.00',
      outrasDespesas: '0.00',
      valorTotalNota: '625800.00',
      pesoLiquido: '8400.000',
      pesoBruto: '8900.000',
    },
  },

  // -------------------------------------------------------------------------
  // CENÁRIO 4: demo-04 — Inconsistências Fiscais Simuladas (12 itens)
  // -------------------------------------------------------------------------
  {
    id: 'demo-04',
    numero: '000.012.789',
    serie: '1',
    chaveAcesso: '31241111122233000144550010000127891004433221',
    tipoDocumento: 'XML',
    naturezaOperacao: 'EXPORTACAO DE CALCADOS DE COURO',
    emissao: '2026-10-22',
    dataEmissao: '2026-10-22T16:00:00Z',
    status: 'com_inconsistencias',
    isDemo: true,
    emitente: {
      cnpj: '11.122.233/0001-44',
      razaoSocial: 'Calçados Vale do Rio Doce Ltda',
      uf: 'SP',
      municipio: 'Franca',
    },
    destinatario: {
      nome: 'Fashion Footwear Group S.L.',
      pais: 'Espanha',
      paisCodigo: 'ES',
      idEstrangeiro: 'ESB98765432',
    },
    itens: [
      { id: 'd4-1', item: 1, codigo: 'CALC-001', descricao: 'Sapato Social Oxford Couro Legítimo', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '100.0000', valorUnitario: '85.0000', valorTotal: '8500.00', situacao: 'conferido', modificado: false },
      { id: 'd4-2', item: 2, codigo: 'CALC-002', descricao: 'Mocassim Masculino Confort Café', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '120.0000', valorUnitario: '75.0000', valorTotal: '9000.00', situacao: 'conferido', modificado: false },
      // Inconsistência 1: CFOP 5102 (venda interna) em nota de exportação
      { id: 'd4-3', item: 3, codigo: 'CALC-003', descricao: 'Bota Cano Curto Feminina Couro', ncm: '64035910', cfop: '5102', unidade: 'PAR', quantidade: '80.0000', valorUnitario: '95.0000', valorTotal: '7600.00', situacao: 'inconsistente', modificado: false, inconsistencias: [{ tipo: 'erro', campo: 'cfop', mensagem: 'CFOP 5102 não permitido em operação para o exterior. CFOP deve iniciar com 7 (ex: 7101).', esperado: '7101', encontrado: '5102' }] },
      { id: 'd4-4', item: 4, codigo: 'CALC-004', descricao: 'Sandália Rasteira em Couro Nobuck', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '150.0000', valorUnitario: '40.0000', valorTotal: '6000.00', situacao: 'conferido', modificado: false },
      // Inconsistência 2: Divergência matemática (100 * 45 = 4500, gravado 4000)
      { id: 'd4-5', item: 5, codigo: 'CALC-005', descricao: 'Sapatilha Casual Couro Natural', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '100.0000', valorUnitario: '45.0000', valorTotal: '4000.00', situacao: 'inconsistente', modificado: false, inconsistencias: [{ tipo: 'erro', campo: 'valorTotal', mensagem: 'Divergência matemática: 100 x 45,00 resulta em 4.500,00, mas valor total gravado é 4.000,00.', esperado: '4500.00', encontrado: '4000.00' }] },
      { id: 'd4-6', item: 6, codigo: 'CALC-006', descricao: 'Tênis Casual em Couro Floater', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '90.0000', valorUnitario: '90.0000', valorTotal: '8100.00', situacao: 'conferido', modificado: false },
      { id: 'd4-7', item: 7, codigo: 'CALC-007', descricao: 'Scarpin Salto Médio Fino', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '110.0000', valorUnitario: '70.0000', valorTotal: '7700.00', situacao: 'conferido', modificado: false },
      // Inconsistência 3: NCM inválido de 7 dígitos (falta o 8º dígito)
      { id: 'd4-8', item: 8, codigo: 'CALC-008', descricao: 'Bota Montaria Couro Vintage', ncm: '6403590', cfop: '7101', unidade: 'PAR', quantidade: '60.0000', valorUnitario: '120.0000', valorTotal: '7200.00', situacao: 'inconsistente', modificado: false, inconsistencias: [{ tipo: 'erro', campo: 'ncm', mensagem: 'NCM inválido. A Nomenclatura Comum do Mercosul deve conter exatamente 8 dígitos.', esperado: '64035910', encontrado: '6403590' }] },
      { id: 'd4-9', item: 9, codigo: 'CALC-009', descricao: 'Chinelo Slide em Couro Premium', ncm: '64035910', cfop: '7101', unidade: 'PAR', quantidade: '200.0000', valorUnitario: '35.0000', valorTotal: '7000.00', situacao: 'conferido', modificado: false },
      { id: 'd4-10', item: 10, codigo: 'CALC-010', descricao: 'Cinto em Couro Legítimo Fivela Fosca', ncm: '42033000', cfop: '7101', unidade: 'UN', quantidade: '300.0000', valorUnitario: '25.0000', valorTotal: '7500.00', situacao: 'conferido', modificado: false },
      // Inconsistência 4: Unidade METROS em produto de pares
      { id: 'd4-11', item: 11, codigo: 'CALC-011', descricao: 'Coturno Militar em Couro Hidrofugado', ncm: '64035910', cfop: '7101', unidade: 'METROS', quantidade: '70.0000', valorUnitario: '130.0000', valorTotal: '9100.00', situacao: 'inconsistente', modificado: false, inconsistencias: [{ tipo: 'aviso', campo: 'unidade', mensagem: 'Unidade comercial METROS divergente da unidade padrão aduaneira PAR para este NCM.', esperado: 'PAR', encontrado: 'METROS' }] },
      { id: 'd4-12', item: 12, codigo: 'CALC-012', descricao: 'Carteira Masculina Couro Bovino', ncm: '42023100', cfop: '7101', unidade: 'UN', quantidade: '320.0000', valorUnitario: '30.0000', valorTotal: '9600.00', situacao: 'conferido', modificado: false },
    ],
    totais: {
      valorProdutos: '89300.00',
      valorFrete: '0.00',
      valorSeguro: '0.00',
      valorDesconto: '0.00',
      outrasDespesas: '0.00',
      valorTotalNota: '89300.00',
      pesoLiquido: '1100.000',
      pesoBruto: '1240.000',
    },
  },

  // -------------------------------------------------------------------------
  // CENÁRIO 5: demo-05 — Produtos Repetidos em Lotes Múltiplos (15 itens)
  // -------------------------------------------------------------------------
  {
    id: 'demo-05',
    numero: '000.205.670',
    serie: '3',
    chaveAcesso: '50241177788899000122550030002056701001122334',
    tipoDocumento: 'XML',
    naturezaOperacao: 'EXPORTAÇÃO DE GRÃOS AGRÍCOLAS EM LOTES',
    emissao: '2026-10-25',
    dataEmissao: '2026-10-25T11:20:00Z',
    status: 'dividido',
    isDemo: true,
    emitente: {
      cnpj: '77.788.899/0001-22',
      razaoSocial: 'Cooperativa Agroindustrial Centro-Oeste',
      uf: 'MT',
      municipio: 'Cuiabá',
    },
    destinatario: {
      nome: 'Asian Grain Corporation',
      pais: 'China',
      paisCodigo: 'CN',
      idEstrangeiro: 'CN-SHA-100293',
    },
    itens: [
      // 3 produtos repetidos em 5 lotes cada (15 itens)
      // Lote L01 (prep-01)
      { id: 'd5-1', item: 1, codigo: 'SOJA-GR-01', descricao: 'Soja em Grãos - Lote L01', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '50.0000', valorUnitario: '400.0000', valorTotal: '20000.00', situacao: 'conferido', modificado: false },
      { id: 'd5-2', item: 2, codigo: 'MILHO-GR-02', descricao: 'Milho em Grãos - Lote L01', ncm: '10059010', cfop: '7101', unidade: 'TON', quantidade: '60.0000', valorUnitario: '350.0000', valorTotal: '21000.00', situacao: 'conferido', modificado: false },
      { id: 'd5-3', item: 3, codigo: 'SORGO-GR-03', descricao: 'Sorgo em Grãos - Lote L01', ncm: '10079000', cfop: '7101', unidade: 'TON', quantidade: '55.0000', valorUnitario: '380.0000', valorTotal: '20900.00', situacao: 'conferido', modificado: false },

      // Lote L02 (prep-01)
      { id: 'd5-4', item: 4, codigo: 'SOJA-GR-01', descricao: 'Soja em Grãos - Lote L02', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '54.0000', valorUnitario: '400.0000', valorTotal: '21600.00', situacao: 'conferido', modificado: false },
      { id: 'd5-5', item: 5, codigo: 'MILHO-GR-02', descricao: 'Milho em Grãos - Lote L02', ncm: '10059010', cfop: '7101', unidade: 'TON', quantidade: '65.0000', valorUnitario: '350.0000', valorTotal: '22750.00', situacao: 'conferido', modificado: false },
      { id: 'd5-6', item: 6, codigo: 'SORGO-GR-03', descricao: 'Sorgo em Grãos - Lote L02', ncm: '10079000', cfop: '7101', unidade: 'TON', quantidade: '75.0000', valorUnitario: '380.0000', valorTotal: '28500.00', situacao: 'conferido', modificado: false },

      // Lote L03 (prep-02)
      { id: 'd5-7', item: 7, codigo: 'SOJA-GR-01', descricao: 'Soja em Grãos - Lote L03', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '49.0000', valorUnitario: '400.0000', valorTotal: '19600.00', situacao: 'conferido', modificado: false },
      { id: 'd5-8', item: 8, codigo: 'MILHO-GR-02', descricao: 'Milho em Grãos - Lote L03', ncm: '10059010', cfop: '7101', unidade: 'TON', quantidade: '51.0000', valorUnitario: '350.0000', valorTotal: '17850.00', situacao: 'conferido', modificado: false },
      { id: 'd5-9', item: 9, codigo: 'SORGO-GR-03', descricao: 'Sorgo em Grãos - Lote L03', ncm: '10079000', cfop: '7101', unidade: 'TON', quantidade: '64.0000', valorUnitario: '380.0000', valorTotal: '24320.00', situacao: 'conferido', modificado: false },

      // Lote L04 (prep-02)
      { id: 'd5-10', item: 10, codigo: 'SOJA-GR-01', descricao: 'Soja em Grãos - Lote L04', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '53.0000', valorUnitario: '400.0000', valorTotal: '21200.00', situacao: 'conferido', modificado: false },
      { id: 'd5-11', item: 11, codigo: 'MILHO-GR-02', descricao: 'Milho em Grãos - Lote L04', ncm: '10059010', cfop: '7101', unidade: 'TON', quantidade: '58.0000', valorUnitario: '350.0000', valorTotal: '20300.00', situacao: 'conferido', modificado: false },
      { id: 'd5-12', item: 12, codigo: 'SORGO-GR-03', descricao: 'Sorgo em Grãos - Lote L04', ncm: '10079000', cfop: '7101', unidade: 'TON', quantidade: '72.0000', valorUnitario: '380.0000', valorTotal: '27360.00', situacao: 'conferido', modificado: false },

      // Lote L05 (prep-02)
      { id: 'd5-13', item: 13, codigo: 'SOJA-GR-01', descricao: 'Soja em Grãos - Lote L05', ncm: '12019000', cfop: '7101', unidade: 'TON', quantidade: '60.0000', valorUnitario: '400.0000', valorTotal: '24000.00', situacao: 'conferido', modificado: false },
      { id: 'd5-14', item: 14, codigo: 'MILHO-GR-02', descricao: 'Milho em Grãos - Lote L05', ncm: '10059010', cfop: '7101', unidade: 'TON', quantidade: '70.0000', valorUnitario: '350.0000', valorTotal: '24500.00', situacao: 'conferido', modificado: false },
      { id: 'd5-15', item: 15, codigo: 'SORGO-GR-03', descricao: 'Sorgo em Grãos - Lote L05', ncm: '10079000', cfop: '7101', unidade: 'TON', quantidade: '74.0000', valorUnitario: '380.0000', valorTotal: '28120.00', situacao: 'conferido', modificado: false },
    ],
    totais: {
      valorProdutos: '342000.00',
      valorFrete: '0.00',
      valorSeguro: '0.00',
      valorDesconto: '0.00',
      outrasDespesas: '0.00',
      valorTotalNota: '342000.00',
      pesoLiquido: '910000.000',
      pesoBruto: '928000.000',
    },
  },
];

// ---------------------------------------------------------------------------
// Baseline de Notas Preparadas (resultantes de divisão simulada)
// ---------------------------------------------------------------------------
export const MOCK_PREPARED_INVOICES = [
  {
    id: 'prep-01',
    numero: '000.205.670-A',
    serie: '1',
    parentInvoiceId: 'demo-05',
    origemNumero: '000.205.670',
    status: 'preparado',
    dataCriacao: '2026-10-26T09:00:00Z',
    destinatario: { nome: 'Asian Grain Corporation', pais: 'China' },
    quantidadeItens: 6,
    valorTotalNota: '134750.00',
    descricaoLote: 'Contêiner Marítimo 01 - Soja e Milho Lotes L01-L02',
  },
  {
    id: 'prep-02',
    numero: '000.205.670-B',
    serie: '1',
    parentInvoiceId: 'demo-05',
    origemNumero: '000.205.670',
    status: 'preparado',
    dataCriacao: '2026-10-26T09:15:00Z',
    destinatario: { nome: 'Asian Grain Corporation', pais: 'China' },
    quantidadeItens: 9,
    valorTotalNota: '207250.00',
    descricaoLote: 'Contêiner Marítimo 02 - Sorgo e Restante de Lotes',
  },
];

/**
 * Retorna as notas com propriedades flat adicionais para pesquisa instantânea no DataTable.
 * @returns {Array}
 */
export function getMockInvoices() {
  return MOCK_INVOICES.map(inv => ({
    ...inv,
    // Propriedades achatadas para filtro textual do DataTable
    emitenteNome: inv.emitente?.razaoSocial || '',
    emitenteCnpj: inv.emitente?.cnpj || '',
    destinatarioNome: inv.destinatario?.nome || '',
    destinatarioPais: inv.destinatario?.pais || '',
    quantidadeItens: inv.itens?.length || 0,
    valorTotalFormatado: inv.totais?.valorTotalNota || '0.00',
  }));
}

/**
 * Retorna nota mock por ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getMockInvoiceById(id) {
  const list = getMockInvoices();
  return list.find(inv => inv.id === id) || null;
}

/**
 * Retorna notas preparadas mock.
 * @returns {Array}
 */
export function getMockPreparedInvoices() {
  return [...MOCK_PREPARED_INVOICES];
}

/**
 * Calcula dinamicamente os 5 KPIs do Dashboard.
 * @returns {Object}
 */
export function getDashboardKPIs() {
  const invoices = getMockInvoices();
  const prepared = getMockPreparedInvoices();

  const totalNotas = invoices.length;
  const totalProdutos = invoices.reduce((acc, inv) => acc + (inv.itens?.length || 0), 0);
  const aguardandoValidacao = invoices.filter(
    inv => inv.status === 'com_inconsistencias' || inv.status === 'em_conferencia'
  ).length;
  const notasPreparadas = prepared.length;

  const valorTotalDemonstrado = invoices.reduce((acc, inv) => {
    const val = parseFloat(inv.totais?.valorTotalNota || '0');
    return acc + (Number.isNaN(val) ? 0 : val);
  }, 0);

  return {
    totalNotas,
    totalProdutos,
    aguardandoValidacao,
    notasPreparadas,
    valorTotalDemonstrado,
  };
}
