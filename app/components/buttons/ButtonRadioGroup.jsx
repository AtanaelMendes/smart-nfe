import { useCallback, useEffect, useState } from "react";

const ButtonRadioGroup = ({ id, options, value, onChange, className}) => {
    // const [selectedValue, setSelectedValue] = useState(value);

    const handleOptionChange = useCallback((value) => {
        // setSelectedValue(value);
        if (onChange) {
            onChange(value);
        }
    }, [onChange]);

    useEffect(() => {
        // setSelectedValue(value);
    }, [value]);

    return (
        <div className={`inline-flex rounded-lg border border-gray-200 bg-white ${className}`}>
            {options?.map((option, index) => (
                <button
                    key={`${id}_${index}`}
                    name={`${id}`}
                    type="button"
                    onClick={() => handleOptionChange(option.value)}
                    className={`
                        px-4 py-2 text-sm font-medium transition-colors duration-200
                        ${index === 0 ? 'rounded-l-lg' : ''}
                        ${index === options.length - 1 ? 'rounded-r-lg' : ''}
                        ${index > 0 ? 'border-l border-gray-200' : ''}
                        ${value == option.value
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    `}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export default ButtonRadioGroup;