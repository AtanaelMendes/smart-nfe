import { empty, nl2br } from "@/assets/utils";
import { faReply } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const WhatsAppMsg = ({ messages }) => {
    const formatBoldName = (text) => {
        const regex = /\*([^\*]+)\*/g;
        return text.replace(regex, (match, p1) => `<strong>${p1}</strong>`);
    };

    const msgTemplate = (id, content, nmNode, sentOrReceived, dtMsg) => {
        const template = content?.template;
        const bodyComponent = template?.components.find(comp => comp.type === 'body');
        const headerComponent = template?.components.find(comp => comp.type === 'header');
        const buttons = template?.components.filter(comp => comp.type === 'button');

        return (
            <div key={id} className='flex flex-col'>
                <div className={`p-2 rounded-lg shadow-lg max-w-[70%] w-fit ${sentOrReceived === 'ENVIADO' ? 'bg-sent self-end' : 'bg-white'}`}>
                    {headerComponent && (
                        <p className='text-gray-900  font-semibold'>
                            {headerComponent.parameters.map(param => param.text).join(' ')}
                        </p>
                    )}
                    {bodyComponent && (
                        <p className='text-gray-900 '>
                            {bodyComponent.parameters?.map(param => param.text).join(' ')}
                        </p>
                    )}
                    {buttons?.length > 0 && (
                        <div className='mt-2 flex flex-col gap-x-2'>
                            {buttons.map((btn) => {
                                return (<div
                                    key={btn.parameters[0]?.payload + btn.index}
                                    className={`px-2 py-1  rounded-lg w-full text-center border-t flex items-center justify-center`}
                                >
                                    <FontAwesomeIcon icon={faReply} width="16" height="16" className={`mr-2`}/>
                                    {btn.parameters[0]?.payload === 'resposta_sim' ? 'Sim' : 'Não'}
                                </div>)
                            })}
                        </div>
                    )}
                    <div className='text-gray-400 text-xs text-right mt-1 italic'>
                        {dtMsg}
                    </div>
                </div>

            </div>
        );
    };

    const msgInteractive = (id, content, nmNode, sentOrReceived, dtMsg) => {
        const interactive = content?.interactive;
        const buttonRepply = interactive?.button_reply;
        const button = interactive.type === 'button' ? interactive : null;

        let body = '';
        let footer = '';
        let actions = '';

        if (!empty(buttonRepply)) {
            body = buttonRepply?.title;
        }

        if (!empty(button)) {
            body = button?.body.text;
            footer = button?.footer.text;

            actions = button?.action?.buttons?.map((btn) => {
                return (
                    <div key={btn.reply.id} className={`px-2 py-1  rounded-lg w-full text-center border-t flex items-center justify-center`}>
                        <FontAwesomeIcon icon={faReply} width="18" height="18" className="mr-2"/>
                        {btn.reply.title}
                    </div>
                );
            });
        }

        return (
            <div key={id} className='flex flex-col'>
                <div className={`p-2 rounded-lg shadow-lg shadow-gray-500 max-w-[70%] overflow-x-hidden w-fit ${sentOrReceived === 'ENVIADO' ? 'bg-sent self-end' : 'bg-white'}`}>

                    <div className='flex flex-col text-gray-900  text-wrap whitespace-pre-line gap-y-2'>
                        <div className="w-full">
                            <p className='text-gray-900 text-base' dangerouslySetInnerHTML={{ __html: nl2br(body) }} />
                            <p className='text-gray-900 text-sm'>{footer}</p>
                        </div>
                        <div className="flex flex-col gap-x-2 w-full mt-2">
                            {actions}
                        </div>
                    </div>

                    <div className='text-gray-400 text-xs text-right mt-1 italic'>
                        {dtMsg}
                    </div>
                </div>
            </div>
        );
    };

    const msgText = (id, content, nmNode, sentOrReceived, dtMsg) => {
        const body = formatBoldName(content?.text?.body);
        return (
            <div className='flex flex-col'>
                <div className={`p-2 rounded-lg shadow-lg shadow-gray-500 max-w-[70%] w-fit ${sentOrReceived === 'ENVIADO' ? 'bg-sent self-end' : 'bg-white'}`}>
                    <p className='text-gray-900 text-base' dangerouslySetInnerHTML={{ __html: nl2br(body) }} />
                    <div className='text-gray-400 text-xs text-right mt-1 italic'>
                        {dtMsg}
                    </div>
                </div>
            </div>
        );
    };

    const msgContact = (id, content, nmNode, sentOrReceived, dtMsg) => {
        const contacts = content?.contacts?.map((con) => {
            return (
                <>
                    <p key={con.to} className='text-gray-900 text-base'>
                        {con.name.formatted_name}
                    </p>
                    {con.phones.map((phone) => {
                        return (
                            <p key={phone.phone} className='text-primary'>
                                {phone.phone}
                            </p>
                        );
                    })}
                </>
            );
        });

        return (
            <div className='flex flex-col'>
                <div className={`p-2 rounded-lg shadow-lg shadow-gray-500 max-w-[70%] w-fit ${sentOrReceived === 'ENVIADO' ? 'bg-sent self-end' : 'bg-white'}`}>
                    <p className='text-gray-900 '>
                        {contacts}
                    </p>
                    <div className='text-gray-400 text-xs text-right mt-1 italic'>
                        {dtMsg}
                    </div>
                </div>
            </div>
        );
    };

    const respostaButton = (id, content, nmNode, sentOrReceived, dtMsg) => {
        return (
            <div className='flex flex-col'>
                <div className={`p-2 rounded-lg shadow-lg shadow-gray-500 max-w-[70%] w-fit ${sentOrReceived === 'ENVIADO' ? 'bg-sent self-end' : 'bg-white'}`}>
                    <p className='text-gray-900 '>
                        {content?.button?.text}
                    </p>
                    <div className='text-gray-400 text-xs text-right mt-1 italic'>
                        {dtMsg}
                    </div>
                </div>
            </div>
        );

    };

    const dataToHtml = () => {
        return messages?.map((msg, index) => {
            const messageData = msg.JSON_MENSAGEM;


            if (messageData?.type === 'template') {
                return msgTemplate(msg.ID_CHATBOT_MENSAGEM, messageData, msg.NM_NODE, msg.ID_TIPO, msg.DATA_MENSAGEM);
            }

            if (messageData?.type === 'interactive') {
                return msgInteractive(msg.ID_CHATBOT_MENSAGEM, messageData, msg.NM_NODE, msg.ID_TIPO, msg.DATA_MENSAGEM);
            }

            if (messageData?.type === 'text') {
                return msgText(msg.ID_CHATBOT_MENSAGEM, messageData, msg.NM_NODE, msg.ID_TIPO, msg.DATA_MENSAGEM);
            }

            if (messageData?.type === 'contacts') {
                return msgContact(msg.ID_CHATBOT_MENSAGEM, messageData, msg.NM_NODE, msg.ID_TIPO, msg.DATA_MENSAGEM);
            }

            if (messageData?.type === 'button') {
                return respostaButton(msg.ID_CHATBOT_MENSAGEM, messageData, msg.NM_NODE, msg.ID_TIPO, msg.DATA_MENSAGEM);
            }
            return `${messageData?.type} não construida`;
        });
    };

    return dataToHtml();
};

export default WhatsAppMsg;