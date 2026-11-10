'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGear,
  faSliders,
  faSun,
  faMoon,
  faTableCells,
  faCoins,
  faFloppyDisk,
  faRotateRight,
  faClockRotateLeft,
  faCircleCheck,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import Dialog from '@/components/Layouts/Dialog';
import { useAppContext } from '@/context/AppContext';
import { localStorageService } from '@/lib/storage/localStorageService';
import { invoiceRepository } from '@/features/invoiceRepository';
import { preparedInvoiceRepository } from '@/features/preparedInvoiceRepository';

export default function ConfiguracoesPage() {
  const { darkMode, toggleDarkMode, settings, updateSettings, toast, mounted } = useAppContext();
  const isDark = mounted ? darkMode : false;

  const [localSettings, setLocalSettings] = useState({
    tableDensity: settings.tableDensity || 'compact',
    rowsPerPage: settings.rowsPerPage || 25,
    demoValueLimit: settings.demoValueLimit || 50000,
    showOriginalValues: settings.showOriginalValues ?? true,
    autoSave: settings.autoSave ?? true,
  });

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSave = () => {
    updateSettings(localSettings);
    toast.success('Preferências de interface salvas com sucesso!');
  };

  const handleConfirmResetAll = async () => {
    try {
      setIsResetting(true);
      // 1. Limpa e restaura o storage versionado central
      localStorageService.resetAll();

      // 2. Garante recarga dos repositórios de NF-e e notas preparadas
      await invoiceRepository.resetDemoData();
      await preparedInvoiceRepository.resetDemoData();

      toast.success(
        'Todos os dados de demonstração foram restaurados com sucesso para o padrão de fábrica!'
      );
    } catch {
      toast.error('Erro ao restaurar dados de demonstração.');
    } finally {
      setIsResetting(false);
      setShowResetDialog(false);
    }
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Configurações' }]}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FontAwesomeIcon icon={faGear} className="text-blue-600" />
            Configurações e Preferências
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personalize a densidade das tabelas fiscais, tema visual, paginação e parâmetros operacionais de demonstração.
          </p>
        </div>

        {/* Card 1: Aparência e Tema */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FontAwesomeIcon icon={isDark ? faMoon : faSun} className="text-amber-500 w-4 h-4" />
              Aparência e Tema Visual
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ajuste o contraste da interface para o conforto da sua rotina de conferência fiscal.
            </p>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Modo Escuro (Dark Mode)
              </p>
              <span className="text-[11px] text-slate-500">
                {isDark ? 'Tema escuro ativo (ideal para ambientes com pouca luz)' : 'Tema claro ativo (padrão de alta visibilidade)'}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleDarkMode}
              suppressHydrationWarning
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                isDark ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
              aria-label="Alternar Modo Escuro"
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>

        {/* Card 2: Preferências de Tabelas Fiscais */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FontAwesomeIcon icon={faTableCells} className="text-blue-600 w-4 h-4" />
              Preferências de Tabelas e Grid
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina a quantidade de linhas e densidade visual das tabelas de itens e documentos.
            </p>
          </div>

          {/* Densidade de Tabelas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Densidade de Linhas na Tabela
              </p>
              <span className="text-[11px] text-slate-500">
                Espaçamento das células para notas com dezenas de itens na conferência
              </span>
            </div>
            <select
              value={localSettings.tableDensity}
              onChange={(e) => setLocalSettings({ ...localSettings, tableDensity: e.target.value })}
              className="text-xs py-1.5 px-3 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="compact">Compacta (Alta densidade — Recomendada)</option>
              <option value="normal">Confortável / Normal</option>
              <option value="relaxed">Espaçosa</option>
            </select>
          </div>

          {/* Itens por Página */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Itens por Página nas Listagens
              </p>
              <span className="text-[11px] text-slate-500">
                Quantidade padrão de documentos e itens exibidos por bloco
              </span>
            </div>
            <select
              value={localSettings.rowsPerPage}
              onChange={(e) => setLocalSettings({ ...localSettings, rowsPerPage: Number(e.target.value) })}
              className="text-xs py-1.5 px-3 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value={10}>10 itens por página</option>
              <option value={25}>25 itens por página</option>
              <option value={50}>50 itens por página</option>
            </select>
          </div>

          {/* Salvamento Automático (AutoSave) */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Salvamento Automático (AutoSave)
              </p>
              <span className="text-[11px] text-slate-500">
                Salva edições e conferências de itens no navegador automaticamente em tempo real
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLocalSettings({ ...localSettings, autoSave: !localSettings.autoSave })}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                localSettings.autoSave ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
              aria-label="Alternar Salvamento Automático"
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Exibir Valores Originais */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Exibir Comparativo de Valor Original
              </p>
              <span className="text-[11px] text-slate-500">
                Exibe um tooltip com o valor original importado quando uma célula for alterada
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLocalSettings({ ...localSettings, showOriginalValues: !localSettings.showOriginalValues })}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                localSettings.showOriginalValues ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
              aria-label="Alternar Comparativo de Valor Original"
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>

        {/* Card 3: Restauração de Dados de Demonstração (resetAll) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <FontAwesomeIcon icon={faRotateRight} className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Restaurar Dados de Demonstração (Padrão de Fábrica)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Se você realizou alterações, edições na conferência ou divisões de notas e deseja redefinir o sistema para o baseline inicial dos 5 cenários mockados (demo-01 a demo-05):
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              buttonType="danger"
              size="small"
              outline
              onClick={() => setShowResetDialog(true)}
            >
              <FontAwesomeIcon icon={faRotateRight} className="mr-1.5" />
              Restaurar Dados de Fábrica (resetAll)
            </Button>
          </div>
        </div>

        {/* Botão Salvar Preferências */}
        <div className="flex justify-end gap-3 pt-2">
          <Button buttonType="primary" onClick={handleSave}>
            <FontAwesomeIcon icon={faFloppyDisk} className="w-3.5 h-3.5 mr-1.5" />
            Salvar Preferências
          </Button>
        </div>

        {/* ========================================================================= */}
        {/* MODAL: Confirmação de Restauração Geral (resetAll) */}
        {/* ========================================================================= */}
        <Dialog
          showDialog={showResetDialog}
          setDialogControl={setShowResetDialog}
          title="Deseja realmente restaurar todos os dados de demonstração para o padrão de fábrica? Todas as edições de itens, divisões e notas preparadas serão redefinidas para os 5 cenários iniciais."
          hideTextArea
          btnCancel="Cancelar"
          btnAccept={isResetting ? 'Restaurando...' : 'Confirmar Restauração'}
          confirmActionCallback={handleConfirmResetAll}
          small
        />
      </div>
    </AppLayout>
  );
}
