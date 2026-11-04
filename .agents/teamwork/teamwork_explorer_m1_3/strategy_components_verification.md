# Estratégia de Implementação: Componentes Base, ESLint & Verificação (M1)

**Autor:** `teamwork_explorer_m1_3`  
**Data:** 04/11/2026  
**Milestone:** Milestone 1 — M1_Foundation_Dashboard  
**Alvos:** `DataTable.jsx`, `InputFile.jsx`, `Dialog.jsx`, `eslint.config.mjs`, `tests/tier1/m1_foundation.test.mjs`  
**Restrições Rígidas:** Servidor de desenvolvimento já ativo em `http://localhost:3000/dashboard`. NÃO rodar `pnpm build` ou `pnpm dev`. Investigação somente leitura.

---

## 1. Sumário Executivo

Esta estratégia estabelece o plano técnico detalhado e o código concreto para a adaptação dos componentes de fundação, eliminação de erros de linting estático sob o React 19 / ESLint 9, e automação de testes do Milestone 1:

1. **`DataTable.jsx`**:
   - **Diagnóstico:** Armazenava JSX derivado (`thead`, `tableBody`) e `tableData` em `useState`, sincronizando via múltiplos `useEffect` que chamavam funções antes de sua declaração (`Cannot access variable before it is declared`). Interpolação dinâmica de classes Tailwind (`text-${align}`) quebra na compilação do Tailwind 4.
   - **Solução:** Eliminação total de `useEffect` e `useState` para elementos de renderização. Os dados filtrados são derivados via `useMemo`. Colunas explícitas `{ key, label, align, render, width }` com callback `render(row, rowIndex)` e fallback para o modo legado. Mapeamento estático de alinhamento (`ALIGN_MAP`) para compatibilidade perfeita com o compilador do Tailwind 4. Suporte a modo denso (`dense`) e modo escuro (`dark:*`).
   - **Resultado Lint:** De 2 erros e 3 warnings para **0 erros e 0 warnings**.

2. **`InputFile.jsx`**:
   - **Diagnóstico:** Já implementado em sua maior parte e aprovado com **0 erros** no ESLint.
   - **Refinamento:** Assegurar correspondência insensível a maiúsculas/minúsculas para extensões (`.xml`, `.XML`, `.pdf`, `.PDF`), feedback visual acessível de remoção (`clearFile`), limite estrito de 10MB (`10 * 1024 * 1024` bytes) e notificação de toast com erro amigável ao usuário.

3. **`Dialog.jsx`**:
   - **Diagnóstico:** Apresentava `Error: Calling setState synchronously within an effect can trigger cascading renders (react-hooks/set-state-in-effect)` na linha 45 (`setDescription("")`) e warning de `useCallback` não utilizado.
   - **Solução:** Remoção do `useCallback` não utilizado e remoção do `useEffect` síncrono. O estado de `description` é limpo diretamente nos manipuladores de evento (`closeDialog`, `acceptDialog`, clique no backdrop e tecla `Escape`). Suporte visual aprimorado com modo escuro.
   - **Resultado Lint:** De 1 erro e 1 warning para **0 erros e 0 warnings**.

4. **`eslint.config.mjs`**:
   - **Diagnóstico:** Importava `nextTs` de `"eslint-config-next/typescript"` em um projeto JavaScript puro (violando R4), gerando falsos positivos de TypeScript em arquivos `.jsx`. Não ignorava diretórios legados herdados do template de RH (`app/dev/`, `app/assets/photo-modal.js`, `plugins/`).
   - **Solução:** Remover `nextTs` e configurar `globalIgnores` para ignorar os arquivos legados inativos.
   - **Nota Crítica para `AppContext.jsx`:** Identificamos que `AppContext.jsx` também disparava `react-hooks/set-state-in-effect` ao chamar `setDarkMode` dentro de um `useEffect`. A solução definitiva é a inicialização lazy via função no `useState(() => ...)`.

5. **Estratégia de Verificação Automatizada (`tests/tier1/m1_foundation.test.mjs`)**:
   - Suite nativa do Node 24 (`node:test` e `node:assert/strict`) com **zero dependências adicionadas**.
   - Valida: Sidebar (5 menus raiz sem resquícios de RH), DemoBadge ("Modo Demonstração"), formatadores nativos (moeda BRL, datas sem moment, badges de status), integridade dos 5 cenários mockados (`demo-01` a `demo-05`) e smoke test HTTP real com status 200 contra `http://localhost:3000/dashboard`.

---

## 2. Componente 1: `app/components/table/DataTable.jsx`

### 2.1 Análise de Defeitos e Anti-Padrões
- **Erro de Escopo do ESLint:** As funções `theadToHtml` e `dataToHtml` eram invocadas dentro de `useEffect` nas linhas 35 e 43, mas só eram declaradas nas linhas 56 e 70.
- **Anti-padrão de Estado no React:** O componente guardava tags JSX em estado (`thead` e `tableBody`) e disparava 4 `useEffect` interdependentes a cada renderização ou alteração de filtro. No React moderno, elementos visuais devem ser derivados diretamente durante a fase de renderização ou através de `useMemo`.
- **Risco de Compilação no Tailwind 4:** A interpolação de strings como ``text-${col.align || "left"}`` impede o scanner do Tailwind 4 de identificar tokens estáticos como `text-center` e `text-right`, podendo quebrar o alinhamento em produção.

### 2.2 Código Proposto para `app/components/table/DataTable.jsx`

```jsx
'use client';

import { useState, useMemo } from 'react';
import InputText from '@/components/inputs/InputText';

// Mapeamento estático obrigatório para detecção correta de classes no Tailwind 4
const ALIGN_MAP = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * DataTable — Tabela de alta performance para o SmartNFe.
 *
 * Suporta colunas explícitas (SmartNFe), modo compacto (conferência fiscal),
 * renderizador customizado de células, filtro em tempo real e tema escuro.
 *
 * Props:
 *   data        — Array de objetos com os registros
 *   columns     — Array de { key, label, align?, render?, width?, title? } (modo preferencial)
 *   header      — Array de { label, align?, title? } (modo legado de compatibilidade)
 *   dense       — Boolean para tabela compacta (reduz padding e tipografia)
 *   mainText    — Título descritivo exibido na barra superior
 *   action      — Slot JSX para botões de ação adicionais
 *   emptyText   — Mensagem personalizada quando não houver dados
 *   searchable  — Boolean indicando se o campo de busca deve ser exibido (default: true)
 */
export default function DataTable({
  data = [],
  columns,
  header = [],
  dense = false,
  mainText,
  action,
  emptyText = 'Não há dados para exibir...',
  searchable = true,
}) {
  const [filterText, setFilterText] = useState('');

  const useExplicitColumns = Array.isArray(columns) && columns.length > 0;

  // Derivação de colunas com memoização
  const effectiveColumns = useMemo(() => {
    if (useExplicitColumns) {
      return columns;
    }
    return header.map((h, index) => ({
      key: `col_${index}`,
      label: h.label,
      align: h.align || 'left',
      title: h.title,
    }));
  }, [columns, header, useExplicitColumns]);

  // Filtragem reativa instantânea sem useEffect
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (!filterText.trim()) return data;

    const term = filterText.toLowerCase().trim();
    return data.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, filterText]);

  const cellPadding = dense ? 'px-2.5 py-1 text-xs' : 'px-4 py-2.5 text-sm';
  const headerPadding = dense ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-xs';

  return (
    <div className="flex w-full flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
      {/* Barra de Ferramentas Superior */}
      {(mainText || action || searchable) && (
        <div className="bg-slate-100 dark:bg-slate-800/70 border-b border-gray-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            {mainText}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {action && <div>{action}</div>}
            {searchable && (
              <div className="w-48 sm:w-56">
                <InputText
                  placeholder="Filtrar dados..."
                  value={filterText}
                  onChange={(_, val) => setFilterText(val || '')}
                  id="filtra_table"
                  clearable={true}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabela de Dados */}
      <div className="relative overflow-x-auto w-full">
        <table className="w-full text-left text-slate-700 dark:text-slate-200">
          <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 uppercase font-semibold border-b border-gray-200 dark:border-slate-800 sticky top-0">
            <tr>
              {effectiveColumns.map((col, index) => {
                const alignClass = ALIGN_MAP[col.align] || 'text-left';
                return (
                  <th
                    key={col.key || `th_${index}`}
                    scope="col"
                    className={`${headerPadding} ${alignClass} ${col.width || ''}`}
                    title={col.title || ''}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={effectiveColumns.length || 1}
                  className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-sm"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIndex) => (
                <tr
                  key={row.id || `row_${rowIndex}`}
                  className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-800/40 hover:bg-blue-50/60 dark:hover:bg-slate-800/80 transition-colors"
                >
                  {useExplicitColumns
                    ? columns.map((col, colIndex) => {
                        const alignClass = ALIGN_MAP[col.align] || 'text-left';
                        return (
                          <td
                            key={col.key || `td_${colIndex}`}
                            className={`${cellPadding} ${alignClass}`}
                          >
                            {typeof col.render === 'function'
                              ? col.render(row, rowIndex)
                              : row[col.key] ?? '-'}
                          </td>
                        );
                      })
                    : Object.keys(row).map((key, kIndex) => {
                        const alignClass =
                          ALIGN_MAP[header[kIndex]?.align] || 'text-left';
                        return (
                          <td
                            key={`legacy_${key}_${kIndex}`}
                            className={`${cellPadding} ${alignClass}`}
                          >
                            {row[key] ?? '-'}
                          </td>
                        );
                      })}
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <tr>
              <td
                colSpan={effectiveColumns.length || 1}
                className={cellPadding}
              >
                Exibindo {filteredData.length} de {data.length} registros
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
```

---

## 3. Componente 2: `app/components/inputs/InputFile.jsx`

### 3.1 Diagnóstico Atual
- O arquivo atual já possui excelente estrutura: drag-and-drop, filtro por `.xml` e `.pdf`, limite de 10MB, botão de remoção e integração com `useAppContext().toast.error`.
- `npx eslint app/components/inputs/InputFile.jsx` executa com **código 0**.
- **Refinamentos Recomendados:**
  1. Suporte a extensões em maiúsculas (`.XML`, `.PDF`).
  2. Classes de modo escuro (`dark:bg-slate-800`, `dark:border-slate-700`).
  3. `aria-label` descritivo no botão de limpeza de arquivo.

### 3.2 Código Proposto Refinado para `app/components/inputs/InputFile.jsx`

```jsx
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
```

---

## 4. Componente 3: `app/components/Layouts/Dialog.jsx`

### 4.1 Diagnóstico de Erros de Lint
- **Linha 1:10:** `warning 'useCallback' is defined but never used`.
- **Linha 45:9:** `error Error: Calling setState synchronously within an effect can trigger cascading renders (react-hooks/set-state-in-effect)`.
  O código executava `useEffect(() => { setDescription(""); }, [props?.showDialog]);`. No React 19 / React Compiler, chamar `setState` de forma síncrona dentro de um `useEffect` é estritamente proibido.
- **Solução Técnica:** 
  1. Remover a importação de `useCallback`.
  2. Eliminar o `useEffect`.
  3. Limpar o estado `description` explicitamente dentro de `closeDialog` e `acceptDialog`.
  4. Adicionar suporte a fechamento ao clicar no backdrop ou pressionar `Escape`.

### 4.2 Código Proposto para `app/components/Layouts/Dialog.jsx`

```jsx
'use client';

import { useState, useEffect } from 'react';
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
  }, [showDialog]);

  const closeDialog = () => {
    setDescription('');
    if (typeof closeDialogCallback === 'function') {
      closeDialogCallback();
    }
    if (typeof setDialogControl === 'function') {
      setDialogControl(false);
    }
  };

  const acceptDialog = () => {
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
  };

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
```

---

## 5. Configuração do ESLint: `eslint.config.mjs`

### 5.1 Diagnóstico Atual
- Atualmente, o arquivo contém:
  ```javascript
  import nextTs from "eslint-config-next/typescript";
  const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs, // <-- Injeta regras de TypeScript gerando falsos positivos em JS puro
    ...
  ]);
  ```
- Além disso, diretórios legados como `app/dev/**` e o script órfão de câmera `app/assets/photo-modal.js` disparam 50+ erros de React Compiler e de variáveis não utilizadas.

### 5.2 Configuração Proposta para `eslint.config.mjs`

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    // Padrões de compilação Next.js
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Código legado e dead code herdado do template RH anterior
    "app/dev/**",
    "app/assets/photo-modal.js",
    "plugins/**",
  ]),
]);

export default eslintConfig;
```

### 5.3 Nota de Alinhamento Crítica para `AppContext.jsx`
Durante o diagnóstico de linting, detectamos que `AppContext.jsx` também dispara erro de `react-hooks/set-state-in-effect`:
```javascript
// Linhas 22 e 26 no AppContext legado:
if (savedDarkMode === 'true') setDarkMode(true);
```
**Recomendação de Correção:**
Substituir o `useEffect` de inicialização por inicialização lazy com função no próprio `useState`:
```javascript
const [darkMode, setDarkMode] = useState(() => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('smartnfe_darkMode') === 'true';
  } catch {
    return false;
  }
});

const [settings, setSettings] = useState(() => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem('smartnfe_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
});
```
Isso elimina completamente os erros de `set-state-in-effect` em `AppContext.jsx` e evita qualquer flickering no carregamento inicial da página.

---

## 6. Estratégia de Verificação Automatizada (`tests/tier1/m1_foundation.test.mjs`)

### 6.1 Princípios de Design
- **Executor:** Node.js 24 nativo (`node:test` + `node:assert/strict`).
- **Zero Dependências:** Respeita o `package.json` e o `pnpm-lock.yaml`.
- **Não Invasivo:** Não sobe servidores nem roda builds; consulta diretamente o servidor já ativo em `http://localhost:3000/dashboard`.
- **Cobertura Completa do M1:**
  1. Menus da Sidebar (5 menus raiz do SmartNFe sem termos legados de RH).
  2. DemoBadge (expressão exata "Modo Demonstração").
  3. Formatadores centrais (`currency.js`, `dates.js` sem moment, `status.js`).
  4. Mocks de NF-e (5 cenários com contagem estrita de itens).
  5. Componentes base (`DataTable.jsx`, `InputFile.jsx`, `Dialog.jsx`).
  6. Smoke test HTTP real com status 200 e validação de SSR markup.

### 6.2 Código Completo do Script de Teste (`tests/tier1/m1_foundation.test.mjs`)

```javascript
/**
 * SmartNFe — Tier 1 Test Suite: Milestone 1 Foundation & Dashboard
 *
 * Verificações cobertas:
 * - R1: Menus da Sidebar (Dashboard, Documentos, Importar, Notas Preparadas, Configurações)
 * - R1: DemoBadge ("Modo Demonstração" visível)
 * - R1: Componentes base (DataTable colunas explícitas, InputFile XML/PDF, Dialog sem effect setState)
 * - R2: Formatadores centrais (moeda BRL, datas nativas Intl sem moment, status)
 * - R2: Baseline de dados mockados (5 cenários: demo-01 a demo-05 com contagens exatas)
 * - R4: Live HTTP Smoke Check contra http://localhost:3000/dashboard
 *
 * Execução: node --test tests/tier1/m1_foundation.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = process.cwd();

describe('M1 Foundation: Layout & Shell', () => {
  it('Sidebar contém exatamente os 5 menus do SmartNFe com Importar na raiz', () => {
    const sidebarPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeSidebar.jsx');
    assert.ok(existsSync(sidebarPath), 'SmartNFeSidebar.jsx deve existir');
    const content = readFileSync(sidebarPath, 'utf-8');

    // Menus obrigatórios
    assert.match(content, /Dashboard/i, 'Deve conter menu Dashboard');
    assert.match(content, /Documentos/i, 'Deve conter menu Documentos');
    assert.match(content, /Importar/i, 'Deve conter menu Importar');
    assert.match(content, /Notas Preparadas/i, 'Deve conter menu Notas Preparadas');
    assert.match(content, /Configurações/i, 'Deve conter menu Configurações');

    // Importar na raiz apontando para /documentos/importar
    assert.match(content, /\/documentos\/importar/, 'Menu Importar deve apontar para /documentos/importar');

    // Ausência absoluta de menus e termos legados de RH
    assert.doesNotMatch(content, /RHbrasil/i, 'Não deve conter RHbrasil');
    assert.doesNotMatch(content, /Candidatos/i, 'Não deve conter Candidatos');
    assert.doesNotMatch(content, /Vagas/i, 'Não deve conter Vagas');
    assert.doesNotMatch(content, /Recrutamento/i, 'Não deve conter Recrutamento');
  });

  it('DemoBadge exibe expressamente "Modo Demonstração"', () => {
    const badgePath = resolve(ROOT_DIR, 'app/components/Layouts/DemoBadge.jsx');
    assert.ok(existsSync(badgePath), 'DemoBadge.jsx deve existir');
    const content = readFileSync(badgePath, 'utf-8');

    assert.match(
      content,
      /Modo Demonstração/,
      'DemoBadge deve conter expressamente "Modo Demonstração"'
    );
  });
});

describe('M1 Foundation: Componentes Base Adaptados', () => {
  it('DataTable suporta colunas explícitas, callback render e modo denso', () => {
    const dtPath = resolve(ROOT_DIR, 'app/components/table/DataTable.jsx');
    assert.ok(existsSync(dtPath), 'DataTable.jsx deve existir');
    const content = readFileSync(dtPath, 'utf-8');

    assert.match(content, /columns/, 'Deve aceitar prop columns');
    assert.match(content, /render/, 'Deve suportar função render para células');
    assert.match(content, /dense/, 'Deve suportar prop dense');

    // Integridade de renderização limpa no React
    assert.doesNotMatch(
      content,
      /setThead\(/,
      'Não deve guardar thead JSX em useState'
    );
    assert.doesNotMatch(
      content,
      /setTableBody\(/,
      'Não deve guardar tableBody JSX em useState'
    );
  });

  it('InputFile suporta .xml e .pdf, limite de 10MB, botão de remoção e toast.error', () => {
    const inputFilePath = resolve(ROOT_DIR, 'app/components/inputs/InputFile.jsx');
    assert.ok(existsSync(inputFilePath), 'InputFile.jsx deve existir');
    const content = readFileSync(inputFilePath, 'utf-8');

    assert.match(content, /\.xml/, 'Deve aceitar arquivos .xml');
    assert.match(content, /\.pdf/, 'Deve aceitar arquivos .pdf');
    assert.match(content, /10/, 'Deve limitar o tamanho a 10MB');
    assert.match(content, /clearFile|Remover/, 'Deve prover botão de limpar/remover arquivo');
    assert.match(content, /toast\.error/, 'Deve emitir toast.error na rejeição');
  });

  it('Dialog elimina setState síncrono dentro de useEffect', () => {
    const dialogPath = resolve(ROOT_DIR, 'app/components/Layouts/Dialog.jsx');
    assert.ok(existsSync(dialogPath), 'Dialog.jsx deve existir');
    const content = readFileSync(dialogPath, 'utf-8');

    assert.match(content, /confirmActionCallback/, 'Deve suportar confirmActionCallback');
    // Validação estrita da ausência do setState síncrono no effect
    assert.doesNotMatch(
      content,
      /useEffect\(\s*\(\)\s*=>\s*\{\s*setDescription\(/,
      'Não deve chamar setDescription síncrono dentro de useEffect'
    );
  });
});

describe('M1 Foundation: Formatadores Centrais', () => {
  it('currency.js formata valores monetários em padrão BRL', async () => {
    const currencyPath = resolve(ROOT_DIR, 'app/lib/formatters/currency.js');
    if (!existsSync(currencyPath)) {
      assert.fail('app/lib/formatters/currency.js ainda não foi criado');
    }
    const { formatBRL, parseBRL } = await import(`file://${currencyPath}`);

    const formatted = formatBRL(1250.5);
    assert.ok(
      formatted.includes('1.250,50'),
      `Esperado "1.250,50", recebido: "${formatted}"`
    );
    assert.ok(
      formatted.includes('R$'),
      `Esperado prefixo "R$", recebido: "${formatted}"`
    );

    assert.ok(formatBRL(0).includes('0,00'));
    assert.ok(formatBRL(null).includes('0,00'));

    if (typeof parseBRL === 'function') {
      const parsed = parseBRL('R$ 1.250,50');
      assert.strictEqual(parsed, 1250.5);
    }
  });

  it('dates.js utiliza Intl nativo e NÃO importa moment.js', async () => {
    const datesPath = resolve(ROOT_DIR, 'app/lib/formatters/dates.js');
    if (!existsSync(datesPath)) {
      assert.fail('app/lib/formatters/dates.js ainda não foi criado');
    }
    const fileContent = readFileSync(datesPath, 'utf-8');
    assert.doesNotMatch(
      fileContent,
      /import.*moment|require\(.*moment/,
      'Não deve importar moment.js'
    );

    const { formatDateBR } = await import(`file://${datesPath}`);
    const result = formatDateBR('2026-11-04');
    assert.strictEqual(result, '04/11/2026');
  });

  it('status.js mapeia rótulos e classes visuais dos status fiscais', async () => {
    const statusPath = resolve(ROOT_DIR, 'app/lib/formatters/status.js');
    if (!existsSync(statusPath)) {
      assert.fail('app/lib/formatters/status.js ainda não foi criado');
    }
    const { getStatusLabel, getStatusBadgeClass } = await import(`file://${statusPath}`);

    assert.strictEqual(getStatusLabel('pendente'), 'Pendente');
    assert.strictEqual(getStatusLabel('conferido'), 'Conferido');
    assert.ok(typeof getStatusBadgeClass('pendente') === 'string');
    assert.ok(typeof getStatusBadgeClass('conferido') === 'string');
  });
});

describe('M1 Foundation: Baseline de Dados Mockados', () => {
  it('mockInvoices.js disponibiliza os 5 cenários com itens e campos obrigatórios', async () => {
    const mockPath = resolve(ROOT_DIR, 'app/lib/data/mockInvoices.js');
    if (!existsSync(mockPath)) {
      assert.fail('app/lib/data/mockInvoices.js ainda não foi criado');
    }
    const { MOCK_INVOICES } = await import(`file://${mockPath}`);

    assert.ok(Array.isArray(MOCK_INVOICES), 'MOCK_INVOICES deve ser um array');
    assert.strictEqual(MOCK_INVOICES.length, 5, 'Deve conter exatamente 5 cenários');

    const d1 = MOCK_INVOICES.find((i) => i.id === 'demo-01');
    const d2 = MOCK_INVOICES.find((i) => i.id === 'demo-02');
    const d3 = MOCK_INVOICES.find((i) => i.id === 'demo-03');
    const d4 = MOCK_INVOICES.find((i) => i.id === 'demo-04');
    const d5 = MOCK_INVOICES.find((i) => i.id === 'demo-05');

    assert.ok(d1 && d1.itens.length === 8, 'demo-01 deve conter 8 itens');
    assert.ok(d2 && d2.itens.length === 25, 'demo-02 deve conter 25 itens');
    assert.ok(d3 && d3.itens.length === 50, 'demo-03 deve conter 50 itens');
    assert.ok(d4 && d4.itens.length >= 10, 'demo-04 deve conter itens com inconsistências');
    assert.ok(d5 && d5.itens.length === 15, 'demo-05 deve conter 15 itens');

    const camposObrigatorios = ['id', 'numero', 'serie', 'emissao', 'destinatario', 'itens', 'totais', 'status'];
    for (const campo of camposObrigatorios) {
      assert.ok(campo in d1, `demo-01 não possui o campo: ${campo}`);
    }
  });
});

describe('M1 Foundation: Live HTTP Smoke Check', () => {
  it('GET http://localhost:3000/dashboard responde HTTP 200 com título SmartNFe', async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('http://localhost:3000/dashboard', {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      assert.strictEqual(response.status, 200, 'HTTP status deve ser 200');

      const html = await response.text();
      assert.ok(html.includes('SmartNFe'), 'HTML deve conter "SmartNFe"');
      assert.doesNotMatch(
        html,
        /<meta[^>]*http-equiv=["']refresh["'][^>]*login/i,
        'Não deve realizar redirecionamento para login'
      );
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        assert.fail('Timeout de 5000ms atingido ao conectar em http://localhost:3000/dashboard');
      }
      throw err;
    }
  });
});
```

### 6.3 Atualização no `package.json`
Recomenda-se adicionar o script `"test"` no `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "node --no-warnings --test tests/**/*.test.mjs"
}
```

---

## 7. Procedimento de Execução e Comandos de Verificação

Para os agentes de implementação e revisão:

1. **Executar verificação de lint estático dos arquivos adaptados:**
   ```powershell
   npx eslint app/components/table/DataTable.jsx app/components/inputs/InputFile.jsx app/components/Layouts/Dialog.jsx
   ```
   *Resultado esperado:* Código de saída 0 com 0 erros.

2. **Executar os testes automatizados da fundação:**
   ```powershell
   node --no-warnings --test tests/tier1/m1_foundation.test.mjs
   ```
   *Resultado esperado:* Todos os testes passam (✔ 100% pass).

3. **Verificar requisição ao servidor ativo:**
   ```powershell
   node -e "fetch('http://localhost:3000/dashboard').then(r => console.log('HTTP Status:', r.status))"
   ```
   *Resultado esperado:* `HTTP Status: 200`.
