'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxesStacked,
  faReceipt,
  faArrowRight,
  faFolderOpen,
  faCircleInfo,
  faCheckCircle,
  faShieldHalved,
  faCoins,
  faTruckFast,
  faLaptopCode,
} from '@fortawesome/free-solid-svg-icons';
import AppLayout from '@/components/Layouts/AppLayout';
import PillsBadge from '@/components/buttons/PillsBadge';

export default function NovaNotaChoicePage() {
  const breadcrumbs = [
    { label: 'Nova Nota' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              Criar Nova Nota Fiscal
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Selecione a modalidade de documento fiscal que deseja preparar do zero.
            </p>
          </div>

          <Link
            href="/notas"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
          >
            <FontAwesomeIcon icon={faFolderOpen} className="w-4 h-4" />
            <span>Ver Rascunhos e Notas ({'/notas'})</span>
          </Link>
        </div>

        {/* Banner Informativo de Ambiente Demonstrativo */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex items-start gap-3">
          <FontAwesomeIcon icon={faCircleInfo} className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold text-sm">Ambiente de Preparação e Rascunho SmartNFe</p>
            <p>
              Os documentos fiscais criados nesta etapa permanecem salvos em estado de <strong>Rascunho</strong>.
              Nenhuma transmissão real para a SEFAZ ou Emissor Nacional é realizada no protótipo.
            </p>
          </div>
        </div>

        {/* Grid de Escolha entre NF-e e NFS-e */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Card 1: NF-e de Produtos (Modelo 55) */}
          <div className="relative flex flex-col justify-between bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-6 sm:p-8 shadow-xs hover:shadow-md transition-all group">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                  <FontAwesomeIcon icon={faBoxesStacked} />
                </div>
                <PillsBadge type="primary" small className="gap-1.5">
                  <FontAwesomeIcon icon={faTruckFast} className="w-3.5 h-3.5" />
                  Modelo 55 • Mercadorias
                </PillsBadge>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  NF-e de Produtos
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Preparação de nota fiscal de mercadorias, insumos industriais e produtos acabados.
                  Suporte completo a vendas internas, interestaduais e operações de exportação.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 w-3.5 h-3.5 flex-shrink-0" />
                  <span>Tabela editável com código, NCM, CFOP e unidades comerciais</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 w-3.5 h-3.5 flex-shrink-0" />
                  <span>Cálculos automáticos de totais, frete, seguro e despesas</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 w-3.5 h-3.5 flex-shrink-0" />
                  <span>Catálogo reutilizável de clientes e produtos com busca rápida</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 w-3.5 h-3.5 flex-shrink-0" />
                  <span>Integrável com o motor de preparações N:M de exportação</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/notas/nova/produtos"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors group-hover:bg-blue-700"
              >
                <span>Criar NF-e de Produtos</span>
                <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Card 2: NFS-e de Serviços (Padrão Nacional & MEI) */}
          <div className="relative flex flex-col justify-between bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 sm:p-8 shadow-xs hover:shadow-md transition-all group">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                  <FontAwesomeIcon icon={faReceipt} />
                </div>
                <PillsBadge type="success" small className="gap-1.5">
                  <FontAwesomeIcon icon={faCoins} className="w-3.5 h-3.5" />
                  Padrão Nacional • MEI & Serviços
                </PillsBadge>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  NFS-e de Serviços
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Emissão de notas de prestação de serviços conforme o convênio da NFS-e Nacional (LC 116/2003).
                  Interface otimizada com <strong>Modo Simplificado para MEI</strong> de tecnologia e serviços.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 w-3.5 h-3.5 flex-shrink-0" />
                  <span>Modo simplificado MEI: menos campos e preenchimento veloz</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 w-3.5 h-3.5 flex-shrink-0" />
                  <span>Códigos de tributação nacional e municipal pré-configurados</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 w-3.5 h-3.5 flex-shrink-0" />
                  <span>Suporte a tomador Pessoa Física (PF), Jurídica (PJ) e Exterior</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 w-3.5 h-3.5 flex-shrink-0" />
                  <span>Cálculo seguro sem campos mercantis incorretos (NCM/CFOP)</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/notas/nova/servicos"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors group-hover:bg-emerald-700"
              >
                <span>Criar NFS-e de Serviços</span>
                <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Rodapé explicativo de comparação técnica */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FontAwesomeIcon icon={faShieldHalved} className="text-blue-500" />
            <span>Diretrizes Fiscais do SmartNFe:</span>
          </div>
          <p>
            • <strong>NF-e (Produtos)</strong> é regulamentada pelo Ajuste SINIEF 07/05 e SEFAZ estadual, exigindo NCM, CFOP e controle de estoque de mercadorias.
          </p>
          <p>
            • <strong>NFS-e (Serviços)</strong> é regulamentada pela Lei Complementar nº 116/2003 e gerenciada pelos municípios ou Emissor Nacional da Receita Federal (especialmente para MEIs). Não utiliza NCM nem CFOP.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
