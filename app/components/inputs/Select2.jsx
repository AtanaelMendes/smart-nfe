import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useCallback, useEffect, useState } from "react";
import Select from "react-tailwindcss-select";
import { TooltipComponent } from "../Layouts/TooltipComponent";
import { cn } from "@/assets/utils";

const Select2 = (props) => {
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState({});

  const handleChange = (evt) => {
    if (!evt) {
      setSelectedOption({});
      return;
    }

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
    if (props.clearSelectdValue) {
      setSelectedOption({});
    }
  }, [props?.clearSelectdValue]);

  useEffect(() => {
    if (props.options.length > 0) {
      setOptions(
        props.options?.map((option) => {
          return {
            value: option.value,
            label: option.label.trim(),
          };
        })
      );
    }
  }, [props?.options]);

  useEffect(() => {
    //Se foi passado um valor para este campo
    if (props.value) {
      let allOptions = { ...options };

      for (let [index, option] of Object.entries(allOptions)) {
        if (option.value == props.value) {
          setSelectedOption(option);
          break;
        }
      }
    }
  }, [options, props?.value]);

  return (
    <div className="w-full relative">
      {props?.label && <div className='flex absolute top-[-9px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
        <label htmlFor={props.id} className="inline-flex">
          <FieldLabel className={cn(props?.required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
            {props?.label || ""}
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
          options={options}
          isClearable={true}
          isSearchable={true}
          value={selectedOption}
          onChange={handleChange}
          placeholder={"Selecione"}
          searchInputPlaceholder={"Digite para filtrar"}
          noOptionsMessage={"Nenhum registro encontrado"}
					// <- HELP - 553263: Estavam passando className (singular), mas o componente espera classNames (plural) para sobrescrever as partes internas.
					classNames={{
            menuButton: ({ isDisabled }) =>
              `flex text-sm text-gray-900 border border-gray-300 rounded-lg shadow-sm transition-all duration-300 focus:outline-none h-[36px] ${
                isDisabled
                  ? "bg-gray-200"
                  : "bg-white hover:border-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500/20"
              }`,
							/**	
							 * <- HELP - 553263: ESTE é o overlay das opções (dropdown)
							 * No código da lib o dropdown usa classNames?.menu e, se não vier, cai no default "absolute z-10 ..."
							 * */ 
            menu:
              "absolute z-20 w-full bg-white shadow-lg border rounded py-1 mt-1.5 text-sm text-gray-700",
            // (opcional) limitar altura:
            list: "max-h-64 overflow-y-auto",
          }}
        />
      </div>
      {renderError()}
      {props?.helperText && <div className="text-xs text-blue-600 absolute bottom-[-12px] right-0"> {props.helperText} </div>}
    </div>
  );
};

export default Select2;
