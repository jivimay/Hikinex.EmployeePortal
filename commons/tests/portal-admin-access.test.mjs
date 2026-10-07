import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const sql = readFileSync(new URL('../../supabase/migrations/202610070001_portal_admin_manage_access.sql', import.meta.url), 'utf8');
const fn = sql.match(/create or replace function public\.can_manage_portal_access\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/i)?.[1] ?? '';

test('portal administrators can manage access', () => {
  assert.match(fn, /p\.role\s*=\s*'admin'/);
  assert.match(fn, /portal_access_managers/, 'explicit access managers keep access');
  assert.match(fn, /auth\.uid\(\)/);
  assert.match(fn, /email_confirmed_at is not null/);
});

test('employees and managers are not granted access management', () => {
  assert.doesNotMatch(fn, /'manager'|'employee'/);
  assert.match(sql, /grant execute on function public\.can_manage_portal_access\(\) to authenticated/);
  assert.doesNotMatch(sql, /to (anon|public)\b/i);
});
