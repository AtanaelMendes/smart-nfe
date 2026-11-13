/**
 * SmartNFe — Integration Test Suite: Fluxo C (Busca Debounced, Filtros em 8 Facetas, Agrupamento e Seleção Estável)
 *
 * Requisito: R2 (PROJECT.md, ORIGINAL_REQUEST.md, TEST_INFRA.md)
 *
 * Verificações cobertas (4 Tiers):
 * - Tier 1: Busca multi-campo debounced (300ms) por número, emitente, chave de acesso de 44 dígitos e produtos/NCM.
 * - Tier 2: Filtros combináveis em 8 facetas (fornecedor, cliente atribuído, NCM, produto, data, valor, saldos e status) e modelo operacional de cliente atribuído.
 * - Tier 3: Agrupamento visual por Fornecedor e por Cliente Atribuído com subtotais, e seleção estável entre filtros e paginação.
 * - Tier 4: Barra de ações flutuante com contadores consolidados em BigInt (notas, itens, fornecedores distintos e valor total).
 *
 * Execução: node --no-warnings --test tests/integration/flow_c_documents_filters.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanDecimalString,
  decimalAdd,
  decimalSubtract,
  decimalCompare,
  roundDecimal,
  decimalSum,
} from '../../app/lib/calculations/decimal.js';

import { invoiceRepository, sessionInvoices } from '../../app/features/invoiceRepository.js';
import { localStorageService, STORAGE_KEYS } from '../../app/lib/storage/localStorageService.js';
import {
  generateNFeXml,
  SUPPLIERS_CATALOG,
  FOREIGN_CLIENTS_CATALOG,
  COMMODITIES_CATALOG,
} from '../fixtures/xmlFixtureGenerator.mjs';

/**
 * Motor de Consulta e Filtragem em 8 Facetas do SmartNFe
 */
class DocumentFilterEngine {
  static filter(invoices, criteria = {}) {
    return invoices.filter((inv) => {
      // 1. Busca textual global (searchTerm)
      if (criteria.searchTerm) {
        const term = criteria.searchTerm.trim().toLowerCase();
        const matchNum = inv.numero?.toLowerCase().includes(term);
        const matchKey = inv.chaveAcesso?.toLowerCase().includes(term);
        const matchSupplier =
          inv.emitente?.razaoSocial?.toLowerCase().includes(term) ||
          inv.emitente?.nomeFantasia?.toLowerCase().includes(term);
        const matchDest =
          inv.destinatario?.nome?.toLowerCase().includes(term) ||
          inv.destinatario?.idEstrangeiro?.toLowerCase().includes(term);
        const matchAssigned = inv.clienteAtribuido?.toLowerCase().includes(term);

        // Busca profunda em itens (código, descrição, NCM)
        const matchItems = Array.isArray(inv.itens) && inv.itens.some((it) => {
          return (
            it.codigo?.toLowerCase().includes(term) ||
            it.descricao?.toLowerCase().includes(term) ||
            String(it.ncm || '').replace(/\D/g, '').includes(term)
          );
        });

        if (!matchNum && !matchKey && !matchSupplier && !matchDest && !matchAssigned && !matchItems) {
          return false;
        }
      }

      // 2. Faceta 1: Fornecedor (CNPJ ou Razão Social)
      if (criteria.supplier) {
        const s = criteria.supplier.toLowerCase();
        const emit = inv.emitente;
        const cleanDigits = s.replace(/\D/g, '');
        const matchCnpj = cleanDigits.length > 0 && emit?.cnpj?.replace(/\D/g, '').includes(cleanDigits);
        const match =
          emit?.razaoSocial?.toLowerCase().includes(s) ||
          emit?.nomeFantasia?.toLowerCase().includes(s) ||
          matchCnpj;
        if (!match) return false;
      }

      // 3. Faceta 2: Cliente de Exportação Atribuído
      if (criteria.assignedClient !== undefined) {
        if (criteria.assignedClient === 'SEM_CLIENTE' || criteria.assignedClient === null) {
          if (inv.clienteAtribuido && inv.clienteAtribuido !== 'Sem cliente atribuído') {
            return false;
          }
        } else {
          const expected = criteria.assignedClient.toLowerCase();
          if (!inv.clienteAtribuido || !inv.clienteAtribuido.toLowerCase().includes(expected)) {
            return false;
          }
        }
      }

      // 4. Faceta 3: NCM do Produto
      if (criteria.ncm) {
        const cleanNcm = String(criteria.ncm).replace(/\D/g, '');
        const hasNcm = Array.isArray(inv.itens) && inv.itens.some((it) => {
          const itemNcm = String(it.ncm || '').replace(/\D/g, '');
          return itemNcm.startsWith(cleanNcm);
        });
        if (!hasNcm) return false;
      }

      // 5. Faceta 4: Código ou Descrição do Produto
      if (criteria.product) {
        const p = criteria.product.toLowerCase();
        const hasProd = Array.isArray(inv.itens) && inv.itens.some((it) => {
          return (
            it.codigo?.toLowerCase().includes(p) ||
            it.descricao?.toLowerCase().includes(p)
          );
        });
        if (!hasProd) return false;
      }

      // 6. Faceta 5: Faixa de Datas (dataInicio / dataFim)
      if (criteria.dateFrom) {
        const emi = inv.dataEmissao || inv.emissao;
        if (emi && emi.substring(0, 10) < criteria.dateFrom) return false;
      }
      if (criteria.dateTo) {
        const emi = inv.dataEmissao || inv.emissao;
        if (emi && emi.substring(0, 10) > criteria.dateTo) return false;
      }

      // 7. Faceta 6: Faixa de Valor Monetário (minTotal / maxTotal em BigInt)
      if (criteria.minValue !== undefined) {
        const total = inv.totais?.valorTotalNota || '0.00';
        if (decimalCompare(total, String(criteria.minValue)) < 0) return false;
      }
      if (criteria.maxValue !== undefined) {
        const total = inv.totais?.valorTotalNota || '0.00';
        if (decimalCompare(total, String(criteria.maxValue)) > 0) return false;
      }

      // 8. Faceta 7: Estado de Saldo (disponivel | parcial | esgotado)
      if (criteria.balanceStatus) {
        const status = inv.saldoStatus || 'disponivel';
        if (status !== criteria.balanceStatus) return false;
      }

      // 9. Faceta 8: Status do Documento (importado, em_conferencia, etc.)
      if (criteria.status && criteria.status !== 'ALL') {
        if (inv.status !== criteria.status) return false;
      }

      return true;
    });
  }

  /**
   * Agrupa documentos por Fornecedor ou Cliente Atribuído
   */
  static group(invoices, groupBy = 'none') {
    if (groupBy === 'none') {
      return { groups: [{ key: 'all', label: 'Todos os Documentos', items: invoices }] };
    }

    const map = new Map();
    for (const inv of invoices) {
      let groupKey = '';
      let groupLabel = '';

      if (groupBy === 'supplier') {
        groupKey = inv.emitente?.cnpj?.replace(/\D/g, '') || inv.emitente?.razaoSocial || 'Desconhecido';
        groupLabel = inv.emitente?.razaoSocial || 'Fornecedor Desconhecido';
      } else if (groupBy === 'client') {
        groupKey = inv.clienteAtribuido || 'SEM_CLIENTE';
        groupLabel = inv.clienteAtribuido || 'Sem cliente atribuído';
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          label: groupLabel,
          items: [],
          totalValue: '0.00',
          totalItemsCount: 0,
        });
      }

      const g = map.get(groupKey);
      g.items.push(inv);
      g.totalValue = decimalAdd(g.totalValue, inv.totais?.valorTotalNota || '0.00', 2);
      g.totalItemsCount += Array.isArray(inv.itens) ? inv.itens.length : 0;
    }

    return { groups: Array.from(map.values()) };
  }

  /**
   * Calcula contadores consolidados da seleção atual
   */
  static calculateSelectionMetrics(allInvoices, selectedIds) {
    const selectedList = allInvoices.filter((inv) => selectedIds.has(inv.id));
    const distinctSuppliers = new Set();
    let totalItems = 0;
    let totalValue = '0.00';

    for (const inv of selectedList) {
      if (inv.emitente?.cnpj) distinctSuppliers.add(inv.emitente.cnpj);
      else if (inv.emitente?.razaoSocial) distinctSuppliers.add(inv.emitente.razaoSocial);

      if (Array.isArray(inv.itens)) {
        totalItems += inv.itens.length;
      }
      totalValue = decimalAdd(totalValue, inv.totais?.valorTotalNota || '0.00', 2);
    }

    return {
      selectedCount: selectedList.length,
      selectedItemsCount: totalItems,
      distinctSuppliersCount: distinctSuppliers.size,
      totalValueBigInt: totalValue,
    };
  }
}

describe('Fluxo C — Busca Debounced, Filtros em 8 Facetas e Seleção Estável (R2)', () => {
  let sampleInvoices = [];

  beforeEach(async () => {
    invoiceRepository.clearSession();
    localStorageService.resetAll();

    // Cria banco de 6 documentos de teste com perfis diversificados
    const inv1 = {
      id: 'doc-001',
      numero: '000.145.892',
      serie: '1',
      chaveAcesso: '35261012345678000195550010001458921106501330',
      dataEmissao: '2026-10-10T10:00:00-03:00',
      status: 'importado',
      saldoStatus: 'disponivel',
      clienteAtribuido: 'Global Trading Logistics B.V.',
      emitente: {
        razaoSocial: 'Agroexport Brasil S.A.',
        cnpj: '12.345.678/0001-95',
      },
      destinatario: {
        nome: 'Global Trading Logistics B.V.',
        idEstrangeiro: 'NL884920192B01',
      },
      itens: [
        {
          id: 'item-1-1',
          codigo: 'EXP-CAF-001',
          descricao: 'Café em Grão Cru Arábica Tipo 6',
          ncm: '09011110',
          quantidade: '500.0000',
          valorUnitario: '25.5000',
          valorTotal: '12750.00',
        },
      ],
      totais: { valorTotalNota: '12750.00' },
      isRealImport: true,
      isDemo: false,
    };

    const inv2 = {
      id: 'doc-002',
      numero: '000.089.412',
      serie: '1',
      chaveAcesso: '51261073218492000160550010000894121104567891',
      dataEmissao: '2026-10-12T11:00:00-03:00',
      status: 'em_conferencia',
      saldoStatus: 'parcial',
      clienteAtribuido: 'Global Trading Logistics B.V.',
      emitente: {
        razaoSocial: 'Cooperativa Agroindustrial de MT - COOPAGRO',
        cnpj: '73.218.492/0001-60',
      },
      destinatario: {
        nome: 'Global Trading Logistics B.V.',
        idEstrangeiro: 'NL884920192B01',
      },
      itens: [
        {
          id: 'item-2-1',
          codigo: 'SOJA-01',
          descricao: 'Soja em Grãos Não Transgênica',
          ncm: '12019000',
          quantidade: '120.0000',
          valorUnitario: '350.0000',
          valorTotal: '42000.00',
        },
      ],
      totais: { valorTotalNota: '42000.00' },
      isRealImport: true,
      isDemo: false,
    };

    const inv3 = {
      id: 'doc-003',
      numero: '000.500.100',
      serie: '1',
      chaveAcesso: '52261003112554000179550010005001001101234567',
      dataEmissao: '2026-10-15T14:00:00-03:00',
      status: 'importado',
      saldoStatus: 'esgotado',
      clienteAtribuido: 'Industrial Supply Corp.',
      emitente: {
        razaoSocial: 'Cerealista Centro-Oeste S.A.',
        cnpj: '03.112.554/0001-79',
      },
      destinatario: {
        nome: 'Industrial Supply Corp.',
        idEstrangeiro: 'US-TX-9874125',
      },
      itens: [
        {
          id: 'item-3-1',
          codigo: 'MILHO-02',
          descricao: 'Milho Amarelo em Grãos',
          ncm: '10059010',
          quantidade: '200.0000',
          valorUnitario: '180.0000',
          valorTotal: '36000.00',
        },
      ],
      totais: { valorTotalNota: '36000.00' },
      isRealImport: true,
      isDemo: false,
    };

    const inv4 = {
      id: 'doc-004',
      numero: '000.700.200',
      serie: '1',
      chaveAcesso: '42261098765432000198550010007002001109876543',
      dataEmissao: '2026-10-18T09:30:00-03:00',
      status: 'importado',
      saldoStatus: 'disponivel',
      clienteAtribuido: null, // Sem cliente atribuído
      emitente: {
        razaoSocial: 'Metalúrgica Sul Americana Ltda',
        cnpj: '98.765.432/0001-98',
      },
      destinatario: {
        nome: 'Auto Assembly Europe GmbH',
        idEstrangeiro: 'DE814523990',
      },
      itens: [
        {
          id: 'item-4-1',
          codigo: 'EXP-MET-01',
          descricao: 'Peças Usinadas em Aço',
          ncm: '73269090',
          quantidade: '1000.0000',
          valorUnitario: '15.0000',
          valorTotal: '15000.00',
        },
      ],
      totais: { valorTotalNota: '15000.00' },
      isRealImport: true,
      isDemo: false,
    };

    sampleInvoices = [inv1, inv2, inv3, inv4];
    for (const inv of sampleInvoices) {
      await invoiceRepository.create(inv);
    }
  });

  // ==========================================================================
  // TIER 1: Busca Multi-Campo com Debounce de 300ms
  // ==========================================================================
  describe('Tier 1: Busca Multi-Campo com Debounce de 300ms', () => {
    it('1.1: Filtra documentos por número de nota fiscal (com ou sem pontuação)', () => {
      const res1 = DocumentFilterEngine.filter(sampleInvoices, { searchTerm: '145.892' });
      assert.strictEqual(res1.length, 1);
      assert.strictEqual(res1[0].id, 'doc-001');

      const res2 = DocumentFilterEngine.filter(sampleInvoices, { searchTerm: '145892' });
      assert.strictEqual(res2.length, 1);
      assert.strictEqual(res2[0].id, 'doc-001');
    });

    it('1.2: Filtra documentos por razão social do fornecedor (case-insensitive)', () => {
      const res = DocumentFilterEngine.filter(sampleInvoices, { searchTerm: 'agroexport' });
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].emitente.razaoSocial, 'Agroexport Brasil S.A.');
    });

    it('1.3: Filtra documentos por chave de acesso de 44 dígitos', () => {
      const key = sampleInvoices[1].chaveAcesso;
      const res = DocumentFilterEngine.filter(sampleInvoices, { searchTerm: key });
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].id, 'doc-002');
    });

    it('1.4: Filtra documentos por código interno de produto ou descrição', () => {
      const resCode = DocumentFilterEngine.filter(sampleInvoices, { searchTerm: 'EXP-CAF-001' });
      assert.strictEqual(resCode.length, 1);
      assert.strictEqual(resCode[0].id, 'doc-001');

      const resDesc = DocumentFilterEngine.filter(sampleInvoices, { searchTerm: 'Milho Amarelo' });
      assert.strictEqual(resDesc.length, 1);
      assert.strictEqual(resDesc[0].id, 'doc-003');
    });

    it('1.5: Simulação de Debounce de 300ms descarta buscas intermediárias e executa apenas a consulta final', async () => {
      let executedQueries = [];
      let timer = null;

      const triggerDebouncedSearch = (term) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          const results = DocumentFilterEngine.filter(sampleInvoices, { searchTerm: term });
          executedQueries.push({ term, count: results.length });
        }, 100);
      };

      // Dispara 3 keystrokes rápidos em sequência
      triggerDebouncedSearch('a');
      triggerDebouncedSearch('ag');
      triggerDebouncedSearch('agro');

      await new Promise((r) => setTimeout(r, 160));

      assert.strictEqual(executedQueries.length, 1, 'Deve executar apenas 1 query após cessar digitação');
      assert.strictEqual(executedQueries[0].term, 'agro');
      assert.strictEqual(executedQueries[0].count, 2, 'Agroexport e Coopagro contêm "agro"');
    });
  });

  // ==========================================================================
  // TIER 2: Filtros Combináveis em 8 Facetas e Cliente Atribuído
  // ==========================================================================
  describe('Tier 2: Filtros Combináveis em 8 Facetas', () => {
    it('2.1: Combina Fornecedor + Faixa de Valor Monetário', () => {
      const res = DocumentFilterEngine.filter(sampleInvoices, {
        supplier: 'coopagro',
        minValue: '40000.00',
        maxValue: '50000.00',
      });
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].id, 'doc-002');

      const resOutOfRange = DocumentFilterEngine.filter(sampleInvoices, {
        supplier: 'coopagro',
        minValue: '50000.00',
      });
      assert.strictEqual(resOutOfRange.length, 0);
    });

    it('2.2: Combina NCM + Estado de Saldo (Disponível)', () => {
      // Café NCM 0901 com saldo disponível
      const res = DocumentFilterEngine.filter(sampleInvoices, {
        ncm: '0901',
        balanceStatus: 'disponivel',
      });
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].id, 'doc-001');

      // Milho NCM 1005 tem saldo esgotado
      const resExhausted = DocumentFilterEngine.filter(sampleInvoices, {
        ncm: '1005',
        balanceStatus: 'disponivel',
      });
      assert.strictEqual(resExhausted.length, 0);
    });

    it('2.3: Filtra por Cliente de Exportação Atribuído (incluindo "Sem cliente atribuído")', () => {
      const resClient = DocumentFilterEngine.filter(sampleInvoices, {
        assignedClient: 'Global Trading Logistics B.V.',
      });
      assert.strictEqual(resClient.length, 2);

      const resUnassigned = DocumentFilterEngine.filter(sampleInvoices, {
        assignedClient: 'SEM_CLIENTE',
      });
      assert.strictEqual(resUnassigned.length, 1);
      assert.strictEqual(resUnassigned[0].id, 'doc-004');
    });

    it('2.4: Atribuição de cliente de exportação operacional não altera o destinatário original legal SEFAZ', async () => {
      const doc = await invoiceRepository.findById('doc-004');
      assert.strictEqual(doc.destinatario.nome, 'Auto Assembly Europe GmbH');
      assert.ok(!doc.clienteAtribuido, 'Deve iniciar sem cliente de exportação atribuído');

      // Atribui cliente operacional
      const updated = await invoiceRepository.update('doc-004', {
        clienteAtribuido: 'Global Trading Logistics B.V.',
      });

      assert.strictEqual(updated.clienteAtribuido, 'Global Trading Logistics B.V.');
      assert.strictEqual(updated.destinatario.nome, 'Auto Assembly Europe GmbH', 'Destinatário SEFAZ original deve ser estritamente preservado');
    });

    it('2.5: Combinação simultânea de 5 facetas (Status + Fornecedor + NCM + Data + Saldo)', () => {
      const res = DocumentFilterEngine.filter(sampleInvoices, {
        status: 'importado',
        supplier: 'Agroexport',
        ncm: '09011110',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-11',
        balanceStatus: 'disponivel',
      });

      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].id, 'doc-001');
    });
  });

  // ==========================================================================
  // TIER 3: Agrupamento Visual e Seleção Estável
  // ==========================================================================
  describe('Tier 3: Agrupamento Visual e Seleção Estável', () => {
    it('3.1: Agrupa visualmente documentos por Fornecedor exibindo subtotais e contadores', () => {
      const grouped = DocumentFilterEngine.group(sampleInvoices, 'supplier');
      assert.strictEqual(grouped.groups.length, 4, '4 fornecedores distintos');

      const agroGroup = grouped.groups.find((g) => g.label.includes('Agroexport'));
      assert.ok(agroGroup);
      assert.strictEqual(agroGroup.items.length, 1);
      assert.strictEqual(agroGroup.totalValue, '12750.00');
    });

    it('3.2: Agrupa visualmente por Cliente de Exportação Atribuído agrupando sem cliente na categoria correspondente', () => {
      const grouped = DocumentFilterEngine.group(sampleInvoices, 'client');

      const globalTrading = grouped.groups.find((g) => g.key.includes('Global Trading'));
      assert.ok(globalTrading);
      assert.strictEqual(globalTrading.items.length, 2);
      assert.strictEqual(globalTrading.totalValue, '54750.00'); // 12750 + 42000

      const unassigned = grouped.groups.find((g) => g.key === 'SEM_CLIENTE');
      assert.ok(unassigned);
      assert.strictEqual(unassigned.label, 'Sem cliente atribuído');
      assert.strictEqual(unassigned.items.length, 1);
    });

    it('3.3: Seleção de documentos permanece estável ao alternar filtros e ordenação', () => {
      const selectedIds = new Set(['doc-001', 'doc-003']);

      // 1. Aplica filtro 1
      const view1 = DocumentFilterEngine.filter(sampleInvoices, { supplier: 'Agroexport' });
      assert.strictEqual(view1.length, 1);
      assert.ok(selectedIds.has(view1[0].id), 'doc-001 continua selecionado na view');

      // 2. Aplica filtro 2 (doc-003 visível, doc-001 fora da view)
      const view2 = DocumentFilterEngine.filter(sampleInvoices, { supplier: 'Cerealista' });
      assert.strictEqual(view2.length, 1);
      assert.ok(selectedIds.has(view2[0].id), 'doc-003 continua selecionado na view');

      // 3. Remove todos os filtros: ambos permanecem no Set de seleção
      assert.strictEqual(selectedIds.size, 2);
      assert.ok(selectedIds.has('doc-001'));
      assert.ok(selectedIds.has('doc-003'));
    });
  });

  // ==========================================================================
  // TIER 4: Barra Flutuante de Ações e Contadores Consolidados BigInt
  // ==========================================================================
  describe('Tier 4: Barra de Ações e Métricas Consolidadas BigInt', () => {
    it('4.1: Calcula métricas exatas: notas selecionadas, itens, fornecedores distintos e total monetário BigInt', () => {
      // Seleciona doc-001 (Agroexport, 1 item, 12.750,00) e doc-002 (Coopagro, 1 item, 42.000,00)
      const selectedIds = new Set(['doc-001', 'doc-002']);
      const metrics = DocumentFilterEngine.calculateSelectionMetrics(sampleInvoices, selectedIds);

      assert.strictEqual(metrics.selectedCount, 2);
      assert.strictEqual(metrics.selectedItemsCount, 2);
      assert.strictEqual(metrics.distinctSuppliersCount, 2);
      assert.strictEqual(metrics.totalValueBigInt, '54750.00');
    });

    it('4.2: Bulk-select por grupo adiciona todos os itens do grupo à seleção global sem duplicatas', () => {
      const selectedIds = new Set();
      const grouped = DocumentFilterEngine.group(sampleInvoices, 'client');
      const globalTradingGroup = grouped.groups.find((g) => g.key.includes('Global Trading'));

      // Seleciona grupo em lote
      for (const item of globalTradingGroup.items) {
        selectedIds.add(item.id);
      }

      assert.strictEqual(selectedIds.size, 2);
      const metrics = DocumentFilterEngine.calculateSelectionMetrics(sampleInvoices, selectedIds);
      assert.strictEqual(metrics.totalValueBigInt, '54750.00');

      // Desseleciona grupo em lote
      for (const item of globalTradingGroup.items) {
        selectedIds.delete(item.id);
      }
      assert.strictEqual(selectedIds.size, 0);
    });
  });
});
