/**
 * SmartNFe — Mapeador de NFS-e Nacional para o Contrato de Documento Fiscal
 *
 * Normaliza os dados extraídos de uma NFS-e para o contrato usado pelos
 * editores e pela listagem de documentos, preservando o bloco original em
 * `nfse`/`original` e os valores efetivamente emitidos.
 *
 * Não insere serviços no `invoiceRepository` (que é de mercadorias); NFS-e é
 * tratada como documento (documentType: 'NFSE').
 */

import { decimalAdd, decimalCompare } from '../../lib/calculations/decimal.js';

const RET_COFINS_NAO_RETIDO = new Set(['', '0', '1']);

function nOrZero(value) {
  const s = String(value ?? '').trim();
  return s === '' ? '0.00' : s;
}

function pickDocumento(entity) {
  if (!entity) return '';
  return entity.documento || entity.cnpj || entity.cpf || entity.nif || '';
}

/**
 * Converte os dados do parser em um documento fiscal de serviço.
 * @param {Object} extracted Dados retornados por parseNFSeXml().data
 * @returns {Object}
 */
export function mapNFSeToDocument(extracted) {
  if (!extracted || typeof extracted !== 'object') {
    throw new Error('Dados da NFS-e não fornecidos ou inválidos para mapeamento.');
  }

  const {
    chaveAcesso,
    infNFSeId,
    nNFSe,
    nDFSe,
    cStat,
    dhProc,
    ambGer,
    tpEmis,
    procEmi,
    verAplic,
    xLocEmi,
    xLocPrestacao,
    cLocIncid,
    xLocIncid,
    xTribNac,
    xNBS,
    emit,
    dps,
    prest,
    toma,
    serv,
    valoresInf,
    valoresDps,
    ibsCbsApurado,
    ibsCbsDeclarado,
    assinatura,
  } = extracted;

  const prestador = prest || emit || {};
  const prestadorDoc = pickDocumento(prestador);
  const emittedDoc = pickDocumento(emit);
  const tomadorDoc = pickDocumento(toma);

  const vServ = nOrZero(valoresDps?.vServ);
  const vDR = nOrZero(valoresDps?.vDR || valoresInf?.vCalcDR);
  const vRetIRRF = nOrZero(valoresDps?.vRetIRRF);
  const vRetCSLL = nOrZero(valoresDps?.vRetCSLL);
  const vTotalRet = nOrZero(valoresInf?.vTotalRet);
  const vLiq = nOrZero(valoresInf?.vLiq || vServ);

  const piscofins = valoresDps?.piscofins;
  const indicatorRetido = piscofins
    ? !RET_COFINS_NAO_RETIDO.has(String(piscofins.tpRetPisCofins ?? '').trim())
    : false;

  // O total retido informado na NFS-e é a fonte autoritativa. Se ele corresponde
  // apenas a IRRF + CSLL, PIS/COFINS foram calculados mas não retidos, mesmo que
  // existam no XML. Só marcamos retenção de PIS/COFINS quando o total excede
  // IRRF + CSLL ou quando não há total retido e o indicador aponta retenção.
  const irCsllTotal = decimalAdd(vRetIRRF, vRetCSLL, 2);
  const hasRetTotal = decimalCompare(vTotalRet, '0') > 0;
  const pisCofinsRetido = hasRetTotal
    ? decimalCompare(vTotalRet, irCsllTotal) > 0
    : indicatorRetido;

  // Retenções que efetivamente reduzem o líquido. PIS/COFINS só entram quando
  // realmente retidos — nunca por simples presença no XML.
  const retencoesFederais = {
    pis: pisCofinsRetido ? nOrZero(piscofins.vPis) : '0.00',
    cofins: pisCofinsRetido ? nOrZero(piscofins.vCofins) : '0.00',
    inss: '0.00',
    ir: vRetIRRF,
    csll: vRetCSLL,
  };

  const id = `nfse-${chaveAcesso || String(nNFSe || Date.now())}`;
  const nowIso = new Date().toISOString();

  const emitente = {
    razaoSocial: prestador.razaoSocial || '',
    cnpj: emit?.cnpj || prestador.cnpj || '',
    cpf: emit?.cpf || prestador.cpf || '',
    documento: emittedDoc || prestadorDoc,
    inscricaoMunicipal: prestador.inscricaoMunicipal || '',
    uf: prestador.endereco?.uf || '',
    municipio: xLocEmi || '',
  };

  const tomador = {
    nomeOuRazao: toma?.razaoSocial || '',
    nome: toma?.razaoSocial || '',
    documento: tomadorDoc,
    cnpj: toma?.cnpj || '',
    cpf: toma?.cpf || '',
    tipoPessoa: toma?.cnpj ? 'JURIDICA' : toma?.cpf ? 'FISICA' : toma?.nif ? 'ESTRANGEIRO' : 'NAO_INFORMADO',
    endereco: toma?.endereco || null,
    email: toma?.email || '',
    telefone: toma?.telefone || '',
  };

  return {
    id,
    documentType: 'NFSE',
    origin: 'XML',
    tipoFiscal: 'NFSE',
    layout: 'NFSE_NACIONAL',
    versao: extracted.versao,
    status: 'importado',
    isDemo: false,
    isRealImport: true,
    titulo: `NFS-e ${nNFSe || chaveAcesso} - ${prestador.razaoSocial || 'Prestador'}`,
    numero: nNFSe || '',
    numeroPrevisto: nNFSe || '',
    serie: dps?.serie || '',
    chaveAcesso: chaveAcesso || '',
    chaveAcessoFormatada: infNFSeId || '',
    nDFSe: nDFSe || '',
    competencia: dps?.dCompet || '',
    dataEmissao: dps?.dhEmi || '',
    dataProcessamento: dhProc || '',
    prestadorId: null,
    prestador: {
      razaoSocial: prestador.razaoSocial || '',
      cnpj: prestador.cnpj || '',
      cpf: prestador.cpf || '',
      documento: prestadorDoc,
      inscricaoMunicipal: prestador.inscricaoMunicipal || '',
      endereco: prestador.endereco || null,
      telefone: prestador.telefone || '',
      email: prestador.email || '',
      regimeTributario: prestador.regimeTributario || {},
    },
    emitente,
    tomador,
    servico: {
      cTribNac: serv?.cTribNac || '',
      descricaoNacional: xTribNac || '',
      cNBS: serv?.cNBS || '',
      descricaoNBS: xNBS || '',
      descricao: serv?.xDescServ || '',
      cLocPrestacao: serv?.cLocPrestacao || '',
      xLocPrestacao: xLocPrestacao || '',
      cLocIncid: cLocIncid || '',
      xLocIncid: xLocIncid || '',
    },
    valores: {
      valorBruto: vServ,
      valorDescontoIncondicionado: '0.00',
      valorDescontoCondicionado: '0.00',
      valorDeducoes: vDR,
      valorBaseISS: nOrZero(valoresInf?.vBC),
      valorDeducaoCalculada: nOrZero(valoresInf?.vCalcDR),
      aliquotaISS: nOrZero(valoresInf?.pAliqAplic),
      valorISS: nOrZero(valoresInf?.vISSQN),
      valorIssRetido: '0.00',
      valorTotalRetido: vTotalRet,
      valorLiquido: vLiq,
      tribISSQN: valoresDps?.tribISSQN || '',
      tpRetISSQN: valoresDps?.tpRetISSQN || '',
      retencoesFederais,
      tributosFederais: piscofins
        ? {
            cst: piscofins.cst || '',
            base: piscofins.vBC || '',
            aliquotaPis: piscofins.pPis || '',
            aliquotaCofins: piscofins.pCofins || '',
            valorPis: piscofins.vPis || '',
            valorCofins: piscofins.vCofins || '',
            tpRetPisCofins: piscofins.tpRetPisCofins || '',
            retido: pisCofinsRetido,
          }
        : null,
      preservarValoresOriginais: true,
    },
    tributos: {
      iss: {
        base: nOrZero(valoresInf?.vBC),
        aliquota: nOrZero(valoresInf?.pAliqAplic),
        valor: nOrZero(valoresInf?.vISSQN),
        tribISSQN: valoresDps?.tribISSQN || '',
        tpRetISSQN: valoresDps?.tpRetISSQN || '',
      },
      federais: {
        pis: piscofins?.vPis || '',
        cofins: piscofins?.vCofins || '',
        irrf: vRetIRRF,
        csll: vRetCSLL,
      },
      totaisAproximados: valoresDps?.vTotTrib || null,
      percentuaisAproximados: valoresDps?.pTotTrib || null,
    },
    ibsCbs: {
      declarado: ibsCbsDeclarado,
      apurado: ibsCbsApurado,
    },
    assinatura,
    ambienteGerador: ambGer || '',
    tipoEmissao: tpEmis || '',
    processoEmissao: procEmi || '',
    aplicacaoGeradora: verAplic || '',
    cStat: cStat || '',
    nfse: extracted,
    original: {
      infNFSeId,
      versao: extracted.versao,
      cStat,
      dhProc,
      competencia: dps?.dCompet,
      valoresEmitidos: {
        vServ,
        vDR,
        vBC: nOrZero(valoresInf?.vBC),
        pAliqAplic: nOrZero(valoresInf?.pAliqAplic),
        vISSQN: nOrZero(valoresInf?.vISSQN),
        vTotalRet,
        vLiq,
      },
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export default mapNFSeToDocument;
