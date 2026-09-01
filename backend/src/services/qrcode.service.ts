import QRCode from 'qrcode';

/** Returns a base64 PNG data URL encoding the ticket number for scanning at check-in. */
export async function generateQrCodeDataUrl(ticketNumber: string): Promise<string> {
  return QRCode.toDataURL(ticketNumber, { errorCorrectionLevel: 'M', margin: 1, width: 300 });
}
