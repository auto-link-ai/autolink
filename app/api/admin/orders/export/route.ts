import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/admin/auth';
import { parseOrderListQuery } from '@/lib/admin/orderListQuery';
import { adminOrdersRepository } from '@/lib/db/repositories/ordersAdmin';
import { csvRow } from '@/lib/format/csv';

const COLUMNS = [
  'order_ref',
  'created_at',
  'status',
  'customer_name',
  'phone',
  'email',
  'wilaya_code',
  'commune',
  'address',
  'delivery_type',
  'delivery_notes',
  'quantity',
  'unit_price',
  'delivery_fee',
  'total_price',
  'assigned_tag_ids',
  'courier',
  'tracking_number',
] as const;

/**
 * CSV of the orders matching the current filter. Admin session required; the
 * file is never cached, and every cell is escaped so a customer-entered value
 * cannot execute as a spreadsheet formula.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const query = parseOrderListQuery(Object.fromEntries(request.nextUrl.searchParams));
  const lines = [csvRow([...COLUMNS])];
  for await (const order of adminOrdersRepository.export(session.actor, {
    status: query.status,
    orderRef: query.orderRef,
    phone: query.phone,
  })) {
    lines.push(
      csvRow([
        order.orderRef,
        order.createdAt.toISOString(),
        order.status,
        order.customerName,
        order.phone,
        order.email,
        order.wilayaCode,
        order.commune,
        order.address,
        order.deliveryType,
        order.deliveryNotes,
        order.quantity,
        order.unitPrice,
        order.deliveryFee,
        order.totalPrice,
        order.assignedTagIds.join(' '),
        order.courier,
        order.trackingNumber,
      ]),
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(`${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="autolink-orders-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
