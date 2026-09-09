-- Run as postgres in SQL Editor. All temporary profile changes roll back.
begin;
select set_config('request.jwt.claim.sub','73838e6c-b680-4e06-8c72-fe492fb88589',true);
do $$
declare r text; d text; actual text[]; expected text[]; company boolean;
begin
  foreach r in array array['employee','manager','admin'] loop
    foreach d in array array['','Sales','Training - Recruiting','Training Team','Management'] loop
      update public.profiles set role=r,department=nullif(d,'')
      where user_id='73838e6c-b680-4e06-8c72-fe492fb88589';
      if not found then raise exception 'Test profile missing'; end if;
      expected := case when r='admin' or d='Management' then array['invsync','reet','talentdirector']
        when d='Training Team' then array['talentdirector'] else array[]::text[] end;
      execute 'set local role authenticated';
      select coalesce(array_agg(id order by id),array[]::text[]) into actual
      from public.applications where id in ('invsync','reet','talentdirector');
      if actual <> expected then raise exception 'App RLS mismatch for % / %: %',r,d,actual; end if;
      select public.can_publish_portal_update('company',null) into company;
      if company <> (r='admin' or d='Management') then raise exception 'Publishing mismatch for % / %',r,d; end if;
      execute 'reset role';
    end loop;
  end loop;
end $$;
rollback;
select 'PASS: 15 role/department cases; app SELECT enforced as authenticated; all test changes rolled back' as result;
