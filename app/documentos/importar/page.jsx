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
  faPlay,
  faArrowRight,
  faCircleNotch,
  faFolderOpen,
  faBoxesStacked,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import { useAppContext } from '@/context/AppContext';

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [simulatedExtraction, setSimulatedExtraction] = useState(null);

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

  const processFile = (file) => {
    const isXML = file.name.toLowerCase().endsWith('.xml');
    const isPDF = file.name.toLowerCase().endsWith('.pdf');

    if (!isXML && !isPDF) {
      toast.error('Formato inválido. Por favor, envie arquivos .XML ou .PDF.');
      return;
    }

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
    setSimulatedExtraction(null);
    setUploading(true);
    setUploadProgress(0);

    let current = 0;
    const interval = setInterval(() => {
      current += 20;
      setUploadProgress(Math.min(current, 100));

      if (current >= 100) {
        clearInterval(interval);
        setUploading(false);
        setSimulatedExtraction({
          numero: '000.145.892',
          itensCount: isXML ? 8 : 25,
          tipo: fileMeta.type,
          valorEstimado: isXML ? 'R$ 291.200,00' : 'R$ 148.750,00',
        });
        toast.success(
          `Arquivo ${file.name} processado com sucesso na demonstração! Extração simulada pronta para conferência.`
        );
      }
    }, 180);
  };

  const handleOpenScenario = (scenarioId) => {
    toast.info(`Carregando conferência do ${scenarioId.toUpperCase()}...`);
    router.push(`/documentos/${scenarioId}/conferencia`);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setSimulatedExtraction(null);
    setUploadProgress(0);
    setUploading(false);
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
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FontAwesomeIcon icon={faFileImport} className="text-blue-600" />
                Importação de Documentos Fiscais
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Envie arquivos <strong>.XML</strong> de NF-e ou faturas/danfes em <strong>.PDF</strong> para simular a extração e conferência de exportação.
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
                Arraste e solte seus arquivos aqui, ou{' '}
                <label
                  htmlFor="file-upload"
                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold"
                >
                  procure no computador
                </label>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos aceitos: <strong>.XML</strong> (layout NF-e padrão SEFAZ) e <strong>.PDF</strong> (faturas/danfes até 10 MB)
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

                {uploading ? (
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                    <FontAwesomeIcon icon={faCircleNotch} className="animate-spin w-4 h-4" />
                    <span>Processando extração {uploadProgress}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                      <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5" />
                      <span>Leitura Concluída</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2 cursor-pointer underline"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              {/* Barra de progresso visual */}
              {uploading && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              {/* Resumo da extração simulada com CTAs */}
              {simulatedExtraction && !uploading && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      Extração simulada: {simulatedExtraction.itensCount} produtos detectados ({simulatedExtraction.valorEstimado})
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Na demonstração, o arquivo foi associado aos dados estruturados do Cenário 1 para conferência imediata.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      buttonType="primary"
                      size="small"
                      onClick={() => handleOpenScenario('demo-01')}
                    >
                      <FontAwesomeIcon icon={faPlay} className="mr-1.5" />
                      Abrir na Conferência
                    </Button>
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
