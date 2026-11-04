import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useEffect, useState } from "react";
import Select from "react-tailwindcss-select";
import axiosInstance from "@/plugins/axios";
import { TooltipComponent } from "../Layouts/TooltipComponent";

const SelectTestes = (props) => {
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedOption, setSelectedOption] = useState({});
  const [testes, setTestes] = useState([]);
  const [ready, setReady] = useState(false);
  const [options, setOptions] = useState([]);

  const handleChange = (evt) => {
    setSelectedOption({ value: evt.value, label: evt.label, type: evt.type });

    if (typeof props.onChange == "function") {
      props.onChange(props.id, evt.value, evt.type);
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
    getTestes();
  }, [props?.cdTeste, props?.value, props?.active]);

  useEffect(() => {
    if (testes.length == 0 && props.active && !ready) {
      getTestes();
    }
  }, [props.active, ready]);

  useEffect(() => {
    setOptions(
      testes?.map((teste) => {
        return {
          value: teste.CD_TESTE,
          type: teste.ID_TIPO_TESTE,
          label: teste.DS_TESTE.trim(),
        };
      })
    );

    setIsLoadingData(false);
  }, [testes]);

  useEffect(() => {
    //Se foi passado um valor para este campo
    if (props.value) {
      let allOptions = { ...options };

      for (let [index, option] of Object.entries(allOptions)) {
        if (parseInt(option.value) == parseInt(props.value)) {
          setSelectedOption(option);
          break;
        }
      }
    }
  }, [options]);

  const getTestes = async () => {
    if (props?.cdPessoaCandidato > 0 && props.active) {
      setIsLoadingData(true);
      try {
        const response = await axiosInstance.get(
          `teste/lista-testes/${props.cdPessoaCandidato}/${props?.cdTeste || 0}`
        );
        if (response.data.length > 0) {
          setTestes(response.data);
          setReady(true);
        }
      } catch (error) {
        setIsLoadingData(false);
        console.error(error);
      }
    }
  };

  useEffect(() => {
    if (typeof props.setLimparOpcoes === "function") {
      setSelectedOption({});
      props.setLimparOpcoes(false);
    }
  }, [props?.limparOpcoes]);

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
      <div>
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
              `flex text-sm text-gray-900 border ${
                hasError() ? "border-red-500" : "border-gray-300"
              } rounded-lg shadow-sm transition-all duration-300 focus:outline-none h-[36px] ${
                isDisabled
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
      {props?.helperText && (
        <div className="text-xs text-blue-600"> {props.helperText} </div>
      )}
    </>
  );
};

export default SelectTestes;
