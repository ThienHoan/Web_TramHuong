export type LogisticsKind =
  | 'warehouse'
  | 'profile'
  | 'inventory'
  | 'quote'
  | 'shipment'
  | 'action'
  | 'inbox'
  | 'event'
  | 'exception'
  | 'return'
  | 'cod'
  | 'ticket'
  | 'notification'
  | 'promotion';
export interface LogisticsRecord<T = Record<string, unknown>> {
  id: string;
  key: string;
  kind: LogisticsKind;
  state: string;
  owner_id: string | null;
  order_id: string | null;
  data: T;
  version: number;
  created_at: string;
  updated_at: string;
}
export interface Warehouse {
  name: string;
  shopId: number;
  districtId: number;
  active: boolean;
  tareGrams: number;
  paddingCm: number;
}
export interface PackageProfile {
  productId: string;
  variantId: string;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  unitCost?: number;
}
export interface LogisticsSettings {
  checkout: boolean;
  jobs: boolean;
  fulfillment: boolean;
  webhookSecret: string;
}
export const LOGISTICS_SETTINGS = Symbol('LOGISTICS_SETTINGS');
