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
  faEye,
  faPenToSquare,
  faRotateRight,
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

export default function DocumentosPage() {
  const router = useRouter();
  const { toast } = useAppContext();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, invoice: null });

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
      await loadData();
    } catch (e) {
      toast.error('Não foi possível remover o documento.');
    } finally {
      setDeleteDialog({ open: false, invoice: null });
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        inv.numero?.toLowerCase().includes(term) ||
        inv.chaveAcesso?.toLowerCase().includes(term) ||
        inv.emitente?.razaoSocial?.toLowerCase().includes(term) ||
        inv.destinatario?.nome?.toLowerCase().includes(term);

      return matchStatus && matchSearch;
    });
  }, [invoices, searchTerm, statusFilter]);

  const columns = useMemo(() => [
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
  ], [router]);

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

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="relative flex-1 w-full">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-2.5 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar por número, emitente, destinatário ou chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <FontAwesomeIcon icon={faFilter} className="text-slate-400 w-3 h-3 hidden sm:inline" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48 py-1.5 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">Todos os status</option>
              <option value="IMPORTADO">Importado</option>
              <option value="CONFERENCIA_PENDENTE">Conferência Pendente</option>
              <option value="EM_PREPARACAO">Em Preparação</option>
              <option value="COM_INCONSISTENCIAS">Com Inconsistências</option>
              <option value="PRONTO_REVISAO">Pronto para Revisão</option>
            </select>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <DataTable
            data={filteredInvoices}
            columns={columns}
            dense={false}
            mainText={`Listagem de Documentos (${filteredInvoices.length} encontrados)`}
          />
        </div>
      </div>

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
