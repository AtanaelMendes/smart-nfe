import SmallLoading from "../Layouts/SmallLoading";
import { FieldLabel } from "@/components/Layouts/Typography";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk, faInfoCircle, faX } from "@fortawesome/free-solid-svg-icons";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/assets/utils";
import { TooltipComponent } from "../Layouts/TooltipComponent";

const InputText = ({
    value,
    label,
    onChange,
    onBlur,
    placeholder,
    id,
    name,
    required,
    mask,
    small,
    large,
    helperText,
    disabled,
    readOnly,
    hint,
    maxLength,
    loading,
    clearable,
    className,
    type
}) => {
    const [inputVal, setInputVal] = useState(value || "");

    useEffect(() => {
        setInputVal(getMaskedValue(value || ""));
    }, [value]);

    const maskCPF = (val) => {
        if (!val) return "";
        let maskedValue = val.replace(/\D/g, "").slice(0, 11);
        maskedValue = maskedValue
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        return maskedValue;
    };

    const maskCNPJ = (val) => {
        if (!val) return "";
        let maskedValue = val.replace(/\D/g, "").slice(0, 14);
        maskedValue = maskedValue
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2");
        return maskedValue;
    };

    const maskAltura = (val) => {
        if (!val) return "";
        let maskedValue = val.replace(/[^\d.]/g, "");
        maskedValue = maskedValue.replace(/^(\d{0,1})(\d{0,2})/, function (match, p1, p2) {
            return p1 === "" ? "" : p1 + (p2 === "" ? "" : "." + p2);
        });
        return maskedValue.replace(/(\.\d{2})\d+?$/, "$1");
    };

    const maskCEP = (val) => {
        let cep = val.replace(/\D/g, "");

        if (cep.length > 5) {
            cep = cep.substring(0, 5) + "-" + cep.substring(5, 8);
        }

        return cep.substring(0, 9);
    };

    const maskNumeric = (val) => {
        if (!val) return "";
        return val.replace(/[^\d]/g, "");
    };

    //Aceita números e hífen (-)
    const maskNumeric2 = (val) => {
        if (!val) return "";
        return val.replace(/[^\d-]/g, "");
    };

    const maskPhone = (val) => {
        if (!val) return "";
        let maskedValue = val.replace(/\D/g, "");

        // Verifica se é telefone fixo (8 dígitos) ou celular (9 dígitos)
        if (maskedValue.length <= 10) {
            maskedValue = maskedValue.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
        } else {
            maskedValue = maskedValue.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
        }

        return maskedValue.substring(0, 15);
    };

    const maskCurrency = (val) => {
        let maskedValue = val.replace(/\D/g, "");

        // Se não houver valor, retorna vazio
        if (maskedValue === "") return "";

        // Divide o valor em parte inteira e centavos
        let centavos = maskedValue.slice(-2); // Últimos dois dígitos são os centavos
        let inteiro = maskedValue.slice(0, -2); // Tudo, exceto os últimos dois dígitos é o valor inteiro

        inteiro = inteiro == "" ? "0" : parseInt(inteiro).toString();

        // Adiciona separador de milhares (ponto) para o valor inteiro
        inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

        // Monta o valor formatado
        return `${inteiro},${centavos}`;
    };

    const handleChange = useCallback((evt) => {
        const maskedValue = getMaskedValue(evt.target.value);
        setInputVal(maskedValue);
        if (typeof onChange === "function") {
            onChange(evt.target.id, maskedValue);
        }
    });

    const clearValue = useCallback(() => {
        setInputVal("");
        if (typeof onChange === "function") {
            onChange(id, "");
        }
    });

    const handleBlur = (evt) => {
        if (typeof onBlur == "function") {
            onBlur(evt.target.id, getMaskedValue(evt.target.value));
        }
    };

    const handleKeyDown = (evt) => {
        if (evt.key === "Enter") {
            if (typeof onChange == "function") {
                onChange(evt.target.id, getMaskedValue(evt.target.value));
            }
            onChange(evt.target.id, getMaskedValue(evt.target.value));
            if (typeof onKeyDown === "function") {
                onKeyDown(evt);
            }
        }
    };

    const getMaskedValue = (string) => {
        switch (mask) {
            case "altura":
                return maskAltura(string);
            case "cep":
                return maskCEP(string);
            case "cnpj":
                return maskCNPJ(string);
            case "cpf":
                return maskCPF(string);
            case "currency":
                return maskCurrency(string);
            case "numeric":
                return maskNumeric(string);
            case "numeric2":
                return maskNumeric2(string);
            case "phone":
                return maskPhone(string);
            default:
                return string;
        }
    };

    const hasError = () => required?.hasOwnProperty(id) && required[id].error;

    function renderError() {
        if (!hasError()) return;
        let errorMsg = required[id]?.errorMsg || "Este campo é obrigatório";

        return <div className="text-xs text-red-600">{errorMsg}</div>;
    }

    return (
        <>
            <div className={`relative w-full`}>
                {label && (
                    <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
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
                        {hint && (
                            <>
                            <TooltipComponent
                                        asChild
                                        content={hint}
                                        usePortal={false}
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
                    id={id}
                    type={type || "text"}
                    name={name || id}
                    required={required}
                    disabled={disabled}
                    readOnly={readOnly}
                    onBlur={handleBlur}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    maxLength={maxLength || ""}
                    value={getMaskedValue(inputVal)}
                    placeholder={placeholder || ""}
                    className={cn(
                        `block w-full p-2 rounded-lg border text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500`,
                        hasError() ? "border-red-500" : "border-gray-300",
                        mask === "currency" ? "pl-6" : "",
                        small ? " py-1.5 pr-1.5 text-xs " : "",
                        large ? " py-3 pr-3 text-base " : "",
                        disabled ? "bg-gray-100 cursor-not-allowed" : "",
                        className
                    )}
                />
                 {clearable && inputVal && (
                    <div
                        onClick={clearValue}
                        className={cn(
                            "absolute top-1/2 -translate-y-1/2 right-2",
                            "w-5 h-5 flex items-center justify-center",
                            "cursor-pointer rounded-full",
                            "text-gray-400 hover:text-blue-500",
                            "hover:bg-gray-100 active:bg-gray-200",
                            "transition-all duration-150 ease-in-out",
                            disabled || readOnly ? "hidden" : ""
                        )}
                    >
                        <FontAwesomeIcon 
                            icon={faX} 
                            width="10" 
                            height="10"
                            className="transform hover:scale-110 transition-transform duration-150" 
                        />
                    </div>
                )}
                {loading && (
                    <div className="absolute bottom-[8px] right-[8px]">
                        <SmallLoading active={loading} />
                    </div>
                )}
                {mask === "currency" && (
                    <div className={`absolute ${small ? 'bottom-[4px]' : 'bottom-[9px]'} left-[8px] text-gray-900 text-sm`}>R$</div>
                )}
                {helperText && <div className="text-xs text-blue-600 absolute bottom-[-12px] right-0"> {helperText} </div>}
            </div>
            {renderError()}
        </>
    );
};

export default InputText;
