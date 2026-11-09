# Handoff Report — Survey Explorer 3: Validação Fiscal, Divisão de Notas, Motor Decimal e Infraestrutura de Testes/Build

## 1. Observation

### 1.1 Tela de Validação Fiscal (`app/documentos/[id]/validacao/page.jsx`)
- **Aplicação Silenciosa em 1-Clique Individual**:
  Em `app/documentos/[id]/validacao/page.jsx`, linhas 82-99:
  ```javascript
  const handleApplyFix = async (issue) => {
    try {
      setFixingId(issue.id);
      const patch = { [issue.campo]: issue.esperado };

      await invoiceRepository.updateItem(id, issue.itemId, patch);
      toast.success(
        `Item ${issue.itemNumero}: ${issue.campo} ajustado para "${issue.esperado}".`
      );

      // Recarrega os dados após a mutação
      await loadData();
    } catch {
      toast.error('Erro ao aplicar correção.');
    } finally {
      setFixingId(null);
    }
  };
  ```
  Ao clicar no botão "Aplicar Correção" (linha 493), a mutação é executada **direta e silenciosamente** no storage (`invoiceRepository.updateItem`), sem exibir modal de confirmação, sem exibir valor atual vs proposto, sem origem da regra e sem possibilidade de cancelamento.

- **Aplicação em Lote Indiscriminada ("Corrigir todas")**:
  Em `app/documentos/[id]/validacao/page.jsx`, linhas 102-119:
  ```javascript
  const handleFixAll = async () => {
    if (issues.length === 0) return;

    try {
      setIsFixingAll(true);
      for (const issue of issues) {
        const patch = { [issue.campo]: issue.esperado };
        await invoiceRepository.updateItem(id, issue.itemId, patch);
      }

      toast.success(`Todas as ${issues.length} pendências foram corrigidas com sucesso!`);
      await loadData();
    } catch {
      toast.error('Erro ao aplicar correções automáticas.');
    } finally {
      setIsFixingAll(false);
    }
  };
  ```
  O método itera sobre todos os apontamentos sem distinção entre correções mecânicas (ex: recálculo de `valorTotal`) e alterações fiscais sensíveis (ex: `cfop` e `ncm`). Não há tela ou diálogo de revisão, nem seleção granular.

- **Ausência de Mecanismo de Undo / Histórico de Reversão**:
  Não há rastreamento do estado anterior (`valorAnterior`) em memória ou histórico na página. O único botão presente é `handleResetDemoIssues` (linhas 122-133), restrito exclusivamente ao cenário estático `demo-04`, que apaga todas as modificações da nota e restaura os mocks de fábrica.

---

### 1.2 Tela de Divisão de Notas (`app/documentos/[id]/divisao/page.jsx`) e Motor Decimal
- **Uso Residual de Ponto Flutuante Binário (`parseFloat`, `Math.floor`, `Math.round`)**:
  Em `app/documentos/[id]/divisao/page.jsx`, linhas 288-301:
  ```javascript
  invoice.itens.forEach((it) => {
    const origQty = parseFloat(cleanDecimalString(it.quantidade)) || 0;
    const piece = Math.floor((origQty / numNotes) * 10000) / 10000;
    let allocatedSoFar = 0;

    updatedNotes.forEach((note, idx) => {
      if (idx === numNotes - 1) {
        // Última nota fica com a diferença exata para somar 100%
        const lastPiece = Math.round((origQty - allocatedSoFar) * 10000) / 10000;
        note.itens[it.id] = lastPiece > 0 ? String(lastPiece) : '0';
      } else {
        note.itens[it.id] = String(piece);
        allocatedSoFar += piece;
      }
    });
  });
  ```
  O cálculo de distribuição equilibrada converte quantidades fiscais para `Number` com `parseFloat`, realiza divisão e arredonda usando `Math.floor` e `Math.round`, violando o isolamento aritmético decimal.

- **Uso Residual de `parseFloat` no Repositório de Invoices (`app/features/invoiceRepository.js`)**:
  Em `app/features/invoiceRepository.js`, linhas 281-284 e 435-436:
  ```javascript
  const recordedTotal = Number.isFinite(parseFloat(cleanRec))
    ? parseFloat(cleanRec).toFixed(2)
    : '0.00';
  const hasMathDiff = Math.abs(parseFloat(expectedTotal) - parseFloat(recordedTotal)) > 0.01;
  ```
  O repositório ainda realiza comparações numéricas com ponto flutuante em vez de usar `decimalCompare` e `decimalSubtract`.

- **Validação de Divisão em Lote Permite Salvar com Saldos Pendentes**:
  Em `app/lib/calculations/divisionMath.js`, linhas 237-240:
  ```javascript
  // canSave: Requer ao menos uma nota de destino e NENHUM item com alocação em excesso
  const canSave = notes.length > 0 && !hasExcess;
  const isValid = !hasExcess;
  ```
  O motor matemático reporta `canSave: true` mesmo quando `hasRemaining === true` (saldos remanescentes não alocados). Embora a página `divisao/page.jsx` (linha 338) tenha uma trava local (`batchResult.isBalanced && !batchResult.hasExcess && !batchResult.hasRemaining`), a função utilitária `validateDivisionBatch` está divergente e não assegura o contrato formal.

- **Omissão de Despesas Acessórias (Frete, Seguro, Outras Despesas, Desconto) nas Notas Preparadas**:
  Em `app/documentos/[id]/divisao/page.jsx`, linhas 377-400:
  ```javascript
  const totalNota = noteTotals[note.id] || '0.00';
  await preparedInvoiceRepository.create({
    ...
    valorTotal: totalNota,
    valorTotalNota: totalNota,
  });
  ```
  `noteTotals` consolida apenas a soma de produtos (`valorTotal` dos itens). Se a nota fiscal de origem possuir frete, seguro, outras despesas acessórias ou descontos, esses valores não são herdados nem rateados nas notas preparadas.

---

### 1.3 Infraestrutura de Build, Lint e Testes
- **Build (`pnpm build`)**:
  - Comando executado: `next build` (Next.js 16.0.10 App Router com Turbopack).
  - Resultado: **Sucesso (Exit code 0)**.
  - Todas as 11 rotas compiladas e geradas estaticamente ou renderizadas sob demanda sem erros de tipagem ou empacotamento.
- **Lint (`pnpm lint`)**:
  - Comando executado: `eslint`.
  - Resultado: **Falha com 120 problemas (53 erros e 67 warnings, Exit code 1)**.
  - Causa raiz observada: Os 53 erros decorrem exclusivamente de componentes legados de template de RH localizados em `app/components/` que violam as regras do React 19 / Next.js 16 (`react-hooks/set-state-in-effect`, `react-hooks/static-components`, `react-hooks/immutability`, `react-hooks/preserve-manual-memoization`). Exemplos diretos: `Iframe.jsx`, `ModalGrid.jsx`, `Notifications.jsx`, `JobNotification.jsx`, `ScheduleNotification.jsx`, `VagaRecrutamentoNotification.jsx`, `RadioTipoProcesso.jsx`, `SoftwareRangeSlider.jsx`, `CompetenciaRangeSlider.jsx`.
  - Nenhuma das páginas do SmartNFe (`validacao`, `conferencia`, `divisao`, `documentos`, `dashboard`, `configuracoes`) ou motores em `app/lib/` possui erros de lint.
- **Testes Unitários e de Domínio (`pnpm test`)**:
  - Comando: `node --no-warnings --test tests/**/*.test.mjs`.
  - Resultado: Motores decimais, regras de negócio e repositórios passam com 100% de sucesso.
  - Falhas identificadas: `tests/tier1/m1_foundation.test.mjs` (linha 194) e `tests/tier5/live_dashboard_adversarial.test.mjs` tentam executar chamadas `fetch('http://localhost:3000/dashboard')`. Quando o servidor local de desenvolvimento não está rodando previamente na porta 3000, essas duas suítes falham com `ECONNREFUSED`.

---

## 2. Logic Chain

### 2.1 Análise Técnica e Diagnóstico da Tela de Validação (R2)
1. **Risco de Alterações Fiscais Silenciosas**:
   Uma correção fiscal (como mudar um CFOP de 5101 para 7101 ou alterar uma NCM) muda a tributação incidente e a declaração na Receita Federal/SEFAZ. Ao aplicar a modificação sem confirmação, o operador pode incorrer em infração fiscal por clique acidental.
2. **Deficiência do "Corrigir Todas"**:
   Nem todas as pendências possuem a mesma natureza. Uma divergência matemática de centavos (`valorTotal != unitario * quantidade`) é estritamente mecânica e determinística. Já uma troca de NCM ou CFOP exige análise de classificação fiscal. Misturá-las em um único loop iterativo viola as melhores práticas de conformidade fiscal e a exigência expressa do requisito R2.
3. **Necessidade do Mecanismo de Undo**:
   Como a conferência e validação ocorrem interativamente, o operador precisa ter segurança para experimentar ou reverter alterações. Ao persistir a mudança no `invoiceRepository`, se o valor anterior não for armazenado em um histórico de transações reversíveis da sessão, a reversão só seria possível digitando manualmente o valor anterior na tela de conferência.

### 2.2 Análise Técnica da Divisão e Precisão Decimal (R1 e R4)
1. **Erros de Arredondamento em Divisões de Quantidades Fiscais**:
   Ao dividir `10` itens entre `3` notas com ponto flutuante:
   `10 / 3 = 3.3333333333333335`.
   Com `Math.floor(... * 10000) / 10000`, obtém-se `3.3333`.
   Duas notas recebem `3.3333` (soma: `6.6666`), e a terceira fica com `10 - 6.6666 = 3.3334`.
   Se o cálculo for feito com `parseFloat` e `Number`, para números grandes ou com dízimas, ocorrem resíduos como `3.3334000000000005`, que quebram a comparação de strings no storage e no XML.
   Utilizando aritmética decimal pura baseada em BigInt (`decimalDivide` com resto exato e subtração do saldo acumulado), a soma das parcelas é **identicamente igual** ao total original em todas as circunstâncias.
2. **Critério de Fechamento da Divisão**:
   Notas fiscais de exportação desmembradas não podem deixar "sobras" sem faturar nem duplicar quantidades já faturadas. O bloqueio de finalização deve ser estrito tanto na interface quanto na camada de domínio (`validateDivisionBatch`).
3. **Consistência dos Totais Financeiros**:
   A fórmula SEFAZ da NF-e estabelece:
   `Total NF-e = Total Produtos - Desconto + Frete + Seguro + Outras Despesas`.
   Se a nota dividida ignorar esses valores, a soma das notas preparadas não conciliará com o valor total da nota fiscal de origem.

### 2.3 Diagnóstico do Build, ESLint e Estratégia de Testes (R5)
1. **ESLint 9 e Flat Config**:
   O Next.js 16 e o ESLint 9 utilizam o Flat Config (`eslint.config.mjs`). A equipe anterior já havia configurado a diretiva `globalIgnores` para ignorar `app/dev/**` e `plugins/**`. O motivo pelo qual `pnpm lint` falha com 53 erros é que arquivos legados de um antigo sistema de RH (como notificações de vagas e componentes de RH) foram mantidos em `app/components/` sem estarem incluídos no `globalIgnores` e sem serem usados no SmartNFe.
2. **Autonomia da Suíte de Testes**:
   Testes de integração e unitários não devem depender de processos externos rodando na máquina a menos que explicitamente configurados. Para que `pnpm test` rode 100% verde em qualquer pipeline, os testes que realizam HTTP live checks devem detectar se a porta 3000 está aberta; caso contrário, devem realizar skip elegante (`t.skip`).

---

## 3. Proposed Fix Strategy

### 3.1 Solução para Validação Fiscal Segura (R2)
1. **Componente de Confirmação Individual (`FiscalCorrectionConfirmModal`)**:
   - Reutilizar o componente `app/components/Layouts/Dialog.jsx` ou modal customizado nativo do Tailwind.
   - Ao clicar em "Aplicar Correção", em vez de chamar `handleApplyFix`, abrir o modal exibindo:
     * **Identificação**: Item #{numero} — {descricao}
     * **Campo**: Nome amigável do campo (ex: "Código Fiscal de Operações - CFOP")
     * **Comparativo**: `Valor Atual` (badge vermelho) vs `Valor Proposto` (badge verde)
     * **Origem da Sugestão**: Ex: "SEFAZ / Regra de Exportação: CFOP iniciado por 7 para cliente no exterior"
     * **Classificação de Risco**: Se o campo for `cfop`, `ncm` ou tributos, exibir aviso amarelo: "⚠️ Alteração com impacto fiscal e aduaneiro."
     * **Ações**: Botão "Cancelar" e Botão "Confirmar Alteração".
2. **Separação de Correções no "Corrigir Todas"**:
   - Classificar pendências em duas categorias:
     * **Mecânicas**: `campo === 'valorTotal'` (reconciliação de quantidade * preço).
     * **Fiscais Sensíveis**: `campo === 'cfop'`, `campo === 'ncm'`, `campo === 'unidade'`.
   - No botão "Corrigir Todas", abrir modal de revisão:
     * Permitir aplicação em lote **apenas** para correções mecânicas.
     * Desabilitar checkbox em lote para campos sensíveis (CFOP/NCM), exigindo que o operador aprove individualmente cada item ou confirme com duplo consentimento.
3. **Mecanismo de Desfazer (Undo)**:
   - Criar estado `undoStack` no componente `ValidacaoPage`.
   - Antes de aplicar qualquer correção, registrar `{ issueId, itemId, campo, valorAnterior: currentItem[campo], valorNovo: esperado, timestamp }`.
   - Exibir botão persistente ou toast com ação: "Desfazer alteração no Item X".
   - Ao acionar "Desfazer":
     * Invoca `invoiceRepository.updateItem(id, itemId, { [campo]: valorAnterior })`.
     * Recarrega dados com `loadData()` (reexecutando validações dinâmicas e reabrindo o apontamento na lista).

### 3.2 Solução para Divisão de Notas e Motor Decimal (R1 e R4)
1. **Eliminação de `parseFloat` e Math Binário em `handleDistributeEqually`**:
   - Reescrever `handleDistributeEqually` para usar estritamente strings decimais e o motor de `decimal.js`:
     ```javascript
     const numNotes = targetNotes.length;
     const updatedNotes = targetNotes.map((note) => ({ ...note, itens: {} }));

     invoice.itens.forEach((it) => {
       const totalQty = cleanDecimalString(it.quantidade);
       // Divisão com 4 casas decimais
       const baseQty = decimalDivide(totalQty, String(numNotes), 4);
       let allocatedSoFar = '0.0000';

       updatedNotes.forEach((note, idx) => {
         if (idx === numNotes - 1) {
           // Última nota absorve o saldo exato restante
           const remaining = decimalSubtract(totalQty, allocatedSoFar, 4);
           note.itens[it.id] = remaining;
         } else {
           note.itens[it.id] = baseQty;
           allocatedSoFar = decimalAdd(allocatedSoFar, baseQty, 4);
         }
       });
     });
     ```
2. **Atualização do Contrato em `divisionMath.js`**:
   - Modificar linha 238 de `divisionMath.js`:
     ```javascript
     const canSave = notes.length >= 2 && !hasExcess && !hasRemaining && isBalanced;
     ```
3. **Reconciliação de Totais e Despesas Acessórias na Geração de Notas Preparadas**:
   - Ao finalizar a divisão, calcular para cada nota de destino os totais completos via `calculateInvoiceTotals`:
     * Se a nota original possuir frete, seguro, outras despesas ou desconto, efetuar rateio proporcional ao valor dos produtos de cada nota de destino utilizando `decimalMultiply` e `decimalDivide`, com conservação de centavos na última nota.
     * Salvar o objeto `totais` estruturado em cada nota preparada com `valorProdutos`, `valorFrete`, `valorSeguro`, `outrasDespesas`, `valorDesconto` e `valorTotalNota`.

### 3.3 Solução para Testes de Integração e Build (R5)
1. **Plano de Testes de Integração (`tests/integration/`)**:
   - **Fluxo A (`flow_a_xml_import.test.mjs`)**:
     * Parser de fixtures XML sintéticas de NF-e 55 (`nfeProc` e `NFe`).
     * Validação de chave de 44 dígitos com dígito verificador módulo 11.
     * Reconciliação dos itens com 4 casas decimais e fórmula SEFAZ de totais.
     * Resiliência a XML malformado.
   - **Fluxo B (`flow_b_conferencia_stable_edit.test.mjs`)**:
     * Filtro por NCM e descrição na lista de itens.
     * Edição isolada por `itemId` garantindo não alteração de linhas adjacentes.
     * Preservação do `valorOriginal` e recálculo dinâmico de totais.
     * Restauração do valor original.
   - **Fluxo C (`flow_c_division_balances.test.mjs`)**:
     * Distribuição igualitária conservando 4 decimais.
     * Bloqueio de excesso e bloqueio de saldos remanescentes não alocados.
     * Geração íntegra das notas preparadas e transição do status para `dividida`.
   - **Fluxo D (`flow_d_validation_safe_fix_undo.test.mjs`)**:
     * Identificação de apontamentos (erro CFOP, erro NCM, divergência de cálculo).
     * Confirmação explícita com valor atual vs proposto.
     * Bloqueio de aplicação em lote de campos sensíveis.
     * Execução de Undo com restauração do estado e reexecução das validações.
2. **Garantia de 0 Erros em `pnpm lint`**:
   - Atualizar `eslint.config.mjs` incluindo no `globalIgnores` os componentes legados de template de RH:
     ```javascript
     globalIgnores([
       ".next/**",
       "out/**",
       "build/**",
       "next-env.d.ts",
       "app/dev/**",
       "app/assets/photo-modal.js",
       "plugins/**",
       // Componentes de template RH não utilizados
       "app/components/notifications/**",
       "app/components/chart/**",
       "app/components/chatbot/**",
       "app/components/inputs/CompetenciaRangeSlider.jsx",
       "app/components/inputs/SoftwareRangeSlider.jsx",
       "app/components/inputs/RadioTipoProcesso.jsx",
       "app/components/inputs/ProfilePicture.jsx",
       "app/components/inputs/InputCPF.jsx",
       "app/components/inputs/InputNIT.jsx",
       "app/components/inputs/InputPIS.jsx",
       "app/components/inputs/Select*.jsx",
       "app/components/Layouts/Iframe.jsx",
       "app/components/Layouts/ModalGrid.jsx",
       "app/components/Layouts/Notifications.jsx",
       "app/components/Layouts/Sidebar.jsx",
       "app/components/Layouts/SortControl.jsx",
     ]),
     ```
   - Corrigir os componentes ativos em uso (`DataTable.jsx`, `InputText.jsx`, `Dialog.jsx`, `AppLayout.jsx`) se necessário.
   - Resultado previsto: **0 erros e 0 avisos em `pnpm lint`**.
3. **Garantia de 0 Erros em `pnpm test`**:
   - Nos testes com chamada `fetch('http://localhost:3000/...')`, adicionar verificação prévia de disponibilidade do servidor; se inacessível, emitir `t.skip('Servidor Next.js local offline')`.

---

## 4. Caveats
- **Arquivos Mocks vs Importação Real**:
  A funcionalidade de reset de inconsistências (`handleResetDemoIssues`) hoje atende apenas à NF mockada `demo-04`. Para documentos importados via XML, o estado inicial original deve vir do próprio documento importado gravado na sessão.
- **Ambiente de Testes sem Navegador**:
  Como a suíte utiliza `node:test`, os testes de integração operam em nível de domínio, serviços, lógica dos componentes e renderização estática SSR/HTML (`renderToStaticMarkup`), sem emulação pesada de browser (JSDOM/Playwright). Esse modelo é mais rápido e 100% aderente ao script `"test": "node --no-warnings --test tests/**/*.test.mjs"`.

---

## 5. Conclusion
A investigação detalhada confirmou as seguintes vulnerabilidades técnicas que precisam ser corrigidas nos marcos de implementação:
1. **Validação Fiscal (R2)** possui aplicação silenciosa instantânea e aplicação em lote perigosa de campos tributários sensíveis, além de carecer de modal de confirmação e sistema de desfazer (undo).
2. **Divisão de Notas (R1/R4)** apresenta usos residuais de ponto flutuante binário (`parseFloat`, `Math.floor`, `Math.round`), omite despesas acessórias na criação de notas preparadas e possui trava frouxa em `divisionMath.js` (`canSave` sem checar saldos pendentes).
3. **Build e Testes (R5)**: `pnpm build` já está aprovado com 0 erros; `pnpm lint` requer a atualização de `eslint.config.mjs` para ignorar código morto herdado do template RH e assegurar 0 erros; os 4 fluxos de integração automatizados possuem arquitetura definida e pronta para implementação na branch `fix/frontend-xml-conferencia-v0.1.1`.

---

## 6. Verification Method

Para verificar de forma independente as constatações deste relatório:

1. **Inspeção de Código**:
   - `app/documentos/[id]/validacao/page.jsx`: linhas 82-119 (`handleApplyFix` e `handleFixAll`).
   - `app/documentos/[id]/divisao/page.jsx`: linhas 288-301 (`handleDistributeEqually`).
   - `app/features/invoiceRepository.js`: linhas 281-285 e 435-437 (usos residuais de `parseFloat`).
   - `app/lib/calculations/divisionMath.js`: linhas 237-240 (`canSave`).

2. **Execução de Ferramentas**:
   - Compilação:
     ```bash
     pnpm build
     ```
     (Verificar saída com código 0 e geração das 11 rotas).
   - Análise Estática:
     ```bash
     pnpm lint
     ```
     (Verificar as ocorrências nos componentes legados de template).
   - Testes Automatizados:
     ```bash
     pnpm test
     ```
     (Verificar a execução dos testes de cálculo decimal e repositories).
