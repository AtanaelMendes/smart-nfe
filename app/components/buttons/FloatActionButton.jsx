import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faX } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/assets/utils";
import Button from "./Button";

const baseIconStyles = "";

// Classes de posicionamento/dimensão compartilhadas por todos os FABs.
// O Button cuida da forma (pill), variante de cor e estados de foco/disabled.
const fabClassName = ({ small, absolute, disableZIndex, disabled, className }) =>
    cn(
        "shadow-lg hover:shadow-xl transition-shadow duration-150 ease-out",
        !disableZIndex && "z-[999]",
        small ? "h-10 min-w-10 !p-2" : "h-14 min-w-14 !p-4",
        absolute ? "absolute" : "fixed",
        disabled && "opacity-50 cursor-not-allowed",
        className
    );

export const FabCancel = ({ onClick, className, small, absolute, disableZIndex, disabled, title = "Cancelar", ...props }) => {
    return (
        <Button
            {...props}
            buttonType="danger"
            pill
            onClick={typeof onClick === "function" ? onClick : null}
            disabled={disabled}
            title={title}
            className={cn("bg-red-500 hover:bg-red-400", fabClassName({ small, absolute, disableZIndex, disabled, className }))}
        >
            <FontAwesomeIcon icon={faX} width="25" height="25" className={baseIconStyles} />
        </Button>
    );
};

export const FabSave = ({ onClick, className, small, absolute, disableZIndex, disabled, title = "Salvar", ...props }) => {
    return (
        <Button
            {...props}
            buttonType="success"
            pill
            onClick={typeof onClick === "function" ? onClick : null}
            disabled={disabled}
            title={title}
            className={fabClassName({ small, absolute, disableZIndex, disabled, className })}
        >
            <FontAwesomeIcon icon={faSave} width="25" height="25" className={baseIconStyles} />
        </Button>
    );
};

export const FabAdd = ({ onClick, className, small, absolute, disableZIndex, label, disabled, title, ...props }) => {
    return (
        <Button
            {...props}
            buttonType="primary"
            pill
            onClick={typeof onClick === "function" ? onClick : null}
            disabled={disabled}
            title={title || label || "Adicionar"}
            className={cn("flex flex-row items-center gap-2 hover:bg-blue-500", fabClassName({ small, absolute, disableZIndex, disabled, className }))}
        >
            <FontAwesomeIcon icon={faPlus} width="25" height="25" className={baseIconStyles} />
            {label && (
                <span className="text-normal font-medium text-white pr-1">
                    {label}
                </span>
            )}
        </Button>
    );
};

export const FabCustom = ({
    onClick,
    className,
    small,
    absolute,
    disableZIndex,
    icon,
    color,
    hover,
    disabled,
    title = "Ação",
    ...props
}) => {
    return (
        <Button
            {...props}
            pill
            onClick={typeof onClick === "function" ? onClick : null}
            disabled={disabled}
            title={title}
            className={cn(
                color || "bg-slate-300",
                hover || "hover:bg-white-shadow-4",
                "text-white",
                fabClassName({ small, absolute, disableZIndex, disabled, className })
            )}
        >
            <FontAwesomeIcon
                icon={icon || faPlus}
                width="25"
                height="25"
                className={baseIconStyles}
            />
        </Button>
    );
};

export default FabAdd;
