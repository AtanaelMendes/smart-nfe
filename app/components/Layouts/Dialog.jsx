'use client';

import { useState, useEffect, useCallback } from 'react';
import InputTextArea from '../inputs/InputTextArea';
import Button from '@/components/buttons/Button';
import { empty } from '@/assets/utils';
import { useAppContext } from '@/context/AppContext';

/**
 * Dialog — Modal de confirmação seguro e padronizado do SmartNFe.
 *
 * Props:
 *   showDialog             — Boolean controlando visibilidade
 *   setDialogControl       — Função setter para alternar visibilidade (ex: setShowModal)
 *   title                  — Título do modal (ou mensagem direta quando sem textarea)
 *   hideTextArea           — Se true, esconde o campo de texto de motivo
 *   textAreaLabel          — Rótulo do textarea (default: 'Motivo')
 *   textAreaMinLength      — Quantidade mínima de caracteres exigida
 *   maxLength              — Quantidade máxima de caracteres permitida (default: 200)
 *   btnCancel              — Texto do botão cancelar (default: 'CANCELAR')
 *   btnAccept              — Texto do botão confirmar (default: 'OK')
 *   confirmActionCallback  — Callback `(description)` chamado ao confirmar
 *   closeDialogCallback    — Callback opcional chamado ao fechar/cancelar
 *   small                  — Boolean para modal em largura reduzida
 */
export default function Dialog({
  showDialog = false,
  setDialogControl,
  title = 'Confirmar ação',
  hideTextArea = false,
  textAreaLabel = 'Motivo',
  textAreaMinLength,
  maxLength = 200,
  btnCancel = 'CANCELAR',
  btnAccept = 'OK',
  confirmActionCallback,
  closeDialogCallback,
  small = false,
}) {
  const { toast } = useAppContext();
  const [description, setDescription] = useState('');

  const closeDialog = useCallback(() => {
    setDescription('');
    if (typeof closeDialogCallback === 'function') {
      closeDialogCallback();
    }
    if (typeof setDialogControl === 'function') {
      setDialogControl(false);
    }
  }, [closeDialogCallback, setDialogControl]);

  // Fechamento via tecla Escape
  useEffect(() => {
    if (!showDialog) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeDialog();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDialog, closeDialog]);

  const acceptDialog = useCallback(() => {
    if (!empty(textAreaMinLength) && description.length < textAreaMinLength) {
      toast.error(
        `A quantidade mínima de caracteres para o campo [${textAreaLabel}] é de ${textAreaMinLength} caracteres!`
      );
      return;
    }

    if (typeof confirmActionCallback === 'function') {
      confirmActionCallback(description);
    }
    setDescription('');
    if (typeof setDialogControl === 'function') {
      setDialogControl(false);
    }
  }, [description, textAreaMinLength, textAreaLabel, confirmActionCallback, setDialogControl, toast]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeDialog();
    }
  };

  if (!showDialog) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className={`w-full ${
          small ? 'max-w-md' : 'max-w-lg'
        } bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col`}
      >
        {/* Cabeçalho */}
        <div className="bg-blue-600 dark:bg-blue-700 px-4 py-3 text-white font-semibold flex items-center justify-between">
          <h2 id="dialog-title" className="text-sm font-semibold">
            {hideTextArea ? 'Confirmar ação' : title}
          </h2>
        </div>

        {/* Corpo do Modal */}
        <div className="p-4 flex-1">
          {hideTextArea ? (
            <p className="text-sm text-slate-700 dark:text-slate-200 py-2">
              {title}
            </p>
          ) : (
            <InputTextArea
              rows="4"
              maxLength={maxLength}
              value={description}
              id="confirm_description"
              helperText={
                textAreaMinLength
                  ? `Mínimo de ${textAreaMinLength} caracteres`
                  : ''
              }
              minLength={textAreaMinLength || ''}
              label={textAreaLabel}
              onChange={(_, value) => setDescription(value || '')}
            />
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 border-t border-gray-200 dark:border-slate-800 flex justify-end gap-2.5">
          {btnCancel && (
            <Button
              buttonType="danger"
              outline
              size="small"
              onClick={closeDialog}
            >
              {btnCancel}
            </Button>
          )}
          <Button
            buttonType="success"
            size="small"
            onClick={acceptDialog}
          >
            {btnAccept}
          </Button>
        </div>
      </div>
    </div>
  );
}
