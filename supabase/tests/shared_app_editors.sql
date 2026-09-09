-- Rollback-only verification; no shared app edits persist.
begin;
do $$
declare account record; original public.applications; changed public.applications; total integer;
begin
  for account in select id from auth.users where lower(email) in ('afj@hikinex.com','rdewangan@hikinex.com','jminigo@hikinex.com','ralaguda@hikinex.com','lyt@hikinex.com') and email_confirmed_at is not null loop
    perform set_config('request.jwt.claim.sub',account.id::text,true);
    execute 'set local role authenticated';
    if not public.can_edit_portal_apps() then raise exception 'Expected editor access'; end if;
    select count(*) into total from public.list_editable_portal_apps();
    if total <> 14 then raise exception 'Expected all 14 apps, got %',total; end if;
    select * into original from public.list_editable_portal_apps() where id='timekeeper';
    select * into changed from public.edit_portal_app(original.id,'Verification only',original.description,original.url,'https://example.com/logo.png',original.updated_at);
    if changed.name <> 'Verification only' or changed.logo_url <> 'https://example.com/logo.png' then raise exception 'Edit was not persisted'; end if;
    begin
      perform public.edit_portal_app(original.id,original.name,original.description,original.url,null,original.updated_at);
      raise exception 'Stale edit unexpectedly accepted';
    exception when serialization_failure then null; end;
    begin
      perform public.edit_portal_app(original.id,original.name,original.description,'javascript:alert(1)',null,changed.updated_at);
      raise exception 'Unsafe URL unexpectedly accepted';
    exception when invalid_parameter_value then null; end;
    execute 'reset role';
  end loop;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  execute 'set local role authenticated';
  if public.can_edit_portal_apps() then raise exception 'Unapproved account has access'; end if;
  begin perform public.list_editable_portal_apps(); raise exception 'Unapproved list accepted'; exception when insufficient_privilege then null; end;
  begin perform public.edit_portal_app('timekeeper','Test','Test','https://example.com',null,now()); raise exception 'Unapproved edit accepted'; exception when insufficient_privilege then null; end;
  execute 'reset role';
end $$;
rollback;
select 'PASS: approved editors can edit all apps; stale/unsafe/unauthorized edits rejected; changes rolled back' as result;
