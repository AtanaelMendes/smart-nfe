# SmartNFe — Plano de implementação do login

## Objetivo
Implementar a tela /login no frontend Next.js existente, com autenticação temporária mockada e identidade visual consistente com o projeto. Trabalhar sobre a master atual, respeitar AGENTS.md e inspecionar os componentes UI, layouts, tema e convenções antes de editar. Não alterar regras de negócio existentes nem executar deploy sem solicitação.

## Referências visuais
As imagens de referência devem ficar em docs/imagens/login.png, docs/imagens/logo.png e docs/imagens/favicon.png. Caso ainda não estejam disponíveis, solicitar os arquivos ao responsável; não inventar uma nova identidade. O CSS atual define primary #1C64F2, secondary #FF9600, success #22C55E, Arial/Helvetica e tema dark via classe .dark. Reutilizar tokens e configuração existentes.

## Interface
- Layout desktop em duas colunas: painel institucional azul à esquerda com identidade SmartNFe, ilustração fiscal e mensagem sobre importação, conferência, divisão e agrupamento de notas; à direita, formulário de acesso centralizado.
- Em tablets e celulares, adaptar para uma coluna quando necessário, sem overflow horizontal; priorizar o formulário. Não incluir drawers do dashboard no login.
- Suportar light/dark e persistência de tema pelo mecanismo existente. Usar apenas Tailwind CSS e componentes UI do próprio projeto; não criar CSS avulso, não instalar bibliotecas de UI, não duplicar componentes. Se faltar um componente essencial, estender o componente existente conforme padrões do projeto.
- Campos Usuário e Senha, alternância de visibilidade, Manter conectado, Entrar, feedback de carregamento e erro genérico. Enter deve enviar. Labels acessíveis, foco visível, autocomplete username/current-password. Não apresentar recuperação de senha funcional sem serviço; omitir ou marcar indisponível.
- Usar a marca e ícone fornecidos; preparar ativos otimizados em public conforme convenções e favicon do Next.js (16/32/48 px, preservar transparência quando aplicável), sem usar a prancha inteira como logo.

## Autenticação mockada
Usuários de teste: atanaelmendes, alinijumes e mayarasimoes. Todos usam a senha de demonstração fornecida pelo responsável no prompt do agente. Não gravar a senha em texto puro no código, documentação versionada, bundle ou logs. Hash não é criptografia reversível.
- Preferir autenticação server-side no próprio Next.js, sem depender da futura API PHP, usando Node crypto.scrypt com salt aleatório individual por usuário e timingSafeEqual para verificar. Gerar hashes previamente via script local que recebe senha por entrada segura, armazenar apenas salt e hash no módulo server-only, não no frontend. Não registrar senha nem hash em respostas.
- Criar serviço de autenticação isolado para futura substituição por API. Validar usuário e senha no servidor; normalizar usuário com trim e lowercase, sem alterar senha. Mensagem genérica para credenciais inválidas.
- Sessão mockada assinada com segredo de ambiente, cookie HttpOnly, SameSite=Lax, Secure em HTTPS, expiração (sessão normal e persistente quando Manter conectado); não armazenar senha/hash/token em localStorage. Proteger páginas privadas e operações server-side, redirecionar login válido para /dashboard e acesso sem sessão para /login. Logout invalida cookie; não aceitar redirects externos.
- Habilitar mocks apenas com flag explícita de ambiente de demonstração, desativada por padrão em produção. Documentar configuração em .env.example sem segredos. Se o projeto exigir export estático, não introduzir backend incompatível sem sinalizar: mock client-side é apenas demonstração, não proteção real; preferir runtime Next.js na Vercel.
- Não criar cadastro, recuperação real ou integração fiscal nesta etapa.

## Validação e entrega
Testar os três usuários válidos, senha incorreta, usuário inexistente, campos vazios, logout, refresh, sessão expirada, acesso direto a rota privada, persistência de tema, responsividade e acessibilidade. Executar npm run lint, npm test e npm run build conforme scripts existentes; corrigir regressões e reportar resultados reais. Entregar resumo de arquivos e decisões, sem iniciar deploy manual ou workflow explicitamente.
