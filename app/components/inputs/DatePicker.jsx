import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar } from "@fortawesome/free-regular-svg-icons";
import {
    faChevronCircleLeft,
    faChevronCircleRight,
} from "@fortawesome/free-solid-svg-icons";
import InputText from "./InputText";
import Button from "@/components/buttons/Button";
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4 w-80">
            <div className="text-center font-medium text-slate-700 dark:text-slate-200 mb-4">
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
                    <Button
                        key={idx}
                        onClick={() => day && onSelectDate(new Date(year, month, day))}
                        disabled={!day}
                        className={cn(
                            "w-full p-2 text-sm font-normal",
                            !day && "invisible",
                            day && selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year
                                ? "bg-blue-500 text-white"
                                : "hover:bg-blue-50 dark:hover:bg-blue-400/10 text-slate-700 dark:text-slate-200"
                        )}
                    >
                        {day}
                    </Button>
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
            <InputText id={id} label={label} required={required} value={inputValue} readOnly
                placeholder="Selecione uma data" onClick={() => setShow((previous) => !previous)}
                aria-haspopup="dialog" aria-expanded={show}
                endAdornment={<Button buttonType="ghost" size="small" onClick={() => setShow((previous) => !previous)} title="Abrir calendário" aria-label="Abrir calendário" className="h-8 min-h-0 w-8 rounded-full p-0"><FontAwesomeIcon icon={faCalendar} className="h-4 w-4" /></Button>} />

            {show && (
                <div className="absolute top-full mt-2 z-50">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                            <Button
                                onClick={handlePrevMonth}
                                className="p-1 hover:bg-gray-100"
                            >
                                <FontAwesomeIcon
                                    icon={faChevronCircleLeft}
                                    width="20"
                                    height="20"
                                    className="text-slate-500 dark:text-slate-400"
                                />
                            </Button>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                {new Date(currentYear, currentMonth).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                            </span>
                            <Button
                                onClick={handleNextMonth}
                                className="p-1 hover:bg-gray-100"
                            >
                                <FontAwesomeIcon
                                    icon={faChevronCircleRight}
                                    width="20"
                                    height="20"
                                    className="text-slate-500 dark:text-slate-400"
                                />
                            </Button>
                        </div>

                        <Calendar
                            year={currentYear}
                            month={currentMonth}
                            onSelectDate={handleSelectDate}
                            selectedDate={selectedDate}
                        />

                        <div className="flex gap-2 mt-4">
                            <Button
                                buttonType="primary"
                                size="small"
                                onClick={() => {
                                    const today = new Date();
                                    handleSelectDate(today);
                                }}
                                className="flex-1 px-3 py-1"
                            >
                                Hoje
                            </Button>
                            <Button
                                buttonType="secondary"
                                bordered
                                size="small"
                                onClick={() => {
                                    setInputValue("");
                                    setSelectedDate(null);
                                    onChange("");
                                    setShow(false);
                                }}
                                className="flex-1 px-3 py-1"
                            >
                                Limpar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
