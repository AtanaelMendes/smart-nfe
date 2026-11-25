import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/assets/utils";
import Button from "./Button";

const ButtonDropDown = ({ id, label, small, type, block, className, items }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);

    // Alterna a visibilidade do menu
    const toggleMenu = () => {
        setIsOpen((prev) => !prev);
    };

    // Fecha o menu se clicar fora dele
    const handleClickOutside = (event) => {
        if (
            menuRef.current &&
            !menuRef.current.contains(event.target) &&
            buttonRef.current &&
            !buttonRef.current.contains(event.target)
        ) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        // Adiciona o listener de evento para detectar cliques fora do menu
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            // Remove o listener de evento quando o componente é desmontado
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative w-fit">
            {/* O ref fica no wrapper (Button não encaminha ref) e o id é mantido no DOM container */}
            <div
                ref={buttonRef}
                id={id || "dropdownButton"}
                className={block ? "w-full" : "w-fit"}
            >
                <Button
                    buttonType={type || "primary"}
                    bordered
                    size={small ? "small" : "medium"}
                    block={block}
                    onClick={toggleMenu}
                    className={cn("relative", small && "!py-1.5 !px-2", className)}
                >
                    <div className={"flex justify-between items-center"}>
                        <div className={"flex justify-center w-full"}>
                            <span>{label || ""}</span>
                        </div>
                        <div className={"w-[30px] flex justify-center"}>
                            <FontAwesomeIcon className={`ease-in-out duration-300 ${isOpen ? "rotate-180" : ""}`} icon={faChevronDown} width="14" height="14" />
                        </div>
                    </div>
                </Button>
            </div>

            {isOpen && (<div id="dropdownChildren" ref={menuRef} className={`z-10 bg-white dark:bg-slate-800 rounded shadow-lg absolute w-fit min-w-[100px] max-w-[200px] mt-1`}>
                <ul className="space-y-1 self-end block p-1 w-full divide-y divide-gray-200 dark:divide-slate-700">
                    {items.map((item, index) => (
                        <li key={index} className={`
                            self-end px-2 py-1
                            ${item.hoverClassName || "hover:bg-blue-200 hover:text-primary hover:rounded cursor-pointer"} 
                            transition-colors duration-300 ease-in-out`}>
                            <div className={`${item.itemClassName || ""} flex items-center p-1`} onClick={() => { item.action(); setIsOpen(false); }} >
                                {item.icon && <FontAwesomeIcon icon={item.icon} className='mr-2' width="16" height="16" />}
                                <span className='text-sm'>{item.label}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            )}
        </div>
    );
}

export default ButtonDropDown;
