import test from 'node:test';
import assert from 'node:assert/strict';

import { documentRepository, sessionDocuments } from '../../app/features/documentRepository.js';
import { catalogsRepository } from '../../app/features/catalogsRepository.js';
import { validateNFe } from '../../app/features/validation/nfeValidator.js';
import { validateNFSe } from '../../app/features/validation/nfseValidator.js';
import { cleanDecimalString, decimalCompare } from '../../app/lib/calculations/decimal.js';

test('Manual Documents & Catalogs: Repositories and Validation Suite', async (t) => {
  await t.test('catalogsRepository loads companies, persons, products and services', async () => {
    const companies = await catalogsRepository.listCompanies();
    const persons = await catalogsRepository.listPersons();
    const products = await catalogsRepository.listProducts();
    const services = await catalogsRepository.listServices();

    assert.ok(companies.length >= 3, 'Deve conter pelo menos 3 empresas mockadas');
    assert.ok(persons.length >= 3, 'Deve conter clientes/destinatários mockados');
    assert.ok(products.length >= 3, 'Deve conter catálogo de produtos mockados');
    assert.ok(services.length >= 3, 'Deve conter catálogo de serviços mockados');

    const meiCompany = companies.find((c) => c.isMei);
    assert.ok(meiCompany, 'Deve existir empresa prestadora enquadrada como MEI');
  });

  await t.test('documentRepository.list() retorna rascunhos com suporte a filtros', async () => {
    const all = await documentRepository.list();
    assert.ok(all.data.length > 0, 'Deve listar rascunhos disponíveis');

    const nfeOnly = await documentRepository.list({ documentType: 'NFE' });
    assert.ok(nfeOnly.data.every((d) => d.documentType === 'NFE'), 'Filtro por NFE deve retornar apenas NFE');

    const nfseOnly = await documentRepository.list({ documentType: 'NFSE' });
    assert.ok(nfseOnly.data.every((d) => d.documentType === 'NFSE'), 'Filtro por NFSE deve retornar apenas NFSE');
  });

  await t.test('documentRepository CRUD: cria, busca, atualiza, duplica e exclui NF-e com cálculo SEFAZ', async () => {
    const novoRascunho = {
      documentType: 'NFE',
      titulo: 'NF-e de Teste Automatizado',
      numeroPrevisto: '999001',
      seriePrevista: '1',
      dataPrevistaEmissao: '2026-11-20',
      naturezaOperacao: 'VENDA DE MERCADORIA',
      destinoOperacao: '1',
      emitenteId: 'comp-comercial-02',
      emitente: {
        razaoSocial: 'Comércio e Indústria Silva Santos Ltda',
        cnpj: '12.345.678/0001-90',
        uf: 'SP',
      },
      destinatario: {
        nomeOuRazao: 'Cliente Teste Ltda',
        documento: '98.765.432/0001-10',
        tipoPessoa: 'PJ',
        uf: 'SP',
      },
      itens: [
        {
          item: 1,
          codigo: 'PROD-01',
          descricao: 'Válvula Esfera Inox',
          ncm: '84818095',
          cfop: '5101',
          unidade: 'UN',
          quantidade: '2.0000',
          valorUnitario: '150.0000',
          desconto: '10.00',
        },
      ],
      totais: {
        valorDesconto: '10.00',
        valorFrete: '20.00',
        valorSeguro: '5.00',
        outrasDespesas: '0.00',
      },
    };

    const criado = await documentRepository.create(novoRascunho);
    assert.ok(criado.id, 'Deve gerar ID para o documento criado');
    assert.equal(criado.origin, 'MANUAL');
    assert.equal(criado.itens[0].valorTotal, '300.00', 'Valor dos produtos deve ser 2 * 150 = 300.00');
    // Total = 300.00 (produtos) - 10.00 (desconto) + 20.00 (frete) + 5.00 (seguro) = 315.00
    assert.equal(criado.totais.valorTotalNota, '315.00', 'Cálculo SEFAZ exato do total da nota');

    // Busca por ID
    const encontrado = await documentRepository.findById(criado.id);
    assert.ok(encontrado, 'Deve localizar documento por ID');
    assert.equal(encontrado.titulo, 'NF-e de Teste Automatizado');

    // Atualização
    const atualizado = await documentRepository.update(criado.id, {
      titulo: 'NF-e de Teste Atualizada',
    });
    assert.equal(atualizado.titulo, 'NF-e de Teste Atualizada');

    // Duplicação
    const duplicado = await documentRepository.duplicate(criado.id);
    assert.notEqual(duplicado.id, criado.id);
    assert.match(duplicado.titulo, /Cópia/);

    // Exclusão
    const del1 = await documentRepository.delete(criado.id);
    const del2 = await documentRepository.delete(duplicado.id);
    assert.equal(del1, true);
    assert.equal(del2, true);

    const postDel = await documentRepository.findById(criado.id);
    assert.equal(postDel, null, 'Documento excluído não deve mais ser retornado');
  });

  await t.test('documentRepository.convertToPreparationSource() aceita NF-e e bloqueia estritamente NFS-e', async () => {
    // 1. NF-e válida para preparação
    const nfeDoc = await documentRepository.create({
      documentType: 'NFE',
      titulo: 'NF-e para Exportação Preparada',
      emitenteId: 'comp-export-03',
      emitente: { razaoSocial: 'Exportadora Brasil SA', cnpj: '45.678.901/0001-23', uf: 'SP' },
      destinatario: { nomeOuRazao: 'Global Trading Inc', tipoPessoa: 'ESTRANGEIRO', pais: 'Estados Unidos' },
      itens: [
        {
          item: 1,
          codigo: 'EXP-10',
          descricao: 'Item Exportação',
          ncm: '84818095',
          cfop: '7101',
          unidade: 'UN',
          quantidade: '10.0000',
          valorUnitario: '100.0000',
        },
      ],
    });

    const converted = await documentRepository.convertToPreparationSource(nfeDoc.id);
    assert.ok(converted, 'Deve converter NF-e em documento de preparação');
    assert.equal(converted.status, 'em_conferencia', 'Deve receber status inicial em_conferencia');
    assert.equal(converted.itens.length, 1);

    // 2. NFS-e deve ser rejeitada com mensagem descritiva
    const nfseDoc = await documentRepository.create({
      documentType: 'NFSE',
      titulo: 'NFS-e de Serviços Consultoria',
      prestadorId: 'comp-mei-01',
      valores: { valorBruto: '1000.00' },
    });

    await assert.rejects(
      async () => {
        await documentRepository.convertToPreparationSource(nfseDoc.id);
      },
      /NFS-e de serviços não pode ser alocada/,
      'NFS-e não pode ser integrada a preparações de exportação de mercadorias'
    );

    // Limpa
    await documentRepository.delete(nfeDoc.id);
    await documentRepository.delete(nfseDoc.id);
  });

  await t.test('Validação de NF-e (nfeValidator) identifica inconsistências fiscais', () => {
    // Caso com inconsistências: NCM com 6 dígitos, CFOP exterior em operação interna
    const docInvalido = {
      emitente: { cnpj: '123' },
      destinatario: { documento: '456', tipoPessoa: 'PJ' },
      destinoOperacao: '1', // Interna
      itens: [
        {
          descricao: 'Item com erro',
          ncm: '123456', // Erro: precisa ter 8 dígitos
          cfop: '7101', // Erro: CFOP 7xxx é exclusivo para exterior
          quantidade: '-1',
          valorUnitario: '0',
        },
      ],
    };

    const val = validateNFe(docInvalido);
    assert.equal(val.isValid, false, 'Deve ser inválido');
    assert.ok(val.issues.some((e) => e.id.includes('ncm')), 'Deve acusar NCM de comprimento incorreto');
    assert.ok(val.issues.some((e) => e.id.includes('cfop')), 'Deve acusar CFOP 7xxx com destino interno');
    assert.ok(val.issues.some((e) => e.id.includes('qtd') || e.id.includes('quantidade')), 'Deve acusar quantidade inválida');
  });

  await t.test('Validação de NFS-e (nfseValidator) rejeita NCM/CFOP de mercadoria e valida LC 116', () => {
    const nfseInvalida = {
      isMei: true,
      prestador: null,
      servico: {
        codigoTributacaoNacional: '',
        discriminacao: '',
        ncm: '84818095', // Erro estrito: NFS-e não possui NCM
      },
      valores: {
        valorBruto: '0',
      },
    };

    const val = validateNFSe(nfseInvalida);
    assert.equal(val.isValid, false);
    assert.ok(val.issues.some((e) => e.id.includes('ncm') || e.message.includes('NCM')), 'NFS-e não pode conter campos de mercadoria como NCM');
    assert.ok(val.issues.some((e) => e.id.includes('codigo') || e.id.includes('servico') || e.field === 'servico.codigoTributacaoNacional'), 'Deve exigir código de tributação nacional');
  });
});
