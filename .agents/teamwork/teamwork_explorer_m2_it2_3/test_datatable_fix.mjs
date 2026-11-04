import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT_DIR = process.cwd();

describe('Explorer 3: Prototype Verification of DataTable.jsx Resilience', () => {
  const dtPath = resolve(ROOT_DIR, 'app/components/table/DataTable.jsx');
  assert.ok(existsSync(dtPath));

  const { transformSync } = require('next/dist/build/swc');
  const originalSource = readFileSync(dtPath, 'utf-8');

  // Let's create proposed fixed source
  const proposedSource = originalSource
    // Replace safeData and safeColumns
    .replace(
      /const safeData = useMemo\(\(\) => \(Array\.isArray\(data\) \? data : \[\]\), \[data\]\);/,
      `const safeData = useMemo(
    () =>
      Array.isArray(data)
        ? data.filter(
            (item) => item != null && typeof item === 'object' && !Array.isArray(item)
          )
        : [],
    [data]
  );`
    )
    .replace(
      /const useExplicitColumns = Array\.isArray\(columns\) && columns\.length > 0;[\s\S]*?const effectiveColumns = useMemo\(\(\) => \{[\s\S]*?\}, \[columns, header, useExplicitColumns\]\);/,
      `const safeColumns = useMemo(
    () =>
      Array.isArray(columns)
        ? columns.filter((col) => col != null && typeof col === 'object')
        : [],
    [columns]
  );
  const useExplicitColumns = safeColumns.length > 0;

  // Derivação de colunas com memoização
  const effectiveColumns = useMemo(() => {
    if (useExplicitColumns) {
      return safeColumns;
    }
    const safeHeader = Array.isArray(header)
      ? header.filter((h) => h != null && typeof h === 'object')
      : [];
    return safeHeader.map((h, index) => ({
      key: \`col_\${index}\`,
      label: h?.label || '',
      align: h?.align || 'left',
      title: h?.title || '',
    }));
  }, [safeColumns, header, useExplicitColumns]);`
    )
    .replace(
      /\{useExplicitColumns\s*\?\s*columns\.map\(/,
      '{useExplicitColumns ? effectiveColumns.map('
    );

  const stubbedSource = proposedSource.replace(
    /import InputText from ['"].*InputText['"];/,
    `const InputText = ({ value, onChange, placeholder, id }) => React.createElement('input', {
      id: id,
      value: value,
      placeholder: placeholder,
      onChange: (e) => onChange && onChange(id, e.target.value)
    });`
  );

  const { code } = transformSync(stubbedSource, {
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'classic' } },
    },
    module: { type: 'commonjs' },
  });

  const moduleEnv = { exports: {} };
  const compileFn = new Function('require', 'module', 'exports', 'React', code);
  compileFn(require, moduleEnv, moduleEnv.exports, React);
  const DataTable = moduleEnv.exports.default || moduleEnv.exports;

  it('1. data=[null, undefined, validRow] não lança exceção e renderiza registro válido', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [null, undefined, { id: 'valid', nome: 'Linha Válida' }],
          columns: [{ key: 'nome', label: 'Nome' }],
        })
      );
      assert.match(html, /Linha Válida/);
      assert.match(html, /Exibindo 1 de 1 registros/);
    });
  });

  it('2. data com elementos primitivos estranhos (número, boolean, string, array)', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [42, 'string', true, [1, 2], { id: 'ok', nome: 'Item Real' }],
          columns: [{ key: 'nome', label: 'Nome' }],
        })
      );
      assert.match(html, /Item Real/);
      assert.match(html, /Exibindo 1 de 1 registros/);
    });
  });

  it('3. data com apenas null e undefined renderiza emptyText e 0 de 0 registros', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [null, undefined, null],
          columns: [{ key: 'col1', label: 'Coluna 1' }],
        })
      );
      assert.match(html, /Não há dados para exibir.../);
      assert.match(html, /Exibindo 0 de 0 registros/);
    });
  });

  it('4. columns com elementos null e undefined', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [{ id: '1', nome: 'Produto', preco: '10,00' }],
          columns: [null, { key: 'nome', label: 'Nome' }, undefined, { key: 'preco', label: 'Preço' }],
        })
      );
      assert.match(html, /Produto/);
      assert.match(html, /10,00/);
    });
  });

  it('5. header legado com elementos null e undefined', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: [{ nome: 'Produto A', valor: '50' }],
          header: [null, { label: 'Nome' }, undefined],
        })
      );
      assert.match(html, /Produto A/);
      assert.match(html, /50/);
    });
  });

  it('6. data={null} e data={undefined} continuam funcionando normalmente', () => {
    assert.doesNotThrow(() => {
      const html1 = renderToStaticMarkup(
        React.createElement(DataTable, { data: null, columns: [{ key: 'c', label: 'C' }] })
      );
      assert.match(html1, /Exibindo 0 de 0 registros/);

      const html2 = renderToStaticMarkup(
        React.createElement(DataTable, { data: undefined, columns: [{ key: 'c', label: 'C' }] })
      );
      assert.match(html2, /Exibindo 0 de 0 registros/);
    });
  });
});
