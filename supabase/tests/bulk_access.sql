begin;
select set_config('request.jwt.claim.sub','73838e6c-b680-4e06-8c72-fe492fb88589',true);
set local role authenticated;
do $$ declare before_data jsonb; after_data jsonb; batch jsonb; bad jsonb; item jsonb; begin
 before_data:=public.get_portal_access_management();
 select jsonb_agg(jsonb_build_object('user_id',u->>'id','role',u->>'role','department',u->>'department','settings','{"deny":["reet"]}'::jsonb,'expected_profile_updated_at',u->>'updated_at','expected_revision',coalesce((select (r->>'revision')::integer from jsonb_array_elements(before_data->'rules') r where r->>'subject_type'='user' and r->>'subject_key'=u->>'id'),0)) order by u->>'id') into batch from (select x u from jsonb_array_elements(before_data->'users') x order by x->>'id' limit 2) t;
 if jsonb_array_length(batch)<>2 then raise exception 'Need two existing test subjects'; end if;
 bad:=jsonb_set(batch,'{1,expected_revision}','-1');
 begin perform public.save_portal_access_bulk(bad); raise exception 'Stale batch accepted'; exception when serialization_failure then null; end;
 after_data:=public.get_portal_access_management();
 if before_data<>after_data then raise exception 'Failed batch partially changed data'; end if;
 perform public.save_portal_access_bulk(batch);
 for item in select x from jsonb_array_elements(batch) x loop
  if not exists(select 1 from jsonb_array_elements(public.get_portal_access_management()->'rules') r where r->>'subject_type'='user' and r->>'subject_key'=item->>'user_id' and r->'settings'->'deny' ? 'reet') then raise exception 'Batch did not save both users'; end if;
 end loop;
 begin perform public.save_portal_access_bulk(jsonb_build_array(batch->0,batch->0)); raise exception 'Duplicate accepted'; exception when invalid_parameter_value then null; end;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
 begin perform public.save_portal_access_bulk(batch); raise exception 'Unauthorized batch accepted'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: two-user save, atomic rollback on conflict, duplicate rejection, unauthorized rejection; test changes rolled back' as result;
