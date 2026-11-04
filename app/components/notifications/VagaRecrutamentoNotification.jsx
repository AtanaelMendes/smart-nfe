import { Caption, Title, Label } from "@/components/Layouts/Typography";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TooltipComponent } from "../Layouts/TooltipComponent";
import { faCheck } from "@fortawesome/free-solid-svg-icons"
import Button from "@/components/buttons/Button";
import { useAppContext } from "@/context/AppContext";
import React, { useState, useEffect } from "react";
import { cn } from "@/assets/utils";
import axiosInstance from "@/plugins/axios";
import { toast } from "react-toastify";

const VagaRecrutamentoNotification = (props) => {
    const { vagaRecrutamentoNotify, getAlertaRecrutamento, user } = useAppContext();
    const [vagaRecrutamentoRefresh, setVagaRecrutamentoRefresh] = useState(0);
    const [showComponent, setShowComponent] = useState(false);

    useEffect(() => {
        if (!user) {
            return
        };

        getAlertaRecrutamento();
    }, [user]);

    useEffect(() => {
        setShowComponent(vagaRecrutamentoNotify.length > 0);
    }, [vagaRecrutamentoNotify, vagaRecrutamentoRefresh]);
    
    const setViewed = (alertID) => {
        setJobNotifyViewed(alertID);
    };

    function setJobNotifyViewed(alertID) {
        axiosInstance
            .post(`analista/confirma-visualizar-vaga`, { id_alerta: alertID })
            .then(function (response) {
                if (response.status === 200) {
                    vagaRecrutamentoNotify.map((data) => {
                        if (data.ID === alertID) {
                            data.VIEWED = true;
                        }
                    });
                    setVagaRecrutamentoRefresh((prevCount) => prevCount + 1);
                }
            })
            .catch(function (resp) {
                toast.error("Falha ao confirmar visualização. " + resp);
            });
    }

    return (
        <div className={cn('p-0 w-[350px] max-w-[350px] ml-auto relative', showComponent ? "block" : "hidden")} >
            <div className={`grid grid-cols-12 max-h-[80vh] overflow-y-auto mt-1 mb-1`}>
                {vagaRecrutamentoNotify?.map((data, index) => (
                    !data.VIEWED ? (
                        <div
                            id={data.ID}
                            className="col-span-12 px-1 text-white bg-[#3498db] rounded-md border-b-4 border-blue-700 flex mb-1"
                            key={`row_${index}`}
                        >
                            <div className="pl-2 pt-2 pb-1 block w-[100%] text-[11px]">
                                <div>
                                    <div>A vaga {data.NR_VAGA} foi para Recrutamento:</div>
                                </div>
                                <div>
                                    {data.DS_COMPLEMENTO_AVISO}
                                </div>
                                {data.DT_GERACAO && <div><Caption className="content-center text-white">Gerado em: {data.DT_GERACAO}.</Caption></div>}
                            </div>
                            <div className="content-center px-4">
                                <TooltipComponent content={"Confirmar visualização"} usePortal={false} asChild={true}>
                                    <Button
                                        buttonType="primary"
                                        size="small"
                                        className="p-1 bg-blue-100 text-blue-900"
                                        bordered={true}
                                        outline={true}
                                        onClick={(e) => {
                                            setViewed(data.ID);
                                        }}
                                    >
                                        <span>
                                            <FontAwesomeIcon icon={faCheck} width="20" height="20" />
                                        </span>
                                    </Button>
                                </TooltipComponent>
                            </div>
                        </div>
                    ) : null
                ))}
            </div>
        </div>
    );
};

export default VagaRecrutamentoNotification
