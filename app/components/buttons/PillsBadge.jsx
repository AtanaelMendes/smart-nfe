import { cn } from "@/assets/utils";

const PILL_STYLES = {
    default: " bg-stone-100 text-gray-800 border border-stone-200 shadow-md ",
    primary: " bg-blue-200 text-primary border border-blue-300 shadow-md ",
    "primary-dark": " bg-blue-600 text-white ",
    danger: " bg-red-200 text-red-800 border border-red-300 shadow-md ",
    success: " bg-green-200 text-green-800 border border-green-300 shadow-md ",
    warning: " bg-yellow-200 text-yellow-800 border border-yellow-300 shadow-md ",
    "warning-dark": " bg-yellow-500 text-white ",
};

/**
 * Component that renders a pill/badge element
 * @param {Object} props
 * @param {string} [props.type='default'] - Style variant: default, primary, primary-dark, danger, success, warning, warning-dark
 * @param {React.ReactNode} props.children - Content to display
 * @param {boolean} [props.small=false] - Render smaller version
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactNode}
 */
const PillsBadge = ({ type, children, small, className }) => {
    const baseClasses = `font-medium ${small ? "px-1" : "px-2"} rounded-full`;
    const sizeClasses = small ? "text-xs" : "text-sm";

    return (
        <span className={cn(baseClasses, PILL_STYLES[type || "default"], sizeClasses, className)}>
            {children}
        </span>
    );
};

export default PillsBadge;
