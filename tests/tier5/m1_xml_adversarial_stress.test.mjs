/**
 * SmartNFe — Tier 5 Adversarial Hardening Suite: Milestone 1 XML Engine & Access Key Validator
 *
 * Testes empíricos e adversariais executados pelo Milestone 1 Challenger 1:
 * 1. Chaves de acesso no limite (todas as 27 UFs do Brasil, restos 0, 1 e 10, tamanhos 43/45, alfanuméricos, modelos != 55).
 * 2. Parsing de XML com estresse de namespaces (default, prefixos arbitrários, sem namespace, vazias/omitidas).
 * 3. Resiliência a XML malformado, injeções de controle e payload gigante de 5 MB.
 * 4. Integração do pipeline completo (Parser -> KeyValidator -> Mapper -> Session Repository).
 *
 * Execução: node --test tests/tier5/m1_xml_adversarial_stress.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT_DIR = process.cwd();

// Carregamento dinâmico dos módulos sob teste
const accessKeyModulePath = resolve(ROOT_DIR, 'app/features/xml/accessKeyValidator.js');
const nfeParserModulePath = resolve(ROOT_DIR, 'app/features/xml/nfeXmlParser.js');
const xmlMapperModulePath = resolve(ROOT_DIR, 'app/features/xml/xmlToInvoiceMapper.js');
const repoModulePath = resolve(ROOT_DIR, 'app/features/invoiceRepository.js');
const localStorageModulePath = resolve(ROOT_DIR, 'app/lib/storage/localStorageService.js');

assert.ok(existsSync(accessKeyModulePath), 'accessKeyValidator.js deve existir');
assert.ok(existsSync(nfeParserModulePath), 'nfeXmlParser.js deve existir');
assert.ok(existsSync(xmlMapperModulePath), 'xmlToInvoiceMapper.js deve existir');
assert.ok(existsSync(repoModulePath), 'invoiceRepository.js deve existir');

const {
  validateAccessKey,
  calculateAccessKeyDV,
  formatAccessKey,
  UF_IBGE_CODES,
} = await import(pathToFileURL(accessKeyModulePath).href);

const {
  parseNFeXml,
  formatParserErrorMessage,
  cleanDecimal,
  NodeXmlDomParser,
} = await import(pathToFileURL(nfeParserModulePath).href);

const {
  mapXmlToInvoice,
  generateItemId,
  normalizeQuantity,
  normalizeUnitPrice,
  normalizeMonetary,
} = await import(pathToFileURL(xmlMapperModulePath).href);

const invoiceRepository = (await import(pathToFileURL(repoModulePath).href)).default;
const localStorageService = (await import(pathToFileURL(localStorageModulePath).href)).default;

// Sequência oficial de pesos do Módulo 11 (SEFAZ)
const WEIGHTS_MOD11 = [2, 3, 4, 5, 6, 7, 8, 9];

function computeWeightedSum(body43) {
  let sum = 0;
  for (let i = 42; i >= 0; i--) {
    const digit = Number(body43.charAt(i));
    const weight = WEIGHTS_MOD11[(42 - i) % WEIGHTS_MOD11.length];
    sum += digit * weight;
  }
  return sum;
}

// ============================================================================
// SUITE 1: accessKeyValidator.js — Limites e Integridade Criptográfica/Algorítmica
// ============================================================================
describe('Adversarial Challenger: accessKeyValidator.js — Limites e Integridade', () => {

  it('1.1: Gera e valida com sucesso chaves sintéticas para todas as 27 UFs do Brasil', () => {
    const ufCodes = Object.keys(UF_IBGE_CODES);
    assert.strictEqual(ufCodes.length, 27, 'Brasil possui exatamente 27 UFs na tabela IBGE');

    let successCount = 0;
    for (const uf of ufCodes) {
      // 43 dígitos válidos: UF (2) + AAMM (4) + CNPJ (14) + mod 55 (2) + ser 001 (3) + nNF (9) + tpEmis 1 (1) + cNF (8)
      const body43 = `${uf}26041234567800019055001000000001112345678`;
      assert.strictEqual(body43.length, 43, `Body deve ter 43 caracteres para UF ${uf}`);

      const dv = calculateAccessKeyDV(body43);
      assert.ok(dv !== null && dv >= 0 && dv <= 9, `DV deve ser um dígito entre 0 e 9 para UF ${uf}`);

      const fullKey = `${body43}${dv}`;
      assert.strictEqual(fullKey.length, 44, `Chave completa deve ter 44 dígitos para UF ${uf}`);

      const validation = validateAccessKey(fullKey);
      assert.strictEqual(validation.isValid, true, `Chave deve ser válida para UF ${uf} (${UF_IBGE_CODES[uf]}): ${validation.error}`);
      assert.strictEqual(validation.details.uf, uf, `Código de UF deve ser ${uf}`);
      assert.strictEqual(validation.details.ufSigla, UF_IBGE_CODES[uf], `Sigla da UF deve ser ${UF_IBGE_CODES[uf]}`);
      assert.strictEqual(validation.details.modelo, '55', 'Modelo fiscal deve ser 55');
      assert.strictEqual(validation.details.dv, dv, 'DV nos detalhes deve coincidir com o calculado');

      successCount++;
    }

    assert.strictEqual(successCount, 27, 'Todas as 27 UFs foram validadas com sucesso');
  });

  it('1.2: Rejeita expressamente códigos de UF inexistentes ou inválidos', () => {
    const invalidUfs = ['00', '99', '10', '20', '30', '40', '60', '88', 'AA', '??'];
    for (const badUf of invalidUfs) {
      const body43 = `${badUf}26041234567800019055001000000001112345678`;
      const dv = calculateAccessKeyDV(body43);
      const fullKey = `${body43}${dv ?? 0}`;
      const res = validateAccessKey(fullKey);
      assert.strictEqual(res.isValid, false, `UF ${badUf} não deveria ser aceita`);
      assert.ok(res.error, `Deve conter mensagem de erro para UF inválida ${badUf}`);
    }
  });

  it('1.3: Chaves onde a soma ponderada produz exatamente Resto 0 (DV = 0)', () => {
    // Procuramos uma combinação de dígitos onde sum % 11 === 0
    const prefix41 = '35260412345678000190550010000000011123456';
    let found = false;

    for (let d1 = 0; d1 <= 9; d1++) {
      for (let d2 = 0; d2 <= 9; d2++) {
        const body43 = `${prefix41}${d1}${d2}`;
        const sum = computeWeightedSum(body43);
        if (sum % 11 === 0) {
          found = true;
          const dv = calculateAccessKeyDV(body43);
          assert.strictEqual(dv, 0, `Pela regra SEFAZ, resto 0 deve resultar em DV 0 (soma: ${sum})`);

          const fullKey = `${body43}${dv}`;
          const res = validateAccessKey(fullKey);
          assert.strictEqual(res.isValid, true, `Chave com resto 0 e DV 0 deve ser válida`);
          assert.strictEqual(res.details.dv, 0);

          // Se adulterar o DV para qualquer outro valor de 1 a 9, deve rejeitar
          for (let badDv = 1; badDv <= 9; badDv++) {
            const badKey = `${body43}${badDv}`;
            const badRes = validateAccessKey(badKey);
            assert.strictEqual(badRes.isValid, false, `Chave com DV adulterado (${badDv}) deve falhar`);
          }
          break;
        }
      }
      if (found) break;
    }
    assert.ok(found, 'Deve encontrar chave sintética com resto 0');
  });

  it('1.4: Chaves onde a soma ponderada produz exatamente Resto 1 (DV = 0)', () => {
    const prefix41 = '35260412345678000190550010000000011123456';
    let found = false;

    for (let d1 = 0; d1 <= 9; d1++) {
      for (let d2 = 0; d2 <= 9; d2++) {
        const body43 = `${prefix41}${d1}${d2}`;
        const sum = computeWeightedSum(body43);
        if (sum % 11 === 1) {
          found = true;
          const dv = calculateAccessKeyDV(body43);
          assert.strictEqual(dv, 0, `Pela regra SEFAZ, resto 1 deve resultar em DV 0 (soma: ${sum})`);

          const fullKey = `${body43}${dv}`;
          const res = validateAccessKey(fullKey);
          assert.strictEqual(res.isValid, true, `Chave com resto 1 e DV 0 deve ser válida`);

          // Rejeita se alguém tentar usar DV = 1 (11 - 1 = 10 -> incorreto para SEFAZ) ou DV = 10
          const badKey = `${body43}1`;
          const badRes = validateAccessKey(badKey);
          assert.strictEqual(badRes.isValid, false, 'Chave com DV = 1 quando resto é 1 deve falhar');
          break;
        }
      }
      if (found) break;
    }
    assert.ok(found, 'Deve encontrar chave sintética com resto 1');
  });

  it('1.5: Chaves onde a soma ponderada produz exatamente Resto 10 (DV = 11 - 10 = 1)', () => {
    const prefix41 = '35260412345678000190550010000000011123456';
    let found = false;

    for (let d1 = 0; d1 <= 9; d1++) {
      for (let d2 = 0; d2 <= 9; d2++) {
        const body43 = `${prefix41}${d1}${d2}`;
        const sum = computeWeightedSum(body43);
        if (sum % 11 === 10) {
          found = true;
          const dv = calculateAccessKeyDV(body43);
          assert.strictEqual(dv, 1, `Pela regra SEFAZ, resto 10 deve resultar em DV = 11 - 10 = 1 (soma: ${sum})`);

          const fullKey = `${body43}${dv}`;
          const res = validateAccessKey(fullKey);
          assert.strictEqual(res.isValid, true, `Chave com resto 10 e DV 1 deve ser válida`);
          assert.strictEqual(res.details.dv, 1);

          // Rejeita DV 0 ou qualquer outro valor
          const badKey = `${body43}0`;
          assert.strictEqual(validateAccessKey(badKey).isValid, false);
          break;
        }
      }
      if (found) break;
    }
    assert.ok(found, 'Deve encontrar chave sintética com resto 10');
  });

  it('1.6: Chaves com comprimentos anômalos (43 dígitos e 45 dígitos) são estritamente rejeitadas', () => {
    const valid43 = '3526041234567800019055001000000001112345678';
    const dv = calculateAccessKeyDV(valid43);
    const valid44 = `${valid43}${dv}`;

    // 43 dígitos (faltando DV)
    const res43 = validateAccessKey(valid43);
    assert.strictEqual(res43.isValid, false);
    assert.ok(res43.error.includes('44 dígitos numéricos'));

    // 45 dígitos (dígito excedente)
    const res45 = validateAccessKey(`${valid44}9`);
    assert.strictEqual(res45.isValid, false);
    assert.ok(res45.error.includes('44 dígitos numéricos'));

    // Comprimentos extremos: vazio, 1 dígito, 10 dígitos, 100 dígitos
    assert.strictEqual(validateAccessKey('').isValid, false);
    assert.strictEqual(validateAccessKey('35').isValid, false);
    assert.strictEqual(validateAccessKey('0'.repeat(40)).isValid, false);
    assert.strictEqual(validateAccessKey('0'.repeat(50)).isValid, false);
    assert.strictEqual(validateAccessKey(null).isValid, false);
    assert.strictEqual(validateAccessKey(undefined).isValid, false);
    assert.strictEqual(validateAccessKey(12345).isValid, false);
  });

  it('1.7: Rejeita caracteres alfanuméricos e caracteres hostis na chave', () => {
    const base43 = '3526041234567800019055001000000001112345678';
    const valid44 = `${base43}${calculateAccessKeyDV(base43)}`;

    // Substituição de dígito por letra
    const alphaKey1 = valid44.slice(0, 10) + 'X' + valid44.slice(11);
    assert.strictEqual(validateAccessKey(alphaKey1).isValid, false);
    assert.ok(validateAccessKey(alphaKey1).error.includes('não numéricos'));

    // Caracteres especiais e pontuação errônea no meio
    const sqlInjection = valid44.slice(0, 20) + "';DROP" + valid44.slice(26);
    assert.strictEqual(validateAccessKey(sqlInjection).isValid, false);

    // Caracteres com null byte e escape
    const nullByteKey = valid44.slice(0, 20) + '\x00' + valid44.slice(21);
    assert.strictEqual(validateAccessKey(nullByteKey).isValid, false);
  });

  it('1.8: Rejeita estritamente modelos fiscais diferentes de 55 (ex: NFC-e 65, CT-e 57)', () => {
    const base43 = '3526041234567800019055001000000001112345678';

    // Modelo 65 (NFC-e)
    const mod65Body = base43.slice(0, 20) + '65' + base43.slice(22);
    const dv65 = calculateAccessKeyDV(mod65Body);
    const key65 = `${mod65Body}${dv65}`;
    const res65 = validateAccessKey(key65);
    assert.strictEqual(res65.isValid, false, 'Modelo 65 NFC-e deve ser rejeitado');
    assert.ok(res65.error.includes('65') && res65.error.includes('modelo 55'));

    // Modelo 57 (CT-e)
    const mod57Body = base43.slice(0, 20) + '57' + base43.slice(22);
    const dv57 = calculateAccessKeyDV(mod57Body);
    const key57 = `${mod57Body}${dv57}`;
    const res57 = validateAccessKey(key57);
    assert.strictEqual(res57.isValid, false, 'Modelo 57 CT-e deve ser rejeitado');
    assert.ok(res57.error.includes('57') && res57.error.includes('modelo 55'));

    // Modelos diversos: 01, 58 (MDF-e), 67 (CT-e OS)
    for (const badMod of ['01', '58', '67', '99']) {
      const b = base43.slice(0, 20) + badMod + base43.slice(22);
      const d = calculateAccessKeyDV(b);
      const k = `${b}${d}`;
      assert.strictEqual(validateAccessKey(k).isValid, false, `Modelo ${badMod} deve ser rejeitado`);
    }
  });

  it('1.9: Rejeita meses de emissão inválidos (00, 13, 99) e tipos de emissão inválidos', () => {
    const base43 = '3526041234567800019055001000000001112345678';

    // Mês 00
    const bMes00 = base43.slice(0, 4) + '00' + base43.slice(6);
    assert.strictEqual(validateAccessKey(`${bMes00}${calculateAccessKeyDV(bMes00)}`).isValid, false);

    // Mês 13
    const bMes13 = base43.slice(0, 4) + '13' + base43.slice(6);
    assert.strictEqual(validateAccessKey(`${bMes13}${calculateAccessKeyDV(bMes13)}`).isValid, false);

    // Tipo de emissão 0 ou 8 ou 9
    const bTpEmis0 = base43.slice(0, 34) + '0' + base43.slice(35);
    assert.strictEqual(validateAccessKey(`${bTpEmis0}${calculateAccessKeyDV(bTpEmis0)}`).isValid, false);
    const bTpEmis9 = base43.slice(0, 34) + '9' + base43.slice(35);
    assert.strictEqual(validateAccessKey(`${bTpEmis9}${calculateAccessKeyDV(bTpEmis9)}`).isValid, false);
  });

  it('1.10: Formatação visual de chave de acesso (formatAccessKey)', () => {
    const key = '35260412345678000190550010000000011123456785';
    const formatted = formatAccessKey(key);
    assert.strictEqual(formatted, '3526 0412 3456 7800 0190 5500 1000 0000 0111 2345 6785');
    assert.strictEqual(formatAccessKey(''), '');
    assert.strictEqual(formatAccessKey('123'), '123');
  });
});

// ============================================================================
// SUITE 2: nfeXmlParser.js — Estresse de Namespaces, Prefixos e Tags Anômalas
// ============================================================================
describe('Adversarial Challenger: nfeXmlParser.js — Namespaces e Estruturas', () => {

  it('2.1: Processa XML com namespace default SEFAZ (xmlns="http://www.portalfiscal.inf.br/nfe")', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35260412345678000190550010000000011123456785" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>VENDA DE MERCADORIAS</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>1</nNF>
        <dhEmi>2026-04-15T10:00:00-03:00</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <tpAmb>1</tpAmb>
      </ide>
      <emit>
        <CNPJ>12345678000190</CNPJ>
        <xNome>EMPRESA DEFAULT NS</xNome>
        <xFant>DEFAULT NS</xFant>
        <IE>123456789012</IE>
        <enderEmit><xMun>SAO PAULO</xMun><UF>SP</UF></enderEmit>
      </emit>
      <dest>
        <CNPJ>98765432000198</CNPJ>
        <xNome>DESTINATARIO TESTE</xNome>
        <IE>987654321098</IE>
        <enderDest><xMun>CAMPINAS</xMun><UF>SP</UF></enderDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>ITEM-DEFAULT-01</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>PRODUTO COM DEFAULT NS</xProd>
          <NCM>84089090</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>5.0000</qCom>
          <vUnCom>100.0000</vUnCom>
          <vProd>500.00</vProd>
          <uTrib>UN</uTrib>
          <qTrib>5.0000</qTrib>
          <vUnTrib>100.0000</vUnTrib>
        </prod>
        <imposto>
          <ICMS><ICMS00><orig>0</orig><CST>00</CST><vBC>500.00</vBC><pICMS>18.00</pICMS><vICMS>90.00</vICMS></ICMS00></ICMS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vProd>500.00</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vOutro>0.00</vOutro>
          <vNF>500.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

    const res = parseNFeXml(xml);
    assert.strictEqual(res.success, true, `Falha no parse com namespace default: ${res.error}`);
    assert.strictEqual(res.data.chaveAcesso, '35260412345678000190550010000000011123456785');
    assert.strictEqual(res.data.emit.razaoSocial, 'EMPRESA DEFAULT NS');
    assert.strictEqual(res.data.itens.length, 1);
    assert.strictEqual(res.data.itens[0].cProd, 'ITEM-DEFAULT-01');
    assert.strictEqual(res.data.totais.valorTotalNota, '500.00');
  });

  it('2.2: Processa XML com prefixos de namespace arbitrários (<fiscal:nfeProc>)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<fiscal:nfeProc xmlns:fiscal="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <fiscal:NFe>
    <fiscal:infNFe Id="NFe35260412345678000190550010000000011123456785" versao="4.00">
      <fiscal:ide>
        <fiscal:cUF>35</fiscal:cUF>
        <fiscal:cNF>12345678</fiscal:cNF>
        <fiscal:natOp>REMESSA COM PREFIXO FISCAL</fiscal:natOp>
        <fiscal:mod>55</fiscal:mod>
        <fiscal:serie>2</fiscal:serie>
        <fiscal:nNF>888</fiscal:nNF>
        <fiscal:dhEmi>2026-04-15T10:00:00-03:00</fiscal:dhEmi>
        <fiscal:tpNF>1</fiscal:tpNF>
        <fiscal:idDest>1</fiscal:idDest>
        <fiscal:tpAmb>1</fiscal:tpAmb>
      </fiscal:ide>
      <fiscal:emit>
        <fiscal:CNPJ>12345678000190</fiscal:CNPJ>
        <fiscal:xNome>EMPRESA COM PREFIXO</fiscal:xNome>
        <fiscal:IE>123456789012</fiscal:IE>
        <fiscal:enderEmit><fiscal:xMun>SANTOS</fiscal:xMun><fiscal:UF>SP</fiscal:UF></fiscal:enderEmit>
      </fiscal:emit>
      <fiscal:dest>
        <fiscal:CNPJ>98765432000198</fiscal:CNPJ>
        <fiscal:xNome>CLIENTE SANTOS</fiscal:xNome>
        <fiscal:enderDest><fiscal:xMun>SANTOS</fiscal:xMun><fiscal:UF>SP</fiscal:UF></fiscal:enderDest>
      </fiscal:dest>
      <fiscal:det nItem="1">
        <fiscal:prod>
          <fiscal:cProd>PREFIX-99</fiscal:cProd>
          <fiscal:xProd>PRODUTO COM PREFIXO</fiscal:xProd>
          <fiscal:NCM>84089090</fiscal:NCM>
          <fiscal:CFOP>5102</fiscal:CFOP>
          <fiscal:uCom>UN</fiscal:uCom>
          <fiscal:qCom>2.0000</fiscal:qCom>
          <fiscal:vUnCom>250.0000</fiscal:vUnCom>
          <fiscal:vProd>500.00</fiscal:vProd>
        </fiscal:prod>
      </fiscal:det>
      <fiscal:total>
        <fiscal:ICMSTot>
          <fiscal:vProd>500.00</fiscal:vProd>
          <fiscal:vNF>500.00</fiscal:vNF>
        </fiscal:ICMSTot>
      </fiscal:total>
    </fiscal:infNFe>
  </fiscal:NFe>
</fiscal:nfeProc>`;

    const res = parseNFeXml(xml);
    assert.strictEqual(res.success, true, `Falha no parse com prefixo fiscal: ${res.error}`);
    assert.strictEqual(res.data.ide.natOp, 'REMESSA COM PREFIXO FISCAL');
    assert.strictEqual(res.data.ide.nNF, '888');
    assert.strictEqual(res.data.emit.razaoSocial, 'EMPRESA COM PREFIXO');
    assert.strictEqual(res.data.itens[0].cProd, 'PREFIX-99');
    assert.strictEqual(res.data.totais.valorTotalNota, '500.00');
  });

  it('2.3: Processa XML completamente sem namespaces (tags limpas)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00">
  <NFe>
    <infNFe Id="NFe35260412345678000190550010000000011123456785" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>SEM NAMESPACE</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>100</nNF>
        <dhEmi>2026-04-15T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000190</CNPJ>
        <xNome>EMPRESA SEM NS</xNome>
      </emit>
      <dest>
        <CNPJ>98765432000198</CNPJ>
        <xNome>CLIENTE SEM NS</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>SEM-NS-01</cProd>
          <xProd>PROD SEM NS</xProd>
          <qCom>1.0000</qCom>
          <vUnCom>100.0000</vUnCom>
          <vProd>100.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>100.00</vProd>
          <vNF>100.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

    const res = parseNFeXml(xml);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.ide.natOp, 'SEM NAMESPACE');
    assert.strictEqual(res.data.emit.razaoSocial, 'EMPRESA SEM NS');
    assert.strictEqual(res.data.itens[0].cProd, 'SEM-NS-01');
  });

  it('2.4: Lida com tags vazias auto-fechadas (<vSeg/>, <vDesc/>) e campos opcionais omitidos', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe>
  <infNFe Id="NFe35260412345678000190550010000000011123456785" versao="4.00">
    <ide>
      <cUF>35</cUF>
      <cNF>12345678</cNF>
      <natOp>TAGS VAZIAS</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>200</nNF>
      <dhEmi>2026-04-15T10:00:00-03:00</dhEmi>
    </ide>
    <emit>
      <CNPJ>12345678000190</CNPJ>
      <xNome>EMPRESA MINIMALISTA</xNome>
    </emit>
    <dest>
      <idEstrangeiro>EXT-999</idEstrangeiro>
      <xNome>CLIENTE EXTERIOR</xNome>
    </dest>
    <det nItem="1">
      <prod>
        <cProd>MIN-01</cProd>
        <xProd>PRODUTO COM TAGS VAZIAS</xProd>
        <qCom>10.0000</qCom>
        <vUnCom>20.0000</vUnCom>
        <vProd>200.00</vProd>
        <vFrete/>
        <vSeg></vSeg>
        <vDesc/>
        <vOutro/>
      </prod>
    </det>
    <total>
      <ICMSTot>
        <vProd>200.00</vProd>
        <vNF>200.00</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</NFe>`;

    const res = parseNFeXml(xml);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.itens[0].vFrete, '0.00');
    assert.strictEqual(res.data.itens[0].vSeg, '0.00');
    assert.strictEqual(res.data.itens[0].vDesc, '0.00');
    assert.strictEqual(res.data.itens[0].vOutro, '0.00');
    assert.strictEqual(res.data.dest.idEstrangeiro, 'EXT-999');
    assert.strictEqual(res.data.dest.cnpj, '');
  });
});

// ============================================================================
// SUITE 3: nfeXmlParser.js — Resiliência a XML Malformado, Injeções e Carga 5 MB
// ============================================================================
describe('Adversarial Challenger: nfeXmlParser.js — Resiliência e Estresse de Carga', () => {

  it('3.1: Intercepta XML truncado com tags não fechadas sem unhandled exception', () => {
    const truncatedXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260412345678000190550010000000011123456785">
      <ide>
        <cUF>35</cUF>
        <mod>55</mod>`;

    const res = parseNFeXml(truncatedXml);
    assert.strictEqual(res.success, false, 'XML truncado deve falhar graciosamente');
    assert.ok(res.error, 'Deve conter mensagem de erro legível');
    assert.strictEqual(res.details.code, 'PARSER_ERROR');
    assert.ok(res.error.includes('Tag não fechada') || res.error.includes('erro sintático') || res.error.includes('malformado'));
  });

  it('3.2: Intercepta tag mismatch (fechamento incorreto de tags cruzadas)', () => {
    const mismatchXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe>
    </NFe>
  </infNFe>
</nfeProc>`;

    const res = parseNFeXml(mismatchXml);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.details.code, 'PARSER_ERROR');
    assert.ok(res.error.includes('Tag mismatch') || res.error.includes('malformado') || res.error.includes('erro sintático'));
  });

  it('3.3: Lida com caracteres de controle e injeções de script sem executar código', () => {
    const hostileXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe35260412345678000190550010000000011123456785">
      <ide>
        <cUF>35</cUF>
        <mod>55</mod>
        <natOp><script>alert("XSS")</script></natOp>
        <nNF>1</nNF>
      </ide>
      <emit>
        <CNPJ>12345678000190</CNPJ>
        <xNome>EMPRESA COM CTRL \x01 \x0b \x1f</xNome>
      </emit>
      <dest><CNPJ>98765432000198</CNPJ><xNome>DEST</xNome></dest>
      <det nItem="1">
        <prod>
          <cProd>XSS-01</cProd>
          <xProd><img src="x" onerror="alert(1)" /></xProd>
          <qCom>1.0000</qCom>
          <vUnCom>10.0000</vUnCom>
          <vProd>10.00</vProd>
        </prod>
      </det>
      <total><ICMSTot><vProd>10.00</vProd><vNF>10.00</vNF></ICMSTot></total>
    </infNFe>
  </NFe>
</nfeProc>`;

    // Não deve disparar exceções nem executar scripts
    const res = parseNFeXml(hostileXml);
    // Mesmo que o mini-parser processe as tags internas, o resultado é pura string de dados
    assert.ok(res !== null && typeof res === 'object');
  });

  it('3.4: Estresse de Carga: Payload de 5 MB de XML processado com eficiência', () => {
    // Construção de um XML de NF-e massivo com cerca de 5.3 MB
    // Cada item <det> possui aprox. 700 bytes -> 8.000 itens resultam em ~5.3 MB
    const itemCount = 8000;
    const itemChunks = [];

    for (let i = 1; i <= itemCount; i++) {
      itemChunks.push(`
      <det nItem="${i}">
        <prod>
          <cProd>SKU-STRESS-${String(i).padStart(6, '0')}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>PRODUTO STRESS EM MASSA NUMERO ${i} COM DESCRICAO DETALHADA E CARACTERES ESPECIAIS</xProd>
          <NCM>84089090</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>10.0000</vUnCom>
          <vProd>10.00</vProd>
          <uTrib>UN</uTrib>
          <qTrib>1.0000</qTrib>
          <vUnTrib>10.0000</vUnTrib>
        </prod>
        <imposto>
          <ICMS><ICMS00><orig>0</orig><CST>00</CST><vBC>10.00</vBC><pICMS>18.00</pICMS><vICMS>1.80</vICMS></ICMS00></ICMS>
        </imposto>
      </det>`);
    }

    const giantXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35260412345678000190550010000000011123456785" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>VENDA CARGA PESADA 5MB</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>999999</nNF>
        <dhEmi>2026-04-15T10:00:00-03:00</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <tpAmb>1</tpAmb>
      </ide>
      <emit>
        <CNPJ>12345678000190</CNPJ>
        <xNome>EMPRESA STRESS 5MB LTDA</xNome>
        <IE>123456789012</IE>
      </emit>
      <dest>
        <CNPJ>98765432000198</CNPJ>
        <xNome>DESTINATARIO CARGA PESADA</xNome>
      </dest>
      ${itemChunks.join('')}
      <total>
        <ICMSTot>
          <vProd>${(itemCount * 10).toFixed(2)}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vOutro>0.00</vOutro>
          <vNF>${(itemCount * 10).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

    const sizeMb = Buffer.byteLength(giantXml, 'utf8') / (1024 * 1024);
    assert.ok(sizeMb >= 5.0, `O XML deve ter ao menos 5.0 MB (tamanho gerado: ${sizeMb.toFixed(2)} MB)`);

    const startTime = performance.now();
    const res = parseNFeXml(giantXml);
    const elapsed = performance.now() - startTime;

    assert.strictEqual(res.success, true, `Parse de 5MB deve ser bem sucedido: ${res.error}`);
    assert.strictEqual(res.data.itens.length, itemCount, `Deve extrair todos os ${itemCount} itens`);
    assert.strictEqual(res.data.itens[0].cProd, 'SKU-STRESS-000001');
    assert.strictEqual(res.data.itens[itemCount - 1].cProd, `SKU-STRESS-${String(itemCount).padStart(6, '0')}`);

    // Critério empírico: processar 5 MB em menos de 3.500 ms no ambiente local
    assert.ok(elapsed < 3500, `Tempo de parse para 5MB deve ser aceitável (levou ${elapsed.toFixed(1)}ms)`);
  });

  it('3.5: Carga pesada malformada de 5 MB é tratada graciosamente', () => {
    // Gerar string malformada de 5 MB
    const garbageChunk = '<unclosedTag id="123">lixo repete texto sem fechar tags ';
    const repetitions = Math.ceil((5 * 1024 * 1024) / garbageChunk.length);
    const giantGarbage = garbageChunk.repeat(repetitions);

    const startTime = performance.now();
    const res = parseNFeXml(giantGarbage);
    const elapsed = performance.now() - startTime;

    assert.strictEqual(res.success, false);
    assert.ok(res.error);
    assert.ok(elapsed < 2000, `Rejeição graciosa de 5MB malformado deve ser rápida (levou ${elapsed.toFixed(1)}ms)`);
  });

  it('3.6: Resiliência contra tipos primitivos inválidos (null, undefined, números, booleano)', () => {
    const invalidInputs = [null, undefined, '', '   ', 12345, true, false, {}, []];
    for (const inp of invalidInputs) {
      const res = parseNFeXml(inp);
      assert.strictEqual(res.success, false, `Input ${typeof inp} não deveria ser aceito`);
      assert.ok(res.error, `Deve conter mensagem de erro para input ${typeof inp}`);
    }
  });
});

// ============================================================================
// SUITE 4: Integração de Ponta a Ponta e Isolamento de Repositório em Memória
// ============================================================================
describe('Adversarial Challenger: Pipeline e Isolamento de Memória de Sessão', async () => {

  it('4.1: Pipeline completo (XML -> Parse -> Validação Chave -> Mapper -> Repositório)', async () => {
    const fixturePath = resolve(ROOT_DIR, 'tests/fixtures/synthetic_nfe_export_proc.xml');
    assert.ok(existsSync(fixturePath), 'Fixture de exportação deve existir');
    const xmlContent = readFileSync(fixturePath, 'utf8');

    // 1. Parsing
    const parseResult = parseNFeXml(xmlContent);
    assert.strictEqual(parseResult.success, true);
    const extracted = parseResult.data;

    // 2. Validação da chave
    const keyVal = validateAccessKey(extracted.chaveAcesso);
    assert.strictEqual(keyVal.isValid, true);
    assert.strictEqual(keyVal.details.modelo, '55');

    // 3. Mapeamento para contrato do repositório
    const invoice = mapXmlToInvoice(extracted);
    assert.strictEqual(invoice.id, `nfe-${extracted.chaveAcesso}`);
    assert.strictEqual(invoice.isRealImport, true);
    assert.strictEqual(invoice.isDemo, false);
    assert.strictEqual(invoice.status, 'importado');
    assert.strictEqual(invoice.itens.length, 2);

    // 4. Estabilidade de itemId
    assert.strictEqual(invoice.itens[0].id, `nfe-${extracted.chaveAcesso}-item-1`);
    assert.strictEqual(invoice.itens[1].id, `nfe-${extracted.chaveAcesso}-item-2`);

    // 5. Inserção no repositório de sessão
    const created = await invoiceRepository.create(invoice);
    assert.strictEqual(created.id, invoice.id);

    // 6. Verificação de isolamento: LocalStorage NÃO deve conter este ID
    const localStoreInvoices = localStorageService.load('smartnfe_invoices', []);
    const foundInLocal = localStoreInvoices.find(inv => inv.id === invoice.id);
    assert.strictEqual(foundInLocal, undefined, 'Nota real NUNCA deve ser gravada no LocalStorage persistente');

    // 7. Recuperação via findById encontra na memória de sessão
    const foundSession = await invoiceRepository.findById(invoice.id);
    assert.ok(foundSession !== null);
    assert.strictEqual(foundSession.id, invoice.id);
    assert.strictEqual(foundSession.isRealImport, true);

    // 8. resetDemoData() restaura mocks persistentes mas PRESERVA a nota na sessão
    await invoiceRepository.resetDemoData();
    const afterResetSession = await invoiceRepository.findById(invoice.id);
    assert.ok(afterResetSession !== null, 'resetDemoData() não pode expurgar documentos em sessão');
    assert.strictEqual(afterResetSession.id, invoice.id);

    // 9. Limpeza final da sessão
    if (typeof invoiceRepository.clearSession === 'function') {
      invoiceRepository.clearSession();
    }
  });

  it('4.2: Precisão decimal no mapper: preserva 4 casas em quantidades e valores unitários estendidos', () => {
    const rawData = {
      chaveAcesso: '35260412345678000190550010000000011123456785',
      ide: { nNF: '123', serie: '1' },
      emit: { xNome: 'EMPRESA TESTE' },
      dest: { xNome: 'CLIENTE TESTE' },
      itens: [
        {
          nItem: 1,
          prod: {
            cProd: 'DEC-01',
            xProd: 'ITEM PRECISAO ESTENDIDA',
            qCom: '123.4567',
            vUnCom: '0.123456',
            vProd: '15.24',
          },
        },
      ],
      totais: {
        valorProdutos: '15.24',
        valorTotalNota: '15.24',
      },
    };

    const invoice = mapXmlToInvoice(rawData);
    assert.strictEqual(invoice.itens[0].quantidade, '123.4567');
    assert.strictEqual(invoice.itens[0].valorUnitario, '0.123456');
    assert.strictEqual(invoice.itens[0].valorTotal, '15.24');
  });
});
