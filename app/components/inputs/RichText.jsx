'use client'
import dynamic from 'next/dynamic'
import { useRef, useState, useEffect } from 'react'
import 'suneditor/dist/css/suneditor.min.css'
import Button from '../buttons/Button'
import ProgressBar from './ProgressBar'
import { toast } from 'react-toastify'
import { TooltipComponent } from '../Layouts/TooltipComponent'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAsterisk } from '@fortawesome/free-solid-svg-icons';

const SunEditor = dynamic(() => import('suneditor-react'), { ssr: false })

export default function RichText({ id, label, value, onChange, required, maxLength, small, height = 200 }) {
    const editorRef = useRef(null);
    const [percent, setPercent] = useState(0);
    const [editorContent, setEditorContent] = useState(value || "");

    const MAX_CHARACTERS = maxLength || 4000;

    useEffect(() => {
        setEditorContent(value || "");
    }, [value]);

    const handleChange = (editorContent) => {
        const editor = editorRef.current
        if (editor) {
            const textLength = editorContent.length; // Considera tudo que sera salvo no banco, incluindo tags

            if (textLength <= MAX_CHARACTERS) {
                setEditorContent(editorContent);

                if (typeof onChange === "function") {
                    onChange(id, editorContent);
                }

                setPercent(Math.floor((editorContent.length * 100) / MAX_CHARACTERS));
            } else {
                toast.info("Você atingiu o limite de caracteres permitidos.\nÉ possível que haja perda de informações ao salvar.");
                setPercent(100);
            }
        }
    }

    const handleFormatText = () => {
        const editor = editorRef.current
        if (!editor) return

        const html = editor.getContents()
        const plain = editor.getText().trim()

        if (!plain) return

        // Transforma todo o texto em minúsculas, depois capitaliza a primeira letra
        const lowered = plain.toLowerCase()
        const formattedText = lowered.charAt(0).toUpperCase() + lowered.slice(1)

        let remaining = formattedText
        let result = ''
        let regex = /(<[^>]+>)|([^<]+)/g // separa tags e textos

        let match
        while ((match = regex.exec(html)) !== null) {
            if (match[1]) {
                // tag
                result += match[1]
            } else if (match[2]) {
                // texto puro
                const len = match[2].length
                result += remaining.slice(0, len)
                remaining = remaining.slice(len)
            }
        }

        editor.setContents(result)
    }

    const customizeTooltips = () => {
        const btnMap = {
            'undo': 'Desfazer',
            'redo': 'Refazer',
            'bold': 'Negrito',
            'italic': 'Itálico',
            'underline': 'Sublinhado',
            'list': 'Listas',
            'removeFormat': 'Limpar formatação',
        }

        //Traduz o tooltip dos botões
        Object.entries(btnMap).forEach(([cmd, label]) => {
            const buttons = document.querySelectorAll(`button[data-command="${cmd}"]`);
            buttons.forEach((btn) => {
                let tp = btn.getElementsByClassName('se-tooltip-text');
                if (tp && tp.length > 0) {
                    tp[0].innerText = label;
                }
            })
        })
        
        //Adiciona o novo botão "Alterar para minusculas"
        const editor = editorRef.current;
        if (Object.keys(editor).length < 1) return
        const toolbar = editor.getContext().element.toolbar.firstChild;
        if (toolbar) {
            const moduleDiv = document.createElement('div')
            moduleDiv.className = 'se-btn-module se-btn-module-border'

            const ul = document.createElement('ul')
            ul.className = 'se-menu-list'

            const li = document.createElement('li')
            li.className = 'se-menu-item'

            const button = document.createElement('button')
            button.type = 'button'
            button.className = 'se-btn se-tooltip'
            button.setAttribute('tabindex', '-1')

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            svg.setAttribute('viewBox', '0 0 24 24')
            svg.setAttribute('width', '18')
            svg.setAttribute('height', '18')

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            text.setAttribute('x', '0')
            text.setAttribute('y', '20')
            text.setAttribute('font-size', '26')
            text.setAttribute('font-weight', '600')
            text.setAttribute('padding-right', '4px')
            text.setAttribute('font-family', 'sans-serif')
            text.textContent = 'Aa'

            svg.appendChild(text)

            const tooltipInner = document.createElement('span')
            tooltipInner.className = 'se-tooltip-inner'

            const tooltipText = document.createElement('span')
            tooltipText.className = 'se-tooltip-text'
            tooltipText.textContent = 'Somente a primeira letra maiúscula'

            tooltipInner.appendChild(tooltipText)

            button.appendChild(svg)
            button.appendChild(tooltipInner)
            li.appendChild(button)
            ul.appendChild(li)
            moduleDiv.appendChild(ul)

            toolbar.appendChild(moduleDiv)

            button.addEventListener('click', () => {
                handleFormatText();
            })
        }
    }

    const handleEditorInstance = (editor) => {
        editorRef.current = editor
        setTimeout(customizeTooltips, 300) // aguarda DOM montar
    }

    return (
        <>
            {label && (
                <label htmlFor={id} className={`${small ? 'mb-0.5 text-xs' : 'mb-2'} text-sm font-medium text-gray-900 inline-flex`}>
                    {required && (
                        <FontAwesomeIcon
                            icon={faAsterisk}
                            width="10"
                            height="10"
                            color="red"
                            className="self-start"
                        />
                    )}
                    {label}
                </label>
            )}
            <div className="border rounded shadow relative">
                <SunEditor
                    getSunEditorInstance={handleEditorInstance}
                    setContents={editorContent}
                    setOptions={{
                        height: height,
                        defaultStyle: 'font-family: Inter, sans-serif; font-size: 14px;',
                        buttonList: [
                            ['undo', 'redo'],
                            ['bold', 'italic', 'underline'],
                            ['list', 'removeFormat'],
                        ],
                        showPathLabel: false,
                    }}
                    onChange={handleChange}
                />

                <div className="absolute right-6 bottom-0.5 flex items-center">
                    <ProgressBar id={id + "_pbar"} value={percent} />
                </div>
            </div>
        </>
    )
}
