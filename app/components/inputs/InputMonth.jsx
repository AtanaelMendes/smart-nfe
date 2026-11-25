import InputText from './InputText';

/** Aceita mês nativo ou o formato legado mm/aaaa. */
const InputMonth = ({ value, ...props }) => {
    const formattedValue = /^(0[1-9]|1[0-2])\/\d{4}$/.test(value || '') ? value.split('/').reverse().join('-') : value || '';
    return <InputText {...props} type="month" value={formattedValue} />;
};
export default InputMonth;
