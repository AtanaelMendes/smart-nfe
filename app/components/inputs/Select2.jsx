import Fieldset from "./Fieldset";
import { useEffect, useState } from "react";
import Select from "react-tailwindcss-select";

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
    <Fieldset control id={props.id} label={props.label} required={!!props.required} disabled={props.disabled} error={hasError() ? props.required[props.id].errorMsg || 'Este campo é obrigatório' : undefined} helperText={props.helperText} hint={props.hint}>
        <Select
          id={props.id}
          isDisabled={props.disabled}
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
            menuButton: ({ isDisabled }) => `flex min-h-12 rounded-md border-0 bg-transparent text-sm text-slate-900 dark:text-slate-100 focus:outline-none ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`,
            menu: 'absolute z-30 mt-1.5 w-full rounded-lg border border-slate-200 bg-white py-1 text-sm text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
            // (opcional) limitar altura:
            list: "max-h-64 overflow-y-auto",
          }}
        />
    </Fieldset>
  );
};
export default Select2;
