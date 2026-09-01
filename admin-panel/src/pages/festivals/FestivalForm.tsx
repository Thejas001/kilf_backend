import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Festival } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { getApiErrorMessage } from '@/services/api';

const festivalSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    description: z.string().optional(),
    location: z.string().optional(),
    venue: z.string().optional(),
    bannerImage: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    registrationStart: z.string().optional(),
    registrationEnd: z.string().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type FestivalFormValues = z.infer<typeof festivalSchema>;

function toInputDate(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

interface FestivalFormProps {
  defaultValues?: Partial<Festival>;
  onSubmit: (values: FestivalFormValues) => Promise<unknown>;
  submitLabel: string;
}

export function FestivalForm({ defaultValues, onSubmit, submitLabel }: FestivalFormProps) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FestivalFormValues>({
    resolver: zodResolver(festivalSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      location: defaultValues?.location ?? '',
      venue: defaultValues?.venue ?? '',
      bannerImage: defaultValues?.bannerImage ?? '',
      startDate: toInputDate(defaultValues?.startDate),
      endDate: toInputDate(defaultValues?.endDate),
      registrationStart: toInputDate(defaultValues?.registrationStart),
      registrationEnd: toInputDate(defaultValues?.registrationEnd),
      status: defaultValues?.status ?? 'DRAFT',
    },
  });

  async function handleFormSubmit(values: FestivalFormValues) {
    try {
      await onSubmit(values);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save festival'));
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Festival name</Label>
              <Input id="name" placeholder="Kilf 2026" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} placeholder="Tell attendees what to expect..." {...register('description')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Bengaluru, India" {...register('location')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="venue">Venue</Label>
              <Input id="venue" placeholder="Exhibition Centre" {...register('venue')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="registrationStart">Registration opens</Label>
              <Input id="registrationStart" type="date" {...register('registrationStart')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="registrationEnd">Registration closes</Label>
              <Input id="registrationEnd" type="date" {...register('registrationEnd')} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bannerImage">Banner image URL</Label>
              <Input id="bannerImage" placeholder="https://..." {...register('bannerImage')} />
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
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/festivals')}>
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
