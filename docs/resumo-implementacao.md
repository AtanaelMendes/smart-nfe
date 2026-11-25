# Resumo da implementação

Registro do que foi implementado a partir de `docs/plano-campos-e-preparacoes.md`.

## 1. Conclusão N:M integrada (Prioridade 0)

- **`app/features/preparationCompletionService.js`** (novo): valida origens, saldos, alocações, destinos e participantes, e materializa as notas de destino em `preparedInvoiceRepository`, publicando-as em `/notas-preparadas`.
  - IDs estáveis por `preparationId + destinationId` e fila de mutação própria → idempotência (clique duplo/reentrada não duplica).
  - Rollback das notas criadas se qualquer gravação falhar; transição explícita `draft → active → completed`.
  - Rateio de frete/seguro/despesas/desconto por origem entre destinos; rastreio de `sourceInvoiceId` e `sourceItemId` por item.
  - `reopenPreparation` e exclusão de nota preparada com desvinculação/reabertura controlada da preparação.
- **UI (`app/preparacoes/nova/page.jsx`, `app/preparacoes/page.jsx`)**:
  - `Salvar Rascunho` separado de `Concluir Preparação`.
  - Botão `Validar` com painel de impedimentos/avisos.
  - Seleção da empresa emitente da saída.
  - Ao concluir, navega para `/notas-preparadas?preparationId=...`.
  - Lista de preparações com ações `Notas` e `Reabrir`.
- **`app/notas-preparadas/page.jsx`**: filtro por `preparationId` e exclusão vinculada.

## 2. Importação por tipo / NFS-e (Prioridade 1) e IPI (Prioridade 4.2)

- **`app/features/xml/xmlLayoutDetector.js`** (novo): identifica NF-e modelo 55 e NFS-e nacional 1.01.
- **`app/features/xml/nfseXmlParser.js`** (novo): leitura por caminho/contexto (evita colisão de `vBC`/`CST`), preservando códigos, datas e decimais.
- **`app/features/xml/nfseToDocumentMapper.js`** (novo):
  - Mapeia NFS-e para o contrato de documento (`documentType: 'NFSE'`).
  - Preserva valores emitidos, retenções por indicador (não subtrai PIS/COFINS indevidamente) e grupos IBS/CBS.
- **Upload (`app/documentos/importar/page.jsx`)**: roteia por tipo, deduplica por layout e importa NFS-e (visíveis em `/notas`); `Iniciar Preparação` usa apenas NF-e.
- **IPI no motor**: `app/lib/calculations/invoiceTotals.js` e `app/features/documentRepository.js` somam/preservam o IPI. A NF-e 14853 reconcilia `R$ 22.507,92`.

## 3. Campos dos editores (Prioridades 2 e 3)

- **Parser/mapper de NF-e** (`nfeXmlParser.js`, `xmlToInvoiceMapper.js`) ampliados para preservar:
  - Identificação completa (`indFinal`, `indPres`, `indIntermed`, `finNFe`, `procEmi`, `cMunFG`, `tpEmis`, `tpAmb`…).
  - Endereços completos de emitente e destinatário.
  - Item: CEST, GTIN comercial/tributável, unidades/qtd/valor tributável, `indTot`, pedido/item, `vItem`.
  - ICMS com CSOSN, IPI com `cEnq`, PIS/COFINS, IBS/CBS por item.
  - Todos os volumes/transportador, cobrança (`fat`/`dup`), pagamento (`detPag`), informações adicionais e assinatura.
- **`app/components/notes/ProductInvoiceEditor.jsx`**:
  - Bloco de identificação fiscal complementar.
  - Endereço completo de emitente e destinatário.
  - Linha expansível "Detalhes fiscais" por item (produto/unidades, ICMS, IPI, PIS/COFINS, IBS/CBS).
  - Campo de IPI nos totais com memória de cálculo.
- **`app/components/notes/ServiceInvoiceEditor.jsx`**:
  - Regime tributário do prestador (`opSimpNac`, `regApTribSN`, `regEspTrib`).
  - Código NBS, descrição nacional/NBS, local de prestação e incidência.
  - Painel completo: ISS/base/dedução/total retido/`tribISSQN`/`tpRetISSQN`, PIS/COFINS calculados, transparência e IBS/CBS declarado + apurado.
  - NFS-e importadas abrem em modo completo preservando retenções.
- **`app/components/notes/FiscalField.jsx`** (novo): componentes reutilizáveis de campo, seletor e grupo fiscal.

## 4. Conferência de NF-e importada

- **`app/documentos/[id]/conferencia/page.jsx`**:
  - Painel somente-consulta "Detalhes fiscais completos do XML": identificação, emitente, destinatário, transporte, cobrança, pagamento, totais (com IPI) e autorização/assinatura.
  - Detalhes tributários expansíveis por item (ICMS/CSOSN, IPI, PIS/COFINS, IBS/CBS).
  - Rodapé da tabela inclui IPI na composição do total.

## Verificação

- **Testes novos**:
  - `tests/integration/flow_g_preparation_completion_nfse_ipi.test.mjs` (9 testes).
  - `tests/integration/flow_h_editor_fields.test.mjs` (5 testes).
- **Suíte completa**: 629 testes, 628 passando; a única falha (`flow_a_drawer_layout`) é pré-existente.
- **Lint**: limpo nos arquivos alterados (o erro em `conferencia` é pré-existente, confirmado no `HEAD`).
- **Build**: `next build` compila com sucesso (rodando com `app/dev/page.jsx` temporariamente isolado).

## Pendente

- Ampliar os cadastros de produtos/serviços com os novos campos.
- Exportação XML coerente com o estado real (hoje simulada em `/notas-preparadas`).
- `app/dev/page.jsx` importa `InputPIS`/`InputNIT` inexistentes e quebra o build padrão — problema pré-existente, não relacionado a estas mudanças.
