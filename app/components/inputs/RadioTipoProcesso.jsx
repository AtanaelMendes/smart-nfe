import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import Radio from "./Radio";
import axiosInstance from "@/plugins/axios";
import { empty } from "@/assets/utils";

const RadioTipoProcesso = ({init, cdPessoaAnalista, cdPessoaCliente, vertical, ...props}) => {
    const { toast } = useAppContext();
    const [showComponent, setShowComponent] = useState(false);
    const [radios, setRadios] = useState([]);
    const [tiposProcesso, setTiposProcesso] = useState([]);

    const handleChange = (id, value, checked) => {
        let tempFormRadios = [...tiposProcesso];
        let selectedIndex = tiposProcesso.indexOf(
            tiposProcesso.find((current) => current.tipo == value)
        );
        tempFormRadios = tempFormRadios.map((tmpRadio) => {
            tmpRadio.checked = false;
            return tmpRadio;
        });
        tempFormRadios[selectedIndex].checked = true;
        setTiposProcesso(tempFormRadios);

        if (typeof props.onChange === "function") {
            props.onChange(id, value, checked);
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
        if (!init) return;
        if (empty(cdPessoaAnalista)) return;
        if (empty(cdPessoaCliente)) return;

        setShowComponent(false);
        getTiposProcesso();
    }, [cdPessoaAnalista, cdPessoaCliente, init]);
    
    const getTiposProcesso = () => {
        if (empty(cdPessoaCliente)) return toast.error("Selecione um cliente primeiro.");
        if (empty(cdPessoaAnalista)) return toast.error("Cód. do analista não informado.");

        axiosInstance
            .get(`agendamento/dados-tipo-processo/${cdPessoaCliente}/${cdPessoaAnalista}`)
            .then(function (response) {
                let qtdTipos = response.data.tipos_processos.length;

                // Verifica se a empresa selecionada é 80011 para remover a obrigatoriedade
                if (Number(cdPessoaCliente) === 80011) {
                    if (typeof props.IgnoreProcessType === "function") {
                        props.IgnoreProcessType(true); // Remove a obrigatoriedade
                    }
                } else {
                    // Define o campo como requerido apenas quando existir mais de 1 tipo
                    if (typeof props.IgnoreProcessType === "function") {
                        props.IgnoreProcessType(qtdTipos === 1);
                    }
                }

                //Se tiver mais que 1 tipo, mostra todas as opções para o usuário.
                setShowComponent(qtdTipos > 1);

                setRadios(response.data);

                let tiposProcesso = response.data.tipos_processos.map((tmpRadio) => {
                    tmpRadio.checked = tmpRadio.tipo == props.value;
                    return tmpRadio;
                });

                setTiposProcesso(tiposProcesso);
            })
            .catch(function (error) {
                toast.error("Não foi possível carregar os tipos de processo.");
                console.error(error);
            });
    };

    const renderRadiosTipoProcesso = () => {
        if (radios.isMod && radios.tipos_processos.length > 0) {
            return tiposProcesso?.map((tipoProc) => {
                let now = moment(new Date());
                return (
                    <div className="pb-1" key={`key_${tipoProc.tipo}_${now.format("DDMMYYYYHHms")}`}>
                        <Radio
                            id={`tipo_processo_${tipoProc.tipo}`}
                            name="tipo_processo"
                            label={tiposProcesso.find((temp) => temp.tipo == tipoProc.tipo).ds_tipo}
                            checked={
                                tiposProcesso.find((temp) => temp.tipo == tipoProc.tipo).checked
                            }
                            value={tiposProcesso.find((temp) => temp.tipo == tipoProc.tipo).tipo}
                            onChange={handleChange}
                        />
                    </div>
                );
            });
        }
    };

    return (
        <div className={`${showComponent ? "block" : "hidden"}`}>
            <div className="flex">
                <fieldset
                    className={`flex items-center border text-gray-900 text-sm rounded-lg w-full px-2 ${
                        hasError() ? "border-red-500" : "border-gray-300"
                    }`}
                >
                    <legend className="px-2">
                        <span className="inline-flex">
                            {props.required && (
                                <FontAwesomeIcon
                                    icon={faAsterisk}
                                    width="8"
                                    height="8"
                                    color="red"
                                    className="self-start mr-1"
                                />
                            )}
                            {props.label && <FieldLabel>{props.label || ""}</FieldLabel>}
                        </span>
                    </legend>
                    <div className={`inline-flex pb-2 ${vertical ? "flex-col" : "flex-row"}`}>
                        {renderRadiosTipoProcesso()}
                    </div>
                </fieldset>
            </div>
            {renderError()}
            {props?.helperText && <div className="text-xs text-blue-600"> {props.helperText} </div>}
        </div>
    );
};

export default RadioTipoProcesso;