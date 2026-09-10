-- Run after 202609100001_access_management.sql in Supabase SQL Editor.
-- No persistent test records: every change rolls back.
begin;
select set_config('request.jwt.claim.sub','73838e6c-b680-4e06-8c72-fe492fb88589',true);
set local role authenticated;
do $$ declare d jsonb; p jsonb; rev integer; begin
 d:=public.get_portal_access_management();
 select x into p from jsonb_array_elements(d->'users') x where x->>'id'=auth.uid()::text;
 select (x->>'revision')::integer into rev from jsonb_array_elements(d->'rules') x where x->>'subject_type'='user' and x->>'subject_key'=auth.uid()::text;
 rev:=coalesce(rev,0);
 perform public.save_portal_access('user',auth.uid()::text,'{"deny":["reet"],"allow":["softwaretracker"],"publish":"none","edit_apps":false}',rev,p->>'role',p->>'department',(p->>'updated_at')::timestamptz);
 if exists(select 1 from public.applications where id='reet') then raise exception 'deny RLS failed'; end if;
 if not exists(select 1 from public.applications where id='softwaretracker') then raise exception 'allow RLS failed'; end if;
 if public.can_publish_portal_update('company',null) or public.can_edit_portal_apps() then raise exception 'capability override failed'; end if;
 begin perform public.list_editable_portal_apps(); raise exception 'editor denial failed'; exception when insufficient_privilege then null; end;
 begin perform public.save_portal_access('user',auth.uid()::text,'{}',rev,p->>'role',p->>'department',(p->>'updated_at')::timestamptz); raise exception 'stale revision accepted'; exception when serialization_failure then null; end;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
 begin perform public.get_portal_access_management(); raise exception 'unauthorized read accepted'; exception when insufficient_privilege then null; end;
 begin perform public.save_portal_access('role','employee','{}',1); raise exception 'unauthorized write accepted'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.portal_access_rules; raise exception 'direct table read accepted'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: access enforcement; all changes rolled back' as result;
