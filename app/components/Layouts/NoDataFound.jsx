const NoDataFound = ({className, visible, isLoading}) => {
    return (
        <div className={`grid grid-cols-1 p-2 ${visible ? '' : 'hidden'}`}>
            <div className={`col-span-1 font-semibold italic text-slate-500 ${className}`}>
                {isLoading && <>Carregando<span className="animate-ping">...</span></>}
                {!isLoading && <>Não há dados para exibir... </>}
            </div>
        </div>
    );
}
export default NoDataFound;