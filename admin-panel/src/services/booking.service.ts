import { api } from './api';
import { ApiItemResponse, ApiListResponse, Booking, BookingStatus } from '@/types';

export interface BookingListParams {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  ticketId?: string;
  festivalId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listBookings(params: BookingListParams): Promise<ApiListResponse<Booking>> {
  const res = await api.get('/api/admin/bookings', { params });
  return res.data;
}

export async function getBooking(id: string): Promise<Booking> {
  const res = await api.get<ApiItemResponse<Booking>>(`/api/admin/bookings/${id}`);
  return res.data.data;
}

export async function cancelBooking(id: string, reason?: string): Promise<Booking> {
  const res = await api.patch<ApiItemResponse<Booking>>(`/api/admin/bookings/${id}/status`, {
    status: 'CANCELLED',
    reason,
  });
  return res.data.data;
}

export async function refundBooking(id: string, reason?: string): Promise<Booking> {
  const res = await api.post<ApiItemResponse<Booking>>(`/api/admin/bookings/${id}/refund`, { reason });
  return res.data.data;
}

export async function exportBookingsCsv(params: BookingListParams): Promise<void> {
  const res = await api.get('/api/admin/bookings/export', { params, responseType: 'blob' });
  const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `bookings-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}
