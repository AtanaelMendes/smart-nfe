/**
 * SmartNFe — Repositório de Cadastros Reutilizáveis
 *
 * Gerencia os cadastros de:
 * - Empresas Emitentes (MEI, Comercial, Exportadora)
 * - Pessoas (Clientes, Tomadores, Destinatários — PF, PJ, Estrangeiro)
 * - Catálogo de Produtos (com NCM, CEST, uCom e preços)
 * - Catálogo de Serviços (com Código de Tributação Nacional, LC 116 e NBS)
 *
 * Suporta persistência mockada versionada via localStorageService com fallback de fábrica.
 */

import { localStorageService, STORAGE_KEYS } from '../lib/storage/localStorageService.js';
import { getMockCompanies } from '../lib/data/mockCompanies.js';
import { getMockPersons } from '../lib/data/mockPersons.js';
import { getMockProducts } from '../lib/data/mockProducts.js';
import { getMockServices } from '../lib/data/mockServices.js';

// Registro automático de fábrica no storage
localStorageService.registerDefault(STORAGE_KEYS.COMPANIES, () => getMockCompanies());
localStorageService.registerDefault(STORAGE_KEYS.PERSONS, () => getMockPersons());
localStorageService.registerDefault(STORAGE_KEYS.PRODUCTS, () => getMockProducts());
localStorageService.registerDefault(STORAGE_KEYS.SERVICES, () => getMockServices());

function deepClone(val) {
  if (val == null) return val;
  try {
    return structuredClone(val);
  } catch {
    return JSON.parse(JSON.stringify(val));
  }
}

export const catalogsRepository = {
  // ---------------------------------------------------------------------------
  // EMPRESAS EMITENTES
  // ---------------------------------------------------------------------------
  async listCompanies() {
    const list = localStorageService.load(STORAGE_KEYS.COMPANIES, getMockCompanies());
    return deepClone(list || []);
  },

  async findCompanyById(id) {
    if (!id) return null;
    const list = await this.listCompanies();
    return list.find((c) => c.id === id) || null;
  },

  // ---------------------------------------------------------------------------
  // PESSOAS / CLIENTES / TOMADORES
  // ---------------------------------------------------------------------------
  async listPersons({ papel = '', query = '' } = {}) {
    const list = localStorageService.load(STORAGE_KEYS.PERSONS, getMockPersons()) || [];
    let filtered = list;

    if (papel) {
      const pUpper = papel.toUpperCase();
      filtered = filtered.filter((p) => Array.isArray(p.papeis) && p.papeis.includes(pUpper));
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const nome = (p.nomeOuRazao || '').toLowerCase();
        const doc = (p.documento || '').replace(/\D/g, '');
        const docFormatado = (p.documento || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        return nome.includes(q) || doc.includes(q.replace(/\D/g, '')) || docFormatado.includes(q) || email.includes(q);
      });
    }

    return deepClone(filtered);
  },

  async findPersonById(id) {
    if (!id) return null;
    const list = localStorageService.load(STORAGE_KEYS.PERSONS, getMockPersons()) || [];
    return deepClone(list.find((p) => p.id === id) || null);
  },

  async savePerson(personData) {
    if (!personData) throw new Error('Dados da pessoa são obrigatórios.');
    const list = localStorageService.load(STORAGE_KEYS.PERSONS, getMockPersons()) || [];
    const id = personData.id || `person-${Date.now()}`;
    const entry = {
      ...deepClone(personData),
      id,
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = list.findIndex((p) => p.id === id);
    if (existingIndex >= 0) {
      list[existingIndex] = entry;
    } else {
      entry.createdAt = new Date().toISOString();
      list.push(entry);
    }

    localStorageService.save(STORAGE_KEYS.PERSONS, list);
    return deepClone(entry);
  },

  // ---------------------------------------------------------------------------
  // PRODUTOS
  // ---------------------------------------------------------------------------
  async listProducts({ query = '' } = {}) {
    const list = localStorageService.load(STORAGE_KEYS.PRODUCTS, getMockProducts()) || [];
    if (!query || !query.trim()) return deepClone(list);

    const q = query.toLowerCase().trim();
    const filtered = list.filter((p) => {
      const cod = (p.codigo || '').toLowerCase();
      const desc = (p.descricao || '').toLowerCase();
      const ncm = (p.ncm || '').toLowerCase();
      return cod.includes(q) || desc.includes(q) || ncm.includes(q);
    });
    return deepClone(filtered);
  },

  async findProductById(id) {
    if (!id) return null;
    const list = localStorageService.load(STORAGE_KEYS.PRODUCTS, getMockProducts()) || [];
    return deepClone(list.find((p) => p.id === id) || null);
  },

  async saveProduct(productData) {
    if (!productData) throw new Error('Dados do produto são obrigatórios.');
    const list = localStorageService.load(STORAGE_KEYS.PRODUCTS, getMockProducts()) || [];
    const id = productData.id || `prod-${Date.now()}`;
    const entry = {
      ...deepClone(productData),
      id,
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = list.findIndex((p) => p.id === id);
    if (existingIndex >= 0) {
      list[existingIndex] = entry;
    } else {
      list.push(entry);
    }

    localStorageService.save(STORAGE_KEYS.PRODUCTS, list);
    return deepClone(entry);
  },

  // ---------------------------------------------------------------------------
  // SERVIÇOS
  // ---------------------------------------------------------------------------
  async listServices({ query = '' } = {}) {
    const list = localStorageService.load(STORAGE_KEYS.SERVICES, getMockServices()) || [];
    if (!query || !query.trim()) return deepClone(list);

    const q = query.toLowerCase().trim();
    const filtered = list.filter((s) => {
      const cod = (s.codigoInterno || '').toLowerCase();
      const desc = (s.descricao || '').toLowerCase();
      const trib = (s.codigoTributacaoNacional || '').toLowerCase();
      return cod.includes(q) || desc.includes(q) || trib.includes(q);
    });
    return deepClone(filtered);
  },

  async findServiceById(id) {
    if (!id) return null;
    const list = localStorageService.load(STORAGE_KEYS.SERVICES, getMockServices()) || [];
    return deepClone(list.find((s) => s.id === id) || null);
  },

  async saveService(serviceData) {
    if (!serviceData) throw new Error('Dados do serviço são obrigatórios.');
    const list = localStorageService.load(STORAGE_KEYS.SERVICES, getMockServices()) || [];
    const id = serviceData.id || `serv-${Date.now()}`;
    const entry = {
      ...deepClone(serviceData),
      id,
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = list.findIndex((s) => s.id === id);
    if (existingIndex >= 0) {
      list[existingIndex] = entry;
    } else {
      list.push(entry);
    }

    localStorageService.save(STORAGE_KEYS.SERVICES, list);
    return deepClone(entry);
  },

  // ---------------------------------------------------------------------------
  // RESET COMPLETO DE CADASTROS (UTILITÁRIO DEMO)
  // ---------------------------------------------------------------------------
  async resetAll() {
    localStorageService.reset(STORAGE_KEYS.COMPANIES);
    localStorageService.reset(STORAGE_KEYS.PERSONS);
    localStorageService.reset(STORAGE_KEYS.PRODUCTS);
    localStorageService.reset(STORAGE_KEYS.SERVICES);
    return true;
  },
};

export default catalogsRepository;
