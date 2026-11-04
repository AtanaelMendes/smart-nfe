import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from '@fortawesome/free-solid-svg-icons';
import { FieldLabel } from '@/components/Layouts/Typography';
import { useCallback, useEffect, useState } from "react";
import Button from "@/components/buttons/Button";
import TimePicker from "./TimePicker";
import InputDate from "./InputDate";
import { cn } from "@/assets/utils";

const DataHora = (props) => {
    const [data, setData] = useState("");
    const [hora, setHora] = useState("");

    function hasError() {
        return props?.required && props?.required.hasOwnProperty(props.id) && props.required[props.id].error;
    }

    function renderError() {
        if (!hasError()) return;
        let errorMsg = props?.required[props.id].errorMsg || "Este campo é obrigatório";

        return (
            <div className="text-xs text-red-600">
                {errorMsg}
            </div>
        );
    }

    const setDataHoraAtual = useCallback(() => {
        let now = moment(new Date());
        setData(now.format('YYYY-MM-DD'));
        setHora(now.format('HH:mm'));
    });

    useEffect(() => {
        if (typeof props.onChangeFunction === 'function' && data != "" && hora != "") {
            props.onChangeFunction(data, hora);
        }
    }, [data, hora]);

    useEffect(() => {
        let defaultDate = '';
        let defaultTime = '';

        if (props.value) {
            let tempValue = props.value.split(' ');
            defaultDate = tempValue[0];
            defaultTime = tempValue[1];
        }

        setData(defaultDate);
        setHora(defaultTime);
    }, [props.value]);

    return (
        <div className="w-full relative">
            <div className='flex absolute top-[-6px] left-2 w-fit z-10 text-xs px-0.5 rounded-md mb-0 pb-0 text-nowrap before:bg-white before:top-0.5 before:left-0 before:absolute before:w-full before:h-[12px] before:-z-10 before:content-[""] before:rounded-lg'>
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
                    {props.label && <FieldLabel className={cn(props.required ? 'ml-4' : 'ml-0 mb-0 pb-0', 'text-gray-500')}>
                        {props.label || ''}
                    </FieldLabel>}
                </label>
            </div>
            <div className="flex">
                <div className="w-full">
                    <InputDate
                        id={`data_${props.id}`}
                        className={`${hasError() ? "border-red-500" : "border-gray-300"}`}
                        onChange={(id, value) => setData(value)}
                        value={data}
                        minDate={props.minDate}
                        maxDate={props.maxDate}
                    />
                </div>
                <div className="ml-4">
                    <TimePicker
                        id={`hora_${props.id}`}
                        className={`w-[80px] ${hasError() ? "border-red-500" : "border-gray-300"}`}
                        onChange={(id, value) => setHora(value)}
                        value={hora}
                    />
                </div>
                <div className="ml-4">
                    <Button className="rounded-lg whitespace-nowrap" buttonType="secondary" bordered onClick={() => { setDataHoraAtual(); }}>Data/Hora atual</Button>
                </div>
            </div>
            {renderError()}
            {props?.helperText && <div className="text-xs text-blue-600"> {props.helperText} </div>}
        </div>
    );
};

export default DataHora;
