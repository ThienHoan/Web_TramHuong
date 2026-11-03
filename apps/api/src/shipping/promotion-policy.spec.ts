import { promotionSubsidy } from './promotion-policy';
import { ShippingProviderRegistry } from './provider-registry';
import type { GhnProvider } from './ghn/ghn.provider';
describe('profit-aware shipping and provider readiness', () => {
  const rule = {
    active: true,
    minSubtotal: 100000,
    maxSubsidy: 30000,
    minMargin: 50000,
  };
  it('never grants an additional subsidy without trusted costs', () =>
    expect(promotionSubsidy(rule, 200000, 0, null, 25000)).toBe(0));
  it('caps subsidy by actual fee, configured cap and remaining margin after voucher', () => {
    expect(promotionSubsidy(rule, 200000, 30000, 110000, 25000)).toBe(10000);
    expect(promotionSubsidy(rule, 200000, 0, 100000, 25000)).toBe(25000);
    expect(
      promotionSubsidy({ ...rule, active: false }, 200000, 0, 0, 25000),
    ).toBe(0);
  });
  it('does not claim support for an unregistered carrier or live courier GPS', () => {
    const r = new ShippingProviderRegistry({} as GhnProvider);
    expect(() => r.get('ghtk')).toThrow('UNSUPPORTED');
    expect(r.capabilities()[0].capabilities.liveGps).toBe(false);
    expect(r.capabilities()[0].capabilities.productionFulfillment).toBe(false);
  });
});
