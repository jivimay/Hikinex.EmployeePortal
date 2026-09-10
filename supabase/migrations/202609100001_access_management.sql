begin;
create table public.portal_access_rules (
 subject_type text not null check(subject_type in ('role','department','user')),
 subject_key text not null, settings jsonb not null default '{}', revision integer not null default 1,
 primary key(subject_type,subject_key)
);
create table public.portal_access_managers (user_id uuid primary key references auth.users(id));
insert into public.portal_access_managers values ('73838e6c-b680-4e06-8c72-fe492fb88589');
create table public.portal_access_audit (id bigint generated always as identity primary key, actor uuid not null, subject_type text not null, subject_key text not null, previous jsonb, current_settings jsonb, changed_at timestamptz not null default now());
alter table public.portal_access_rules enable row level security;
alter table public.portal_access_managers enable row level security;
alter table public.portal_access_audit enable row level security;
revoke all on public.portal_access_rules, public.portal_access_managers, public.portal_access_audit from public, anon, authenticated;
insert into public.portal_access_rules(subject_type,subject_key,settings)
select 'role',r,jsonb_build_object('defaults',to_jsonb(array['mission-control','timekeeper','lms','vaultwarden','hiki-it-portal','hubspot'] || case when r='admin' then array['invsync','reet','talentdirector','softwaretracker'] else array[]::text[] end),'optional',jsonb_build_array('canva','semrush','reqev-ats','dfd-timekeeper')) from unnest(array['employee','manager','admin']) r;
insert into public.portal_access_rules values
 ('department','Management','{"defaults":["invsync","reet","talentdirector"],"optional":[]}',1),
 ('department','Training Team','{"defaults":["talentdirector"],"optional":[]}',1);

create function public.can_manage_portal_access() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.portal_access_managers m join auth.users u on u.id=m.user_id where m.user_id=auth.uid() and u.email_confirmed_at is not null);
$$;
create function public.portal_effective_access(target_user uuid) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare p public.profiles; r jsonb; d jsonb; u jsonb; defaults jsonb; optional jsonb; scope text; editor boolean;
begin
 select * into p from public.profiles where user_id=target_user;
 if not found then return '{"defaults":[],"catalog":[],"publish":"none","edit_apps":false}'; end if;
 select settings into r from public.portal_access_rules where subject_type='role' and subject_key=p.role;
 select settings into d from public.portal_access_rules where subject_type='department' and subject_key=p.department;
 select settings into u from public.portal_access_rules where subject_type='user' and subject_key=target_user::text;
 select coalesce(jsonb_agg(distinct v),'[]') into defaults from jsonb_array_elements_text(coalesce(r->'defaults','[]')||coalesce(d->'defaults','[]')||coalesce(u->'allow','[]')) v where not coalesce(u->'deny','[]') ? v;
 select coalesce(jsonb_agg(distinct v),'[]') into optional from jsonb_array_elements_text(defaults||coalesce(r->'optional','[]')||coalesce(d->'optional','[]')) v where not coalesce(u->'deny','[]') ? v;
 scope:=coalesce(nullif(u->>'publish','inherit'),case when p.role='admin' or p.department='Management' then 'company' when p.role='manager' and p.department is not null then 'department' else 'none' end);
 editor:=coalesce((u->>'edit_apps')::boolean,exists(select 1 from auth.users a join public.portal_app_editors e on e.email=lower(a.email) where a.id=target_user and a.email_confirmed_at is not null));
 return jsonb_build_object('defaults',defaults,'catalog',optional,'publish',scope,'edit_apps',editor);
end $$;
revoke all on function public.portal_effective_access(uuid) from public,anon,authenticated;
create function public.my_portal_access() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select public.portal_effective_access(auth.uid()) || jsonb_build_object('manage_access',public.can_manage_portal_access());
$$;
create or replace function public.can_access_portal_app(app_id text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce((public.portal_effective_access(auth.uid())->'catalog') ? app_id,false);
$$;
create or replace function public.can_edit_portal_apps() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce((public.portal_effective_access(auth.uid())->>'edit_apps')::boolean,false);
$$;
create or replace function public.can_publish_portal_update(target_audience text,target_department text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.profiles p where p.user_id=auth.uid() and (
  (target_audience='company' and target_department is null and public.portal_effective_access(auth.uid())->>'publish'='company')
  or (target_audience='department' and target_department=p.department and public.portal_effective_access(auth.uid())->>'publish' in ('company','department'))));
$$;
-- Optional app additions now follow configured visibility, still scoped to the caller.
alter policy "portal members add own approved optional apps" on public.user_app_assignments
with check (user_id=auth.uid() and source='self_added' and public.is_portal_member() and public.can_access_portal_app(application_id));

create function public.get_portal_access_management() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.can_manage_portal_access() then raise exception 'Access manager permission required' using errcode='42501'; end if;
 return jsonb_build_object(
 'users',(select coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'name',p.display_name,'email',u.email,'role',p.role,'department',p.department,'updated_at',p.updated_at,'effective',public.portal_effective_access(p.user_id)) order by p.display_name),'[]') from public.profiles p join auth.users u on u.id=p.user_id),
 'apps',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by sort_order),'[]') from public.applications where active),
 'departments',(select coalesce(jsonb_agg(distinct department order by department),'[]') from (select department from public.employee_role_directory union select department from public.profiles union select subject_key from public.portal_access_rules where subject_type='department') t where department is not null),
 'rules',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.portal_access_rules r));
end $$;
create function public.save_portal_access(subject_type_in text,subject_key_in text,settings_in jsonb,expected_revision integer,profile_role text default null,profile_department text default null,expected_profile_updated_at timestamptz default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare previous_settings jsonb; current_revision integer; k text; p public.profiles;
begin
 if not public.can_manage_portal_access() then raise exception 'Access manager permission required' using errcode='42501'; end if;
 if subject_type_in is null or settings_in is null or expected_revision is null or subject_type_in not in ('role','department','user') or subject_key_in is null or length(subject_key_in) not between 1 and 150 or jsonb_typeof(settings_in)<>'object' then raise exception 'Invalid access settings' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(subject_type_in||':'||subject_key_in,0));
 select settings,revision into previous_settings,current_revision from public.portal_access_rules where subject_type=subject_type_in and subject_key=subject_key_in for update;
 if coalesce(current_revision,0)<>expected_revision then raise exception 'Settings changed. Reload before saving.' using errcode='40001'; end if;
 for k in select jsonb_object_keys(settings_in) loop
  if not (k=any(case when subject_type_in='user' then array['allow','deny','publish','edit_apps'] else array['defaults','optional'] end)) then raise exception 'Unknown setting' using errcode='22023'; end if;
 end loop;
 foreach k in array array['allow','deny','defaults','optional'] loop
  if settings_in ? k then
   if jsonb_typeof(settings_in->k)<>'array' then raise exception 'Expected app list' using errcode='22023'; end if;
   if exists(select 1 from jsonb_array_elements_text(settings_in->k) x where not exists(select 1 from public.applications a where a.id=x)) then raise exception 'Unknown app' using errcode='22023'; end if;
  end if;
 end loop;
 if settings_in ? 'publish' and settings_in->>'publish' not in ('inherit','none','department','company') then raise exception 'Invalid publishing access' using errcode='22023'; end if;
 if settings_in ? 'edit_apps' and jsonb_typeof(settings_in->'edit_apps') not in ('boolean','null') then raise exception 'Invalid editor access' using errcode='22023'; end if;
 if subject_type_in='role' and subject_key_in not in ('employee','manager','admin') then raise exception 'Unknown role' using errcode='22023'; end if;
 if subject_type_in='user' then
  select * into p from public.profiles where user_id=subject_key_in::uuid for update;
  if not found or p.updated_at is distinct from expected_profile_updated_at then raise exception 'Profile changed. Reload before saving.' using errcode='40001'; end if;
  if profile_role is null or profile_role not in ('employee','manager','admin') or length(profile_department)>150 then raise exception 'Invalid profile' using errcode='22023'; end if;
  update public.profiles set role=profile_role,department=nullif(trim(profile_department),''),updated_at=clock_timestamp() where user_id=p.user_id;
 end if;
 insert into public.portal_access_rules values(subject_type_in,subject_key_in,settings_in,1) on conflict(subject_type,subject_key) do update set settings=excluded.settings,revision=portal_access_rules.revision+1;
 insert into public.portal_access_audit(actor,subject_type,subject_key,previous,current_settings) values(auth.uid(),subject_type_in,subject_key_in,jsonb_build_object('settings',previous_settings,'role',p.role,'department',p.department),jsonb_build_object('settings',settings_in,'role',profile_role,'department',profile_department));
end $$;
revoke all on function public.can_manage_portal_access(),public.my_portal_access(),public.get_portal_access_management(),public.save_portal_access(text,text,jsonb,integer,text,text,timestamptz) from public,anon;
grant execute on function public.can_manage_portal_access(),public.my_portal_access(),public.get_portal_access_management(),public.save_portal_access(text,text,jsonb,integer,text,text,timestamptz) to authenticated;
commit;
