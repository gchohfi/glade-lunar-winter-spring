import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const directory = new URL("../migrations/", import.meta.url);
const hardening = "20260908232808_game_server_only_access.sql";

test("Supabase API roles cannot read or modify private game and Better Auth tables", async () => {
  const pg = new PGlite();
  try {
    await pg.exec("create role anon; create role authenticated; create table _migrations (name text primary key, applied_at timestamptz default now());");
    for (const name of readdirSync(directory).filter((n) => n.endsWith(".sql")).sort()) {
      await pg.exec(readFileSync(new URL(name, directory), "utf8"));
    }
    const tables = await pg.query("select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by c.relname");
    assert.equal(tables.rows.length, 15);
    assert.ok(tables.rows.every((r) => r.relrowsecurity));
    for (const role of ["anon", "authenticated"]) {
      const access = await pg.query("select has_table_privilege($1, 'public.players', 'SELECT,INSERT,UPDATE,DELETE') as players, has_table_privilege($1, 'public.account', 'SELECT') as credentials, has_function_privilege($1, 'public.protect_connected_player()', 'EXECUTE') as trigger_access", [role]);
      assert.deepEqual(access.rows[0], { players: false, credentials: false, trigger_access: false });
      await pg.exec(`set role ${role}`);
      await assert.rejects(pg.query("select * from public.account"), /permission denied/);
      await assert.rejects(pg.query("insert into public.players (user_id) values ('not-authorized')"), /permission denied/);
      await pg.exec("reset role");
    }
    // The existing server owner can persist state; enabling RLS does not break it.
    await pg.exec("insert into players (user_id, child_name) values ('fixture-owner', 'Teste');");
    assert.equal((await pg.query("select count(*)::integer as count from players")).rows[0].count, 1);
    // Even an accidental API grant remains blocked by RLS, with no allow policies.
    await pg.exec("grant select on players to anon; set role anon;");
    assert.deepEqual((await pg.query("select * from players")).rows, []);
    await pg.exec("reset role");
    await pg.exec(readFileSync(new URL(hardening, directory), "utf8"));
    assert.equal((await pg.query("select has_table_privilege('anon', 'public.players', 'SELECT') as allowed")).rows[0].allowed, false);
  } finally {
    await pg.close();
  }
});
