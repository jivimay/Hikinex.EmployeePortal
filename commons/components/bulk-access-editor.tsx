"use client";
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { mergeBulkSettings, type AccessSettings, type BulkPatch } from '../lib/bulk-access';
type Person = { id: string; name: string; email: string; role: string; department: string | null; updated_at: string };
type Data = { users: Person[]; apps: { id: string; name: string }[]; departments: string[]; rules: { subject_type: string; subject_key: string; revision: number; settings: AccessSettings }[] };
const emptyPatch: BulkPatch = { role: 'unchanged', department: 'unchanged', publish: 'unchanged', editor: 'unchanged', apps: {} };
export function BulkAccessEditor({ data, onSaved, onBusy }: { data: Data; onSaved: () => Promise<void>; onBusy: (busy: boolean) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [patch, setPatch] = useState<BulkPatch>(emptyPatch);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const people = data.users.filter(user => `${user.name} ${user.email} ${user.department || ''}`.toLowerCase().includes(search.toLowerCase()));
  const targets = data.users.filter(user => selected.includes(user.id));
  const update = (next: BulkPatch) => { setPatch(next); setReview(false); setMessage(''); };
  const changes = [patch.role !== 'unchanged' && `Role: ${patch.role}`, patch.department !== 'unchanged' && `Department: ${patch.department || 'Unassigned'}`, patch.publish !== 'unchanged' && `Publishing: ${patch.publish}`, patch.editor !== 'unchanged' && `Edit company apps: ${patch.editor}`, ...data.apps.filter(app => patch.apps[app.id] && patch.apps[app.id] !== 'unchanged').map(app => `${app.name}: ${patch.apps[app.id]}`)].filter(Boolean);
  const save = async () => {
    if (!supabase || busy || !targets.length || !changes.length) return;
    setBusy(true); onBusy(true); setError('');
    const changesIn = targets.map(user => {
      const rule = data.rules.find(rule => rule.subject_type === 'user' && rule.subject_key === user.id);
      return { user_id: user.id, settings: mergeBulkSettings(rule?.settings || {}, patch), expected_revision: rule?.revision || 0, role: patch.role === 'unchanged' ? user.role : patch.role, department: patch.department === 'unchanged' ? user.department : patch.department, expected_profile_updated_at: user.updated_at };
    });
    const { error } = await supabase.rpc('save_portal_access_bulk', { changes_in: changesIn });
    setBusy(false); onBusy(false);
    if (error) { setError(error.code === '40001' ? 'Someone changed a selected employee. No changes were saved. Reload the access window and review again.' : 'No changes were saved. Check your access and try again.'); return; }
    await onSaved(); setReview(false); setPatch(emptyPatch); setMessage(`Updated ${targets.length} employees. Ask them to refresh their portal.`);
  };
  return <div className="bulk-access">
    <p>Select employees, choose the settings to change, then review. Everything marked “Leave unchanged” stays as it is.</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <fieldset disabled={busy}><div className="access-layout"><aside>
      <label>Find employees<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, email, or department" /></label>
      <div className="bulk-selection"><button onClick={() => { setSelected(current => [...new Set([...current, ...people.map(user => user.id)])]); setReview(false); }}>Select shown ({people.length})</button><button onClick={() => { setSelected([]); setReview(false); }}>Clear</button></div>
      <p>{targets.length} selected</p><div className="access-subjects">{people.map(user => <label className="bulk-person" key={user.id} aria-label={`Select ${user.name || user.email}`}><input type="checkbox" checked={selected.includes(user.id)} onChange={event => { setSelected(current => event.target.checked ? [...current, user.id] : current.filter(id => id !== user.id)); setReview(false); }} /><span><strong>{user.name || user.email}</strong><small>{user.email}</small><small>{user.role} · {user.department || 'Unassigned'}</small></span></label>)}</div>
    </aside><div><div className="access-profile">
      <label>Role<select value={patch.role} onChange={event => update({ ...patch, role: event.target.value })}><option value="unchanged">Leave unchanged</option>{['employee','manager','admin'].map(role => <option key={role}>{role}</option>)}</select></label>
      <label>Department<select value={patch.department} onChange={event => update({ ...patch, department: event.target.value })}><option value="unchanged">Leave unchanged</option><option value="">Unassigned</option>{data.departments.map(department => <option key={department}>{department}</option>)}</select></label>
      <label>Publishing<select value={patch.publish} onChange={event => update({ ...patch, publish: event.target.value })}><option value="unchanged">Leave unchanged</option><option value="inherit">Use role and department</option><option value="none">Cannot publish</option><option value="department">Own department only</option><option value="company">Company-wide</option></select></label>
      <label>Edit company apps<select value={patch.editor} onChange={event => update({ ...patch, editor: event.target.value })}><option value="unchanged">Leave unchanged</option><option value="inherit">Use existing editor permission</option><option value="allow">Allow</option><option value="deny">Deny</option></select></label>
    </div><h3>App access</h3><div className="access-apps">{data.apps.map(app => <label key={app.id}><span>{app.name}</span><select value={patch.apps[app.id] || 'unchanged'} onChange={event => update({ ...patch, apps: { ...patch.apps, [app.id]: event.target.value } })}><option value="unchanged">Leave unchanged</option><option value="inherit">Use role/department</option><option value="allow">Allow</option><option value="deny">Deny</option></select></label>)}</div>
    {review && <div className="access-review"><strong>Update {targets.length} employees?</strong><p>{targets.map(user => `${user.name || user.email} (${user.email})`).join('; ')}</p><ul>{changes.map(change => <li key={String(change)}>{change}</li>)}</ul><p>All other settings stay unchanged. If any employee’s settings have changed meanwhile, nothing is saved.</p></div>}
    <button className="primary" disabled={!targets.length || !changes.length} onClick={() => review ? void save() : setReview(true)}>{busy ? 'Saving…' : review ? `Save for ${targets.length} employees` : 'Review bulk changes'}</button>
    </div></div></fieldset>
  </div>;
}
