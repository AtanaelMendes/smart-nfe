const RadioGroup = ({ active, name, items, onChange, type }) => {
    const commonClasses = (` inline-flex items-center w-fit min-h-10 px-4 py-2 text-slate-700 dark:text-slate-200 bg-transparent border border-slate-300 dark:border-slate-600 cursor-pointer transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500`
    );

    const typeClasses = {
        primary: (_) => {return 'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white hover:bg-blue-50 dark:hover:bg-blue-400/10 hover:text-blue-700 dark:hover:text-blue-300'},
        danger: (_) => {return 'peer-checked:border-danger peer-checked:bg-danger peer-checked:text-white hover:bg-red-50 dark:hover:bg-red-400/10 hover:text-red-700 dark:hover:text-red-300'}
    }

    const renderRadioGroup = () => {
        if (!items) {
            return 'Nenhum item recebido';
        }

        const handleChange = (id, value, checked) => {
            if (typeof onChange === "function") {
                onChange(id, value, checked);
            }
        };

        const ultimoItem = items.length - 1;
        return items?.map((item, index) => {
            return (
                <li key={index}>
                    <input type="radio" id={`${item.id}`} name={`${name}`} onChange={handleChange} checked={item?.checked ||  false} className="sr-only peer" />
                    <label
                        htmlFor={`${item.id}`}
                        onClick={() => { item?.action(item.value) }}
                        className={`${typeClasses[type || "primary"](item?.color || "primary")} ${commonClasses} ${index === 0 ? "rounded-l-md" : (index == ultimoItem ? "rounded-r-md" : "")} `}
                    >
                        <div className="text-sm font-semibold">
                            {item.label}
                        </div>
                    </label>
                </li >
            )
        });
    };

    return (
        <div className={`${active ? 'block' : 'hidden'}`}>
            <div className={"flex justify-center"}>
                <ul className="flex">
                    {renderRadioGroup()}
                </ul>
            </div>
        </div>
    );
}

export default RadioGroup;
