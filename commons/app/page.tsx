"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { accountName } from "../lib/account-name";
import { canUseShortcut } from "../lib/access";
import { AccessManagement } from "../components/access-management";
import { PermissionContext, emptyPermissions, usePortalPermissions, type PortalPermissions } from "../lib/portal-permissions";
import { personalAppUrl, readPersonalApps, type PersonalApp } from "../lib/personal-apps";
import { PortalDialog } from "../components/portal-dialog";
import { SharedAppEditor } from "../components/shared-app-editor";
import { mapSharedApp, type SharedApp } from "../lib/shared-apps";
import { companyLogo, applicationLogos, logoPath } from "../lib/branding";

type Role = "Employee" | "Manager" | "Admin";
type View = "Home" | "Apps" | "Announcements" | "Feed" | "Groups" | "People" | "Jobs" | "Team" | "Requests" | "Admin";
type Application = SharedApp;
type CompanyUpdate = { id: string; title: string; summary: string; body: string; audience: "company" | "department"; department: string | null; pinned: boolean; published_at: string; created_by: string };
type CompanyUpdateDraft = Pick<CompanyUpdate, "title" | "summary" | "body" | "audience" | "department">;

const viewRoutes: Partial<Record<View, string>> = { Apps: "apps", Announcements: "updates" };

function viewFromLocation(): View {
  if (typeof window === "undefined") return "Home";
  const route = new URL(window.location.href).searchParams.get("view");
  if (route === "apps") return "Apps";
  if (route === "updates") return "Announcements";
  return "Home";
}

function updateDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value)).toUpperCase();
}

const fallbackApps: Application[] = [
  { id: "mission-control", name: "Mission Control", description: "Work overview", icon: "M", group: "H!KINEX", url: "https://mission-control-hikinex.vercel.app" },
  { id: "timekeeper", name: "TimeKeeper", description: "Time tracking", icon: "T", group: "H!KINEX", url: "https://hikinex-timekeeper-web2.vercel.app" },
  { id: "lms", name: "LMS", description: "Learning center", icon: "L", group: "H!KINEX", url: "https://dfd-lms-ten.vercel.app/auth/sign-in?redirectTo=%2Fdashboard" },
  { id: "vaultwarden", name: "Vaultwarden", description: "Password manager", icon: "V", group: "IT", url: "https://vault.hikinex.com/#/login" },
  { id: "hiki-it-portal", name: "HIKI IT Portal", description: "Support requests", icon: "IT", group: "IT", url: "https://hikinex-it-app-production.up.railway.app" },
  { id: "hubspot", name: "HubSpot", description: "Sales and marketing", icon: "H", group: "Sales", url: "https://app.hubspot.com/login" },
  { id: "reet", name: "REET", description: "Agent performance dashboards", icon: "R", group: "H!KINEX", url: "https://reet-hikinex.vercel.app" },
  { id: "talentdirector", name: "TalentDirector", description: "Recruiting operations hub", icon: "TD", group: "Recruiting", url: "https://talentdirector.dogfooddevsecure.com" },
  { id: "invsync", name: "InvSync", description: "Invoice pipeline and billing", icon: "IS", group: "H!KINEX", url: "https://invsync-rho.vercel.app" },
  { id: "softwaretracker", name: "SoftwareTracker", description: "Software inventory and renewals", icon: "ST", group: "IT", url: "https://softwaretracker.vercel.app" },
  { id: "canva", name: "Canva", description: "Design workspace", icon: "C", group: "Marketing", url: "https://www.canva.com/login" },
  { id: "semrush", name: "Semrush", description: "SEO intelligence", icon: "S", group: "Marketing", url: "https://www.semrush.com/login/" },
  { id: "reqev-ats", name: "RegEv · ATS", description: "Applicant tracking and hiring", icon: "RA", group: "Recruiting", url: "https://app.reqev.com" },
  { id: "dfd-timekeeper", name: "DFD TimeKeeper", description: "DogFoodDev time tracking", icon: "DT", group: "DogFoodDev", url: "https://dfd-timekeeper.vercel.app" },
];

const essentialDashboardApps = ["mission-control", "timekeeper", "lms"];
const dashboardDefaultsVersion = 2;

const people = [
  ["Ava Mitchell", "Marketing Specialist", "AM", "Marketing"], ["Daniel Kim", "E-Discovery Manager", "DK", "E-Discovery"],
  ["Maya Patel", "Talent Partner", "MP", "Recruiting"], ["Noah Williams", "Sales Associate", "NW", "Sales"],
];

const roleCopy: Record<Role, { title: string; team: string }> = {
  Employee: { title: "Employee", team: "H!KINEX" },
  Manager: { title: "Manager", team: "H!KINEX" },
  Admin: { title: "Portal Administrator", team: "All departments" },
};

const dailyQuotes = [
  { text: "Love is a productive orientation.", author: "Erich Fromm" },
  { text: "Optimism is a duty.", author: "Karl Popper" },
  { text: "In the midst of winter, I found there was, within me, an invincible summer.", author: "Albert Camus" },
  { text: "Nothing great was ever achieved without enthusiasm.", author: "Ralph Waldo Emerson" },
  { text: "Optimism is the faith that leads to achievement.", author: "Helen Keller" },
  { text: "No great thing is created suddenly.", author: "Epíktētos" },
  { text: "The universe is change; our life is what our thoughts make it.", author: "Marcus Aurelius Antoninus" },
  { text: "We suffer more often in imagination than in reality.", author: "Lucius Annaeus Seneca" },
  { text: "The beginning is the most important part of the work.", author: "Plátōn" },
  { text: "Hope is a waking dream.", author: "Aristotélēs" },
  { text: "The good life is one inspired by love and guided by knowledge.", author: "Bertrand Russell" },
  { text: "The beginning is always today.", author: "Mary Wollstonecraft" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "We are all in the gutter, but some of us are looking at the stars.", author: "Oscar Wilde" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "Have courage to use your own reason.", author: "Immanuel Kant" },
  { text: "The future enters into us, in order to transform itself in us, long before it happens.", author: "Rainer Maria Rilke" },
  { text: "Life can only be understood backwards; but it must be lived forwards.", author: "Søren Kierkegaard" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plútarchos" },
  { text: "Where there is love there is life.", author: "Mohandas Karamchand Gandhi" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Forever is composed of nows.", author: "Emily Dickinson" },
  { text: "The most effective way to do it, is to do it.", author: "Amelia Earhart" },
  { text: "One must imagine Sisyphus happy.", author: "Albert Camus" },
] as const;

function dailyQuoteIndex(date = new Date()) {
  const localCalendarDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(localCalendarDay / 86_400_000) % dailyQuotes.length;
}

function DailyQuote() {
  const [quoteIndex, setQuoteIndex] = useState(() => dailyQuoteIndex());
  useEffect(() => {
    let timer = 0;
    const scheduleNextQuote = () => {
      const now = new Date();
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = window.setTimeout(() => {
        setQuoteIndex(dailyQuoteIndex());
        scheduleNextQuote();
      }, nextDay.getTime() - now.getTime() + 1_000);
    };
    scheduleNextQuote();
    return () => window.clearTimeout(timer);
  }, []);
  const quote = dailyQuotes[quoteIndex];
  return <blockquote className="daily-quote"><p>“{quote.text}”</p><cite>— {quote.author}</cite></blockquote>;
}

const microsoftApps = [
  { name: "Outlook", href: "https://outlook.office.com/mail/", mark: "O", className: "outlook-mark" },
  { name: "Teams", href: "https://teams.cloud.microsoft/", mark: "T", className: "teams-mark" },
  { name: "OneDrive", href: "https://www.microsoft365.com/launch/onedrive", mark: "☁", className: "onedrive-mark" },
  { name: "Word", href: "https://www.microsoft365.com/launch/word", mark: "W", className: "word-mark" },
  { name: "Excel", href: "https://www.microsoft365.com/launch/excel", mark: "X", className: "excel-mark" },
  { name: "PowerPoint", href: "https://www.microsoft365.com/launch/powerpoint", mark: "P", className: "powerpoint-mark" },
];

function MicrosoftAppsMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeWithEscape); };
  }, []);
  return <div className="microsoft-menu" ref={menuRef}><button className="microsoft-menu-trigger" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="microsoft-app-menu"><span className="microsoft-grid-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>Microsoft 365</span><span className="menu-chevron" aria-hidden="true">⌄</span></button>{open && <div className="microsoft-shortcuts welcome-microsoft" id="microsoft-app-menu" role="menu" aria-label="Microsoft apps">{microsoftApps.map((app) => <a key={app.name} href={app.href} target="_blank" rel="noopener noreferrer" role="menuitem" aria-label={`Open ${app.name}`} onClick={() => setOpen(false)}><span className={`microsoft-app-mark ${app.className}`} aria-hidden="true">{app.mark}</span><span>{app.name}</span></a>)}</div>}</div>;
}

function Brand() { return <div className="brand">{companyLogo ? <img src={logoPath(companyLogo)} alt="H!KINEX" /> : <><span>H!</span>KINEX</>}<small>YOUR DAILY LAUNCHPAD</small></div>; }

function AppLogo({ app }: { app: Application }) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const logo = app.logo_url || applicationLogos[app.id];
  return <span className={`app-icon icon-${app.id}`}>{logo && failedLogo !== logo ? <img src={app.logo_url || logoPath(logo)} alt="" onError={() => setFailedLogo(logo)} /> : app.icon}</span>;
}

function PersonalApps({ items, onSave, search }: { items: PersonalApp[]; onSave: (items: PersonalApp[]) => Promise<boolean>; search: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const validUrl = personalAppUrl(url);
    if (!name.trim() || !validUrl) { setError("Enter an app name and an http:// or https:// address without embedded credentials."); return; }
    if (items.length >= 40) { setError("You can save up to 40 personal apps. Remove one to add another."); return; }
    setBusy(true); setError("");
    const saved = await onSave([...items, { id: `personal-${crypto.randomUUID()}`, name: name.trim(), url: validUrl }]);
    setBusy(false);
    if (saved) { setOpen(false); setName(""); setUrl(""); }
    else setError("Your app could not be saved. Please try again.");
  };
  return <section className="personal-section"><div className="section-head"><div><h2>Made yours</h2><small>Your personal apps, in your own space.</small></div><small>Only you</small></div><div className="personal-grid">{items.filter(item => !item.pinned).filter((item) => `${item.name} ${item.url}`.toLowerCase().includes(search.toLowerCase())).map((item) => <article className="personal-tile" key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer"><span className="app-icon">{item.name.charAt(0).toUpperCase()}</span><span><strong>{item.name}</strong><small>{new URL(item.url).hostname}</small></span></a><button className="personal-pin" type="button" aria-pressed={Boolean(item.pinned)} aria-label={`${item.pinned ? "Unpin" : "Pin"} ${item.name} on the dashboard`} disabled={busy} onClick={async () => { setBusy(true); await onSave(items.map(app => app.id === item.id ? { ...app, pinned: !app.pinned } : app)); setBusy(false); }}><PinIcon /></button><button type="button" aria-label={`Remove ${item.name}`} disabled={busy} onClick={async () => { setBusy(true); await onSave(items.filter((app) => app.id !== item.id)); setBusy(false); }}>×</button></article>)}<button className="personal-add" onClick={() => { setOpen(true); setError(""); }}>＋ Add your own app</button></div>{open && <form className="personal-form" onSubmit={save}><h3>Add your own app</h3><p>A personal shortcut. Access is managed by the destination app.</p><div><label>App name<input ref={input} value={name} onChange={(event) => setName(event.target.value)} required maxLength={40} /></label><label>Website address<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" required maxLength={2048} /></label></div>{error && <p role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? "Saving…" : "Add to my apps"}</button><button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></form>}</section>;
}

function PencilIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5M4 15l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>; }

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path className="pin-body" d="M8 3h8v8l2 3v3H6v-3l2-3V3Z" /><path className="pin-stem" d="M12 17v5" /></svg>;
}

function AppTile({ onEdit, app, assigned, protectedApp, directory = false, canEdit, pinned = false, onAdd, onAddAndPin, onRemove, onTogglePin }: { onEdit?: (app: Application) => void; app: Application; assigned: boolean; protectedApp: boolean; directory?: boolean; canEdit: boolean; pinned?: boolean; onAdd: (app: Application) => void; onAddAndPin?: (app: Application) => void; onRemove: (app: Application) => void; onTogglePin?: (app: Application) => void }) {
  return <article className={`app-tile ${assigned ? "assigned" : ""} ${pinned ? "pinned-app" : ""}`}>
    {assigned ? <a draggable={false} className="app-card-link" href={app.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${app.name} in a new tab`}><AppLogo app={app} /><span className="app-copy"><strong>{app.name}</strong><small>{app.description}</small></span></a> : <div className="app-card-content"><AppLogo app={app} /><span className="app-copy"><strong>{app.name}</strong><small>{app.description}</small></span></div>}
    {onEdit && <button className="edit-app" onClick={() => onEdit(app)} aria-label={`Edit ${app.name}`} title={`Edit ${app.name}`}><PencilIcon /></button>}
    <div className="app-actions">
      {assigned && onTogglePin && <button className="pin-app" onClick={() => onTogglePin(app)} disabled={!canEdit} aria-pressed={pinned} aria-label={`${pinned ? "Unpin" : "Pin"} ${app.name} on the dashboard`} title={pinned ? "Unpin from dashboard" : "Pin to dashboard"}><PinIcon /></button>}
      {directory && !assigned && onAddAndPin && <button className="pin-app" onClick={() => onAddAndPin(app)} disabled={!canEdit} aria-pressed="false" aria-label={`Add and pin ${app.name} on the dashboard`} title="Add and pin to dashboard"><PinIcon /></button>}
      {directory && !assigned && <button onClick={() => onAdd(app)} disabled={!canEdit}>{canEdit ? "Add app" : "Sign in to add"}</button>}
      {directory && assigned && !protectedApp && <button className="remove-app" onClick={() => onRemove(app)} disabled={!canEdit}>{canEdit ? "Remove" : "Added"}</button>}
      {directory && protectedApp && <b>Role default</b>}
    </div>
  </article>;
}

function CompanyUpdatesPreview({ updates, navigate }: { updates: CompanyUpdate[]; navigate: (view: View) => void }) {
  return <section className="company-preview" aria-label="Company updates"><div className="section-head"><div><h2>Around H!KINEX</h2><small>Company updates, right here.</small></div><button onClick={() => navigate("Announcements")}>All updates</button></div>{updates.length ? <div className="update-preview-grid">{updates.slice(0, 2).map((update) => <article key={update.id}><div className="update-meta"><span>{update.pinned ? "Pinned update" : update.audience === "company" ? "Company news" : update.department}</span><time dateTime={update.published_at}>{updateDate(update.published_at)}</time></div><h3>{update.title}</h3><p>{update.summary}</p><details><summary>Read the full update</summary><div className="update-body">{update.body.split("\n").map((paragraph, index) => paragraph.trim() && <p key={index}>{paragraph}</p>)}</div></details></article>)}</div> : <div className="updates-empty"><strong>You’re all caught up.</strong><p>Published company updates will appear here.</p></div>}</section>;
}

function HomeView({ order, onOrder, apps, role, department, displayName, assignedIds, pinnedIds, canEdit, updates, navigate, onAdd, onRemove, onTogglePin, personalApps, onSavePersonalApps }: { order: string[]; onOrder: (ids: string[]) => Promise<void>; apps: Application[]; role: Role; department: string; displayName: string; assignedIds: Set<string>; pinnedIds: Set<string>; canEdit: boolean; updates: CompanyUpdate[]; navigate: (view: View) => void; onAdd: (app: Application) => void; onRemove: (app: Application) => void; onTogglePin: (app: Application) => void; personalApps: PersonalApp[]; onSavePersonalApps: (items: PersonalApp[]) => Promise<boolean> }) {
  const permissions = usePortalPermissions();
  const [search, setSearch] = useState("");
  const visibleApps = apps.filter((app) => assignedIds.has(app.id) && pinnedIds.has(app.id) && permissions.catalog.includes(app.id) && `${app.name} ${app.description}`.toLowerCase().includes(search.toLowerCase()));
  const [dragged, setDragged] = useState<string | null>(null);
  const pinnedPersonal = personalApps.filter(item => item.pinned && canUseShortcut(item.url, role, department, permissions.catalog) && `${item.name} ${item.url}`.toLowerCase().includes(search.toLowerCase()));
  const entries = [...visibleApps.map(app => ({ id: app.id, app, personal: false })), ...pinnedPersonal.map(app => ({ id: app.id, app: { ...app, description: "Personal app", icon: app.name.charAt(0).toUpperCase(), group: "Personal" }, personal: true }))].sort((a,b) => {
    const x=order.indexOf(a.id), y=order.indexOf(b.id); return (x<0 ? 9999 : x)-(y<0 ? 9999 : y);
  });
  const move = (from: string, to: string) => {
    const ids = entries.map(entry => entry.id); const source=ids.indexOf(from), target=ids.indexOf(to);
    if(source<0 || target<0 || source===target) return;
    ids.splice(source,1); ids.splice(target,0,from); void onOrder(ids);
  };
  return <>
    <section className="launch-hero"><p className="kicker">{displayName ? `WELCOME, ${displayName.toUpperCase()}` : "YOUR DAY, CONNECTED"}</p><h1>A good day starts here.</h1><p>Your team. Your tools. Your next great thing.</p><label className="launch-search"><span aria-hidden="true">⌕</span><input aria-label="Search your apps" placeholder="Find the app you need…" value={search} onChange={(event) => setSearch(event.target.value)} /></label></section>
    <div className="launch-quote"><span>A thought for today</span><DailyQuote /></div>
    <section className="work-section"><div className="section-head"><div><h2>Your work essentials</h2><small>My pinned apps · Drag to rearrange.</small></div><div className="essentials-tools"><button onClick={() => navigate("Apps")}>App directory</button></div></div><div className="apps-grid">{entries.map(({id, app, personal}, index) => <div className="pinned-slot" key={id} draggable tabIndex={0} aria-label={`${app.name}. Drag to reorder, or press Alt and an arrow key.`} onKeyDown={event => { if (!event.altKey) return; const next = event.key === "ArrowLeft" ? index-1 : event.key === "ArrowRight" ? index+1 : -1; if(next>=0 && next<entries.length) { event.preventDefault(); move(id,entries[next].id); } }} onDragStart={event => { event.dataTransfer.setData("text/plain",id); event.dataTransfer.effectAllowed="move"; setDragged(id); }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect="move"; }} onDrop={event => { event.preventDefault(); if(dragged) move(dragged,id); setDragged(null); }} onDragEnd={() => setDragged(null)}>
      <AppTile app={app} assigned protectedApp pinned canEdit={canEdit} onAdd={onAdd} onRemove={onRemove} onTogglePin={personal ? () => { void onSavePersonalApps(personalApps.map(item => item.id===id ? {...item,pinned:false} : item)); } : onTogglePin} />
    </div>)}{!visibleApps.length && !personalApps.some(item => item.pinned && canUseShortcut(item.url, role, department, permissions.catalog)) && <p className="app-empty">{search ? "No matching work apps." : "Pin an app from the directory to get started."}</p>}<button className="request-card" onClick={() => navigate("Apps")}><span>＋</span><strong>Add or pin an App</strong><small>Browse your directory</small></button></div></section>
    <PersonalApps items={personalApps.filter((item) => canUseShortcut(item.url, role, department, permissions.catalog))} onSave={onSavePersonalApps} search={search} />
    <CompanyUpdatesPreview updates={updates} navigate={navigate} />
    <footer className="launch-footer"><span>H!KINEX Commons</span><span>A place for your work. Space to make it yours.</span></footer>
  </>;
}

function AppsView({ onEdit, apps, role, assignedIds, pinnedIds, canEdit, navigate, onAdd, onAddAndPin, onRemove, onTogglePin }: { onEdit?: (app: Application) => void; apps: Application[]; role: Role; department: string; assignedIds: Set<string>; pinnedIds: Set<string>; canEdit: boolean; navigate: (view: View) => void; onAdd: (app: Application) => void; onAddAndPin: (app: Application) => void; onRemove: (app: Application) => void; onTogglePin: (app: Application) => void }) {
  const permissions = usePortalPermissions();
  const [search, setSearch] = useState(""); const [selected, setSelected] = useState("All");
  const catalog = apps.filter((app) => permissions.catalog.includes(app.id));
  const groups = ["All", ...Array.from(new Set(catalog.map((app) => app.group)))];
  const results = catalog.filter((app) => (selected === "All" || app.group === selected) && `${app.name} ${app.description} ${app.group}`.toLowerCase().includes(search.toLowerCase()));
  const pinnedApps = catalog.filter((app) => assignedIds.has(app.id) && pinnedIds.has(app.id));
  const groupCount = (group: string) => group === "All" ? catalog.length : catalog.filter((app) => app.group === group).length;
  return <section><PageHead eyebrow="WORK" title="Add an App" copy={canEdit ? `Search the applications approved for the ${role} role. Use the pin to add an app directly to Quick Access.` : "Explore the approved directory in Review mode. Sign in to save applications to Quick Access."} />
    <section className="directory-quick-access" aria-label="Quick Access"><div><p className="kicker">QUICK ACCESS</p><h2>Your dashboard apps</h2><small>Pinned apps stay available on your dashboard on every signed-in device.</small></div><div className="quick-access-items">{pinnedApps.map((app) => <span key={app.id}><a href={app.url} target="_blank" rel="noopener noreferrer">{app.icon} · {app.name}</a><button onClick={() => onTogglePin(app)} disabled={!canEdit} aria-label={`Remove ${app.name} from Quick Access`}>×</button></span>)}{pinnedApps.length === 0 && <small>No apps pinned yet. Select a pin below to add one.</small>}</div><button className="back-dashboard" onClick={() => navigate("Home")}>View dashboard</button></section>
    <div className="directory-tools"><label aria-label="Search apps by name or category">⌕ <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search apps by name or category" /></label><div>{groups.map((group) => <button className={selected === group ? "active" : ""} onClick={() => setSelected(group)} key={group} aria-pressed={selected === group}>{group}<span>{groupCount(group)}</span></button>)}</div></div><div className="directory-grid">{results.map((app) => <AppTile onEdit={onEdit} key={app.id} app={app} assigned={assignedIds.has(app.id)} protectedApp={permissions.defaults.includes(app.id)} directory pinned={pinnedIds.has(app.id)} canEdit={canEdit} onAdd={onAdd} onAddAndPin={onAddAndPin} onRemove={onRemove} onTogglePin={onTogglePin} />)}</div>{results.length === 0 && <div className="empty-state"><strong>No applications found</strong><span>Try another name or category.</span></div>}</section>;
}

function AnnouncementsView({ department, items, onCreate, notify }: { role: Role; department: string; items: CompanyUpdate[]; onCreate: (draft: CompanyUpdateDraft) => Promise<boolean>; notify: (message: string) => void }) {
  const permissions = usePortalPermissions();
  const [composer, setComposer] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(items[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<CompanyUpdateDraft>({ title: "", summary: "", body: "", audience: (permissions.publish === "company") ? "company" : "department", department: (permissions.publish === "company") ? null : department });
  const publish = async () => {
    if (!draft.title.trim() || !draft.summary.trim() || !draft.body.trim()) { notify("Add a title, summary, and complete update before publishing."); return; }
    setSaving(true);
    const saved = await onCreate({ ...draft, title: draft.title.trim(), summary: draft.summary.trim(), body: draft.body.trim(), department: draft.audience === "department" ? (draft.department || department) : null });
    setSaving(false);
    if (!saved) return;
    setDraft({ title: "", summary: "", body: "", audience: (permissions.publish === "company") ? "company" : "department", department: (permissions.publish === "company") ? null : department });
    setComposer(false);
  };
  return <section><PageHead eyebrow="COMPANY" title="Company Updates" copy="Published company and department updates, available to the right people automatically." />{(permissions.publish !== "none") && <button className="primary page-action" onClick={() => setComposer((open) => !open)}>{composer ? "Close composer" : "＋ Create update"}</button>}{composer && <PortalDialog title="Create company update" onClose={() => setComposer(false)} busy={saving}><section className="update-composer" aria-label="Create company update"><div className="shared-editor-heading"><h2>Create company update</h2><button disabled={saving} onClick={() => setComposer(false)} aria-label="Close company update">×</button></div><div><label>Title<input value={draft.title} maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Clear update title" /></label><label>Short summary<input value={draft.summary} maxLength={220} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="One-sentence dashboard summary" /></label></div><label>Complete update<textarea value={draft.body} maxLength={4000} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Share the details employees need to know." /></label><div className="composer-footer"><label>Audience<select value={draft.audience} onChange={(event) => setDraft((current) => ({ ...current, audience: event.target.value as CompanyUpdateDraft["audience"], department: event.target.value === "company" ? null : department }))} disabled={!(permissions.publish === "company")}><option value="department">{department || "My department"}</option>{(permissions.publish === "company") && <option value="company">Company-wide</option>}</select></label><button className="primary" onClick={publish} disabled={saving}>{saving ? "Publishing…" : "Publish update"}</button></div></section></PortalDialog>}<div className="news-list">{items.map((item) => <article key={item.id} className={item.pinned ? "pinned" : ""}><span>{updateDate(item.published_at)}</span><div><p className="kicker">{item.pinned ? "PINNED · " : ""}{item.audience === "company" ? "COMPANY-WIDE" : item.department || "DEPARTMENT"}</p><h2>{item.title}</h2><p>{item.summary}</p>{expanded === item.id && <div className="update-body">{item.body.split("\n").map((paragraph, index) => paragraph.trim() && <p key={index}>{paragraph}</p>)}</div>}<button onClick={() => setExpanded((current) => current === item.id ? null : item.id)}>{expanded === item.id ? "Close update" : "Read full update"}</button></div></article>)}</div>{items.length === 0 && <div className="empty-state"><strong>No updates have been published</strong><span>New company or department updates will appear here automatically.</span></div>}</section>;
}

function FeedView({ notify }: { notify: (message: string) => void }) {
  return <section><PageHead eyebrow="COMMUNITY" title="Company Feed" copy="Department posts, clubs, challenges and recognition in one reusable feed." /><div className="composer"><span>MY</span><button onClick={() => notify("Post composer opened. No post will be published.")}>Share an update, question or win...</button></div><div className="feed-layout"><div className="feed-stack">{[["Ava Mitchell", "Marketing", "Our launch checklist is ready for review.", "👏 12"], ["Daniel Kim", "Fitness Club", "Weekly challenge: share your best productivity tip.", "🎉 19"], ["Maya Patel", "Recruiting", "Kudos to Noah for supporting the hiring event!", "💚 28"]].map((post) => <article className="post" key={post[2]}><div className="feed-person"><span>{post[0].split(" ").map((n) => n[0]).join("")}</span><p><strong>{post[0]}</strong><small>{post[1]} · Today</small></p></div><p>{post[2]}</p><div className="reactions"><button onClick={() => notify("Reaction added for this preview only.")}>{post[3]}</button><button onClick={() => notify("Comments are illustrative only.")}>Comment</button><button onClick={() => notify("Share is disabled in this prototype.")}>Share</button></div></article>)}</div><aside className="challenge"><p className="kicker">WEEKLY CHALLENGE</p><h2>Share your favorite productivity tip</h2><p>Join 31 colleagues. Challenge closes Friday.</p><div><span style={{ width: "68%" }} /></div><button onClick={() => notify("Challenge participation is illustrative only.")}>Join challenge →</button></aside></div></section>;
}

function GroupsView({ role, notify }: { role: Role; notify: (message: string) => void }) {
  const groups = [["Marketing", "Team group", "28 members"], ["H!KINEX", "Company-wide", "62 members"], ["Gaming Club", "Interest club", "19 members"], ["Fitness", "Interest club", "31 members"], ["Creative Club", "Interest club", "24 members"], ["Book Club", "Interest club", "17 members"]];
  return <section><PageHead eyebrow="COMMUNITY" title="Groups & Clubs" copy="Department spaces are assigned by access. Interest clubs are optional and join-based." />{role === "Admin" && <button className="primary page-action" onClick={() => notify("Create Group is an Admin-only prototype action.")}>＋ Create group or club</button>}<div className="group-grid">{groups.map((group, i) => <article key={group[0]}><div className={`group-art art-${i}`}>{group[0].slice(0, 1)}</div><p className="kicker">{group[1]}</p><h2>{group[0]}</h2><span>{group[2]}</span><button onClick={() => notify(`${group[0]} opened in preview mode.`)}>{i < 2 ? "Open group" : "Join club"} →</button></article>)}</div></section>;
}

function PeopleView({ notify }: { notify: (message: string) => void }) {
  return <section><PageHead eyebrow="PEOPLE & CULTURE" title="People of H!KINEX" copy="Profiles connect roles, departments, achievements, clubs and peer recognition." /><div className="people-grid">{people.map((person, i) => <article key={person[0]}><span className={`person-avatar person-${i}`}>{person[2]}</span><h2>{person[0]}</h2><p>{person[1]}</p><small>{person[3]}</small><div><b>{i + 2} badges</b><b>{8 + i * 3} kudos</b></div><button onClick={() => notify(`Kudos to ${person[0]} is illustrative only.`)}>Send kudos →</button></article>)}</div></section>;
}

function JobsView({ role, notify }: { role: Role; notify: (message: string) => void }) {
  return <section><PageHead eyebrow="COMPANY" title="Jobs & Referrals" copy="Current openings plus transparent referral tracking, so submissions never disappear into a black box." />{role === "Admin" && <button className="primary page-action" onClick={() => notify("New opening is an Admin-only prototype action.")}>＋ Post opening</button>}<div className="jobs-layout"><div className="job-list">{[["Senior Account Executive", "Sales · Remote"], ["Talent Sourcer", "Recruiting · Hybrid"], ["Product Support Specialist", "IT · Remote"]].map((job) => <article key={job[0]}><div><p className="kicker">OPEN ROLE</p><h2>{job[0]}</h2><span>{job[1]}</span></div><button onClick={() => notify("Referral form opened in safe preview mode.")}>Refer someone →</button></article>)}</div><aside className="referral"><p className="kicker">MY REFERRALS</p><h2>Referral status</h2><div><span className="done">✓</span><p><strong>Submitted</strong><small>August 12</small></p></div><div><span className="current">2</span><p><strong>In review</strong><small>Talent team reviewing</small></p></div><div><span>3</span><p><strong>Interviewing</strong><small>Next step</small></p></div></aside></div></section>;
}

function ManagementView({ role, view, notify }: { role: Role; view: View; notify: (message: string) => void }) {
  const admin = role === "Admin";
  const title = view === "Team" ? "My Team" : view === "Requests" ? "Access Requests" : "Admin Control Center";
  return <section><PageHead eyebrow={admin ? "ADMIN" : "MANAGER"} title={title} copy={admin ? "Company-wide control of employees, applications, departments and community moderation." : "Manage only your own team, their assigned departments and incoming app requests."} /><div className="management-stats"><article><strong>{admin ? 62 : 8}</strong><span>{admin ? "Employees" : "Team members"}</span></article><article><strong>{admin ? 5 : 3}</strong><span>Open requests</span></article><article><strong>{admin ? 94 : 100}%</strong><span>Access reviewed</span></article></div><div className="management-list">{people.slice(0, admin ? 4 : 3).map((person, i) => <article key={person[0]}><span className={`person-avatar person-${i}`}>{person[2]}</span><div><h2>{person[0]}</h2><p>{person[1]} · {person[3]}</p></div><b>{5 + i} apps</b><button onClick={() => notify(`Access review for ${person[0]} is illustrative only.`)}>Review access</button></article>)}</div></section>;
}

function PageHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <header className="page-head"><p className="kicker">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></header>; }

export default function Portal() {
  const [permissions,setPermissions]=useState<PortalPermissions>(emptyPermissions);
  const [accessRevision,setAccessRevision]=useState(0);
  const [accessOpen,setAccessOpen]=useState(false);
  const [apps, setApps] = useState<Application[]>([]);
  const [dashboardOrder, setDashboardOrder] = useState<string[]>([]);
  const [canManageApps, setCanManageApps] = useState(false);
  const [editingApps, setEditingApps] = useState(false);
  const [selectedEditApp, setSelectedEditApp] = useState<Application | null>(null);
  const openAppEditor = (app: Application | null = null) => {
    setSelectedEditApp(app); setEditingApps(true);
    document.querySelector<HTMLDetailsElement>(".profile-menu")?.removeAttribute("open");
  };
  const [role, setRole] = useState<Role>("Employee");
  const [view, setView] = useState<View>(viewFromLocation);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    try { const saved = window.localStorage.getItem("hikinex-appearance"); return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches; } catch { return false; }
  });
  const [personalApps, setPersonalApps] = useState<PersonalApp[]>([]);
  const changeTheme = (next: boolean) => { setDark(next); try { window.localStorage.setItem("hikinex-appearance", next ? "dark" : "light"); } catch { /* The current session still uses the selected theme. */ } };
  const [session, setSession] = useState<Session | null>(null);
  const [savedName, setSavedName] = useState<{ userId: string; name: unknown } | null>(null);
  const identity = session ? accountName(session.user, savedName) : null;
  const [authReady, setAuthReady] = useState(!supabase);
  const [profileReady, setProfileReady] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [department, setDepartment] = useState("H!KINEX");
  const [companyUpdates, setCompanyUpdates] = useState<CompanyUpdate[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3200); };
  const canEdit = Boolean(session && supabase);
  const assignedIds = useMemo(() => new Set([...permissions.defaults, ...addedIds.filter((id) => permissions.catalog.includes(id))]), [permissions.defaults, permissions.catalog, addedIds]);
  const pinnedIdSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);
  const nav: View[] = ["Announcements"];
  const navigate = (nextView: View, replace = false) => {
    setView(nextView);
    const url = new URL(window.location.href);
    const route = viewRoutes[nextView];
    if (route) url.searchParams.set("view", route);
    else url.searchParams.delete("view");
    window.history[replace ? "replaceState" : "pushState"]({ portalView: nextView }, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const closeNavigationOnMobile = () => { if (window.matchMedia("(max-width: 760px)").matches) setMenu(false); };
  useEffect(() => {
    const restoreView = () => setView(viewFromLocation());
    const initialView = viewFromLocation();
    if (initialView !== "Home" && !window.history.state?.portalView) {
      const sectionUrl = new URL(window.location.href);
      const homeUrl = new URL(sectionUrl);
      homeUrl.searchParams.delete("view");
      window.history.replaceState({ portalView: "Home" }, "", homeUrl);
      window.history.pushState({ portalView: initialView }, "", sectionUrl);
    }
    window.addEventListener("popstate", restoreView);
    return () => window.removeEventListener("popstate", restoreView);
  }, []);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === "Escape") setMenu(false); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, []);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      if (event === "USER_UPDATED") return;
      setProfileReady(false);
      setAuthMessage("");
      if (!nextSession) { setPermissions(emptyPermissions); setAccessOpen(false); setApps([]); setCanManageApps(false); setEditingApps(false); setPersonalApps([]); setAddedIds([]); setPinnedIds([]); setCompanyUpdates([]); setSavedName(null); }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session || !supabase) return;
    let current = true;
    Promise.all([
      supabase.from("profiles").select("role, display_name, department").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("user_app_assignments").select("application_id").eq("user_id", session.user.id).eq("source", "self_added"),
      supabase.from("company_updates").select("id, title, summary, body, audience, department, pinned, published_at, created_by").eq("published", true).order("pinned", { ascending: false }).order("published_at", { ascending: false }),
      supabase.from("applications").select("id,name,description,url,category,icon,logo_url,updated_at").order("sort_order"),
      supabase.rpc("my_portal_access"),
    ]).then(([profileResult, assignmentResult, updatesResult, appsResult, editorResult]) => {
      if (!current) return;
      setPermissions(editorResult.error ? emptyPermissions : (editorResult.data ?? emptyPermissions));
      setCanManageApps(!editorResult.error && editorResult.data?.edit_apps === true);
      setApps(appsResult.error ? [] : (appsResult.data ?? []).map(mapSharedApp));
      setSavedName({ userId: session.user.id, name: profileResult.data?.display_name });
      const storedRole = profileResult.data?.role;
      if (profileResult.error || (storedRole !== "employee" && storedRole !== "manager" && storedRole !== "admin")) {
        setAuthMessage("Your account does not have an assigned H!KINEX portal role. Please contact an administrator.");
        setProfileReady(true);
        return;
      }
      setRole((storedRole.charAt(0).toUpperCase() + storedRole.slice(1)) as Role);
      setDepartment(profileResult.data?.department || "H!KINEX");
      setDashboardOrder(Array.isArray(session.user.user_metadata?.dashboard_order) ? session.user.user_metadata.dashboard_order.filter((id: unknown): id is string => typeof id === "string").slice(0,100) : []);
      setPersonalApps(readPersonalApps(session.user.user_metadata?.personal_apps));
      setView(viewFromLocation());
      if (!assignmentResult.error) setAddedIds((assignmentResult.data ?? []).map((row) => row.application_id));
      if (!updatesResult.error) setCompanyUpdates((updatesResult.data ?? []) as CompanyUpdate[]);
      const savedPins = session.user.user_metadata?.pinned_apps;
      const validSavedPins = Array.isArray(savedPins) ? savedPins.filter((id): id is string => typeof id === "string" && fallbackApps.some((app) => app.id === id)) : [];
      const defaultsSeeded = session.user.user_metadata?.dashboard_defaults_version === dashboardDefaultsVersion;
      const initialPins = defaultsSeeded ? validSavedPins : [...new Set([...essentialDashboardApps, ...validSavedPins])];
      setPinnedIds(initialPins);
      if (!defaultsSeeded) void supabase?.auth.updateUser({ data: { pinned_apps: initialPins, dashboard_defaults_seeded: true, dashboard_defaults_version: dashboardDefaultsVersion } });
      setProfileReady(true);
    });
    return () => { current = false; };
  }, [session, accessRevision]);
  const saveDashboardOrder = async (ids: string[]) => {
    if (!supabase || !session) return;
    const previous=dashboardOrder; setDashboardOrder(ids);
    const {error}=await supabase.auth.updateUser({data:{dashboard_order:ids}});
    if(error) { setDashboardOrder(previous); notify("Could not save the app order. Please try again."); }
  };
  const savePersonalApps = async (items: PersonalApp[]) => {
    if (!session || !supabase || !profileReady) return false;
    const validated = readPersonalApps(items);
    if (validated.length !== items.length || validated.some((item) => !canUseShortcut(item.url, role, department, permissions.catalog))) { notify("Some app details are invalid."); return false; }
    const { error } = await supabase.auth.updateUser({ data: { personal_apps: validated } });
    if (error) { notify("We could not save your personal apps. Please try again."); return false; }
    setPersonalApps(validated);
    notify("Your personal apps were saved.");
    return true;
  };
  const addApp = async (app: Application) => {
    if (!session || !supabase) return;
    if (assignedIds.has(app.id) || !permissions.catalog.includes(app.id)) return;
    setAddedIds((current) => [...current, app.id]);
    const { error } = await supabase.from("user_app_assignments").upsert({ user_id: session.user.id, application_id: app.id, source: "self_added" }, { onConflict: "user_id,application_id" });
    if (error) { setAddedIds((current) => current.filter((id) => id !== app.id)); notify("We could not save that app. Your previous selection was restored."); return; }
    notify(`${app.name} was added to My Apps.`);
  };
  const removeApp = async (app: Application) => {
    if (!session || !supabase || permissions.defaults.includes(app.id)) return;
    setAddedIds((current) => current.filter((id) => id !== app.id));
    const { error } = await supabase.from("user_app_assignments").delete().eq("user_id", session.user.id).eq("application_id", app.id).eq("source", "self_added");
    if (error) { setAddedIds((current) => [...new Set([...current, app.id])]); notify("We could not remove that app. Your previous selection was restored."); return; }
    notify(`${app.name} was removed from My Apps.`);
  };
  const togglePin = async (app: Application) => {
    if (!session || !supabase || !assignedIds.has(app.id)) return;
    const previous = pinnedIds;
    const next = previous.includes(app.id) ? previous.filter((id) => id !== app.id) : [...previous, app.id];
    setPinnedIds(next);
    const { error } = await supabase.auth.updateUser({ data: { pinned_apps: next } });
    if (error) {
      setPinnedIds(previous);
      notify("We could not save that dashboard change. Your previous pins were restored.");
      return;
    }
    notify(`${app.name} was ${next.includes(app.id) ? "pinned to" : "unpinned from"} your dashboard.`);
  };
  const addAndPin = async (app: Application) => {
    if (!permissions.catalog.includes(app.id)) return;
    if (!session || !supabase || assignedIds.has(app.id)) { if (assignedIds.has(app.id)) await togglePin(app); return; }
    const previousAdded = addedIds;
    const previousPins = pinnedIds;
    const nextAdded = [...new Set([...previousAdded, app.id])];
    const nextPins = [...new Set([...previousPins, app.id])];
    setAddedIds(nextAdded);
    setPinnedIds(nextPins);
    const { error: assignmentError } = await supabase.from("user_app_assignments").upsert({ user_id: session.user.id, application_id: app.id, source: "self_added" }, { onConflict: "user_id,application_id" });
    if (assignmentError) {
      setAddedIds(previousAdded);
      setPinnedIds(previousPins);
      notify("We could not add that app. Your dashboard was restored.");
      return;
    }
    const { error: pinError } = await supabase.auth.updateUser({ data: { pinned_apps: nextPins } });
    if (pinError) {
      await supabase.from("user_app_assignments").delete().eq("user_id", session.user.id).eq("application_id", app.id).eq("source", "self_added");
      setAddedIds(previousAdded);
      setPinnedIds(previousPins);
      notify("We could not save Quick Access. Your previous dashboard was restored.");
      return;
    }
    notify(`${app.name} was added and pinned to your dashboard.`);
  };
  const createCompanyUpdate = async (draft: CompanyUpdateDraft) => {
    if (!session || !supabase || !(permissions.publish !== "none")) return false;
    const payload = {
      ...draft,
      audience: (permissions.publish === "company") ? draft.audience : "department",
      department: !(permissions.publish === "company") || draft.audience === "department" ? department : null,
      created_by: session.user.id,
      published: true,
      published_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("company_updates").insert(payload).select("id, title, summary, body, audience, department, pinned, published_at, created_by").single();
    if (error || !data) { notify("The update could not be published. Please confirm the Company Updates database migration is active."); return false; }
    setCompanyUpdates((current) => [data as CompanyUpdate, ...current]);
    notify("Company update published successfully.");
    return true;
  };
  const signIn = async () => {
    if (!supabase) { setAuthMessage("Secure access is being finalized. Please try again shortly."); return; }
    if (!email || !password) { setAuthMessage("Enter your H!KINEX email and password."); return; }
    setAuthBusy(true);
    setAuthMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthBusy(false);
    if (error) { setAuthMessage("The email or password is incorrect, or this account is not active."); return; }
    setPassword("");
  };
  const signInWithMicrosoft = async () => {
    if (!supabase) { setAuthMessage("Microsoft organizational access is not available yet. Please try again shortly."); return; }
    setAuthBusy(true);
    setAuthMessage("");
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      // The profile scope supplies name claims in Microsoft's verified ID token.
      options: { scopes: "email profile", redirectTo, skipBrowserRedirect: true },
    });
    if (error) {
      setAuthBusy(false);
      setAuthMessage("Microsoft organizational sign-in could not start. Please contact IT if the problem continues.");
      return;
    }
    if (data.url) { window.location.assign(data.url); return; }
    setAuthBusy(false);
    setAuthMessage("Microsoft did not return a sign-in address. Please contact IT so the Azure provider settings can be checked.");
  };
  const signOut = () => {
    setSession(null);
    setSavedName(null);
    setPersonalApps([]);
    setPinnedIds([]);
    setCompanyUpdates([]);
    setAddedIds([]);
    setRole("Employee");
    navigate("Home", true);
    setProfileReady(false);
    setAuthReady(true);
    setAuthBusy(false);
    setAuthMessage("");
    if (supabase) {
      void supabase.auth.signOut({ scope: "local" }).then(({ error }) => {
        if (error) setAuthMessage("You are signed out of the portal, but the remote session could not be closed.");
      });
    }
  };
  const labels: Record<View, string> = { Home: "Home", Apps: "Apps & Tools", Announcements: "Company Updates", Feed: "Company Feed", Groups: "Groups & Clubs", People: "People", Jobs: "Jobs & Referrals", Team: "My Team", Requests: "Access Requests", Admin: "Admin Console" };
  if (!authReady || (session && !profileReady)) return <main className="auth-page"><section className="auth-card"><Brand /><div className="auth-loading" aria-live="polite">Checking secure access…</div></section></main>;
  if (!session) return <main className="auth-page"><section className="auth-card"><Brand /><p className="kicker">SECURE EMPLOYEE ACCESS</p><h1>Welcome to H!KINEX Commons.</h1><p>Sign in with your assigned Employee, Manager, or Admin account. Your account role determines which portal and controls you can access.</p><button className="microsoft microsoft-primary" onClick={signInWithMicrosoft} disabled={authBusy || !isSupabaseConfigured}><span className="microsoft-mark" aria-hidden="true"><i /><i /><i /><i /></span>{authBusy ? "Connecting…" : "Continue with Microsoft"}</button><span className="or">or use your assigned portal credentials</span><label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@hikinex.com" /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" onKeyDown={(event) => { if (event.key === "Enter") signIn(); }} /></label>{authMessage && <div className="auth-error" role="alert">{authMessage}</div>}<button className="primary" onClick={signIn} disabled={authBusy || !isSupabaseConfigured}>{authBusy ? "Signing in…" : isSupabaseConfigured ? "Sign in with email" : "Secure access is being connected"}</button><small>Access and roles are managed by H!KINEX.</small></section></main>;
  if (authMessage) return <main className="auth-page"><section className="auth-card"><Brand /><p className="kicker">ACCESS NOT ASSIGNED</p><h1>We couldn’t open your portal.</h1><p>{authMessage}</p><button className="primary" onClick={signOut}>Sign out</button></section></main>;
  const managementAllowed = (role === "Manager" && (view === "Team" || view === "Requests")) || (role === "Admin" && view === "Admin");
  return <PermissionContext.Provider value={permissions}><main className={`portal commons launchpad ${dark ? "dark" : ""}`}>
    <aside className={menu ? "open" : ""} aria-label="Portal navigation">
      <button className="brand-home" onClick={() => { navigate("Home"); closeNavigationOnMobile(); }} aria-label="Open dashboard"><Brand /></button>
      <nav>{nav.map((item) => <button className={view === item ? "active" : ""} onClick={() => { navigate(item); closeNavigationOnMobile(); }} key={item}>{labels[item]}</button>)}</nav>
      <div className="launch-header-tools"><MicrosoftAppsMenu /></div>
      <details className="profile-menu"><summary className="profile"><span>{identity?.initials}</span><div><strong>{identity?.fullName || "Your account"}</strong><small>{roleCopy[role].title} · {department}</small></div><b aria-hidden="true">⌄</b></summary><div className="account-menu"><button onClick={() => changeTheme(!dark)} aria-pressed={dark}><span aria-hidden="true">{dark ? "☀" : "◐"}</span><span><strong>{dark ? "Light mode" : "Dark mode"}</strong><small>Change portal appearance</small></span></button><button className="account-signout" onClick={signOut}><span aria-hidden="true">↪</span><span><strong>Sign out</strong><small>End this secure session</small></span></button>{canManageApps && <button onClick={() => openAppEditor()}><span aria-hidden="true"><PencilIcon /></span><span><strong>Edit company apps</strong><small>Update shared app details</small></span></button>}{permissions.manage_access && <button onClick={() => { setAccessOpen(true); document.querySelector(".profile-menu")?.removeAttribute("open"); }}><span aria-hidden="true">⚙</span><span><strong>Access management</strong><small>Roles and app visibility</small></span></button>}</div></details>
      <footer><strong>H!KINEX Commons</strong><small>Secure session</small></footer>
    </aside>
    {menu && <button className="overlay" aria-label="Close navigation" onClick={() => setMenu(false)} />}
    <section className="main">
      <header className="topbar"><button className="menu" onClick={() => setMenu((current) => !current)} aria-label={menu ? "Collapse navigation" : "Expand navigation"} aria-expanded={menu}>☰</button></header>
      <div className="content">
        {permissions.manage_access && accessOpen && <AccessManagement onClose={() => setAccessOpen(false)} onSaved={() => { setAccessRevision(value => value + 1); }} />}
        {canManageApps && editingApps && <SharedAppEditor key={`${session?.user.id}-${selectedEditApp?.id || "all"}`} initialApp={selectedEditApp} onClose={() => setEditingApps(false)} onSaved={saved => setApps(current => current.map(app => app.id === saved.id ? saved : app))} />}
        {view === "Home" && <HomeView order={dashboardOrder} onOrder={saveDashboardOrder} apps={apps} role={role} department={department} displayName={identity?.greetingName ?? ""} assignedIds={assignedIds} pinnedIds={pinnedIdSet} canEdit={canEdit} updates={companyUpdates} navigate={navigate} onAdd={addApp} onRemove={removeApp} onTogglePin={togglePin} personalApps={personalApps} onSavePersonalApps={savePersonalApps} />}
        {view === "Apps" && <AppsView onEdit={canManageApps ? openAppEditor : undefined} apps={apps} role={role} department={department} assignedIds={assignedIds} pinnedIds={pinnedIdSet} canEdit={canEdit} navigate={navigate} onAdd={addApp} onAddAndPin={addAndPin} onRemove={removeApp} onTogglePin={togglePin} />}
        {view === "Announcements" && <AnnouncementsView role={role} department={department} items={companyUpdates} onCreate={createCompanyUpdate} notify={notify} />}
        {view === "Feed" && <FeedView notify={notify} />}
        {view === "Groups" && <GroupsView role={role} notify={notify} />}
        {view === "People" && <PeopleView notify={notify} />}
        {view === "Jobs" && <JobsView role={role} notify={notify} />}
        {managementAllowed && <ManagementView role={role} view={view} notify={notify} />}
      </div>
    </section>
    {toast && <div className="toast" role="status">{toast}<button onClick={() => setToast("")} aria-label="Dismiss">×</button></div>}
  </main></PermissionContext.Provider>;
}
