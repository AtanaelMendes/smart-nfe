import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useAppContext } from "@/context/AppContext";
import Select from "react-tailwindcss-select";
import { useEffect, useState } from "react";
import axiosInstance from "@/plugins/axios";
import { empty } from "@/assets/utils";
import axios from 'axios'

/**
 * Este componente busca as vagas abertas a partir do numero da vaga, código do analista ou nome do analista
 * Apenas serão listadas vagas das unidades em que o usuário que fez a busca tem acesso
 */

const Select2VagaAnalista = ({ tipoVaga, placeholder, isClearable, value, ...props }) => {
    const { toast, user } = useAppContext();
    const [vagas, setVagas] = useState([]);
    const [filter, setfilter] = useState("");
    const [options, setOptions] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [cancelTokenSource, setCancelTokenSource] = useState(null)

    const handleChange = (evt) => {
        setSelectedOption({ value: evt?.value || "", label: evt?.label || "" });
        setfilter("");

        if (typeof props.onChange === "function") {
            props.onChange(evt?.value || "");
        }
    };

    useEffect(() => {
        if (empty(value)) {
            setSelectedOption({ value: "", label: "" });
        }
    }, [value]);

    useEffect(() => {
        if (filter.length < 3) {
            setVagas([]);
            return;
        }

        getVagasAnalista();

        return () => {
            if (cancelTokenSource) {
                cancelTokenSource.cancel('Componente desmontado.');
            }
        }
    }, [filter]);

    const getVagasAnalista = async () => {
        if (cancelTokenSource) {
            cancelTokenSource.cancel('Operação cancelada devido a uma nova solicitação.')
        }

        const source = axios.CancelToken.source();
        setCancelTokenSource(source);

        try {
			const response = await axiosInstance.get(`recrutamento/vagas-relacionar/${user.user_sip}/${filter}`, {
				cancelToken: source.token,
			})
			setVagas(response.data);
		} catch (error) {
			if (!axios.isCancel(error)) {
				toast.error("Não foi possível carregar as vagas.");
				console.error(error);
                setVagas([]);
			}
		}
    };

    useEffect(() => {
        setOptions(
            vagas?.map((vaga) => {
                return {
                    value: vaga.NR_VAGA,
                    label: `${vaga.NR_VAGA} - ${vaga.NM_CARGO} - ${vaga.NM_CLIENTE}`,
                };
            })
        );
    }, [vagas]);

    return (
        <>
            <label htmlFor={props.id} className="inline-flex">
                {props?.required && (
                    <FontAwesomeIcon
                        icon={faAsterisk}
                        width="10"
                        height="10"
                        color="red"
                        className="self-start mr-1"
                    />
                )}
                {props?.label && <FieldLabel>{props?.label || ""}</FieldLabel>}
            </label>
            <Select
                isClearable={isClearable}
                id={props.id}
                value={selectedOption}
                onChange={handleChange}
                options={options}
                isSearchable={true}
                onSearchInputChange={(e) => {
                    setfilter(e.target.value);
                }}
                placeholder={placeholder || "Selecione"}
                noOptionsMessage={"Nenhum registro encontrado"}
                searchInputPlaceholder={"Digite para filtrar"}
            />
        </>
    );
};

export default Select2VagaAnalista;
