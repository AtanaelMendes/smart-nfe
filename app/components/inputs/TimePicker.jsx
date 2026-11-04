import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from '@fortawesome/free-solid-svg-icons';

const TimePicker = ({ value, onChange, label, required, id, className }) => {

    const handleChange = (evt) => {
        if (typeof onChange === "function") {
            onChange(evt.target.id, evt.target.value);
        }
    }

    return (
        <>
            {
                label && <label for="time" className="inline-flex mb-2 text-sm font-medium text-gray-900">
                    {required && <FontAwesomeIcon icon={faAsterisk} width="10" height="10" color="red" className="self-start"/>}{label}
                </label>
            }
            <div className="relative">
                <input
                    type="time"
                    id={id || "time"}
                    className={`bg-gray-50 border leading-none border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 ${className}`}
                    value={value || ""}
                    required={required}
                    onChange={handleChange}
                    />
            </div>
        </>

    );
}
export default TimePicker;