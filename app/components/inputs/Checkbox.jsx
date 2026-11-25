import { cn } from '@/assets/utils';

export default function Checkbox({ id, checked, disabled, value, required, label, onChange, className, ...rest }) {
    return <label className={cn('inline-flex min-h-8 items-center gap-2.5 text-sm leading-5 text-slate-700 dark:text-slate-200', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer', className)}>
        <input {...rest} id={id} name={rest.name || id} type="checkbox" onChange={(event) => onChange?.(event.target.id, event.target.checked)} checked={checked} disabled={disabled} value={value} required={required === true || !!required?.[id]}
            className="h-[18px] w-[18px] shrink-0 cursor-inherit rounded border-2 border-slate-400 accent-blue-600 outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:accent-blue-400 dark:[color-scheme:dark]" />
        {label && <span>{label}</span>}
    </label>;
}
