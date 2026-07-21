import { createClient, type Client } from "@libsql/client";

// Turso (libSQL) connection. In local dev this falls back to a SQLite file so
// the app runs with zero configuration; production requires TURSO_DATABASE_URL
// and TURSO_AUTH_TOKEN.
let client: Client | null = null;
let schemaReady: Promise<unknown> | null = null;

function getClient(): Client {
  if (!client) {
    const url =
      process.env.TURSO_DATABASE_URL ||
      (process.env.NODE_ENV !== "production" ? "file:local.db" : "");
    if (!url) {
      throw new Error(
        "TURSO_DATABASE_URL is not set — create a Turso database and add TURSO_DATABASE_URL / TURSO_AUTH_TOKEN"
      );
    }
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function db(): Promise<Client> {
  const c = getClient();
  if (!schemaReady) {
    schemaReady = (async () => {
      await c.execute(`
        CREATE TABLE IF NOT EXISTS hotel_bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trip_id TEXT NOT NULL,
          player_name TEXT NOT NULL,
          hotel_name TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          confirmation_number TEXT NOT NULL DEFAULT '',
          no_hotel INTEGER NOT NULL DEFAULT 0,
          flying INTEGER NOT NULL DEFAULT 0,
          driving INTEGER NOT NULL DEFAULT 0,
          flight_number TEXT NOT NULL DEFAULT '',
          flight_time TEXT NOT NULL DEFAULT '',
          flight_conf TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          UNIQUE (trip_id, player_name)
        )
      `);
      try {
        await c.execute(
          "ALTER TABLE hotel_bookings ADD COLUMN confirmation_number TEXT NOT NULL DEFAULT ''"
        );
      } catch {
        // Column already exists on databases created before this migration.
      }
      try {
        await c.execute(
          "ALTER TABLE hotel_bookings ADD COLUMN no_hotel INTEGER NOT NULL DEFAULT 0"
        );
      } catch {
        // Column already exists.
      }
      for (const col of [
        "flying INTEGER NOT NULL DEFAULT 0",
        "driving INTEGER NOT NULL DEFAULT 0",
        "flight_number TEXT NOT NULL DEFAULT ''",
        "flight_time TEXT NOT NULL DEFAULT ''",
        "flight_conf TEXT NOT NULL DEFAULT ''",
        "riding_with TEXT NOT NULL DEFAULT ''",
      ]) {
        try {
          await c.execute(`ALTER TABLE hotel_bookings ADD COLUMN ${col}`);
        } catch {
          // Column already exists.
        }
      }
      await c.execute(`
        CREATE TABLE IF NOT EXISTS trip_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trip_id TEXT NOT NULL,
          label TEXT NOT NULL,
          url TEXT NOT NULL,
          added_by TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `);
      await c.execute(`
        CREATE TABLE IF NOT EXISTS trip_venues (
          trip_id TEXT PRIMARY KEY,
          venue TEXT NOT NULL,
          added_by TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `);
      await c.execute(`
        CREATE TABLE IF NOT EXISTS player_parents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_name TEXT NOT NULL,
          parent_name TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          UNIQUE (player_name, parent_name)
        )
      `);
      await c.execute(`
        CREATE TABLE IF NOT EXISTS trip_attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trip_id TEXT NOT NULL,
          player_name TEXT NOT NULL,
          parent_name TEXT NOT NULL,
          going INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          UNIQUE (trip_id, player_name, parent_name)
        )
      `);
    })();
  }
  await schemaReady;
  return c;
}
