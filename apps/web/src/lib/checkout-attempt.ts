import type { CreateOrderDto } from '@/types/order';

const STORE = 'tp.checkout.attempts.v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
interface Attempt { hash: string; key: string; completed: boolean }
function storage(): Storage {
  if (typeof window === 'undefined') throw new Error('CHECKOUT_STORAGE_UNAVAILABLE');
  return window.sessionStorage;
}
function read(store: Storage): Attempt[] {
  const raw = store.getItem(STORE);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || !data.every(d => d && typeof d.hash === 'string' && /^[a-f0-9]{64}$/.test(d.hash) &&
    typeof d.key === 'string' && UUID.test(d.key) && typeof d.completed === 'boolean')) throw new Error('CHECKOUT_STORAGE_UNAVAILABLE');
  return data as Attempt[];
}
export function beginCheckoutAttempt(store?: Storage) {
  const target = store ?? storage();
  // A deliberate new checkout may replace known completed attempts. Uncertain
  // attempts survive a reload, errors and returning to the shipping form.
  target.setItem(STORE,JSON.stringify(read(target).filter(d=>!d.completed)));
}
export async function prepareCheckoutAttempt(data: CreateOrderDto, ownerId: string | null, store?: Storage, cryptoApi: Crypto = globalThis.crypto) {
  const target = store ?? storage();
  const items = data.items.map(item=>({productId:item.productId,quantity:item.quantity,variantId:item.variantId || ''}))
    .sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const intent = JSON.stringify({ownerId,items,shipping:data.shipping_info,method:data.paymentMethod,
    voucher:data.voucherCode?.trim().toUpperCase() || '',legal:data.legalAcceptance || null});
  const hash = Array.from(new Uint8Array(await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(intent))))
    .map(v=>v.toString(16).padStart(2,'0')).join('');
  const attempts = read(target), old = attempts.find(d=>d.hash===hash);
  if (old) return old.key;
  if (attempts.length >= 50) throw new Error('CHECKOUT_STORAGE_UNAVAILABLE');
  const key = data.idempotencyKey || cryptoApi.randomUUID();
  if (!UUID.test(key)) throw new Error('CHECKOUT_INVALID_REQUEST');
  attempts.push({hash,key,completed:false});
  target.setItem(STORE,JSON.stringify(attempts));
  // Storage failures must happen before the order POST, never after it.
  if (!read(target).some(d=>d.hash===hash && d.key===key)) throw new Error('CHECKOUT_STORAGE_UNAVAILABLE');
  return key;
}
export function completeCheckoutAttempt(key: string, store?: Storage) {
  try {
    const target=store ?? storage();
    target.setItem(STORE,JSON.stringify(read(target).map(d=>d.key===key?{...d,completed:true}:d)));
  } catch { /* Retaining an uncertain key is safe; do not hide a committed order. */ }
}
export function checkoutErrorMessage(code: string, en = false) {
  const messages: Record<string,[string,string]> = {
    CHECKOUT_OUT_OF_STOCK:['Một sản phẩm vừa hết hàng hoặc không còn đủ số lượng. Vui lòng kiểm tra lại giỏ hàng.','A product no longer has enough stock. Please review your cart.'],
    CHECKOUT_PRODUCT_UNAVAILABLE:['Một sản phẩm hiện không còn được bán. Vui lòng kiểm tra lại giỏ hàng.','A product is no longer available. Please review your cart.'],
    CHECKOUT_PRICE_CHANGED:['Giá hoặc ưu đãi vừa thay đổi. Vui lòng kiểm tra lại đơn và tính lại phí giao hàng.','Prices or discounts have changed. Review your order and recalculate delivery.'],
    CHECKOUT_VOUCHER_UNAVAILABLE:['Mã ưu đãi vừa hết hạn hoặc hết lượt dùng. Vui lòng kiểm tra lại mã.','This voucher has expired or reached its usage limit. Please review it.'],
    CHECKOUT_KEY_CONFLICT:['Thông tin của lần đặt hàng này đã thay đổi. Vui lòng kiểm tra đơn trước khi đặt tiếp.','This checkout attempt has different details. Check your previous order before continuing.'],
    CHECKOUT_DATABASE_NOT_READY:['Dịch vụ đặt hàng đang được cập nhật. Vui lòng thử lại sau.','Ordering is being updated. Please try again later.'],
    CHECKOUT_STORAGE_UNAVAILABLE:['Không lưu được phiên đặt hàng. Vui lòng cho phép lưu trữ của website rồi thử lại.','Your browser cannot save this checkout attempt. Allow site storage and try again.'],
    CHECKOUT_RESULT_UNKNOWN:['Chưa xác nhận được kết quả đặt hàng. Hãy bấm thử lại với cùng thông tin để kiểm tra đơn đã tạo.','Your order result is not confirmed. Retry with the same details to recover your order.'],
  };
  return messages[code]?.[en?1:0] || code;
}
