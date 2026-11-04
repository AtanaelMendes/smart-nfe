'use client';

import { useState, useEffect, useMemo, use } from 'react';
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
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import { useAppContext } from '@/context/AppContext';

import { formatBRL } from '@/lib/formatters/currency';
import { formatDateBR } from '@/lib/formatters/dates';
import { getStatusLabel, getStatusColor } from '@/lib/formatters/status';
import { invoiceRepository } from '@/features/invoiceRepository';

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
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
  }, [id]);

  // Edição direta de campo na tabela
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value, modificado: true };

      // Recalcula valor total do item se mudar quantidade ou valor unitário
      if (field === 'quantidade' || field === 'valorUnitario') {
        const q = parseFloat(String(item.quantidade).replace(',', '.')) || 0;
        const u = parseFloat(String(item.valorUnitario).replace(',', '.')) || 0;
        item.valorTotal = (q * u).toFixed(2);
      }

      copy[index] = item;
      return copy;
    });
    setHasChanges(true);
  };

  // Salvar alterações no storage
  const handleSave = async () => {
    try {
      // Recalcula total da nota
      const totalProdutos = items.reduce((acc, curr) => {
        return acc + (parseFloat(String(curr.valorTotal).replace(',', '.')) || 0);
      }, 0);

      const updatedInvoice = {
        ...invoice,
        itens: items,
        totais: {
          ...invoice.totais,
          valorTotalProdutos: totalProdutos.toFixed(2),
          valorTotalNota: totalProdutos.toFixed(2),
        },
      };

      await invoiceRepository.update(id, updatedInvoice);
      setInvoice(updatedInvoice);
      setHasChanges(false);
      toast.success('Alterações salvas com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar.');
    }
  };

  // Marcar nota como conferida
  const handleMarkAsChecked = async () => {
    try {
      const updated = {
        ...invoice,
        status: 'PRONTO_REVISAO',
        itens: items.map((i) => ({ ...i, situacao: 'conferido' })),
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

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (it) =>
        it.codigo?.toLowerCase().includes(term) ||
        it.descricao?.toLowerCase().includes(term) ||
        it.ncm?.toLowerCase().includes(term) ||
        it.cfop?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  // Totais calculados
  const totalGeral = useMemo(() => {
    return items.reduce((acc, curr) => {
      return acc + (parseFloat(String(curr.valorTotal).replace(',', '.')) || 0);
    }, 0);
  }, [items]);

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
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Conferência da NF-e {invoice.numero}
                </h1>
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                  Série {invoice.serie}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(invoice.status).bg} ${getStatusColor(invoice.status).text}`}>
                  {getStatusLabel(invoice.status)}
                </span>
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
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Quantidade de Itens</span>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {items.length} produtos
            </p>
            <span className="text-[10px] text-slate-400">Prontos para edição</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Calculado</span>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {formatBRL(totalGeral)}
            </p>
            {hasChanges && (
              <span className="text-[10px] text-amber-500 font-medium">● Alterações não salvas</span>
            )}
          </div>
        </div>

        {/* Tabela de Produtos Editável */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          {/* Barra de Busca na Tabela */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Produtos da Nota ({filteredItems.length})
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                • Edite as células diretamente na grade
              </span>
            </div>

            <div className="relative w-64">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2.5 top-2 text-slate-400 w-3 h-3" />
              <input
                type="text"
                placeholder="Buscar código, descrição ou NCM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Grid de Edição */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
              <thead className="text-[11px] uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-2 py-2 w-10 text-center">#</th>
                  <th className="px-2 py-2 w-24">Código</th>
                  <th className="px-3 py-2">Descrição da Mercadoria</th>
                  <th className="px-2 py-2 w-24">NCM</th>
                  <th className="px-2 py-2 w-16">CFOP</th>
                  <th className="px-2 py-2 w-16 text-center">Unid.</th>
                  <th className="px-2 py-2 w-24 text-right">Qtd</th>
                  <th className="px-2 py-2 w-28 text-right">Unitário (R$)</th>
                  <th className="px-2 py-2 w-28 text-right">Total (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredItems.map((item, index) => {
                  const isModified = item.modificado;
                  return (
                    <tr
                      key={item.id || index}
                      className={`hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors ${
                        isModified ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="px-2 py-1.5 text-center font-mono text-slate-400">
                        {item.item || index + 1}
                      </td>

                      {/* Código */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={item.codigo || ''}
                          onChange={(e) => handleItemChange(index, 'codigo', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent font-mono focus:bg-white dark:focus:bg-slate-900"
                        />
                      </td>

                      {/* Descrição */}
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={item.descricao || ''}
                          onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </td>

                      {/* NCM */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={item.ncm || ''}
                          onChange={(e) => handleItemChange(index, 'ncm', e.target.value)}
                          className={`w-full px-1.5 py-1 text-xs rounded border font-mono ${
                            !item.ncm || item.ncm.length < 8
                              ? 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
                              : 'border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-slate-900'
                          }`}
                          placeholder="00000000"
                        />
                      </td>

                      {/* CFOP */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={item.cfop || ''}
                          onChange={(e) => handleItemChange(index, 'cfop', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent font-mono text-center focus:bg-white dark:focus:bg-slate-900"
                          placeholder="7101"
                        />
                      </td>

                      {/* Unidade */}
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="text"
                          value={item.unidade || ''}
                          onChange={(e) => handleItemChange(index, 'unidade', e.target.value)}
                          className="w-full px-1 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent text-center uppercase focus:bg-white dark:focus:bg-slate-900"
                        />
                      </td>

                      {/* Quantidade */}
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="text"
                          value={item.quantidade || ''}
                          onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent font-mono text-right focus:bg-white dark:focus:bg-slate-900"
                        />
                      </td>

                      {/* Valor Unitário */}
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="text"
                          value={item.valorUnitario || ''}
                          onChange={(e) => handleItemChange(index, 'valorUnitario', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent font-mono text-right focus:bg-white dark:focus:bg-slate-900"
                        />
                      </td>

                      {/* Total */}
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatBRL(item.valorTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={6} className="px-4 py-2 text-slate-700 dark:text-slate-200">
                    Total dos Produtos ({items.length} itens)
                  </td>
                  <td colSpan={3} className="px-4 py-2 text-right text-sm text-blue-600 dark:text-blue-400">
                    {formatBRL(totalGeral)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
