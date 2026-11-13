'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileInvoice,
  faPlus,
  faMagnifyingGlass,
  faFilter,
  faTrashCan,
  faPenToSquare,
  faRotateRight,
  faBoxesStacked,
  faXmark,
  faBuilding,
  faGlobe,
  faTag,
  faCheckSquare,
  faSquare,
  faUserTie,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import DataTable from '@/components/table/DataTable';
import Button from '@/components/buttons/Button';
import Dialog from '@/components/Layouts/Dialog';
import { useAppContext } from '@/context/AppContext';

import { formatBRL } from '@/lib/formatters/currency';
import { formatDateBR } from '@/lib/formatters/dates';
import { getStatusLabel, getStatusColor } from '@/lib/formatters/status';
import { invoiceRepository } from '@/features/invoiceRepository';

export const EXPORT_CUSTOMERS = [
  { id: 'cust-001', name: 'Global Trading Corporation', country: 'Estados Unidos', foreignId: 'US-12345' },
  { id: 'cust-002', name: 'Asian Grain Corporation', country: 'China', foreignId: 'CN-98765' },
  { id: 'cust-003', name: 'Industrial Supply Corp.', country: 'Estados Unidos', foreignId: 'US-TX-9874125' },
  { id: 'cust-004', name: 'Global Trading Logistics B.V.', country: 'Holanda', foreignId: 'NL884920192B01' },
  { id: 'cust-005', name: 'Auto Assembly Europe GmbH', country: 'Alemanha', foreignId: 'DE-HH-20200' },
];

export default function DocumentosPage() {
  const router = useRouter();
  const { toast } = useAppContext();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Debounce
  const [rawSearchTerm, setRawSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'XML' | 'PDF'
  const [customerFilter, setCustomerFilter] = useState('ALL'); // 'ALL' | 'UNASSIGNED' | customerId
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [onlyAvailableBalance, setOnlyAvailableBalance] = useState(false);
  const [visualGrouping, setVisualGrouping] = useState('list'); // 'list' | 'customer' | 'supplier' | 'status'

  // Stable selection across filtering/pages
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Customer Assignment Dialog
  const [assignDialog, setAssignDialog] = useState({ open: false, invoiceId: null });
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Delete Dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, invoice: null });

  // Debounce search term by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(rawSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearchTerm]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoiceRepository.list();
      setInvoices(data);
    } catch (e) {
      toast.error('Erro ao carregar documentos.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReset = async () => {
    await invoiceRepository.resetAll();
    setSelectedIds(new Set());
    await loadData();
    toast.success('Dados demonstrativos restaurados com sucesso!');
  };

  const handleDelete = async () => {
    if (!deleteDialog.invoice) return;
    try {
      await invoiceRepository.delete(deleteDialog.invoice.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteDialog.invoice.id);
        return next;
      });
      toast.success(`Documento ${deleteDialog.invoice.numero} removido.`);
      await loadData();
    } catch (e) {
      toast.error('Não foi possível remover o documento.');
    } finally {
      setDeleteDialog({ open: false, invoice: null });
    }
  };

  const handleAssignCustomer = async () => {
    if (!assignDialog.invoiceId) return;
    const customerObj = EXPORT_CUSTOMERS.find((c) => c.id === selectedCustomerId) || null;
    try {
      await invoiceRepository.update(assignDialog.invoiceId, {
        clienteExportacao: customerObj,
      });
      toast.success('Cliente de exportação atualizado!');
      setAssignDialog({ open: false, invoiceId: null });
      await loadData();
    } catch (e) {
      toast.error('Falha ao associar cliente de exportação.');
    }
  };

  // Distinct suppliers for filter dropdown
  const uniqueSuppliers = useMemo(() => {
    const map = new Map();
    invoices.forEach((inv) => {
      if (inv.emitente?.razaoSocial) {
        map.set(inv.emitente.razaoSocial, inv.emitente.razaoSocial);
      }
    });
    return Array.from(map.values()).sort();
  }, [invoices]);

  // Filter application
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Status
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;

      // 2. Type
      if (typeFilter !== 'ALL' && inv.tipoDocumento !== typeFilter) return false;

      // 3. Customer
      if (customerFilter === 'UNASSIGNED') {
        if (inv.clienteExportacao?.id) return false;
      } else if (customerFilter !== 'ALL') {
        if (inv.clienteExportacao?.id !== customerFilter) return false;
      }

      // 4. Supplier
      if (supplierFilter !== 'ALL' && inv.emitente?.razaoSocial !== supplierFilter) return false;

      // 5. Balance
      if (onlyAvailableBalance && (inv.status === 'utilizado' || inv.status === 'concluido')) return false;

      // 6. Text search (Number, Serie, Access key, CNPJ, Supplier name, Product code, Product description, NCM)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNum = inv.numero?.toLowerCase().includes(term);
        const matchSerie = inv.serie?.toLowerCase().includes(term);
        const matchChave = inv.chaveAcesso?.toLowerCase().includes(term);
        const matchEmitente = inv.emitente?.razaoSocial?.toLowerCase().includes(term);
        const matchCnpj = inv.emitente?.cnpj?.replace(/\D/g, '').includes(term.replace(/\D/g, ''));
        const matchCliente = inv.clienteExportacao?.name?.toLowerCase().includes(term);

        const matchItem = inv.itens?.some((it) => {
          return (
            it.codigo?.toLowerCase().includes(term) ||
            it.descricao?.toLowerCase().includes(term) ||
            it.ncm?.toLowerCase().includes(term)
          );
        });

        if (!matchNum && !matchSerie && !matchChave && !matchEmitente && !matchCnpj && !matchCliente && !matchItem) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, statusFilter, typeFilter, customerFilter, supplierFilter, onlyAvailableBalance, searchTerm]);

  // Selection handlers
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredInvoices.forEach((inv) => next.add(inv.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const invertSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredInvoices.forEach((inv) => {
        if (next.has(inv.id)) next.delete(inv.id);
        else next.add(inv.id);
      });
      return next;
    });
  };

  // Selected metrics
  const selectedMetrics = useMemo(() => {
    const selectedList = invoices.filter((inv) => selectedIds.has(inv.id));
    const count = selectedList.length;
    const totalItems = selectedList.reduce((acc, inv) => acc + (inv.itens?.length || 0), 0);
    const totalValue = selectedList.reduce(
      (acc, inv) => acc + parseFloat(inv.totais?.valorTotalNota || 0),
      0
    );
    const suppliers = new Set(selectedList.map((inv) => inv.emitente?.razaoSocial).filter(Boolean));
    const customers = new Set(selectedList.map((inv) => inv.clienteExportacao?.id).filter(Boolean));
    const hasMultipleCustomers = customers.size > 1;

    return {
      count,
      totalItems,
      totalValue,
      suppliersCount: suppliers.size,
      customersCount: customers.size,
      hasMultipleCustomers,
      selectedList,
    };
  }, [invoices, selectedIds]);

  const handleStartPreparationWithSelected = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).join(',');
    router.push(`/preparacoes/nova?sourceIds=${ids}`);
  };

  // Active filters count & reset
  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    customerFilter !== 'ALL' ||
    supplierFilter !== 'ALL' ||
    onlyAvailableBalance ||
    Boolean(searchTerm);

  const resetFilters = () => {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setCustomerFilter('ALL');
    setSupplierFilter('ALL');
    setOnlyAvailableBalance(false);
    setRawSearchTerm('');
    setSearchTerm('');
  };

  // Table columns
  const columns = useMemo(() => [
    {
      key: 'selection',
      label: '',
      align: 'center',
      render: (item) => {
        const isSelected = selectedIds.has(item.id);
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleSelect(item.id);
            }}
            className="text-slate-400 hover:text-blue-600 cursor-pointer p-1"
          >
            <FontAwesomeIcon
              icon={isSelected ? faCheckSquare : faSquare}
              className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-300 dark:text-slate-600'}`}
            />
          </button>
        );
      },
    },
    {
      key: 'numero',
      label: 'Número / Chave',
      align: 'left',
      render: (item) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              NF-e {item.numero}
            </span>
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                item.tipoDocumento === 'XML'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
              }`}
            >
              {item.tipoDocumento}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono truncate max-w-[190px]" title={item.chaveAcesso}>
            {item.chaveAcesso}
          </span>
        </div>
      ),
    },
    {
      key: 'emitente',
      label: 'Fornecedor (Origem)',
      align: 'left',
      render: (item) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-medium text-slate-900 dark:text-slate-100 text-xs truncate" title={item.emitente?.razaoSocial}>
            {item.emitente?.razaoSocial || '—'}
          </span>
          <span className="text-[11px] text-slate-500">
            CNPJ: {item.emitente?.cnpj || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente Exportação',
      align: 'left',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          {item.clienteExportacao ? (
            <span
              onClick={() => {
                setSelectedCustomerId(item.clienteExportacao.id);
                setAssignDialog({ open: true, invoiceId: item.id });
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 cursor-pointer hover:bg-purple-100 border border-purple-200 dark:border-purple-800 truncate max-w-[150px]"
              title={`${item.clienteExportacao.name} (${item.clienteExportacao.country})`}
            >
              <FontAwesomeIcon icon={faGlobe} className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{item.clienteExportacao.name}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedCustomerId('');
                setAssignDialog({ open: true, invoiceId: item.id });
              }}
              className="text-[11px] text-slate-400 hover:text-blue-600 underline cursor-pointer"
            >
              + Atribuir
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'data',
      label: 'Emissão',
      align: 'left',
      render: (item) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
          {formatDateBR(item.dataEmissao || item.emissao)}
        </span>
      ),
    },
    {
      key: 'itens',
      label: 'Itens',
      align: 'center',
      render: (item) => (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
          {item.itens?.length || 0}
        </span>
      ),
    },
    {
      key: 'valor',
      label: 'Valor Total',
      align: 'right',
      render: (item) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
          {formatBRL(item.totais?.valorTotalNota)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Situação',
      align: 'center',
      render: (item) => {
        const color = getStatusColor(item.status);
        return (
          <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${color.bg} ${color.text} ${color.border}`}>
            {getStatusLabel(item.status)}
          </span>
        );
      },
    },
    {
      key: 'acoes',
      label: 'Ações',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            buttonType="primary"
            size="small"
            outline
            title="Conferir documento"
            onClick={() => router.push(`/documentos/${item.id}/conferencia`)}
          >
            <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3 mr-1" />
            Conferir
          </Button>
          <button
            onClick={() => setDeleteDialog({ open: true, invoice: item })}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
            title="Excluir documento"
          >
            <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], [router, selectedIds]);

  // Visual grouping helper
  const groupedInvoices = useMemo(() => {
    if (visualGrouping === 'list') return null;

    const map = new Map();
    filteredInvoices.forEach((inv) => {
      let groupKey = 'Outros';
      if (visualGrouping === 'customer') {
        groupKey = inv.clienteExportacao?.name || 'Sem cliente atribuído';
      } else if (visualGrouping === 'supplier') {
        groupKey = inv.emitente?.razaoSocial || 'Fornecedor não identificado';
      } else if (visualGrouping === 'status') {
        groupKey = getStatusLabel(inv.status);
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey).push(inv);
    });

    return Array.from(map.entries());
  }, [filteredInvoices, visualGrouping]);

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Documentos' }]}>
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FontAwesomeIcon icon={faFileInvoice} className="text-blue-600" />
              Documentos Fiscais de Origem
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gerencie, filtre e selecione NF-e recebidas de fornecedores para agrupamento e preparação de exportação.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              buttonType="secondary"
              size="small"
              outline
              onClick={handleReset}
              title="Restaurar dados originais de demonstração"
            >
              <FontAwesomeIcon icon={faRotateRight} className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Restaurar Mocks
            </Button>
            <Button
              buttonType="primary"
              size="small"
              onClick={() => router.push('/documentos/importar')}
            >
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 mr-1" />
              Importar NF-e
            </Button>
          </div>
        </div>

        {/* Stable Selection Floating Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheckSquare} className="text-blue-600" />
                {selectedMetrics.count} {selectedMetrics.count === 1 ? 'nota selecionada' : 'notas selecionadas'}
              </span>
              <span className="text-blue-800 dark:text-blue-300">
                • {selectedMetrics.totalItems} itens • Total: {formatBRL(selectedMetrics.totalValue)}
              </span>
              <span className="text-blue-700 dark:text-blue-400">
                • {selectedMetrics.suppliersCount} fornecedores
              </span>
              {selectedMetrics.hasMultipleCustomers && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-semibold text-[11px]">
                  ⚠️ Clientes de exportação divergentes
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-slate-600 dark:text-slate-300 hover:underline px-2 py-1 cursor-pointer"
              >
                Limpar seleção
              </button>
              <Button
                buttonType="primary"
                size="small"
                onClick={handleStartPreparationWithSelected}
              >
                <FontAwesomeIcon icon={faBoxesStacked} className="mr-1.5" />
                Iniciar Preparação ({selectedMetrics.count})
              </Button>
            </div>
          </div>
        )}

        {/* Filters & Visual Grouping Section */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
          {/* Row 1: Search & Main Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Search Input */}
            <div className="relative col-span-1 sm:col-span-2">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-2.5 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por NF-e, fornecedor, CNPJ, produto ou NCM..."
                value={rawSearchTerm}
                onChange={(e) => setRawSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-blue-500"
              />
            </div>

            {/* Status Dropdown */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-1.5 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">Todos os status</option>
                <option value="importado">Importado</option>
                <option value="em_conferencia">Em Conferência</option>
                <option value="conferido">Conferido</option>
                <option value="em_preparacao">Em Preparação</option>
                <option value="com_inconsistencias">Com Inconsistências</option>
                <option value="utilizado">Totalmente Utilizado</option>
              </select>
            </div>

            {/* Visual Grouping */}
            <div>
              <select
                value={visualGrouping}
                onChange={(e) => setVisualGrouping(e.target.value)}
                className="w-full py-1.5 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium text-blue-700 dark:text-blue-400"
              >
                <option value="list">Agrupamento: Lista Geral</option>
                <option value="customer">Agrupar por Cliente de Exportação</option>
                <option value="supplier">Agrupar por Fornecedor</option>
                <option value="status">Agrupar por Situação</option>
              </select>
            </div>
          </div>

          {/* Row 2: Secondary Filters & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Customer Filter */}
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="py-1 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">Todos os clientes</option>
                <option value="UNASSIGNED">Sem cliente atribuído</option>
                {EXPORT_CUSTOMERS.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.name} ({cust.country})
                  </option>
                ))}
              </select>

              {/* Supplier Filter */}
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="py-1 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-[180px] truncate"
              >
                <option value="ALL">Todos fornecedores</option>
                {uniqueSuppliers.map((supp) => (
                  <option key={supp} value={supp}>
                    {supp}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="py-1 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">XML e PDF</option>
                <option value="XML">Apenas XML</option>
                <option value="PDF">Apenas PDF</option>
              </select>

              {/* Balance Checkbox */}
              <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyAvailableBalance}
                  onChange={(e) => setOnlyAvailableBalance(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Apenas com saldo disponível</span>
              </label>
            </div>

            {/* Selection fast actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Selecionar visíveis ({filteredInvoices.length})
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={invertSelection}
                className="text-slate-500 hover:underline cursor-pointer"
              >
                Inverter
              </button>
              {hasActiveFilters && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                    Limpar filtros
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Data Presentation (Standard or Grouped) */}
        {groupedInvoices ? (
          <div className="space-y-4">
            {groupedInvoices.map(([groupName, groupItems]) => {
              const groupTotal = groupItems.reduce(
                (acc, inv) => acc + parseFloat(inv.totais?.valorTotalNota || 0),
                0
              );
              return (
                <div
                  key={groupName}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"
                >
                  <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FontAwesomeIcon icon={faBuilding} className="text-blue-600" />
                      {groupName} ({groupItems.length} {groupItems.length === 1 ? 'documento' : 'documentos'})
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Total: {formatBRL(groupTotal)}
                    </span>
                  </div>
                  <DataTable
                    data={groupItems}
                    columns={columns}
                    dense={true}
                    mainText=""
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <DataTable
              data={filteredInvoices}
              columns={columns}
              dense={false}
              mainText={`Listagem de Documentos (${filteredInvoices.length} encontrados)`}
            />
          </div>
        )}
      </div>

      {/* Customer Assignment Modal */}
      <Dialog
        showDialog={assignDialog.open}
        setDialogControl={(open) => setAssignDialog({ open, invoiceId: null })}
        title="Atribuir Cliente de Exportação"
        hideTextArea={true}
        btnAccept="Salvar Associação"
        btnCancel="Cancelar"
        confirmActionCallback={handleAssignCustomer}
      >
        <div className="p-4 space-y-3 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Associe esta NF-e de entrada ao cliente final de destino na exportação. Esta informação é comercial e será utilizada na preparação das notas de saída:
          </p>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-200">
              Selecione o Cliente de Exportação:
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
            >
              <option value="">— Remover cliente atribuído —</option>
              {EXPORT_CUSTOMERS.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} — {cust.country} ({cust.foreignId})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        showDialog={deleteDialog.open}
        setDialogControl={(open) => setDeleteDialog({ open, invoice: null })}
        title="Confirmar Exclusão de Documento"
        hideTextArea={true}
        btnAccept="Excluir"
        btnCancel="Cancelar"
        confirmActionCallback={handleDelete}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 p-4">
          Tem certeza de que deseja excluir o documento <strong>NF-e {deleteDialog.invoice?.numero}</strong>? Esta ação pode ser desfeita clicando em &quot;Restaurar Mocks&quot;.
        </p>
      </Dialog>
    </AppLayout>
  );
}
