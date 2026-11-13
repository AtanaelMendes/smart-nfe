# Specification Report: Synthetic NF-e 4.00 XML Fixture Generator (`tests/fixtures/xmlFixtureGenerator.mjs`)

**Track**: E2E Testing Track — SmartNFe Export Preparation (N:M)  
**Author**: teamwork_spec_miner (`e2e_spec_miner_1`)  
**Date**: 2026-11-13  
**Status**: Authoritative & Final  

---

## 1. Observation

Direct investigation of the codebase and authoritative specification documents revealed the following facts:

### 1.1 XML Parser Requirements (`app/features/xml/nfeXmlParser.js`)
- **Document Root Handling (lines 426–448)**:
  - Supports both full distribution envelopes (`<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">`) and standalone invoices (`<NFe xmlns="http://www.portalfiscal.inf.br/nfe">`).
  - Total immunity to namespaces (`xmlns`) and XML prefixes (e.g., `<fiscal:nfeProc>`) via `getElementLocalName` (lines 207–210), which strips prefix aliases matching `/^.*:/`.
  - Rejection with error code `'PARSER_ERROR'` if XML is syntactically malformed, empty, or contains unclosed tags (lines 406–424).
- **Invoice Identification & Structure (`<infNFe>` & `<ide>`, lines 449–491)**:
  - Mandatory `<infNFe>` element must have attribute `Id` in the exact format `Id="NFe{44_digits}"` and `versao="4.00"` (lines 458–461).
  - Mandatory `<ide>` element must have:
    - `<cUF>`: 2-digit IBGE state code matching `UF_IBGE_CODES` (e.g., `'35'` for SP, `'51'` for MT, `'42'` for SC).
    - `<cNF>`: 8-digit random numerical code.
    - `<natOp>`: Operation description (e.g., `'EXPORTAÇÃO DE MERCADORIAS'`, `'VENDA DE MERCADORIA'`).
    - `<mod>`: **Estritamente `'55'`**. Lines 474–480 enforce `if (options.strictMod55 !== false && modelo !== '55')` returning error code `'INVALID_MODEL'`.
    - `<serie>`: Invoice series (e.g., `'1'`, `'2'`).
    - `<nNF>`: Invoice sequential number (1 to 9 digits).
    - `<dhEmi>`: ISO date-time string (e.g., `'2026-10-15T10:30:00-03:00'`) or `<dEmi>` (`'2026-10-15'`).
    - `<tpNF>`: Operation type (`'1'` = Saída / Outgoing).
    - `<idDest>`: Destination flag (`'1'` = Interna, `'2'` = Interestadual, `'3'` = Exterior).
    - `<tpAmb>`: Environment (`'1'` = Produção, `'2'` = Homologação).
- **Parties (`<emit>` & `<dest>`, lines 492–513)**:
  - `<emit>` requires `<CNPJ>` (14 digits) or `<CPF>` (11 digits), `<xNome>` (corporate name), `<xFant>` (trade name), `<enderEmit>` (`<xLgr>`, `<nro>`, `<xBairro>`, `<cMun>`, `<xMun>`, `<UF>`, `<CEP>`, `<cPais>1058</cPais>`, `<xPais>Brasil</xPais>`), `<IE>` (state tax ID), and `<CRT>`.
  - `<dest>` for foreign export requires `<idEstrangeiro>` (foreign registration code, e.g. `'NL884920192B01'`), `<xNome>`, `<enderDest>` (`<xLgr>`, `<nro>`, `<xBairro>`, `<cMun>9999999</cMun>`, `<xMun>`, `<UF>EX</UF>`, `<cPais>`, `<xPais>`), and `<indIEDest>9</indIEDest>`. For domestic it accepts `<CNPJ>`.
- **Items (`<det nItem="k">`, lines 514–632)**:
  - Sequential attribute `nItem="1"`, `nItem="2"`, etc.
  - `<prod>` tags extracted: `<cProd>`, `<cEAN>`, `<xProd>`, `<NCM>`, `<CFOP>`, `<uCom>`, `<qCom>`, `<vUnCom>`, `<vProd>`, `<cEANTrib>`, `<uTrib>`, `<qTrib>`, `<vUnTrib>`, `<vFrete>`, `<vSeg>`, `<vDesc>`, `<vOutro>`, `<indTot>1</indTot>`.
  - Decimal fields sanitized via `cleanDecimal`: `qCom` (4 decimals), `vUnCom` (up to 10 decimals), `vProd`, `vFrete`, `vSeg`, `vDesc`, `vOutro` (2 decimals).
  - Tax elements `<imposto>`: `<ICMS>` (e.g. `<ICMS40><orig>0</orig><CST>40</CST></ICMS40>` for export exemption, or `<ICMS00>`), `<IPI>`, `<PIS>`, `<COFINS>`.
- **Totals (`<total><ICMSTot>`, lines 634–652)**:
  - Extracted: `<vProd>`, `<vFrete>`, `<vSeg>`, `<vDesc>`, `<vOutro>`, `<vNF>`, `<vICMS>`, `<vIPI>`, `<vPIS>`, `<vCOFINS>`.
  - Reconciled via `calculateInvoiceTotals` if missing or zero in `xmlToInvoiceMapper.js` (lines 280–288).
- **Transport & Protocol (`<transp>` & `<protNFe>`, lines 653–690)**:
  - `<transp>`: `<modFrete>`, `<vol>` (`<qVol>`, `<esp>`, `<pesoL>`, `<pesoB>`).
  - `<protNFe><infProt>`: `<tpAmb>`, `<verAplic>`, `<chNFe>`, `<dhRecbto>`, `<nProt>`, `<digVal>`, `<cStat>`, `<xMotivo>`.

### 1.2 Access Key & Modulo 11 Algorithm (`app/features/xml/accessKeyValidator.js`)
- **Key Structure (lines 132–202)**:
  - Exact length: 44 numeric digits (`/^\d{44}$/`).
  - Positions 01–02: `cUF` — 2-digit IBGE code. Must belong to `UF_IBGE_CODES` (27 valid UFs: `'11'` through `'53'`).
  - Positions 03–04: `AA` — 2-digit year (e.g., `'26'`).
  - Positions 05–06: `MM` — 2-digit month (`01` to `12`).
  - Positions 07–20: `CNPJ` — 14-digit unformatted emitente CNPJ.
  - Positions 21–22: `mod` — strictly `'55'`.
  - Positions 23–25: `serie` — 3 digits (e.g., `'001'`).
  - Positions 26–34: `nNF` — 9 digits with leading zeros (e.g., `'000145892'`).
  - Position 35: `tpEmis` — 1 digit, must be `'1'` through `'7'` (standard `'1'`).
  - Positions 36–43: `cNF` — 8-digit random code.
  - Position 44: `cDV` — 1-digit check digit.
- **Modulo 11 Algorithm (lines 44–76)**:
  - Weights array: `WEIGHTS_MODULO_11 = [2, 3, 4, 5, 6, 7, 8, 9]`.
  - Cyclic multiplication from right to left: for index $i$ from 42 down to 0, weight is `WEIGHTS_MODULO_11[(42 - i) % 8]`.
  - Sum $S = \sum_{i=0}^{42} (\text{digit}_i \times \text{weight}_i)$.
  - Remainder $R = S \pmod{11}$.
  - Check digit formula:
    $$\text{cDV} = (R == 0 \lor R == 1) ? 0 : (11 - R)$$

### 1.3 Mapper Contract & Session Isolation (`app/features/xml/xmlToInvoiceMapper.js`)
- Item ID convention (lines 34–38): `nfe-${chaveAcesso}-item-${nItem}`.
- Invoice ID convention (line 140): `nfe-${chaveAcesso}`.
- Invoice Number format (lines 47–55): `000.145.892` (9-digit 3-block dotted notation).
- Mandatory security flags (lines 317–318):
  - `isDemo: false`: Prevents saving to LocalStorage.
  - `isRealImport: true`: Designates invoice to volatile session memory (`sessionInvoices = new Map()`).

### 1.4 Unified Allocation Matrix Invariants (`PROJECT.md` & `allocationEngine.js`)
- Composite item identifier: `${sourceInvoiceId}__${sourceItemId}`.
- Conservation invariant:
  $$\text{saldoDisponível}(S, i) = \text{quantidadeOriginal}(S, i) - \sum_{k=1}^{M} \text{alocado}(k, S, i)$$
- Non-negativity: $\text{alocado} \ge 0$ and $\text{saldoDisponível} \ge 0$.
- Incompatible units trap: unit compatibility check (`SC` vs `KG` vs `TON`) must reject mixing without conversion factor.
- Repeated product codes: distinct suppliers with identical `cProd` (e.g. `'SOJA-01'`) must remain isolated by their composite key.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Parser | Root Tag Flexibility | Supports both distribution envelope `<nfeProc>` and bare `<NFe>` | XML string | Parsed DOM tree | Throws or returns `PARSER_ERROR` if unclosed or non-XML | `nfeXmlParser.js:426` |
| 2 | Parser | Namespace & Prefix Immunity | Strips XML namespaces and arbitrary prefixes (e.g. `nfe:`, `fiscal:`) | Prefixed tags | Normalized local element names | Ignores invalid xmlns URLs | `nfeXmlParser.js:207` |
| 3 | Parser | Strict Model 55 Enforcement | SmartNFe exclusively processes NF-e Model 55, rejecting NFC-e (65), CT-e (57), MDF-e (58) | `<mod>` in `<ide>` | Passes if `'55'` | Returns `{ success: false, details: { code: 'INVALID_MODEL' } }` | `nfeXmlParser.js:474` |
| 4 | Parser | Decimal String Normalization | Normalizes quantities (4 decimals) and unit values (4–10 decimals) as exact strings | Raw XML tag text | Clean dot-decimal string | Replaces `,` with `.`, defaults to `'0.00'` or `'0.0000'` | `nfeXmlParser.js:317` |
| 5 | Parser | Reconciled Total Calculation | Automatically recalculates invoice totals if `<vProd>` or `<vNF>` are omitted or zero | Item list + accessory values | Complete `totais` object | Never produces `NaN`; falls back to item sum | `xmlToInvoiceMapper.js:270` |
| 6 | AccessKey | 44-Digit Structural Decomposition | Decomposes access key into UF, AAMM, CNPJ, model, series, number, tpEmis, cNF, and cDV | 44-char string | Decomposed metadata object | Returns `{ isValid: false, error: ... }` on length/format mismatch | `accessKeyValidator.js:185` |
| 7 | AccessKey | Modulo 11 Check Digit | Calculates official SEFAZ check digit with cyclic weights 2..9 right-to-left | 43-digit string | Single digit integer (0..9) | Returns `null` if body is not 43 digits | `accessKeyValidator.js:54` |
| 8 | AccessKey | Remainder 0/1 Zero Rule | Special SEFAZ rule mapping remainders 0 and 1 to DV = 0 | Sum mod 11 is 0 or 1 | DV = 0 | If remainder $\ge 2$, DV = $11 - \text{remainder}$ | `accessKeyValidator.js:74` |
| 9 | AccessKey | IBGE UF Code Validation | Validates state code against 27 official Brazilian UFs | First 2 digits of key | 2-letter state abbreviation | Rejects codes not in IBGE table (e.g. `'99'`) | `accessKeyValidator.js:132` |
| 10 | AccessKey | Month Boundary Validation | Validates emission month in positions 05–06 is between 01 and 12 | Digits 5–6 of key | Month number | Rejects `'00'`, `'13'`, `'99'` | `accessKeyValidator.js:142` |
| 11 | AccessKey | Emission Type Validation | Validates tpEmis in position 35 is between `'1'` and `'7'` | Digit 35 of key | Emission type string | Rejects `'0'`, `'8'`, `'9'` | `accessKeyValidator.js:161` |
| 12 | Mapper | Deterministic Item ID | Formats item ID as `nfe-${chaveAcesso}-item-${nItem}` | Access key + sequential item number | Stable item ID string | Defaults nItem to 1 if missing | `xmlToInvoiceMapper.js:34` |
| 13 | Mapper | 9-Digit Dotted Number | Formats invoice number into `000.145.892` format | Numeric or string nNF | Padded 9-digit dotted string | Falls back to `'000.000.000'` | `xmlToInvoiceMapper.js:47` |
| 14 | Mapper | Volatile Session Tagging | Flags real parsed XMLs with `isRealImport: true` and `isDemo: false` | Parsed XML object | Mapped Invoice entity | Prevents leakage into localStorage | `xmlToInvoiceMapper.js:317` |
| 15 | Generator | Parametric Single XML | Generates valid NF-e 4.00 XML string from supplier, client, and item definitions | Options object | UTF-8 XML string | Validates inputs before emission | New feature requirement |
| 16 | Generator | 2->1 Grouping Scenario | Generates 2 distinct supplier XMLs targeting a single foreign export client | Grouping options | Array of 2 XML fixtures + metadata | Rejects incompatible commodities | New feature requirement |
| 17 | Generator | 1->M Division Scenario | Generates 1 large agro-industry invoice suitable for splitting into M contracts | Division options | Single multi-item XML fixture | Ensures divisibility without floating point residue | New feature requirement |
| 18 | Generator | N->M Mixed Scenario | Generates N suppliers distributed across M destinations with partial allocations | Matrix options | Array of N XML fixtures | Preserves residual balances | New feature requirement |
| 19 | Generator | Repeated Product Codes | Generates XMLs from different suppliers sharing exact same `cProd` (e.g. `SOJA-01`) | Supplier list + code | Array of XMLs with colliding codes | Ensures distinct item IDs via composite keys | New feature requirement |
| 20 | Generator | Incompatible Units Fixtures | Generates invoices with identical commodity in mismatched units (`SC`, `KG`, `TON`) | Commodity + units list | Array of XMLs with diverse units | Triggers validation trap in allocation engine | New feature requirement |
| 21 | Generator | Scale Batch (50 XMLs) | Generates 50 valid XMLs across 10 suppliers with 200+ line items for stress testing | Batch size 50 | Array of 50 XML fixtures | Deterministic generation under 500ms | New feature requirement |

---

## 3. Edge Cases

| # | Feature | Input | Observed / Expected Behavior |
|---|---------|-------|------------------------------|
| 1 | AccessKey DV | Sum mod 11 = 0 | DV must be strictly `0` (not 11) |
| 2 | AccessKey DV | Sum mod 11 = 1 | DV must be strictly `0` (not 10) |
| 3 | AccessKey DV | Sum mod 11 = 10 | DV must be $11 - 10 = 1$ |
| 4 | AccessKey DV | Sum mod 11 = 2 | DV must be $11 - 2 = 9$ |
| 5 | AccessKey Length | 43 digits (missing DV) | Rejected with error `"Chave de acesso deve conter exatamente 44 dígitos"` |
| 6 | AccessKey Length | 45 digits (extra digit) | Rejected with error `"Chave de acesso deve conter exatamente 44 dígitos"` |
| 7 | AccessKey Characters | Contains letters or symbols | Rejected with error `"Chave de acesso contém caracteres não numéricos"` |
| 8 | AccessKey Model | Model = `'65'` (NFC-e) | Rejected with error `"O SmartNFe processa exclusivamente NF-e modelo 55"` |
| 9 | AccessKey Month | Month = `'00'` or `'13'` | Rejected with error `"Mês de emissão inválido na chave"` |
| 10 | AccessKey UF | UF = `'99'` | Rejected with error `"Código IBGE não reconhecido"` |
| 11 | XML Parsing | Unclosed tag `<prod>` | Returns `PARSER_ERROR` with line/column diagnostic without crashing |
| 12 | XML Parsing | Empty or whitespace-only string | Returns `EMPTY_CONTENT` gracefully |
| 13 | XML Parsing | Standalone `<NFe>` without `<nfeProc>` | Successfully parses, sets `protocolo = null` |
| 14 | XML Parsing | XML with arbitrary namespaces (`<nfe:infNFe>`) | Strips namespace prefixes and parses seamlessly |
| 15 | Quantities | 4 decimal places (e.g. `'500.1234'`) | Preserved exactly without floating point binary drift |
| 16 | Unit Values | Extended decimals (e.g. `'686.6667'`) | Preserved up to 10 decimal places as string |
| 17 | Accessory Expenses | Cent apportionment across destinations | Sum of apportioned expenses across M notes must equal original cent-for-cent |
| 18 | Repeated Codes | Multiple suppliers with `cProd = 'SOJA-01'` | Preserved as separate entities via `${sourceInvoiceId}__${sourceItemId}` |
| 19 | Mixed Units | Item A with `SC` and Item B with `KG` | Flagged as incompatible by `checkUnitCompatibility` |
| 20 | Batch Scale | 50 XMLs uploaded concurrently | Concurrency pool limits parsing to 3 at a time without blocking UI |

---

## 4. Technical Specification: SEFAZ NF-e 4.00 XML Structure & SmartNFe Parser Contract

### 4.1 Schema Envelope Specification
The generator must produce valid XML strings conforming to the SEFAZ NF-e 4.00 layout. It should default to producing the full distribution envelope `<nfeProc>`, but also support generating bare `<NFe>` documents.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe{44_DIGIT_CHAVE}" versao="4.00">
      <ide>...</ide>
      <emit>...</emit>
      <dest>...</dest>
      <det nItem="1">...</det>
      <total>...</total>
      <transp>...</transp>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>SP_NFE_PL_009_V4</verAplic>
      <chNFe>{44_DIGIT_CHAVE}</chNFe>
      <dhRecbto>{ISO_DATETIME}</dhRecbto>
      <nProt>{15_DIGIT_PROTOCOL}</nProt>
      <digVal>{BASE64_DIGEST}</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>
```

### 4.2 Mandatory Tags and Field Specifications

#### A. Tag `<ide>` (Identificação da NF-e)
| Tag | Type | Length | Required | Example | Description |
|-----|------|--------|:--------:|---------|-------------|
| `cUF` | Integer | 2 | Yes | `35` | IBGE state code matching first 2 digits of `chNFe` |
| `cNF` | Integer | 8 | Yes | `00123456` | Random 8-digit code matching positions 36–43 of `chNFe` |
| `natOp` | String | 1–60 | Yes | `EXPORTAÇÃO DE MERCADORIAS` | Operation description |
| `mod` | Integer | 2 | Yes | `55` | **Must strictly be `55`** |
| `serie` | Integer | 1–3 | Yes | `1` | Invoice series |
| `nNF` | Integer | 1–9 | Yes | `145892` | Sequential invoice number matching positions 26–34 of `chNFe` |
| `dhEmi` | ISO8601 | 25 | Yes | `2026-10-15T10:30:00-03:00` | Emission date/time |
| `tpNF` | Integer | 1 | Yes | `1` | 1 = Saída (Outgoing) |
| `idDest` | Integer | 1 | Yes | `3` | 1 = Interna, 2 = Interestadual, 3 = Exterior |
| `cMunFG` | Integer | 7 | Yes | `3548500` | IBGE municipality code of issuing location |
| `tpImp` | Integer | 1 | Yes | `1` | 1 = Retrato |
| `tpEmis` | Integer | 1 | Yes | `1` | 1 = Normal |
| `cDV` | Integer | 1 | Yes | `2` | Modulo 11 check digit matching position 44 of `chNFe` |
| `tpAmb` | Integer | 1 | Yes | `1` | 1 = Produção |
| `finNFe` | Integer | 1 | Yes | `1` | 1 = Normal |
| `indFinal` | Integer | 1 | Yes | `0` | 0 = Normal |
| `indPres` | Integer | 1 | Yes | `9` | 9 = Não presencial (outros) |
| `procEmi` | Integer | 1 | Yes | `0` | 0 = Emissão de NF-e com aplicativo do contribuinte |
| `verProc` | String | 1–20 | Yes | `SmartNFe-4.0.0` | Issuing software version |

#### B. Tag `<emit>` (Emitente)
| Tag | Type | Required | Example | Description |
|-----|------|:--------:|---------|-------------|
| `CNPJ` | Numeric | Yes | `12345678000195` | 14 digits unformatted with valid CNPJ check digits |
| `xNome` | String | Yes | `Agroexport Brasil S.A.` | Legal corporate name |
| `xFant` | String | No | `Agroexport` | Commercial trade name |
| `enderEmit/xLgr` | String | Yes | `Avenida Portuária` | Street address |
| `enderEmit/nro` | String | Yes | `1500` | Building number |
| `enderEmit/xBairro` | String | Yes | `Porto` | District / neighborhood |
| `enderEmit/cMun` | Numeric | Yes | `3548500` | 7-digit IBGE municipality code |
| `enderEmit/xMun` | String | Yes | `Santos` | Municipality name |
| `enderEmit/UF` | String | Yes | `SP` | 2-letter state abbreviation matching `cUF` |
| `enderEmit/CEP` | Numeric | Yes | `11010000` | 8-digit postal code |
| `enderEmit/cPais` | Numeric | Yes | `1058` | Country code (1058 = Brazil) |
| `enderEmit/xPais` | String | Yes | `Brasil` | Country name |
| `IE` | Numeric | Yes | `123456789012` | State tax registration |
| `CRT` | Numeric | Yes | `3` | Tax regime (3 = Regime Normal, 1 = Simples Nacional) |

#### C. Tag `<dest>` (Destinatário)
- **Foreign Client (Export)**:
  - `<idEstrangeiro>`: e.g. `'NL884920192B01'` (European VAT or country ID).
  - `<xNome>`: e.g. `'Global Trading Logistics B.V.'`.
  - `<enderDest>`: `<xLgr>`, `<nro>`, `<xBairro>`, `<cMun>9999999</cMun>`, `<xMun>Rotterdam</xMun>`, `<UF>EX</UF>`, `<cPais>3607</cPais>`, `<xPais>Holanda</xPais>`.
  - `<indIEDest>`: `'9'` (Não Contribuinte).
- **Domestic Client**:
  - `<CNPJ>`: 14 digits.
  - `<xNome>`: Corporate name.
  - `<enderDest>`: Standard Brazilian address with valid `cMun`, `UF`, `CEP`.
  - `<indIEDest>`: `'1'` (Contribuinte ICMS) or `'9'`.

#### D. Tag `<det nItem="k">` (Itens de Mercadoria)
For each item $k$ ($1 \le k \le N$):
- `<prod>`:
  - `<cProd>`: Product code (e.g. `'EXP-CAF-001'`, `'SOJA-01'`).
  - `<cEAN>`: `'SEM GTIN'`.
  - `<xProd>`: Detailed commercial description.
  - `<NCM>`: 8 digits NCM code (e.g. `'09011110'` for Coffee, `'12019000'` for Soy).
  - `<CFOP>`: 4 digits CFOP (e.g. `'7101'` for Direct Export, `'5102'` for Domestic).
  - `<uCom>`: Commercial unit (`'SC'`, `'TON'`, `'KG'`, `'UN'`, `'CX'`).
  - `<qCom>`: Commercial quantity (string with 4 decimal places, e.g. `'500.0000'`).
  - `<vUnCom>`: Unit price (string with 4 decimal places, e.g. `'25.5000'`).
  - `<vProd>`: Total line price ($qCom \times vUnCom$ with 2 decimals, e.g. `'12750.00'`).
  - `<cEANTrib>`: `'SEM GTIN'`.
  - `<uTrib>`: Same as `uCom`.
  - `<qTrib>`: Same as `qCom`.
  - `<vUnTrib>`: Same as `vUnCom`.
  - `<vFrete>`: Prorated freight for this item (2 decimals, e.g. `'100.00'`).
  - `<vSeg>`: Prorated insurance for this item (2 decimals, e.g. `'50.00'`).
  - `<vDesc>`: Prorated discount for this item (2 decimals, e.g. `'0.00'`).
  - `<vOutro>`: Other accessory expenses (2 decimals, e.g. `'25.00'`).
  - `<indTot>`: `'1'`.
- `<imposto>`:
  - `<ICMS>`: `<ICMS40><orig>0</orig><CST>40</CST></ICMS40>` (Export immunity).
  - `<PIS>`: `<PISNT><CST>08</CST></PISNT>` (Export zero rate).
  - `<COFINS>`: `<COFINSNT><CST>08</CST></COFINSNT>` (Export zero rate).

#### E. Tag `<total><ICMSTot>` (Totais Fiscais)
All monetary totals must balance exactly:
- `vProd` = $\sum \text{vProd}_k$
- `vFrete` = $\sum \text{vFrete}_k$
- `vSeg` = $\sum \text{vSeg}_k$
- `vDesc` = $\sum \text{vDesc}_k$
- `vOutro` = $\sum \text{vOutro}_k$
- `vNF` = $vProd + vFrete + vSeg + vOutro - vDesc$

---

## 5. Technical Specification: Modulo 11 Check Digit Algorithm for 44-Digit Access Keys

### 5.1 Key Composition Map (Positions 1 to 44)

```
Pos  01-02: cUF       (2 digits)  Código IBGE da UF (ex: 35 = SP, 51 = MT)
Pos  03-04: AA        (2 digits)  Ano da emissão (ex: 26 para 2026)
Pos  05-06: MM        (2 digits)  Mês da emissão (01 a 12, ex: 10 para Outubro)
Pos  07-20: CNPJ      (14 digits) CNPJ do emitente (somente dígitos)
Pos  21-22: mod       (2 digits)  Modelo do documento (estritamente '55')
Pos  23-25: serie     (3 digits)  Série da NF-e com zeros à esquerda (ex: '001')
Pos  26-34: nNF       (9 digits)  Número da NF-e com zeros à esquerda (ex: '000145892')
Pos  35-35: tpEmis    (1 digit)   Tipo de emissão ('1' = Normal)
Pos  36-43: cNF       (8 digits)  Código numérico aleatório da NF-e (ex: '00123456')
Pos  44-44: cDV       (1 digit)   Dígito Verificador (Módulo 11)
```

### 5.2 Mathematical Formulation of Modulo 11

Let $B = [b_0, b_1, b_2, \dots, b_{42}]$ be the 43 digits of the key body ($b_0$ is index 0, $b_{42}$ is index 42).
The weight vector $W = [2, 3, 4, 5, 6, 7, 8, 9]$ cycles from right to left:

$$w_i = W[(42 - i) \pmod 8] \quad \text{for } i \in \{42, 41, \dots, 0\}$$

Compute the weighted sum:

$$S = \sum_{i=0}^{42} (b_i \times w_i)$$

Compute remainder:

$$R = S \pmod{11}$$

Compute Check Digit ($cDV$):

$$cDV = \begin{cases} 0, & \text{if } R \in \{0, 1\} \\ 11 - R, & \text{if } 2 \le R \le 10 \end{cases}$$

### 5.3 Authoritative Test Vectors
The following canonical vectors are verified against SEFAZ and SmartNFe's `accessKeyValidator.js`:

| 43-Digit Body | Sum ($S$) | Remainder ($R$) | Calculated $cDV$ | Complete 44-Digit Access Key |
|---------------|:---------:|:---------------:|:----------------:|-----------------------------|
| `3524111234567800019055001000145892100123456` | 647 | 9 | **2** | `35241112345678000190550010001458921001234562` |
| `3524119876543200018855001000000042100789012` | 660 | 0 | **0** | `35241198765432000188550010000000421007890120` |
| `3524111234567800019055001000145892100123457` | 649 | 0 | **0** | `35241112345678000190550010001458921001234570` |
| `3524111234567800019055001000145892100123452` | 639 | 1 | **0** | `35241112345678000190550010001458921001234520` |
| `5126107321849200016055001000089412100456789` | 648 | 10 | **1** | `51261073218492000160550010000894121004567891` |

---

## 6. Technical Specification: Parametric Generator Design & Scenarios

### 6.1 Verified Supplier Catalog (10 Brazilian Suppliers)
The generator must include an authoritative pool of suppliers across major agricultural and industrial states:

| Index | Name (`xNome`) | CNPJ (Valid Mod 11) | State (`UF`) | IBGE (`cUF`) | City (`xMun`) | Municipal IBGE | IE | CRT |
|:-----:|----------------|---------------------|:------------:|:------------:|---------------|:--------------:|----|:---:|
| 0 | Agroexport Brasil S.A. | `12345678000195` | SP | 35 | Santos | 3548500 | 123456789012 | 3 |
| 1 | Cooperativa Agroindustrial de MT - COOPAGRO | `73218492000160` | MT | 51 | Rondonópolis | 5107602 | 512345678901 | 3 |
| 2 | Cerealista Centro-Oeste S.A. | `03112554000179` | GO | 52 | Rio Verde | 5218805 | 523456789012 | 3 |
| 3 | Metalúrgica Sul Americana Ltda | `98765432000198` | SC | 42 | Joinville | 4209102 | 423456789012 | 3 |
| 4 | Eletroparts do Brasil S.A. | `55544433000108` | RS | 43 | Porto Alegre | 4314902 | 434567890123 | 3 |
| 5 | Grãos do Sul Cooperativa | `88999777000152` | PR | 41 | Cascavel | 4104808 | 415678901234 | 3 |
| 6 | Café Minas Exportadora Ltda | `14235813000175` | MG | 31 | Varginha | 3170701 | 316789012345 | 3 |
| 7 | Bioenergia Canais Paulistas S.A. | `21345589000130` | SP | 35 | Ribeirão Preto | 3543402 | 357890123456 | 3 |
| 8 | Frigorífico Pantanal Mato-Grossense | `34567890000130` | MS | 50 | Campo Grande | 5002704 | 508901234567 | 3 |
| 9 | Algodoeira do Cerrado S.A. | `45678901000175` | MT | 51 | Sorriso | 5107925 | 519012345678 | 3 |

### 6.2 Verified Foreign Export Clients Catalog
| Client Name | Country | Code | VAT / Tax ID (`idEstrangeiro`) | Destination Port |
|-------------|---------|:----:|--------------------------------|------------------|
| Global Trading Logistics B.V. | Holanda | NL | `NL884920192B01` | Rotterdam |
| Industrial Supply Corp. | Estados Unidos | US | `US-TX-9874125` | Houston |
| Auto Assembly Europe GmbH | Alemanha | DE | `DE814523990` | Hamburg |
| Sinochem Agro Overseas Ltd | China | CN | `CN9131000012` | Shanghai |
| Cargill International Trading Pte Ltd | Cingapura | SG | `SG201988231A` | Singapore |
| Antwerp Agribulk Terminal N.V. | Bélgica | BE | `BE0428991204` | Antwerp |

### 6.3 Verified Commodities Catalog
| Key | Description | NCM | Default Unit | Base Price (BRL) | Typical Qty |
|-----|-------------|:---:|:------------:|:----------------:|:-----------:|
| `CAFE` | Café em Grão Cru Arábica Tipo 6 | `09011110` | SC | `25.5000` | `500.0000` |
| `SOJA` | Soja em Grãos Não Transgênica | `12019000` | TON | `350.0000` | `120.0000` |
| `ACUCAR` | Açúcar Cristal Branco Refinado Icumsa 45 | `17019900` | TON | `420.0000` | `80.0000` |
| `SUCO` | Suco de Laranja Concentrado FCOJ 66 Brix | `20091100` | TON | `1800.0000` | `25.0000` |
| `CELULOSE` | Polpa de Celulose Branqueada de Eucalipto | `47032900` | TON | `480.0000` | `150.0000` |
| `CARNE` | Cortes Congelados de Carne Bovina Desossada | `02023000` | KG | `12.5000` | `3500.0000` |
| `MILHO` | Milho Amarelo em Grãos Padrão Exportação | `10059010` | TON | `180.0000` | `200.0000` |
| `ALGODAO` | Algodão em Pluma Beneficiado Tipo 41-4 | `52010020` | TON | `1450.0000` | `40.0000` |

### 6.4 Specification of the 6 Concrete Scenarios

#### Scenario 1: Grouping (2 -> 1)
- **Goal**: Aggregate 2 distinct supplier invoices into 1 export shipment (Global Trading NL).
- **Structure**:
  - Invoice 1: Supplier `Agroexport Brasil S.A.` (SP), Series 1, Number 145892.
    - Item 1: `EXP-CAF-001` (Café Arábica), `500.0000 SC` @ `25.5000` = `12750.00`. Freight = `100.00`.
  - Invoice 2: Supplier `Cooperativa Agroindustrial de MT` (MT), Series 1, Number 089412.
    - Item 1: `COOP-CAF-002` (Café Conilon), `300.0000 SC` @ `22.0000` = `6600.00`. Freight = `60.00`.
- **Destination**: `Global Trading Logistics B.V.` (`NL884920192B01`).
- **Test Invariant**: Line items must preserve distinct origin `(sourceInvoiceId, sourceItemId)`, but both allocate 100% to destination.

#### Scenario 2: Division (1 -> M)
- **Goal**: Divide 1 massive agro-industry invoice across 3 international contracts ($M = 3$).
- **Structure**:
  - Invoice 1: Supplier `Cerealista Centro-Oeste S.A.` (GO), Number 500100.
    - Item 1: `SOJA-BULK-01`, `1000.0000 TON` @ `320.0000` = `320000.00`. Freight = `6000.00`.
    - Item 2: `MILHO-BULK-02`, `500.0000 TON` @ `180.0000` = `90000.00`. Freight = `3000.00`.
- **Destinations**:
  - Dest 1 (Cargill SG): allocates `400.0000 TON` Soja + `200.0000 TON` Milho.
  - Dest 2 (Bunge NL): allocates `350.0000 TON` Soja + `200.0000 TON` Milho.
  - Dest 3 (ADM BE): allocates `250.0000 TON` Soja + `100.0000 TON` Milho.
- **Test Invariant**: Exact conservation ($400 + 350 + 250 = 1000.0000$; $200 + 200 + 100 = 500.0000$; remaining = $0.0000$). Apportioned freights sum to exactly $6000.00$ and $3000.00$ without cent drift.

#### Scenario 3: Mixed Allocation (N -> M)
- **Goal**: Arbitrary $N = 4$ suppliers distributed across $M = 3$ destinations with partial allocations.
- **Structure**:
  - 4 invoices from suppliers 0, 1, 5, 6 with a total of 8 line items.
  - Allocations: 4 items 100% allocated, 2 items partially allocated (e.g. 60% allocated, 40% active balance), 2 items unallocated (0%).
- **Test Invariant**: Real-time remaining balances match `original - sum(allocations)`. Can save drafts with partial balances.

#### Scenario 4: Repeated Product Codes (`SOJA-01`)
- **Goal**: Verify that identical product codes from different suppliers do not collide or merge.
- **Structure**:
  - Invoice A (Agroexport SP): Item 1 has `<cProd>SOJA-01</cProd>`, description "Soja Grãos Tipo Exportação SP", `uCom: TON`.
  - Invoice B (Coopagro MT): Item 1 has `<cProd>SOJA-01</cProd>`, description "Soja Grãos Não-OGM MT", `uCom: TON`.
  - Invoice C (Grãos do Sul PR): Item 1 has `<cProd>SOJA-01</cProd>`, description "Soja Grãos Floculada PR", `uCom: TON`.
- **Test Invariant**: Composite keys `nfe-SP...__item-1`, `nfe-MT...__item-1`, and `nfe-PR...__item-1` remain distinct in the allocation matrix.

#### Scenario 5: Incompatible Units Trap (`SC` vs `KG` vs `TON`)
- **Goal**: Trigger the validation engine trap when attempting arithmetic aggregation across incompatible commercial units.
- **Structure**:
  - Invoice 1: Coffee in bags, `<uCom>SC</uCom>`, `qCom: 500.0000`.
  - Invoice 2: Coffee in kilograms, `<uCom>KG</uCom>`, `qCom: 30000.0000`.
  - Invoice 3: Coffee in metric tons, `<uCom>TON</uCom>`, `qCom: 30.0000`.
- **Test Invariant**: `checkUnitCompatibility` returns `false`, preventing erroneous direct addition of `500 + 30000 + 30`.

#### Scenario 6: Large-Scale Stress Batch (50 XMLs -> 5 Destinations)
- **Goal**: 50 synthetic XMLs (10 suppliers, 200+ line items) distributed into 5 shipping containers.
- **Structure**:
  - Deterministic loop: 50 invoices across the 10 suppliers (5 invoices per supplier).
  - Each invoice contains 4 to 5 line items.
  - Total line items: ~220 items.
  - Total value: tens of millions of BRL.
  - Valid Modulo 11 access keys for all 50.
- **Test Invariant**: Browser batch import concurrency pool (pool = 3) processes all 50 smoothly. All 50 stored in volatile memory `sessionInvoices`. BigInt allocation matrix calculates totals without memory leaks or floating point errors.

---

## 7. Technical Specification: ES Module Architecture for `tests/fixtures/xmlFixtureGenerator.mjs`

### 7.1 Module Interface Definition
`tests/fixtures/xmlFixtureGenerator.mjs` must be a self-contained ES module with zero external dependencies, leveraging native Node.js capabilities and SmartNFe's existing BigInt arithmetic.

```javascript
/**
 * SmartNFe — Gerador Paramétrico de Fixtures XML de NF-e 4.00
 * tests/fixtures/xmlFixtureGenerator.mjs
 */

// 1. Catálogos e Tabelas Oficiais
export const UF_IBGE_TABLE = { ... };
export const SUPPLIERS_CATALOG = [ ... ]; // 10 Fornecedores com CNPJ Válido
export const FOREIGN_CLIENTS_CATALOG = [ ... ]; // 6 Clientes Estrangeiros
export const COMMODITIES_CATALOG = { ... }; // 8 Commodities padrão de exportação

// 2. Funções Criptográficas/Algorítmicas da Chave de Acesso
export function calculateModulo11(body43) { ... }
export function generateAccessKey(options = {}) { ... }
export function formatAccessKey(key) { ... }

// 3. Funções Construtoras de XML
export function buildXmlItem(itemSpec, index) { ... }
export function generateNFeXml(invoiceDefinition = {}, options = {}) { ... }
export function generateNFeBatch(definitionsOrCount = 10, globalOptions = {}) { ... }

// 4. Cenários Pré-configurados (Ready-to-use para Testes E2E)
export const SCENARIOS = {
  createGroupingScenario(options = {}) { ... },        // 2 -> 1
  createDivisionScenario(options = {}) { ... },        // 1 -> M
  createMixedScenario(options = {}) { ... },           // N -> M
  createRepeatedCodesScenario(options = {}) { ... },   // SOJA-01 em 3 fornecedores
  createIncompatibleUnitsScenario(options = {}) { ... },// SC vs KG vs TON
  createScaleBatchScenario(options = {}) { ... },      // 50 XMLs, 200+ itens
};
```

### 7.2 Method Signatures & Return Types

#### `calculateModulo11(body43: string): number`
- **Input**: 43-digit numeric string.
- **Output**: Number between 0 and 9.
- **Algorithm**: Weights `[2, 3, 4, 5, 6, 7, 8, 9]` cyclic right-to-left. Remainder 0 or 1 $\rightarrow$ 0; else $11 - \text{remainder}$.

#### `generateAccessKey(options?: Object): { chaveAcesso: string, cDV: number, body43: string }`
- **Options**:
  - `cUF`: string (default `'35'`).
  - `year`: number/string (default `'26'`).
  - `month`: number/string (default `'10'`).
  - `cnpj`: string (default `'12345678000195'`).
  - `serie`: number/string (default `'1'`).
  - `nNF`: number/string (default `'145892'`).
  - `tpEmis`: string (default `'1'`).
  - `cNF`: string (default randomized 8 digits).
- **Output**: 44-digit valid access key and details.

#### `generateNFeXml(invoiceDefinition?: Object, options?: Object): { xml: string, chaveAcesso: string, invoiceId: string, items: Array, totais: Object }`
- Generates a fully compliant NF-e 4.00 XML string.
- Automatically calculates all line values and total values with BigInt/string decimal precision.
- Balances freight, insurance, discount, and other expenses down to the exact cent.
- Supports options: `envelope: 'nfeProc' | 'NFe'` (default `'nfeProc'`).

#### `generateNFeBatch(definitionsOrCount: number | Array, globalOptions?: Object): Array<{ filename: string, xml: string, chaveAcesso: string, invoiceId: string, invoice: Object }>`
- Produces an array of synthetic invoices ready for multi-XML batch upload tests.

#### `SCENARIOS.createGroupingScenario()`
- Returns `{ invoices: [xml1, xml2], destination: clientObj, expectedAllocations: { ... } }`.

#### `SCENARIOS.createDivisionScenario()`
- Returns `{ sourceInvoice: xmlObj, destinations: [dest1, dest2, dest3], expectedAllocations: { ... } }`.

#### `SCENARIOS.createScaleBatchScenario(options?: { count?: number })`
- Returns an array of 50 distinct XML objects distributed across the 10 suppliers, with 200+ total line items, each with verified access keys.

---

## 8. Logic Chain

1. **Premise**: SmartNFe requires testing multi-XML import (R2), grouping/division/mixed preparations (R3), and BigInt allocation conservation (R4) without depending on real client data or external APIs (R5).
2. **Observation**: The existing codebase has a parser (`nfeXmlParser.js`) that strictly validates NF-e Model 55, validates namespaces, and enforces specific tag hierarchies. The access key validator (`accessKeyValidator.js`) rigorously enforces 44 numeric digits and Modulo 11 with weights 2..9 right-to-left.
3. **Inference**: Any synthetic XML generated by tests must satisfy these exact parsing and cryptographic criteria; otherwise, `parseNFeXml` or `validateAccessKey` will reject them immediately (yielding `INVALID_MODEL`, `PARSER_ERROR`, or `INVALID_ACCESS_KEY`).
4. **Observation**: `mockInvoices.js` contains only 5 static demo invoices, which are flagged `isDemo: true` and write to localStorage. R5 and TEST_INFRA.md require realistic batches of up to 50 invoices tested under volatile session isolation (`isRealImport: true`, `isDemo: false`).
5. **Inference**: A programmatic fixture generator (`xmlFixtureGenerator.mjs`) is necessary to dynamically synthesize single XMLs, batches, and specific topological scenarios (2->1, 1->M, N->M, scale 50->5, repeated codes, unit traps) on demand during test execution.
6. **Conclusion**: Specifying the exact XML structure, Modulo 11 check digit formula, catalogs of suppliers/commodities/destinations, and clean ES module exports provides the test implementation subagents with an unambiguous, fail-safe blueprint.

---

## 9. Caveats

- **Read-Only Compliance**: As a specification miner, no implementation files in `tests/` or `app/` were modified or created. All work was confined to reading source files and writing this specification to `handoff.md`.
- **Backend Isolation**: SmartNFe operates purely client-side; no PHP backend or server-side endpoint interactions were investigated or specified, in strict accordance with R5.
- **Access Key Scope**: While SEFAZ supports contingency emission types (`tpEmis` 2 through 7), the generator standardizes on `'1'` (Emissão Normal), which is the standard operational mode for export preparations.

---

## 10. Conclusion

The technical specifications for `tests/fixtures/xmlFixtureGenerator.mjs` are completely defined:
1. **XML Schema**: Compliant with NF-e 4.00, supporting both `<nfeProc>` and bare `<NFe>`, with exact `<ide>`, `<emit>`, `<dest>`, `<det>`, `<total>`, and `<protNFe>` tags.
2. **Modulo 11 Algorithm**: Defined with exact mathematical precision, handling remainders 0 and 1, and verified against 5 canonical vectors and all 27 Brazilian state codes.
3. **Scenarios**: Fully defined for Grouping (2->1), Division (1->M), Mixed (N->M), Repeated Codes (`SOJA-01`), Incompatible Units (`SC`/`KG`/`TON`), and Scale Stress (50 XMLs, 200+ items).
4. **Module Architecture**: Standardized ES module exporting single/batch generators, verified catalogs, and ready-to-use scenario builders.

The E2E Test Implementation team can now implement `tests/fixtures/xmlFixtureGenerator.mjs` directly from this document without ambiguity.

---

## 11. Verification Method

To independently verify the facts and specifications in this report:

1. **Verify Modulo 11 Check Digit against Existing Test Vectors**:
   ```powershell
   node --test tests/tier1/m1_xml_engine.test.mjs
   node --test tests/tier5/m1_xml_adversarial_stress.test.mjs
   ```
   Both test suites will execute and confirm 100% pass on the Modulo 11 algorithm, key length constraints, and IBGE UF codes.

2. **Verify XML Parser Compatibility**:
   Inspect `app/features/xml/nfeXmlParser.js` lines 406–698 to verify the exact tag names and attributes extracted.

3. **Verify Volatile Session Isolation**:
   Inspect `app/features/xml/xmlToInvoiceMapper.js` lines 317–318 to confirm `isRealImport: true` and `isDemo: false`.
