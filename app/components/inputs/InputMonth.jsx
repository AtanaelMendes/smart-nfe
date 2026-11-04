import { faAsterisk, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FieldLabel } from "../Layouts/Typography";
import { TooltipComponent } from "../Layouts/TooltipComponent";
import { cn } from "@/assets/utils";

const InputMonth = (props) => {
    const handleChange = (evt) => {
        if (typeof props.onChange === "function") {
            props.onChange(evt.target.id, evt.target.value);
        }
    };

    const hasError = () =>
        props?.required?.hasOwnProperty(props.id) &&
        props?.required[props.id].error;

    function renderError() {
        if (!hasError()) return;
        let errorMsg =
            props?.required[props.id].errorMsg || "Este campo é obrigatório";

        return <div className="text-xs text-red-600">{errorMsg}</div>;
    }

    function getValue() {
        if (!props.value) return "";
        let formatMMYYYY = /^(0[1-9]|1[0-2])\/(\d{4})$/;

        // Verifica se a data corresponde ao formato dd/mm/yyyy
        if (formatMMYYYY.test(props.value)) {
            let partes = props.value.split("/");
            let mes = partes[0];
            let ano = partes[1];
            return `${ano}-${mes}`;
        }
        return props.value;
    }

    return (
        <div className="relative w-full">
            {props.label && (
                <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
                    <label htmlFor={props.id}>
                        <FieldLabel className={cn(props?.required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
                            {props.label || ""}
                        </FieldLabel>
                    </label>
                    {props?.required && (
                        <FontAwesomeIcon
                            icon={faAsterisk}
                            width="10"
                            height="10"
                            color="red"
                            className="self-start absolute"
                        />
                    )}
                    {props?.hint && (
                        <>
                            <TooltipComponent
                                content={
                                    <div className="text-xs z-20 max-w-[300px]">
                                        {props?.hint}
                                    </div>
                                }
                                asChild
                            >
                                <FontAwesomeIcon
                                    icon={faInfoCircle}
                                    width="16"
                                    height="16"
                                    color="blue"
                                    className="self-start ml-2"
                                    tabIndex={-1}
                                />
                            </TooltipComponent>
                        </>
                    )}
                </div>
            )}
            <input
                id={props.id}
                name={props.name || props.id}
                required={props.required}
                value={getValue()}
                disabled={props.disabled || false}
                placeholder={props.placeholder || ""}
                onChange={handleChange}
                type="month"
                className={`
                    rounded-lg block w-full p-2
                    text-gray-900 text-sm
                    focus:ring-blue-500 focus:border-blue-500
                    border ${hasError() ? `border-red-500` : `border-gray-300`}
                    ${props.disabled ? "bg-gray-100 cursor-not-allowed" : ""}
                    ${props.className}`}
            />
            {renderError()}
            {props.helperText && (
                <div className="text-xs text-blue-600"> {props.helperText} </div>
            )}
        </div>
    );
};
export default InputMonth;
