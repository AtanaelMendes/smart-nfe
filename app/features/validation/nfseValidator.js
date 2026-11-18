/**
 * SmartNFe — Validador Estrutural de NFS-e (Padrão Nacional e MEI)
 *
 * Avalia aspectos cadastrais, tributários e de valores para prestação de serviços.
 * Regras cruciais:
 * - Não permite e não exige NCM ou CFOP para serviços
 * - Valida Prestador, Tomador (conforme exigibilidade), Código de Tributação Nacional e Competência
 * - Considera particularidades do MEI (dispensa de retenções federais automáticas no Simples Nacional)
 */

import { cleanDecimalString, decimalCompare } from '../../lib/calculations/decimal.js';

export function validateNFSe(document) {
  const issues = [];

  if (!document) {
    return {
      isValid: false,
      hasErrors: true,
      hasWarnings: false,
      issues: [
        {
          id: 'nfse-doc-null',
          severity: 'error',
          field: 'document',
          title: 'Documento ausente',
          message: 'O documento não foi inicializado corretamente.',
          tab: 'prestador',
        },
      ],
      summary: { total: 1, errors: 1, warnings: 0, infos: 0 },
    };
  }

  const isMei = Boolean(document.isMei || document.prestador?.isMei);

  // 1. Prestador
  if (!document.prestadorId && !document.prestador?.cnpj) {
    issues.push({
      id: 'nfse-prestador-missing',
      severity: 'error',
      field: 'prestadorId',
      title: 'Prestador de Serviços não informado',
      message: 'Selecione a empresa prestadora emitente da NFS-e.',
      tab: 'prestador',
    });
  }

  // 2. Tomador
  const tomador = document.tomador || {};
  if (!tomador.nomeOuRazao && !tomador.nome) {
    // Para MEI no padrão nacional, o tomador é opcional apenas em situações muito específicas de consumidor final não identificado, mas para prestação de TI/B2B é obrigatório
    if (!isMei) {
      issues.push({
        id: 'nfse-tomador-missing',
        severity: 'error',
        field: 'tomador.nomeOuRazao',
        title: 'Tomador do Serviço obrigatório',
        message: 'Para empresas fora do regime simplificado de consumidor final, o tomador deve ser identificado.',
        tab: 'tomador',
      });
    } else {
      issues.push({
        id: 'nfse-tomador-mei-warning',
        severity: 'warning',
        field: 'tomador.nomeOuRazao',
        title: 'Tomador não identificado no rascunho',
        message: 'Recomenda-se identificar o tomador do serviço para geração do espelho oficial da NFS-e.',
        tab: 'tomador',
      });
    }
  }

  // Validação de documento do tomador se preenchido
  if (tomador.nomeOuRazao && tomador.tipoPessoa !== 'ESTRANGEIRO') {
    const docClean = (tomador.documento || '').replace(/\D/g, '');
    if (docClean && docClean.length !== 11 && docClean.length !== 14) {
      issues.push({
        id: 'nfse-tomador-doc-invalid',
        severity: 'error',
        field: 'tomador.documento',
        title: 'CPF/CNPJ do Tomador inválido',
        message: 'O documento do tomador deve possuir 11 dígitos (CPF) ou 14 dígitos (CNPJ).',
        tab: 'tomador',
      });
    }
  }

  // 3. Serviço
  const servico = document.servico || {};
  if (!servico.descricao || !servico.descricao.trim()) {
    issues.push({
      id: 'nfse-servico-desc-missing',
      severity: 'error',
      field: 'servico.descricao',
      title: 'Descrição do Serviço não informada',
      message: 'A discriminação detalhada dos serviços prestados é obrigatória.',
      tab: 'servico',
    });
  }

  if (!servico.codigoTributacaoNacional || !servico.codigoTributacaoNacional.trim()) {
    issues.push({
      id: 'nfse-servico-trib-missing',
      severity: 'error',
      field: 'servico.codigoTributacaoNacional',
      title: 'Código de Tributação Nacional ausente',
      message: 'Selecione o código de tributação nacional da NFS-e (ex: 01.01.01).',
      tab: 'servico',
    });
  }

  // Competência
  if (!document.competencia || !document.competencia.trim()) {
    issues.push({
      id: 'nfse-competencia-missing',
      severity: 'error',
      field: 'competencia',
      title: 'Competência do serviço não informada',
      message: 'Informe o mês/ano de competência da prestação (ex: 11/2026).',
      tab: 'servico',
    });
  }

  // 4. Valores
  const valores = document.valores || {};
  const vBrutoClean = cleanDecimalString(valores.valorBruto || '0');
  if (decimalCompare(vBrutoClean, '0.00') <= 0) {
    issues.push({
      id: 'nfse-valor-bruto-zero',
      severity: 'error',
      field: 'valores.valorBruto',
      title: 'Valor dos Serviços deve ser maior que zero',
      message: `O valor bruto informado (${valores.valorBruto || '0'}) deve ser estritamente positivo.`,
      tab: 'valores',
    });
  }

  // Regra de segurança tributária MEI:
  if (isMei && valores.issRetido) {
    issues.push({
      id: 'nfse-mei-iss-retido-alert',
      severity: 'warning',
      field: 'valores.issRetido',
      title: 'Retenção de ISS em prestador MEI',
      message: 'Prestadores MEI recolhem o ISS em taxa fixa mensal através do DAS-MEI. Confirme se há exigência legal específica para retenção na fonte.',
      tab: 'valores',
    });
  }

  // Garantia estrutural: Impedir NCM ou CFOP em NFS-e
  if (document.itens || document.ncm || document.cfop || servico.ncm || servico.cfop) {
    issues.push({
      id: 'nfse-no-merchandise-fields',
      severity: 'error',
      field: 'servico',
      title: 'Campos mercantis inválidos em serviço',
      message: 'NFS-e de serviços não admite campos de mercadoria (NCM ou CFOP). Utilize exclusivamente o código de tributação de serviços.',
      tab: 'servico',
    });
  }

  // Informação regulatória
  issues.push({
    id: 'nfse-disclaimer',
    severity: 'info',
    field: 'geral',
    title: 'Ambiente Demonstrativo — Emissor Nacional',
    message: 'Esta validação prepara o rascunho da NFS-e. A geração do XML nacional e transmissão ao portal gov.br ocorrerão na futura integração com o backend.',
    tab: 'geral',
  });

  const hasErrors = issues.some((i) => i.severity === 'error');
  const hasWarnings = issues.some((i) => i.severity === 'warning');

  return {
    isValid: !hasErrors,
    hasErrors,
    hasWarnings,
    issues,
    summary: {
      total: issues.length,
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      infos: issues.filter((i) => i.severity === 'info').length,
    },
  };
}

export default validateNFSe;
