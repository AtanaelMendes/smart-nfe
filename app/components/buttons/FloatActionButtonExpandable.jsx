import { faMailBulk, faMessage, faPhone, faPlus, faX } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';

const FloatActionButtonExpandable = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="fixed bottom-4 right-4 flex flex-col items-end space-y-2">
            {isExpanded && (
                <>
                    <button
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out"
                        onClick={() => alert('Chat clicked!')}
                    >
                        <FontAwesomeIcon icon={faPhone} width="16" height="16" />
                    </button>
                    <button
                        className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out"
                        onClick={() => alert('Phone clicked!')}
                    >
                        <FontAwesomeIcon icon={faMessage} width="16" height="16" />
                    </button>
                    <button
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out"
                        onClick={() => alert('Email clicked!')}
                    >
                        <FontAwesomeIcon icon={faMailBulk} width="16" height="16" />
                    </button>
                </>
            )}
            <button
                onClick={toggleExpand}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-full shadow-lg transition duration-300 ease-in-out"
            >
                {isExpanded ? <FontAwesomeIcon icon={faX} width="16" height="16" /> : <FontAwesomeIcon icon={faPlus} width="16" height="16" />}
            </button>
        </div>
    );
};

export default FloatActionButtonExpandable;
