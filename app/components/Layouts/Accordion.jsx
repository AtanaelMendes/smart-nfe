import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Caption, FieldLabel } from './Typography';
import React, { useState } from 'react';

const AccordionItem = ({ title, subTitle, content, isOpen, onClick }) => {
    return (
        <div>
            <div className={`ms-4 me-4 border p-1 shadow bg-blue-600 text-white hover:bg-blue-500 ${isOpen ? "rounded-t-lg border-b-0" : "mb-3 rounded-lg"}`}>
                <button
                    type="button"
                    onClick={onClick}
                    className="flex items-center justify-between w-full py-1 px-3 text-sm font-medium gap-3 rounded-lg">
                    <span><FieldLabel className="!mb-0 text-white">{title}</FieldLabel> - <Caption className={"text-white"}>{subTitle}</Caption></span>
                    <FontAwesomeIcon className={`ease-in-out duration-300 ${isOpen ? "rotate-180" : ""}`} icon={faChevronDown} width="18" height="18" />
                </button>
            </div>
            {isOpen && <div className="mb-3 ms-4 me-4 border shadow-md p-2 px-4 rounded-b-lg text-sm" dangerouslySetInnerHTML={{ __html: content }} />}
        </div>
    );
};

const Accordion = ({ items }) => {
    const [openIndexes, setOpenIndexes] = useState([]);

    const handleClick = (index) => {
        setOpenIndexes((prevIndexes) =>
            prevIndexes.includes(index)
                ? prevIndexes.filter((i) => i !== index)
                : [...prevIndexes, index]
        );
    };

    return (
        <div className="w-full mb-20">
            {items.map((item, index) => (
                <AccordionItem
                    key={index}
                    title={item.title}
                    content={item.content}
                    subTitle={item.subTitle}
                    onClick={() => handleClick(index)}
                    isOpen={openIndexes.includes(index)}
                >
                </AccordionItem>
            ))}
        </div>
    );
};

export default Accordion;
