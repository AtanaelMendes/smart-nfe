'use client';

import { useState, useEffect, useMemo, use, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileInvoice,
  faArrowLeft,
  faFloppyDisk,
  faCheckDouble,
  faScissors,
  faTriangleExclamation,
  faMagnifyingGlass,
  faRotateLeft,
  faEye,
  faFilePdf,
  faFileCode,
  faCircleCheck,
  faSort,
  faSortUp,
  faSortDown,
  faChevronDown,
  faChevronUp,
  faLayerGroup,
  faTruck,
  faBarcode,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import InputText from '@/components/inputs/InputText';
import { FiscalGroup } from '@/components/notes/FiscalField';
import { useAppContext } from '@/context/AppContext';

import { formatBRL } from '@/lib/formatters/currency';
import { formatDateBR } from '@/lib/formatters/dates';
import { getStatusLabel, getStatusColor } from '@/lib/formatters/status';
import { invoiceRepository } from '@/features/invoiceRepository';

import {
  calculateItemTotal,
  calculateInvoiceTotals,
} from '@/lib/calculations/invoiceTotals';
import {
  decimalSubtract,
  decimalCompare,
  isDecimalZero,
  isDecimalNegative,
  cleanDecimalString,
} from '@/lib/calculations/decimal';

function ReadField({ label, value, mono = false, className = '' }) {
  const display = value === '' || value === null || value === undefined ? '—' : String(value);
  return (
    <div className={className}>
      <span className="block text-[9px] font-semibold uppercase text-slate-400">{label}</span>
      <span className={`block truncate text-slate-700 dark:text-slate-200 ${mono ? 'font-mono' : ''}`} title={display}>
        {display}
      </span>
    </div>
  );
}

export default function ConferenciaPage({ params }) {
  // Unwrap do params no Next.js App Router
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const router = useRouter();
  const { toast } = useAppContext();

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [fiscalPanelOpen, setFiscalPanelOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState(() => new Set());

  const toggleItemDetails = (itemId) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await invoiceRepository.findById(id);
        if (data) {
          setInvoice(data);
          setItems(data.itens || []);
        } else {
          toast.error('Documento não encontrado.');
        }
      } catch (e) {
        toast.error('Erro ao carregar o documento.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, toast]);

  // Edição direta de campo na tabela orientada exclusivamente a itemId estável
  const handleItemChange = (itemId, field, value) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== itemId) return item;

        // Snapshot inicial imutável no primeiro toque
        const valorOriginal = item.valorOriginal || {
          item: item.item,
          codigo: item.codigo,
          descricao: item.descricao,
          ncm: item.ncm,
          cfop: item.cfop,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
        };

        const updated = {
          ...item,
          [field]: value,
          modificado: true,
          valorOriginal,
        };

        // Recálculo automático do valor total do produto via motor decimal BigInt
        if (field === 'quantidade' || field === 'valorUnitario') {
          const q = field === 'quantidade' ? value : item.quantidade;
          const u = field === 'valorUnitario' ? value : item.valorUnitario;
          updated.valorTotal = calculateItemTotal(u, q);
        }

        return updated;
      })
    );
    setHasChanges(true);
  };

  // Restaura um único item para o snapshot de valor original
  const handleRestoreItem = (itemId) => {
    setItems((prevItems) => {
      const next = prevItems.map((item) => {
        if (item.id !== itemId || !item.valorOriginal) return item;
        return {
          ...item,
          ...item.valorOriginal,
          modificado: false,
          valorOriginal: null,
        };
      });
      const anyModified = next.some((it) => it.modificado);
      setHasChanges(anyModified);
      return next;
    });
    toast.info('Item restaurado para o valor original.');
  };

  // Restaura todos os itens modificados de volta ao baseline original
  const handleRestoreAll = () => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (!item.valorOriginal) return item;
        return {
          ...item,
          ...item.valorOriginal,
          modificado: false,
          valorOriginal: null,
        };
      })
    );
    setHasChanges(false);
    toast.info('Todos os itens foram restaurados para os valores originais.');
  };

  // Ordenação de colunas da tabela
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Navegação por teclado (Enter move verticalmente, Escape desfaz/cancela)
  const handleKeyDown = (e, rowIndex, field, itemId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const targetIndex = e.shiftKey ? rowIndex - 1 : rowIndex + 1;
      if (targetIndex >= 0 && targetIndex < filteredAndSortedItems.length) {
        const nextInput = document.querySelector(
          `input[data-row-index="${targetIndex}"][data-field="${field}"]`
        );
        if (nextInput) {
          nextInput.focus();
          if (typeof nextInput.select === 'function') {
            nextInput.select();
          }
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRestoreItem(itemId);
      e.target.blur();
    }
  };

  // Salvar alterações no repositório com preservação integral de despesas acessórias
  const handleSave = async () => {
    try {
      // 1. Validação de integridade numérica
      for (const item of items) {
        if (isDecimalNegative(item.quantidade)) {
          toast.error(`Item ${item.item || item.codigo || item.id}: A quantidade não pode ser negativa.`);
          return;
        }
        if (isDecimalNegative(item.valorUnitario)) {
          toast.error(`Item ${item.item || item.codigo || item.id}: O valor unitário não pode ser negativo.`);
          return;
        }
        if (isDecimalZero(item.quantidade) || String(item.quantidade).trim() === '') {
          toast.error(`Item ${item.item || item.codigo || item.id}: A quantidade deve ser maior que zero.`);
          return;
        }
      }

      // 2. Recálculo consolidado via motor fiscal
      const newTotals = calculateInvoiceTotals(items, invoice?.totais || {});

      const updatedInvoice = {
        ...invoice,
        itens: items,
        totais: {
          ...invoice?.totais,
          valorProdutos: newTotals.valorProdutos,
          valorTotalProdutos: newTotals.valorProdutos,
          valorFrete: newTotals.valorFrete,
          valorSeguro: newTotals.valorSeguro,
          valorDesconto: newTotals.valorDesconto,
          outrasDespesas: newTotals.outrasDespesas,
          valorTotalNota: newTotals.valorTotalNota,
        },
      };

      await invoiceRepository.update(id, updatedInvoice);
      setInvoice(updatedInvoice);
      setHasChanges(false);
      toast.success('Alterações salvas com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar as alterações.');
    }
  };

  // Marcar nota como conferida
  const handleMarkAsChecked = async () => {
    try {
      for (const item of items) {
        if (isDecimalNegative(item.quantidade) || isDecimalNegative(item.valorUnitario)) {
          toast.error('Não é possível concluir conferência com quantidades ou preços negativos.');
          return;
        }
      }

      const newTotals = calculateInvoiceTotals(items, invoice?.totais || {});
      const updated = {
        ...invoice,
        status: 'conferido',
        itens: items.map((i) => ({ ...i, situacao: 'conferido' })),
        totais: {
          ...invoice?.totais,
          valorProdutos: newTotals.valorProdutos,
          valorTotalProdutos: newTotals.valorProdutos,
          valorFrete: newTotals.valorFrete,
          valorSeguro: newTotals.valorSeguro,
          valorDesconto: newTotals.valorDesconto,
          outrasDespesas: newTotals.outrasDespesas,
          valorTotalNota: newTotals.valorTotalNota,
        },
      };

      await invoiceRepository.update(id, updated);
      setInvoice(updated);
      setItems(updated.itens);
      setHasChanges(false);
      toast.success('Nota marcada como CONFERIDA com sucesso!');
    } catch (e) {
      toast.error('Erro ao atualizar status.');
    }
  };

  // Totais recalculados via motor fiscal preservando frete, seguro, outras despesas e descontos
  const recalculatedTotals = useMemo(() => {
    if (!invoice) {
      return {
        valorProdutos: '0.00',
        valorTotalNota: '0.00',
        valorFrete: '0.00',
        valorSeguro: '0.00',
        valorDesconto: '0.00',
        outrasDespesas: '0.00',
      };
    }
    return calculateInvoiceTotals(items, invoice.totais || {});
  }, [items, invoice]);

  // Diferença do total da nota (Recalculado - Original)
  const totalsDiff = useMemo(() => {
    if (!recalculatedTotals || !invoice?.totais?.valorTotalNota) return '0.00';
    return decimalSubtract(
      recalculatedTotals.valorTotalNota,
      invoice.totais.valorTotalNota,
      2
    );
  }, [recalculatedTotals, invoice]);

  const hasTotalsDiff = useMemo(() => {
    return !isDecimalZero(totalsDiff);
  }, [totalsDiff]);

  // Contagem de itens modificados
  const modifiedItemsCount = useMemo(() => {
    return items.filter((i) => i.modificado).length;
  }, [items]);

  // Detecção de itens com dados ausentes ou inconsistências
  const itemsWithIssues = useMemo(() => {
    return items.filter((item) => {
      const cleanNcm = String(item.ncm || '').replace(/\D/g, '');
      const missingNcm = cleanNcm.length !== 8;
      const missingCfop = !item.cfop || String(item.cfop).trim() === '';
      const cleanQty = cleanDecimalString(item.quantidade);
      const cleanPrice = cleanDecimalString(item.valorUnitario);
      const invalidQty = isDecimalZero(cleanQty) || isDecimalNegative(cleanQty);
      const invalidPrice = isDecimalZero(cleanPrice) || isDecimalNegative(cleanPrice);
      const lineExpected = calculateItemTotal(item.valorUnitario, item.quantidade);
      const cleanTotal = cleanDecimalString(item.valorTotal);
      const mathDiff = decimalCompare(lineExpected, cleanTotal) !== 0;
      const flagged =
        item.situacao === 'inconsistente' ||
        (Array.isArray(item.inconsistencias) && item.inconsistencias.length > 0);

      return missingNcm || missingCfop || invalidQty || invalidPrice || mathDiff || flagged;
    });
  }, [items]);

  // Itens filtrados e ordenados
  const filteredAndSortedItems = useMemo(() => {
    let result = items;

    // Filtro textual
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (it) =>
          it.codigo?.toLowerCase().includes(term) ||
          it.descricao?.toLowerCase().includes(term) ||
          it.ncm?.toLowerCase().includes(term) ||
          it.cfop?.toLowerCase().includes(term)
      );
    }

    // Ordenação
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (['quantidade', 'valorUnitario', 'valorTotal'].includes(sortConfig.key)) {
          const cmp = decimalCompare(valA || '0', valB || '0');
          return sortConfig.direction === 'asc' ? cmp : -cmp;
        }

        if (sortConfig.key === 'item') {
          const numA = Number(valA || 0);
          const numB = Number(valB || 0);
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        const cmp = strA.localeCompare(strB);
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [items, searchTerm, sortConfig]);

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Conferência' }]}>
        <div className="p-8 text-center text-slate-500">Carregando dados da nota...</div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Conferência' }]}>
        <div className="p-8 text-center text-red-500">Documento não encontrado.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documentos', href: '/documentos' },
        { label: `Conferência NF-e ${invoice.numero}` },
      ]}
    >
      <div className="space-y-4">
        {/* Barra Superior de Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/documentos"
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Voltar para lista"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Conferência da NF-e {invoice.numero}
                </h1>
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                  Série {invoice.serie}
                </span>
                <span className="text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold px-2 py-0.5 rounded font-mono shadow-xs">
                  NF-e Mod. 55
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(invoice.status)}`}>
                  {getStatusLabel(invoice.status)}
                </span>
                {invoice.isRealImport || invoice.isDemo === false ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                    title="Documento mantido exclusivamente na memória volátil de sessão. Não persistido em disco."
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Importação Local (Memória Temporária de Sessão)</span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                    title="Cenário de demonstração pré-carregado no navegador."
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Modo Demonstração</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate max-w-lg mt-0.5">
                Chave: <span className="font-mono">{invoice.chaveAcesso}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              buttonType="secondary"
              size="small"
              outline
              onClick={() => setShowPreview(!showPreview)}
            >
              <FontAwesomeIcon icon={showPreview ? faFileCode : faEye} className="w-3.5 h-3.5 mr-1" />
              {showPreview ? 'Ocultar Origem' : 'Ver Origem (PDF/XML)'}
            </Button>

            {modifiedItemsCount > 0 && (
              <Button
                buttonType="secondary"
                size="small"
                outline
                onClick={handleRestoreAll}
                title="Desfazer todas as edições e restaurar dados originais"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Restaurar Todos ({modifiedItemsCount})
              </Button>
            )}

            <Button
              buttonType="primary"
              size="small"
              disabled={!hasChanges}
              onClick={handleSave}
            >
              <FontAwesomeIcon icon={faFloppyDisk} className="w-3.5 h-3.5 mr-1" />
              Salvar Edições
            </Button>

            <Button
              buttonType="success"
              size="small"
              onClick={handleMarkAsChecked}
            >
              <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5 mr-1" />
              Marcar como Conferido
            </Button>

            <Button
              buttonType="warning"
              size="small"
              onClick={() => router.push(`/documentos/${id}/divisao`)}
            >
              <FontAwesomeIcon icon={faScissors} className="w-3.5 h-3.5 mr-1" />
              Dividir Nota
            </Button>
          </div>
        </div>

        {/* Visualização de Origem Opcional (Painel Recolhível) */}
        {showPreview && (
          <div className="bg-slate-900 text-slate-200 p-4 rounded-lg border border-slate-700 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
              <span className="font-bold flex items-center gap-2">
                <FontAwesomeIcon icon={invoice.tipoDocumento === 'XML' ? faFileCode : faFilePdf} />
                Visualização do Documento de Origem ({invoice.tipoDocumento})
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-300">
                Visualização Demonstrativa
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <span className="text-slate-500 block">Emitente:</span>
                <span className="font-semibold">{invoice.emitente?.razaoSocial}</span>
                <span className="block text-[11px] text-slate-400">CNPJ: {invoice.emitente?.cnpj}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Destinatário:</span>
                <span className="font-semibold">{invoice.destinatario?.nome}</span>
                <span className="block text-[11px] text-slate-400">{invoice.destinatario?.pais} ({invoice.destinatario?.paisCodigo})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Emissão:</span>
                <span>{formatDateBR(invoice.dataEmissao || invoice.emissao)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Valor Original:</span>
                <span className="font-bold text-emerald-400">{formatBRL(invoice.totais?.valorTotalNota)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Resumo da Nota (Cards Informativos) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Emitente</span>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
              {invoice.emitente?.razaoSocial}
            </p>
            <span className="text-[10px] text-slate-400">CNPJ: {invoice.emitente?.cnpj}</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Destino de Exportação</span>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
              {invoice.destinatario?.nome}
            </p>
            <span className="text-[10px] text-slate-400">{invoice.destinatario?.pais}</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Produtos da NF-e</span>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {items.length} produtos
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {modifiedItemsCount > 0 ? (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                  {modifiedItemsCount} alterado(s)
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Todos originais</span>
              )}
              {itemsWithIssues.length > 0 && (
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                  {itemsWithIssues.length} pendente(s)
                </span>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Total da NF-e</span>
              {hasTotalsDiff && (
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {isDecimalNegative(totalsDiff) ? '' : '+'}{formatBRL(totalsDiff)}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
              {formatBRL(recalculatedTotals?.valorTotalNota)}
            </p>
            <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
              <span>Produtos: {formatBRL(recalculatedTotals?.valorProdutos)}</span>
              {invoice.totais?.valorTotalNota && invoice.totais.valorTotalNota !== recalculatedTotals?.valorTotalNota && (
                <span className="line-through text-slate-400">Orig: {formatBRL(invoice.totais.valorTotalNota)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Alerta de Inconsistências Fiscais */}
        {itemsWithIssues.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Alerta de Inconsistências Fiscais:</strong> {itemsWithIssues.length} {itemsWithIssues.length === 1 ? 'produto apresenta' : 'produtos apresentam'} dados ausentes ou divergentes (NCM incompleto, CFOP ausente ou divergência no cálculo).
              </span>
            </div>
            <span className="text-[11px] font-semibold bg-amber-200 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-full text-amber-900 dark:text-amber-200 self-start sm:self-auto">
              {itemsWithIssues.length} {itemsWithIssues.length === 1 ? 'pendência' : 'pendências'}
            </span>
          </div>
        )}

        {/* Tabela de Produtos Editável */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          {/* Barra de Busca na Tabela */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Produtos da Nota ({filteredAndSortedItems.length})
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                • Edite as células diretamente na grade ou use Enter/Esc
              </span>
            </div>

            <div className="relative w-64">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2.5 top-2 z-10 text-slate-400 w-3 h-3 pointer-events-none" />
              <InputText
                id="conferenciaSearch"
                value={searchTerm}
                placeholder="Buscar código, descrição ou NCM..."
                onChange={(id, value) => setSearchTerm(value)}
                className="pl-8 pr-2 py-1 text-xs rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Grid de Edição
              NOTA: as células editáveis (codigo, descricao, ncm, cfop, unidade, quantidade,
              valorUnitario) permanecem como <input> NATIVOS de forma intencional: a navegação
              por teclado exige data-row-index/data-field (usados por document.querySelector no
              handleKeyDown), o handler onKeyDown com preventDefault/Escape + blur e o foco direto
              no elemento. O componente InputText não repassa atributos data-*, não expõe onKeyDown
              e mantém estado interno com máscara, o que quebraria Enter/Escape e a seleção de
              texto ao navegar entre linhas. */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
              <thead className="text-[11px] uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th
                    className="px-2 py-2 w-12 text-center cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => handleSort('item')}
                    title="Ordenar por número do item"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>#</span>
                      <FontAwesomeIcon
                        icon={sortConfig.key === 'item' ? (sortConfig.direction === 'asc' ? faSortUp : faSortDown) : faSort}
                        className={`w-2.5 h-2.5 ${sortConfig.key === 'item' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 opacity-60'}`}
                      />
                    </div>
                  </th>

                  <th
                    className="px-2 py-2 w-24 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => handleSort('codigo')}
                    title="Ordenar por código"
                  >
                    <div className="flex items-center justify-start gap-1">
                      <span>Código</span>
                      <FontAwesomeIcon
                        icon={sortConfig.key === 'codigo' ? (sortConfig.direction === 'asc' ? faSortUp : faSortDown) : faSort}
                        className={`w-2.5 h-2.5 ${sortConfig.key === 'codigo' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 opacity-60'}`}
                      />
                    </div>
                  </th>

                  <th
                    className="px-3 py-2 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => handleSort('descricao')}
                    title="Ordenar por descrição"
                  >
                    <div className="flex items-center justify-start gap-1">
                      <span>Descrição da Mercadoria</span>
                      <FontAwesomeIcon
                        icon={sortConfig.key === 'descricao' ? (sortConfig.direction === 'asc' ? faSortUp : faSortDown) : faSort}
                        className={`w-2.5 h-2.5 ${sortConfig.key === 'descricao' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 opacity-60'}`}
                      />
                    </div>
                  </th>

                  <th
                    className="px-2 py-2 w-24 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => handleSort('ncm')}
                    title="Ordenar por NCM"
                  >
                    <div className="flex items-center justify-start gap-1">
                      <span>NCM</span>
                      <FontAwesomeIcon
                        icon={sortConfig.key === 'ncm' ? (sortConfig.direction === 'asc' ? faSortUp : faSortDown) : faSort}
                        className={`w-2.5 h-2.5 ${sortConfig.key === 'ncm' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 opacity-60'}`}
                      />
                    </div>
                  </th>

                  <th
                    className="px-2 py-2 w-16 text-center cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => handleSort('cfop')}
                    title="Ordenar por CFOP"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>CFOP</span>
                      <FontAwesomeIcon
                        icon={sortConfig.key === 'cfop' ? (sortConfig.direction === 'asc' ? faSortUp : faSortDown) : faSort}
                        className={`w-2.5 h-2.5 ${sortConfig.key === 'cfop' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 opacity-60'}`}
                      />
                    </div>
                  </th>

                  <th
                    className="px-2 py-2 w-16 text-center cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => handleSort('unidade')}
                    title="Ordenar por unidade"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Unid.</span>
                      <FontAwesomeIcon
                        icon={sortConfig.key === 'unidade' ? (sortConfig.direction === 'asc' ? faSortUp : faSortDown) : faSort}
                        className={`w-2.5 h-2.5 ${sortConfig.key === 'unidade' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 opacity-60'}`}
                      />
                    </div>
                  </th>

                  <th
                    className="px-2 py-2 w-24 text-right cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => handleSort('quantidade')}
                    title="Ordenar por quantidade"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Qtd</span>
                      <FontAwesomeIcon
                        icon={sortConfig.key === 'quantidade' ? (sortConfig.direction === 'asc' ? faSortUp : faSortDown) : faSort}
                        className={`w-2.5 h-2.5 ${sortConfig.key === 'quantidade' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 opacity-60'}`}
                      />
                    </div>
                  </th>

                  <th
                    className="px-2 py-2 w-28 text-right cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => handleSort('valorUnitario')}
                    title="Ordenar por valor unitário"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Unitário (R$)</span>
                      <FontAwesomeIcon
                        icon={sortConfig.key === 'valorUnitario' ? (sortConfig.direction === 'asc' ? faSortUp : faSortDown) : faSort}
                        className={`w-2.5 h-2.5 ${sortConfig.key === 'valorUnitario' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 opacity-60'}`}
                      />
                    </div>
                  </th>

                  <th
                    className="px-2 py-2 w-28 text-right cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => handleSort('valorTotal')}
                    title="Ordenar por total do produto"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total (R$)</span>
                      <FontAwesomeIcon
                        icon={sortConfig.key === 'valorTotal' ? (sortConfig.direction === 'asc' ? faSortUp : faSortDown) : faSort}
                        className={`w-2.5 h-2.5 ${sortConfig.key === 'valorTotal' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 opacity-60'}`}
                      />
                    </div>
                  </th>

                  <th className="px-2 py-2 w-20 text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredAndSortedItems.map((item, index) => {
                  const isModified = item.modificado;
                  const orig = item.valorOriginal;
                  const trib = item.tributos || {};
                  const icms = trib.icms || {};
                  const ipi = trib.ipi || {};
                  const pis = trib.pis || {};
                  const cofins = trib.cofins || {};
                  const ibsCbs = trib.ibsCbs || null;

                  return (
                    <Fragment key={item.id}>
                    <tr
                      className={`hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors ${
                        isModified ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      {/* # */}
                      <td className="px-2 py-1.5 text-center font-mono text-slate-400">
                        {item.item || index + 1}
                      </td>

                      {/* Código */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          data-row-index={index}
                          data-field="codigo"
                          value={item.codigo || ''}
                          onChange={(e) => handleItemChange(item.id, 'codigo', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'codigo', item.id)}
                          className={`w-full px-1.5 py-1 text-xs rounded font-mono transition-colors ${
                            orig && orig.codigo !== item.codigo
                              ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold focus:border-amber-500'
                              : 'border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-900'
                          }`}
                        />
                        {orig && orig.codigo !== item.codigo && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block truncate" title="Código original">
                            Orig: {orig.codigo}
                          </span>
                        )}
                      </td>

                      {/* Descrição */}
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          data-row-index={index}
                          data-field="descricao"
                          value={item.descricao || ''}
                          onChange={(e) => handleItemChange(item.id, 'descricao', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'descricao', item.id)}
                          className={`w-full px-1.5 py-1 text-xs rounded font-medium transition-colors ${
                            orig && orig.descricao !== item.descricao
                              ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold focus:border-amber-500'
                              : 'border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900'
                          }`}
                        />
                        {orig && orig.descricao !== item.descricao && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block truncate" title="Descrição original">
                            Orig: {orig.descricao}
                          </span>
                        )}
                      </td>

                      {/* NCM */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          data-row-index={index}
                          data-field="ncm"
                          value={item.ncm || ''}
                          onChange={(e) => handleItemChange(item.id, 'ncm', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'ncm', item.id)}
                          className={`w-full px-1.5 py-1 text-xs rounded font-mono transition-colors ${
                            !item.ncm || String(item.ncm).replace(/\D/g, '').length !== 8
                              ? 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
                              : orig && orig.ncm !== item.ncm
                              ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold focus:border-amber-500'
                              : 'border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-900'
                          }`}
                          placeholder="00000000"
                        />
                        {orig && orig.ncm !== item.ncm && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block" title="NCM original">
                            Orig: {orig.ncm}
                          </span>
                        )}
                      </td>

                      {/* CFOP */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          data-row-index={index}
                          data-field="cfop"
                          value={item.cfop || ''}
                          onChange={(e) => handleItemChange(item.id, 'cfop', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'cfop', item.id)}
                          className={`w-full px-1.5 py-1 text-xs rounded font-mono text-center transition-colors ${
                            !item.cfop || String(item.cfop).trim() === ''
                              ? 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
                              : orig && orig.cfop !== item.cfop
                              ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold focus:border-amber-500'
                              : 'border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent font-mono text-center focus:bg-white dark:focus:bg-slate-900'
                          }`}
                          placeholder="7101"
                        />
                        {orig && orig.cfop !== item.cfop && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block text-center" title="CFOP original">
                            Orig: {orig.cfop}
                          </span>
                        )}
                      </td>

                      {/* Unidade */}
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="text"
                          data-row-index={index}
                          data-field="unidade"
                          value={item.unidade || ''}
                          onChange={(e) => handleItemChange(item.id, 'unidade', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'unidade', item.id)}
                          className={`w-full px-1 py-1 text-xs rounded uppercase text-center transition-colors ${
                            orig && orig.unidade !== item.unidade
                              ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold focus:border-amber-500'
                              : 'border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent text-center focus:bg-white dark:focus:bg-slate-900'
                          }`}
                        />
                        {orig && orig.unidade !== item.unidade && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block" title="Unidade original">
                            Orig: {orig.unidade}
                          </span>
                        )}
                      </td>

                      {/* Quantidade */}
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="text"
                          data-row-index={index}
                          data-field="quantidade"
                          value={item.quantidade ?? ''}
                          onChange={(e) => handleItemChange(item.id, 'quantidade', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'quantidade', item.id)}
                          className={`w-full px-1.5 py-1 text-xs rounded font-mono text-right transition-colors ${
                            isDecimalNegative(item.quantidade)
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-1 ring-red-500'
                              : orig && orig.quantidade !== item.quantidade
                              ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold focus:border-amber-500'
                              : 'border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-900'
                          }`}
                          title={isDecimalNegative(item.quantidade) ? 'Quantidade não pode ser negativa' : undefined}
                        />
                        {orig && orig.quantidade !== item.quantidade && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block text-right pr-1" title="Quantidade original">
                            Orig: {orig.quantidade}
                          </span>
                        )}
                      </td>

                      {/* Valor Unitário */}
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="text"
                          data-row-index={index}
                          data-field="valorUnitario"
                          value={item.valorUnitario ?? ''}
                          onChange={(e) => handleItemChange(item.id, 'valorUnitario', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'valorUnitario', item.id)}
                          className={`w-full px-1.5 py-1 text-xs rounded font-mono text-right transition-colors ${
                            isDecimalNegative(item.valorUnitario)
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-1 ring-red-500'
                              : orig && orig.valorUnitario !== item.valorUnitario
                              ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold focus:border-amber-500'
                              : 'border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-900'
                          }`}
                          title={isDecimalNegative(item.valorUnitario) ? 'Valor unitário não pode ser negativo' : undefined}
                        />
                        {orig && orig.valorUnitario !== item.valorUnitario && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block text-right pr-1" title="Valor unitário original">
                            Orig: {orig.valorUnitario}
                          </span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-3 py-1.5 text-right font-mono">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {formatBRL(item.valorTotal)}
                        </span>
                        {orig && orig.valorTotal !== item.valorTotal && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block" title="Total original do produto">
                            Orig: {formatBRL(orig.valorTotal)}
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            buttonType="ghost"
                            size="small"
                            outline
                            onClick={() => toggleItemDetails(item.id)}
                            className="!p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Detalhes fiscais do item"
                          >
                            <FontAwesomeIcon icon={expandedItems.has(item.id) ? faChevronUp : faChevronDown} className="w-3.5 h-3.5" />
                          </Button>
                          {isModified ? (
                            <>
                              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold px-1.5 py-0.5 rounded">
                                Editado
                              </span>
                              <Button
                                buttonType="warning"
                                size="small"
                                outline
                                onClick={() => handleRestoreItem(item.id)}
                                className="!p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Restaurar valor original deste item (Esc)"
                              >
                                <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400">Original</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandedItems.has(item.id) && (
                      <tr className="bg-blue-50/20 dark:bg-slate-800/50">
                        <td colSpan={10} className="px-3 py-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-blue-700 dark:text-blue-300">
                              <FontAwesomeIcon icon={faLayerGroup} />
                              Detalhes fiscais do item {item.item || index + 1}
                            </div>

                            <FiscalGroup title="Produto e Unidades" accent="slate">
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px]">
                                <ReadField label="CEST" value={item.cest} mono />
                                <ReadField label="GTIN Comercial" value={item.cEAN} mono />
                                <ReadField label="GTIN Tributável" value={item.cEANTrib} mono />
                                <ReadField label="UN Tributável" value={item.unidadeTributavel} mono />
                                <ReadField label="Qtd Tributável" value={item.quantidadeTributavel} mono />
                                <ReadField label="Valor Unit. Trib." value={item.valorUnitarioTributavel} mono />
                                <ReadField label="Compõe Total (indTot)" value={item.indicadorComposicaoTotal} mono />
                                <ReadField label="Pedido" value={item.pedido} />
                                <ReadField label="Item do Pedido" value={item.itemPedido} />
                                <ReadField label="Info. Adicional" value={item.informacoesAdicionais} className="md:col-span-2" />
                              </div>
                            </FiscalGroup>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                              <FiscalGroup title="ICMS" accent="blue">
                                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                  <ReadField label="CST" value={icms.cst} mono />
                                  <ReadField label="CSOSN" value={icms.csosn} mono />
                                  <ReadField label="Origem" value={icms.origem} mono />
                                  <ReadField label="Mod. Base" value={icms.modalidadeBase} mono />
                                  <ReadField label="Base ICMS" value={icms.vBC} mono />
                                  <ReadField label="% Redução" value={icms.pRedBC} mono />
                                  <ReadField label="Alíquota %" value={icms.pICMS} mono />
                                  <ReadField label="Valor ICMS" value={icms.vICMS} mono />
                                </div>
                              </FiscalGroup>

                              <FiscalGroup title="IPI" accent="blue">
                                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                  <ReadField label="CST" value={ipi.cst} mono />
                                  <ReadField label="Enquadramento" value={ipi.cEnq} mono />
                                  <ReadField label="Base IPI" value={ipi.vBC} mono />
                                  <ReadField label="Alíquota %" value={ipi.pIPI} mono />
                                  <ReadField label="Valor IPI" value={ipi.vIPI} mono />
                                </div>
                              </FiscalGroup>

                              <FiscalGroup title="PIS / COFINS" accent="blue">
                                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                  <ReadField label="CST PIS" value={pis.cst} mono />
                                  <ReadField label="Base PIS" value={pis.vBC} mono />
                                  <ReadField label="Alíq. PIS %" value={pis.pPIS} mono />
                                  <ReadField label="Valor PIS" value={pis.vPIS} mono />
                                  <ReadField label="CST COFINS" value={cofins.cst} mono />
                                  <ReadField label="Base COFINS" value={cofins.vBC} mono />
                                  <ReadField label="Alíq. COFINS %" value={cofins.pCOFINS} mono />
                                  <ReadField label="Valor COFINS" value={cofins.vCOFINS} mono />
                                </div>
                              </FiscalGroup>

                              <FiscalGroup title="IBS / CBS" accent="emerald">
                                {ibsCbs ? (
                                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                    <ReadField label="CST" value={ibsCbs.cst} mono />
                                    <ReadField label="Class. Trib." value={ibsCbs.cClassTrib} mono />
                                    <ReadField label="Base IBS/CBS" value={ibsCbs.vBC} mono />
                                    <ReadField label="% IBS UF" value={ibsCbs.pIBSUF} mono />
                                    <ReadField label="Valor IBS UF" value={ibsCbs.vIBSUF} mono />
                                    <ReadField label="% IBS Mun" value={ibsCbs.pIBSMun} mono />
                                    <ReadField label="Valor IBS Mun" value={ibsCbs.vIBSMun} mono />
                                    <ReadField label="Valor IBS" value={ibsCbs.vIBS} mono />
                                    <ReadField label="% CBS" value={ibsCbs.pCBS} mono />
                                    <ReadField label="Valor CBS" value={ibsCbs.vCBS} mono />
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic">Grupo IBS/CBS não informado neste item.</p>
                                )}
                              </FiscalGroup>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={6} className="px-4 py-2 text-slate-700 dark:text-slate-200">
                    Total dos Produtos ({items.length} itens)
                  </td>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm text-blue-600 dark:text-blue-400 font-mono">
                    {formatBRL(recalculatedTotals?.valorProdutos)}
                  </td>
                </tr>
                {(recalculatedTotals?.valorFrete !== '0.00' ||
                  recalculatedTotals?.valorSeguro !== '0.00' ||
                  recalculatedTotals?.outrasDespesas !== '0.00' ||
                  recalculatedTotals?.valorDesconto !== '0.00' ||
                  recalculatedTotals?.valorIPI !== '0.00') && (
                  <tr className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/40 font-normal">
                    <td colSpan={6} className="px-4 py-1.5">
                      Composição: Produtos ({formatBRL(recalculatedTotals?.valorProdutos)})
                      {recalculatedTotals?.valorDesconto !== '0.00' && ` − Desconto (${formatBRL(recalculatedTotals?.valorDesconto)})`}
                      {recalculatedTotals?.valorFrete !== '0.00' && ` + Frete (${formatBRL(recalculatedTotals?.valorFrete)})`}
                      {recalculatedTotals?.valorSeguro !== '0.00' && ` + Seguro (${formatBRL(recalculatedTotals?.valorSeguro)})`}
                      {recalculatedTotals?.outrasDespesas !== '0.00' && ` + Outras (${formatBRL(recalculatedTotals?.outrasDespesas)})`}
                      {recalculatedTotals?.valorIPI !== '0.00' && ` + IPI (${formatBRL(recalculatedTotals?.valorIPI)})`}
                    </td>
                    <td colSpan={4} className="px-4 py-1.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      Total NF-e: {formatBRL(recalculatedTotals?.valorTotalNota)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>

        {/* Painel fiscal completo do documento importado (somente consulta) */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <Button
            buttonType="ghost"
            block
            onClick={() => setFiscalPanelOpen((v) => !v)}
            className="flex items-center justify-between !py-3 text-sm font-bold text-slate-900 dark:text-slate-100 dark:bg-slate-800"
          >
            <span className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBarcode} className="text-blue-600" />
              Detalhes fiscais completos do XML (identificação, participantes, transporte, cobrança e tributos)
            </span>
            <FontAwesomeIcon icon={fiscalPanelOpen ? faChevronUp : faChevronDown} className="text-slate-400" />
          </Button>

          {fiscalPanelOpen && (
            <div className="p-4 pt-0 space-y-2">
              <FiscalGroup title="Identificação" accent="blue">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px]">
                  <ReadField label="Número" value={invoice.numero} mono />
                  <ReadField label="Série" value={invoice.serie} mono />
                  <ReadField label="Modelo" value={invoice.modelo || invoice.ide?.mod || '55'} mono />
                  <ReadField label="Chave de Acesso" value={invoice.chaveAcesso} mono className="col-span-2" />
                  <ReadField label="Emissão" value={invoice.dataEmissao ? formatDateBR(invoice.dataEmissao) : invoice.emissao} />
                  <ReadField label="Saída" value={invoice.dataSaida ? formatDateBR(invoice.dataSaida) : invoice.ide?.dhSaiEnt} />
                  <ReadField label="Natureza da Operação" value={invoice.naturezaOperacao} className="col-span-2" />
                  <ReadField label="Tipo NF (tpNF)" value={invoice.ide?.tpNF} mono />
                  <ReadField label="Destino (idDest)" value={invoice.ide?.idDest} mono />
                  <ReadField label="Finalidade (finNFe)" value={invoice.ide?.finNFe} mono />
                  <ReadField label="Consumidor Final (indFinal)" value={invoice.ide?.indFinal} mono />
                  <ReadField label="Presença (indPres)" value={invoice.ide?.indPres} mono />
                  <ReadField label="Intermediação (indIntermed)" value={invoice.ide?.indIntermed} mono />
                  <ReadField label="Ambiente (tpAmb)" value={invoice.ide?.tpAmb} mono />
                  <ReadField label="Tipo de Emissão (tpEmis)" value={invoice.ide?.tpEmis} mono />
                  <ReadField label="Processo (procEmi)" value={invoice.ide?.procEmi} mono />
                  <ReadField label="Versão Processo" value={invoice.ide?.verProc} mono />
                </div>
              </FiscalGroup>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <FiscalGroup title="Emitente" accent="slate">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                    <ReadField label="CNPJ/CPF" value={invoice.emitente?.cnpj || invoice.emitente?.cpf} mono />
                    <ReadField label="IE" value={invoice.emitente?.inscricaoEstadual} mono />
                    <ReadField label="CRT" value={invoice.emitente?.crt} mono />
                    <ReadField label="Razão Social" value={invoice.emitente?.razaoSocial} className="col-span-2" />
                    <ReadField label="Município" value={invoice.emitente?.municipio} />
                    <ReadField label="Logradouro" value={invoice.emitente?.endereco?.logradouro} className="col-span-2" />
                    <ReadField label="Número" value={invoice.emitente?.endereco?.numero} />
                    <ReadField label="Bairro" value={invoice.emitente?.endereco?.bairro} />
                    <ReadField label="CEP" value={invoice.emitente?.endereco?.cep} mono />
                    <ReadField label="Cód. IBGE" value={invoice.emitente?.endereco?.cMun} mono />
                    <ReadField label="Telefone" value={invoice.emitente?.endereco?.fone} />
                    <ReadField label="E-mail" value={invoice.emitente?.endereco?.email} />
                  </div>
                </FiscalGroup>

                <FiscalGroup title="Destinatário" accent="slate">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                    <ReadField label="Documento" value={invoice.destinatario?.cnpj || invoice.destinatario?.idEstrangeiro} mono />
                    <ReadField label="IE" value={invoice.destinatario?.inscricaoEstadual} mono />
                    <ReadField label="indIEDest" value={invoice.destinatario?.indicadorIeDestinatario} mono />
                    <ReadField label="Nome" value={invoice.destinatario?.nome} className="col-span-2" />
                    <ReadField label="País" value={invoice.destinatario?.pais} />
                    <ReadField label="Logradouro" value={invoice.destinatario?.endereco?.logradouro} className="col-span-2" />
                    <ReadField label="Número" value={invoice.destinatario?.endereco?.numero} />
                    <ReadField label="Bairro" value={invoice.destinatario?.endereco?.bairro} />
                    <ReadField label="CEP" value={invoice.destinatario?.endereco?.cep} mono />
                    <ReadField label="Cód. IBGE" value={invoice.destinatario?.endereco?.cMun} mono />
                    <ReadField label="E-mail" value={invoice.destinatario?.email || invoice.destinatario?.endereco?.email} />
                  </div>
                </FiscalGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <FiscalGroup title="Transporte" accent="blue">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <ReadField label="Modalidade Frete" value={invoice.transporte?.modalidadeFrete} mono />
                    <ReadField label="Transportador" value={invoice.transporte?.transportador?.nome} />
                    <ReadField label="CNPJ Transp." value={invoice.transporte?.transportador?.cnpj} mono />
                    <ReadField label="UF Transp." value={invoice.transporte?.transportador?.uf} mono />
                  </div>
                  {(invoice.transporte?.volumes || []).length > 0 && (
                    <div className="pt-1 space-y-0.5">
                      <span className="text-[9px] font-semibold uppercase text-slate-400">Volumes</span>
                      {(invoice.transporte.volumes || []).map((vol, i) => (
                        <p key={i} className="text-[11px] text-slate-600 dark:text-slate-300">
                          #{i + 1} {vol.qVol || '—'} {vol.esp || ''} — Peso L: {vol.pesoL || '0.000'} / B: {vol.pesoB || '0.000'}
                        </p>
                      ))}
                    </div>
                  )}
                </FiscalGroup>

                <FiscalGroup title="Cobrança" accent="blue">
                  {invoice.cobranca?.fatura ? (
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <ReadField label="Fatura" value={invoice.cobranca.fatura.numero} mono />
                      <ReadField label="Valor Original" value={invoice.cobranca.fatura.valorOriginal ? formatBRL(invoice.cobranca.fatura.valorOriginal) : ''} mono />
                      <ReadField label="Desconto" value={invoice.cobranca.fatura.valorDesconto ? formatBRL(invoice.cobranca.fatura.valorDesconto) : ''} mono />
                      <ReadField label="Líquido" value={invoice.cobranca.fatura.valorLiquido ? formatBRL(invoice.cobranca.fatura.valorLiquido) : ''} mono />
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Sem grupo de cobrança.</p>
                  )}
                  {(invoice.cobranca?.duplicatas || []).length > 0 && (
                    <div className="pt-1 space-y-0.5">
                      <span className="text-[9px] font-semibold uppercase text-slate-400">Duplicatas</span>
                      {invoice.cobranca.duplicatas.map((dup, i) => (
                        <p key={i} className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                          {dup.numero || '—'} • Venc. {dup.vencimento || '—'} • {formatBRL(dup.valor)}
                        </p>
                      ))}
                    </div>
                  )}
                </FiscalGroup>

                <FiscalGroup title="Pagamento" accent="blue">
                  {(invoice.pagamento?.detalhes || []).length > 0 ? (
                    <div className="space-y-0.5">
                      {invoice.pagamento.detalhes.map((pag, i) => (
                        <p key={i} className="text-[11px] text-slate-600 dark:text-slate-300">
                          Forma {pag.tipo || '—'}{pag.descricao ? ` (${pag.descricao})` : ''} • {formatBRL(pag.valor)}
                        </p>
                      ))}
                      {invoice.pagamento.troco && invoice.pagamento.troco !== '0.00' && (
                        <p className="text-[11px] text-slate-500">Troco: {formatBRL(invoice.pagamento.troco)}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Sem grupo de pagamento.</p>
                  )}
                </FiscalGroup>
              </div>

              <FiscalGroup title="Totais e Tributos da Nota" accent="emerald">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px]">
                  <ReadField label="Produtos" value={formatBRL(invoice.totais?.valorProdutos)} mono />
                  <ReadField label="Frete" value={formatBRL(invoice.totais?.valorFrete)} mono />
                  <ReadField label="Seguro" value={formatBRL(invoice.totais?.valorSeguro)} mono />
                  <ReadField label="Desconto" value={formatBRL(invoice.totais?.valorDesconto)} mono />
                  <ReadField label="Outras Despesas" value={formatBRL(invoice.totais?.outrasDespesas)} mono />
                  <ReadField label="IPI" value={formatBRL(invoice.totais?.valorIPI)} mono />
                  <ReadField label="II" value={formatBRL(invoice.totais?.valorII)} mono />
                  <ReadField label="Total Tributos (vTotTrib)" value={formatBRL(invoice.totais?.valorTotTrib)} mono />
                  <ReadField label="Total da Nota" value={formatBRL(invoice.totais?.valorTotalNota)} mono />
                  <ReadField label="Peso Líquido" value={invoice.totais?.pesoLiquido} mono />
                  <ReadField label="Peso Bruto" value={invoice.totais?.pesoBruto} mono />
                  {invoice.totais?.ibsCbs && (
                    <>
                      <ReadField label="Base IBS/CBS" value={formatBRL(invoice.totais.ibsCbs.vBCIBSCBS)} mono />
                      <ReadField label="Total IBS" value={formatBRL(invoice.totais.ibsCbs.vIBS)} mono />
                      <ReadField label="Total CBS" value={formatBRL(invoice.totais.ibsCbs.vCBS)} mono />
                    </>
                  )}
                </div>
              </FiscalGroup>

              {(invoice.protocolo || invoice.assinatura) && (
                <FiscalGroup title="Autorização e Assinatura" accent="slate">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <ReadField label="Protocolo" value={invoice.protocolo?.nProt || invoice.protocolo?.numero} mono />
                    <ReadField label="Status (cStat)" value={invoice.protocolo?.cStat || invoice.protocolo?.status} mono />
                    <ReadField label="Recebido em" value={invoice.protocolo?.dhRecbto ? formatDateBR(invoice.protocolo.dhRecbto) : ''} />
                    <ReadField label="Assinatura presente" value={invoice.assinatura?.presente ? 'Sim' : invoice.assinatura ? 'Não' : '—'} />
                  </div>
                </FiscalGroup>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
