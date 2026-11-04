import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useEffect, useState } from "react";
import Select from "react-tailwindcss-select";
import { useAppContext } from "@/context/AppContext";
import axiosInstance from "@/plugins/axios";
import { TooltipComponent } from "../Layouts/TooltipComponent";

const SelectUnidade = ({ init, required, type, value, ...props }) => {
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);
    const { toast, user } = useAppContext();
    const [unidades, setUnidades] = useState([]);
    const [options, setOptions] = useState([]);

    const handleChange = (evt) => {
        setSelectedOption(evt ? { value: evt.value, label: evt.label } : null);
        if (typeof props.onChange == "function") {
            props.onChange(props.id, evt ? evt.value : null);
        }
    };

    function hasError() {
        return required && required.hasOwnProperty(props.id) && required[props.id].error;
    }

    function renderError() {
        if (!hasError()) return;
        let errorMsg = required[props.id].errorMsg || "Este campo é obrigatório";

        return <div className="text-xs text-red-600">{errorMsg}</div>;
    }

    useEffect(() => {
        setSelectedOption(options.find((item) => item.value == value) || null);
    }, [value, options]);

    useEffect(() => {
        setOptions(
            unidades?.map((unidade) => {
                return {
                    value: unidade.CD_EMPRESA_AGRUPADORA,
                    label: unidade.NM_EMPRESA,
                };
            })
        );
    }, [unidades]);

    useEffect(() => {
        if (init) {
            switch (type) {
                case "SELECIONADOR":
                    getUnidadesPorSelecionador();
                    break;
                default:
                    getUnidadesPorUsuario();
                    break;
            }
        }
    }, [init]);

    const getUnidadesPorSelecionador = () => {
        setIsLoadingData(false);
        axiosInstance
            .get(`unidade/unidades-selecionador/${user.cd_sip}`)
            .then(function (response) {
                setIsLoadingData(true);
                if (response.status === 200) {
                    setUnidades(response.data);
                }
            })
            .catch(function (resp) {
                setIsLoadingData(true);
                let error = resp?.response?.data?.error;
                if (Array.isArray(error)) {
                    return toast.error(
                        error.join(" ") ||
                            "OOps ocorreu um erro ao buscar unidades por selecionador"
                    );
                }
                return toast.error(
                    error || "OOps ocorreu um erro ao buscar unidades por selecionador"
                );
            });
    };

    const getUnidadesPorUsuario = () => {
        setIsLoadingData(false);
        axiosInstance
            .get(`unidade/lista-unidades/${user.user_sip}`)
            .then(function (response) {
                setIsLoadingData(true);
                if (response.status === 200) {
                    setUnidades(response.data);
                }
            })
            .catch(function (resp) {
                setIsLoadingData(true);
                let error = resp?.response?.data?.error;
                if (Array.isArray(error)) {
                    return toast.error(
                        error.join(" ") || "OOps ocorreu um erro ao buscar as unidade por usuario"
                    );
                }
                return toast.error(
                    error || "OOps ocorreu um erro ao buscar as unidade por usuario"
                );
            });
    };

    return (
        <>
            <label htmlFor={props.id} className={`inline-flex relative ${required ? "pl-3" : ""}`}>
                {required && (
                    <FontAwesomeIcon
                        icon={faAsterisk}
                        width="10"
                        height="10"
                        color="red"
                        className="left-0 absolute"
                    />
                )}
                {props?.label && <FieldLabel>{props?.label || ""}</FieldLabel>}
                {props?.hint && (
                    <>
                        <TooltipComponent
                            content={<div className="text-xs z-20 max-w-[300px]">{props.hint}</div>}
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
            </label>
            <div
                className={`rounded border ${hasError() ? "border-red-500" : "border-white"} ${
                    props.className || ""
                }`}
            >
                <Select
                    id={props.id}
                    name={props.id}
                    isClearable={true}
                    isDisabled={props.isDisabled || false}
                    isSearchable={true}
                    value={selectedOption}
                    onChange={handleChange}
                    options={options}
                    placeholder={"Selecione"}
                    loading={!isLoadingData}
                    noOptionsMessage={"Nenhum registro encontrado"}
                    searchInputPlaceholder={"Digite para filtrar"}
                    classNames={{
                        menuButton: ({ isDisabled }) =>
                            `flex text-sm text-gray-900 border border-gray-300 rounded-lg shadow-sm transition-all duration-300 focus:outline-none h-[36px] w-full ${
                                isDisabled
                                    ? "bg-gray-200"
                                    : "bg-white hover:border-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500/20"
                            }`,
                        menu: "absolute z-20 w-full bg-white shadow-lg border rounded py-1 mt-1.5 text-sm text-gray-700",
                        list: "max-h-48 overflow-y-auto", // (opcional) limitar altura:
                    }}
                />
            </div>
            {renderError()}
            {props?.helperText && <div className="text-xs text-blue-600"> {props.helperText} </div>}
        </>
    );
};

export default SelectUnidade;
