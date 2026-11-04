import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const WarningMessage = ({ title, subTitle, text, className, iconSize }) => {
    return (
        <div className={`flex justify-center w-full my-8 ${className || ""}`}>
            <div className="text-center flex items-center text-amber-500 mr-4">
                <FontAwesomeIcon icon={faTriangleExclamation} width={iconSize || "45"} height={iconSize || "45"} />
            </div>
            <div className="text-center">
                <span className="block text-xl font-semibold">{title}</span>
                <span className="block text-lg">{subTitle}</span>
                <span className="block text-sm">{text}</span>
            </div>
        </div>
    );
}
export default WarningMessage;