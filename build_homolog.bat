@echo off
chcp 65001

setlocal

echo Começando build de homologação...

echo Renomeando .env.local para .env.temp...

REM Renomear .env.local para .env.temp
if exist .env.local (
    ren .env.local .env.temp
)

echo Copiando .env.hmlg para .env...

REM Copiar .env.hmlg para .env
copy .env.hmlg .env

echo Verificando se a pasta homolog existe...

REM Verificar se a pasta homolog existe
if exist homolog (

    echo Removendo pasta homolog...

    REM Remover pasta homolog
    rmdir /s /q homolog

    echo Pasta homolog removida com sucesso!

) else (
    echo A pasta 'homolog' não foi encontrada para deletar.
)

set BUILD_ENV=homolog

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

if exist homolog (

    echo Build de homologação concluído com sucesso!

    pause
) else (
    echo Erro ao criar build de homologação!
    pause
    exit /b 1 
)
