Corrigir problemas funcionais do frontend SmartNFe e implementar a importação real de XML de NF-e modelo 55 diretamente no navegador, permitindo conferência de produtos, divisão de quantidades e validação fiscal com precisão decimal e segurança.

Working directory: c:\www\smart-nfe
Integrity mode: development

## Requirements

### R1. Correção da Edição na Tabela de Conferência e Precisão dos Cálculos Decimais
- Utilizar identificadores estáveis (`itemId`) para localizar e atualizar produtos na tabela de conferência (`app/documentos/[id]/conferencia/page.jsx`), alterando `handleItemChange`, usando atualização imutável de estado e garantindo que filtros (por NCM ou descrição) e ordenação não alterem a identidade dos produtos nem modifiquem o item errado. Atualizar o total do produto e preservar os dados originais para comparação.
- Eliminar cálculos monetários e de quantidades com ponto flutuante binário (`parseFloat`, `.toFixed(2)`, `Math.floor()`, `Math.round()`). Utilizar strings decimais e centralizar as operações nos utilitários existentes (`app/lib/calculations/decimal.js`, `invoiceTotals.js`, `divisionMath.js`), preservando casas decimais de quantidade e valor unitário sem arredondamento prematuro. Validar quantidades negativas e entradas inválidas, diferenciar valor dos produtos do valor total da NF-e, conservando frete, seguro, descontos e outras despesas sem substituir o total original por soma simplificada.

### R2. Segurança das Correções Sugeridas e Assistente de Validação
- Impedir aplicação silenciosa de correções fiscais em `app/documentos/[id]/validacao/page.jsx`. Antes de qualquer alteração, exibir os valores atual e proposto, a origem da sugestão, exigir confirmação explícita, permitir cancelamento, preservar valores anteriores com capacidade de desfazer (undo) e reexecutar validações após a correção.
- Para a opção "Corrigir todas", exibir revisão de todas as alterações, separar correções mecânicas de sugestões fiscais, permitir aprovação individual e desabilitar aplicação em massa de propostas que possam alterar tributação, CFOP, NCM ou outros campos sensíveis. Manter as explicações do assistente identificadas como demonstração.

### R3. Importação Real de XML NF-e Modelo 55 no Navegador e Integração de Fluxo
- Implementar importador funcional de XML NF-e modelo 55 executado exclusivamente no navegador (`app/documentos/importar/page.jsx` e `app/features/xml/`), utilizando File API, `File.text()`, `DOMParser` e seletores XML que respeitem namespaces da NF-e. Suportar layouts `nfeProc` e `NFe`, extraindo versão, chave de acesso, número, série, data de emissão, natureza da operação, emitente, destinatário, produtos (`cProd`, `xProd`, `NCM`, `CFOP`, `uCom`, `qCom`, `vUnCom`, `vProd`, `uTrib`, `qTrib`, `vUnTrib` e demais dados fiscais) e totais.
- Validar formato e dígito verificador da chave de acesso, formato decimal de quantidades e valores, e tratar XML malformado sem quebrar a aplicação. Não carregar recursos externos do XML, não executar scripts do documento, não usar `dangerouslySetInnerHTML`, limitar tamanho de arquivos e não enviar documentos para serviços externos ou Vercel Functions.
- Converter o XML importado para o mesmo contrato de dados usado por `app/features/invoiceRepository.js`, disponibilizando o documento para conferência, divisão e validação. Não salvar XML completo nem dados fiscais reais no `localStorage` persistente; manter dados reais apenas em memória de sessão temporária (avisando sobre perda ao fechar/atualizar a página) e não misturar documentos reais com mocks de fábrica.

### R4. Aprimoramentos de Interface na Conferência e na Divisão de Notas
- Na tela de conferência, destacar a origem dos dados: adicionar indicador de documento XML, contagem real de produtos importados, totais originais vs recalculados, indicador de produtos alterados, comparação do valor original com editado, aviso de dados ausentes, ação para restaurar valor original, resumo de inconsistências e identificação visual do modo (demonstração vs importação local). Garantir navegação por teclado e foco estável durante a edição sem redesenhar a tela existente.
- Na tela de divisão (`app/documentos/[id]/divisao/page.jsx`), utilizar o motor decimal para distribuir produtos por quantidades exatas, distribuir saldo restante para uma nota ou igualmente entre notas, impedir quantidade distribuída superior à original, permitir adicionar/remover notas e bloquear a finalização de divisões com inconsistências ou saldos pendentes.

### R5. Reutilização de Componentes, Testes de Integração, Controle de Versão e Build
- Não recriar o projeto do zero, não migrar para TypeScript (manter Next.js 16 App Router, React 19, JavaScript/JSX, Tailwind CSS 4) e não implementar backend. Reutilizar componentes existentes em `app/components/` preservando a compatibilidade com seus consumidores e evitando duplicação.
- Trabalhar exclusivamente na branch `fix/frontend-xml-conferencia-v0.1.1` com commits coerentes, sem modificar a `master` diretamente e sem fazer merge na `master`.
- Implementar testes de integração automatizados para: Fluxo A (Importação real de XML e conferência de totais), Fluxo B (Conferência com filtros, edição por `itemId`, recálculo e restauração), Fluxo C (Divisão entre notas com validação de saldos) e Fluxo D (Validação com revisão de sugestões fiscais e undo).
- Garantir execução com 0 erros de `pnpm install`, `pnpm lint` e `pnpm build`, mantendo compatibilidade com Vercel.

## Verification Resources
- Testes automatizados executados via suite de testes frontend (`pnpm test` ou scripts equivalentes no repositório) utilizando fixtures sintéticas de XML NF-e modelo 55 (`nfeProc` e `NFe`), sem incluir documentos reais de clientes no repositório.
- DANFEs em PDF de notas fiscais reais modelo 55 disponibilizados pelo usuário (ex: operação de remessa com fim específico de exportação CFOP 6501, NCM 84089090) para servirem como referência exata na modelagem das tags, tributos, produtos e totais das fixtures de XML sintético.
- Validação estática e compilação via `pnpm lint` e `pnpm build`.

## Acceptance Criteria

### Tabela de Conferência e Edição Estável
- [ ] A edição de produtos com tabela filtrada (por NCM ou por descrição) ou ordenada altera exclusivamente o item selecionado identificado por `itemId` e não modifica itens adjacentes ou incorretos.
- [ ] A edição de itens com descrições ou códigos repetidos afeta apenas a linha editada.
- [ ] Os dados originais do item permanecem acessíveis para comparação visual e restauração do valor original.
- [ ] A tela de conferência exibe indicador de documento XML, contagem de produtos, comparação de totais originais vs recalculados e aviso de dados ausentes.

### Cálculos Decimais e Precisão
- [ ] Cálculos monetários e quantitativos utilizam strings decimais e o motor em `app/lib/calculations/` sem ocorrência de operações financeiras em ponto flutuante binário (`parseFloat`, `.toFixed(2)`, `Math.round`).
- [ ] Quantidades com até 4 casas decimais e valores unitários com precisão estendida são manipulados e multiplicados sem perda de precisão ou arredondamento prematuro.
- [ ] A conservação de saldos em divisões de notas reconcilia integralmente valores originais, incluindo componentes de frete, seguro e despesas acessórias quando presentes.

### Segurança e Revisão de Validações
- [ ] Nenhuma correção fiscal é aplicada silenciosamente; cada alteração exibe valor atual, valor proposto e origem antes de ser confirmada.
- [ ] A interface permite cancelar a correção e oferece mecanismo de desfazer (undo) que reverte a alteração e reexecuta as validações.
- [ ] A funcionalidade "Corrigir todas" bloqueia aplicação em massa de campos fiscais sensíveis (tributação, CFOP, NCM) e exige revisão individual.

### Importação de XML NF-e no Navegador
- [ ] Arquivos XML de NF-e modelo 55 nos formatos `nfeProc` e `NFe` são analisados localmente no navegador via `DOMParser` e File API sem requisições HTTP externas nem dependência de backend.
- [ ] Dados de cabeçalho, chave de acesso (com validação de formato e dígito verificador), emitente, destinatário, produtos e totais são extraídos e normalizados no contrato do `invoiceRepository`.
- [ ] Documentos importados reais são mantidos em memória de sessão no navegador, sem salvar o XML completo ou dados reais em `localStorage` persistente.
- [ ] Arquivos malformados ou inválidos são tratados de forma graciosa com mensagens informativas, sem travamentos de interface.

### Divisão de Notas Fiscais
- [ ] A tela de divisão impede a alocação de quantidades maiores do que as disponíveis no documento de origem.
- [ ] As ações de distribuir saldo restante e dividir igualmente conservam os saldos com precisão decimal.
- [ ] A finalização da divisão é impedida enquanto houver inconsistências ou saldos remanescentes não alocados.

### Componentes, Testes e Build
- [ ] Os componentes existentes em `app/components/` são reaproveitados sem duplicação de modais, inputs ou tabelas idênticas.
- [ ] Os cenários mockados existentes (`demo-01` a `demo-05`) continuam operacionais.
- [ ] Testes automatizados cobrindo os Fluxos A, B, C e D executam com sucesso.
- [ ] O código reside na branch `fix/frontend-xml-conferencia-v0.1.1` sem alterações na branch `master`.
- [ ] Os comandos `pnpm lint` e `pnpm build` executam sem nenhum erro.
