'use client';

import { useId } from 'react';
import Select from '@/components/inputs/Select';
import InputText from '@/components/inputs/InputText';

/**
 * Campos compactos reutilizáveis para os editores fiscais (NF-e / NFS-e).
 * Mantêm rótulos curtos, tipografia consistente e suporte a valores somente leitura.
 *
 * Implementação: delegam para os componentes base (`InputText` / `Select`), sem
 * estilos de input próprios. Os valores fiscais são mantidos como string para
 * preservar exatamente a precisão decimal (ex.: "1.0000", "0.00") — por isso não
 * usamos `InputNumber` (type="number") aqui.
 */

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
  const fieldId = useId();

  return (
    <div className={className}>
      <InputText
        id={fieldId}
        label={label}
        type={type}
        value={value ?? ''}
        onChange={(_id, val) => onChange && onChange(val)}
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={readOnly}
        className={mono ? 'font-mono' : undefined}
      />
    </div>
  );
}

export function FiscalSelect({ label, value, onChange, options = [], className = '' }) {
  const fieldId = useId();

  return (
    <div className={className}>
      <Select
        id={fieldId}
        label={label}
        hideClearButton
        containerClassName="relative w-full"
        value={value ?? ''}
        onChange={(_id, val) => onChange && onChange(val)}
        options={options}
      />
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
