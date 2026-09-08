-- Admin portal shortcuts; destination applications retain their own authorization.
insert into public.role_default_apps (role, application_id)
values ('admin', 'reet'), ('admin', 'talentdirector')
on conflict (role, application_id) do nothing;
