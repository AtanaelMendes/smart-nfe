'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxesStacked,
  faArrowLeft,
  faArrowRight,
  faPlus,
  faTrashCan,
  faCheck,
  faCircleCheck,
  faTriangleExclamation,
  faShieldHalved,
  faFloppyDisk,
  faGlobe,
  faFileInvoice,
  faBuilding,
  faCalculator,
  faListCheck,
  faLayerGroup,
  faMagnifyingGlass,
  faRotateLeft,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import Dialog from '@/components/Layouts/Dialog';
import { useAppContext } from '@/context/AppContext';
import { invoiceRepository } from '@/features/invoiceRepository';
import { preparationRepository } from '@/features/preparationRepository';
import {
  cleanDecimalString,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  roundDecimal,
  decimalCompare,
} from '@/lib/calculations/decimal';
import { buildCompositeKey } from '@/lib/calculations/allocationEngine';
import { formatBRL } from '@/lib/formatters/currency';

export const EXPORT_CUSTOMERS = [
  { id: 'cust-001', name: 'Global Trading Corporation', country: 'Estados Unidos', foreignId: 'US-12345' },
  { id: 'cust-002', name: 'Asian Grain Corporation', country: 'China', foreignId: 'CN-98765' },
  { id: 'cust-003', name: 'Industrial Supply Corp.', country: 'Estados Unidos', foreignId: 'US-TX-9874125' },
  { id: 'cust-004', name: 'Global Trading Logistics B.V.', country: 'Holanda', foreignId: 'NL884920192B01' },
  { id: 'cust-005', name: 'Auto Assembly Europe GmbH', country: 'Alemanha', foreignId: 'DE-HH-20200' },
];

function NovaPreparacaoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useAppContext();

  const prepIdParam = searchParams.get('id');
  const sourceIdsParam = searchParams.get('sourceIds');

  // Active step
  const [activeStep, setActiveStep] = useState('origens'); // 'origens' | 'cliente' | 'destinos' | 'alocacao' | 'revisao'

  // Master Data
  const [allInvoices, setAllInvoices] = useState([]);
  const [activeAllocationsMap, setActiveAllocationsMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Preparation Entity State
  const [preparation, setPreparation] = useState({
    id: null,
    numero: '',
    titulo: 'Preparação de Exportação',
    status: 'draft',
    clienteExportacao: null,
    sourceInvoiceIds: [],
    destinos: [
      { id: 'dest-01', nome: 'Exportação 1 - Principal', observacoes: '', clienteId: null },
    ],
    // Alocações: { [allocationKey]: { quantity: string, destinationUnitPrice: string } }
    // Onde allocationKey = `${sourceInvoiceId}__${sourceItemId}__${destId}`
    allocations: {},
    observacoes: '',
  });

  // Filter in origins step
  const [originSearch, setOriginSearch] = useState('');
  const [filterDestinationInTable, setFilterDestinationInTable] = useState('ALL');
  const [filterOriginInTable, setFilterOriginInTable] = useState('ALL');

  // Load baseline invoices & existing prep if any
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const [invoicesList, activeAllocations] = await Promise.all([
          invoiceRepository.list(),
          preparationRepository.getActiveAllocations(prepIdParam || null),
        ]);
        setAllInvoices(invoicesList);
        setActiveAllocationsMap(activeAllocations);

        if (prepIdParam) {
          // Editing existing preparation
          const existing = await preparationRepository.findById(prepIdParam);
          if (existing) {
            setPreparation({
              id: existing.id,
              numero: existing.numero || '',
              titulo: existing.titulo || 'Preparação de Exportação',
              status: existing.status || 'draft',
              clienteExportacao: existing.clienteExportacao || null,
              sourceInvoiceIds: existing.sourceInvoiceIds || (existing.origens ? existing.origens.map((o) => o.invoiceId || o.id) : []),
              destinos: Array.isArray(existing.destinos) && existing.destinos.length > 0
                ? existing.destinos
                : [{ id: 'dest-01', nome: 'Exportação 1 - Principal' }],
              allocations: existing.alocacoes || existing.allocations || {},
              observacoes: existing.observacoes || '',
            });
          }
        } else if (sourceIdsParam) {
          // Starting from pre-selected IDs
          const ids = sourceIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
          setPreparation((prev) => ({
            ...prev,
            sourceInvoiceIds: ids,
          }));
        }
      } catch (err) {
        console.error('Erro ao inicializar preparação:', err);
        toast.error('Erro ao carregar dados para a preparação.');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [prepIdParam, sourceIdsParam, toast]);

  // Derived selected source invoices
  const selectedInvoices = useMemo(() => {
    return allInvoices.filter((inv) => preparation.sourceInvoiceIds.includes(inv.id));
  }, [allInvoices, preparation.sourceInvoiceIds]);

  // Operation Mode: N -> 1 (agrupamento), 1 -> M (divisao), N -> M (mista)
  const operationMode = useMemo(() => {
    const origCount = preparation.sourceInvoiceIds.length;
    const destCount = preparation.destinos.length;
    if (origCount > 1 && destCount === 1) return 'agrupamento';
    if (origCount === 1 && destCount > 1) return 'divisao';
    return 'mista';
  }, [preparation.sourceInvoiceIds.length, preparation.destinos.length]);

  // Is any source invoice a real volatile import?
  const isVolatileSession = useMemo(() => {
    return selectedInvoices.some((inv) => inv.isRealImport);
  }, [selectedInvoices]);

  // Flattened origin items with balance information
  const flattenedOriginItems = useMemo(() => {
    const list = [];
    selectedInvoices.forEach((inv) => {
      if (!Array.isArray(inv.itens)) return;
      inv.itens.forEach((item) => {
        const compositeKey = buildCompositeKey(inv.id, item.id);
        const originalQty = cleanDecimalString(item.quantidade || '0');
        // Already allocated in OTHER preparations
        const externalAllocatedQty = cleanDecimalString(activeAllocationsMap.get(compositeKey) || '0');

        // Total allocated in THIS current preparation across all destinations
        let currentPrepAllocatedQty = '0';
        preparation.destinos.forEach((dest) => {
          const key = `${inv.id}__${item.id}__${dest.id}`;
          const alloc = preparation.allocations[key];
          if (alloc && alloc.quantity) {
            currentPrepAllocatedQty = decimalAdd(currentPrepAllocatedQty, cleanDecimalString(alloc.quantity), 4);
          }
        });

        // Available balance = originalQty - externalAllocatedQty - currentPrepAllocatedQty
        const netBase = decimalSubtract(originalQty, externalAllocatedQty, 4);
        const finalAvailable = decimalSubtract(netBase, currentPrepAllocatedQty, 4);

        list.push({
          sourceInvoiceId: inv.id,
          sourceInvoiceNumero: inv.numero,
          sourceSupplier: inv.emitente?.razaoSocial || 'Fornecedor',
          item,
          compositeKey,
          originalQty,
          externalAllocatedQty,
          currentPrepAllocatedQty,
          finalAvailable: decimalCompare(finalAvailable, '0') < 0 ? '0.0000' : finalAvailable,
          unitPriceOrigin: cleanDecimalString(item.valorUnitario || '0'),
        });
      });
    });
    return list;
  }, [selectedInvoices, activeAllocationsMap, preparation.allocations, preparation.destinos]);

  // Handlers for Origins
  const toggleSourceInvoice = (invoiceId) => {
    setPreparation((prev) => {
      const exists = prev.sourceInvoiceIds.includes(invoiceId);
      const nextIds = exists
        ? prev.sourceInvoiceIds.filter((id) => id !== invoiceId)
        : [...prev.sourceInvoiceIds, invoiceId];

      // If removed, clean allocations for that invoice
      let nextAllocs = { ...prev.allocations };
      if (exists) {
        Object.keys(nextAllocs).forEach((k) => {
          if (k.startsWith(`${invoiceId}__`)) {
            delete nextAllocs[k];
          }
        });
      }

      return {
        ...prev,
        sourceInvoiceIds: nextIds,
        allocations: nextAllocs,
      };
    });
  };

  // Handlers for Destinations
  const addDestination = () => {
    const nextIdx = preparation.destinos.length + 1;
    const newDest = {
      id: `dest-${Date.now().toString(36)}-${nextIdx}`,
      nome: `Exportação ${nextIdx}`,
      observacoes: '',
      clienteId: preparation.clienteExportacao?.id || null,
    };
    setPreparation((prev) => ({
      ...prev,
      destinos: [...prev.destinos, newDest],
    }));
  };

  const removeDestination = (destId) => {
    if (preparation.destinos.length <= 1) {
      toast.error('A preparação deve conter pelo menos uma nota de destino.');
      return;
    }
    setPreparation((prev) => {
      const nextDestinos = prev.destinos.filter((d) => d.id !== destId);
      const nextAllocs = { ...prev.allocations };
      Object.keys(nextAllocs).forEach((k) => {
        if (k.endsWith(`__${destId}`)) {
          delete nextAllocs[k];
        }
      });
      return {
        ...prev,
        destinos: nextDestinos,
        allocations: nextAllocs,
      };
    });
  };

  const updateDestinationName = (destId, newName) => {
    setPreparation((prev) => ({
      ...prev,
      destinos: prev.destinos.map((d) => (d.id === destId ? { ...d, nome: newName } : d)),
    }));
  };

  // Handlers for Allocation
  const setAllocationQuantity = (sourceInvoiceId, itemId, destId, qty, defaultUnitPrice) => {
    const key = `${sourceInvoiceId}__${itemId}__${destId}`;
    setPreparation((prev) => {
      const nextAllocs = { ...prev.allocations };
      const cleanQty = cleanDecimalString(qty);

      if (cleanQty === '0' || cleanQty === '0.0000' || !cleanQty) {
        delete nextAllocs[key];
      } else {
        const existing = nextAllocs[key] || {};
        nextAllocs[key] = {
          quantity: cleanQty,
          destinationUnitPrice: existing.destinationUnitPrice || defaultUnitPrice || '0.00',
        };
      }

      return { ...prev, allocations: nextAllocs };
    });
  };

  const setAllocationPrice = (sourceInvoiceId, itemId, destId, price) => {
    const key = `${sourceInvoiceId}__${itemId}__${destId}`;
    setPreparation((prev) => {
      const nextAllocs = { ...prev.allocations };
      if (!nextAllocs[key]) return prev;

      nextAllocs[key] = {
        ...nextAllocs[key],
        destinationUnitPrice: cleanDecimalString(price),
      };
      return { ...prev, allocations: nextAllocs };
    });
  };

  // Allocate all available balance of one item to a specific destination
  const allocateAllAvailableToDest = (sourceInvoiceId, itemId, destId, defaultUnitPrice) => {
    const compositeKey = buildCompositeKey(sourceInvoiceId, itemId);
    const originEntry = flattenedOriginItems.find((o) => o.compositeKey === compositeKey);
    if (!originEntry) return;

    // Current qty allocated to THIS dest
    const key = `${sourceInvoiceId}__${itemId}__${destId}`;
    const curDestQty = cleanDecimalString(preparation.allocations[key]?.quantity || '0');

    // Total available including what was already given to this dest
    const totalPossibleForThisDest = decimalAdd(originEntry.finalAvailable, curDestQty, 4);
    if (decimalCompare(totalPossibleForThisDest, '0') <= 0) return;

    setAllocationQuantity(sourceInvoiceId, itemId, destId, totalPossibleForThisDest, defaultUnitPrice);
  };

  // Batch action: Allocate all available goods to a destination
  const allocateEverythingToDestination = (destId) => {
    setPreparation((prev) => {
      const nextAllocs = { ...prev.allocations };
      flattenedOriginItems.forEach((origin) => {
        const invId = origin.sourceInvoiceId;
        const itmId = origin.item.id;
        const key = `${invId}__${itmId}__${destId}`;

        // Available balance considering what's currently in other destinations
        let otherDestAlloc = '0';
        prev.destinos.forEach((d) => {
          if (d.id !== destId) {
            const otherKey = `${invId}__${itmId}__${d.id}`;
            const a = prev.allocations[otherKey];
            if (a?.quantity) {
              otherDestAlloc = decimalAdd(otherDestAlloc, cleanDecimalString(a.quantity), 4);
            }
          }
        });

        const netForDest = decimalSubtract(
          decimalSubtract(origin.originalQty, origin.externalAllocatedQty, 4),
          otherDestAlloc,
          4
        );

        if (decimalCompare(netForDest, '0') > 0) {
          nextAllocs[key] = {
            quantity: netForDest,
            destinationUnitPrice: nextAllocs[key]?.destinationUnitPrice || origin.unitPriceOrigin,
          };
        }
      });

      return { ...prev, allocations: nextAllocs };
    });
    toast.success('Todas as quantidades disponíveis foram alocadas ao destino selecionado!');
  };

  // Clear allocations for a destination
  const clearDestinationAllocations = (destId) => {
    setPreparation((prev) => {
      const nextAllocs = { ...prev.allocations };
      Object.keys(nextAllocs).forEach((k) => {
        if (k.endsWith(`__${destId}`)) {
          delete nextAllocs[k];
        }
      });
      return { ...prev, allocations: nextAllocs };
    });
  };

  // Calculations per destination
  const destinationTotals = useMemo(() => {
    const map = {};
    preparation.destinos.forEach((dest) => {
      let totalValue = '0.00';
      let totalItemsCount = 0;

      Object.entries(preparation.allocations).forEach(([key, alloc]) => {
        if (!key.endsWith(`__${dest.id}`)) return;
        if (!alloc || !alloc.quantity || alloc.quantity === '0') return;

        const [invId, itmId] = key.split('__');
        const origin = flattenedOriginItems.find((o) => o.sourceInvoiceId === invId && o.item.id === itmId);
        if (!origin) return;

        totalItemsCount++;
        const itemVal = decimalMultiply(alloc.quantity, alloc.destinationUnitPrice || origin.unitPriceOrigin, 2);
        totalValue = decimalAdd(totalValue, itemVal, 2);
      });

      map[dest.id] = { totalValue, totalItemsCount };
    });
    return map;
  }, [preparation.destinos, preparation.allocations, flattenedOriginItems]);

  // Overall grand total
  const grandTotal = useMemo(() => {
    let sum = '0.00';
    Object.values(destinationTotals).forEach((t) => {
      sum = decimalAdd(sum, t.totalValue, 2);
    });
    return sum;
  }, [destinationTotals]);

  // Save preparation handler
  const handleSave = async (finalStatus = 'draft') => {
    if (preparation.sourceInvoiceIds.length === 0) {
      toast.error('Selecione pelo menos uma NF-e de origem.');
      setActiveStep('origens');
      return;
    }

    try {
      setIsSaving(true);
      const dataToSave = {
        ...preparation,
        tipo: operationMode,
        status: finalStatus,
        valorTotal: grandTotal,
        origens: selectedInvoices.map((inv) => ({
          invoiceId: inv.id,
          numero: inv.numero,
          emitente: inv.emitente?.razaoSocial,
          destinatario: inv.destinatario?.nome,
          chaveAcesso: inv.chaveAcesso,
          isRealImport: inv.isRealImport,
        })),
      };

      if (preparation.id) {
        await preparationRepository.update(preparation.id, dataToSave);
        toast.success(`Preparação ${preparation.numero || preparation.id} salva com sucesso!`);
      } else {
        const created = await preparationRepository.create(dataToSave);
        setPreparation((prev) => ({
          ...prev,
          id: created.id,
          numero: created.numero,
        }));
        toast.success(`Preparação ${created.numero} criada com sucesso!`);
      }

      if (finalStatus === 'active') {
        router.push('/preparacoes');
      }
    } catch (err) {
      console.error('Erro ao salvar preparação:', err);
      toast.error('Erro ao salvar preparação.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Preparações', href: '/preparacoes' },
        { label: preparation.numero || 'Nova Preparação' },
      ]}
    >
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Volatile Session Alert */}
        {isVolatileSession && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-lg p-3.5 flex items-center gap-3">
            <FontAwesomeIcon icon={faShieldHalved} className="text-amber-600 w-5 h-5 shrink-0" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold">Aviso de Sessão Temporária: </span>
              Esta preparação envolve documentos fiscais reais mantidos exclusivamente na memória volátil do navegador. <strong>Não feche ou recarregue esta aba</strong> sob risco de perda dos dados em andamento.
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/preparacoes" className="text-slate-400 hover:text-slate-600">
                <FontAwesomeIcon icon={faArrowLeft} />
              </Link>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FontAwesomeIcon icon={faBoxesStacked} className="text-blue-600" />
                {preparation.titulo}
              </h1>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                {operationMode === 'agrupamento' ? 'Agrupamento (N → 1)' : operationMode === 'divisao' ? 'Divisão (1 → M)' : 'Mista (N → M)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Origens: {preparation.sourceInvoiceIds.length} NF-e • Destinos: {preparation.destinos.length} • Total Geral: {formatBRL(grandTotal)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              buttonType="secondary"
              size="small"
              outline
              onClick={() => handleSave('draft')}
              disabled={isSaving}
            >
              <FontAwesomeIcon icon={faFloppyDisk} className="mr-1" />
              Salvar Rascunho
            </Button>
            <Button
              buttonType="primary"
              size="small"
              onClick={() => handleSave('active')}
              disabled={isSaving || preparation.sourceInvoiceIds.length === 0}
            >
              <FontAwesomeIcon icon={faCheck} className="mr-1" />
              Concluir Preparação
            </Button>
          </div>
        </div>

        {/* Non-Linear Step Tabs Navigation */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 flex items-center gap-1 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveStep('origens')}
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeStep === 'origens'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            Origens ({preparation.sourceInvoiceIds.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('cliente')}
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeStep === 'cliente'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            Cliente Exportação {preparation.clienteExportacao ? '✓' : ''}
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('destinos')}
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeStep === 'destinos'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
            Destinos ({preparation.destinos.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('alocacao')}
            className={`px-3 py-1.5 rounded font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeStep === 'alocacao'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">4</span>
            Alocação de Mercadorias (Matriz N:M)
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('revisao')}
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeStep === 'revisao'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">5</span>
            Revisão & Totais
          </button>
        </div>

        {/* STEP 1: ORIGENS */}
        {activeStep === 'origens' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Passo 1: Selecionar NF-e de Fornecedores (Origens)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adicione quantas notas fiscais de fornecedores forem necessárias. Não há limite de quantidade.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-2.5 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Buscar notas disponíveis..."
                  value={originSearch}
                  onChange={(e) => setOriginSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* List of Available Invoices to Toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allInvoices
                .filter((inv) => {
                  if (!originSearch.trim()) return true;
                  const q = originSearch.toLowerCase();
                  return (
                    inv.numero?.toLowerCase().includes(q) ||
                    inv.emitente?.razaoSocial?.toLowerCase().includes(q) ||
                    inv.chaveAcesso?.toLowerCase().includes(q)
                  );
                })
                .map((inv) => {
                  const isSelected = preparation.sourceInvoiceIds.includes(inv.id);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => toggleSourceInvoice(inv.id)}
                      className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            NF-e {inv.numero} (Série {inv.serie})
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isSelected ? 'Selecionada' : 'Adicionar'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate" title={inv.emitente?.razaoSocial}>
                          {inv.emitente?.razaoSocial || 'Fornecedor'}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          {inv.chaveAcesso}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500">{inv.itens?.length || 0} produtos</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatBRL(inv.totais?.valorTotalNota)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end pt-3">
              <Button buttonType="primary" size="small" onClick={() => setActiveStep('cliente')}>
                Prosseguir para Cliente de Exportação
                <FontAwesomeIcon icon={faArrowRight} className="ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: CLIENTE EXPORTAÇÃO */}
        {activeStep === 'cliente' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Passo 2: Definir Cliente Final de Exportação
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                O cliente final de exportação é a entidade destinatária da operação comercial internacional.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {EXPORT_CUSTOMERS.map((cust) => {
                const isSelected = preparation.clienteExportacao?.id === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => setPreparation((prev) => ({ ...prev, clienteExportacao: cust }))}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{cust.name}</span>
                      {isSelected && <FontAwesomeIcon icon={faCircleCheck} className="text-blue-600 w-4 h-4" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faGlobe} className="text-slate-400" />
                      País: <strong>{cust.country}</strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Doc Estrangeiro: <span className="font-mono">{cust.foreignId}</span>
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-3">
              <Button buttonType="secondary" size="small" outline onClick={() => setActiveStep('origens')}>
                <FontAwesomeIcon icon={faArrowLeft} className="mr-1.5" />
                Voltar para Origens
              </Button>
              <Button buttonType="primary" size="small" onClick={() => setActiveStep('destinos')}>
                Prosseguir para Destinos
                <FontAwesomeIcon icon={faArrowRight} className="ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: DESTINOS */}
        {activeStep === 'destinos' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Passo 3: Configurar Notas de Destino (Exportação)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adicione e renomeie as notas preparadas de exportação que receberão as mercadorias.
                </p>
              </div>

              <Button buttonType="secondary" size="small" onClick={addDestination}>
                <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
                Adicionar Nova Nota de Destino
              </Button>
            </div>

            <div className="space-y-3">
              {preparation.destinos.map((dest, index) => {
                const tot = destinationTotals[dest.id] || { totalValue: '0.00', totalItemsCount: 0 };
                return (
                  <div
                    key={dest.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={dest.nome}
                          onChange={(e) => updateDestinationName(dest.id, e.target.value)}
                          className="font-bold text-sm text-slate-900 dark:text-slate-100 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <p className="text-xs text-slate-500 pl-7">
                        Itens alocados: <strong>{tot.totalItemsCount}</strong> • Subtotal: <strong>{formatBRL(tot.totalValue)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => allocateEverythingToDestination(dest.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 cursor-pointer"
                        title="Alocar todo o saldo disponível nesta nota"
                      >
                        <FontAwesomeIcon icon={faBolt} className="mr-1" />
                        Alocar Tudo Aqui
                      </button>
                      <button
                        type="button"
                        onClick={() => clearDestinationAllocations(dest.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 cursor-pointer"
                        title="Limpar alocações desta nota"
                      >
                        <FontAwesomeIcon icon={faRotateLeft} className="mr-1" />
                        Limpar
                      </button>
                      {preparation.destinos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDestination(dest.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Remover nota de destino"
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-3">
              <Button buttonType="secondary" size="small" outline onClick={() => setActiveStep('cliente')}>
                <FontAwesomeIcon icon={faArrowLeft} className="mr-1.5" />
                Voltar para Cliente
              </Button>
              <Button buttonType="primary" size="small" onClick={() => setActiveStep('alocacao')}>
                Ir para Matriz de Alocação
                <FontAwesomeIcon icon={faArrowRight} className="ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: ALOCAÇÃO DE MERCADORIAS (MATRIZ N:M) */}
        {activeStep === 'alocacao' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCalculator} className="text-blue-600" />
                  Matriz de Alocação de Mercadorias (N origens → M destinos)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Edite as quantidades alocadas para cada destino. O saldo disponível é conferido em tempo real com precisão decimal estrita.
                </p>
              </div>

              {/* Table Filters */}
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={filterOriginInTable}
                  onChange={(e) => setFilterOriginInTable(e.target.value)}
                  className="py-1 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="ALL">Todas as origens</option>
                  {selectedInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      NF-e {inv.numero} ({inv.emitente?.razaoSocial?.substring(0, 15)}...)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* High-Density Compact Allocation Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-2.5">NF-e Origem</th>
                    <th className="py-2 px-2">Item</th>
                    <th className="py-2 px-2.5">Produto / Descrição</th>
                    <th className="py-2 px-2 text-center">NCM / UN</th>
                    <th className="py-2 px-2 text-right">Qtd Orig.</th>
                    <th className="py-2 px-2 text-right">Saldo Disp.</th>
                    {preparation.destinos.map((dest) => (
                      <th key={dest.id} className="py-2 px-2.5 text-center bg-blue-50/60 dark:bg-blue-950/40 border-l border-slate-200 dark:border-slate-700 min-w-[140px]">
                        <span className="font-bold text-blue-900 dark:text-blue-200 truncate block max-w-[130px]" title={dest.nome}>
                          {dest.nome}
                        </span>
                      </th>
                    ))}
                    <th className="py-2 px-2 text-right">Preço Orig.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {flattenedOriginItems
                    .filter((origin) => filterOriginInTable === 'ALL' || origin.sourceInvoiceId === filterOriginInTable)
                    .map((origin) => {
                      return (
                        <tr key={origin.compositeKey} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                          {/* Origem */}
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {origin.sourceInvoiceNumero}
                            </span>
                            <span className="block text-[10px] text-slate-400 truncate max-w-[120px]" title={origin.sourceSupplier}>
                              {origin.sourceSupplier}
                            </span>
                          </td>

                          {/* Item num */}
                          <td className="py-2 px-2 text-center text-slate-500 font-mono">
                            {origin.item.item || 1}
                          </td>

                          {/* Descrição */}
                          <td className="py-2 px-2.5 max-w-[200px]">
                            <span className="font-medium truncate block" title={origin.item.descricao}>
                              {origin.item.descricao}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Cód: {origin.item.codigo || '—'}
                            </span>
                          </td>

                          {/* NCM & Unidade */}
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <span className="font-mono text-[11px] block">{origin.item.ncm}</span>
                            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                              {origin.item.unidade}
                            </span>
                          </td>

                          {/* Qtd Original */}
                          <td className="py-2 px-2 text-right font-mono font-medium">
                            {origin.originalQty}
                          </td>

                          {/* Saldo Disponível */}
                          <td className="py-2 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {origin.finalAvailable}
                          </td>

                          {/* Destinos Columns */}
                          {preparation.destinos.map((dest) => {
                            const key = `${origin.sourceInvoiceId}__${origin.item.id}__${dest.id}`;
                            const alloc = preparation.allocations[key];
                            const currentQty = alloc?.quantity || '';
                            const unitPrice = alloc?.destinationUnitPrice || origin.unitPriceOrigin;

                            return (
                              <td
                                key={dest.id}
                                className="py-1.5 px-2 bg-blue-50/20 dark:bg-blue-950/20 border-l border-slate-200 dark:border-slate-700"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      step="0.0001"
                                      min="0"
                                      value={currentQty}
                                      placeholder="0.0000"
                                      onChange={(e) =>
                                        setAllocationQuantity(
                                          origin.sourceInvoiceId,
                                          origin.item.id,
                                          dest.id,
                                          e.target.value,
                                          origin.unitPriceOrigin
                                        )
                                      }
                                      className="w-full px-2 py-1 text-right font-mono text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-blue-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        allocateAllAvailableToDest(
                                          origin.sourceInvoiceId,
                                          origin.item.id,
                                          dest.id,
                                          origin.unitPriceOrigin
                                        )
                                      }
                                      className="px-1 py-1 text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 cursor-pointer shrink-0"
                                      title="Alocar todo o saldo disponível neste destino"
                                    >
                                      Max
                                    </button>
                                  </div>
                                </div>
                              </td>
                            );
                          })}

                          {/* Preço de Origem */}
                          <td className="py-2 px-2 text-right font-mono text-slate-500 whitespace-nowrap">
                            {formatBRL(origin.unitPriceOrigin)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-3">
              <Button buttonType="secondary" size="small" outline onClick={() => setActiveStep('destinos')}>
                <FontAwesomeIcon icon={faArrowLeft} className="mr-1.5" />
                Voltar para Destinos
              </Button>
              <Button buttonType="primary" size="small" onClick={() => setActiveStep('revisao')}>
                Prosseguir para Revisão
                <FontAwesomeIcon icon={faArrowRight} className="ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: REVISÃO & TOTAIS */}
        {activeStep === 'revisao' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Passo 5: Revisão Geral da Preparação
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Valide as notas de saída que serão geradas, os totais consolidados e as notas de origem envolvidas.
              </p>
            </div>

            {/* General Highlights Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <span className="text-slate-500 block">Total de NF-e Origens</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {preparation.sourceInvoiceIds.length} notas
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {selectedInvoices.reduce((acc, i) => acc + (i.itens?.length || 0), 0)} itens originais disponíveis
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <span className="text-slate-500 block">Notas de Destino</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {preparation.destinos.length} notas preparadas
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Operação do tipo <strong>{operationMode.toUpperCase()}</strong>
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/40">
                <span className="text-blue-700 dark:text-blue-300 block font-semibold">Valor Total Preparado</span>
                <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {formatBRL(grandTotal)}
                </span>
                <span className="text-[11px] text-blue-700 dark:text-blue-300 block mt-0.5">
                  Cliente: {preparation.clienteExportacao?.name || 'Não atribuído'}
                </span>
              </div>
            </div>

            {/* Destinations Breakdown */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Detalhamento por Nota de Destino:
              </h3>

              {preparation.destinos.map((dest) => {
                const tot = destinationTotals[dest.id] || { totalValue: '0.00', totalItemsCount: 0 };
                return (
                  <div key={dest.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {dest.nome}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatBRL(tot.totalValue)} ({tot.totalItemsCount} mercadorias)
                      </span>
                    </div>

                    <div className="text-xs text-slate-500">
                      Cliente: <strong>{preparation.clienteExportacao?.name || 'Padrão da Preparação'}</strong> ({preparation.clienteExportacao?.country || 'Exterior'})
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button buttonType="secondary" size="small" outline onClick={() => setActiveStep('alocacao')}>
                <FontAwesomeIcon icon={faArrowLeft} className="mr-1.5" />
                Voltar para Alocação
              </Button>
              <div className="flex items-center gap-2">
                <Button buttonType="secondary" size="small" outline onClick={() => handleSave('draft')} disabled={isSaving}>
                  <FontAwesomeIcon icon={faFloppyDisk} className="mr-1.5" />
                  Salvar Rascunho
                </Button>
                <Button buttonType="primary" size="small" onClick={() => handleSave('active')} disabled={isSaving}>
                  <FontAwesomeIcon icon={faCheck} className="mr-1.5" />
                  Concluir Preparação
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function NovaPreparacaoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Carregando editor de preparação...</div>}>
      <NovaPreparacaoInner />
    </Suspense>
  );
}
