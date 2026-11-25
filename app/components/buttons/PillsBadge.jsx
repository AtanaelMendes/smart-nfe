import { cn } from "@/assets/utils";

const PILL_STYLES = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    primary: 'bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    'primary-dark': 'bg-blue-600 text-white dark:bg-blue-500',
    danger: 'bg-red-50 text-red-700 dark:bg-red-400/15 dark:text-red-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
    'warning-dark': 'bg-amber-500 text-slate-950',
    // Variantes adicionais centralizadas (status específicos e badges especiais)
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300',
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300',
    info: 'bg-sky-50 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
    dark: 'bg-slate-900/85 text-slate-100 border border-slate-700/60',
    'danger-solid': 'bg-red-600 text-white',
};

/**
 * Component that renders a pill/badge element
 * @param {Object} props
 * @param {string} [props.type='default'] - Style variant: default, primary, primary-dark, danger, success, warning, warning-dark, purple, teal, info, dark, danger-solid
 * @param {React.ReactNode} props.children - Content to display
 * @param {boolean} [props.small=false] - Render smaller version
 * @param {boolean} [props.wrap=false] - Permite quebra de linha (padrão: linha única)
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactNode}
 */
const PillsBadge = ({ type, children, small, wrap = false, className, ...rest }) => {
    const baseClasses = 'inline-flex items-center justify-center gap-1 align-middle font-medium leading-5 rounded-full';
    const wrappingClasses = wrap ? 'whitespace-normal break-words text-left' : 'whitespace-nowrap shrink-0';
    const sizeClasses = small ? 'px-2 py-0 text-xs' : 'px-2.5 py-0.5 text-sm';
    const styleClasses = PILL_STYLES[type] || PILL_STYLES.default;

    return (
        <span className={cn(baseClasses, wrappingClasses, sizeClasses, styleClasses, className)} {...rest}>
            {children}
        </span>
    );
};

export default PillsBadge;
