# Scope: Milestone 1 — M1_Foundation_Dashboard

## Mission & Scope
Entregar a Fundação completa e a tela inicial `/dashboard` do SmartNFe funcional e pronta para visualização no navegador pelo usuário (em http://localhost:3000/dashboard).

## Deliverables & Tasks
1. **DemoBadge (`app/components/Layouts/DemoBadge.jsx`)**:
   - Ajustar texto para exibir expressamente "Modo Demonstração" com badge fixo/visível em todas as telas.
2. **Sidebar (`app/components/Layouts/SmartNFeSidebar.jsx`)**:
   - Menu exclusivamente com a estrutura SmartNFe: Dashboard, Documentos, Importar, Notas Preparadas, Configurações. Expor "Importar" no primeiro nível de navegação.
3. **Layout & Cabeçalho (`AppLayout.jsx`, `SmartNFeHeader.jsx`)**:
   - Integrar layout padrão com Header (breadcrumbs, modo demo, toggle dark mode), Sidebar recolhível, ToastContainer e DemoBadge.
4. **Contexto Global (`app/context/AppContext.jsx`)**:
   - Prover `toast` (`success`, `error`, `warning`, `info`), `settings` e `darkMode`.
5. **Componentes Base**:
   - `DataTable.jsx`: Suporte a prop `columns` explícita `{ key, label, align, render }` e flag `dense`.
   - `InputFile.jsx`: Suporte a arquivos `.xml` e `.pdf`, limite de 10MB, botão de remoção e integração com toasts.
   - `Dialog.jsx`: Modal de confirmação seguro com suporte a textarea.
6. **Lint & Configurações**:
   - Ajustar `eslint.config.mjs` para remover `nextTs` em projeto JS puro e ignorar templates legados em `app/dev/`.
7. **Formatadores e Mock Baseline**:
   - Criar `app/lib/formatters/currency.js` (BRL), `app/lib/formatters/dates.js` (Intl nativo, sem moment) e `app/lib/formatters/status.js`.
   - Criar baseline de dados mockados em `app/lib/data/mockInvoices.js` para abastecer os KPIs e tabela de documentos recentes.
8. **Tela `/dashboard` (`app/dashboard/page.jsx`)**:
   - Substituir totalmente o template legado antigo (remover auth check fake e redirect para `/login`).
   - Implementar painel executivo com 5 KPIs fiscais, botões de ação rápida (Importar, Carregar Demo 01-05) e tabela de documentos recentes com badges de status e atalhos para conferência.
   - Utilizar `AppLayout`.

## Hard Constraints
- NÃO rodar comandos de build (`pnpm build`, `npm run build`) e NÃO iniciar servidores (`pnpm dev`, `npm run dev`) pois o servidor de desenvolvimento já está ativo em http://localhost:3000/dashboard.
- Verificação deve usar testes node unitários, lint estático (`npx eslint <arquivos_alterados>`) e verificação HTTP contra o servidor local (`node -e "fetch('http://localhost:3000/dashboard')..."`).
- Integridade: Sem mocks falsos no validador forense; implementação genuína.

## Acceptance Criteria
- [ ] Sidebar exibe Dashboard, Documentos, Importar, Notas Preparadas, Configurações.
- [ ] Badge exibe "Modo Demonstração".
- [ ] `/dashboard` abre sem redirecionar para login, exibindo cards de indicadores e tabela recente.
- [ ] `http://localhost:3000/dashboard` responde com status 200 contendo elementos do SmartNFe.
- [ ] 2x Reviewers aprovam, 2x Challengers aprovam, 1x Auditor Forense aprova CLEAN.
