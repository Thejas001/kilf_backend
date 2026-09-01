import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Ticket as TicketIcon } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { deleteTicket, listTickets, updateTicketStatus } from '@/services/ticket.service';
import { formatCurrency } from '@/lib/utils';
import { TicketSaleStatus, TicketType } from '@/types';
import { getApiErrorMessage } from '@/services/api';

const TICKET_TYPES: TicketType[] = ['GENERAL', 'VIP', 'STUDENT', 'EARLY_BIRD', 'DAY_PASS', 'FULL_FESTIVAL'];

export default function TicketsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ticketType, setTicketType] = useState<TicketType | 'ALL'>('ALL');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tickets', page, search, ticketType],
    queryFn: () =>
      listTickets({
        page,
        limit: 10,
        search: search || undefined,
        ticketType: ticketType === 'ALL' ? undefined : ticketType,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTicket,
    onSuccess: () => {
      toast.success('Ticket deleted');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to delete ticket')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketSaleStatus }) => updateTicketStatus(id, status),
    onSuccess: () => {
      toast.success('Ticket status updated');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to update status')),
  });

  return (
    <div>
      <PageHeader
        title="Tickets"
        description="Manage ticket types, pricing, and inventory"
        actions={
          <Button asChild>
            <Link to="/tickets/create">
              <Plus className="h-4 w-4" /> Create Ticket
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={ticketType}
          onValueChange={(v) => {
            setTicketType(v as TicketType | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {TICKET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-96" />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {data && data.data.length === 0 && (
        <EmptyState
          icon={TicketIcon}
          title="No tickets yet"
          description="Create a ticket type to start selling to the public."
          action={
            <Button asChild size="sm">
              <Link to="/tickets/create">Create Ticket</Link>
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
                <TableHead>Festival</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.name}</TableCell>
                  <TableCell className="text-muted-foreground">{ticket.festival?.name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{ticket.ticketType.replace('_', ' ')}</TableCell>
                  <TableCell>{formatCurrency(ticket.price, ticket.currency)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ticket.totalQuantity - ticket.availableQuantity} / {ticket.totalQuantity} sold
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={ticket.status === 'ACTIVE'}
                      onCheckedChange={(checked) =>
                        statusMutation.mutate({ id: ticket.id, status: checked ? 'ACTIVE' : 'INACTIVE' })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/tickets/${ticket.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="Delete ticket"
                        description={`Are you sure you want to delete "${ticket.name}"? This cannot be undone.`}
                        confirmLabel="Delete"
                        variant="destructive"
                        onConfirm={() => deleteMutation.mutateAsync(ticket.id)}
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
