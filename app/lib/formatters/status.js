/**
 * Central de Rótulos e Cores de Status — SmartNFe
 * Classes compatíveis com Tailwind CSS 4 e suporte a Dark Mode.
 */

export const STATUS_CONFIG = {
  pendente: {
    label: 'Pendente',
    className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    dot: 'bg-gray-400',
    description: 'Aguardando processamento',
  },
  importado: {
    label: 'Importado',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500',
    description: 'Documento importado aguardando início da conferência',
  },
  em_conferencia: {
    label: 'Em Conferência',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500',
    description: 'Auditoria de itens e classificação fiscal em andamento',
  },
  conferido: {
    label: 'Conferido',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    description: 'Itens, NCM e valores auditados e validados',
  },
  dividido: {
    label: 'Dividido',
    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    dot: 'bg-purple-500',
    description: 'Desmembrado em notas preparadas de destino',
  },
  com_inconsistencias: {
    label: 'Com Inconsistências',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    dot: 'bg-red-500',
    description: 'Inconsistências fiscais impeditivas detectadas',
  },
  preparado: {
    label: 'Preparado',
    className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
    dot: 'bg-teal-500',
    description: 'Nota preparada gerada e pronta para exportação',
  },
};

/**
 * Retorna o rótulo amigável em português para o status.
 * @param {string} status
 * @returns {string}
 */
export function getStatusLabel(status) {
  return STATUS_CONFIG[status]?.label || status || 'Desconhecido';
}

/**
 * Retorna as classes Tailwind CSS para o badge de status.
 * @param {string} status
 * @returns {string}
 */
export function getStatusColor(status) {
  return STATUS_CONFIG[status]?.className || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
}

/**
 * Alias para getStatusColor compatível com chamadas de getStatusBadgeClass.
 * @param {string} status
 * @returns {string}
 */
export function getStatusBadgeClass(status) {
  return getStatusColor(status);
}

/**
 * Retorna a configuração ou classes de badge para o status.
 * @param {string} status
 * @returns {string}
 */
export function getStatusBadge(status) {
  return getStatusColor(status);
}

/**
 * Retorna a classe de cor da bolinha indicadora.
 * @param {string} status
 * @returns {string}
 */
export function getStatusDot(status) {
  return STATUS_CONFIG[status]?.dot || 'bg-gray-400';
}
