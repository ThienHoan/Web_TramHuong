'use client';
// QA lab only (copied into the disposable Next app by demo-contact-protection.cjs
// --turnstile-cloudflare-fixture). Installs a FAKE window.turnstile before the real
// contact page mounts, so the real component path runs without loading Cloudflare.
import ContactPage from '@/app/[locale]/contact/page';

type Options = Record<string, unknown> & { callback?: (token: string) => void; 'expired-callback'?: () => void };
type Counters = { renders: number; resets: number; removes: number; options: string[] };
declare global {
    interface Window { __fakeTurnstile?: Counters }
}

if (typeof window !== 'undefined' && !window.turnstile) {
    const counters: Counters = { renders: 0, resets: 0, removes: 0, options: [] };
    const widgets = new Map<string, { element: HTMLElement; options: Options }>();
    const draw = (id: string) => {
        const widget = widgets.get(id);
        if (!widget) return;
        widget.element.innerHTML = '';
        const pass = document.createElement('button');
        pass.type = 'button';
        pass.textContent = 'Fake Cloudflare: pass';
        pass.dataset.fakeTurnstile = 'pass';
        pass.className = 'rounded border px-3 py-2 text-sm';
        pass.onclick = () => widget.options.callback?.('XXXX.DUMMY.TOKEN.XXXX');
        const expire = document.createElement('button');
        expire.type = 'button';
        expire.textContent = 'Fake Cloudflare: expire';
        expire.dataset.fakeTurnstile = 'expire';
        expire.className = 'ml-2 rounded border px-3 py-2 text-sm';
        expire.onclick = () => widget.options['expired-callback']?.();
        widget.element.append(pass, expire);
    };
    window.__fakeTurnstile = counters;
    window.turnstile = {
        render(element, options) {
            const id = 'fake-' + ++counters.renders;
            counters.options.push(Object.keys(options).sort().join(','));
            widgets.set(id, { element, options: options as Options });
            draw(id);
            return id;
        },
        reset(id) { counters.resets++; if (id) draw(id); },
        remove(id) { counters.removes++; widgets.get(id)?.element.replaceChildren(); widgets.delete(id); },
    };
}

export default function TurnstileLab() {
    return <ContactPage />;
}
