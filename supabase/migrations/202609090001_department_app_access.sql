begin;

-- Departments are trusted profile data, maintained by administrators, not user metadata.
create table if not exists public.department_default_apps (
  department text not null,
  application_id text not null references public.applications(id) on delete cascade,
  primary key (department, application_id)
);
insert into public.department_default_apps (department, application_id) values
  ('Management', 'invsync'), ('Management', 'reet'), ('Management', 'talentdirector'),
  ('Training Team', 'talentdirector')
on conflict do nothing;
alter table public.department_default_apps enable row level security;
revoke all on public.department_default_apps from anon, authenticated;
grant select on public.department_default_apps to authenticated;
create policy "members read department defaults" on public.department_default_apps
for select to authenticated using (exists (
  select 1 from public.profiles p where p.user_id = auth.uid()
  and (p.role = 'admin' or p.department = department_default_apps.department)
));

create or replace function public.can_access_portal_app(app_id text)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles p where p.user_id = auth.uid()
    and p.role in ('employee','manager','admin')
    and (
      app_id not in ('invsync','reet','talentdirector','softwaretracker')
      or p.role = 'admin'
      or exists (select 1 from public.department_default_apps d
        where d.department = p.department and d.application_id = app_id)
    )
  );
$$;
revoke all on function public.can_access_portal_app(text) from public, anon;
grant execute on function public.can_access_portal_app(text) to authenticated;

-- Restrictive policies compose with existing ownership, membership and active-app rules.
create policy "department app access" on public.applications as restrictive
for select to authenticated using (public.can_access_portal_app(id));
create policy "department role defaults" on public.role_default_apps as restrictive
for select to authenticated using (public.can_access_portal_app(application_id));
create policy "department assignment access" on public.user_app_assignments as restrictive
for all to authenticated using (public.can_access_portal_app(application_id))
with check (public.can_access_portal_app(application_id));

create or replace function public.can_publish_portal_update(target_audience text, target_department text)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles p where p.user_id = auth.uid()
    and p.role in ('employee','manager','admin')
    and (
      p.role = 'admin'
      or (p.department = 'Management' and target_audience = 'company' and target_department is null)
      or (target_audience = 'department' and target_department = p.department
          and (p.role = 'manager' or p.department = 'Management'))
    )
  );
$$;
revoke all on function public.can_publish_portal_update(text,text) from public, anon;
grant execute on function public.can_publish_portal_update(text,text) to authenticated;

alter policy "admins and managers publish updates" on public.company_updates
with check (created_by = auth.uid() and public.can_publish_portal_update(audience,department));
alter policy "authors and admins update company updates" on public.company_updates
with check (
  public.can_publish_portal_update(audience,department)
  and (created_by = auth.uid() or exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'
  ))
);

-- RLS already allows profile reads only. Remove unnecessary non-RLS privileges too.
revoke insert, update, delete, truncate, references, trigger on public.profiles from anon, authenticated;
commit;
