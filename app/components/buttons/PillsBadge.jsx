import { cn } from "@/assets/utils";

const PILL_STYLES = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    primary: 'bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    'primary-dark': 'bg-blue-600 text-white dark:bg-blue-500',
    danger: 'bg-red-50 text-red-700 dark:bg-red-400/15 dark:text-red-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
    'warning-dark': 'bg-amber-500 text-slate-950',
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
    const baseClasses = `inline-flex items-center font-medium leading-5 ${small ? "px-2 py-0" : "px-2.5 py-0.5"} rounded-full`;
    const sizeClasses = small ? "text-xs" : "text-sm";

    return (
        <span className={cn(baseClasses, PILL_STYLES[type || "default"], sizeClasses, className)}>
            {children}
        </span>
    );
};

export default PillsBadge;
