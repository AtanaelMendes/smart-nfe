'use client';

import { useState, useEffect, useMemo, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faArrowLeft,
  faCircleCheck,
  faCircleExclamation,
  faPenToSquare,
  faRobot,
  faWandMagicSparkles,
  faRotateLeft,
  faScissors,
  faCheck,
  faShieldHalved,
  faFileInvoice,
  faArrowRight,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import { useAppContext } from '@/context/AppContext';
import { invoiceRepository } from '@/features/invoiceRepository';
import { formatBRL } from '@/lib/formatters/currency';

export default function ValidacaoPage({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const router = useRouter();
  const { toast } = useAppContext();

  const [invoice, setInvoice] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fixingId, setFixingId] = useState(null);
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [activeTab, setActiveTab] = useState('todas'); // 'todas' | 'erros' | 'avisos'

  // Carregamento assíncrono dos dados da nota e inconsistências fiscais
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const inv = await invoiceRepository.findById(id);
      const iss = await invoiceRepository.getValidationIssues(id);
      setInvoice(inv);
      setIssues(iss || []);
    } catch {
      toast.error('Erro ao carregar validação do documento.');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Separação por severidade: Erros bloqueantes vs Alertas
  const errosBloqueantes = useMemo(
    () => issues.filter((iss) => iss.tipo === 'erro' || iss.severity === 'ERROR'),
    [issues]
  );

  const alertasFiscais = useMemo(
    () => issues.filter((iss) => iss.tipo !== 'erro' && iss.severity !== 'ERROR'),
    [issues]
  );

  // Lista filtrada pela aba selecionada
  const filteredIssues = useMemo(() => {
    if (activeTab === 'erros') return errosBloqueantes;
    if (activeTab === 'avisos') return alertasFiscais;
    return issues;
  }, [activeTab, issues, errosBloqueantes, alertasFiscais]);

  // Assistente: Aplicar correção de 1-Clique em um apontamento individual
  const handleApplyFix = async (issue) => {
    try {
      setFixingId(issue.id);
      const patch = { [issue.campo]: issue.esperado };

      await invoiceRepository.updateItem(id, issue.itemId, patch);
      toast.success(
        `Item ${issue.itemNumero}: ${issue.campo} ajustado para "${issue.esperado}".`
      );

      // Recarrega os dados após a mutação
      await loadData();
    } catch {
      toast.error('Erro ao aplicar correção.');
    } finally {
      setFixingId(null);
    }
  };

  // Assistente: Aplicar todas as correções sugeridas automaticamente (1-Clique global)
  const handleFixAll = async () => {
    if (issues.length === 0) return;

    try {
      setIsFixingAll(true);
      for (const issue of issues) {
        const patch = { [issue.campo]: issue.esperado };
        await invoiceRepository.updateItem(id, issue.itemId, patch);
      }

      toast.success(`Todas as ${issues.length} pendências foram corrigidas com sucesso!`);
      await loadData();
    } catch {
      toast.error('Erro ao aplicar correções automáticas.');
    } finally {
      setIsFixingAll(false);
    }
  };

  // Assistente Demo: Restaurar inconsistências mockadas do cenário demo-04 para retestar
  const handleResetDemoIssues = async () => {
    try {
      setLoading(true);
      await invoiceRepository.resetInvoice(id);
      toast.info(`Cenário ${id} restaurado com as inconsistências simuladas de fábrica.`);
      await loadData();
    } catch {
      toast.error('Erro ao restaurar cenário de demonstração.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Validação' }]}>
        <div className="p-12 text-center text-slate-500">
          <FontAwesomeIcon icon={faShieldHalved} className="w-8 h-8 text-blue-500 animate-pulse mb-3" />
          <p className="text-sm font-semibold">Auditando regras fiscais e tributárias...</p>
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Validação' }]}>
        <div className="p-8 text-center text-slate-500">
          <p className="text-base font-semibold text-red-600 mb-2">Documento não encontrado</p>
          <Link href="/documentos" className="text-sm text-blue-600 hover:underline">
            Voltar para lista de documentos
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isAllGreen = issues.length === 0;

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documentos', href: '/documentos' },
        { label: `NF-e ${invoice.numero}`, href: `/documentos/${id}/conferencia` },
        { label: 'Validação Fiscal' },
      ]}
    >
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href={`/documentos/${id}/conferencia`}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Voltar para a conferência"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {invoice.tipoDocumento || 'NF-e'} • Série {invoice.serie || '1'}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                  <FontAwesomeIcon icon={faGlobe} className="w-3 h-3 text-slate-400" />
                  Destino: {invoice.destinatario?.pais || 'Exportação'} ({invoice.destinatario?.nome || 'Cliente'})
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-1">
                <FontAwesomeIcon
                  icon={isAllGreen ? faCircleCheck : faTriangleExclamation}
                  className={isAllGreen ? 'text-emerald-500' : 'text-amber-500'}
                />
                Diagnóstico de Validação Fiscal — NF-e {invoice.numero}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Auditoria automática de conformidade aduaneira, CFOP de exportação, classificação NCM, consistência matemática e unidades.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {id === 'demo-04' && (
              <Button
                buttonType="secondary"
                size="small"
                outline
                onClick={handleResetDemoIssues}
                title="Restaura as 4 inconsistências simuladas de fábrica para testar novamente"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3 mr-1 text-slate-500" />
                Restaurar Inconsistências demo-04
              </Button>
            )}

            <Button
              buttonType="secondary"
              size="small"
              outline
              onClick={() => router.push(`/documentos/${id}/conferencia`)}
            >
              <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Editar na Conferência
            </Button>

            <Button
              buttonType="primary"
              size="small"
              onClick={() => router.push(`/documentos/${id}/divisao`)}
            >
              <FontAwesomeIcon icon={faScissors} className="w-3.5 h-3.5 mr-1" />
              Divisão de Notas
            </Button>
          </div>
        </div>

        {/* KPIs Resumo do Diagnóstico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Situação Geral</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isAllGreen ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
                }`}
              />
              <span
                className={`text-sm font-bold ${
                  isAllGreen ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isAllGreen ? 'Validada / Conforme' : 'Bloqueada p/ Exportação'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {isAllGreen ? 'Apta para divisão' : 'Requer correção contábil'}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Erros Bloqueantes</span>
            <span className={`text-sm font-bold ${errosBloqueantes.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600'}`}>
              {errosBloqueantes.length} {errosBloqueantes.length === 1 ? 'erro' : 'erros'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              CFOP, NCM ou cálculo
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Alertas Aduaneiros</span>
            <span className={`text-sm font-bold ${alertasFiscais.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600'}`}>
              {alertasFiscais.length} {alertasFiscais.length === 1 ? 'aviso' : 'avisos'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Unidades e metadados
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Total de Produtos</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {invoice.itens?.length || 0} itens
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Valor: {formatBRL(invoice.totais?.valorTotalNota || 0)}
            </span>
          </div>
        </div>

        {/* Assistente SmartNFe Virtual */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-lg shadow-sm border border-blue-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-700/80 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faRobot} className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="text-xs space-y-1">
              <span className="font-bold text-cyan-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3 h-3" />
                Assistente de Validação SmartNFe (Inteligência Fiscal Demonstrativa)
              </span>
              <p className="text-slate-200 max-w-2xl">
                {!isAllGreen
                  ? `Identifiquei ${issues.length} apontamentos tributários nesta NF-e (${errosBloqueantes.length} bloqueantes e ${alertasFiscais.length} alertas) para exportação ao destino ${invoice.destinatario?.pais || 'Exterior'}. Você pode aplicar as soluções recomendadas individualmente ou com 1-clique global.`
                  : 'Parabéns! Todos os produtos e campos da nota fiscal atendem rigorosamente aos critérios de conferência da SEFAZ e regras de exportação aduaneira.'}
              </p>
            </div>
          </div>

          {!isAllGreen && (
            <Button
              buttonType="success"
              size="small"
              onClick={handleFixAll}
              disabled={isFixingAll}
              className="flex-shrink-0"
              title="Aplica todas as correções sugeridas automaticamente"
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5 mr-1" />
              {isFixingAll ? 'Aplicando Correções...' : 'Corrigir Todas em 1-Clique'}
            </Button>
          )}
        </div>

        {/* Painel de Apontamentos ou Estado Vazio */}
        {isAllGreen ? (
          /* Estado Vazio Limpo (All Green) */
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-800 p-8 text-center space-y-3 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-300 dark:border-emerald-700">
              <FontAwesomeIcon icon={faCircleCheck} className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Nenhuma Inconsistência Fiscal Detectada
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Todos os itens da NF-e {invoice.numero} foram auditados. CFOPs iniciam com 7 para operação com o exterior, classificações NCM possuem 8 dígitos, totais conferem perfeitamente e as unidades comerciais estão válidas.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                buttonType="primary"
                onClick={() => router.push(`/documentos/${id}/divisao`)}
              >
                <FontAwesomeIcon icon={faScissors} className="w-3.5 h-3.5 mr-1.5" />
                Avançar para Divisão de Notas
              </Button>
              <Button
                buttonType="secondary"
                outline
                onClick={() => router.push(`/documentos/${id}/conferencia`)}
              >
                <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Revisar na Conferência
              </Button>
            </div>
          </div>
        ) : (
          /* Lista Categorizada de Inconsistências */
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-xs">
            {/* Abas de Navegação / Filtro */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('todas')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'todas'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  Todas as Pendências ({issues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('erros')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'erros'
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  Erros Bloqueantes ({errosBloqueantes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('avisos')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'avisos'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  Alertas Fiscais ({alertasFiscais.length})
                </button>
              </div>

              <span className="text-[11px] text-slate-500">
                Mostrando {filteredIssues.length} de {issues.length} apontamentos
              </span>
            </div>

            {/* Cards de Apontamentos Interativos */}
            <div className="space-y-3">
              {filteredIssues.map((issue) => {
                const isError = issue.tipo === 'erro' || issue.severity === 'ERROR';
                const isFixingThis = fixingId === issue.id;

                return (
                  <div
                    key={issue.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isError
                        ? 'border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20'
                        : 'border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          <FontAwesomeIcon
                            icon={isError ? faCircleExclamation : faTriangleExclamation}
                            className={`w-4 h-4 ${isError ? 'text-red-500' : 'text-amber-500'}`}
                          />
                        </div>

                        <div className="space-y-1.5 text-xs">
                          {/* Cabeçalho do Card */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              Item #{issue.itemNumero} — {issue.itemDescricao}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                isError
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border border-red-300 dark:border-red-700'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                              }`}
                            >
                              {isError ? 'Erro Bloqueante' : 'Alerta Aduaneiro'}
                            </span>
                            {issue.regra && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                Regra: {issue.regra}
                              </span>
                            )}
                          </div>

                          {/* Mensagem Explicativa */}
                          <p className="text-slate-700 dark:text-slate-300">
                            {issue.mensagem || issue.message}
                          </p>

                          {/* Comparativo de Valores: Encontrado vs Esperado */}
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">Valor Atual ({issue.campo}):</span>
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                                {String(issue.encontrado || 'vazio')}
                              </span>
                            </div>

                            <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 text-slate-400" />

                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">Solução Sugerida:</span>
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                {String(issue.esperado || 'Conforme')}
                              </span>
                            </div>
                          </div>

                          {/* Sugestão de Correção Descritiva */}
                          {issue.sugestao && (
                            <div className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded border border-blue-100 dark:border-blue-900/30 flex items-center gap-1.5 mt-1">
                              <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3 h-3 text-blue-500 flex-shrink-0" />
                              <span>{issue.sugestao}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação por Item */}
                      <div className="flex flex-row md:flex-col items-center md:items-end gap-2 flex-shrink-0 pt-2 md:pt-0">
                        {issue.esperado && (
                          <Button
                            buttonType="success"
                            size="small"
                            onClick={() => handleApplyFix(issue)}
                            disabled={isFixingThis || isFixingAll}
                            title={`Aplicar ${issue.esperado} neste item`}
                          >
                            <FontAwesomeIcon icon={faCheck} className="w-3 h-3 mr-1" />
                            {isFixingThis ? 'Corrigindo...' : 'Aplicar Correção'}
                          </Button>
                        )}

                        <Button
                          buttonType="secondary"
                          size="small"
                          outline
                          onClick={() => router.push(`/documentos/${id}/conferencia`)}
                          title="Abrir editor de conferência deste produto"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3 mr-1 text-slate-600" />
                          Conferir Item
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
