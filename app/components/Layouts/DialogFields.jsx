import Button from '@/components/buttons/Button';

const DialogFields = ({title, children, visible, type, onCancel, onSave, disabled, labelConfirm}) => {
    const classType = {
        primary: "bg-primary text-white",
        success: "bg-green-500 text-white",
        warning: "bg-orange-500",
        danger: "bg-red-500 text-white"
    };

    const handleSave = () => {
        if (typeof onSave === "function") {
            onSave();
        }
    }

    const handleCancel = () => {
        if (typeof onCancel === "function") {
            onCancel();
        }
    }

    return (
        <div className={`z-50 left-0 top-0 w-full h-screen bg-black bg-opacity-40 items-center fixed ${visible ? "flex" : "hidden"}`}>
            <div className="bg-white rounded-md mx-auto my-auto flex flex-col">
                <div className={`${classType[type] || "bg-gray-300"} p-2 rounded-t-md font-semibold`}>
                    {title || "RHbrasil"}
                </div>
                <div className="p-2 flex flex-col gap-y-1">
                    {children}
                </div>
                <div className="p-2 flex w-full justify-end">
                    <Button size={"small"} buttonType="danger" outline onClick={handleCancel}>
                        Cancelar
                    </Button>
                    <Button size={"small"} buttonType="success" className="ml-1" disabled={disabled} onClick={handleSave}>
                        {labelConfirm || "OK"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
export default DialogFields;