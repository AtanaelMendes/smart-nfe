import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from '@fortawesome/free-solid-svg-icons';
import { FieldLabel } from '@/components/Layouts/Typography';
import { useEffect, useState } from "react";
import Select from "react-tailwindcss-select";
import { useAppContext } from "@/context/AppContext";
import axiosInstance from "@/plugins/axios";

const Select2CargosSip = ({init, required, value, ...props}) => {
    const [cargosSip, setCargosSip] = useState([]);
    const { toast } = useAppContext();
    const [selectedOption, setSelectedOption] = useState({});
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [options, setOptions] = useState([]);

    function getCargosSip() {
        setIsLoadingData(false);
        axiosInstance.get(`cargo/sip-cargos`)
            .then(function (response) {
                setIsLoadingData(true);
                if (response.status === 200) {
                    setCargosSip(response.data);
                }
            }).catch(function (resp) {
                setIsLoadingData(true);
                let error = resp?.response?.data?.error;
                if (Array.isArray(error)) {
                    return toast.error(error.join(" ") || "OOps ocorreu um erro ao buscar os cargos");
                }
                return toast.error(error || "OOps ocorreu um erro ao buscar os cargos");
            });
    }

    useEffect(() => {
        if (init) {
            getCargosSip();
        }
    }, [init]);

    useEffect(() => {
        setOptions(cargosSip?.map((cargo) => {
            return {
                value: cargo.CD_CARGO,
                label: `${cargo.CD_CARGO} - ${cargo.NM_CARGO}`
            }
        }));
    }, [cargosSip]);

    useEffect(() => {
        setSelectedOption(options.find(item => item.value == value) || {});
    }, [value]);

    const handleChange = (evt) => {
        setSelectedOption({ value: evt.value, label: evt.label });
        if (typeof props.onChange == 'function') {
            props.onChange(props.id, evt.value);
        }
    }

    function hasError() {
        return props?.required && props?.required.hasOwnProperty(props.id) && props.required[props.id].error;
    }

    function renderError() {
        if (!hasError()) return;
        const errorMsg = props?.required[props.id].errorMsg || "Este campo é obrigatório";

        return (
            <div className="text-xs text-red-600">
                {errorMsg}
            </div>
        )
    }

    return (
        <div className="w-full relative">
            <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
                <label htmlFor={props.id} className={`inline-flex relative ${required ? "pl-3" : ""}`}>
                    {required && <FontAwesomeIcon icon={faAsterisk} width="10" height="10" color="red" className="left-0 absolute" />}
                    {props?.label && <FieldLabel className={cn(required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
                        {props?.label || ""}
                    </FieldLabel>}
                </label>
            </div>
            <div className={`rounded border ${hasError() ? "border-red-500" : "border-white"}`}>
                <Select
                    id={props.id}
                    isClearable={true}
                    isSearchable={true}
                    value={selectedOption}
                    onChange={handleChange}
                    loading={!isLoadingData}
                    options={options}
                    placeholder={'Selecione'}
                    noOptionsMessage={'Nenhum registro encontrado'}
                    searchInputPlaceholder={'Digite para filtrar'}
                />
            </div>
            {renderError()}
            {props?.helperText && <div className="text-xs text-blue-600 absolute bottom-[-12px] right-0"> {props?.helperText} </div>}
        </div>
    );
};

export default Select2CargosSip;