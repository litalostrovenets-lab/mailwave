-- ===== מערכת המיילים: טבלאות =====
-- להריץ פעם אחת ב Supabase: SQL Editor > New query > להדביק הכל > Run.

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  phone text,
  created_at timestamptz not null default now(),
  -- מלא = האדם הוסר (ביקש הסרה, דיווח ספאם או שהכתובת חזרה). לא שולחים לו יותר.
  unsubscribed_at timestamptz
);

create table if not exists list_members (
  contact_id uuid not null references contacts(id) on delete cascade,
  list_id text not null,
  joined_at timestamptz not null default now(),
  primary key (contact_id, list_id)
);
create index if not exists list_members_list_idx on list_members (list_id);

-- כל מייל שיצא (או שניסו להוציא). השורה נתפסת לפני השליחה, כך שאותו מייל
-- לעולם לא יוצא פעמיים לאותו אדם, גם אם השליחה נפלה באמצע.
create table if not exists sends (
  id bigserial primary key,
  contact_id uuid not null references contacts(id) on delete cascade,
  email text not null,
  kind text not null,              -- sequence | broadcast | test
  source_id text not null,         -- מזהה הרצף או השידור
  step_id text not null,           -- מזהה המייל ברצף (בשידור = מזהה השידור)
  status text not null default 'claimed',  -- claimed | sent | failed
  resend_id text,
  error text,
  created_at timestamptz not null default now(),
  unique (contact_id, source_id, step_id)
);
create index if not exists sends_resend_idx on sends (resend_id);
create index if not exists sends_step_idx on sends (source_id, step_id);

-- אירועים שמגיעים מ Resend (נמסר, נפתח, נלחץ, חזר, ספאם)
create table if not exists email_events (
  id bigserial primary key,
  resend_id text,
  type text not null,              -- delivered | opened | clicked | bounced | complained
  email text,
  source_id text,
  step_id text,
  link text,
  created_at timestamptz not null default now()
);
create index if not exists email_events_step_idx on email_events (source_id, step_id, type);

create table if not exists unsubscribes (
  id bigserial primary key,
  contact_id uuid references contacts(id) on delete cascade,
  email text,
  source_id text,
  step_id text,
  created_at timestamptz not null default now()
);
create index if not exists unsubscribes_step_idx on unsubscribes (source_id, step_id);

-- ===== סיכומים למסך =====
create or replace view step_send_counts as
  select source_id, step_id, count(*)::int as n
  from sends where status = 'sent' and kind <> 'test'
  group by source_id, step_id;

create or replace view step_event_counts as
  select source_id, step_id, type, count(distinct email)::int as n
  from email_events where source_id is not null
  group by source_id, step_id, type;

create or replace view step_unsub_counts as
  select source_id, step_id, count(*)::int as n
  from unsubscribes
  group by source_id, step_id;

create or replace view list_counts as
  select m.list_id, count(*)::int as n
  from list_members m join contacts c on c.id = m.contact_id
  where c.unsubscribed_at is null
  group by m.list_id;

-- ===== אבטחה =====
-- נעילה מלאה: אין גישה מהדפדפן בכלל. רק השרת (עם מפתח service role) קורא וכותב.
alter table contacts enable row level security;
alter table list_members enable row level security;
alter table sends enable row level security;
alter table email_events enable row level security;
alter table unsubscribes enable row level security;
revoke all on step_send_counts, step_event_counts, step_unsub_counts, list_counts from anon, authenticated;
