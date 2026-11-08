/** Public files share Vite's deployment prefix, including inside web workers. */
export function publicAsset(path: string, base = import.meta.env?.BASE_URL ?? '/'): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}
