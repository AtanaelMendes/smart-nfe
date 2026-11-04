import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "@/components/buttons/Button";

const Confirm = ({ visible, setVisible, iconSize, primaryText, secondaryText, btnAccept, btnDecline, cancelActionCallback, confirmActionCallback }) => {
    const decline = () => {
        if (typeof cancelActionCallback == "function") {
            cancelActionCallback();
        }

        setVisible(false);
    };

    const accept = () => {
        if (typeof confirmActionCallback == "function") {
            confirmActionCallback();
        }

        setVisible(false);
    };

    return (
        <div className={`z-50 left-0 top-0 w-full h-screen bg-black bg-opacity-40 items-center fixed ${visible ? "flex" : "hidden"}`} >
            <div className={`h-fit w-2/6 py-2 bg-white m-auto rounded-lg`} >
                <div className="flex text-slate-500 mr-4 justify-center py-2">
                    <FontAwesomeIcon icon={faTriangleExclamation} width={iconSize || "45"} height={iconSize || "45"} />
                </div>
                <div className={`z-50 w-full px-4 p-2 text-center text-base`}>
                    {primaryText || ""}
                </div>
                <div className={`z-50 w-full px-4 p-2 text-slate-500 text-center text-sm`}>
                    {secondaryText || ""}
                </div>
                <div className={`z-50 w-full p-2 text-center`} >
                    {btnDecline && (
                        <Button
                            buttonType="primary"
                            outline
                            size="small"
                            className={"mr-4"}
                            onClick={decline}
                        >
                            {btnDecline}
                        </Button>
                    )}
                    <Button buttonType="primary" size="small" onClick={accept}>
                        {btnAccept || "Sim"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Confirm;
