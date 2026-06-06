// db.js - SQLite database initialization and management for puckOFF
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || path.join(__dirname, '..', 'data', 'puckoff.db');

// Ensure parent directories exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`📡 Connecting to SQLite database at: ${dbPath}`);
const db = new Database(dbPath);

// Enable WAL journal mode for high-concurrency read/write performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT,
    equipped_icon INTEGER DEFAULT 1001,
    equipped_puck_id TEXT,
    following TEXT DEFAULT '[]',
    skins TEXT DEFAULT '[]',
    icons TEXT DEFAULT '[1001,1002,1003,1004,1005,1006,1007,1008,1009,1010]',
    zoins INTEGER DEFAULT 0,
    free_packs INTEGER DEFAULT 1,
    ban_until TEXT,
    consecutive_quits INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    rank_points INTEGER DEFAULT 0,
    time_played INTEGER DEFAULT 0,
    loadouts TEXT DEFAULT '[["speed_boost","rocket","shield"],["teleport","bomb_throw","ghost"],["giant","freeze_ray","grapple"]]',
    active_loadout INTEGER DEFAULT 0,
    is_pro INTEGER DEFAULT 0,
    pro_expiry TEXT,
    last_pro_reward INTEGER DEFAULT 0,
    is_legacy INTEGER DEFAULT 0,
    last_login TEXT,
    created_at TEXT,
    online_status TEXT DEFAULT 'offline',
    last_seen TEXT,
    is_admin INTEGER DEFAULT 0,
    stats TEXT DEFAULT '{"gamesPlayed":0,"wins":0,"knockouts":0,"damageDealt":0,"stomps":0,"highestCombo":0}',
    achievements TEXT DEFAULT '[]',
    claimed_season_rewards TEXT DEFAULT '[]',
    daily_quests TEXT DEFAULT '[]',
    last_quest_reset TEXT
  );

  CREATE TABLE IF NOT EXISTS pucks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    icon_id INTEGER NOT NULL,
    tier INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    stats TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(uid) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    target_uid TEXT NOT NULL,
    from_uid TEXT,
    from_name TEXT,
    type TEXT NOT NULL,
    data TEXT,
    timestamp TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    FOREIGN KEY(target_uid) REFERENCES users(uid) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    pack_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL,
    method TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(uid) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS global_stats (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Add missing columns dynamically if the table already existed
try {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('icons')) {
    console.log('✨ Adding missing column "icons" to users table...');
    db.exec("ALTER TABLE users ADD COLUMN icons TEXT DEFAULT '[1001,1002,1003,1004,1005,1006,1007,1008,1009,1010]'");
  }
  if (!columnNames.includes('rank_points')) {
    console.log('✨ Adding missing column "rank_points" to users table...');
    db.exec("ALTER TABLE users ADD COLUMN rank_points INTEGER DEFAULT 0");
  }
} catch (err) {
  console.error('⚠️ Migration check failed:', err);
}

console.log('✅ SQLite Schema initialized successfully.');

module.exports = db;
