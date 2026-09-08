-- Protocol 3 stores one authoritative course state and active attempt per account.
alter table players add column if not exists revision bigint not null default 0;
alter table players add column if not exists protocol_version integer not null default 2;
alter table players add column if not exists active_attempt jsonb;

create table if not exists player_operations (
  user_id text not null references players(user_id) on delete cascade,
  operation_id text not null,
  command_hash text not null,
  command_type text not null,
  outcome jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);

-- A still-open old client (or an old deployment) cannot overwrite a migrated player.
create or replace function protect_connected_player() returns trigger as $$
begin
  if new.revision < 0 or new.protocol_version not in (2, 3) then
    raise exception 'Invalid player revision or protocol';
  end if;
  if tg_op = 'UPDATE' and old.protocol_version = 3 then
    if new.protocol_version <> 3 or new.revision <> old.revision + 1 then
      raise exception 'COURSE_UPDATE_REQUIRED: reload the current application';
    end if;
  end if;
  if new.protocol_version = 3 and (
    jsonb_typeof(new.state) is distinct from 'object'
    or jsonb_typeof(new.state->'course') is distinct from 'object'
    or new.state->'course'->>'version' is distinct from '1'
  ) then
    raise exception 'COURSE_UPDATE_REQUIRED: connected course state required';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists protect_connected_player_state on players;
create trigger protect_connected_player_state
  before insert or update on players
  for each row execute function protect_connected_player();
