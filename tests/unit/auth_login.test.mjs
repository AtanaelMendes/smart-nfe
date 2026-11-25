/**
 * SmartNFe — Unit Test Suite: Autenticação de demonstração e sessão assinada.
 *
 * Cobre:
 * 1. Credenciais mockadas: três usuários, salts individuais, hashes scrypt.
 * 2. Verificação de senha com scrypt + timingSafeEqual.
 * 3. Flag explícita AUTH_MOCK_ENABLED (desativada por padrão).
 * 4. Token de sessão assinado (HMAC), adulteração e expiração.
 * 5. Proteção de rotas e integração com o middleware.
 * 6. Tela de login alinhada ao fluxo (componentes UI, API e sem localStorage).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import crypto from 'node:crypto';

const ROOT_DIR = process.cwd();

const { MOCK_USERS, DUMMY_CREDENTIALS } = await import('../../app/lib/auth/users.mock.js');
const { authenticateMockUser, verifyPassword } = await import('../../app/lib/auth/password.js');
const { isProtectedPath, isMockAuthEnabled } = await import('../../app/lib/auth/config.js');
const { createSessionToken, verifySessionToken } = await import('../../app/lib/auth/session.js');

describe('Autenticação: credenciais mockadas server-side', () => {
  it('deve conter exatamente os três usuários de demonstração', () => {
    assert.deepEqual(Object.keys(MOCK_USERS).sort(), [
      'alinijumes',
      'atanaelmendes',
      'mayarasimoes',
    ]);
  });

  it('cada usuário deve possuir salt individual e hash scrypt de 64 bytes', () => {
    const salts = new Set();
    for (const [username, record] of Object.entries(MOCK_USERS)) {
      assert.match(record.salt, /^[0-9a-f]{32}$/, `${username} deve ter salt de 16 bytes em hex`);
      assert.match(record.hash, /^[0-9a-f]{128}$/, `${username} deve ter hash de 64 bytes em hex`);
      salts.add(record.salt);
    }
    assert.equal(salts.size, 3, 'os salts devem ser individuais e distintos');
  });

  it('o módulo de credenciais não deve conter a senha em texto puro', () => {
    const content = readFileSync(resolve(ROOT_DIR, 'app/lib/auth/users.mock.js'), 'utf-8');
    assert.doesNotMatch(content, /smartnfe@/i);
    assert.doesNotMatch(content, /password\s*[:=]\s*['"][^'"]+['"]/i);
  });

  it('a credencial dummy também deve ter formato válido', () => {
    assert.match(DUMMY_CREDENTIALS.salt, /^[0-9a-f]{32}$/);
    assert.match(DUMMY_CREDENTIALS.hash, /^[0-9a-f]{128}$/);
  });
});

describe('Autenticação: scrypt + timingSafeEqual', () => {
  it('deve validar uma senha correta gerada com o mesmo algoritmo', () => {
    const salt = crypto.randomBytes(16);
    const password = 'senha-apenas-do-teste-unitario';
    const hash = crypto.scryptSync(password, salt, 64);

    assert.equal(verifyPassword(password, salt.toString('hex'), hash.toString('hex')), true);
    assert.equal(verifyPassword('senha-errada', salt.toString('hex'), hash.toString('hex')), false);
  });

  it('não deve lançar exceção para entradas malformadas', () => {
    assert.equal(verifyPassword('x', 'zz', 'yy'), false);
    assert.equal(verifyPassword(undefined, DUMMY_CREDENTIALS.salt, DUMMY_CREDENTIALS.hash), false);
  });
});

describe('Autenticação: flag de ambiente', () => {
  const original = process.env.AUTH_MOCK_ENABLED;

  it('deve estar desativada por padrão / quando a flag não é true', () => {
    delete process.env.AUTH_MOCK_ENABLED;
    assert.equal(isMockAuthEnabled(), false);
    assert.deepEqual(authenticateMockUser('atanaelmendes', 'qualquer'), {
      ok: false,
      reason: 'mock_disabled',
    });
  });

  it('deve autenticar apenas credenciais válidas quando explicitamente habilitada', () => {
    process.env.AUTH_MOCK_ENABLED = 'true';
    assert.equal(isMockAuthEnabled(), true);

    assert.deepEqual(authenticateMockUser('usuario-inexistente', 'x'), {
      ok: false,
      reason: 'invalid_credentials',
    });
    assert.equal(authenticateMockUser('atanaelmendes', 'senha-incorreta').ok, false);
  });

  it('deve restaurar a variável de ambiente original', () => {
    if (original === undefined) delete process.env.AUTH_MOCK_ENABLED;
    else process.env.AUTH_MOCK_ENABLED = original;
  });
});

describe('Sessão: token assinado (HMAC)', () => {
  const secret = 'segredo-de-teste-com-tamanho-suficiente-para-hmac';

  it('deve criar e verificar um token válido', async () => {
    const token = await createSessionToken(
      { sub: 'atanaelmendes', name: 'Atanael Mendes', remember: true },
      { secret, ttlSeconds: 3600 }
    );

    const session = await verifySessionToken(token, { secret });
    assert.ok(session);
    assert.equal(session.sub, 'atanaelmendes');
    assert.equal(session.remember, true);
    assert.ok(session.exp > session.iat);
  });

  it('deve rejeitar token adulterado e assinatura com outro segredo', async () => {
    const token = await createSessionToken({ sub: 'alinijumes' }, { secret, ttlSeconds: 3600 });
    const [payload, signature] = token.split('.');
    const tampered = `${payload}.${signature.slice(0, -2)}AA`;

    assert.equal(await verifySessionToken(tampered, { secret }), null);
    assert.equal(await verifySessionToken(token, { secret: `${secret}-outro` }), null);
    assert.equal(await verifySessionToken(token, { secret: '' }), null);
    assert.equal(await verifySessionToken('sem-formato', { secret }), null);
  });

  it('deve rejeitar token expirado', async () => {
    const token = await createSessionToken({ sub: 'mayarasimoes' }, { secret, ttlSeconds: -10 });
    assert.equal(await verifySessionToken(token, { secret }), null);
  });
});

describe('Proteção de rotas', () => {
  it('deve identificar rotas privadas e liberar a tela de login', () => {
    assert.equal(isProtectedPath('/dashboard'), true);
    assert.equal(isProtectedPath('/dashboard/qualquer'), true);
    assert.equal(isProtectedPath('/documentos/demo-01/conferencia'), true);
    assert.equal(isProtectedPath('/notas-preparadas'), true);
    assert.equal(isProtectedPath('/configuracoes'), true);
    assert.equal(isProtectedPath('/login'), false);
    assert.equal(isProtectedPath('/'), false);
    assert.equal(isProtectedPath('/dashboard-fake'), false);
  });

  it('o middleware deve verificar o cookie de sessão e redirecionar para /login', () => {
    const middlewarePath = resolve(ROOT_DIR, 'middleware.js');
    assert.ok(existsSync(middlewarePath));
    const content = readFileSync(middlewarePath, 'utf-8');

    assert.match(content, /SESSION_COOKIE/);
    assert.match(content, /verifySessionToken/);
    assert.match(content, /url\.pathname = '\/login'/);
    assert.match(content, /url\.pathname = '\/dashboard'/);
  });
});

describe('Tela de login', () => {
  const pageContent = readFileSync(resolve(ROOT_DIR, 'app/login/page.jsx'), 'utf-8');

  it('deve reutilizar os componentes UI do projeto', () => {
    assert.match(pageContent, /@\/components\/inputs\/InputText/);
    assert.match(pageContent, /@\/components\/inputs\/InputPassword/);
    assert.match(pageContent, /@\/components\/inputs\/Checkbox/);
    assert.match(pageContent, /@\/components\/buttons\/Button/);
    assert.match(pageContent, /SmartNFeLogo/);
  });

  it('deve autenticar via API e não guardar credenciais no navegador', () => {
    assert.match(pageContent, /fetch\('\/api\/auth\/login'/);
    assert.doesNotMatch(pageContent, /localStorage\.setItem/);
    assert.doesNotMatch(pageContent, /sessionStorage/);
    assert.match(pageContent, /router\.replace\('\/dashboard'\)/);
  });

  it('deve expor autocomplete e alternância de visibilidade da senha', () => {
    assert.match(pageContent, /autoComplete="username"/);
    assert.match(pageContent, /autoComplete="current-password"/);
    const inputPassword = readFileSync(
      resolve(ROOT_DIR, 'app/components/inputs/InputPassword.jsx'),
      'utf-8'
    );
    assert.match(inputPassword, /faEye/);
    assert.match(inputPassword, /faEyeSlash/);
  });

  it('deve suportar dark mode via AppContext e classes dark:', () => {
    assert.match(pageContent, /useAppContext/);
    assert.match(pageContent, /toggleDarkMode/);
    assert.match(pageContent, /dark:/);
  });
});
