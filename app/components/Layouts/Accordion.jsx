import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from '@/components/buttons/Button';
import { Caption, FieldLabel } from './Typography';
import React, { useState } from 'react';

const AccordionItem = ({ title, subTitle, content, isOpen, onClick }) => {
    return (
        <div>
            <div className={`ms-4 me-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 ${isOpen ? "rounded-t-lg border-b-0" : "mb-3 rounded-lg"}`}>
                <Button
                    onClick={onClick}
                    className="flex items-center justify-between w-full min-h-12 py-3 px-4 text-sm font-medium gap-3 rounded-lg text-slate-800 dark:text-slate-100"
                >
                    <span><FieldLabel className="!mb-0 text-slate-800 dark:text-slate-100">{title}</FieldLabel> - <Caption className={"text-slate-500 dark:text-slate-400"}>{subTitle}</Caption></span>
                    <FontAwesomeIcon className={`ease-in-out duration-300 ${isOpen ? "rotate-180" : ""}`} icon={faChevronDown} width="18" height="18" />
                </Button>
            </div>
            {isOpen && <div className="mb-3 ms-4 me-4 border border-t-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 p-4 rounded-b-lg text-sm" dangerouslySetInnerHTML={{ __html: content }} />}
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
