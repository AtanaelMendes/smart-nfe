'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxesStacked,
  faReceipt,
  faBuilding,
  faUser,
  faCoins,
  faPenToSquare,
  faCopy,
  faTrashCan,
  faTriangleExclamation,
  faCircleCheck,
  faCircleExclamation,
  faArrowLeft,
  faBoxesPacking,
  faShieldHalved,
  faTruck,
  faCalculator,
  faFileInvoice,
} from '@fortawesome/free-solid-svg-icons';
import AppLayout from '@/components/Layouts/AppLayout';
import Dialog from '@/components/Layouts/Dialog';
import Button from '@/components/buttons/Button';
import DataTable from '@/components/table/DataTable';
import { documentRepository } from '@/features/documentRepository';
import { formatBRL, formatDateBR } from '@/lib/formatters';
import { useAppContext } from '@/context/AppContext';

export default function DocumentoDetalhesPage({ params: paramsProp }) {
  const router = useRouter();
  const routeParams = useParams();
  const resolvedParams = paramsProp ? (typeof paramsProp.then === 'function' ? use(paramsProp) : paramsProp) : routeParams;
  const id = resolvedParams?.id || routeParams?.id;

  const { toast } = useAppContext();

  const [document, setDocument] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadDocument = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const doc = await documentRepository.findById(id);
      if (!doc) {
        setDocument(null);
        setLoading(false);
        return;
      }
      setDocument(doc);

      // Executa validação em tempo real
      const val = await documentRepository.validate(id);
      setValidation(val);
    } catch (e) {
      console.error('Erro ao carregar documento:', e);
      toast.error('Erro ao carregar detalhes do documento.');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleDuplicate = async () => {
    if (!document) return;
    setActionLoading(true);
    try {
      const copy = await documentRepository.duplicate(document.id);
      toast.success('Rascunho duplicado com sucesso!');
      router.push(`/notas/${copy.id}`);
    } catch (e) {
      toast.error(`Falha ao duplicar: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!document) return;
    setActionLoading(true);
    try {
      await documentRepository.delete(document.id);
      toast.success('Rascunho removido com sucesso.');
      setShowDeleteModal(false);
      router.push('/notas');
    } catch (e) {
      toast.error(`Falha ao excluir: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddToPreparation = async () => {
    if (!document) return;
    if (document.documentType !== 'NFE') {
      toast.warning('Apenas notas fiscais de mercadorias (NF-e) podem ser integradas a preparações de exportação.');
      return;
    }
    setActionLoading(true);
    try {
      await documentRepository.convertToPreparationSource(document.id);
      toast.success('NF-e integrada aos documentos de preparação com sucesso!');
      router.push('/preparacoes/nova');
    } catch (e) {
      toast.error(`Erro ao integrar documento: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const isNFe = document?.documentType === 'NFE';
  const isNFSe = document?.documentType === 'NFSE';

  const breadcrumbs = [
    { label: 'Notas', href: '/notas' },
    { label: document?.titulo || id || 'Detalhamento' },
  ];

  if (loading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 dark:text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Carregando dados do rascunho...</p>
        </div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl">
            <FontAwesomeIcon icon={faCircleExclamation} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Documento não encontrado</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            O documento &quot;{id}&quot; não existe na memória de sessão ou no armazenamento local.
          </p>
          <div className="pt-4">
            <Link
              href="/notas"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>Voltar para Notas</span>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const errors = validation?.errors || [];
  const warnings = validation?.warnings || [];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        {/* BANNER MANDATÓRIO: Rascunho / Não Emitido */}
        <div className="bg-amber-500 dark:bg-amber-600 text-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-black/15 flex items-center justify-center text-xl flex-shrink-0">
              <FontAwesomeIcon icon={faTriangleExclamation} />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide uppercase">
                Rascunho — Documento Não Emitido
              </h2>
              <p className="text-xs text-amber-50">
                Este documento fiscal é demonstrativo e não possui validade jurídica nem foi transmitido à SEFAZ ou ao Emissor Nacional.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold bg-black/20 px-2.5 py-1 rounded-md tracking-wider flex-shrink-0">
            PROTÓTIPO DEMONSTRATIVO
          </span>
        </div>

        {/* Cabeçalho de Ações e Identificação */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isNFe
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                }`}
              >
                <FontAwesomeIcon icon={isNFe ? faBoxesStacked : faReceipt} className="w-3.5 h-3.5" />
                {isNFe ? 'NF-e Modelo 55 • Mercadorias' : 'NFS-e • Padrão Nacional'}
              </span>

              {document.isMei && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                  MEI Simplificado
                </span>
              )}

              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                Status: {document.status}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {document.titulo || 'Nota Fiscal Manual'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              ID: <code className="font-mono bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">{document.id}</code> •
              Criado em: {formatDateBR(document.createdAt)} •
              Previsão de Emissão: {formatDateBR(document.dataPrevistaEmissao)}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/notas/${document.id}/editar`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <FontAwesomeIcon icon={faPenToSquare} />
              <span>Editar</span>
            </Link>

            <Button
              buttonType="ghost"
              size="small"
              onClick={handleDuplicate}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg"
              title="Duplicar rascunho"
            >
              <FontAwesomeIcon icon={faCopy} />
              <span>Duplicar</span>
            </Button>

            {isNFe && (
              <Button
                buttonType="ghost"
                size="small"
                onClick={handleAddToPreparation}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-lg"
                title="Integrar à preparação N:M"
              >
                <FontAwesomeIcon icon={faBoxesPacking} />
                <span>Adicionar à Preparação</span>
              </Button>
            )}

            <Button
              buttonType="ghost"
              size="small"
              onClick={() => setShowDeleteModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
              title="Excluir rascunho"
            >
              <FontAwesomeIcon icon={faTrashCan} />
              <span>Excluir</span>
            </Button>
          </div>
        </div>

        {/* Quadro de Validação Fiscal Prévia */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FontAwesomeIcon
                icon={errors.length > 0 ? faTriangleExclamation : faCircleCheck}
                className={errors.length > 0 ? 'text-red-500' : 'text-emerald-500'}
              />
              <span>Resultado da Validação Fiscal Prévia</span>
            </h3>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                errors.length > 0
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                  : warnings.length > 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
              }`}
            >
              {errors.length > 0
                ? `${errors.length} inconsistência(s)`
                : warnings.length > 0
                ? `${warnings.length} alerta(s)`
                : '100% Válido para Rascunho'}
            </span>
          </div>

          {errors.length === 0 && warnings.length === 0 ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2 pt-1">
              <FontAwesomeIcon icon={faCircleCheck} />
              Nenhuma inconsistência fiscal detectada nos dados estruturais deste rascunho.
            </p>
          ) : (
            <div className="space-y-2 pt-1">
              {errors.map((err, i) => (
                <div
                  key={`err-${i}`}
                  className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-800 dark:text-red-300 space-y-1"
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCircleExclamation} className="text-red-500 flex-shrink-0" />
                    <span>[{err.code || 'ERRO'}] {err.field ? `Campo: ${err.field} — ` : ''}{err.message}</span>
                  </div>
                  {err.suggestion && (
                    <p className="text-[11px] text-red-700 dark:text-red-400 pl-5">
                      Sugestão: {err.suggestion}
                    </p>
                  )}
                </div>
              ))}

              {warnings.map((warn, i) => (
                <div
                  key={`warn-${i}`}
                  className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1"
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 flex-shrink-0" />
                    <span>[{warn.code || 'ALERTA'}] {warn.message}</span>
                  </div>
                  {warn.recommendation && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 pl-5">
                      Orientação: {warn.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informações de Emitente e Destinatário */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Emitente / Prestador */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FontAwesomeIcon icon={faBuilding} className="text-blue-600" />
              <span>{isNFe ? 'Empresa Emitente' : 'Prestador de Serviços'}</span>
            </h3>

            {document.emitente || document.prestador ? (
              <div className="text-xs space-y-1.5 text-gray-600 dark:text-slate-300">
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  {document.emitente?.razaoSocial || document.prestador?.razaoSocial}
                </p>
                <p>CNPJ: <span className="font-mono">{document.emitente?.cnpj || document.prestador?.cnpj}</span></p>
                {document.emitente?.inscricaoEstadual && (
                  <p>Inscrição Estadual: <span className="font-mono">{document.emitente.inscricaoEstadual}</span></p>
                )}
                {document.prestador?.inscricaoMunicipal && (
                  <p>Inscrição Municipal: <span className="font-mono">{document.prestador.inscricaoMunicipal}</span></p>
                )}
                <p>
                  Endereço: {document.emitente?.logradouro || document.prestador?.logradouro}, {document.emitente?.numero || document.prestador?.numero}
                  {document.emitente?.bairro || document.prestador?.bairro ? ` - ${document.emitente?.bairro || document.prestador?.bairro}` : ''}
                </p>
                <p>
                  Município: {document.emitente?.municipio || document.prestador?.municipio}/{document.emitente?.uf || document.prestador?.uf}
                </p>
              </div>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400">Nenhum emitente selecionado.</p>
            )}
          </div>

          {/* Destinatário / Tomador */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} className="text-blue-600" />
              <span>{isNFe ? 'Destinatário das Mercadorias' : 'Tomador dos Serviços'}</span>
            </h3>

            {document.destinatario || document.tomador ? (
              <div className="text-xs space-y-1.5 text-gray-600 dark:text-slate-300">
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  {document.destinatario?.nomeOuRazao || document.tomador?.nomeOuRazao}
                </p>
                <p>
                  Tipo: <span className="font-semibold">{document.destinatario?.tipoPessoa || document.tomador?.tipoPessoa}</span> •
                  Documento: <span className="font-mono">{document.destinatario?.documento || document.tomador?.documento || 'Não informado'}</span>
                </p>
                {document.destinatario?.email || document.tomador?.email ? (
                  <p>Email: {document.destinatario?.email || document.tomador?.email}</p>
                ) : null}
                <p>
                  Localidade: {document.destinatario?.municipio || document.tomador?.municipio || '-'}/
                  {document.destinatario?.uf || document.tomador?.uf || '-'} •
                  País: {document.destinatario?.pais || document.tomador?.pais || 'Brasil'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400">Nenhum destinatário selecionado.</p>
            )}
          </div>
        </div>

        {/* Detalhes de Conteúdo: Itens NF-e OU Serviço NFS-e */}
        {isNFe ? (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FontAwesomeIcon icon={faBoxesStacked} className="text-blue-600" />
                <span>Itens e Mercadorias da NF-e ({document.itens?.length || 0})</span>
              </h3>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                CFOP Predominante: <code className="font-mono bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">{document.itens?.[0]?.cfop || '-'}</code>
              </span>
            </div>

            <DataTable
              data={document.itens || []}
              searchable={false}
              showFooter={false}
              showCount={false}
              dense
              getRowKey={(it, idx) => it.itemId || it.codigo || `item_${idx}`}
              emptyText="Nenhum item encontrado."
              tableClassName="text-xs"
              columns={[
                {
                  key: 'item',
                  label: '#',
                  className: 'text-gray-500 dark:text-slate-400',
                  render: (it, idx) => it.item || idx + 1,
                },
                {
                  key: 'codigo',
                  label: 'Código',
                  className: 'font-mono',
                  render: (it) => it.codigo || '-',
                },
                {
                  key: 'descricao',
                  label: 'Descrição do Produto',
                  className: 'font-medium text-gray-900 dark:text-white max-w-xs truncate',
                  render: (it) => <span title={it.descricao}>{it.descricao}</span>,
                },
                { key: 'ncm', label: 'NCM', className: 'font-mono', render: (it) => it.ncm },
                { key: 'cfop', label: 'CFOP', className: 'font-mono', render: (it) => it.cfop },
                { key: 'unidade', label: 'Un', className: 'uppercase', render: (it) => it.unidade },
                {
                  key: 'quantidade',
                  label: 'Qtd',
                  align: 'right',
                  className: 'font-mono',
                  render: (it) => it.quantidade,
                },
                {
                  key: 'valorUnitario',
                  label: 'Valor Unit.',
                  align: 'right',
                  className: 'font-mono',
                  render: (it) => formatBRL(it.valorUnitario),
                },
                {
                  key: 'desconto',
                  label: 'Desconto',
                  align: 'right',
                  className: 'font-mono text-gray-500',
                  render: (it) => formatBRL(it.desconto || 0),
                },
                {
                  key: 'valorTotal',
                  label: 'Total Item',
                  align: 'right',
                  className: 'font-mono font-bold text-gray-900 dark:text-white',
                  render: (it) => formatBRL(it.valorTotal),
                },
              ]}
            />

            {/* Totais Gerais SEFAZ */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-gray-500 dark:text-slate-400 block">Total Produtos</span>
                <span className="font-bold font-mono text-sm text-gray-900 dark:text-white">
                  {formatBRL(document.totais?.valorProdutos || 0)}
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-gray-500 dark:text-slate-400 block">Frete</span>
                <span className="font-bold font-mono text-sm text-gray-900 dark:text-white">
                  {formatBRL(document.totais?.valorFrete || 0)}
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-gray-500 dark:text-slate-400 block">Seguro/Outras</span>
                <span className="font-bold font-mono text-sm text-gray-900 dark:text-white">
                  {formatBRL(
                    Number(document.totais?.valorSeguro || 0) + Number(document.totais?.outrasDespesas || 0)
                  )}
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-gray-500 dark:text-slate-400 block">Desconto</span>
                <span className="font-bold font-mono text-sm text-red-600 dark:text-red-400">
                  - {formatBRL(document.totais?.valorDesconto || 0)}
                </span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="text-blue-700 dark:text-blue-300 block font-semibold">Valor Total NF-e</span>
                <span className="font-bold font-mono text-base text-blue-900 dark:text-blue-200">
                  {formatBRL(document.totais?.valorTotalNota || 0)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* NFS-e: Detalhamento do Serviço e Retenções */
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <FontAwesomeIcon icon={faReceipt} className="text-emerald-600" />
              <span>Serviço Prestado e Enquadramento Nacional</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <p>
                  <strong className="text-gray-700 dark:text-slate-300">Código de Tributação Nacional:</strong>{' '}
                  <code className="font-mono bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                    {document.servico?.codigoTributacaoNacional || '-'}
                  </code>
                </p>
                <p>
                  <strong className="text-gray-700 dark:text-slate-300">Subitem LC 116/2003:</strong>{' '}
                  <span className="font-mono">{document.servico?.subitemLc116 || '-'}</span>
                </p>
                <p>
                  <strong className="text-gray-700 dark:text-slate-300">Competência:</strong> {document.competencia || '-'}
                </p>
                <p>
                  <strong className="text-gray-700 dark:text-slate-300">Local da Prestação:</strong>{' '}
                  {document.servico?.municipioPrestacao || '-'}
                </p>
              </div>

              <div>
                <strong className="text-gray-700 dark:text-slate-300 block mb-1">Discriminação do Serviço:</strong>
                <p className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg text-gray-800 dark:text-slate-200 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                  {document.servico?.discriminacao || 'Não informada.'}
                </p>
              </div>
            </div>

            {/* Valores e Retenções */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-gray-500 dark:text-slate-400 block">Valor dos Serviços</span>
                <span className="font-bold font-mono text-sm text-gray-900 dark:text-white">
                  {formatBRL(document.valores?.valorBruto || 0)}
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-gray-500 dark:text-slate-400 block">Desconto Incondicionado</span>
                <span className="font-bold font-mono text-sm text-red-600 dark:text-red-400">
                  - {formatBRL(document.valores?.valorDescontoIncondicionado || 0)}
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                <span className="text-gray-500 dark:text-slate-400 block">Retenções Federais</span>
                <span className="font-bold font-mono text-sm text-gray-900 dark:text-white">
                  {formatBRL(
                    Number(document.valores?.retencoesFederais?.pis || 0) +
                    Number(document.valores?.retencoesFederais?.cofins || 0) +
                    Number(document.valores?.retencoesFederais?.inss || 0) +
                    Number(document.valores?.retencoesFederais?.ir || 0) +
                    Number(document.valores?.retencoesFederais?.csll || 0)
                  )}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <span className="text-emerald-700 dark:text-emerald-300 block font-semibold">Valor Líquido</span>
                <span className="font-bold font-mono text-base text-emerald-900 dark:text-emerald-200">
                  {formatBRL(document.valores?.valorLiquido || 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar Exclusão de Rascunho"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Tem certeza de que deseja excluir permanentemente o rascunho <strong>&quot;{document.titulo}&quot;</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              buttonType="secondary"
              size="small"
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              buttonType="danger"
              size="small"
              onClick={handleDelete}
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              {actionLoading ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </div>
        </div>
      </Dialog>
    </AppLayout>
  );
}
