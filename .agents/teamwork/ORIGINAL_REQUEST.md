# Original User Request

## Initial Request — 2026-11-04T14:25:04Z

Implementar o frontend SmartNFe — Fase 1: Frontend MVP com dados mockados. SmartNFe é uma plataforma de preparação inteligente de notas fiscais eletrônicas de exportação cujo objetivo é permitir que uma contadora utilize e avalie as telas e fluxos antes do desenvolvimento da API backend.

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

## Verification Resources
- Verificação automatizada baseada em `pnpm build`, `pnpm lint` e testes criados pela própria equipe durante a implementação.
- Diretrizes de requisitos, arquitetura e convenções documentadas em `c:\www\smart-nfe\.github\copilot-instructions.md`.

## Acceptance Criteria

### Build e Compatibilidade
- [ ] O comando `pnpm build` compila com 0 erros sem requerer API externa nem dependências externas.
- [ ] O arquivo `next.config.js` opera sem `basePath` e sem `output: 'export'`.
- [ ] O código utiliza exclusivamente JavaScript/JSX sem introduzir TypeScript.

### Componentes de Fundação e Identidade Visual
- [ ] A Sidebar exibe exclusivamente a estrutura de menus do SmartNFe (Dashboard, Documentos, Importar, Notas Preparadas, Configurações).
- [ ] Badge "Modo Demonstração" é visível em todas as telas do sistema.
- [ ] Componentes existentes (`Button`, `Card`, `InputText`, `DataTable`, `Dialog`, `Pagination`, etc.) são reutilizados sem duplicações.
- [ ] O utilitário `cn()` e a paleta de cores definida em `globals.css` são respeitados.

### Mocks e Lógica de Negócio
- [ ] Todos os 5 cenários mockados (`demo-01` a `demo-05`) estão disponíveis e carregam corretamente.
- [ ] Valores monetários e quantidades são manipulados via strings decimais e cálculos centralizados em `app/lib/calculations/`.
- [ ] As operações de leitura, atualização de itens e validação respeitam a interface dos repositórios assíncronos.
- [ ] Alterações efetuadas persistem via `localStorageService` com suporte a versionamento e restauração de dados.

### Funcionalidades das Telas
- [ ] `/dashboard`: exibe indicadores consolidados e tabela de documentos recentes interativa.
- [ ] `/documentos/importar`: aceita arrastar/selecionar arquivos XML e PDF e permite selecionar cenários de demonstração para carga imediata.
- [ ] `/documentos`: permite listar, filtrar por texto/status e paginar os documentos.
- [ ] `/documentos/[id]/conferencia`: permite editar produtos com navegação por teclado, atualiza totais em tempo real e persiste modificações.
- [ ] `/documentos/[id]/divisao`: permite alocar produtos e quantidades entre notas de destino, exibindo saldo restante e alertando sobre sobras ou excessos.
- [ ] `/documentos/[id]/validacao`: exibe inconsistências fiscais simuladas (especialmente para `demo-04`) com indicadores visuais claros.
- [ ] `/notas-preparadas`: lista notas resultantes de divisões salvas.
- [ ] `/configuracoes`: permite alterar e salvar preferências de UI no localStorage.

## Follow-up — 2026-11-04T14:31:25Z

INSTRUÇÃO IMPORTANTE DO USUÁRIO:
O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário).
NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente.
Apenas crie, edite arquivos e realize testes ou verificações que não derrubem nem conflitem com o servidor já ativo.

## Follow-up — 2026-11-04T14:32:17Z

O usuário solicitou para ser avisado assim que a tela inicial (/dashboard e o layout base com Sidebar/Header) estiver funcional e pronta para visualização no navegador. Priorizar deixar a tela inicial pronta e notificar imediatamente quando estiver disponível para teste.

## Follow-up — 2026-11-04T14:31:40Z

INSTRUÇÃO IMPORTANTE DO USUÁRIO:
O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário).
NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente.
Apenas crie, edite arquivos e realize testes ou verificações que não derrubem nem conflitem com o servidor já ativo. Instrua todos os subagentes e equipes em conformidade.

## Follow-up — 2026-11-04T14:32:29Z

SOLICITAÇÃO DO USUÁRIO — PRIORIDADE:
O usuário solicitou ser avisado assim que a tela inicial (`/dashboard` e layout base com Sidebar/Header) estiver funcional e pronta para visualização no navegador (em http://localhost:3000/dashboard).
Por favor, priorize deixar a tela inicial pronta e funcional o quanto antes, e avise imediatamente assim que ela estiver disponível para teste no navegador, para que eu possa notificar o usuário.
