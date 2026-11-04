/**
 * Central de Formatação de Datas — SmartNFe
 * Utiliza estritamente APIs nativas Intl.DateTimeFormat (sem dependência de moment ou date-fns).
 * Validação rigorosa de calendário sem rollover de datas inválidas.
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
      if (Number.isNaN(dateObj.getTime())) return '-';
    } else if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      const isoSimpleMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoSimpleMatch) {
        const year = Number(isoSimpleMatch[1]);
        const month = Number(isoSimpleMatch[2]);
        const day = Number(isoSimpleMatch[3]);

        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) {
          return '-';
        }

        dateObj = new Date(Date.UTC(year, month - 1, day));
        // Prevenção estrita de rollover (ex: 2026-02-31 ou 2026-99-99)
        if (
          dateObj.getUTCFullYear() !== year ||
          dateObj.getUTCMonth() !== month - 1 ||
          dateObj.getUTCDate() !== day
        ) {
          return '-';
        }
      } else {
        const isoWithTimeMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T/);
        if (isoWithTimeMatch) {
          const year = Number(isoWithTimeMatch[1]);
          const month = Number(isoWithTimeMatch[2]);
          const day = Number(isoWithTimeMatch[3]);
          if (month < 1 || month > 12 || day < 1 || day > 31) {
            return '-';
          }
          const checkDate = new Date(Date.UTC(year, month - 1, day));
          if (
            checkDate.getUTCFullYear() !== year ||
            checkDate.getUTCMonth() !== month - 1 ||
            checkDate.getUTCDate() !== day
          ) {
            return '-';
          }
        }
        dateObj = new Date(trimmed);
        if (Number.isNaN(dateObj.getTime())) {
          return '-';
        }
      }
    } else {
      dateObj = new Date(dateInput);
      if (Number.isNaN(dateObj.getTime())) {
        return '-';
      }
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
    let dateObj;
    if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]);
        const day = Number(isoMatch[3]);
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          return '-';
        }
        const checkDate = new Date(Date.UTC(year, month - 1, day));
        if (
          checkDate.getUTCFullYear() !== year ||
          checkDate.getUTCMonth() !== month - 1 ||
          checkDate.getUTCDate() !== day
        ) {
          return '-';
        }
      }
      dateObj = new Date(trimmed);
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
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dateObj);
  } catch {
    return '-';
  }
}
