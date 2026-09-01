import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { FestivalForm, FestivalFormValues } from './FestivalForm';
import { getFestival, updateFestival } from '@/services/festival.service';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';

export default function FestivalEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: festival, isLoading, isError, refetch } = useQuery({
    queryKey: ['festival', id],
    queryFn: () => getFestival(id!),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (values: FestivalFormValues) =>
      updateFestival(id!, {
        ...values,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
        registrationStart: values.registrationStart ? new Date(values.registrationStart).toISOString() : undefined,
        registrationEnd: values.registrationEnd ? new Date(values.registrationEnd).toISOString() : undefined,
      } as never),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['festivals'] });
      await queryClient.invalidateQueries({ queryKey: ['festival', id] });
      toast.success('Festival updated');
      navigate('/festivals');
    },
  });

  return (
    <div>
      <PageHeader title="Edit Festival" description="Update festival details" />
      {isLoading && <Skeleton className="h-96" />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {festival && (
        <FestivalForm defaultValues={festival} onSubmit={(v) => mutation.mutateAsync(v)} submitLabel="Save Changes" />
      )}
    </div>
  );
}
