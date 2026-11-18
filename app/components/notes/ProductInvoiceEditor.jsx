'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
} from '@fortawesome/free-solid-svg-icons';
import { catalogsRepository } from '@/features/catalogsRepository';
import { documentRepository } from '@/features/documentRepository';
import { validateNFe } from '@/features/validation/nfeValidator';
import { formatBRL } from '@/lib/formatters';
import { cleanDecimalString, decimalAdd, decimalSubtract, decimalCompare } from '@/lib/calculations/decimal';
import { calculateInvoiceTotals } from '@/lib/calculations/invoiceTotals';
import { useAppContext } from '@/context/AppContext';

const INITIAL_EMPTY_ITEM = () => ({
  itemId: `item-nfe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  item: 1,
  codigo: '',
  descricao: '',
  ncm: '',
  cfop: '5101',
  unidade: 'UN',
  quantidade: '1.0000',
  valorUnitario: '0.0000',
  valorTotal: '0.00',
  desconto: '0.00',
  observacoes: '',
});

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
      ? initialData.itens
      : [INITIAL_EMPTY_ITEM()]
  );

  // Despesas e Totais
  const [valorFrete, setValorFrete] = useState(initialData?.totais?.valorFrete || '0.00');
  const [valorSeguro, setValorSeguro] = useState(initialData?.totais?.valorSeguro || '0.00');
  const [outrasDespesas, setOutrasDespesas] = useState(initialData?.totais?.outrasDespesas || '0.00');
  const [valorDesconto, setValorDesconto] = useState(initialData?.totais?.valorDesconto || '0.00');

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
  const handleCompanyChange = (e) => {
    const compId = e.target.value;
    setSelectedCompanyId(compId);
    const found = companies.find((c) => c.id === compId);
    setEmitente(found || null);
  };

  // Atualiza destinatário quando seleciona do cadastro existente
  const handlePersonSelect = (e) => {
    const personId = e.target.value;
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

    const totals = calculateInvoiceTotals({
      itens: safeItens,
      valorFrete: freteClean,
      valorSeguro: seguroClean,
      valorDesconto: descClean,
      outrasDespesas: outrasClean,
    });

    return totals;
  }, [itens, valorFrete, valorSeguro, outrasDespesas, valorDesconto]);

  // Edição granular de campo de item por itemId estável
  const handleItemChange = useCallback((itemId, field, value) => {
    setItens((prevItens) =>
      prevItens.map((item) => {
        if (item.itemId !== itemId) return item;

        const updated = { ...item, [field]: value };

        // Recálculo do valor total do item se quantidade, valorUnitario ou desconto mudarem
        if (field === 'quantidade' || field === 'valorUnitario' || field === 'desconto') {
          const q = cleanDecimalString(field === 'quantidade' ? value : item.quantidade || '0');
          const vu = cleanDecimalString(field === 'valorUnitario' ? value : item.valorUnitario || '0');
          const desc = cleanDecimalString(field === 'desconto' ? value : item.desconto || '0');

          const lineTotals = calculateInvoiceTotals({
            itens: [{ quantidade: q, valorUnitario: vu, valorDesconto: desc }],
            valorFrete: '0.00',
            valorSeguro: '0.00',
            outrasDespesas: '0.00',
          });

          updated.valorTotal = lineTotals.valorProdutos;
        }

        return updated;
      })
    );
  }, []);

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
      itemId: `item-nfe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      item: itens.length + 1,
      codigo: product.codigo || '',
      descricao: product.descricao || '',
      ncm: product.ncm || '',
      cfop: destinoOperacao === '3' ? '7101' : product.cfopPadrao || '5101',
      unidade: product.unidadeComercial || 'UN',
      quantidade: '1.0000',
      valorUnitario: cleanDecimalString(product.precoPadrao || '0.00'),
      valorTotal: cleanDecimalString(product.precoPadrao || '0.00'),
      desconto: '0.00',
      observacoes: product.cest ? `CEST: ${product.cest}` : '',
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
      emitenteId: selectedCompanyId,
      emitente,
      destinatarioId: selectedPersonId,
      destinatario,
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
        valorTotalNota: calculatedTotals.valorTotalNota,
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
    selectedPersonId,
    destinatario,
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
          <button
            type="button"
            onClick={handleValidate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition-colors"
          >
            <FontAwesomeIcon icon={faCheckDouble} className="text-blue-600" />
            <span>Validar Dados</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faFloppyDisk} />
            <span>{saving ? 'Salvando...' : 'Salvar e Revisar'}</span>
          </button>
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
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Título de Referência do Rascunho
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: NF-e Comercial Peças Industriais"
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Data Prevista */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Data Prevista de Emissão
            </label>
            <input
              type="date"
              value={dataPrevistaEmissao}
              onChange={(e) => setDataPrevistaEmissao(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Empresa Emitente */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Empresa Emitente (Origem) *
            </label>
            <select
              value={selectedCompanyId}
              onChange={handleCompanyChange}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma empresa cadastrada...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razaoSocial} — CNPJ: {c.cnpj} ({c.uf})
                </option>
              ))}
            </select>
            {emitente && (
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                IE: {emitente.inscricaoEstadual || 'Isenta'} • {emitente.municipio}/{emitente.uf} • Regime: {emitente.regimeTributario}
              </p>
            )}
          </div>

          {/* Natureza da Operação */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Natureza da Operação *
            </label>
            <input
              type="text"
              value={naturezaOperacao}
              onChange={(e) => setNaturezaOperacao(e.target.value)}
              placeholder="Ex: VENDA DE MERCADORIA"
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>

          {/* Destino da Operação */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Destino da Operação
            </label>
            <select
              value={destinoOperacao}
              onChange={(e) => {
                const newDest = e.target.value;
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
            >
              <option value="1">1 - Operação Interna (Mesmo Estado)</option>
              <option value="2">2 - Operação Interestadual</option>
              <option value="3">3 - Operação com Exterior (Exportação)</option>
            </select>
          </div>

          {/* Finalidade */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Finalidade da NF-e
            </label>
            <select
              value={finalidadeEmissao}
              onChange={(e) => setFinalidadeEmissao(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">1 - NF-e Normal</option>
              <option value="2">2 - NF-e Complementar</option>
              <option value="3">3 - NF-e de Ajuste</option>
              <option value="4">4 - Devolução de Mercadoria</option>
            </select>
          </div>

          {/* Série e Número Previsto */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Série Prevista
              </label>
              <input
                type="text"
                value={seriePrevista}
                onChange={(e) => setSeriePrevista(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-center font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Número Previsto
              </label>
              <input
                type="text"
                placeholder="Automático"
                value={numeroPrevisto}
                onChange={(e) => setNumeroPrevisto(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO B: Destinatário da Mercadoria */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <FontAwesomeIcon icon={faUser} className="text-blue-600" />
            <span>B. Destinatário / Cliente</span>
          </div>

          <div className="w-64">
            <select
              value={selectedPersonId}
              onChange={handlePersonSelect}
              className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Buscar no cadastro de clientes...</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nomeOuRazao} ({p.tipoPessoa} - {p.uf || p.pais})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tipo de Pessoa */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Tipo de Pessoa
            </label>
            <select
              value={destinatario.tipoPessoa || 'PJ'}
              onChange={(e) =>
                setDestinatario((prev) => ({
                  ...prev,
                  tipoPessoa: e.target.value,
                  pais: e.target.value === 'ESTRANGEIRO' ? 'Exterior' : 'Brasil',
                  paisCodigo: e.target.value === 'ESTRANGEIRO' ? 'EX' : 'BR',
                }))
              }
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="PJ">Pessoa Jurídica (CNPJ)</option>
              <option value="PF">Pessoa Física (CPF)</option>
              <option value="ESTRANGEIRO">Destinatário no Exterior</option>
            </select>
          </div>

          {/* Documento (CNPJ/CPF ou ID Estrangeiro) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              {destinatario.tipoPessoa === 'ESTRANGEIRO' ? 'ID Fiscal Internacional / VAT' : 'CPF ou CNPJ *'}
            </label>
            <input
              type="text"
              value={destinatario.documento || ''}
              onChange={(e) => setDestinatario((prev) => ({ ...prev, documento: e.target.value }))}
              placeholder={destinatario.tipoPessoa === 'ESTRANGEIRO' ? 'Ex: NL884920192B01' : '00.000.000/0000-00'}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Inscrição Estadual */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Inscrição Estadual (IE)
            </label>
            <input
              type="text"
              value={destinatario.inscricaoEstadual || ''}
              onChange={(e) => setDestinatario((prev) => ({ ...prev, inscricaoEstadual: e.target.value }))}
              placeholder="Isento ou Nº da IE"
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Nome ou Razão Social */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Nome ou Razão Social *
            </label>
            <input
              type="text"
              value={destinatario.nomeOuRazao || ''}
              onChange={(e) => setDestinatario((prev) => ({ ...prev, nomeOuRazao: e.target.value }))}
              placeholder="Ex: Global Trading Logistics B.V."
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* UF e Município */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                UF / Estado
              </label>
              <input
                type="text"
                value={destinatario.uf || ''}
                onChange={(e) => setDestinatario((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                placeholder="SP"
                maxLength={2}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 uppercase text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Município
              </label>
              <input
                type="text"
                value={destinatario.municipio || ''}
                onChange={(e) => setDestinatario((prev) => ({ ...prev, municipio: e.target.value }))}
                placeholder="São Paulo"
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Checkbox para salvar cliente no catálogo */}
        <div className="pt-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="chk-save-person"
            checked={savePersonToCatalog}
            onChange={(e) => setSavePersonToCatalog(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 border-gray-300"
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
            <button
              type="button"
              onClick={() => setCatalogModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 transition-colors"
            >
              <FontAwesomeIcon icon={faBookOpen} className="text-blue-600" />
              <span>Catálogo de Produtos</span>
            </button>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Nova Linha</span>
            </button>
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
                <tr
                  key={it.itemId}
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-2 py-2 text-center text-gray-500 font-mono text-[11px]">
                    {idx + 1}
                  </td>

                  {/* Código */}
                  <td className="px-1.5 py-2">
                    <input
                      type="text"
                      value={it.codigo || ''}
                      onChange={(e) => handleItemChange(it.itemId, 'codigo', e.target.value)}
                      placeholder="SKU-001"
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded text-xs font-mono"
                    />
                  </td>

                  {/* Descrição */}
                  <td className="px-1.5 py-2">
                    <input
                      type="text"
                      value={it.descricao || ''}
                      onChange={(e) => handleItemChange(it.itemId, 'descricao', e.target.value)}
                      placeholder="Descrição clara da mercadoria..."
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded text-xs"
                    />
                  </td>

                  {/* NCM */}
                  <td className="px-1.5 py-2">
                    <input
                      type="text"
                      maxLength={8}
                      value={it.ncm || ''}
                      onChange={(e) => handleItemChange(it.itemId, 'ncm', e.target.value.replace(/\D/g, ''))}
                      placeholder="84089090"
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded text-xs font-mono text-center"
                    />
                  </td>

                  {/* CFOP */}
                  <td className="px-1.5 py-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={it.cfop || ''}
                      onChange={(e) => handleItemChange(it.itemId, 'cfop', e.target.value.replace(/\D/g, ''))}
                      placeholder={destinoOperacao === '3' ? '7101' : '5101'}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded text-xs font-mono text-center"
                    />
                  </td>

                  {/* Unidade */}
                  <td className="px-1.5 py-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={it.unidade || ''}
                      onChange={(e) => handleItemChange(it.itemId, 'unidade', e.target.value.toUpperCase())}
                      placeholder="UN"
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded text-xs text-center font-mono uppercase"
                    />
                  </td>

                  {/* Quantidade */}
                  <td className="px-1.5 py-2">
                    <input
                      type="text"
                      value={it.quantidade || ''}
                      onChange={(e) => handleItemChange(it.itemId, 'quantidade', e.target.value)}
                      placeholder="1.0000"
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded text-xs text-right font-mono"
                    />
                  </td>

                  {/* Valor Unitário */}
                  <td className="px-1.5 py-2">
                    <input
                      type="text"
                      value={it.valorUnitario || ''}
                      onChange={(e) => handleItemChange(it.itemId, 'valorUnitario', e.target.value)}
                      placeholder="0.0000"
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded text-xs text-right font-mono"
                    />
                  </td>

                  {/* Desconto */}
                  <td className="px-1.5 py-2">
                    <input
                      type="text"
                      value={it.desconto || ''}
                      onChange={(e) => handleItemChange(it.itemId, 'desconto', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded text-xs text-right font-mono text-gray-500"
                    />
                  </td>

                  {/* Total Linha */}
                  <td className="px-2.5 py-2 text-right font-semibold text-gray-900 dark:text-white font-mono text-xs">
                    {formatBRL(it.valorTotal || '0.00')}
                  </td>

                  {/* Ações da Linha */}
                  <td className="px-2 py-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSaveProductToCatalog(it)}
                        title="Salvar produto no catálogo reutilizável"
                        className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateItem(it.itemId)}
                        title="Duplicar linha"
                        className="p-1 rounded text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.itemId)}
                        title="Remover produto"
                        className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
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
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Modalidade do Frete
              </label>
              <select
                value={modalidadeFrete}
                onChange={(e) => setModalidadeFrete(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">0 - Contratação por Conta do Remetente (CIF)</option>
                <option value="1">1 - Contratação por Conta do Destinatário (FOB)</option>
                <option value="2">2 - Transporte por Conta de Terceiros</option>
                <option value="9">9 - Sem Ocorrência de Transporte</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Valor do Frete (R$)
              </label>
              <input
                type="text"
                value={valorFrete}
                onChange={(e) => setValorFrete(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Valor do Seguro (R$)
              </label>
              <input
                type="text"
                value={valorSeguro}
                onChange={(e) => setValorSeguro(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Outras Despesas Acessórias (R$)
              </label>
              <input
                type="text"
                value={outrasDespesas}
                onChange={(e) => setOutrasDespesas(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Informações Complementares / Fisco
            </label>
            <textarea
              rows={2}
              value={informacoesAdicionais}
              onChange={(e) => setInformacoesAdicionais(e.target.value)}
              placeholder="Dados de exportação, número de RE, dados bancários ou observações legais..."
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white"
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
            Fórmula SEFAZ: Total = Produtos - Descontos + Frete + Seguro + Outras Despesas.
          </div>
        </div>
      </div>

      {/* BARRA DE AÇÕES FIXA INFERIOR */}
      <div className="sticky bottom-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-300 dark:border-slate-700 p-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/notas')}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleValidate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
          >
            <FontAwesomeIcon icon={faCheckDouble} />
            <span>Verificar Inconsistências</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddToPreparation}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faBoxesStacked} />
            <span>Adicionar à Preparação N:M</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faFloppyDisk} />
            <span>{saving ? 'Gravando Rascunho...' : 'Salvar Rascunho e Abrir Prévia'}</span>
            <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
          </button>
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
              <button
                type="button"
                onClick={() => setCatalogModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-slate-800">
              <input
                type="text"
                placeholder="Pesquisar por código, descrição ou NCM..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                      <button
                        type="button"
                        onClick={() => handleInsertFromCatalog(prod)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        Inserir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setCatalogModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 rounded-lg"
              >
                Fechar
              </button>
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
              <button
                type="button"
                onClick={() => setValidationDrawerOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
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
              <button
                type="button"
                onClick={() => setValidationDrawerOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Entendido, Retornar ao Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
