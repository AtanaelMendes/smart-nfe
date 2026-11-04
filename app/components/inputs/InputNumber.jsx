import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from '@fortawesome/free-solid-svg-icons';
import { cn, empty } from "@/assets/utils";
import { FieldLabel } from "../Layouts/Typography";

const InputNumber = ({ label, value, onChange, placeholder, id, name, required, small, large, helperText, min, max, disabled, className }) => {
    const handleChange = (evt) => {
        onChange(evt.target.id, evt.target.value);
    }

    const getInputClass = () => {
        let className = " ";

        if (small) className += " p-1.5 text-xs ";
        if (large) className += " p-3 text-base ";

        if (!small && !large) {
            className += " p-2 ";
        }

        return className;
    };

    function hasError() {
        if (required?.hasOwnProperty(id) && required[id].error) {
            return required[id]?.errorMsg || "Este campo é obrigatório";
        }
        if (!empty(min) && Number(value) < Number(min)) {
            return `O valor mínimo permitido é ${min}`;
        }
        if (!empty(max) && Number(value) > Number(max)) {
            return `O valor máximo permitido é ${max}`;
        }
        return "";
    }

    function renderError() {
        let errorMsg = hasError();
        if (empty(errorMsg)) return;

        return (
            <div className="text-xs text-red-600">
                {errorMsg}
            </div>
        )
    }

    return (
        <div className="w-full relative">
            {label && <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
                <label htmlFor={id}>
                    <FieldLabel className={cn(required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
                        {label || ""}
                    </FieldLabel>
                </label>
                {required && (
                    <FontAwesomeIcon
                        icon={faAsterisk}
                        width="8"
                        height="8"
                        color="red"
                        className="self-start absolute"
                    />
                )}
            </div>}

            <input
                id={id}
                type="number"
                min={min}
                max={max}
                value={value}
                name={name || id}
                disabled={disabled}
                required={required}
                onChange={handleChange}
                className={`
                    rounded-lg block w-full
                    border 
                    ${hasError() ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}
                    text-gray-900 text-sm
                    ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}
                    ${getInputClass()}
                    ${className}
                `}
                placeholder={placeholder || ""} />
            {renderError()}
            {helperText && <div className="text-xs text-blue-600 absolute bottom-[-12px] right-0"> {helperText} </div>}
        </div>
    );
}

export default InputNumber;
