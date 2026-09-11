"use client";
import { useEffect, useState } from 'react';
import { PortalDialog } from './portal-dialog';
import { supabase } from '../lib/supabase';
import { mapSharedApp, sharedAppError, type SharedApp } from '../lib/shared-apps';

export function SharedAppEditor({ initialApp = null, onClose, onSaved }: { initialApp?: SharedApp | null; onClose: () => void; onSaved: (app: SharedApp) => void }) {
  const [items, setItems] = useState<SharedApp[]>([]);
  const [draft, setDraft] = useState<SharedApp | null>(initialApp);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    supabase?.rpc('list_editable_portal_apps').then(({ data, error }) => {
      if (!current) return;
      if (error) setError('We could not load the shared apps. Refresh and try again.');
      else setItems((data ?? []).map(mapSharedApp));
      setLoading(false);
    });
    return () => { current = false; };
  }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || !supabase || busy) return;
    const validation = sharedAppError(draft);
    if (validation) { setError(validation); return; }
    setBusy(true); setError(''); setMessage('');
    const { data, error } = await supabase.rpc('edit_portal_app', {
      app_id: draft.id, app_name: draft.name.trim(), app_description: draft.description.trim(),
      app_url: draft.url, app_logo_url: draft.logo_url || null, expected_updated_at: draft.updated_at,
    });
    setBusy(false);
    if (error || !data?.length) { setError('Unable to save. Your access may have changed, or someone else edited this app. Refresh before trying again.'); return; }
    const saved = mapSharedApp(data[0]);
    setItems(current => current.map(app => app.id === saved.id ? saved : app));
    onSaved(saved); setDraft(null); setMessage(`${saved.name} was updated for everyone.`);
  };
  return <PortalDialog title="Edit company apps" onClose={onClose} busy={busy}><section className="shared-app-editor"><div className="shared-editor-heading"><h2>Edit company apps</h2><button type="button" onClick={onClose} disabled={busy} aria-label="Close app editor">×</button></div><p>Changes apply to everyone who has access to the app.</p>
    {loading && <p role="status">Loading apps…</p>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {!draft && <div className="shared-app-list">{items.map(app => <button key={app.id} onClick={() => { setDraft({ ...app }); setError(''); setMessage(''); }}><strong>{app.name}</strong><span>Edit details</span></button>)}</div>}
    {draft && <form onSubmit={save}><h3>{draft.name}</h3><label>App name<input required maxLength={80} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label>Description<textarea required maxLength={300} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label><label>App address<input required type="url" maxLength={2048} value={draft.url} onChange={e => setDraft({ ...draft, url: e.target.value })} /></label><label>Logo image address<input type="url" maxLength={2048} placeholder="https://…" value={draft.logo_url || ''} onChange={e => setDraft({ ...draft, logo_url: e.target.value })} /></label><small>Use a publicly accessible HTTPS image. Leave blank to use the default icon.</small><div><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save for everyone'}</button><button type="button" disabled={busy} onClick={() => { setDraft(null); setError(''); }}>Cancel</button></div></form>}
  </section></PortalDialog>;
}
