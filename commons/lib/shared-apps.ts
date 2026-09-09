export type SharedApp = { id: string; name: string; description: string; icon: string; group: string; url: string; logo_url?: string | null; updated_at?: string };
export function validSharedUrl(value: string) {
  try { const u = new URL(value); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password; } catch { return false; }
}
export function sharedAppError(app: SharedApp) {
  if (!app.name.trim() || app.name.trim().length > 80) return 'Enter an app name of up to 80 characters.';
  if (!app.description.trim() || app.description.trim().length > 300) return 'Enter a description of up to 300 characters.';
  if (app.url.length > 2048 || !validSharedUrl(app.url)) return 'Enter a valid HTTPS app address without a username or password.';
  if (app.logo_url && (app.logo_url.length > 2048 || !validSharedUrl(app.logo_url))) return 'Enter a valid HTTPS logo address, or leave it blank.';
  return null;
}
export function mapSharedApp(row: { id: string; name: string; description: string; icon: string; category: string; url: string; logo_url?: string | null; updated_at?: string }): SharedApp {
  return { ...row, group: row.category };
}
