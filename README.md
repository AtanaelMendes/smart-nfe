## TECNOLOGIES

- ⚛ next.js/react
- axios.js
- javascript

## CONFIGURANDO AMBIENTE
-   Clone o repositório saas que contém somente o front
-   na raiz do saas rode ``npm install``

## SUBINDO AMBIENTE
-   criar um arquivo .env.local, copiar os dados do .env.pdct para o .env.local e atualizar os endpoints para o seu local
-   na raiz do saas rode ``npm run dev``

## BUILDANDO PARA HOMOLOG

- ``npm run build:homolog``

## BUILDANDO PARA PRODUÇÃO

- ``npm run build:prod``

## YOU ARE READY TO CREATE BUGS
-   http://localhost:3000

## COMMITANDO HOMOLOG / PROD
-   Antes de commitar suas alterações rode o comando ``npm run build:prod`` e ``npm run build:homolog``
    -   O ``npm run dev`` deve estar derrubado, se não, não vai compilar. 👍
-   O comando ``npm run build:homolog`` vai gerar o compilado na pasta (homolog) e ``npm run build:prod`` vai gerar o compilado na pasta (production)
-   Ao aprovar o merge da homolog ou prod a pipeline irá copiar o conteúdo das pastas pra as pastas saas do servidor
-   Somente a pasta production e homolog deve subir pro servidor via pipeline

## TESTAR O COMPILADO LOCAL
-   No arquivo saas/next.config.mjs altere a linha:
    -   De ``const basePath = isBuild ? '/saas' : '';``
    -   Para ``const basePath = isBuild ? '/saas_local' : '';``
-   Gere o compilado ``npm run build``
-   Copie o conteúdo da out e cole na saas_local
-   Acessar http://localhost/saas_local

## WARNING 🚧

-    Ao alterar o path do compilado não esqueça de voltar ao original, se não vai quebrar a produção