## 2026-11-04T19:04:48Z

[Message] timestamp=2026-11-04T19:04:48Z sender=5b9042e8-b7f6-4f48-b6d2-96fde9311758 priority=MESSAGE_PRIORITY_HIGH content=Implementar o frontend SmartNFe — Fase 1: Frontend MVP com dados mockados. SmartNFe é uma plataforma de preparação inteligente de notas fiscais eletrônicas de exportação cujo objetivo é permitir que uma contadora utilize e avalie as telas e fluxos antes do desenvolvimento da API backend.

Working directory: c:\www\smart-nfe
Integrity mode: development

## Requirements

### R1. Auditoria e Correções de Fundação
Ajustar os componentes de fundação identificados na auditoria inicial:
- Atualizar a navegação da Sidebar substituindo menus de RH/recrutamento antigos por menus do SmartNFe;
- Integrar notificações de toast no AppContext e corrigir importações em Dialog.jsx e InputFile.jsx;
- Remover `basePath: '/saas'` e `output: 'export'` de `next.config.js` para garantir compatibilidade com Vercel;
- Adaptar `DataTable.jsx` para aceitar definição de colunas explícitas;
- Adaptar `InputFile.jsx` para aceitar arquivos XML e PDF;
- Reutilizar os componentes base existentes em `app/components/` sem recriá-los do zero e sem duplicar lógica/estilos.

### R2. Arquitetura de Mocks, Formatadores, Cálculos e Persistência
Estruturar os serviços de dados e regras de negócio desacoplados da interface de usuário:
- Criar dados mockados em `app/lib/data/` com 5 cenários fictícios de NF-e explicitamente identificados como demonstração (`demo-01` XML completo com 8 itens, `demo-02` PDF exportação com 25 itens, `demo-03` grande com 50 itens, `demo-04` com inconsistências simuladas, `demo-05` com produtos repetidos com 15 itens);
- Implementar repositórios mockados em `app/features/` seguindo o contrato padrão assíncrono (`list`, `findById`, `update`, `updateItem`, `getValidationIssues`);
- Centralizar formatadores em `app/lib/formatters/` (moeda BRL, datas BR, números/quantidades e status);
- Implementar cálculos em `app/lib/calculations/` utilizando strings decimais para valores monetários e quantidades fiscais (evitando ponto flutuante binário);
- Implementar persistência local em `app/lib/storage/localStorageService.js` com esquema versionado (`1.0.0`) e métodos de save, load, reset e resetAll.

### R3. Implementação das 8 Telas da Aplicação
Implementar as 8 telas obrigatórias com suporte a estados de loading, erro, vazio e confirmação:
- `/dashboard`: Painel com indicadores resumidos e tabela de documentos recentes;
- `/documentos/importar`: Importação simulada com drag-and-drop de XML/PDF e carregamento rápido dos cenários demo;
- `/documentos`: Listagem de documentos com busca, filtros por status/data, paginação e ações;
- `/documentos/[id]/conferencia`: Editor principal com tabela densa de produtos, edição inline de itens, navegação por teclado (Tab/Enter), cálculo automático de totais e persistência de alterações;
- `/documentos/[id]/divisao`: Distribuição de itens e quantidades entre duas ou mais notas fiscais de destino, com validação de saldos em tempo real;
- `/documentos/[id]/validacao`: Painel de validação demonstrativa destacando inconsistências fiscais simuladas e assistente de conferência;
- `/notas-preparadas`: Listagem das notas fiscais geradas a partir das divisões realizadas;
- `/configuracoes`: Preferências de interface (como densidade de tabela e tema) persistidas localmente no localStorage.

### R4. Regras e Restrições de Implementação
Garantir a integridade técnica e de escopo:
- Não recriar o projeto do zero e manter a stack Next.js 16 (App Router), React 19, JavaScript/JSX (não usar TypeScript), Tailwind CSS 4, Font Awesome 7 e pnpm;
- Não realizar chamadas HTTP reais nem modificar o repositório `smart-nfe-api`;
- Exibir badge "Modo Demonstração" visível em todas as telas;
- Garantir build de produção sem erros (`pnpm build`) pronto para execução na Vercel sem dependências externas.

---
CRITICAL USER INSTRUCTION:
O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário).
NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente.
Apenas crie, edite arquivos e realize testes ou verificações que não derrubem nem conflitem com o servidor já ativo.

---
CURRENT PROGRESS AND RESUMPTION STATE:
- Milestone 1 (Foundation & Dashboard) is 100% COMPLETE and GATE PASSED. The dashboard is operational on http://localhost:3000/dashboard.
- Milestone 2 (Core Domain Services, Decimal Math, Repositories, Storage) is 100% COMPLETE and GATE PASSED (159/159 tests passing).
- You are resuming directly at Milestone 3: Document Management Screens (`/documentos/importar`, `/documentos`, `/configuracoes`).
- Consult `c:\www\smart-nfe\PROJECT.md` for full architecture, feature inventory, code layout, and milestone definitions.
- Consult `c:\www\smart-nfe\.agents\teamwork\orchestrator\handoff.md` for detailed transition notes.

Working directory: c:\www\smart-nfe\.agents\teamwork\orchestrator_gen1\
Original Request path: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Your Identity: Project Orchestrator (Successor Gen 1)
Workspace: c:\www\smart-nfe


## 2026-11-04T19:05:53Z

[Message] timestamp=2026-11-04T19:05:53Z sender=5b9042e8-b7f6-4f48-b6d2-96fde9311758 priority=MESSAGE_PRIORITY_HIGH content=DIRETIVA CRÍTICA DO USUÁRIO:
1. Limite a equipe a NO MÁXIMO 2 agentes concorrentes simultâneos para preservar cotas de IA e evitar sobrecarga.
2. Foque 100% na entrega e acabamento visual/interativo das TELAS MVP no navegador (Dashboard, Importar, Documentos, Conferência, Divisão, Preparadas, Configurações). Bypasse testes pesados e validações formais extensivas de portão por hora.
3. As telas `/documentos` e `/documentos/[id]/conferencia` já foram criadas na raiz. Prossiga imediatamente com as telas restantes (`/documentos/importar`, `/documentos/[id]/divisao`, `/documentos/[id]/validacao`, `/notas-preparadas`, `/configuracoes`), mantendo a equipe com no máximo 2 agentes simultâneos.


## 2026-11-04T19:28:47Z

[Message] timestamp=2026-11-04T19:28:47Z sender=5b9042e8-b7f6-4f48-b6d2-96fde9311758 priority=MESSAGE_PRIORITY_HIGH content=AUDITORIA DE VITÓRIA: VEREDITO REJEITADO (VICTORY REJECTED)

O auditor independente de vitória (`teamwork_victory_auditor`) executou a inspeção forense e rejeitou o encerramento do projeto devido a 2 erros de ESLint em `app/documentos/page.jsx:291` (`react/no-unescaped-entities`), que violam o critério de compilação sem erros no Vercel.

Relatório completo de evidência do auditor:
```
Target File: c:\www\smart-nfe\app\documentos\page.jsx
Linha 291:
<p className="text-sm text-slate-600 dark:text-slate-300 p-4">
  Tem certeza de que deseja excluir o documento <strong>NF-e {deleteDialog.invoice?.numero}</strong>? Esta ação pode ser desfeita clicando em "Restaurar Mocks".
</p>

Erros reportados pelo ESLint:
C:\www\smart-nfe\app\documentos\page.jsx
   53:6    warning  React Hook useEffect has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  291:151  error    `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`                                              react/no-unescaped-entities
  291:167  error    `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`                                              react/no-unescaped-entities

✖ 3 problems (2 errors, 1 warning)
Exit Code: 1
```

AÇÃO NECESSÁRIA:
Ajuste imediatamente o arquivo `app/documentos/page.jsx` substituindo as aspas duplas por entidades JSX (ex: `&quot;` ou aspas tipográficas) e corrija o warning do hook se aplicável. Verifique com `npx eslint app/documentos/page.jsx` (deve retornar código 0, zero erros) e nos notifique para que uma nova auditoria seja disparada.
