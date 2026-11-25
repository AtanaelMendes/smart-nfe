import { useEffect, useState } from 'react';
import InputText from './InputText';

const InputEmail = (props) => {
    const [email, setEmail] = useState("");
    const [isValid, setIsValid] = useState(true);

    const handleChange = (evt) => {
        setEmail(evt.target.value);

        if (typeof props.onChange == "function") {
            props.onChange(evt.target.id, evt.target.value);
        }
    };

    useEffect(() => {
        setEmail(props?.value || "");
    }, [props?.value]);

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

    return <InputText {...props} type="email" value={email}
        onChange={(id, value) => handleChange({ target: { id, value } })}
        onBlur={(id, value) => { handleValidate(); props.onBlur?.(id, value); }}
        error={props.error || (!isValid ? 'O e-mail informado é inválido!' : undefined)} />;
};

export default InputEmail;
