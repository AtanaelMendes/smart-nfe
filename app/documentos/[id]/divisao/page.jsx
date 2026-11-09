'use client';

import { useState, useEffect, useMemo, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faScissors,
  faArrowLeft,
  faPlus,
  faTrashCan,
  faFloppyDisk,
  faCircleCheck,
  faCircleExclamation,
  faTriangleExclamation,
  faScaleBalanced,
  faBuilding,
  faGlobe,
  faIdCard,
  faBolt,
  faRotateLeft,
  faBoxesStacked,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import { useAppContext } from '@/context/AppContext';

import { formatBRL } from '@/lib/formatters/currency';
import { formatQuantity } from '@/lib/formatters/numbers';
import { invoiceRepository } from '@/features/invoiceRepository';
import { preparedInvoiceRepository } from '@/features/preparedInvoiceRepository';
import {
  validateDivisionBatch,
  calculateRemainingBalance,
  distributeEqually,
  apportionAllInvoiceExpenses,
} from '@/lib/calculations/divisionMath';
import {
  decimalAdd,
  decimalMultiply,
  decimalSubtract,
  decimalCompare,
  cleanDecimalString,
} from '@/lib/calculations/decimal';
import { calculateInvoiceTotals } from '@/lib/calculations/invoiceTotals';

export default function DivisaoNotasPage({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const router = useRouter();
  const { toast } = useAppContext();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Notas de destino configuradas (mínimo 2 notas)
  const [targetNotes, setTargetNotes] = useState([]);

  // Carrega documento original e inicializa as 2 primeiras notas de destino
  const loadInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoiceRepository.findById(id);
      if (data) {
        setInvoice(data);

        // Inicializa 2 notas de destino padrão com dados herdados da NF-e original
        const destNome = data.destinatario?.nome || 'Destinatário Principal';
        const destCnpj = data.destinatario?.cnpj || data.destinatario?.idEstrangeiro || '';
        const destPais = data.destinatario?.pais || 'Exterior';
        const destUf = data.destinatario?.uf || '';

        setTargetNotes([
          {
            id: 'nota-1',
            nome: 'Nota de Destino 1 (Lote Principal)',
            razaoSocial: destNome,
            cnpj: destCnpj,
            uf: destUf,
            pais: destPais,
            itens: {},
          },
          {
            id: 'nota-2',
            nome: 'Nota de Destino 2 (Lote Complementar)',
            razaoSocial: `${destNome} - Unidade Secundária`,
            cnpj: destCnpj,
            uf: destUf,
            pais: destPais,
            itens: {},
          },
        ]);
      } else {
        toast.error('Documento fiscal não encontrado.');
      }
    } catch {
      toast.error('Erro ao carregar documento fiscal.');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // Auditoria e conciliação em tempo real com divisionMath
  const batchResult = useMemo(() => {
    if (!invoice?.itens || targetNotes.length === 0) {
      return {
        isValid: false,
        canSave: false,
        hasExcess: false,
        hasRemaining: true,
        isBalanced: false,
        summary: {
          totalItemsCount: 0,
          destinationNotesCount: 0,
          balancedCount: 0,
          remainingCount: 0,
          excessCount: 0,
        },
        itemReports: [],
        notesSummary: [],
      };
    }

    return validateDivisionBatch(invoice.itens, targetNotes);
  }, [invoice, targetNotes]);

  // Mapa rápido de itemReport por itemId
  const itemReportsMap = useMemo(() => {
    const map = new Map();
    if (batchResult.itemReports) {
      batchResult.itemReports.forEach((rep) => {
        map.set(rep.itemId, rep);
      });
    }
    return map;
  }, [batchResult]);

  // Totais financeiros por nota de destino
  const noteTotals = useMemo(() => {
    const totals = {};
    if (!invoice?.itens) return totals;

    targetNotes.forEach((note) => {
      let sum = '0.00';
      invoice.itens.forEach((it) => {
        const rawQty = note.itens[it.id];
        const qtyStr = cleanDecimalString(rawQty || '0');
        if (decimalCompare(qtyStr, '0') > 0) {
          const itemTotal = decimalMultiply(it.valorUnitario, qtyStr, 2);
          sum = decimalAdd(sum, itemTotal, 2);
        }
      });
      totals[note.id] = sum;
    });

    return totals;
  }, [targetNotes, invoice]);

  // Quantidade de itens alocados por nota
  const noteItemCounts = useMemo(() => {
    const counts = {};
    targetNotes.forEach((note) => {
      let count = 0;
      Object.values(note.itens || {}).forEach((val) => {
        const cleaned = cleanDecimalString(val || '0');
        if (decimalCompare(cleaned, '0') > 0) {
          count++;
        }
      });
      counts[note.id] = count;
    });
    return counts;
  }, [targetNotes]);

  // Modificação de quantidade em uma nota de destino para um item
  const handleQuantityChange = (noteId, itemId, value) => {
    // Permite digitação livre de números, vírgula e ponto
    const sanitized = value.replace(/[^0-9.,]/g, '');
    setTargetNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) return note;
        return {
          ...note,
          itens: {
            ...note.itens,
            [itemId]: sanitized,
          },
        };
      })
    );
  };

  // Atualização dos metadados da nota de destino (Nome, CNPJ, Razão Social, UF/País)
  const handleNoteMetadataChange = (noteId, field, value) => {
    setTargetNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) return note;
        return {
          ...note,
          [field]: value,
        };
      })
    );
  };

  // Adicionar uma nova nota de destino (3ª, 4ª, etc.)
  const handleAddNote = () => {
    const nextIdx = targetNotes.length + 1;
    const destNome = invoice?.destinatario?.nome || 'Destinatário';
    const destPais = invoice?.destinatario?.pais || 'Exterior';
    const destUf = invoice?.destinatario?.uf || '';

    const newNote = {
      id: `nota-${Date.now()}`,
      nome: `Nota de Destino ${nextIdx} (Lote Adicional)`,
      razaoSocial: `${destNome} - Lote ${nextIdx}`,
      cnpj: '',
      uf: destUf,
      pais: destPais,
      itens: {},
    };

    setTargetNotes([...targetNotes, newNote]);
    toast.success(`Nota de Destino ${nextIdx} adicionada.`);
  };

  // Remover nota de destino (garantindo no mínimo 2)
  const handleRemoveNote = (noteId) => {
    if (targetNotes.length <= 2) {
      toast.warning('A divisão exige no mínimo 2 notas de destino.');
      return;
    }
    const noteToRemove = targetNotes.find((n) => n.id === noteId);
    setTargetNotes(targetNotes.filter((n) => n.id !== noteId));
    toast.info(`Nota "${noteToRemove?.nome || 'Removida'}" excluída.`);
  };

  // Limpar alocações de uma nota de destino específica
  const handleClearNoteAllocations = (noteId) => {
    setTargetNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) return note;
        return { ...note, itens: {} };
      })
    );
    toast.info('Alocações da nota limpas.');
  };

  // Alocar o saldo restante de um item diretamente na nota selecionada
  const handleAllocateRemaining = (noteId, item) => {
    const report = itemReportsMap.get(item.id);
    const balance = report ? report.balanceStr : item.quantidade;

    if (decimalCompare(balance, '0') <= 0) {
      toast.info('Este item não possui saldo restante para alocar.');
      return;
    }

    setTargetNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) return note;
        const currentQty = cleanDecimalString(note.itens[item.id] || '0');
        const newQty = decimalAdd(currentQty, balance, 4);
        return {
          ...note,
          itens: {
            ...note.itens,
            [item.id]: newQty,
          },
        };
      })
    );
    toast.success(`Saldo de ${formatQuantity(balance)} alocado na nota.`);
  };

  // Assistente: Dividir saldo deste item igualmente entre todas as notas de destino
  const handleDistributeItemEqually = (item) => {
    const report = itemReportsMap.get(item.id);
    const balance = report ? report.balanceStr : item.quantidade;

    if (decimalCompare(balance, '0') <= 0) {
      toast.info('Este item não possui saldo restante para alocar.');
      return;
    }

    const numNotes = targetNotes.length;
    if (numNotes < 2) {
      toast.warning('A divisão exige no mínimo 2 notas de destino.');
      return;
    }

    const slices = distributeEqually(balance, numNotes, 4);

    setTargetNotes((prev) =>
      prev.map((note, idx) => {
        const current = cleanDecimalString(note.itens[item.id] || '0');
        const newQty = decimalAdd(current, slices[idx] || '0.0000', 4);
        return {
          ...note,
          itens: {
            ...note.itens,
            [item.id]: newQty,
          },
        };
      })
    );

    toast.success(`Saldo de ${formatQuantity(balance)} dividido igualmente entre as ${numNotes} notas.`);
  };

  // Assistente: Distribuir igualmente todas as quantidades entre as notas configuradas com conservação decimal de 100%
  const handleDistributeEqually = () => {
    if (!invoice?.itens || targetNotes.length < 2) return;

    const numNotes = targetNotes.length;
    const updatedNotes = targetNotes.map((note) => ({ ...note, itens: {} }));

    invoice.itens.forEach((it) => {
      const slices = distributeEqually(it.quantidade, numNotes, 4);
      updatedNotes.forEach((note, idx) => {
        note.itens[it.id] = slices[idx] || '0.0000';
      });
    });

    setTargetNotes(updatedNotes);
    toast.success(`Itens distribuídos igualmente entre as ${numNotes} notas.`);
  };

  // Assistente: Distribuir apenas os saldos pendentes de todos os itens igualmente
  const handleDistributeRemainingAll = () => {
    if (!invoice?.itens || targetNotes.length < 2) return;

    const numNotes = targetNotes.length;
    setTargetNotes((prev) => {
      const notesCopy = prev.map((n) => ({ ...n, itens: { ...n.itens } }));

      invoice.itens.forEach((it) => {
        const report = itemReportsMap.get(it.id);
        const balance = report ? report.balanceStr : it.quantidade;

        if (decimalCompare(balance, '0') > 0) {
          const slices = distributeEqually(balance, numNotes, 4);
          notesCopy.forEach((note, idx) => {
            const current = cleanDecimalString(note.itens[it.id] || '0');
            note.itens[it.id] = decimalAdd(current, slices[idx] || '0.0000', 4);
          });
        }
      });

      return notesCopy;
    });

    toast.success(`Saldos restantes distribuídos igualmente entre as ${numNotes} notas.`);
  };

  // Assistente: Alocar 100% dos itens na primeira nota
  const handleAllocateAllToFirst = () => {
    if (!invoice?.itens || targetNotes.length === 0) return;

    setTargetNotes((prev) =>
      prev.map((note, idx) => {
        if (idx === 0) {
          const allItens = {};
          invoice.itens.forEach((it) => {
            allItens[it.id] = cleanDecimalString(it.quantidade);
          });
          return { ...note, itens: allItens };
        }
        return { ...note, itens: {} };
      })
    );
    toast.info('100% das quantidades alocadas na Nota de Destino 1.');
  };

  // Assistente: Limpar todas as alocações da grade
  const handleClearAll = () => {
    setTargetNotes((prev) => prev.map((note) => ({ ...note, itens: {} })));
    toast.info('Todas as alocações foram zeradas.');
  };

  // Finalizar a divisão e gerar as notas preparadas
  // Requisito: Bloqueia estritamente se houver excesso OU saldo restante pendente!
  const canFinalize = useMemo(() => {
    if (!invoice?.itens || targetNotes.length < 2) return false;
    return Boolean(batchResult.canSave);
  }, [invoice, targetNotes, batchResult]);

  const handleFinalizeDivision = async () => {
    if (!canFinalize) {
      if (batchResult.hasExcess) {
        toast.error('Bloqueio: existem itens com quantidade alocada em excesso.');
      } else if (batchResult.hasRemaining) {
        toast.warning('Atenção: 100% dos itens devem ser distribuídos antes de finalizar.');
      } else if (targetNotes.length < 2) {
        toast.warning('É necessário manter no mínimo 2 notas de destino para realizar a divisão.');
      }
      return;
    }

    try {
      setIsSaving(true);

      // 1. Mapeia itens alocados para cada nota de destino
      const preparedNotesData = [];
      for (let i = 0; i < targetNotes.length; i++) {
        const note = targetNotes[i];
        const distributedItems = invoice.itens
          .map((origItem, itemIdx) => {
            const raw = note.itens[origItem.id] || '0';
            const qtyStr = cleanDecimalString(raw);
            if (decimalCompare(qtyStr, '0') <= 0) return null;

            const lineTotal = decimalMultiply(origItem.valorUnitario, qtyStr, 2);
            return {
              ...origItem,
              item: itemIdx + 1,
              quantidade: qtyStr,
              valorTotal: lineTotal,
            };
          })
          .filter(Boolean);

        if (distributedItems.length > 0) {
          const productTotal = distributedItems.reduce(
            (acc, it) => decimalAdd(acc, it.valorTotal, 2),
            '0.00'
          );
          preparedNotesData.push({
            note,
            index: i,
            distributedItems,
            productTotal,
          });
        }
      }

      if (preparedNotesData.length === 0) {
        toast.error('Nenhum item alocado para as notas de destino.');
        return;
      }

      // 2. Executa o rateio proporcional de despesas acessórias da NF de origem
      const activeNotesForExpenses = preparedNotesData.map((p) => ({
        id: p.note.id,
        productTotal: p.productTotal,
      }));
      const expensesByNote = apportionAllInvoiceExpenses(
        invoice.totais || {},
        activeNotesForExpenses
      );

      // 3. Cria cada nota preparada com totais reconciliados
      let createdCount = 0;
      for (let pIdx = 0; pIdx < preparedNotesData.length; pIdx++) {
        const { note, index, distributedItems } = preparedNotesData[pIdx];
        const suffix = String.fromCharCode(65 + index);
        const exp = expensesByNote[note.id] || {
          valorProdutos: noteTotals[note.id] || '0.00',
          valorFrete: '0.00',
          valorSeguro: '0.00',
          outrasDespesas: '0.00',
          valorDesconto: '0.00',
        };

        // Calcula totais completos com fórmula oficial SEFAZ
        const noteTotais = calculateInvoiceTotals(
          distributedItems,
          {
            discount: exp.valorDesconto,
            freight: exp.valorFrete,
            insurance: exp.valorSeguro,
            otherExpenses: exp.outrasDespesas,
          }
        );

        await preparedInvoiceRepository.create({
          parentInvoiceId: invoice.id,
          documentoOrigemId: invoice.id,
          origemNumero: invoice.numero,
          numeroOrigem: invoice.numero,
          numero: `${invoice.numero}-${suffix}`,
          serie: invoice.serie || '1',
          nomePreparacao: note.nome || `Nota Destino ${suffix}`,
          descricaoLote: `${note.nome} — Destino: ${note.razaoSocial || 'Exterior'}`,
          emitente: invoice.emitente,
          destinatario: {
            nome: note.razaoSocial || invoice.destinatario?.nome || 'Destinatário',
            cnpj: note.cnpj || invoice.destinatario?.cnpj || invoice.destinatario?.idEstrangeiro || '',
            uf: note.uf || invoice.destinatario?.uf || '',
            pais: note.pais || invoice.destinatario?.pais || 'Exterior',
            paisCodigo: invoice.destinatario?.paisCodigo || '',
          },
          itens: distributedItems,
          quantidadeItens: distributedItems.length,
          valorProdutos: noteTotais.valorProdutos,
          valorFrete: noteTotais.valorFrete,
          valorSeguro: noteTotais.valorSeguro,
          outrasDespesas: noteTotais.outrasDespesas,
          valorDesconto: noteTotais.valorDesconto,
          valorTotal: noteTotais.valorTotalNota,
          valorTotalNota: noteTotais.valorTotalNota,
          totais: noteTotais,
          status: 'preparado',
          dataCriacao: new Date().toISOString(),
        });
        createdCount++;
      }

      // 4. Marca status da nota pai como 'dividida'
      await invoiceRepository.update(invoice.id, { status: 'dividida' });

      toast.success(
        `Divisão concluída com sucesso! ${createdCount} notas preparadas foram geradas.`
      );
      router.push('/notas-preparadas');
    } catch {
      toast.error('Erro ao finalizar a divisão de notas.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Divisão' }]}>
        <div className="p-12 text-center text-slate-500">
          <FontAwesomeIcon icon={faScissors} className="w-8 h-8 text-amber-500 animate-pulse mb-3" />
          <p className="text-sm font-semibold">Carregando dados da divisão...</p>
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Divisão' }]}>
        <div className="p-8 text-center text-slate-500">
          <p className="text-base font-semibold text-red-600 mb-2">Documento não encontrado</p>
          <Link href="/documentos" className="text-sm text-blue-600 hover:underline">
            Voltar para lista de documentos
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documentos', href: '/documentos' },
        { label: `NF-e ${invoice.numero}`, href: `/documentos/${id}/conferencia` },
        { label: 'Divisão de Notas' },
      ]}
    >
      <div className="space-y-4">
        {/* Top Header Card */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
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
                <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Desmembramento de Exportação
                </span>
                {invoice.status === 'dividida' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    Status: Dividida
                  </span>
                )}
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-1">
                <FontAwesomeIcon icon={faScissors} className="text-amber-500" />
                Divisão e Desmembramento da NF-e {invoice.numero}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Distribua as quantidades entre duas ou mais notas preparadas para atender limites aduaneiros, lotes e contêineres de exportação.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              buttonType="secondary"
              size="small"
              outline
              onClick={handleAddNote}
              title="Adicionar outra nota de destino"
            >
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Adicionar Nota de Destino
            </Button>

            <Button
              buttonType="primary"
              size="small"
              onClick={handleFinalizeDivision}
              disabled={!canFinalize || isSaving}
              title={
                canFinalize
                  ? 'Salvar a divisão e gerar as notas preparadas'
                  : 'Para finalizar, todos os itens devem estar 100% distribuídos sem sobras ou excessos'
              }
            >
              <FontAwesomeIcon icon={faFloppyDisk} className="w-3.5 h-3.5 mr-1" />
              {isSaving ? 'Gerando Notas...' : 'Finalizar Divisão / Gerar Notas Preparadas'}
            </Button>
          </div>
        </div>

        {/* Banner de Auditoria e Validação dos Saldos */}
        <div
          className={`p-3.5 rounded-lg border flex items-start gap-3 transition-colors ${
            canFinalize
              ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
              : batchResult.hasExcess
              ? 'bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-800'
              : 'bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800'
          }`}
        >
          <div className="mt-0.5 flex-shrink-0">
            <FontAwesomeIcon
              icon={
                canFinalize
                  ? faCircleCheck
                  : batchResult.hasExcess
                  ? faCircleExclamation
                  : faTriangleExclamation
              }
              className={`w-5 h-5 ${
                canFinalize
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : batchResult.hasExcess
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {canFinalize
                  ? 'Conciliação Concluída — 100% dos Itens Distribuídos'
                  : batchResult.hasExcess
                  ? 'Bloqueio Fiscal: Excesso de Quantidade Alocada'
                  : 'Divisão Pendente: Saldo Não Alocado'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {batchResult.summary.balancedCount} de {batchResult.summary.totalItemsCount} produtos 100% conciliados
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
              {canFinalize
                ? 'Todas as quantidades da nota original foram perfeitamente distribuídas entre os destinos configurados. Você já pode finalizar a operação.'
                : batchResult.hasExcess
                ? 'Existem itens com quantidades totais alocadas superiores ao saldo disponível na nota fiscal de origem. Corrija os campos com excesso para prosseguir.'
                : 'Para finalizar a divisão de exportação, 100% da quantidade de cada produto deve ser alocada sem sobras nem excessos.'}
            </p>
          </div>
        </div>

        {/* KPIs Resumo da Nota de Origem e Divisão */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">NF-e Original</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
              {invoice.numero}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Valor Total: {formatBRL(invoice.totais?.valorTotalNota || 0)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Itens Conciliados (OK)</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {batchResult.summary.balancedCount} de {batchResult.summary.totalItemsCount}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {batchResult.summary.balancedCount === batchResult.summary.totalItemsCount ? '100% OK' : 'Parcial'}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Com Saldo Restante</span>
            <span className={`text-sm font-bold ${batchResult.summary.remainingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600'}`}>
              {batchResult.summary.remainingCount} {batchResult.summary.remainingCount === 1 ? 'item' : 'itens'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Pendente de alocação
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Com Excesso (Impeditivo)</span>
            <span className={`text-sm font-bold ${batchResult.summary.excessCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600'}`}>
              {batchResult.summary.excessCount} {batchResult.summary.excessCount === 1 ? 'item' : 'itens'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {batchResult.summary.excessCount > 0 ? 'Bloqueante' : 'Zero excesso'}
            </span>
          </div>
        </div>

        {/* Configuração das Notas de Destino (2 ou mais) */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBuilding} className="text-blue-500 text-sm" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Definição das Notas Fiscais de Destino ({targetNotes.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              Personalize CNPJ, Razão Social e UF/País de cada lote de exportação
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {targetNotes.map((note, index) => {
              const count = noteItemCounts[note.id] || 0;
              const total = noteTotals[note.id] || '0.00';
              const suffix = String.fromCharCode(65 + index);

              return (
                <div
                  key={note.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 relative space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                        {suffix}
                      </span>
                      <input
                        type="text"
                        value={note.nome}
                        onChange={(e) => handleNoteMetadataChange(note.id, 'nome', e.target.value)}
                        placeholder="Nome da Nota Destino"
                        className="font-bold text-xs text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
                      />
                    </div>

                    {targetNotes.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveNote(note.id)}
                        className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                        title="Remover esta nota de destino"
                      >
                        <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Campos de Destinatário: Razão Social, CNPJ, UF/País */}
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-semibold block">
                        Razão Social / Destinatário
                      </label>
                      <input
                        type="text"
                        value={note.razaoSocial}
                        onChange={(e) =>
                          handleNoteMetadataChange(note.id, 'razaoSocial', e.target.value)
                        }
                        placeholder="Nome da empresa destinatária"
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase text-slate-500 font-semibold block">
                          CNPJ / Tax ID
                        </label>
                        <input
                          type="text"
                          value={note.cnpj}
                          onChange={(e) =>
                            handleNoteMetadataChange(note.id, 'cnpj', e.target.value)
                          }
                          placeholder="CNPJ ou ID Estrangeiro"
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-slate-500 font-semibold block">
                          UF / País
                        </label>
                        <input
                          type="text"
                          value={note.uf ? `${note.uf} / ${note.pais}` : note.pais}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.includes('/')) {
                              const parts = val.split('/');
                              handleNoteMetadataChange(note.id, 'uf', parts[0].trim());
                              handleNoteMetadataChange(note.id, 'pais', parts[1].trim());
                            } else {
                              handleNoteMetadataChange(note.id, 'pais', val.trim());
                            }
                          }}
                          placeholder="Ex: SP / Brasil ou Holanda"
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resumo Financeiro da Nota */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">
                      {count} {count === 1 ? 'produto alocado' : 'produtos alocados'}
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {formatBRL(total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Barra de Ferramentas de Alocação Rápida */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <FontAwesomeIcon icon={faBolt} className="text-amber-500" />
            Ações Rápidas de Alocação:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleDistributeEqually}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              title="Distribuir 100% das quantidades em partes iguais entre as notas"
            >
              Distribuir Igualmente ({targetNotes.length} Notas)
            </button>
            {batchResult.hasRemaining && (
              <button
                type="button"
                onClick={handleDistributeRemainingAll}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
                title="Distribuir apenas o saldo pendente de cada item igualmente"
              >
                Dividir Saldos Restantes ({targetNotes.length} Notas)
              </button>
            )}
            <button
              type="button"
              onClick={handleAllocateAllToFirst}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              Alocar 100% na Nota 1
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-600 transition-colors"
            >
              Limpar Alocações
            </button>
          </div>
        </div>

        {/* Grade Principal de Itens e Distribuição de Quantidades */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FontAwesomeIcon icon={faScaleBalanced} className="text-blue-500" />
              Grade de Distribuição por Produto
            </span>
            <span className="text-[11px] text-slate-500">
              Digite a quantidade destinada a cada nota. Status em tempo real: OK (verde), Restante (amarelo), Excesso (vermelho).
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300 border-collapse">
              <thead className="text-[11px] uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-3 py-2 w-10 text-center">#</th>
                  <th className="px-3 py-2 min-w-[220px]">Produto / NCM</th>
                  <th className="px-3 py-2 w-16 text-center">Unid</th>
                  <th className="px-3 py-2 w-24 text-right">Unitário</th>
                  <th className="px-3 py-2 w-24 text-right font-bold text-slate-900 dark:text-slate-100">
                    Qtd Original
                  </th>
                  {targetNotes.map((note, idx) => (
                    <th
                      key={note.id}
                      className="px-3 py-2 min-w-[130px] text-center bg-blue-50/60 dark:bg-blue-900/20 border-l border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-blue-900 dark:text-blue-200 truncate max-w-[120px]">
                          {note.nome}
                        </span>
                        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-mono">
                          {formatBRL(noteTotals[note.id] || 0)}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2 w-24 text-right border-l border-slate-200 dark:border-slate-700">
                    Total Alocado
                  </th>
                  <th className="px-3 py-2 w-24 text-right">Saldo Restante</th>
                  <th className="px-3 py-2 w-36 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {invoice.itens?.map((it, idx) => {
                  const report = itemReportsMap.get(it.id) || {
                    status: 'remaining',
                    balanceStr: it.quantidade,
                    totalAllocated: '0',
                  };

                  const isOk = report.status === 'ok';
                  const isRemaining = report.status === 'remaining';
                  const isExcess = report.status === 'excess';

                  return (
                    <tr
                      key={it.id || idx}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                        isExcess ? 'bg-red-50/30 dark:bg-red-950/20' : ''
                      }`}
                    >
                      {/* Sequencial # */}
                      <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>

                      {/* Descrição e Códigos */}
                      <td className="px-3 py-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate max-w-[260px]">
                          {it.descricao}
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          <span>Cód: {it.codigo}</span>
                          <span>•</span>
                          <span>NCM: {it.ncm}</span>
                        </div>
                      </td>

                      {/* Unidade */}
                      <td className="px-3 py-2 text-center font-mono uppercase text-slate-500">
                        {it.unidade}
                      </td>

                      {/* Valor Unitário */}
                      <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatBRL(it.valorUnitario)}
                      </td>

                      {/* Quantidade Original */}
                      <td className="px-3 py-2 text-right font-bold font-mono text-slate-900 dark:text-slate-100">
                        {formatQuantity(it.quantidade)}
                      </td>

                      {/* Inputs das Notas de Destino */}
                      {targetNotes.map((note) => {
                        const cellVal = note.itens[it.id] || '';
                        return (
                          <td
                            key={note.id}
                            className="px-2 py-1.5 text-center bg-blue-50/20 dark:bg-blue-900/10 border-l border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="text"
                                placeholder="0"
                                value={cellVal}
                                onChange={(e) =>
                                  handleQuantityChange(note.id, it.id, e.target.value)
                                }
                                className={`w-20 px-2 py-1 text-xs text-right font-mono rounded border transition-colors ${
                                  isExcess
                                    ? 'border-red-400 dark:border-red-600 focus:border-red-500'
                                    : 'border-slate-300 dark:border-slate-600 focus:border-blue-500'
                                } bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none`}
                              />
                              {isRemaining && (
                                <button
                                  type="button"
                                  onClick={() => handleAllocateRemaining(note.id, it)}
                                  title={`Distribuir 100% do saldo restante (${formatQuantity(report.balanceStr)}) para ${note.nome}`}
                                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:hover:bg-amber-800 dark:text-amber-200 transition-colors"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Total Alocado */}
                      <td className="px-3 py-2 text-right font-mono border-l border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        {formatQuantity(report.totalAllocated)}
                      </td>

                      {/* Saldo Restante */}
                      <td className="px-3 py-2 text-right font-mono font-bold">
                        <div className="flex items-center justify-end gap-1.5">
                          <span
                            className={
                              isExcess
                                ? 'text-red-600 dark:text-red-400'
                                : isOk
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }
                          >
                            {formatQuantity(report.balanceStr)}
                          </span>
                          {isRemaining && (
                            <button
                              type="button"
                              onClick={() => handleDistributeItemEqually(it)}
                              title={`Dividir saldo deste item (${formatQuantity(report.balanceStr)}) igualmente entre as ${targetNotes.length} notas`}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:hover:bg-amber-800 dark:text-amber-200 inline-flex items-center gap-1 transition-colors"
                            >
                              <FontAwesomeIcon icon={faScaleBalanced} className="w-2.5 h-2.5" />
                              <span>÷ Dividir</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status Badges: OK verde (100%), Restante amarelo, Excesso vermelho */}
                      <td className="px-3 py-2 text-center">
                        {isOk && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <FontAwesomeIcon icon={faCircleCheck} className="w-2.5 h-2.5" />
                            OK (100%)
                          </span>
                        )}
                        {isRemaining && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="w-2.5 h-2.5" />
                            Restante
                          </span>
                        )}
                        {isExcess && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-300 dark:border-red-800">
                            <FontAwesomeIcon icon={faCircleExclamation} className="w-2.5 h-2.5" />
                            Excesso
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé da Grade com Ação de Finalização */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 space-y-0.5">
              <div>
                Total de Linhas: <strong className="text-slate-800 dark:text-slate-200">{invoice.itens?.length || 0}</strong> produtos • Destinos:{' '}
                <strong className="text-slate-800 dark:text-slate-200">{targetNotes.length}</strong> notas
              </div>
              <div>
                {!canFinalize && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    * É necessário conciliar 100% dos saldos e manter zero excessos para poder finalizar a divisão.
                  </span>
                )}
              </div>
            </div>

            <Button
              buttonType="primary"
              onClick={handleFinalizeDivision}
              disabled={!canFinalize || isSaving}
              title={
                canFinalize
                  ? 'Salvar a divisão e gerar as notas preparadas'
                  : 'Para finalizar, todos os itens devem estar 100% distribuídos sem sobras ou excessos'
              }
            >
              <FontAwesomeIcon icon={faFloppyDisk} className="w-3.5 h-3.5 mr-1" />
              {isSaving ? 'Gerando Notas...' : 'Finalizar Divisão / Gerar Notas Preparadas'}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
