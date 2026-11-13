/**
 * SmartNFe — Dicionário Centralizado de Conteúdo dos Tourtips
 *
 * Mapeamento estruturado das 8 telas operacionais do SmartNFe:
 * 1. /dashboard: Painel Geral
 * 2. /documentos/importar: Importação de XML
 * 3. /documentos: Lista de Documentos
 * 4. /documentos/[id]/conferencia: Conferência de Produtos
 * 5. /documentos/[id]/validacao: Validação Fiscal
 * 6. /documentos/[id]/divisao: Divisão de Notas
 * 7. /notas-preparadas: Notas Preparadas
 * 8. /configuracoes: Configurações do Sistema
 */

import {
  faChartBar,
  faFileImport,
  faFileInvoice,
  faCheckDouble,
  faScaleBalanced,
  faTableColumns,
  faClipboardCheck,
  faGear,
} from '@fortawesome/free-solid-svg-icons';

export const SCREEN_TOURS = {
  dashboard: {
    routeKey: 'dashboard',
    route: '/dashboard',
    title: 'Painel Geral',
    titulo: 'Painel Geral',
    objective:
      'Visão geral dos documentos fiscais em andamento, métricas consolidadas e atalhos rápidos.',
    objetivo:
      'Visão geral dos documentos fiscais em andamento, métricas consolidadas e atalhos rápidos.',
    steps: [
      'Acompanhe os indicadores-chave (KPIs) de notas pendentes, em conferência e preparadas.',
      'Utilize os botões de carga rápida de cenários de demonstração (demo-01 a demo-05) para testes.',
      'Acesse diretamente a lista de documentos recentes para iniciar a conferência ou divisão.',
    ],
    passos: [
      'Acompanhe os indicadores-chave (KPIs) de notas pendentes, em conferência e preparadas.',
      'Utilize os botões de carga rápida de cenários de demonstração (demo-01 a demo-05) para testes.',
      'Acesse diretamente a lista de documentos recentes para iniciar a conferência ou divisão.',
    ],
    tips: [
      'Métricas consolidadas auxiliam a identificar gargalos antes do envio das declarações à SEFAZ.',
      'Ambiente seguro: dados sensíveis de demonstração ficam isolados no navegador do operador.',
    ],
    dicas: [
      'Métricas consolidadas auxiliam a identificar gargalos antes do envio das declarações à SEFAZ.',
      'Ambiente seguro: dados sensíveis de demonstração ficam isolados no navegador do operador.',
    ],
    icon: faChartBar,
    iconName: 'faChartBar',
  },

  documentos_importar: {
    routeKey: 'documentos_importar',
    route: '/documentos/importar',
    title: 'Importação de XML',
    titulo: 'Importação de XML',
    objective:
      'Leitura e validação client-side de NF-e modelo 55 (DOMParser, Módulo 11) com privacidade em memória de sessão temporária.',
    objetivo:
      'Leitura e validação client-side de NF-e modelo 55 (DOMParser, Módulo 11) com privacidade em memória de sessão temporária.',
    steps: [
      'Selecione ou arraste os arquivos XML de NF-e modelo 55 para a área de upload.',
      'Aguarde a validação estrutural automática via DOMParser e checagem de integridade do Módulo 11 da chave de acesso de 44 dígitos.',
      'Confirme os dados extraídos e avance para a listagem ou conferência dos itens da nota.',
    ],
    passos: [
      'Selecione ou arraste os arquivos XML de NF-e modelo 55 para a área de upload.',
      'Aguarde a validação estrutural automática via DOMParser e checagem de integridade do Módulo 11 da chave de acesso de 44 dígitos.',
      'Confirme os dados extraídos e avance para a listagem ou conferência dos itens da nota.',
    ],
    tips: [
      'Privacidade estrita: o parsing ocorre 100% no navegador (client-side), sem gravação persistente de documentos reais no LocalStorage.',
      'Verifique sempre o status do protocolo nfeProc v4.00 e a chave de acesso antes de proceder à conferência.',
    ],
    dicas: [
      'Privacidade estrita: o parsing ocorre 100% no navegador (client-side), sem gravação persistente de documentos reais no LocalStorage.',
      'Verifique sempre o status do protocolo nfeProc v4.00 e a chave de acesso antes de proceder à conferência.',
    ],
    icon: faFileImport,
    iconName: 'faFileImport',
  },

  documentos: {
    routeKey: 'documentos',
    route: '/documentos',
    title: 'Lista de Documentos',
    titulo: 'Lista de Documentos',
    objective:
      'Gerenciamento e filtro das notas fiscais originais, status de processamento e ações de conferência.',
    objetivo:
      'Gerenciamento e filtro das notas fiscais originais, status de processamento e ações de conferência.',
    steps: [
      'Filtre os documentos por status operacional (Pendente, Em Conferência, Validado, Dividido).',
      'Utilize o campo de busca rápida para localizar notas por número, emitente ou chave de acesso.',
      'Acione as ações de cada linha: "Conferir" para revisar itens, ou "Dividir" para desmembrar o lote.',
    ],
    passos: [
      'Filtre os documentos por status operacional (Pendente, Em Conferência, Validado, Dividido).',
      'Utilize o campo de busca rápida para localizar notas por número, emitente ou chave de acesso.',
      'Acione as ações de cada linha: "Conferir" para revisar itens, ou "Dividir" para desmembrar o lote.',
    ],
    tips: [
      'Notas com pendências ou inconsistências fiscais são sinalizadas com badges de alerta na coluna de status.',
      'Você pode alternar a densidade de linhas e ordenação das colunas para gerenciar volumes elevados de notas.',
    ],
    dicas: [
      'Notas com pendências ou inconsistências fiscais são sinalizadas com badges de alerta na coluna de status.',
      'Você pode alternar a densidade de linhas e ordenação das colunas para gerenciar volumes elevados de notas.',
    ],
    icon: faFileInvoice,
    iconName: 'faFileInvoice',
  },

  documentos_conferencia: {
    routeKey: 'documentos_conferencia',
    route: '/documentos/[id]/conferencia',
    title: 'Conferência de Produtos',
    titulo: 'Conferência de Produtos',
    objective:
      'Conferência item a item de mercadorias, edição estável por itemId, recálculo em precisão decimal, comparação com valorOriginal e atalhos de teclado.',
    objetivo:
      'Conferência item a item de mercadorias, edição estável por itemId, recálculo em precisão decimal, comparação com valorOriginal e atalhos de teclado.',
    steps: [
      'Revise as descrições, quantidades, NCM e valores unitários de cada mercadoria na grade.',
      'Realize edições em células com atualização estável baseada em itemId determinístico.',
      'Use atalhos de teclado para navegação rápida entre células e linhas da tabela.',
      'Confira o comparativo entre o valor editado e o valorOriginal da NF-e importada antes de salvar.',
    ],
    passos: [
      'Revise as descrições, quantidades, NCM e valores unitários de cada mercadoria na grade.',
      'Realize edições em células com atualização estável baseada em itemId determinístico.',
      'Use atalhos de teclado para navegação rápida entre células e linhas da tabela.',
      'Confira o comparativo entre o valor editado e o valorOriginal da NF-e importada antes de salvar.',
    ],
    tips: [
      'Todos os cálculos aplicam precisão matemática decimal (ABNT Half-Up) imune a anomalias de ponto flutuante IEEE 754.',
      'Despesas acessórias (frete, seguro e despesas) e descontos são preservados rigorosamente no recálculo.',
    ],
    dicas: [
      'Todos os cálculos aplicam precisão matemática decimal (ABNT Half-Up) imune a anomalias de ponto flutuante IEEE 754.',
      'Despesas acessórias (frete, seguro e despesas) e descontos são preservados rigorosamente no recálculo.',
    ],
    icon: faCheckDouble,
    iconName: 'faCheckDouble',
  },

  documentos_validacao: {
    routeKey: 'documentos_validacao',
    route: '/documentos/[id]/validacao',
    title: 'Validação Fiscal',
    titulo: 'Validação Fiscal',
    objective:
      'Diagnóstico de inconsistências cadastrais e tributárias de exportação, confirmação explícita de alterações, pilha de desfazer (undo) e bloqueio de lote em campos tributários sensíveis.',
    objetivo:
      'Diagnóstico de inconsistências cadastrais e tributárias de exportação, confirmação explícita de alterações, pilha de desfazer (undo) e bloqueio de lote em campos tributários sensíveis.',
    steps: [
      'Examine o painel de diagnósticos fiscais e a lista de alertas e inconsistências tributárias.',
      'Aplique correções necessárias em dados fiscais e cadastrais exigidos para exportação.',
      'Revise as confirmações explícitas e utilize a pilha de desfazer (undo) para reverter ajustes acidentais.',
      'Certifique-se de que nenhum campo sensível esteja bloqueado antes de homologar a validação do lote.',
    ],
    passos: [
      'Examine o painel de diagnósticos fiscais e a lista de alertas e inconsistências tributárias.',
      'Aplique correções necessárias em dados fiscais e cadastrais exigidos para exportação.',
      'Revise as confirmações explícitas e utilize a pilha de desfazer (undo) para reverter ajustes acidentais.',
      'Certifique-se de que nenhum campo sensível esteja bloqueado antes de homologar a validação do lote.',
    ],
    tips: [
      'Campos tributários sensíveis como CFOP de exportação (7.xxx) e CST/alíquotas exigem confirmação deliberada.',
      'A validação rigorosa prévia previne rejeições imediatas na recepção das notas pela SEFAZ.',
    ],
    dicas: [
      'Campos tributários sensíveis como CFOP de exportação (7.xxx) e CST/alíquotas exigem confirmação deliberada.',
      'A validação rigorosa prévia previne rejeições imediatas na recepção das notas pela SEFAZ.',
    ],
    icon: faScaleBalanced,
    iconName: 'faScaleBalanced',
  },

  documentos_divisao: {
    routeKey: 'documentos_divisao',
    route: '/documentos/[id]/divisao',
    title: 'Divisão de Notas',
    titulo: 'Divisão de Notas',
    objective:
      'Desmembramento de quantidades entre múltiplas notas de exportação, distribuição de saldos e rateio proporcional de frete/seguro/despesas.',
    objetivo:
      'Desmembramento de quantidades entre múltiplas notas de exportação, distribuição de saldos e rateio proporcional de frete/seguro/despesas.',
    steps: [
      'Defina o número de notas de destino (mínimo de 2 notas para desmembramento).',
      'Distribua as quantidades de cada item entre as notas ou utilize a ferramenta de distribuição automática de saldos.',
      'Verifique se o saldo não alocado de todos os itens é exatamente zero para desbloquear a finalização.',
      'Confirme o rateio proporcional de despesas acessórias (frete, seguro, outras despesas) com conservação exata do centavo.',
    ],
    passos: [
      'Defina o número de notas de destino (mínimo de 2 notas para desmembramento).',
      'Distribua as quantidades de cada item entre as notas ou utilize a ferramenta de distribuição automática de saldos.',
      'Verifique se o saldo não alocado de todos os itens é exatamente zero para desbloquear a finalização.',
      'Confirme o rateio proporcional de despesas acessórias (frete, seguro, outras despesas) com conservação exata do centavo.',
    ],
    tips: [
      'A finalização (canSave) possui tolerância zero: qualquer saldo residual ou alocação negativa bloqueia a operação.',
      'O rateio matemático conserva 100% dos centavos da nota original, alocando eventuais resíduos no último lote ativo.',
    ],
    dicas: [
      'A finalização (canSave) possui tolerância zero: qualquer saldo residual ou alocação negativa bloqueia a operação.',
      'O rateio matemático conserva 100% dos centavos da nota original, alocando eventuais resíduos no último lote ativo.',
    ],
    icon: faTableColumns,
    iconName: 'faTableColumns',
  },

  notas_preparadas: {
    routeKey: 'notas_preparadas',
    route: '/notas-preparadas',
    title: 'Notas Preparadas',
    titulo: 'Notas Preparadas',
    objective: 'Consulta e conferência das notas finais geradas para exportação.',
    objetivo: 'Consulta e conferência das notas finais geradas para exportação.',
    steps: [
      'Consulte as notas fiscais preparadas a partir dos desmembramentos e conferências homologadas.',
      'Utilize os filtros de busca por número do lote, destinatário no exterior ou data de emissão.',
      'Verifique os totais matemáticos de cada nota filha e a reconciliação com o documento original.',
      'Exporte ou envie as notas preparadas para o fluxo de emissão e registro aduaneiro.',
    ],
    passos: [
      'Consulte as notas fiscais preparadas a partir dos desmembramentos e conferências homologadas.',
      'Utilize os filtros de busca por número do lote, destinatário no exterior ou data de emissão.',
      'Verifique os totais matemáticos de cada nota filha e a reconciliação com o documento original.',
      'Exporte ou envie as notas preparadas para o fluxo de emissão e registro aduaneiro.',
    ],
    tips: [
      'Cada nota preparada herda a rastreabilidade completa do documento de origem e do processo de divisão.',
      'Exclusões e alterações de notas preparadas são sincronizadas no repositório com proteção transacional.',
    ],
    dicas: [
      'Cada nota preparada herda a rastreabilidade completa do documento de origem e do processo de divisão.',
      'Exclusões e alterações de notas preparadas são sincronizadas no repositório com proteção transacional.',
    ],
    icon: faClipboardCheck,
    iconName: 'faClipboardCheck',
  },

  configuracoes: {
    routeKey: 'configuracoes',
    route: '/configuracoes',
    title: 'Configurações do Sistema',
    titulo: 'Configurações do Sistema',
    objective:
      'Personalização da experiência (modo escuro, densidade de tabela) e opção para reiniciar os guias explicativos de todas as telas.',
    objetivo:
      'Personalização da experiência (modo escuro, densidade de tabela) e opção para reiniciar os guias explicativos de todas as telas.',
    steps: [
      'Ajuste o tema visual entre Modo Claro e Modo Escuro (Dark Mode).',
      'Selecione a densidade visual das grades (Compacta, Normal ou Espaçosa) para otimizar telas de conferência.',
      'Configure o salvamento automático (AutoSave) e a exibição de comparativo com valores originais.',
      'Utilize a opção de reiniciar guias explicativos para rever as orientações contextuais de cada etapa.',
    ],
    passos: [
      'Ajuste o tema visual entre Modo Claro e Modo Escuro (Dark Mode).',
      'Selecione a densidade visual das grades (Compacta, Normal ou Espaçosa) para otimizar telas de conferência.',
      'Configure o salvamento automático (AutoSave) e a exibição de comparativo com valores originais.',
      'Utilize a opção de reiniciar guias explicativos para rever as orientações contextuais de cada etapa.',
    ],
    tips: [
      'A reinicialização dos guias explicativos limpa os registros de visualização no navegador, reativando os tourtips automaticamente.',
      'A restauração de fábrica (resetAll) redefine também os cenários de dados para o estado inicial demonstrativo.',
    ],
    dicas: [
      'A reinicialização dos guias explicativos limpa os registros de visualização no navegador, reativando os tourtips automaticamente.',
      'A restauração de fábrica (resetAll) redefine também os cenários de dados para o estado inicial demonstrativo.',
    ],
    icon: faGear,
    iconName: 'faGear',
  },
};

// Aliases por caminho canônico de rota
SCREEN_TOURS['/'] = SCREEN_TOURS.dashboard;
SCREEN_TOURS['/dashboard'] = SCREEN_TOURS.dashboard;
SCREEN_TOURS['/documentos/importar'] = SCREEN_TOURS.documentos_importar;
SCREEN_TOURS['/documentos'] = SCREEN_TOURS.documentos;
SCREEN_TOURS['/documentos/[id]/conferencia'] = SCREEN_TOURS.documentos_conferencia;
SCREEN_TOURS['/documentos/[id]/validacao'] = SCREEN_TOURS.documentos_validacao;
SCREEN_TOURS['/documentos/[id]/divisao'] = SCREEN_TOURS.documentos_divisao;
SCREEN_TOURS['/notas-preparadas'] = SCREEN_TOURS.notas_preparadas;
SCREEN_TOURS['/configuracoes'] = SCREEN_TOURS.configuracoes;

/**
 * Retorna a chave canônica da rota baseada no pathname atual.
 * @param {string} pathname
 * @returns {string|null}
 */
export function getRouteKeyByPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  if (cleanPath === '/dashboard' || cleanPath === '/') return 'dashboard';
  if (cleanPath === '/documentos/importar') return 'documentos_importar';
  if (/^\/documentos\/[^/]+\/conferencia$/.test(cleanPath)) return 'documentos_conferencia';
  if (/^\/documentos\/[^/]+\/validacao$/.test(cleanPath)) return 'documentos_validacao';
  if (/^\/documentos\/[^/]+\/divisao$/.test(cleanPath)) return 'documentos_divisao';
  if (cleanPath === '/documentos') return 'documentos';
  if (cleanPath === '/notas-preparadas') return 'notas_preparadas';
  if (cleanPath === '/configuracoes') return 'configuracoes';

  return null;
}

/**
 * Retorna o objeto de tour para a rota indicada pelo pathname.
 * @param {string} pathname
 * @returns {Object|null}
 */
export function getScreenTourByPath(pathname) {
  const key = getRouteKeyByPath(pathname);
  return key ? SCREEN_TOURS[key] : null;
}

/**
 * Formata o nome da chave persistida no localStorage para a rota.
 * Padrão estrito: smartnfe_tour_seen_<routeKey>
 * @param {string} routeKey
 * @returns {string}
 */
export function getTourStorageKey(routeKey) {
  return `smartnfe_tour_seen_${routeKey}`;
}

let memoryFallbackStorage = null;

function getSafeStorage() {
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // localStorage bloqueado por política de segurança restritiva
    }
  }
  if (typeof globalThis !== 'undefined') {
    try {
      if (globalThis.localStorage) {
        return globalThis.localStorage;
      }
    } catch {
      // localStorage bloqueado em ambiente Node/isolado
    }
  }
  if (!memoryFallbackStorage) {
    const memoryMap = new Map();
    memoryFallbackStorage = {
      getItem: (key) => (memoryMap.has(key) ? memoryMap.get(key) : null),
      setItem: (key, value) => { memoryMap.set(key, String(value)); },
      removeItem: (key) => { memoryMap.delete(key); },
      clear: () => { memoryMap.clear(); },
      key: (index) => Array.from(memoryMap.keys())[index] || null,
      get length() { return memoryMap.size; },
    };
  }
  return memoryFallbackStorage;
}

/**
 * Verifica se o tour da rota indicada já foi visualizado e dispensado pelo usuário.
 * @param {string} routeKey
 * @returns {boolean}
 */
export function isTourSeen(routeKey) {
  const storage = getSafeStorage();
  if (!storage || !routeKey) return false;
  try {
    return storage.getItem(getTourStorageKey(routeKey)) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marca o tour da rota indicada como visualizado no localStorage.
 * @param {string} routeKey
 */
export function markTourAsSeen(routeKey) {
  const storage = getSafeStorage();
  if (!storage || !routeKey) return;
  try {
    storage.setItem(getTourStorageKey(routeKey), 'true');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('smartnfe:tour-updated', {
          detail: { routeKey, action: 'seen' },
        })
      );
    }
  } catch {
    // ignore
  }
}

/**
 * Remove a marcação de tour visto para uma rota específica.
 * @param {string} routeKey
 */
export function resetTour(routeKey) {
  const storage = getSafeStorage();
  if (!storage || !routeKey) return;
  try {
    storage.removeItem(getTourStorageKey(routeKey));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('smartnfe:tour-updated', {
          detail: { routeKey, action: 'reset' },
        })
      );
    }
  } catch {
    // ignore
  }
}

/**
 * Remove todas as flags smartnfe_tour_seen_* do localStorage.
 */
export function resetAllScreenTours() {
  const storage = getSafeStorage();
  if (!storage) return;

  // 1. Remoção determinística explícita das 8 rotas mapeadas
  const knownRouteKeys = [
    'dashboard',
    'documentos_importar',
    'documentos',
    'documentos_conferencia',
    'documentos_validacao',
    'documentos_divisao',
    'notas_preparadas',
    'configuracoes',
  ];
  for (const rk of knownRouteKeys) {
    try {
      storage.removeItem(getTourStorageKey(rk));
    } catch {
      // ignore
    }
  }

  // 2. Varredura dinâmica para qualquer chave residual smartnfe_tour_seen_*
  try {
    const keysToRemove = [];
    const len = storage.length || 0;
    for (let i = 0; i < len; i++) {
      const key = storage.key(i);
      if (key && key.startsWith('smartnfe_tour_seen_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => storage.removeItem(k));
  } catch {
    // ignore
  }

  // 3. Notificação reativa para os componentes da interface
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('smartnfe:tour-updated', {
          detail: { all: true, action: 'reset' },
        })
      );
    } catch {
      // ignore
    }
  }
}

export default SCREEN_TOURS;
