import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Ticket } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { getApiErrorMessage } from '@/services/api';
import { listFestivals } from '@/services/festival.service';

const ticketSchema = z
  .object({
    festivalId: z.string().uuid('Select a festival'),
    name: z.string().min(2, 'Name is required'),
    description: z.string().optional(),
    ticketType: z.enum(['GENERAL', 'VIP', 'STUDENT', 'EARLY_BIRD', 'DAY_PASS', 'FULL_FESTIVAL']),
    price: z.coerce.number().nonnegative('Price cannot be negative'),
    currency: z.string().min(3).max(3).default('INR'),
    totalQuantity: z.coerce.number().int().positive('Must be at least 1'),
    salesStart: z.string().min(1, 'Sales start date is required'),
    salesEnd: z.string().min(1, 'Sales end date is required'),
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .refine((d) => new Date(d.salesEnd) > new Date(d.salesStart), {
    message: 'Sales end must be after sales start',
    path: ['salesEnd'],
  });

export type TicketFormValues = z.infer<typeof ticketSchema>;

function toInputDateTime(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface TicketFormProps {
  defaultValues?: Partial<Ticket>;
  fixedFestivalId?: string;
  onSubmit: (values: TicketFormValues) => Promise<unknown>;
  submitLabel: string;
}

export function TicketForm({ defaultValues, fixedFestivalId, onSubmit, submitLabel }: TicketFormProps) {
  const navigate = useNavigate();
  const { data: festivalsData } = useQuery({
    queryKey: ['festivals-all'],
    queryFn: () => listFestivals({ page: 1, limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      festivalId: defaultValues?.festivalId ?? fixedFestivalId ?? '',
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      ticketType: defaultValues?.ticketType ?? 'GENERAL',
      price: defaultValues?.price ? Number(defaultValues.price) : 0,
      currency: defaultValues?.currency ?? 'INR',
      totalQuantity: defaultValues?.totalQuantity ?? 100,
      salesStart: toInputDateTime(defaultValues?.salesStart) || toInputDateTime(new Date().toISOString()),
      salesEnd: toInputDateTime(defaultValues?.salesEnd),
      status: defaultValues?.status ?? 'ACTIVE',
    },
  });

  async function handleFormSubmit(values: TicketFormValues) {
    try {
      await onSubmit(values);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save ticket'));
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Festival</Label>
              <Controller
                control={control}
                name="festivalId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!fixedFestivalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a festival" />
                    </SelectTrigger>
                    <SelectContent>
                      {festivalsData?.data.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.festivalId && <p className="text-xs text-destructive">{errors.festivalId.message}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Ticket name</Label>
              <Input id="name" placeholder="General Admission" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register('description')} />
            </div>

            <div className="space-y-1.5">
              <Label>Ticket type</Label>
              <Controller
                control={control}
                name="ticketType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="EARLY_BIRD">Early Bird</SelectItem>
                      <SelectItem value="DAY_PASS">Day Pass</SelectItem>
                      <SelectItem value="FULL_FESTIVAL">Full Festival</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
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

            <div className="space-y-1.5">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="0.01" min="0" {...register('price')} />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" maxLength={3} placeholder="INR" {...register('currency')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="totalQuantity">Total quantity</Label>
              <Input id="totalQuantity" type="number" min="1" {...register('totalQuantity')} />
              {errors.totalQuantity && <p className="text-xs text-destructive">{errors.totalQuantity.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="salesStart">Sales start</Label>
              <Input id="salesStart" type="datetime-local" {...register('salesStart')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salesEnd">Sales end</Label>
              <Input id="salesEnd" type="datetime-local" {...register('salesEnd')} />
              {errors.salesEnd && <p className="text-xs text-destructive">{errors.salesEnd.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/tickets')}>
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
