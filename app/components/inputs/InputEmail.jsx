import { faAsterisk, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useEffect, useState } from "react";
import { TooltipComponent } from "../Layouts/TooltipComponent";
import { cn } from "@/assets/utils";

const InputEmail = (props) => {
    const [email, setEmail] = useState("");
    const [isValid, setIsValid] = useState(true);
    const [invalidMailMessage, setInvalidMailMessage] = useState("");

    const handleChange = (evt) => {
        setEmail(evt.target.value);

        if (typeof props.onChange == "function") {
            props.onChange(evt.target.id, evt.target.value);
        }
    };

    useEffect(() => {
        setEmail(props?.value || "");
    }, [props?.value]);

    useEffect(() => {
        renderInvalidMailFormat();
    }, [isValid]);

    function renderInvalidMailFormat() {
        if (isValid) {
            setInvalidMailMessage("");
            return;
        }

        setInvalidMailMessage(
            <div className="text-xs text-red-600 font-semibold">
                O e-mail informado é inválido!
            </div>
        );
    }

    const handleValidate = () => {
        if (email == "") {
            setIsValid(true);
            return;
        }

        if (!email.match(/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/)) {
            setIsValid(false);
            return;
        }

        //Valida os domínios
        var part = email.substring(
            email.lastIndexOf("@") + 1,
            email.lastIndexOf("@") + 4
        );

        var total = email.substring(email.lastIndexOf("@") + 1, email.length);

        if (part == "gma" && total != "gmail.com") {
            setIsValid(false);
            return; // O e-mail válido deve ser @gmail.com
        }

        if (part == "out" && total != "outlook.com" && total != "outlook.com.br") {
            setIsValid(false);
            return; // O e-mail válido deve ser @outlook.com
        }

        if (part == "hot" && total != "hotmail.com") {
            setIsValid(false);
            return; // O e-mail válido deve ser @hotmail.com
        }

        if (part == "msn" && total != "msn.com") {
            setIsValid(false);
            return; // O e-mail válido deve ser @msn.com
        }

        if (part == "liv" && total != "live.com") {
            setIsValid(false);
            return; // O e-mail válido deve ser @live.com
        }

        if (part == "icl" && total != "icloud.com") {
            setIsValid(false);
            return; // O e-mail válido deve ser @icloud.com
        }

        if (part == "aol" && total != "aol.com") {
            setIsValid(false);
            return; // O e-mail válido deve ser @aol.com
        }

        if (part == "uol" && total != "uol.com.br") {
            setIsValid(false);
            return; // O e-mail válido deve ser @uol.com.br
        }

        if (part == "bol" && total != "bol.com.br") {
            setIsValid(false);
            return; // O e-mail válido deve ser @bol.com.br
        }

        if (part == "yah" && total != "yahoo.com" && total != "yahoo.com.br") {
            setIsValid(false);
            return; // O e-mail válido deve ser @yahoo.com
        }

        if (part == "yma" && total != "ymail.com") {
            setIsValid(false);
            return; // O e-mail válido deve ser @ymail.com
        }

        if (part == "glo" && total != "globomail.com") {
            setIsValid(false);
            return; // O e-mail válido deve ser @globomail.com,
        }

        if (
            part == "rhb" &&
            total != "rhbrasil.com.br" &&
            total != "rhbprommo.com.br"
        ) {
            setIsValid(false);
            return; // O e-mail válido deve ser @rhbrasil.com.br ou @rhbprommo.com.br
        }

        setIsValid(true);
    };

    function hasError() {
        return (props.required?.hasOwnProperty(props.id) && props.required[props.id].error);
    }

    function renderError() {
        if (!hasError()) return;
        let errorMsg = props.required[props.id]?.errorMsg || "Este campo é obrigatório";
        return <div className="text-xs text-red-600">{errorMsg}</div>;
    }

    return (
        <div className="w-full relative">
            {props.label && (
                <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
                    <label htmlFor={props.id}>
                        <FieldLabel className={cn(props?.required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
                            {props.label || ""}
                        </FieldLabel>
                    </label>
                    {props?.required && (
                        <FontAwesomeIcon icon={faAsterisk} width="10" height="10" color="red" className="self-start absolute"/>
                    )}
                    {props?.hint && (
                        <>
                            <TooltipComponent
                                content={
                                    <div className="text-xs z-20 max-w-[300px]">
                                        {props?.hint}
                                    </div>
                                }
                                asChild
                            >
                                <FontAwesomeIcon
                                    icon={faInfoCircle}
                                    width="16"
                                    height="16"
                                    color="blue"
                                    className="self-start ml-2"
                                    tabIndex={-1}
                                />
                            </TooltipComponent>
                        </>
                    )}
                </div>
            )}
            <input
                id={props.id}
                type="text"
                name={props.name || props.id}
                required={props.required}
                value={email}
                onChange={handleChange}
                onBlur={handleValidate}
                placeholder={props.placeholder || ""}
                className={`
                    block w-full p-2 rounded-lg
                    border ${hasError() ? "border-red-500" : "border-gray-300"}
                    text-gray-900 text-sm
                    focus:ring-blue-500 focus:border-blue-500
                    ${props.small ? " p-1.5 text-xs " : ""}
                    ${props.large ? " p-3 text-base " : ""}
                `}
            />
            {renderError()}
            {invalidMailMessage}
            {props.helperText && <div className="text-xs text-blue-600 absolute bottom-[-12px] right-0"> {props.helperText} </div>}
        </div>
    );
};

export default InputEmail;
