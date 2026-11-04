import VagaRecrutamentoNotification from "../notifications/VagaRecrutamentoNotification";
import ScheduleNotification from "@/components/notifications/ScheduleNotification";
import JobNotification from "../notifications/JobNotification";
import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from "@/context/AppContext";

const Notifications = (props) => {
    const { getAlertasUsuario, getCandidatosEmEspera, getAlertaRecrutamento, onWebSocketMessage, user } = useAppContext();

    useEffect(() => {
        const messageListener = onWebSocketMessage((data) => {
            handleWebSocketMessage(data);
        });

        return messageListener;
    }, [user.user_sip]);

    const handleWebSocketMessage = (data) => {
        switch (data.type) {
            case 'vaga':
                getAlertasUsuario(3);
                data?.isRecrutamento ? getAlertaRecrutamento() : null;
                break;
            case 'agenda':
                getCandidatosEmEspera();
                break;
            case 'vagaRecrutamento':
                getAlertaRecrutamento();
                break;
            case 'vagaCongelada':
                getAlertasUsuario(16);
                break;
            default:
                break;
        }
    };

    return (
        <div className={`fixed p-1 max-h[100vh] overflow-hidden bottom-0 right-0 z-[900]`}>
            <div>
                <JobNotification />
            </div>
            <div>
                <ScheduleNotification {...props} />
            </div>
            <div>
                <VagaRecrutamentoNotification />
            </div>
        </div>
    );
};

export default Notifications;