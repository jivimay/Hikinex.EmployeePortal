-- Portal Administrators (profiles.role = 'admin') can manage portal access.
-- Previously only users listed in portal_access_managers could, so admins saw
-- "Portal Administrator" but my_portal_access() returned manage_access=false.
-- Employees and managers are unchanged; explicit managers keep access.
begin;
create or replace function public.can_manage_portal_access() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(
  select 1 from auth.users u
  where u.id=auth.uid() and u.email_confirmed_at is not null and (
   exists(select 1 from public.portal_access_managers m where m.user_id=u.id)
   or exists(select 1 from public.profiles p where p.user_id=u.id and p.role='admin')));
$$;
revoke all on function public.can_manage_portal_access() from public,anon;
grant execute on function public.can_manage_portal_access() to authenticated;
commit;
