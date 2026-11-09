## 2026-11-09T19:34:15Z

Você é o Milestone 1 Explorer 3 da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_3\

Você DEVE ler os seguintes arquivos antes de iniciar:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1_xml\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\handoff.md

Missão:
Elaborar a estratégia de implementação e arquitetura exata para o isolamento em memória no repositório (`app/features/invoiceRepository.js`) e a tela de importação (`app/documentos/importar/page.jsx`):
1. `app/features/invoiceRepository.js`:
   - Implementação da coleção volátil em memória `sessionInvoices = new Map()`.
   - Modificação de `create`: se `isRealImport === true` ou `isDemo === false`, salvar exclusivamente em `sessionInvoices.set(newDoc.id, newDoc)` SEM chamar `saveAllInvoices` e SEM gravar no `localStorageService`.
   - Modificação de `findById`: consultar `sessionInvoices` primeiro, depois fallback para o storage persistente.
   - Modificação de `list`: mesclar `[...sessionInvoices.values(), ...persistedInvoices]` mantendo documentos reais no topo, com suporte a paginação e filtros.
   - Modificação de `update` e `updateItem`: atualizar diretamente em `sessionInvoices` se o documento for de sessão real.
   - Modificação de `resetDemoData`: limpar apenas os mocks no localStorage sem apagar a sessão volátil.
2. `app/documentos/importar/page.jsx`:
   - Substituir a simulação dummy com setInterval por leitura real via File API (`file.text()`).
   - Integrar `parseNFeXml`, `validateAccessKey` e `mapXmlToInvoice`.
   - Exibir feedback claro: sucesso com dados da nota (número, emitente, destinatário, quantidade de itens, valor total) ou erro detalhado com mensagem informativa.
   - Salvar o documento importado no `invoiceRepository` e disponibilizar botão de navegação direta para `/documentos/[id]/conferencia`.
   - Exibir banner de advertência explícito sobre a natureza temporária da sessão em memória ("Por segurança, dados reais não são salvos em disco e serão perdidos ao fechar a página").
3. Propor a estratégia exata em `handoff.md` com trechos de código prontos para o Worker implementar.

Mantenha `progress.md` atualizado com timestamp e envie mensagem ao orquestrador quando concluir.
NÃO escreva nem modifique arquivos de código-fonte diretamente (explorers são read-only).
