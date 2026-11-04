'use client';

import { faArrowDown19, faArrowUp91, faArrowDownAZ, faArrowUpZA, faArrowDownShortWide, faArrowUpWideShort, faCaretDown, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { TooltipComponent } from "../Layouts/TooltipComponent";
import React, { useState, useEffect, useRef } from 'react';
import Button from '../buttons/Button';
import { cn } from '@/assets/utils';

export function SortControl({ configOptions, dataObject = {}, setSortedDataFn = null, useCompact = false, applySort = false, setApplySortFn = null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [sortField, setSortField] = useState('');
    const [sortDataType, setSortDataType] = useState('string');
    const [orderDirection, setOrderDirection] = useState('');
    const [selectedField, setSelectedField] = useState('Nenhum');
    const [sortIconASC, setSortIconASC] = useState(faArrowDownShortWide);
    const [sortIconDESC, setSortIconDESC] = useState(faArrowUpWideShort);

    const dropdownRef = useRef(null);

    /**
     * Realiza a ordenação do objeto, ao selecionar uma opção de ordenação
     * Apenas em modo COMPACTO
     * @param {string} label - Texto da opção selecionada
     * @param {string} field - Campo utilizado como base para a ordenação
     * @param {string} type  - Tipo de dado referente ao campo (string, number, date)
     * @param {string} direction - Direção da ordenação (asc ou desc)
     */
    const handleOptionClick = (label, field, direction, type) => {
        setOrderDirection(direction);
        setSelectedField(label);
        setSortDataType(type);
        setSortField(field);
        setIsOpen(false);

        if (typeof setSortedDataFn == 'function') {
            let tempData = sortData(field, direction);
            setSortedDataFn(tempData);
        }
    };

    /**
     * Realiza a ordenação do objeto, de acordo com o campo e direção escolhidos, quando uma opção de ordenação for selecionada
     * Apenas em modo NÃO COMPACTO
     * @param {string} label - Texto da opção selecionada
     * @param {string} field - Campo utilizado como base para a ordenação
     * @param {string} type  - Tipo de dado referente ao campo (string, number, date)
     */
    const handleFieldChange = (label, field, type) => {
        setSelectedField(label);
        setSortDataType(type);
        setSortDataIcon(type);
        setSortField(field);
        setIsOpen(false);

        if (orderDirection == '') {
            setOrderDirection('asc');
        }

        if (typeof setSortedDataFn == 'function') {
            let tempData = sortData(field, orderDirection, type);
            setSortedDataFn(tempData);
        }
    };

    /**
     * Altera a direção da ordenação, asc (crescente) ou desc (decrescente)
     * @param {string} direction 
     */
    const handleDirectionChange = (direction) => {
        setOrderDirection(direction);
    };

    useEffect(() => {
        if (applySort) {
            let tempData = sortData(sortField, orderDirection, sortDataType);
            setSortedDataFn(tempData);
        }

        if (typeof setApplySortFn == 'function') {
            setTimeout(() => {
                setApplySortFn(false);
            }, 500);
        }
    }, [applySort]);

    useEffect(() => {
        if (typeof setSortedDataFn == 'function') {
            let tempData = sortData(sortField, orderDirection, sortDataType);
            setSortedDataFn(tempData);
        }
    }, [orderDirection, sortField]);

    const setSortDataIcon = (type) => {
        if (type == 'string') {
            setSortIconASC(faArrowDownAZ);
            setSortIconDESC(faArrowUpZA);
        } else if (type == 'number') {
            setSortIconASC(faArrowDown19);
            setSortIconDESC(faArrowUp91);
        } else {
            setSortIconASC(faArrowDownShortWide);
            setSortIconDESC(faArrowUpWideShort);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function sortData(fieldToSort, direction, type) {
        if (Object.keys(dataObject).length === 0) {
            return [];
        }

        const normalizar = (value) => {
            if (value === null || value === undefined || value === '') return null;

            if (type === 'number') {
                if (typeof value === 'number') return value;
                return parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
            }

            if (type === 'date') {
                //OBS: a data deve estar no formato "DD/MM/YYYY"
                const parts = String(value).split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts.map(Number);
                    return new Date(year, month - 1, day).getTime();
                }
                return null;
            }

            // default: string
            return String(value)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toUpperCase()
                .trim();
        };

        return [...dataObject].sort((a, b) => {
            const valA = normalizar(a[fieldToSort]);
            const valB = normalizar(b[fieldToSort]);

            const isEmptyA = valA === null;
            const isEmptyB = valB === null;

            if (isEmptyA && !isEmptyB) return direction === 'asc' ? 1 : -1;
            if (!isEmptyA && isEmptyB) return direction === 'asc' ? -1 : 1;
            if (isEmptyA && isEmptyB) return 0;

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    if (useCompact) {
        return (
            <div className="inline-block" ref={dropdownRef}>
                <TooltipComponent content={<div className="text-xs z-[100]">Ordenação</div>} usePortal={false}>
                    <button
                        className="flex items-center gap-2 px-3 py-1 mb-1 border border-gray-300 rounded-md bg-white shadow-sm hover:bg-gray-100 xl:py-2.5 xl:px-4"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <FontAwesomeIcon icon={faArrowDownShortWide} width={"16"} height={"16"} className="text-gray-600" />
                    </button>
                </TooltipComponent>

                {isOpen && (
                    <div className="absolute mt-2 min-w-[120px] bg-white border border-gray-200 rounded-md shadow-lg z-50 p-1">
                        {configOptions.map((opt) => (
                            <div
                                key={opt.label}
                                className={cn(
                                    'flex items-center px-3 py-2 text-sm rounded-md m-1',
                                    selectedField === opt.label && 'font-semibold bg-blue-500 text-white',
                                    selectedField !== opt.label && 'text-gray-700 cursor-pointer hover:bg-gray-200'
                                )}
                                onClick={() => handleOptionClick(opt.label, opt.field, opt.direction, opt.type)}
                            >
                                <span>{opt.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    } else {
        return (
            <div className="flex items-center gap-2">
                <div className="relative w-[fit]" ref={dropdownRef}>
                    <div
                        className="flex justify-between items-center border border-gray-300 rounded-md p-2 cursor-pointer bg-white shadow-md xl:py-2 xl:mb-1"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <span className="text-sm text-gray-700">Ordenar por:&nbsp;</span>
                        <FontAwesomeIcon icon={faCaretDown} width={"16"} height={"16"} className="text-gray-500 ms-2" />
                    </div>

                    <div className={cn('absolute top-full w-full bg-white border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto p-2',!isOpen && 'hidden')}>
                        {configOptions.map((opt) => (
                            <div
                                key={opt.label}
                                className={cn(
                                    'px-3 py-2 text-sm flex items-center rounded-md m-1',
                                    selectedField === opt.label && 'font-semibold bg-blue-500 p-2 text-white',
                                    selectedField !== opt.label && 'text-gray-700 cursor-pointer hover:bg-gray-200'
                                )}
                                onClick={() => handleFieldChange(opt.label, opt.field, opt.type)}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Botões de direção - O icone é personalizado de acordo com o tipo de dado selecionado */}
                <div className="inline-flex rounded-md shadow-md border border-gray-300 p-0.5">
                    <TooltipComponent content={<div className="text-xs z-[100]">Ordenação crescente</div>} usePortal={false}>
                        <Button
                            square
                            className={cn('rounded-l-md px-2 py-1.5 xl:py-2.5', orderDirection === 'asc' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-slate-200')}
                            onClick={() => handleDirectionChange('asc')}
                        >
                            <FontAwesomeIcon icon={sortIconASC} width={"16"} height={"16"} />
                        </Button>
                    </TooltipComponent>
                    <TooltipComponent
                        content={
                            <div className="text-xs z-[100]">Ordenação decrescente</div>
                        }
                        usePortal={false}
                    >
                        <Button
                            square
                            className={cn('rounded-r-md px-2 py-1.5 xl:py-2.5', orderDirection === 'desc' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-slate-200')}
                            onClick={() => handleDirectionChange('desc')}
                        >
                            <FontAwesomeIcon icon={sortIconDESC} width={"16"} height={"16"} />
                        </Button>
                    </TooltipComponent>
                </div>
            </div>
        );
    }
}
