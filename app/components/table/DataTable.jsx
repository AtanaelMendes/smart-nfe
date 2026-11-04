'use client';

import { useState, useMemo } from 'react';
import InputText from '@/components/inputs/InputText';

// Mapeamento estático obrigatório para detecção correta de classes no Tailwind 4
const ALIGN_MAP = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * DataTable — Tabela de alta performance para o SmartNFe.
 *
 * Suporta colunas explícitas (SmartNFe), modo compacto (conferência fiscal),
 * renderizador customizado de células, filtro em tempo real e tema escuro.
 *
 * Props:
 *   data        — Array de objetos com os registros
 *   columns     — Array de { key, label, align?, render?, width?, title? } (modo preferencial)
 *   header      — Array de { label, align?, title? } (modo legado de compatibilidade)
 *   dense       — Boolean para tabela compacta (reduz padding e tipografia)
 *   mainText    — Título descritivo exibido na barra superior
 *   action      — Slot JSX para botões de ação adicionais
 *   emptyText   — Mensagem personalizada quando não houver dados
 *   searchable  — Boolean indicando se o campo de busca deve ser exibido (default: true)
 */
export default function DataTable({
  data = [],
  columns,
  header = [],
  dense = false,
  mainText,
  action,
  emptyText = 'Não há dados para exibir...',
  searchable = true,
}) {
  const [filterText, setFilterText] = useState('');

  const safeData = useMemo(
    () =>
      Array.isArray(data)
        ? data.filter(
            (item) => item != null && typeof item === 'object' && !Array.isArray(item)
          )
        : [],
    [data]
  );

  const safeColumns = useMemo(
    () =>
      Array.isArray(columns)
        ? columns.filter((col) => col != null && typeof col === 'object')
        : [],
    [columns]
  );
  const useExplicitColumns = safeColumns.length > 0;

  // Derivação de colunas com memoização
  const effectiveColumns = useMemo(() => {
    if (useExplicitColumns) {
      return safeColumns;
    }
    const safeHeader = Array.isArray(header)
      ? header.filter((h) => h != null && typeof h === 'object')
      : [];
    return safeHeader.map((h, index) => ({
      key: `col_${index}`,
      label: h?.label || '',
      align: h?.align || 'left',
      title: h?.title || '',
    }));
  }, [safeColumns, header, useExplicitColumns]);

  // Filtragem reativa instantânea sem useEffect
  const filteredData = useMemo(() => {
    if (!filterText.trim()) return safeData;

    const term = filterText.toLowerCase().trim();
    return safeData.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [safeData, filterText]);

  const cellPadding = dense ? 'px-2.5 py-1 text-xs' : 'px-4 py-2.5 text-sm';
  const headerPadding = dense ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-xs';

  return (
    <div className="flex w-full flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
      {/* Barra de Ferramentas Superior */}
      {(mainText || action || searchable) && (
        <div className="bg-slate-100 dark:bg-slate-800/70 border-b border-gray-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            {mainText}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {action && <div>{action}</div>}
            {searchable && (
              <div className="w-48 sm:w-56">
                <InputText
                  placeholder="Filtrar dados..."
                  value={filterText}
                  onChange={(_, val) => setFilterText(val || '')}
                  id="filtra_table"
                  clearable={true}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabela de Dados */}
      <div className="relative overflow-x-auto w-full">
        <table className="w-full text-left text-slate-700 dark:text-slate-200">
          <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 uppercase font-semibold border-b border-gray-200 dark:border-slate-800 sticky top-0">
            <tr>
              {effectiveColumns.map((col, index) => {
                const alignClass = ALIGN_MAP[col.align] || 'text-left';
                return (
                  <th
                    key={col.key || `th_${index}`}
                    scope="col"
                    className={`${headerPadding} ${alignClass} ${col.width || ''}`}
                    title={col.title || ''}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={effectiveColumns.length || 1}
                  className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-sm"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIndex) => (
                <tr
                  key={row?.id || row?.key || row?.codigo || `row_${rowIndex}`}
                  className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-800/40 hover:bg-blue-50/60 dark:hover:bg-slate-800/80 transition-colors"
                >
                  {useExplicitColumns
                    ? effectiveColumns.map((col, colIndex) => {
                        const alignClass = ALIGN_MAP[col.align] || 'text-left';
                        return (
                          <td
                            key={col.key || `td_${colIndex}`}
                            className={`${cellPadding} ${alignClass}`}
                          >
                            {typeof col.render === 'function'
                              ? col.render(row, rowIndex)
                              : row[col.key] ?? '-'}
                          </td>
                        );
                      })
                    : Object.keys(row).map((key, kIndex) => {
                        const alignClass =
                          ALIGN_MAP[header[kIndex]?.align] || 'text-left';
                        return (
                          <td
                            key={`legacy_${key}_${kIndex}`}
                            className={`${cellPadding} ${alignClass}`}
                          >
                            {row[key] ?? '-'}
                          </td>
                        );
                      })}
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <tr>
              <td
                colSpan={effectiveColumns.length || 1}
                className={cellPadding}
              >
                Exibindo {filteredData.length} de {safeData.length} registros
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
