const Blockquote = ({ children, type, className, size }) => {
    const blockType = {
        danger: " border-red-600 text-red-600 bg-red-200 shadow-md ",
        success: " border-green-600 text-green-600 bg-green-200 shadow-md ",
        warning: " border-yellow-500 text-yellow-600 bg-yellow-200 shadow-md ",
        primary: " border-blue-600 text-blue-600 bg-blue-200 shadow-md ",
        default: " border-gray-600 text-gray-600 bg-gray-200 shadow-md "
    }

    const blockSize = {
        xs: 'p-1 text-xs',
        sm: 'p-2 text-sm',
        md: 'py-4 px-2 text-base',
        lg: 'py-5 px-2 text-lg'
    }
    return (
        <div className={`rounded text-wrap word-wrap-legado border-l-4 ${blockSize[size || "sm"]} ${blockType[type || "default"]} ${className}`}>
            {children}
        </div>
    );
}
export default Blockquote;