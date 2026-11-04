'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileInvoice,
  faBoxesStacked,
  faTriangleExclamation,
  faClipboardCheck,
  faCoins,
  faFileImport,
  faListAlt,
  faArrowRight,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import DataTable from '@/components/table/DataTable';
import Button from '@/components/buttons/Button';
import { useAppContext } from '@/context/AppContext';

import { formatBRL } from '@/lib/formatters/currency';
import { formatDateBR } from '@/lib/formatters/dates';
import { getStatusLabel, getStatusColor, STATUS_CONFIG } from '@/lib/formatters/status';
import { getMockInvoices, getDashboardKPIs } from '@/lib/data/mockInvoices';

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useAppContext();

  // Dados mockados e KPIs
  const [invoices] = useState(() => getMockInvoices());
  const kpis = useMemo(() => getDashboardKPIs(), []);

  // Ação de carga rápida de cenário demo
  const handleLoadScenario = (scenarioId, label) => {
    toast.info(`Carregando cenário ${label} para conferência...`);
    router.push(`/documentos/${scenarioId}/conferencia`);
  };

  // Definição das colunas explícitas para o DataTable
  const columns = useMemo(() => [
    {
      key: 'numero',
      label: 'Número / Série',
      align: 'left',
      render: (item) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
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
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Série {item.serie} &bull; {formatDateBR(item.dataEmissao || item.emissao)}
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
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            CNPJ: {item.emitente?.cnpj} ({item.emitente?.uf})
          </span>
        </div>
      ),
    },
    {
      key: 'destinatario',
      label: 'Destinatário / País',
      align: 'left',
      render: (item) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate" title={item.destinatario?.nome}>
            {item.destinatario?.nome}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>🌐 {item.destinatario?.pais}</span>
            {item.destinatario?.paisCodigo && (
              <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded font-mono">
                {item.destinatario?.paisCodigo}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'itens',
      label: 'Itens',
      align: 'center',
      render: (item) => (
        <div className="text-center">
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {item.itens?.length || 0} itens
          </span>
        </div>
      ),
    },
    {
      key: 'valor',
      label: 'Valor Total',
      align: 'right',
      render: (item) => (
        <div className="text-right">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            {formatBRL(item.totais?.valorTotalNota)}
          </span>
          {item.totais?.valorFrete && item.totais.valorFrete !== '0.00' && (
            <div className="text-[10px] text-slate-400">
              Frete: {formatBRL(item.totais.valorFrete)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (item) => {
        const dotColor = STATUS_CONFIG[item.status]?.dot || 'bg-slate-400';
        return (
          <div className="flex justify-center">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              {getStatusLabel(item.status)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'acoes',
      label: 'Ações',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <Link
            href={`/documentos/${item.id}/conferencia`}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shadow-xs"
            title="Abrir conferência de itens"
          >
            <span>Conferir</span>
          </Link>
          <Link
            href={`/documentos/${item.id}/divisao`}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded transition-colors"
            title="Dividir produtos em notas preparadas"
          >
            <span>Dividir</span>
          </Link>
          {item.status === 'com_inconsistencias' && (
            <Link
              href={`/documentos/${item.id}/validacao`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 rounded transition-colors"
              title="Auditar inconsistências fiscais"
            >
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-3 h-3 text-red-600" />
            </Link>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Painel Operacional de NF-e de Exportação
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Preparação, auditoria de itens fiscais e desmembramento para comércio exterior
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/documentos/importar">
              <Button buttonType="primary" size="medium" className="flex items-center gap-2">
                <FontAwesomeIcon icon={faFileImport} className="w-4 h-4" />
                <span>Importar NF-e</span>
              </Button>
            </Link>
            <Link href="/documentos">
              <Button buttonType="ghost" bordered={true} size="medium" className="flex items-center gap-2">
                <FontAwesomeIcon icon={faListAlt} className="w-4 h-4" />
                <span>Ver Todos Documentos</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 5 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Notas Importadas */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Notas Importadas
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {kpis.totalNotas}
              </p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                5 cenários fiscais carregados
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faFileInvoice} className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total de Produtos */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total de Produtos
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {kpis.totalProdutos}
              </p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                Itens fiscais auditáveis
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faBoxesStacked} className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Aguardando Validação */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Aguardando Validação
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {kpis.aguardandoValidacao}
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                1 nota com erros simulados
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Notas Preparadas */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Notas Preparadas
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {kpis.notasPreparadas}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                Geradas a partir de divisão
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faClipboardCheck} className="w-5 h-5" />
            </div>
          </div>

          {/* Card 5: Valor Total Demonstrado */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Valor Total Demonstrado
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 truncate" title={formatBRL(kpis.valorTotalDemonstrado)}>
                {formatBRL(kpis.valorTotalDemonstrado)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Volume sob preparação
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faCoins} className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Vitrine de Acesso Rápido aos Cenários Demo */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-lg p-4 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-200 flex items-center gap-2">
                <FontAwesomeIcon icon={faPlay} className="w-3.5 h-3.5 text-amber-400" />
                <span>Carregamento Rápido de Cenários de Demonstração</span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Clique em qualquer cenário para abrir diretamente a tela de conferência detalhada:
              </p>
            </div>
            <span className="text-[11px] bg-blue-800 text-blue-200 px-2 py-0.5 rounded font-mono">
              Ambiente de Avaliação Contábil
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <button
              onClick={() => handleLoadScenario('demo-01', 'Demo 01 (Agroexport)')}
              className="flex flex-col text-left p-2.5 rounded bg-white/10 hover:bg-white/20 transition-all border border-white/10 hover:border-blue-400 focus:outline-none cursor-pointer"
            >
              <span className="text-xs font-bold text-white">Demo 01 — XML Agro</span>
              <span className="text-[11px] text-blue-200">8 itens (Café/Soja)</span>
              <span className="text-[10px] text-slate-400 mt-1">R$ 291.200,00</span>
            </button>

            <button
              onClick={() => handleLoadScenario('demo-02', 'Demo 02 (Metalúrgica)')}
              className="flex flex-col text-left p-2.5 rounded bg-white/10 hover:bg-white/20 transition-all border border-white/10 hover:border-blue-400 focus:outline-none cursor-pointer"
            >
              <span className="text-xs font-bold text-white">Demo 02 — PDF Metal</span>
              <span className="text-[11px] text-blue-200">25 itens metalmecânicos</span>
              <span className="text-[10px] text-slate-400 mt-1">R$ 148.750,00</span>
            </button>

            <button
              onClick={() => handleLoadScenario('demo-03', 'Demo 03 (Eletroparts)')}
              className="flex flex-col text-left p-2.5 rounded bg-white/10 hover:bg-white/20 transition-all border border-white/10 hover:border-blue-400 focus:outline-none cursor-pointer"
            >
              <span className="text-xs font-bold text-white">Demo 03 — Stress Test</span>
              <span className="text-[11px] text-blue-200">50 itens automotivos</span>
              <span className="text-[10px] text-slate-400 mt-1">R$ 625.800,00</span>
            </button>

            <button
              onClick={() => handleLoadScenario('demo-04', 'Demo 04 (Inconsistências)')}
              className="flex flex-col text-left p-2.5 rounded bg-red-950/50 hover:bg-red-900/50 transition-all border border-red-500/40 hover:border-red-400 focus:outline-none cursor-pointer"
            >
              <span className="text-xs font-bold text-red-200 flex items-center justify-between">
                <span>Demo 04 — Erros</span>
                <span className="text-[9px] bg-red-800 text-white px-1 rounded">Atenção</span>
              </span>
              <span className="text-[11px] text-red-300">12 itens com alertas</span>
              <span className="text-[10px] text-red-400 mt-1">CFOP / NCM / Matemática</span>
            </button>

            <button
              onClick={() => handleLoadScenario('demo-05', 'Demo 05 (Lotes Múltiplos)')}
              className="flex flex-col text-left p-2.5 rounded bg-white/10 hover:bg-white/20 transition-all border border-white/10 hover:border-blue-400 focus:outline-none cursor-pointer"
            >
              <span className="text-xs font-bold text-white">Demo 05 — Lotes Repetidos</span>
              <span className="text-[11px] text-blue-200">15 itens (Soja/Milho/Sorgo)</span>
              <span className="text-[10px] text-slate-400 mt-1">R$ 342.000,00</span>
            </button>
          </div>
        </div>

        {/* Tabela de Documentos Recentes */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <DataTable
            data={invoices}
            columns={columns}
            dense={false}
            mainText="Documentos Recentes para Preparação de Exportação"
            action={
              <Link
                href="/documentos"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline flex items-center gap-1 mr-2"
              >
                <span>Ver todos</span>
                <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5" />
              </Link>
            }
          />
        </div>
      </div>
    </AppLayout>
  );
}