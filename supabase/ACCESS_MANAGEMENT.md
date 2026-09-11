# Portal access management

The account menu exposes Access management only to a verified account in
`portal_access_managers`. The initial manager is the portal owner's existing
account; shared app editors do not automatically gain this permission.

Apply `migrations/202609100001_access_management.sql` before deploying the UI.
It was applied to the existing portal Supabase project on September 10, 2026.

Role and department defaults combine. Optional apps appear in the directory.
Individual Allow adds access and Individual Deny overrides inherited access.
Users can also inherit or override update publishing and shared app editing.
The page offers a review step, checks concurrent changes, and records successful
changes in `portal_access_audit`. Client roles never authorize writes: guarded
RPC functions enforce access and application RLS consumes the saved rules.

Employees appear once they have signed into the portal. They should refresh
an open portal after their access changes. App visibility does not grant access
to the destination application's independent authentication system.

Validation: build, static export, and 45 Node tests passed. Authenticated SQL
transaction checks verified app SELECT RLS, individual allow/deny, role default
changes, publishing/editor restrictions, conflict and invalid-app rejection,
and unauthorized access denial. Test changes were rolled back. A repeatable
subset is in `tests/access_management.sql`.

Full-project lint retains two existing drag-wrapper accessibility errors and
two image warnings. Type checking retains missing Fetcher/D1Database worker
types; neither check reported errors in the new access management modules.

## Dialogs and bulk editing

Access management, shared app editing, and update creation use native modal
dialogs, preserving the dashboard position and restoring keyboard focus on close.
Bulk edit starts with Leave unchanged for every field and previews the exact
selected employees and changes. The client merges only chosen app/capability
changes into each employee's existing settings. Apply migration
`202609100002_bulk_access.sql` before deploying this version.

`save_portal_access_bulk` uses the same guarded, audited save function inside
one database transaction. A conflict for any employee cancels the entire batch.
The live rollback-only test in `tests/bulk_access.sql` passed two-user saves,
conflict atomicity, duplicate rejection and unauthorized-call rejection.
Three additional Node tests cover per-user setting preservation and inheritance.
