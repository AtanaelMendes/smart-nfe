import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { useEffect, useState } from "react";
import Select from "react-tailwindcss-select";
import axiosInstance from "@/plugins/axios";
import { TooltipComponent } from "../Layouts/TooltipComponent";

const SelectIdiomas = (props) => {
  const [idiomas, setIdiomas] = useState([]);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const handleChange = (evt) => {
    setSelectedOption(evt);

    if (typeof props.onChange === "function") {
      props.onChange(props.id, evt ? evt.value : 0);
    }
  };

  const hasError = () => {
    return (
      props?.required &&
      props?.required.hasOwnProperty(props.id) &&
      props.required[props.id].error
    );
  };

  const renderError = () => {
    if (!hasError()) return;
    let errorMsg =
      props?.required[props.id].errorMsg || "Este campo é obrigatório";

    return <div className="text-xs text-red-600">{errorMsg}</div>;
  };

  useEffect(() => {
    if (props.options && props.options.length > 0) {
      setIdiomas(props.options);
    } else {
      getIdiomas();
    }
  }, []);

  useEffect(() => {
    setOptions(
      idiomas.map((idioma) => ({
        value: idioma.CD_IDIOMA.toString(),
        label: idioma.NM_IDIOMA.trim(),
      }))
    );
    setIsLoadingData(false);
  }, [idiomas]);

  useEffect(() => {
    if (props.value !== undefined) {
      const selected =
        options.find(
          (option) => parseInt(option.value) === parseInt(props.value)
        ) || null;
      setSelectedOption(selected);
    }
  }, [props.value, options]);

  const getIdiomas = async () => {
    setIsLoadingData(true);

    if (localStorage.getItem("idiomas")) {
      setIdiomas(JSON.parse(localStorage.getItem("idiomas")));
      return;
    }

    try {
      const storedIdiomas = localStorage.getItem("idiomas");

      if (storedIdiomas) {
        setIdiomas(JSON.parse(storedIdiomas));
        setIsLoadingData(false);
        localStorage.setItem(
          "idiomas",
          JSON.stringify(JSON.parse(storedIdiomas))
        );
      } else {
        const response = await axiosInstance.get("conhecimento/idiomas");
        if (response.data.length > 0) {
          setIdiomas(response.data);
          localStorage.setItem("idiomas", JSON.stringify(response.data));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingData(false);
    }
  };

  return (
    <>
      <label htmlFor={props.id} className="inline-flex">
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
      <div
        className={`rounded border ${
          hasError() ? "border-red-500" : "border-white"
        } ${props.className || ""}`}
      >
        <Select
          id={props.id}
          value={selectedOption}
          onChange={handleChange}
          options={options}
          isSearchable={true}
          placeholder={"Selecione"}
          isLoading={isLoadingData || false}
          noOptionsMessage={() => "Nenhum registro encontrado"}
          searchInputPlaceholder={"Digite para filtrar"}
          classNames={{
            menuButton: ({ isDisabled }) =>
              `flex text-sm text-gray-900 border border-gray-300 rounded-lg shadow-sm transition-all duration-300 focus:outline-none h-[36px] ${
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

export default SelectIdiomas;
