import SmallLoading from "../Layouts/SmallLoading";
import Fieldset, { fieldInputClass, getFieldError } from "./Fieldset";
import Button from "../buttons/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faX } from "@fortawesome/free-solid-svg-icons";
import { useCallback, useEffect, useState, useId } from "react";
import { cn } from "@/assets/utils";

const InputText = ({
    value,
    label,
    onChange,
    onBlur,
    placeholder,
    id: providedId,
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
    type,
    onKeyDown,
    error,
    endAdornment,
    containerClassName,
    ...rest
}) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const [inputVal, setInputVal] = useState(value ?? "");

    useEffect(() => {
        setInputVal(getMaskedValue(value ?? ""));
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
        }
        if (typeof onKeyDown === "function") {
            onKeyDown(evt);
        }
    };

    const getMaskedValue = (value) => {
        const string = String(value ?? "");
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

    const errorMessage = getFieldError(required, id, error);
    const isRequired = required === true || !!required?.[id];
    const describedBy = [rest['aria-describedby'], (errorMessage || helperText) && `${id}-feedback`].filter(Boolean).join(' ') || undefined;

    return (
        <Fieldset control id={id} label={label} required={isRequired} error={errorMessage} disabled={disabled} readOnly={readOnly} hint={hint} helperText={helperText} className={containerClassName}>
            <input
                {...rest}
                id={id}
                type={type || "text"}
                name={name || id}
                required={isRequired}
                disabled={disabled}
                readOnly={readOnly}
                onBlur={handleBlur}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                maxLength={maxLength}
                value={getMaskedValue(inputVal)}
                placeholder={placeholder || ""}
                aria-invalid={!!errorMessage || undefined}
                aria-describedby={describedBy}
                className={fieldInputClass({ small, large, className: cn(mask === 'currency' && 'pl-10', (clearable || loading || endAdornment) && 'pr-12', className) })}
            />
            {clearable && inputVal && !disabled && !readOnly && !loading && <Button
                buttonType="ghost" size="small" title="Limpar campo" aria-label="Limpar campo"
                onClick={clearValue} className="absolute right-2 top-1/2 h-7 min-h-0 w-7 -translate-y-1/2 rounded-full p-0"
            ><FontAwesomeIcon icon={faX} className="h-3 w-3" /></Button>}
            {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><SmallLoading active={loading} /></div>}
            {mask === 'currency' && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">R$</span>}
            {endAdornment && <div className="absolute right-2 top-1/2 -translate-y-1/2">{endAdornment}</div>}
        </Fieldset>
    );
};

export default InputText;
