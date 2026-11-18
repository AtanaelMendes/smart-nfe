/**
 * SmartNFe — Validador Estrutural de NF-e Manual (Modelo 55)
 *
 * Avalia aspectos estruturais, cadastrais e matemáticos básicos.
 * Identifica problemas como:
 * - 'error': Impeditivo para fechamento do rascunho
 * - 'warning': Alerta de boas práticas fiscais
 * - 'info': Informação contextual
 */

import { cleanDecimalString, decimalCompare } from '../../lib/calculations/decimal.js';

export function validateNFe(document) {
  const issues = [];

  if (!document) {
    return [
      {
        id: 'nfe-doc-null',
        severity: 'error',
        field: 'document',
        title: 'Documento ausente',
        message: 'O documento não foi inicializado corretamente.',
        tab: 'identificacao',
      },
    ];
  }

  // 1. Identificação e Emitente
  if (!document.emitenteId && !document.emitente?.cnpj) {
    issues.push({
      id: 'nfe-emitente-missing',
      severity: 'error',
      field: 'emitenteId',
      title: 'Emitente não selecionado',
      message: 'Selecione a empresa emitente responsável pela emissão da NF-e.',
      tab: 'identificacao',
    });
  }

  if (!document.naturezaOperacao || !document.naturezaOperacao.trim()) {
    issues.push({
      id: 'nfe-natureza-missing',
      severity: 'error',
      field: 'naturezaOperacao',
      title: 'Natureza da Operação não informada',
      message: 'A natureza da operação é obrigatória (ex: VENDA DE MERCADORIA, EXPORTACAO).',
      tab: 'identificacao',
    });
  }

  // 2. Destinatário
  const dest = document.destinatario || {};
  if (!dest.nomeOuRazao && !dest.nome) {
    issues.push({
      id: 'nfe-dest-nome-missing',
      severity: 'error',
      field: 'destinatario.nomeOuRazao',
      title: 'Destinatário não informado',
      message: 'Informe a razão social ou nome do destinatário da mercadoria.',
      tab: 'destinatario',
    });
  }

  const isExterior =
    document.destinoOperacao === '3' ||
    dest.tipoPessoa === 'ESTRANGEIRO' ||
    (Boolean(dest.pais) && dest.pais.toUpperCase() !== 'BRASIL') ||
    (Boolean(dest.paisCodigo) && dest.paisCodigo !== '1058' && dest.paisCodigo !== 'BR');
  if (!isExterior) {
    const docClean = (dest.documento || '').replace(/\D/g, '');
    if (!docClean || (docClean.length !== 11 && docClean.length !== 14)) {
      issues.push({
        id: 'nfe-dest-doc-invalid',
        severity: 'error',
        field: 'destinatario.documento',
        title: 'CPF/CNPJ do destinatário inválido',
        message: 'Para operações nacionais, informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.',
        tab: 'destinatario',
      });
    }
  } else {
    if (!dest.documento && !dest.idEstrangeiro) {
      issues.push({
        id: 'nfe-dest-foreign-id',
        severity: 'warning',
        field: 'destinatario.documento',
        title: 'ID fiscal estrangeiro não preenchido',
        message: 'Para destinatários do exterior, é recomendado preencher o ID Fiscal internacional (VAT/Tax ID).',
        tab: 'destinatario',
      });
    }
  }

  // 3. Produtos / Itens
  const itens = Array.isArray(document.itens) ? document.itens : [];
  if (itens.length === 0) {
    issues.push({
      id: 'nfe-itens-empty',
      severity: 'error',
      field: 'itens',
      title: 'Nenhum produto adicionado',
      message: 'A NF-e deve conter ao menos um produto ou mercadoria.',
      tab: 'produtos',
    });
  } else {
    itens.forEach((it, index) => {
      const idxDisplay = it.item || index + 1;

      // Descrição
      if (!it.descricao || !it.descricao.trim()) {
        issues.push({
          id: `nfe-item-${it.itemId || index}-desc`,
          severity: 'error',
          field: `itens[${index}].descricao`,
          title: `Produto #${idxDisplay}: Descrição vazia`,
          message: `O produto da linha #${idxDisplay} deve possuir uma descrição clara.`,
          tab: 'produtos',
          itemId: it.itemId,
        });
      }

      // NCM
      const ncmClean = (it.ncm || '').replace(/\D/g, '');
      if (!ncmClean || ncmClean.length !== 8) {
        issues.push({
          id: `nfe-item-${it.itemId || index}-ncm`,
          severity: 'error',
          field: `itens[${index}].ncm`,
          title: `Produto #${idxDisplay}: NCM inválido (${it.ncm || 'vazio'})`,
          message: 'O NCM deve conter exatamente 8 dígitos numéricos.',
          tab: 'produtos',
          itemId: it.itemId,
        });
      }

      // CFOP
      const cfopClean = (it.cfop || '').replace(/\D/g, '');
      if (!cfopClean || cfopClean.length !== 4) {
        issues.push({
          id: `nfe-item-${it.itemId || index}-cfop`,
          severity: 'error',
          field: `itens[${index}].cfop`,
          title: `Produto #${idxDisplay}: CFOP inválido (${it.cfop || 'vazio'})`,
          message: 'O CFOP deve conter exatamente 4 dígitos numéricos.',
          tab: 'produtos',
          itemId: it.itemId,
        });
      } else {
        // Coerência entre CFOP e Destino da Operação
        if (isExterior && !cfopClean.startsWith('7')) {
          issues.push({
            id: `nfe-item-${it.itemId || index}-cfop-exterior`,
            severity: 'error',
            field: `itens[${index}].cfop`,
            title: `Produto #${idxDisplay}: CFOP incompatível com Exterior`,
            message: `Para destino no Exterior, o CFOP deve iniciar com 7 (encontrado: ${it.cfop}).`,
            tab: 'produtos',
            itemId: it.itemId,
          });
        } else if (!isExterior && cfopClean.startsWith('7')) {
          issues.push({
            id: `nfe-item-${it.itemId || index}-cfop-interior`,
            severity: 'error',
            field: `itens[${index}].cfop`,
            title: `Produto #${idxDisplay}: CFOP 7xxx incompatível com operação interna/interestadual`,
            message: `CFOP iniciado por 7 é exclusivo para exportação/exterior (encontrado: ${it.cfop}).`,
            tab: 'produtos',
            itemId: it.itemId,
          });
        }
      }

      // Unidade
      if (!it.unidade || !it.unidade.trim()) {
        issues.push({
          id: `nfe-item-${it.itemId || index}-unidade`,
          severity: 'error',
          field: `itens[${index}].unidade`,
          title: `Produto #${idxDisplay}: Unidade comercial não informada`,
          message: 'Informe a unidade de medida (ex: UN, PC, KG, TON).',
          tab: 'produtos',
          itemId: it.itemId,
        });
      }

      // Quantidade
      const qtdClean = cleanDecimalString(it.quantidade || '0');
      if (decimalCompare(qtdClean, '0.0000') <= 0) {
        issues.push({
          id: `nfe-item-${it.itemId || index}-qtd-zero`,
          severity: 'error',
          field: `itens[${index}].quantidade`,
          title: `Produto #${idxDisplay}: Quantidade deve ser maior que zero`,
          message: `A quantidade informada (${it.quantidade || '0'}) deve ser estritamente positiva.`,
          tab: 'produtos',
          itemId: it.itemId,
        });
      }

      // Valor unitário
      const vuClean = cleanDecimalString(it.valorUnitario || '0');
      if (decimalCompare(vuClean, '0.00') <= 0) {
        issues.push({
          id: `nfe-item-${it.itemId || index}-vu-zero`,
          severity: 'warning',
          field: `itens[${index}].valorUnitario`,
          title: `Produto #${idxDisplay}: Valor unitário zerado`,
          message: 'Verifique se a operação permite valor unitário zerado (ex: remessa para demonstração ou brinde).',
          tab: 'produtos',
          itemId: it.itemId,
        });
      }
    });
  }

  // 4. Totais
  const vTot = cleanDecimalString(document.totais?.valorTotalNota || '0');
  if (decimalCompare(vTot, '0.00') <= 0) {
    issues.push({
      id: 'nfe-tot-zero',
      severity: 'error',
      field: 'totais.valorTotalNota',
      title: 'Valor total da NF-e está zerado',
      message: 'O valor total previsto da NF-e deve ser maior que zero.',
      tab: 'totais',
    });
  }

  // Aviso legal importante
  issues.push({
    id: 'nfe-disclaimer',
    severity: 'info',
    field: 'geral',
    title: 'Ambiente Demonstrativo SmartNFe',
    message: 'Esta validação verifica a coerência estrutural e matemática. A emissão fiscal definitiva dependerá da autorização da SEFAZ na etapa de integração.',
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

export default validateNFe;
