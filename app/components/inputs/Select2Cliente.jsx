import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useEffect, useState } from "react";
import Select from "react-tailwindcss-select";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import axiosInstance from "@/plugins/axios";
import { cn, empty } from "@/assets/utils";

const Select2Cliente = ({cdPessoaCliente, onReady, isDisabled, ...props}) => {
    const [filter, setfilter] = useState("");
    const { toast } = useAppContext();
    const [clientes, setClientes] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [cancelTokenSource, setCancelTokenSource] = useState(null);
    const [ready, setReady] = useState(false);

    const handleChange = (value) => {
        const isValueValid = !empty(value);

        if (!isValueValid) {
            setSelectedOption(null);
            if (typeof props.onChange === "function") {
                props.onChange("", "");
            }
            return;
        }

        setSelectedOption(value);

        // Extrair o nome do cliente da label
        const nmCliente = value.label.split(" - ")[1];
        if (typeof props.onChange === "function") {
            props.onChange(value.value, nmCliente);
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

		if (typeof onReady === 'function') {
			onReady();
		}
	}, [ready]);

    useEffect(() => {
        if (filter.length < 3) return;

        getClientes();

        return () => {
            if (cancelTokenSource) {
                cancelTokenSource.cancel("Componente desmontado.");
            }
            setClientes([]);
        };
    }, [filter]);

    useEffect(() => {
        if (empty(cdPessoaCliente)) return;
        // Se cdPessoaCliente for fornecido, usar como filtro inicial para buscar o cliente
        setfilter(cdPessoaCliente);
    }, [cdPessoaCliente]);

    useEffect(() => {
        if (empty(cdPessoaCliente) || clientes.length === 0) return;
        
        // Encontrar o cliente correspondente no array de clientes
        const clienteEncontrado = clientes.find(cliente => cliente.CD_PESSOA === cdPessoaCliente);
        
        if (clienteEncontrado) {
            const optionValue = {
                value: clienteEncontrado.CD_PESSOA,
                label: `${clienteEncontrado.CD_PESSOA} - ${clienteEncontrado.NM_PESSOA}`,
            };
            setSelectedOption(optionValue);
        }
    }, [clientes, cdPessoaCliente]);

    const getClientes = async () => {
        if (cancelTokenSource) {
            cancelTokenSource.cancel("Operação cancelada devido a uma nova solicitação.");
        }

        const source = axios.CancelToken.source();
        setCancelTokenSource(source);
        setReady(false);

        const maxChars = props?.maxChars || 0;

        try {
            const response = await axiosInstance.get(`cliente/clientes/${filter}/${maxChars}`, {
                cancelToken: source.token,
            });
            setReady(true);
            setClientes(response.data);
        } catch (error) {
            setReady(true);
            if (!axios.isCancel(error)) {
                toast.error("Não foi possível carregar os clientes.");
                console.error(error);
            }
        }
    };

    useEffect(() => {
        // Se props.value for fornecido e for diferente de selectedOption atual
        if (props.value && props.value !== selectedOption?.value) {
            // Se props.value for um objeto, usar diretamente
            if (typeof props.value === 'object' && props.value.value && props.value.label) {
                setSelectedOption(props.value);
            } 
            // Se props.value for uma string, procurar nos clientes carregados
            else if (typeof props.value === 'string') {
                const clienteEncontrado = clientes.find(cliente => cliente.CD_PESSOA === props.value);
                if (clienteEncontrado) {
                    const optionValue = {
                        value: clienteEncontrado.CD_PESSOA,
                        label: `${clienteEncontrado.CD_PESSOA} - ${clienteEncontrado.NM_PESSOA}`,
                    };
                    setSelectedOption(optionValue);
                } else {
                    // Se não encontrou o cliente, usar o valor como filtro para buscar
                    setfilter(props.value);
                }
            }
        } else if (!props.value) {
            setSelectedOption(null);
        }
    }, [props.value, clientes]);
    
    return (
        <div className="w-full relative">
            {props?.label && <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
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
                    <FieldLabel className={cn(props?.required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
                        {props?.label || ""}
                    </FieldLabel>
                </label>
            </div>}
            <div className={`rounded border ${hasError() ? "border-red-500" : "border-white"}`}>
                <Select
                    id={props.id}
                    isDisabled={isDisabled}
                    loading={clientes.length === 0 && filter.length >= 3}
                    options={clientes?.map((cliente) => {
                        return {
                            value: cliente.CD_PESSOA,
                            label: `${cliente.CD_PESSOA} - ${cliente.NM_PESSOA}`,
                        };
                    })}
                    isClearable={true}
                    isSearchable={true}
                    value={selectedOption}
                    onChange={handleChange}
                    placeholder={"Selecione"}
                    searchInputPlaceholder={"Digite para filtrar"}
                    noOptionsMessage={"Nenhum registro encontrado"}
                    onSearchInputChange={(e) => {
                        setfilter(e.target.value);
                    }}
					classNames={{
                        menuButton: ({ isDisabled }) =>
                            `flex text-sm text-gray-900 border border-gray-300 rounded-lg shadow-sm transition-all duration-300 focus:outline-none h-[36px] ${
                                isDisabled
                                    ? "bg-gray-200"
                                    : "bg-white hover:border-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500/20"
                            } [&>*:first-child]:w-[88%] [&>*:nth-child(2)]:w-[12%] [&>*:nth-child(2)>*]:p-0`,
                        menu: "absolute z-20 w-full bg-white shadow-lg border rounded py-1 mt-1.5 text-sm text-gray-700",
                        list: "max-h-48 overflow-y-auto", // (opcional) limitar altura:
                    }}
                />
            </div>
            {renderError()}
            {props?.helperText && <div className="text-xs text-blue-600 absolute bottom-[-12px] right-0"> {props?.helperText} </div>}
        </div>
    );
};

export default Select2Cliente;
