'use client';

import { useState, useRef, useCallback } from 'react';
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
  faCopy,
  faRotateRight,
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

// Formata tamanho de arquivo
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Cria item de arquivo padrão
function createFileItem(file) {
  const nameLower = file.name.toLowerCase();
  const isXML = nameLower.endsWith('.xml');
  const isPDF = nameLower.endsWith('.pdf');
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    name: file.name,
    size: formatFileSize(file.size),
    type: isXML ? 'XML' : isPDF ? 'PDF' : 'OTHER',
    status: 'pending',
    result: null,
    error: null,
    accessKey: null,
  };
}

// Badge colorido por status
function StatusBadge({ status, error }) {
  const map = {
    pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    duplicate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    error: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  };
  const labels = {
    pending: 'Aguardando',
    processing: 'Processando...',
    done: 'Importado',
    duplicate: 'Duplicado',
    error: 'Erro',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${map[status] || map.pending}`}>
      {status === 'processing' && <FontAwesomeIcon icon={faCircleNotch} className="animate-spin w-2.5 h-2.5" />}
      {status === 'done' && <FontAwesomeIcon icon={faCircleCheck} className="w-2.5 h-2.5" />}
      {status === 'error' && <FontAwesomeIcon icon={faCircleExclamation} className="w-2.5 h-2.5" />}
      {status === 'duplicate' && <FontAwesomeIcon icon={faCopy} className="w-2.5 h-2.5" />}
      {labels[status] || status}
    </span>
  );
}

export default function ImportarDocumentoPage() {
  const router = useRouter();
  const { toast } = useAppContext();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const addMoreRef = useRef(null);

  // ─── Drag & Drop ────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const addFilesToList = useCallback((fileList) => {
    const incoming = Array.from(fileList);
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}__${f.file.size}`));
      const newItems = incoming
        .filter((file) => {
          const nameLower = file.name.toLowerCase();
          return nameLower.endsWith('.xml') || nameLower.endsWith('.pdf');
        })
        .filter((file) => !existing.has(`${file.name}__${file.size}`))
        .map(createFileItem);
      return [...prev, ...newItems];
    });
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToList(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToList(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (id) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // ─── Processamento individual de um item ────────────────────────
  const processOneItem = async (item) => {
    if (item.type === 'PDF') {
      return { ...item, status: 'error', error: 'PDF não suportado para importação automática. Envie o XML da NF-e.' };
    }

    try {
      const xmlString = await item.file.text();
      if (!xmlString || !xmlString.trim()) {
        throw new Error('O arquivo XML está vazio.');
      }

      const parseResult = parseNFeXml(xmlString);
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Falha ao analisar a estrutura XML.');
      }

      const extracted = parseResult.data;

      if (!extracted.chaveAcesso) {
        throw new Error('Chave de acesso não localizada no XML (tag infNFe/@Id ausente).');
      }

      const keyValidation = validateAccessKey(extracted.chaveAcesso);
      if (!keyValidation.isValid) {
        throw new Error(`Chave de Acesso inválida: ${keyValidation.error || 'Dígito verificador incorreto.'}`);
      }

      // Verificar duplicidade via chave de acesso
      const allInvoices = await invoiceRepository.list();
      const duplicate = allInvoices.find((inv) => inv.chaveAcesso === extracted.chaveAcesso);
      if (duplicate) {
        return {
          ...item,
          status: 'duplicate',
          accessKey: extracted.chaveAcesso,
          error: `Já importado: NF-e ${duplicate.numero || duplicate.id}`,
        };
      }

      const invoiceData = mapXmlToInvoice(extracted);
      invoiceData.isRealImport = true;
      invoiceData.isDemo = false;

      const savedInvoice = await invoiceRepository.create(invoiceData);
      return {
        ...item,
        status: 'done',
        accessKey: extracted.chaveAcesso,
        result: savedInvoice,
      };
    } catch (err) {
      return { ...item, status: 'error', error: err?.message || 'Erro desconhecido.' };
    }
  };

  // ─── Processamento em lotes de 3 ────────────────────────────────
  const processInChunks = async (items) => {
    const chunkSize = 3;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);

      // Marcar chunk como processing
      setSelectedFiles((prev) =>
        prev.map((f) => (chunk.some((c) => c.id === f.id) ? { ...f, status: 'processing' } : f))
      );

      const results = await Promise.all(chunk.map(processOneItem));

      // Atualizar resultados individuais
      setSelectedFiles((prev) =>
        prev.map((f) => {
          const r = results.find((res) => res.id === f.id);
          return r ? r : f;
        })
      );
    }
  };

  const processAllFiles = async (filesToProcess = null) => {
    const targets = (filesToProcess || selectedFiles).filter((f) => f.status === 'pending');
    if (targets.length === 0) return;
    setIsProcessingAll(true);
    try {
      await processInChunks(targets);
    } finally {
      setIsProcessingAll(false);
    }
  };

  const handleReprocessErrors = () => {
    setSelectedFiles((prev) => prev.map((f) => (f.status === 'error' ? { ...f, status: 'pending', error: null } : f)));
    // Aguarda o setState propagar antes de processar
    setTimeout(() => processAllFiles(), 50);
  };

  // ─── Derivações de estado ────────────────────────────────────────
  const total = selectedFiles.length;
  const concluded = selectedFiles.filter((f) => ['done', 'duplicate', 'error'].includes(f.status)).length;
  const doneCount = selectedFiles.filter((f) => f.status === 'done').length;
  const duplicateCount = selectedFiles.filter((f) => f.status === 'duplicate').length;
  const errorCount = selectedFiles.filter((f) => f.status === 'error').length;
  const pendingCount = selectedFiles.filter((f) => f.status === 'pending').length;
  const progressPct = total > 0 ? Math.round((concluded / total) * 100) : 0;
  const hasPending = pendingCount > 0;
  const hasErrors = errorCount > 0;
  const doneIds = selectedFiles.filter((f) => f.status === 'done' && f.result?.id).map((f) => f.result.id);

  const handleOpenScenario = (scenarioId) => {
    toast.info(`Carregando conferência do ${scenarioId.toUpperCase()}...`);
    router.push(`/documentos/${scenarioId}/conferencia`);
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documentos', href: '/documentos' },
        { label: 'Importar' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
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
              Por segurança e conformidade, os arquivos XML reais importados são processados 100% no seu navegador e mantidos exclusivamente na memória da sessão (<code className="font-mono text-[11px] bg-amber-100/70 dark:bg-amber-900/50 px-1 py-0.5 rounded">sessionInvoices</code>). <strong>Nenhum dado fiscal real é gravado em disco (localStorage) ou enviado a servidores externos</strong>. Os dados serão perdidos caso você feche ou recarregue a página.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FontAwesomeIcon icon={faFileImport} className="text-blue-600" />
                Importação de Documentos Fiscais
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Envie múltiplos arquivos <strong>.XML</strong> de NF-e modelo 55 para extração real e conferência imediata no navegador.
              </p>
            </div>
            <Link href="/documentos">
              <Button buttonType="secondary" size="small" outline>
                <FontAwesomeIcon icon={faFolderOpen} className="mr-1.5" />
                Ver Documentos
              </Button>
            </Link>
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
            type="file"
            id="file-upload"
            accept=".xml,.pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          {/* Input oculto para "Adicionar mais arquivos" */}
          <input
            type="file"
            accept=".xml,.pdf"
            multiple
            ref={addMoreRef}
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FontAwesomeIcon icon={faCloudArrowUp} className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Arraste e solte seus arquivos XML aqui, ou{' '}
                <label
                  htmlFor="file-upload"
                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold"
                >
                  procure no computador
                </label>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos aceitos: <strong>.XML</strong> (NF-e modelo 55 padrão SEFAZ) e <strong>.PDF</strong> — múltiplos arquivos simultâneos
              </p>
            </div>
          </div>

          {/* Lista de arquivos selecionados */}
          {selectedFiles.length > 0 && (
            <div className="mt-6 text-left space-y-2">
              {selectedFiles.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FontAwesomeIcon
                      icon={item.type === 'XML' ? faFileCode : faFilePdf}
                      className={`w-5 h-5 shrink-0 ${item.type === 'XML' ? 'text-blue-500' : 'text-red-500'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.size} • {item.type}
                        {item.error && (
                          <span className="ml-2 text-rose-600 dark:text-rose-400 italic">{item.error}</span>
                        )}
                        {item.status === 'done' && item.result && (
                          <span className="ml-2 text-emerald-600 dark:text-emerald-400">NF-e {item.result.numero}</span>
                        )}
                        {item.status === 'duplicate' && item.error && (
                          <span className="ml-2 text-amber-600 dark:text-amber-400">{item.error}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={item.status} />
                    {item.status !== 'processing' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                        title="Remover arquivo"
                      >
                        <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Barra de progresso */}
          {total > 0 && concluded > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{progressPct}% concluído</span>
                <span>{concluded}/{total} arquivos</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Ações */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 justify-center">
              <button
                type="button"
                onClick={() => addMoreRef.current?.click()}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
                Adicionar mais arquivos
              </button>

              {hasPending && !isProcessingAll && (
                <Button
                  buttonType="primary"
                  size="small"
                  onClick={() => processAllFiles()}
                >
                  <FontAwesomeIcon icon={faPlay} className="mr-1.5 w-3 h-3" />
                  Importar {pendingCount} arquivo{pendingCount !== 1 ? 's' : ''}
                </Button>
              )}

              {isProcessingAll && (
                <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                  <FontAwesomeIcon icon={faCircleNotch} className="animate-spin w-3.5 h-3.5" />
                  Processando...
                </span>
              )}

              {hasErrors && !isProcessingAll && (
                <Button
                  buttonType="secondary"
                  size="small"
                  outline
                  onClick={handleReprocessErrors}
                >
                  <FontAwesomeIcon icon={faRotateRight} className="mr-1.5 w-3 h-3" />
                  Reprocessar com Erro ({errorCount})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Resumo pós-processamento */}
        {concluded > 0 && concluded === total && total > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500" />
              Resumo da Importação
            </h3>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                <FontAwesomeIcon icon={faCircleCheck} className="w-3 h-3" />
                {doneCount} importado{doneCount !== 1 ? 's' : ''}
              </span>
              {duplicateCount > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold">
                  <FontAwesomeIcon icon={faCopy} className="w-3 h-3" />
                  {duplicateCount} duplicado{duplicateCount !== 1 ? 's' : ''}
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold">
                  <FontAwesomeIcon icon={faCircleExclamation} className="w-3 h-3" />
                  {errorCount} com erro{errorCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {doneIds.length > 0 && (
              <Button
                buttonType="primary"
                size="small"
                onClick={() => router.push(`/preparacoes/nova?sourceIds=${doneIds.join(',')}`)}
              >
                <FontAwesomeIcon icon={faArrowRight} className="mr-1.5 w-3 h-3" />
                Iniciar Preparação ({doneIds.length} nota{doneIds.length !== 1 ? 's' : ''})
              </Button>
            )}
          </div>
        )}

        {/* Botão Iniciar Preparação parcial (enquanto ainda há pendentes) */}
        {doneIds.length > 0 && concluded < total && (
          <div className="flex justify-end">
            <Button
              buttonType="primary"
              size="small"
              onClick={() => router.push(`/preparacoes/nova?sourceIds=${doneIds.join(',')}`)}
            >
              <FontAwesomeIcon icon={faArrowRight} className="mr-1.5 w-3 h-3" />
              Iniciar Preparação com {doneIds.length} nota{doneIds.length !== 1 ? 's' : ''} importada{doneIds.length !== 1 ? 's' : ''}
            </Button>
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
                onClick={() => handleOpenScenario(sc.id)}
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

          <div className="pt-2 text-center text-xs text-slate-500">
            Deseja ver a lista completa de documentos?{' '}
            <Link href="/documentos" className="text-blue-600 hover:underline font-semibold">
              Ir para tela de Documentos Fiscais &rarr;
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
