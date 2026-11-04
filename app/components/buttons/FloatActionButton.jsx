import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faX } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/assets/utils";

const baseButtonStyles =
    "rounded-full text-white drop-shadow transition duration-300 ease-in-out";
const baseIconStyles = "drop-shadow";

export const FabCancel = ({ id, onClick, className, small, absolute, disableZIndex, disabled, ...props }) => {
    const handleClick = () => {
        if (typeof onClick === "function" && !disabled) {
            onClick();
        }
    };

    return (
        <button
            id={id || "fab-cancel"}
            onClick={handleClick}
            disabled={disabled}
            className={cn(
                baseButtonStyles,
                !disableZIndex && "z-[999]",
                "bg-red-500 hover:bg-red-400",
                small ? "p-2" : "p-4",
                absolute ? "absolute" : "fixed",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            {...props}
        >
            <FontAwesomeIcon icon={faX} width="25" height="25" className={baseIconStyles} />
        </button>
    );
};

export const FabSave = ({ id, onClick, className, small, absolute, disableZIndex, disabled, ...props }) => {
    const handleClick = () => {
        if (typeof onClick === "function" && !disabled) {
            onClick();
        }
    };

    return (
        <button
            id={id || "fab-save"}
            onClick={handleClick}
            disabled={disabled}
            className={cn(
                baseButtonStyles,
                !disableZIndex && "z-[999]",
                "bg-green-500 hover:bg-green-400",
                small ? "p-2" : "p-4",
                absolute ? "absolute" : "fixed",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            {...props}
        >
            <FontAwesomeIcon icon={faSave} width="25" height="25" className={baseIconStyles} />
        </button>
    );
};

export const FabAdd = ({ id, onClick, className, small, absolute, disableZIndex, label, disabled, ...props }) => {
    const handleClick = () => {
        if (typeof onClick === "function" && !disabled) {
            onClick();
        }
    };

    return (
        <button
            id={id || "fab-add"}
            onClick={handleClick}
            disabled={disabled}
            className={cn(
                baseButtonStyles,
                !disableZIndex && "z-[999]",
                "flex flex-row items-center gap-2 bg-primary hover:bg-blue-500",
                small ? "p-2" : "p-4",
                absolute ? "absolute" : "fixed",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            {...props}
        >
            <FontAwesomeIcon icon={faPlus} width="25" height="25" className={baseIconStyles} />
            {label && (
                <span className="text-normal font-medium text-white pr-1">
                    {label}
                </span>
            )}
        </button>
    );
};

export const FabCustom = ({
    id,
    onClick,
    className,
    small,
    absolute,
    disableZIndex,
    icon,
    color,
    hover,
    disabled,
    ...props
}) => {
    const handleClick = () => {
        if (typeof onClick === "function" && !disabled) {
            onClick();
        }
    };

    return (
        <button
            id={id || "fab-custom"}
            onClick={handleClick}
            disabled={disabled}
            className={cn(
                baseButtonStyles,
                !disableZIndex && "z-[999]",
                color || "bg-slate-300",
                hover || "hover:bg-white-shadow-4",
                small ? "p-2" : "p-4",
                absolute ? "absolute" : "fixed",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            {...props}
        >
            <FontAwesomeIcon
                icon={icon || faPlus}
                width="25"
                height="25"
                className={baseIconStyles}
            />
        </button>
    );
};

export default FabAdd;
