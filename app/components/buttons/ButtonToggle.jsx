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
        if (danger) return 'peer-checked:bg-red-600 dark:peer-checked:bg-red-400';
        if (success) return 'peer-checked:bg-emerald-600 dark:peer-checked:bg-emerald-400';
        if (warning) return 'peer-checked:bg-amber-600 dark:peer-checked:bg-amber-400';
        return 'peer-checked:bg-blue-600 dark:peer-checked:bg-blue-400';
    };
    const toggleStyles = cn(
        "relative shrink-0 rounded-full bg-slate-300 transition-colors dark:bg-slate-600 after:absolute after:left-0.5 after:top-0.5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/25",
        small ? 'h-5 w-9 after:h-4 after:w-4 peer-checked:after:translate-x-4' : 'h-6 w-11 after:h-5 after:w-5 peer-checked:after:translate-x-5',
        getVariantStyles(),
        disabled && 'opacity-40',
    );

    if (!primary && !danger && !warning && !success) return null;

    return (
        <label className={cn("inline-flex min-h-8 items-center", disabled ? "cursor-not-allowed" : "cursor-pointer", className)}>
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
            <span className={`ms-3 text-sm text-slate-700 dark:text-slate-200 ${wordWrap ? "whitespace-normal" : "whitespace-nowrap"}`}>
                {renderLabel}
            </span>
        </label>
    );
};

export default ButtonToggle;