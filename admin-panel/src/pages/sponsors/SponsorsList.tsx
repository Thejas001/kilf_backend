import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Handshake } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PaginationBar } from '@/components/common/PaginationBar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteSponsor, listSponsors, updateSponsorStatus } from '@/services/sponsor.service';
import { formatCurrency } from '@/lib/utils';
import { SponsorshipLevel, SponsorStatus } from '@/types';
import { getApiErrorMessage } from '@/services/api';

const LEVELS: SponsorshipLevel[] = ['TITLE', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'PARTNER'];

export default function SponsorsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<SponsorshipLevel | 'ALL'>('ALL');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sponsors', page, search, level],
    queryFn: () =>
      listSponsors({ page, limit: 10, search: search || undefined, sponsorshipLevel: level === 'ALL' ? undefined : level }),
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
              <Plus className="h-4 w-4" /> Add Sponsor
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search sponsors..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={level}
          onValueChange={(v) => {
            setLevel(v as SponsorshipLevel | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All levels</SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-96" />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {data && data.data.length === 0 && (
        <EmptyState
          icon={Handshake}
          title="No sponsors yet"
          description="Add sponsors to showcase them on the public festival website."
          action={
            <Button asChild size="sm">
              <Link to="/sponsors/create">Add Sponsor</Link>
            </Button>
          }
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sponsor</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((sponsor) => (
                <TableRow key={sponsor.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {sponsor.logoUrl && (
                        <img src={sponsor.logoUrl} alt="" className="h-6 w-6 rounded object-contain" />
                      )}
                      <span className="font-medium">{sponsor.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="accent">{sponsor.sponsorshipLevel}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {sponsor.amount ? formatCurrency(sponsor.amount) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{sponsor.displayOrder}</TableCell>
                  <TableCell>
                    <Switch
                      checked={sponsor.status === 'ACTIVE'}
                      onCheckedChange={(checked) =>
                        statusMutation.mutate({ id: sponsor.id, status: checked ? 'ACTIVE' : 'INACTIVE' })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/sponsors/${sponsor.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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
          <PaginationBar pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
