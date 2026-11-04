import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceSadCry } from "@fortawesome/free-regular-svg-icons";

const Failure = ({ active, message, className }) => {
    return (
        <div className={`flex absolute w-full h-full bg-white z-[999] top-[0px] left[0px] items-center justify-center ${active ? "" : "hidden"} ${className}`}>
            <div className="h-[200px] w-[180px] relative text-center">
                <FontAwesomeIcon icon={faFaceSadCry} width="60" height="60" className="text-red-600"/>
                <span className="-bottom-5 left-1/2 -translate-x-1/2 absolute font-medium">{message || "Não foi possível realizar carregar os dados, tente atualizar a aba."}</span>
            </div>
        </div>
    );
}
export default Failure;