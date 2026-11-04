export default function Checkbox({
    id,
    checked,
    disabled,
    value,
    required,
    label,
    onChange,
    className,
}) {
    const handleChange = (evt) => {
        if (typeof onChange == "function") {
            onChange(evt.target.id, evt.target.checked);
        }
    };

    return (
        <label className={`flex items-center cursor-pointer ${className || ""}`}>
            <input
                id={id}
                name={id}
                type="checkbox"
                onChange={handleChange}
                checked={checked}
                disabled={disabled}
                value={value}
                required={required}
                className={`w-4 h-4 text-blue-600 ${
                    disabled ? "bg-gray-100" : "bg-white"
                } border-gray-300 rounded cursor-pointer focus:ring-blue-500 focus:ring-2`}
            />
            {label && (
                <span className="ms-2 text-sm font-medium text-gray-900">
                    {label}
                </span>
            )}
        </label>
    );
}
