import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useEffect, useState } from "react";
import Select from "react-tailwindcss-select";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import axiosInstance from "@/plugins/axios";
import { cn, empty } from "@/assets/utils";

const Select2Candidato = ({cdPessoaCandidato, onChange, onReady, isDisabled, ...props}) => {
    const [filter, setfilter] = useState("");
    const { toast } = useAppContext();
    const [candidatos, setCandidatos] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [cancelTokenSource, setCancelTokenSource] = useState(null);
    const [ready, setReady] = useState(false);

    const handleChange = (evt) => {
        const isValueValid = !empty(evt);

        if (!isValueValid) {
            setSelectedOption(null);
            if (typeof onChange === "function") {
                onChange("");
            }
            return;
        }

        setSelectedOption({ value: evt.value, label: evt.label });
        setfilter("");

        if (typeof onChange === "function") {
            onChange(evt.value);
        }
    };

    function hasError() {
        return (
            props?.required &&
            props?.required.hasOwnProperty(props.id) &&
            props.required[props.id].error
        );
    }

    function renderError() {
        if (!hasError()) return;
        let errorMsg = props?.required[props.id].errorMsg || "Este campo é obrigatório";

        return <div className="text-xs text-red-600">{errorMsg}</div>;
    }

    useEffect(() => {
        if (!ready) return;
        if (typeof onReady === "function") {
            onReady();
        }
    }, [ready]);

    useEffect(() => {
        if (empty(cdPessoaCandidato)) return;
        // Se cdPessoaCandidato for fornecido, usar como filtro inicial para buscar o candidato
        setfilter(cdPessoaCandidato);
    }, [cdPessoaCandidato]);

    useEffect(() => {
        if (empty(cdPessoaCandidato) || candidatos.length === 0) return;
        
        // Encontrar o candidato correspondente no array de candidatos
        const candidatoEncontrado = candidatos.find(candidato => candidato.CD_PESSOA === cdPessoaCandidato);
        
        if (candidatoEncontrado) {
            const optionValue = {
                value: candidatoEncontrado.CD_PESSOA,
                label: `${candidatoEncontrado.CD_PESSOA} - ${candidatoEncontrado.NM_PESSOA}`,
            };
            setSelectedOption(optionValue);
        }
    }, [candidatos, cdPessoaCandidato]);

    useEffect(() => {
        if (filter.length < 3) return;

        getCandidatos();

        // Limpar o cancel token ao desmontar o componente
        return () => {
            if (cancelTokenSource) {
                cancelTokenSource.cancel("Componente desmontado.");
            }
            setCandidatos([]);
        };
    }, [filter]);

    useEffect(() => {
        // Se props.value for fornecido e for diferente de selectedOption atual
        if (props.value && props.value !== selectedOption?.value) {
            // Se props.value for um objeto, usar diretamente
            if (typeof props.value === 'object' && props.value.value && props.value.label) {
                setSelectedOption(props.value);
            } 
            // Se props.value for uma string, procurar nos candidatos carregados
            else if (typeof props.value === 'string') {
                const candidatoEncontrado = candidatos.find(candidato => candidato.CD_PESSOA === props.value);
                if (candidatoEncontrado) {
                    const optionValue = {
                        value: candidatoEncontrado.CD_PESSOA,
                        label: `${candidatoEncontrado.CD_PESSOA} - ${candidatoEncontrado.NM_PESSOA}`,
                    };
                    setSelectedOption(optionValue);
                } else {
                    // Se não encontrou o candidato, usar o valor como filtro para buscar
                    setfilter(props.value);
                }
            }
        } else if (!props.value) {
            setSelectedOption(null);
        }
    }, [props.value, candidatos]);

    const getCandidatos = async () => {
        if (cancelTokenSource) {
            cancelTokenSource.cancel("Nova solicitação de candidatos.");
        }

        // Criar um novo CancelToken
        const source = axios.CancelToken.source();
        setCancelTokenSource(source);

        try {
            setReady(false);
            const response = await axiosInstance.get(`/candidato/candidatos/${filter}`, {
                cancelToken: source.token,
            });
            setCandidatos(response.data);
            setReady(true);
        } catch (error) {
            setReady(true);
            if (!axios.isCancel(error)) {
                toast.error("Não foi possível carregar os candidatos.");
                console.error(error);
            }
        }
    };

    return (
        <div className="relative w-full">
            <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
                <label htmlFor={props.id} className="inline-flex relative">
                    {props?.required && (
                        <FontAwesomeIcon
                            icon={faAsterisk}
                            width="8"
                            height="8"
                            color="red"
                            className="self-start absolute"
                        />
                    )}
                    {props.label && <FieldLabel className={cn(props.required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
                        {props.label || ''}
                    </FieldLabel>}
                </label>
            </div>
            <div className={`rounded border ${hasError() ? "border-red-500" : "border-white"}`}>
                <Select
                    isDisabled={isDisabled}
                    id={props.id}
                    loading={candidatos.length === 0 && filter.length >= 3}
                    value={selectedOption}
                    onChange={handleChange}
                    isClearable={true}
                    options={
                        candidatos?.map((candidato) => {
                            return {
                                value: candidato.CD_PESSOA,
                                label: `${candidato.CD_PESSOA} - ${candidato.NM_PESSOA}`,
                            };
                        })
                    }
                    isSearchable={true}
                    onSearchInputChange={(e) => {
                        setfilter(e.target.value);
                    }}
                    placeholder={"Selecione"}
                    noOptionsMessage={"Nenhum registro encontrado"}
                    searchInputPlaceholder={"Digite para filtrar"}
					classNames={{
                        menuButton: ({ isDisabled }) =>
                            `flex text-sm text-gray-900 border border-gray-300 rounded-lg shadow-sm transition-all duration-300 focus:outline-none h-[36px] ${
                                isDisabled
                                    ? "bg-gray-200"
                                    : "bg-white hover:border-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500/20"
                            } [&>*:first-child]:w-[88%] [&>*:nth-child(2)]:w-[12%] [&>*:nth-child(2)>*]:p-0`,
                        menu:
                            "absolute z-20 w-full bg-white shadow-lg border rounded py-1 mt-1.5 text-sm text-gray-700",
                        list: "max-h-48 overflow-y-auto", // (opcional) limitar altura:
                    }}
                />
            </div>
            {renderError()}
            {props?.helperText && <div className="text-xs text-blue-600"> {props.helperText} </div>}
        </div>
    );
};

export default Select2Candidato;
