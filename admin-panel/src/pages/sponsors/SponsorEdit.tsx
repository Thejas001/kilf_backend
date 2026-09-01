import { ChangeEvent, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ImagePlus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { SponsorForm, SponsorFormValues } from './SponsorForm';
import { getSponsor, updateSponsor, uploadSponsorLogo } from '@/services/sponsor.service';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/services/api';

export default function SponsorEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: sponsor, isLoading, isError, refetch } = useQuery({
    queryKey: ['sponsor', id],
    queryFn: () => getSponsor(id!),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (values: SponsorFormValues) => updateSponsor(id!, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      await queryClient.invalidateQueries({ queryKey: ['sponsor', id] });
      toast.success('Sponsor updated');
      navigate('/sponsors');
    },
  });

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      await uploadSponsorLogo(id, file);
      await queryClient.invalidateQueries({ queryKey: ['sponsor', id] });
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to upload logo'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <PageHeader title="Edit Sponsor" description="Update sponsor details and branding" />
      {isLoading && <Skeleton className="h-96" />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {sponsor && (
        <SponsorForm
          defaultValues={sponsor}
          onSubmit={(v) => mutation.mutateAsync(v)}
          submitLabel="Save Changes"
          extra={
            <div className="mb-5 flex items-center gap-4 rounded-md border border-dashed border-border p-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-secondary">
                {sponsor.logoUrl ? (
                  <img src={sponsor.logoUrl} alt={sponsor.name} className="h-full w-full object-contain" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Sponsor logo</p>
                <p className="text-xs text-muted-foreground">PNG, JPEG, WEBP or SVG, up to 5MB</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
                Upload logo
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
