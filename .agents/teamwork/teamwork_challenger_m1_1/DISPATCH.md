## 2026-11-09T19:56:33Z
Você é o Milestone 1 Challenger 1 da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_1\

Você DEVE ler os seguintes arquivos antes de iniciar:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1_xml\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m1\handoff.md

Missão Adversarial Empírica:
Desenvolver e executar scripts e testes de estresse contra o motor XML (`app/features/xml/nfeXmlParser.js`) e validador de chaves (`app/features/xml/accessKeyValidator.js`):
1. Testar chaves de acesso no limite: gerar chaves sintéticas para todas as 27 UFs do Brasil; chaves onde a soma produz resto 0, resto 1 e resto 10; chaves com 43 e 45 dígitos; caracteres alfanuméricos; modelos diferentes de 55 (ex: 65, 57).
2. Testar parsing de XML com estresse de namespaces: XMLs com namespaces default (`xmlns="..."`), namespaces aninhados com prefixos arbitrários (`<fiscal:nfeProc xmlns:fiscal="...">`), tags sem namespace, tags vazias ou omitidas.
3. Testar resiliência a XML malformado: tags não fechadas, caracteres de controle, strings gigantes (5 MB), e garantir que `<parsererror>` seja interceptado com mensagem limpa sem exceções não tratadas.
4. Escrever seu relatório em `handoff.md` com testes empíricos executados e veredito formal: `APPROVE` ou `REQUEST_CHANGES`.

Mantenha `progress.md` atualizado com timestamp e envie mensagem ao orquestrador quando concluir.
