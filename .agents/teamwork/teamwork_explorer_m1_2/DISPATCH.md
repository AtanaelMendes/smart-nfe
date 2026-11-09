## 2026-11-09T19:34:06Z
Você é o Milestone 1 Explorer 2 da equipe de engenharia do SmartNFe.
Seu diretório de trabalho exclusivo é: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\

Você DEVE ler os seguintes arquivos antes de iniciar:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m1_xml\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\handoff.md

Missão:
Elaborar a estratégia de implementação e arquitetura exata para os módulos `app/features/xml/accessKeyValidator.js` e `app/features/xml/xmlToInvoiceMapper.js`:
1. `accessKeyValidator.js`:
   - Validação da estrutura de 44 dígitos da chave de acesso (UF, AAMM, CNPJ, modelo 55, série, número, tpEmis, código aleatório).
   - Cálculo rigoroso do dígito verificador pelo Módulo 11 com pesos de 2 a 9 da direita para a esquerda.
   - Mensagens de erro claras quando o comprimento, caracteres, modelo ou DV forem inválidos.
   - Vetores de teste oficiais para validação.
2. `xmlToInvoiceMapper.js`:
   - Normalização dos nós brutos do XML para o contrato estrito exigido pelo `invoiceRepository.js`.
   - Geração determinística de `itemId`: `nfe-${chaveAcesso}-item-${nItem}` garantindo identificadores estáveis para cada produto.
   - Tratamento de quantidades com até 4 casas decimais e valores unitários com precisão estendida.
   - Garantir flags `isRealImport: true` e `isDemo: false`.
   - Preservar estrutura de `totais` com `valorProdutos`, `valorFrete`, `valorSeguro`, `outrasDespesas`, `valorDesconto` e `valorTotalNota`.
3. Propor a estratégia exata em `handoff.md` com trechos de código prontos para o Worker implementar.

Mantenha `progress.md` atualizado com timestamp e envie mensagem ao orquestrador quando concluir.
NÃO escreva nem modifique arquivos de código-fonte diretamente (explorers são read-only).
