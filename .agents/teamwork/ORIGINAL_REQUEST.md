# Original User Request

## Initial Request — 2026-11-13T13:26:20Z

Evoluir o SmartNFe para permitir preparar notas fiscais de exportação a partir de qualquer quantidade de NF-e recebidas de fornecedores (N origens → M destinos), com controle completo das mercadorias, preservação da origem dos itens e arquitetura unificada de alocação.

Working directory: c:\www\smart-nfe
Integrity mode: demo
The team must NOT: use pre-built libraries or frameworks for core functionality

Referência:
- Frontend: https://github.com/AtanaelMendes/smart-nfe
- Backend (reservado para outra etapa, não modificar): https://github.com/AtanaelMendes/smart-nfe-api

## Requirements

### R1. Correção definitiva do Left Drawer e layout
Corrigir o estado de recolhimento do Left Drawer (`app/components/Layouts/AppLayout.jsx`, `app/components/Layouts/SmartNFeSidebar.jsx`, `app/components/Layouts/SmartNFeHeader.jsx`, `app/context/AppContext.jsx`) para persistir a escolha do usuário em `smartnfe_sidebar_collapsed` durante navegação e recarga sem hydration mismatch. O drawer deve permanecer expandido por padrão acima de 1024px quando não houver preferência salva e recolhido por padrão em LG ou inferior (até 1024px), oferecendo drawer móvel com backdrop, tecla Escape e botão de fechar, botão de toggle sempre acessível, sem interferir no editor de produtos nem no ScreenTourTip.

### R2. Upload múltiplo de XML e organização de documentos com filtros avançados
Na rota `/documentos/importar`, evoluir o importador para aceitar múltiplos arquivos XML na mesma operação (seleção múltipla e drag-and-drop), processando no navegador em lotes com concorrência limitada, progresso individual e geral, repetição de arquivos com falha e detecção de duplicidades pela chave de acesso sem travar a interface nem persistir XMLs reais no localStorage. Na rota `/documentos`, implementar pesquisa com debounce, filtros combináveis (cliente de exportação atribuído, fornecedor, NCM, produto, datas, valores e saldos), agrupamento visual por cliente ou fornecedor, e seleção estável de itens entre páginas exibindo contadores de notas, itens e valores.

### R3. Fluxo e interface de Nova Preparação (N origens → M destinos)
Criar rota `/preparacoes/nova` e tela de gerenciamento `/preparacoes` suportando os cenários de agrupamento (N → 1), divisão (1 → M) e preparação mista (N → M) a partir de upload múltiplo, seleção de documentos ou rascunhos, sem limites arbitrários de origens ou destinos. A interface deve ser compacta e de alta densidade (tabela ampla, cabeçalho fixo, filtros recolhíveis, totais sempre visíveis, painel de origens e destinos com abas, edição rápida de quantidades e saldos em tempo real), preservando a chave de origem (`sourceInvoiceId + sourceItemId`) e permitindo salvar rascunhos com aviso claro sobre retenção temporária em memória para documentos reais.

### R4. Motor unificado de alocação e evolução dos repositórios
Evoluir a camada de cálculos (`app/lib/calculations/decimal.js`, `divisionMath.js`, `invoiceTotals.js`) e repositórios (`preparationRepository`, `invoiceRepository`, `preparedInvoiceRepository`) para uma arquitetura única de alocação com precisão decimal (BigInt, sem ponto flutuante binário), assegurando a regra de conservação (`disponível = original - soma das alocações ativas`) e impedindo duplicidade ou rateios arbitrários. Manter compatibilidade com preparações legadas baseadas em `parentInvoiceId` e assegurar que `/documentos/[id]/divisao` continue funcionando utilizando internamente o motor unificado.

### R5. Restrições de infraestrutura, mocks e entrega
Criar a branch `feature/preparacoes-unificadas` a partir do repositório existente sem alterar diretamente a branch master, sem realizar deploy, merge ou acionar GitHub Actions sem autorização, e sem modificar a API PHP. Criar os cenários mockados especificados (de 2→1 até 50→5, fornecedores e clientes múltiplos, produtos repetidos e unidades incompatíveis) e atualizar tourtips em `app/config/screenTours.js`; a aplicação deve rodar de forma autônoma na Vercel sem backend, mantendo dados fiscais reais estritamente em memória temporária.

## Verification Resources
A equipe deve gerar fixtures mockadas de XML (abrangendo os cenários de 2 a 50 notas, múltiplos fornecedores e clientes, produtos repetidos e unidades incompatíveis) e implementar a suíte de testes automatizados diretamente no repositório (`tests/`).

## Acceptance Criteria

### Left Drawer e Layout
- [ ] O left drawer permanece recolhido quando o usuário assim escolhe e persiste a preferência em `smartnfe_sidebar_collapsed` durante navegação e recarga sem hydration mismatch.
- [ ] Em telas LG ou inferior (até 1024px), o drawer inicia recolhido por padrão, e o menu móvel opera em overlay com backdrop, tecla Escape e botão de fechar.
- [ ] O botão de expansão/recolhimento permanece sempre visível e acessível sem interferir no editor de produtos nem no ScreenTourTip.

### Importação e Documentos
- [ ] O upload múltiplo de XML funciona em `/documentos/importar` com drag-and-drop, concorrência controlada, barra de progresso individual/geral, repetição de erros e detecção de duplicidade por chave de acesso.
- [ ] O usuário consegue selecionar quantas NF-e forem necessárias, dentro dos recursos disponíveis, sem limites arbitrários de quantidade de notas ou fornecedores.
- [ ] A busca e filtros em `/documentos` operam com debounce e suportam filtros combinados por cliente atribuído, fornecedor, produto, NCM, data e saldos.
- [ ] A seleção de documentos não se perde ao filtrar, ordenar, paginar ou alternar agrupamento visual, exibindo contadores de notas, itens, valores e fornecedores.
- [ ] Documentos fiscais são organizáveis por cliente de exportação atribuído (incluindo categoria "Sem cliente atribuído") sem alterar o destinatário original da NF-e.

### Motor de Preparação e Alocação
- [ ] O sistema suporta agrupamento (N origens → 1 destino), divisão (1 origem → M destinos) e preparação mista (N origens → M destinos) sob a mesma arquitetura de alocação.
- [ ] Cada produto alocado preserva sua identificação de origem através de `sourceInvoiceId` e `sourceItemId`, sem agrupar automaticamente produtos de fornecedores distintos.
- [ ] O motor calcula saldos em tempo real e impede alocação de quantidade superior ao saldo disponível (`quantidade disponível = quantidade original - soma das alocações ativas`).
- [ ] Todos os cálculos monetários e de quantidades utilizam precisão decimal baseada em BigInt, sem cálculos em ponto flutuante binário nem rateios fiscais arbitrários.
- [ ] As preparações antigas com `parentInvoiceId` continuam legíveis e funcionais, e a rota `/documentos/[id]/divisao` continue operando utilizando o motor unificado.

### Persistência, Infraestrutura e Qualidade
- [ ] Dados fiscais reais e preparações com origens reais permanecem em memória temporária, apresentando aviso explícito de perda de sessão após atualização/fechamento, sem persistir XMLs reais no localStorage.
- [ ] A aplicação opera de forma autônoma na Vercel sem dependência de execução da API PHP.
- [ ] As alterações são desenvolvidas na branch `feature/preparacoes-unificadas`, sem modificação direta da master e sem deploy, merge ou GitHub Actions não autorizados.
- [ ] A suíte de testes automatizados cobre Left Drawer, Upload múltiplo, Busca/Filtros, Preparações (N→1, 1→M, N→M, saldos, rascunhos) e Regressão, passando com sucesso junto ao lint e `npm run build`.


## Follow-up — 2026-11-13T13:44:37Z

O usuário solicitou agilidade: "nada de codigo ainda? começa logo". Favor priorizar e acelerar o início imediato da escrita de código nas frentes de implementação (branch feature/preparacoes-unificadas, Left Drawer, motor de alocação, etc.).


## Follow-up — 2026-11-13T13:44:51Z

URGÊNCIA DO USUÁRIO: O usuário solicitou agilidade: "nada de codigo ainda? começa logo". Favor acelerar o início imediato e priorizar a escrita de código funcional nas frentes de implementação ativas (branch feature/preparacoes-unificadas, Left Drawer, motor unificado de alocação, etc.), minimizando cerimônias e focando na produção direta dos arquivos e testes.
