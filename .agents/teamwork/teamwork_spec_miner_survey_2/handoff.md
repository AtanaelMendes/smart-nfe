# Handoff Report — Especificações da Importação Real de XML NF-e Modelo 55 e Contrato de Dados

**Agente:** `teamwork_spec_miner_survey_2` (Survey Spec Miner 2)  
**Destinatário:** Orquestrador (`71db8a14-4c80-4575-92ba-b52ae572b170`)  
**Data:** 09/11/2026T19:40:00Z  
**Tipo de Handoff:** Hard (Tarefa Concluída)  
**Artefato Produzido:** `c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\handoff.md` e atualização em `survey_specs.md`

---

## 1. Observation

1. **Requisitos do Usuário e Dispatch:**
   - Em `ORIGINAL_REQUEST.md` (linhas 20-24, R3):
     "Implementar importador funcional de XML NF-e modelo 55 executado exclusivamente no navegador (`app/documentos/importar/page.jsx` e `app/features/xml/`), utilizando File API, `File.text()`, `DOMParser` e seletores XML que respeitem namespaces da NF-e. Suportar layouts `nfeProc` e `NFe`, extraindo versão, chave de acesso, número, série, data de emissão, natureza da operação, emitente, destinatário, produtos (`cProd`, `xProd`, `NCM`, `CFOP`, `uCom`, `qCom`, `vUnCom`, `vProd`, `uTrib`, `qTrib`, `vUnTrib` e demais dados fiscais) e totais.
     Validar formato e dígito verificador da chave de acesso, formato decimal de quantidades e valores, e tratar XML malformado sem quebrar a aplicação. Não carregar recursos externos do XML, não executar scripts do documento, não usar `dangerouslySetInnerHTML`, limitar tamanho de arquivos e não enviar documentos para serviços externos ou Vercel Functions.
     Converter o XML importado para o mesmo contrato de dados usado por `app/features/invoiceRepository.js`, disponibilizando o documento para conferência, divisão e validação. Não salvar XML completo nem dados fiscais reais no `localStorage` persistente; manter dados reais apenas em memória de sessão temporária (avisando sobre perda ao fechar/atualizar a página) e não misturar documentos reais com mocks de fábrica."

2. **Estado do Repositório Git e Código Existente:**
   - Git branch atual: `fix/frontend-xml-conferencia-v0.1.1` (verificado via `git status` e `git branch -a`). A branch já está correta conforme exigido no R5.
   - `app/documentos/importar/page.jsx` (linhas 146-165): A implementação atual é puramente simulada com `setInterval`, que gera dados fictícios com contador hardcoded associado a `demo-01` e não faz leitura nem parsing de XML real:
     ```javascript
     setSimulatedExtraction({
       numero: '000.145.892',
       itensCount: isXML ? 8 : 25,
       tipo: fileMeta.type,
       valorEstimado: isXML ? 'R$ 291.200,00' : 'R$ 148.750,00',
     });
     ```
   - `app/features/invoiceRepository.js` (linhas 57-73 e 544-565):
     `getAllInvoices()` e `create()` salvam tudo indiscriminadamente no `localStorageService` com `isDemo: true`:
     ```javascript
     const newDoc = {
       ...invoiceData,
       id,
       status: invoiceData.status || 'importado',
       isDemo: true, // <-- VIOLAÇÃO DE R3 SE USADO PARA XML REAL
       ...
     };
     const updated = [newDoc, ...invoices];
     await saveAllInvoices(updated); // <-- Salva no localStorage persistente!
     ```
   - `app/lib/data/mockInvoices.js` (linhas 6-291): Contém 5 cenários mockados (`demo-01` a `demo-05`). Ao calcular o Dígito Verificador (DV) das chaves de acesso mockadas via script de validação, observou-se que `demo-01`, `demo-03`, `demo-04` e `demo-05` possuem DVs fictícios que não satisfazem o módulo 11 (apenas `demo-02` coincide por acaso). Portanto, documentos mockados e documentos reais de XML devem ter tratamento diferenciado.
   - DANFEs em PDF no repositório: Busca exaustiva (`find_by_name` com `.pdf`, `danfe`) retornou **0 arquivos**. Nenhum PDF DANFE existe atualmente no repositório `smart-nfe`.
   - Fixtures sintéticas de XML no repositório: Busca exaustiva retornou **0 arquivos de XML ou fixtures**. Não existem fixtures prévias de XML na base de código.
   - Testes existentes: `node --no-warnings --test tests/tier1/m2_domain.test.mjs` executa 44 testes de cálculo decimal, repositório e formatadores com 100% de sucesso (0 falhas). Não há testes para parsing de XML em `tests/`.

3. **Arquitetura de Navegador e Dependências (`package.json`):**
   - Dependências: `next: 16.0.10`, `react: 19.2.0`, `react-dom: 19.2.0`, `@fortawesome/...`, `clsx`, `tailwind-merge`.
   - Não há dependências de terceiros para parsing XML (como `fast-xml-parser`, `xmldom`, `libxmljs`).
   - O ambiente do navegador oferece a API nativa `DOMParser` (`new DOMParser().parseFromString(text, 'application/xml')`).
   - No ambiente de testes Node.js (`node --test`), `DOMParser` não existe nativamente no `globalThis`, o que exige estratégia arquitetural para execução dos testes automatizados (injetor de parser ou shim leve).

---

## 2. Logic Chain

1. **Da observação 1 e 2 (Inexistência de XML Parser e Implementação Dummy):**
   A tela de importação em `app/documentos/importar/page.jsx` não realiza qualquer extração real de XML. É imperativo criar o módulo `app/features/xml/` com três responsabilidades bem segregadas:
   - `nfeXmlParser.js`: Leitura via `DOMParser`, navegação tolerante a namespaces e extração resiliente dos nós SEFAZ.
   - `accessKeyValidator.js`: Validação estrutural de 44 dígitos e cálculo matemático do dígito verificador (Módulo 11, pesos 2 a 9).
   - `xmlToInvoiceMapper.js`: Normalização dos nós do XML para a estrutura exata exigida pelo `invoiceRepository.js` com identificadores estáveis (`itemId`).

2. **Da observação 1 e 2 (Isolamento de Sessão vs LocalStorage):**
   O `ORIGINAL_REQUEST.md` proíbe expressamente salvar dados fiscais reais importados no `localStorage` persistente para proteger dados sensíveis e impedir corrupção dos mocks de fábrica.
   - O `invoiceRepository.js` atual escreve todas as criações em `saveAllInvoices()`.
   - Logo, `invoiceRepository.js` deve ser arquitetado com uma coleção em memória volátil de sessão (`sessionInvoices = new Map()`).
   - Ao importar um documento com `isRealImport: true` (ou `isDemo: false`), o documento é armazenado exclusivamente nessa memória de sessão volátil.
   - A listagem geral (`list`) consolida `[...sessionInvoices.values(), ...persistentMocks]`, permitindo que o usuário visualize a nota importada na listagem de documentos e navegue para `/documentos/[id]/conferencia` sem persistência em disco.
   - Ao fechar ou recarregar a aba, os dados são descartados naturalmente. Um aviso claro em banner deve alertar o usuário sobre essa característica.
   - O comando `resetDemoData()` limpa apenas os mocks de fábrica no `localStorage`, sem interferir nos documentos da sessão ativa.

3. **Da observação 2 (Diferença entre Chaves Mock e Chaves Reais):**
   Como as chaves dos mocks `demo-01`, `demo-03`, `demo-04` e `demo-05` possuem DVs fictícios, a validação de DV deve ser aplicada aos documentos importados via XML. Se a chave do XML importado estiver com DV inválido, a aplicação deve alertar o usuário de forma explícita com mensagem informativa.

4. **Da observação 2 e 3 (Inexistência de PDFs e Fixtures Sintéticas):**
   Como não existem PDFs DANFE nem fixtures de XML no repositório, fixtures sintéticas representativas devem ser especificadas e modeladas para os testes automatizados do Fluxo A (Importação real e conferência), incluindo cenários de:
   - `nfeProc` completo (NF-e v4.00 com protocolo de autorização `protNFe` e tributos).
   - `NFe` avulso (sem envelope `nfeProc` / sem `protNFe`).
   - XML malformado / corrompido (para testar tratamento gracioso de erro).
   - XML com chave de acesso com DV incorreto.
   - Operação de exportação (CFOP 7101 / 6501, destinatário exterior, moeda/valores com precisão decimal estendida).

---

## 3. Caveats

1. **Ambiente Dual (Browser vs Node Test Runner):**
   A API nativa `DOMParser` existe nativamente em navegadores modernos (`window.DOMParser`), mas não está disponível em Node.js puro (`node --test`). Para garantir que os testes automatizados executem sem bibliotecas externas pesadas e com 0 dependências adicionais, o parser `nfeXmlParser` deve suportar injeção de parser ou utilizar um adapter que forneça implementação equivalente para o runner de testes do Node.
2. **Namespaces SEFAZ e Prefixos XML:**
   Arquivos emitidos por diferentes ERPs podem conter `xmlns="http://www.portalfiscal.inf.br/nfe"`, prefixos explícitos (ex: `<nfe:NFe xmlns:nfe="...">`) ou nenhum namespace (em dumps/fixtures sintéticas). O uso direto de `querySelector` falha se houver dois pontos (`:`) no nome da tag sem escape. A especificação exige métodos baseados em `getElementsByTagNameNS('*', localName)` ou busca iterativa por `localName`, que são 100% imunes a prefixos e namespaces.
3. **Restrição de Build e Servidor Ativo:**
   Conforme instrução do usuário, o servidor dev já se encontra ativo externamente em `http://localhost:3000/dashboard`. Comandos de build (`pnpm build`) e dev server (`pnpm dev`) não foram executados.

---

## 4. Conclusion

As especificações para a importação real de XML NF-e modelo 55 no navegador (R3) e o contrato de integração com o `invoiceRepository` estão 100% mapeadas, detalhadas e validadas.
A arquitetura proposta garante:
1. Extração segura e tolerante a namespaces no cliente via `DOMParser` e File API.
2. Validação matemática rigorosa da Chave de Acesso de 44 dígitos com Módulo 11 (pesos 2 a 9).
3. Mapeamento para contrato do repositório com geração de `itemId` imutável e estável.
4. Isolamento estrito de memória de sessão, impedindo contaminação do `localStorage` e dos mocks de fábrica.
5. Diretrizes exatas para criação das fixtures sintéticas exigidas para os testes de integração do Fluxo A.

---

## 5. Verification Method

Para verificar de forma independente as constatações deste relatório:
1. **Verificação da ausência de PDFs e Fixtures:**
   ```powershell
   fd -e pdf c:\www\smart-nfe
   fd -e xml c:\www\smart-nfe
   ```
   *Resultado esperado:* 0 arquivos encontrados.
2. **Verificação dos Testes de Domínio Atuais:**
   ```powershell
   node --no-warnings --test tests/tier1/m2_domain.test.mjs
   ```
   *Resultado esperado:* 44 testes passando (0 falhas).
3. **Verificação do Algoritmo Módulo 11 com Vetor de Teste Oficial:**
   ```powershell
   node -e "
   const key = '3524111234567800019055001000145892100123456';
   const weights = [2,3,4,5,6,7,8,9];
   let sum = 0, w = 0;
   for (let i = key.length - 1; i >= 0; i--) { sum += Number(key[i]) * weights[w % weights.length]; w++; }
   const rem = sum % 11;
   const dv = (rem === 0 || rem === 1) ? 0 : (11 - rem);
   console.log('DV Calculado:', dv);
   "
   ```
   *Resultado esperado:* `DV Calculado: 2`.

---

# ESPECIFICAÇÕES TÉCNICAS DETALHADAS (R3 & CONTRATO DE DADOS)

## 6. Specification Matrix: Tags SEFAZ NF-e Modelo 55

A tabela abaixo define exaustivamente as tags da NF-e modelo 55 (Layout SEFAZ 4.00 e compatibilidade 3.10), seus formatos, tipos, obrigatoriedade e campo mapeado no contrato do SmartNFe:

| Caminho XML SEFAZ | Tag | Obrigatoriedade | Tipo SEFAZ | Formato SEFAZ | Exemplo de Valor | Campo no SmartNFe (`invoiceRepository`) | Regra de Conversão / Normalização |
|-------------------|-----|-----------------|------------|---------------|------------------|-----------------------------------------|-----------------------------------|
| `nfeProc/NFe/infNFe/@Id` | `Id` | Obrigatório | String | `NFe` + 44 dígitos | `NFe35241112345678000190550010001458921001234562` | `chaveAcesso`, `id` | Remove prefixo `NFe`. `id = 'nfe-' + chaveAcesso` |
| `nfeProc/NFe/infNFe/@versao` | `versao` | Obrigatório | String | 4.00 ou 3.10 | `4.00` | `versaoLayout` | String direta |
| `infNFe/ide/cUF` | `cUF` | Obrigatório | Inteiro | 2 dígitos (IBGE) | `35` | `codigoUfEmitente` | Inteiro/String |
| `infNFe/ide/cNF` | `cNF` | Obrigatório | Inteiro | 8 dígitos | `00123456` | `codigoAleatorio` | String |
| `infNFe/ide/natOp` | `natOp` | Obrigatório | String | 1 a 60 caracteres | `EXPORTAÇÃO DE MERCADORIAS` | `naturezaOperacao` | Trim de espaços |
| `infNFe/ide/mod` | `mod` | Obrigatório | String | 2 dígitos (`55`) | `55` | `modeloDocumento` | Validar que é estritamente `55` |
| `infNFe/ide/serie` | `serie` | Obrigatório | Inteiro | 1 a 3 dígitos | `1` | `serie` | String limpa (ex: `1`) |
| `infNFe/ide/nNF` | `nNF` | Obrigatório | Inteiro | 1 a 9 dígitos | `145892` | `numero` | Formatar em máscara: `000.145.892` |
| `infNFe/ide/dhEmi` | `dhEmi` | Obrigatório (v4.0) | Data/Hora ISO | `AAAA-MM-DDThh:mm:ssTZD` | `2026-10-15T10:30:00-03:00` | `dataEmissao`, `emissao` | `dataEmissao = dhEmi`; `emissao = dhEmi.slice(0, 10)` |
| `infNFe/ide/dEmi` | `dEmi` | Opcional (v3.1) | Data ISO | `AAAA-MM-DD` | `2026-10-15` | `emissao`, `dataEmissao` | Fallback quando `dhEmi` ausente |
| `infNFe/ide/tpNF` | `tpNF` | Obrigatório | Inteiro | 0=Entrada, 1=Saída | `1` | `tipoOperacao` | Number |
| `infNFe/ide/idDest` | `idDest` | Obrigatório | Inteiro | 1=Interna, 2=Inter, 3=Ext | `3` | `destinoOperacao` | 3 indica exportação |
| `infNFe/ide/tpAmb` | `tpAmb` | Obrigatório | Inteiro | 1=Prod, 2=Homolog | `1` | `ambiente` | 1=Produção, 2=Homologação |
| `infNFe/emit/CNPJ` | `CNPJ` | Condicional | String | 14 dígitos | `12345678000190` | `emitente.cnpj` | Formatar máscara `XX.XXX.XXX/XXXX-XX` |
| `infNFe/emit/CPF` | `CPF` | Condicional | String | 11 dígitos | `12345678901` | `emitente.cnpj` | Formatar máscara `XXX.XXX.XXX-XX` |
| `infNFe/emit/xNome` | `xNome` | Obrigatório | String | 1 a 60 caracteres | `Agroexport Brasil S.A.` | `emitente.razaoSocial` | Trim de espaços |
| `infNFe/emit/xFant` | `xFant` | Opcional | String | 1 a 60 caracteres | `Agroexport` | `emitente.nomeFantasia` | Trim de espaços |
| `infNFe/emit/enderEmit/xMun` | `xMun` | Obrigatório | String | 2 a 60 caracteres | `Santos` | `emitente.municipio` | Trim de espaços |
| `infNFe/emit/enderEmit/UF` | `UF` | Obrigatório | String | 2 caracteres | `SP` | `emitente.uf` | Maiúsculas |
| `infNFe/emit/IE` | `IE` | Obrigatório | String | 2 a 14 dígitos | `123456789012` | `emitente.inscricaoEstadual` | String |
| `infNFe/dest/CNPJ` | `CNPJ` | Condicional | String | 14 dígitos | `98765432000199` | `destinatario.cnpj` | Formatar se nacional |
| `infNFe/dest/CPF` | `CPF` | Condicional | String | 11 dígitos | `98765432100` | `destinatario.cnpj` | Formatar se nacional |
| `infNFe/dest/idEstrangeiro` | `idEstrangeiro` | Condicional | String | 5 a 20 caracteres | `NL884920192B01` | `destinatario.idEstrangeiro` | String (se destinatário exterior) |
| `infNFe/dest/xNome` | `xNome` | Obrigatório | String | 1 a 60 caracteres | `Global Trading Logistics B.V.` | `destinatario.nome` | Trim de espaços |
| `infNFe/dest/enderDest/xPais`| `xPais` | Opcional | String | 1 a 60 caracteres | `Holanda` | `destinatario.pais` | Default: `'Brasil'` se vazio/1058 |
| `infNFe/dest/enderDest/cPais`| `cPais` | Opcional | Inteiro | 2 a 4 dígitos | `1058` ou `3607` | `destinatario.paisCodigo` | 'BR' se 1058 ou vazio |
| `infNFe/dest/enderDest/UF` | `UF` | Obrigatório | String | 2 caracteres | `EX` ou `SP` | `destinatario.uf` | 'EX' quando no exterior |
| `infNFe/det/@nItem` | `nItem` | Obrigatório | Inteiro | 1 a 990 | `1` | `item.item` e compõe `item.id` | Inteiro 1-based |
| `infNFe/det/prod/cProd` | `cProd` | Obrigatório | String | 1 a 60 caracteres | `EXP-CAF-001` | `item.codigo` | Trim de espaços |
| `infNFe/det/prod/cEAN` | `cEAN` | Opcional | String | 0, 8, 12-14 caracteres | `SEM GTIN` ou `789...` | `item.cEAN` | String |
| `infNFe/det/prod/xProd` | `xProd` | Obrigatório | String | 1 a 120 caracteres | `Café em Grão Cru Arábica Tipo 6` | `item.descricao` | Trim de espaços |
| `infNFe/det/prod/NCM` | `NCM` | Obrigatório | String | 8 dígitos numéricos | `09011110` | `item.ncm` | 8 dígitos |
| `infNFe/det/prod/CFOP` | `CFOP` | Obrigatório | String | 4 dígitos numéricos | `7101` | `item.cfop` | 4 dígitos |
| `infNFe/det/prod/uCom` | `uCom` | Obrigatório | String | 1 a 6 caracteres | `SC`, `KG`, `TON` | `item.unidade` | Trim e maiúsculas |
| `infNFe/det/prod/qCom` | `qCom` | Obrigatório | Decimal (11,4) | Até 4 decimais | `500.0000` | `item.quantidade` | Normalizar string decimal: `500.0000` |
| `infNFe/det/prod/vUnCom` | `vUnCom` | Obrigatório | Decimal (11,10)| Até 10 decimais | `25.5000` | `item.valorUnitario` | Normalizar string decimal: `25.5000` |
| `infNFe/det/prod/vProd` | `vProd` | Obrigatório | Decimal (13,2) | 2 decimais | `12750.00` | `item.valorTotal` | Normalizar string decimal: `12750.00` |
| `infNFe/det/prod/vFrete` | `vFrete` | Opcional | Decimal (13,2) | 2 decimais | `100.00` | `item.valorFrete` | Normalizar string decimal (`0.00`) |
| `infNFe/det/prod/vSeg` | `vSeg` | Opcional | Decimal (13,2) | 2 decimais | `50.00` | `item.valorSeguro` | Normalizar string decimal (`0.00`) |
| `infNFe/det/prod/vDesc` | `vDesc` | Opcional | Decimal (13,2) | 2 decimais | `0.00` | `item.valorDesconto` | Normalizar string decimal (`0.00`) |
| `infNFe/det/prod/vOutro` | `vOutro` | Opcional | Decimal (13,2) | 2 decimais | `0.00` | `item.outrasDespesas`| Normalizar string decimal (`0.00`) |
| `infNFe/total/ICMSTot/vProd`| `vProd` | Obrigatório | Decimal (13,2) | 2 decimais | `284500.00` | `totais.valorProdutos` | Normalizar string decimal |
| `infNFe/total/ICMSTot/vFrete`| `vFrete`| Obrigatório | Decimal (13,2) | 2 decimais | `5000.00` | `totais.valorFrete` | Normalizar string decimal (`0.00`) |
| `infNFe/total/ICMSTot/vSeg` | `vSeg` | Obrigatório | Decimal (13,2) | 2 decimais | `1200.00` | `totais.valorSeguro` | Normalizar string decimal (`0.00`) |
| `infNFe/total/ICMSTot/vDesc`| `vDesc` | Obrigatório | Decimal (13,2) | 2 decimais | `0.00` | `totais.valorDesconto` | Normalizar string decimal (`0.00`) |
| `infNFe/total/ICMSTot/vOutro`| `vOutro`| Obrigatório | Decimal (13,2) | 2 decimais | `500.00` | `totais.outrasDespesas`| Normalizar string decimal (`0.00`) |
| `infNFe/total/ICMSTot/vNF` | `vNF` | Obrigatório | Decimal (13,2) | 2 decimais | `291200.00` | `totais.valorTotalNota` | Normalizar string decimal |
| `infNFe/transp/vol/pesoL` | `pesoL` | Opcional | Decimal (12,3) | 3 decimais | `45000.000` | `totais.pesoLiquido` | Normalizar string decimal (`0.000`) |
| `infNFe/transp/vol/pesoB` | `pesoB` | Opcional | Decimal (12,3) | 3 decimais | `46200.000` | `totais.pesoBruto` | Normalizar string decimal (`0.000`) |
| `protNFe/infProt/nProt` | `nProt` | Condicional | String | 15 dígitos | `135240001234567` | `protocolo.numero` | Extraído se `protNFe` presente |
| `protNFe/infProt/dhRecbto` | `dhRecbto` | Condicional | Data/Hora ISO | `AAAA-MM-DDThh:mm:ssTZD` | `2026-10-15T10:35:00-03:00` | `protocolo.dataAutorizacao` | Extraído se `protNFe` presente |
| `protNFe/infProt/cStat` | `cStat` | Condicional | Inteiro | 3 dígitos | `100` | `protocolo.status` | 100 = Autorizado |
| `protNFe/infProt/xMotivo` | `xMotivo` | Condicional | String | 1 a 255 caracteres | `Autorizado o uso da NF-e` | `protocolo.motivo` | Mensagem da SEFAZ |

---

## 7. Chave de Acesso Check Digit Algorithm Spec

### 7.1. Estrutura dos 44 Dígitos da Chave de Acesso
```
Posições 01-02: cUF     (Código UF do emitente, ex: 35)
Posições 03-06: AAMM    (Ano e Mês de emissão, ex: 2411)
Posições 07-20: CNPJ    (CNPJ do emitente sem pontuação, 14 dígitos)
Posições 21-22: mod     (Modelo fiscal: 55 para NF-e)
Posições 23-25: serie   (Série com 3 dígitos com zeros à esquerda, ex: 001)
Posições 26-34: nNF     (Número da NF-e com 9 dígitos com zeros à esquerda, ex: 000145892)
Posição 35:     tpEmis  (Tipo de emissão: 1=Normal, 2..7 contingência)
Posições 36-43: cNF     (Código numérico da NF-e com 8 dígitos, ex: 00123456)
Posição 44:     cDV     (Dígito Verificador calculado sobre os 43 dígitos anteriores)
```

### 7.2. Algoritmo Matemático (Módulo 11 com Pesos de 2 a 9)
Para os primeiros 43 dígitos da chave:
1. Começando do dígito mais à direita (posição 43) e caminhando para a esquerda (posição 1):
2. Multiplicar cada dígito por um peso sequencial cíclico: `[2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9, ...]`.
3. Somar todos os produtos:
   $$\text{Soma} = \sum_{i=1}^{43} (\text{dígito}_{i} \times \text{peso}_{i})$$
4. Calcular o resto da divisão por 11:
   $$\text{Resto} = \text{Soma} \pmod{11}$$
5. Regra do Dígito Verificador:
   - Se $\text{Resto} == 0$ ou $\text{Resto} == 1 \implies \mathbf{DV = 0}$
   - Caso contrário $\implies \mathbf{DV = 11 - Resto}$

### 7.3. Implementação de Referência (`accessKeyValidator.js`)
```javascript
/**
 * Valida a chave de acesso da NF-e de 44 dígitos e seu dígito verificador.
 * @param {string} accessKey Chave de acesso com 44 dígitos
 * @returns {{ isValid: boolean, error?: string, details?: object }}
 */
export function validateAccessKey(accessKey) {
  if (!accessKey || typeof accessKey !== 'string') {
    return { isValid: false, error: 'Chave de acesso não informada ou formato inválido.' };
  }

  const cleanKey = accessKey.replace(/\D/g, '');
  if (cleanKey.length !== 44) {
    return {
      isValid: false,
      error: `Chave de acesso deve conter exatamente 44 dígitos numéricos (encontrado: ${cleanKey.length}).`,
    };
  }

  // Validação do modelo
  const modelo = cleanKey.slice(20, 22);
  if (modelo !== '55') {
    return {
      isValid: false,
      error: `Modelo do documento fiscal inválido na chave: ${modelo}. O SmartNFe processa exclusivamente NF-e modelo 55.`,
    };
  }

  // Validação do mês de emissão (AAMM: posições 2..5)
  const mes = parseInt(cleanKey.slice(4, 6), 10);
  if (mes < 1 || mes > 12) {
    return {
      isValid: false,
      error: `Mês de emissão inválido na chave: ${mes}. Esperado entre 01 e 12.`,
    };
  }

  // Cálculo do Módulo 11
  const body43 = cleanKey.slice(0, 43);
  const recordedDV = parseInt(cleanKey.charAt(43), 10);
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];

  let sum = 0;
  let weightIdx = 0;
  for (let i = body43.length - 1; i >= 0; i--) {
    const digit = parseInt(body43.charAt(i), 10);
    sum += digit * weights[weightIdx % weights.length];
    weightIdx++;
  }

  const remainder = sum % 11;
  const calculatedDV = (remainder === 0 || remainder === 1) ? 0 : (11 - remainder);

  if (calculatedDV !== recordedDV) {
    return {
      isValid: false,
      error: `Dígito verificador da chave de acesso inválido: encontrado ${recordedDV}, mas o cálculo oficial resultou em ${calculatedDV}.`,
      details: { recordedDV, calculatedDV },
    };
  }

  return {
    isValid: true,
    details: {
      uf: cleanKey.slice(0, 2),
      anoMes: cleanKey.slice(2, 6),
      cnpjEmitente: cleanKey.slice(6, 20),
      modelo,
      serie: cleanKey.slice(22, 25),
      numeroNF: cleanKey.slice(25, 34),
      tipoEmissao: cleanKey.slice(34, 35),
      codigoAleatorio: cleanKey.slice(35, 43),
      dv: calculatedDV,
    },
  };
}
```

### 7.4. Vetores de Teste para Validação
- **Vetor Válido 1 (Exemplo MOC):**
  Chave (43 dígitos): `3524111234567800019055001000145892100123456`
  DV Calculado: `2`
  Chave Completa: `35241112345678000190550010001458921001234562` $\implies$ **VÁLIDA**
- **Vetor Válido 2 (Resto 0 $\implies$ DV 0):**
  Chave onde `Soma % 11 === 0` $\implies$ DV deve ser estritamente `0`.
- **Vetor Inválido 1:** Chave com 43 dígitos $\implies$ Erro de comprimento.
- **Vetor Inválido 2:** Chave com caracteres alfanuméricos ou espaços $\implies$ Erro de formato.
- **Vetor Inválido 3:** Chave modelo 65 (NFC-e) $\implies$ Erro de modelo incompatível.

---

## 8. Browser DOMParser Architecture Spec

### 8.1. Leitura via File API
- O usuário seleciona o arquivo via input ou drag-and-drop.
- Validação inicial imediata no cliente:
  - Tamanho máximo: `file.size <= 10 * 1024 * 1024` (10 MB).
  - Extensão: `.xml` (case-insensitive).
- Leitura do texto assíncrona:
  ```javascript
  const xmlString = await file.text();
  ```

### 8.2. Instanciação e Tratamento de Erros Sintáticos
O `DOMParser` do navegador não dispara exceções (`throw`) em caso de XML malformado. Ele retorna um `Document` com uma tag `<parsererror>`:
```javascript
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

const parseErrors = xmlDoc.getElementsByTagName('parsererror');
if (parseErrors && parseErrors.length > 0) {
  const rawMsg = parseErrors[0].textContent || 'Erro desconhecido na estrutura XML.';
  throw new Error(`XML malformado ou corrompido: ${rawMsg}`);
}
```

### 8.3. Navegação Tolerante a Namespaces e Prefixos
Para garantir que o código funcione com qualquer variante (`xmlns="http://www.portalfiscal.inf.br/nfe"`, `<nfe:NFe>`, ou sem namespace em testes):
```javascript
export function findTag(parent, localName) {
  if (!parent) return null;
  // 1. Tenta getElementsByTagNameNS com wildcard ou namespace SEFAZ
  if (parent.getElementsByTagNameNS) {
    const list = parent.getElementsByTagNameNS('*', localName);
    if (list && list.length > 0) return list[0];
  }
  // 2. Tenta getElementsByTagName simples
  if (parent.getElementsByTagName) {
    const list = parent.getElementsByTagName(localName);
    if (list && list.length > 0) return list[0];
  }
  // 3. Inspeção iterativa de nós filhos por localName
  if (parent.children) {
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      const childLocal = child.localName || child.nodeName.split(':').pop();
      if (childLocal === localName) return child;
    }
  }
  return null;
}

export function findAllTags(parent, localName) {
  if (!parent) return [];
  if (parent.getElementsByTagNameNS) {
    const list = parent.getElementsByTagNameNS('*', localName);
    if (list && list.length > 0) return Array.from(list);
  }
  if (parent.getElementsByTagName) {
    const list = parent.getElementsByTagName(localName);
    if (list && list.length > 0) return Array.from(list);
  }
  return [];
}

export function getTagValue(parent, localName, defaultValue = '') {
  const el = findTag(parent, localName);
  if (!el || el.textContent === null || el.textContent === undefined) {
    return defaultValue;
  }
  return el.textContent.trim();
}
```

### 8.4. Requisitos de Segurança
1. **Sem Execução de Scripts:** O parser utiliza `application/xml`, que trata todo o conteúdo como dados estáticos. Nenhuma tag `<script>` é executada.
2. **Sem `dangerouslySetInnerHTML`:** A renderização de todos os valores na interface (tabela de conferência, cards, cabeçalho) utiliza interpolação padrão React (`{item.descricao}`), garantindo auto-escaping de caracteres HTML.
3. **Sem Requisições Externas / Sem Backend:** O processamento ocorre 100% em memória no navegador. Nenhum byte do XML é enviado para APIs externas, servidores ou Vercel Serverless Functions.

---

## 9. Contract Mapping Spec para `invoiceRepository`

O documento resultante da conversão do XML importado deve satisfazer rigorosamente o contrato esperado por todas as páginas da aplicação (`/documentos`, `/documentos/[id]/conferencia`, `/divisao`, `/validacao`):

```javascript
{
  id: `nfe-${chaveAcesso}`,          // Identificador estável do documento
  numero: '000.145.892',             // Formatado com 9 dígitos e pontos
  serie: '1',                        // String
  chaveAcesso: '352411123456...',    // 44 dígitos validados
  tipoDocumento: 'XML',              // Fixo: XML
  naturezaOperacao: 'EXPORTAÇÃO...', // Da tag ide/natOp
  emissao: '2026-10-15',             // Data ISO YYYY-MM-DD
  dataEmissao: '2026-10-15T10:30:00Z', // ISO completo
  status: 'importado',               // Status inicial no ciclo de conferência
  isDemo: false,                     // CRÍTICO: false para documentos reais!
  isRealImport: true,                // Flag explícita para UI e memória de sessão
  emitente: {
    cnpj: '12.345.678/0001-90',      // Formatado com máscara
    razaoSocial: 'Agroexport...',    // String
    nomeFantasia: 'Agroexport',      // String
    inscricaoEstadual: '123456789',  // String
    uf: 'SP',                        // 2 letras maiúsculas
    municipio: 'Santos',             // String
  },
  destinatario: {
    nome: 'Global Trading...',       // String
    cnpj: '',                        // Vazio se exterior
    idEstrangeiro: 'NL884920192B01', // String se exterior
    pais: 'Holanda',                 // String
    paisCodigo: 'NL',                // Código ISO ou BR
    uf: 'EX',                        // 'EX' para exterior ou UF brasileira
    municipio: 'Rotterdam',          // String
  },
  itens: [
    {
      id: `nfe-${chaveAcesso}-item-${nItem}`, // ID ESTÁVEL DO ITEM
      item: 1,                                // Sequencial numérico da tag det/@nItem
      codigo: 'EXP-CAF-001',                  // Da tag prod/cProd
      cEAN: 'SEM GTIN',                       // Da tag prod/cEAN
      descricao: 'Café em Grão Cru...',       // Da tag prod/xProd
      ncm: '09011110',                        // 8 dígitos numéricos
      cfop: '7101',                           // 4 dígitos numéricos
      unidade: 'SC',                          // Da tag prod/uCom
      quantidade: '500.0000',                 // String decimal com 4 casas
      valorUnitario: '25.5000',               // String decimal com 4 casas
      valorTotal: '12750.00',                 // String decimal com 2 casas
      situacao: 'pendente',                   // Inicial: pendente
      modificado: false,                      // Inicial: false
      valorOriginal: null,                    // Snapshot preenchido na primeira edição
      inconsistencias: [],                    // Array de inconsistências populado pelo validador
      tributos: {                             // Dados tributários preservados
        icms: { cst: '40', vBC: '0.00', pICMS: '0.00', vICMS: '0.00' },
        ipi: { cst: '53', vBC: '0.00', pIPI: '0.00', vIPI: '0.00' },
        pis: { cst: '08', vBC: '0.00', pPIS: '0.00', vPIS: '0.00' },
        cofins: { cst: '08', vBC: '0.00', pCOFINS: '0.00', vCOFINS: '0.00' },
      },
    }
  ],
  totais: {
    valorProdutos: '284500.00',              // total/ICMSTot/vProd
    valorFrete: '5000.00',                   // total/ICMSTot/vFrete
    valorSeguro: '1200.00',                  // total/ICMSTot/vSeg
    valorDesconto: '0.00',                   // total/ICMSTot/vDesc
    outrasDespesas: '500.00',                // total/ICMSTot/vOutro
    valorTotalNota: '291200.00',             // total/ICMSTot/vNF
    pesoLiquido: '45000.000',                // transp/vol/pesoL
    pesoBruto: '46200.000',                  // transp/vol/pesoB
  },
  protocolo: {                               // Se protNFe presente
    numero: '135240001234567',
    dataAutorizacao: '2026-10-15T10:35:00Z',
    status: '100',
    motivo: 'Autorizado o uso da NF-e',
  },
  criadoEm: '2026-11-09T19:40:00.000Z',
  atualizadoEm: '2026-11-09T19:40:00.000Z',
}
```

---

## 10. Security & Session Storage Boundary Spec

### 10.1. Princípio do Isolamento de Sessão em Memória
Para cumprir rigorosamente o requisito R3 e proteger dados reais de clientes sem vazamento para o storage permanente do navegador:
1. **Coleção em Memória Volátil:**
   O `invoiceRepository.js` mantém uma coleção volátil em módulo:
   ```javascript
   const sessionInvoices = new Map();
   ```
2. **Separação na Criação (`create`):**
   - Se `invoiceData.isRealImport === true` ou `invoiceData.isDemo === false`:
     O documento é gravado exclusivamente em `sessionInvoices.set(newDoc.id, newDoc)`.
     **NÃO chama `saveAllInvoices()`** e **NÃO grava em `localStorageService`**.
   - Se `invoiceData.isDemo === true`:
     O documento é gravado no storage local persistente como parte dos dados de demonstração.
3. **Separação na Leitura e Listagem (`list` e `findById`):**
   - `findById(id)`: Busca primeiro em `sessionInvoices.get(id)`. Se encontrado, retorna clone do objeto em memória. Caso contrário, busca nos documentos do `localStorage`.
   - `list(filters)`: Combina `[...sessionInvoices.values(), ...persistedDocs]`, garantindo que os documentos importados apareçam imediatamente na listagem `/documentos`, no dashboard e nos filtros, mas sem que os reais tenham sido persistidos no disco.
4. **Mutações e Edições (`update` e `updateItem`):**
   - Se o documento estiver em `sessionInvoices`, a mutação atualiza diretamente o mapa em memória e não chama `localStorageService.save()`.
5. **Comportamento do Reset:**
   - `resetDemoData()`: Limpa e restaura apenas a chave de mock no `localStorage`.
   - `resetInvoice(id)`: Se for um documento de sessão real, lança erro informativo ("Documentos importados reais não possuem versão de fábrica para restauração") ou reverte para o snapshot original da importação.
6. **Aviso Visual de Sessão Temporária na Interface:**
   Quando a tela de conferência ou importação renderizar um documento com `isRealImport === true`:
   - Exibir banner de advertência no topo:
     *"⚠️ Modo Importação Local: Este documento foi carregado exclusivamente na memória do navegador. Por segurança, os dados fiscais reais não são persistidos e serão perdidos ao fechar ou recarregar a página."*
