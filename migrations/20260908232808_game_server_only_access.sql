-- Better Auth and game data are server-only. Supabase Auth identities do not
-- authorize access to these tables, so there are deliberately no Data API policies.
-- Keep using the existing authenticated server functions and per-user checks.
do $$
declare
  table_name text;
  api_role text;
begin
  foreach table_name in array array[
    '_migrations', 'user', 'session', 'account', 'verification',
    'players', 'missions', 'daily_progress', 'player_operations',
    'parent_security', 'parent_grants', 'learning_events', 'coin_events',
    'evidence_versions', 'legacy_attempt_archives'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public', table_name);
    foreach api_role in array array['anon', 'authenticated'] loop
      -- The local PGlite preview does not create Supabase roles.
      if exists (select 1 from pg_roles where rolname = api_role) then
        execute format('revoke all on table public.%I from %I', table_name, api_role);
      end if;
    end loop;
  end loop;
  revoke all on sequence public.missions_id_seq from public;
  revoke execute on function public.protect_connected_player() from public;
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      execute format('revoke all on sequence public.missions_id_seq from %I', api_role);
      execute format('revoke execute on function public.protect_connected_player() from %I', api_role);
    end if;
  end loop;
end;
$$;

alter function public.protect_connected_player() set search_path = pg_catalog, public;
