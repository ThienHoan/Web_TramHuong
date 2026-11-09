export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://tramhuongthienphuchue.com').replace(/\/+$/,'');
export function absoluteUrl(path: string) { return new URL(path, `${SITE_URL}/`).href; }
export function plainDescription(value: string | undefined, fallback = '') { return (value || fallback).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,160); }
