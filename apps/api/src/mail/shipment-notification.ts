import Handlebars from 'handlebars';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LABELS = {
  SHIPMENT_CREATED: ['Đã tạo vận đơn', 'Shipment created'],
  PICKUP_PENDING: ['Đang chờ lấy hàng', 'Awaiting pickup'],
  IN_TRANSIT: ['Đang vận chuyển', 'In transit'],
  OUT_FOR_DELIVERY: ['Đang giao hàng', 'Out for delivery'],
  DELIVERED: ['Đã giao hàng', 'Delivered'],
  DELIVERY_FAILED: ['Giao hàng chưa thành công', 'Delivery attempt failed'],
  RETURN_REQUESTED: ['Đã yêu cầu hoàn hàng', 'Return requested'],
  RETURNING: ['Đang hoàn hàng', 'Returning'],
  RETURNED: ['Đã hoàn hàng', 'Returned'],
  CANCELLED: ['Đã hủy vận đơn', 'Shipment cancelled'],
  MANUAL_REVIEW: ['Cần kiểm tra giao hàng', 'Shipment requires review'],
} as const;
export type ShipmentNotificationMail = {
  to: string;
  subject: string;
  template: 'shipment-status';
  context: { id: string; trackingCode: string; status: keyof typeof LABELS };
};
export function validShipmentNotificationMail(
  value: unknown,
): value is ShipmentNotificationMail {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const m = value as Record<string, unknown>,
    c = m.context as Record<string, unknown> | undefined;
  return (
    Object.keys(m).every((k) =>
      ['to', 'subject', 'template', 'context'].includes(k),
    ) &&
    typeof m.to === 'string' &&
    m.to.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.to) &&
    typeof m.subject === 'string' &&
    m.subject.length > 0 &&
    m.subject.length <= 200 &&
    !/[\r\n]/.test(m.subject) &&
    m.template === 'shipment-status' &&
    !!c &&
    typeof c === 'object' &&
    !Array.isArray(c) &&
    Object.keys(c).every((k) => ['id', 'trackingCode', 'status'].includes(k)) &&
    typeof c.id === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      c.id,
    ) &&
    typeof c.trackingCode === 'string' &&
    /^[A-Za-z0-9_-]{1,32}$/.test(c.trackingCode) &&
    typeof c.status === 'string' &&
    Object.hasOwn(LABELS, c.status)
  );
}
export function renderShipmentNotification(mail: ShipmentNotificationMail) {
  const engine = Handlebars.create();
  const template = engine.compile(
    readFileSync(join(__dirname, 'templates', 'shipment-status.hbs'), 'utf8'),
  );
  return template({
    ...mail.context,
    statusVi: LABELS[mail.context.status][0],
    statusEn: LABELS[mail.context.status][1],
  });
}
