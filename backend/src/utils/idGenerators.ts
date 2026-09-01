import { randomInt } from 'crypto';

/**
 * Generates a booking number like KILF-2026-000123.
 * Uniqueness is enforced by the database unique constraint; callers should
 * retry on a rare collision (see bookingRepository.createBookingWithNumber).
 */
export function generateBookingNumber(year: number = new Date().getFullYear()): string {
  const random = randomInt(0, 999999).toString().padStart(6, '0');
  return `KILF-${year}-${random}`;
}

/**
 * Generates a ticket number like LF-2026-000123.
 */
export function generateTicketNumber(year: number = new Date().getFullYear()): string {
  const random = randomInt(0, 999999).toString().padStart(6, '0');
  return `LF-${year}-${random}`;
}
