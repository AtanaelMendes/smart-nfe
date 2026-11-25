import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import InputText from './InputText';
import Button from '../buttons/Button';

/** Data nativa, preservando entrada legada em dd/mm/aaaa e ação de copiar. */
const InputDate = ({ value, minDate = '1970-01-01', maxDate = '2200-12-31', copy, variant, ...props }) => {
    const formattedValue = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(value || '') ? value.split('/').reverse().join('-') : value || '';
    const copyDate = () => {
        if (formattedValue) navigator.clipboard.writeText(formattedValue.split('-').reverse().join('/'));
    };
    return <InputText {...props} type="date" value={formattedValue} min={minDate} max={maxDate}
        error={props.error || (variant === 'danger' ? 'Verifique a data informada.' : undefined)}
        endAdornment={copy && <Button buttonType="ghost" size="small" onClick={copyDate} title="Copiar data" aria-label="Copiar data" className="h-7 min-h-0 w-7 rounded-full p-0"><FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5" /></Button>} />;
};
export default InputDate;
