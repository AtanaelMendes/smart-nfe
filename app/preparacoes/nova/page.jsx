'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import Dialog from '@/components/Layouts/Dialog';
import preparationRepository, { isRealPreparation } from '@/features/preparationRepository';
import invoiceRepository from '@/features/invoiceRepository';
import { formatBRL } from '@/lib/formatters/currency';
import { formatDateBR } from '@/lib/formatters/dates';
import { useAppContext } from '@/context/AppContext';

// ─── Clientes de exportação mockados ────────────────────────────────────────
const EXPORT_CUSTOMERS = [
  { id: 'cust-001', name: 'Global Trading Corporation', country: 'Estados Unidos', foreignId: 'US-12345' },
  { id: 'cust-002', name: 'Asian Grain Corporation', country: 'China', foreignId: 'CN-98765' },
  { id: 'cust-003', name: 'Industrial Supply Corp.', country: 'Estados Unidos', foreignId: 'US-TX-9874125' },
  { id: 'cust-004', name: 'Global Trading Logistics B.V.', country: 'Holanda', foreignId: 'NL884920192B01' },
  { id: 'cust-005', name: 'Auto Assembly Europe GmbH', country: 'Alemanha', foreignId: 'DE-HH-20200' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _idCounter = 0;
function genId() {
  return `local-${Date.now()}-${++_idCounter}`;
}

function determineTipo(origens) {
  if (!origens || origens.length === 0) return 'mista';
  if (origens.length === 1) return 'divisao';
  return 'agrupamento';
}

function getSaldoDisponivel(invoiceId, itemId, destId, preparation, activeAllocations) {
  let original = 0;
  for (const inv of preparation.origens) {
    if (inv.id === invoiceId) {
      for (const it of (inv.itens || [])) {
        if (String(it.id) === String(itemId)) {
          original = parseFloat(it.quantidade || 0);
          break;
        }
      }
      break;
    }
  }
  const jaAlocado = parseFloat(activeAllocations.get(`${invoiceId}__${itemId}`) || 0);
  let alocadoNestaPrep = 0;
  for (const [key, qty] of Object.entries(preparation.alocacoes)) {
    const parts = key.split('__');
    if (parts[0] === invoiceId && parts[1] === String(itemId) && parts[2] !== destId) {
      alocadoNestaPrep += parseFloat(qty || 0);
    }
  }
  return Math.max(0, original - jaAlocado - alocadoNestaPrep).toFixed(4);
}

function getAlocadoNestaPrep(invoiceId, itemId, alocacoes) {
  let total = 0;
  for (const [key, qty] of Object.entries(alocacoes)) {
    const parts = key.split('__');
    if (parts[0] === invoiceId && parts[1] === String(itemId)) {
      total += parseFloat(qty || 0);
    }
  }
  return total;
}

function calcDestTotal(destId, preparation) {
  let total = 0;
  for (const [key, qty] of Object.entries(preparation.alocacoes)) {
    const parts = key.split('__');
    if (parts[2] === destId) {
      const invoiceId = parts[0];
      const itemId = parts[1];
      for (const inv of preparation.origens) {
        if (inv.id === invoiceId) {
          for (const it of (inv.itens || [])) {
            if (String(it.id) === itemId) {
              const precoSaida = parseFloat(preparation._precosSaida?.[`${invoiceId}__${itemId}__${destId}`] || it.valorUnitario || 0);
              total += parseFloat(qty || 0) * precoSaida;
            }
          }
        }
      }
    }
  }
  return total;
}

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'origens', label: 'Origens' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'destinos', label: 'Destinos' },
  { id: 'alocacao', label: 'Alocação' },
  { id: 'revisao', label: 'Revisão' },
];

const STEP_IDS = STEPS.map(s => s.id);

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children, cls }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

// ─── Step: Origens ────────────────────────────────────────────────────────────
function StepOrigens({ preparation, setPreparation, availableInvoices }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const sourceIds = new Set(preparation.origens.map(o => o.id));

  const filtered = availableInvoices.filter(inv => {
    if (sourceIds.has(inv.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (inv.numero || '').toLowerCase().includes(q) ||
      (inv.emitente?.razaoSocial || '').toLowerCase().includes(q) ||
      (inv.chaveAcesso || '').toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelected = () => {
    const toAdd = availableInvoices.filter(inv => selected.has(inv.id));
    setPreparation(prev => {
      const newOrigens = [...prev.origens, ...toAdd];
      return {
        ...prev,
        origens: newOrigens,
        tipo: determineTipo(newOrigens),
      };
    });
    setSelected(new Set());
  };

  const removeOrigem = (invId) => {
    setPreparation(prev => {
      const newOrigens = prev.origens.filter(o => o.id !== invId);
      // Remove alocações desta origem
      const newAlocacoes = {};
      for (const [key, val] of Object.entries(prev.alocacoes)) {
        if (!key.startsWith(invId + '__')) newAlocacoes[key] = val;
      }
      return {
        ...prev,
        origens: newOrigens,
        alocacoes: newAlocacoes,
        tipo: determineTipo(newOrigens),
      };
    });
  };

  const calcInvoiceTotal = (inv) => {
    return parseFloat(inv.totais?.valorTotalNota || inv.totais?.valorProdutos || 0);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Notas de Origem</h2>

      {/* Origens selecionadas */}
      {preparation.origens.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Selecionadas ({preparation.origens.length})</p>
          {preparation.origens.map(inv => (
            <div key={inv.id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-2.5 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">{inv.numero}</span>
                  {inv.status !== 'em_conferencia' && inv.status !== 'conferido' && (
                    <Badge cls="bg-amber-100 text-amber-800">Não conferida</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {inv.emitente?.razaoSocial} · {formatDateBR(inv.emissao || inv.dataEmissao)} · {(inv.itens || []).length} iten(s)
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatBRL(calcInvoiceTotal(inv))}</p>
              </div>
              <button
                type="button"
                onClick={() => removeOrigem(inv.id)}
                className="ml-2 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Remover"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Busca */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Adicionar notas</p>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por número, emitente ou chave..."
          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Resultados */}
        <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Nenhuma nota disponível</p>
          ) : (
            filtered.map(inv => (
              <label key={inv.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                <input
                  type="checkbox"
                  checked={selected.has(inv.id)}
                  onChange={() => toggleSelect(inv.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-200">{inv.numero}</span>
                    {inv.status !== 'em_conferencia' && inv.status !== 'conferido' && (
                      <Badge cls="bg-amber-100 text-amber-800">Não conferida</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {inv.emitente?.razaoSocial} · {formatDateBR(inv.emissao || inv.dataEmissao)} · {(inv.itens || []).length} iten(s)
                  </p>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300 font-mono flex-shrink-0">
                  {formatBRL(parseFloat(inv.totais?.valorTotalNota || inv.totais?.valorProdutos || 0))}
                </span>
              </label>
            ))
          )}
        </div>

        {selected.size > 0 && (
          <Button buttonType="primary" size="small" onClick={addSelected}>
            Adicionar {selected.size} nota(s) selecionada(s)
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Step: Cliente ────────────────────────────────────────────────────────────
function StepCliente({ preparation, setPreparation }) {
  const [editing, setEditing] = useState(!preparation.clienteExportacao);

  const handleSelectCustomer = (cust) => {
    setPreparation(prev => ({ ...prev, clienteExportacao: cust }));
    setEditing(false);
  };

  const handleClear = () => {
    setPreparation(prev => ({ ...prev, clienteExportacao: null }));
    setEditing(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Cliente de Exportação</h2>

      {!editing && preparation.clienteExportacao ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-base">{preparation.clienteExportacao.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{preparation.clienteExportacao.country}</p>
              <p className="text-xs text-slate-400 mt-1">ID Estrangeiro: <span className="font-mono">{preparation.clienteExportacao.foreignId}</span></p>
            </div>
            <Button buttonType="secondary" size="small" outline onClick={() => setEditing(true)}>
              Alterar cliente
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Sem cliente</p>
                <p className="text-xs text-slate-400">Definir depois</p>
              </div>
            </button>

            {EXPORT_CUSTOMERS.map(cust => (
              <button
                key={cust.id}
                type="button"
                onClick={() => handleSelectCustomer(cust)}
                className={`flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-colors cursor-pointer ${
                  preparation.clienteExportacao?.id === cust.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 text-blue-700 dark:text-blue-300 font-bold text-sm">
                  {cust.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{cust.name}</p>
                  <p className="text-xs text-slate-400">{cust.country} · {cust.foreignId}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step: Destinos ───────────────────────────────────────────────────────────
function StepDestinos({ preparation, setPreparation }) {
  const addDestino = () => {
    const n = preparation.destinos.length + 1;
    setPreparation(prev => ({
      ...prev,
      destinos: [...prev.destinos, { id: genId(), nome: `Exportação ${n}`, allocations: {} }],
    }));
  };

  const removeDestino = (destId) => {
    // Check se tem alocações
    const hasAlloc = Object.keys(preparation.alocacoes).some(k => k.endsWith(`__${destId}`));
    if (hasAlloc) {
      if (!confirm('Este destino possui alocações. Deseja removê-lo e apagar as alocações?')) return;
    }
    setPreparation(prev => {
      const newAlocacoes = {};
      for (const [k, v] of Object.entries(prev.alocacoes)) {
        if (!k.endsWith(`__${destId}`)) newAlocacoes[k] = v;
      }
      return {
        ...prev,
        destinos: prev.destinos.filter(d => d.id !== destId),
        alocacoes: newAlocacoes,
      };
    });
  };

  const updateDestNome = (destId, nome) => {
    setPreparation(prev => ({
      ...prev,
      destinos: prev.destinos.map(d => d.id === destId ? { ...d, nome } : d),
    }));
  };

  const countAlocados = (destId) => {
    return Object.entries(preparation.alocacoes)
      .filter(([k]) => k.endsWith(`__${destId}`))
      .length;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Notas de Destino</h2>

      <div className="space-y-3">
        {preparation.destinos.map((dest, idx) => {
          const count = countAlocados(dest.id);
          const total = calcDestTotal(dest.id, preparation);
          return (
            <div key={dest.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <input
                  type="text"
                  value={dest.nome}
                  onChange={e => updateDestNome(dest.id, e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Destino ${idx + 1}`}
                />
                <p className="text-xs text-slate-400">
                  {count} iten(s) alocado(s){total > 0 ? ` · ${formatBRL(total)}` : ''}
                </p>
              </div>
              {preparation.destinos.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDestino(dest.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                  title="Remover destino"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Button buttonType="secondary" size="small" outline onClick={addDestino}>
        + Adicionar destino
      </Button>

      {/* Observações */}
      <div className="space-y-1 pt-2">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Observações gerais</label>
        <textarea
          value={preparation.observacoes || ''}
          onChange={e => setPreparation(prev => ({ ...prev, observacoes: e.target.value }))}
          rows={3}
          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          placeholder="Observações opcionais sobre esta preparação..."
        />
      </div>
    </div>
  );
}

// ─── Step: Alocação ───────────────────────────────────────────────────────────
function StepAlocacao({ preparation, setPreparation, activeAllocations }) {
  const [filterOrigem, setFilterOrigem] = useState('');

  const origens = preparation.origens;
  const destinos = preparation.destinos;

  // Flatten items das origens filtradas
  const rows = [];
  for (const inv of origens) {
    if (filterOrigem && inv.id !== filterOrigem) continue;
    for (const it of (inv.itens || [])) {
      rows.push({ inv, it });
    }
  }

  const getAlocKey = (invoiceId, itemId, destId) => `${invoiceId}__${itemId}__${destId}`;

  const getQty = (invoiceId, itemId, destId) => {
    return preparation.alocacoes[getAlocKey(invoiceId, itemId, destId)] || '';
  };

  const setQty = (invoiceId, itemId, destId, value) => {
    const key = getAlocKey(invoiceId, itemId, destId);
    setPreparation(prev => {
      const newAlocacoes = { ...prev.alocacoes };
      if (value === '' || value === '0' || parseFloat(value) === 0) {
        delete newAlocacoes[key];
      } else {
        newAlocacoes[key] = value;
      }
      return { ...prev, alocacoes: newAlocacoes };
    });
  };

  const alocaTudoPrimeiroDestino = (invoiceId, itemId) => {
    if (destinos.length === 0) return;
    const destId = destinos[0].id;
    const saldo = getSaldoDisponivel(invoiceId, itemId, destId, preparation, activeAllocations);
    if (parseFloat(saldo) > 0) setQty(invoiceId, itemId, destId, saldo);
  };

  const alocaTudoParaDestino = (destId) => {
    setPreparation(prev => {
      const newAlocacoes = { ...prev.alocacoes };
      for (const inv of prev.origens) {
        for (const it of (inv.itens || [])) {
          const saldo = getSaldoDisponivel(inv.id, it.id, destId, prev, activeAllocations);
          if (parseFloat(saldo) > 0) {
            newAlocacoes[getAlocKey(inv.id, it.id, destId)] = saldo;
          }
        }
      }
      return { ...prev, alocacoes: newAlocacoes };
    });
  };

  const limparDestino = (destId) => {
    setPreparation(prev => {
      const newAlocacoes = {};
      for (const [k, v] of Object.entries(prev.alocacoes)) {
        if (!k.endsWith(`__${destId}`)) newAlocacoes[k] = v;
      }
      return { ...prev, alocacoes: newAlocacoes };
    });
  };

  const getItemStatus = (invoiceId, itemId) => {
    const original = (() => {
      for (const inv of origens) {
        if (inv.id === invoiceId) {
          for (const it of (inv.itens || [])) {
            if (String(it.id) === String(itemId)) return parseFloat(it.quantidade || 0);
          }
        }
      }
      return 0;
    })();
    const jaAlocado = parseFloat(activeAllocations.get(`${invoiceId}__${itemId}`) || 0);
    const alocadoNesta = getAlocadoNestaPrep(invoiceId, itemId, preparation.alocacoes);
    const total = jaAlocado + alocadoNesta;
    if (total <= 0) return { label: 'Não alocado', cls: 'bg-gray-100 text-gray-500' };
    if (total > original + 0.0001) return { label: 'Excesso', cls: 'bg-red-100 text-red-700' };
    if (Math.abs(total - original) < 0.0001) return { label: 'OK', cls: 'bg-green-100 text-green-700' };
    return { label: 'Parcial', cls: 'bg-amber-100 text-amber-700' };
  };

  if (origens.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p>Nenhuma nota de origem selecionada.</p>
        <p className="text-sm mt-1">Volte ao passo "Origens" para adicionar notas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Alocar Produtos</h2>
        {origens.length > 1 && (
          <select
            value={filterOrigem}
            onChange={e => setFilterOrigem(e.target.value)}
            className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as origens</option>
            {origens.map(inv => (
              <option key={inv.id} value={inv.id}>{inv.numero} — {inv.emitente?.razaoSocial}</option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-slate-700/60 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 text-left text-slate-500 font-medium whitespace-nowrap">Origem</th>
              <th className="px-2 py-2 text-center text-slate-500 font-medium">Nº</th>
              <th className="px-2 py-2 text-left text-slate-500 font-medium">Código</th>
              <th className="px-2 py-2 text-left text-slate-500 font-medium max-w-[160px]">Descrição</th>
              <th className="px-2 py-2 text-left text-slate-500 font-medium">NCM</th>
              <th className="px-2 py-2 text-center text-slate-500 font-medium">Un</th>
              <th className="px-2 py-2 text-right text-slate-500 font-medium">Qtd. Orig.</th>
              <th className="px-2 py-2 text-right text-slate-500 font-medium whitespace-nowrap">Já Aloc.</th>
              <th className="px-2 py-2 text-right text-slate-500 font-medium">Saldo</th>
              {destinos.map(dest => (
                <th key={dest.id} className="px-2 py-2 text-center text-slate-500 font-medium min-w-[110px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="truncate max-w-[100px]" title={dest.nome}>{dest.nome}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => alocaTudoParaDestino(dest.id)}
                        className="text-blue-500 hover:text-blue-700 text-xs underline cursor-pointer"
                        title="Alocar tudo neste destino"
                      >
                        Tudo
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => limparDestino(dest.id)}
                        className="text-red-400 hover:text-red-600 text-xs underline cursor-pointer"
                        title="Limpar alocações deste destino"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </th>
              ))}
              <th className="px-2 py-2 text-right text-slate-500 font-medium">Preço Unit.</th>
              <th className="px-2 py-2 text-center text-slate-500 font-medium">Status</th>
              <th className="px-2 py-2 text-center text-slate-500 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {rows.map(({ inv, it }) => {
              const jaAlocado = parseFloat(activeAllocations.get(`${inv.id}__${it.id}`) || 0);
              const alocadoNesta = getAlocadoNestaPrep(inv.id, it.id, preparation.alocacoes);
              const original = parseFloat(it.quantidade || 0);
              const saldoGeral = Math.max(0, original - jaAlocado - alocadoNesta).toFixed(4);
              const status = getItemStatus(inv.id, it.id);
              const isExcesso = status.label === 'Excesso';

              return (
                <tr key={`${inv.id}__${it.id}`} className={`bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/40 ${isExcesso ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <span className="font-mono text-slate-600 dark:text-slate-300">{inv.numero}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center text-slate-500">{it.item}</td>
                  <td className="px-2 py-1.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">{it.codigo}</td>
                  <td className="px-2 py-1.5 max-w-[160px]">
                    <span className="block truncate text-slate-700 dark:text-slate-200" title={it.descricao}>{it.descricao}</span>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-slate-500">{it.ncm}</td>
                  <td className="px-2 py-1.5 text-center text-slate-500">{it.unidade}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200">{parseFloat(it.quantidade || 0).toFixed(4)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-amber-600">{jaAlocado > 0 ? jaAlocado.toFixed(4) : '-'}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-200">{saldoGeral}</td>
                  {destinos.map(dest => {
                    const saldo = getSaldoDisponivel(inv.id, it.id, dest.id, preparation, activeAllocations);
                    const qty = getQty(inv.id, it.id, dest.id);
                    const exceedsBalance = parseFloat(qty || 0) > parseFloat(saldo) + parseFloat(qty || 0) + 0.0001;
                    return (
                      <td key={dest.id} className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={qty}
                          onChange={e => setQty(inv.id, String(it.id), dest.id, e.target.value)}
                          className={`w-24 border rounded px-1.5 py-1 text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 ${
                            exceedsBalance
                              ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-200 dark:border-slate-600 bg-white'
                          }`}
                          placeholder="0.0000"
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-right font-mono text-slate-500 whitespace-nowrap">
                    {formatBRL(parseFloat(it.valorUnitario || 0))}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <Badge cls={status.cls}>{status.label}</Badge>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => alocaTudoPrimeiroDestino(inv.id, it.id)}
                      className="text-blue-500 hover:text-blue-700 text-xs underline whitespace-nowrap cursor-pointer"
                      title="Alocar todo o saldo disponível no primeiro destino"
                    >
                      Alocar tudo
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Totais por destino */}
          <tfoot className="bg-gray-50 dark:bg-slate-700/60 border-t-2 border-gray-200 dark:border-slate-600">
            <tr>
              <td colSpan={9} className="px-2 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 text-right">Totais por destino:</td>
              {destinos.map(dest => {
                const total = calcDestTotal(dest.id, preparation);
                const qtyTotal = Object.entries(preparation.alocacoes)
                  .filter(([k]) => k.endsWith(`__${dest.id}`))
                  .reduce((acc, [, v]) => acc + parseFloat(v || 0), 0);
                return (
                  <td key={dest.id} className="px-2 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <div>{qtyTotal.toFixed(4)}</div>
                    <div className="text-slate-400 font-normal">{formatBRL(total)}</div>
                  </td>
                );
              })}
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="text-center text-slate-400 py-8">Nenhum item encontrado com o filtro selecionado.</p>
      )}
    </div>
  );
}

// ─── Step: Revisão ────────────────────────────────────────────────────────────
function StepRevisao({ preparation, activeAllocations }) {
  const problems = [];
  if (!preparation.clienteExportacao) problems.push('Cliente de exportação não definido');
  for (const dest of preparation.destinos) {
    const count = Object.keys(preparation.alocacoes).filter(k => k.endsWith(`__${dest.id}`)).length;
    if (count === 0) problems.push(`Destino "${dest.nome}" sem itens alocados`);
  }
  for (const inv of preparation.origens) {
    for (const it of (inv.itens || [])) {
      const jaAlocado = parseFloat(activeAllocations.get(`${inv.id}__${it.id}`) || 0);
      const alocadoNesta = getAlocadoNestaPrep(inv.id, it.id, preparation.alocacoes);
      const original = parseFloat(it.quantidade || 0);
      if (jaAlocado + alocadoNesta > original + 0.0001) {
        problems.push(`Item ${it.codigo} (${inv.numero}): saldo negativo`);
      }
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Revisão Final</h2>

      {/* Problemas */}
      {problems.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">⚠️ Problemas encontrados</p>
          <ul className="list-disc list-inside space-y-0.5">
            {problems.map((p, i) => (
              <li key={i} className="text-sm text-red-600 dark:text-red-300">{p}</li>
            ))}
          </ul>
        </div>
      )}

      {problems.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-3">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">✅ Preparação pronta para finalizar</p>
        </div>
      )}

      {/* Cards por nota de origem */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Notas de Origem</h3>
        <div className="space-y-3">
          {preparation.origens.map(inv => (
            <div key={inv.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{inv.numero}</span>
                <span className="text-xs text-slate-400">{inv.emitente?.razaoSocial}</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="text-left pb-1">Código</th>
                    <th className="text-left pb-1">Descrição</th>
                    <th className="text-right pb-1">Qtd. Orig.</th>
                    <th className="text-right pb-1">Alocado</th>
                    <th className="text-right pb-1">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                  {(inv.itens || []).map(it => {
                    const alocado = getAlocadoNestaPrep(inv.id, it.id, preparation.alocacoes);
                    const original = parseFloat(it.quantidade || 0);
                    const saldo = (original - alocado).toFixed(4);
                    return (
                      <tr key={it.id}>
                        <td className="py-1 font-mono text-slate-600 dark:text-slate-300">{it.codigo}</td>
                        <td className="py-1 text-slate-500 max-w-[180px] truncate" title={it.descricao}>{it.descricao}</td>
                        <td className="py-1 text-right font-mono text-slate-600 dark:text-slate-300">{original.toFixed(4)}</td>
                        <td className="py-1 text-right font-mono text-blue-600">{alocado.toFixed(4)}</td>
                        <td className={`py-1 text-right font-mono ${parseFloat(saldo) < 0 ? 'text-red-600' : 'text-slate-500'}`}>{saldo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* Cards por destino */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Notas de Destino</h3>
        <div className="space-y-3">
          {preparation.destinos.map(dest => {
            const total = calcDestTotal(dest.id, preparation);
            const items = [];
            for (const [key, qty] of Object.entries(preparation.alocacoes)) {
              const parts = key.split('__');
              if (parts[2] !== dest.id) continue;
              const inv = preparation.origens.find(o => o.id === parts[0]);
              if (!inv) continue;
              const it = (inv.itens || []).find(i => String(i.id) === parts[1]);
              if (!it) continue;
              items.push({ inv, it, qty });
            }
            return (
              <div key={dest.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{dest.nome}</span>
                  <span className="text-sm font-mono font-medium text-slate-600 dark:text-slate-300">{formatBRL(total)}</span>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum item alocado</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="text-left pb-1">Código</th>
                        <th className="text-left pb-1">Descrição</th>
                        <th className="text-right pb-1">Qtd.</th>
                        <th className="text-right pb-1">Valor Unit.</th>
                        <th className="text-right pb-1">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                      {items.map(({ inv, it, qty }) => {
                        const vu = parseFloat(it.valorUnitario || 0);
                        const q = parseFloat(qty || 0);
                        return (
                          <tr key={`${inv.id}__${it.id}`}>
                            <td className="py-1 font-mono text-slate-600 dark:text-slate-300">{it.codigo}</td>
                            <td className="py-1 text-slate-500 max-w-[180px] truncate" title={it.descricao}>{it.descricao}</td>
                            <td className="py-1 text-right font-mono text-slate-600 dark:text-slate-300">{q.toFixed(4)}</td>
                            <td className="py-1 text-right font-mono text-slate-500">{formatBRL(vu)}</td>
                            <td className="py-1 text-right font-mono font-medium text-slate-700 dark:text-slate-200">{formatBRL(q * vu)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Total geral */}
      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4 flex items-center justify-between">
        <span className="font-semibold text-slate-700 dark:text-slate-200">Total Geral</span>
        <span className="font-mono font-bold text-lg text-slate-800 dark:text-slate-100">
          {formatBRL(preparation.destinos.reduce((acc, dest) => acc + calcDestTotal(dest.id, preparation), 0))}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NovaPreparacaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useAppContext();

  const [preparation, setPreparation] = useState({
    titulo: '',
    tipo: 'mista',
    status: 'draft',
    clienteExportacao: null,
    origens: [],
    destinos: [{ id: genId(), nome: 'Exportação 1', allocations: {} }],
    alocacoes: {},
    _precosSaida: {},
    observacoes: '',
  });

  const [step, setStep] = useState('origens');
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [activeAllocations, setActiveAllocations] = useState(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [isRealMode, setIsRealMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const idParam = searchParams.get('id');
  const sourceIdsParam = searchParams.get('sourceIds');

  // Carregar dados
  useEffect(() => {
    async function init() {
      try {
        const [invoices, allocations] = await Promise.all([
          invoiceRepository.list(),
          preparationRepository.getActiveAllocations(idParam || null),
        ]);
        setAvailableInvoices(invoices || []);
        setActiveAllocations(allocations || new Map());

        if (idParam) {
          const existing = await preparationRepository.findById(idParam);
          if (existing) {
            // Hidratar origens com itens completos
            const origensFull = await Promise.all(
              (existing.origens || []).map(async (orig) => {
                const inv = (invoices || []).find(i => i.id === (orig.invoiceId || orig.id));
                return inv || orig;
              })
            );
            setPreparation(prev => ({
              ...prev,
              ...existing,
              origens: origensFull,
              alocacoes: existing.alocacoes || {},
              _precosSaida: existing._precosSaida || {},
            }));
            setIsRealMode(isRealPreparation(existing));
          }
        } else if (sourceIdsParam) {
          const ids = sourceIdsParam.split(',').filter(Boolean);
          const sourceInvoices = (invoices || []).filter(inv => ids.includes(inv.id));
          setPreparation(prev => ({
            ...prev,
            origens: sourceInvoices,
            tipo: determineTipo(sourceInvoices),
          }));
        }
      } catch (err) {
        console.error('Erro ao inicializar preparação:', err);
      } finally {
        setLoaded(true);
      }
    }
    init();
  }, [idParam, sourceIdsParam]);

  const handleSave = useCallback(async (finalStatus = 'draft') => {
    const hasRealInvoice = preparation.origens.some(inv => inv.isRealImport === true);
    setIsRealMode(hasRealInvoice);
    setIsSaving(true);
    try {
      const data = {
        ...preparation,
        status: finalStatus,
        origens: preparation.origens.map(inv => ({
          invoiceId: inv.id,
          numero: inv.numero,
          emitente: inv.emitente?.razaoSocial,
        })),
      };
      if (preparation.id) {
        await preparationRepository.update(preparation.id, data);
      } else {
        const saved = await preparationRepository.create(data);
        setPreparation(prev => ({ ...prev, id: saved.id }));
      }
      toast?.success?.('Preparação salva com sucesso!');
      if (finalStatus === 'active') {
        router.push('/preparacoes');
      }
    } catch (err) {
      console.error('Erro ao salvar preparação:', err);
      toast?.error?.('Erro ao salvar preparação.');
    } finally {
      setIsSaving(false);
    }
  }, [preparation, router, toast]);

  const currentStepIdx = STEP_IDS.indexOf(step);
  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === STEP_IDS.length - 1;

  const goNext = () => {
    if (!isLast) setStep(STEP_IDS[currentStepIdx + 1]);
  };
  const goPrev = () => {
    if (!isFirst) setStep(STEP_IDS[currentStepIdx - 1]);
  };

  const totalGeral = preparation.destinos.reduce((acc, dest) => acc + calcDestTotal(dest.id, preparation), 0);
  const totalItens = Object.keys(preparation.alocacoes).length;

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Preparações', href: '/preparacoes' },
    { label: idParam ? 'Continuar Preparação' : 'Nova Preparação', href: '/preparacoes/nova' },
  ];

  if (!loaded) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-24 text-slate-500">
          <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Carregando...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col h-full space-y-4">

        {/* Aviso sessão volátil */}
        {isRealMode && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-2.5 flex items-center gap-2 text-amber-800 text-sm">
            <svg className="w-4 h-4 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>Modo com documentos fiscais reais — dados serão perdidos ao recarregar a página.</span>
          </div>
        )}

        {/* Título editável + Tipo */}
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="text"
            value={preparation.titulo}
            onChange={e => setPreparation(prev => ({ ...prev, titulo: e.target.value }))}
            placeholder="Título da preparação (ex: Exportação Out/26 — Lote 03)"
            className="flex-1 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2 text-base font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-1.5">
            {[
              { val: 'mista', label: 'Mista', cls: 'bg-orange-100 text-orange-800' },
              { val: 'agrupamento', label: 'Agrupamento', cls: 'bg-blue-100 text-blue-800' },
              { val: 'divisao', label: 'Divisão', cls: 'bg-purple-100 text-purple-800' },
            ].map(t => (
              <span key={t.val} className={`text-xs px-2 py-0.5 rounded font-medium ${preparation.tipo === t.val ? t.cls : 'bg-gray-100 text-gray-400'}`}>
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {/* Step bar */}
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-700/40 rounded-xl p-1 overflow-x-auto">
          {STEPS.map((s, idx) => {
            const isCurrent = s.id === step;
            const isPast = idx < currentStepIdx;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`flex-1 min-w-[80px] px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm'
                    : isPast
                    ? 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
                    : 'text-slate-400 dark:text-slate-500 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <span className={`mr-1.5 ${isPast ? 'text-green-500' : ''}`}>{isPast ? '✓' : `${idx + 1}.`}</span>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo do step */}
        <div className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm overflow-y-auto">
          {step === 'origens' && (
            <StepOrigens
              preparation={preparation}
              setPreparation={setPreparation}
              availableInvoices={availableInvoices}
            />
          )}
          {step === 'cliente' && (
            <StepCliente
              preparation={preparation}
              setPreparation={setPreparation}
            />
          )}
          {step === 'destinos' && (
            <StepDestinos
              preparation={preparation}
              setPreparation={setPreparation}
            />
          )}
          {step === 'alocacao' && (
            <StepAlocacao
              preparation={preparation}
              setPreparation={setPreparation}
              activeAllocations={activeAllocations}
            />
          )}
          {step === 'revisao' && (
            <StepRevisao
              preparation={preparation}
              activeAllocations={activeAllocations}
            />
          )}
        </div>

        {/* Rodapé */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-3 shadow-sm flex items-center justify-between gap-4 flex-wrap">
          {/* Totais */}
          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <span>
              <strong className="text-slate-700 dark:text-slate-200">{preparation.origens.length}</strong> origem(ns)
            </span>
            <span>
              <strong className="text-slate-700 dark:text-slate-200">{preparation.destinos.length}</strong> destino(s)
            </span>
            <span>
              <strong className="text-slate-700 dark:text-slate-200">{totalItens}</strong> alocação(ões)
            </span>
            {totalGeral > 0 && (
              <span>
                Total: <strong className="text-slate-700 dark:text-slate-200">{formatBRL(totalGeral)}</strong>
              </span>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            <Button
              buttonType="secondary"
              size="small"
              outline
              onClick={() => handleSave('draft')}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
            {!isFirst && (
              <Button buttonType="secondary" size="small" onClick={goPrev}>
                ← Voltar
              </Button>
            )}
            {!isLast ? (
              <Button buttonType="primary" size="small" onClick={goNext}>
                Avançar →
              </Button>
            ) : (
              <Button
                buttonType="success"
                size="small"
                onClick={() => handleSave('active')}
                disabled={isSaving}
              >
                {isSaving ? 'Finalizando...' : '✓ Finalizar'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
