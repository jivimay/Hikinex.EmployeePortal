begin;
alter table public.applications add column if not exists logo_url text;
create table public.portal_app_editors (email text primary key check (email = lower(email)));
alter table public.portal_app_editors enable row level security;
revoke all on public.portal_app_editors from public, anon, authenticated;
insert into public.portal_app_editors(email) values ('afj@hikinex.com'),('rdewangan@hikinex.com'),('jminigo@hikinex.com'),('ralaguda@hikinex.com'),('lyt@hikinex.com');

create function public.can_edit_portal_apps() returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists(select 1 from auth.users u join public.portal_app_editors e on e.email=lower(u.email)
    join public.profiles p on p.user_id=u.id
    where u.id=auth.uid() and u.email_confirmed_at is not null);
$$;
create function public.list_editable_portal_apps() returns setof public.applications language plpgsql stable security definer
set search_path = public, pg_temp as $$
begin
  if not public.can_edit_portal_apps() then raise exception 'App editor permission required' using errcode='42501'; end if;
  return query select * from public.applications order by sort_order,id;
end $$;
create function public.edit_portal_app(app_id text, app_name text, app_description text, app_url text, app_logo_url text, expected_updated_at timestamptz)
returns setof public.applications language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.can_edit_portal_apps() then raise exception 'App editor permission required' using errcode='42501'; end if;
  if app_name is null or char_length(trim(app_name)) not between 1 and 80
    or app_description is null or char_length(trim(app_description)) not between 1 and 300
    or app_url is null or char_length(app_url)>2048 or app_url !~ '^https://[^/@[:space:]]+([/?#]|$)'
    or (app_logo_url is not null and (char_length(app_logo_url)>2048 or app_logo_url !~ '^https://[^/@[:space:]]+([/?#]|$)'))
  then raise exception 'Invalid app details' using errcode='22023'; end if;
  return query update public.applications a set name=trim(app_name), description=trim(app_description), url=app_url, logo_url=app_logo_url, updated_at=clock_timestamp()
    where a.id=app_id and a.updated_at=expected_updated_at returning a.*;
  if not found then raise exception 'App changed; refresh before saving' using errcode='40001'; end if;
end $$;
revoke all on function public.can_edit_portal_apps() from public, anon;
revoke all on function public.list_editable_portal_apps() from public, anon;
revoke all on function public.edit_portal_app(text,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.can_edit_portal_apps(), public.list_editable_portal_apps(), public.edit_portal_app(text,text,text,text,text,timestamptz) to authenticated;
commit;
