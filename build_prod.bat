@echo off
chcp 65001

setlocal

echo Começando build de produção...

echo Renomeando .env.local para .env.temp...

REM Renomear .env.local para .env.temp
if exist .env.local (
    ren .env.local .env.temp
)

echo Copiando .env.pdct para .env...

REM Copiar .env.pdct para .env
copy .env.pdct .env

echo Verificando se a pasta production existe...

REM Verificar se a pasta production existe
if exist production (

    echo Removendo pasta production...

    REM Remover pasta production
    rmdir /s /q production

    echo Pasta production removida com sucesso!

) else (
    echo A pasta 'production' não foi encontrada para deletar.
)

set BUILD_ENV=production

echo Executando next build...

call next build

echo Renomeando .env.temp para .env.local...

REM Renomear .env.temp para .env.local
if exist .env.temp (
    ren .env.temp .env.local
)

echo Removendo .env...

del .env

echo Verificando se o build foi concluído com sucesso...

if exist production (

    echo Build de produção concluído com sucesso!

    pause
) else (
    echo Erro ao criar build de produção!
    pause
    exit /b 1
)
