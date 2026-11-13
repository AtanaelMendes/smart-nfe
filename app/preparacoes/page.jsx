'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/Layouts/AppLayout';
import DataTable from '@/components/table/DataTable';
import Button from '@/components/buttons/Button';
import Dialog from '@/components/Layouts/Dialog';
import preparationRepository, { isRealPreparation } from '@/features/preparationRepository';
import { formatBRL } from '@/lib/formatters/currency';
import { formatDateBR } from '@/lib/formatters/dates';

const BREADCRUMBS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Preparações', href: '/preparacoes' },
];

const TYPE_LABELS = {
  agrupamento: { label: 'Agrupamento', cls: 'bg-blue-100 text-blue-800' },
  divisao: { label: 'Divisão', cls: 'bg-purple-100 text-purple-800' },
  mista: { label: 'Mista', cls: 'bg-orange-100 text-orange-800' },
};

const STATUS_LABELS = {
  draft: { label: 'Rascunho', cls: 'bg-gray-100 text-gray-700' },
  active: { label: 'Ativa', cls: 'bg-green-100 text-green-800' },
  completed: { label: 'Concluída', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-800' },
};

function Badge({ label, cls }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function calcTotalDestinos(prep) {
  if (!prep.destinos || !Array.isArray(prep.destinos)) return 0;
  let total = 0;
  for (const dest of prep.destinos) {
    const allocs = dest.allocations || dest.alocacoes || {};
    for (const qty of Object.values(allocs)) {
      total += parseFloat(qty || 0);
    }
    if (Array.isArray(dest.itens)) {
      for (const it of dest.itens) {
        total += parseFloat(it.valorTotal || 0);
      }
    }
  }
  return total;
}

export default function PreparacoesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [preparations, setPreparations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [realCount, setRealCount] = useState(0);

  const sourceIds = searchParams.get('sourceIds');

  useEffect(() => {
    if (sourceIds) {
      router.replace(`/preparacoes/nova?sourceIds=${sourceIds}`);
    }
  }, [sourceIds, router]);

  const loadPreparations = useCallback(async () => {
    setLoading(true);
    try {
      const list = await preparationRepository.list();
      setPreparations(list || []);
      setRealCount((list || []).filter(p => isRealPreparation(p)).length);
    } catch (err) {
      console.error('Erro ao carregar preparações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreparations();
  }, [loadPreparations]);

  const handleDelete = useCallback((prep) => {
    setDeleteTarget(prep);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await preparationRepository.delete(deleteTarget.id);
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      await loadPreparations();
    } catch (err) {
      console.error('Erro ao excluir preparação:', err);
    }
  }, [deleteTarget, loadPreparations]);

  const columns = [
    {
      key: 'numero',
      label: 'Número',
      render: (val, row) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-200">
          {row.numero || row.id?.slice(-6) || '-'}
        </span>
      ),
    },
    {
      key: 'titulo',
      label: 'Título',
      render: (val) => (
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100 max-w-[200px] block truncate" title={val}>
          {val || '-'}
        </span>
      ),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (val) => {
        const t = TYPE_LABELS[val] || { label: val || '-', cls: 'bg-gray-100 text-gray-700' };
        return <Badge label={t.label} cls={t.cls} />;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        const s = STATUS_LABELS[val] || { label: val || '-', cls: 'bg-gray-100 text-gray-700' };
        return <Badge label={s.label} cls={s.cls} />;
      },
    },
    {
      key: 'clienteExportacao',
      label: 'Cliente',
      render: (val) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {val?.name || val?.nome || '-'}
        </span>
      ),
    },
    {
      key: 'origens',
      label: 'Origens',
      align: 'center',
      render: (val) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {Array.isArray(val) ? val.length : 0}
        </span>
      ),
    },
    {
      key: 'destinos',
      label: 'Destinos',
      align: 'center',
      render: (val) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {Array.isArray(val) ? val.length : 0}
        </span>
      ),
    },
    {
      key: '_valorTotal',
      label: 'Valor Total',
      align: 'right',
      render: (_, row) => {
        const total = calcTotalDestinos(row);
        return (
          <span className="text-sm font-mono text-slate-700 dark:text-slate-200">
            {total > 0 ? formatBRL(total) : '-'}
          </span>
        );
      },
    },
    {
      key: 'criadoEm',
      label: 'Criado em',
      render: (val) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {formatDateBR(val)}
        </span>
      ),
    },
    {
      key: '_acoes',
      label: 'Ações',
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center gap-2 justify-center">
          <Button
            buttonType="primary"
            size="small"
            onClick={() => router.push(`/preparacoes/nova?id=${row.id}`)}
          >
            Continuar
          </Button>
          <Button
            buttonType="danger"
            size="small"
            outline
            onClick={() => handleDelete(row)}
          >
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  if (sourceIds) {
    return null;
  }

  return (
    <AppLayout breadcrumbs={BREADCRUMBS}>
      <div className="space-y-4">
        {/* Aviso de sessão volátil */}
        {realCount > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 flex items-center gap-2 text-amber-800 text-sm">
            <svg className="w-5 h-5 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>{realCount}</strong> {realCount === 1 ? 'preparação com documentos reais será perdida' : 'preparações com documentos reais serão perdidas'} ao recarregar a página.
            </span>
          </div>
        )}

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Preparações de Exportação</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Gerencie agrupamentos N→M de notas fiscais para exportação
            </p>
          </div>
          <Button
            buttonType="primary"
            size="medium"
            onClick={() => router.push('/preparacoes/nova')}
          >
            + Nova Preparação
          </Button>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Carregando preparações...
          </div>
        ) : (
          <DataTable
            data={preparations}
            columns={columns}
            mainText={`${preparations.length} preparação(ões)`}
            dense
            emptyText="Nenhuma preparação encontrada. Clique em '+ Nova Preparação' para começar."
          />
        )}
      </div>

      {/* Dialog de exclusão */}
      <Dialog
        showDialog={showDeleteDialog}
        setDialogControl={setShowDeleteDialog}
        title={`Excluir preparação "${deleteTarget?.titulo || deleteTarget?.id}"?`}
        hideTextArea
        btnCancel="Cancelar"
        btnAccept="Excluir"
        confirmActionCallback={confirmDelete}
        closeDialogCallback={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
