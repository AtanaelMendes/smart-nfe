'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faReceipt,
  faBuilding,
  faUser,
  faCoins,
  faFloppyDisk,
  faCheckDouble,
  faCircleExclamation,
  faCircleCheck,
  faBookOpen,
  faXmark,
  faArrowRight,
  faSliders,
  faBolt,
  faShieldHalved,
  faLightbulb,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import { catalogsRepository } from '@/features/catalogsRepository';
import { documentRepository } from '@/features/documentRepository';
import { validateNFSe } from '@/features/validation/nfseValidator';
import { FiscalField, FiscalSelect, FiscalGroup } from './FiscalField';
import Select from '@/components/inputs/Select';
import InputText from '@/components/inputs/InputText';
import InputTextArea from '@/components/inputs/InputTextArea';
import Checkbox from '@/components/inputs/Checkbox';
import Button from '@/components/buttons/Button';
import { formatBRL } from '@/lib/formatters';
import { cleanDecimalString, decimalAdd, decimalSubtract, decimalCompare } from '@/lib/calculations/decimal';
import { useAppContext } from '@/context/AppContext';

/* Campos de formulário do editor (labels externos + inputs compactos). */
const FORM_CLS = 'h-12';

/* Campos compactos das grades de retenções. */
const COMPACT_CLS = 'h-10 px-2.5 text-sm';

export default function ServiceInvoiceEditor({
  initialData = null,
  mode = 'create', // 'create' | 'edit'
}) {
  const router = useRouter();
  const { toast } = useAppContext();

  // Cadastros
  const [companies, setCompanies] = useState([]);
  const [persons, setPersons] = useState([]);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Identificação do Documento
  const [docId, setDocId] = useState(initialData?.id || '');
  const [titulo, setTitulo] = useState(initialData?.titulo || 'Nova NFS-e de Serviços');
  const [numeroPrevisto, setNumeroPrevisto] = useState(initialData?.numeroPrevisto || '');
  const [seriePrevista, setSeriePrevista] = useState(initialData?.seriePrevista || 'E');
  const [competencia, setCompetencia] = useState(
    initialData?.competencia ||
      `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`
  );
  const [dataPrevistaEmissao, setDataPrevistaEmissao] = useState(
    initialData?.dataPrevistaEmissao || new Date().toISOString().slice(0, 10)
  );

  // Prestador de Serviços
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialData?.prestadorId || '');
  const [prestador, setPrestador] = useState(initialData?.prestador || null);

  // Modo Simplificado MEI (ativo se prestador for MEI ou se definido no documento).
  // Documentos importados de XML abrem em modo completo para preservar retenções do emitente.
  const [modoSimplificadoMei, setModoSimplificadoMei] = useState(
    initialData?.modoSimplificadoMei !== undefined
      ? Boolean(initialData.modoSimplificadoMei)
      : (initialData?.nfse || initialData?.valores?.tributosFederais ? false : true)
  );

  // Tomador de Serviços
  const [selectedPersonId, setSelectedPersonId] = useState(initialData?.tomadorId || '');
  const [tomador, setTomador] = useState(
    initialData?.tomador || {
      tipoPessoa: 'PJ',
      documento: '',
      nomeOuRazao: '',
      uf: 'SP',
      municipio: '',
      pais: 'Brasil',
      paisCodigo: 'BR',
      email: '',
      telefone: '',
    }
  );
  const [savePersonToCatalog, setSavePersonToCatalog] = useState(false);

  // Serviço Prestado
  const [servico, setServico] = useState(
    initialData?.servico || {
      id: '',
      codigoInterno: '',
      codigoTributacaoNacional: '01.01.01',
      subitemLc116: '1.01',
      codigoMunicipal: '',
      nbs: '',
      descricao: '',
      municipioPrestacao: 'Joinville',
      ufPrestacao: 'SC',
      exigibilidadeIss: '1',
      informacoesComplementares: '',
    }
  );

  // Valores e Retenções
  const [valorBruto, setValorBruto] = useState(initialData?.valores?.valorBruto || '0.00');
  const [valorDescontoIncondicionado, setValorDescontoIncondicionado] = useState(
    initialData?.valores?.valorDescontoIncondicionado || '0.00'
  );
  const [valorDescontoCondicionado, setValorDescontoCondicionado] = useState(
    initialData?.valores?.valorDescontoCondicionado || '0.00'
  );
  const [valorDeducoes, setValorDeducoes] = useState(
    initialData?.valores?.valorDeducoes || '0.00'
  );
  const [issRetido, setIssRetido] = useState(Boolean(initialData?.valores?.issRetido));
  const [aliquotaIss, setAliquotaIss] = useState(initialData?.valores?.aliquotaIss || '2.00');
  const [valorIssRetido, setValorIssRetido] = useState(
    initialData?.valores?.valorIssRetido || '0.00'
  );

  // Retenções Federais (apenas no modo avançado)
  const [pis, setPis] = useState(initialData?.valores?.retencoesFederais?.pis || '0.00');
  const [cofins, setCofins] = useState(initialData?.valores?.retencoesFederais?.cofins || '0.00');
  const [inss, setInss] = useState(initialData?.valores?.retencoesFederais?.inss || '0.00');
  const [ir, setIr] = useState(initialData?.valores?.retencoesFederais?.ir || '0.00');
  const [csll, setCsll] = useState(initialData?.valores?.retencoesFederais?.csll || '0.00');

  // ---- Campos fiscais preservados do XML / regime / IBS-CBS ----
  const [showFiscalDetails, setShowFiscalDetails] = useState(false);

  const [regime, setRegime] = useState({
    opSimpNac:
      initialData?.prestador?.regimeTributario?.opSimpNac ||
      initialData?.nfse?.prest?.regimeTributario?.opSimpNac ||
      '',
    regApTribSN:
      initialData?.prestador?.regimeTributario?.regApTribSN ||
      initialData?.nfse?.prest?.regimeTributario?.regApTribSN ||
      '',
    regEspTrib:
      initialData?.prestador?.regimeTributario?.regEspTrib ||
      initialData?.nfse?.prest?.regimeTributario?.regEspTrib ||
      '',
  });

  const [nfseExtra, setNfseExtra] = useState({
    cTribNac: initialData?.servico?.cTribNac || initialData?.nfse?.serv?.cTribNac || '',
    descricaoNacional: initialData?.servico?.descricaoNacional || initialData?.nfse?.xTribNac || '',
    cNBS: initialData?.servico?.cNBS || initialData?.nfse?.serv?.cNBS || '',
    descricaoNBS: initialData?.servico?.descricaoNBS || initialData?.nfse?.xNBS || '',
    cLocPrestacao: initialData?.servico?.cLocPrestacao || initialData?.nfse?.serv?.cLocPrestacao || '',
    cLocIncid: initialData?.servico?.cLocIncid || initialData?.nfse?.cLocIncid || '',
    xLocIncid: initialData?.servico?.xLocIncid || initialData?.nfse?.xLocIncid || '',
    xLocPrestacao: initialData?.servico?.xLocPrestacao || initialData?.nfse?.xLocPrestacao || '',
    tribISSQN: initialData?.valores?.tribISSQN || initialData?.nfse?.valoresDps?.tribISSQN || '',
    tpRetISSQN: initialData?.valores?.tpRetISSQN || initialData?.nfse?.valoresDps?.tpRetISSQN || '',
    valorBaseISS: initialData?.valores?.valorBaseISS || initialData?.nfse?.valoresInf?.vBC || '',
    valorDeducaoCalculada:
      initialData?.valores?.valorDeducaoCalculada || initialData?.nfse?.valoresInf?.vCalcDR || '',
    valorTotalRetido:
      initialData?.valores?.valorTotalRetido || initialData?.nfse?.valoresInf?.vTotalRet || '',
  });

  const [federais, setFederais] = useState({
    cst: initialData?.valores?.tributosFederais?.cst || initialData?.nfse?.valoresDps?.piscofins?.cst || '',
    base:
      initialData?.valores?.tributosFederais?.base ||
      initialData?.nfse?.valoresDps?.piscofins?.vBC ||
      '',
    aliquotaPis: initialData?.valores?.tributosFederais?.aliquotaPis || initialData?.nfse?.valoresDps?.piscofins?.pPis || '',
    aliquotaCofins: initialData?.valores?.tributosFederais?.aliquotaCofins || initialData?.nfse?.valoresDps?.piscofins?.pCofins || '',
    valorPis: initialData?.valores?.tributosFederais?.valorPis || initialData?.nfse?.valoresDps?.piscofins?.vPis || '',
    valorCofins: initialData?.valores?.tributosFederais?.valorCofins || initialData?.nfse?.valoresDps?.piscofins?.vCofins || '',
    tpRetPisCofins:
      initialData?.valores?.tributosFederais?.tpRetPisCofins ||
      initialData?.nfse?.valoresDps?.piscofins?.tpRetPisCofins ||
      '',
    retido: Boolean(initialData?.valores?.tributosFederais?.retido),
  });

  const [transparencia, setTransparencia] = useState({
    federal: initialData?.tributos?.percentuaisAproximados?.federal || '',
    estadual: initialData?.tributos?.percentuaisAproximados?.estadual || '',
    municipal: initialData?.tributos?.percentuaisAproximados?.municipal || '',
    simplesNacional: initialData?.tributos?.percentuaisAproximados?.simplesNacional || '',
  });

  const [ibscbs, setIbscbs] = useState({
    finNFSe: initialData?.ibsCbs?.declarado?.finNFSe || '',
    indFinal: initialData?.ibsCbs?.declarado?.indFinal || '',
    cIndOp: initialData?.ibsCbs?.declarado?.cIndOp || '',
    indDest: initialData?.ibsCbs?.declarado?.indDest || '',
    cst: initialData?.ibsCbs?.declarado?.cst || '',
    cClassTrib: initialData?.ibsCbs?.declarado?.cClassTrib || '',
  });

  // Validação e Ações
  const [validationResult, setValidationResult] = useState(null);
  const [validationDrawerOpen, setValidationDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carrega catálogos
  useEffect(() => {
    async function loadData() {
      try {
        const [comps, pers, servs] = await Promise.all([
          catalogsRepository.listCompanies(),
          catalogsRepository.listPersons(),
          catalogsRepository.listServices(),
        ]);
        setCompanies(comps || []);
        setPersons(pers || []);
        setServiceCatalog(servs || []);

        // Seleciona empresa MEI por padrão se criação
        if (!selectedCompanyId && comps && comps.length > 0) {
          const compMei = comps.find((c) => c.isMei) || comps[0];
          setSelectedCompanyId(compMei.id);
          setPrestador(compMei);
          setModoSimplificadoMei(compMei.isMei);
          setServico((prev) => ({
            ...prev,
            municipioPrestacao: compMei.municipio || 'Joinville',
            ufPrestacao: compMei.uf || 'SC',
          }));
        }
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      }
    }
    loadData();
  }, [selectedCompanyId]);

  // Alteração de Prestador
  const handleCompanyChange = (compId) => {
    setSelectedCompanyId(compId);
    const found = companies.find((c) => c.id === compId);
    setPrestador(found || null);
    if (found) {
      if (found.isMei) {
        setModoSimplificadoMei(true);
      }
      setServico((prev) => ({
        ...prev,
        municipioPrestacao: found.municipio || prev.municipioPrestacao,
        ufPrestacao: found.uf || prev.ufPrestacao,
      }));
    }
  };

  // Seleção de Tomador
  const handlePersonSelect = (personId) => {
    setSelectedPersonId(personId);
    if (!personId) return;

    const found = persons.find((p) => p.id === personId);
    if (found) {
      setTomador({
        id: found.id,
        tipoPessoa: found.tipoPessoa || 'PJ',
        documento: found.documento || '',
        nomeOuRazao: found.nomeOuRazao || '',
        uf: found.uf || 'SP',
        municipio: found.municipio || '',
        pais: found.pais || 'Brasil',
        paisCodigo: found.paisCodigo || 'BR',
        email: found.email || '',
        telefone: found.telefone || '',
      });
    }
  };

  // Inserir serviço a partir do catálogo modal
  const handleInsertServiceFromCatalog = (s) => {
    setServico((prev) => ({
      ...prev,
      id: s.id,
      codigoInterno: s.codigoInterno || '',
      codigoTributacaoNacional: s.codigoTributacaoNacional || '01.01.01',
      subitemLc116: s.subitemLc116 || '1.01',
      codigoMunicipal: s.codigoMunicipal || '',
      nbs: s.nbs || '',
      descricao: s.descricao || '',
      informacoesComplementares: s.observacoes || '',
    }));
    if (decimalCompare(cleanDecimalString(valorBruto), '0.00') <= 0 && s.valorReferencia) {
      setValorBruto(cleanDecimalString(s.valorReferencia));
    }
    setCatalogModalOpen(false);
    toast?.success?.(`Serviço "${s.descricao}" inserido.`);
  };

  // Cálculo decimal do Valor Líquido
  const calculatedValues = useMemo(() => {
    const vBrutoClean = cleanDecimalString(valorBruto || '0');
    const descIncondClean = cleanDecimalString(valorDescontoIncondicionado || '0');
    const descCondClean = cleanDecimalString(valorDescontoCondicionado || '0');
    const deducoesClean = cleanDecimalString(valorDeducoes || '0');

    let totalRetencoes = '0.00';

    if (issRetido) {
      const vIss = cleanDecimalString(valorIssRetido || '0');
      totalRetencoes = decimalAdd(totalRetencoes, vIss, 2);
    }

    if (!modoSimplificadoMei) {
      totalRetencoes = decimalAdd(totalRetencoes, cleanDecimalString(pis || '0'), 2);
      totalRetencoes = decimalAdd(totalRetencoes, cleanDecimalString(cofins || '0'), 2);
      totalRetencoes = decimalAdd(totalRetencoes, cleanDecimalString(inss || '0'), 2);
      totalRetencoes = decimalAdd(totalRetencoes, cleanDecimalString(ir || '0'), 2);
      totalRetencoes = decimalAdd(totalRetencoes, cleanDecimalString(csll || '0'), 2);
    }

    const baseComDesconto = decimalSubtract(vBrutoClean, descIncondClean, 2);
    const liquido = decimalSubtract(baseComDesconto, totalRetencoes, 2);

    return {
      valorBruto: vBrutoClean,
      valorDescontoIncondicionado: descIncondClean,
      valorDescontoCondicionado: descCondClean,
      valorDeducoes: deducoesClean,
      totalRetencoes,
      valorLiquido: decimalCompare(liquido, '0.00') < 0 ? '0.00' : liquido,
    };
  }, [
    valorBruto,
    valorDescontoIncondicionado,
    valorDescontoCondicionado,
    valorDeducoes,
    issRetido,
    valorIssRetido,
    modoSimplificadoMei,
    pis,
    cofins,
    inss,
    ir,
    csll,
  ]);

  // Monta objeto do documento atual
  const buildCurrentDocument = useCallback(() => {
    const isMei = Boolean(prestador?.isMei);

    return {
      id: docId || `draft-nfse-${Date.now()}`,
      documentType: 'NFSE',
      origin: 'MANUAL',
      status: 'DRAFT',
      titulo: titulo.trim() || 'NFS-e de Serviços',
      numeroPrevisto,
      seriePrevista,
      competencia,
      dataPrevistaEmissao,
      isMei,
      modoSimplificadoMei,
      ambiente: 'HOMOLOGACAO',
      isDemo: true,
      prestadorId: selectedCompanyId,
      prestador: prestador
        ? { ...prestador, regimeTributario: { ...(prestador.regimeTributario || {}), ...regime } }
        : prestador,
      tomadorId: selectedPersonId,
      tomador,
      servico: {
        ...servico,
        ...nfseExtra,
      },
      tributos: {
        ...(initialData?.tributos || {}),
        percentuaisAproximados: transparencia,
      },
      ibsCbs: {
        ...(initialData?.ibsCbs || {}),
        declarado: ibscbs,
      },
      original: initialData?.original || undefined,
      valores: {
        valorBruto: calculatedValues.valorBruto,
        valorDescontoIncondicionado: calculatedValues.valorDescontoIncondicionado,
        valorDescontoCondicionado: calculatedValues.valorDescontoCondicionado,
        valorDeducoes: calculatedValues.valorDeducoes,
        issRetido,
        aliquotaIss: cleanDecimalString(aliquotaIss || '0.00'),
        valorIssRetido: issRetido ? cleanDecimalString(valorIssRetido || '0.00') : '0.00',
        valorBaseISS: nfseExtra.valorBaseISS,
        valorDeducaoCalculada: nfseExtra.valorDeducaoCalculada,
        valorTotalRetido: nfseExtra.valorTotalRetido,
        tribISSQN: nfseExtra.tribISSQN,
        tpRetISSQN: nfseExtra.tpRetISSQN,
        tributosFederais: {
          ...federais,
          retido: modoSimplificadoMei ? false : federais.retido,
        },
        retencoesFederais: modoSimplificadoMei
          ? { pis: '0.00', cofins: '0.00', inss: '0.00', ir: '0.00', csll: '0.00' }
          : {
              pis: cleanDecimalString(pis || '0.00'),
              cofins: cleanDecimalString(cofins || '0.00'),
              inss: cleanDecimalString(inss || '0.00'),
              ir: cleanDecimalString(ir || '0.00'),
              csll: cleanDecimalString(csll || '0.00'),
            },
        valorLiquido: calculatedValues.valorLiquido,
      },
    };
  }, [
    docId,
    titulo,
    numeroPrevisto,
    seriePrevista,
    competencia,
    dataPrevistaEmissao,
    prestador,
    regime,
    modoSimplificadoMei,
    selectedCompanyId,
    selectedPersonId,
    tomador,
    servico,
    nfseExtra,
    transparencia,
    ibscbs,
    federais,
    calculatedValues,
    issRetido,
    aliquotaIss,
    valorIssRetido,
    pis,
    cofins,
    inss,
    ir,
    csll,
    initialData,
  ]);

  // Validar formulário
  const handleValidate = () => {
    const doc = buildCurrentDocument();
    const result = validateNFSe(doc);
    setValidationResult(result);
    setValidationDrawerOpen(true);
    if (!result.isValid) {
      toast?.warning?.(`Atenção: ${result.summary.errors} erro(s) encontrados na NFS-e.`);
    } else {
      toast?.success?.('Validação da NFS-e concluída com sucesso!');
    }
  };

  // Salvar Rascunho
  const handleSave = async (redirectAfter = false) => {
    try {
      setSaving(true);
      const doc = buildCurrentDocument();

      if (savePersonToCatalog && tomador?.nomeOuRazao) {
        await catalogsRepository.savePerson({
          tipoPessoa: tomador.tipoPessoa || 'PJ',
          nomeOuRazao: tomador.nomeOuRazao,
          documento: tomador.documento || '',
          uf: tomador.uf || 'SP',
          municipio: tomador.municipio || '',
          pais: tomador.pais || 'Brasil',
          email: tomador.email || '',
          telefone: tomador.telefone || '',
          papeis: ['CLIENTE', 'TOMADOR'],
        });
      }

      let saved;
      if (mode === 'edit' && docId) {
        saved = await documentRepository.update(docId, doc);
        toast?.success?.('Rascunho da NFS-e atualizado com sucesso!');
      } else {
        saved = await documentRepository.create(doc);
        setDocId(saved.id);
        toast?.success?.('Rascunho da NFS-e criado com sucesso!');
      }

      if (redirectAfter) {
        router.push(`/notas/${saved.id}`);
      }
      return saved;
    } catch (e) {
      toast?.error?.('Erro ao salvar NFS-e: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return serviceCatalog;
    const q = catalogSearch.toLowerCase().trim();
    return serviceCatalog.filter(
      (s) =>
        (s.descricao || '').toLowerCase().includes(q) ||
        (s.codigoInterno || '').toLowerCase().includes(q) ||
        (s.codigoTributacaoNacional || '').includes(q)
    );
  }, [serviceCatalog, catalogSearch]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              Padrão Nacional • LC 116/2003
            </span>
            {prestador?.isMei && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 flex items-center gap-1">
                <FontAwesomeIcon icon={faBolt} className="text-amber-500" />
                <span>Optante MEI</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300">
              {mode === 'edit' ? 'Editando Rascunho' : 'Novo Rascunho'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mt-1 flex items-center gap-2">
            <FontAwesomeIcon icon={faReceipt} className="text-emerald-600" />
            <span>{mode === 'edit' ? 'Editar NFS-e de Serviços' : 'Criar NFS-e de Serviços'}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            buttonType="ghost"
            outline
            bordered
            size="small"
            onClick={handleValidate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold"
          >
            <FontAwesomeIcon icon={faCheckDouble} className="text-emerald-600" />
            <span>Validar NFS-e</span>
          </Button>

          <Button
            type="button"
            buttonType="primary"
            size="small"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold shadow-xs"
          >
            <FontAwesomeIcon icon={faFloppyDisk} />
            <span>{saving ? 'Salvando...' : 'Salvar e Revisar'}</span>
          </Button>
        </div>
      </div>

      {/* BANNER / TOGGLE DO MODO SIMPLIFICADO MEI */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-lg flex-shrink-0">
            <FontAwesomeIcon icon={faSliders} className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              Modo Simplificado para MEI
            </h2>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
              Otimiza o preenchimento ocultando retenções e alíquotas complexas dispensadas no regime MEI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 shadow-xs">
          <Checkbox
            id="modoSimplificadoMei"
            checked={modoSimplificadoMei}
            onChange={(_id, checked) => setModoSimplificadoMei(checked)}
            label={modoSimplificadoMei ? 'Modo Simplificado Ativo' : 'Modo Avançado / Completo'}
            className="[&>span]:text-xs [&>span]:font-semibold [&>span]:text-gray-800 dark:[&>span]:text-slate-200"
          />
        </div>
      </div>

      {/* SEÇÃO A: Prestador de Serviços */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-slate-800">
          <FontAwesomeIcon icon={faBuilding} className="text-emerald-600" />
          <span>A. Prestador de Serviços (Emissor)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <InputText
              label="Título do Rascunho"
              id="nfseTitulo"
              value={titulo}
              onChange={(_id, value) => setTitulo(value)}
              placeholder="Ex: NFS-e Desenvolvimento Web e Sustentação"
              className={FORM_CLS}
            />
          </div>

          <div>
            <InputText
              label="Competência do Serviço *"
              id="nfseCompetencia"
              value={competencia}
              onChange={(_id, value) => setCompetencia(value)}
              placeholder="MM/AAAA (ex: 11/2026)"
              className={`${FORM_CLS} font-mono text-center`}
            />
          </div>

          <div className="md:col-span-2">
            <Select
              label="Empresa Prestadora *"
              id="selectedCompanyId"
              value={selectedCompanyId}
              hideClearButton
              onChange={(_id, value) => handleCompanyChange(value)}
              className="w-full h-12"
              options={[
                { value: '', label: 'Selecione uma empresa prestadora...' },
                ...companies.map((c) => ({
                  value: c.id,
                  label: `${c.razaoSocial} — CNPJ: ${c.cnpj} ${c.isMei ? '(MEI)' : ''}`,
                })),
              ]}
            />
            {prestador && (
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                IM: {prestador.inscricaoMunicipal || 'N/A'} • {prestador.municipio}/{prestador.uf} • Regime: {prestador.regimeTributario}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <InputText
                label="Série NFS-e"
                id="nfseSeriePrevista"
                value={seriePrevista}
                onChange={(_id, value) => setSeriePrevista(value)}
                className={`${FORM_CLS} text-center font-mono`}
              />
            </div>
            <div>
              <InputText
                label="Nº Previsto"
                id="nfseNumeroPrevisto"
                value={numeroPrevisto}
                onChange={(_id, value) => setNumeroPrevisto(value)}
                placeholder="Automático"
                className={`${FORM_CLS} font-mono`}
              />
            </div>
          </div>
        </div>

        {/* Regime tributário do prestador */}
        <div className="pt-2 border-t border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <FiscalSelect
            label="Opção Simples Nacional (opSimpNac)"
            value={regime.opSimpNac}
            onChange={(v) => setRegime((p) => ({ ...p, opSimpNac: v }))}
            options={[
              { value: '', label: '—' },
              { value: '1', label: '1 - Não optante' },
              { value: '2', label: '2 - Optante MEI' },
              { value: '3', label: '3 - Optante ME/EPP' },
            ]}
          />
          <FiscalField label="Regime Apuração SN" value={regime.regApTribSN} onChange={(v) => setRegime((p) => ({ ...p, regApTribSN: v }))} mono />
          <FiscalField label="Regime Especial (regEspTrib)" value={regime.regEspTrib} onChange={(v) => setRegime((p) => ({ ...p, regEspTrib: v }))} mono />
        </div>
      </div>

      {/* SEÇÃO B: Tomador de Serviços */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <FontAwesomeIcon icon={faUser} className="text-emerald-600" />
            <span>B. Tomador de Serviços (Cliente)</span>
          </div>

          <div className="w-64">
            <Select
              id="selectedPersonId"
              value={selectedPersonId}
              hideClearButton
              onChange={(_id, value) => handlePersonSelect(value)}
              className="w-full"
              options={[
                { value: '', label: 'Buscar no cadastro de tomadores...' },
                ...persons.map((p) => ({
                  value: p.id,
                  label: `${p.nomeOuRazao} (${p.tipoPessoa})`,
                })),
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Select
              label="Tipo do Tomador"
              id="tomadorTipoPessoa"
              value={tomador.tipoPessoa || 'PJ'}
              hideClearButton
              onChange={(_id, value) =>
                setTomador((prev) => ({
                  ...prev,
                  tipoPessoa: value,
                  pais: value === 'ESTRANGEIRO' ? 'Exterior' : 'Brasil',
                }))
              }
              className="w-full h-12"
              options={[
                { value: 'PJ', label: 'Pessoa Jurídica (Empresa com CNPJ)' },
                { value: 'PF', label: 'Pessoa Física (Cliente com CPF)' },
                { value: 'ESTRANGEIRO', label: 'Tomador no Exterior' },
              ]}
            />
          </div>

          <div>
            <InputText
              label={tomador.tipoPessoa === 'ESTRANGEIRO' ? 'ID Fiscal Exterior' : 'CPF ou CNPJ'}
              id="tomadorDocumento"
              value={tomador.documento || ''}
              onChange={(_id, value) => setTomador((prev) => ({ ...prev, documento: value }))}
              placeholder={tomador.tipoPessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
              className={`${FORM_CLS} font-mono`}
            />
          </div>

          <div>
            <InputText
              label="E-mail para Envio do Espelho"
              id="tomadorEmail"
              type="email"
              value={tomador.email || ''}
              onChange={(_id, value) => setTomador((prev) => ({ ...prev, email: value }))}
              placeholder="financeiro@cliente.com.br"
              className={FORM_CLS}
            />
          </div>

          <div className="md:col-span-2">
            <InputText
              label="Nome ou Razão Social do Tomador *"
              id="tomadorNome"
              value={tomador.nomeOuRazao || ''}
              onChange={(_id, value) => setTomador((prev) => ({ ...prev, nomeOuRazao: value }))}
              placeholder="Razão social da empresa ou nome completo do tomador..."
              className={FORM_CLS}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <InputText
                label="UF / Estado"
                id="tomadorUf"
                maxLength={2}
                value={tomador.uf || ''}
                onChange={(_id, value) => setTomador((prev) => ({ ...prev, uf: value.toUpperCase() }))}
                placeholder="SP"
                className={`${FORM_CLS} uppercase text-center`}
              />
            </div>
            <div>
              <InputText
                label="Município"
                id="tomadorMunicipio"
                value={tomador.municipio || ''}
                onChange={(_id, value) => setTomador((prev) => ({ ...prev, municipio: value }))}
                placeholder="São Paulo"
                className={FORM_CLS}
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2">
          <Checkbox
            id="chk-save-tomador"
            label="Salvar este tomador no catálogo de clientes reutilizáveis"
            checked={savePersonToCatalog}
            onChange={(_id, checked) => setSavePersonToCatalog(checked)}
          />
        </div>
      </div>

      {/* SEÇÃO C: Serviço Prestado */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <FontAwesomeIcon icon={faReceipt} className="text-emerald-600" />
            <span>C. Discriminação do Serviço Prestado</span>
          </div>

          <Button
            type="button"
            buttonType="success"
            outline
            bordered
            size="small"
            onClick={() => setCatalogModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          >
            <FontAwesomeIcon icon={faBookOpen} />
            <span>Catálogo de Serviços</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <InputText
              label="Código de Tributação Nacional *"
              id="servicoCodigoTributacaoNacional"
              value={servico.codigoTributacaoNacional || ''}
              onChange={(_id, value) => setServico((prev) => ({ ...prev, codigoTributacaoNacional: value }))}
              placeholder="Ex: 01.01.01 (Análise e Desenvolvimento)"
              className={`${FORM_CLS} font-mono`}
            />
          </div>

          <div>
            <InputText
              label="Subitem da LC 116/2003"
              id="servicoSubitemLc116"
              value={servico.subitemLc116 || ''}
              onChange={(_id, value) => setServico((prev) => ({ ...prev, subitemLc116: value }))}
              placeholder="Ex: 1.01"
              className={`${FORM_CLS} font-mono`}
            />
          </div>

          <div>
            <InputText
              label="Município de Prestação"
              id="servicoMunicipioPrestacao"
              value={servico.municipioPrestacao || ''}
              onChange={(_id, value) => setServico((prev) => ({ ...prev, municipioPrestacao: value }))}
              placeholder="Joinville"
              className={FORM_CLS}
            />
          </div>

          <div className="md:col-span-3">
            <InputTextArea
              label="Discriminação Detalhada dos Serviços Prestados *"
              id="servicoDescricao"
              rows={4}
              value={servico.descricao || ''}
              onChange={(_id, value) => setServico((prev) => ({ ...prev, descricao: value }))}
              placeholder="Descreva detalhadamente o serviço executado, tecnologias envolvidas, período de prestação e entrega contratual..."
              className={FORM_CLS}
            />
          </div>

          <FiscalField label="Código NBS" value={nfseExtra.cNBS} onChange={(v) => setNfseExtra((p) => ({ ...p, cNBS: v }))} mono />
          <FiscalField label="Descrição Nacional (xTribNac)" value={nfseExtra.descricaoNacional} onChange={(v) => setNfseExtra((p) => ({ ...p, descricaoNacional: v }))} />
          <FiscalField label="Descrição NBS" value={nfseExtra.descricaoNBS} onChange={(v) => setNfseExtra((p) => ({ ...p, descricaoNBS: v }))} />
          <FiscalField label="Cód. Local Prestação (IBGE)" value={nfseExtra.cLocPrestacao} onChange={(v) => setNfseExtra((p) => ({ ...p, cLocPrestacao: v }))} mono />
          <FiscalField label="Cód. Local Incidência (IBGE)" value={nfseExtra.cLocIncid} onChange={(v) => setNfseExtra((p) => ({ ...p, cLocIncid: v }))} mono />
          <FiscalField label="Município Incidência" value={nfseExtra.xLocIncid} onChange={(v) => setNfseExtra((p) => ({ ...p, xLocIncid: v }))} />
        </div>
      </div>

      {/* SEÇÃO D: Valores, Deduções e Retenções */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-slate-800">
            <FontAwesomeIcon icon={faCoins} className="text-emerald-600" />
            <span>D. Valores do Serviço e Tributos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <InputText
                label="Valor Bruto dos Serviços (R$) *"
                id="nfseValorBruto"
                value={valorBruto}
                onChange={(_id, value) => setValorBruto(value)}
                placeholder="0.00"
                className={`${FORM_CLS} font-mono text-sm font-bold`}
              />
            </div>

            <div>
              <InputText
                label="Desconto Incondicionado (R$)"
                id="nfseDescontoIncondicionado"
                value={valorDescontoIncondicionado}
                onChange={(_id, value) => setValorDescontoIncondicionado(value)}
                placeholder="0.00"
                className={`${FORM_CLS} font-mono`}
              />
            </div>
          </div>

          {/* Seção Condicional de Retenções (Ocultada no modo Simplificado MEI) */}
          {modoSimplificadoMei ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3.5 flex items-start gap-3">
              <FontAwesomeIcon icon={faLightbulb} className="text-emerald-600 dark:text-emerald-400 w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <p className="font-semibold">Regra Tributária Especial para MEI:</p>
                <p>
                  O Microempreendedor Individual recolhe o ISS e tributos federais em valor fixo mensal através do DAS-MEI.
                  Não há retenção na fonte de PIS, COFINS, CSLL ou IR, simplificando a emissão.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-slate-800">
              <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Retenções Tributárias (Regime Normal / Lucro Presumido)
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <InputText
                    label="ISS Retido (R$)"
                    id="nfseIssRetido"
                    value={valorIssRetido}
                    onChange={(_id, value) => {
                      setValorIssRetido(value);
                      setIssRetido(decimalCompare(cleanDecimalString(value), '0.00') > 0);
                    }}
                    placeholder="0.00"
                    className={`${COMPACT_CLS} font-mono`}
                  />
                </div>

                <div>
                  <InputText
                    label="PIS Retido (R$)"
                    id="nfsePisRetido"
                    value={pis}
                    onChange={(_id, value) => setPis(value)}
                    placeholder="0.00"
                    className={`${COMPACT_CLS} font-mono`}
                  />
                </div>

                <div>
                  <InputText
                    label="COFINS Retido (R$)"
                    id="nfseCofinsRetido"
                    value={cofins}
                    onChange={(_id, value) => setCofins(value)}
                    placeholder="0.00"
                    className={`${COMPACT_CLS} font-mono`}
                  />
                </div>

                <div>
                  <InputText
                    label="IRRF (R$)"
                    id="nfseIr"
                    value={ir}
                    onChange={(_id, value) => setIr(value)}
                    placeholder="0.00"
                    className={`${COMPACT_CLS} font-mono`}
                  />
                </div>

                <div>
                  <InputText
                    label="CSLL Retida (R$)"
                    id="nfseCsll"
                    value={csll}
                    onChange={(_id, value) => setCsll(value)}
                    placeholder="0.00"
                    className={`${COMPACT_CLS} font-mono`}
                  />
                </div>

                <div>
                  <InputText
                    label="INSS Retido (R$)"
                    id="nfseInss"
                    value={inss}
                    onChange={(_id, value) => setInss(value)}
                    placeholder="0.00"
                    className={`${COMPACT_CLS} font-mono`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resumo de Valores da NFS-e */}
        <div className="bg-slate-50 dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-900/60 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-slate-800">
            <FontAwesomeIcon icon={faReceipt} className="text-emerald-600" />
            <span>Fechamento da NFS-e</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-slate-400">
              <span>Valor Bruto do Serviço:</span>
              <span className="font-mono font-medium">{formatBRL(calculatedValues.valorBruto)}</span>
            </div>

            {decimalCompare(cleanDecimalString(calculatedValues.valorDescontoIncondicionado), '0.00') > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>(-) Desconto Incondicionado:</span>
                <span className="font-mono">-{formatBRL(calculatedValues.valorDescontoIncondicionado)}</span>
              </div>
            )}

            {!modoSimplificadoMei && decimalCompare(cleanDecimalString(calculatedValues.totalRetencoes), '0.00') > 0 && (
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>(-) Retenções Tributárias:</span>
                <span className="font-mono">-{formatBRL(calculatedValues.totalRetencoes)}</span>
              </div>
            )}

            <div className="pt-3 border-t-2 border-gray-200 dark:border-slate-700 flex justify-between items-baseline">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Valor Líquido Previsto:</span>
              <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                {formatBRL(calculatedValues.valorLiquido)}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <FontAwesomeIcon icon={faShieldHalved} className="text-emerald-600 w-3.5 h-3.5 flex-shrink-0" />
            <span>Padrão Nacional de NFS-e (Receita Federal / CNM).</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO E: Campos fiscais completos preservados do XML */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
        <Button
          type="button"
          buttonType="ghost"
          onClick={() => setShowFiscalDetails((v) => !v)}
          className="w-full flex items-center justify-between text-sm font-bold !bg-transparent dark:!bg-transparent hover:!bg-transparent dark:hover:!bg-transparent !py-0 !px-0 !ring-0"
        >
          <span className="flex items-center gap-2">
            <FontAwesomeIcon icon={faSliders} className="text-emerald-600" />
            E. Campos fiscais completos da NFS-e (ISS, PIS/COFINS, Transparência e IBS/CBS)
          </span>
          <FontAwesomeIcon icon={showFiscalDetails ? faChevronUp : faChevronDown} className="text-gray-400" />
        </Button>

        {showFiscalDetails && (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <FiscalGroup title="ISS e Base de Cálculo" accent="emerald">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                <FiscalField label="Base ISS (vBC)" value={nfseExtra.valorBaseISS} onChange={(v) => setNfseExtra((p) => ({ ...p, valorBaseISS: v }))} mono />
                <FiscalField label="Dedução Calculada (vCalcDR)" value={nfseExtra.valorDeducaoCalculada} onChange={(v) => setNfseExtra((p) => ({ ...p, valorDeducaoCalculada: v }))} mono />
                <FiscalField label="Total Retido (vTotalRet)" value={nfseExtra.valorTotalRetido} onChange={(v) => setNfseExtra((p) => ({ ...p, valorTotalRetido: v }))} mono />
                <FiscalField label="Alíquota ISS %" value={aliquotaIss} onChange={setAliquotaIss} mono />
                <FiscalField label="Tributação ISS (tribISSQN)" value={nfseExtra.tribISSQN} onChange={(v) => setNfseExtra((p) => ({ ...p, tribISSQN: v }))} mono />
                <FiscalField label="Retenção ISS (tpRetISSQN)" value={nfseExtra.tpRetISSQN} onChange={(v) => setNfseExtra((p) => ({ ...p, tpRetISSQN: v }))} mono />
              </div>
            </FiscalGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <FiscalGroup title="PIS / COFINS (calculados)" accent="blue">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <FiscalField label="CST" value={federais.cst} onChange={(v) => setFederais((p) => ({ ...p, cst: v }))} mono />
                  <FiscalField label="Base PIS/COFINS" value={federais.base} onChange={(v) => setFederais((p) => ({ ...p, base: v }))} mono />
                  <FiscalField label="Alíquota PIS %" value={federais.aliquotaPis} onChange={(v) => setFederais((p) => ({ ...p, aliquotaPis: v }))} mono />
                  <FiscalField label="Alíquota COFINS %" value={federais.aliquotaCofins} onChange={(v) => setFederais((p) => ({ ...p, aliquotaCofins: v }))} mono />
                  <FiscalField label="Valor PIS" value={federais.valorPis} onChange={(v) => setFederais((p) => ({ ...p, valorPis: v }))} mono />
                  <FiscalField label="Valor COFINS" value={federais.valorCofins} onChange={(v) => setFederais((p) => ({ ...p, valorCofins: v }))} mono />
                  <FiscalField label="Indicador Retenção" value={federais.tpRetPisCofins} onChange={(v) => setFederais((p) => ({ ...p, tpRetPisCofins: v }))} mono />
                  <div className="flex items-end pb-1">
                    <Checkbox
                      id="federaisRetido"
                      checked={federais.retido}
                      onChange={(_id, checked) => setFederais((p) => ({ ...p, retido: checked }))}
                      label="Efetivamente retido"
                      className="[&>span]:text-[11px] [&>span]:text-gray-600 dark:[&>span]:text-slate-300"
                    />
                  </div>
                </div>
              </FiscalGroup>

              <FiscalGroup title="Transparência Tributária (%)" accent="slate">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <FiscalField label="Federal" value={transparencia.federal} onChange={(v) => setTransparencia((p) => ({ ...p, federal: v }))} mono />
                  <FiscalField label="Estadual" value={transparencia.estadual} onChange={(v) => setTransparencia((p) => ({ ...p, estadual: v }))} mono />
                  <FiscalField label="Municipal" value={transparencia.municipal} onChange={(v) => setTransparencia((p) => ({ ...p, municipal: v }))} mono />
                  <FiscalField label="Simples Nacional (pTotTribSN)" value={transparencia.simplesNacional} onChange={(v) => setTransparencia((p) => ({ ...p, simplesNacional: v }))} mono />
                </div>
              </FiscalGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <FiscalGroup title="IBS / CBS declarado na DPS" accent="emerald">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <FiscalField label="Finalidade (finNFSe)" value={ibscbs.finNFSe} onChange={(v) => setIbscbs((p) => ({ ...p, finNFSe: v }))} mono />
                  <FiscalField label="Consumidor Final" value={ibscbs.indFinal} onChange={(v) => setIbscbs((p) => ({ ...p, indFinal: v }))} mono />
                  <FiscalField label="Indicador Operação" value={ibscbs.cIndOp} onChange={(v) => setIbscbs((p) => ({ ...p, cIndOp: v }))} mono />
                  <FiscalField label="Indicador Destinatário" value={ibscbs.indDest} onChange={(v) => setIbscbs((p) => ({ ...p, indDest: v }))} mono />
                  <FiscalField label="CST" value={ibscbs.cst} onChange={(v) => setIbscbs((p) => ({ ...p, cst: v }))} mono />
                  <FiscalField label="Classificação Tributária" value={ibscbs.cClassTrib} onChange={(v) => setIbscbs((p) => ({ ...p, cClassTrib: v }))} mono />
                </div>
              </FiscalGroup>

              {initialData?.ibsCbs?.apurado && (
                <FiscalGroup title="IBS / CBS apurado (somente consulta)" accent="slate">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] font-mono text-gray-700 dark:text-slate-300">
                    <span>Base: {initialData.ibsCbs.apurado.vBC || '—'}</span>
                    <span>vIBS: {initialData.ibsCbs.apurado.vIBS || '—'}</span>
                    <span>vCBS: {initialData.ibsCbs.apurado.vCBS || '—'}</span>
                    <span>Local: {initialData.ibsCbs.apurado.xLocalidadeIncid || '—'}</span>
                    <span>Tot. NF: {initialData.ibsCbs.apurado.totais?.vTotNF || '—'}</span>
                    <span>Total CBS: {initialData.ibsCbs.apurado.totais?.vCBS || '—'}</span>
                  </div>
                </FiscalGroup>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BARRA DE AÇÕES FIXA INFERIOR */}
      <div className="sticky bottom-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-300 dark:border-slate-700 p-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            buttonType="ghost"
            outline
            size="small"
            onClick={() => router.push('/notas')}
            className="px-4 py-2 text-xs font-semibold"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            buttonType="success"
            outline
            bordered
            size="small"
            onClick={handleValidate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold"
          >
            <FontAwesomeIcon icon={faCheckDouble} />
            <span>Validar NFS-e</span>
          </Button>
        </div>

        <Button
          type="button"
          buttonType="primary"
          size="small"
          onClick={() => handleSave(true)}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold shadow-sm"
        >
          <FontAwesomeIcon icon={faFloppyDisk} />
          <span>{saving ? 'Gravando Rascunho...' : 'Salvar Rascunho e Abrir Prévia'}</span>
          <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
        </Button>
      </div>

      {/* MODAL: Catálogo de Serviços */}
      {catalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <FontAwesomeIcon icon={faBookOpen} className="text-emerald-600" />
                <span>Catálogo de Serviços Pré-Configurados</span>
              </div>
              <Button
                type="button"
                buttonType="ghost"
                outline
                size="small"
                square
                onClick={() => setCatalogModalOpen(false)}
                title="Fechar catálogo de serviços"
                className="!p-1 text-gray-400"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-slate-800">
              <InputText
                id="nfseCatalogSearch"
                placeholder="Pesquisar por descrição, código tributação ou atividade..."
                value={catalogSearch}
                onChange={(_id, value) => setCatalogSearch(value)}
                className=""
              />
            </div>

            <div className="overflow-y-auto p-4 space-y-2.5 flex-1">
              {filteredCatalog.length === 0 ? (
                <p className="text-xs text-center text-gray-500 py-6">Nenhum serviço encontrado no catálogo.</p>
              ) : (
                filteredCatalog.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-slate-800/60 flex items-center justify-between gap-4 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{s.descricao}</p>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        Trib. Nacional: {s.codigoTributacaoNacional} • Subitem LC 116: {s.subitemLc116}
                      </p>
                      {s.observacoes && (
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">{s.observacoes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400">
                        {formatBRL(s.valorReferencia)}
                      </span>
                      <Button
                        type="button"
                        buttonType="success"
                        size="small"
                        onClick={() => handleInsertServiceFromCatalog(s)}
                        className="px-3 py-1.5 text-xs font-semibold"
                      >
                        Selecionar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-slate-800 flex justify-end">
              <Button
                type="button"
                buttonType="ghost"
                outline
                size="small"
                onClick={() => setCatalogModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GAVETA / MODAL: Relatório de Validação da NFS-e */}
      {validationDrawerOpen && validationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {validationResult.isValid ? (
                  <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500 w-5 h-5" />
                ) : (
                  <FontAwesomeIcon icon={faCircleExclamation} className="text-red-500 w-5 h-5" />
                )}
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {validationResult.isValid ? 'NFS-e Pronta para Rascunho' : 'Pendências Identificadas na NFS-e'}
                </span>
              </div>
              <Button
                type="button"
                buttonType="ghost"
                outline
                size="small"
                square
                onClick={() => setValidationDrawerOpen(false)}
                title="Fechar relatório de validação"
                className="!p-1 text-gray-400"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Resumo:</span>
                <span className="text-red-600 font-bold">{validationResult.summary.errors} Erro(s)</span>
                <span className="text-amber-600 font-bold">{validationResult.summary.warnings} Aviso(s)</span>
                <span className="text-blue-600 font-bold">{validationResult.summary.infos} Info(s)</span>
              </div>

              <div className="space-y-2 pt-2">
                {validationResult.issues.map((iss) => (
                  <div
                    key={iss.id}
                    className={`p-3 rounded-lg border text-xs ${
                      iss.severity === 'error'
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
                        : iss.severity === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                    }`}
                  >
                    <p className="font-bold flex items-center gap-1.5">
                      <span>{iss.title}</span>
                    </p>
                    <p className="mt-1 leading-relaxed opacity-90">{iss.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-slate-800 flex justify-end">
              <Button
                type="button"
                buttonType="primary"
                size="small"
                onClick={() => setValidationDrawerOpen(false)}
                className="px-4 py-2 text-xs font-semibold"
              >
                Entendido, Retornar ao Editor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
