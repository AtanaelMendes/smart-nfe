'use client';

import { Fragment, useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import InputText from '@/components/inputs/InputText';

const cn = (...classes) => twMerge(classes.filter(Boolean).join(' '));

// Mapeamento estático obrigatório para detecção correta de classes no Tailwind 4
const ALIGN_MAP = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const SORT_ICONS = { asc: '▲', desc: '▼' };

/**
 * DataTable — Tabela de alta performance para o SmartNFe.
 *
 * Props base:
 *   data        — Array de objetos com os registros
 *   columns     — Array de { key, label, align?, render?, width?, title?, className?, headerClassName?, sortable?, sortKey? }
 *   header      — Array de { label, align?, title? } (modo legado de compatibilidade)
 *   dense       — Boolean para tabela compacta
 *   mainText    — Título descritivo exibido na barra superior
 *   action      — Slot JSX para ações adicionais
 *   emptyText   — Mensagem padrão para lista vazia
 *   searchable  — Exibe campo de busca (default: true)
 *
 * Extensões (retrocompatíveis):
 *   getRowKey(row, index)          — chave estável configurável
 *   loading / loadingText          — estado de carregamento
 *   showFooter / showCount         — controle do rodapé e da contagem
 *   footerText / footerRender      — conteúdo customizado do rodapé
 *   onSort(column) / sortKey / sortDirection — ordenação por cabeçalho
 *   renderExpandedRow(row, index)  — linha de detalhes expansível
 *   isRowExpanded(row, index)      — controla quais linhas estão expandidas
 *   containerClassName / tableClassName / headerClassName / rowClassName / cellClassName / headerCellClassName
 *   emptyRender                    — render customizado de estado vazio
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
  getRowKey,
  loading = false,
  loadingText = 'Carregando...',
  showFooter = true,
  showCount = true,
  footerText,
  onSort,
  sortKey,
  sortDirection = 'asc',
  renderExpandedRow,
  isRowExpanded,
  containerClassName = '',
  tableClassName = '',
  headerClassName = '',
  rowClassName,
  cellClassName = '',
  headerCellClassName = '',
  emptyRender,
  footerRender,
  searchPlaceholder = 'Filtrar dados...',
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
  const colCount = effectiveColumns.length || 1;
  const hasExplicitColumns = useExplicitColumns;
  const canSort = typeof onSort === 'function';

  const resolveClass = (value, row, index) =>
    typeof value === 'function' ? value(row, index) : value;

  const resolveRowKey = (row, index) => {
    if (typeof getRowKey === 'function') return getRowKey(row, index);
    return row?.id ?? row?.key ?? row?.codigo ?? `row_${index}`;
  };

  const isColumnSorted = (col) => {
    if (sortKey === undefined || sortKey === null) return false;
    return (col.sortKey ?? col.key) === sortKey;
  };

  const renderHeaderCell = (col, index) => {
    const alignClass = ALIGN_MAP[col.align] || 'text-left';
    const sortable = canSort && col.sortable !== false;
    const sorted = isColumnSorted(col);
    return (
      <th
        key={col.key || `th_${index}`}
        scope="col"
        className={cn(
          headerPadding,
          alignClass,
          col.width || '',
          col.headerClassName,
          headerCellClassName,
          sortable && 'cursor-pointer select-none'
        )}
        title={col.title || ''}
        aria-sort={sorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
        onClick={sortable ? () => onSort(col) : undefined}
      >
        {typeof col.headerRender === 'function' ? col.headerRender(col) : col.label}
        {sortable && (
          <span className="ml-1 text-[9px] opacity-70">
            {sorted ? SORT_ICONS[sortDirection] : '⇅'}
          </span>
        )}
      </th>
    );
  };

  const renderCell = (col, row, rowIndex, colIndex) => {
    const alignClass = ALIGN_MAP[col.align] || 'text-left';
    return (
      <td
        key={col.key || `td_${colIndex}`}
        className={cn(cellPadding, alignClass, col.className, cellClassName)}
      >
        {typeof col.render === 'function'
          ? col.render(row, rowIndex)
          : row[col.key] ?? '-'}
      </td>
    );
  };

  return (
    <div
      className={cn(
        'flex w-full flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden',
        containerClassName
      )}
    >
      {/* Barra de Ferramentas Superior */}
      {(mainText || action || searchable) && (
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            {mainText}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {action && <div>{action}</div>}
            {searchable && (
              <div className="w-48 sm:w-56">
                <InputText
                  placeholder={searchPlaceholder}
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
        <table className={cn('w-full text-left text-slate-700 dark:text-slate-200', tableClassName)}>
          <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-medium border-b border-gray-200 dark:border-slate-800 sticky top-0">
            <tr className={cn(headerClassName)}>
              {effectiveColumns.map((col, index) => renderHeaderCell(col, index))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  {loadingText}
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-sm"
                >
                  {emptyRender || emptyText}
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIndex) => {
                const expanded =
                  typeof isRowExpanded === 'function' && isRowExpanded(row, rowIndex);
                return (
                  <Fragment key={resolveRowKey(row, rowIndex)}>
                    <tr
                      className={cn(
                        'bg-white dark:bg-slate-900 hover:bg-blue-50/60 dark:hover:bg-blue-400/5 transition-colors',
                        resolveClass(rowClassName, row, rowIndex)
                      )}
                    >
                      {hasExplicitColumns
                        ? effectiveColumns.map((col, colIndex) =>
                            renderCell(col, row, rowIndex, colIndex)
                          )
                        : Object.keys(row).map((key, kIndex) => {
                            const alignClass =
                              ALIGN_MAP[header[kIndex]?.align] || 'text-left';
                            return (
                              <td
                                key={`legacy_${key}_${kIndex}`}
                                className={cn(cellPadding, alignClass, cellClassName)}
                              >
                                {row[key] ?? '-'}
                              </td>
                            );
                          })}
                    </tr>
                    {expanded && typeof renderExpandedRow === 'function' && (
                      <tr className="bg-slate-50/60 dark:bg-slate-800/40">
                        <td colSpan={colCount} className="p-0">
                          {renderExpandedRow(row, rowIndex)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
          {showFooter && (
            <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <td colSpan={colCount} className={cellPadding}>
                  {typeof footerRender === 'function'
                    ? footerRender(filteredData, safeData)
                    : showCount
                      ? `Exibindo ${filteredData.length} de ${safeData.length} registros`
                      : null}
                  {footerText && <span className="ml-2">{footerText}</span>}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
