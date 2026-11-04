import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useState, useRef, useEffect } from "react";

const ButtonDropDown = ({ id, label, small, type, block, className, items }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);

    const btnType = {
        primary: `bg-blue-600 text-white border border-blue-600 hover:bg-blue-800 focus:ring-blue-300`,
        secondary: `bg-white text-gray-900 border border-gray-300 hover:bg-gray-300 focus:ring-gray-100`,
        success: `bg-green-600 text-white border border-green-600 hover:bg-green-700 focus:ring-green-300`,
        danger: `bg-red-600 text-white border border-red-600 hover:bg-red-700 focus:ring-red-300`,
        warning: `bg-yellow-500 text-white border border-yellow-500 hover:bg-yellow-500 focus:ring-yellow-300`,
    }

    const classButton = () => {
        let btnClass = "relative focus:outline-none font-medium text-sm focus:ring-4 rounded ";
        btnClass += small ? "!py-1.5 !px-2 " : "!py-2 !px-4 ";
        btnClass += block ? "w-full " : "w-fit ";
        btnClass += className ? className + " " : "";
        btnClass += btnType[type || 'primary'];

        return btnClass;
    }

    // Alterna a visibilidade do menu
    const toggleMenu = () => {
        setIsOpen((prev) => !prev);
    };

    // Fecha o menu se clicar fora dele
    const handleClickOutside = (event) => {
        if (
            menuRef.current &&
            !menuRef.current.contains(event.target) &&
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
            <button
                type="button"
                ref={buttonRef}
                onClick={toggleMenu}
                className={classButton()}
                id={id || "dropdownButton"}
            >
                <div className={"flex justify-between"}>
                    <div className={"flex justify-center w-full"}>
                        <span>{label || ""}</span>
                    </div>
                    <div className={"w-[30px] flex justify-center"}>
                        <FontAwesomeIcon className={`ease-in-out duration-300 ${isOpen ? "rotate-180" : ""}`} icon={faChevronDown} width="14" height="14" />
                    </div>
                </div>
            </button>

            {isOpen && (<div id="dropdownChildren" ref={menuRef} className={`z-10 bg-white rounded shadow-lg absolute w-fit min-w-[100px] max-w-[200px] mt-1`}>
                <ul className="space-y-1 self-end block p-1 w-full divide-y divide-gray-200">
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