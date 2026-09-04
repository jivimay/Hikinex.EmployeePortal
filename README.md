# H!KINEX Employee Hub Concepts

Interactive, role-aware portal concepts prepared from the H!KINEX Employee Hub proposal.

## Production deployment

The production employee portal is [employee-portal-hikinex.netlify.app](https://employee-portal-hikinex.netlify.app/).

Pushes to `main` are deployed by Netlify using `netlify.toml`. GitHub Pages is not used. The production build publishes the `commons` application; the other concepts remain in this repository for local review only.

## H!KINEX Commons review

Commons provides a public, read-only Employee, Manager, and Admin review experience. Approved employees can sign in to add optional applications to **My Apps**; role-default applications remain protected.

- Live portal: [employee-portal-hikinex.netlify.app](https://employee-portal-hikinex.netlify.app/)
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
