-- Incompatible old attempts are preserved, never turned into a new completion.
create table legacy_attempt_archives (
  user_id text primary key references players(user_id) on delete cascade,
  archived_ms bigint not null,
  attempt jsonb not null,
  reason text not null
);
