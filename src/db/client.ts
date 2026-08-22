import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

import * as schema from "./schema";

export const sqliteDb = openDatabaseSync("rentalshield.db", {
  enableChangeListener: true,
});

// SQLite disables foreign keys per-connection by default, so the cascades
// declared in the schema would silently do nothing. WAL is for concurrent
// reads while a capture writes.
sqliteDb.execSync("PRAGMA foreign_keys = ON;");
sqliteDb.execSync("PRAGMA journal_mode = WAL;");

export const db = drizzle(sqliteDb, { schema });

export type Database = typeof db;
