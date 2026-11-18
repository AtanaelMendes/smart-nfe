'use client';

import AppLayout from '@/components/Layouts/AppLayout';
import ProductInvoiceEditor from '@/components/notes/ProductInvoiceEditor';

export default function NovaNotaProdutosPage() {
  const breadcrumbs = [
    { label: 'Notas', href: '/notas' },
    { label: 'Nova Nota', href: '/notas/nova' },
    { label: 'NF-e de Produtos' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <ProductInvoiceEditor mode="create" />
    </AppLayout>
  );
}
