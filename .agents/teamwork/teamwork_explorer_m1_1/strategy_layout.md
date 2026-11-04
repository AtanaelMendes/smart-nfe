# Estratégia de Implementação e Ajustes: Componentes de Layout & Shell (M1)

**Data:** 04/11/2026  
**Responsável:** Teamwork Explorer M1 (`teamwork_explorer_m1_1`)  
**Alvo:** Milestone 1 — M1_Foundation_Dashboard  
**Referência de Aceite:** Critérios 59 e 60 de `ORIGINAL_REQUEST.md` e Contrato 5 de `PROJECT.md`

---

## 1. Sumário Executivo

Esta estratégia define as alterações concretas para os componentes de casca (*shell*) e contexto da aplicação SmartNFe. O objetivo é assegurar aderência estrita aos critérios de aceitação:
1. **`DemoBadge.jsx`**: Exibir expressamente a string `"Modo Demonstração"` (atualmente exibe `"DEMO"`) com indicador visual pulsante, preservando a não-obstrução de cliques (`pointer-events-none`) e integrando em todas as páginas através do `AppLayout`. (Critério 60).
2. **`SmartNFeSidebar.jsx`**: Elevar `"Importar"` ao nível raiz da barra de navegação lateral, totalizando exclusivamente os 5 menus do SmartNFe: **Dashboard**, **Documentos**, **Importar**, **Notas Preparadas**, **Configurações**. Ajustar a regra de rota ativa (`isActive`) para não haver sobreposição de destaque entre `/documentos` e `/documentos/importar`. (Critério 59).
3. **`SmartNFeHeader.jsx` & `AppLayout.jsx`**: Garantir integração limpa e responsiva com breadcrumbs dinâmicos, alternador de tema claro/escuro (`darkMode`), `ToastContainer` e `DemoBadge`, suportando estilização completa em modo claro e escuro.
4. **`AppContext.jsx`**: Otimizar a interface de notificações (`toast.success/error/warning/info`) com memoização (`useMemo`) para evitar recriação de referências e loops de renderização em componentes dependentes (`InputFile`, `Dialog`), manter estado de `settings` persistido e gerenciamento de tema.

---

## 2. Detalhamento e Código Proposto por Componente

---

### 2.1 `app/components/Layouts/DemoBadge.jsx`

#### Diagnóstico Atual
- **Arquivo:** `app/components/Layouts/DemoBadge.jsx` (16 linhas)
- **Problema:** A linha 11 renderiza `DEMO` em caixa alta com `text-[10px]` e `uppercase`.
- **Exigência:** Requisito R4 e Critério 60 exigem: *"Badge 'Modo Demonstração' é visível em todas as telas do sistema"*.
- **Risco:** Testes automatizados que validem a presença de `"Modo Demonstração"` falharão se o texto for `"DEMO"`.

#### Código Atual vs Proposto

**Antes (linhas 9-12):**
```jsx
<span className="inline-flex items-center gap-1.5 bg-slate-800 bg-opacity-80 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow">
  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
  DEMO
</span>
```

**Proposto para `app/components/Layouts/DemoBadge.jsx`:**
```jsx
'use client';

export default function DemoBadge() {
  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none"
      data-testid="demo-badge"
      aria-hidden="true"
    >
      <span className="inline-flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-sm text-slate-100 text-xs font-medium px-3.5 py-1 rounded-full shadow-md border border-slate-700/60">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>Modo Demonstração</span>
      </span>
    </div>
  );
}
```

#### Destaques de Design
- Removido `uppercase` para manter a grafia exata `"Modo Demonstração"`.
- Aumentada a legibilidade para `text-xs font-medium`.
- Mantido `pointer-events-none` para não interferir em cliques de elementos no rodapé.
- Adicionado `data-testid="demo-badge"` para facilidade de asserção em testes E2E.
- Posição `fixed bottom-3 left-1/2 -translate-x-1/2` garante visibilidade uniforme em qualquer tela ou resolução sem interferir no scroll.

---

### 2.2 `app/components/Layouts/SmartNFeSidebar.jsx`

#### Diagnóstico Atual
- **Arquivo:** `app/components/Layouts/SmartNFeSidebar.jsx` (145 linhas)
- **Problema:** O menu `"Importar NF-e"` está aninhado como filho (`children`) de `"Documentos"`. Não existe o item `"Importar"` na raiz.
- **Exigência:** Critério 59: *"A Sidebar exibe exclusivamente a estrutura de menus do SmartNFe (Dashboard, Documentos, Importar, Notas Preparadas, Configurações)"*.
- **Problema de Rota Ativa:** Se `"Importar"` for raiz (`/documentos/importar`) e `"Documentos"` for raiz (`/documentos`), uma verificação ingênua `pathname.startsWith('/documentos')` faria com que ambos os itens ficassem destacados em azul simultaneamente quando o usuário estivesse em `/documentos/importar`. Além disso, rotas filhas de conferência (`/documentos/[id]/conferencia`) não ativariam o menu `"Documentos"` se a verificação fosse apenas igualdade estrita (`===`).

#### Solução de Rota Ativa
```javascript
const isCurrent = pathname === item.href;
const isNestedDocument =
  item.href === '/documentos' &&
  pathname.startsWith('/documentos/') &&
  pathname !== '/documentos/importar';
const isActive = isCurrent || isNestedDocument;
```

#### Código Proposto para `app/components/Layouts/SmartNFeSidebar.jsx`
```jsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartBar,
  faFileInvoice,
  faFileImport,
  faClipboardCheck,
  faGear,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

const menuItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: faChartBar,
  },
  {
    label: 'Documentos',
    href: '/documentos',
    icon: faFileInvoice,
  },
  {
    label: 'Importar',
    href: '/documentos/importar',
    icon: faFileImport,
  },
  {
    label: 'Notas Preparadas',
    href: '/notas-preparadas',
    icon: faClipboardCheck,
  },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: faGear,
  },
];

function NavItem({ item, collapsed, pathname }) {
  const isCurrent = pathname === item.href;
  const isNestedDocument =
    item.href === '/documentos' &&
    pathname.startsWith('/documentos/') &&
    pathname !== '/documentos/importar';
  const isActive = isCurrent || isNestedDocument;

  return (
    <li>
      <Link
        href={item.href}
        title={collapsed ? item.label : ''}
        className={`
          flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150
          ${isActive
            ? 'bg-blue-700 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <FontAwesomeIcon icon={item.icon} className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );
}

export default function SmartNFeSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();

  return (
    <aside
      className={`
        flex flex-col bg-slate-800 text-white transition-all duration-200 flex-shrink-0 select-none
        ${collapsed ? 'w-14' : 'w-60'}
      `}
      aria-label="Menu principal"
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-slate-700 h-12 ${collapsed ? 'justify-center px-2' : 'px-4 gap-2'}`}>
        <div className="flex items-center justify-center w-7 h-7 bg-blue-600 rounded-md flex-shrink-0">
          <FontAwesomeIcon icon={faFileInvoice} className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-base tracking-tight text-white">SmartNFe</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-1">
          {menuItems.map(item => (
            <NavItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              pathname={pathname}
            />
          ))}
        </ul>
      </nav>

      {/* Toggle button */}
      <div className="border-t border-slate-700 p-2">
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          className="w-full flex items-center justify-center py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <FontAwesomeIcon
            icon={collapsed ? faChevronRight : faChevronLeft}
            className="w-3 h-3"
          />
          {!collapsed && <span className="ml-2 text-xs">Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
```

---

### 2.3 `app/components/Layouts/SmartNFeHeader.jsx` & `AppLayout.jsx`

#### Diagnóstico Atual
- **`SmartNFeHeader.jsx`**: Possui estrutura para breadcrumbs e toggle de dark mode, mas não inclui classes de tema escuro (`dark:*`), deixando o cabeçalho branco em modo escuro.
- **`AppLayout.jsx`**: Conecta `SmartNFeSidebar`, `SmartNFeHeader`, `ToastContainer` e `DemoBadge`. Precisa incluir as classes de transição de tema escuro (`dark:bg-slate-900 dark:text-slate-100`).
- **`ToastContainer.jsx`**: Container no topo direito que renderiza os toasts ativos. Deve ter `pointer-events-none` no wrapper externo para não bloquear cliques de tela fora dos cards de toast, e `pointer-events-auto` em cada toast individual.

#### Código Proposto para `app/components/Layouts/SmartNFeHeader.jsx`
```jsx
'use client';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faChevronRight, faBars } from '@fortawesome/free-solid-svg-icons';
import { useAppContext } from '@/context/AppContext';

export default function SmartNFeHeader({ breadcrumbs = [], onMenuToggle }) {
  const { darkMode, toggleDarkMode } = useAppContext();

  return (
    <header className="h-12 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center px-4 gap-3 flex-shrink-0 transition-colors">
      {/* Mobile menu toggle */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
          title="Menu"
          aria-label="Abrir menu"
        >
          <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
        </button>
      )}

      {/* Breadcrumbs */}
      <nav aria-label="Navegação estrutural" className="flex-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 min-w-0">
        <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white flex-shrink-0 font-medium transition-colors">
          SmartNFe
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            <FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5 flex-shrink-0 text-gray-400 dark:text-slate-600" />
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-gray-900 dark:hover:text-white truncate transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-white font-medium truncate">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right side actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Demo mode label */}
        <span className="hidden sm:inline-flex items-center text-xs text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded px-2 py-0.5 font-medium">
          Modo Demo
        </span>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
          aria-label={darkMode ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
```

#### Código Proposto para `app/components/Layouts/AppLayout.jsx`
```jsx
'use client';
import { useState } from 'react';
import SmartNFeSidebar from './SmartNFeSidebar';
import SmartNFeHeader from './SmartNFeHeader';
import ToastContainer from './ToastContainer';
import DemoBadge from './DemoBadge';

export default function AppLayout({ children, breadcrumbs = [] }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 overflow-hidden">
      <SmartNFeSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <SmartNFeHeader breadcrumbs={breadcrumbs} onMenuToggle={() => setSidebarCollapsed(prev => !prev)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      <ToastContainer />
      <DemoBadge />
    </div>
  );
}
```

#### Código Proposto para `app/components/Layouts/ToastContainer.jsx`
```jsx
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
```

---

### 2.4 `app/context/AppContext.jsx`

#### Diagnóstico Atual
- **Arquivo:** `app/context/AppContext.jsx` (99 linhas)
- **Problema de Estabilidade Referencial:** O objeto `toast` é recriado como um novo literal de objeto a cada render de `AppProvider`. Qualquer componente que utilize `toast` dentro de um `useEffect` com array de dependências sofrerá execuções repetidas.
- **Configurações Default:** O objeto inicial de configurações não está isolado em uma constante exportável `DEFAULT_SETTINGS`, dificultando resets de fábrica no `/configuracoes`.
- **Duração Parametrizável de Toasts:** A função `addToast` suporta parâmetro `duration`, porém os atalhos `toast.success`, `toast.error`, etc., não repassam o parâmetro `duration` se fornecido.

#### Código Proposto para `app/context/AppContext.jsx`
```jsx
'use client';

import { createContext, useState, useCallback, useContext, useEffect, useMemo } from 'react';

export const DEFAULT_SETTINGS = {
  tableDensity: 'compact',      // 'compact' | 'normal' | 'relaxed'
  rowsPerPage: 20,
  demoValueLimit: 50000,        // limite demonstrativo de valor por nota
  showOriginalValues: true,
  autoSave: true,
};

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const savedDarkMode = localStorage.getItem('smartnfe_darkMode');
      if (savedDarkMode === 'true') setDarkMode(true);

      const savedSettings = localStorage.getItem('smartnfe_settings');
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    } catch (e) {
      // localStorage indisponível ou JSON inválido
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('smartnfe_darkMode', darkMode.toString());
      document.documentElement.classList.toggle('dark', darkMode);
    } catch (e) {}
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('smartnfe_settings', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  // Interface toast estável com suporte a duração customizada
  const toast = useMemo(() => ({
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  }), [addToast]);

  const value = useMemo(() => ({
    loading,
    setLoading,
    toasts,
    addToast,
    removeToast,
    toast,
    darkMode,
    toggleDarkMode,
    settings,
    updateSettings,
    DEFAULT_SETTINGS,
  }), [loading, toasts, addToast, removeToast, toast, darkMode, toggleDarkMode, settings, updateSettings]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
```

---

## 3. Matriz de Integração e Critérios de Aceite

| Requisito / Critério | Componente | Verificação Esperada | Estado Após Aplicação |
|---|---|---|---|
| **Critério 60:** Badge "Modo Demonstração" visível em todas as telas | `DemoBadge.jsx` via `AppLayout.jsx` | Texto no DOM é `"Modo Demonstração"` (não `"DEMO"`), com ponto âmbar animado e `pointer-events-none`. | **CONFORME** |
| **Critério 59:** Sidebar exibe exclusivamente Dashboard, Documentos, Importar, Notas Preparadas, Configurações | `SmartNFeSidebar.jsx` | Exatamente 5 itens na raiz; "Importar" direto; rota ativa sem duplo destaque. | **CONFORME** |
| **Contrato 5:** AppContext Toasts & Settings | `AppContext.jsx` | `toast.success/error/warning/info` funcionais e memoizados; `settings` e `darkMode` persistidos. | **CONFORME** |
| **R1:** Casca unificada de layout | `AppLayout.jsx` | Header com breadcrumbs dinâmicos, Dark mode toggle funcional, Toasts no canto superior direito. | **CONFORME** |

---

## 4. Método de Verificação Independente

Para validar a implementação sem executar `pnpm build` ou `pnpm dev` (preservando o servidor ativo em http://localhost:3000):

1. **Inspeção Estática de Arquivos:**
   - `node -e "const s = fs.readFileSync('app/components/Layouts/DemoBadge.jsx','utf8'); assert(s.includes('Modo Demonstração') && !s.includes('DEMO'));"`
   - `node -e "const s = fs.readFileSync('app/components/Layouts/SmartNFeSidebar.jsx','utf8'); assert(s.includes('/documentos/importar') && s.includes('Importar'));"`
2. **Teste Automatizado de Contrato JSX via Node.js:**
   - Criar teste simples em `tests/tier1/layout_components.test.mjs` que importe os componentes ou faça parse estático validando as props e exports.
3. **Verificação HTTP no Servidor Ativo:**
   - `node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(html => console.log('OK, status:', html.length > 0))"`
