import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { FestivalForm, FestivalFormValues } from './FestivalForm';
import { createFestival } from '@/services/festival.service';

export default function FestivalCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSubmit(values: FestivalFormValues) {
    await createFestival({
      ...values,
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
      registrationStart: values.registrationStart ? new Date(values.registrationStart).toISOString() : undefined,
      registrationEnd: values.registrationEnd ? new Date(values.registrationEnd).toISOString() : undefined,
    } as never);
    await queryClient.invalidateQueries({ queryKey: ['festivals'] });
    toast.success('Festival created');
    navigate('/festivals');
  }

  return (
    <div>
      <PageHeader title="Create Festival" description="Set up a new literature festival" />
      <FestivalForm onSubmit={handleSubmit} submitLabel="Create Festival" />
    </div>
  );
}
