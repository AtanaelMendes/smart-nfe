# Relatório de Auditoria e Mapeamento da Base de Código SmartNFe

**Data da Auditoria:** 04/11/2026  
**Ambiente:** Windows 10/11 | Next.js 16.0.10 | React 19.2.0 | Tailwind CSS 4 | pnpm  
**Investigador:** Teamwork Explorer Survey (`teamwork_explorer_survey_1`)  
**Status do Projeto:** Fase 1 — Frontend MVP com dados mockados  

---

## 1. Sumário Executivo

A base de código em `c:\www\smart-nfe` provém originalmente de um sistema legado de Recursos Humanos/Recrutamento (RHBrasil / RHBSaaS) que iniciou transição para a plataforma **SmartNFe** (preparação de NF-e de exportação).

Um trabalho preliminar de fundação (R1) já foi iniciado no working tree:
- `next.config.js` foi limpo (removidos `basePath: '/saas'` e `output: 'export'`).
- `AppContext.jsx` recebeu suporte a notificações toast (`toast.success/error/warning/info`) e preferências de interface (`settings`).
- `DataTable.jsx` foi adaptado para aceitar definição explícita de `columns` com função customizada de `render`.
- `InputFile.jsx` foi ajustado para aceitar arquivos `.xml` e `.pdf` (default), com limite de 10MB e botão de remoção.
- Componentes novos de layout foram criados como untracked: `AppLayout.jsx`, `SmartNFeSidebar.jsx`, `SmartNFeHeader.jsx`, `ToastContainer.jsx`, `DemoBadge.jsx`.
- `Loading.jsx` teve o logotipo legado substituído por spinner nativo CSS.
- `app/page.jsx` redireciona para `/dashboard`.

**Pontos críticos identificados:**
1. **Dashboard legado com autenticação falsa:** `/dashboard` (`app/dashboard/page.jsx`) ainda possui o código legado de template genérico com verificação de `isAuthenticated` no `localStorage`, redirecionando qualquer visitante para `/login` (onde há formulário com `admin@teste.com / 123456`). O SmartNFe exige acesso direto e painel com indicadores fiscais e tabela de documentos recentes.
2. **Telas SmartNFe inexistentes:** As 8 telas obrigatórias (exceto o `/dashboard` que precisa ser totalmente reescrito) ainda não foram criadas (`/documentos`, `/documentos/importar`, `/documentos/[id]/conferencia`, `/documentos/[id]/divisao`, `/documentos/[id]/validacao`, `/notas-preparadas`, `/configuracoes`).
3. **Mocks, formatadores e persistência ausentes:** Não existem ainda as pastas `app/lib/data/` (5 cenários `demo-01` a `demo-05`), `app/lib/formatters/`, `app/lib/calculations/`, `app/lib/storage/` nem `app/features/`.
4. **Dependência ausente (`moment`):** `moment` é referenciado em `plugins/moment.js`, `app/assets/utils.js:31` e em 4 componentes legados, mas **NÃO está instalado em `package.json`**. Toda a formatação de datas do SmartNFe deve usar JavaScript nativo (`Intl.DateTimeFormat`) em `app/lib/formatters/dates.js`.
5. **Badge de demonstração:** `DemoBadge.jsx` exibe o texto "DEMO", enquanto o requisito R4 exige expressamente "Modo Demonstração".
6. **ESLint com erros legados:** `pnpm lint` acusa 58 erros e 170 warnings em arquivos legados de RH (devido a regras React 19 como `react-hooks/set-state-in-effect`), embora `pnpm build` compile normalmente.
7. **Restrição Operacional:** O usuário já está executando o servidor de desenvolvimento em `http://localhost:3000/dashboard`. **Não rodar `pnpm build` nem `pnpm dev`** durante o ciclo de trabalho para evitar colisões.

---

## 2. Mapeamento de Arquivos e Estrutura de Diretórios

### 2.1 Raiz do Projeto
```
c:\www\smart-nfe\
├── .env.local                    → Variáveis de ambiente (NEXT_PUBLIC_APP_MODE=demo, NEXT_PUBLIC_APP_NAME=SmartNFe)
├── .eslintrc.json                → Configuração legada ESLint
├── eslint.config.mjs             → Configuração flat ESLint 9 (nextVitals, nextTs)
├── jsconfig.json                 → Path alias "@/*" apontando para "./app/*"
├── next.config.js                → Configuração Next.js (limpo, sem basePath e sem output export)
├── package.json                  → Next 16.0.10, React 19.2.0, Tailwind 4, FontAwesome 7
├── pnpm-lock.yaml                → Lockfile pnpm
├── postcss.config.mjs            → PostCSS com @tailwindcss/postcss
├── tailwind.config.js            → Configuração Tailwind 4
├── build_homolog.bat             → Script legado de build homologação (cópia de rede)
├── build_prod.bat                → Script legado de build produção (cópia de rede)
├── start.bat / start.sh          → Scripts de inicialização
├── plugins/
│   ├── axios.js                  → Cliente HTTP fetch-based (simulando API axios)
│   └── moment.js                 → Configuração legado moment pt-br (moment não instalado)
├── public/
│   ├── build-id.json             → ID do build
│   └── images/
│       ├── default-user-no-image.jpg
│       └── defult-no-image.png
└── app/                          → Código principal da aplicação
```

### 2.2 Estrutura sob `app/`
```
app/
├── favicon.ico
├── globals.css                   → Tailwind 4 theme, cores CSS, variáveis SmartNFe, scrollbars
├── layout.jsx                    → RootLayout com Inter font, AppProvider, pt-BR
├── page.jsx                      → Redirecionamento redirect('/dashboard')
├── assets/                       → Utilitários e legados
│   ├── utils.js                  → cn(), empty(), numberToReais(), formatCnpj(), formatAnyDateInDDMMYYYY()
│   ├── dateUtils.js              → Legado: utilitários de data
│   ├── exampleEnum.js            → Legado: enum de exemplos
│   ├── permissoes.js             → Legado: IDs e validações de permissões do RHBSaaS
│   ├── photo-modal.js            → Legado: captura de foto webcam para RH
│   └── RefreshTokenCredentials.js→ Legado: refresh token API
├── context/
│   └── AppContext.jsx            → Contexto global (toasts, settings, darkMode, loading)
├── components/
│   ├── index.jsx                 → Página inicial legada de template
│   ├── ThemeProvider.jsx         → Helper de tema escuro
│   ├── buttons/                  → 9 componentes de botão (Button, ButtonGroup, etc.)
│   ├── cards/                    → Card.jsx (Card, CardTitle, CardBody, CardActions, CardImage)
│   ├── inputs/                   → 42 componentes de inputs (InputText, InputFile, Select, Checkbox, etc.)
│   ├── table/                    → DataTable.jsx (adaptado com suporte a columns)
│   ├── Layouts/                  → 30 componentes de layout e feedback
│   ├── chart/                    → 8 componentes de gráficos amCharts (legado RH)
│   ├── chatbot/                  → 3 componentes de WhatsApp chatbot (legado RH)
│   ├── notifications/            → 3 componentes de notificações RH (legado)
│   └── selecao/                  → 1 filtro de seleção RH (legado)
├── dashboard/
│   └── page.jsx                  → Dashboard legado com checagem de login falsa
├── login/
│   └── page.jsx                  → Página de login legada com admin@teste.com
└── dev/
    └── page.jsx                  → Catálogo / styleguide com 1908 linhas de testes de UI
```

### 2.3 Status das Rotas Next.js

| Rota | Arquivo Físico | Estado Atual | Ação Necessária |
|------|----------------|--------------|-----------------|
| `/` | `app/page.jsx` | `redirect('/dashboard')` | Conforme |
| `/dashboard` | `app/dashboard/page.jsx` | Template genérico com cards de vendas/usuários e redirect para `/login` | **Reescrever completamente** para dashboard SmartNFe |
| `/login` | `app/login/page.jsx` | Formulário de login fictício legado | Não utilizar (SmartNFe não requer login na Fase 1) |
| `/dev` | `app/dev/page.jsx` | Showcase de componentes | Manter como referência de componentes |
| `/documentos` | Inexistente | Não implementado | **Criar** listagem de documentos com busca, filtros e paginação |
| `/documentos/importar` | Inexistente | Não implementado | **Criar** upload drag-and-drop XML/PDF e botões dos 5 demos |
| `/documentos/[id]/conferencia` | Inexistente | Não implementado | **Criar** editor de conferência (tabela densa, navegação teclado, totais) |
| `/documentos/[id]/divisao` | Inexistente | Não implementado | **Criar** tela de divisão de itens entre múltiplas notas |
| `/documentos/[id]/validacao` | Inexistente | Não implementado | **Criar** painel de validação e inconsistências fiscais |
| `/notas-preparadas` | Inexistente | Não implementado | **Criar** listagem de notas geradas por divisão |
| `/configuracoes` | Inexistente | Não implementado | **Criar** tela de preferências de UI e densidade |

---

## 3. Análise Detalhada dos Itens de Fundação (R1)

### 3.1 Sidebar: Legado vs SmartNFe
- **Arquivo Legado:** `app/components/Layouts/Sidebar.jsx` (534 linhas)
  - Contém menus do antigo RHBrasil: "Web Mail" (`webmail.rhbrasil.com.br`), "Help Desk", "RHBSaas Legado", "Financeiro", "Seleção" (Entrar, Gerencial, Requisições, Abertura de Requisição, Faturamento Avaliação), "Testes", "Processos", etc.
  - Vinculado a `user.permissoes`, `PERMISSOES`, `tabControl`, e imagens externas da RH Brasil (`rhbrasil.com.br/images/logos/rhbrasil/logo_rhbrasil.png`).
- **Novo Componente Criado:** `app/components/Layouts/SmartNFeSidebar.jsx` (145 linhas, untracked)
  - Estrutura de menus:
    - `Dashboard` (`/dashboard`, ícone `faChartBar`)
    - `Documentos` (`/documentos`, ícone `faFileInvoice`) com subitens:
      - `Importar NF-e` (`/documentos/importar`, ícone `faFileImport`)
      - `Todos os documentos` (`/documentos`, ícone `faListAlt`)
    - `Notas Preparadas` (`/notas-preparadas`, ícone `faClipboardCheck`)
    - `Configurações` (`/configuracoes`, ícone `faGear`)
  - Suporta estado recolhido (`collapsed`: w-14 vs w-60) com toggle animado.
  - Indicador ativo com destaque azul (`bg-blue-700 text-white`).
  - **Ajuste sugerido:** O requisito R1/R3 cita "Dashboard, Documentos, Importar, Notas Preparadas, Configurações". No `SmartNFeSidebar.jsx`, "Importar" está como subitem de Documentos. Para máxima conformidade com a aceitação ("Sidebar exibe exclusivamente a estrutura de menus do SmartNFe: Dashboard, Documentos, Importar, Notas Preparadas, Configurações"), pode-se disponibilizar "Importar" também como item direto de primeiro nível ou manter os dois.

### 3.2 AppContext e Notificações Toast
- **Arquivo:** `app/context/AppContext.jsx`
- **Estado Original:** Tinha apenas `[user, setUser]`, `[loading, setLoading]`, `[notifications, setNotifications]`, `[darkMode, setDarkMode]`. Não possuía o objeto `toast`.
- **Estado Atualizado:**
  - Adicionado gerenciamento de toasts: `toasts`, `addToast(message, type, duration)`, `removeToast(id)`.
  - Exposto o objeto auxiliar `toast`:
    ```javascript
    const toast = {
      success: (msg) => addToast(msg, 'success'),
      error: (msg) => addToast(msg, 'error'),
      warning: (msg) => addToast(msg, 'warning'),
      info: (msg) => addToast(msg, 'info'),
    };
    ```
  - Adicionado gerenciamento de preferências: `settings` (`tableDensity: 'compact'`, `rowsPerPage: 20`, `demoValueLimit: 50000`, `showOriginalValues: true`, `autoSave: true`) e `updateSettings(newSettings)` sincronizado com `localStorage.getItem('smartnfe_settings')`.
  - Dark mode sincronizado com `localStorage.getItem('smartnfe_darkMode')` e classe `.dark` em `document.documentElement`.
- **Integração com `Dialog.jsx` e `InputFile.jsx`:**
  - `Dialog.jsx:14` e `InputFile.jsx:22` chamam `const { toast } = useAppContext();` e `toast.error(...)`. Com a adaptação feita no `AppContext`, esses componentes não quebram mais em tempo de execução.
  - `ToastContainer.jsx` (untracked) renderiza na tela (canto superior direito fixo) com estilo de cores e ícones para `success`, `error`, `warning` e `info`.
  - **Atenção:** Em `Dialog.jsx:45`, o `useEffect` executa `setDescription("")` sincronicamente a cada alteração de `props.showDialog`, gerando erro de lint `react-hooks/set-state-in-effect`. O implementador deve ajustar limpando o estado no callback de fechamento ou abertura.

### 3.3 next.config.js
- **Arquivo:** `next.config.js`
- **Estado Anterior:**
  - Possuía `basePath: '/saas'` (quando homolog/prod).
  - Possuía `output: 'export'`.
  - Possuía `distDir: 'production'` / `'homolog'`.
  - Possuía `generateBuildId` escrevendo `build-id.json` com `fs.writeFileSync`.
  - Possuía domains legados `www.tickflow.com.br`.
- **Estado Atual:**
  ```javascript
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    images: {
      unoptimized: true,
    },
    env: {
      NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE || 'demo',
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'SmartNFe',
    },
  };
  module.exports = nextConfig;
  ```
- **Conformidade:** Totalmente compatível com deploy padrão da Vercel (Next.js App Router).

### 3.4 DataTable.jsx
- **Arquivo:** `app/components/table/DataTable.jsx`
- **Estado Anterior:**
  - Aceitava apenas `header` (array de strings ou `{ label, align }`).
  - O corpo da tabela fazia `Object.keys(item).map(...)` sem controle sobre quais propriedades exibir, nem capacidade de renderizar badges, botões ou formatadores customizados.
- **Estado Atualizado:**
  - Aceita prop `columns`: array de `{ key, label, align?, render? }`.
  - Detecção automática de modo: `useExplicitColumns = Array.isArray(columns) && columns.length > 0`.
  - Se `columns` for fornecido:
    - Cabeçalhos derivados de `columns.map(c => ({ label: c.label, align: c.align || 'left' }))`.
    - Células renderizadas via `col.render ? col.render(item, index) : item[col.key]`.
  - Se apenas `header` for fornecido (modo legado): mantém fallback com `Object.keys(item)`.
  - Suporta prop `dense` (padding `px-2 py-1` vs `px-4 py-2`).
  - Suporta filtro de busca rápido nativo com `InputText` integrado.
  - Mensagem de vazio graciosa quando `tableData` for vazio ou nulo.
  - Footer com contagem total de registros exibidos.

### 3.5 InputFile.jsx
- **Arquivo:** `app/components/inputs/InputFile.jsx`
- **Estado Anterior:**
  - Extensões hardcoded: `[".doc", ".docx", ".pdf", ".jpg", ".jpeg", ".png"]` (sem `.xml`).
  - Limite fixo de 5MB.
  - Sem botão de limpar arquivo selecionado.
  - Bug na linha de verificação de erro: usava variável não declarada `id` em `props.required[id]` em vez de `props.required[props.id]`.
- **Estado Atualizado:**
  - Extensões default: `props.accept || [".xml", ".pdf"]`.
  - Limite configurável: `props.maxSizeMB || 10`.
  - Drag-and-drop completo (dragover, dragenter, dragleave, drop).
  - Ícone dinâmico: nuvem azul quando vazio, arquivo verde quando selecionado.
  - Botão de exclusão (ícone `faTimes`) para limpar o arquivo e chamar `props.onChange(props.id, null)`.
  - Tratamento de erro corrigido para `props.required[props.id]`.
  - Notificação de erro via `toast.error()` e callback opcional `props.onError()`.

### 3.6 Demais Componentes de Fundação Criados
- **`AppLayout.jsx`:** Shell completo que envolve as páginas com `SmartNFeSidebar`, `SmartNFeHeader` (com breadcrumbs dinâmicos), `ToastContainer` e `DemoBadge`.
- **`DemoBadge.jsx`:** Badge fixo centralizado na parte inferior da tela (`bottom-3 left-1/2 -translate-x-1/2`).
  - *Observação:* Atualmente renderiza o texto `DEMO`. Deve ser alterado para `"Modo Demonstração"` para atender estritamente ao critério de aceite.
- **`SmartNFeHeader.jsx`:** Barra superior com breadcrumbs clicáveis, toggle de sidebar móvel, indicador visual `"Modo Demo"` e alternador de tema claro/escuro (`faSun` / `faMoon`).

---

## 4. Inventário dos Componentes Reutilizáveis (`app/components/`)

Abaixo estão listados os componentes existentes na biblioteca compartilhada, suas propriedades, comportamentos e aplicabilidade para o SmartNFe:

### 4.1 Botões (`app/components/buttons/`)

| Componente | Props Principais | Comportamento / Variantes | Uso no SmartNFe |
|------------|------------------|---------------------------|-----------------|
| `Button.jsx` | `buttonType` ('primary', 'secondary', 'success', 'danger', 'warning', 'ghost'), `size` ('small', 'medium'), `pill`, `square`, `outline`, `bordered`, `block`, `disabled`, `onClick`, `title`, `children` | Botão padrão do sistema com Tailwind e acessibilidade básica. Previne propagação de clique quando `type="button"`. | Ações principais, salvar, avançar, cancelar, voltar, modal actions. |
| `ButtonDropDown.jsx` | `label`, `options: [{ label, onClick, icon }]`, `buttonType`, `size` | Botão com menu dropdown expansível. | Ações em lote e exportação de dados na listagem de documentos. |
| `ButtonGroup.jsx` | `children`, `className` | Container flex com bordas unificadas para agrupar botões contíguos. | Filtros rápidos de status e paginação. |
| `ButtonToggle.jsx` | `label`, `checked`, `onChange(id, val, checked)`, `id`, `disabled`, `primary` | Switch deslizante liga/desliga com label. | Configurações de interface (auto-save, modo compacto). |
| `ButtonRadioGroup.jsx` | `options: [{ id, label, value }]`, `value`, `onChange(value)` | Grupo de botões mutuamente exclusivos com visual tipo pill. | Seleção de densidade da tabela (compacto/normal/relaxado). |
| `PillsBadge.jsx` | `type` ('primary', 'success', 'danger', 'warning'), `children`, `small`, `className` | Badge arredondado compacto para contadores ou status. | Indicadores de quantidade de inconsistências e contadores. |

### 4.2 Cards (`app/components/cards/`)

| Componente | Props Principais | Comportamento / Variantes | Uso no SmartNFe |
|------------|------------------|---------------------------|-----------------|
| `Card.jsx` | `children`, `width`, `className` | Container branco com borda e sombra suave, suporte a `.dark`. | Cards de indicadores do dashboard, painéis de resumo de divisão e conferência. |
| `CardTitle.jsx` | `primary`, `success`, `warning`, `danger`, `color`, `button`, `onClick`, `children` | Cabeçalho do card com cor de fundo opcional e botão de ações. | Títulos de seções fiscais e totais da nota. |
| `CardBody.jsx` | `children` | Container flexível para conteúdo interno do card. | Conteúdo de dados consolidados. |
| `CardActions.jsx`| `align` ('left', 'center', 'right'), `children` | Barra inferior de ações do card com borda separadora. | Rodapé com botões de ação do card. |

### 4.3 Inputs e Formulários (`app/components/inputs/`)

| Componente | Props Principais | Comportamento / Variantes | Uso no SmartNFe |
|------------|------------------|---------------------------|-----------------|
| `InputText.jsx` | `id`, `value`, `onChange(id, value)`, `label`, `placeholder`, `mask` ('currency', 'cpf', 'cnpj', 'cep', 'numeric', 'numeric2', 'phone'), `clearable`, `small`, `large`, `required`, `disabled`, `readOnly`, `helperText`, `hint` | Campo de texto completo com floating label, suporte a máscara de CNPJ, CPF e moeda BRL com prefixo "R$", botão limpar e tooltip explicativo. | Campos de busca, edição de código, NCM, CFOP e filtros. |
| `InputNumber.jsx`| `id`, `value`, `onChange(id, value)`, `label`, `min`, `max`, `small`, `large`, `required`, `disabled`, `helperText` | Campo numérico nativo com validação de limites min/max. | Edição de quantidades e itens. |
| `InputFile.jsx` | `id`, `label`, `subLabel`, `accept` (default: ['.xml', '.pdf']), `maxSizeMB` (default: 10), `disabled`, `onChange(id, file)`, `onError`, `required` | Upload drag-and-drop com validação de extensão e tamanho, feedback visual e remoção. | Tela de importação de documentos fiscais. |
| `InputTextArea.jsx` | `id`, `value`, `onChange(id, value)`, `label`, `rows`, `maxLength`, `minLength`, `required`, `disabled`, `helperText` | Textarea com contador de caracteres dinâmico (badge colorido). | Campo de observações e dados adicionais da NF-e. |
| `Select.jsx` | `id`, `value`, `options: [{ label, value }]`, `placeholder`, `onChange(id, value)`, `label`, `hideClearButton`, `required`, `disabled`, `hint`, `helperText` | Select estilizado com botão de limpar seleção e floating label. | Filtros por status, seleção de CFOP, UF, destinatário. |
| `Checkbox.jsx` | `id`, `checked`, `onChange(id, checked)`, `label`, `disabled` | Checkbox com estilo Tailwind azul e cursor pointer. | Seleção múltipla de itens para divisão de notas. |
| `Radio.jsx` / `RadioGroup.jsx` | `id`, `name`, `checked`, `value`, `onChange`, `label` | Botões de opção tipo radio. | Escolha de critério de rateio ou tipo de exportação. |
| `DatePicker.jsx` | `id`, `value`, `onChange(id, value)`, `label`, `disabled`, `required` | Seletor de data. | Filtro por período de emissão. |

### 4.4 Tabela e Listagens (`app/components/table/` e `app/components/Layouts/`)

| Componente | Props Principais | Comportamento / Variantes | Uso no SmartNFe |
|------------|------------------|---------------------------|-----------------|
| `DataTable.jsx` | `data`, `columns: [{ key, label, align, render }]`, `header`, `dense`, `mainText`, `action` | Tabela responsiva com busca integrada no cliente, colunas explícitas ou chaves dinâmicas, linha de totalizador/footer e zebra striping. | Tabela de documentos recentes, listagem geral de documentos, notas preparadas. |
| `Pagination.jsx` | `data`, `itemsPerPage` (default: 50), `callBackChangePage(pageData)`, `showPaginator`, `showItemCountSelector`, `size` ('sm', 'md', 'lg') | Paginação completa com botões primeiro/anterior/próximo/último, seletor de itens por página (10, 20, 50, 100) e indicador de intervalo. | Paginação da lista de documentos e notas preparadas. |
| `NoDataFound.jsx` | `visible`, `isLoading`, `className` | Exibe estado vazio com mensagem "Não há dados para exibir..." ou animação de carregamento. | Estados vazios após filtros ou tabelas sem registros. |
| `Skeleton.jsx` | `Skeleton`, `FormSkeleton`, `SkeletonList` (variants: 'cards', 'table', 'default'), `count` | Placeholders animados (`animate-pulse`) para simular carregamento de tabelas, formulários e cards. | Estados de loading assíncrono em todas as telas. |
| `Loading.jsx` | `active`, `className` | Overlay absoluto com spinner circular moderno e texto "SmartNFe Carregando...". | Bloqueio de tela durante simulação de importação ou operações pesadas. |
| `Dialog.jsx` | `showDialog`, `setDialogControl`, `title`, `hideTextArea`, `textAreaLabel`, `textAreaMinLength`, `btnAccept`, `btnCancel`, `confirmActionCallback`, `closeDialogCallback` | Modal de confirmação com textarea opcional, validação de tamanho mínimo e botões de ação. | Confirmação de exclusão, cancelamento de divisão ou descarte de alterações. |
| `Confirm.jsx` | `visible`, `setVisible`, `primaryText`, `secondaryText`, `btnAccept`, `btnDecline`, `confirmActionCallback` | Modal compacto de aviso com ícone de alerta. | Confirmações rápidas de ação. |
| `PageTabs.jsx` | `pageTabs: [{ id, name, active, visible, contador, blink }]`, `onClick(id)`, `scrollable` | Barra de abas com suporte a contador de alertas e animações. | Abas de navegação entre seções da NF-e (Itens, Transporte, Totais, Exportação). |
| `Accordion.jsx` | `items: [{ title, subTitle, content }]` | Seções colapsáveis com animação de seta. | Agrupamento de inconsistências por gravidade e detalhes fiscais avançados. |
| `TooltipComponent.jsx` | `children`, `content`, `side` ('top', 'bottom', 'left', 'right') | Tooltip exibido no hover com posicionamento automático de seta. | Explicações contextuais sobre regras fiscais, CFOPs e alertas. |
| `Typography.jsx` | `Title`, `Subtitle`, `Label`, `Caption`, `FieldLabel` | Tipografia padronizada com pesos e tamanhos consistentes. | Cabeçalhos e legendas em todas as telas. |

---

## 5. Mapeamento de Componentes Legados a Serem Isolados

Os seguintes arquivos e pastas pertencem ao aplicativo legado de RH e **não devem ser utilizados nem referenciados** nas telas do SmartNFe:

1. **`app/components/chart/*`** (8 arquivos):
   - `AnswersChart.jsx`, `MapChart.jsx`, `MultiAxisLineChart.jsx`, `PieChart.jsx`, `UserHoursBarChart.jsx`, `XyVerticalChart.jsx`, `YearlySeriesChart.jsx`, `exemploXY.js`.
   - Utilizam amCharts 5 (não instalado no `package.json`, falhariam se executados).
2. **`app/components/chatbot/*`** (3 arquivos):
   - `WhatsappChat.jsx`, `WhatsappMsg.jsx`, `graficos/UsoChatBotAnalistas.jsx`.
   - Específicos para analistas de recrutamento.
3. **`app/components/notifications/*`** (3 arquivos):
   - `JobNotification.jsx`, `ScheduleNotification.jsx`, `VagaRecrutamentoNotification.jsx`.
   - Modais de alertas de vagas e entrevistas de emprego.
4. **`app/components/selecao/*`** (1 arquivo):
   - `filtros/SelecaoFiltro.jsx` (busca de candidatos por vaga e cliente).
5. **`app/components/inputs/Select2*.jsx`** (17 arquivos):
   - `Select2Analista`, `Select2Candidato`, `Select2CargosSip`, `Select2Cliente`, `Select2Vaga`, `Select2VagaAnalista`, `SelectAnalistaFilter`, `SelectBairro`, `SelectCidade`, `SelectCidadeFilter`, `SelectCompetencias`, `SelectEstado`, `SelectIdiomas`, `SelectOrgaoEmissor`, `SelectPais`, `SelectSoftwares`, `SelectTestes`, `SelectUnidade`.
   - Carregavam dados de candidatos, cidades e vagas da API antiga.
6. **`app/components/inputs/` (específicos de RH):**
   - `ProfilePicture.jsx` (captura foto candidato), `CompetenciaRangeSlider.jsx`, `LanguageRangeSlider.jsx`, `SoftwareRangeSlider.jsx`, `RadioTipoProcesso.jsx`.
7. **`app/assets/permissoes.js` e `photo-modal.js`:**
   - Permissões do RHBrasil e modal de foto.
8. **`app/dashboard/page.jsx` e `app/login/page.jsx`:**
   - Telas de template fictício com login por `admin@teste.com`.

---

## 6. Lacunas de Arquitetura e Trabalho Restante para R2, R3 e R4

### 6.1 Mocks e Dados Fictícios (`app/lib/data/`) — Pendente
Conforme especificado em `ORIGINAL_REQUEST.md` e `copilot-instructions.md`, é necessário criar:
- `app/lib/data/mockInvoices.js`: 5 cenários completos identificados como demonstração:
  - `demo-01`: NF-e XML padrão (8 itens, dados fiscais completos)
  - `demo-02`: NF-e PDF exportação (25 itens)
  - `demo-03`: NF-e grande (50 itens para teste de desempenho e paginação)
  - `demo-04`: NF-e com inconsistências simuladas (12 itens com NCM zerado, CFOP inconsistente, divergência de soma)
  - `demo-05`: NF-e com produtos repetidos (15 itens para teste de agrupamento/divisão)
- `app/lib/data/mockProducts.js`: Catálogo com NCMs, CFOPs de exportação (7101, 7102, 7501), unidades fiscais (KG, UN, M2, CX).
- `app/lib/data/mockCompanies.js`: Empresas emitentes e destinatárias estrangeiras (importadores).

### 6.2 Formatadores (`app/lib/formatters/`) — Pendente
Regra obrigatória: **NÃO usar ponto flutuante binário para exibição e NÃO usar `moment`**.
- `currency.js`: `formatBRL(val)`, `parseBRL(str)` usando `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- `dates.js`: `formatDateBR(dateStr)`, `formatDateTimeBR(dateStr)` usando `Intl.DateTimeFormat('pt-BR')` nativo.
- `numbers.js`: `formatQuantity(val, decimals = 3)`, `formatDecimal(val, decimals = 4)`.
- `status.js`: `getStatusLabel(status)`, `getStatusBadgeClass(status)` para os estados `conferido`, `pendente`, `inconsistente`, `dividido`, `preparado`.

### 6.3 Cálculos Fiscais (`app/lib/calculations/`) — Pendente
Regra obrigatória: **Trabalhar com strings decimais ou centavos inteiros (BigInt / manipulação de string decimal) para evitar desvios de arredondamento IEEE 754**:
- `invoiceTotals.js`: `calcularTotais(itens)`, `recalcularNota(nota)`.
- `division.js`: `calcularSaldo(quantidadeTotal, alocacoes)`, `validarDistribuicao(itens, notasDestino)`.

### 6.4 Persistência Local (`app/lib/storage/localStorageService.js`) — Pendente
- Esquema versionado (`STORAGE_SCHEMA_VERSION = "1.0.0"`).
- Métodos: `save(key, data)`, `load(key)`, `reset(key)`, `resetAll()`.
- Inicialização automática com os 5 cenários mockados caso o storage esteja vazio ou desatualizado.

### 6.5 Repositórios Assíncronos (`app/features/`) — Pendente
Contrato assíncrono para permitir transição futura transparente para a API backend PHP:
- `app/features/invoices/mockInvoiceRepository.js`: `list(filters)`, `findById(id)`, `update(id, data)`, `updateItem(id, itemId, data)`, `getValidationIssues(id)`.
- `app/features/invoices/invoiceService.js`.
- `app/features/division/mockDivisionRepository.js` & `divisionService.js`.
- `app/features/validation/validationRules.js` & `validationService.js`.

### 6.6 Componentes Fiscais Especializados (`app/components/fiscal/`) — Pendente
- `InvoiceHeader.jsx`: Dados da nota (número, série, chave de acesso, emitente, destinatário, data).
- `InvoiceStatus.jsx`: Badge com status da conferência e indicadores.
- `InvoiceItemsTable.jsx`: Tabela densa com colunas: item, código, descrição, NCM, CFOP, unid, quantidade, valor unitário, valor total, situação.
- `InvoiceItemEditor.jsx`: Edição rápida inline com navegação por teclado (Tab/Enter).
- `InvoiceTotals.jsx`: Painel fixo/resumido com totais de produtos, frete, seguro, outras despesas, desconto e total da NF-e.
- `DocumentPreview.jsx`: Visualizador simulado de DANFE / Espelho de NF-e.
- `DivisionWorkspace.jsx`: Área interativa de alocação de itens entre Nota A, Nota B, etc.
- `DivisionSummary.jsx`: Conferência de saldos restantes por item com alertas visuais de sobras ou excessos.
- `ValidationPanel.jsx`: Lista de inconsistências com gravidade (erro, alerta, sugestão) e botão para aplicar correção sugerida.

### 6.7 As 8 Telas da Aplicação — Pendente
1. `/dashboard`: Indicadores consolidados (total documentos, conferidos, pendentes, com inconsistências), atalhos de importação e tabela de documentos recentes.
2. `/documentos/importar`: Drag-and-drop de XML/PDF e botões de carregamento rápido dos 5 cenários demo.
3. `/documentos`: Listagem de documentos com busca, filtros por status/data, paginação via `Pagination.jsx` e ações de navegação.
4. `/documentos/[id]/conferencia`: Editor principal de itens fiscais com recálculo automático de totais e persistência no localStorage.
5. `/documentos/[id]/divisao`: Distribuição de produtos entre notas fiscais filhas com validação de saldo em tempo real.
6. `/documentos/[id]/validacao`: Assistente de inconsistências fiscais demonstrativas (especialmente `demo-04`).
7. `/notas-preparadas`: Listagem de notas filhas geradas pelas divisões com opção de exportação simulada.
8. `/configuracoes`: Preferências de densidade de tabela, exibição de valores originais e restauração de dados demo.

---

## 7. Diagnóstico Técnico de Build e Lint

1. **Build (`pnpm build`):**
   - Compila com **0 erros** em 11.3s (Next.js 16.0.10 App Router Turbopack).
   - Páginas estáticas geradas: `/`, `/_not-found`, `/dashboard`, `/dev`, `/login`.
2. **Lint (`pnpm lint`):**
   - Falha devido a arquivos legados do RH (`Select2*.jsx`, `Iframe.jsx`, `photo-modal.js`, `Dialog.jsx`, etc.) disparando `react-hooks/set-state-in-effect` (nova regra do React 19 / ESLint 9) e variáveis não utilizadas.
   - **Recomendação:** No `eslint.config.mjs`, ignorar componentes legados não utilizados ou ajustar os arquivos tocados pelo SmartNFe para garantir `pnpm lint` limpo.
3. **Instrução Restritiva do Usuário:**
   - O servidor Next.js já se encontra ativo externamente em `http://localhost:3000/dashboard`.
   - É estritamente proibido rodar comandos de build adicionais ou subir novos servidores locais para não provocar conflitos de portas ou travamento do terminal.

---

## 8. Conclusão e Próximos Passos Recomendados

A fundação básica (R1) está 80% encaminhada no working copy (configuração limpa, novos componentes de layout criados, tabela e input de arquivos adaptados, contexto com toast). O trabalho principal agora deve focar nas Etapas B (finalização da fundação), C (mocks e regras de negócio) e D (telas):

1. **Ajustes Finais de Fundação:**
   - Atualizar texto de `DemoBadge.jsx` de "DEMO" para "Modo Demonstração".
   - Garantir que a Sidebar apresente os 5 menus no primeiro nível (Dashboard, Documentos, Importar, Notas Preparadas, Configurações).
   - Eliminar a checagem de autenticação falsa e formulário de login no `/dashboard`.
2. **Estruturação da Camada de Negócio (R2):**
   - Criar `app/lib/data/` com os 5 cenários fictícios.
   - Criar `app/lib/formatters/` e `app/lib/calculations/` sem ponto flutuante e sem `moment`.
   - Criar `app/lib/storage/localStorageService.js` com versão `1.0.0`.
   - Criar `app/features/` com os repositórios assíncronos.
3. **Construção dos Componentes Fiscais e Telas (R3):**
   - Implementar os 9 componentes em `app/components/fiscal/`.
   - Desenvolver as 8 telas sob `AppLayout`.
