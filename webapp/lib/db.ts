import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'fitness.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    UNIQUE NOT NULL,
    password   TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_data (
    user_id             INTEGER PRIMARY KEY,
    profile             TEXT,
    last_plan           TEXT,
    anthropic_key       TEXT,
    usda_key            TEXT,
    yazio_access_token  TEXT,
    yazio_refresh_token TEXT,
    yazio_token_expires TEXT,
    updated_at          TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS weight_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    weight_kg  REAL    NOT NULL,
    date       TEXT    NOT NULL,
    notes      TEXT,
    created_at TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Migrate existing tables: add Yazio columns if missing
const cols = db.prepare("PRAGMA table_info(user_data)").all() as { name: string }[];
const colNames = cols.map(c => c.name);
for (const col of ['yazio_access_token', 'yazio_refresh_token', 'yazio_token_expires']) {
  if (!colNames.includes(col)) {
    db.exec(`ALTER TABLE user_data ADD COLUMN ${col} TEXT`);
  }
}

export default db;
