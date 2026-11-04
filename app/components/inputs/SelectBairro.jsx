import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useCallback, useEffect, useState } from "react";
import Select from "react-tailwindcss-select";

import { cn, empty } from "@/assets/utils";
import { TooltipComponent } from "../Layouts/TooltipComponent";

const SelectBairro = (props) => {
    const [bairros, setBairros] = useState([]);
    const [options, setOptions] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [selectedOption, setSelectedOption] = useState({});

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
        if (props?.options) {
            setBairros(props.options);
        }
    }, [props.options]);

    useEffect(() => {
        if (bairros.length > 0) {
            setIsLoadingData(true);

            setOptions(
                bairros?.map((bairro) => {
                    return {
                        value: bairro.NM_BAIRRO,
                        label: bairro.NM_BAIRRO,
                    };
                })
            );
        }

        setIsLoadingData(false);
    }, [bairros]);

    useEffect(() => {
        if (!empty(props.value) && typeof props.value === "string") {
            setSelectedOption({
                value: props.value,
                label: props.value,
            });
            return;
        }

        setSelectedOption(props.value || null);
    }, [props.value]);

    return (
        <div className="relative w-full">
            {props.label && (
                <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
                    <label htmlFor={props.id}>
                        <FieldLabel className={cn(props?.required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
                            {props.label || ""}
                        </FieldLabel>
                    </label>
                    {props?.required && (
                        <FontAwesomeIcon
                            icon={faAsterisk}
                            width="10"
                            height="10"
                            color="red"
                            className="self-start absolute"
                        />
                    )}
                    {props?.hint && (
                        <>
                            <FontAwesomeIcon
                                icon={faInfoCircle}
                                width="16"
                                height="16"
                                color="blue"
                                className="self-start ml-2"
                                tabIndex={-1}
                            />
                            <TooltipComponent
                                content={
                                    <div className="text-xs z-20 max-w-[300px]">
                                        {props?.hint}
                                    </div>
                                }
                                asChild
                            >

                            </TooltipComponent>
                        </>
                    )}
                </div>
            )}
            <div className={`rounded-lg border ${hasError() ? "border-red-500" : "border-white"}`}>
                <Select
                    id={props.id}
                    loading={isLoadingData || false}
                    value={selectedOption}
                    onChange={handleChange}
                    options={options}
                    isSearchable={true}
                    placeholder={"Selecione"}
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

export default SelectBairro;
