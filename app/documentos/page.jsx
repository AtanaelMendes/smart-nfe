'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  faArrowRight,
  faChevronDown,
  faChevronRight,
  faXmark,
  faUser,
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

// ─── Clientes de Exportação mockados ──────────────────────────────
const EXPORT_CUSTOMERS = [
  { id: 'cust-001', name: 'Global Trading Corporation', country: 'Estados Unidos', foreignId: 'US-12345' },
  { id: 'cust-002', name: 'Asian Grain Corporation', country: 'China', foreignId: 'CN-98765' },
  { id: 'cust-003', name: 'Industrial Supply Corp.', country: 'Estados Unidos', foreignId: 'US-TX-9874125' },
  { id: 'cust-004', name: 'Global Trading Logistics B.V.', country: 'Holanda', foreignId: 'NL884920192B01' },
  { id: 'cust-005', name: 'Auto Assembly Europe GmbH', country: 'Alemanha', foreignId: 'DE-HH-20200' },
];

// ─── Hook useDebouncedValue ────────────────────────────────────────
function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Componente: pill de filtro ativo ─────────────────────────────
function FilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer"
      >
        <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// ─── Componente: Dialog de atribuição de cliente ──────────────────
function CustomerDialog({ invoice, onClose, onSave }) {
  const [selectedId, setSelectedId] = useState(invoice?.clienteExportacao?.id || '');
  if (!invoice) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FontAwesomeIcon icon={faUser} className="text-blue-500 w-4 h-4" />
            Atribuir Cliente de Exportação
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500">NF-e {invoice.numero} — {invoice.emitente?.razaoSocial}</p>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full text-xs py-2 px-3 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        >
          <option value="">— Sem cliente atribuído —</option>
          {EXPORT_CUSTOMERS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.country})
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button buttonType="secondary" size="small" outline onClick={onClose}>
            Cancelar
          </Button>
          <Button
            buttonType="primary"
            size="small"
            onClick={() => {
              const customer = EXPORT_CUSTOMERS.find((c) => c.id === selectedId) || null;
              onSave(invoice.id, customer ? { id: customer.id, name: customer.name, country: customer.country } : null);
            }}
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Grupo colapsável ─────────────────────────────────
function GroupHeader({ label, count, total, collapsed, onToggle }) {
  return (
    <tr
      className="cursor-pointer select-none bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700"
      onClick={onToggle}
    >
      <td colSpan={99} className="px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronDown} className="w-3 h-3 text-slate-400" />
          <span>{label}</span>
          <span className="ml-auto font-mono text-slate-500">{count} nota{count !== 1 ? 's' : ''} • {formatBRL(total)}</span>
        </div>
      </td>
    </tr>
  );
}

export default function DocumentosPage() {
  const router = useRouter();
  const { toast } = useAppContext();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Filtros ───────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 350);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [saldoFilter, setSaldoFilter] = useState(false);
  const [clienteFilter, setClienteFilter] = useState('ALL');
  const [groupBy, setGroupBy] = useState('lista');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // ─── Seleção ──────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ─── Dialogs ─────────────────────────────────────────────────
  const [deleteDialog, setDeleteDialog] = useState({ open: false, invoice: null });
  const [customerDialog, setCustomerDialog] = useState(null); // invoice object

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
    await loadData();
    toast.success('Dados demonstrativos restaurados com sucesso!');
  };

  const handleDelete = async () => {
    if (!deleteDialog.invoice) return;
    try {
      await invoiceRepository.delete(deleteDialog.invoice.id);
      toast.success(`Documento ${deleteDialog.invoice.numero} removido.`);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteDialog.invoice.id);
        return next;
      });
      await loadData();
    } catch (e) {
      toast.error('Não foi possível remover o documento.');
    } finally {
      setDeleteDialog({ open: false, invoice: null });
    }
  };

  const handleSaveCustomer = async (invoiceId, customerObj) => {
    try {
      await invoiceRepository.update(invoiceId, { clienteExportacao: customerObj });
      toast.success(customerObj ? `Cliente atribuído: ${customerObj.name}` : 'Cliente removido.');
      await loadData();
    } catch (e) {
      toast.error('Erro ao atribuir cliente.');
    } finally {
      setCustomerDialog(null);
    }
  };

  // ─── Lista de clientes únicos para o filtro ───────────────────
  const uniqueClientes = useMemo(() => {
    const names = new Set();
    invoices.forEach((inv) => {
      if (inv.clienteExportacao?.nome || inv.clienteExportacao?.name) {
        names.add(inv.clienteExportacao.nome || inv.clienteExportacao.name);
      }
    });
    return Array.from(names);
  }, [invoices]);

  // ─── Filtragem ────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;

      // Tipo
      if (typeFilter !== 'ALL' && String(inv.tipoDocumento || '').toUpperCase() !== typeFilter) return false;

      // Saldo
      if (saldoFilter && inv.status === 'utilizado') return false;

      // Cliente
      if (clienteFilter === '__SEM_CLIENTE__') {
        if (inv.clienteExportacao?.nome || inv.clienteExportacao?.name) return false;
      } else if (clienteFilter !== 'ALL') {
        const clientName = inv.clienteExportacao?.nome || inv.clienteExportacao?.name || '';
        if (clientName !== clienteFilter) return false;
      }

      // Busca textual
      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        const matches =
          String(inv.numero || '').toLowerCase().includes(term) ||
          String(inv.serie || '').toLowerCase().includes(term) ||
          String(inv.chaveAcesso || '').toLowerCase().includes(term) ||
          String(inv.emitente?.cnpj || '').toLowerCase().includes(term) ||
          String(inv.emitente?.razaoSocial || '').toLowerCase().includes(term) ||
          String(inv.destinatario?.nome || '').toLowerCase().includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [invoices, debouncedSearch, statusFilter, typeFilter, saldoFilter, clienteFilter]);

  // ─── Filtros ativos (pills) ────────────────────────────────────
  const activeFilters = useMemo(() => {
    const filters = [];
    if (searchTerm) filters.push({ key: 'search', label: `Busca: "${searchTerm}"`, clear: () => setSearchTerm('') });
    if (statusFilter !== 'ALL') filters.push({ key: 'status', label: `Status: ${statusFilter}`, clear: () => setStatusFilter('ALL') });
    if (typeFilter !== 'ALL') filters.push({ key: 'type', label: `Tipo: ${typeFilter}`, clear: () => setTypeFilter('ALL') });
    if (saldoFilter) filters.push({ key: 'saldo', label: 'Com saldo disponível', clear: () => setSaldoFilter(false) });
    if (clienteFilter !== 'ALL') {
      const label = clienteFilter === '__SEM_CLIENTE__' ? 'Sem cliente' : `Cliente: ${clienteFilter}`;
      filters.push({ key: 'cliente', label, clear: () => setClienteFilter('ALL') });
    }
    return filters;
  }, [searchTerm, statusFilter, typeFilter, saldoFilter, clienteFilter]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setSaldoFilter(false);
    setClienteFilter('ALL');
  };

  // ─── Seleção ──────────────────────────────────────────────────
  const visibleIds = useMemo(() => filteredInvoices.map((inv) => inv.id), [filteredInvoices]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Totais da seleção ────────────────────────────────────────
  const selectionStats = useMemo(() => {
    const selected = filteredInvoices.filter((inv) => selectedIds.has(inv.id));
    const totalItems = selected.reduce((acc, inv) => acc + (inv.itens?.length || 0), 0);
    const totalValue = selected.reduce((acc, inv) => acc + parseFloat(inv.totais?.valorTotalNota || 0), 0);
    return { count: selected.length, items: totalItems, value: totalValue };
  }, [filteredInvoices, selectedIds]);

  // ─── Agrupamento ─────────────────────────────────────────────
  const groupedData = useMemo(() => {
    if (groupBy === 'lista') return null;

    const getKey = (inv) => {
      if (groupBy === 'fornecedor') return inv.emitente?.razaoSocial || 'Sem emitente';
      if (groupBy === 'status') return getStatusLabel(inv.status) || inv.status || 'Sem status';
      if (groupBy === 'cliente') return inv.clienteExportacao?.name || inv.clienteExportacao?.nome || 'Sem cliente atribuído';
      return 'Todos';
    };

    const groups = {};
    filteredInvoices.forEach((inv) => {
      const key = getKey(inv);
      if (!groups[key]) groups[key] = { key, items: [], totalValue: 0 };
      groups[key].items.push(inv);
      groups[key].totalValue += parseFloat(inv.totais?.valorTotalNota || 0);
    });

    return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredInvoices, groupBy]);

  const toggleGroupCollapse = (key) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── Colunas ─────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={allVisibleSelected}
          ref={(el) => { if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected; }}
          onChange={toggleSelectAll}
          className="cursor-pointer w-3.5 h-3.5 accent-blue-600"
          title="Selecionar todos visíveis"
        />
      ),
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedIds.has(item.id)}
          onChange={() => toggleSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer w-3.5 h-3.5 accent-blue-600"
        />
      ),
    },
    {
      key: 'numero',
      label: 'Número / Série',
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
          <span className="text-xs text-slate-500 font-mono truncate max-w-[200px]" title={item.chaveAcesso}>
            Chave: {item.chaveAcesso?.substring(0, 20)}...
          </span>
        </div>
      ),
    },
    {
      key: 'emitente',
      label: 'Emitente',
      align: 'left',
      render: (item) => (
        <div className="flex flex-col max-w-[220px]">
          <span className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate" title={item.emitente?.razaoSocial}>
            {item.emitente?.razaoSocial}
          </span>
          <span className="text-xs text-slate-500">
            CNPJ: {item.emitente?.cnpj}
          </span>
        </div>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      align: 'left',
      render: (item) => {
        const nome = item.clienteExportacao?.name || item.clienteExportacao?.nome;
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCustomerDialog(item); }}
            className={`text-xs flex items-center gap-1 group cursor-pointer ${
              nome
                ? 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                : 'text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 italic'
            }`}
            title="Clique para atribuir cliente"
          >
            <FontAwesomeIcon icon={faUser} className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
            {nome || '—'}
          </button>
        );
      },
    },
    {
      key: 'data',
      label: 'Emissão',
      align: 'left',
      render: (item) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">
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
        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
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
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${color.bg} ${color.text} ${color.border}`}>
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
        <div className="flex items-center justify-center gap-1.5">
          <Button
            buttonType="primary"
            size="small"
            outline
            title="Conferir documento"
            onClick={() => router.push(`/documentos/${item.id}/conferencia`)}
          >
            <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5 mr-1" />
            Conferir
          </Button>
          <button
            onClick={() => setDeleteDialog({ open: true, invoice: item })}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
            title="Excluir documento"
          >
            <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [router, selectedIds, allVisibleSelected, someVisibleSelected]);

  // ─── Dados por grupo para renderização ────────────────────────
  const flatDataWithGroups = useMemo(() => {
    if (!groupedData) return filteredInvoices;
    // Flatten com marcadores de grupo
    const rows = [];
    groupedData.forEach((group) => {
      rows.push({ __isGroupHeader: true, key: group.key, count: group.items.length, totalValue: group.totalValue });
      if (!collapsedGroups[group.key]) {
        group.items.forEach((item) => rows.push(item));
      }
    });
    return rows;
  }, [groupedData, filteredInvoices, collapsedGroups]);

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Documentos' }]}>
      <div className="space-y-4">

        {/* Barra de seleção flutuante */}
        {selectedIds.size > 0 && (
          <div className="sticky top-0 z-30 bg-blue-600 dark:bg-blue-700 text-white rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-3 shadow-lg">
            <span className="text-sm font-semibold">
              {selectionStats.count} nota{selectionStats.count !== 1 ? 's' : ''} selecionada{selectionStats.count !== 1 ? 's' : ''}
            </span>
            <span className="text-blue-200 text-xs">|</span>
            <span className="text-xs text-blue-100">
              {selectionStats.items} iten{selectionStats.items !== 1 ? 's' : ''}
            </span>
            <span className="text-blue-200 text-xs">|</span>
            <span className="text-xs text-blue-100 font-mono">
              Total: {formatBRL(selectionStats.value)}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-blue-200 hover:text-white underline cursor-pointer"
              >
                Limpar seleção
              </button>
              <Button
                buttonType="secondary"
                size="small"
                onClick={() => {
                  const ids = Array.from(selectedIds).join(',');
                  router.push(`/preparacoes/nova?sourceIds=${ids}`);
                }}
              >
                <FontAwesomeIcon icon={faArrowRight} className="mr-1.5 w-3 h-3" />
                Iniciar Preparação
              </Button>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FontAwesomeIcon icon={faFileInvoice} className="text-blue-600" />
              Documentos Fiscais de Origem
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gerencie, confira e prepare as notas fiscais importadas para desmembramento e exportação.
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Filtros Avançados */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
          {/* Linha 1: Busca + Status + Tipo */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {/* Busca textual */}
            <div className="relative flex-1">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-2.5 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por nº, série, chave, CNPJ ou razão social..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-blue-500"
              />
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sm:w-44 py-1.5 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">Todos os status</option>
              <option value="IMPORTADO">Importado</option>
              <option value="CONFERENCIA_PENDENTE">Conferência Pendente</option>
              <option value="EM_PREPARACAO">Em Preparação</option>
              <option value="COM_INCONSISTENCIAS">Com Inconsistências</option>
              <option value="PRONTO_REVISAO">Pronto para Revisão</option>
            </select>

            {/* Tipo */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="sm:w-32 py-1.5 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">Todos os tipos</option>
              <option value="XML">XML</option>
              <option value="PDF">PDF</option>
            </select>
          </div>

          {/* Linha 2: Cliente + Saldo + Agrupamento */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Cliente */}
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faFilter} className="text-slate-400 w-3 h-3" />
              <select
                value={clienteFilter}
                onChange={(e) => setClienteFilter(e.target.value)}
                className="py-1 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">Todos os clientes</option>
                <option value="__SEM_CLIENTE__">Sem cliente atribuído</option>
                {uniqueClientes.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Saldo */}
            <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saldoFilter}
                onChange={(e) => setSaldoFilter(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
              />
              Apenas com saldo disponível
            </label>

            {/* Agrupamento */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-slate-500">Agrupar por:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="py-1 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="lista">Lista simples</option>
                <option value="fornecedor">Fornecedor</option>
                <option value="status">Status</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>
          </div>

          {/* Pills de filtros ativos */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 font-medium">Filtros ativos:</span>
              {activeFilters.map((f) => (
                <FilterPill key={f.key} label={f.label} onRemove={f.clear} />
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline ml-1 cursor-pointer"
              >
                Limpar todos
              </button>
            </div>
          )}
        </div>

        {/* Tabela de Dados */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          {groupBy === 'lista' ? (
            <DataTable
              data={filteredInvoices}
              columns={columns}
              dense={false}
              mainText={`Listagem de Documentos (${filteredInvoices.length} encontrados)`}
            />
          ) : (
            <div>
              <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500">
                {filteredInvoices.length} documento{filteredInvoices.length !== 1 ? 's' : ''} — agrupado por {groupBy}
              </div>
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-8">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        className="cursor-pointer w-3.5 h-3.5 accent-blue-600"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Número</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Emitente</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Itens</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {groupedData && groupedData.map((group) => (
                    <>
                      <GroupHeader
                        key={`group-${group.key}`}
                        label={group.key}
                        count={group.items.length}
                        total={group.totalValue}
                        collapsed={!!collapsedGroups[group.key]}
                        onToggle={() => toggleGroupCollapse(group.key)}
                      />
                      {!collapsedGroups[group.key] && group.items.map((item) => {
                        const isSelected = selectedIds.has(item.id);
                        const color = getStatusColor(item.status);
                        const clienteNome = item.clienteExportacao?.name || item.clienteExportacao?.nome;
                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                          >
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(item.id)}
                                className="cursor-pointer w-3.5 h-3.5 accent-blue-600"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">NF-e {item.numero}</span>
                                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${item.tipoDocumento === 'XML' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {item.tipoDocumento}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 font-mono">{item.chaveAcesso?.substring(0, 16)}...</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 max-w-[180px]">
                              <span className="text-slate-800 dark:text-slate-200 truncate block text-xs" title={item.emitente?.razaoSocial}>
                                {item.emitente?.razaoSocial}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                type="button"
                                onClick={() => setCustomerDialog(item)}
                                className={`text-xs flex items-center gap-1 cursor-pointer group ${clienteNome ? 'text-slate-700 dark:text-slate-300 hover:text-blue-600' : 'italic text-slate-400 hover:text-blue-500'}`}
                              >
                                <FontAwesomeIcon icon={faUser} className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                                {clienteNome || '—'}
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {item.itens?.length || 0}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                              {formatBRL(item.totais?.valorTotalNota)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${color.bg} ${color.text} ${color.border}`}>
                                {getStatusLabel(item.status)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  buttonType="primary"
                                  size="small"
                                  outline
                                  onClick={() => router.push(`/documentos/${item.id}/conferencia`)}
                                >
                                  <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3 mr-1" />
                                  Conferir
                                </Button>
                                <button
                                  onClick={() => setDeleteDialog({ open: true, invoice: item })}
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                                >
                                  <FontAwesomeIcon icon={faTrashCan} className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de cliente */}
      {customerDialog && (
        <CustomerDialog
          invoice={customerDialog}
          onClose={() => setCustomerDialog(null)}
          onSave={handleSaveCustomer}
        />
      )}

      {/* Confirmação de Exclusão */}
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
