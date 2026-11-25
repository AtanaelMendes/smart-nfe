import { useId, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/assets/utils';
import Button from '@/components/buttons/Button';
import Fieldset, { fieldInputClass, getFieldError } from './Fieldset';

const Select = ({ label, value, id: providedId, name, options, placeholder, onChange, hideClearButton, required, disabled, hint, helperText, className, containerClassName, small, large, error, ...rest }) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const selectRef = useRef(null);
    const errorMessage = getFieldError(required, id, error);
    const isRequired = required === true || !!required?.[id];
    const clear = () => {
        if (selectRef.current) selectRef.current.value = '';
        onChange?.(id, '');
        selectRef.current?.focus();
    };
    return (
        <Fieldset control id={id} label={label} required={isRequired} error={errorMessage} disabled={disabled} hint={hint} helperText={helperText} className={containerClassName}>
            <select {...rest} ref={selectRef} id={id} value={value} disabled={disabled} required={isRequired} name={name || id}
                onChange={(event) => onChange?.(event.target.id, event.target.value)}
                aria-invalid={!!errorMessage || undefined}
                aria-describedby={[rest['aria-describedby'], (errorMessage || helperText) && `${id}-feedback`].filter(Boolean).join(' ') || undefined}
                className={fieldInputClass({ small, large, className: cn('appearance-none cursor-pointer pr-10', !hideClearButton && value !== '' && value != null && 'pr-16', '[&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100', className) })}>
                {placeholder && <option value="">{placeholder}</option>}
                {!options ? <option>Carregando...</option> : options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
            </select>
            <FontAwesomeIcon icon={faChevronDown} className="pointer-events-none absolute right-3.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            {!hideClearButton && value !== '' && value != null && <Button buttonType="ghost" size="small" disabled={disabled} onClick={clear}
                title="Limpar seleção" aria-label="Limpar seleção" className="absolute right-8 top-1/2 h-7 min-h-0 w-7 -translate-y-1/2 rounded-full p-0"><FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" /></Button>}
        </Fieldset>
    );
};
export default Select;
