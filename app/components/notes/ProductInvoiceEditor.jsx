'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxesStacked,
  faPlus,
  faTrashCan,
  faCopy,
  faFloppyDisk,
  faCheckDouble,
  faCircleExclamation,
  faCircleCheck,
  faBuilding,
  faUser,
  faListCheck,
  faCalculator,
  faBookOpen,
  faXmark,
  faArrowRight,
  faTruck,
  faChevronDown,
  faChevronUp,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';
import { catalogsRepository } from '@/features/catalogsRepository';
import { documentRepository } from '@/features/documentRepository';
import { validateNFe } from '@/features/validation/nfeValidator';
import { FiscalField, FiscalSelect, FiscalGroup } from './FiscalField';
import Select from '@/components/inputs/Select';
import InputText from '@/components/inputs/InputText';
import InputDate from '@/components/inputs/InputDate';
import InputTextArea from '@/components/inputs/InputTextArea';
import Checkbox from '@/components/inputs/Checkbox';
import Button from '@/components/buttons/Button';
import { formatBRL } from '@/lib/formatters';
import { cleanDecimalString, decimalAdd, decimalSubtract, decimalCompare } from '@/lib/calculations/decimal';
import { calculateInvoiceTotals, calculateItemTotal } from '@/lib/calculations/invoiceTotals';
import { useAppContext } from '@/context/AppContext';

const INITIAL_EMPTY_ITEM = () => ({
  itemId: `item-nfe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  item: 1,
  codigo: '',
  descricao: '',
  ncm: '',
  cest: '',
  cfop: '5101',
  unidade: 'UN',
  cEAN: 'SEM GTIN',
  cEANTrib: 'SEM GTIN',
  unidadeTributavel: 'UN',
  quantidade: '1.0000',
  quantidadeTributavel: '1.0000',
  valorUnitario: '0.0000',
  valorUnitarioTributavel: '0.0000',
  valorTotal: '0.00',
  desconto: '0.00',
  indicadorComposicaoTotal: '1',
  pedido: '',
  itemPedido: '',
  informacoesAdicionais: '',
  observacoes: '',
  tributos: {
    icms: { cst: '', csosn: '', origem: '', modalidadeBase: '', vBC: '0.00', pRedBC: '0.00', pICMS: '0.00', vICMS: '0.00' },
    ipi: { cst: '', cEnq: '', vBC: '0.00', pIPI: '0.00', vIPI: '0.00' },
    pis: { cst: '', vBC: '0.00', pPIS: '0.00', vPIS: '0.00' },
    cofins: { cst: '', vBC: '0.00', pCOFINS: '0.00', vCOFINS: '0.00' },
    ibsCbs: { cst: '', cClassTrib: '', vBC: '0.00', pIBSUF: '0.00', vIBSUF: '0.00', pIBSMun: '0.00', vIBSMun: '0.00', vIBS: '0.00', pCBS: '0.00', vCBS: '0.00' },
  },
});

/**
 * Garante que itens importados ou antigos possuam o contrato completo de tributos
 * e identificadores estáveis para edição.
 */
function withItemDefaults(item, index) {
  const base = INITIAL_EMPTY_ITEM();
  const trib = item?.tributos || {};
  return {
    ...base,
    ...item,
    itemId: item?.itemId || item?.id || base.itemId,
    item: item?.item || index + 1,
    tributos: {
      icms: { ...base.tributos.icms, ...(trib.icms || {}) },
      ipi: { ...base.tributos.ipi, ...(trib.ipi || {}) },
      pis: { ...base.tributos.pis, ...(trib.pis || {}) },
      cofins: { ...base.tributos.cofins, ...(trib.cofins || {}) },
      ibsCbs: { ...base.tributos.ibsCbs, ...(trib.ibsCbs || {}) },
    },
  };
}

const INPUT_CLS =
  'w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none';

/* Campos de formulário (blocos de identificação, emitente, destinatário, totais). */
const FORM_CLS =
  'px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 dark:border-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500';

export default function ProductInvoiceEditor({
  initialData = null,
  mode = 'create', // 'create' | 'edit'
}) {
  const router = useRouter();
  const { toast } = useAppContext();

  // Estados dos Cadastros Base
  const [companies, setCompanies] = useState([]);
  const [persons, setPersons] = useState([]);
  const [productCatalog, setProductCatalog] = useState([]);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Estado do Documento
  const [docId, setDocId] = useState(initialData?.id || '');
  const [titulo, setTitulo] = useState(initialData?.titulo || 'Nova NF-e de Produtos');
  const [numeroPrevisto, setNumeroPrevisto] = useState(initialData?.numeroPrevisto || '');
  const [seriePrevista, setSeriePrevista] = useState(initialData?.seriePrevista || '1');
  const [dataPrevistaEmissao, setDataPrevistaEmissao] = useState(
    initialData?.dataPrevistaEmissao || new Date().toISOString().slice(0, 10)
  );
  const [naturezaOperacao, setNaturezaOperacao] = useState(
    initialData?.naturezaOperacao || 'VENDA DE MERCADORIA'
  );
  const [finalidadeEmissao, setFinalidadeEmissao] = useState(initialData?.finalidadeEmissao || '1');
  const [tipoOperacao, setTipoOperacao] = useState(initialData?.tipoOperacao || '1');
  const [destinoOperacao, setDestinoOperacao] = useState(initialData?.destinoOperacao || '1');
  const [modalidadeFrete, setModalidadeFrete] = useState(initialData?.modalidadeFrete || '9'); // 9 - Sem Frete
  const [informacoesAdicionais, setInformacoesAdicionais] = useState(
    initialData?.informacoesAdicionais || ''
  );

  // Emitente
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialData?.emitenteId || '');
  const [emitente, setEmitente] = useState(initialData?.emitente || null);

  // Destinatário
  const [selectedPersonId, setSelectedPersonId] = useState(initialData?.destinatarioId || '');
  const [destinatario, setDestinatario] = useState(
    initialData?.destinatario || {
      tipoPessoa: 'PJ',
      documento: '',
      nomeOuRazao: '',
      uf: 'SP',
      municipio: '',
      pais: 'Brasil',
      paisCodigo: 'BR',
      enderecoCompleto: '',
      inscricaoEstadual: '',
    }
  );
  const [savePersonToCatalog, setSavePersonToCatalog] = useState(false);

  // Itens
  const [itens, setItens] = useState(
    Array.isArray(initialData?.itens) && initialData.itens.length > 0
      ? initialData.itens.map((it, idx) => withItemDefaults(it, idx))
      : [INITIAL_EMPTY_ITEM()]
  );

  const [expandedItems, setExpandedItems] = useState(() => new Set());

  // Endereços completos de emitente/destinatário
  const [emitenteEndereco, setEmitenteEndereco] = useState(initialData?.emitente?.endereco || {});
  const [destinatarioEndereco, setDestinatarioEndereco] = useState(initialData?.destinatario?.endereco || {});

  // Identificação fiscal complementar (preservada do XML ou preenchida manualmente)
  const [ideExtra, setIdeExtra] = useState({
    modelo: initialData?.ide?.modelo || initialData?.modelo || '55',
    cMunFG: initialData?.ide?.cMunFG || '',
    indFinal: initialData?.ide?.indFinal || '',
    indPres: initialData?.ide?.indPres || '',
    indIntermed: initialData?.ide?.indIntermed || '',
    tpImp: initialData?.ide?.tpImp || '',
    tpEmis: initialData?.ide?.tpEmis || '',
    tpAmb: initialData?.ide?.tpAmb ?? initialData?.ide?.ambiente ?? '',
    procEmi: initialData?.ide?.procEmi || '',
    verProc: initialData?.ide?.verProc || '',
  });

  // Despesas e Totais
  const [valorFrete, setValorFrete] = useState(initialData?.totais?.valorFrete || '0.00');
  const [valorSeguro, setValorSeguro] = useState(initialData?.totais?.valorSeguro || '0.00');
  const [outrasDespesas, setOutrasDespesas] = useState(initialData?.totais?.outrasDespesas || '0.00');
  const [valorDesconto, setValorDesconto] = useState(initialData?.totais?.valorDesconto || '0.00');
  const [valorIPI, setValorIPI] = useState(initialData?.totais?.valorIPI || '0.00');

  // Painel de Validação
  const [validationResult, setValidationResult] = useState(null);
  const [validationDrawerOpen, setValidationDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carrega cadastros base
  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [comps, pers, prods] = await Promise.all([
          catalogsRepository.listCompanies(),
          catalogsRepository.listPersons(),
          catalogsRepository.listProducts(),
        ]);
        setCompanies(comps || []);
        setPersons(pers || []);
        setProductCatalog(prods || []);

        // Seleciona primeira empresa comercial/exportadora se for criação e não houver selecionada
        if (!selectedCompanyId && comps && comps.length > 0) {
          const compPreferencial = comps.find((c) => !c.isMei) || comps[0];
          setSelectedCompanyId(compPreferencial.id);
          setEmitente(compPreferencial);
        }
      } catch (e) {
        console.error('Erro ao carregar cadastros:', e);
      }
    }
    loadCatalogs();
  }, [selectedCompanyId]);

  // Atualiza emitente quando o select muda
  const handleCompanyChange = (compId) => {
    setSelectedCompanyId(compId);
    const found = companies.find((c) => c.id === compId);
    setEmitente(found || null);
  };

  // Atualiza destinatário quando seleciona do cadastro existente
  const handlePersonSelect = (personId) => {
    setSelectedPersonId(personId);
    if (!personId) return;

    const found = persons.find((p) => p.id === personId);
    if (found) {
      setDestinatario({
        id: found.id,
        tipoPessoa: found.tipoPessoa || 'PJ',
        documento: found.documento || '',
        nomeOuRazao: found.nomeOuRazao || '',
        uf: found.uf || 'SP',
        municipio: found.municipio || '',
        pais: found.pais || 'Brasil',
        paisCodigo: found.paisCodigo || 'BR',
        enderecoCompleto: found.endereco
          ? `${found.endereco.logradouro || ''}, ${found.endereco.numero || ''} ${found.endereco.bairro || ''} - ${found.municipio || ''}/${found.uf || ''}`
          : '',
        inscricaoEstadual: found.inscricaoEstadual || '',
      });
    }
  };

  // Recálculo decimal dos totais
  const calculatedTotals = useMemo(() => {
    const safeItens = itens.map((it) => ({
      quantidade: cleanDecimalString(it.quantidade || '0'),
      valorUnitario: cleanDecimalString(it.valorUnitario || '0'),
      valorDesconto: cleanDecimalString(it.desconto || '0'),
    }));

    const freteClean = cleanDecimalString(valorFrete || '0');
    const seguroClean = cleanDecimalString(valorSeguro || '0');
    const outrasClean = cleanDecimalString(outrasDespesas || '0');
    const descClean = cleanDecimalString(valorDesconto || '0');
    const ipiClean = cleanDecimalString(valorIPI || '0');

    const totals = calculateInvoiceTotals(safeItens, {
      freight: freteClean,
      insurance: seguroClean,
      discount: descClean,
      otherExpenses: outrasClean,
      ipi: ipiClean,
    });

    return totals;
  }, [itens, valorFrete, valorSeguro, outrasDespesas, valorDesconto, valorIPI]);

  // Edição granular de campo de item por itemId estável
  const handleItemChange = useCallback((itemId, field, value) => {
    setItens((prevItens) =>
      prevItens.map((item) => {
        if (item.itemId !== itemId) return item;

        const updated = { ...item, [field]: value };

        // Recálculo do valor total do item se quantidade, valorUnitario ou desconto mudarem
        if (field === 'quantidade' || field === 'valorUnitario') {
          const q = cleanDecimalString(field === 'quantidade' ? value : item.quantidade || '0');
          const vu = cleanDecimalString(field === 'valorUnitario' ? value : item.valorUnitario || '0');

          updated.valorTotal = calculateItemTotal(vu, q);
        }

        return updated;
      })
    );
  }, []);

  // Edição de campo aninhado (tributos, unidades tributáveis, pedido etc.)
  const handleItemDetailChange = useCallback((itemId, path, value) => {
    setItens((prevItens) =>
      prevItens.map((item) => {
        if (item.itemId !== itemId) return item;
        const keys = path.split('.');
        const clone = { ...item };
        let ref = clone;
        for (let i = 0; i < keys.length - 1; i++) {
          ref[keys[i]] = { ...(ref[keys[i]] || {}) };
          ref = ref[keys[i]];
        }
        ref[keys[keys.length - 1]] = value;
        return clone;
      })
    );
  }, []);

  const toggleItemDetails = (itemId) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // Adicionar linha de produto em branco
  const handleAddItem = () => {
    setItens((prev) => [
      ...prev,
      {
        ...INITIAL_EMPTY_ITEM(),
        item: prev.length + 1,
        cfop: destinoOperacao === '3' ? '7101' : '5101',
      },
    ]);
  };

  // Duplicar linha de produto
  const handleDuplicateItem = (itemId) => {
    const itemToDup = itens.find((it) => it.itemId === itemId);
    if (!itemToDup) return;

    const newItem = {
      ...itemToDup,
      itemId: `item-nfe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      item: itens.length + 1,
    };
    setItens((prev) => [...prev, newItem]);
    toast?.info?.(`Produto #${itemToDup.item} duplicado.`);
  };

  // Remover linha de produto
  const handleRemoveItem = (itemId) => {
    if (itens.length <= 1) {
      toast?.warning?.('A NF-e deve possuir ao menos um produto.');
      return;
    }
    setItens((prev) =>
      prev
        .filter((it) => it.itemId !== itemId)
        .map((it, idx) => ({ ...it, item: idx + 1 }))
    );
  };

  // Inserir produto a partir do catálogo modal
  const handleInsertFromCatalog = (product) => {
    const newItem = {
      ...INITIAL_EMPTY_ITEM(),
      item: itens.length + 1,
      codigo: product.codigo || '',
      descricao: product.descricao || '',
      ncm: product.ncm || '',
      cfop: destinoOperacao === '3' ? '7101' : product.cfopPadrao || '5101',
      unidade: product.unidadeComercial || 'UN',
      unidadeTributavel: product.unidadeTributavel || product.unidadeComercial || 'UN',
      quantidade: '1.0000',
      quantidadeTributavel: '1.0000',
      valorUnitario: cleanDecimalString(product.precoPadrao || '0.00'),
      valorUnitarioTributavel: cleanDecimalString(product.precoPadrao || '0.00'),
      valorTotal: cleanDecimalString(product.precoPadrao || '0.00'),
      desconto: '0.00',
      observacoes: product.cest ? `CEST: ${product.cest}` : '',
      cest: product.cest || '',
    };
    setItens((prev) => [...prev, newItem]);
    setCatalogModalOpen(false);
    toast?.success?.(`"${product.descricao}" adicionado à nota.`);
  };

  // Salvar produto da tabela no catálogo de produtos
  const handleSaveProductToCatalog = async (item) => {
    try {
      if (!item.descricao || !item.ncm) {
        toast?.warning?.('Informe descrição e NCM do produto antes de salvar no catálogo.');
        return;
      }
      await catalogsRepository.saveProduct({
        codigo: item.codigo || `SKU-${Date.now().toString().slice(-4)}`,
        descricao: item.descricao,
        ncm: item.ncm,
        cfopPadrao: item.cfop,
        unidadeComercial: item.unidade || 'UN',
        unidadeTributavel: item.unidade || 'UN',
        precoPadrao: item.valorUnitario,
      });
      const updated = await catalogsRepository.listProducts();
      setProductCatalog(updated);
      toast?.success?.(`Produto "${item.descricao}" salvo no catálogo!`);
    } catch (e) {
      toast?.error?.('Erro ao salvar no catálogo: ' + e.message);
    }
  };

  // Monta objeto do documento atual para validação / persistência
  const buildCurrentDocument = useCallback(() => {
    return {
      id: docId || `draft-nfe-${Date.now()}`,
      documentType: 'NFE',
      origin: 'MANUAL',
      status: 'DRAFT',
      titulo: titulo.trim() || 'NF-e de Produtos',
      numeroPrevisto,
      seriePrevista,
      dataPrevistaEmissao,
      naturezaOperacao,
      finalidadeEmissao,
      tipoOperacao,
      destinoOperacao,
      modalidadeFrete,
      informacoesAdicionais,
      isDemo: true,
      modelo: ideExtra.modelo || '55',
      ide: {
        ...ideExtra,
        finNFe: finalidadeEmissao,
        idDest: destinoOperacao,
      },
      emitenteId: selectedCompanyId,
      emitente: emitente
        ? { ...emitente, endereco: { ...(emitente.endereco || {}), ...emitenteEndereco } }
        : emitente,
      destinatarioId: selectedPersonId,
      destinatario: {
        ...destinatario,
        endereco: { ...(destinatario.endereco || {}), ...destinatarioEndereco },
      },
      itens: itens.map((it, idx) => ({
        ...it,
        item: idx + 1,
      })),
      totais: {
        valorProdutos: calculatedTotals.valorProdutos,
        valorFrete: calculatedTotals.valorFrete,
        valorSeguro: calculatedTotals.valorSeguro,
        valorDesconto: calculatedTotals.valorDesconto,
        outrasDespesas: calculatedTotals.outrasDespesas,
        valorIPI: calculatedTotals.valorIPI,
        valorTotalNota: calculatedTotals.valorTotalNota,
      },
      transporte: {
        modalidadeFrete,
      },
    };
  }, [
    docId,
    titulo,
    numeroPrevisto,
    seriePrevista,
    dataPrevistaEmissao,
    naturezaOperacao,
    finalidadeEmissao,
    tipoOperacao,
    destinoOperacao,
    modalidadeFrete,
    informacoesAdicionais,
    selectedCompanyId,
    emitente,
    emitenteEndereco,
    selectedPersonId,
    destinatario,
    destinatarioEndereco,
    ideExtra,
    itens,
    calculatedTotals,
  ]);

  // Executa validação
  const handleValidate = () => {
    const doc = buildCurrentDocument();
    const result = validateNFe(doc);
    setValidationResult(result);
    setValidationDrawerOpen(true);
    if (!result.isValid) {
      toast?.warning?.(`Atenção: foram encontrados ${result.summary.errors} erro(s) no rascunho.`);
    } else {
      toast?.success?.('Validação básica concluída: nenhum erro impeditivo encontrado!');
    }
  };

  // Salvar Rascunho
  const handleSave = async (redirectAfter = false) => {
    try {
      setSaving(true);
      const doc = buildCurrentDocument();

      // Salva cliente no catálogo se solicitado
      if (savePersonToCatalog && destinatario?.nomeOuRazao) {
        await catalogsRepository.savePerson({
          tipoPessoa: destinatario.tipoPessoa || 'PJ',
          nomeOuRazao: destinatario.nomeOuRazao,
          documento: destinatario.documento || '',
          uf: destinatario.uf || 'SP',
          municipio: destinatario.municipio || '',
          pais: destinatario.pais || 'Brasil',
          paisCodigo: destinatario.paisCodigo || 'BR',
          inscricaoEstadual: destinatario.inscricaoEstadual || '',
          papeis: ['CLIENTE', 'DESTINATARIO'],
        });
      }

      let saved;
      if (mode === 'edit' && docId) {
        saved = await documentRepository.update(docId, doc);
        toast?.success?.('Rascunho da NF-e atualizado com sucesso!');
      } else {
        saved = await documentRepository.create(doc);
        setDocId(saved.id);
        toast?.success?.('Rascunho da NF-e criado com sucesso!');
      }

      if (redirectAfter) {
        router.push(`/notas/${saved.id}`);
      }
      return saved;
    } catch (e) {
      toast?.error?.('Erro ao salvar rascunho: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Adicionar à Preparação de Exportação
  const handleAddToPreparation = async () => {
    try {
      setSaving(true);
      const saved = await handleSave(false);
      if (!saved) return;

      // Converte e disponibiliza no motor de preparação
      await documentRepository.convertToPreparationSource(saved.id);
      toast?.success?.('NF-e adicionada com sucesso ao lote de preparação de exportação!');
      router.push('/preparacoes/nova');
    } catch (e) {
      toast?.error?.('Erro ao integrar à preparação: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Filtragem de catálogo modal
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return productCatalog;
    const q = catalogSearch.toLowerCase().trim();
    return productCatalog.filter(
      (p) =>
        (p.descricao || '').toLowerCase().includes(q) ||
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.ncm || '').includes(q)
    );
  }, [productCatalog, catalogSearch]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
              Modelo 55 • Mercadorias
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {mode === 'edit' ? 'Editando Rascunho' : 'Novo Rascunho'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mt-1 flex items-center gap-2">
            <FontAwesomeIcon icon={faBoxesStacked} className="text-blue-600" />
            <span>{mode === 'edit' ? 'Editar NF-e de Produtos' : 'Criar NF-e de Produtos'}</span>
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
            <FontAwesomeIcon icon={faCheckDouble} className="text-blue-600" />
            <span>Validar Dados</span>
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

      {/* SEÇÃO A: Identificação do Documento e Emitente */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-slate-800">
          <FontAwesomeIcon icon={faBuilding} className="text-blue-600" />
          <span>A. Identificação e Empresa Emitente</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Título do Rascunho */}
          <div className="md:col-span-2">
            <label htmlFor="nfeTitulo" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Título de Referência do Rascunho
            </label>
            <InputText
              id="nfeTitulo"
              value={titulo}
              onChange={(_id, value) => setTitulo(value)}
              placeholder="Ex: NF-e Comercial Peças Industriais"
              className={FORM_CLS}
            />
          </div>

          {/* Data Prevista */}
          <div>
            <label htmlFor="nfeDataPrevista" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Data Prevista de Emissão
            </label>
            <InputDate
              id="nfeDataPrevista"
              value={dataPrevistaEmissao}
              onChange={(_id, value) => setDataPrevistaEmissao(value)}
              small
              className="px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Empresa Emitente */}
          <div className="md:col-span-2">
            <label htmlFor="selectedCompanyId" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Empresa Emitente (Origem) *
            </label>
            <Select
              id="selectedCompanyId"
              value={selectedCompanyId}
              hideClearButton
              onChange={(_id, value) => handleCompanyChange(value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              options={[
                { value: '', label: 'Selecione uma empresa cadastrada...' },
                ...companies.map((c) => ({
                  value: c.id,
                  label: `${c.razaoSocial} — CNPJ: ${c.cnpj} (${c.uf})`,
                })),
              ]}
            />
            {emitente && (
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                IE: {emitente.inscricaoEstadual || 'Isenta'} • {emitente.municipio}/{emitente.uf} • Regime: {emitente.regimeTributario}
              </p>
            )}
          </div>

          {/* Natureza da Operação */}
          <div>
            <label htmlFor="nfeNaturezaOperacao" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Natureza da Operação *
            </label>
            <InputText
              id="nfeNaturezaOperacao"
              value={naturezaOperacao}
              onChange={(_id, value) => setNaturezaOperacao(value)}
              placeholder="Ex: VENDA DE MERCADORIA"
              className={`${FORM_CLS} uppercase`}
            />
          </div>

          {/* Destino da Operação */}
          <div>
            <label htmlFor="destinoOperacao" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Destino da Operação
            </label>
            <Select
              id="destinoOperacao"
              value={destinoOperacao}
              hideClearButton
              onChange={(_id, newDest) => {
                setDestinoOperacao(newDest);
                // Se mudar para Exterior (3), atualiza CFOPs para 7xxx
                if (newDest === '3') {
                  setItens((prev) =>
                    prev.map((it) => ({
                      ...it,
                      cfop: it.cfop.startsWith('7') ? it.cfop : '7101',
                    }))
                  );
                }
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              options={[
                { value: '1', label: '1 - Operação Interna (Mesmo Estado)' },
                { value: '2', label: '2 - Operação Interestadual' },
                { value: '3', label: '3 - Operação com Exterior (Exportação)' },
              ]}
            />
          </div>

          {/* Finalidade */}
          <div>
            <label htmlFor="finalidadeEmissao" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Finalidade da NF-e
            </label>
            <Select
              id="finalidadeEmissao"
              value={finalidadeEmissao}
              hideClearButton
              onChange={(_id, value) => setFinalidadeEmissao(value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              options={[
                { value: '1', label: '1 - NF-e Normal' },
                { value: '2', label: '2 - NF-e Complementar' },
                { value: '3', label: '3 - NF-e de Ajuste' },
                { value: '4', label: '4 - Devolução de Mercadoria' },
              ]}
            />
          </div>

          {/* Série e Número Previsto */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="nfeSeriePrevista" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Série Prevista
              </label>
              <InputText
                id="nfeSeriePrevista"
                value={seriePrevista}
                onChange={(_id, value) => setSeriePrevista(value)}
                className={`${FORM_CLS} text-center font-mono`}
              />
            </div>
            <div>
              <label htmlFor="nfeNumeroPrevisto" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Número Previsto
              </label>
              <InputText
                id="nfeNumeroPrevisto"
                placeholder="Automático"
                value={numeroPrevisto}
                onChange={(_id, value) => setNumeroPrevisto(value)}
                className={`${FORM_CLS} font-mono`}
              />
            </div>
          </div>

          {/* Identificação fiscal complementar */}
          <FiscalSelect
            label="Modelo"
            value={ideExtra.modelo}
            onChange={(v) => setIdeExtra((p) => ({ ...p, modelo: v }))}
            options={[{ value: '55', label: '55 - NF-e' }, { value: '65', label: '65 - NFC-e' }]}
          />
          <FiscalField
            label="Município Fato Gerador (IBGE)"
            value={ideExtra.cMunFG}
            onChange={(v) => setIdeExtra((p) => ({ ...p, cMunFG: v }))}
            mono
          />
          <FiscalSelect
            label="Consumidor Final"
            value={ideExtra.indFinal}
            onChange={(v) => setIdeExtra((p) => ({ ...p, indFinal: v }))}
            options={[{ value: '', label: '—' }, { value: '0', label: '0 - Não' }, { value: '1', label: '1 - Sim' }]}
          />
          <FiscalSelect
            label="Presença do Comprador"
            value={ideExtra.indPres}
            onChange={(v) => setIdeExtra((p) => ({ ...p, indPres: v }))}
            options={[
              { value: '', label: '—' },
              { value: '0', label: '0 - Não se aplica' },
              { value: '1', label: '1 - Presencial' },
              { value: '2', label: '2 - Internet' },
              { value: '3', label: '3 - Telefone' },
              { value: '9', label: '9 - Outros' },
            ]}
          />
          <FiscalSelect
            label="Intermediação"
            value={ideExtra.indIntermed}
            onChange={(v) => setIdeExtra((p) => ({ ...p, indIntermed: v }))}
            options={[{ value: '', label: '—' }, { value: '0', label: '0 - Sem intermediador' }, { value: '1', label: '1 - Com intermediador' }]}
          />
          <FiscalSelect
            label="Ambiente"
            value={ideExtra.tpAmb}
            onChange={(v) => setIdeExtra((p) => ({ ...p, tpAmb: v }))}
            options={[{ value: '', label: '—' }, { value: '1', label: '1 - Produção' }, { value: '2', label: '2 - Homologação' }]}
          />
          <FiscalField
            label="Tipo de Emissão"
            value={ideExtra.tpEmis}
            onChange={(v) => setIdeExtra((p) => ({ ...p, tpEmis: v }))}
            mono
          />
          <FiscalField
            label="Processo de Emissão"
            value={ideExtra.procEmi}
            onChange={(v) => setIdeExtra((p) => ({ ...p, procEmi: v }))}
            mono
          />
        </div>

        {/* Endereço completo do emitente */}
        <details className="rounded-lg border border-gray-200 dark:border-slate-800">
          <summary className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 cursor-pointer">
            Endereço completo do emitente
          </summary>
          <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            <FiscalField label="Logradouro" value={emitenteEndereco.logradouro} onChange={(v) => setEmitenteEndereco((p) => ({ ...p, logradouro: v }))} className="md:col-span-2" />
            <FiscalField label="Número" value={emitenteEndereco.numero} onChange={(v) => setEmitenteEndereco((p) => ({ ...p, numero: v }))} />
            <FiscalField label="Complemento" value={emitenteEndereco.complemento} onChange={(v) => setEmitenteEndereco((p) => ({ ...p, complemento: v }))} />
            <FiscalField label="Bairro" value={emitenteEndereco.bairro} onChange={(v) => setEmitenteEndereco((p) => ({ ...p, bairro: v }))} />
            <FiscalField label="CEP" value={emitenteEndereco.cep} onChange={(v) => setEmitenteEndereco((p) => ({ ...p, cep: v }))} mono />
            <FiscalField label="Cód. IBGE Município" value={emitenteEndereco.cMun} onChange={(v) => setEmitenteEndereco((p) => ({ ...p, cMun: v }))} mono />
            <FiscalField label="Telefone" value={emitenteEndereco.fone} onChange={(v) => setEmitenteEndereco((p) => ({ ...p, fone: v }))} />
            <FiscalField label="E-mail" value={emitenteEndereco.email} onChange={(v) => setEmitenteEndereco((p) => ({ ...p, email: v }))} />
          </div>
        </details>
      </div>

      {/* SEÇÃO B: Destinatário da Mercadoria */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <FontAwesomeIcon icon={faUser} className="text-blue-600" />
            <span>B. Destinatário / Cliente</span>
          </div>

          <div className="w-64">
            <Select
              id="selectedPersonId"
              value={selectedPersonId}
              hideClearButton
              onChange={(_id, value) => handlePersonSelect(value)}
              className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              options={[
                { value: '', label: 'Buscar no cadastro de clientes...' },
                ...persons.map((p) => ({
                  value: p.id,
                  label: `${p.nomeOuRazao} (${p.tipoPessoa} - ${p.uf || p.pais})`,
                })),
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tipo de Pessoa */}
          <div>
            <label htmlFor="destinatarioTipoPessoa" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Tipo de Pessoa
            </label>
            <Select
              id="destinatarioTipoPessoa"
              value={destinatario.tipoPessoa || 'PJ'}
              hideClearButton
              onChange={(_id, value) =>
                setDestinatario((prev) => ({
                  ...prev,
                  tipoPessoa: value,
                  pais: value === 'ESTRANGEIRO' ? 'Exterior' : 'Brasil',
                  paisCodigo: value === 'ESTRANGEIRO' ? 'EX' : 'BR',
                }))
              }
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              options={[
                { value: 'PJ', label: 'Pessoa Jurídica (CNPJ)' },
                { value: 'PF', label: 'Pessoa Física (CPF)' },
                { value: 'ESTRANGEIRO', label: 'Destinatário no Exterior' },
              ]}
            />
          </div>

          {/* Documento (CNPJ/CPF ou ID Estrangeiro) */}
          <div>
            <label htmlFor="destinatarioDocumento" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              {destinatario.tipoPessoa === 'ESTRANGEIRO' ? 'ID Fiscal Internacional / VAT' : 'CPF ou CNPJ *'}
            </label>
            <InputText
              id="destinatarioDocumento"
              value={destinatario.documento || ''}
              onChange={(_id, value) => setDestinatario((prev) => ({ ...prev, documento: value }))}
              placeholder={destinatario.tipoPessoa === 'ESTRANGEIRO' ? 'Ex: NL884920192B01' : '00.000.000/0000-00'}
              className={`${FORM_CLS} font-mono`}
            />
          </div>

          {/* Inscrição Estadual */}
          <div>
            <label htmlFor="destinatarioInscricaoEstadual" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Inscrição Estadual (IE)
            </label>
            <InputText
              id="destinatarioInscricaoEstadual"
              value={destinatario.inscricaoEstadual || ''}
              onChange={(_id, value) => setDestinatario((prev) => ({ ...prev, inscricaoEstadual: value }))}
              placeholder="Isento ou Nº da IE"
              className={`${FORM_CLS} font-mono`}
            />
          </div>

          {/* Nome ou Razão Social */}
          <div className="md:col-span-2">
            <label htmlFor="destinatarioNome" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Nome ou Razão Social *
            </label>
            <InputText
              id="destinatarioNome"
              value={destinatario.nomeOuRazao || ''}
              onChange={(_id, value) => setDestinatario((prev) => ({ ...prev, nomeOuRazao: value }))}
              placeholder="Ex: Global Trading Logistics B.V."
              className={FORM_CLS}
            />
          </div>

          {/* UF e Município */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="destinatarioUf" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                UF / Estado
              </label>
              <InputText
                id="destinatarioUf"
                value={destinatario.uf || ''}
                onChange={(_id, value) => setDestinatario((prev) => ({ ...prev, uf: value.toUpperCase() }))}
                placeholder="SP"
                maxLength={2}
                className={`${FORM_CLS} uppercase text-center`}
              />
            </div>
            <div>
              <label htmlFor="destinatarioMunicipio" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Município
              </label>
              <InputText
                id="destinatarioMunicipio"
                value={destinatario.municipio || ''}
                onChange={(_id, value) => setDestinatario((prev) => ({ ...prev, municipio: value }))}
                placeholder="São Paulo"
                className={FORM_CLS}
              />
            </div>
          </div>
        </div>

        {/* Endereço e contato completos do destinatário */}
        <details className="rounded-lg border border-gray-200 dark:border-slate-800">
          <summary className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 cursor-pointer">
            Endereço e contato completos do destinatário
          </summary>
          <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            <FiscalField label="Logradouro" value={destinatarioEndereco.logradouro} onChange={(v) => setDestinatarioEndereco((p) => ({ ...p, logradouro: v }))} className="md:col-span-2" />
            <FiscalField label="Número" value={destinatarioEndereco.numero} onChange={(v) => setDestinatarioEndereco((p) => ({ ...p, numero: v }))} />
            <FiscalField label="Complemento" value={destinatarioEndereco.complemento} onChange={(v) => setDestinatarioEndereco((p) => ({ ...p, complemento: v }))} />
            <FiscalField label="Bairro" value={destinatarioEndereco.bairro} onChange={(v) => setDestinatarioEndereco((p) => ({ ...p, bairro: v }))} />
            <FiscalField label="CEP" value={destinatarioEndereco.cep} onChange={(v) => setDestinatarioEndereco((p) => ({ ...p, cep: v }))} mono />
            <FiscalField label="Cód. IBGE Município" value={destinatarioEndereco.cMun} onChange={(v) => setDestinatarioEndereco((p) => ({ ...p, cMun: v }))} mono />
            <FiscalField label="Telefone" value={destinatarioEndereco.fone} onChange={(v) => setDestinatarioEndereco((p) => ({ ...p, fone: v }))} />
            <FiscalField label="E-mail" value={destinatarioEndereco.email || destinatario.email || ''} onChange={(v) => setDestinatarioEndereco((p) => ({ ...p, email: v }))} />
            <FiscalField label="País (cód.)" value={destinatarioEndereco.cPais || destinatario.paisCodigo || ''} onChange={(v) => setDestinatarioEndereco((p) => ({ ...p, cPais: v }))} mono />
            <FiscalField label="País (nome)" value={destinatarioEndereco.xPais || destinatario.pais || ''} onChange={(v) => setDestinatarioEndereco((p) => ({ ...p, xPais: v }))} className="md:col-span-2" />
          </div>
        </details>

        {/* Checkbox para salvar cliente no catálogo */}
        <div className="pt-2 flex items-center gap-2">
          <Checkbox
            id="chk-save-person"
            checked={savePersonToCatalog}
            onChange={(_id, checked) => setSavePersonToCatalog(checked)}
          />
          <label htmlFor="chk-save-person" className="text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
            Salvar este destinatário no cadastro reutilizável de clientes
          </label>
        </div>
      </div>

      {/* SEÇÃO C: Tabela de Produtos */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <FontAwesomeIcon icon={faListCheck} className="text-blue-600" />
              <span>C. Produtos e Mercadorias ({itens.length} itens)</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Informe os dados de cada item. Cálculos e totais são atualizados em tempo real com precisão decimal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              buttonType="ghost"
              outline
              bordered
              size="small"
              onClick={() => setCatalogModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
            >
              <FontAwesomeIcon icon={faBookOpen} className="text-blue-600" />
              <span>Catálogo de Produtos</span>
            </Button>

            <Button
              type="button"
              buttonType="primary"
              outline
              bordered
              size="small"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Nova Linha</span>
            </Button>
          </div>
        </div>

        {/* Grade Editável de Produtos */}
        <div className="overflow-x-auto border border-gray-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <th className="px-2.5 py-2.5 w-10 text-center">#</th>
                <th className="px-2 py-2.5 w-28">Código</th>
                <th className="px-3 py-2.5 min-w-[200px]">Descrição do Produto *</th>
                <th className="px-2 py-2.5 w-24">NCM *</th>
                <th className="px-2 py-2.5 w-20">CFOP *</th>
                <th className="px-2 py-2.5 w-16 text-center">UN</th>
                <th className="px-2 py-2.5 w-24 text-right">Qtd *</th>
                <th className="px-2 py-2.5 w-28 text-right">Valor Unit. *</th>
                <th className="px-2 py-2.5 w-24 text-right">Desconto</th>
                <th className="px-3 py-2.5 w-28 text-right">Total Linha</th>
                <th className="px-2 py-2.5 w-20 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {itens.map((it, idx) => (
                <Fragment key={it.itemId}>
                <tr
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-2 py-2 text-center text-gray-500 font-mono text-[11px]">
                    {idx + 1}
                  </td>

                  {/* Código */}
                  <td className="px-1.5 py-2">
                    <InputText
                      id={`nfe-item-${it.itemId}-codigo`}
                      value={it.codigo || ''}
                      onChange={(_id, value) => handleItemChange(it.itemId, 'codigo', value)}
                      placeholder="SKU-001"
                      className={`${INPUT_CLS} font-mono`}
                    />
                  </td>

                  {/* Descrição */}
                  <td className="px-1.5 py-2">
                    <InputText
                      id={`nfe-item-${it.itemId}-descricao`}
                      value={it.descricao || ''}
                      onChange={(_id, value) => handleItemChange(it.itemId, 'descricao', value)}
                      placeholder="Descrição clara da mercadoria..."
                      className={INPUT_CLS}
                    />
                  </td>

                  {/* NCM */}
                  <td className="px-1.5 py-2">
                    <InputText
                      id={`nfe-item-${it.itemId}-ncm`}
                      maxLength={8}
                      value={it.ncm || ''}
                      onChange={(_id, value) => handleItemChange(it.itemId, 'ncm', value.replace(/\D/g, ''))}
                      placeholder="84089090"
                      className={`${INPUT_CLS} font-mono text-center`}
                    />
                  </td>

                  {/* CFOP */}
                  <td className="px-1.5 py-2">
                    <InputText
                      id={`nfe-item-${it.itemId}-cfop`}
                      maxLength={4}
                      value={it.cfop || ''}
                      onChange={(_id, value) => handleItemChange(it.itemId, 'cfop', value.replace(/\D/g, ''))}
                      placeholder={destinoOperacao === '3' ? '7101' : '5101'}
                      className={`${INPUT_CLS} font-mono text-center`}
                    />
                  </td>

                  {/* Unidade */}
                  <td className="px-1.5 py-2">
                    <InputText
                      id={`nfe-item-${it.itemId}-unidade`}
                      maxLength={6}
                      value={it.unidade || ''}
                      onChange={(_id, value) => handleItemChange(it.itemId, 'unidade', value.toUpperCase())}
                      placeholder="UN"
                      className={`${INPUT_CLS} text-center font-mono uppercase`}
                    />
                  </td>

                  {/* Quantidade */}
                  <td className="px-1.5 py-2">
                    <InputText
                      id={`nfe-item-${it.itemId}-quantidade`}
                      value={it.quantidade || ''}
                      onChange={(_id, value) => handleItemChange(it.itemId, 'quantidade', value)}
                      placeholder="1.0000"
                      className={`${INPUT_CLS} text-right font-mono`}
                    />
                  </td>

                  {/* Valor Unitário */}
                  <td className="px-1.5 py-2">
                    <InputText
                      id={`nfe-item-${it.itemId}-valorUnitario`}
                      value={it.valorUnitario || ''}
                      onChange={(_id, value) => handleItemChange(it.itemId, 'valorUnitario', value)}
                      placeholder="0.0000"
                      className={`${INPUT_CLS} text-right font-mono`}
                    />
                  </td>

                  {/* Desconto */}
                  <td className="px-1.5 py-2">
                    <InputText
                      id={`nfe-item-${it.itemId}-desconto`}
                      value={it.desconto || ''}
                      onChange={(_id, value) => handleItemChange(it.itemId, 'desconto', value)}
                      placeholder="0.00"
                      className={`${INPUT_CLS} text-right font-mono text-gray-500 dark:text-slate-400`}
                    />
                  </td>

                  {/* Total Linha */}
                  <td className="px-2.5 py-2 text-right font-semibold text-gray-900 dark:text-white font-mono text-xs">
                    {formatBRL(it.valorTotal || '0.00')}
                  </td>

                  {/* Ações da Linha */}
                  <td className="px-2 py-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        buttonType="ghost"
                        outline
                        size="small"
                        square
                        onClick={() => toggleItemDetails(it.itemId)}
                        title="Detalhes fiscais do item"
                        className="!p-1 text-gray-500 dark:text-slate-400"
                      >
                        <FontAwesomeIcon icon={expandedItems.has(it.itemId) ? faChevronUp : faChevronDown} className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        buttonType="ghost"
                        outline
                        size="small"
                        square
                        onClick={() => handleSaveProductToCatalog(it)}
                        title="Salvar produto no catálogo reutilizável"
                        className="!p-1 text-gray-500 dark:text-slate-400"
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        buttonType="ghost"
                        outline
                        size="small"
                        square
                        onClick={() => handleDuplicateItem(it.itemId)}
                        title="Duplicar linha"
                        className="!p-1 text-gray-500 dark:text-slate-400"
                      >
                        <FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        buttonType="danger"
                        outline
                        size="small"
                        square
                        onClick={() => handleRemoveItem(it.itemId)}
                        title="Remover produto"
                        className="!p-1 text-gray-500 dark:text-slate-400"
                      >
                        <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>

                {expandedItems.has(it.itemId) && (
                  <tr className="bg-blue-50/20 dark:bg-slate-800/40">
                    <td colSpan={11} className="px-3 py-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-blue-700 dark:text-blue-300">
                          <FontAwesomeIcon icon={faLayerGroup} />
                          Detalhes fiscais do item {idx + 1}
                        </div>

                        <FiscalGroup title="Produto e Unidades" accent="slate">
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            <FiscalField label="CEST" value={it.cest} onChange={(v) => handleItemDetailChange(it.itemId, 'cest', v)} mono />
                            <FiscalField label="GTIN Comercial" value={it.cEAN} onChange={(v) => handleItemDetailChange(it.itemId, 'cEAN', v)} mono />
                            <FiscalField label="GTIN Tributável" value={it.cEANTrib} onChange={(v) => handleItemDetailChange(it.itemId, 'cEANTrib', v)} mono />
                            <FiscalField label="UN Tributável" value={it.unidadeTributavel} onChange={(v) => handleItemDetailChange(it.itemId, 'unidadeTributavel', v)} mono />
                            <FiscalField label="Qtd Tributável" value={it.quantidadeTributavel} onChange={(v) => handleItemDetailChange(it.itemId, 'quantidadeTributavel', v)} mono />
                            <FiscalField label="Valor Unit. Trib." value={it.valorUnitarioTributavel} onChange={(v) => handleItemDetailChange(it.itemId, 'valorUnitarioTributavel', v)} mono />
                            <FiscalField label="Compõe Total (indTot)" value={it.indicadorComposicaoTotal} onChange={(v) => handleItemDetailChange(it.itemId, 'indicadorComposicaoTotal', v)} mono />
                            <FiscalField label="Pedido" value={it.pedido} onChange={(v) => handleItemDetailChange(it.itemId, 'pedido', v)} />
                            <FiscalField label="Item do Pedido" value={it.itemPedido} onChange={(v) => handleItemDetailChange(it.itemId, 'itemPedido', v)} />
                            <FiscalField label="Info. Adicional" value={it.informacoesAdicionais} onChange={(v) => handleItemDetailChange(it.itemId, 'informacoesAdicionais', v)} className="md:col-span-2" />
                          </div>
                        </FiscalGroup>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                          <FiscalGroup title="ICMS" accent="blue">
                            <div className="grid grid-cols-2 gap-1.5">
                              <FiscalField label="CST" value={it.tributos.icms.cst} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.icms.cst', v)} mono />
                              <FiscalField label="CSOSN" value={it.tributos.icms.csosn} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.icms.csosn', v)} mono />
                              <FiscalField label="Origem" value={it.tributos.icms.origem} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.icms.origem', v)} mono />
                              <FiscalField label="Mod. Base" value={it.tributos.icms.modalidadeBase} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.icms.modalidadeBase', v)} mono />
                              <FiscalField label="Base ICMS" value={it.tributos.icms.vBC} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.icms.vBC', v)} mono />
                              <FiscalField label="% Redução" value={it.tributos.icms.pRedBC} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.icms.pRedBC', v)} mono />
                              <FiscalField label="Alíquota %" value={it.tributos.icms.pICMS} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.icms.pICMS', v)} mono />
                              <FiscalField label="Valor ICMS" value={it.tributos.icms.vICMS} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.icms.vICMS', v)} mono />
                            </div>
                          </FiscalGroup>

                          <FiscalGroup title="IPI" accent="blue">
                            <div className="grid grid-cols-2 gap-1.5">
                              <FiscalField label="CST" value={it.tributos.ipi.cst} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ipi.cst', v)} mono />
                              <FiscalField label="Enquadramento" value={it.tributos.ipi.cEnq} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ipi.cEnq', v)} mono />
                              <FiscalField label="Base IPI" value={it.tributos.ipi.vBC} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ipi.vBC', v)} mono />
                              <FiscalField label="Alíquota %" value={it.tributos.ipi.pIPI} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ipi.pIPI', v)} mono />
                              <FiscalField label="Valor IPI" value={it.tributos.ipi.vIPI} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ipi.vIPI', v)} mono />
                            </div>
                          </FiscalGroup>

                          <FiscalGroup title="PIS / COFINS" accent="blue">
                            <div className="grid grid-cols-2 gap-1.5">
                              <FiscalField label="CST PIS" value={it.tributos.pis.cst} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.pis.cst', v)} mono />
                              <FiscalField label="Base PIS" value={it.tributos.pis.vBC} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.pis.vBC', v)} mono />
                              <FiscalField label="Alíq. PIS %" value={it.tributos.pis.pPIS} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.pis.pPIS', v)} mono />
                              <FiscalField label="Valor PIS" value={it.tributos.pis.vPIS} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.pis.vPIS', v)} mono />
                              <FiscalField label="CST COFINS" value={it.tributos.cofins.cst} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.cofins.cst', v)} mono />
                              <FiscalField label="Base COFINS" value={it.tributos.cofins.vBC} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.cofins.vBC', v)} mono />
                              <FiscalField label="Alíq. COFINS %" value={it.tributos.cofins.pCOFINS} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.cofins.pCOFINS', v)} mono />
                              <FiscalField label="Valor COFINS" value={it.tributos.cofins.vCOFINS} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.cofins.vCOFINS', v)} mono />
                            </div>
                          </FiscalGroup>

                          <FiscalGroup title="IBS / CBS" accent="emerald">
                            <div className="grid grid-cols-2 gap-1.5">
                              <FiscalField label="CST" value={it.tributos.ibsCbs.cst} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ibsCbs.cst', v)} mono />
                              <FiscalField label="Class. Trib." value={it.tributos.ibsCbs.cClassTrib} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ibsCbs.cClassTrib', v)} mono />
                              <FiscalField label="Base IBS/CBS" value={it.tributos.ibsCbs.vBC} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ibsCbs.vBC', v)} mono />
                              <FiscalField label="% IBS UF" value={it.tributos.ibsCbs.pIBSUF} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ibsCbs.pIBSUF', v)} mono />
                              <FiscalField label="Valor IBS UF" value={it.tributos.ibsCbs.vIBSUF} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ibsCbs.vIBSUF', v)} mono />
                              <FiscalField label="% IBS Mun" value={it.tributos.ibsCbs.pIBSMun} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ibsCbs.pIBSMun', v)} mono />
                              <FiscalField label="Valor IBS Mun" value={it.tributos.ibsCbs.vIBSMun} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ibsCbs.vIBSMun', v)} mono />
                              <FiscalField label="Valor IBS" value={it.tributos.ibsCbs.vIBS} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ibsCbs.vIBS', v)} mono />
                              <FiscalField label="% CBS" value={it.tributos.ibsCbs.pCBS} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ibsCbs.pCBS', v)} mono />
                              <FiscalField label="Valor CBS" value={it.tributos.ibsCbs.vCBS} onChange={(v) => handleItemDetailChange(it.itemId, 'tributos.ibsCbs.vCBS', v)} mono />
                            </div>
                          </FiscalGroup>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO D: Totais e Despesas Acessórias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Despesas Acessórias */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-slate-800">
            <FontAwesomeIcon icon={faTruck} className="text-blue-600" />
            <span>D. Transporte e Despesas Acessórias</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="modalidadeFrete" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Modalidade do Frete
              </label>
              <Select
                id="modalidadeFrete"
                value={modalidadeFrete}
                hideClearButton
                onChange={(_id, value) => setModalidadeFrete(value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                options={[
                  { value: '0', label: '0 - Contratação por Conta do Remetente (CIF)' },
                  { value: '1', label: '1 - Contratação por Conta do Destinatário (FOB)' },
                  { value: '2', label: '2 - Transporte por Conta de Terceiros' },
                  { value: '9', label: '9 - Sem Ocorrência de Transporte' },
                ]}
              />
            </div>

            <div>
              <label htmlFor="nfeValorFrete" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Valor do Frete (R$)
              </label>
              <InputText
                id="nfeValorFrete"
                value={valorFrete}
                onChange={(_id, value) => setValorFrete(value)}
                placeholder="0.00"
                className={`${FORM_CLS} font-mono`}
              />
            </div>

            <div>
              <label htmlFor="nfeValorSeguro" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Valor do Seguro (R$)
              </label>
              <InputText
                id="nfeValorSeguro"
                value={valorSeguro}
                onChange={(_id, value) => setValorSeguro(value)}
                placeholder="0.00"
                className={`${FORM_CLS} font-mono`}
              />
            </div>

            <div>
              <label htmlFor="nfeOutrasDespesas" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Outras Despesas Acessórias (R$)
              </label>
              <InputText
                id="nfeOutrasDespesas"
                value={outrasDespesas}
                onChange={(_id, value) => setOutrasDespesas(value)}
                placeholder="0.00"
                className={`${FORM_CLS} font-mono`}
              />
            </div>

            <div>
              <label htmlFor="nfeValorIPI" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Valor do IPI (R$)
              </label>
              <InputText
                id="nfeValorIPI"
                value={valorIPI}
                onChange={(_id, value) => setValorIPI(value)}
                placeholder="0.00"
                className={`${FORM_CLS} font-mono`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="nfeInformacoesAdicionais" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Informações Complementares / Fisco
            </label>
            <InputTextArea
              id="nfeInformacoesAdicionais"
              rows={2}
              value={informacoesAdicionais}
              onChange={(_id, value) => setInformacoesAdicionais(value)}
              placeholder="Dados de exportação, número de RE, dados bancários ou observações legais..."
              className="px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Resumo Consolidado de Totais */}
        <div className="bg-slate-50 dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/60 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-slate-800">
            <FontAwesomeIcon icon={faCalculator} className="text-blue-600" />
            <span>Resumo de Valores da NF-e</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-slate-400">
              <span>Total dos Produtos:</span>
              <span className="font-mono font-medium">{formatBRL(calculatedTotals.valorProdutos)}</span>
            </div>

            {decimalCompare(cleanDecimalString(valorFrete), '0.00') > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>(+) Frete:</span>
                <span className="font-mono">{formatBRL(valorFrete)}</span>
              </div>
            )}

            {decimalCompare(cleanDecimalString(valorSeguro), '0.00') > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>(+) Seguro:</span>
                <span className="font-mono">{formatBRL(valorSeguro)}</span>
              </div>
            )}

            {decimalCompare(cleanDecimalString(outrasDespesas), '0.00') > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>(+) Outras Despesas:</span>
                <span className="font-mono">{formatBRL(outrasDespesas)}</span>
              </div>
            )}

            {decimalCompare(cleanDecimalString(valorIPI), '0.00') > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>(+) IPI:</span>
                <span className="font-mono">{formatBRL(valorIPI)}</span>
              </div>
            )}

            {decimalCompare(cleanDecimalString(calculatedTotals.valorDesconto), '0.00') > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>(-) Desconto Total:</span>
                <span className="font-mono font-medium">-{formatBRL(calculatedTotals.valorDesconto)}</span>
              </div>
            )}

            <div className="pt-3 border-t-2 border-gray-200 dark:border-slate-700 flex justify-between items-baseline">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Valor Total Previsto:</span>
              <span className="text-xl font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                {formatBRL(calculatedTotals.valorTotalNota)}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700">
            Fórmula SEFAZ: Total = Produtos - Descontos + Frete + Seguro + Outras Despesas + IPI.
          </div>
        </div>
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
            buttonType="primary"
            outline
            bordered
            size="small"
            onClick={handleValidate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold"
          >
            <FontAwesomeIcon icon={faCheckDouble} />
            <span>Verificar Inconsistências</span>
          </Button>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            buttonType="success"
            outline
            bordered
            size="small"
            onClick={handleAddToPreparation}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
          >
            <FontAwesomeIcon icon={faBoxesStacked} />
            <span>Adicionar à Preparação N:M</span>
          </Button>

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
      </div>

      {/* MODAL: Catálogo de Produtos para Inserção Rápida */}
      {catalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <FontAwesomeIcon icon={faBookOpen} className="text-blue-600" />
                <span>Selecionar do Catálogo de Produtos</span>
              </div>
              <Button
                type="button"
                buttonType="ghost"
                outline
                size="small"
                square
                onClick={() => setCatalogModalOpen(false)}
                title="Fechar catálogo de produtos"
                className="!p-1 text-gray-400"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-slate-800">
              <InputText
                id="nfeCatalogSearch"
                placeholder="Pesquisar por código, descrição ou NCM..."
                value={catalogSearch}
                onChange={(_id, value) => setCatalogSearch(value)}
                className="px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {filteredCatalog.length === 0 ? (
                <p className="text-xs text-center text-gray-500 py-6">Nenhum produto encontrado no catálogo.</p>
              ) : (
                filteredCatalog.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-slate-800/60 flex items-center justify-between gap-4 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{prod.descricao}</p>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        Cód: {prod.codigo} • NCM: {prod.ncm} • Unidade: {prod.unidadeComercial}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-bold font-mono text-blue-700 dark:text-blue-400">
                        {formatBRL(prod.precoPadrao)}
                      </span>
                      <Button
                        type="button"
                        buttonType="primary"
                        size="small"
                        onClick={() => handleInsertFromCatalog(prod)}
                        className="px-3 py-1.5 text-xs font-semibold"
                      >
                        Inserir
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

      {/* GAVETA / MODAL: Relatório de Validação Fiscal */}
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
                  {validationResult.isValid ? 'Rascunho Apto' : 'Apontamentos Fiscais Encontrados'}
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
                        : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
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
