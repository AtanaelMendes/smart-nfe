import { useCallback, useEffect, useState } from "react";
import Button from "@/components/buttons/Button";
import TimePicker from "./TimePicker";
import InputDate from "./InputDate";

const DataHora = (props) => {
    const [data, setData] = useState("");
    const [hora, setHora] = useState("");

    function hasError() {
        return props?.required && props?.required.hasOwnProperty(props.id) && props.required[props.id].error;
    }

    const setDataHoraAtual = useCallback(() => {
        const now = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        setData(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
        setHora(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
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
        <div className="w-full space-y-1.5">
            <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-40 flex-1"><InputDate id={`data_${props.id}`} label={props.label || 'Data'} value={data} onChange={(_id, value) => setData(value)} error={hasError() ? props.required[props.id].errorMsg || 'Verifique a data.' : undefined} /></div>
                <div className="w-32"><TimePicker id={`hora_${props.id}`} label="Horário" value={hora} onChange={(_id, value) => setHora(value)} /></div>
                <Button className="mt-2 h-12" buttonType="secondary" bordered onClick={setDataHoraAtual}>Data/Hora atual</Button>
            </div>
            {props.helperText && <p className="px-3.5 text-xs text-slate-500 dark:text-slate-400">{props.helperText}</p>}
        </div>
    );
};
export default DataHora;
