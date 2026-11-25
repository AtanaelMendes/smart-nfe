import InputText from './InputText';
import { getFieldError } from './Fieldset';

/** Campo numérico com o mesmo visual e contrato (id, value) dos demais campos. */
const InputNumber = ({ value, min, max, required, id, error, ...props }) => {
    let errorMessage = getFieldError(required, id, error);
    if (!errorMessage && value !== '' && value != null) {
        if (min !== '' && min != null && Number(value) < Number(min)) errorMessage = `O valor mínimo permitido é ${min}`;
        if (max !== '' && max != null && Number(value) > Number(max)) errorMessage = `O valor máximo permitido é ${max}`;
    }
    return <InputText {...props} id={id} type="number" value={value} min={min} max={max} required={required} error={errorMessage} />;
};
export default InputNumber;
