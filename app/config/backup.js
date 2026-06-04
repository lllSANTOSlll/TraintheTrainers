'use strict';
// ───────────────────────────────────────────────────────────────────────────
// Automatic daily database backup at 02:35 AM (server local time).
// Uses SQLite "VACUUM INTO" for a consistent snapshot (no torn writes), even
// while the app is running. No external dependencies / cron needed.
//
// Backups are written to BACKUP_DIR (default /app/backups, mounted as a
// Docker volume so they persist on the host). Old backups are pruned to the
// most recent KEEP_COUNT files.
// ───────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs   = require('fs');
const db   = require('./database');

const BACKUP_HOUR   = 2;
const BACKUP_MINUTE = 35;
const KEEP_COUNT    = 30; // keep last 30 daily backups (~1 month)

const dbPath    = process.env.DB_PATH || path.join(__dirname, '../database/trainers.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(dbPath), '..', 'backups');

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('✓ Created backup directory:', BACKUP_DIR);
  }
}

function timestamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function pruneOld() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('trainers-') && f.endsWith('.db'))
      .map(f => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t); // newest first

    files.slice(KEEP_COUNT).forEach(({ f }) => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log('🗑️  Pruned old backup:', f);
    });
  } catch (e) {
    console.error('Backup prune error:', e.message);
  }
}

function runBackup(reason = 'scheduled') {
  ensureDir();
  const dest = path.join(BACKUP_DIR, `trainers-${timestamp()}.db`);
  // VACUUM INTO produces a clean, consistent copy of the live database.
  db.run('VACUUM INTO ?', [dest], (err) => {
    if (err) {
      console.error(`❌ Backup failed (${reason}):`, err.message);
      // Fallback: plain file copy if VACUUM INTO is unsupported
      try {
        fs.copyFileSync(dbPath, dest);
        console.log(`✓ Backup created via file copy (${reason}):`, path.basename(dest));
        pruneOld();
      } catch (e2) {
        console.error('❌ Fallback copy also failed:', e2.message);
      }
      return;
    }
    const sizeKb = (fs.statSync(dest).size / 1024).toFixed(0);
    console.log(`✓ Database backup created (${reason}): ${path.basename(dest)} — ${sizeKb} KB`);
    pruneOld();
  });
}

function msUntilNextRun() {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(BACKUP_HOUR, BACKUP_MINUTE, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // already passed today → tomorrow
  return next - now;
}

function scheduleNext() {
  const delay = msUntilNextRun();
  const nextTime = new Date(Date.now() + delay);
  console.log(`🗓️  Prochaine sauvegarde automatique: ${nextTime.toLocaleString('fr-CA')}`);
  setTimeout(() => {
    runBackup('quotidienne 02:35');
    scheduleNext(); // re-schedule for the following day
  }, delay);
}

function start() {
  ensureDir();
  scheduleNext();
}

module.exports = { start, runBackup, BACKUP_DIR };
