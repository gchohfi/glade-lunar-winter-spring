-- Missão Tabuada: per-user progress, missions, and fact fluency.

create table if not exists players (
  user_id text primary key,
  child_name text not null default '',
  rank_id text not null default 'cadete',
  consecutive_wins integer not null default 0,
  consecutive_fails integer not null default 0,
  total_missions integer not null default 0,
  prize_cycle integer not null default 0,
  prizes_earned integer not null default 0,
  prizes_claimed integer not null default 0,
  sound_on boolean not null default true,
  onboarded boolean not null default false,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists missions (
  id serial primary key,
  user_id text not null,
  mode text not null default 'multiplication',
  rank_id text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  time_limit_ms integer not null,
  elapsed_ms integer,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  passed boolean not null default false
);

create index if not exists missions_user_id_idx on missions (user_id, started_at desc);

create table if not exists daily_progress (
  user_id text not null,
  day date not null,
  questions_answered integer not null default 0,
  questions_correct integer not null default 0,
  missions_passed integer not null default 0,
  primary key (user_id, day)
);

create index if not exists daily_progress_user_id_idx on daily_progress (user_id, day desc);
