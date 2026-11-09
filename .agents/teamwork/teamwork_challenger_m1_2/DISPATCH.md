## 2026-11-09T19:56:42Z
Você é o Milestone 1 Challenger 2 da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_2\

Você DEVE ler os seguintes arquivos antes de iniciar:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1_xml\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m1\handoff.md

Missão Adversarial Empírica:
Desenvolver e executar scripts e testes de estresse contra a camada de repositório em memória de sessão e integridade de dados (`app/features/invoiceRepository.js` e `app/features/xml/xmlToInvoiceMapper.js`):
1. Provar empiricamente que nenhuma chamada de importação de documento real (`isRealImport: true` ou `isDemo: false`) salva dados ou polui o `localStorageService` (verificar chaves, espiar `localStorageService.save`).
2. Testar concorrência e idempotência: 50 operações concorrentes de `updateItem` e `list` simultâneas sobre a memória de sessão volátil, garantindo ausência de race conditions e integridade de dados.
3. Testar a estabilidade do `itemId`: verificar que itens com `cProd` repetidos ou `xProd` repetidos geram `itemId`s estáveis e distintos (`nfe-${chaveAcesso}-item-${nItem}`).
4. Testar a conservação de frete, seguro, outras despesas e descontos em `xmlToInvoiceMapper.js` e em `invoiceRepository.create`.
5. Testar que `resetDemoData()` limpa apenas o localStorage e mantém 100% intactos os documentos reais na sessão.
6. Escrever seu relatório em `handoff.md` com testes empíricos executados e veredito formal: `APPROVE` ou `REQUEST_CHANGES`.

Mantenha `progress.md` atualizado com timestamp e envie mensagem ao orquestrador quando concluir.
