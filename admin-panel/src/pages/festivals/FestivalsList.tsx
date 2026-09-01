import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, BookOpen, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PaginationBar } from '@/components/common/PaginationBar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteFestival, listFestivals, updateFestivalStatus } from '@/services/festival.service';
import { formatDate } from '@/lib/utils';
import { FestivalStatus } from '@/types';
import { getApiErrorMessage } from '@/services/api';

export default function FestivalsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FestivalStatus | 'ALL'>('ALL');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['festivals', page, search, status],
    queryFn: () =>
      listFestivals({ page, limit: 10, search: search || undefined, status: status === 'ALL' ? undefined : status }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFestival,
    onSuccess: () => {
      toast.success('Festival deleted');
      queryClient.invalidateQueries({ queryKey: ['festivals'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete festival')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status: s }: { id: string; status: FestivalStatus }) => updateFestivalStatus(id, s),
    onSuccess: () => {
      toast.success('Festival status updated');
      queryClient.invalidateQueries({ queryKey: ['festivals'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to update status')),
  });

  return (
    <div>
      <PageHeader
        title="Festivals"
        description="Manage festival details, schedule, and publication status"
        actions={
          <Button asChild>
            <Link to="/festivals/create">
              <Plus className="h-4 w-4" /> Create Festival
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by name, location, or venue..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as FestivalStatus | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-96" />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {data && data.data.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No festivals yet"
          description="Create your first festival to start managing tickets and bookings."
          action={
            <Button asChild size="sm">
              <Link to="/festivals/create">Create Festival</Link>
            </Button>
          }
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((festival) => (
                <TableRow key={festival.id}>
                  <TableCell className="font-medium">{festival.name}</TableCell>
                  <TableCell className="text-muted-foreground">{festival.location ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(festival.startDate)} – {formatDate(festival.endDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{festival._count?.tickets ?? 0}</TableCell>
                  <TableCell>
                    <StatusBadge status={festival.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={festival.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                        onClick={() =>
                          statusMutation.mutate({
                            id: festival.id,
                            status: festival.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
                          })
                        }
                      >
                        {festival.status === 'PUBLISHED' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/festivals/${festival.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="Delete festival"
                        description={`Are you sure you want to delete "${festival.name}"? This cannot be undone.`}
                        confirmLabel="Delete"
                        variant="destructive"
                        onConfirm={() => deleteMutation.mutateAsync(festival.id)}
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
