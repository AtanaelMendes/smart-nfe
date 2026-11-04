const Balloon = ({ visible, reload, placement = 'bottom', color = 'default', children, ...props }) => {
    if (!visible) return null;

    // Mapeamento de cores para classes Tailwind
    const colorClasses = {
        primary: {
            bg: 'bg-blue-500',
            text: 'text-white',
            border: 'blue-500',
            shadow: 'shadow-blue-500',
            dropShadow: 'drop-shadow-[0_2px_2px_rgb(59_130_246)]'
        },
        warning: {
            bg: 'bg-yellow-500',
            text: 'text-black',
            border: 'yellow-500',
            shadow: 'shadow-yellow-500',
            dropShadow: 'drop-shadow-[0_2px_2px_rgb(234_179_8)]'
        },
        danger: {
            bg: 'bg-red-500',
            text: 'text-white',
            border: 'red-500',
            shadow: 'shadow-red-500',
            dropShadow: 'drop-shadow-[0_2px_2px_rgb(239_68_68)]'
        },
        success: {
            bg: 'bg-green-500',
            text: 'text-white',
            border: 'green-500',
            shadow: 'shadow-green-500',
            dropShadow: 'drop-shadow-[0_2px_2px_rgb(34_197_94)]'
        },
        dark: {
            bg: 'bg-gray-800',
            text: 'text-white',
            border: 'gray-800',
            shadow: 'shadow-gray-800',
            dropShadow: 'drop-shadow-[0_2px_2px_rgb(31_41_55)]'
        },
        default: {
            bg: 'bg-white',
            text: 'text-black',
            border: 'gray-300',
            shadow: 'shadow-blue-500',
            dropShadow: 'drop-shadow-[0_2px_2px_rgb(59_130_246)]'
        }
    };

    const currentColor = colorClasses[color] || colorClasses.default;

    // Classes para placement
    const placementClasses = {
        bottom: {
            balloon: 'bottom-[-50px]',
            caret: 'top-[-20px] border-l-[10px] border-r-[10px] border-b-[10px] border-l-transparent border-r-transparent border-b-${color} -mb-[2px] left-[calc(50%_-_10px)]'
        },
        top: {
            balloon: 'top-[-50px]',
            caret: 'bottom-[-20px] border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-${color} -mt-[2px] left-[calc(50%_-_10px)]'
        },
        left: {
            balloon: 'left-[-50px]',
            caret: 'right-[-20px] border-t-[10px] border-b-[10px] border-l-[10px] border-t-transparent border-b-transparent border-l-${color} -mr-[2px] top-[calc(50%_-_10px)]'
        },
        right: {
            balloon: 'right-[-50px]',
            caret: 'left-[-20px] border-t-[10px] border-b-[10px] border-r-[10px] border-t-transparent border-b-transparent border-r-${color} -ml-[2px] top-[calc(50%_-_10px)]'
        }
    };

    const currentPlacement = placementClasses[placement] || placementClasses.bottom;

    return (
        <div className={`absolute ${currentPlacement.balloon} items-center justify-center flex flex-col rounded-lg ${currentColor.bg} ${currentColor.text} animate-bounce shadow-md ${currentColor.shadow} p-2`}>
            <div className="relative">
                <span className={`absolute w-0 h-0 border-solid ${currentPlacement.caret.replace('${color}', currentColor.border)} ${currentColor.dropShadow}`} />
            </div>
            <div className="rounded-lg text-nowrap text-sm text-white-shadow">
                {children}
            </div>
        </div>
    );
};
export default Balloon;