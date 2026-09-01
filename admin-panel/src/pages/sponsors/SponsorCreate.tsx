import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { SponsorForm, SponsorFormValues } from './SponsorForm';
import { createSponsor } from '@/services/sponsor.service';

export default function SponsorCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSubmit(values: SponsorFormValues) {
    const sponsor = await createSponsor(values);
    await queryClient.invalidateQueries({ queryKey: ['sponsors'] });
    toast.success('Sponsor created');
    navigate(`/sponsors/${sponsor.id}/edit`);
  }

  return (
    <div>
      <PageHeader title="Add Sponsor" description="Add a new festival sponsor" />
      <SponsorForm onSubmit={handleSubmit} submitLabel="Create Sponsor" />
    </div>
  );
}
