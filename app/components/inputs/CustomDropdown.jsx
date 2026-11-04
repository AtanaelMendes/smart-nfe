import { faCaretDown, faExternalLink, faInfoCircle, faSortDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState, useEffect, useRef } from "react";
import { FieldLabel } from "../Layouts/Typography";
import { TooltipComponent } from "../Layouts/TooltipComponent";
import { cn } from "@/assets/utils";

const CustomDropdown = ({ id, label, options, onSelect, placeholder, showIconLink, hint }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleSelect = (value) => {
        setIsOpen(false);

        if (typeof onSelect === 'function') {
            onSelect(value);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <>
            <div className="flex relative">
                {label && (
                    <div className="flex relative">
                        <label>
                            <FieldLabel>{label}</FieldLabel>
                        </label>
                    </div>
                )}
                {hint && (
                    <>
                        <TooltipComponent
                            content={
                                <div className="text-xs z-[100] max-w-[300px]">{hint}</div>
                            }
                            asChild
                            usePortal={false}
                        >
                            <span className="ml-2 mt-1">
                                <FontAwesomeIcon
                                    icon={faInfoCircle}
                                    width="16"
                                    height="16"
                                    color="blue"
                                    className="self-start"
                                    tabIndex={-1}
                                    aria-hidden={false}
                                />
                            </span>
                        </TooltipComponent>
                    </>
                )}
            </div>
            <div id={id} className="w-full relative" ref={dropdownRef}>
                <div
                    className="flex justify-between items-center border rounded-lg p-1 cursor-pointer bg-white shadow-md"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span className="text-gray-700 text-sm p-1">{placeholder ? placeholder : "Selecione um item"}</span>
                    {<FontAwesomeIcon className="text-slate-500 me-2 text-center" icon={showIconLink ? faExternalLink : faCaretDown} width={"16"} height={"16"} />}
                </div>

                <div className={cn("absolute w-full bg-white border rounded-lg shadow-lg z-10", isOpen ? '' : 'hidden')}>
                    {options.map((option) => (
                        <div
                            key={`${id}-${option.value}`}
                            className="flex justify-between items-center px-3 py-1 border hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleSelect(option.value)}
                        >
                            <span className="text-gray-600 font-semibold text-sm">{option.label}</span>
                            <span className="bg-primary text-white text-xs font-semibold min-w-[28px] h-[28px] flex items-center justify-center rounded-full">
                                {option.count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default CustomDropdown;