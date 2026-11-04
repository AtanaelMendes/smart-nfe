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
        <span className={cn(`text-xs text-slate-400`, className)}>
            { !empty(children) ? children : "" }
        </span>
    );
}

export const FieldLabel = ({ children, className, required }) => {
    return (
        <div className="inline-flex">
            {required && <FontAwesomeIcon icon={faAsterisk} width="10" height="10" color="red" className="self-start mr-1" />}
            <span className={cn('block mb-0.5 xl:mb-1 text-sm font-medium text-gray-900', className)}>
                { !empty(children) ? children : "" }
            </span>
        </div>
    );
}

export default Title;
