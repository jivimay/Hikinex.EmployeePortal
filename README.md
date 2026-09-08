# H!KINEX Employee Hub Concepts

Interactive, role-aware portal concepts prepared from the H!KINEX Employee Hub proposal.

## Production deployment

The production employee portal is [hikinex.com/portal](https://hikinex.com/portal).

Netlify builds Commons with `PORTAL_BASE_PATH=/portal` and exports its page and assets under `netlify-dist/portal`. The main website repository proxies only `/portal` and `/portal/*` to this deployment, so both repositories can deploy independently. Keep this base path and the website proxy rules aligned. Supabase must allow `https://hikinex.com/portal` and `https://hikinex.com/portal/` as authentication return URLs.

Pushes to `main` are deployed by Netlify using `netlify.toml`. GitHub Pages is not used. The production build publishes the `commons` application; the other concepts remain in this repository for local review only.

## H!KINEX Commons review

Commons provides a public, read-only Employee, Manager, and Admin review experience. Approved employees can sign in to add optional applications to **My Apps**; role-default applications remain protected.

- Live portal: [hikinex.com/portal](https://hikinex.com/portal)
- Current milestone: functional application catalog, role defaults, secure external shortcuts, and Supabase-ready persistence
- Supabase setup: apply `supabase/migrations/202608270001_hikinex_employee_hub.sql`, then provide `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` during the Commons build

No shared passwords or Supabase service-role credentials belong in this repository.

## Included requirements

- H!KINEX branding and company palette
- Departments: H!KINEX, Sales, Recruiting, Marketing, E-Discovery, and IT
- Role-aware Employee, Manager, and Admin navigation
- Apps, announcements, company feed, groups, people, jobs/referrals, team, requests, and administration
- Public Review mode cannot change employee data; authenticated app selections are protected by Supabase row-level security
- Approved application shortcuts open their corresponding destination in a separate tab
- Responsive navigation and keyboard-accessible overlays
- Screaming Frog remains disabled until its destination is confirmed

## Projects

- `portal-concepts/`
- `navigator/`
- `commons/`

Each folder is a standalone Vinext/React project. Install dependencies and run the local development command documented in its `package.json`.

## Launchpad appearance and logos

The Commons dashboard uses `commons/app/launchpad.css` for the light and dark Launchpad themes. Appearance is a device preference; roles still come from the authenticated `profiles` record. Company updates use the existing audience-scoped database records and can be expanded on the dashboard.

To replace a logo, add the approved artwork under `commons/public/logos/` and set its public-relative path in `commons/lib/branding.ts`. `companyLogo` controls the header; `applicationLogos` maps catalog IDs to logo files. The `/portal` base path is applied automatically. App logos fall back to initials when unset or unavailable.

Personal shortcuts are saved in the current authenticated user's Supabase `personal_apps` metadata, alongside the existing saved-pin preferences. They are validated as HTTP(S) links, capped at 40, and never used as a source of roles or permissions. No database migration is required for this redesign.
