import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from "@fortawesome/free-solid-svg-icons";
import { cn, empty } from "@/assets/utils";

export const Title = ({children, className}) => {
    return (
        <span className={cn(`font-semibold`, className)}>
            { !empty(children) ? children : "" }
        </span>
    );
}

export const Subtitle = ({children, className}) => {
    return (
        <span className={cn(`text-base`, className)}>
            { !empty(children) ? children : "" }
        </span>
    );
}

export const Label = ({children, className}) => {
    return (
        <span className={cn(`text-sm`, className)}>
            { !empty(children) ? children : "" }
        </span>
    );
}

export const Caption = ({children, className}) => {
    return (
        <span className={cn(`text-xs leading-4 text-slate-500 dark:text-slate-400`, className)}>
            { !empty(children) ? children : "" }
        </span>
    );
}

export const FieldLabel = ({ children, className, required }) => {
    return (
        <div className="inline-flex">
            {required && <FontAwesomeIcon icon={faAsterisk} width="10" height="10" color="red" className="self-start mr-1" />}
            <span className={cn('block text-sm font-medium leading-5 text-slate-700 dark:text-slate-200', className)}>
                { !empty(children) ? children : "" }
            </span>
        </div>
    );
}

export default Title;
