# Relatório de Desafio Adversarial — Milestone 1 XML Engine & Access Key Validator

**Autor:** `teamwork_challenger_m1_1` (Milestone 1 Empirical Challenger 1)  
**Data:** 09/11/2026T20:05:00Z  
**Branch:** `fix/frontend-xml-conferencia-v0.1.1`  
**Alvos Adversariais:**
- `app/features/xml/accessKeyValidator.js`
- `app/features/xml/nfeXmlParser.js`
- `app/features/xml/xmlToInvoiceMapper.js`
- `app/features/invoiceRepository.js`

---

## 1. Challenge Summary

**Overall risk assessment:** **LOW** (Aprovado com Robustez Empírica Comprovada)

O motor de parsing XML e o validador algorítmico da chave de acesso demonstraram resiliência técnica excepcional contra todos os vetores de ataque e cenários de borda estabelecidos no escopo da missão. Todas as 22 asserções de estresse adversariais na suíte dedicada `tests/tier5/m1_xml_adversarial_stress.test.mjs` foram executadas e aprovadas com 100% de sucesso.

---

## 2. Challenges & Attack Scenarios

### [Challenge 1] Validação Algorítmica e Estrutural da Chave de Acesso (`accessKeyValidator.js`)

- **Suposição desafiada:** O validador de chave pode ser tolerante a códigos IBGE inexistentes, aceitar chaves com 43 ou 45 dígitos, falhar no algoritmo Módulo 11 sob casos de borda de restos especiais (resto 0, 1 e 10), ou aceitar modelos de notas concorrentes (ex: NFC-e modelo 65 ou CT-e modelo 57).
- **Cenário de ataque:**
  1. *27 UFs do Brasil:* Geração algorítmica de 27 chaves sintéticas válidas para todas as UFs oficiais (11 a 53). Injeção de códigos inválidos ('00', '99', '10', '20', '30', '40', '60', '88', 'AA').
  2. *Casos de borda Módulo 11 (resto 0, 1 e 10):* Construção de chaves sintéticas específicas para forçar o somatório ponderado $\sum (d_i \times w_i)$ a atingir restos 0, 1 e 10 na divisão euclidiana por 11.
     - Resto 0: $\text{sum} \equiv 0 \pmod{11} \implies \text{DV} = 0$.
     - Resto 1: $\text{sum} \equiv 1 \pmod{11} \implies \text{DV} = 0$ (regra SEFAZ estrita: quando resto é 0 ou 1, DV deve ser 0).
     - Resto 10: $\text{sum} \equiv 10 \pmod{11} \implies \text{DV} = 11 - 10 = 1$.
  3. *Comprimentos Anômalos:* Teste de chaves truncadas (43 dígitos) e infladas (45 dígitos), além de strings vazias, nulas e comprimentos extremos (10, 40, 50, 100 dígitos).
  4. *Alfanuméricos e Injeção:* Injeção de letras em posições críticas, caracteres de escape, null byte (`\x00`) e payloads SQL/XSS (`';DROP`).
  5. *Modelos Não-55:* Chaves sintéticas com modelo 65 (NFC-e), modelo 57 (CT-e), modelos 01, 58 (MDF-e), 67 (CT-e OS).
- **Resultado empírico:**
  - Todas as 27 UFs foram validadas com sucesso em 2.2 ms, correlacionando perfeitamente o código IBGE e a sigla oficial (`UF_IBGE_CODES`). Todos os códigos espúrios foram barrados.
  - As chaves de teste para resto 0 e resto 1 validaram com sucesso quando DV = 0, e rejeitaram imediatamente qualquer alteração no DV.
  - A chave para resto 10 validou com sucesso para DV = 1, e rejeitou DV = 0.
  - Chaves de 43 e 45 dígitos foram estritamente rejeitadas com a mensagem informativa `Chave de acesso deve conter exatamente 44 dígitos numéricos`.
  - Chaves alfanuméricas foram barradas com `Chave de acesso contém caracteres não numéricos inválidos`.
  - Modelos 65, 57, 01, 58, 67 e 99 foram rejeitados categoricamente indicando que o SmartNFe processa exclusivamente NF-e modelo 55.

---

### [Challenge 2] Estresse de Namespaces, Prefixos Arbitrários e Tags Omitidas (`nfeXmlParser.js`)

- **Suposição desafiada:** Seletores baseados em regex ou DOM dependem de namespace SEFAZ padronizado (`xmlns="http://www.portalfiscal.inf.br/nfe"`) e falham quando prefixos arbitrários (`fiscal:`, `nfe:`) ou ausência total de namespaces ocorrem.
- **Cenário de ataque:**
  1. *Namespace Default:* XML envelopado com `xmlns="http://www.portalfiscal.inf.br/nfe"`.
  2. *Prefixos Arbitrários:* Raiz `<fiscal:nfeProc xmlns:fiscal="...">` e todas as tags filhas com prefixo `<fiscal:NFe>`, `<fiscal:infNFe>`, `<fiscal:ide>`, `<fiscal:det>`, etc.
  3. *Zero Namespaces:* XML com tags puras e sem qualquer atributo de namespace.
  4. *Tags Vazias e Auto-Fechadas:* Presença de `<vSeg/>`, `<vSeg></vSeg>`, `<vDesc/>`, `<vOutro/>`, ausência de `<xFant>`, ausência de `<transp>`, e destinatário no exterior com `<idEstrangeiro>` sem CPF/CNPJ.
- **Resultado empírico:**
  - O mecanismo `getElementLocalName`, `findDirectChild` e `findElements` opera de maneira namespace-agnóstica tanto em navegadores (`DOMParser` com `getElementsByTagNameNS('*', localName)`) quanto no `NodeXmlDomParser`.
  - 100% dos dados essenciais (chave de acesso, emitente, destinatário, produtos, impostos e totais) foram extraídos corretamente em todos os 4 cenários.
  - Tags vazias e campos omitidos resultaram em valores decimais seguros (`'0.00'`, `'0.0000'`) sem disparar exceções de runtime (`TypeError`).

---

### [Challenge 3] Resiliência a XML Malformado, Injeções Hostis e Carga Pesada de 5 MB (`nfeXmlParser.js`)

- **Suposição desafiada:** XMLs truncados ou tags malformadas podem disparar erros não capturados que congelam o thread do JavaScript; arquivos gigantes (> 5 MB) podem sofrer com *catastrophic backtracking* na regex ou estouro de pilha (*stack overflow*).
- **Cenário de ataque:**
  1. *XML Truncado:* Arquivo cortado abruptamente em `<mod>55</mod>` sem fechar as tags `<ide>`, `<infNFe>`, `<NFe>`, `<nfeProc>`.
  2. *Tag Mismatch:* Tags cruzadas malformadas `<NFe><infNFe></NFe></infNFe>`.
  3. *Injeções de Script e Caracteres de Controle:* Inserção de `<script>alert("XSS")</script>`, `<img src="x" onerror="alert(1)" />` e bytes nulos `\x00`, `\x01`, `\x0b`, `\x1f`.
  4. *Carga Pesada de 5.3 MB (XML Válido):* Geração sintética de um documento XML de NF-e válido contendo 8.000 itens `<det>` completos, totalizando 5.38 MB.
  5. *Carga Pesada de 5.0 MB (XML Malformado):* Geração sintética de um documento malformado com 5 MB de repetições de tags abertas sem fechamento.
- **Resultado empírico:**
  - XML truncado e tag mismatch foram interceptados graciosamente com `{ success: false, error: ... }`, `details.code = 'PARSER_ERROR'` e mensagens limpas em português.
  - Tentativas de injeção foram tratadas puramente como nós de texto inertes, sem execução de código e sem o uso de `dangerouslySetInnerHTML`.
  - O payload válido de 5.38 MB (8.000 itens) foi parseado em **445.5 ms**, extraindo com fidelidade todos os 8.000 itens sem vazamento de memória ou estouro de pilha.
  - O payload malformado de 5.0 MB foi rejeitado graciosamente em **185.9 ms**, confirmando ausência total de catastrophic backtracking no parser.

---

### [Challenge 4] Pipeline de Ponta a Ponta e Isolamento de Memória de Sessão

- **Suposição desafiada:** A persistência no repositório de faturas pode vazar para o `localStorage` do navegador ou perder notas importadas reais após chamadas de reset.
- **Cenário de ataque:**
  - Importação de XML real via `parseNFeXml` -> `validateAccessKey` -> `mapXmlToInvoice` -> `invoiceRepository.create()`.
  - Consulta ao `localStorageService.load('smartnfe_invoices')` para verificar se a nota real foi escrita em disco.
  - Execução de `invoiceRepository.resetDemoData()`.
- **Resultado empírico:**
  - O identificador de itens seguiu o padrão rigoroso `nfe-${chaveAcesso}-item-${nItem}`.
  - A chave e os totais foram preservados com precisão estendida.
  - A nota real recebeu `isRealImport: true` e `isDemo: false`.
  - O `localStorageService` permaneceu estritamente limpo (0 ocorrências da nota importada no storage persistente).
  - Após `resetDemoData()`, a nota importada na memória de sessão continuou íntegra e acessível via `findById`.

---

## 3. Stress Test Results Summary

Suíte: `tests/tier5/m1_xml_adversarial_stress.test.mjs`  
Tempo total de execução: **1.017 s**  
Total de asserções executadas: **22**  
Aprovadas: **22**  
Falhas: **0**

| Suite | Cenário | Comportamento Esperado | Comportamento Real | Veredito |
|---|---|---|---|---|
| 1.1 | 27 UFs do Brasil | Aceitar todas as 27 UFs IBGE oficiais | 27 UFs validadas em 2.2ms | **PASS** |
| 1.2 | UFs inválidas ('00', '99', 'AA', etc.) | Rejeitar com erro explicativo | Rejeitadas com `UF inválida` | **PASS** |
| 1.3 | Módulo 11 Resto 0 | Calcular e validar DV = 0; rejeitar outros DVs | DV 0 validado; DVs 1-9 rejeitados | **PASS** |
| 1.4 | Módulo 11 Resto 1 | Calcular e validar DV = 0; rejeitar DV = 1 | DV 0 validado; DV 1 rejeitado | **PASS** |
| 1.5 | Módulo 11 Resto 10 | Calcular e validar DV = 11 - 10 = 1 | DV 1 validado; DV 0 rejeitado | **PASS** |
| 1.6 | Tamanho 43 e 45 dígitos | Rejeitar exigindo 44 dígitos | Rejeitados com mensagem limpa | **PASS** |
| 1.7 | Alfanuméricos e Injeção SQL/XSS | Rejeitar caracteres não numéricos | Rejeitados com mensagem limpa | **PASS** |
| 1.8 | Modelos 65 (NFC-e), 57 (CT-e), etc. | Rejeitar e exigir modelo 55 | Rejeitados expressamente | **PASS** |
| 1.9 | Meses 00, 13 e tpEmis inválidos | Rejeitar campos fora do padrão | Rejeitados com mensagem limpa | **PASS** |
| 1.10| Formatação com blocos de 4 dígitos | 11 blocos de 4 dígitos espaçados | Formatado perfeitamente | **PASS** |
| 2.1 | Namespace default SEFAZ | Extrair todos os nós fiscais | 100% dos dados extraídos | **PASS** |
| 2.2 | Prefixo fiscal arbitrário (`fiscal:`) | Extrair sem colisão de tags | 100% dos dados extraídos | **PASS** |
| 2.3 | XML sem namespaces | Extrair dados com sucesso | 100% dos dados extraídos | **PASS** |
| 2.4 | Tags vazias / campos opcionais | Preencher defaults ('0.00', '') | Sucesso sem TypeError | **PASS** |
| 3.1 | XML truncado | Interceptar com `PARSER_ERROR` | Interceptado sem unhandled throw | **PASS** |
| 3.2 | Tag mismatch cruzado | Interceptar com mensagem sintática | Interceptado com mensagem limpa | **PASS** |
| 3.3 | Injeção XSS e caracteres de controle | Tratar como strings inertes | Nenhuma execução ou quebra | **PASS** |
| 3.4 | Carga 5.38 MB (8.000 itens) | Parsear em tempo aceitável (< 3.5s) | Parseado em **445.5 ms** | **PASS** |
| 3.5 | Carga 5.0 MB Malformada | Rejeitar rapidamente (< 2.0s) | Rejeitado em **185.9 ms** | **PASS** |
| 3.6 | Tipos primitivos inválidos | Rejeitar graciosamente | Rejeitados sem falha | **PASS** |
| 4.1 | Pipeline E2E e Isolamento de Sessão | In-Memory Session, zero LocalStorage | Isolamento 100% estrito | **PASS** |
| 4.2 | Precisão decimal estendida | Preservar 4 decimais e unitário | Totalmente preservado | **PASS** |

---

## 4. Unchallenged Areas

- **Concorrência de abas múltiplas do navegador:** O escopo do Milestone 1 é exclusivamente voltado à memória volátil de sessão por aba (`sessionInvoices = new Map()`), portanto a replicação entre abas não é aplicável nem requerida pelo contrato do SmartNFe.
- **Assinatura Digital XMLDSig:** O SmartNFe é um software de conferência e divisão de notas emitidas; a verificação criptográfica da assinatura digital X.509 não faz parte dos requisitos do Milestone 1 (a SEFAZ já valida no ato de autorização através do protocolo `protNFe`).

---

## 5. Veredito

**APPROVE**: A implementação do Milestone 1 é sólida, resiliente a entradas hostis, criptograficamente aderente ao MOC da SEFAZ, segura quanto à memória de sessão e atinge excelente performance mesmo sob cargas extremas de 5 MB.
