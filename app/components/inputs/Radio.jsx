import React from "react";

/**
 *
 * @param {Function} onChange - Function to handle the change event
 * @param {Function} onClick - Function to handle the click event
 * @param {String} id - Id of the radio input
 * @param {Boolean} checked - Checked state of the radio input
 * @param {String} value - Value of the radio input
 * @param {String} name - Name of the radio input
 * @param {Boolean} required - Required state of the radio input
 * @param {String} className - Additional classes for the radio input
 * @param {String} label - Label for the radio input
 *
 * @returns
 * Radio input component
 */
const Radio = ({ onChange, onClick, id, checked, value, name, required, className, label }) => {
    const handleChange = (evt) => {
        if (typeof onChange === "function") {
            onChange(evt.target.id, evt.target.value, evt.target.checked);
        }
    };

    const handleClick = () => {
        if (typeof onClick === "function") {
            onClick();
        }
    };

    return (
        <div className={`flex items-center ${className}`}>
            <input
                id={id}
                type="radio"
                checked={checked}
                onChange={handleChange}
                onClick={handleClick}
                value={value || ""}
                name={name || id}
                required={required || ""}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor={id} className="ms-2 text-sm font-medium text-gray-900 select-none">
                {label}
            </label>
        </div>
    );
};

export default Radio;
