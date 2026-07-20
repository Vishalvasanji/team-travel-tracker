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
    schemaReady = c.execute(`
      CREATE TABLE IF NOT EXISTS hotel_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        hotel_name TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        UNIQUE (trip_id, player_name)
      )
    `);
  }
  await schemaReady;
  return c;
}
