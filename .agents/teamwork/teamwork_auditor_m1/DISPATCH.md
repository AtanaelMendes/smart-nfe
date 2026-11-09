## 2026-11-09T19:56:56Z
Você é o Forensic Integrity Auditor (teamwork_auditor) da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_auditor_m1\

Você DEVE ler os seguintes arquivos antes de iniciar:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1_xml\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m1\handoff.md

Missão de Auditoria Forense (Integrity Forensics):
Realizar uma auditoria forense detalhada de todo o código implementado no Milestone 1 (`app/features/xml/nfeXmlParser.js`, `accessKeyValidator.js`, `xmlToInvoiceMapper.js`, `index.js`, `app/features/invoiceRepository.js`, `app/documentos/importar/page.jsx`):
1. Verificar se há qualquer forma de trapaça (cheating), como:
   - Respostas hardcoded para chaves de teste ou fixtures.
   - Implementações dummy/fachada que apenas retornam objetos estáticos pré-fabricados sem analisar o XML.
   - Pulo da validação de Dígito Verificador ou cálculo simulado.
   - Falsificação de logs ou resultados de teste.
2. Inspecionar o parser `nfeXmlParser.js`: confirmar que a extração é genérica, autêntica e baseada em nós DOM reais.
3. Inspecionar `accessKeyValidator.js`: confirmar que a multiplicação pelos pesos [2..9] e o Módulo 11 são calculados matematicamente para qualquer chave de entrada.
4. Inspecionar `xmlToInvoiceMapper.js`: confirmar que os dados mapeados provêm genuinamente dos nós extraídos.
5. Inspecionar `invoiceRepository.js`: confirmar que `sessionInvoices = new Map()` é autêntico e que documentos reais nunca tocam em `localStorageService`.
6. Emitir um veredito formal rigoroso em `handoff.md`: `CLEAN` ou `INTEGRITY VIOLATION` (com evidências detalhadas se houver violação).

Mantenha `progress.md` atualizado com timestamp e envie mensagem ao orquestrador quando concluir.
