import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useEffect, useState } from "react";
import Select from "react-tailwindcss-select";
import { useAppContext } from "@/context/AppContext";
import axiosInstance from "@/plugins/axios";
import { cn } from "@/assets/utils";
import { TooltipComponent } from "../Layouts/TooltipComponent";

const SelectCidadeFilter = ({onChange, id, required, value, label, hint, className, helperText, placeholder }) => {
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [selectedOption, setSelectedOption] = useState(null);
    const { user } = useAppContext();
    const [cidades, setCidades] = useState([]);
    const [options, setOptions] = useState([]);

    const handleChange = (evt) => {
        setSelectedOption(evt ? { value: evt.value, label: evt.label } : null);
    
        if (typeof onChange === "function") {
            evt ? onChange(id, evt.value) : onChange(id, null);
        }
    };

    function hasError() {
        return (
            required &&
            required.hasOwnProperty(id) &&
            required[id].error
        );
    }

    function renderError() {
        if (!hasError()) return;
        let errorMsg = required[id].errorMsg || "Este campo é obrigatório";

        return <div className="text-xs text-red-600">{errorMsg}</div>;
    }
    
    const getCidades = async () => {
        setIsLoadingData(true);

        try {
            const response = await axiosInstance.get(`cidades/filtro-cidade/${user.user_sip}`);

            if (response.data.length > 0) {
                setCidades(response.data);
            }
        } catch (error) {
            setIsLoadingData(false);
            console.error(error);
        }
    };

    useEffect(() => {
        getCidades();
    }, []);

    useEffect(() => {
        setOptions(
            cidades?.map((cidade) => {
                return {
                    value: cidade.CD_EMPRESA,
                    label: `${cidade.CD_UF} - ${cidade.NM_EMPRESA_MENU.trim()}`, 
                };
            })
        );
    }, [cidades]);

    useEffect(() => {
        //Se foi passado um valor para este campo
        if (value) {
            let todasCidades = { ...options };
            for (let [index, cidade] of Object.entries(todasCidades)) {
                if (cidade.value === value) {
                    setSelectedOption(cidade);
                    break;
                }
            }
        }
        

        setTimeout(() => {
            setIsLoadingData(false);
        }, 500);
    }, [options, value]);

    return (
        <div className="w-full relative">
            {label && <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
                <label htmlFor={id} className="inline-flex">
                    <FieldLabel className={cn(required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
                        {label || ""}
                    </FieldLabel>
                    {hint && (
                        <>
                            <TooltipComponent
                                content={<div className="text-xs z-20 max-w-[300px]">{hint}</div>}
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
            </div>}
            <div className={`rounded border ${hasError() ? "border-red-500" : "border-white"} ${className || ""}`}>
                <Select
                    id={id}
                    value={selectedOption}
                    onChange={handleChange}
                    options={options}
                    isSearchable={true}
                    placeholder={isLoadingData ? "Carregando..." : (placeholder || "Selecione")}
                    isClearable={true}
                    loading={isLoadingData || false}
                    noOptionsMessage={"Nenhum registro encontrado"}
                    searchInputPlaceholder={"Digite para filtrar"}
                    classNames={{
                        menuButton: ({ isDisabled }) =>
                            `flex text-sm text-gray-900 border border-gray-300 rounded-lg shadow-sm transition-all duration-300 focus:outline-none h-[34px] ${
                                isDisabled
                                    ? "bg-gray-200"
                                    : "bg-white hover:border-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500/20"
                            }`,
                        menu: "absolute z-20 w-full bg-white shadow-lg border rounded py-1 mt-1.5 text-sm text-gray-700",
                        list: "max-h-48 overflow-y-auto", // (opcional) limitar altura:
                    }}
                />
            </div>
            {helperText && <div className="text-xs text-blue-600 absolute bottom-[-12px] right-0"> {helperText} </div>}
            {renderError()}
        </div>
    );
};

export default SelectCidadeFilter;
