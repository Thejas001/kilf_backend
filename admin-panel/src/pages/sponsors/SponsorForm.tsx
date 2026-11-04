import { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sponsor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Field, FormActions, FormSection } from '@/components/common/FormLayout';
import { getApiErrorMessage } from '@/services/api';

const sponsorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  websiteUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  sponsorshipLevel: z.enum(['TITLE', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'PARTNER']),
  amount: z.coerce.number().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  displayOrder: z.coerce.number().int().optional(),
});

export type SponsorFormValues = z.infer<typeof sponsorSchema>;

interface SponsorFormProps {
  defaultValues?: Partial<Sponsor>;
  onSubmit: (values: SponsorFormValues) => Promise<unknown>;
  submitLabel: string;
  extra?: ReactNode;
}

export function SponsorForm({ defaultValues, onSubmit, submitLabel, extra }: SponsorFormProps) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SponsorFormValues>({
    resolver: zodResolver(sponsorSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      websiteUrl: defaultValues?.websiteUrl ?? '',
      contactName: defaultValues?.contactName ?? '',
      contactEmail: defaultValues?.contactEmail ?? '',
      contactPhone: defaultValues?.contactPhone ?? '',
      sponsorshipLevel: defaultValues?.sponsorshipLevel ?? 'PARTNER',
      amount: defaultValues?.amount ? Number(defaultValues.amount) : undefined,
      status: defaultValues?.status ?? 'ACTIVE',
      displayOrder: defaultValues?.displayOrder ?? 0,
    },
  });

  async function handleFormSubmit(values: SponsorFormValues) {
    try {
      await onSubmit(values);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save sponsor'));
    }
  }

  return (
    <Card>
      {extra && (
        <FormSection title="Logo" description="Shown on the public festival website.">
          <div className="sm:col-span-2">{extra}</div>
        </FormSection>
      )}
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <FormSection title="Sponsor details" description="The public profile of this sponsor.">
          <Field label="Sponsor name" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" placeholder="Penguin Random House" {...register('name')} />
          </Field>
          <Field label="Website URL" htmlFor="websiteUrl" error={errors.websiteUrl?.message}>
            <Input id="websiteUrl" placeholder="https://..." {...register('websiteUrl')} />
          </Field>
          <Field label="Description" htmlFor="description" wide>
            <Textarea id="description" rows={3} {...register('description')} />
          </Field>
        </FormSection>

        <FormSection title="Sponsorship" description="The tier, amount, and where this sponsor appears in listings.">
          <Field label="Sponsorship level" required>
            <Controller
              control={control}
              name="sponsorshipLevel"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Sponsorship level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TITLE">Title</SelectItem>
                    <SelectItem value="PLATINUM">Platinum</SelectItem>
                    <SelectItem value="GOLD">Gold</SelectItem>
                    <SelectItem value="SILVER">Silver</SelectItem>
                    <SelectItem value="BRONZE">Bronze</SelectItem>
                    <SelectItem value="PARTNER">Partner</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Sponsorship amount" htmlFor="amount" error={errors.amount?.message}>
            <Input id="amount" type="number" step="0.01" min="0" {...register('amount')} />
          </Field>
          <Field label="Display order" htmlFor="displayOrder" hint="Lower numbers appear first.">
            <Input id="displayOrder" type="number" {...register('displayOrder')} />
          </Field>
          <Field label="Status" required>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </FormSection>

        <FormSection title="Contact person" description="For internal use. Who to reach at this sponsor.">
          <Field label="Contact name" htmlFor="contactName">
            <Input id="contactName" {...register('contactName')} />
          </Field>
          <Field label="Contact phone" htmlFor="contactPhone">
            <Input id="contactPhone" {...register('contactPhone')} />
          </Field>
          <Field label="Contact email" htmlFor="contactEmail" error={errors.contactEmail?.message}>
            <Input id="contactEmail" type="email" {...register('contactEmail')} />
          </Field>
        </FormSection>

        <FormActions>
          <Button type="button" variant="outline" onClick={() => navigate('/sponsors')}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {submitLabel}
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}
