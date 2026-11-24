import { SHOP_CONTACT } from './legal';
function channelUrl(value: string | undefined, hosts: string[]) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hosts.includes(url.hostname) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
// Only show channels supplied by the shop; never infer a Zalo account from a phone.
export const CONTACT_CHANNELS = [
  { label: 'Zalo', href: channelUrl(process.env.NEXT_PUBLIC_ZALO_URL || SHOP_CONTACT.zaloUrl, ['zalo.me', 'oa.zalo.me']) },
  { label: 'Facebook', href: channelUrl(SHOP_CONTACT.facebookUrl, ['www.facebook.com', 'facebook.com']) },
  { label: 'Messenger', href: channelUrl(process.env.NEXT_PUBLIC_MESSENGER_URL, ['m.me', 'www.messenger.com', 'messenger.com']) },
].filter((channel): channel is { label: string; href: string } => !!channel.href);
