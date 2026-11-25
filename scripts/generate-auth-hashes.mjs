/**
 * Gera salts e hashes scrypt para o módulo de autenticação mockada.
 *
 * A senha é lida de SMARTNFE_DEMO_PASSWORD (ou via stdin) e nunca é gravada.
 * Execute apenas em ambiente local:
 *
 *   SMARTNFE_DEMO_PASSWORD='...' node scripts/generate-auth-hashes.mjs
 */
import crypto from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const USERS = ['atanaelmendes', 'alinijumes', 'mayarasimoes'];
const KEY_LENGTH = 64;

async function readPassword() {
  if (process.env.SMARTNFE_DEMO_PASSWORD) {
    return process.env.SMARTNFE_DEMO_PASSWORD;
  }

  if (!stdin.isTTY) {
    const chunks = [];
    for await (const chunk of stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const password = await rl.question('Senha de demonstração: ');
  rl.close();
  return password;
}

const password = await readPassword();
if (!password) {
  console.error('Senha vazia. Abortando.');
  process.exit(1);
}

for (const username of USERS) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH);
  console.log(`  ${username}: Object.freeze({ salt: '${salt.toString('hex')}', hash: '${hash.toString('hex')}' }),`);
}

const dummySalt = crypto.randomBytes(16);
const dummyHash = crypto.scryptSync(crypto.randomBytes(32).toString('hex'), dummySalt, KEY_LENGTH);
console.log('\nDUMMY:');
console.log(`  DUMMY_SALT = '${dummySalt.toString('hex')}'`);
console.log(`  DUMMY_HASH = '${dummyHash.toString('hex')}'`);
