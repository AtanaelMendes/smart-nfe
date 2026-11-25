import { faMailBulk, faMessage, faPhone, faPlus, faX } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import Button from './Button';

const FloatActionButtonExpandable = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="fixed bottom-4 right-4 flex flex-col items-end space-y-2">
            {isExpanded && (
                <>
                    <Button
                        buttonType="success"
                        pill
                        onClick={() => alert('Chat clicked!')}
                        title="Ligar"
                        className="!px-4 !py-2 font-bold shadow-lg"
                    >
                        <FontAwesomeIcon icon={faPhone} width="16" height="16" />
                    </Button>
                    <Button
                        buttonType="warning"
                        pill
                        onClick={() => alert('Phone clicked!')}
                        title="Mensagem"
                        className="!px-4 !py-2 font-bold shadow-lg"
                    >
                        <FontAwesomeIcon icon={faMessage} width="16" height="16" />
                    </Button>
                    <Button
                        buttonType="danger"
                        pill
                        onClick={() => alert('Email clicked!')}
                        title="E-mail"
                        className="!px-4 !py-2 font-bold shadow-lg"
                    >
                        <FontAwesomeIcon icon={faMailBulk} width="16" height="16" />
                    </Button>
                </>
            )}
            <Button
                buttonType="primary"
                pill
                onClick={toggleExpand}
                title={isExpanded ? 'Fechar ações' : 'Abrir ações'}
                className="!px-4 !py-4 font-bold shadow-lg"
            >
                {isExpanded ? <FontAwesomeIcon icon={faX} width="16" height="16" /> : <FontAwesomeIcon icon={faPlus} width="16" height="16" />}
            </Button>
        </div>
    );
};

export default FloatActionButtonExpandable;
