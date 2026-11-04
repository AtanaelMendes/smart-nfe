import {
    faXmark,
    faAsterisk,
    faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FieldLabel } from "@/components/Layouts/Typography";
import Button from "@/components/buttons/Button";
import { TooltipComponent } from "../Layouts/TooltipComponent";
import { cn } from "@/assets/utils";

const Select = ({
    label,
    value,
    id,
    name,
    options,
    placeholder,
    onChange,
    hideClearButton,
    required,
    disabled,
    hint,
    helperText,
}) => {
    const handleChange = (evt) => {
        if (typeof onChange == "function") {
            onChange(evt.target.id, evt.target.value);
        }
    };

    const clearSelect = (idField) => {
        var el = document.getElementById(idField);
        el.value = "";
        if (typeof onChange === "function") {
            onChange(idField, "");
        }
    };

    const renderOptions = () => {
        if (!options) {
            return <option>Carregando...</option>;
        }
        return options?.map((opt) => {
            return (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            );
        });
    };

    const hasError = () => required?.hasOwnProperty(id) && required[id].error;

    function renderError() {
        if (!hasError()) return;
        let errorMsg = required[id]?.errorMsg || "Este campo é obrigatório";

        return <div className="text-xs text-red-600">{errorMsg}</div>;
    }

    return (
        <>
            <div className="w-full relative">
                {label && (
                    <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
                        <label htmlFor={id}>
                            <FieldLabel className={cn(required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
                                {label || ""}
                            </FieldLabel>
                        </label>
                        {required && (<FontAwesomeIcon icon={faAsterisk} width='10' height='10' color='red' className='self-start absolute'/>)}
                        {hint && (
                            <>
                                <TooltipComponent
                                    content={<div className="text-xs z-[100] max-w-[300px]">{hint}</div>}
                                    asChild
                                    usePortal={false}
                                >
                                    <span>
                                        <FontAwesomeIcon icon={faInfoCircle} width="16" height="16" color="blue" className="self-start ml-2" tabIndex={-1} aria-hidden={false}/>
                                    </span>
                                </TooltipComponent>
                            </>
                        )}
                    </div>
                )}
                <select
                    id={id}
                    value={value}
                    disabled={disabled}
                    name={name || id}
                    onChange={handleChange}
                    className={`
                        text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 border
                        ${hasError() ? "border-red-500" : "border-gray-300"} block w-full p-2
                        ${disabled ? "bg-gray-100 cursor-not-allowed" : null}
                    `}
                >
                    {placeholder && (
                        <option value="">{placeholder || "Selecione"}</option>
                    )}
                    {renderOptions()}
                </select>
                {!hideClearButton && (
                    <Button
                        disabled={disabled || !value}
                        className="absolute inset-y-0 right-6 hover:bg-blue-200 top-[0.3rem] h-7 text-primary"
                        size="small"
                        onClick={() => {clearSelect(id);}}
                        pill
                    >
                        <FontAwesomeIcon icon={faXmark} width="18" height="18" />
                    </Button>
                )}
                {renderError()}
            </div>
            {helperText && <div className="text-xs text-blue-600 pl-1"> {helperText} </div>}
        </>
    );
};

export default Select;
