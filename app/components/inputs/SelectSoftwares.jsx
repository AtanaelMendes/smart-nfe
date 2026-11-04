import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useEffect, useState } from "react";
import Select from "react-tailwindcss-select";
import axiosInstance from "@/plugins/axios";
import { TooltipComponent } from "../Layouts/TooltipComponent";
import { cn } from "@/assets/utils";

const SelectSoftwares = (props) => {
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [selectedOption, setSelectedOption] = useState({});
    const [softwares, setSoftwares] = useState([]);
    const [options, setOptions] = useState([]);

    const handleChange = (evt) => {
        setSelectedOption({ value: evt.value, label: evt.label });

        if (typeof props.onChange == "function") {
            props.onChange(props.id, evt.value);
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
        let errorMsg =
            props?.required[props.id].errorMsg || "Este campo é obrigatório";

        return <div className="text-xs text-red-600">{errorMsg}</div>;
    }

    useEffect(() => {
        if (props.options.length > 0) {
            setSoftwares(props.options);
        } else {
            getSoftwares();
        }
    }, []);

    useEffect(() => {
        setOptions(
            softwares?.map((software) => {
                return {
                    value: software.CD_CONHECIMENTO,
                    label: software.NM_CONHECIMENTO.trim(),
                };
            })
        );

        setIsLoadingData(false);
    }, [softwares]);

    useEffect(() => {
        //Se foi passado um valor para este campo
        if (props.value) {
            let todosSoftwares = { ...options };

            for (let [index, software] of Object.entries(todosSoftwares)) {
                if (parseInt(software.value) == parseInt(props.value)) {
                    setSelectedOption(software);
                    break;
                }
            }
        }
    }, [options]);

    const getSoftwares = async () => {
        setIsLoadingData(true);
        try {
            const response = await axiosInstance.get(`conhecimento/softwares`);
            if (response.data.length > 0) {
                setSoftwares(response.data);
            }
        } catch (error) {
            setIsLoadingData(false);
            console.error(error);
        }
    };

    return (
        <div className="w-full relative">
            {props?.label && <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
                <label htmlFor={props.id} className="inline-flex">
                    <FieldLabel className={cn(props?.required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
                        {props.label || ""}
                    </FieldLabel>
                    {props?.hint && (
                        <>
                            <TooltipComponent
                                content={
                                    <div className="text-xs z-20 max-w-[300px]">{props.hint}</div>
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
                </label>
            </div>}
            <div className={`rounded border ${hasError() ? "border-red-500" : "border-white"} ${props.className || ""}`}>
                <Select
                    id={props.id}
                    value={selectedOption}
                    onChange={handleChange}
                    options={options}
                    isSearchable={true}
                    placeholder={"Selecione"}
                    loading={isLoadingData || false}
                    noOptionsMessage={"Nenhum registro encontrado"}
                    searchInputPlaceholder={"Digite para filtrar"}
                    classNames={{
                        menuButton: ({ isDisabled }) =>
                            `flex text-sm text-gray-900 border border-gray-300 rounded-lg shadow-sm transition-all duration-300 focus:outline-none h-[36px] ${isDisabled
                                ? "bg-gray-200"
                                : "bg-white hover:border-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500/20"
                            }`,
                        menu:
                            "absolute z-20 w-full bg-white shadow-lg border rounded py-1 mt-1.5 text-sm text-gray-700",
                        list: "max-h-48 overflow-y-auto", // (opcional) limitar altura:
                    }}
                />
            </div>
            {renderError()}
            {props?.helperText && <div className="text-xs text-blue-600 absolute bottom-[-12px] right-0"> {props.helperText} </div>}
        </div>
    );
};

export default SelectSoftwares;
