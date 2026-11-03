export type AddressScheme = 'legacy' | 'two_level';

export interface ShippingAddressOption {
  id: string;
  name: string;
  scheme: AddressScheme;
  level: 'province' | 'district' | 'ward';
  parentId?: string;
  deliverySupported?: boolean;
}

export interface VerifiedShippingAddress {
  provider: string;
  scheme: AddressScheme;
  province: ShippingAddressOption;
  district?: ShippingAddressOption;
  ward: ShippingAddressOption;
  eligibility: 'eligible' | 'provider_validation_required';
}

// Application-side inputs: do not bind these trusted parcel/amount fields
// directly to a browser DTO. Resolve product data and validate before use.
export interface Parcel {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
}

export interface ShippingService {
  typeId: number;
  name: string;
}

export interface ShippingRoute {
  originDistrictId: number;
  destinationDistrictId: number;
}

export interface ShippingQuoteInput extends ShippingRoute {
  originWardCode?: string;
  destinationWardCode: string;
  serviceTypeId: number;
  parcel: Parcel;
  codAmount: number;
}

export interface CarrierFee {
  provider: string;
  actualFee: number;
  currency: 'VND';
}

export interface DeliveryEstimate {
  estimatedDeliveryAt: string | null;
}

export interface ShippingQuoteProvider {
  getAvailableServices(input: ShippingRoute): Promise<ShippingService[]>;
  calculateFee(input: ShippingQuoteInput): Promise<CarrierFee>;
  estimateDelivery(input: ShippingQuoteInput): Promise<DeliveryEstimate>;
}

export interface ShippingPreviewInput {
  destination: VerifiedShippingAddress;
  recipient: { name: string; phone: string; address: string };
  parcel: Parcel;
  serviceTypeId: number;
  codAmount: number;
  content: string;
}

export interface ShippingPreviewProvider {
  previewShipment(
    input: ShippingPreviewInput,
  ): Promise<CarrierFee & DeliveryEstimate>;
}

// Optional carrier fulfillment capability. The current GHN orchestration lives
// in FulfillmentService; future carriers can supply typed adapters separately
// without making quote-only providers claim unsupported mutation methods.
export interface ShippingFulfillmentProvider<
  CreateInput,
  Shipment,
  ActionResult,
> {
  createShipment(input: CreateInput): Promise<Shipment>;
  getShipment(trackingCode: string): Promise<Shipment>;
  cancelShipment(trackingCode: string): Promise<ActionResult>;
}
