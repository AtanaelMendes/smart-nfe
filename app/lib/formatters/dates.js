/**
 * Central de Formatação de Datas — SmartNFe
 * Utiliza estritamente APIs nativas Intl.DateTimeFormat (sem dependência de moment ou date-fns).
 */

/**
 * Formata data ISO para o padrão brasileiro DD/MM/AAAA.
 * @param {string|Date|number|null|undefined} dateInput - ISO string, timestamp ou Date
 * @returns {string} Data formatada (ex: "15/10/2026") ou "-" se inválido
 */
export function formatDateBR(dateInput) {
  if (!dateInput) return '-';
  try {
    let dateObj;
    if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      // Data ISO simples YYYY-MM-DD: interpreta sem timezone shift
      const [year, month, day] = dateInput.split('-').map(Number);
      dateObj = new Date(Date.UTC(year, month - 1, day));
    } else {
      dateObj = new Date(dateInput);
    }

    if (Number.isNaN(dateObj.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(dateObj);
  } catch {
    return '-';
  }
}

/**
 * Formata data e hora ISO para o padrão brasileiro DD/MM/AAAA HH:mm.
 * @param {string|Date|number|null|undefined} dateInput
 * @returns {string} Data/hora formatada (ex: "15/10/2026 14:30") ou "-" se inválido
 */
export function formatDateTimeBR(dateInput) {
  if (!dateInput) return '-';
  try {
    const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(dateObj.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dateObj);
  } catch {
    return '-';
  }
}
