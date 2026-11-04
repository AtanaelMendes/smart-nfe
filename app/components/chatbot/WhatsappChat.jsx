import WhatsAppMsg from "./WhatsappMsg";
import { useEffect, useRef, useState } from 'react';
import InputTextArea from '@/components/inputs/InputTextArea';
import axiosInstance from "@/plugins/axios";
import { useAppContext } from "@/context/AppContext";
import Button from "../buttons/Button";
import { faAnglesDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const WhatsAppChat = ({ visible, messages, chatbotConversa, handleReload, habilitaChat, className }) => {
    const bottomRef = useRef(null); // <- ref para o final do chat
    const [sentMessage, setSentMessage] = useState("");
    const { user, toast } = useAppContext();

    const scroolToBottom = () => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }
    useEffect(() => {
        scroolToBottom()
    }, [messages]);

    const handleSendMessage = () => {
        const msg = sentMessage;
        setSentMessage("");
        const params = {
            message: msg,
            envio_primeira_msg: "N",
            nr_telefone: chatbotConversa.NR_TELEFONE,
            id_chatbot_fluxo: chatbotConversa.ID_CHATBOT_FLUXO,
            nm_pessoa_analista: user.apelido.split("-")[0].trim(),
            id_chatbot_conversa: chatbotConversa.ID_CHATBOT_CONVERSA
        };
        axiosInstance.post(`chatbot/send-message`,
            params
        ).then(function (response) {
            if (typeof handleReload === "function") {
                handleReload();
            }
        }).catch(function (resp) {
            setSentMessage(msg);
            console.error(resp)
            let error = resp?.response?.data?.error
            if (Array.isArray(error)) {
                return toast.error(error.join(' ') || 'OOps ocorreu um erro ao enviar mensagem')
            }
            return toast.error(error || 'OOps ocorreu um erro ao enviar mensagem')
        });
    }

    if (!visible) return null;
    return (
        <div className={`relative ${habilitaChat ? 'h-[90%]' : 'h-full'} ${className}`}>
            <div
                id={"chat-whats"}
                className={`flex flex-col grow gap-2 p-2 ${ habilitaChat ? "rounded-t-lg" : "rounded-lg"} h-full overflow-y-auto overflow-x-hidden border mb-[50px] pb-10 shadow-lg shadow-gray-500`}
                style={{ backgroundImage: `url('${process.env.NEXT_PUBLIC_RELATIVE_PATH}/images/backgrounds/bg-whadizapi.jpg')` }}>
                <WhatsAppMsg messages={messages} />
                <div className="absolute right-4 bottom-2">
                    <Button outline size="small" buttonType="primary" pill={true} onClick={scroolToBottom}>
                        <FontAwesomeIcon icon={faAnglesDown} width="16" height="16" className=""/>
                    </Button>
                </div>
                <div ref={bottomRef} /> {/* <- esse é o ponto de scroll */}
            </div>
            {habilitaChat && <div className="absolute bottom-[-54px] w-full shadow-lg shadow-gray-500 rounded-b-lg">
                <InputTextArea
                    small
                    className="rounded-t-none"
                    value={sentMessage}
                    name="chatbot" rows={2}
                    id={`id_chat_${chatbotConversa.ID_CHATBOT_CONVERSA}`}
                    onChange={(id, val)=>setSentMessage(val)}
                    btnSent={handleSendMessage}/>
            </div>}
        </div>
    );
};
export default WhatsAppChat;