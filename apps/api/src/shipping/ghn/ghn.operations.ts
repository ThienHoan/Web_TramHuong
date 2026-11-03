// Verified against developer.ghn.vn on 2026-11-01. Closed operation list;
// mutations are single-attempt and production-blocked by GhnClient.
export const GHN_OPERATIONS = {
  legacyProvinces: {
    method: 'GET',
    path: '/master-data/province',
    retry: true,
  },
  legacyDistricts: {
    method: 'GET',
    path: '/master-data/district',
    retry: true,
  },
  legacyWards: { method: 'GET', path: '/master-data/ward', retry: true },
  provinces: {
    method: 'GET',
    path: '/v3/master-data/province/all',
    retry: true,
  },
  wards: {
    method: 'GET',
    path: '/v3/master-data/ward/all-by-province-id',
    retry: true,
  },
  services: {
    method: 'POST',
    path: '/v2/shipping-order/available-services',
    retry: true,
  },
  fee: { method: 'POST', path: '/v2/shipping-order/fee', retry: true },
  leadtime: {
    method: 'POST',
    path: '/v2/shipping-order/leadtime',
    retry: true,
  },
  preview: { method: 'POST', path: '/v2/shipping-order/preview', retry: false },
  createShipment: {
    method: 'POST',
    path: '/v2/shipping-order/create',
    retry: false,
    mutation: true,
  },
  detail: { method: 'GET', path: '/v2/shipping-order/detail', retry: true },
  actualFee: { method: 'GET', path: '/v2/shipping-order/soc', retry: true },
  detailByClient: {
    method: 'GET',
    path: '/v2/shipping-order/detail-by-client-code',
    retry: true,
  },
  shifts: { method: 'GET', path: '/v2/shift/date', retry: true },
  updateShipment: {
    method: 'POST',
    path: '/v2/shipping-order/update',
    retry: false,
    mutation: true,
  },
  cancelShipment: {
    method: 'POST',
    path: '/v2/switch-status/cancel',
    retry: false,
    mutation: true,
  },
  returnShipment: {
    method: 'POST',
    path: '/v2/switch-status/return',
    retry: false,
    mutation: true,
  },
  redeliver: {
    method: 'POST',
    path: '/v2/switch-status/storing',
    retry: false,
    mutation: true,
  },
  updateCod: {
    method: 'POST',
    path: '/v2/shipping-order/updateCOD',
    retry: false,
    mutation: true,
  },
  printLabels: {
    method: 'POST',
    path: '/v2/a5/gen-token',
    retry: false,
    mutation: true,
  },
  ticketCreate: {
    method: 'POST',
    path: '/ticket/create',
    retry: false,
    mutation: true,
    form: true,
  },
  ticketReply: {
    method: 'POST',
    path: '/ticket/reply',
    retry: false,
    mutation: true,
    form: true,
  },
  ticketDetail: { method: 'GET', path: '/ticket/detail', retry: true },
} as const;

export type GhnOperation = keyof typeof GHN_OPERATIONS;
