const RadioGroup = ({ active, name, items, onChange, type }) => {
    const commonClasses = (` inline-flex items-center w-fit px-2 py-1 text-gray-700 bg-white border cursor-pointer`
    );

    const typeClasses = {
        primary: (_) => {return 'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white hover:bg-blue-200 hover:text-blue-500'},
        danger: (_) => {return 'peer-checked:border-danger peer-checked:bg-danger peer-checked:text-white hover:bg-red-200 hover:text-red-500'}
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
                    <input type="radio" id={`${item.id}`} name={`${name}`} onChange={handleChange} checked={item?.checked ||  false} className="hidden peer" />
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
