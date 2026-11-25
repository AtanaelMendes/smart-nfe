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
                className="h-[18px] w-[18px] cursor-pointer accent-blue-600 outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:accent-blue-400 dark:[color-scheme:dark]"
            />
            <label htmlFor={id} className="ms-2.5 cursor-pointer text-sm text-slate-700 dark:text-slate-200 select-none">
                {label}
            </label>
        </div>
    );
};

export default Radio;
