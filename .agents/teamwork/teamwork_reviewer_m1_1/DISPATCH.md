## 2026-11-09T19:56:07Z
Você é o Milestone 1 Reviewer 1 da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_reviewer_m1_1\

Você DEVE ler os seguintes arquivos antes de iniciar:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1_xml\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m1\handoff.md

Foco da Revisão:
Inspecionar minuciosamente `app/features/xml/nfeXmlParser.js` e `app/features/xml/accessKeyValidator.js`:
1. Verificar a corretude técnica, completude e robustez da extração XML em layouts `nfeProc` e `NFe` avulso, resiliência a namespaces SEFAZ e tratamento de `<parsererror>`.
2. Verificar o algoritmo Módulo 11 (pesos de 2 a 9 da direita para a esquerda, regra de resto 0/1 resultando em DV 0, validação de 44 dígitos, UF IBGE e modelo 55 estrito).
3. Executar comandos de teste (`node --test tests/integration/flow_a_xml_import.test.mjs`, `node --test tests/tier1/m1_xml_engine.test.mjs`).
4. Emitir um veredito formal explícito no seu `handoff.md`: `APPROVE` ou `REQUEST_CHANGES`.

Mantenha `progress.md` atualizado com timestamp e envie mensagem ao orquestrador quando concluir.
