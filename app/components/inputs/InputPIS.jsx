import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { empty } from "@/assets/utils";
import InputText from "./InputText";
import axiosInstance from "@/plugins/axios";

const InputPIS = ({ value, label, onChange, id, cdPessoa, isValidValue }) => {
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
            validaPIS(value);
        }

        if (typeof onChange == "function") {
            onChange(id, value);
        }
    };

    const validaPIS = (nrPIS) => {
        setLoading(true);

        axiosInstance
            .get(`documento/valida-pis/${nrPIS}/${cdPessoa || 0}`)
            .then(function (response) {
                setLoading(false);

                if (empty(response.data)) {
                    setIsValid(true);
                    return;
                }

                if (!empty(response.data.NM_PESSOA)) {
                    toast.error(`PIS já cadastrado para ${response.data.NM_PESSOA}`);
                    setInvalidMessage(`Número de PIS já existente em nossa base de dados.`);
                    setIsValid(false);
                    return;
                }

                if (parseInt(response.data.PIS_VALIDO) === 0) {
                    setInvalidMessage("Número de PIS inválido.");
                    setIsValid(false);
                    return;
                }
            })
            .catch(function (error) {
                toast.error("Erro ao validar PIS.");
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
                label={label || "PIS:"}
                id={id || "nr_documento_pis"}
                onChange={(id, value) => handleChange(id, value)}
            />
            {!isValid && <div className="text-xs text-red-600 font-semibold">{invalidMessage}</div>}
        </>
    );
};

export default InputPIS;
