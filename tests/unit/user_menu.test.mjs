/**
 * SmartNFe — Unit Test Suite: Menu do usuário na navbar.
 *
 * Cobre:
 * 1. Gatilho com ícone de usuário e semântica de dropdown acessível.
 * 2. Item de logout integrado ao serviço de autenticação.
 * 3. Substituição do botão de logout isolado no header.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = process.cwd();
const userMenuPath = resolve(ROOT_DIR, 'app/components/Layouts/UserMenu.jsx');
const headerPath = resolve(ROOT_DIR, 'app/components/Layouts/SmartNFeHeader.jsx');

describe('Menu do usuário: gatilho e dropdown acessível', () => {
  const content = readFileSync(userMenuPath, 'utf-8');

  it('deve existir e usar o ícone de usuário como gatilho', () => {
    assert.ok(existsSync(userMenuPath));
    assert.match(content, /faCircleUser/);
    assert.match(content, /data-testid="header-user-menu-button"/);
  });

  it('deve declarar semântica ARIA de menu', () => {
    assert.match(content, /aria-haspopup="menu"/);
    assert.match(content, /aria-expanded=\{open\}/);
    assert.match(content, /aria-controls="user-menu"/);
    assert.match(content, /role="menu"/);
    assert.match(content, /role="menuitem"/);
    assert.match(content, /id="user-menu"/);
  });

  it('deve fechar com clique fora e com Escape devolvendo foco ao gatilho', () => {
    assert.match(content, /addEventListener\('mousedown'/);
    assert.match(content, /event\.key === 'Escape'/);
    assert.match(content, /triggerRef\.current\?\.focus\(\)/);
  });

  it('deve exibir o usuário da sessão sem recorrer a localStorage', () => {
    assert.match(content, /fetch\('\/api\/auth\/session'/);
    assert.doesNotMatch(content, /localStorage/);
  });
});

describe('Menu do usuário: logout', () => {
  const content = readFileSync(userMenuPath, 'utf-8');

  it('deve encerrar a sessão via API e redirecionar para o login', () => {
    assert.match(content, /fetch\('\/api\/auth\/logout', \{ method: 'POST' \}\)/);
    assert.match(content, /router\.replace\('\/login'\)/);
    assert.match(content, /data-testid="header-user-menu-logout"/);
    assert.match(content, />Sair</);
  });
});

describe('Header: integração do menu do usuário', () => {
  const content = readFileSync(headerPath, 'utf-8');

  it('deve renderizar o UserMenu no canto direito da navbar', () => {
    assert.match(content, /import UserMenu from '\.\/UserMenu'/);
    assert.match(content, /<UserMenu \/>/);
    assert.ok(
      content.indexOf('<UserMenu />') > content.indexOf('Right side actions'),
      'O menu deve ficar no bloco de ações à direita'
    );
  });

  it('não deve manter o botão de logout isolado', () => {
    assert.doesNotMatch(content, /data-testid="header-logout"/);
    assert.doesNotMatch(content, /faRightFromBracket/);
  });
});
