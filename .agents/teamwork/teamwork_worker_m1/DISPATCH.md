## 2026-11-09T19:43:39Z
Você é o Milestone 1 Worker da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m1\

Você DEVE ler os seguintes arquivos antes de iniciar qualquer implementação:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1_xml\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\handoff.md (Código completo e arquitetura de nfeXmlParser.js)
- c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\handoff.md (Código completo de accessKeyValidator.js e xmlToInvoiceMapper.js)
- c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_3\handoff.md (Código completo de invoiceRepository.js com sessionInvoices e app/documentos/importar/page.jsx)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Seus Arquivos de Escrita Exclusiva (Write Ownership):
- `app/features/xml/nfeXmlParser.js`
- `app/features/xml/accessKeyValidator.js`
- `app/features/xml/xmlToInvoiceMapper.js`
- `app/features/xml/index.js`
- `app/features/invoiceRepository.js`
- `app/documentos/importar/page.jsx`

Missão:
Implementar integralmente o Milestone 1 (Importação Real de XML NF-e Modelo 55 no Navegador e Repositório em Memória de Sessão):
1. Criar o diretório `app/features/xml/` e implementar:
   - `nfeXmlParser.js`: Parser baseado em `DOMParser` do navegador com fallback compatível para testes Node, busca imune a namespaces e prefixos, suporte a `nfeProc` e `NFe` avulso, schemas v4.00 e v3.10, e tratamento resiliente de `<parsererror>`.
   - `accessKeyValidator.js`: Validação estrutural de 44 dígitos (UF IBGE, AAMM, CNPJ, modelo 55, série, número, tpEmis, cNF) e cálculo rigoroso do Módulo 11 (pesos de 2 a 9 da direita para a esquerda, regra resto 0 ou 1 -> DV 0).
   - `xmlToInvoiceMapper.js`: Mapeamento para o contrato de `invoiceRepository` com geração determinística de `itemId: 'nfe-' + chaveAcesso + '-item-' + nItem`, precisão decimal em quantidades (4 decimais) e valores unitários (precisão estendida), flags `isRealImport: true` e `isDemo: false`, e conservação integral de totais e despesas acessórias (frete, seguro, outras despesas, desconto).
   - `index.js`: Barrel export dos três módulos.
2. Atualizar `app/features/invoiceRepository.js`:
   - Adicionar coleção volátil em memória de sessão `sessionInvoices = new Map()`.
   - Em `create`: se `isRealImport === true` ou `isDemo === false`, salvar exclusivamente em `sessionInvoices.set(newDoc.id, newDoc)`, SEM persistência em `localStorageService`.
   - Em `findById`: buscar na sessão primeiro, com fallback para o storage.
   - Em `list`: mesclar sessão no topo com mocks persistidos, mantendo paginação e filtros.
   - Em `update` e `updateItem`: atualizar diretamente em `sessionInvoices` para documentos reais sem gravar no disco.
   - Em `resetDemoData`: limpar apenas mocks persistidos, mantendo a sessão volátil.
   - Implementar `delete(id)` e alias `resetAll()`.
3. Atualizar `app/documentos/importar/page.jsx`:
   - Substituir simulação de setInterval por importação real via File API (`file.text()`).
   - Integrar parser, validação de chave e mapeador.
   - Exibir feedback visual rico no card de sucesso (dados da NF-e, emitente, destinatário, quantidade de itens, valor total) com botão para `/documentos/[id]/conferencia`.
   - Exibir mensagens detalhadas em caso de erro na validação ou XML malformado.
   - Exibir banner permanente e visível avisando sobre a natureza temporária da sessão em memória ("Por segurança, dados reais não são salvos em disco e serão perdidos ao fechar a página").
   - Preservar a grade de carga rápida dos 5 cenários mockados (`demo-01` a `demo-05`).
4. Executar verificação dos testes:
   - Rodar os testes de domínio (`node --test tests/tier1/m2_domain.test.mjs`).
   - Se os testes do Fluxo A já estiverem disponíveis em `tests/integration/flow_a_xml_import.test.mjs`, executá-los e garantir 100% de aprovação.
   - Executar `pnpm build` para garantir compilação com 0 erros.
5. Escrever relatório detalhado em `handoff.md` no seu diretório de trabalho com os comandos de execução e saídas verbatim.
