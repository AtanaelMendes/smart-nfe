'use client';

/**
 * Campos compactos reutilizáveis para os editores fiscais (NF-e / NFS-e).
 * Mantêm rótulos curtos, tipografia consistente e suporte a valores somente leitura.
 */

const baseInput =
  'w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none';

export function FiscalField({
  label,
  value,
  onChange,
  type = 'text',
  mono = false,
  placeholder = '',
  maxLength,
  readOnly = false,
  className = '',
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-semibold uppercase text-gray-500 dark:text-slate-400 mb-0.5">
        {label}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={readOnly}
        className={`${baseInput} ${mono ? 'font-mono' : ''} ${readOnly ? 'bg-gray-100 dark:bg-slate-900 text-gray-500 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}

export function FiscalSelect({ label, value, onChange, options = [], className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-semibold uppercase text-gray-500 dark:text-slate-400 mb-0.5">
        {label}
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        className={baseInput}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FiscalGroup({ title, children, accent = 'blue' }) {
  const accents = {
    blue: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    emerald: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    slate: 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  };
  return (
    <div className={`rounded-lg border p-2.5 space-y-2 ${accents[accent] || accents.blue}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}
