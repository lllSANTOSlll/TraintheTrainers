const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { requirePermission } = require('../middleware/auth');

router.use(requirePermission('schedule_view'));

const DAYS       = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function addWeeks(mondayStr, n) {
  const d = new Date(mondayStr + 'T12:00:00');
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

function formatWeekLabel(mondayStr) {
  const d   = new Date(mondayStr + 'T12:00:00');
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const fmt = (dt) => dt.toLocaleDateString('fr-CA', { month: 'long', day: 'numeric' });
  return `Semaine du ${fmt(d)} au ${fmt(end)} ${d.getFullYear()}`;
}

function getDayDates(mondayStr) {
  return DAYS.map((_, i) => {
    const d = new Date(mondayStr + 'T12:00:00');
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
  });
}

// ── GET /planification-postes ────────────────────────────────────────────────
router.get('/', (req, res) => {
  const monday = req.query.week
    ? getMondayOf(req.query.week)
    : getMondayOf(new Date());

  const dept = req.session.user.role === 'admin'
    ? (req.session.adminDept || '')
    : (req.session.user.department || '');

  // 1. Load station instances for this dept
  let stationSql    = 'SELECT * FROM station_instances';
  let stationParams = [];
  if (dept) { stationSql += ' WHERE department = ?'; stationParams.push(dept); }
  stationSql += ' ORDER BY station_key, name';

  db.all(stationSql, stationParams, (err, stations) => {
    if (err) return res.status(500).send('Erreur serveur');
    if (!stations.length) {
      return res.render('station-planning/index', {
        title: 'Planification par Poste',
        stations: [], employeesByKey: {}, assignments: {},
        monday, weekLabel: formatWeekLabel(monday),
        dayDates: getDayDates(monday), DAYS,
        prevWeek: addWeeks(monday, -1), nextWeek: addWeeks(monday, 1),
        dept, message: req.query.message
      });
    }

    // 2. Load active employees with their station training data
    const stationKeys = [...new Set(stations.map(s => s.station_key))];
    const keyCols = stationKeys.join(', ');
    const empSql = dept
      ? `SELECT id, nom, shift, ${keyCols} FROM employees WHERE department = ? AND (statut = 'Actif' OR statut IS NULL) ORDER BY nom`
      : `SELECT id, nom, shift, ${keyCols} FROM employees WHERE (statut = 'Actif' OR statut IS NULL) ORDER BY nom`;
    const empParams = dept ? [dept] : [];

    db.all(empSql, empParams, (err2, employees) => {
      if (err2) return res.status(500).send('Erreur serveur');

      // Build employeesByKey: { ip_vav: [{id, nom, shift}, ...], iom: [...], ... }
      const employeesByKey = {};
      stationKeys.forEach(key => {
        employeesByKey[key] = employees.filter(e =>
          (e[key] || '').trim() === 'Oui'
        );
      });

      // 3. Load saved assignments for this week
      const stationIds = stations.map(s => s.id);
      db.all(
        `SELECT * FROM station_schedule
         WHERE week_start = ? AND station_instance_id IN (${stationIds.map(() => '?').join(',')})`,
        [monday, ...stationIds],
        (err3, rows) => {
          if (err3) return res.status(500).send('Erreur serveur');

          // assignments[stationId][dayIndex][slotIndex] = employee_name
          const assignments = {};
          rows.forEach(r => {
            if (!assignments[r.station_instance_id]) assignments[r.station_instance_id] = {};
            if (!assignments[r.station_instance_id][r.day_index]) assignments[r.station_instance_id][r.day_index] = {};
            assignments[r.station_instance_id][r.day_index][r.slot_index] = r.employee_name || '';
          });

          res.render('station-planning/index', {
            title: 'Planification par Poste',
            stations, employeesByKey, assignments,
            monday, weekLabel: formatWeekLabel(monday),
            dayDates: getDayDates(monday), DAYS,
            prevWeek: addWeeks(monday, -1), nextWeek: addWeeks(monday, 1),
            dept, message: req.query.message
          });
        }
      );
    });
  });
});

// ── POST /planification-postes/save ──────────────────────────────────────────
router.post('/save', requirePermission('schedule_view'), (req, res) => {
  const { week_start, assignments } = req.body;
  // assignments is a JSON string: { "stationId_dayIndex_slotIndex": "employee_name", ... }
  let parsed = {};
  try { parsed = JSON.parse(assignments || '{}'); } catch {}

  const dept = req.session.user.role === 'admin'
    ? (req.session.adminDept || '')
    : (req.session.user.department || '');

  // Get station ids for this dept to scope the delete
  let stationSql    = 'SELECT id FROM station_instances';
  let stationParams = [];
  if (dept) { stationSql += ' WHERE department = ?'; stationParams.push(dept); }

  db.all(stationSql, stationParams, (err, stations) => {
    if (err) return res.status(500).send('Erreur');
    const ids = stations.map(s => s.id);
    if (!ids.length) return res.redirect(`/planification-postes?week=${week_start}&message=Sauvegardé`);

    // Delete existing assignments for this week + these stations
    db.run(
      `DELETE FROM station_schedule WHERE week_start = ? AND station_instance_id IN (${ids.map(() => '?').join(',')})`,
      [week_start, ...ids],
      (err2) => {
        if (err2) return res.status(500).send('Erreur');

        // Insert new assignments (skip empty values)
        const entries = Object.entries(parsed).filter(([, v]) => v && v.trim() !== '');
        if (!entries.length) {
          return res.redirect(`/planification-postes?week=${week_start}&message=Sauvegardé`);
        }

        let done = 0;
        entries.forEach(([key, empName]) => {
          const [stationId, dayIndex, slotIndex] = key.split('_').map(Number);
          db.run(
            `INSERT INTO station_schedule (week_start, station_instance_id, day_index, slot_index, employee_name)
             VALUES (?, ?, ?, ?, ?)`,
            [week_start, stationId, dayIndex, slotIndex, empName],
            () => { if (++done === entries.length) res.redirect(`/planification-postes?week=${week_start}&message=Sauvegardé`) }
          );
        });
      }
    );
  });
});

module.exports = router;
