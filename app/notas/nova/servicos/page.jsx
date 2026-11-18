'use client';

import AppLayout from '@/components/Layouts/AppLayout';
import ServiceInvoiceEditor from '@/components/notes/ServiceInvoiceEditor';

export default function NovaNotaServicosPage() {
  const breadcrumbs = [
    { label: 'Notas', href: '/notas' },
    { label: 'Nova Nota', href: '/notas/nova' },
    { label: 'NFS-e de Serviços' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <ServiceInvoiceEditor mode="create" />
    </AppLayout>
  );
}
