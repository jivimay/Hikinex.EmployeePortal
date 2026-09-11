begin;
create function public.save_portal_access_bulk(changes_in jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb;
begin
 if not public.can_manage_portal_access() then raise exception 'Access manager permission required' using errcode='42501'; end if;
 if changes_in is null or jsonb_typeof(changes_in)<>'array' then raise exception 'Expected employee changes' using errcode='22023'; end if;
 if jsonb_array_length(changes_in) not between 1 and 300 then raise exception 'Select between 1 and 300 employees' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(changes_in) x where jsonb_typeof(x)<>'object' or x->>'user_id' is null) or (select count(distinct x->>'user_id') from jsonb_array_elements(changes_in) x)<>jsonb_array_length(changes_in) then raise exception 'Invalid or duplicate employee' using errcode='22023'; end if;
 -- Consistent lock order, existing authorization/validation/audit, one atomic transaction.
 for item in select x from jsonb_array_elements(changes_in) x order by x->>'user_id' loop
  perform public.save_portal_access('user',item->>'user_id',item->'settings',(item->>'expected_revision')::integer,item->>'role',item->>'department',(item->>'expected_profile_updated_at')::timestamptz);
 end loop;
end $$;
revoke all on function public.save_portal_access_bulk(jsonb) from public,anon;
grant execute on function public.save_portal_access_bulk(jsonb) to authenticated;
commit;
