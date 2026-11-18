/**
 * Baseline de Empresas Demonstrativas — SmartNFe
 *
 * Contempla:
 * 1. Empresa MEI Prestadora de Serviços (desenvolvimento e TI)
 * 2. Empresa Comercial de Produtos (metalmecânica / manufaturados)
 * 3. Empresa Exportadora (agronegócio / café e grãos)
 */

export const MOCK_COMPANIES = [
  {
    id: 'comp-mei-01',
    tipo: 'MEI',
    razaoSocial: 'Lucas Silva Tecnologia MEI',
    nomeFantasia: 'LS Tech Solutions',
    cnpj: '45.123.456/0001-89',
    inscricaoMunicipal: '987654-1',
    inscricaoEstadual: '',
    municipio: 'Joinville',
    municipioCodigo: '4209102',
    uf: 'SC',
    regimeTributario: 'SIMPLES_NACIONAL_MEI',
    isMei: true,
    cnaePrincipal: '6201-5/01 - Desenvolvimento de programas de computador sob encomenda',
    cnaesSecundarios: [
      '6202-3/00 - Desenvolvimento e licenciamento de programas de computador customizáveis',
      '6209-1/00 - Suporte técnico, manutenção e outros serviços em tecnologia da informação',
    ],
    endereco: {
      logradouro: 'Rua das Palmeiras',
      numero: '120',
      complemento: 'Sala 302',
      bairro: 'Centro',
      cep: '89201-000',
    },
    contato: {
      email: 'contato@lstech.dev.br',
      telefone: '(47) 99123-4567',
    },
    descricaoPerfil: 'Microempreendedor Individual focado em desenvolvimento de software e consultoria em TI.',
  },
  {
    id: 'comp-comercial-02',
    tipo: 'COMERCIAL',
    razaoSocial: 'Metalúrgica Brasil Peças e Componentes Ltda',
    nomeFantasia: 'MetalBrasil Componentes',
    cnpj: '28.987.654/0001-32',
    inscricaoEstadual: '254.987.123',
    inscricaoMunicipal: '112233-4',
    municipio: 'São Bernardo do Campo',
    municipioCodigo: '3548708',
    uf: 'SP',
    regimeTributario: 'LUCRO_PRESUMIDO',
    isMei: false,
    cnaePrincipal: '2811-9/00 - Fabricação de motores e turbinas, peças e acessórios',
    endereco: {
      logradouro: 'Avenida das Indústrias',
      numero: '4500',
      complemento: 'Galpão 4B',
      bairro: 'Distrito Industrial',
      cep: '09840-000',
    },
    contato: {
      email: 'fiscal@metalbrasil.com.br',
      telefone: '(11) 4344-9000',
    },
    descricaoPerfil: 'Indústria e comércio de componentes mecânicos e motores industriais.',
  },
  {
    id: 'comp-export-03',
    tipo: 'EXPORTADORA',
    razaoSocial: 'Agroexport Brasil S.A.',
    nomeFantasia: 'Agroexport Global',
    cnpj: '12.345.678/0001-90',
    inscricaoEstadual: '110.223.344.556',
    inscricaoMunicipal: '445566-7',
    municipio: 'Santos',
    municipioCodigo: '3548500',
    uf: 'SP',
    regimeTributario: 'LUCRO_REAL',
    isMei: false,
    cnaePrincipal: '4623-1/09 - Comércio atacadista de café em grão e produtos agrícolas',
    endereco: {
      logradouro: 'Avenida Portuária',
      numero: '1000',
      complemento: 'Docas Armazém 3',
      bairro: 'Porto de Santos',
      cep: '11013-000',
    },
    contato: {
      email: 'export@agroexport.com.br',
      telefone: '(13) 3210-8800',
    },
    descricaoPerfil: 'Empresa exportadora de commodities agrícolas e café especial para os mercados da Europa e Ásia.',
  },
];

export function getMockCompanies() {
  return JSON.parse(JSON.stringify(MOCK_COMPANIES));
}
