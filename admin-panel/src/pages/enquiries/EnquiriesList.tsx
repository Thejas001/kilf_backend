import { ReactNode, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageSquare, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataPanel } from '@/components/common/DataPanel';
import { FilterTabs, SearchInput } from '@/components/common/ListControls';
import { useAuth } from '@/hooks/useAuth';
import { useListParams } from '@/hooks/useListParams';
import { getApiErrorMessage } from '@/services/api';
import { formatDate } from '@/lib/utils';
import {
  ENQUIRY_STATUSES,
  Enquiry,
  EnquiryStatus,
  deleteEnquiry,
  listEnquiries,
  updateEnquiryStatus,
} from '@/services/enquiry.service';

const FILTER_KEYS = ['search', 'status'] as const;

export default function EnquiriesListPage() {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const { page, get, setFilter, setPage, hasFilters, clearFilters } = useListParams(FILTER_KEYS);
  const [openId, setOpenId] = useState<string | null>(null);

  const filters = { search: get('search') || undefined, status: (get('status') as EnquiryStatus) || undefined };

  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['enquiries', page, filters],
    queryFn: () => listEnquiries({ page, limit: 20, ...filters }),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnquiryStatus }) => updateEnquiryStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to update status')),
  });

  async function handleDelete(id: string) {
    try {
      await deleteEnquiry(id);
      toast.success('Enquiry deleted');
      setOpenId(null);
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete enquiry'));
    }
  }

  const canDelete = admin?.role === 'SUPER_ADMIN';
  const openEnquiry = data?.data.find((e) => e.id === openId);

  function statusSelect(enquiry: Enquiry, className: string) {
    return (
      <Select
        value={enquiry.status}
        onValueChange={(v) => statusMutation.mutate({ id: enquiry.id, status: v as EnquiryStatus })}
      >
        <SelectTrigger aria-label={`Status of enquiry from ${enquiry.name}`} className={className}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ENQUIRY_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div>
      <PageHeader
        title="Enquiries"
        description={
          data ? `${data.pagination.total} enquiries from the website form` : 'Enquiries from the website form'
        }
      />

      <DataPanel
        tabs={
          <FilterTabs
            value={get('status')}
            onChange={(v) => setFilter('status', v)}
            allLabel="All"
            options={ENQUIRY_STATUSES}
          />
        }
        filters={
          <SearchInput
            value={get('search')}
            onChange={(v) => setFilter('search', v)}
            placeholder="Search name, email, phone, company, message"
          />
        }
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        isEmpty={data?.data.length === 0}
        isStale={isPlaceholderData}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        pagination={data?.pagination}
        onPageChange={setPage}
        empty={
          <EmptyState
            icon={MessageSquare}
            title="No enquiries yet"
            description="Submissions from the website enquiry form will appear here."
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Enquiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.organisation}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <a href={`mailto:${e.email}`} className="block hover:underline">
                    {e.email}
                  </a>
                  <a href={`tel:${e.phone}`} className="text-xs text-muted-foreground hover:underline">
                    {e.phone}
                  </a>
                </TableCell>
                <TableCell className="min-w-48 max-w-sm">
                  <p className="font-medium">{e.topic ?? 'General enquiry'}</p>
                  {e.notes && <p className="truncate text-xs text-muted-foreground">{e.notes}</p>}
                </TableCell>
                <TableCell>{statusSelect(e, 'h-8 w-32')}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(e.createdAt, true)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setOpenId(e.id)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>

      <Dialog open={!!openEnquiry} onOpenChange={(open) => !open && setOpenId(null)}>
        {openEnquiry && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{openEnquiry.topic ?? 'General enquiry'}</DialogTitle>
              <DialogDescription>Received {formatDate(openEnquiry.createdAt, true)}</DialogDescription>
            </DialogHeader>

            <dl className="space-y-2 text-sm">
              <DetailRow label="Name" value={openEnquiry.name} />
              <DetailRow label="Company / brand" value={openEnquiry.organisation} />
              <DetailRow
                label="Email"
                value={
                  <a href={`mailto:${openEnquiry.email}`} className="text-primary hover:underline">
                    {openEnquiry.email}
                  </a>
                }
              />
              <DetailRow
                label="Phone"
                value={
                  <a href={`tel:${openEnquiry.phone}`} className="text-primary hover:underline">
                    {openEnquiry.phone}
                  </a>
                }
              />
            </dl>

            <div>
              <p className="mb-1.5 text-sm font-medium">Message</p>
              <p className="scrollbar-thin max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md bg-secondary/60 p-3 text-sm">
                {openEnquiry.notes || 'No message provided.'}
              </p>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                {statusSelect(openEnquiry, 'w-40')}
              </div>
              {canDelete && (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  }
                  title="Delete enquiry?"
                  description={`This permanently removes the enquiry from ${openEnquiry.name}.`}
                  confirmLabel="Delete"
                  variant="destructive"
                  onConfirm={() => handleDelete(openEnquiry.id)}
                />
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
    </div>
  );
}
