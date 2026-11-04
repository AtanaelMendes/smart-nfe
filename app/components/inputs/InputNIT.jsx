import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { empty } from "@/assets/utils";
import InputText from "./InputText";
import axiosInstance from "@/plugins/axios";

const InputNIT = ({ value, label, onChange, id, cdPessoa, disabled, isValidValue }) => {
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
        if (value.length >= 11 && value.length <= 14) {
            validaNIT(value);
        }

        if (typeof onChange == "function") {
            onChange(id, value);
        }
    };

    const validaNIT = (nrNIT) => {
        setLoading(true);

        axiosInstance
            .get(`documento/valida-nit/${nrNIT}/${cdPessoa || 0}`)
            .then(function (response) {
                setLoading(false);

                if (empty(response.data)) {
                    setIsValid(true);
                    return;
                }

                if (!empty(response.data.NM_PESSOA)) {
                    toast.error(`NIT já cadastrado para ${response.data.NM_PESSOA}`);
                    setInvalidMessage(`Número de NIT já existente em nossa base de dados.`);
                    setIsValid(false);
                    return;
                }

                if (parseInt(response.data.NIT_VALIDO) === 0) {
                    setInvalidMessage("Número de NIT inválido.");
                    setIsValid(false);
                    return;
                }
            })
            .catch(function (error) {
                toast.error("Erro ao validar NIT.");
                setLoading(false);
                console.error(error);
            });
    };

    return (
        <>
            <InputText
                value={value}
                mask={"numeric"}
                loading={loading}
                disabled={disabled}
                label={label || "NIT:"}
                id={id || "nr_documento_nit"}
                onChange={(id, value) => handleChange(id, value)}
            />
            {!isValid && <div className="text-xs text-red-600 font-semibold">{invalidMessage}</div>}
        </>
    );
};

export default InputNIT;
