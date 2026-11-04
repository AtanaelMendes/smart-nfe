import { useCallback, useEffect, useState } from "react";
import { cn, empty } from "@/assets/utils";

const ButtonToggle = ({
    id,
    value,
    label,
    labelOn,
    LabelOff,
    primary,
    danger,
    warning,
    success,
    small,
    checked,
    onChange,
    onClick,
    className,
    disabled,
    wordWrap
}) => {
    const [renderLabel, setRenderLabel] = useState(label);

    const handleChange = useCallback((evt) => {
        onChange?.(evt.target.id, evt.target.value, evt.target.checked);
    }, [onChange]);

    const handleClick = useCallback((evt) => {
        onClick?.(evt.target.checked);
    }, [onClick]);

    useEffect(() => {
        if (labelOn && LabelOff) {
            setRenderLabel(checked ? labelOn : LabelOff);
        } else {
            if (empty(label) || label !== renderLabel) {
                setRenderLabel(label);
            }
        }
    }, [checked, label, labelOn, LabelOff]);

    const getVariantStyles = () => {
        if (danger) return "peer-focus:ring-red-300 peer-checked:bg-red-600";
        if (success) return "peer-focus:ring-green-300 peer-checked:bg-green-600";
        if (primary) return "peer-focus:ring-blue-300 peer-checked:bg-blue-600 border border-gray-300";
        if (warning) return "peer-focus:ring-orange-300 peer-checked:bg-orange-500";
        return "";
    };

    const toggleStyles = cn(
        "relative bg-gray-200 rounded-full",
        "after:content-[''] after:absolute after:bg-white",
        "after:border after:border-gray-500 after:rounded-full after:start-[2px]",
        "peer peer-focus:ring-4 peer-checked:after:border-white",
        "after:transition-all rtl:peer-checked:after:-translate-x-full",
        small 
            ? "w-7 h-3 after:h-[8px] after:w-[8px] after:top-[1px] peer-checked:after:translate-x-3"
            : "w-8 h-4 after:h-[10px] after:w-[10px] after:top-[2px] peer-checked:after:translate-x-4",
        getVariantStyles()
    );

    if (!primary && !danger && !warning && !success) return null;

    return (
        <label className={cn("inline-flex items-center me-5", disabled ? "cursor-not-allowed" : "cursor-pointer", className)}>
            <input
                id={id}
                name={id}
                type="checkbox"
                value={value}
                checked={checked}
                disabled={disabled}
                onChange={handleChange}
                onClick={handleClick}
                className="sr-only peer"
            />
            <div className={toggleStyles} />
            <span className={`ms-3 text-sm font-medium ${wordWrap ? "whitespace-normal" : "whitespace-nowrap"}`}>
                {renderLabel}
            </span>
        </label>
    );
};

export default ButtonToggle;