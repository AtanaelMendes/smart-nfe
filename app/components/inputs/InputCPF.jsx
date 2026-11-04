import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { empty } from "@/assets/utils";
import InputText from "./InputText";
import axiosInstance from "@/plugins/axios";

const InputCPF = ({ value, label, onChange, id, cdPessoa, required, isValidValue }) => {
    const [invalidMessage, setInvalidMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [isValid, setIsValid] = useState(true);
    const { toast } = useAppContext();

    useEffect(() => {
        if (typeof isValidValue == "function") {
            isValidValue(isValid);
        }
    }, [isValid]);

    const handleChange = (id, value) => {
        if (value.length == 14) {
            validaCPF(value);
        }

        if (typeof onChange == "function") {
            onChange(id, value);
        }
    };

    const handleBlur = (id, value) => {
        if (value.length > 0 && value.length < 14) {
            setInvalidMessage("Número de CPF incompleto.");
            setIsValid(false);
        }
    };

    const validaCPF = (nrCPF) => {
        setLoading(true);
        setInvalidMessage("");

        axiosInstance
            .get(`documento/valida-cpf/${nrCPF}/${cdPessoa || 0}`)
            .then(function (response) {
                setLoading(false);

                if (parseInt(response.data.CPF_VALIDO) === 0) {
                    setInvalidMessage("Número de CPF inválido.");
                    setIsValid(false);
                    return;
                }

                if (!empty(response.data.CD_PESSOA)) {
                    setInvalidMessage("Número de CPF já existente em nossa base de dados.");
                    setIsValid(false);
                    return;
                }

                setIsValid(true);
            })
            .catch(function (error) {
                toast.error("Erro ao validar CPF.");
                setLoading(false);
                console.error(error);
            });
    };

    return (
        <>
            <InputText
                mask={"cpf"}
                value={value}
                loading={loading}
                required={required}
                label={label || "CPF:"}
                id={id || "nr_documento_cpf"}
                onBlur={(id, value) => handleBlur(id, value)}
                onChange={(id, value) => handleChange(id, value)}
            />
            {!isValid && <div className="text-xs text-red-600 font-semibold">{invalidMessage}</div>}
        </>
    );
};

export default InputCPF;
