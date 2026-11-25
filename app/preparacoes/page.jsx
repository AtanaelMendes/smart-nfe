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
import PillsBadge from '@/components/buttons/PillsBadge';
import InputText from '@/components/inputs/InputText';
import Select from '@/components/inputs/Select';
import Dialog from '@/components/Layouts/Dialog';
import { useAppContext } from '@/context/AppContext';
import { preparationRepository } from '@/features/preparationRepository';
import { reopenPreparation } from '@/features/preparationCompletionService';
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

  const handleReopen = async (prep) => {
    try {
      await reopenPreparation(prep.id);
      toast.success(`Preparação ${prep.numero} reaberta. As notas geradas foram removidas e o saldo liberado.`);
      await loadData();
    } catch {
      toast.error('Não foi possível reabrir a preparação.');
    }
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
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={item.titulo}>
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
        let badgeType = 'primary';
        let label = 'Mista (N → M)';
        if (item.tipo === 'agrupamento') {
          badgeType = 'teal';
          label = 'Agrupamento (N → 1)';
        } else if (item.tipo === 'divisao') {
          badgeType = 'purple';
          label = 'Divisão (1 → M)';
        }
        return (
          <PillsBadge type={badgeType} small title={label}>
            {label}
          </PillsBadge>
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
        let badgeType = 'default';
        let label = 'Rascunho';
        if (item.status === 'active' || item.status === 'ativa') {
          badgeType = 'success';
          label = 'Ativa';
        } else if (item.status === 'completed' || item.status === 'concluida') {
          badgeType = 'primary';
          label = 'Concluída';
        } else if (item.status === 'cancelled') {
          badgeType = 'danger';
          label = 'Cancelada';
        }
        return (
          <PillsBadge type={badgeType} small title={label}>
            {label}
          </PillsBadge>
        );
      },
    },
    {
      key: 'acoes',
      label: 'Ações',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          {item.status === 'completed' && (
            <Button
              buttonType="success"
              size="small"
              outline
              onClick={() => router.push(`/notas-preparadas?preparationId=${item.id}`)}
              title="Ver notas preparadas geradas"
            >
              <FontAwesomeIcon icon={faArrowRight} className="mr-1" />
              Notas
            </Button>
          )}
          <Button
            buttonType="primary"
            size="small"
            outline
            onClick={() => (item.status === 'completed' ? handleReopen(item) : router.push(`/preparacoes/nova?id=${item.id}`))}
          >
            <FontAwesomeIcon icon={faPenToSquare} className="mr-1" />
            {item.status === 'completed' ? 'Reabrir' : 'Editar'}
          </Button>
          <Button
            buttonType="danger"
            size="small"
            outline
            onClick={() => setDeleteDialog({ open: true, preparation: item })}
            className="p-1.5"
            title="Excluir preparação"
          >
            <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ], [router, handleReopen]);

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
              <FontAwesomeIcon icon={faRotateRight} className="w-3.5 h-3.5 mr-1 text-slate-500 dark:text-slate-300" />
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
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-2.5 text-slate-400 w-3.5 h-3.5 z-10" />
            <InputText
              id="searchTerm"
              value={searchTerm}
              onChange={(id, value) => setSearchTerm(value)}
              placeholder="Buscar por número, título ou cliente..."
              small
              className="pl-9 pr-3"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select small
              id="typeFilter"
              value={typeFilter}
              hideClearButton
              containerClassName="relative"
              onChange={(id, val) => setTypeFilter(val)}
              className=""
              options={[
                { value: 'ALL', label: 'Todos os tipos' },
                { value: 'agrupamento', label: 'Agrupamento (N → 1)' },
                { value: 'divisao', label: 'Divisão (1 → M)' },
                { value: 'mista', label: 'Mista (N → M)' },
              ]}
            />

            <Select small
              id="statusFilter"
              value={statusFilter}
              hideClearButton
              containerClassName="relative"
              onChange={(id, val) => setStatusFilter(val)}
              className=""
              options={[
                { value: 'ALL', label: 'Todos os status' },
                { value: 'draft', label: 'Rascunho' },
                { value: 'active', label: 'Ativa' },
                { value: 'completed', label: 'Concluída' },
                { value: 'cancelled', label: 'Cancelada' },
              ]}
            />
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
