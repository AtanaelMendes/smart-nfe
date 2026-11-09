# Relatório de Levantamento e Análise Técnica — Survey Explorer 1

- **Data/Hora**: 2026-11-09T19:30:00Z
- **Autor**: Survey Explorer 1 (teamwork_explorer)
- **Escopo**: Repositório Git, `app/documentos/[id]/conferencia/page.jsx`, componentes reutilizáveis em `app/components/` e requisitos R1 e R4 (Conferência de Produtos e Cálculos Decimais).
- **Diretório de Trabalho**: `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_survey_1\`

---

## 1. Observation

### 1.1 Estado do Repositório Git e Controle de Versão
- **Comando executado**: `git status`
  - Saída verbatim:
    ```
    On branch fix/frontend-xml-conferencia-v0.1.1
    Changes not staged for commit:
    	modified:   .agents/teamwork/ORIGINAL_REQUEST.md
    	... (apenas metadados em .agents/teamwork/)
    Untracked files:
    	... (apenas metadados em .agents/teamwork/)
    no changes added to commit (use "git add" and/or "git commit -a")
    ```
- **Comando executado**: `git branch -a`
  - Saída verbatim:
    ```
    * fix/frontend-xml-conferencia-v0.1.1
      master
      remotes/origin/HEAD -> origin/master
      remotes/origin/master
      remotes/origin/vercel/react-server-components-cve-vu-w5k6aq
    ```
- **Comando executado**: `git log -n 5 --oneline --decorate`
  - Saída verbatim:
    ```
    6474482 (HEAD -> fix/frontend-xml-conferencia-v0.1.1, origin/master, origin/HEAD, master) FEAT: primeira versao com IA
    8e72a99 FEAT: primeira versao com IA
    e1bb42d FEAT: primeira versao com IA
    cb1c558 FEAT: primeira versao com IA
    9c1e65f FEAT: primeira versao com IA
    ```
- **Constatação**: A branch `fix/frontend-xml-conferencia-v0.1.1` já existe, está atualmente com checkout ativo, sincronizada no commit `6474482` (mesmo commit de `master` e `origin/master`). O código-fonte está limpo de alterações não comitadas, atendendo rigorosamente à restrição de não comitar diretamente na `master`.

---

### 1.2 Análise de `app/documentos/[id]/conferencia/page.jsx`

#### A. Falha Crítica de Identificação e Indexação na Edição (`handleItemChange`)
Em `app/documentos/[id]/conferencia/page.jsx`:
- **Definição de `handleItemChange` (linhas 67-83)**:
  ```javascript
  // Edição direta de campo na tabela
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value, modificado: true };

      // Recalcula valor total do item se mudar quantidade ou valor unitário
      if (field === 'quantidade' || field === 'valorUnitario') {
        const q = parseFloat(String(item.quantidade).replace(',', '.')) || 0;
        const u = parseFloat(String(item.valorUnitario).replace(',', '.')) || 0;
        item.valorTotal = (q * u).toFixed(2);
      }

      copy[index] = item;
      return copy;
    });
    setHasChanges(true);
  };
  ```
- **Filtro de busca e renderização dos itens (linhas 130-140 e 357-376)**:
  ```javascript
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (it) =>
        it.codigo?.toLowerCase().includes(term) ||
        it.descricao?.toLowerCase().includes(term) ||
        it.ncm?.toLowerCase().includes(term) ||
        it.cfop?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);
  ```
  ```javascript
  {filteredItems.map((item, index) => {
    const isModified = item.modificado;
    return (
      <tr key={item.id || index} ...>
        ...
        <input
          type="text"
          value={item.codigo || ''}
          onChange={(e) => handleItemChange(index, 'codigo', e.target.value)}
  ```
- **Constatação**: `filteredItems.map` passa `index` (a posição do item na lista **filtrada**) para `handleItemChange`. Quando há filtro de busca ou ordenação, `index` não corresponde ao índice do produto no array mestre `items`. `copy[index] = item` corrompe o produto errado da nota fiscal (geralmente o primeiro item `items[0]`), mantendo o item visível intacto e gerando perda de integridade irreversível. Além disso, `item.id` estável é ignorado na atualização.

#### B. Cálculos Monetários e Totais com Ponto Flutuante Binário (IEEE 754)
- Linha 74-76:
  ```javascript
  const q = parseFloat(String(item.quantidade).replace(',', '.')) || 0;
  const u = parseFloat(String(item.valorUnitario).replace(',', '.')) || 0;
  item.valorTotal = (q * u).toFixed(2);
  ```
- Linha 89-91:
  ```javascript
  const totalProdutos = items.reduce((acc, curr) => {
    return acc + (parseFloat(String(curr.valorTotal).replace(',', '.')) || 0);
  }, 0);
  ```
- Linhas 96-100:
  ```javascript
  totais: {
    ...invoice.totais,
    valorTotalProdutos: totalProdutos.toFixed(2),
    valorTotalNota: totalProdutos.toFixed(2),
  },
  ```
- Linha 144-147:
  ```javascript
  const totalGeral = useMemo(() => {
    return items.reduce((acc, curr) => {
      return acc + (parseFloat(String(curr.valorTotal).replace(',', '.')) || 0);
    }, 0);
  }, [items]);
  ```
- **Constatação**:
  1. Uso de `parseFloat` e `.toFixed(2)` introduz os clássicos erros binários de arredondamento IEEE 754.
  2. Quantidades com 4 casas decimais e preços unitários com precisão estendida sofrem truncamento prematuro.
  3. Em `handleSave`, `valorTotalNota` é substituído arbitrariamente por `totalProdutos.toFixed(2)`, descartando e zerando frete, seguro, outras despesas e descontos presentes na NF-e original.
  4. Não há validação para quantidades negativas ou entradas inválidas (ex: `-10`, strings não numéricas).
  5. Os motores de cálculo BigInt já implementados em `app/lib/calculations/decimal.js` e `app/lib/calculations/invoiceTotals.js` (`calculateItemTotal`, `calculateInvoiceTotals`) não são utilizados.

#### C. Ausência de Armazenamento de Dados Originais e Ação de Restauração
- Em `conferencia/page.jsx`, o estado de itens é inicializado em `useEffect` (linhas 50-53):
  ```javascript
  const data = await invoiceRepository.findById(id);
  if (data) {
    setInvoice(data);
    setItems(data.itens || []);
  }
  ```
- Não há clone imutável inicial nem campo `item.valorOriginal` preservado na página.
- Não há interface visual de comparação de valores prévios vs novos.
- Não existe funcionalidade nem botão de restauração/undo por item ou global.

#### D. Navegação por Teclado e Foco
- Os campos da tabela são elementos HTML `<input type="text">` puros (linhas 372-445).
- Não há manipuladores `onKeyDown` (teclas `Enter` ou `Escape` não são tratadas; `Enter` não navega para a linha seguinte na mesma coluna).
- Não há controle de foco programático (`useRef`, `focus()`, `data-col`, `data-row`).

---

### 1.3 Inventário de Componentes Reutilizáveis em `app/components/`
- **`app/components/buttons/Button.jsx`**: Suporta variantes (`primary`, `secondary`, `success`, `danger`, `warning`), outline, disabled e tamanhos (`small`, `default`, `large`). Perfeito para botões de ação e restauração.
- **`app/components/buttons/PillsBadge.jsx`**: Suporta tipos (`default`, `primary`, `danger`, `success`, `warning`, `primary-dark`, `warning-dark`) e prop `small`. Ideal para os badges de modo (Demonstração vs Importação Local), indicador de documento XML e sinalizador "Alterado".
- **`app/components/Layouts/TooltipComponent.jsx`**: Permite tooltip nativo hover sem bibliotecas externas. Ideal para exibir o valor original, divergências de cálculo e explicações de inconsistências em cada célula.
- **`app/components/Layouts/Dialog.jsx` e `Confirm.jsx`**: Diálogos modais acessíveis para confirmação de ações destrutivas (ex: restaurar todos os itens da nota ou sair com alterações pendentes).
- **`app/components/cards/Card.jsx`**: Permite estruturação semântica com `Card`, `CardTitle`, `CardBody` e `CardActions`.
- **`app/components/table/DataTable.jsx`**: Implementa listagem e filtragem geral, porém o modo de conferência exige edição in-line de alta densidade por célula com navegação via teclado, que é mais eficientemente gerenciada pela estrutura de grade customizada da tela de conferência.

---

## 2. Logic Chain

1. **Premissa de Integridade de Estado (R1)**: A edição de um produto em uma tabela filtrada/ordenada nunca pode depender da posição visual no DOM ou índice de slice.
   - *Evidência*: Linha 357 itera `filteredItems.map((item, index) => ...)` e passa `index` para `handleItemChange(index, ...)`. A linha 70 muta `copy[index]` no array total `items`.
   - *Dedução*: Filtrar por NCM resulta em `filteredItems[0]` apontando para um produto X, mas `copy[0]` modifica o produto Y no início do array completo. A chave estável `item.id` (ou `itemId`) deve ser o parâmetro exclusivo de identificação em `handleItemChange(itemId, field, value)`.

2. **Premissa de Precisão Aritmética (R1)**: Cálculos fiscais e monetários em JavaScript não podem utilizar operadores nativos de ponto flutuante binário sob risco de discrepâncias de centavos e dízimas periódicas.
   - *Evidência*: Linhas 76, 90, 98 e 145 utilizam `parseFloat`, `*`, `reduce` com soma nativa e `.toFixed(2)`.
   - *Dedução*: As funções `calculateItemTotal` e `calculateInvoiceTotals` de `invoiceTotals.js` utilizam `BigInt` puro e escala Half-Up conforme ABNT NBR 5891. Sua integração em `conferencia/page.jsx` elimina 100% dos erros IEEE 754.

3. **Premissa de Conservação de Componentes da NF-e (R1)**: O valor total de uma nota fiscal de exportação (modelo 55) é composto por: `Produtos - Desconto + Frete + Seguro + Outras Despesas`.
   - *Evidência*: Linha 99 define `valorTotalNota: totalProdutos.toFixed(2)`.
   - *Dedução*: Salvar a nota nesta tela atualmente descarta os componentes de frete, seguro e despesas da nota. Substituir pelo cálculo de `calculateInvoiceTotals(items, invoice.totais)` garante a preservação desses campos.

4. **Premissa de Auditabilidade Visual e Reversibilidade (R4)**: O usuário fiscal necessita comparar as alterações realizadas com os dados originais importados da NF-e e restaurá-las com 1 clique se necessário.
   - *Evidência*: O estado atual em `conferencia/page.jsx` descarta os valores originais ao sobrescrever campos e não oferece ação de restauração.
   - *Dedução*: Armazenar um snapshot imutável em `item.valorOriginal` no carregamento e na primeira edição permite:
     - Renderizar o valor original riscado ao lado do valor editado.
     - Disponibilizar botão de restauração por linha (`faRotateLeft`).
     - Disponibilizar botão de restauração em massa ("Desfazer todas").

5. **Premissa de Ergonomia Operacional (R4)**: Conferência de dezenas de itens em faturas de exportação requer fluxo de teclado ininterrupto.
   - *Evidência*: Inputs nativos não tratam `Enter`, exigindo cliques manuais com o mouse em cada célula.
   - *Dedução*: Um manipulador de teclado com `data-field` e `data-index` permitindo que a tecla `Enter` avance verticalmente para o mesmo campo na próxima linha reduz o tempo de conferência e melhora a ergonomia sem necessitar de novas dependências.

---

## 3. Caveats

1. **Execução de Servidor Dev / Testes Live HTTP**: Conforme a restrição crítica do usuário no workspace (`http://localhost:3000/dashboard`), o comando `node --test tests/tier5/live_dashboard_adversarial.test.mjs` tenta conectar via HTTP na porta 3000. Como o servidor não está ativo neste instante na porta 3000 em background pelo usuário, testes de Live HTTP falham com `ECONNREFUSED`. Todas as 44 suites de testes unitários offline (`m1_foundation`, `m2_domain`, `m2_decimal_adversarial_stress`) executam e passam com 100% de sucesso.
2. **Compatibilidade de Identificadores Mocks vs Importados**: Os mocks existentes usam IDs como `'d1-1'`, `'d2-1'`. O importador real de XML (R3) precisará atribuir IDs únicos garantidos (ex: `xml-item-${idx + 1}`) para que a conferência por `itemId` funcione perfeitamente tanto com dados mockados quanto com XMLs reais importados.
3. **Não Quebrar Consumidores e Layouts Existentes**: A tela de conferência é uma das principais telas do fluxo fiscal. Modificações devem preservar o padrão visual do Tailwind CSS 4, respeitar o tema claro/escuro e não introduzir bibliotecas pesadas de formulários ou tabelas.

---

## 4. Conclusion & Proposed Fix Strategy (R1 & R4)

A análise confirma que a base atual já possui o motor decimal e os utilitários de cálculo consolidados (`app/lib/calculations/`), mas a tela `app/documentos/[id]/conferencia/page.jsx` sofre com indexação incorreta na edição, perda de frete/seguro no salvamento, cálculos em ponto flutuante binário e carência dos novos indicadores visuais exigidos por R4.

### Estratégia de Correção Proposta para o Teamwork Implementer:

#### 1. Identificação Estável por `itemId` e Estado Imutável
- Alterar assinatura de `handleItemChange(itemId, field, value)`.
- Atualizar o array `items` mapeando por item:
  ```javascript
  const handleItemChange = (itemId, field, value) => {
    setItems((prevItems) => {
      return prevItems.map((item) => {
        const currentId = item.id || String(item.item);
        if (currentId !== itemId) return item;

        // Snapshot inicial imutável
        const original = item.valorOriginal || {
          codigo: item.codigo,
          descricao: item.descricao,
          ncm: item.ncm,
          cfop: item.cfop,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
        };

        const updated = {
          ...item,
          valorOriginal: original,
          [field]: value,
        };

        // Recálculo decimal exato da linha
        if (field === 'quantidade' || field === 'valorUnitario') {
          const qty = field === 'quantidade' ? value : item.quantidade;
          const unit = field === 'valorUnitario' ? value : item.valorUnitario;
          updated.valorTotal = calculateItemTotal(unit, qty);
        }

        // Verifica se houve modificação real em relação ao original
        const isModified = Object.keys(original).some(
          (k) => String(updated[k] ?? '').trim() !== String(original[k] ?? '').trim()
        );
        updated.modificado = isModified;

        return updated;
      });
    });
    setHasChanges(true);
  };
  ```

#### 2. Restauração de Valores Originais
- Implementar `handleRestoreItem(itemId)` e `handleRestoreAll()` restaurando campos a partir de `item.valorOriginal`.

#### 3. Recálculo e Preservação de Totais da Nota
- Utilizar `calculateInvoiceTotals(items, invoice.totais)` em `calculatedTotals` (`useMemo`) e em `handleSave`.
- Preservar rigorosamente `valorFrete`, `valorSeguro`, `outrasDespesas` e `valorDesconto`.
- Expor comparação de totais: `diffProducts` e `diffInvoice` com `decimalSubtract`.

#### 4. Navegação por Teclado e Foco
- Adicionar evento `onKeyDown` nas células de input:
  - `Enter`: avança o foco para o mesmo campo na próxima linha filtrada.
  - `Escape`: restaura o valor original do item ou cancela o foco.

#### 5. Indicadores Visuais de R4
- **Indicador de Documento**: Badge no cabeçalho destacando "XML NF-e Mod 55" (com ícone `faFileCode`) ou "PDF".
- **Modo**: Badge "Modo Demonstração" (se `isDemo`) ou "Importação Local (Memória de Sessão)" (se importado localmente).
- **Contagem Real de Produtos**: Card com produtos importados do XML, produtos exibidos após filtro e produtos modificados.
- **Totais Comparativos**: Card de totais exibindo Original vs Recalculado e destacando qualquer divergência em reais.
- **Comparação de Valores na Linha**: Se o item for modificado, exibir o valor original riscado ao lado do novo total e um botão com ícone `faRotateLeft` para restaurar o item.
- **Avisos de Inconsistências**: Alertas visuais e resumo de inconsistências para itens sem NCM de 8 dígitos, CFOP não iniciado em 7 para exportação ou quantidades negativas.

---

## 5. Verification Method

Para verificar independentemente os pontos levantados neste relatório:
1. **Verificação de Branches**:
   ```powershell
   git status
   git branch -a
   ```
   *Condição de invalidação*: Estar na branch `master` ou haver divergência entre a branch local e remota.
2. **Inspeção de Código em `conferencia/page.jsx`**:
   - Inspecionar linhas 67 a 83 e linhas 357 a 376 em `app/documentos/[id]/conferencia/page.jsx`.
   - Confirmar que `handleItemChange` recebe `index` e indexa diretamente `copy[index]`.
   - Confirmar ausência de `calculateItemTotal` e `calculateInvoiceTotals`.
3. **Execução da Suite de Testes Offline**:
   ```powershell
   node --no-warnings --test tests/tier1/m2_domain.test.mjs
   node --no-warnings --test tests/tier5/m2_decimal_adversarial_stress.test.mjs
   ```
   *Resultado esperado*: 44 testes em `m2_domain.test.mjs` passam com 0 falhas; 25 testes em `m2_decimal_adversarial_stress.test.mjs` passam com 0 falhas.
