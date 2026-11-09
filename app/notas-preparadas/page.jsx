'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardCheck,
  faFileInvoice,
  faEye,
  faRotateRight,
  faBoxesStacked,
  faDownload,
  faTrashCan,
  faFileCode,
  faXmark,
  faPrint,
  faCheck,
  faArrowRight,
  faCircleCheck,
  faBuilding,
  faGlobe,
  faBarcode,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import DataTable from '@/components/table/DataTable';
import Button from '@/components/buttons/Button';
import Dialog from '@/components/Layouts/Dialog';
import { useAppContext } from '@/context/AppContext';

import { formatBRL } from '@/lib/formatters/currency';
import { formatDateBR, formatDateTimeBR } from '@/lib/formatters/dates';
import { preparedInvoiceRepository } from '@/features/preparedInvoiceRepository';

export default function NotasPreparadasPage() {
  const { toast } = useAppContext();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para modais de ação
  const [selectedDanfe, setSelectedDanfe] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await preparedInvoiceRepository.list();
      setNotes(data || []);
    } catch {
      toast.error('Erro ao listar notas preparadas.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Ação: Download de XML Simulado
  const handleDownloadXml = (note) => {
    try {
      const xmlNumber = String(note.numero || '000000').replace(/\D/g, '');
      const xmlChave = `5024117778889900012255003000${xmlNumber.padStart(6, '0')}1001122334`;
      
      const emitNome = note.emitente?.razaoSocial || 'Cooperativa Agroindustrial Centro-Oeste';
      const emitCnpj = String(note.emitente?.cnpj || '77788899000122').replace(/\D/g, '');
      const emitUf = note.emitente?.uf || 'MT';
      
      const destNome = note.destinatario?.nome || note.destinatario?.razaoSocial || 'Destinatário Internacional';
      const destPais = note.destinatario?.pais || 'Exterior';
      const destPaisCod = note.destinatario?.paisCodigo || '156';

      // Gera as tags <det> para cada produto alocado na nota preparada
      const itemsList = Array.isArray(note.itens) && note.itens.length > 0
        ? note.itens
        : [
            {
              item: 1,
              codigo: 'PROD-EXP-001',
              descricao: note.descricaoLote || 'Mercadoria de Exportação',
              ncm: '12019000',
              cfop: '7101',
              unidade: 'UN',
              quantidade: String(note.quantidadeItens || '1'),
              valorUnitario: note.valorTotalNota || '0.00',
              valorTotal: note.valorTotalNota || '0.00',
            },
          ];

      const detXml = itemsList
        .map((it, idx) => {
          const nItem = it.item || idx + 1;
          const cProd = it.codigo || `PROD-${nItem}`;
          const xProd = it.descricao || 'Produto';
          const ncm = it.ncm || '00000000';
          const cfop = it.cfop || '7101';
          const uCom = it.unidade || 'UN';
          const qCom = it.quantidade || '1';
          const vUnCom = it.valorUnitario || '0.00';
          const vProd = it.valorTotal || '0.00';

          return `      <det nItem="${nItem}">
        <prod>
          <cProd>${cProd}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${xProd}</xProd>
          <NCM>${ncm}</NCM>
          <CFOP>${cfop}</CFOP>
          <uCom>${uCom}</uCom>
          <qCom>${qCom}</qCom>
          <vUnCom>${vUnCom}</vUnCom>
          <vProd>${vProd}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>${uCom}</uTrib>
          <qTrib>${qCom}</qTrib>
          <vUnTrib>${vUnCom}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS40>
              <orig>0</orig>
              <CST>41</CST>
            </ICMS40>
          </ICMS>
        </imposto>
      </det>`;
        })
        .join('\n');

      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${xmlChave}" versao="4.00">
      <ide>
        <cUF>50</cUF>
        <cNF>${xmlNumber.slice(-8) || '12345678'}</cNF>
        <natOp>EXPORTACAO DE MERCADORIAS</natOp>
        <mod>55</mod>
        <serie>${note.serie || '1'}</serie>
        <nNF>${xmlNumber || '1'}</nNF>
        <dhEmi>${note.dataCriacao || new Date().toISOString()}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>3</idDest>
        <cMunFG>5103403</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>SmartNFe-1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${emitCnpj}</CNPJ>
        <xNome>${emitNome}</xNome>
        <UF>${emitUf}</UF>
        <CRT>3</CRT>
      </emit>
      <dest>
        <xNome>${destNome}</xNome>
        <cPais>${destPaisCod}</cPais>
        <xPais>${destPais}</xPais>
        <indIEDest>9</indIEDest>
      </dest>
${detXml}
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vProd>${note.valorTotalNota || note.valorTotal || '0.00'}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${note.valorTotalNota || note.valorTotal || '0.00'}</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>0</modFrete>
      </transp>
      <infAdic>
        <infCpl>Preparação SmartNFe: ${note.descricaoLote || note.nomePreparacao || 'Lote de Exportação'}. Origem: NF-e ${note.origemNumero || note.numeroOrigem || 'Principal'}</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
</nfeProc>`;

      const blob = new Blob([xmlContent], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NFe_${note.numero ? note.numero.replace(/[^a-zA-Z0-9-]/g, '_') : note.id}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Download do XML simulado da nota ${note.numero} concluído!`);
    } catch {
      toast.error('Erro ao gerar arquivo XML simulado.');
    }
  };

  // Ação: Confirmação e Exclusão
  const confirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      setIsDeleting(true);
      const success = await preparedInvoiceRepository.delete(noteToDelete.id);
      if (success) {
        toast.success(`Nota preparada "${noteToDelete.numero}" excluída com sucesso.`);
        await loadData();
      } else {
        toast.error('Não foi possível excluir a nota preparada.');
      }
    } catch {
      toast.error('Erro ao excluir nota preparada.');
    } finally {
      setIsDeleting(false);
      setNoteToDelete(null);
    }
  };

  // Ação: Restaurar Mocks de Fábrica se a lista estiver vazia
  const handleRestoreDefaults = async () => {
    try {
      await preparedInvoiceRepository.resetDemoData();
      await loadData();
      toast.success('Notas preparadas de demonstração restauradas com sucesso.');
    } catch {
      toast.error('Erro ao restaurar dados demonstrativos.');
    }
  };

  // Definição das colunas da tabela
  const columns = [
    {
      key: 'numero',
      label: 'NF Preparada / Lote',
      align: 'left',
      render: (item) => (
        <div className="flex flex-col py-1">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faFileInvoice} className="text-blue-600 w-3.5 h-3.5" />
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {item.numero || `Prep #${item.id?.substring(0, 8)}`}
            </span>
          </div>
          {item.descricaoLote && (
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
              {item.descricaoLote}
            </span>
          )}
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Origem: NF-e {item.origemNumero || '000.205.670'}
          </span>
        </div>
      ),
    },
    {
      key: 'destinatario',
      label: 'Empresa Destinatária',
      align: 'left',
      render: (item) => {
        const destNome =
          item.destinatario?.nome ||
          item.destinatario?.razaoSocial ||
          'Destinatário Internacional';
        const destLocal =
          item.destinatario?.pais ||
          item.destinatario?.cnpj ||
          item.destinatario?.idEstrangeiro ||
          'Exportação';

        return (
          <div className="flex flex-col py-1">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {destNome}
            </span>
            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <FontAwesomeIcon icon={faGlobe} className="w-2.5 h-2.5 text-slate-400" />
              {destLocal}
            </span>
          </div>
        );
      },
    },
    {
      key: 'dataCriacao',
      label: 'Data de Preparação',
      align: 'center',
      render: (item) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {item.dataCriacao ? formatDateBR(item.dataCriacao) : '26/10/2026'}
        </span>
      ),
    },
    {
      key: 'itens',
      label: 'Itens',
      align: 'center',
      render: (item) => {
        const count = item.quantidadeItens || (Array.isArray(item.itens) ? item.itens.length : 0);
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            {count} {count === 1 ? 'item' : 'itens'}
          </span>
        );
      },
    },
    {
      key: 'valor',
      label: 'Valor Total',
      align: 'right',
      render: (item) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
          {formatBRL(item.valorTotalNota || item.valorTotal || 0)}
        </span>
      ),
    },
    {
      key: 'acoes',
      label: 'Ações',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5 py-1">
          {/* Visualizar Espelho DANFE */}
          <button
            type="button"
            title="Visualizar Espelho DANFE"
            onClick={() => setSelectedDanfe(item)}
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded cursor-pointer transition-colors"
          >
            <FontAwesomeIcon icon={faEye} className="w-3.5 h-3.5" />
          </button>

          {/* Download XML Simulado */}
          <button
            type="button"
            title="Baixar XML Simulado"
            onClick={() => handleDownloadXml(item)}
            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded cursor-pointer transition-colors"
          >
            <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5" />
          </button>

          {/* Excluir Nota Preparada */}
          <button
            type="button"
            title="Excluir Nota Preparada"
            onClick={() => setNoteToDelete(item)}
            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded cursor-pointer transition-colors"
          >
            <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notas Preparadas' }]}>
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FontAwesomeIcon icon={faClipboardCheck} className="text-blue-600" />
              Notas Fiscais Preparadas
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualize os lotes e desmembramentos resultantes das divisões efetuadas para emissão final de exportação.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/documentos">
              <Button buttonType="primary" size="small">
                <FontAwesomeIcon icon={faBoxesStacked} className="w-3.5 h-3.5 mr-1.5" />
                Nova Divisão
              </Button>
            </Link>

            <Button buttonType="secondary" size="small" outline onClick={loadData}>
              <FontAwesomeIcon icon={faRotateRight} className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Conteúdo: Tabela ou Empty State */}
        {!loading && notes.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center shadow-xs space-y-4 max-w-xl mx-auto my-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <FontAwesomeIcon icon={faBoxesStacked} className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Nenhuma Nota Fiscal Preparada Encontrada
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
                As notas preparadas são geradas quando você realiza o desmembramento de produtos em um documento fiscal de exportação (ex: divisão em múltiplos contêineres).
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/documentos">
                <Button buttonType="primary" size="small">
                  <FontAwesomeIcon icon={faArrowRight} className="mr-1.5" />
                  Ir para Documentos Fiscais
                </Button>
              </Link>

              <Button buttonType="secondary" size="small" outline onClick={handleRestoreDefaults}>
                <FontAwesomeIcon icon={faRotateRight} className="mr-1.5" />
                Restaurar Lotes Mock Padrão
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <DataTable
              data={notes}
              columns={columns}
              dense={false}
              mainText={`Notas Preparadas (${notes.length} ${notes.length === 1 ? 'lote gerado' : 'lotes gerados'})`}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: Espelho DANFE Demonstrativo */}
        {/* ========================================================================= */}
        {selectedDanfe && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedDanfe(null);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-300 dark:border-slate-700 w-full max-w-2xl my-8 overflow-hidden flex flex-col">
              {/* Top Modal Bar */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faFileCode} className="text-blue-400" />
                  <span className="font-bold text-sm">
                    Espelho DANFE — Nota Fiscal Preparada
                  </span>
                  <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded font-mono">
                    MODO DEMONSTRAÇÃO
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDanfe(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                </button>
              </div>

              {/* Corpo do DANFE */}
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-sans text-xs text-slate-800 dark:text-slate-200">
                {/* Cabeçalho Fiscal Simulado */}
                <div className="border border-slate-300 dark:border-slate-700 p-3.5 rounded bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                      Cooperativa Agroindustrial Centro-Oeste
                    </span>
                    <p className="text-[11px] text-slate-500">
                      CNPJ: 77.788.899/0001-22 • Cuiabá - MT • CEP 78000-000
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Natureza da Operação: <strong>EXPORTAÇÃO DE MERCADORIAS</strong>
                    </p>
                  </div>

                  <div className="border border-slate-300 dark:border-slate-700 p-2.5 rounded text-center min-w-[140px] bg-white dark:bg-slate-900">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">DANFE</span>
                    <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 block mt-0.5">
                      Nº {selectedDanfe.numero}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Série: {selectedDanfe.serie || '1'}</span>
                    <span className="text-[10px] text-slate-500 block">Tipo: 1 - Saída</span>
                  </div>
                </div>

                {/* Chave de Acesso */}
                <div className="border border-slate-300 dark:border-slate-700 p-2.5 rounded bg-white dark:bg-slate-900 text-center space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">
                    Chave de Acesso Demonstrativa
                  </span>
                  <p className="font-mono text-xs font-bold tracking-wider text-slate-800 dark:text-slate-200">
                    5024 1177 7888 9900 0122 5500 3000 {String(selectedDanfe.numero || '1').replace(/\D/g, '').padStart(6, '0')} 1001 1223 34
                  </p>
                </div>

                {/* Dados do Destinatário */}
                <div className="border border-slate-300 dark:border-slate-700 p-3 rounded space-y-1 bg-white dark:bg-slate-900">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block border-b border-slate-200 dark:border-slate-800 pb-1">
                    Destinatário / Remetente
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[11px] text-slate-500">Razão Social / Nome:</span>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {selectedDanfe.destinatario?.nome || selectedDanfe.destinatario?.razaoSocial || 'Asian Grain Corporation'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">País de Destino / ID:</span>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {selectedDanfe.destinatario?.pais || 'China'} (ID: CN-SHA-100293)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dados do Lote e Origem */}
                <div className="border border-slate-300 dark:border-slate-700 p-3 rounded space-y-1 bg-white dark:bg-slate-900">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block border-b border-slate-200 dark:border-slate-800 pb-1">
                    Dados do Desmembramento / Lote
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500">Identificação do Lote:</span>
                      <p className="font-semibold">{selectedDanfe.descricaoLote || 'Contêiner de Exportação'}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">Documento de Origem:</span>
                      <p className="font-semibold">NF-e {selectedDanfe.origemNumero || '000.205.670'}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">Data de Geração:</span>
                      <p className="font-semibold">{selectedDanfe.dataCriacao ? formatDateTimeBR(selectedDanfe.dataCriacao) : '26/10/2026 09:00'}</p>
                    </div>
                  </div>
                </div>

                {/* Tabela de Produtos do Lote */}
                <div className="border border-slate-300 dark:border-slate-700 rounded overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 border-b border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Produtos e Mercadorias Alocadas no Lote</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {selectedDanfe.itens?.length || selectedDanfe.quantidadeItens || 0} produtos
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
                      <thead className="text-[10px] uppercase bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-2 py-1.5 text-center w-8">#</th>
                          <th className="px-2 py-1.5">Código / Descrição</th>
                          <th className="px-2 py-1.5 w-20">NCM</th>
                          <th className="px-2 py-1.5 w-16 text-center">CFOP</th>
                          <th className="px-2 py-1.5 w-14 text-center">Unid</th>
                          <th className="px-2 py-1.5 w-20 text-right">Qtd</th>
                          <th className="px-2 py-1.5 w-24 text-right">Unitário</th>
                          <th className="px-2 py-1.5 w-24 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {(selectedDanfe.itens && selectedDanfe.itens.length > 0) ? (
                          selectedDanfe.itens.map((it, idx) => (
                            <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-2 py-1 text-center font-mono text-slate-400">{it.item || idx + 1}</td>
                              <td className="px-2 py-1">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                                  {it.descricao}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">Cód: {it.codigo}</span>
                              </td>
                              <td className="px-2 py-1 font-mono text-[11px]">{it.ncm}</td>
                              <td className="px-2 py-1 text-center font-mono text-[11px]">{it.cfop}</td>
                              <td className="px-2 py-1 text-center font-mono uppercase">{it.unidade}</td>
                              <td className="px-2 py-1 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                {it.quantidade}
                              </td>
                              <td className="px-2 py-1 text-right font-mono">{formatBRL(it.valorUnitario)}</td>
                              <td className="px-2 py-1 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                {formatBRL(it.valorTotal)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-3 py-3 text-center text-slate-400 italic">
                              Itens demonstrativos consolidados no valor do lote.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totais do DANFE */}
                <div className="border border-slate-300 dark:border-slate-700 p-3 rounded bg-blue-50/40 dark:bg-blue-950/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                      Itens Distribuídos no Lote:
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {selectedDanfe.quantidadeItens || (selectedDanfe.itens ? selectedDanfe.itens.length : 0)} produtos
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block uppercase">
                      Valor Total da Nota Fiscal:
                    </span>
                    <span className="text-base font-extrabold text-blue-700 dark:text-blue-300 font-mono">
                      {formatBRL(selectedDanfe.valorTotalNota || selectedDanfe.valorTotal || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div className="bg-slate-50 dark:bg-slate-800 px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <Button
                  buttonType="success"
                  size="small"
                  onClick={() => handleDownloadXml(selectedDanfe)}
                >
                  <FontAwesomeIcon icon={faDownload} className="mr-1.5" />
                  Baixar XML da Nota
                </Button>

                <div className="flex gap-2">
                  <Button
                    buttonType="secondary"
                    size="small"
                    outline
                    onClick={() => {
                      toast.info('Simulação de impressão do DANFE acionada.');
                      window.print();
                    }}
                  >
                    <FontAwesomeIcon icon={faPrint} className="mr-1.5" />
                    Imprimir Espelho
                  </Button>

                  <Button
                    buttonType="secondary"
                    size="small"
                    onClick={() => setSelectedDanfe(null)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: Confirmação de Exclusão */}
        {/* ========================================================================= */}
        <Dialog
          showDialog={Boolean(noteToDelete)}
          setDialogControl={() => setNoteToDelete(null)}
          title={`Deseja realmente excluir a nota preparada "${noteToDelete?.numero}"? Esta ação removerá o lote preparado do sistema.`}
          hideTextArea
          btnCancel="Cancelar"
          btnAccept={isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
          confirmActionCallback={confirmDelete}
          small
        />
      </div>
    </AppLayout>
  );
}
