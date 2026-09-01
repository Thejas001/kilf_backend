import { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sponsor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
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
      <CardContent className="p-6">
        {extra}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Sponsor name</Label>
              <Input id="name" placeholder="Penguin Random House" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register('description')} />
            </div>

            <div className="space-y-1.5">
              <Label>Sponsorship level</Label>
              <Controller
                control={control}
                name="sponsorshipLevel"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Sponsorship amount</Label>
              <Input id="amount" type="number" step="0.01" min="0" {...register('amount')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input id="websiteUrl" placeholder="https://..." {...register('websiteUrl')} />
              {errors.websiteUrl && <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayOrder">Display order</Label>
              <Input id="displayOrder" type="number" {...register('displayOrder')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactName">Contact name</Label>
              <Input id="contactName" {...register('contactName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input id="contactEmail" type="email" {...register('contactEmail')} />
              {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input id="contactPhone" {...register('contactPhone')} />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/sponsors')}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
