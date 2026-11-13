import { calculateModulo11, generateAccessKey, SUPPLIERS_CATALOG } from '../../../tests/fixtures/xmlFixtureGenerator.mjs';

console.log('--- Testing calculateModulo11 ---');

// Official test vectors for SEFAZ Modulo 11
// Let's test known key:
// For example: 3515080557071400082555001000000025107861942 (43 digits)
// Let's manually calculate weights:
// weights: 2,3,4,5,6,7,8,9,2,3,4,5,6,7,8,9,...
const body = '3515080557071400082555001000000025107861942';
const dv = calculateModulo11(body);
console.log('Test body:', body);
console.log('Computed DV:', dv);

// Validate CNPJ algorithm
function validateCNPJ(cnpj) {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  let b = [5,4,3,2,9,8,7,6,5,4,3,2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(clean[i], 10) * b[i];
  let r = sum % 11;
  let d1 = r < 2 ? 0 : 11 - r;
  if (parseInt(clean[12], 10) !== d1) return false;
  b = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(clean[i], 10) * b[i];
  r = sum % 11;
  let d2 = r < 2 ? 0 : 11 - r;
  return parseInt(clean[13], 10) === d2;
}

console.log('--- Checking Suppliers CNPJs ---');
for (const s of SUPPLIERS_CATALOG) {
  const valid = validateCNPJ(s.cnpj);
  console.log(`${s.cnpj} (${s.xFant}): ${valid ? 'VALID' : 'INVALID'}`);
  if (!valid) throw new Error(`Invalid CNPJ for ${s.xFant}: ${s.cnpj}`);
}

// Check Modulo 11 properties:
// 1. Invalid input tests
let threwEmpty = false;
try { calculateModulo11(''); } catch { threwEmpty = true; }
let threwShort = false;
try { calculateModulo11('12345'); } catch { threwShort = true; }
let threwNonDigits = false;
try { calculateModulo11('351508055707140008255500100000002510786194a'); } catch { threwNonDigits = true; }

console.log('Input validation:');
console.log('threw on empty:', threwEmpty);
console.log('threw on short:', threwShort);
console.log('threw on non-digits:', threwNonDigits);

// Verify 100 generated keys
for (let i = 0; i < 100; i++) {
  const res = generateAccessKey({ nNF: 100000 + i, serie: 1, cUF: 35 });
  const recomputed = calculateModulo11(res.body43);
  if (recomputed !== res.cDV) throw new Error(`DV mismatch at index ${i}`);
  if (res.chaveAcesso !== `${res.body43}${res.cDV}`) throw new Error(`Key formatting mismatch at index ${i}`);
}
console.log('Successfully verified 100 generated access keys and DVs.');
