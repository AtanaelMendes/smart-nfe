'use client';

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLightbulb,
  faCheck,
  faXmark,
  faChevronDown,
  faShieldHalved,
  faExpand,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';

import {
  SCREEN_TOURS,
  getScreenTourByPath,
  getRouteKeyByPath,
  isTourSeen,
  markTourAsSeen,
} from '@/config/screenTours';

function subscribeTourUpdates(callback) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('smartnfe:tour-updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('smartnfe:tour-updated', callback);
  };
}

/**
 * ScreenTourTip — Componente Reutilizável de Tourtip / Onboarding Contextual
 *
 * Características:
 * - Renderização automática no primeiro acesso a cada uma das 8 rotas mapeadas.
 * - Respeita a flag persistida 'smartnfe_tour_seen_<routeKey>' no localStorage.
 * - Ações interativas: "Entendi / Não mostrar novamente", "Minimizar / Expandir", e tecla Escape.
 * - Reabertura sob demanda a qualquer momento através do cabeçalho global.
 * - Totalmente compatível com Tailwind CSS 4 e Dark Mode.
 */
export default function ScreenTourTip({
  routeKey: propRouteKey,
  tour: propTour,
  forceOpen = false,
  onClose,
  onDismiss,
}) {
  const pathname = usePathname();

  // Resolve o tour ativo baseado nas props ou na rota corrente
  const activeTour = useMemo(() => {
    if (propTour) return propTour;
    if (propRouteKey) {
      return SCREEN_TOURS[propRouteKey] || getScreenTourByPath(propRouteKey);
    }
    return getScreenTourByPath(pathname);
  }, [propTour, propRouteKey, pathname]);

  const activeRouteKey = activeTour?.routeKey || getRouteKeyByPath(pathname);

  // Monitora o estado de visualização no localStorage de forma sincronizada e com snapshot estável
  const getSnapshot = useCallback(
    () => (activeRouteKey ? isTourSeen(activeRouteKey) : true),
    [activeRouteKey]
  );

  const isSeenInStorage = useSyncExternalStore(
    subscribeTourUpdates,
    getSnapshot,
    () => true
  );

  // Estado local para interações manuais do usuário na sessão atual
  const [interactionState, setInteractionState] = useState({
    routeKey: activeRouteKey,
    isManuallyOpened: false,
    isManuallyClosed: false,
    isMinimized: false,
  });

  // Quando a rota mudar, redefine os estados manuais de interação de forma atômica
  const isDifferentRoute = activeRouteKey !== interactionState.routeKey;
  if (isDifferentRoute) {
    setInteractionState({
      routeKey: activeRouteKey,
      isManuallyOpened: false,
      isManuallyClosed: false,
      isMinimized: false,
    });
  }

  const isManuallyOpened = isDifferentRoute ? false : interactionState.isManuallyOpened;
  const isManuallyClosed = isDifferentRoute ? false : interactionState.isManuallyClosed;
  const isMinimized = isDifferentRoute ? false : interactionState.isMinimized;

  // Listener para evento customizado de reabertura 'smartnfe:open-screen-tour'
  useEffect(() => {
    const handleCustomOpen = (event) => {
      const target = event?.detail?.routeKey;
      if (!target || target === activeRouteKey) {
        setInteractionState((prev) => ({
          ...prev,
          isManuallyOpened: true,
          isManuallyClosed: false,
          isMinimized: false,
        }));
      }
    };

    window.addEventListener('smartnfe:open-screen-tour', handleCustomOpen);
    return () => {
      window.removeEventListener('smartnfe:open-screen-tour', handleCustomOpen);
    };
  }, [activeRouteKey]);

  // Listener para sincronização reativa com reset de tours
  useEffect(() => {
    const handleTourUpdated = (event) => {
      const isResetAction =
        event?.detail?.action === 'reset' ||
        event?.detail?.all ||
        !isTourSeen(activeRouteKey);

      if (isResetAction && (event?.detail?.all || event?.detail?.routeKey === activeRouteKey)) {
        setInteractionState((prev) => ({
          ...prev,
          isManuallyClosed: false,
        }));
      }
    };

    window.addEventListener('smartnfe:tour-updated', handleTourUpdated);
    return () => {
      window.removeEventListener('smartnfe:tour-updated', handleTourUpdated);
    };
  }, [activeRouteKey]);

  // Determina se o tour deve ser exibido
  const shouldShow =
    Boolean(activeTour) &&
    !isManuallyClosed &&
    (forceOpen || isManuallyOpened || !isSeenInStorage);

  // Listener para fechar via tecla Escape
  useEffect(() => {
    if (!shouldShow) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        // Se outro elemento já consumiu o Escape (ex: cancelando edição de célula de tabela), não fecha o tour
        if (event.defaultPrevented) return;

        // Se houver um modal/diálogo aberto na tela, o Escape pertence ao modal e não ao tourtip
        const hasActiveModal = Boolean(
          typeof document !== 'undefined' &&
            document.querySelector('[role="dialog"], [aria-modal="true"]')
        );
        if (hasActiveModal) return;

        event.preventDefault();
        setInteractionState((prev) => ({
          ...prev,
          isManuallyClosed: true,
          isManuallyOpened: false,
        }));
        if (onClose) onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldShow, onClose]);

  // Ação: "Entendi / Não mostrar novamente"
  const handleDismissPermanently = useCallback(() => {
    if (activeRouteKey) {
      markTourAsSeen(activeRouteKey);
    }
    setInteractionState((prev) => ({
      ...prev,
      isManuallyClosed: true,
      isManuallyOpened: false,
    }));
    if (onDismiss) onDismiss(activeRouteKey);
  }, [activeRouteKey, onDismiss]);

  // Ação: Minimizar / Expandir
  const handleToggleMinimize = useCallback(() => {
    setInteractionState((prev) => ({ ...prev, isMinimized: !prev.isMinimized }));
  }, []);

  // Ação: Fechar temporariamente
  const handleClose = useCallback(() => {
    setInteractionState((prev) => ({
      ...prev,
      isManuallyClosed: true,
      isManuallyOpened: false,
    }));
    if (onClose) onClose();
  }, [onClose]);

  if (!shouldShow || !activeTour) {
    return null;
  }

  const tourIcon = activeTour.icon || faLightbulb;
  const tourTitle = activeTour.title || activeTour.titulo || 'Guia da Tela';
  const tourObjective = activeTour.objective || activeTour.objetivo || '';
  const tourSteps = activeTour.steps || activeTour.passos || [];
  const tourTips = activeTour.tips || activeTour.dicas || [];

  // Estado MINIMIZADO: barra compacta e elegante
  if (isMinimized) {
    return (
      <aside
        role="region"
        aria-label={`Guia minimizado: ${tourTitle}`}
        className="fixed bottom-5 right-5 z-40 animate-fade-in"
      >
        <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-blue-300 dark:border-blue-700/70 shadow-xl rounded-full px-3.5 py-2 text-slate-800 dark:text-slate-100 transition-all duration-200 hover:shadow-2xl">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
            <FontAwesomeIcon icon={tourIcon} className="w-3 h-3" />
          </div>

          <span className="text-xs font-semibold truncate max-w-[200px] sm:max-w-[260px]">
            Guia: {tourTitle}
          </span>

          <button
            type="button"
            onClick={handleToggleMinimize}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
            title="Expandir guia explicativo"
            aria-label="Expandir guia explicativo"
            aria-expanded="false"
            aria-controls="screen-tour-content-body"
          >
            <FontAwesomeIcon icon={faExpand} className="w-3 h-3" />
            <span className="hidden sm:inline">Expandir</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Fechar guia"
            aria-label="Fechar guia"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
          </button>
        </div>
      </aside>
    );
  }

  // Estado EXPANDIDO: modal/card contextual completo
  return (
    <aside
      role="region"
      aria-label={`Guia explicativo: ${tourTitle}`}
      className="fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] sm:w-[480px] md:w-[540px] max-h-[85vh] flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 transition-all duration-200 animate-fade-in"
    >
      {/* Barra superior de destaque com gradiente */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 flex-shrink-0" />

      {/* Cabeçalho do Tourtip */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-900/60 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon icon={tourIcon} className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {tourTitle}
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded">
                Guia da Tela
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeTour.route}
            </p>
          </div>
        </div>

        {/* Botões de Ação do Topo (Minimizar e Fechar) */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button
            type="button"
            onClick={handleToggleMinimize}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Minimizar guia"
            aria-label="Minimizar guia explicativo"
            aria-expanded="true"
            aria-controls="screen-tour-content-body"
          >
            <FontAwesomeIcon icon={faChevronDown} className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Fechar guia (Escape)"
            aria-label="Fechar guia explicativo"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Conteúdo com rolagem interna */}
      <div id="screen-tour-content-body" className="p-4 space-y-4 overflow-y-auto text-xs sm:text-sm flex-1 leading-relaxed">
        {/* Bloco 1: Objetivo da Tela */}
        <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1">
            Objetivo da Tela
          </span>
          <p className="text-slate-700 dark:text-slate-200 font-medium">
            {tourObjective}
          </p>
        </div>

        {/* Bloco 2: Passos Práticos Recomendados */}
        {tourSteps && tourSteps.length > 0 && (
          <div className="space-y-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Passos Práticos Recomendados
            </span>
            <ol className="space-y-2 text-slate-700 dark:text-slate-200">
              {tourSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5 border border-slate-200 dark:border-slate-600">
                    {idx + 1}
                  </span>
                  <span className="flex-1 leading-snug">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Bloco 3: Dicas Fiscais e de Segurança */}
        {tourTips && tourTips.length > 0 && (
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
              <FontAwesomeIcon icon={faShieldHalved} className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Dicas Fiscais e de Segurança</span>
            </div>
            <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 text-xs">
              {tourTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <FontAwesomeIcon
                    icon={faCircleCheck}
                    className="w-3 h-3 text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0"
                  />
                  <span className="flex-1 leading-snug">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Rodapé de Ações do Tourtip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-700/80 flex-shrink-0">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
              Esc
            </kbd>
            <span>para fechar</span>
          </span>
          <button
            type="button"
            onClick={handleToggleMinimize}
            aria-expanded="true"
            aria-label="Minimizar guia explicativo"
            aria-controls="screen-tour-content-body"
            className="sm:ml-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 underline font-medium cursor-pointer"
          >
            Minimizar
          </button>
        </div>

        <button
          type="button"
          onClick={handleDismissPermanently}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors shadow-xs hover:shadow cursor-pointer"
        >
          <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
          <span>Entendi / Não mostrar novamente</span>
        </button>
      </div>
    </aside>
  );
}
