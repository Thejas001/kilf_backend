import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, ClipboardList, Eye, Ban } from 'lucide-react';
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
import { cancelBooking, exportBookingsCsv, listBookings } from '@/services/booking.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BookingStatus } from '@/types';
import { getApiErrorMessage } from '@/services/api';

const STATUSES: BookingStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'EXPIRED'];

export default function BookingsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BookingStatus | 'ALL'>('ALL');
  const [exporting, setExporting] = useState(false);
  const queryClient = useQueryClient();

  const params = {
    page,
    limit: 15,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bookings', page, search, status],
    queryFn: () => listBookings(params),
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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by booking #, name, email, phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-sm"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as BookingStatus | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-96" />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {data && data.data.length === 0 && (
        <EmptyState icon={ClipboardList} title="No bookings found" description="Bookings will appear here once customers start purchasing tickets." />
      )}

      {data && data.data.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Ticket(s)</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{booking.bookingNumber}</TableCell>
                  <TableCell>
                    <p className="font-medium">{booking.customer.name}</p>
                    <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {booking.bookingItems.map((i) => i.ticket.name).join(', ')}
                  </TableCell>
                  <TableCell>{booking.quantity}</TableCell>
                  <TableCell>{formatCurrency(booking.totalAmount, booking.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={booking.payments[0]?.status ?? 'PENDING'} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(booking.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/bookings/${booking.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status) && (
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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
