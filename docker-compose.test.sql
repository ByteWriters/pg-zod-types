create extension if not exists pgcrypto;

create table "basic" (
  "id" uuid primary key default gen_random_uuid(),

  -- Text types
  "text_optional" text,
  "text_required" text not null,
  "text_required_with_default" text not null default 'default_text',
  "text_array" text[],

  -- Number types
  "number_int" integer,
  "number_array" double precision[],

  -- JSON types
  "jsonb" jsonb,
  "jsonb_object" jsonb not null default '{}',
  "jsonb_array" jsonb not null default '[]'
);

-- Auth-table stores verifyable external (not Postgres) access
create table "auth" (
  "id" uuid primary key default gen_random_uuid(),

  "key" text unique not null, -- Some kind of non-secret unique id
  "hash" text not null,       -- Some kind of verifyable hash that belongs to 'key'
  "disabled" boolean not null default true, -- Override for quick disable without changing other fields

  "valid_from" timestamptz not null default now(),
  "valid_until" timestamptz
);

create function f_auth_hash()
returns trigger as $$ begin
  new.hash := crypt(new.hash, gen_salt('bf', 12));
  return new;
end $$ language plpgsql;

create trigger t_auth_hash
  before insert on "auth" for each row
  execute procedure f_auth_hash();

-- User-table represents an application user with 'role' specifying postgres-level access
create type role_type as enum ('user', 'admin');

create table "user" (
  "id" uuid primary key default gen_random_uuid(),
  "auth_id" uuid not null references "auth"("id"),

  "role" role_type not null default 'user',
  "name" text not null
);

-- Type that contains the needed variables to query DB-data
-- (these are set as transaction variables)
-- Should only be returned when a user has verified auth
create type "user_auth_type" as ("id" uuid, "role" role_type);

create type "custom_array_type" as ("id" uuid, "roles" role_type[]);

create table "edge_cases" (
  "id" serial primary key,
  "type" custom_array_type[]
);

create function f_user_authorize(
  "user_id" uuid, "key" text, "hash" text
) returns user_auth_type as $$
  select u.id, u.role from "user" u
  inner join "auth" auth on u.auth_id = auth.id
  where
    auth.hash = crypt($3, auth.hash) and -- first to always have ~the same delay from this function
    u.id = $1 and
    auth.key = $2 and
    auth.valid_from < now() and
    (auth.valid_until is null or auth.valid_until > now());
$$ language sql security definer;
