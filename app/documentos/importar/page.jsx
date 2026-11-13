'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileImport,
  faCloudArrowUp,
  faFileCode,
  faFilePdf,
  faCircleCheck,
  faTriangleExclamation,
  faCircleExclamation,
  faPlay,
  faArrowRight,
  faCircleNotch,
  faFolderOpen,
  faShieldHalved,
  faTrashCan,
  faPlus,
  faRotateRight,
  faBoxesStacked,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import { useAppContext } from '@/context/AppContext';
import { invoiceRepository } from '@/features/invoiceRepository';
import { parseNFeXml } from '@/features/xml/nfeXmlParser';
import { validateAccessKey } from '@/features/xml/accessKeyValidator';
import { mapXmlToInvoice } from '@/features/xml/xmlToInvoiceMapper';
import { formatBRL } from '@/lib/formatters/currency';

const DEMO_SCENARIOS = [
  {
    id: 'demo-01',
    nome: 'Cenário 1 — NF-e XML Agro',
    tipo: 'XML',
    badge: '8 ITENS',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    emitente: 'Agroexport Brasil S.A.',
    destinatario: 'Global Trading Logistics B.V. (Holanda)',
    valor: 'R$ 291.200,00',
    descricao: 'Exportação de grãos e café com dados completos, CFOP 7101 e consistência fiscal perfeita.',
  },
  {
    id: 'demo-02',
    nome: 'Cenário 2 — NF-e PDF Metalmecânica',
    tipo: 'PDF',
    badge: '25 ITENS',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    emitente: 'Metalúrgica Sul Americana Ltda',
    destinatario: 'Industrial Supply Corp. (EUA)',
    valor: 'R$ 148.750,00',
    descricao: 'Peças usinadas e insumos industriais com múltiplos itens para teste de rolagem.',
  },
  {
    id: 'demo-03',
    nome: 'Cenário 3 — Stress Test em Volume',
    tipo: 'XML',
    badge: '50 ITENS',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    emitente: 'Eletroparts do Brasil Componentes S.A.',
    destinatario: 'Auto Assembly Europe GmbH (Alemanha)',
    valor: 'R$ 625.800,00',
    descricao: 'Volume denso de mercadorias automotivas para validação de performance da tabela.',
  },
  {
    id: 'demo-04',
    nome: 'Cenário 4 — Inconsistências Fiscais',
    tipo: 'XML',
    badge: 'ALERTA (12 ITENS)',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border border-rose-300',
    emitente: 'Calçados Vale do Rio Doce Ltda',
    destinatario: 'Fashion Footwear Group S.L. (Espanha)',
    valor: 'R$ 89.300,00',
    descricao: 'Simula produtos sem NCM de 8 dígitos, divergências de soma e CFOPs incorretos.',
    hasAlert: true,
  },
  {
    id: 'demo-05',
    nome: 'Cenário 5 — Desmembramento & Lotes',
    tipo: 'XML',
    badge: '15 ITENS',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    emitente: 'Cooperativa Agroindustrial Centro-Oeste',
    destinatario: 'Asian Grain Corporation (China)',
    valor: 'R$ 342.000,00',
    descricao: 'Produtos agrícolas repetidos em 5 lotes preparados para divisão em contêineres.',
  },
];

export default function ImportarDocumentoPage() {
  const router = useRouter();
  const { toast } = useAppContext();
  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [fileQueue, setFileQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const addFilesToQueue = (filesList) => {
    if (!filesList || filesList.length === 0) return;

    const newFiles = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const lower = file.name.toLowerCase();
      const isXml = lower.endsWith('.xml');
      const isPdf = lower.endsWith('.pdf');

      if (!isXml && !isPdf) {
        toast.error(`"${file.name}": Formato inválido. Aceito apenas .XML e .PDF.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}": Excede o limite máximo de 10 MB.`);
        continue;
      }

      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${file.name}`;
      newFiles.push({
        id,
        file,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: isXml ? 'XML' : 'PDF',
        status: 'pending', // 'pending' | 'processing' | 'success' | 'duplicate' | 'error'
        error: null,
        invoice: null,
      });
    }

    if (newFiles.length > 0) {
      setFileQueue((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target?.files) {
      addFilesToQueue(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (id) => {
    if (isProcessing) return;
    setFileQueue((prev) => prev.filter((f) => f.id !== id));
  };

  const clearQueue = () => {
    if (isProcessing) return;
    setFileQueue([]);
    setOverallProgress(0);
  };

  const processSingleFile = async (item, existingKeys) => {
    if (item.type === 'PDF') {
      return {
        status: 'error',
        error: 'PDF requer backend de extração / OCR. Envie XML para importação automática.',
      };
    }

    try {
      const xmlString = await item.file.text();
      if (!xmlString || !xmlString.trim()) {
        return { status: 'error', error: 'Arquivo XML vazio.' };
      }

      const parseResult = parseNFeXml(xmlString);
      if (!parseResult.success) {
        return { status: 'error', error: parseResult.error || 'Falha ao analisar estrutura XML.' };
      }

      const extracted = parseResult.data;
      if (!extracted.chaveAcesso) {
        return { status: 'error', error: 'Chave de acesso não localizada no XML.' };
      }

      const keyVal = validateAccessKey(extracted.chaveAcesso);
      if (!keyVal.isValid) {
        return { status: 'error', error: `Chave de acesso inválida: ${keyVal.error}` };
      }

      // Check duplicates
      if (existingKeys.has(extracted.chaveAcesso)) {
        return {
          status: 'duplicate',
          error: `NF-e já importada anteriormente (Chave: ${extracted.chaveAcesso.substring(0, 15)}...).`,
        };
      }

      const invoiceData = mapXmlToInvoice(extracted);
      invoiceData.isRealImport = true;
      invoiceData.isDemo = false;

      const savedInvoice = await invoiceRepository.create(invoiceData);
      existingKeys.add(extracted.chaveAcesso);

      return {
        status: 'success',
        invoice: savedInvoice,
      };
    } catch (err) {
      return {
        status: 'error',
        error: err.message || 'Erro inesperado durante processamento.',
      };
    }
  };

  const processQueue = async (onlyErrors = false) => {
    const toProcess = fileQueue.filter((f) => (onlyErrors ? f.status === 'error' : f.status === 'pending'));
    if (toProcess.length === 0) return;

    setIsProcessing(true);

    // Load existing access keys to detect duplicates
    const allExisting = await invoiceRepository.list();
    const existingKeys = new Set(
      allExisting.map((inv) => inv.chaveAcesso).filter(Boolean)
    );

    const CONCURRENCY = 3;
    let completedCount = fileQueue.filter((f) => f.status === 'success' || f.status === 'duplicate').length;
    const totalToRun = toProcess.length;
    let localCompleted = 0;

    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
      const chunk = toProcess.slice(i, i + CONCURRENCY);

      // Mark chunk as processing
      setFileQueue((prev) =>
        prev.map((item) =>
          chunk.some((c) => c.id === item.id) ? { ...item, status: 'processing', error: null } : item
        )
      );

      const results = await Promise.all(
        chunk.map((item) => processSingleFile(item, existingKeys))
      );

      localCompleted += chunk.length;
      setOverallProgress(Math.round(((completedCount + localCompleted) / fileQueue.length) * 100));

      setFileQueue((prev) =>
        prev.map((item) => {
          const matchIndex = chunk.findIndex((c) => c.id === item.id);
          if (matchIndex !== -1) {
            const res = results[matchIndex];
            return {
              ...item,
              status: res.status,
              error: res.error || null,
              invoice: res.invoice || null,
            };
          }
          return item;
        })
      );
    }

    setIsProcessing(false);
    toast.success('Processamento do lote finalizado!');
  };

  // Summaries
  const stats = useMemo(() => {
    const total = fileQueue.length;
    const success = fileQueue.filter((f) => f.status === 'success').length;
    const duplicates = fileQueue.filter((f) => f.status === 'duplicate').length;
    const errors = fileQueue.filter((f) => f.status === 'error').length;
    const pending = fileQueue.filter((f) => f.status === 'pending').length;
    const successInvoices = fileQueue.filter((f) => f.status === 'success' && f.invoice).map((f) => f.invoice);

    const totalValue = successInvoices.reduce(
      (acc, inv) => acc + parseFloat(inv?.totais?.valorTotalNota || 0),
      0
    );
    const totalItems = successInvoices.reduce(
      (acc, inv) => acc + (inv?.itens?.length || 0),
      0
    );

    return { total, success, duplicates, errors, pending, successInvoices, totalValue, totalItems };
  }, [fileQueue]);

  const handleStartPreparation = () => {
    if (stats.successInvoices.length === 0) return;
    const ids = stats.successInvoices.map((inv) => inv.id).join(',');
    router.push(`/preparacoes/nova?sourceIds=${ids}`);
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documentos', href: '/documentos' },
        { label: 'Importar' },
      ]}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Banner de Segurança & Sessão Temporária */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-lg p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400 mt-0.5">
            <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Sessão Volátil em Memória &mdash; Isolamento de Dados Fiscais Reais
            </p>
            <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
              Os arquivos XML reais importados são processados 100% no seu navegador e mantidos exclusivamente na memória volátil da sessão. <strong>Nenhum XML real é gravado em disco ou enviado a servidores externos</strong>. Os dados serão perdidos caso você feche ou recarregue a página.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FontAwesomeIcon icon={faFileImport} className="text-blue-600" />
                Importação Múltipla de NF-e
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Selecione ou arraste qualquer quantidade de arquivos <strong>.XML</strong> para processamento simultâneo em lote.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/documentos">
                <Button buttonType="secondary" size="small" outline>
                  <FontAwesomeIcon icon={faFolderOpen} className="mr-1.5" />
                  Ver Documentos
                </Button>
              </Link>
              {stats.success > 0 && (
                <Button buttonType="primary" size="small" onClick={handleStartPreparation}>
                  <FontAwesomeIcon icon={faBoxesStacked} className="mr-1.5" />
                  Iniciar Preparação ({stats.success})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload-multiple"
            multiple
            accept=".xml,.pdf"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FontAwesomeIcon icon={faCloudArrowUp} className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Arraste vários arquivos XML aqui, ou{' '}
                <label
                  htmlFor="file-upload-multiple"
                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold"
                >
                  procure no computador
                </label>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos aceitos: <strong>.XML</strong> (NF-e modelo 55 padrão SEFAZ, sem limites arbitrários de quantidade)
              </p>
            </div>
          </div>
        </div>

        {/* File Queue List */}
        {fileQueue.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Lote de Arquivos ({fileQueue.length})
                </span>
                <span className="text-xs text-slate-500">
                  {stats.success} importados • {stats.duplicates} duplicados • {stats.errors} erros • {stats.pending} pendentes
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-1" />
                  Adicionar Mais
                </button>
                {stats.errors > 0 && !isProcessing && (
                  <button
                    type="button"
                    onClick={() => processQueue(true)}
                    className="px-2.5 py-1 text-xs font-medium rounded border border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faRotateRight} className="mr-1" />
                    Repetir Erros ({stats.errors})
                  </button>
                )}
                {stats.pending > 0 && !isProcessing && (
                  <Button buttonType="primary" size="small" onClick={() => processQueue(false)}>
                    <FontAwesomeIcon icon={faPlay} className="mr-1" />
                    Processar Lote ({stats.pending})
                  </Button>
                )}
                <button
                  type="button"
                  onClick={clearQueue}
                  disabled={isProcessing}
                  className="text-xs text-slate-400 hover:text-rose-600 p-1 cursor-pointer disabled:opacity-50"
                  title="Limpar seleção"
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              </div>
            </div>

            {/* Overall Progress Bar */}
            {isProcessing && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Processando lote com concorrência controlada...</span>
                  <span className="font-bold">{overallProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 pr-1">
              {fileQueue.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FontAwesomeIcon
                      icon={item.type === 'XML' ? faFileCode : faFilePdf}
                      className={`w-4 h-4 shrink-0 ${item.type === 'XML' ? 'text-blue-500' : 'text-red-500'}`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                      <span className="text-[10px] text-slate-400">{item.size} • {item.type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {item.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        Pendente
                      </span>
                    )}
                    {item.status === 'processing' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        <FontAwesomeIcon icon={faCircleNotch} className="animate-spin w-3 h-3" />
                        Lendo...
                      </span>
                    )}
                    {item.status === 'success' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <FontAwesomeIcon icon={faCircleCheck} className="w-3 h-3" />
                        NF-e {item.invoice?.numero || 'OK'} ({item.invoice?.itens?.length || 0} itens)
                      </span>
                    )}
                    {item.status === 'duplicate' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" title={item.error}>
                        <FontAwesomeIcon icon={faTriangleExclamation} className="w-3 h-3" />
                        Duplicada
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300" title={item.error}>
                        <FontAwesomeIcon icon={faCircleExclamation} className="w-3 h-3" />
                        Falha: {item.error?.substring(0, 30)}...
                      </span>
                    )}

                    {!isProcessing && (
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                        title="Remover"
                      >
                        <FontAwesomeIcon icon={faTrashCan} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Success Batch Summary Banner */}
            {stats.success > 0 && (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">
                    {stats.success} {stats.success === 1 ? 'nota importada' : 'notas importadas'} com sucesso!
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-300">
                    Total: {stats.totalItems} itens • Valor acumulado: {formatBRL(stats.totalValue)}
                  </p>
                </div>
                <Button buttonType="primary" size="small" onClick={handleStartPreparation}>
                  <FontAwesomeIcon icon={faBoxesStacked} className="mr-1.5" />
                  Iniciar Preparação com {stats.success} {stats.success === 1 ? 'Nota' : 'Notas'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 5 Cenários de Demonstração Rápidos */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FontAwesomeIcon icon={faPlay} className="text-blue-600 w-3.5 h-3.5" />
                Cenários de Demonstração Prontos para Teste (1 Clique):
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Clique em qualquer cenário abaixo para carregar instantaneamente o documento estruturado na tela de conferência.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
              5 Cenários Disponíveis
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {DEMO_SCENARIOS.map((sc) => (
              <div
                key={sc.id}
                onClick={() => router.push(`/documentos/${sc.id}/conferencia`)}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col justify-between group ${
                  sc.hasAlert
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 hover:border-rose-400 hover:bg-rose-50/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-slate-700/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {sc.nome}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sc.badgeColor}`}>
                        {sc.badge}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {sc.valor}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2">
                    {sc.descricao}
                  </p>

                  <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                    <span>Emitente: {sc.emitente}</span>
                    <span className="mx-1">•</span>
                    <span>Destino: {sc.destinatario}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <FontAwesomeIcon icon={sc.tipo === 'XML' ? faFileCode : faFilePdf} className="w-3 h-3 text-slate-400" />
                    Formato {sc.tipo}
                  </span>

                  <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Abrir Conferência</span>
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
