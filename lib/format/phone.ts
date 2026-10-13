/**
 * Algerian mobile numbers as people read them. Input is the stored form,
 * 0XXXXXXXXX (lib/validation/phone.ts); anything else comes back unchanged.
 */

/** 0550123456 → « 05 50 12 34 56 ». */
export function formatPhone(phone: string): string {
  return /^0\d{9}$/.test(phone) ? phone.replace(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5') : phone;
}

/**
 * 0550123456 → « 05 •• •• 34 56 »: enough for the owner to recognise their own
 * number on the code screen, not enough to read it over a shoulder.
 */
export function maskPhone(phone: string): string {
  return /^0\d{9}$/.test(phone) ? `${phone.slice(0, 2)} •• •• ${phone.slice(6, 8)} ${phone.slice(8, 10)}` : '••';
}
