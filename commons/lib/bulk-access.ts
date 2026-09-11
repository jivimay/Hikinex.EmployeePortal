export type AccessSettings = { defaults?: string[]; optional?: string[]; allow?: string[]; deny?: string[]; publish?: string; edit_apps?: boolean | null };
export type BulkPatch = { role: string; department: string; publish: string; editor: string; apps: Record<string, string> };
export function mergeBulkSettings(current: AccessSettings, patch: BulkPatch): AccessSettings {
  const next = { ...current, allow: [...(current.allow || [])], deny: [...(current.deny || [])] };
  for (const [id, action] of Object.entries(patch.apps)) {
    if (!['allow', 'deny', 'inherit'].includes(action)) continue;
    next.allow = next.allow.filter(value => value !== id);
    next.deny = next.deny.filter(value => value !== id);
    if (action === 'allow') next.allow.push(id);
    if (action === 'deny') next.deny.push(id);
  }
  if (patch.publish !== 'unchanged') next.publish = patch.publish;
  if (patch.editor !== 'unchanged') next.edit_apps = patch.editor === 'inherit' ? null : patch.editor === 'allow';
  return next;
}
