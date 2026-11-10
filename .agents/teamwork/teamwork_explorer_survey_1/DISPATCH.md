# Dispatch
Work directory for survey explorer 1
## 2026-11-04T14:27:36Z
From: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
Content:
You are a read-only exploration agent (teamwork_explorer).
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1\
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7

MANDATORY: Read the original user request before starting work:
Path: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
Path: c:\www\smart-nfe\.github\copilot-instructions.md
Path: c:\www\smart-nfe\package.json
Path: c:\www\smart-nfe\next.config.js

OBJECTIVE:
Survey the existing codebase at c:\www\smart-nfe.
1. Map all existing files, directories, routes under app/, components under app/components/, contexts, styles, etc.
2. Identify what is currently implemented vs what is leftover from the old RH/recruitment app.
3. Analyze R1 foundation items in detail:
   - Sidebar.jsx: current menus vs required SmartNFe menus (Dashboard, Documentos, Importar, Notas Preparadas, Configurações).
   - AppContext.jsx: current state vs toast notification integration needed; imports in Dialog.jsx and InputFile.jsx.
   - next.config.js: inspect basePath and output: 'export' to be removed.
   - DataTable.jsx: current implementation vs adaptation needed to accept explicit column definitions.
   - InputFile.jsx: current accepted formats vs XML and PDF support needed.
   - Reusable components inventory: list all components in app/components/ with their props and behavior.
4. Record exact file paths, component APIs, and integration points.

BOUNDARIES:
- Read-only exploration. NEVER edit or create source code files. Write ONLY to your working directory.

OUTPUT:
- Write full findings to: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1\survey_codebase.md
- Write standard handoff to: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1\handoff.md
- When done, send a message to caller (3aeeebdd-68a6-49e6-8f40-494114a9f1f7) with summary and report path.

## 2026-11-04T14:32:28Z
From: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
Content:
**Context**: Survey Phase
**Content**: CRITICAL USER INSTRUCTION: O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário). NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente.
**Action**: Note this constraint in your survey findings.

## 2026-11-09T19:20:43Z
From: 71db8a14-4c80-4575-92ba-b52ae572b170
Content:
Você é o Survey Explorer 1 da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1\
Você DEVE ler o arquivo de requisitos original em: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md

Missão:
Realizar o levantamento detalhado do estado atual da base de código, controle de versão e da tela de conferência de produtos:
1. Inspecionar o repositório git: verificar branch atual, histórico recente, e se a branch `fix/frontend-xml-conferencia-v0.1.1` existe ou precisa ser criada a partir do ponto atual. (Lembre-se: os requisitos proíbem commit direto na master e exigem trabalhar exclusivamente na branch `fix/frontend-xml-conferencia-v0.1.1`).
2. Analisar minuciosamente `app/documentos/[id]/conferencia/page.jsx`:
   - Como `handleItemChange` está implementado atualmente? Ele usa índice numérico de array ou `itemId` estável?
   - O que acontece quando a tabela está filtrada (por NCM ou por descrição) ou ordenada ao editar um produto?
   - Como os totais da linha e da nota são calculados e atualizados? Onde ocorrem cálculos com ponto flutuante binário (parseFloat, toFixed(2), Math.floor, Math.round)?
   - Como os dados originais do item são armazenados (ou se não são armazenados) para viabilizar comparação visual e restauração do valor original?
   - Como está a navegação por teclado (Tab/Enter) e foco durante a edição?
3. Inspecionar os componentes reutilizáveis em `app/components/` (especialmente `table/DataTable.jsx`, inputs, badges, cards, dialogs) e identificar como suportar os novos indicadores visuais exigidos por R4: indicador de documento XML, contagem real de produtos importados, totais originais vs recalculados, indicador de produtos alterados, comparação de valores, avisos de dados ausentes e identificação de modo (demo vs importação local).
4. Produzir um relatório completo e detalhado em `handoff.md` no seu diretório de trabalho com:
   - Observation (evidências concretas com trechos de código e caminhos de arquivo)
   - Logic Chain (análise técnica dos problemas e causas raiz)
   - Caveats (riscos e pontos de atenção)
   - Proposed Fix Strategy para R1 e R4 (Conferência)
   - Verification Method

Mantenha seu `progress.md` atualizado com timestamp e envie mensagem ao orquestrador quando concluir.
