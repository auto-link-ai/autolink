import 'server-only';
import { formatDzd } from '@/lib/format/currency';
import { sendEmail, type EmailResult } from '@/lib/notifications/email';

/**
 * "New order" email to ADMIN_ALERT_EMAIL. Carries the reference, quantity,
 * wilaya and total — never the customer's phone or address (those stay in the
 * admin, behind the admin login).
 */
export async function sendNewOrderAlert(order: {
  orderRef: string;
  quantity: number;
  wilayaName: string;
  totalPrice: number;
  currencyLabel: string;
}): Promise<EmailResult> {
  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!to) return { status: 'SKIPPED', reason: 'no_admin_alert_email' };

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
  const link = `${base}/fr/admin/orders?ref=${encodeURIComponent(order.orderRef)}`;
  const total = formatDzd(order.totalPrice, order.currencyLabel);
  const text = [
    `Nouvelle commande ${order.orderRef}`,
    `Quantité : ${order.quantity}`,
    `Wilaya : ${order.wilayaName}`,
    `Total : ${total}`,
    '',
    `Voir la commande : ${link}`,
  ].join('\n');

  return sendEmail({ to, subject: `Nouvelle commande ${order.orderRef} — ${total}`, text });
}
