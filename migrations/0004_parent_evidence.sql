-- Additive: no reconstruction of unrecorded answers, help or purchases.
create table parent_security (
  user_id text primary key references "user"(id) on delete cascade,
  pin_hash text not null,
  pin_salt text not null,
  failures integer not null default 0 check (failures between 0 and 5),
  locked_until bigint not null default 0,
  updated_ms bigint not null
);
create table parent_grants (
  token_hash text primary key,
  user_id text not null references "user"(id) on delete cascade,
  session_id text not null references "session"(id) on delete cascade,
  expires_ms bigint not null
);
create index parent_grants_owner on parent_grants(user_id, session_id);

create table learning_events (
  user_id text not null references players(user_id) on delete cascade,
  operation_id text not null,
  kind text not null check (kind in ('answer', 'help')),
  attempt_id text not null,
  match_id text not null,
  fact_key text not null,
  day_key text not null,
  occurred_ms bigint not null,
  payload jsonb not null,
  primary key (user_id, operation_id)
);
create index learning_events_period on learning_events(user_id, day_key, occurred_ms);
create index learning_events_fact on learning_events(user_id, fact_key, day_key, occurred_ms);
create table coin_events (
  user_id text not null references players(user_id) on delete cascade,
  operation_id text not null,
  kind text not null check (kind in ('reward', 'purchase')),
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  day_key text not null,
  occurred_ms bigint not null,
  item_id text,
  attempt_id text,
  primary key (user_id, operation_id)
);
create index coin_events_period on coin_events(user_id, occurred_ms);
create table evidence_versions (
  user_id text primary key references players(user_id) on delete cascade,
  started_ms bigint not null,
  legacy_facts jsonb not null,
  legacy_rewards jsonb not null,
  opening_balance integer not null
);
