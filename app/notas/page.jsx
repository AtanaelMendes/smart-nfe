'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faFileInvoice,
  faBoxesStacked,
  faReceipt,
  faEye,
  faPenToSquare,
  faCopy,
  faTrashCan,
  faFilter,
  faRotateRight,
  faSearch,
  faCircleCheck,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import AppLayout from '@/components/Layouts/AppLayout';
import Dialog from '@/components/Layouts/Dialog';
import Button from '@/components/buttons/Button';
import DataTable from '@/components/table/DataTable';
import Select from '@/components/inputs/Select';
import InputText from '@/components/inputs/InputText';
import { documentRepository } from '@/features/documentRepository';
import { catalogsRepository } from '@/features/catalogsRepository';
import { formatBRL, formatDateBR } from '@/lib/formatters';
import { useAppContext } from '@/context/AppContext';

export default function NotasListPage() {
  const router = useRouter();
  const { toast } = useAppContext();

  const [documents, setDocuments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modais de Ação
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const breadcrumbs = [
    { label: 'Notas e Rascunhos' },
  ];

  // Carrega documentos e empresas
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [docsResponse, comps] = await Promise.all([
        documentRepository.list({
          documentType: filterType || undefined,
          status: filterStatus || undefined,
          emitenteId: filterCompany || undefined,
          query: searchQuery || undefined,
          limit: 100,
        }),
        catalogsRepository.listCompanies(),
      ]);

      setDocuments(docsResponse.data || []);
      setCompanies(comps || []);
    } catch (err) {
      toast?.error?.('Erro ao carregar documentos: ' + (err.message || 'Falha inesperada'));
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, filterCompany, searchQuery, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Duplicar documento
  const handleDuplicate = async (id, title) => {
    try {
      setActionLoading(true);
      const dup = await documentRepository.duplicate(id);
      toast?.success?.(`Nota duplicada com sucesso! Criado "${dup.titulo}".`);
      await loadData();
    } catch (err) {
      toast?.error?.('Erro ao duplicar documento: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir confirmação de exclusão
  const confirmDelete = (doc) => {
    setDocumentToDelete(doc);
    setDeleteModalOpen(true);
  };

  // Executar exclusão
  const handleDelete = async () => {
    if (!documentToDelete) return;
    try {
      setActionLoading(true);
      await documentRepository.delete(documentToDelete.id);
      toast?.success?.('Documento excluído com sucesso.');
      setDeleteModalOpen(false);
      setDocumentToDelete(null);
      await loadData();
    } catch (err) {
      toast?.error?.('Erro ao excluir documento: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Métricas rápidas
  const metrics = useMemo(() => {
    const total = documents.length;
    const nfeCount = documents.filter((d) => d.documentType === 'NFE').length;
    const nfseCount = documents.filter((d) => d.documentType === 'NFSE').length;
    const draftCount = documents.filter((d) => d.status === 'DRAFT').length;
    return { total, nfeCount, nfseCount, draftCount };
  }, [documents]);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <FontAwesomeIcon icon={faFileInvoice} className="text-blue-600 dark:text-blue-400 w-6 h-6" />
              <span>Notas e Rascunhos Manuais</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Gerencie notas fiscais criadas manualmente (NF-e produtos e NFS-e serviços) para conferência e emissão futura.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              buttonType="ghost"
              outline
              size="small"
              onClick={loadData}
              title="Atualizar lista"
              className="!p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300"
            >
              <FontAwesomeIcon icon={faRotateRight} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Link
              href="/notas/nova"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
              <span>Nova Nota</span>
            </Link>
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Total Documentos</span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metrics.total}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <FontAwesomeIcon icon={faBoxesStacked} className="w-3 h-3" />
              <span>NF-e de Produtos</span>
            </span>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{metrics.nfeCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <FontAwesomeIcon icon={faReceipt} className="w-3 h-3" />
              <span>NFS-e de Serviços</span>
            </span>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{metrics.nfseCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
              <span>Em Rascunho</span>
            </span>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{metrics.draftCount}</p>
          </div>
        </div>

        {/* Filtros de Busca */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
            <FontAwesomeIcon icon={faFilter} className="text-blue-600" />
            <span>Filtros de Pesquisa</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Busca livre */}
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-gray-400 w-3.5 h-3.5 z-10" />
              <InputText
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={(id, val) => setSearchQuery(val)}
                placeholder="Buscar por título, número ou cliente..."
                small
                className="pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800/80 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            {/* Tipo de Documento */}
            <div>
              <Select
                id="filterType"
                value={filterType}
                hideClearButton
                onChange={(id, val) => setFilterType(val)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                options={[
                  { value: '', label: 'Todos os tipos (NF-e & NFS-e)' },
                  { value: 'NFE', label: 'NF-e de Produtos (Modelo 55)' },
                  { value: 'NFSE', label: 'NFS-e de Serviços (Padrão Nacional)' },
                ]}
              />
            </div>

            {/* Status */}
            <div>
              <Select
                id="filterStatus"
                value={filterStatus}
                hideClearButton
                onChange={(id, val) => setFilterStatus(val)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                options={[
                  { value: '', label: 'Todas as situações' },
                  { value: 'DRAFT', label: 'Rascunho' },
                  { value: 'READY_TO_EMIT', label: 'Pronto para Emissão' },
                ]}
              />
            </div>

            {/* Empresa Emitente */}
            <div>
              <Select
                id="filterCompany"
                value={filterCompany}
                hideClearButton
                onChange={(id, val) => setFilterCompany(val)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                options={[
                  { value: '', label: 'Todas as empresas emitentes' },
                  ...companies.map((c) => ({
                    value: c.id,
                    label: `${c.nomeFantasia || c.razaoSocial} (${c.tipo})`,
                  })),
                ]}
              />
            </div>
          </div>
        </div>

        {/* Tabela de Documentos */}
        <DataTable
          data={documents}
          loading={loading}
          loadingText="Carregando notas e rascunhos..."
          searchable={false}
          showFooter={false}
          dense
          getRowKey={(doc) => doc.id}
          tableClassName="border-collapse text-xs"
          emptyRender={
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <FontAwesomeIcon icon={faFileInvoice} className="w-10 h-10 text-gray-300 dark:text-slate-700" />
              <p className="font-semibold text-gray-700 dark:text-slate-300">Nenhum documento encontrado.</p>
              <p className="text-xs text-gray-500 max-w-sm">
                Tente ajustar seus filtros ou crie sua primeira nota fiscal manual agora.
              </p>
              <Link
                href="/notas/nova"
                className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
                <span>Criar Nota Manual</span>
              </Link>
            </div>
          }
          columns={[
            {
              key: 'titulo',
              label: 'Documento / Título',
              render: (doc) => {
                const isNfe = doc.documentType === 'NFE';
                return (
                  <>
                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{doc.titulo || (isNfe ? 'NF-e de Produtos' : 'NFS-e de Serviços')}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                      <span>Nº: {doc.numeroPrevisto || 'Previsto no envio'}</span>
                      <span>•</span>
                      <span>Série: {doc.seriePrevista || '1'}</span>
                    </div>
                  </>
                );
              },
            },
            {
              key: 'documentType',
              label: 'Tipo',
              render: (doc) =>
                doc.documentType === 'NFE' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    <FontAwesomeIcon icon={faBoxesStacked} className="w-3 h-3" />
                    <span>NF-e (Mod 55)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                    <FontAwesomeIcon icon={faReceipt} className="w-3 h-3" />
                    <span>{doc.isMei ? 'NFS-e (MEI)' : 'NFS-e Nacional'}</span>
                  </span>
                ),
            },
            {
              key: 'emitente',
              label: 'Emitente / Prestador',
              render: (doc) => (
                <>
                  <p className="font-medium text-gray-900 dark:text-slate-200 truncate max-w-[180px]">
                    {doc.emitente?.nomeFantasia ||
                      doc.emitente?.razaoSocial ||
                      doc.prestador?.nomeFantasia ||
                      doc.prestador?.razaoSocial ||
                      '—'}
                  </p>
                  <p className="text-[11px] text-gray-500 font-mono">{doc.emitente?.cnpj || doc.prestador?.cnpj || ''}</p>
                </>
              ),
            },
            {
              key: 'cliente',
              label: 'Cliente / Tomador',
              render: (doc) => (
                <>
                  <p className="font-medium text-gray-900 dark:text-slate-200 truncate max-w-[180px]">
                    {doc.destinatario?.nomeOuRazao || doc.tomador?.nomeOuRazao || 'Consumidor / Tomador Não Informado'}
                  </p>
                  <p className="text-[11px] text-gray-500 font-mono">
                    {doc.destinatario?.documento || doc.tomador?.documento || ''}
                  </p>
                </>
              ),
            },
            {
              key: 'dataPrevista',
              label: 'Data Prevista',
              className: 'whitespace-nowrap text-gray-600 dark:text-slate-400',
              render: (doc) => formatDateBR(doc.dataPrevistaEmissao || doc.createdAt),
            },
            {
              key: 'valorTotal',
              label: 'Valor Total',
              align: 'right',
              className: 'font-semibold text-gray-900 dark:text-white font-mono',
              render: (doc) =>
                formatBRL(
                  doc.documentType === 'NFE'
                    ? doc.totais?.valorTotalNota || '0.00'
                    : doc.valores?.valorBruto || '0.00'
                ),
            },
            {
              key: 'status',
              label: 'Status',
              align: 'center',
              render: (doc) =>
                doc.status === 'READY_TO_EMIT' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <FontAwesomeIcon icon={faCircleCheck} className="w-3 h-3" />
                    <span>Pronto</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                    <span>Rascunho</span>
                  </span>
                ),
            },
            {
              key: 'acoes',
              label: 'Ações',
              align: 'center',
              className: 'whitespace-nowrap',
              render: (doc) => (
                <div className="flex items-center justify-center gap-1">
                  <Link
                    href={`/notas/${doc.id}`}
                    title="Visualizar e Revisar"
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors"
                  >
                    <FontAwesomeIcon icon={faEye} className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href={`/notas/${doc.id}/editar`}
                    title="Editar Rascunho"
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors"
                  >
                    <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                  </Link>

                  <Button
                    buttonType="ghost"
                    size="small"
                    onClick={() => handleDuplicate(doc.id, doc.titulo)}
                    disabled={actionLoading}
                    title="Duplicar Rascunho"
                    className="!p-1.5 rounded bg-transparent dark:bg-transparent hover:bg-gray-200 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400"
                  >
                    <FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    buttonType="ghost"
                    size="small"
                    onClick={() => confirmDelete(doc)}
                    disabled={actionLoading}
                    title="Excluir Rascunho"
                    className="!p-1.5 rounded bg-transparent dark:bg-transparent hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400"
                  >
                    <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ),
            },
          ]}
        />

        {/* Modal de Exclusão de Documento */}
        <Dialog
          showDialog={deleteModalOpen}
          setDialogControl={setDeleteModalOpen}
          title={`Excluir "${documentToDelete?.titulo || 'Rascunho'}"?`}
          hideTextArea={true}
          btnCancel="CANCELAR"
          btnAccept="SIM, EXCLUIR"
          confirmActionCallback={handleDelete}
        />
      </div>
    </AppLayout>
  );
}
