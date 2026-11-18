'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleExclamation, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import AppLayout from '@/components/Layouts/AppLayout';
import ProductInvoiceEditor from '@/components/notes/ProductInvoiceEditor';
import ServiceInvoiceEditor from '@/components/notes/ServiceInvoiceEditor';
import { documentRepository } from '@/features/documentRepository';
import { useAppContext } from '@/context/AppContext';

export default function EditarNotaPage({ params: paramsProp }) {
  const router = useRouter();
  const routeParams = useParams();
  const resolvedParams = paramsProp ? (typeof paramsProp.then === 'function' ? use(paramsProp) : paramsProp) : routeParams;
  const id = resolvedParams?.id || routeParams?.id;

  const { toast } = useAppContext();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDocument = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const doc = await documentRepository.findById(id);
      setDocument(doc || null);
    } catch (e) {
      console.error('Erro ao carregar documento:', e);
      toast.error('Erro ao carregar rascunho para edição.');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const breadcrumbs = [
    { label: 'Notas', href: '/notas' },
    { label: document?.titulo || id || 'Documento', href: `/notas/${id}` },
    { label: 'Editar Rascunho' },
  ];

  if (loading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 dark:text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Carregando editor de rascunho...</p>
        </div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl">
            <FontAwesomeIcon icon={faCircleExclamation} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rascunho não encontrado</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Não foi possível localizar o documento fiscal &quot;{id}&quot; para edição.
          </p>
          <div className="pt-4">
            <Link
              href="/notas"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>Voltar para Notas</span>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      {document.documentType === 'NFE' ? (
        <ProductInvoiceEditor initialData={document} mode="edit" />
      ) : (
        <ServiceInvoiceEditor initialData={document} mode="edit" />
      )}
    </AppLayout>
  );
}
