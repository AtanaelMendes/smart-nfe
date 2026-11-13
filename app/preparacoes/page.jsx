'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxesStacked,
  faPlus,
  faMagnifyingGlass,
  faTrashCan,
  faPenToSquare,
  faRotateRight,
  faShieldHalved,
  faFolderOpen,
  faArrowRight,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import DataTable from '@/components/table/DataTable';
import Button from '@/components/buttons/Button';
import Dialog from '@/components/Layouts/Dialog';
import { useAppContext } from '@/context/AppContext';
import { preparationRepository } from '@/features/preparationRepository';
import { formatBRL } from '@/lib/formatters/currency';
import { formatDateBR } from '@/lib/formatters/dates';

export default function PreparacoesPage() {
  const router = useRouter();
  const { toast } = useAppContext();

  const [preparations, setPreparations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, preparation: null });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await preparationRepository.list();
      setPreparations(data);
    } catch (e) {
      toast.error('Erro ao carregar preparações.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!deleteDialog.preparation) return;
    try {
      await preparationRepository.delete(deleteDialog.preparation.id);
      toast.success(`Preparação ${deleteDialog.preparation.numero} excluída com liberação de saldos.`);
      await loadData();
    } catch (e) {
      toast.error('Não foi possível remover a preparação.');
    } finally {
      setDeleteDialog({ open: false, preparation: null });
    }
  };

  const handleReset = async () => {
    await preparationRepository.resetDemoData();
    await loadData();
    toast.success('Preparações demonstrativas restauradas!');
  };

  const filteredPreparations = useMemo(() => {
    return preparations.filter((prep) => {
      if (statusFilter !== 'ALL' && prep.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && prep.tipo !== typeFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNum = prep.numero?.toLowerCase().includes(q);
        const matchTit = prep.titulo?.toLowerCase().includes(q);
        const matchCli = prep.clienteExportacao?.name?.toLowerCase().includes(q);
        if (!matchNum && !matchTit && !matchCli) return false;
      }

      return true;
    });
  }, [preparations, statusFilter, typeFilter, searchTerm]);

  // Has volatile session preparations
  const volatileCount = useMemo(() => {
    return preparations.filter((p) => p.isRealImport).length;
  }, [preparations]);

  const columns = useMemo(() => [
    {
      key: 'numero',
      label: 'Número / Título',
      align: 'left',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            {item.numero}
          </span>
          <span className="text-xs text-slate-500 truncate max-w-[200px]" title={item.titulo}>
            {item.titulo}
          </span>
        </div>
      ),
    },
    {
      key: 'tipo',
      label: 'Tipo Operação',
      align: 'center',
      render: (item) => {
        let badgeClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
        let label = 'Mista (N → M)';
        if (item.tipo === 'agrupamento') {
          badgeClass = 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300';
          label = 'Agrupamento (N → 1)';
        } else if (item.tipo === 'divisao') {
          badgeClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
          label = 'Divisão (1 → M)';
        }
        return (
          <span className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full ${badgeClass}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: 'cliente',
      label: 'Cliente Exportação',
      align: 'left',
      render: (item) => (
        item.clienteExportacao ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-900 dark:text-slate-100 max-w-[180px] truncate">
            <FontAwesomeIcon icon={faGlobe} className="text-blue-500 w-3 h-3 shrink-0" />
            <span className="truncate" title={`${item.clienteExportacao.name} (${item.clienteExportacao.country})`}>
              {item.clienteExportacao.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Sem cliente definido</span>
        )
      ),
    },
    {
      key: 'origens',
      label: 'Origens / Destinos',
      align: 'center',
      render: (item) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {item.origens?.length || 0} origens → {item.destinos?.length || 0} destinos
        </span>
      ),
    },
    {
      key: 'valor',
      label: 'Valor Preparado',
      align: 'right',
      render: (item) => {
        const val = item.valorTotal || item.totais?.valorTotal || 0;
        return (
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            {formatBRL(val)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Situação',
      align: 'center',
      render: (item) => {
        let badge = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
        let label = 'Rascunho';
        if (item.status === 'active' || item.status === 'ativa') {
          badge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
          label = 'Ativa';
        } else if (item.status === 'completed' || item.status === 'concluida') {
          badge = 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
          label = 'Concluída';
        } else if (item.status === 'cancelled') {
          badge = 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300';
          label = 'Cancelada';
        }
        return (
          <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${badge}`}>
            {label}
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
            onClick={() => router.push(`/preparacoes/nova?id=${item.id}`)}
          >
            <FontAwesomeIcon icon={faPenToSquare} className="mr-1" />
            Editar
          </Button>
          <button
            onClick={() => setDeleteDialog({ open: true, preparation: item })}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
            title="Excluir preparação"
          >
            <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], [router]);

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Preparações' }]}>
      <div className="space-y-4">
        {/* Banner de Sessão Volátil caso existam documentos reais */}
        {volatileCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-lg p-3.5 flex items-center gap-3">
            <FontAwesomeIcon icon={faShieldHalved} className="text-amber-600 w-5 h-5 shrink-0" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold">Aviso de Sessão Temporária: </span>
              Existem {volatileCount} {volatileCount === 1 ? 'preparação com origens reais' : 'preparações com origens reais'} mantidas exclusivamente em memória volátil. Fechar ou atualizar o navegador descartará essas preparações.
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FontAwesomeIcon icon={faBoxesStacked} className="text-blue-600" />
              Preparações de Exportação (N → M)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Agrupamento, divisão e alocação unificada de mercadorias de múltiplos fornecedores para notas de saída.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              buttonType="secondary"
              size="small"
              outline
              onClick={handleReset}
              title="Restaurar dados demonstrativos"
            >
              <FontAwesomeIcon icon={faRotateRight} className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Restaurar
            </Button>
            <Button
              buttonType="primary"
              size="small"
              onClick={() => router.push('/preparacoes/nova')}
            >
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 mr-1" />
              Nova Preparação
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="relative flex-1 w-full">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-2.5 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar por número, título ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-1.5 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">Todos os tipos</option>
              <option value="agrupamento">Agrupamento (N → 1)</option>
              <option value="divisao">Divisão (1 → M)</option>
              <option value="mista">Mista (N → M)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="active">Ativa</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <DataTable
            data={filteredPreparations}
            columns={columns}
            dense={false}
            mainText={`Preparações Cadastradas (${filteredPreparations.length})`}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        showDialog={deleteDialog.open}
        setDialogControl={(open) => setDeleteDialog({ open, preparation: null })}
        title="Excluir Preparação"
        hideTextArea={true}
        btnAccept="Excluir e Liberar Saldos"
        btnCancel="Cancelar"
        confirmActionCallback={handleDelete}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 p-4">
          Tem certeza de que deseja excluir a preparação <strong>{deleteDialog.preparation?.numero}</strong>? As mercadorias alocadas retornarão imediatamente ao saldo disponível das notas de origem.
        </p>
      </Dialog>
    </AppLayout>
  );
}
