export type PersonalApp = { id: string; name: string; url: string; pinned?: boolean };

export function personalAppUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

// User metadata is preferences, never a source of roles or permissions.
export function readPersonalApps(value: unknown): PersonalApp[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, 40).flatMap((item) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.startsWith('personal-') || item.id.length > 80 || seen.has(item.id) || typeof item.name !== 'string') return [];
    const name = item.name.trim().slice(0, 40);
    const url = personalAppUrl(item.url);
    if (!name || !url) return [];
    seen.add(item.id);
    return [{ id: item.id, name, url, ...(item.pinned === true ? { pinned: true } : {}) }];
  });
}
