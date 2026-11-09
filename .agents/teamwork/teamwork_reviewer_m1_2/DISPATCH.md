## 2026-11-09T19:56:15Z

Você é o Milestone 1 Reviewer 2 da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_reviewer_m1_2\

Você DEVE ler os seguintes arquivos antes de iniciar:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1_xml\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m1\handoff.md

Foco da Revisão:
Inspecionar minuciosamente `app/features/xml/xmlToInvoiceMapper.js`, `app/features/invoiceRepository.js` (fronteira de sessão em memória) e `app/documentos/importar/page.jsx`:
1. Verificar a geração estável de `itemId: 'nfe-' + chaveAcesso + '-item-' + nItem`, precisão de 4 decimais em quantidades, precisão estendida de unitários e conservação integral de despesas acessórias e totais da NF-e.
2. Verificar o isolamento estrito de sessão em memória (`sessionInvoices = new Map()`), garantindo que documentos reais importados (`isRealImport: true` ou `isDemo: false`) nunca chamem `localStorageService.save` nem poluam o storage permanente.
3. Verificar a tela de importação: leitura real via File API, feedback ao usuário, banner de segurança de dados em memória e preservação dos 5 cenários mockados.
4. Executar os testes automatizados (`node --test tests/integration/flow_a_xml_import.test.mjs`, `node --test tests/integration/*.test.mjs`).
5. Emitir um veredito formal explícito no seu `handoff.md`: `APPROVE` ou `REQUEST_CHANGES`.

Mantenha `progress.md` atualizado com timestamp e envie mensagem ao orquestrador quando concluir.
