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
                        className="h-10 w-10 !p-0 shadow-md"
                    >
                        <FontAwesomeIcon icon={faPhone} width="16" height="16" />
                    </Button>
                    <Button
                        buttonType="warning"
                        pill
                        onClick={() => alert('Phone clicked!')}
                        title="Mensagem"
                        className="h-10 w-10 !p-0 shadow-md"
                    >
                        <FontAwesomeIcon icon={faMessage} width="16" height="16" />
                    </Button>
                    <Button
                        buttonType="danger"
                        pill
                        onClick={() => alert('Email clicked!')}
                        title="E-mail"
                        className="h-10 w-10 !p-0 shadow-md"
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
                className="h-14 w-14 !p-0 shadow-lg hover:shadow-xl"
            >
                {isExpanded ? <FontAwesomeIcon icon={faX} width="16" height="16" /> : <FontAwesomeIcon icon={faPlus} width="16" height="16" />}
            </Button>
        </div>
    );
};

export default FloatActionButtonExpandable;
