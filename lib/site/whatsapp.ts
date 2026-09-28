/**
 * A wa.me link that opens a chat with the shop, the first message already
 * typed. Accepts the number as written in lib/config/site.ts — international
 * digits (213…), +213…, 00213… or a local 0… mobile. Null when there is no
 * usable number, so the button is simply not shown.
 */
export function whatsappLink(number: string | null | undefined, message: string): string | null {
  if (!number) return null;
  let digits = number.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('0')) digits = `213${digits.slice(1)}`;
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
