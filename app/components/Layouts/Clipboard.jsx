import { cn } from "@/assets/utils";
import { useAppContext } from "@/context/AppContext";
import { faCopy } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Clipboard = ({ children, className, onClick, textToStore }) => {
    const { toast } = useAppContext();

    const copyTextToClipboard = async () => {
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(textToStore || children);
                toast.success("Texto copiado!");
            } catch (err) {
                console.error("Erro ao copiar texto:", err);
            }
        }
    };

    return (
        <div className={cn(`inline-flex items-center gap-1 ${typeof onClick === 'function' ? "cursor-pointer" : ""}`, className)}>
            <span onClick={onClick}>{children}</span>
            <FontAwesomeIcon
                icon={faCopy}
                width="12"
                height="12"
                className="cursor-copy"
                onClick={copyTextToClipboard}
            />
        </div>
    );
};
export default Clipboard;