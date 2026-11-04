import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { transformSync } = require('next/dist/build/swc');

const dtSource = readFileSync('app/components/table/DataTable.jsx', 'utf-8');
const stubbedSource = dtSource.replace(
  /import InputText from ['"].*InputText['"];/,
  'const InputText = () => null;'
);
const { code } = transformSync(stubbedSource, {
  jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } } },
  module: { type: 'commonjs' }
});
const moduleEnv = { exports: {} };
const compileFn = new Function('require', 'module', 'exports', 'React', code);
compileFn(require, moduleEnv, moduleEnv.exports, React);
const DataTable = moduleEnv.exports.default;

describe('AUDITOR ADVERSARIAL STRESS: DataTable Extreme Dirty Inputs', () => {
  it('handles dirty array of primitives, functions, arrays, and nullish elements without crash', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [null, undefined, 42, 'string', true, Symbol('test'), () => {}, [1, 2], { id: 'good', name: 'Valid Object' }],
          columns: [{ key: 'name', label: 'Name' }]
        })
      );
      assert.ok(html.includes('Valid Object'));
      assert.ok(html.includes('Exibindo 1 de 1 registros'));
    });
  });
});
