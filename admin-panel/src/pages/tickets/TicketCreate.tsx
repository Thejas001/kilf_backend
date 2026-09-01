import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { TicketForm, TicketFormValues } from './TicketForm';
import { createTicket } from '@/services/ticket.service';

export default function TicketCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSubmit(values: TicketFormValues) {
    await createTicket({
      ...values,
      salesStart: new Date(values.salesStart).toISOString(),
      salesEnd: new Date(values.salesEnd).toISOString(),
    });
    await queryClient.invalidateQueries({ queryKey: ['tickets'] });
    toast.success('Ticket created');
    navigate('/tickets');
  }

  return (
    <div>
      <PageHeader title="Create Ticket" description="Add a new ticket type for a festival" />
      <TicketForm onSubmit={handleSubmit} submitLabel="Create Ticket" />
    </div>
  );
}
