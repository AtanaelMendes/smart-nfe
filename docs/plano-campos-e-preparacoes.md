# Plano de campos fiscais e conclusão das preparações

Data da verificação: 24/11/2026. Escopo: os oito XMLs reais de `tests/nfes`, o upload em `http://localhost:3000/documentos/importar`, os editores de produtos e serviços e o fluxo de preparações. Este documento é um plano de implementação; o código funcional ainda não foi alterado.

## Resultado do teste real

O upload foi executado no navegador com os oito arquivos, pelo campo de seleção de arquivos e pelo botão **Processar Lote**.

| Tipo e número | Layout | Itens | Valor do XML | Resultado atual |
| --- | --- | --- | --- | --- |
| NF-e 76406 | nfeProc 4.00, modelo 55 | 2 | R$ 197,20 | Importada |
| NF-e 14853 | nfeProc 4.00, modelo 55 | 2 | R$ 22.507,92 | Importada |
| NF-e 9762 | nfeProc 4.00, modelo 55 | 2 | R$ 340,84 | Importada |
| NF-e 2275 | nfeProc 4.00, modelo 55 | 1 | R$ 12,35 | Importada |
| NFS-e 41880 | NFSe nacional 1.01 | Serviço | R$ 159,88 líquido | Rejeitada |
| NFS-e 14 | NFSe nacional 1.01 | Serviço | R$ 22.515,74 líquido | Rejeitada |
| NFS-e 8 | NFSe nacional 1.01 | Serviço | R$ 33.720,01 líquido | Rejeitada |
| NFS-e 45 | NFSe nacional 1.01 | Serviço | R$ 2.524,00 líquido | Rejeitada |

Resumo exibido pelo upload: **4 importados, 0 duplicados, 4 erros, 7 itens e R$ 23.058,31**. As quatro NFS-e retornam a mensagem `Documento XML não contém a tag <NFe>. O arquivo não parece ser uma Nota Fiscal Eletrônica.` O parser retorna `INVALID_ROOT` para esses arquivos.

Na mesma sessão, **Iniciar Preparação com 4 Notas** abriu o editor com as quatro origens. Todos os sete itens foram alocados ao destino usando **Max**. A revisão exibiu **R$ 22.310,29**, com cliente não atribuído. **Concluir Preparação** aceitou esses dados, criou `PREP-2026-5193` com situação **Ativa** e retornou a `/preparacoes`. A navegação interna para `/notas-preparadas` mostrou somente os dois lotes demo existentes; nenhuma nota dessa preparação foi gerada. Não houve recarga entre upload, preparação e consulta.

As evidências estão em `output/playwright/upload-result.yml`, `review.yml`, `preparation-saved.yml` e `prepared-notes.yml`.

## Diagnóstico do fluxo atual

O Graphify existente foi consultado para localizar `preparationRepository`, `preparedInvoiceRepository`, `nfeXmlParser`, `xmlToInvoiceMapper`, `ProductInvoiceEditor`, `ServiceInvoiceEditor` e `documentRepository`. As relações relevantes foram conferidas no código atual.

- `app/preparacoes/nova/page.jsx`, função `handleSave`: grava somente em `preparationRepository.create/update`; ao concluir usa status `active` e navega para `/preparacoes`.
- `app/features/preparationRepository.js`: mantém a preparação, seus destinos e alocações; não materializa as notas de destino no outro repositório.
- `app/notas-preparadas/page.jsx`: lista exclusivamente `preparedInvoiceRepository.list()`.
- `app/documentos/[id]/divisao/page.jsx`: o fluxo antigo de divisão já chama `preparedInvoiceRepository.create()` por destino e navega para `/notas-preparadas`.
- `tests/integration/flow_e_preparation_n_to_m.test.mjs`: exercita preparação e alocações, mas não consulta `preparedInvoiceRepository` nem comprova a publicação na listagem de notas preparadas.

Portanto, a integração de conclusão N:M está incompleta. Trocar apenas o redirecionamento não resolve: é necessário criar os registros que a listagem consulta.

Há também dois problemas de valores. A revisão N:M soma quantidade × preço e não incorpora frete, desconto e IPI das origens. Separadamente, o motor `invoiceTotals.js` não incorpora IPI: ao passar os itens e totais da NF-e 14853 pelo parser, mapper e motor atuais, o total recalculado resulta em **R$ 21.799,44**, enquanto `vNF` contém **R$ 22.507,92**. A diferença é exatamente o IPI de **R$ 708,48**. Essa segunda divergência foi confirmada em execução Node dos módulos atuais, além da revisão observada no navegador.

## Prioridade 0 — concluir e publicar as notas de destino

1. Criar um serviço de conclusão de preparação, chamado pela UI, que carregue as origens atuais e valide novamente saldos, alocações e destinos. Centralizar nele a materialização; reutilizar o serviço no fluxo antigo de divisão quando os contratos estiverem compatíveis.
2. Separar **Salvar rascunho** de **Concluir preparação**. Rascunho permanece em `/preparacoes`; conclusão cria uma nota por destino válido e, somente após sucesso completo, navega para `/notas-preparadas`.
3. Antes de concluir, exigir origens existentes, ao menos um destino com itens, quantidades positivas dentro do saldo e os dados de emitente e destinatário necessários ao documento de saída. Destinos vazios precisam ser removidos ou preenchidos explicitamente. Não fabricar destinatário ou emitente com valores demo. Permitir saldo não utilizado nas origens, desde que explicitado na revisão e disponível para outra preparação.
4. Definir o emitente da saída: vários fornecedores de origem não determinam automaticamente qual empresa emitirá a nova nota. Adicionar seleção da empresa responsável pela saída e destinatário por destino, com opção de herdar o cliente da preparação.
5. Produzir IDs estáveis por `preparationId + destinationId`. Registrar `preparationId`, `destinationId`, `sourceInvoiceIds` e, em cada item, `sourceInvoiceId`, `sourceItemId`, quantidade e valores da origem e da saída. Não confundir o número interno da preparação com número fiscal autorizado.
6. Gravar os destinos em lote, com validação antes da mutação e rollback em falha. Usar idempotência: clique duplo, reentrada ou nova tentativa não podem duplicar notas ou reservas de saldo. Filas independentes dos dois repositórios não constituem uma transação conjunta.
7. Vincular os IDs gerados à preparação e adotar transição explícita `draft → active → completed`. Na conclusão bem-sucedida, atualizar para `completed`; falha mantém o estado anterior. Oferecer acesso às notas geradas na linha da preparação.
8. Para preparação concluída, bloquear edição direta e oferecer reabertura controlada que invalide os destinos antes de realocar. Cancelamento e exclusão devem tratar notas vinculadas e reservas conjuntamente. Exclusão de nota preparada não pode deixar uma preparação concluída apontando para registros ausentes.
9. Manter documentos reais, preparações e notas geradas exclusivamente na memória da mesma sessão, seguindo a arquitetura atual. Preservar aviso de perda ao recarregar. Demonstrações continuam no armazenamento próprio.

**Aceite:** completar N→1, 1→M e N→M faz aparecer exatamente os destinos gerados em `/notas-preparadas`, com vínculo às origens e valores conciliados, sem duplicação nem reserva dupla. Rascunhos não aparecem como notas concluídas.

## Prioridade 1 — contrato comum e importação por tipo

O upload atual usa somente `parseNFeXml → mapXmlToInvoice → invoiceRepository`. Os editores manuais usam `documentRepository`; não há hoje importação de NFS-e conectando essas estruturas.

1. Identificar o layout por raiz, namespace e versão. Encaminhar `nfeProc/NFe` modelo 55 ao parser de produtos e `NFSe` nacional 1.01 ao novo parser de serviços. Mensagem específica para layout não suportado.
2. Criar parser e mapper de NFS-e com consultas por caminho e contexto. `vBC`, `CST` e outros nomes se repetem em grupos distintos: busca global pela primeira tag produziria valores incorretos.
3. Definir contrato comum com `tipoFiscal`, `layout`, `versao`, `origem`, identificador original, dados normalizados, valores originais e alterações. Separar formato de entrada XML/PDF de tipo fiscal NF-e/NFS-e.
4. Criar uma fachada de leitura para listagem e detalhe dos documentos importados e manuais, preservando os repositórios atuais atrás dela. Resolver a rota de conferência/edição pelo tipo. Não inserir serviços artificialmente em `invoiceRepository` como mercadorias.
5. Deduplicar pela identidade do respectivo layout. A chave de NFS-e dos exemplos não tem o formato de 44 dígitos da NF-e; não aplicar nela `validateAccessKey` do modelo 55.
6. Preservar XML original e grupos não mapeados em memória. Não substituir ausência por zero, alíquota padrão ou regime presumido; distinguir ausente, informado com zero e não aplicável. Preservar códigos com zeros iniciais, datas completas e casas decimais do documento.
7. No lote misto, mostrar tipo, número, resultado e ação **Conferir** por arquivo. **Iniciar preparação** utiliza somente as NF-e de mercadorias elegíveis. NFS-e têm conferência e validação próprias.

**Aceite:** os oito arquivos são reconhecidos e importados no tipo correto; reenvio identifica duplicatas; erros de um arquivo não impedem os demais; nenhum dado real vai ao armazenamento persistente.

## Prioridade 2 — campos de NF-e de produtos

Ampliar `ProductInvoiceEditor`, a conferência de documentos importados, os cadastros utilizados e os detalhes das notas preparadas. Reutilizar componentes e organização existentes. Campos presentes no XML devem ser visíveis; em notas já autorizadas, identidade, protocolo e valores originais ficam somente para consulta, com alterações em uma preparação derivada.

| Bloco da tela | Campos a contemplar | Lacuna a resolver |
| --- | --- | --- |
| Identificação | Número, série, chave, versão, emissão e saída com fuso; natureza; modelo; entrada/saída; destino da operação; finalidade; consumidor final; presença; intermediação; ambiente; tipo de emissão; município do fato gerador | Parser e mapper preservam apenas parte de `ide`; não limitar ao cabeçalho manual atual |
| Emitente e destinatário | CPF/CNPJ, nome, fantasia quando existente, IE, indicador de IE, CRT; município e código IBGE, UF, CEP, logradouro, número, complemento, bairro, país e código, telefone e e-mail; identificador estrangeiro quando aplicável | Endereço e contato hoje são reduzidos no fluxo de importação; existem destinatários CPF nos exemplos |
| Produtos | Código, descrição, NCM, CEST, CFOP, GTIN comercial/tributável, unidade/quantidade/preço comercial e tributável, indicador de composição do total, desconto, frete, seguro, outras despesas, pedido/item do pedido e informações adicionais | Mapper perde unidade/quantidade/preço tributáveis já lidos pelo parser; não limitar cada item às colunas básicas |
| Tributos por item | Grupo de ICMS efetivamente informado, origem, CST ou CSOSN; modalidade/base/alíquota/valor; IPI e enquadramento; PIS e COFINS com seus grupos, bases, alíquotas e valores; total aproximado de tributos quando presente | Preservar distinção de CST/CSOSN; os exemplos têm CRT 3 e CRT 1, ICMS00 e ICMSSN102, IPI tributado e grupos PIS/COFINS distintos |
| IBS e CBS | CST, classificação tributária, base, IBS UF e municipal, CBS; alíquotas e valores; diferimento, devolução, créditos e totais quando informados; `vItem` e `vNFTot` quando presentes | Esses grupos existem em duas NF-e da amostra e não são preservados pelo parser/mapper atual |
| Transporte | Modalidade do frete, transportador quando presente, volumes, espécie, numeração, pesos líquido/bruto | Preservar os grupos completos e todos os volumes; não apenas o primeiro volume/peso |
| Cobrança e pagamento | Fatura, valor original, desconto, líquido; todas as duplicatas, vencimentos e valores; meios, descrição e valores de pagamento | Grupos `cobr/fat`, `dup` e `pag/detPag` presentes nos exemplos |
| Totais e informações | Totais de produtos, tributos, frete, seguro, desconto, despesas, total da nota e novos totais quando presentes; informações complementares/fisco; protocolo, status e data de autorização; responsável técnico quando informado | Preservar totais tributários que o parser lê e o mapper descarta; protocolo e assinatura são dados de consulta |

A tabela define grupos funcionais; a lista exaustiva de caminhos e atributos efetivamente encontrados está em `campos-xml-reais.csv`. Assinaturas e certificados devem ser preservados no original e apresentados em resumo técnico, sem campos editáveis. A leitura do XML não comprova verificação criptográfica da assinatura.

## Prioridade 3 — campos de NFS-e nacional

Ampliar `ServiceInvoiceEditor`, `nfseValidator`, cadastros de prestadores/tomadores e criar conferência do XML de serviços com visualização por seções.

| Bloco da tela | Campos e caminhos de referência |
| --- | --- |
| Identidade da NFS-e | `infNFSe/@Id`, versão, `nNFSe`, `nDFSe`, `cStat`, `dhProc`, ambiente gerador, tipo/processo de emissão e aplicação geradora |
| DPS e competência | `DPS/infDPS/@Id`, versão, `serie`, `nDPS`, `dhEmi`, `dCompet`, `tpAmb`, `tpEmit`, `cLocEmi`; competência deve preservar o dia, além da apresentação mensal |
| Prestador | Dados de `emit` e de `DPS/infDPS/prest` preservados separadamente: CPF ou CNPJ, IM, nome, endereço estruturado, telefone e e-mail; divergências devem ficar visíveis |
| Regime | `regTrib/opSimpNac`, `regApTribSN` quando informado e `regEspTrib`; não inferir MEI pela ausência de tributos ou tratar todo optante do Simples como MEI |
| Tomador | `toma`: documento, nome, endereço nacional com código municipal, CEP, logradouro, número, complemento, bairro e contatos quando presentes; não inventar UF ausente |
| Serviço e locais | `serv/locPrest/cLocPrestacao`, descrições de emissão/prestação/incidência; `cLocIncid`; `cTribNac`, descrição nacional, `cNBS`, descrição NBS, `xDescServ`; manter códigos originais e descrição integral |
| Valores e ISS | `vServ`, dedução/redução declarada `vDR`, calculada `vCalcDR`, base `vBC`, alíquota aplicada `pAliqAplic`, `vISSQN`, tributação `tribISSQN`, tipo de retenção `tpRetISSQN`, total retido `vTotalRet` e líquido `vLiq` |
| Federais | Grupo `piscofins`: CST, base, alíquotas, valores PIS/COFINS e `tpRetPisCofins`; valores `vRetIRRF` e `vRetCSLL`; distinguir tributo calculado de valor efetivamente retido |
| Transparência | `vTotTribFed/Est/Mun`, percentuais `pTotTribFed/Est/Mun` ou `pTotTribSN`, conforme o grupo presente |
| IBS e CBS declarados | `DPS/infDPS/IBSCBS`: finalidade, consumidor final, indicador da operação, indicador do destinatário, CST e classificação tributária |
| IBS e CBS apurados | `infNFSe/IBSCBS`: localidade da incidência, base própria, reembolso/repasse/ressarcimento, IBS UF/município, CBS, alíquotas nominais/efetivas/reduções, valores e `totCIBS` |

Os campos adicionais não encontrados nessa amostra, como código municipal ou descontos já existentes no editor, continuam disponíveis quando aplicáveis. Campo ausente no XML não deve receber um valor presumido do formulário de criação.

Casos obrigatórios de aceitação:

- **NFS-e 41880:** prestador CPF, IM, dedução de R$ 28,36, base de ISS de R$ 131,52, ISS de R$ 3,95 e líquido de R$ 159,88. Dedução da base não pode ser automaticamente subtraída do líquido. Preservar IBS/CBS e a base própria desses grupos.
- **NFS-e 14:** bruto de R$ 23.671,54, total retido de R$ 1.155,80, líquido de R$ 22.515,74. IRRF de R$ 55,07 e CSLL de R$ 1.100,73 compõem esse total. Não subtrair novamente os valores de PIS/COFINS apenas por existirem no XML; usar o indicador do grupo. Preservar classificação `200029` e reduções IBS/CBS informadas.
- **NFS-e 8 e 45:** preservar os indicadores de Simples e `pTotTribSN=6.00`; ausência de grupo IBS/CBS ou de alíquota ISS calculada não deve criar erro nem preencher percentuais padrão.

## Prioridade 4 — cálculos e revisão dos valores

1. Separar total original do XML, total conferido e total da saída. Exibir memória de cálculo e divergência; não sobrescrever silenciosamente total autorizado.
2. Ampliar o motor para os componentes tributários encontrados, incluindo IPI. Definir composição por layout e grupo; não somar todos os tributos indiscriminadamente, pois alguns já estão embutidos. Para grupos ainda não suportados, manter o valor original e sinalizar a limitação de recálculo.
3. Na preparação, definir se o preço da saída herda o custo ou é informado pelo usuário. Frete, seguro, desconto, despesas e tributos da origem e da saída devem ter valores próprios e rastreáveis. Não presumir que uma nota de exportação terá o mesmo tratamento tributário das origens nacionais.
4. Quando houver rateio, usar o motor decimal existente com regra explícita por componente, arredondamento e distribuição do resíduo. Conciliar os valores rateados e quantidades com o montante efetivamente alocado.
5. Preservar casas decimais de quantidade e preço na importação e reduzir apenas na apresentação/cálculo apropriado. Não converter códigos ou documentos em números.
6. Na NFS-e, usar indicadores de retenção e bases por contexto. Preservar valores emitidos sem recalcular ou tributar por regime presumido.

## Organização da interface

- Manter tabela principal compacta com identificação, descrição, quantidade, preço e total. Abrir detalhes do item para tributos, unidades tributáveis, pedidos e IBS/CBS.
- Organizar formulário em Identificação, Participantes, Produtos/Serviço, Tributos, Transporte, Pagamentos e Revisão; mostrar seções conforme o tipo e a presença dos grupos.
- Exibir origem de cada valor: importado, alterado ou calculado. Restaurar o original por campo/bloco.
- Mostrar resumo de validação com ligação ao campo correspondente. Permitir rascunho incompleto; bloquear conclusão com erros concretos.
- Na nota preparada, apresentar preparação de origem, documentos e itens fonte, destinatário, emitente e composição do valor. Atualizar os guias das telas para o comportamento implementado.
- O download em `/notas-preparadas` hoje monta XML simulado com valores padrão. Vincular a exportação aos dados efetivos e distinguir documento original de rascunho de saída; não apresentar XML simulado como nota autorizada.

## Validação da implementação futura

1. Regressão do caso reproduzido: upload dos quatro XMLs de produtos → alocação de sete itens → conclusão → nota visível na listagem e rastreável à preparação.
2. Casos N→1, 1→M e N→M com itens de mesmo código em origens distintas; dupla conclusão, concorrência de saldo, falha parcial, cancelamento, exclusão e reabertura.
3. Regressão de todos os oito arquivos, com comparação dos campos normalizados contra os caminhos do inventário, especialmente os grupos condicionais e os valores descritos acima.
4. Conferir NF-e 76406 com frete de R$ 20,00; NF-e 14853 com IPI de R$ 708,48; NF-e 9762 com frete de R$ 22,84; NF-e 2275 com desconto de R$ 3,30 e CFOP interestadual 6108. Preservar original e reconciliar a composição correspondente.
5. Testar NFS-e com CPF, retenções e dedução de base; grupos IBS/CBS presentes/ausentes; deduplicação própria de cada layout.
6. Verificar no navegador upload misto, formulário preenchido, edição derivada, rascunho, conclusão, navegação interna e aviso de perda ao recarregar; conferir armazenamento demo versus memória real.
7. Verificar desktop e celular, detalhes dos itens, descrições longas, totais e ações acessíveis. Executar testes relevantes, lint e build ao implementar.

Os exemplos fornecidos cobrem NF-e nacionais modelo 55 e NFS-e nacionais 1.01 de Joinville, com as variantes listadas. Eles não demonstram todos os layouts municipais, todos os grupos de uma NF-e ou uma exportação real. A cobertura deste plano é a amostra e os campos já existentes; ampliar regras fiscais além dela exige layouts e exemplos adicionais.

## Entregas em ordem

1. Conclusão N:M integrada com notas preparadas, validações e ciclo de vida.
2. Contrato por tipo e importação NFS-e, preservando os dados originais.
3. Campos de produtos e serviços nos editores, conferência e cadastros.
4. Tributos, totais, rateios e comparação origem/saída integrados.
5. Exportação coerente com o estado do documento e validação completa dos oito XMLs.

O inventário `campos-xml-reais.csv` contém 367 caminhos distintos de elementos folha e atributos, separados por tipo, com presença por arquivo e sem copiar valores pessoais. Ele inclui metadados de assinatura; esses dados não representam 367 inputs a criar.
