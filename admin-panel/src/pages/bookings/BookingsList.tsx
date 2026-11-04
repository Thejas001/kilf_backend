import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, ClipboardList, Ban } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataPanel } from '@/components/common/DataPanel';
import { FilterSelect, FilterTabs, SearchInput } from '@/components/common/ListControls';
import { useListParams } from '@/hooks/useListParams';
import { listTickets } from '@/services/ticket.service';
import { cancelBooking, exportBookingsCsv, listBookings } from '@/services/booking.service';
import { formatCurrency, formatDate, formatLabel } from '@/lib/utils';
import { BookingStatus } from '@/types';
import { getApiErrorMessage } from '@/services/api';

const STATUSES: BookingStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'PAYMENT_REVIEW'];
const FILTER_KEYS = ['search', 'status', 'ticketId'] as const;

export default function BookingsListPage() {
  const { page, get, setFilter, setPage, hasFilters, clearFilters } = useListParams(FILTER_KEYS);
  const search = get('search');
  const status = get('status');
  const ticketId = get('ticketId');
  const [exporting, setExporting] = useState(false);

  const { data: ticketOptions } = useQuery({
    queryKey: ['tickets', 'options'],
    queryFn: () => listTickets({ page: 1, limit: 100 }),
  });
  const selectedTicket = ticketOptions?.data.find((t) => t.id === ticketId);
  const queryClient = useQueryClient();

  const params = {
    page,
    limit: 15,
    search: search || undefined,
    status: (status as BookingStatus) || undefined,
    ticketId: ticketId || undefined,
  };

  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['bookings', page, search, status, ticketId],
    queryFn: () => listBookings(params),
    placeholderData: keepPreviousData,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => cancelBooking(id, 'Cancelled by admin'),
    onSuccess: () => {
      toast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to cancel booking')),
  });

  async function handleExport() {
    setExporting(true);
    try {
      await exportBookingsCsv(params);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to export bookings'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Search, filter, and manage ticket bookings"
        actions={
          <Button variant="outline" onClick={handleExport} loading={exporting}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <DataPanel
        tabs={
          <FilterTabs
            value={status}
            onChange={(v) => setFilter('status', v)}
            allLabel="All"
            options={STATUSES.map((s) => ({ value: s, label: formatLabel(s) }))}
          />
        }
        filters={
          <>
            <SearchInput
              value={search}
              onChange={(v) => setFilter('search', v)}
              placeholder="Search booking #, name, email, phone"
            />
            <FilterSelect
              value={ticketId}
              onChange={(v) => setFilter('ticketId', v)}
              allLabel="All tickets"
              className="sm:w-60"
              options={(ticketOptions?.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
            />
            {selectedTicket && (
              <p className="self-center text-sm text-muted-foreground">
                {selectedTicket.availableQuantity} of {selectedTicket.totalQuantity} slots remaining
              </p>
            )}
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
            icon={ClipboardList}
            title="No bookings yet"
            description="Bookings will appear here once customers start purchasing tickets."
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Tickets</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="whitespace-nowrap">
                  <Link
                    to={`/bookings/${booking.id}`}
                    className="font-mono text-xs font-medium text-primary hover:underline"
                  >
                    {booking.bookingNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">{formatDate(booking.createdAt)}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{booking.customer.name}</p>
                  <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
                </TableCell>
                <TableCell>
                  <p>{booking.bookingItems.map((i) => i.ticket.name).join(', ')}</p>
                  <p className="text-xs text-muted-foreground">Qty {booking.quantity}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium">
                  {formatCurrency(booking.totalAmount, booking.currency)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={booking.payments[0]?.status ?? 'PENDING'} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <StatusBadge status={booking.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status) && (
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Cancel booking"
                            aria-label={`Cancel booking ${booking.bookingNumber}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        }
                        title="Cancel booking"
                        description={`Cancel booking ${booking.bookingNumber}? Reserved inventory will be released.`}
                        confirmLabel="Cancel booking"
                        variant="destructive"
                        onConfirm={() => cancelMutation.mutateAsync({ id: booking.id })}
                      />
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/bookings/${booking.id}`}>View</Link>
                    </Button>
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
