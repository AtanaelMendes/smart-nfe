# Relatório de Testes de Estresse Adversarial — Milestone 1 (Foundation & Dashboard)

**Agente:** `teamwork_challenger_m1_1` (EMPIRICAL CHALLENGER / critic, specialist)  
**Data/Hora:** 2026-11-04T15:10:00Z  
**Alvo da Análise:** Componentes e Módulos do Milestone 1 (`DataTable.jsx`, `currency.js`, `dates.js`, `status.js`, `mockInvoices.js`, `/dashboard`)  
**Metodologia:** Testes de estresse empíricos, verificação em runtime com Node 24 (`node:test`), renderização server-side (`react-dom/server` + SWC), injeção de entradas maliciosas/limite e auditoria matemática estrita.

---

## 1. Challenge Summary

**Overall risk assessment**: **LOW** (Aprovado com ressalvas construtivas para os marcos subsequentes M2/M4/M5).

A implementação do Milestone 1 demonstra notável maturidade técnica:
- **Zero exceções não tratadas** no fluxo normal de execução do `/dashboard`.
- **Zero renderização de `NaN` ou valores corrompidos** na interface.
- Ausência absoluta de `moment.js` no código e no `package.json`.
- A suite completa de 69 testes automatizados (10 testes do Tier 1 e 59 testes do Tier 5) passa com **100% de sucesso**.
- O servidor de desenvolvimento em `http://localhost:3000/dashboard` permanece estável, responsivo e respondendo HTTP 200 com DOM íntegro.

Foram identificadas **5 vulnerabilidades de fronteira e inconsistências numéricas** que não impedem a entrega do Milestone 1 (Dashboard), mas devem ser catalogadas como débitos técnicos/alertas para o Milestone 2 (Cálculos Decimais e Mocks) e Milestone 4 (Conferência Fiscal).

---

## 2. Detailed Challenges & Empirical Findings

### [Medium] Challenge 1: `DataTable.jsx` quebra com `TypeError` se `data={null}` for fornecido

- **Suposição desafiada:** Supôs-se que o consumidor sempre passa um `Array` ou omite a prop (`data = []`).
- **Cenário de ataque:** Em aplicações React com carregamento assíncrono de dados (`const [data, setData] = useState(null)`), o valor inicial passado para a tabela frequentemente é `null` enquanto a requisição está em andamento. O parâmetro default `data = []` do ES6 **não é ativado** quando o valor é explicitamente `null` (apenas quando `undefined`).
- **Evidência empírica:**
  Na linha 171 de `app/components/table/DataTable.jsx`:
  ```jsx
  <td colSpan={effectiveColumns.length || 1} className={cellPadding}>
    Exibindo {filteredData.length} de {data.length} registros
  </td>
  ```
  Ao invocar `<DataTable data={null} />`, o Node/React lança:
  ```
  TypeError: Cannot read properties of null (reading 'length')
  ```
  derrubando toda a árvore de renderização do componente.
- **Blast radius:** Quebra da tela caso um repositório assíncrono retorne `null` durante carregamento ou erro.
- **Mitigação sugerida:** Substituir `data.length` na linha 171 por `data?.length || 0` ou normalizar no início do componente:
  ```javascript
  const safeData = Array.isArray(data) ? data : [];
  ```

---

### [Medium] Challenge 2: `parseBRL()` em `currency.js` corrompe strings numéricas com ponto decimal

- **Suposição desafiada:** Supôs-se que `parseBRL` só receberá strings no padrão brasileiro (ex: `"1.250,50"`).
- **Cenário de ataque:** Se um serviço ou API passar uma string decimal padrão em formato ponto (ex: `"1250.50"`), a implementação atual executa:
  ```javascript
  const cleaned = String(strVal)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  ```
- **Evidência empírica:**
  `parseBRL("1250.50")` remove o ponto e avalia para `125050` (multiplica o valor monetário por 100!).
- **Blast radius:** Erro silencioso em cálculos fiscais se dados decimais padrão forem acidentalmente passados para `parseBRL`.
- **Mitigação sugerida:** Inspecionar se a string contém vírgula antes de remover todos os pontos: se contiver apenas ponto e duas casas decimais sem vírgula, tratá-lo como separador decimal.

---

### [Low/Info] Challenge 3: Inconsistência matemática na geração de itens em `demo-02`

- **Suposição desafiada:** Os itens mockados em todos os cenários respeitam a identidade fiscal `quantidade * valorUnitario == valorTotal`.
- **Cenário de ataque:** Auditoria de integridade linha por linha em `app/lib/data/mockInvoices.js` (linhas 81-99):
  ```javascript
  itens: Array.from({ length: 25 }, (_, idx) => {
    const num = idx + 1;
    const unit = (5000 + (num * 75)).toFixed(4); // Varia de 5075.0000 a 6875.0000
    const total = (5950.00).toFixed(2);          // Fixo em 5950.00
    return {
      quantidade: '1.0000',
      valorUnitario: unit,
      valorTotal: total,
      ...
    };
  })
  ```
- **Evidência empírica:**
  Em **todos os 25 itens** de `demo-02`, `1.0000 * unit` não é igual a `5950.00`. Por exemplo, no item 1: `1 * 5075.0000 != 5950.00`. O total geral da nota (`25 * 5950 = 148.750,00`) está matematicamente consistente com a soma dos totais individuais, mas os unitários individuais não multiplicam para o total.
- **Blast radius:** No Milestone 1 (Dashboard), nenhum impacto visual ocorre porque a listagem recente exibe apenas o total consolidado da nota (`148.750,00`). No Milestone 4 (Conferência Fiscal), se o editor recalcular `qtd * unit`, os totais de linha sofrerão alteração súbita.
- **Mitigação sugerida:** No Milestone 2 (Core Domain Services), ajustar `valorUnitario` para igualar `valorTotal` quando a quantidade for 1.

---

### [Low/Info] Challenge 4: Discrepâncias de soma em `demo-04` e `demo-05`

- **Suposição desafiada:** A soma dos itens individuais totaliza exatamente `totais.valorProdutos`.
- **Evidências empíricas:**
  1. Em `demo-04` (inconsistências simuladas):
     - A soma real de `item.valorTotal` dos 12 itens é `91.300,00`.
     - O campo `totais.valorProdutos` está gravado como `89.300,00`.
     - Discrepância de `R$ 2.000,00` no cabeçalho consolidado (além da divergência do item 5 de `R$ 500,00`).
  2. Em `demo-05` (lotes repetidos):
     - No item 15 (`d5-15`): `quantidade: '74.0000'` e `valorUnitario: '380.0000'`, resultando matematicamente em `28.120,00`, mas gravado como `28.150,00` (diferença de R$ 30,00).
     - A soma real dos 15 itens é `344.000,00`.
     - O campo `totais.valorProdutos` e `totais.valorTotalNota` está gravado como `342.000,00`.
     - Curiosamente, as duas notas preparadas mockadas (`prep-01` = 134.750,00 e `prep-02` = 207.250,00) somam exatamente `342.000,00`.
- **Blast radius:** Nenhum no Milestone 1 (os KPIs somam os totais das notas, não os itens). Requer alinhamento no Milestone 2 e Milestone 5.

---

### [Low/Info] Challenge 5: Rollover de datas inválidas em `formatDateBR`

- **Suposição desafiada:** Expressão regular `/^\d{4}-\d{2}-\d{2}$/` valida se a data é válida.
- **Cenário de ataque:** Envio de string com mês ou dia inválido (ex: `"2026-99-99"`).
- **Evidência empírica:**
  `Date.UTC(2026, 99 - 1, 99)` avança meses e dias por rollover e retorna `07/06/2034` em vez de rejeitar com `"-"`.
- **Blast radius:** Baixo, restrito a dados mockados ou entradas malformadas de XML.

---

## 3. Stress Test Results Summary Table

| Cenário / Componente | Teste Realizado | Comportamento Esperado | Comportamento Observado | Veredito |
|---|---|---|---|---|
| `DataTable.jsx` | `data=[]` | Renderiza mensagem vazia | Renderiza "Não há dados para exibir..." | **PASS** |
| `DataTable.jsx` | `columns` explícitas | Renderiza colunas e renderers | Executa callbacks e alinha classes | **PASS** |
| `DataTable.jsx` | Linhas com props nulas | Não quebra e exibe hífen `-` | Renderiza sem exceção | **PASS** |
| `DataTable.jsx` | `dense={true}` | Reduz padding de células | Aplica `px-2.5 py-1 text-xs` | **PASS** |
| `DataTable.jsx` | Busca com regex `.*`, `[0-9]` | Não lança `SyntaxError` | Busca via `includes()` segura | **PASS** |
| `DataTable.jsx` | `data={null}` | Degradação limpa | Lança `TypeError: null.length` | **FAIL (Documentado)** |
| `currency.js` | `formatBRL(0)` | `R$ 0,00` | `R$ 0,00` | **PASS** |
| `currency.js` | `formatBRL(-150.50)` | Mantém sinal negativo | `-R$ 150,50` | **PASS** |
| `currency.js` | `formatBRL(1e9)` | `R$ 1.000.000.000,00` | `R$ 1.000.000.000,00` | **PASS** |
| `currency.js` | `formatBRL(null / 'abc')` | Degrada para `R$ 0,00` | `R$ 0,00` sem `NaN` | **PASS** |
| `currency.js` | `parseBRL('R$ 1.250,50')`| `1250.5` | `1250.5` | **PASS** |
| `dates.js` | Ausência de `moment.js` | Zero imports | Verificado 100% nativo | **PASS** |
| `dates.js` | `formatDateBR('2026-10-15')` | `15/10/2026` sem shift | `15/10/2026` UTC | **PASS** |
| `dates.js` | `formatDateBR(null / 'invalid')` | Retorna `"-"` | `"-"` sem lançar erro | **PASS** |
| `status.js` | 7 status conhecidos | Rótulos e classes Tailwind 4 | 100% configurados | **PASS** |
| `status.js` | Status nulos ou desconhecidos | Fallbacks não quebrantes | Classes cinza e fallback de label | **PASS** |
| `mockInvoices.js` | Matemática `demo-01` | Qtd * Unit == Total | Consistente ao centavo | **PASS** |
| `mockInvoices.js` | Matemática `demo-02` | Qtd * Unit == Total | 25 itens com divergência unitária | **FAIL (Documentado)** |
| `mockInvoices.js` | Matemática `demo-03` | 50 itens Qtd * Unit == Total | 100% consistente (R$ 625.800,00) | **PASS** |
| `mockInvoices.js` | Inconsistências `demo-04`| Item 5 documentado | Item 5 documentado; soma difere R$ 2k | **PASS (Previsto)** |
| `mockInvoices.js` | Divisão `demo-05` | Soma preps == total nota | Exatamente R$ 342.000,00 | **PASS** |
| `mockInvoices.js` | KPIs do Dashboard | Agregação dinâmica dos 5 KPIs | Total R$ 1.488.750,00, 110 itens | **PASS** |

---

## 4. Unchallenged Areas

- **Cálculo de divisão de notas em tempo real (`divisionMath.js`)**: Pertence ao Milestone 2/5 e ainda não foi implementado.
- **Persistência versionada no LocalStorage (`localStorageService.js`)**: Pertence ao Milestone 2 e ainda não foi implementada.
- **Telas filhas secundárias (`/documentos`, `/conferencia`, etc.)**: Estão fora do escopo do Milestone 1.

---

## 5. Conclusão & Recomendações

O Milestone 1 cumpre com louvor seu objetivo de fundação e viabilização visual da tela `/dashboard`.
Nenhum dos achados adversariais impede o avanço para o Milestone 2.
Recomenda-se registrar os débitos técnicos catalogados acima na abertura do **Milestone 2 (Core Domain Services & Calculations)** para correção preventiva durante a implementação da engine de aritmética decimal (`app/lib/calculations/`).
