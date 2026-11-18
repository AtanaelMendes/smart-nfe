/**
 * Baseline do Catálogo de Serviços — SmartNFe
 *
 * Contempla códigos de tributação nacional (NFS-e Padrão Nacional / LC 116/2003)
 * focados em desenvolvimento, manutenção de software e TI.
 */

export const MOCK_SERVICES = [
  {
    id: 'serv-dev-01',
    codigoInterno: 'DEV-WEB-01',
    descricao: 'Desenvolvimento e customização de sistemas web e APIs em Node.js / React',
    codigoTributacaoNacional: '01.01.01', // Análise e desenvolvimento de sistemas
    subitemLc116: '1.01',
    codigoMunicipal: '10100',
    nbs: '1.0101.10.00',
    valorReferencia: '4500.00',
    municipioPrestacaoPadrao: 'Joinville/SC',
    aliquotaIssEstimada: '2.00',
    observacoes: 'Atividade permitida para MEI (CNAE 6201-5/01) com emissão pelo padrão nacional.',
  },
  {
    id: 'serv-man-02',
    codigoInterno: 'DEV-MAN-02',
    descricao: 'Manutenção corretiva, suporte técnico e sustentação de banco de dados',
    codigoTributacaoNacional: '01.07.01', // Suporte técnico em informática
    subitemLc116: '1.07',
    codigoMunicipal: '10700',
    nbs: '1.0107.10.00',
    valorReferencia: '2800.00',
    municipioPrestacaoPadrao: 'Joinville/SC',
    aliquotaIssEstimada: '2.00',
    observacoes: 'Serviço de suporte e sustentação contínua de software em produção.',
  },
  {
    id: 'serv-cons-03',
    codigoInterno: 'TI-CONS-03',
    descricao: 'Consultoria técnica em arquitetura de microsserviços e computação em nuvem',
    codigoTributacaoNacional: '01.06.01', // Assessoria e consultoria em informática
    subitemLc116: '1.06',
    codigoMunicipal: '10600',
    nbs: '1.0106.10.00',
    valorReferencia: '6000.00',
    municipioPrestacaoPadrao: 'São Paulo/SP',
    aliquotaIssEstimada: '5.00',
    observacoes: 'Consultoria especializada para modernização de plataformas legadas.',
  },
  {
    id: 'serv-ui-04',
    codigoInterno: 'DES-UIX-04',
    descricao: 'Design de interfaces de usuário (UI/UX) e prototipagem interativa',
    codigoTributacaoNacional: '01.05.01', // Licenciamento ou cessão de direito de uso / Design
    subitemLc116: '1.05',
    codigoMunicipal: '10500',
    nbs: '1.0105.10.00',
    valorReferencia: '3500.00',
    municipioPrestacaoPadrao: 'Florianópolis/SC',
    aliquotaIssEstimada: '2.00',
    observacoes: 'Criação de design system, fluxos de usuário e telas no Figma.',
  },
];

export function getMockServices() {
  return JSON.parse(JSON.stringify(MOCK_SERVICES));
}
