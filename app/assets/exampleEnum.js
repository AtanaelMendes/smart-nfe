import { empty } from "./utils";

const CD_REQUISICAO_CRIADA = 0;
const CD_ABERTA = 1;
const CD_CANCELADA = 5;
const CD_FECHADA = 6;
const CD_CLIENTE = 7;
const CD_CANCELADA_COM_SELECAO_SEM_CANDIDATO = 8;
const CD_CANCELADA_COM_FATURAMENTO = 9;
const CD_BLOQUEADO = 10;
const CD_COMERCIAL = 11;
const CD_PROSPECCAO = 12;

export const CD_SITUACOES_VAGA = [
    CD_REQUISICAO_CRIADA,
    CD_ABERTA,
    CD_CANCELADA,
    CD_FECHADA,
    CD_CLIENTE,
    CD_CANCELADA_COM_SELECAO_SEM_CANDIDATO,
    CD_CANCELADA_COM_FATURAMENTO,
    CD_BLOQUEADO,
    CD_COMERCIAL,
    CD_PROSPECCAO
];

export const getSituacaoVagaLabel = (cdSituacaoVaga) => {
    if (empty(cdSituacaoVaga)) {
        console.error("getSituacaoVagaLabel: cdSituacaoVaga is empty or undefined");
        return "Situação Desconhecida";
    }

    switch (Number(cdSituacaoVaga)) {
        case CD_REQUISICAO_CRIADA:
            return "Requisição Criada";
        case CD_ABERTA:
            return "Aberta";
        case CD_CANCELADA:
            return "Cancelada";
        case CD_FECHADA:
            return "Fechada";
        case CD_CLIENTE:
            return "Cliente";
        case CD_CANCELADA_COM_SELECAO_SEM_CANDIDATO:
            return "Cancelada com Seleção sem Candidato";
        case CD_CANCELADA_COM_FATURAMENTO:
            return "Cancelada com Faturamento";
        case CD_BLOQUEADO:
            return "Bloqueado";
        case CD_COMERCIAL:
            return "Comercial";
        case CD_PROSPECCAO:
            return "Prospecção";
        default:
            return "Situação Desconhecida";
    }
}

export const isVagaAberta = (cdSituacaoVaga) => {
    if (empty(cdSituacaoVaga)) {
        console.error("isVagaAberta: cdSituacaoVaga is empty or undefined");
        return false;
    };
    return [CD_ABERTA, CD_CLIENTE, CD_COMERCIAL].includes(Number(cdSituacaoVaga));
}

export const isVagaCancelada = (cdSituacaoVaga) => {
    if (empty(cdSituacaoVaga)) {
        console.error("isVagaCancelada: cdSituacaoVaga is empty or undefined");
        return false;
    };
    return [CD_CANCELADA, CD_CANCELADA_COM_SELECAO_SEM_CANDIDATO, CD_CANCELADA_COM_FATURAMENTO].includes(Number(cdSituacaoVaga));
}

export const isVagaFechada = (cdSituacaoVaga) => {
    if (empty(cdSituacaoVaga)) {
        console.error("isVagaFechada: cdSituacaoVaga is empty or undefined");
        return false;
    };
    return [CD_FECHADA, CD_BLOQUEADO].includes(Number(cdSituacaoVaga));
}

export const isVagaEmProspecao = (cdSituacaoVaga) => {
    if (empty(cdSituacaoVaga)) {
        console.error("isVagaEmProspecao: cdSituacaoVaga is empty or undefined");
        return false;
    };
    return [CD_PROSPECCAO].includes(Number(cdSituacaoVaga));
}

export const isVagaEmRequisicaoCriada = (cdSituacaoVaga) => {
    if (empty(cdSituacaoVaga)) {
        console.error("isVagaEmRequisicaoCriada: cdSituacaoVaga is empty or undefined");
        return false;
    };
    return [CD_REQUISICAO_CRIADA].includes(Number(cdSituacaoVaga));
}