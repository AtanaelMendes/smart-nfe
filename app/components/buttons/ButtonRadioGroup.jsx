import { useCallback } from "react";
import { cn } from "@/assets/utils";
import Button from "./Button";

const ButtonRadioGroup = ({ id, options, value, onChange, className }) => {
    const handleOptionChange = useCallback((optionValue) => {
        if (onChange) {
            onChange(optionValue);
        }
    }, [onChange]);

    return (
        <div className={cn("inline-flex rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800", className)}>
            {options?.map((option, index) => (
                <Button
                    key={`${id}_${index}`}
                    buttonType={value == option.value ? "primary" : "secondary"}
                    square
                    onClick={() => handleOptionChange(option.value)}
                    className={cn(
                        "transition-colors duration-200",
                        index === 0 && "rounded-l-lg",
                        index === options.length - 1 && "rounded-r-lg",
                        index > 0 && "border-l border-gray-200 dark:border-slate-600",
                        value == option.value
                            ? "shadow-sm"
                            : "hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    )}
                >
                    {option.label}
                </Button>
            ))}
        </div>
    );
}

export default ButtonRadioGroup;
