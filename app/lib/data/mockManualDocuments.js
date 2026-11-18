/**
 * Baseline de Documentos Manuais e Rascunhos — SmartNFe
 *
 * Contempla os 7 cenários demonstrativos obrigatórios:
 * 1. manual-nfe-01: NF-e com dois produtos
 * 2. manual-nfe-02: NF-e com vinte produtos (teste de escala)
 * 3. manual-nfse-03: NFS-e MEI para desenvolvimento de software
 * 4. manual-nfse-04: NFS-e MEI com tomador pessoa física
 * 5. manual-nfse-05: NFS-e com tomador pessoa jurídica
 * 6. manual-nfse-06: NFS-e com campos faltantes (incompleta para demonstrar validação)
 * 7. manual-nfe-07: NF-e de produtos com inconsistências cadastrais/fiscais
 */

export const MOCK_MANUAL_DOCUMENTS = [
  // ---------------------------------------------------------------------------
  // 1. NF-e com dois produtos
  // ---------------------------------------------------------------------------
  {
    id: 'draft-nfe-01',
    documentType: 'NFE',
    origin: 'MANUAL',
    status: 'DRAFT', // 'DRAFT' | 'READY_TO_EMIT'
    titulo: 'Rascunho NF-e — Motores Industriais',
    numeroPrevisto: '000.001.001',
    seriePrevista: '1',
    dataPrevistaEmissao: '2026-11-20',
    createdAt: '2026-11-15T09:30:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
    naturezaOperacao: 'VENDA DE MERCADORIA INDUSTRIAL',
    finalidadeEmissao: '1', // 1 - Normal
    tipoOperacao: '1', // 1 - Saída
    destinoOperacao: '1', // 1 - Interna
    ambiente: 'HOMOLOGACAO',
    isDemo: true,
    emitenteId: 'comp-comercial-02',
    emitente: {
      id: 'comp-comercial-02',
      cnpj: '28.987.654/0001-32',
      razaoSocial: 'Metalúrgica Brasil Peças e Componentes Ltda',
      nomeFantasia: 'MetalBrasil Componentes',
      uf: 'SP',
      municipio: 'São Bernardo do Campo',
      inscricaoEstadual: '254.987.123',
    },
    destinatarioId: 'person-pj-04',
    destinatario: {
      id: 'person-pj-04',
      tipoPessoa: 'PJ',
      documento: '48.101.559/0001-34',
      nomeOuRazao: 'Wipa Group Import & Export Ltda',
      uf: 'SC',
      municipio: 'Joinville',
      pais: 'Brasil',
      paisCodigo: 'BR',
      enderecoCompleto: 'Rua Albano Schmidt, 497 - Boa Vista - Joinville/SC',
      inscricaoEstadual: '263071413',
    },
    itens: [
      {
        itemId: 'item-d1-1',
        item: 1,
        codigo: 'MOT-IND-001',
        descricao: 'Motor Básico 6.10T Industrial 4 Cilindros',
        ncm: '84089090',
        cfop: '5101',
        unidade: 'PC',
        quantidade: '2.0000',
        valorUnitario: '42056.8800',
        valorTotal: '84113.76',
        desconto: '0.00',
        observacoes: 'Motor básico montado para equipamento industrial.',
      },
      {
        itemId: 'item-d1-2',
        item: 2,
        codigo: 'CMP-RAD-005',
        descricao: 'Radiador de Alumínio Reforçado para Motor Pesado',
        ncm: '87089100',
        cfop: '5405',
        unidade: 'UN',
        quantidade: '2.0000',
        valorUnitario: '3450.0000',
        valorTotal: '6900.00',
        desconto: '0.00',
        observacoes: 'Radiador complementar com tubulação em alumínio.',
      },
    ],
    totais: {
      valorProdutos: '91013.76',
      valorFrete: '850.00',
      valorSeguro: '150.00',
      valorDesconto: '0.00',
      outrasDespesas: '0.00',
      valorTotalNota: '92013.76',
    },
    informacoesAdicionais: 'Rascunho de NF-e comercial para entrega programada.',
  },

  // ---------------------------------------------------------------------------
  // 2. NF-e com vinte produtos (teste de escala)
  // ---------------------------------------------------------------------------
  {
    id: 'draft-nfe-02',
    documentType: 'NFE',
    origin: 'MANUAL',
    status: 'DRAFT',
    titulo: 'Rascunho NF-e — Lote Amplo de Peças e Filtros (20 Itens)',
    numeroPrevisto: '000.001.002',
    seriePrevista: '1',
    dataPrevistaEmissao: '2026-11-22',
    createdAt: '2026-11-16T11:00:00Z',
    updatedAt: '2026-11-18T10:15:00Z',
    naturezaOperacao: 'VENDA DE PECAS E ACESSORIOS',
    finalidadeEmissao: '1',
    tipoOperacao: '1',
    destinoOperacao: '2', // Interestadual
    ambiente: 'HOMOLOGACAO',
    isDemo: true,
    emitenteId: 'comp-comercial-02',
    emitente: {
      id: 'comp-comercial-02',
      cnpj: '28.987.654/0001-32',
      razaoSocial: 'Metalúrgica Brasil Peças e Componentes Ltda',
      uf: 'SP',
      municipio: 'São Bernardo do Campo',
    },
    destinatarioId: 'person-pj-01',
    destinatario: {
      id: 'person-pj-01',
      tipoPessoa: 'PJ',
      documento: '33.445.566/0001-77',
      nomeOuRazao: 'Nexus Digital Soluções Corporativas Ltda',
      uf: 'SP',
      municipio: 'São Paulo',
      pais: 'Brasil',
    },
    itens: Array.from({ length: 20 }, (_, idx) => {
      const nItem = idx + 1;
      const precoUnit = (120 + nItem * 15).toFixed(4);
      const qtd = (10 + nItem).toFixed(4);
      const vTot = ((120 + nItem * 15) * (10 + nItem)).toFixed(2);
      return {
        itemId: `item-scale-20-${nItem}`,
        item: nItem,
        codigo: `PEC-SKU-${String(nItem).padStart(3, '0')}`,
        descricao: `Componente Mecânico de Reposição Linha ${nItem} Reforçado`,
        ncm: '84099990',
        cfop: '6102',
        unidade: 'UN',
        quantidade: qtd,
        valorUnitario: precoUnit,
        valorTotal: vTot,
        desconto: '0.00',
        observacoes: `Lote de reposição serial L-${1000 + nItem}`,
      };
    }),
    totais: {
      valorProdutos: '72530.00',
      valorFrete: '1200.00',
      valorSeguro: '300.00',
      valorDesconto: '0.00',
      outrasDespesas: '100.00',
      valorTotalNota: '74130.00',
    },
    informacoesAdicionais: 'Lote de 20 itens para validação de performance e paginação.',
  },

  // ---------------------------------------------------------------------------
  // 3. NFS-e MEI para prestação de serviço de desenvolvimento de software
  // ---------------------------------------------------------------------------
  {
    id: 'draft-nfse-03',
    documentType: 'NFSE',
    origin: 'MANUAL',
    status: 'READY_TO_EMIT',
    isMei: true,
    modoSimplificadoMei: true,
    titulo: 'NFS-e MEI — Desenvolvimento de API e Frontend Next.js',
    numeroPrevisto: '2026/00042',
    seriePrevista: 'E',
    competencia: '11/2026',
    dataPrevistaEmissao: '2026-11-25',
    createdAt: '2026-11-17T14:20:00Z',
    updatedAt: '2026-11-18T10:30:00Z',
    ambiente: 'HOMOLOGACAO',
    isDemo: true,
    prestadorId: 'comp-mei-01',
    prestador: {
      id: 'comp-mei-01',
      cnpj: '45.123.456/0001-89',
      razaoSocial: 'Lucas Silva Tecnologia MEI',
      nomeFantasia: 'LS Tech Solutions',
      uf: 'SC',
      municipio: 'Joinville',
      municipioCodigo: '4209102',
      inscricaoMunicipal: '987654-1',
      isMei: true,
      regimeTributario: 'SIMPLES_NACIONAL_MEI',
    },
    tomadorId: 'person-pj-01',
    tomador: {
      id: 'person-pj-01',
      tipoPessoa: 'PJ',
      documento: '33.445.566/0001-77',
      nomeOuRazao: 'Nexus Digital Soluções Corporativas Ltda',
      pais: 'Brasil',
      uf: 'SP',
      municipio: 'São Paulo',
      email: 'financeiro@nexusdigital.com.br',
    },
    servico: {
      id: 'serv-dev-01',
      codigoInterno: 'DEV-WEB-01',
      codigoTributacaoNacional: '01.01.01',
      subitemLc116: '1.01',
      codigoMunicipal: '10100',
      descricao: 'Serviço de desenvolvimento de novas features e correção de bugs na plataforma web e integração de APIs REST.',
      municipioPrestacao: 'Joinville',
      municipioPrestacaoCodigo: '4209102',
      ufPrestacao: 'SC',
      exigibilidadeIss: '1', // 1 - Exigível (recolhido em DAS-MEI)
      informacoesComplementares: 'Documento emitido por MEI optante pelo Simples Nacional. Não gera direito a crédito de IPI ou ICMS.',
    },
    valores: {
      valorBruto: '4800.00',
      valorDescontoCondicionado: '0.00',
      valorDescontoIncondicionado: '0.00',
      valorDeducoes: '0.00',
      aliquotaIss: '0.00', // MEI recolhe valor fixo no DAS
      valorIssRetido: '0.00',
      issRetido: false,
      retencoesFederais: {
        pis: '0.00',
        cofins: '0.00',
        inss: '0.00',
        ir: '0.00',
        csll: '0.00',
      },
      valorLiquido: '4800.00',
    },
  },

  // ---------------------------------------------------------------------------
  // 4. NFS-e MEI com tomador pessoa física
  // ---------------------------------------------------------------------------
  {
    id: 'draft-nfse-04',
    documentType: 'NFSE',
    origin: 'MANUAL',
    status: 'DRAFT',
    isMei: true,
    modoSimplificadoMei: true,
    titulo: 'NFS-e MEI — Consultoria de Informática para PF',
    numeroPrevisto: '2026/00043',
    seriePrevista: 'E',
    competencia: '11/2026',
    dataPrevistaEmissao: '2026-11-28',
    createdAt: '2026-11-17T16:00:00Z',
    updatedAt: '2026-11-18T10:45:00Z',
    ambiente: 'HOMOLOGACAO',
    isDemo: true,
    prestadorId: 'comp-mei-01',
    prestador: {
      id: 'comp-mei-01',
      cnpj: '45.123.456/0001-89',
      razaoSocial: 'Lucas Silva Tecnologia MEI',
      uf: 'SC',
      municipio: 'Joinville',
      isMei: true,
    },
    tomadorId: 'person-pf-02',
    tomador: {
      id: 'person-pf-02',
      tipoPessoa: 'PF',
      documento: '284.912.873-45',
      nomeOuRazao: 'Carlos Eduardo Mendes Ferreira',
      pais: 'Brasil',
      uf: 'SC',
      municipio: 'Florianópolis',
      email: 'carlos.mendes@emailpessoal.com.br',
    },
    servico: {
      id: 'serv-man-02',
      codigoInterno: 'DEV-MAN-02',
      codigoTributacaoNacional: '01.07.01',
      subitemLc116: '1.07',
      codigoMunicipal: '10700',
      descricao: 'Configuração de ambiente de desenvolvimento em nuvem e suporte técnico em servidor Linux.',
      municipioPrestacao: 'Florianópolis',
      ufPrestacao: 'SC',
      informacoesComplementares: 'Tomador Pessoa Física. Isento de retenção de tributos.',
    },
    valores: {
      valorBruto: '1200.00',
      valorDescontoCondicionado: '0.00',
      valorDescontoIncondicionado: '0.00',
      valorDeducoes: '0.00',
      aliquotaIss: '0.00',
      valorIssRetido: '0.00',
      issRetido: false,
      retencoesFederais: {
        pis: '0.00',
        cofins: '0.00',
        inss: '0.00',
        ir: '0.00',
        csll: '0.00',
      },
      valorLiquido: '1200.00',
    },
  },

  // ---------------------------------------------------------------------------
  // 5. NFS-e com tomador pessoa jurídica (Regime Completo / Com Retenções)
  // ---------------------------------------------------------------------------
  {
    id: 'draft-nfse-05',
    documentType: 'NFSE',
    origin: 'MANUAL',
    status: 'DRAFT',
    isMei: false,
    modoSimplificadoMei: false,
    titulo: 'NFS-e Corporativa — Consultoria de Arquitetura de Software',
    numeroPrevisto: '2026/00108',
    seriePrevista: '1',
    competencia: '11/2026',
    dataPrevistaEmissao: '2026-11-29',
    createdAt: '2026-11-18T08:00:00Z',
    updatedAt: '2026-11-18T11:00:00Z',
    ambiente: 'HOMOLOGACAO',
    isDemo: true,
    prestadorId: 'comp-comercial-02',
    prestador: {
      id: 'comp-comercial-02',
      cnpj: '28.987.654/0001-32',
      razaoSocial: 'Metalúrgica Brasil Peças e Componentes Ltda',
      uf: 'SP',
      municipio: 'São Bernardo do Campo',
      regimeTributario: 'LUCRO_PRESUMIDO',
      isMei: false,
    },
    tomadorId: 'person-pj-01',
    tomador: {
      id: 'person-pj-01',
      tipoPessoa: 'PJ',
      documento: '33.445.566/0001-77',
      nomeOuRazao: 'Nexus Digital Soluções Corporativas Ltda',
      uf: 'SP',
      municipio: 'São Paulo',
      email: 'financeiro@nexusdigital.com.br',
    },
    servico: {
      id: 'serv-cons-03',
      codigoInterno: 'TI-CONS-03',
      codigoTributacaoNacional: '01.06.01',
      subitemLc116: '1.06',
      codigoMunicipal: '10600',
      descricao: 'Consultoria e auditoria de segurança da informação e arquitetura de banco de dados corporativo.',
      municipioPrestacao: 'São Paulo',
      ufPrestacao: 'SP',
      informacoesComplementares: 'Prestação de serviços sob regime de Lucro Presumido com retenção de ISS no município do tomador.',
    },
    valores: {
      valorBruto: '15000.00',
      valorDescontoCondicionado: '0.00',
      valorDescontoIncondicionado: '0.00',
      valorDeducoes: '0.00',
      aliquotaIss: '5.00',
      valorIssRetido: '750.00',
      issRetido: true,
      retencoesFederais: {
        pis: '97.50', // 0.65%
        cofins: '450.00', // 3.00%
        inss: '0.00',
        ir: '225.00', // 1.50%
        csll: '150.00', // 1.00%
      },
      valorLiquido: '13327.50',
    },
  },

  // ---------------------------------------------------------------------------
  // 6. NFS-e com campos faltantes (para demonstrar validador e alertas)
  // ---------------------------------------------------------------------------
  {
    id: 'draft-nfse-06',
    documentType: 'NFSE',
    origin: 'MANUAL',
    status: 'DRAFT',
    isMei: true,
    modoSimplificadoMei: true,
    titulo: 'NFS-e Incompleta (Demonstração de Validação)',
    numeroPrevisto: '',
    seriePrevista: 'E',
    competencia: '', // Faltando competência
    dataPrevistaEmissao: '',
    createdAt: '2026-11-18T09:00:00Z',
    updatedAt: '2026-11-18T11:15:00Z',
    ambiente: 'HOMOLOGACAO',
    isDemo: true,
    prestadorId: 'comp-mei-01',
    prestador: {
      id: 'comp-mei-01',
      cnpj: '45.123.456/0001-89',
      razaoSocial: 'Lucas Silva Tecnologia MEI',
      uf: 'SC',
      municipio: 'Joinville',
      isMei: true,
    },
    tomadorId: '',
    tomador: null, // Faltando tomador
    servico: {
      id: '',
      codigoInterno: '',
      codigoTributacaoNacional: '', // Faltando código de tributação nacional
      descricao: '', // Faltando descrição
      municipioPrestacao: '',
      ufPrestacao: '',
    },
    valores: {
      valorBruto: '0.00', // Valor zero
      valorLiquido: '0.00',
    },
  },

  // ---------------------------------------------------------------------------
  // 7. NF-e de produtos com inconsistências cadastrais/fiscais
  // ---------------------------------------------------------------------------
  {
    id: 'draft-nfe-07',
    documentType: 'NFE',
    origin: 'MANUAL',
    status: 'DRAFT',
    titulo: 'NF-e com Inconsistências Fiscais (Demonstração)',
    numeroPrevisto: '000.001.007',
    seriePrevista: '1',
    dataPrevistaEmissao: '2026-11-30',
    createdAt: '2026-11-18T09:30:00Z',
    updatedAt: '2026-11-18T11:30:00Z',
    naturezaOperacao: 'EXPORTACAO',
    finalidadeEmissao: '1',
    tipoOperacao: '1',
    destinoOperacao: '3', // 3 - Exterior
    ambiente: 'HOMOLOGACAO',
    isDemo: true,
    emitenteId: 'comp-export-03',
    emitente: {
      id: 'comp-export-03',
      cnpj: '12.345.678/0001-90',
      razaoSocial: 'Agroexport Brasil S.A.',
      uf: 'SP',
      municipio: 'Santos',
    },
    destinatarioId: 'person-foreign-03',
    destinatario: {
      id: 'person-foreign-03',
      tipoPessoa: 'ESTRANGEIRO',
      nomeOuRazao: 'Global Trading Logistics B.V.',
      pais: 'Holanda',
      paisCodigo: 'NL',
      uf: 'EX',
      documento: 'NL884920192B01',
    },
    itens: [
      {
        itemId: 'item-d7-1',
        item: 1,
        codigo: 'PROD-ERR-01',
        descricao: 'Café Grão Tipo Exportação Especial',
        ncm: '0901', // NCM incompleto (deve ter 8 dígitos)
        cfop: '5101', // Inconsistência: Destino é Exterior (3), mas CFOP é Interno (5101 em vez de 7101)
        unidade: '', // Unidade vazia
        quantidade: '-5.0000', // Quantidade negativa
        valorUnitario: '0.0000', // Valor unitário zero
        valorTotal: '0.00',
        desconto: '0.00',
      },
    ],
    totais: {
      valorProdutos: '0.00',
      valorFrete: '0.00',
      valorSeguro: '0.00',
      valorDesconto: '0.00',
      outrasDespesas: '0.00',
      valorTotalNota: '0.00',
    },
    informacoesAdicionais: 'Cenário demonstrativo para validação de erros fiscais e avisos.',
  },
];

export function getMockManualDocuments() {
  return JSON.parse(JSON.stringify(MOCK_MANUAL_DOCUMENTS));
}
