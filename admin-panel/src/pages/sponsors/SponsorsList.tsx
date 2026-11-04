import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Handshake } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataPanel } from '@/components/common/DataPanel';
import { FilterSelect, SearchInput } from '@/components/common/ListControls';
import { Badge } from '@/components/ui/badge';
import { useListParams } from '@/hooks/useListParams';
import { deleteSponsor, listSponsors, updateSponsorStatus } from '@/services/sponsor.service';
import { formatCurrency, formatLabel } from '@/lib/utils';
import { SponsorshipLevel, SponsorStatus } from '@/types';
import { getApiErrorMessage } from '@/services/api';

const LEVELS: SponsorshipLevel[] = ['TITLE', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'PARTNER'];
const FILTER_KEYS = ['search', 'level'] as const;

export default function SponsorsListPage() {
  const { page, get, setFilter, setPage, hasFilters, clearFilters } = useListParams(FILTER_KEYS);
  const search = get('search');
  const level = get('level');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['sponsors', page, search, level],
    queryFn: () =>
      listSponsors({
        page,
        limit: 10,
        search: search || undefined,
        sponsorshipLevel: (level as SponsorshipLevel) || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSponsor,
    onSuccess: () => {
      toast.success('Sponsor deleted');
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete sponsor')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SponsorStatus }) => updateSponsorStatus(id, status),
    onSuccess: () => {
      toast.success('Sponsor status updated');
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to update status')),
  });

  return (
    <div>
      <PageHeader
        title="Sponsors"
        description="Manage festival sponsors and partnership tiers"
        actions={
          <Button asChild>
            <Link to="/sponsors/create">
              <Plus className="h-4 w-4" /> Add sponsor
            </Link>
          </Button>
        }
      />

      <DataPanel
        filters={
          <>
            <SearchInput value={search} onChange={(v) => setFilter('search', v)} placeholder="Search sponsors" />
            <FilterSelect
              value={level}
              onChange={(v) => setFilter('level', v)}
              allLabel="All levels"
              options={LEVELS.map((l) => ({ value: l, label: formatLabel(l) }))}
            />
          </>
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
            icon={Handshake}
            title="No sponsors yet"
            description="Add sponsors to showcase them on the public festival website."
            action={
              <Button asChild size="sm">
                <Link to="/sponsors/create">Add sponsor</Link>
              </Button>
            }
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sponsor</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Display order</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((sponsor) => (
              <TableRow key={sponsor.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
                      {sponsor.logoUrl ? (
                        <img src={sponsor.logoUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <Handshake className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <Link to={`/sponsors/${sponsor.id}/edit`} className="font-medium hover:text-primary hover:underline">
                      {sponsor.name}
                    </Link>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="accent">{formatLabel(sponsor.sponsorshipLevel)}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {sponsor.amount ? formatCurrency(sponsor.amount) : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{sponsor.displayOrder}</TableCell>
                <TableCell>
                  <Switch
                    aria-label={`${sponsor.name} active`}
                    checked={sponsor.status === 'ACTIVE'}
                    onCheckedChange={(checked) =>
                      statusMutation.mutate({ id: sponsor.id, status: checked ? 'ACTIVE' : 'INACTIVE' })
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild title="Edit sponsor" aria-label={`Edit ${sponsor.name}`}>
                      <Link to={`/sponsors/${sponsor.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete sponsor"
                          aria-label={`Delete ${sponsor.name}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Delete sponsor"
                      description={`Are you sure you want to delete "${sponsor.name}"?`}
                      confirmLabel="Delete"
                      variant="destructive"
                      onConfirm={() => deleteMutation.mutateAsync(sponsor.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>
    </div>
  );
}
