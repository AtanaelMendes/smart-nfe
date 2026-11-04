import React from "react";

const DataLoading = ({className, ...props}) => {
    const [dots, setDots] = React.useState(0);
    React.useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev === 3 ? 0 : prev + 1));
        }, 500);
        return () => clearInterval(interval);
    }, []);
    return (
        <div className='grid gid-cols-1 p-2'>
            <div className={`col-span-1 font-semibold italic text-slate-400 ${className} animate-pulse`}>
                Carregando{".".repeat(dots)}
            </div>
        </div>
    );
}
export default DataLoading;