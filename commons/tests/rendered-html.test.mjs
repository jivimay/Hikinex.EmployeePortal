import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${process.env.PORTAL_BASE_PATH || "/"}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders a branded H!KINEX portal", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /H!KINEX/i);
  assert.match(html, /Employee|Manager|Admin/i);
  assert.doesNotMatch(html, /Building your site|taking shape/i);
});

test("keeps role navigation, official departments and safe actions", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const department of ["H!KINEX", "Sales", "Recruiting", "Marketing", "IT", "DogFoodDev"]) assert.match(page, new RegExp(department));
  assert.match(page, /role === "Admin"|role === "Manager"/);
  assert.match(page, /navigate\("Apps"\)|setView\("Apps"\)/);
  assert.match(page, /illustrative|prototype/i);
});

test("uses the brand as Home and gives every role a Company Updates tab", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const nav: View\[\] = \["Announcements"\]/);
  assert.match(page, /Announcements: "Company Updates"/);
  assert.match(page, /className="brand-home"/);
  assert.doesNotMatch(page, /const nav: View\[\] = \["Home"\]/);
});



test("groups appearance and sign-out actions inside the signed-in profile menu", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<details className="profile-menu">/);
  assert.match(page, /<summary className="profile">/);
  assert.match(page, />\{dark \? "Light mode" : "Dark mode"\}</);
  assert.match(page, /className="account-signout" onClick=\{signOut\}/);
  assert.doesNotMatch(page, /className="theme-toggle"/);
  assert.doesNotMatch(page, /className="login-preview"/);
});

test("lets signed-in users pin and unpin assigned dashboard apps", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /className="pin-app"/);
  assert.match(page, /<svg viewBox="0 0 24 24" aria-hidden="true">/);
  assert.doesNotMatch(page, /\{pinned \? "★" : "☆"\}/);
  assert.match(page, /aria-pressed=\{pinned\}/);
  assert.match(page, /pinned_apps: next/);
  assert.match(page, /supabase\.auth\.updateUser/);
  assert.match(page, /assignedIds\.has\(app\.id\) && pinnedIds\.has\(app\.id\)/);
  assert.match(page, /className="request-card"/);
  assert.match(page, /Add or pin an App/);
  assert.match(page, /pinnedIds=\{pinnedIdSet\}/);
  assert.match(page, /onTogglePin=\{togglePin\}/);
  assert.match(page, /essentialDashboardApps = \["mission-control", "timekeeper", "lms"\]/);
  assert.match(page, /dashboard_defaults_seeded/);
  assert.match(page, /dashboardDefaultsVersion = 2/);
  assert.match(page, /dashboard_defaults_version === dashboardDefaultsVersion/);
  assert.match(page, /\.\.\.essentialDashboardApps, \.\.\.validSavedPins/);
});

test("matches the working dashboard with one-step Quick Access controls", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /className="directory-quick-access"/);
  assert.match(page, /Search apps by name or category/);
  assert.match(page, /Add and pin .* on the dashboard/);
  assert.match(page, /const addAndPin = async/);
  assert.match(page, /user_app_assignments/);
  assert.match(page, /pinned_apps: nextPins/);
  assert.match(page, /previous dashboard was restored/);
  assert.match(page, /catalogAppIds\(role, department\)/);
  assert.match(page, /groupCount\(group\)/);
  assert.match(styles, /\.directory-quick-access/);
  assert.match(styles, /\.quick-access-items/);
});

test("uses the approved app catalog and immediate Add an App language", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const application of ["Mission Control", "TimeKeeper", "REET", "TalentDirector", "InvSync", "SoftwareTracker", "RegEv · ATS", "DFD TimeKeeper"]) assert.match(page, new RegExp(application));
  assert.match(page, /Add an App/);
  assert.doesNotMatch(page, /Request an App/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /noopener noreferrer/);
});

test("keeps role defaults separate and enforces authenticated roles", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /catalogAppIds\(role, department\)\.includes\(app\.id\)/);
  assert.doesNotMatch(page, /aria-label="Department"/);
  assert.match(page, /profiles"\)\.select\("role, display_name, department"\)/);
  assert.match(page, /role === "Manager" && \(view === "Team" \|\| view === "Requests"\)/);
  assert.match(page, /role === "Admin" && view === "Admin"/);
  assert.doesNotMatch(page, /Preview role/);
  assert.doesNotMatch(page, /Public read-only review/);
  assert.match(page, /localStorage.getItem\("hikinex-appearance"\)/);
});

test("offers tenant-scoped Microsoft organizational sign-in", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Continue with Microsoft/);
  assert.match(page, /provider: "azure"/);
  assert.match(page, /scopes: "email profile"/);
  assert.match(page, /window\.location\.origin/);
  assert.match(page, /skipBrowserRedirect: true/);
  assert.match(page, /window\.location\.assign\(data\.url\)/);
});

test("greets each authenticated user with their own account name", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /accountName\(session.user, savedName\)/);
  assert.match(page, /identity\?\.fullName/);
  assert.match(page, /displayName=\{identity\?\.greetingName/);
  assert.doesNotMatch(page, /nameFromEmail|session\.user\.email\?\.split/);
  assert.doesNotMatch(page, /user: "Mariana"|user: "Alex"|user: "Jordan"/);
});

test("rotates an attributed daily thought automatically every calendar day", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const author of ["Erich Fromm", "Karl Popper", "Albert Camus", "Marcus Aurelius"]) assert.match(page, new RegExp(author));
  for (const originalName of ["Epíktētos", "Plátōn", "Aristotélēs", "Plútarchos"]) assert.match(page, new RegExp(originalName));
  assert.doesNotMatch(page, /DAILY THOUGHT/);
  assert.match(page, /function dailyQuoteIndex/);
  assert.match(page, /86_400_000/);
  assert.match(page, /new Date\(now\.getFullYear\(\), now\.getMonth\(\), now\.getDate\(\) \+ 1\)/);
  assert.match(page, /window\.setTimeout/);
  assert.match(page, /<DailyQuote \/>/);
});









test("loads and publishes real role-scoped company updates through Supabase", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const migration = await readFile(new URL("../../supabase/migrations/202609010002_company_updates.sql", import.meta.url), "utf8");
  assert.match(page, /from\("company_updates"\)\.select/);
  assert.match(page, /from\("company_updates"\)\.insert/);
  assert.match(page, /updates=\{companyUpdates\}/);
  assert.match(page, /Publish update/);
  assert.doesNotMatch(page, /Announcement composer opened in safe preview mode/);
  assert.match(migration, /create table if not exists public\.company_updates/);
  assert.match(migration, /employees read visible company updates/);
  assert.match(migration, /admins and managers publish updates/);
});

test("signs out the current browser session and always resets portal state", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /signOut\(\{ scope: "local" \}\)/);
  assert.match(page, /setSession\(null\)[\s\S]*void supabase\.auth\.signOut/);
  assert.match(page, /setSession\(null\)/);
  assert.match(page, /setSavedName\(null\)/);
  assert.match(page, /setRole\("Employee"\)/);
  assert.match(page, /navigate\("Home", true\)/);
});

test("creates browser history for internal portal navigation", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /viewRoutes: Partial<Record<View, string>>/);
  assert.match(page, /searchParams\.set\("view", route\)/);
  assert.match(page, /window\.history\[replace \? "replaceState" : "pushState"\]/);
  assert.match(page, /window\.addEventListener\("popstate", restoreView\)/);
  assert.match(page, /window\.removeEventListener\("popstate", restoreView\)/);
  assert.match(page, /viewFromLocation\(\)/);
  assert.match(page, /navigate=\{navigate\}/);
  assert.match(page, /initialView !== "Home" && !window\.history\.state\?\.portalView/);
  assert.match(page, /window\.history\.replaceState\(\{ portalView: "Home" \}/);
  assert.match(page, /window\.history\.pushState\(\{ portalView: initialView \}/);
});


test("Launchpad provides two themes, inline updates and personal shortcuts", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/launchpad.css", import.meta.url), "utf8");
  assert.match(page, /function CompanyUpdatesPreview/);
  assert.match(page, /Read the full update/);
  assert.match(page, /personal_apps: validated/);
  assert.match(page, /readPersonalApps\(session.user.user_metadata/);
  assert.doesNotMatch(page, /className="appearance-switch"/);
  assert.match(page, /aria-pressed=\{dark\}/);
  assert.match(styles, /launchpad.dark/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.doesNotMatch(page, /CompanyUpdatesCarousel/);
});
