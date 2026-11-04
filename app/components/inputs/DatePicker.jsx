import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar } from "@fortawesome/free-regular-svg-icons";
import {
    faAsterisk,
    faChevronCircleLeft,
    faChevronCircleRight,
} from "@fortawesome/free-solid-svg-icons";
import { FieldLabel } from "@/components/Layouts/Typography";
import { cn } from "@/assets/utils";

// Helper functions
const formatDate = (date, formatStr = "dd/MM/yyyy") => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    
    if (formatStr === "dd/MM/yyyy") return `${day}/${month}/${year}`;
    return d.toLocaleDateString("pt-BR");
};

const isValidDate = (date) => {
    return date instanceof Date ? !isNaN(date) : false;
};

const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
};

const Calendar = ({ year, month, onSelectDate, selectedDate }) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
    }

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80">
            <div className="text-center font-semibold text-gray-700 mb-4">
                {monthNames[month]} {year}
            </div>

            <div className="grid grid-cols-7 gap-2 mb-3">
                {weekDays.map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-gray-600">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {days.map((day, idx) => (
                    <button
                        key={idx}
                        onClick={() => day && onSelectDate(new Date(year, month, day))}
                        disabled={!day}
                        className={cn(
                            "p-2 text-sm rounded",
                            !day && "invisible",
                            day && selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year
                                ? "bg-blue-500 text-white"
                                : "hover:bg-gray-100 text-gray-700"
                        )}
                    >
                        {day}
                    </button>
                ))}
            </div>
        </div>
    );
};

const DatePicker = ({ label, onChange, id, maxDate, defaultDate, required }) => {
    const [show, setShow] = useState(false);
    const [selectedDate, setSelectedDate] = useState(
        defaultDate && isValidDate(defaultDate) ? new Date(defaultDate) : null
    );
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [inputValue, setInputValue] = useState(
        defaultDate && isValidDate(defaultDate) ? formatDate(defaultDate, "dd/MM/yyyy") : ""
    );
    const pickerRef = useRef(null);

    const handleSelectDate = (date) => {
        setSelectedDate(date);
        setInputValue(formatDate(date, "dd/MM/yyyy"));
        onChange(formatDate(date, "dd/MM/yyyy"));
        setShow(false);
    };

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleClickOutside = (event) => {
        if (pickerRef.current && !pickerRef.current.contains(event.target)) {
            setShow(false);
        }
    };

    useEffect(() => {
        if (show) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [show]);

    return (
        <div ref={pickerRef} className="relative">
            {label && (
                <div className="flex flex-row gap-1 mb-2">
                    {required && (
                        <FontAwesomeIcon
                            icon={faAsterisk}
                            width="10"
                            height="10"
                            color="red"
                            className="self-start"
                        />
                    )}
                    <label htmlFor={id}>
                        <FieldLabel>
                            {label || ""}
                        </FieldLabel>
                    </label>
                </div>
            )}

            <div
                className={cn(
                    "flex bg-gray-50 border border-gray-300 rounded-lg p-2 cursor-pointer",
                    show && "border-blue-500 border-2"
                )}
                onClick={() => setShow(!show)}
            >
                <div className="flex items-center mr-2">
                    <FontAwesomeIcon
                        icon={faCalendar}
                        width="20"
                        height="20"
                        className={cn(show ? "text-blue-500" : "text-slate-500")}
                    />
                </div>
                <input
                    type="text"
                    id={id}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Selecione uma data"
                    className="outline-none bg-transparent w-full text-gray-700"
                    readOnly
                />
            </div>

            {show && (
                <div className="absolute top-full mt-2 z-50">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                            <button
                                onClick={handlePrevMonth}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <FontAwesomeIcon
                                    icon={faChevronCircleLeft}
                                    width="20"
                                    height="20"
                                    className="text-slate-500"
                                />
                            </button>
                            <span className="font-semibold text-gray-700">
                                {new Date(currentYear, currentMonth).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                            </span>
                            <button
                                onClick={handleNextMonth}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <FontAwesomeIcon
                                    icon={faChevronCircleRight}
                                    width="20"
                                    height="20"
                                    className="text-slate-500"
                                />
                            </button>
                        </div>

                        <Calendar
                            year={currentYear}
                            month={currentMonth}
                            onSelectDate={handleSelectDate}
                            selectedDate={selectedDate}
                        />

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    handleSelectDate(today);
                                }}
                                className="flex-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                            >
                                Hoje
                            </button>
                            <button
                                onClick={() => {
                                    setInputValue("");
                                    setSelectedDate(null);
                                    onChange("");
                                    setShow(false);
                                }}
                                className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                            >
                                Limpar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
