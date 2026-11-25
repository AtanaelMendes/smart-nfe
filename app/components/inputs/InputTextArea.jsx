import { useId } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/assets/utils';
import Button from '../buttons/Button';
import Fieldset, { fieldInputClass, getFieldError } from './Fieldset';

const InputTextArea = ({ id: providedId, value, label, helperText, hint, minLength, maxLength, rows = 4, required, disabled, readOnly, placeholder, onChange, onKeyDown, className, containerClassName, small, large, btnSent, error, ...rest }) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorMessage = getFieldError(required, id, error);
    const isRequired = required === true || !!required?.[id];
    return <Fieldset control id={id} label={label} required={isRequired} error={errorMessage} disabled={disabled} readOnly={readOnly} hint={hint} helperText={helperText} className={containerClassName}
        footer={typeof btnSent === 'function'
            ? <Button buttonType="primary" size="small" disabled={disabled || readOnly} onClick={btnSent} title="Enviar" aria-label="Enviar"><FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" /></Button>
            : <span className={cn('ml-auto shrink-0 tabular-nums text-slate-500 dark:text-slate-400', maxLength && (value?.length || 0) >= maxLength && 'text-red-600 dark:text-red-400')}>{value?.length || 0}{maxLength ? ` / ${maxLength}` : ''}</span>}>
        <textarea {...rest} id={id} name={rest.name || id} value={value ?? ''} rows={rows} minLength={minLength} maxLength={maxLength} required={isRequired} disabled={disabled} readOnly={readOnly} placeholder={placeholder}
            aria-invalid={!!errorMessage || undefined} aria-describedby={[rest['aria-describedby'], (errorMessage || helperText) && `${id}-feedback`].filter(Boolean).join(' ') || undefined}
            onChange={(event) => onChange?.(event.target.id, event.target.value)}
            onKeyDown={(event) => { onKeyDown?.(event); if (!event.defaultPrevented && event.key === 'Enter' && !event.shiftKey && typeof btnSent === 'function') { event.preventDefault(); btnSent(); } }}
            className={fieldInputClass({ small, large, className: cn('h-auto min-h-24 resize-y py-3', className) })} />
    </Fieldset>;
};
export default InputTextArea;
