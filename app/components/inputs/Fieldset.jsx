import { cn } from '@/assets/utils';
import { FieldLabel } from '@/components/Layouts/Typography';
import { TooltipComponent } from '@/components/Layouts/TooltipComponent';
import Button from '@/components/buttons/Button';

/** Resolve tanto a validação legada por id quanto a prop error. */
export function getFieldError(required, id, error) {
    if (typeof error === 'string') return error;
    if (error) return 'Verifique o valor informado.';
    return required?.[id]?.error ? required[id].errorMsg || 'Este campo é obrigatório' : '';
}

/** Classes do controle; a moldura e seus estados pertencem ao Fieldset. */
export function fieldInputClass({ small, large, className } = {}) {
    return cn(
        'relative block w-full min-w-0 rounded-md border-0 bg-transparent px-3.5 text-sm leading-5 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark] disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600 read-only:cursor-default',
        small ? 'h-10 py-2.5' : large ? 'h-14 py-4' : 'h-12 py-3.5',
        className,
    );
}

/** Agrupa campos ou fornece a moldura outlined compartilhada dos controles. */
const Fieldset = ({ control = false, id, label, required, error, disabled, readOnly, hint, helperText, children, className, borderStyle, footer }) => {
    if (!control) {
        return (
            <fieldset className={cn('flex w-full items-center gap-3 rounded-lg border border-slate-300 p-4 pt-2 text-sm text-slate-900 dark:border-slate-600 dark:text-slate-100', borderStyle, className)}>
                {label && <legend className="px-1.5"><FieldLabel>{label}</FieldLabel></legend>}
                {children}
            </fieldset>
        );
    }

    const caption = <>{label}{required && <span> *</span>}</>;
    return (
        <div data-ui-field className={cn('min-w-0 w-full', label && 'pt-2', className)}>
            <div data-disabled={disabled || undefined} data-error={!!error || undefined} className={cn('group/field relative rounded-md', disabled && 'bg-slate-100/60 dark:bg-slate-800/30', readOnly && 'bg-slate-50/50 dark:bg-slate-800/20')}>
                {children}
                <fieldset aria-hidden="true" className={cn(
                    'pointer-events-none absolute inset-x-0 bottom-0 -top-[5px] min-w-0 rounded-md border border-slate-400/70 px-2.5 transition-colors duration-150 group-hover/field:border-slate-700 group-focus-within/field:border-2 group-focus-within/field:border-blue-600 dark:border-slate-600 dark:group-hover/field:border-slate-300 dark:group-focus-within/field:border-blue-400',
                    error && 'border-red-600 group-hover/field:border-red-600 group-focus-within/field:border-red-600 dark:border-red-400 dark:group-hover/field:border-red-400 dark:group-focus-within/field:border-red-400',
                    disabled && 'border-slate-200! dark:border-slate-700!'
                )}>
                    <legend className={cn('invisible h-[10px] max-w-full overflow-hidden whitespace-nowrap text-xs leading-[10px]', label ? 'px-1' : 'w-0 p-0')}>
                        {label ? caption : <span>&#8203;</span>}
                    </legend>
                </fieldset>
                {label && <label htmlFor={id} className={cn(
                    'absolute -top-1.5 left-3.5 max-w-[calc(100%-28px)] truncate text-xs leading-3 text-slate-600 transition-colors group-focus-within/field:text-blue-600 dark:text-slate-400 dark:group-focus-within/field:text-blue-400',
                    error && 'text-red-600! dark:text-red-400!', disabled && 'text-slate-400! dark:text-slate-600!'
                )}>{caption}</label>}
            </div>
            {(error || helperText || hint || footer) && <div className="mt-1.5 flex min-w-0 items-start justify-between gap-2 px-3.5 text-xs leading-4">
                <div id={`${id}-feedback`} aria-live="polite" className={cn('min-w-0 text-slate-500 dark:text-slate-400', error && 'text-red-600 dark:text-red-400')}>
                    {error || helperText}
                </div>
                {hint && <TooltipComponent content={hint} asChild><Button buttonType="ghost" size="small" title={typeof hint === 'string' ? hint : 'Ajuda sobre o campo'} aria-label={`Ajuda: ${typeof label === 'string' ? label : 'campo'}`} className="h-5 min-h-0 shrink-0 rounded-full px-1.5 py-0 text-xs">?</Button></TooltipComponent>}
                {footer}
            </div>}
        </div>
    );
};

export default Fieldset;
