# Dispatch
Work directory for survey spec miner 2

## 2026-11-04T14:27:36Z
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
Content:
You are a specification investigator agent (teamwork_spec_miner).
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7

MANDATORY: Read the original user request before starting work:
Path: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md

Also thoroughly read:
Path: c:\www\smart-nfe\.github\copilot-instructions.md
And search the repository for any other specs, documentation, or mock definitions.

OBJECTIVE:
Extract and document all functional specifications, business rules, domain entities, and requirements:
1. R1: Foundation requirements and component behaviors.
2. R2: Mocks, formatters, calculations, persistence:
   - Specification of the 5 demo scenarios (demo-01 XML completo com 8 itens, demo-02 PDF exportação com 25 itens, demo-03 grande com 50 itens, demo-04 com inconsistências simuladas, demo-05 com produtos repetidos com 15 itens). Detailed fields required for each invoice and item.
   - Mock repositories contract (list, findById, update, updateItem, getValidationIssues).
   - Formatter rules (BRL currency, BR dates, numbers/quantities, statuses).
   - Decimal calculation rules (avoid binary floating point, handle unit price, quantities, item totals, discount, freight, taxes, invoice grand total).
   - LocalStorage persistence schema version 1.0.0, save, load, reset, resetAll methods.
3. R3: Detailed screen specifications for all 8 screens:
   - /dashboard
   - /documentos/importar
   - /documentos
   - /documentos/[id]/conferencia (dense table, inline editing, Tab/Enter keyboard navigation, auto totals, persistence)
   - /documentos/[id]/divisao (distribution of items/quantities between 2+ destination NFs, real-time balance validation)
   - /documentos/[id]/validacao (fiscal inconsistency display, validation assistant)
   - /notas-preparadas (list of prepared split invoices)
   - /configuracoes (UI preferences: table density, theme)
4. R4: Technical constraints & acceptance criteria.

BOUNDARIES:
- Read-only exploration. NEVER modify source code. Write ONLY to your working directory.

OUTPUT:
- Write full specs to: c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\survey_specs.md
- Write standard handoff to: c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\handoff.md
- When done, send a message to caller (3aeeebdd-68a6-49e6-8f40-494114a9f1f7) with summary and report path.

## 2026-11-04T14:32:28Z
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
Content:
**Context**: Survey Phase
**Content**: CRITICAL USER INSTRUCTION: O projeto já está rodando em http://localhost:3000/dashboard (servidor dev ativo externamente pelo usuário). NÃO rode comandos de build (como `pnpm build`, `npm run build`) e NÃO inicie servidores de desenvolvimento (`pnpm dev`, `npm run dev`), para evitar conflitos de portas ou travamentos no ambiente.
**Action**: Note this constraint in your survey findings.
## 2026-11-09T19:20:53Z
Caller conversation ID: 71db8a14-4c80-4575-92ba-b52ae572b170
Content:
Você é o Survey Spec Miner 2 da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\
Você DEVE ler o arquivo de requisitos original em: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md

Missão:
Minerar e estruturar as especificações detalhadas para a importação real de XML NF-e modelo 55 no navegador (R3) e o contrato de dados:
1. Especificações do XML NF-e modelo 55:
   - Suporte aos layouts `nfeProc` e `NFe` (com e sem procEvento / protocolo de autorização).
   - Namespaces da NF-e (ex: `http://www.portalfiscal.inf.br/nfe`) e como consultar nós com segurança usando `DOMParser` e seletores (ex: `getElementsByTagNameNS` ou `querySelector` tolerante a prefixos).
   - Mapeamento exato de todas as tags necessárias: versão, chave de acesso (`infNFe@Id` ou `chNFe`), número (`nNF`), série (`serie`), data de emissão (`dhEmi` ou `dEmi`), natureza da operação (`natOp`), emitente (`CNPJ`/`CPF`, `xNome`, `xFant`, `IE`), destinatário (`CNPJ`/`CPF`, `xNome`), itens/produtos (`det` -> `cProd`, `cEAN`, `xProd`, `NCM`, `CFOP`, `uCom`, `qCom`, `vUnCom`, `vProd`, `uTrib`, `qTrib`, `vUnTrib`, tributos ICMS/IPI/PIS/COFINS quando presentes), e totais (`total/ICMSTot` -> `vProd`, `vFrete`, `vSeg`, `vDesc`, `vOutro`, `vNF`, etc.).
   - Algoritmo de validação da Chave de Acesso da NF-e de 44 dígitos: estrutura dos campos e cálculo do dígito verificador (módulo 11 com pesos de 2 a 9).
   - Requisitos de segurança no navegador: File API, leitura com `File.text()`, sem avaliação de scripts, sem `dangerouslySetInnerHTML`, limite de tamanho de arquivo, tratamento de XML malformado/inválido com mensagens claras, e sem chamadas externas / sem backend.
2. Contrato de dados e Repositório em Memória:
   - Analisar `app/features/invoiceRepository.js` e o formato dos documentos mockados em `app/lib/data/mockInvoices.js`.
   - Especificar a conversão exata do XML importado para o contrato aceito por `invoiceRepository.js` (geração de `itemId` estável para cada produto, status de conferência, etc.).
   - Especificar o isolamento de sessão: documentos importados reais NÃO devem ser salvos no `localStorage` persistente (apenas sessão temporária em memória, avisando o usuário sobre perda ao fechar/recarregar a página) e não devem corromper nem se misturar com os mocks de fábrica.
3. Verificar se há no repositório DANFEs em PDF, fixtures sintéticas de NF-e ou arquivos de teste prévios.
4. Produzir relatório detalhado em `handoff.md` no seu diretório de trabalho com:
   - Specification Matrix (tags, formatos, obrigatoriedade, tipos)
   - Chave de Acesso check digit algorithm spec
   - Browser DOMParser Architecture spec
   - Contract Mapping spec para invoiceRepository
   - Security & Session Storage boundary spec

Mantenha seu `progress.md` atualizado com timestamp e envie mensagem ao orquestrador quando concluir.
