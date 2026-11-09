'use client';

import { useState } from 'react';
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

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);
  const [importError, setImportError] = useState(null);

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    const isXML = fileNameLower.endsWith('.xml');
    const isPDF = fileNameLower.endsWith('.pdf');

    // 1. Validação de formato de arquivo
    if (!isXML && !isPDF) {
      toast.error('Formato inválido. Por favor, envie arquivos .XML (NF-e modelo 55) ou .PDF.');
      return;
    }

    // 2. Limite de tamanho de arquivo (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo excede o limite máximo permitido de 10 MB.');
      return;
    }

    const fileMeta = {
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: isXML ? 'XML' : 'PDF',
    };

    setSelectedFile(fileMeta);
    setImportSuccess(null);
    setImportError(null);
    setIsProcessing(true);

    try {
      if (isPDF) {
        // PDF: Fluxo assistido de orientação para o usuário
        setImportError({
          title: 'Arquivo PDF Identificado',
          message:
            'A importação automatizada com conferência estruturada e validação fiscal de lote opera com arquivos XML da NF-e (Modelo 55). Para testar a conferência de DANFE em PDF, utilize os cenários pré-carregados de demonstração abaixo.',
          isWarning: true,
        });
        toast.info('Para importação real e extração de dados fiscais, envie o arquivo XML da NF-e.');
        setIsProcessing(false);
        return;
      }

      // XML: Leitura REAL via File API do navegador
      const xmlString = await file.text();

      if (!xmlString || !xmlString.trim()) {
        throw new Error('O arquivo XML selecionado está vazio.');
      }

      // 3. Execução do DOMParser nativo
      const parseResult = parseNFeXml(xmlString);
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Falha ao analisar a estrutura XML do documento.');
      }

      const extracted = parseResult.data;

      // 4. Validação da Chave de Acesso (44 dígitos e Módulo 11)
      if (!extracted.chaveAcesso) {
        throw new Error('Chave de acesso não localizada no documento fiscal (tag infNFe/@Id ausente).');
      }

      const keyValidation = validateAccessKey(extracted.chaveAcesso);
      if (!keyValidation.isValid) {
        throw new Error(
          `Inconsistência na Chave de Acesso: ${keyValidation.error || 'Dígito verificador ou formato incorreto.'}`
        );
      }

      // 5. Mapeamento para o contrato do invoiceRepository
      const invoiceData = mapXmlToInvoice(extracted);

      // Assegura flags estritas de importação em sessão volátil
      invoiceData.isRealImport = true;
      invoiceData.isDemo = false;

      // 6. Salvamento no repositório (exclusivamente em sessionInvoices Map)
      const savedInvoice = await invoiceRepository.create(invoiceData);

      // 7. Feedback de Sucesso Detalhado
      setImportSuccess({
        id: savedInvoice.id,
        numero: savedInvoice.numero,
        serie: savedInvoice.serie,
        chaveAcesso: savedInvoice.chaveAcesso,
        naturezaOperacao: savedInvoice.naturezaOperacao,
        emitente: {
          razaoSocial: savedInvoice.emitente?.razaoSocial || 'Não informado',
          cnpj: savedInvoice.emitente?.cnpj || '',
          uf: savedInvoice.emitente?.uf || '',
          municipio: savedInvoice.emitente?.municipio || '',
        },
        destinatario: {
          nome: savedInvoice.destinatario?.nome || 'Não informado',
          cnpjOuId: savedInvoice.destinatario?.cnpj || savedInvoice.destinatario?.idEstrangeiro || '',
          pais: savedInvoice.destinatario?.pais || 'Brasil',
          uf: savedInvoice.destinatario?.uf || '',
        },
        itensCount: savedInvoice.itens?.length || 0,
        valorTotal: savedInvoice.totais?.valorTotalNota || '0.00',
        valorProdutos: savedInvoice.totais?.valorProdutos || '0.00',
        valorFrete: savedInvoice.totais?.valorFrete || '0.00',
        outrasDespesas: savedInvoice.totais?.outrasDespesas || '0.00',
      });

      toast.success(
        `NF-e ${savedInvoice.numero} importada com sucesso! ${savedInvoice.itens?.length || 0} produtos prontos para conferência.`
      );
    } catch (err) {
      console.error('Erro na importação de XML:', err);
      const errMsg = err?.message || 'Ocorreu um erro desconhecido ao processar o arquivo XML.';
      setImportError({
        title: 'Falha na Validação do Arquivo XML',
        message: errMsg,
        isWarning: false,
      });
      toast.error(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenScenario = (scenarioId) => {
    toast.info(`Carregando conferência do ${scenarioId.toUpperCase()}...`);
    router.push(`/documentos/${scenarioId}/conferencia`);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setImportSuccess(null);
    setImportError(null);
    setIsProcessing(false);
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
                Envie arquivos <strong>.XML</strong> de NF-e modelo 55 para extração real e conferência imediata no navegador.
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
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FontAwesomeIcon icon={faCloudArrowUp} className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Arraste e solte seu arquivo XML aqui, ou{' '}
                <label
                  htmlFor="file-upload"
                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold"
                >
                  procure no computador
                </label>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos aceitos: <strong>.XML</strong> (NF-e modelo 55 padrão SEFAZ até 10 MB)
              </p>
            </div>
          </div>

          {/* Feedback de arquivo selecionado */}
          {selectedFile && (
            <div className="mt-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon
                    icon={selectedFile.type === 'XML' ? faFileCode : faFilePdf}
                    className={`w-6 h-6 ${selectedFile.type === 'XML' ? 'text-blue-500' : 'text-red-500'}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedFile.name}</p>
                    <span className="text-xs text-slate-500">{selectedFile.size} • {selectedFile.type}</span>
                  </div>
                </div>

                {isProcessing ? (
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                    <FontAwesomeIcon icon={faCircleNotch} className="animate-spin w-4 h-4" />
                    <span>Processando e validando NF-e...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {importSuccess && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                        <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5" />
                        <span>Leitura e Validação Concluídas</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2 cursor-pointer underline flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faTrashCan} className="w-3 h-3" />
                      Remover / Novo Arquivo
                    </button>
                  </div>
                )}
              </div>

              {/* Card de Erro Detalhado */}
              {importError && !isProcessing && (
                <div
                  className={`mt-4 p-4 rounded-lg border text-left text-xs ${
                    importError.isWarning
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <FontAwesomeIcon
                      icon={importError.isWarning ? faTriangleExclamation : faCircleExclamation}
                      className={`w-4 h-4 shrink-0 mt-0.5 ${importError.isWarning ? 'text-amber-600' : 'text-rose-600'}`}
                    />
                    <div className="space-y-1">
                      <p className="font-bold text-sm">{importError.title}</p>
                      <p className="leading-relaxed whitespace-pre-wrap">{importError.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Card de Sucesso com Resumo da Nota e Ação Direta para Conferência */}
              {importSuccess && !isProcessing && (
                <div className="mt-4 p-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/80 dark:border-emerald-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCircleCheck} className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                          NF-e {importSuccess.numero} importada com sucesso!
                        </h3>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          Série {importSuccess.serie} • Chave: <span className="font-mono">{importSuccess.chaveAcesso}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        buttonType="primary"
                        size="small"
                        onClick={() => router.push(`/documentos/${importSuccess.id}/conferencia`)}
                      >
                        <FontAwesomeIcon icon={faPlay} className="mr-1.5" />
                        Abrir na Conferência
                      </Button>
                    </div>
                  </div>

                  {/* Grid de Informações Extraídas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white dark:bg-slate-800/80 p-3 rounded border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Emitente
                      </span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate" title={importSuccess.emitente.razaoSocial}>
                        {importSuccess.emitente.razaoSocial}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {importSuccess.emitente.cnpj || 'CNPJ não informado'}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-3 rounded border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Destinatário
                      </span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate" title={importSuccess.destinatario.nome}>
                        {importSuccess.destinatario.nome}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {importSuccess.destinatario.pais} ({importSuccess.destinatario.uf})
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-3 rounded border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Produtos / Linhas
                      </span>
                      <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {importSuccess.itensCount} {importSuccess.itensCount === 1 ? 'item' : 'itens'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={importSuccess.naturezaOperacao}>
                        {importSuccess.naturezaOperacao || 'Operação normal'}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 p-3 rounded border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Valor Total da NF-e
                      </span>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBRL(importSuccess.valorTotal)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Produtos: {formatBRL(importSuccess.valorProdutos)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
