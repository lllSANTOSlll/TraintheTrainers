const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { isAuthenticated, getDeptFilter } = require('../middleware/auth');

// ── Create table on first run ──────────────────────────────────────
db.run(`CREATE TABLE IF NOT EXISTS suivi_entries (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id  INTEGER NOT NULL,
  date         TEXT    NOT NULL,
  statut       TEXT    NOT NULL,
  commentaire  TEXT,
  created_at   TEXT    DEFAULT (datetime('now')),
  updated_at   TEXT    DEFAULT (datetime('now')),
  UNIQUE(employee_id, date)
)`);

// ── Helpers ────────────────────────────────────────────────────────
function getMondayOf(dateStr) {
  const d   = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const MONTHS_FR = ['janv.','févr.','mars','avr.','mai','juin',
                   'juil.','août','sept.','oct.','nov.','déc.'];

// ── GET /suivi ─────────────────────────────────────────────────────
router.get('/', isAuthenticated, (req, res) => {
  const user      = req.session.user;
  const dept      = getDeptFilter(req);           // null = all (admin), string = dept
  const today     = new Date().toISOString().slice(0, 10);

  const weekParam = req.query.week;
  const weekStart = weekParam ? getMondayOf(weekParam) : getMondayOf(today);

  // Build Mon–Fri
  const days      = [];
  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
  const dayDates  = [];
  for (let i = 0; i < 5; i++) {
    const d  = addDays(weekStart, i);
    const dt = new Date(d + 'T12:00:00');
    days.push(d);
    dayDates.push(`${dt.getDate()} ${MONTHS_FR[dt.getMonth()]}`);
  }
  const weekEnd = days[4];

  // Week label
  const s  = new Date(weekStart + 'T12:00:00');
  const e  = new Date(weekEnd   + 'T12:00:00');
  const weekLabel = `${s.getDate()} – ${e.getDate()} ${MONTHS_FR[e.getMonth()]} ${e.getFullYear()}`;

  const filterShift = req.query.shift || '';

  let sql    = `SELECT * FROM employees WHERE statut = 'Actif'`;
  const params = [];
  if (dept && dept !== '__no_dept__') { sql += ` AND department = ?`; params.push(dept); }
  if (dept === '__no_dept__')         { sql += ` AND 1=0`; }
  if (filterShift)                    { sql += ` AND shift = ?`; params.push(filterShift); }
  sql += ` ORDER BY nom`;

  db.all(sql, params, (err, employees) => {
    if (err) return res.render('error', { title: 'Erreur', message: err.message, user });

    if (!employees.length) {
      return res.render('suivi/index', {
        title: 'Suivi Employés', user,
        employees: [], suiviMap: {}, days, dayLabels, dayDates,
        weekStart, weekLabel,
        prevWeek: addDays(weekStart, -7),
        nextWeek: addDays(weekStart,  7),
        filterShift, today
      });
    }

    const empIds       = employees.map(e => e.id);
    const placeholders = empIds.map(() => '?').join(',');

    db.all(
      `SELECT * FROM suivi_entries
       WHERE employee_id IN (${placeholders}) AND date >= ? AND date <= ?`,
      [...empIds, weekStart, weekEnd],
      (err2, entries) => {
        if (err2) return res.render('error', { title: 'Erreur', message: err2.message, user });

        const suiviMap = {};
        (entries || []).forEach(e => {
          suiviMap[`${e.employee_id}_${e.date}`] = e;
        });

        res.render('suivi/index', {
          title: 'Suivi Employés', user,
          employees, suiviMap, days, dayLabels, dayDates,
          weekStart, weekLabel,
          prevWeek: addDays(weekStart, -7),
          nextWeek: addDays(weekStart,  7),
          filterShift, today
        });
      }
    );
  });
});

// ── POST /suivi/entry — save / update ─────────────────────────────
router.post('/entry', isAuthenticated, (req, res) => {
  const { employee_id, date, statut, commentaire } = req.body;
  if (!employee_id || !date || !statut)
    return res.status(400).json({ error: 'Champs manquants' });

  db.run(
    `INSERT INTO suivi_entries (employee_id, date, statut, commentaire, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(employee_id, date) DO UPDATE SET
       statut      = excluded.statut,
       commentaire = excluded.commentaire,
       updated_at  = datetime('now')`,
    [employee_id, date, statut, commentaire || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// ── DELETE /suivi/entry/:empId/:date — clear ──────────────────────
router.delete('/entry/:empId/:date', isAuthenticated, (req, res) => {
  db.run(
    `DELETE FROM suivi_entries WHERE employee_id = ? AND date = ?`,
    [req.params.empId, req.params.date],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

module.exports = router;
