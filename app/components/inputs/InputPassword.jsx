import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import InputText from './InputText';
import Button from '../buttons/Button';

const InputPassword = ({ showTogglePassword = true, onKeyDown, ...props }) => {
    const [visible, setVisible] = useState(false);
    return <InputText {...props} type={visible ? 'text' : 'password'}
        onKeyDown={(event) => { if (event.key === 'Enter') onKeyDown?.(event); }}
        endAdornment={showTogglePassword && <Button buttonType="ghost" size="small" disabled={props.disabled}
            onClick={() => setVisible((previous) => !previous)} title={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible}
            className="h-8 min-h-0 w-8 rounded-full p-0"><FontAwesomeIcon icon={visible ? faEyeSlash : faEye} className="h-4 w-4" /></Button>} />;
};
export default InputPassword;
