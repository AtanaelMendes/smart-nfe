'use client';

import { useState, useRef } from 'react';
import { faCloudUploadAlt, faFile, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAppContext } from '@/context/AppContext';

/**
 * InputFile — Upload com suporte a drag-and-drop, validação de tamanho e tipo.
 *
 * Props:
 *   id           — Identificador do campo
 *   label        — Rótulo principal
 *   subLabel     — Rótulo secundário ou instrução adicional
 *   helperText   — Texto de apoio abaixo do campo
 *   accept       — Array de extensões (ex: ['.xml', '.pdf']). Padrão SmartNFe: ['.xml', '.pdf']
 *   maxSizeMB    — Limite em Megabytes (default: 10)
 *   disabled     — Desabilita a interação
 *   onChange     — Callback `(id, file)` acionado ao selecionar ou limpar arquivo
 *   onError      — Callback opcional `(message)` em caso de falha de validação
 *   required     — Objeto de validação `{ [id]: { error, errorMsg } }`
 */
export default function InputFile({
  id = 'fileInput',
  label = 'Arquivo',
  subLabel,
  helperText,
  accept = ['.xml', '.pdf'],
  maxSizeMB = 10,
  disabled = false,
  onChange,
  onError,
  required,
}) {
  const { toast } = useAppContext();
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const fileInputRef = useRef(null);

  // Normalização das extensões aceitas em caixa baixa
  const normalizedAccept = accept.map((ext) => ext.toLowerCase().trim());

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;

    const droppedFile = e.dataTransfer.files[0];
    if (validaArquivo(droppedFile)) {
      setSelectedFile(droppedFile);
    }
  };

  const handleFileInputChange = (e) => {
    if (disabled) return;
    const file = e.target.files[0];
    if (validaArquivo(file)) {
      setSelectedFile(file);
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setSelectedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (typeof onChange === 'function') {
      onChange(id, null);
    }
  };

  const validaArquivo = (file) => {
    if (!file || disabled) {
      setSelectedFile(null);
      setSelectedFileName('');
      return false;
    }

    // 1. Validação de tamanho (10MB)
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      const msg = `O arquivo não pode exceder ${maxSizeMB}MB. Por favor, selecione um arquivo menor.`;
      toast.error(msg);
      if (typeof onError === 'function') onError(msg);
      setSelectedFile(null);
      setSelectedFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return false;
    }

    // 2. Validação de extensão (insensível a caixa)
    const ext = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!normalizedAccept.includes(ext)) {
      const msg = `Arquivo inválido! Extensões permitidas: ${normalizedAccept.join(', ')}`;
      toast.error(msg);
      if (typeof onError === 'function') onError(msg);
      setSelectedFile(null);
      setSelectedFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return false;
    }

    // Nome truncado para exibição visual
    let displayName = file.name;
    if (displayName.length > 35) {
      displayName = '(...) ' + displayName.slice(-32);
    }
    setSelectedFileName(displayName);

    if (typeof onChange === 'function') {
      onChange(id, file);
    }

    return true;
  };

  const hasError = required?.[id]?.error;
  const errorMsg = required?.[id]?.errorMsg || 'Este campo é obrigatório';

  return (
    <div className="w-full">
      <div
        className={`border-2 rounded-lg border-dashed px-4 py-3 transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-slate-800/40 cursor-not-allowed text-gray-400 border-gray-300 dark:border-slate-700'
            : `cursor-pointer ${
                dragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                  : selectedFile
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'bg-gray-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-800'
              }`
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            openFileDialog();
          }
        }}
      >
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-2 flex items-center justify-center">
            <FontAwesomeIcon
              icon={selectedFile ? faFile : faCloudUploadAlt}
              className={`w-7 h-7 ${
                selectedFile
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : 'text-blue-500 dark:text-blue-400'
              }`}
            />
          </div>
          <div className="col-span-9 min-w-0">
            <span className="text-sm text-slate-700 dark:text-slate-200 block truncate">
              <span className="font-semibold">{label}</span>
              {subLabel && (
                <span className="text-xs italic font-normal ml-1.5 text-slate-500 dark:text-slate-400">
                  {subLabel}
                </span>
              )}
            </span>
            {selectedFileName ? (
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium block mt-0.5 truncate">
                {selectedFileName}
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500 block mt-0.5">
                <span className="font-medium text-blue-600 dark:text-blue-400">Clique para selecionar</span> ou arraste aqui
                &nbsp;({normalizedAccept.join(', ')})
              </span>
            )}
          </div>
          {selectedFile && (
            <div className="col-span-1 flex items-center justify-center">
              <button
                type="button"
                onClick={clearFile}
                className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors p-1"
                title="Remover arquivo"
                aria-label="Remover arquivo selecionado"
              >
                <FontAwesomeIcon icon={faTimes} className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <input
          type="file"
          id={id}
          ref={fileInputRef}
          className="hidden"
          disabled={disabled}
          onChange={handleFileInputChange}
          accept={normalizedAccept.join(',')}
          aria-label={label}
        />
      </div>

      {helperText && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</div>
      )}
      {hasError && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{errorMsg}</div>}
    </div>
  );
}
