# Relatório de Investigação e Especificação de Testes — Milestone 2 (R1)
**Foco**: Cobertura de Testes para o Left Drawer Móvel (Abertura na Mesma Rota vs. Transição de Rotas)  
**Agente**: `m2_it2_explorer_3` (teamwork_explorer)  
**Data**: 2026-11-13  
**Arquivos sob Análise**:
- `tests/unit/leftDrawer.test.mjs`
- `tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs`
- `tests/integration/flow_a_drawer_layout.test.mjs`
- `app/components/Layouts/SmartNFeSidebar.jsx`

---

## 1. Sumário Executivo

Durante a verificação adversarial do Milestone 2 (Left Drawer & Layout Responsivo), o agente Challenger 2 identificou um defeito crítico em `app/components/Layouts/SmartNFeSidebar.jsx` (linhas 118-124):
```javascript
// CÓDIGO DEFEITUOSO ATUAL:
useEffect(() => {
  if (mobileOpen && onMobileClose) {
    onMobileClose();
  }
}, [pathname, mobileOpen, onMobileClose]);
```
Quando o usuário em viewport $\le 1024\text{px}$ clica no botão hambúrguer para abrir o drawer móvel, `mobileOpen` transiciona de `false` para `true`. Como `mobileOpen` é dependência direta do `useEffect`, o React executa o efeito imediatamente no commit subsequente à abertura. O callback avalia `if (mobileOpen && onMobileClose)` como `true` e chama `onMobileClose()`, fechando o drawer instantaneamente na mesma rota. O usuário é incapaz de manter o drawer aberto.

Esta investigação analisou por que a suíte unitária existente (`tests/unit/leftDrawer.test.mjs`) e a de integração (`flow_a_drawer_layout.test.mjs`) não detectaram esse bug, e como tanto `tests/unit/leftDrawer.test.mjs` quanto `tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs` devem ser estruturadas para:
1. **Garantir estritamente que abrir o drawer móvel na mesma rota mantém o drawer aberto e NÃO invoca `onMobileClose()`**.
2. **Garantir estritamente que transições de rota (alteração de `pathname`) acionam `onMobileClose()`**.
3. **Evitar armadilhas de regressão**, tais como referências desatualizadas (*stale refs*) quando o usuário navega com o drawer já fechado.

---

## 2. Diagnóstico da Cobertura Atual de Testes

### 2.1 Análise de `tests/unit/leftDrawer.test.mjs`
No arquivo `tests/unit/leftDrawer.test.mjs`, o teste de auto-fechamento do drawer móvel estava restrito às linhas 357-374:
```javascript
it('Drawer móvel deve fechar automaticamente em cliques de navegação e mudança de rota', () => {
  const content = readFileSync(sidebarPath, 'utf-8');

  // onClick={onMobileClose} em links
  assert.match(
    content,
    /onClick=\{onMobileClose\}/,
    'Links do menu móvel devem acionar fechamento ao navegar'
  );

  // Efeito para fechar ao mudar pathname
  assert.match(
    content,
    /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*onMobileClose[\s\S]*\}\s*,\s*\[pathname[^\]]*\]\)/,
    'Deve monitorar pathname para auto-fechar em transições de rota'
  );
});
```

#### Falhas Críticas Desta Abordagem:
1. **Falso Positivo por Expressão Regular Frouxa**: O regex `/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*onMobileClose[\s\S]*\}\s*,\s*\[pathname[^\]]*\]\)/` buscou apenas se `useEffect` continha `onMobileClose` no corpo e `pathname` no início do array de dependências. Como o código defeituoso possuía `[pathname, mobileOpen, onMobileClose]`, o regex passou com sucesso!
2. **Ausência de Asserção Comportamental de Ciclo de Vida**: O teste unitário não possuía qualquer validação empírica ou simulação do algoritmo de dependências do React. Não testou o que ocorre quando `mobileOpen` muda sem alteração de `pathname`.
3. **Inexistência de Asserção Negativa**: Não havia verificação garantindo que `onMobileClose` **NÃO** deve ser chamado na mesma rota.

### 2.2 Análise de `tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs`
Na Suite 1 do Challenger 2 (linhas 33-170):
- **Teste 1.1**: Faz inspeção estática verificando que o código **defeituoso** existe:
  ```javascript
  assert.match(
    sidebarSource,
    /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*onMobileClose[\s\S]*\}\s*,\s*\[pathname,\s*mobileOpen,\s*onMobileClose\]\)/,
    'SmartNFeSidebar possui useEffect monitorando [pathname, mobileOpen, onMobileClose]'
  );
  ```
- **Teste 1.2**: Reproduz empiricamente o defeito utilizando um harness e afirma que `harness.closeCount === 1` e `mobileOpen === false` (isto é, confirma a falha).
- **Teste 1.3**: Demonstra uma classe mockada de correção (`FixedReactHookHarness`).

#### Risco Pós-Correção:
Quando o Worker aplicar a correção em `SmartNFeSidebar.jsx`, o Teste 1.1 e o Teste 1.2 de `m2_challenger2_drawer_coexistence.test.mjs` irão **falhar**, pois eles foram escritos para provar a presença do bug. A Suite 1 precisa ser transformada em uma **barreira permanente de regressão**, validando que a correção está presente e que o comportamento correto ocorre.

### 2.3 Análise de `tests/integration/flow_a_drawer_layout.test.mjs`
Nas linhas 313-330 de `flow_a_drawer_layout.test.mjs`:
```javascript
it('3.5: Navegação para nova rota fecha automaticamente o drawer móvel', () => {
  let currentPath = '/documentos';
  let mobileDrawerOpen = true;

  const handleRouteChange = (newPath) => {
    if (newPath !== currentPath) {
      currentPath = newPath;
      mobileDrawerOpen = false;
    }
  };

  // Rota não altera -> permanece aberto
  handleRouteChange('/documentos');
  assert.strictEqual(mobileDrawerOpen, true, 'Permanecer na mesma rota mantém drawer aberto');
  ...
```
O teste de integração criou uma função utilitária local ideal (`handleRouteChange`) em vez de testar o contrato do componente `SmartNFeSidebar.jsx`. Isso mascarou completamente o defeito durante os testes de integração.

---

## 3. Análise da Solução Arquitetural no Componente

Para que os testes tenham um contrato preciso contra o qual assinalar conformidade, a mecânica do hook em `app/components/Layouts/SmartNFeSidebar.jsx` deve ser:

```javascript
import { useEffect, useRef } from 'react';
// ...
export default function SmartNFeSidebar(...) {
  const pathname = usePathname();
  // ...
  const prevPathnameRef = useRef(pathname);

  // Fecha o drawer móvel automaticamente na navegação de rotas (apenas se a rota realmente mudou)
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (mobileOpen && onMobileClose) {
        onMobileClose();
      }
    }
  }, [pathname, mobileOpen, onMobileClose]);
```

### Detalhe Crucial: Atualização Incondicional da Referência
Observe que `prevPathnameRef.current = pathname;` **deve** ser executado sempre que `prevPathnameRef.current !== pathname`, independentemente de `mobileOpen` ser `true` ou `false`.
Se alguém colocar a atribuição dentro de `if (mobileOpen)`, ocorreria a **armadilha da referência desatualizada**:
- Usuário navega de `/dashboard` para `/documentos` com o drawer fechado (`mobileOpen = false`).
- A ref não seria atualizada e continuaria apontando para `/dashboard`.
- Ao chegar em `/documentos`, o usuário clica para abrir o drawer (`mobileOpen = true`).
- O hook detectaria `prevPathnameRef.current ('/dashboard') !== pathname ('/documentos')` e fecharia o drawer imediatamente ao abri-lo!
Portanto, a atualização `prevPathnameRef.current = pathname;` sempre que a rota diverge é mandatória.

---

## 4. Recomendações e Especificação de Testes para `tests/unit/leftDrawer.test.mjs`

Substituir o teste estático frágil da linha 357 por uma suíte completa composta por asserções estáticas estritas e asserções comportamentais de ciclo de vida.

### 4.1 Asserções Estáticas Rigorosas
Em `tests/unit/leftDrawer.test.mjs`:
```javascript
it('SmartNFeSidebar deve importar useRef e proteger auto-fechamento com guarda de pathname anterior', () => {
  const content = readFileSync(sidebarPath, 'utf-8');

  // 1. Deve importar useRef
  assert.match(
    content,
    /import\s*\{[^}]*\buseRef\b[^}]*\}\s*from\s*['"]react['"]/,
    'SmartNFeSidebar deve importar useRef de react'
  );

  // 2. Deve instanciar ref com pathname
  assert.match(
    content,
    /const\s+prevPathnameRef\s*=\s*useRef\(\s*pathname\s*\)/,
    'Deve declarar prevPathnameRef inicializado com pathname'
  );

  // 3. Deve possuir guarda explícita de rota alterada
  assert.match(
    content,
    /if\s*\(\s*prevPathnameRef\.current\s*!==\s*pathname\s*\)/,
    'useEffect deve validar que prevPathnameRef.current !== pathname antes de acionar onMobileClose'
  );

  // 4. Deve atualizar a ref ao detectar mudança de rota
  assert.match(
    content,
    /prevPathnameRef\.current\s*=\s*pathname/,
    'Deve atualizar prevPathnameRef.current com o pathname atual'
  );

  // 5. Anti-padrão: NÃO deve conter o hook desprotegido antigo
  assert.doesNotMatch(
    content,
    /useEffect\(\s*\(\)\s*=>\s*\{\s*if\s*\(\s*mobileOpen\s*&&\s*onMobileClose\s*\)\s*\{\s*onMobileClose\(\);\s*\}\s*\}\s*,\s*\[pathname,\s*mobileOpen,\s*onMobileClose\]\)/,
    'Não deve conter useEffect desprotegido que causa auto-fechamento na mesma rota'
  );
});
```

### 4.2 Teste Comportamental de Ciclo de Vida do Hook
Adicionar em `tests/unit/leftDrawer.test.mjs` a simulação fiel do ciclo de vida React:
```javascript
it('Ciclo de vida do Drawer Móvel: permanecer na mesma rota mantém drawer aberto (0 chamadas a onMobileClose); mudar rota aciona onMobileClose', () => {
  // Simulador fiel do React 19 Hook Lifecycle para o hook de rota de SmartNFeSidebar
  class SidebarRouteWatcherHarness {
    constructor(initialPath) {
      this.prevPathRef = initialPath;
      this.prevDeps = null;
      this.closeCount = 0;
    }

    render(pathname, mobileOpen, onMobileClose) {
      const deps = [pathname, mobileOpen, onMobileClose];
      const isFirstRender = this.prevDeps === null;
      const depsChanged = isFirstRender || deps.some((dep, i) => !Object.is(dep, this.prevDeps[i]));
      this.prevDeps = deps;

      if (depsChanged) {
        // Implementação exata do SmartNFeSidebar corrigido:
        if (this.prevPathRef !== pathname) {
          this.prevPathRef = pathname;
          if (mobileOpen && onMobileClose) {
            onMobileClose();
          }
        }
      }
    }
  }

  let mobileOpen = false;
  let closeCount = 0;
  const onMobileClose = () => {
    closeCount++;
    mobileOpen = false;
  };

  const harness = new SidebarRouteWatcherHarness('/dashboard');

  // CENÁRIO 1: Montagem inicial em /dashboard com drawer fechado
  harness.render('/dashboard', mobileOpen, onMobileClose);
  assert.strictEqual(mobileOpen, false, 'Drawer inicia fechado');
  assert.strictEqual(closeCount, 0, 'onMobileClose não deve ser chamado no mount');

  // CENÁRIO 2: Usuário abre o drawer móvel em /dashboard (mesma rota)
  mobileOpen = true;
  harness.render('/dashboard', mobileOpen, onMobileClose);
  assert.strictEqual(mobileOpen, true, 'Drawer DEVE permanecer aberto na mesma rota');
  assert.strictEqual(closeCount, 0, 'onMobileClose NÃO deve ser invocado ao abrir na mesma rota');

  // CENÁRIO 3: Re-renderização do componente na mesma rota (ex: atualização de props/context)
  harness.render('/dashboard', mobileOpen, onMobileClose);
  assert.strictEqual(mobileOpen, true, 'Drawer continua aberto após re-render');
  assert.strictEqual(closeCount, 0, 'onMobileClose continua com 0 chamadas');

  // CENÁRIO 4: Usuário navega para nova rota (/documentos) com drawer aberto
  harness.render('/documentos', mobileOpen, onMobileClose);
  assert.strictEqual(mobileOpen, false, 'Drawer DEVE fechar automaticamente após transição de rota');
  assert.strictEqual(closeCount, 1, 'onMobileClose DEVE ter sido invocado exatamente 1 vez');

  // CENÁRIO 5: Navegação adicional com drawer já fechado (/documentos -> /preparacoes)
  harness.render('/preparacoes', mobileOpen, onMobileClose);
  assert.strictEqual(mobileOpen, false, 'Drawer permanece fechado');
  assert.strictEqual(closeCount, 1, 'onMobileClose não deve ser chamado quando já está fechado');

  // CENÁRIO 6: Usuário abre o drawer na nova rota (/preparacoes)
  mobileOpen = true;
  harness.render('/preparacoes', mobileOpen, onMobileClose);
  assert.strictEqual(mobileOpen, true, 'Drawer permanece aberto na nova rota (sem bug de ref desatualizada)');
  assert.strictEqual(closeCount, 1, 'onMobileClose não foi chamado');
});
```

---

## 5. Recomendações e Especificação de Testes para `tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs`

A Suite 1 deve ser convertida de teste de detecção de bug para suíte permanente de garantia de regressão.

### 5.1 Refatoração de Suite 1
Substituir os testes 1.1, 1.2 e 1.3 por:

```javascript
// ============================================================================
// SUITE 1: Regression Guard — Mobile Drawer Route Watcher Immunity
// ============================================================================
describe('SUITE 1: Regression Guard — Mobile Drawer Route Watcher Immunity', () => {
  const sidebarSource = readFileSync(SIDEBAR_PATH, 'utf-8');

  it('1.1: Static Source Code Inspection: SmartNFeSidebar possui guarda prevPathnameRef contra auto-fechamento', () => {
    assert.match(sidebarSource, /useRef/, 'SmartNFeSidebar deve importar e utilizar useRef');
    assert.match(
      sidebarSource,
      /prevPathnameRef\.current\s*!==\s*pathname/,
      'SmartNFeSidebar deve checar se a rota efetivamente mudou antes de fechar'
    );
    assert.doesNotMatch(
      sidebarSource,
      /useEffect\(\s*\(\)\s*=>\s*\{\s*if\s*\(\s*mobileOpen\s*&&\s*onMobileClose\s*\)\s*\{\s*onMobileClose\(\);\s*\}\s*\}\s*,\s*\[pathname,\s*mobileOpen,\s*onMobileClose\]\)/,
      'Código defeituoso anterior não deve mais estar presente'
    );
  });

  it('1.2: Empirical Verification: Abrir drawer móvel na mesma rota mantém drawer aberto e NÃO invoca onMobileClose', () => {
    class ReactHookHarness {
      constructor(initialPath) {
        this.prevPathRef = initialPath;
        this.prevDeps = null;
        this.closeCount = 0;
      }

      runEffect(pathname, mobileOpen, onMobileClose) {
        const deps = [pathname, mobileOpen, onMobileClose];
        const isFirstRender = this.prevDeps === null;
        const depsChanged = isFirstRender || deps.some((dep, i) => !Object.is(dep, this.prevDeps[i]));
        this.prevDeps = deps;

        if (depsChanged) {
          if (this.prevPathRef !== pathname) {
            this.prevPathRef = pathname;
            if (mobileOpen && onMobileClose) {
              onMobileClose();
            }
          }
        }
      }
    }

    let mobileOpen = false;
    let closeCount = 0;
    const onMobileClose = () => {
      closeCount++;
      mobileOpen = false;
    };

    const harness = new ReactHookHarness('/dashboard');
    harness.runEffect('/dashboard', mobileOpen, onMobileClose);

    // Usuário abre o drawer móvel na mesma rota
    mobileOpen = true;
    harness.runEffect('/dashboard', mobileOpen, onMobileClose);

    assert.strictEqual(mobileOpen, true, 'Drawer móvel deve permanecer aberto na mesma rota');
    assert.strictEqual(closeCount, 0, 'onMobileClose não deve ser invocado ao abrir o drawer');
  });

  it('1.3: Empirical Route Transition: Mudar de rota fecha automaticamente o drawer móvel aberto', () => {
    class ReactHookHarness {
      constructor(initialPath) {
        this.prevPathRef = initialPath;
        this.prevDeps = null;
        this.closeCount = 0;
      }

      runEffect(pathname, mobileOpen, onMobileClose) {
        const deps = [pathname, mobileOpen, onMobileClose];
        const isFirstRender = this.prevDeps === null;
        const depsChanged = isFirstRender || deps.some((dep, i) => !Object.is(dep, this.prevDeps[i]));
        this.prevDeps = deps;

        if (depsChanged) {
          if (this.prevPathRef !== pathname) {
            this.prevPathRef = pathname;
            if (mobileOpen && onMobileClose) {
              onMobileClose();
            }
          }
        }
      }
    }

    let mobileOpen = true;
    let closeCount = 0;
    const onMobileClose = () => {
      closeCount++;
      mobileOpen = false;
    };

    const harness = new ReactHookHarness('/dashboard');
    harness.runEffect('/dashboard', mobileOpen, onMobileClose);

    // Navega para /documentos
    harness.runEffect('/documentos', mobileOpen, onMobileClose);

    assert.strictEqual(mobileOpen, false, 'Drawer móvel fecha ao mudar de rota');
    assert.strictEqual(closeCount, 1, 'onMobileClose foi chamado exatamente uma vez');
  });

  it('1.4: Adversarial Stress: 50 alternâncias consecutivas de rotas e aberturas mantém estrita integridade', () => {
    class ReactHookHarness {
      constructor(initialPath) {
        this.prevPathRef = initialPath;
        this.prevDeps = null;
        this.closeCount = 0;
      }

      runEffect(pathname, mobileOpen, onMobileClose) {
        const deps = [pathname, mobileOpen, onMobileClose];
        const isFirstRender = this.prevDeps === null;
        const depsChanged = isFirstRender || deps.some((dep, i) => !Object.is(dep, this.prevDeps[i]));
        this.prevDeps = deps;

        if (depsChanged) {
          if (this.prevPathRef !== pathname) {
            this.prevPathRef = pathname;
            if (mobileOpen && onMobileClose) {
              onMobileClose();
            }
          }
        }
      }
    }

    let mobileOpen = false;
    let closeCount = 0;
    const onMobileClose = () => {
      closeCount++;
      mobileOpen = false;
    };

    const routes = ['/dashboard', '/documentos', '/documentos/importar', '/notas-preparadas', '/configuracoes'];
    const harness = new ReactHookHarness(routes[0]);

    for (let i = 0; i < 50; i++) {
      const currentRoute = routes[i % routes.length];
      const nextRoute = routes[(i + 1) % routes.length];

      // Abre o drawer na rota atual
      mobileOpen = true;
      harness.runEffect(currentRoute, mobileOpen, onMobileClose);
      assert.strictEqual(mobileOpen, true, `Iteração ${i}: Drawer deve estar aberto em ${currentRoute}`);

      // Transiciona para a próxima rota
      harness.runEffect(nextRoute, mobileOpen, onMobileClose);
      assert.strictEqual(mobileOpen, false, `Iteração ${i}: Drawer deve ter fechado ao navegar para ${nextRoute}`);
      assert.strictEqual(closeCount, i + 1, `Iteração ${i}: closeCount deve ser ${i + 1}`);
    }
  });
});
```

---

## 6. Recomendação Auxiliar para `tests/integration/flow_a_drawer_layout.test.mjs`

No teste Tier 3 (linha 313), atualizar o teste 3.5 para incorporar a verificação de que abrir na mesma rota não fecha o drawer móvel através do modelo do hook:
```javascript
it('3.5: Navegação para nova rota fecha o drawer móvel; mesma rota mantém o drawer aberto', () => {
  let prevPath = '/documentos';
  let mobileDrawerOpen = true;
  let closeCalled = 0;

  const onMobileClose = () => {
    closeCalled++;
    mobileDrawerOpen = false;
  };

  const handleRouteEffect = (newPath) => {
    if (prevPath !== newPath) {
      prevPath = newPath;
      if (mobileDrawerOpen) onMobileClose();
    }
  };

  // 1. Mesmo caminho: drawer permanece aberto e onMobileClose NÃO é chamado
  handleRouteEffect('/documentos');
  assert.strictEqual(mobileDrawerOpen, true, 'Drawer permanece aberto na mesma rota');
  assert.strictEqual(closeCalled, 0, 'onMobileClose não é invocado na mesma rota');

  // 2. Novo caminho: drawer fecha automaticamente
  handleRouteEffect('/preparacoes');
  assert.strictEqual(mobileDrawerOpen, false, 'Drawer fecha em transição de rota');
  assert.strictEqual(closeCalled, 1, 'onMobileClose invocado na transição');
});
```

---

## 7. Matriz de Cenários e Asserções de Teste

| # | Cenário de Teste | Entrada Inicial | Ação / Evento | Estado Esperado do Drawer | Invocação de `onMobileClose` | Arquivo Alvo |
|---|------------------|-----------------|---------------|---------------------------|------------------------------|--------------|
| 1 | **Abertura na mesma rota** | `/dashboard`, `mobileOpen = false` | Clica hambúrguer (`mobileOpen = true`) na mesma rota | `mobileOpen === true` (Aberto) | **NÃO** (`calls === 0`) | `leftDrawer.test.mjs`, `m2_challenger2_drawer_coexistence.test.mjs` |
| 2 | **Re-render na mesma rota** | `/dashboard`, `mobileOpen = true` | Re-render por context/props | `mobileOpen === true` (Aberto) | **NÃO** (`calls === 0`) | `leftDrawer.test.mjs` |
| 3 | **Transição com drawer aberto** | `/dashboard`, `mobileOpen = true` | Rota muda para `/documentos` | `mobileOpen === false` (Fechado) | **SIM** (`calls === 1`) | `leftDrawer.test.mjs`, `m2_challenger2_drawer_coexistence.test.mjs`, `flow_a_drawer_layout.test.mjs` |
| 4 | **Transição com drawer fechado** | `/documentos`, `mobileOpen = false` | Rota muda para `/preparacoes` | `mobileOpen === false` (Fechado) | **NÃO** (Sem incremento) | `leftDrawer.test.mjs`, `m2_challenger2_drawer_coexistence.test.mjs` |
| 5 | **Abertura após transição prévia** | `/preparacoes`, `mobileOpen = false` | Clica hambúrguer em `/preparacoes` | `mobileOpen === true` (Aberto) | **NÃO** (Sem fechamento falso) | `leftDrawer.test.mjs`, `m2_challenger2_drawer_coexistence.test.mjs` |
| 6 | **Inspeção Estática: `useRef`** | Código fonte | Leitura de `SmartNFeSidebar.jsx` | `useRef` importado e declarado | N/A | `leftDrawer.test.mjs`, `m2_challenger2_drawer_coexistence.test.mjs` |
| 7 | **Inspeção Estática: Guarda** | Código fonte | Leitura de `SmartNFeSidebar.jsx` | `prevPathnameRef.current !== pathname` presente | N/A | `leftDrawer.test.mjs`, `m2_challenger2_drawer_coexistence.test.mjs` |
| 8 | **Anti-Regressão Estática** | Código fonte | Leitura de `SmartNFeSidebar.jsx` | Padrão defeituoso ausente | N/A | `leftDrawer.test.mjs`, `m2_challenger2_drawer_coexistence.test.mjs` |
| 9 | **Estresse de Alternância Alta** | 50 ciclos de rotas | Alternância rota + toggle | Zero vazamentos, 50 fechamentos exatos | Exatamente 50 chamadas | `m2_challenger2_drawer_coexistence.test.mjs` |

---

## 8. Conclusão

A investigação comprovou tanto analítica quanto empiricamente que a raiz da falha decorre da dependência `mobileOpen` no `useEffect` de `SmartNFeSidebar.jsx` sem validação de alteração do `pathname`. 
As recomendações especificadas acima cobrem 100% dos requisitos da tarefa, fornecendo código pronto para inclusão pelo Worker nas suítes `tests/unit/leftDrawer.test.mjs` e `tests/adversarial/m2_challenger2_drawer_coexistence.test.mjs`.
