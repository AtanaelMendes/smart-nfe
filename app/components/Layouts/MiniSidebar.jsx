import { cn } from "@/assets/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Sidebar = ({ items, onItemClick, filtroAtivo, className, horizontal, responsiveLabel = true }) => {
    const handleItemClick = (itemId) => {
        onItemClick(itemId);
    };

    return (
        <aside aria-label="Sidebar" className={cn("w-full h-full", className)}>
            <div
                className={cn(
                    "transition-all duration-300 w-full",
                    horizontal ? "flex flex-row gap-1" : "flex flex-col gap-0.5 xl:gap-2 items-center p-1 xl:p-2"
                )}
            >
                {items.map((item, index) => (
                    <div
                        key={index}
                        className={cn(
                            "self-end rounded transition-colors duration-300 ease-in-out select-none cursor-pointer text-primary w-fit md:w-full",
                            item.disabled
                                ? "opacity-50 cursor-not-allowed text-gray-500"
                                : item.id === filtroAtivo
                                ? "bg-primary text-white"
                                : item.hoverClassName || "hover:bg-blue-200 hover:text-primary",
                            item.className
                        )}
                    >
                        <div
                            className={cn(item.itemClassName, "flex items-center p-1 gap-2")}
                            onClick={item.disabled ? null : () => handleItemClick(item.id)}
                        >
                            {item.icon && (
                                <FontAwesomeIcon
                                    icon={item.icon}
                                    width="16"
                                    height="16"
                                />
                            )}
                            <span className={cn(responsiveLabel && "hidden md:block", "text-sm font-semibold")}>
                                {item.label}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
};

export default Sidebar;
