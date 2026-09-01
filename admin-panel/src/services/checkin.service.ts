import { api } from './api';
import { TicketInstance } from '@/types';

export interface VerifyResult {
  valid: boolean;
  alreadyUsed: boolean;
  message: string;
  ticket:
    | (TicketInstance & {
        ticket: { id: string; name: string; ticketType: string };
        booking: { bookingNumber: string; status: string; customer: { name: string; email: string } };
      })
    | null;
}

export async function verifyTicket(ticketNumber: string): Promise<VerifyResult> {
  const res = await api.post('/api/admin/tickets/verify', { ticketNumber });
  return res.data.data;
}

export async function checkInTicket(ticketNumber: string): Promise<TicketInstance> {
  const res = await api.post('/api/admin/tickets/check-in', { ticketNumber });
  return res.data.data;
}
