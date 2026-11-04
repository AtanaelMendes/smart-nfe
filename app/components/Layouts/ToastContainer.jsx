'use client';
import { useAppContext } from '@/context/AppContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faExclamationTriangle,
  faInfoCircle,
  faTimesCircle,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

const toastConfig = {
  success: {
    icon: faCheckCircle,
    bg: 'bg-green-50 border-green-400 dark:bg-green-950/80 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    iconColor: 'text-green-500 dark:text-green-400',
  },
  error: {
    icon: faTimesCircle,
    bg: 'bg-red-50 border-red-400 dark:bg-red-950/80 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-500 dark:text-red-400',
  },
  warning: {
    icon: faExclamationTriangle,
    bg: 'bg-yellow-50 border-yellow-400 dark:bg-yellow-950/80 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-200',
    iconColor: 'text-yellow-500 dark:text-yellow-400',
  },
  info: {
    icon: faInfoCircle,
    bg: 'bg-blue-50 border-blue-400 dark:bg-blue-950/80 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    iconColor: 'text-blue-500 dark:text-blue-400',
  },
};

export default function ToastContainer() {
  const { toasts = [], removeToast } = useAppContext();

  if (!toasts.length) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map(toast => {
        const config = toastConfig[toast.type] || toastConfig.info;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3 rounded-lg border shadow-lg ${config.bg} ${config.text} transition-all duration-200`}
            role="alert"
          >
            <FontAwesomeIcon icon={config.icon} className={`mt-0.5 flex-shrink-0 ${config.iconColor}`} />
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:opacity-70 p-0.5 transition-opacity"
              aria-label="Fechar notificação"
            >
              <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
