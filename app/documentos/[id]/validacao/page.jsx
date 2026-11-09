'use client';

import { useState, useEffect, useMemo, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faArrowLeft,
  faCircleCheck,
  faCircleExclamation,
  faPenToSquare,
  faRobot,
  faWandMagicSparkles,
  faRotateLeft,
  faScissors,
  faCheck,
  faShieldHalved,
  faFileInvoice,
  faArrowRight,
  faGlobe,
  faLock,
  faTimes,
  faCheckDouble,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';

import AppLayout from '@/components/Layouts/AppLayout';
import Button from '@/components/buttons/Button';
import { useAppContext } from '@/context/AppContext';
import { invoiceRepository } from '@/features/invoiceRepository';
import { formatBRL } from '@/lib/formatters/currency';

/**
 * Campos considerados sensíveis fiscalmente pela especificação R2 (PROJECT.md § 6).
 * Requerem revisão humana individual e não podem ser aplicados em lote.
 */
export const SENSITIVE_FIELDS = ['cfop', 'ncm', 'cst', 'csosn', 'aliquota', 'tributos', 'origem'];

/**
 * Classifica um apontamento fiscal como sensível (fiscal) ou mecânico (seguro).
 */
export function isSensitiveIssue(issue) {
  if (!issue || !issue.campo) return false;
  const campo = String(issue.campo).toLowerCase().trim();
  return (
    SENSITIVE_FIELDS.includes(campo) ||
    campo.startsWith('tributo') ||
    campo.startsWith('aliquota') ||
    campo.startsWith('cst')
  );
}

/**
 * Cria payload padronizado para o modal de confirmação de correção (PROJECT.md § 6).
 */
export function createConfirmationPayload(issue) {
  return {
    issueId: issue.id,
    itemId: issue.itemId,
    itemNumero: issue.itemNumero,
    itemDescricao: issue.itemDescricao,
    campo: issue.campo,
    labelCampo: String(issue.campo || '').toUpperCase(),
    valorAtual: issue.encontrado,
    valorProposto: issue.esperado,
    origemRegra: issue.regra || 'Regra de Validação Fiscal',
    isSensivel: isSensitiveIssue(issue),
  };
}

/**
 * Modal de Confirmação Explícita de Correção Fiscal Individual (Feature 13 / R2)
 */
function FiscalFixConfirmationModal({
  isOpen,
  payload,
  onConfirm,
  onClose,
  isConfirming,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !payload) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-fix-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40">
          <div>
            <h3 id="confirm-fix-title" className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Confirmar Correção Fiscal
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              [Demonstração] Validação Fiscal Assistida (R2)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
            title="Fechar (Escape)"
          >
            <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Identificação do Item */}
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Produto / Item Alvo</span>
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Item #{payload.itemNumero} — {payload.itemDescricao}
            </p>
            <p className="text-slate-500 font-mono text-[11px]">
              Campo Alvo: <span className="font-bold text-slate-700 dark:text-slate-300">{payload.campo}</span> ({payload.labelCampo})
            </p>
          </div>

          {/* Badge de Classificação de Risco */}
          {payload.isSensivel ? (
            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Alteração Fiscal Sensível</span>
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Atenção: A alteração deste campo ({payload.labelCampo}) possui impacto legal tributário direto (SEFAZ/Aduana). Certifique-se de que a classificação reflete a operação contábil real do contribuinte.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-700/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Correção Mecânica / Conciliação Aritmética</span>
              </div>
              <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                Ajuste mecânico de cálculo ou unidade comercial para conformidade técnica da nota fiscal.
              </p>
            </div>
          )}

          {/* Comparativo de Valores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Valor Atual no Documento
              </span>
              <div className="p-2.5 rounded font-mono text-xs font-bold bg-red-100 text-red-800 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800 break-all">
                {String(payload.valorAtual || '(vazio)')}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Valor Proposto pelo Assistente
              </span>
              <div className="p-2.5 rounded font-mono text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700 break-all">
                {String(payload.valorProposto)}
              </div>
            </div>
          </div>

          {/* Origem da Regra / Justificativa */}
          <div className="text-xs space-y-1 bg-blue-50/70 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-900/40">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-blue-900 dark:text-blue-200">
                Origem da Regra / Justificativa:
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200">
                Sugestão Fiscal Demonstrativa (R2)
              </span>
            </div>
            <p className="text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
              {payload.origemRegra}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40">
          <Button
            buttonType="secondary"
            size="small"
            outline
            onClick={onClose}
            disabled={isConfirming}
          >
            Cancelar
          </Button>
          <Button
            buttonType="primary"
            size="small"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5 mr-1.5" />
            {isConfirming ? 'Aplicando...' : 'Confirmar Correção'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal de Revisão Segura para "Corrigir Todas" em Lote (Feature 15 / R2)
 */
function SafeBulkReviewModal({
  isOpen,
  mechanicalIssues,
  sensitiveIssues,
  selectedIds,
  onToggleId,
  onToggleAll,
  onApplySelected,
  onReviewSingle,
  onClose,
  isApplying,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const allMechanicalSelected =
    mechanicalIssues.length > 0 && selectedIds.size === mechanicalIssues.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-review-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40">
          <div>
            <h3 id="bulk-review-title" className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Revisão Segura de Correções em Lote
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              [Demonstração] Separação de Segurança Fiscal e Bloqueio de Massa (R2)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
            title="Fechar (Escape)"
          >
            <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Seção 1: Correções Mecânicas (Permitidas em Lote) */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Correções Mecânicas ({selectedIds.size}/{mechanicalIssues.length} selecionadas)
                </h4>
              </div>
              {mechanicalIssues.length > 0 && (
                <button
                  type="button"
                  onClick={onToggleAll}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faCheckDouble} className="w-3 h-3" />
                  {allMechanicalSelected ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </button>
              )}
            </div>

            {mechanicalIssues.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                Nenhuma correção mecânica pendente neste documento.
              </p>
            ) : (
              <div className="space-y-2">
                {mechanicalIssues.map((issue) => {
                  const isChecked = selectedIds.has(issue.id);
                  return (
                    <div
                      key={issue.id}
                      onClick={() => onToggleId(issue.id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                        isChecked
                          ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40 opacity-75'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // controlado pelo container
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 pointer-events-none"
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            Item #{issue.itemNumero} — {issue.itemDescricao}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {issue.campo}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-mono text-red-600 dark:text-red-400 font-semibold">
                            {String(issue.encontrado || 'vazio')}
                          </span>
                          <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 text-slate-400" />
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {String(issue.esperado)}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-auto">
                            {issue.regra}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção 2: Campos Fiscais Sensíveis (Bloqueados para Aplicação em Massa) */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Campos Fiscais Sensíveis ({sensitiveIssues.length}) — Aplicação em Massa Bloqueada
              </h4>
            </div>

            {/* Banner de Proteção Fiscal Ativa */}
            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <FontAwesomeIcon icon={faLock} className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Proteção Fiscal Ativa (R2)</span>
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Campos fiscais críticos (NCM, CFOP, tributação) foram bloqueados da aplicação automática em massa. Cada alteração requer revisão humana individual com confirmação explícita.
              </p>
            </div>

            {sensitiveIssues.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                Nenhum apontamento fiscal sensível pendente.
              </p>
            ) : (
              <div className="space-y-2">
                {sensitiveIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-300 cursor-not-allowed"
                          title="Campo fiscal sensível — bloqueado para aplicação em massa"
                        >
                          <FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5" />
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            Item #{issue.itemNumero} — {issue.itemDescricao}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                            🔒 Sensível
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-500 font-medium">{issue.campo}:</span>
                          <span className="font-mono text-red-600 dark:text-red-400 font-semibold">
                            {String(issue.encontrado || 'vazio')}
                          </span>
                          <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 text-slate-400" />
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {String(issue.esperado)}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-2">
                            ({issue.regra})
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      buttonType="secondary"
                      size="small"
                      outline
                      onClick={() => onReviewSingle(issue)}
                      title="Revisar e confirmar este campo individualmente"
                      className="flex-shrink-0"
                    >
                      <FontAwesomeIcon icon={faShieldHalved} className="w-3 h-3 mr-1 text-amber-600" />
                      Revisar Individualmente
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40">
          <span className="text-[11px] text-slate-500">
            {selectedIds.size} {selectedIds.size === 1 ? 'item selecionado' : 'itens selecionados'} para aplicação segura
          </span>
          <div className="flex items-center gap-2">
            <Button
              buttonType="secondary"
              size="small"
              outline
              onClick={onClose}
              disabled={isApplying}
            >
              Cancelar
            </Button>
            <Button
              buttonType="success"
              size="small"
              onClick={onApplySelected}
              disabled={selectedIds.size === 0 || isApplying}
            >
              <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5 mr-1.5" />
              {isApplying
                ? 'Aplicando...'
                : `Aplicar Selecionadas (${selectedIds.size})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ValidacaoPage({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const router = useRouter();
  const { toast } = useAppContext();

  const [invoice, setInvoice] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todas'); // 'todas' | 'erros' | 'avisos'

  // Feature 13: Estado de Confirmação Individual
  const [pendingFix, setPendingFix] = useState(null);
  const [isConfirmingFix, setIsConfirmingFix] = useState(false);

  // Feature 14: Pilha de Desfazer (Undo Stack)
  const [undoStack, setUndoStack] = useState([]);
  const [isUndoing, setIsUndoing] = useState(false);

  // Feature 15: Revisão Segura de "Corrigir Todas"
  const [showBulkReviewModal, setShowBulkReviewModal] = useState(false);
  const [selectedMechanicalIssueIds, setSelectedMechanicalIssueIds] = useState(new Set());
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);

  // Carregamento assíncrono dos dados da nota e inconsistências fiscais
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const inv = await invoiceRepository.findById(id);
      const iss = await invoiceRepository.getValidationIssues(id);
      setInvoice(inv);
      setIssues(iss || []);
    } catch {
      toast.error('Erro ao carregar validação do documento.');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Separação por severidade: Erros bloqueantes vs Alertas
  const errosBloqueantes = useMemo(
    () => issues.filter((iss) => iss.tipo === 'erro' || iss.severity === 'ERROR'),
    [issues]
  );

  const alertasFiscais = useMemo(
    () => issues.filter((iss) => iss.tipo !== 'erro' && iss.severity !== 'ERROR'),
    [issues]
  );

  // Segregação entre correções mecânicas (lote permitido) e campos sensíveis (lote bloqueado)
  const mechanicalIssues = useMemo(
    () => issues.filter((iss) => !isSensitiveIssue(iss)),
    [issues]
  );

  const sensitiveIssues = useMemo(
    () => issues.filter((iss) => isSensitiveIssue(iss)),
    [issues]
  );

  // Lista filtrada pela aba selecionada
  const filteredIssues = useMemo(() => {
    if (activeTab === 'erros') return errosBloqueantes;
    if (activeTab === 'avisos') return alertasFiscais;
    return issues;
  }, [activeTab, issues, errosBloqueantes, alertasFiscais]);

  // Feature 13: Abre o modal de confirmação explícita ao invés de aplicar silenciosamente
  const handleRequestFix = (issue) => {
    const payload = createConfirmationPayload(issue);
    setPendingFix(payload);
  };

  // Feature 13 & 14: Confirma a alteração, registra na pilha de Undo e revalida
  const handleConfirmFix = async () => {
    if (!pendingFix) return;

    try {
      setIsConfirmingFix(true);
      const currentItem = invoice?.itens?.find((i) => i.id === pendingFix.itemId);
      const valorAnterior = currentItem ? currentItem[pendingFix.campo] : pendingFix.valorAtual;
      const valorNovo = pendingFix.valorProposto;

      const undoEntry = {
        id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        issueId: pendingFix.issueId,
        itemId: pendingFix.itemId,
        itemNumero: pendingFix.itemNumero,
        itemDescricao: pendingFix.itemDescricao,
        campo: pendingFix.campo,
        valorAnterior,
        valorNovo,
        timestamp: new Date().toISOString(),
        regra: pendingFix.origemRegra,
      };

      await invoiceRepository.updateItem(id, pendingFix.itemId, {
        [pendingFix.campo]: valorNovo,
      });

      setUndoStack((prev) => [...prev, undoEntry]);
      setPendingFix(null);

      toast.success(
        <span className="flex items-center justify-between gap-3 w-full">
          <span>
            Item #{pendingFix.itemNumero} ({pendingFix.campo}) ajustado para &quot;{valorNovo}&quot;.
          </span>
          <button
            type="button"
            onClick={() => handleUndo(undoEntry)}
            className="px-2 py-0.5 text-xs font-bold bg-white text-emerald-800 rounded border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-xs"
          >
            Desfazer
          </button>
        </span>
      );

      // Reexecuta validações dinamicamente
      await loadData();
    } catch {
      toast.error('Erro ao aplicar correção.');
    } finally {
      setIsConfirmingFix(false);
    }
  };

  // Feature 14: Reverte uma alteração no repositório e revalida o documento
  const handleUndo = async (targetEntry = null) => {
    const entryToUndo = targetEntry || undoStack[undoStack.length - 1];
    if (!entryToUndo) return;

    try {
      setIsUndoing(true);
      await invoiceRepository.updateItem(id, entryToUndo.itemId, {
        [entryToUndo.campo]: entryToUndo.valorAnterior,
      });

      setUndoStack((prev) => prev.filter((e) => e.id !== entryToUndo.id));

      toast.info(
        `Alteração desfeita: Item #${entryToUndo.itemNumero} (${entryToUndo.campo}) restaurado para "${entryToUndo.valorAnterior}".`
      );

      // Revalida automaticamente para reabrir os apontamentos revertidos
      await loadData();
    } catch {
      toast.error('Erro ao desfazer alteração.');
    } finally {
      setIsUndoing(false);
    }
  };

  // Feature 15: Handlers para o Modal de Revisão Segura de "Corrigir Todas"
  const handleOpenBulkReview = () => {
    setSelectedMechanicalIssueIds(new Set(mechanicalIssues.map((iss) => iss.id)));
    setShowBulkReviewModal(true);
  };

  const handleToggleMechanicalIssue = (issueId) => {
    setSelectedMechanicalIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  };

  const handleToggleAllMechanical = () => {
    if (selectedMechanicalIssueIds.size === mechanicalIssues.length) {
      setSelectedMechanicalIssueIds(new Set());
    } else {
      setSelectedMechanicalIssueIds(new Set(mechanicalIssues.map((iss) => iss.id)));
    }
  };

  const handleReviewSingleFromBulk = (issue) => {
    setShowBulkReviewModal(false);
    handleRequestFix(issue);
  };

  const handleApplySelectedMechanicalFixes = async () => {
    const issuesToApply = mechanicalIssues.filter((iss) =>
      selectedMechanicalIssueIds.has(iss.id)
    );

    if (issuesToApply.length === 0) return;

    try {
      setIsApplyingBatch(true);
      const batchId = `batch-${Date.now()}`;
      const newUndoEntries = [];

      for (const issue of issuesToApply) {
        const currentItem = invoice?.itens?.find((i) => i.id === issue.itemId);
        const valorAnterior = currentItem ? currentItem[issue.campo] : issue.encontrado;
        const valorNovo = issue.esperado;

        await invoiceRepository.updateItem(id, issue.itemId, {
          [issue.campo]: valorNovo,
        });

        newUndoEntries.push({
          id: `undo-${Date.now()}-${issue.id}`,
          batchId,
          issueId: issue.id,
          itemId: issue.itemId,
          itemNumero: issue.itemNumero,
          itemDescricao: issue.itemDescricao,
          campo: issue.campo,
          valorAnterior,
          valorNovo,
          timestamp: new Date().toISOString(),
          regra: issue.regra || 'Regra Mecânica',
        });
      }

      setUndoStack((prev) => [...prev, ...newUndoEntries]);
      setShowBulkReviewModal(false);

      toast.success(
        `${issuesToApply.length} ${
          issuesToApply.length === 1
            ? 'correção mecânica aplicada'
            : 'correções mecânicas aplicadas'
        } com sucesso!`
      );

      if (sensitiveIssues.length > 0) {
        toast.warning(
          `${sensitiveIssues.length} ${
            sensitiveIssues.length === 1
              ? 'campo fiscal sensível permaneceu'
              : 'campos fiscais sensíveis permaneceram'
          } para revisão individual.`
        );
      }

      await loadData();
    } catch {
      toast.error('Erro ao aplicar correções selecionadas.');
    } finally {
      setIsApplyingBatch(false);
    }
  };

  // Assistente Demo: Restaurar inconsistências mockadas do cenário demo-04 para retestar
  const handleResetDemoIssues = async () => {
    try {
      setLoading(true);
      await invoiceRepository.resetInvoice(id);
      setUndoStack([]);
      toast.info(`Cenário ${id} restaurado com as inconsistências simuladas de fábrica.`);
      await loadData();
    } catch {
      toast.error('Erro ao restaurar cenário de demonstração.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Validação' }]}>
        <div className="p-12 text-center text-slate-500">
          <FontAwesomeIcon icon={faShieldHalved} className="w-8 h-8 text-blue-500 animate-pulse mb-3" />
          <p className="text-sm font-semibold">Auditando regras fiscais e tributárias...</p>
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Validação' }]}>
        <div className="p-8 text-center text-slate-500">
          <p className="text-base font-semibold text-red-600 mb-2">Documento não encontrado</p>
          <Link href="/documentos" className="text-sm text-blue-600 hover:underline">
            Voltar para lista de documentos
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isAllGreen = issues.length === 0;

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documentos', href: '/documentos' },
        { label: `NF-e ${invoice.numero}`, href: `/documentos/${id}/conferencia` },
        { label: 'Validação Fiscal' },
      ]}
    >
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href={`/documentos/${id}/conferencia`}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Voltar para a conferência"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {invoice.tipoDocumento || 'NF-e'} • Série {invoice.serie || '1'}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                  <FontAwesomeIcon icon={faGlobe} className="w-3 h-3 text-slate-400" />
                  Destino: {invoice.destinatario?.pais || 'Exportação'} ({invoice.destinatario?.nome || 'Cliente'})
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-1">
                <FontAwesomeIcon
                  icon={isAllGreen ? faCircleCheck : faTriangleExclamation}
                  className={isAllGreen ? 'text-emerald-500' : 'text-amber-500'}
                />
                Diagnóstico de Validação Fiscal — NF-e {invoice.numero}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Auditoria automática de conformidade aduaneira, CFOP de exportação, classificação NCM, consistência matemática e unidades.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Feature 14: Botão de Desfazer Última na barra de ações */}
            {undoStack.length > 0 && (
              <Button
                buttonType="secondary"
                size="small"
                onClick={() => handleUndo()}
                disabled={isUndoing}
                title="Desfaz a última alteração realizada neste documento e revalida"
                className="bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3 mr-1 text-amber-700 dark:text-amber-400" />
                Desfazer Última ({undoStack.length})
              </Button>
            )}

            {id === 'demo-04' && (
              <Button
                buttonType="secondary"
                size="small"
                outline
                onClick={handleResetDemoIssues}
                title="Restaura as 4 inconsistências simuladas de fábrica para testar novamente"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3 mr-1 text-slate-500" />
                Restaurar Inconsistências demo-04
              </Button>
            )}

            <Button
              buttonType="secondary"
              size="small"
              outline
              onClick={() => router.push(`/documentos/${id}/conferencia`)}
            >
              <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Editar na Conferência
            </Button>

            <Button
              buttonType="primary"
              size="small"
              onClick={() => router.push(`/documentos/${id}/divisao`)}
            >
              <FontAwesomeIcon icon={faScissors} className="w-3.5 h-3.5 mr-1" />
              Divisão de Notas
            </Button>
          </div>
        </div>

        {/* KPIs Resumo do Diagnóstico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Situação Geral</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isAllGreen ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
                }`}
              />
              <span
                className={`text-sm font-bold ${
                  isAllGreen ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isAllGreen ? 'Validada / Conforme' : 'Bloqueada p/ Exportação'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {isAllGreen ? 'Apta para divisão' : 'Requer correção contábil'}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Erros Bloqueantes</span>
            <span className={`text-sm font-bold ${errosBloqueantes.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600'}`}>
              {errosBloqueantes.length} {errosBloqueantes.length === 1 ? 'erro' : 'erros'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              CFOP, NCM ou cálculo
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Alertas Aduaneiros</span>
            <span className={`text-sm font-bold ${alertasFiscais.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600'}`}>
              {alertasFiscais.length} {alertasFiscais.length === 1 ? 'aviso' : 'avisos'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Unidades e metadados
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Total de Produtos</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {invoice.itens?.length || 0} itens
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Valor: {formatBRL(invoice.totais?.valorTotalNota || 0)}
            </span>
          </div>
        </div>

        {/* Assistente SmartNFe Virtual (R2 - Identificado como Demonstração) */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-lg shadow-sm border border-blue-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-700/80 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faRobot} className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="text-xs space-y-1">
              <span className="font-bold text-cyan-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3 h-3" />
                Assistente de Validação SmartNFe (Sugestão Fiscal Demonstrativa — R2)
              </span>
              <p className="text-slate-200 max-w-2xl">
                {!isAllGreen
                  ? `Identifiquei ${issues.length} apontamentos nesta NF-e (${mechanicalIssues.length} correções mecânicas seguras e ${sensitiveIssues.length} alterações fiscais sensíveis) para o destino ${invoice.destinatario?.pais || 'Exterior'}. Você pode revisar as sugestões individualmente ou aplicar em lote com segurança.`
                  : 'Parabéns! Todos os produtos e campos da nota fiscal atendem rigorosamente aos critérios de conferência da SEFAZ e regras de exportação aduaneira.'}
              </p>
            </div>
          </div>

          {/* Feature 15: Botão de Revisão Segura em Lote (substitui o 1-clique cego) */}
          {!isAllGreen && (
            <Button
              buttonType="success"
              size="small"
              onClick={handleOpenBulkReview}
              disabled={isApplyingBatch}
              className="flex-shrink-0"
              title="Abre o modal de revisão segura para aplicação em lote"
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5 mr-1" />
              Revisar Correções em Lote
            </Button>
          )}
        </div>

        {/* Feature 14: Banner de Feedback do Histórico de Undo */}
        {undoStack.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200 shadow-xs">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>
                <strong>Última alteração registrada:</strong> Item #{undoStack[undoStack.length - 1].itemNumero} ({undoStack[undoStack.length - 1].campo}) alterado para &quot;{undoStack[undoStack.length - 1].valorNovo}&quot;.
              </span>
            </div>
            <Button
              buttonType="secondary"
              size="small"
              onClick={() => handleUndo()}
              disabled={isUndoing}
              className="flex-shrink-0 bg-white text-amber-900 border-amber-300 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100 shadow-xs"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3 mr-1" />
              {isUndoing ? 'Desfazendo...' : `Desfazer Última (${undoStack.length})`}
            </Button>
          </div>
        )}

        {/* Painel de Apontamentos ou Estado Vazio */}
        {isAllGreen ? (
          /* Estado Vazio Limpo (All Green) */
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-800 p-8 text-center space-y-3 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-300 dark:border-emerald-700">
              <FontAwesomeIcon icon={faCircleCheck} className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Nenhuma Inconsistência Fiscal Detectada
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Todos os itens da NF-e {invoice.numero} foram auditados. CFOPs iniciam com 7 para operação com o exterior, classificações NCM possuem 8 dígitos, totais conferem perfeitamente e as unidades comerciais estão válidas.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                buttonType="primary"
                onClick={() => router.push(`/documentos/${id}/divisao`)}
              >
                <FontAwesomeIcon icon={faScissors} className="w-3.5 h-3.5 mr-1.5" />
                Avançar para Divisão de Notas
              </Button>

              <Button
                buttonType="secondary"
                outline
                onClick={() => router.push(`/documentos/${id}/conferencia`)}
              >
                <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Revisar na Conferência
              </Button>
            </div>
          </div>
        ) : (
          /* Lista Categorizada de Inconsistências */
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-xs">
            {/* Abas de Navegação / Filtro */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('todas')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'todas'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  Todas as Pendências ({issues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('erros')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'erros'
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  Erros Bloqueantes ({errosBloqueantes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('avisos')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'avisos'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  Alertas Fiscais ({alertasFiscais.length})
                </button>
              </div>

              <span className="text-[11px] text-slate-500">
                Mostrando {filteredIssues.length} de {issues.length} apontamentos
              </span>
            </div>

            {/* Cards de Apontamentos Interativos */}
            <div className="space-y-3">
              {filteredIssues.map((issue) => {
                const isError = issue.tipo === 'erro' || issue.severity === 'ERROR';
                const isSensivel = isSensitiveIssue(issue);

                return (
                  <div
                    key={issue.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isError
                        ? 'border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20'
                        : 'border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          <FontAwesomeIcon
                            icon={isError ? faCircleExclamation : faTriangleExclamation}
                            className={`w-4 h-4 ${isError ? 'text-red-500' : 'text-amber-500'}`}
                          />
                        </div>

                        <div className="space-y-1.5 text-xs">
                          {/* Cabeçalho do Card */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              Item #{issue.itemNumero} — {issue.itemDescricao}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                isError
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border border-red-300 dark:border-red-700'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                              }`}
                            >
                              {isError ? 'Erro Bloqueante' : 'Alerta Aduaneiro'}
                            </span>
                            {isSensivel ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                                <FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5 text-amber-600" />
                                Fiscal Sensível
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                                Ajuste Mecânico
                              </span>
                            )}
                            {issue.regra && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                Regra: {issue.regra}
                              </span>
                            )}
                          </div>

                          {/* Mensagem Explicativa */}
                          <p className="text-slate-700 dark:text-slate-300">
                            {issue.mensagem || issue.message}
                          </p>

                          {/* Comparativo de Valores: Encontrado vs Esperado */}
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">Valor Atual ({issue.campo}):</span>
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                                {String(issue.encontrado || 'vazio')}
                              </span>
                            </div>

                            <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 text-slate-400" />

                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">Solução Sugerida:</span>
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                {String(issue.esperado || 'Conforme')}
                              </span>
                            </div>
                          </div>

                          {/* Sugestão de Correção Descritiva com tag [Demonstração] */}
                          {issue.sugestao && (
                            <div className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded border border-blue-100 dark:border-blue-900/30 flex items-center gap-1.5 mt-1">
                              <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3 h-3 text-blue-500 flex-shrink-0" />
                              <span>
                                <strong className="font-semibold">[Demonstração]</strong> {issue.sugestao}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação por Item */}
                      <div className="flex flex-row md:flex-col items-center md:items-end gap-2 flex-shrink-0 pt-2 md:pt-0">
                        {issue.esperado && (
                          <Button
                            buttonType="success"
                            size="small"
                            onClick={() => handleRequestFix(issue)}
                            disabled={isConfirmingFix || isApplyingBatch}
                            title={`Revisar e aplicar correção para ${issue.esperado}`}
                          >
                            <FontAwesomeIcon icon={faCheck} className="w-3 h-3 mr-1" />
                            Aplicar Correção
                          </Button>
                        )}

                        <Button
                          buttonType="secondary"
                          size="small"
                          outline
                          onClick={() => router.push(`/documentos/${id}/conferencia`)}
                          title="Abrir editor de conferência deste produto"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3 mr-1 text-slate-600" />
                          Conferir Item
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feature 13: Modal de Confirmação Explícita de Correção Fiscal */}
        <FiscalFixConfirmationModal
          isOpen={Boolean(pendingFix)}
          payload={pendingFix}
          onConfirm={handleConfirmFix}
          onClose={() => setPendingFix(null)}
          isConfirming={isConfirmingFix}
        />

        {/* Feature 15: Modal de Revisão Segura de Correções em Lote */}
        <SafeBulkReviewModal
          isOpen={showBulkReviewModal}
          mechanicalIssues={mechanicalIssues}
          sensitiveIssues={sensitiveIssues}
          selectedIds={selectedMechanicalIssueIds}
          onToggleId={handleToggleMechanicalIssue}
          onToggleAll={handleToggleAllMechanical}
          onApplySelected={handleApplySelectedMechanicalFixes}
          onReviewSingle={handleReviewSingleFromBulk}
          onClose={() => setShowBulkReviewModal(false)}
          isApplying={isApplyingBatch}
        />
      </div>
    </AppLayout>
  );
}
