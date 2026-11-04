import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import PillsBadge from "@/components/buttons/PillsBadge";
import React from "react";
import { cn, empty } from "@/assets/utils";
import Button from '@/components/buttons/Button';

const InputTextArea = React.memo(function ({
    id,
    value,
    label,
    helperText,
    minLength,
    maxLength,
    rows,
    required,
    disabled,
    placeholder,
    onChange,
    className,
    small,
    btnSent
}) {
    const counterStyle = React.useMemo(() => {
        if (!empty(minLength) && value?.length < minLength) {
            return "danger";
        }

        if (maxLength == value?.length) {
            return "danger";
        }

        if (maxLength && value?.length >= Number(maxLength / 2.5).toFixed(0)) {
            return "warning";
        }

        return "primary";
    }, [value]);

    const handleKeyEnter = (evt) => {
        if (evt.key === "Enter" && !evt.shiftKey) {
            evt.preventDefault();
            if (typeof btnSent === "function") {
                btnSent();
            }
        }
    }

    const handleChange = React.useCallback(
        (evt) => {
            if (typeof onChange === "function") {
                onChange(evt.target.id, evt.target.value);
            }
        },
        [onChange]
    );

    const hasError = React.useMemo(() => {
        if (!required?.hasOwnProperty(id)) return false;
        return required.hasOwnProperty(id) && required[id].error;
    }, [required, id]);

    const renderError = React.useCallback(() => {
        if (!hasError) return;
        let errorMsg = required[id].errorMsg || "Este campo é obrigatório";

        return <div className="text-xs text-red-600 w-full">{errorMsg}</div>;
    }, [hasError, required, id]);

    const RenderTextArea = React.useMemo(
        () => (
            <textarea
                onKeyUp={handleKeyEnter}
                id={id}
                name={id}
                disabled={disabled}
                rows={rows || 4}
                onChange={handleChange}
                value={value || ""}
                placeholder={placeholder}
                maxLength={maxLength}
                className={cn(
                    "block p-2 w-full text-sm text-gray-900 rounded-lg border focus:ring-blue-500 focus:border-blue-500",
                    disabled ? "bg-gray-100 cursor-not-allowed" : "bg-yellow-50",
                    hasError ? "border-red-500" : "border-gray-300",
                    className
                )}
            />
        ),
        [id, disabled, rows, handleChange, value, placeholder, maxLength, hasError, className]
    );

    return (
        <>
            {label && (
                <label htmlFor={id} className={`${small ? 'mb-0.5 text-xs' : 'mb-2'} text-sm font-medium text-gray-900 inline-flex`}>
                    {required && (
                        <FontAwesomeIcon
                            icon={faAsterisk}
                            width="10"
                            height="10"
                            color="red"
                            className="self-start"
                        />
                    )}
                    {label}
                </label>
            )}
            <div className={`relative`}>
                {RenderTextArea}
                {!btnSent && <div className={cn("absolute bottom-[2px] right-[6px] text-right")}>
                    <PillsBadge type={counterStyle} small>
                        Total: {value?.length || 0}
                        {maxLength ? `/ ${maxLength}` : ""}
                    </PillsBadge>
                </div>}
                {typeof btnSent === "function" && <div className={cn("absolute bottom-[2px] right-[6px] text-right")}>
                    <Button buttonType="success" size={"small"} outline className="w-fit" onClick={btnSent}>
                        <FontAwesomeIcon icon={faPaperPlane} width="16" height="16" className=""/>
                    </Button>
                </div>}
            </div>
            {helperText && <div className="text-xs text-blue-600 text-right">{helperText}</div>}
            {renderError()}
        </>
    );
});

export default InputTextArea;
