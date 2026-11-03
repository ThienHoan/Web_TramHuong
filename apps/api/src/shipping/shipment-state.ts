export const GHN_STATES: Record<string, string> = {
  ready_to_pick: 'PICKUP_PENDING',
  picking: 'PICKUP_PENDING',
  money_collect_picking: 'PICKUP_PENDING',
  picked: 'IN_TRANSIT',
  storing: 'IN_TRANSIT',
  transporting: 'IN_TRANSIT',
  sorting: 'IN_TRANSIT',
  delivering: 'OUT_FOR_DELIVERY',
  money_collect_delivering: 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED',
  delivery_fail: 'DELIVERY_FAILED',
  waiting_to_return: 'RETURN_REQUESTED',
  return: 'RETURNING',
  return_transporting: 'RETURNING',
  return_sorting: 'RETURNING',
  returning: 'RETURNING',
  returned: 'RETURNED',
  return_fail: 'MANUAL_REVIEW',
  cancel: 'CANCELLED',
  exception: 'MANUAL_REVIEW',
  lost: 'MANUAL_REVIEW',
  damage: 'MANUAL_REVIEW',
  scrap: 'MANUAL_REVIEW',
};
const rank: Record<string, number> = {
  SHIPMENT_PENDING: 0,
  SHIPMENT_CREATED: 1,
  PICKUP_PENDING: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
};
export function shipmentTransition(from: string, to: string): boolean {
  if (from === to || to === 'MANUAL_REVIEW') return true;
  if (['DELIVERED', 'RETURNED', 'CANCELLED'].includes(from)) return false;
  if (to === 'CANCELLED')
    return [
      'SHIPMENT_PENDING',
      'SHIPMENT_CREATED',
      'PICKUP_PENDING',
      'CANCEL_REQUESTED',
    ].includes(from);
  if (to === 'RETURNING')
    return [
      'RETURN_REQUESTED',
      'DELIVERY_FAILED',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'RETURNING',
    ].includes(from);
  if (to === 'RETURNED')
    return ['RETURNING', 'RETURN_REQUESTED'].includes(from);
  if (to === 'RETURN_REQUESTED')
    return ['DELIVERY_FAILED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(from);
  if (to === 'DELIVERY_FAILED')
    return ['OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(from);
  if (
    from === 'DELIVERY_FAILED' &&
    ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'RETURN_REQUESTED'].includes(to)
  )
    return true;
  return (
    rank[from] !== undefined && rank[to] !== undefined && rank[to] >= rank[from]
  );
}
export const GHN_CAPABILITIES = {
  provider: 'ghn',
  quote: true,
  preview: true,
  tracking: true,
  create: true,
  cancel: true,
  return: true,
  redelivery: true,
  codUpdate: true,
  labels: true,
  tickets: true,
  newAddresses: true,
  liveGps: false,
} as const;
