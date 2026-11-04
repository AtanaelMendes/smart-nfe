import { Caption, Title, Label } from "@/components/Layouts/Typography";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TooltipComponent } from "../Layouts/TooltipComponent";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import PillsBadge from "@/components/buttons/PillsBadge";
import { useAppContext } from "@/context/AppContext";
import React, { useState, useEffect } from "react";
import moment from "moment";

const ScheduleNotification = (props) => {
    const { getCandidatosEmEspera, scheduleNotify, user } = useAppContext();
    const [showComponent, setShowComponent] = useState(false);

    //Chama a função de controle de exibição da notificação ao montar o elemento
    useEffect(() => {
        if (!user) {
            return
        };

        getCandidatosEmEspera();
    }, [user]);

    useEffect(() => {
        setShowComponent(scheduleNotify.length > 0);
    }, [scheduleNotify]);

    const redirectToSchedule = () => {
        props.tabControl({ id: "SelecaoEntrar", name: "Seleção", active: true });
        props.subTabControl({ id: "fila_atendimento", parent: "SelecaoEntrar" });
        setShowComponent(false);
    };

    const getDateDiffString = (data) => {
        let agora = moment();
        let dataBase = moment(data, "DD/MM/YYYY HH:mm");

        const days = agora.diff(dataBase, "days");
        dataBase.add(days, "days");

        const hours = agora.diff(dataBase, "hours");
        dataBase.add(hours, "hours");

        const minutes = agora.diff(dataBase, "minutes");
        dataBase.add(minutes, "minutes");

        const dayText = days === 0 ? "" : days > 1 ? `${days} dias,` : "1 dia,";
        const hourText =
            hours === 0 ? "" : hours > 1 ? `${hours} horas e` : "1 hora e";
        const minText = minutes > 1 ? `${minutes} minutos` : "1 minuto";

        return `${dayText} ${hourText} ${minText}`;
    };

    const renderTableBody = () => {
        if (scheduleNotify.length === 0) {
            return (
                <div className="col-span-12 text-center">
                    <Caption>Carregando lista de candidatos...</Caption>
                </div>
            );
        }

        return scheduleNotify.map((data, index) => {
            return (
                <div
                    className="odd:bg-white even:bg-gray-100 col-span-12 px-1"
                    key={`row_${index}`}
                    onClick={() => {
                        redirectToSchedule();
                    }}
                >
                    <div className={`flex text-sm`}>
                        <div className="w-[33%] min-w-[33%] py-1 content-center px-2">
                            <TooltipComponent content={data.NM_PESSOA} asChild usePortal={false}>
                                <div className="truncate">
                                    <Caption className={"font-bold"}>{data.NM_PESSOA}</Caption>
                                </div>
                            </TooltipComponent>
                            <div>
                                <Caption>SIP:&nbsp;</Caption>
                                <Label className={"font-semibold"}>{data.CD_PESSOA}</Label>
                            </div>
                        </div>
                        <div className="w-[33%] min-w-[33%]">
                            <div>
                                <Caption>Atendimento:&nbsp;</Caption>
                                <span className="text-sm text-slate-700 font-semibold">
                                    {data.DT_ATENDIMENTO}
                                </span>
                            </div>
                            <div>
                                <Caption>Chegada:&nbsp;</Caption>
                                <span className="text-sm text-slate-700 font-semibold">
                                    {data.DT_CHEGADA}
                                </span>
                            </div>
                        </div>
                        <div className="w-[33%] min-w-[33%] ml-2">
                            <div>
                                <Caption>Tempo em atraso:&nbsp;</Caption>
                            </div>
                            <div>
                                <PillsBadge type="danger" small>
                                    {getDateDiffString(data.DT_CHEGADA)}
                                </PillsBadge>
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    };

    return (
        <div
            className={`bg-white p-0 w-[570px] max-w-[570px] shadow-md rounded-md relative border-2 border-red-500 ${showComponent ? "block" : "hidden"
                }`}
        >
            <div className="pl-4 pt-2 pb-1 border-b-2 text-white bg-red-500 ">
                <Title>Alerta de chegada de candidatos:</Title>
            </div>
            <div
                className={`grid grid-cols-12 max-h-[180px] overflow-y-auto mt-1 mb-1 cursor-pointer`}
            >
                {renderTableBody()}
            </div>
            <button
                className="absolute top-2 right-2 p-0"
                onClick={(e) => {
                    setShowComponent(false);
                }}
            >
                <span className="icon">
                    <FontAwesomeIcon
                        icon={faClose}
                        width="20"
                        height="20"
                        className="self-start mr-1 text-white hover:text-slate-600"
                    />
                </span>
            </button>
        </div>
    );
};

export default ScheduleNotification;
