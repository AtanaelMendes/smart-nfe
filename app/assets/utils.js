import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function isJoinville(cdUnidade) {
    if (empty(cdUnidade)) {
        console.error("isJoinville: cdUnidade is empty or undefined utils.js");
    };
    const unidadesJoinville = [1, 101, 201, 19, 119, 219, 330, 145, 45, 430];
    return unidadesJoinville.includes(Number(cdUnidade));
}

export function numberToReais(valor) {
    return parseFloat(valor).toLocaleString("pt-BR", {
        currency: "BRL",
        minimumFractionDigits: 2,
    });
}

export function nl2br(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/\n/g, '<br />');
}

export function getHorasEntreDatas(dt_inicio, dt_fim) {

    if (empty(dt_inicio) || empty(dt_fim)) {
        return "00:00";
    }

    // Datas de exemplo
    const inicio = moment(dt_inicio);
    const fim = moment(dt_fim);

    // Diferença em minutos
    const duration = moment.duration(fim.diff(inicio));

    // Formatando para "h:mm"
    const horas = Math.floor(duration.asHours());
    const minutos = duration.minutes();

    const tempo = `${horas}:${minutos.toString().padStart(2, '0')}`;

    return tempo;
}

/**
 * Formata qualquer entrada de data válida para o formato DD/MM/YYYY,
 * ajustando para o fuso horário local.
 *
 * @param {Date|string|number} input - A data a ser formatada. Pode ser um objeto Date,
 *                                     uma string de data, ou um timestamp em milissegundos.
 * @returns {string|null} A data formatada como DD/MM/YYYY ou null se a entrada for inválida.
 *
 * @description
 * Esta função aceita várias formas de entrada de data e tenta convertê-las para o formato DD/MM/YYYY.
 * Ela lida com objetos Date, strings de data em vários formatos, e timestamps numéricos.
 * A função ajusta a data para o fuso horário local para evitar problemas com datas UTC.
 *
 * @example
 * formatAnyDateInDDMMYYYY("2024-09-24");          // retorna "24/09/2024"
 * formatAnyDateInDDMMYYYY("2024-09-25T00:00:00"); // retorna "25/09/2024"
 * formatAnyDateInDDMMYYYY(new Date("2024-09-24")); // retorna "24/09/2024"
 * formatAnyDateInDDMMYYYY("data inválida");       // retorna null
 */
export function formatAnyDateInDDMMYYYY(input) {
    let data;

    if (input instanceof Date) {
        data = new Date(input.getTime());
    } else if (typeof input === "string") {
        input = input.replace(/\([^)]*\)/g, "").trim();

        // Verifica se a string está no formato "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm:ss"
        if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/.test(input)) {
            // Adiciona a hora local se não estiver presente
            if (input.length === 10) {
                input += "T00:00:00";
            }
            data = new Date(input);
        } else {
            let timestamp = Date.parse(input);
            if (!isNaN(timestamp)) {
                data = new Date(timestamp);
            } else {
                let numeros = input.match(/\d+/g);
                if (numeros && numeros.length >= 3) {
                    data = new Date(numeros[2], numeros[1] - 1, numeros[0]);
                }
            }
        }
    } else if (typeof input === "number") {
        data = new Date(input);
    }

    if (!(data instanceof Date) || isNaN(data.getTime())) {
        return null;
    }

    // Ajusta para o fuso horário local
    const dataLocal = new Date(data.getTime() - data.getTimezoneOffset() * 60000);

    const dia = String(dataLocal.getDate()).padStart(2, "0");
    const mes = String(dataLocal.getMonth() + 1).padStart(2, "0");
    const ano = dataLocal.getFullYear();

    return `${dia}/${mes}/${ano}`;
}

/**
 * Tenta converter uma string de data para o formato YYYY-MM-DD.
 *
 * @param {string} dateString - A string de data a ser convertida.
 * @returns {string|null} A data formatada como YYYY-MM-DD se a conversão for bem-sucedida, ou null se falhar.
 *
 * @description
 * Esta função aceita uma variedade de formatos de data comuns e tenta convertê-los para o formato YYYY-MM-DD.
 * Os formatos aceitos incluem:
 * - YYYY-MM-DD
 * - DD/MM/YYYY
 * - DD-MM-YYYY
 * - YYYY/MM/DD
 * - DD/MMM/YYYY (onde MMM é a abreviação do mês em português)
 * - DD-MMM-YYYY
 *
 * Se a string não puder ser reconhecida como uma data válida, a função retorna null.
 *
 * @example
 * formatToYYYYMMDD("2023-05-15");     // retorna "2023-05-15"
 * formatToYYYYMMDD("15/05/2023");     // retorna "2023-05-15"
 * formatToYYYYMMDD("15-Mai-2023");    // retorna "2023-05-15"
 * formatToYYYYMMDD("data inválida");  // retorna null
 */
export function formatToYYYYMMDD(dateString) {
    // Tenta criar um objeto Date a partir da string fornecida
    let date = new Date(dateString);

    // Verifica se a data é válida
    if (isNaN(date.getTime())) {
        // Se não for válida, tenta alguns formatos comuns
        const formats = [
            /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/, // DD/MM/YYYY ou DD-MM-YYYY
            /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/, // YYYY/MM/DD ou YYYY-MM-DD
            /^(\d{1,2})[/-](\w{3})[/-](\d{4})$/, // DD/MMM/YYYY ou DD-MMM-YYYY
        ];

        for (let format of formats) {
            let parts = dateString.match(format);
            if (parts) {
                if (format === formats[0]) {
                    date = new Date(parts[3], parts[2] - 1, parts[1]);
                } else if (format === formats[1]) {
                    date = new Date(parts[1], parts[2] - 1, parts[3]);
                } else {
                    const monthNames = [
                        "jan",
                        "fev",
                        "mar",
                        "abr",
                        "mai",
                        "jun",
                        "jul",
                        "ago",
                        "set",
                        "out",
                        "nov",
                        "dez",
                    ];
                    let month = monthNames.indexOf(parts[2].toLowerCase());
                    if (month !== -1) {
                        date = new Date(parts[3], month, parts[1]);
                    }
                }
                break;
            }
        }
    }

    // Se ainda não for uma data válida, retorna null
    if (isNaN(date.getTime())) {
        return null;
    }

    // Formata a data para YYYY-MM-DD
    return (
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0")
    );
}

/**
 * @description Função para formatar data no formato dd/mm/yyyy a partir de uma string ou objeto Date
 *
 * @deprecated Usar date-fns para manipulação de datas
 */
export function formatarDataDDMMYYYY(data) {
    if (!data) return "";

    let formatDDMMYYYY = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/;

    // Verifica se a data corresponde ao formato dd/mm/yyyy
    if (formatDDMMYYYY.test(data)) {
        return data;
    }

    const parts = data.split("-");
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0"); // Mês começa de zero
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

/**
 * Função para pegar primeiro ou último dia do mês
 * @returns {Date}
 * @param {boolean} isFirstDay
 */
export function getMonthDay(isFirstDay) {
    let date = new Date();
    let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return isFirstDay ? firstDay : lastDay;
}

/**
 * Verifica se um valor é considerado "vazio" de acordo com diferentes tipos de dados
 * @param {*} item - O valor a ser verificado
 * @returns {boolean} - true se o valor for considerado vazio, false caso contrário
 */
export function empty(item) {
    // Verificações iniciais para valores falsy
    if (item === null || item === undefined) {
        return true;
    }

    // Verifica o tipo do item
    switch (typeof item) {
        case "string":
            // String vazia ou apenas espaços em branco
            return item.trim() === "";

        case "number":
            // NaN é considerado vazio, mas zero não (pode ser um valor válido)
            return Number.isNaN(item);

        case "boolean":
            // Booleanos nunca são considerados vazios (false é um valor válido)
            return false;

        case "object":
            // Null já foi tratado acima
            if (item === null) {
                return true;
            }

            // Arrays
            if (Array.isArray(item)) {
                return item.length === 0;
            }

            // Datas
            if (item instanceof Date) {
                return !item.getTime() || Number.isNaN(item.getTime());
            }

            // Set e Map
            if (item instanceof Set || item instanceof Map) {
                return item.size === 0;
            }

            // Objetos normais - verifica se tem propriedades próprias
            return Object.keys(item).length === 0;

        case "function":
            // Funções nunca são consideradas vazias
            return false;

        case "symbol":
            // Symbols nunca são considerados vazios
            return false;

        default:
            // Para tipos desconhecidos, considera vazio se falsy
            return !item;
    }
}

function parseCondition(condition) {
    const [field, typeValue] = condition.split("|");
    const [type, value] = typeValue.split(":");

    let parsedValue;
    switch (type) {
        case "bool":
            parsedValue = value === "true";
            break;
        case "number":
            parsedValue = Number(value);
            break;
        case "notEmpty":
            parsedValue = value;
            break;
        default:
            parsedValue = value;
    }

    return { field, parsedValue, type };
}

export function validateForm(formValid, setFormValid, formData, toaster) {
    let fields = Object.keys(formValid);
    let hasErrors = false;

    for (const field of fields) {
        if (formValid[field].hasOwnProperty("ignoreItem") && formValid[field].ignoreItem) {
            continue;
        }

        if (formValid[field].hasOwnProperty("dependsOn")) {
            let allDependenciesMet = true;
            for (const condition of formValid[field].dependsOn) {
                const { field: depField, parsedValue, type } = parseCondition(condition);
                if (type === "notEmpty") {
                    allDependenciesMet = !empty(formData[depField]);
                    if (allDependenciesMet) continue;
                }

                if (formData[depField] !== parsedValue) {
                    allDependenciesMet = false;
                }
            }
            if (!allDependenciesMet) continue;
        }

        if (!empty(formData[field])) {
            if (setFormValid) {
                setFormValid((prev) => ({ ...prev, [field]: { ...prev[field], error: false }}));
            }
            continue;
        }

        if (typeof toaster === "function") {
            toaster.error(
                formValid[field]?.errorMsg || "Um campo ainda é requerido para realizar esta ação"
            );
        }

        if (setFormValid) {
            setFormValid((prev) => ({
                ...prev,
                [field]: { ...prev[field], error: true },
            }));
        }

        hasErrors = true;
    }
    return hasErrors;
}

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Truncates a string and adds an ellipsis ("...") if it exceeds the specified length.
 *
 * @param {string} str - The string to be truncated.
 * @param {number} length - The maximum length of the truncated string.
 * @returns {string} The truncated string with an ellipsis if it exceeds the specified length.
 */
export function ellipsize(str, length = 12) {
    return str.length > length ? str.slice(0, length) + "..." : str;
}

export function unmaskCpf(cpf) {
    return cpf.replace(/[.-]/g, "");
}

export function handleNaN(value) {
    if (isNaN(value) || typeof value !== "number") {
        return 0;
    }
    return value;
}

/**
 * Formata um CNPJ para o padrão 99.999.999/9999-99.
 * Aceita string com ou sem máscara, ou número.
 * Retorna string formatada ou original se não for possível formatar.
 * @param {string|number} cnpj
 * @returns {string}
 */
export function formatCnpj(cnpj) {
    if (empty(cnpj)) return "";
    let digits = String(cnpj).replace(/\D/g, "");
    if (digits.length !== 14) return cnpj;
    return digits.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
    );
}

/**
 * Removes mask characters from a telephone number string.
 *
 * @param {string} telefone - The masked telephone number.
 * @returns {string} - The unmasked telephone number.
 */
export const unmaskTelefone = (telefone) => {
    return telefone.replace(/[()\s-+]/g, "");
};

export const getFloat = (value, decimais) => {
    if (empty(value)) return 0;
    value = parseFloat(value);
    if (isNaN(value)) return 0;
    return value.toFixed(decimais || 2);
};

export const getBreakpoint = () => {
    if (window.matchMedia('(min-width: 1560px)').matches) return 'xl';
    if (window.matchMedia('(min-width: 1024px)').matches) return 'lg';
    if (window.matchMedia('(min-width: 768px)').matches) return 'md';
    return 'sm';
};

export const isSm = () => getBreakpoint() === 'sm';
export const isMd = () => getBreakpoint() === 'md';
export const isLg = () => getBreakpoint() === 'lg';
export const isXl = () => getBreakpoint() === 'xl';


export const isBelowXl = () => getBreakpoint() !== 'xl';
export const isBelowLg = () => getBreakpoint() === 'sm' || getBreakpoint() === 'md';
export const isBelowMd = () => getBreakpoint() === 'sm';


export const numberBetween = (value, min, max) => {
    if (Number.isNaN(Number(value)) || Number.isNaN(Number(min)) || Number.isNaN(Number(max))) return false;
    return Number(value) >= Number(min) && Number(value) <= Number(max);
};

/**
 * Valida se o valor é um número (int ou float). Se não for, retorna 0.
 * Suporta valores formatados em reais (ex: 9.999,99, R$ 1.234,56)
 * @param {*} value
 * @returns {number}
 */
export function toNumber(value) {
    // console.log("antes toNumber", value);
    
    // Se já é um número válido, retorna diretamente
    if (typeof value === 'number' && Number.isFinite(value)) {
        console.log("depois toNumber (número válido)", value);
        return value;
    }
    
    // Se não é string, tenta converter para string primeiro
    if (typeof value !== 'string') {
        value = String(value);
    }
    
    // Remove espaços em branco
    value = value.trim();
    
    // Se está vazio após trim, retorna 0
    if (value === '') {
        console.log("depois toNumber (vazio)", 0);
        return 0;
    }
    
    // Remove símbolos de moeda (R$, $, etc.) e espaços
    value = value.replace(/[R$\s]/g, '');
    
    // Verifica se é formato brasileiro (pontos como separadores de milhares e vírgula como decimal)
    // Exemplos: 1.234,56 | 123.456,78 | 1.234.567,89
    const formatoBrasileiro = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/.test(value);
    
    if (formatoBrasileiro) {
        // Converte formato brasileiro para formato padrão
        // Remove pontos (separadores de milhares) e substitui vírgula por ponto
        value = value.replace(/\./g, '').replace(',', '.');
    } else {
        // Se tem vírgula mas não está no formato brasileiro, pode ser apenas vírgula decimal
        // Exemplo: 123,45 (sem separadores de milhares)
        const formatoSimples = /^-?\d+,\d+$/.test(value);
        if (formatoSimples) {
            value = value.replace(',', '.');
        }
    }
    
    const num = Number(value);
    // console.log("depois toNumber", num);
    return Number.isFinite(num) ? num : 0;
}