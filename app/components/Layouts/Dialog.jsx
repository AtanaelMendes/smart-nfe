import { useCallback, useEffect, useState } from "react";
import InputTextArea from "../inputs/InputTextArea";
import Button from "@/components/buttons/Button";
import { empty } from "@/assets/utils";
import { useAppContext } from "@/context/AppContext";

/**
 * Componente para padronizar as mensagens de confirmação do usuário
 * Composto basicamente por dois botões (normalmente CANCELAR e OK)
 * Inclui um textarea opcional, que pode ser obrigatorio e com limite minimo de caracteres
 */

const Dialog = (props) => {
    const { toast } = useAppContext();
    const [description, setDescription] = useState("");

    const closeDialog = () => {
        if (typeof props.closeDialogCallback == "function") {
            props.closeDialogCallback();
        }

        props.setDialogControl(false);
    };

    const acceptDialog = () => {
        //validar regras
        if (!empty(props.textAreaMinLength) && description.length < props.textAreaMinLength) {
            toast.error(
                `A quantidade mínima de caracteres para o campo [${
                    props.textAreaLabel || "Motivo"
                }] é de ${props.textAreaMinLength} caracteres!`
            );
            return;
        }

        if (typeof props.confirmActionCallback == "function") {
            props.confirmActionCallback(description);
        }

        props.setDialogControl(false);
    };

    //Limpa o conteudo do textarea ao esconder a tela
    useEffect(() => {
        setDescription("");
    }, [props?.showDialog]);

    return (
        <div
            className={`z-50 left-0 top-0 w-full h-screen bg-black bg-opacity-40 items-center fixed ${
                props?.showDialog ? "flex" : "hidden"
            }`}
        >
            <div
                className={`${props?.hideTextArea ? "min-h-[150px]" : "min-h-[260px]"} ${
                    props?.small ? "md:w-1/3 lg:w-2/5" : "md:w-2/3 lg:w-3/5"
                } bg-white m-auto relative rounded-lg`}
            >
                {/* {TITLE} */}
                <div
                    className={`z-50 w-full px-4 p-2 font-semibold border-b border-slate-300 text-white bg-blue-700 rounded-t-lg`}
                >
                    {props?.hideTextArea ? "Confirmar ação" : props?.title}
                </div>

                {/* CONTEUDO */}
                {!props?.hideTextArea && (
                    <div className={`z-50 px-4 pt-1 w-full pb-20`}>
                        <InputTextArea
                            rows="5"
                            maxLength={props?.maxLength || 200}
                            value={description}
                            id="confirm_description"
                            helperText={
                                props?.textAreaMinLength
                                    ? `Mínimo ${props.textAreaMinLength} caracteres`
                                    : ""
                            }
                            minLength={props?.textAreaMinLength || ""}
                            label={props?.textAreaLabel || "Motivo"}
                            onChange={(id, value) => setDescription(value)}
                        />
                    </div>
                )}

                {props?.hideTextArea && (
                    <div className={`z-50 w-full px-4 p-2 font-semibold `}>
                        {props?.title || ""}
                    </div>
                )}

                {/* {BUTTONS} */}
                <div
                    className={`bottom-0 z-50 absolute w-full p-2 h-[46px] rounded-b-lg border-t bg-white border-slate-300 text-right`}
                >
                    {props?.btnCancel && (
                        <Button
                            buttonType="danger"
                            outline
                            size="small"
                            className={"mr-4"}
                            onClick={closeDialog}
                        >
                            {props.btnCancel || "CANCELAR"}
                        </Button>
                    )}
                    <Button buttonType="success" size="small" onClick={acceptDialog}>
                        {props.btnAccept || "OK"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Dialog;
