## 2026-11-10T13:22:48Z
You are teamwork_victory_auditor.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_victory_auditor_1\
Your parent is cc0953cc-8b42-4d2a-83e5-1778cee0deb7.

Conduct a rigorous post-victory audit (timeline verification, cheating/stub/shortcut detection, and independent test/lint/build execution) against the requirements:

<original_task>
This is a single self-contained fix; keep it small and focused. Implementar um sistema de tourtip / onboarding contextual que explica o objetivo de cada tela ao ser acessada no SmartNFe, permitindo guiar o usuário pelas regras e ações de cada etapa do fluxo fiscal, sem criar novos arquivos de teste e focando exclusivamente na feature e em zero erros de lint e build.

Working directory: c:\www\smart-nfe
Integrity mode: development

## Requirements

### R1. Dicionário Centralizado de Conteúdo dos Tourtips
Implementar em `app/config/screenTours.js` a base centralizada de dados explicativos para as 8 rotas mapeadas do SmartNFe:
1. `/dashboard`: Painel Geral — Visão geral dos documentos fiscais em andamento, métricas consolidadas e atalhos rápidos.
2. `/documentos/importar`: Importação de XML — Leitura e validação client-side de NF-e modelo 55 (DOMParser, Módulo 11) com privacidade em memória de sessão temporária.
3. `/documentos`: Lista de Documentos — Gerenciamento e filtro das notas fiscais originais, status de processamento e ações de conferência.
4. `/documentos/[id]/conferencia`: Conferência de Produtos — Conferência item a item de mercadorias, edição estável por `itemId`, recálculo em precisão decimal, comparação com `valorOriginal` e atalhos de teclado.
5. `/documentos/[id]/validacao`: Validação Fiscal — Diagnóstico de inconsistências cadastrais e tributárias de exportação, confirmação explícita de alterações, pilha de desfazer (*undo*) e bloqueio de lote em campos tributários sensíveis.
6. `/documentos/[id]/divisao`: Divisão de Notas — Desmembramento de quantidades entre múltiplas notas de exportação, distribuição de saldos e rateio proporcional de frete/seguro/despesas.
7. `/notas-preparadas`: Notas Preparadas — Consulta e conferência das notas finais geradas para exportação.
8. `/configuracoes`: Configurações do Sistema — Personalização da experiência (modo escuro, densidade de tabela) e opção para reiniciar os guias explicativos de todas as telas.

Cada entrada deve conter título, objetivo da tela, passos práticos recomendados, dicas fiscais/segurança e identificador de ícone.

### R2. Componente de Tourtip Contextual (ScreenTourTip)
Implementar o componente reutilizável em `app/components/feedback/ScreenTourTip.jsx` (ou similar em `app/components/`):
- Exibição automática no primeiro acesso à tela correspondente, verificando e respeitando a flag `smartnfe_tour_seen_<routeKey>` no `localStorage`.
- Fornecer ações interativas para o usuário: botão "Entendi / Não mostrar novamente", botão "Minimizar / Expandir" e suporte ao atalho de teclado `Escape` para fechar.
- Garantir compatibilidade visual completa com Dark Mode e Tailwind CSS 4.

### R3. Ponto de Reabertura no Cabeçalho e Reinício nas Configurações
- No cabeçalho global (`app/components/Layouts/SmartNFeHeader.jsx`), adicionar botão com ícone de ajuda/lâmpada que permite ao usuário reabrir o guia explicativo da tela ativa a qualquer momento, independentemente de já ter sido marcado como visto.
- Na tela de configurações (`app/configuracoes/page.jsx`), adicionar botão/ação para "Reiniciar guias explicativos", limpando do `localStorage` as flags de tours visualizados para que os guias voltem a ser exibidos automaticamente no próximo acesso a cada tela.

### R4. Escopo de Trabalho, Branch e Qualidade do Código
- Manter todo o trabalho na branch `fix/frontend-xml-conferencia-v0.1.1`.
- Não recriar testes existentes e não criar novos arquivos de teste automatizado, mantendo foco estrito na entrega da funcionalidade de tourtip.
- Garantir que `pnpm lint` e `pnpm build` executem com 0 erros.

## Verification Resources
- Validação estática: `pnpm lint`
- Compilação e build de produção: `pnpm build`
