const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { requirePermission } = require('../middleware/auth');

router.use(requirePermission('schedule_view'));

const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

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
  const monday = req.query.week ? getMondayOf(req.query.week) : getMondayOf(new Date());
  const shift  = req.query.shift || 'Jour';   // 'Jour' or 'Soir'

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
        monday, shift, weekLabel: formatWeekLabel(monday),
        dayDates: getDayDates(monday), DAYS,
        prevWeek: addWeeks(monday, -1), nextWeek: addWeeks(monday, 1),
        dept, message: req.query.message
      });
    }

    // 2. Load active employees — filtered by shift AND station training
    const stationKeys = [...new Set(stations.map(s => s.station_key))];
    const keyCols = stationKeys.join(', ');
    const empSql = dept
      ? `SELECT id, nom, shift, ${keyCols} FROM employees WHERE department = ? AND shift = ? AND (statut = 'Actif' OR statut IS NULL) ORDER BY nom`
      : `SELECT id, nom, shift, ${keyCols} FROM employees WHERE shift = ? AND (statut = 'Actif' OR statut IS NULL) ORDER BY nom`;
    const empParams = dept ? [dept, shift] : [shift];

    db.all(empSql, empParams, (err2, employees) => {
      if (err2) return res.status(500).send('Erreur serveur');

      // employeesByKey: only those with 'Oui' for that station type
      const employeesByKey = {};
      stationKeys.forEach(key => {
        employeesByKey[key] = employees.filter(e => (e[key] || '').trim() === 'Oui');
      });

      // 3. Load saved assignments for this week + shift
      const stationIds = stations.map(s => s.id);
      db.all(
        `SELECT * FROM station_schedule
         WHERE week_start = ? AND shift = ?
           AND station_instance_id IN (${stationIds.map(() => '?').join(',')})`,
        [monday, shift, ...stationIds],
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
            monday, shift, weekLabel: formatWeekLabel(monday),
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
  const { week_start, shift, assignments } = req.body;
  const activeShift = shift || 'Jour';
  let parsed = {};
  try { parsed = JSON.parse(assignments || '{}'); } catch {}

  const dept = req.session.user.role === 'admin'
    ? (req.session.adminDept || '')
    : (req.session.user.department || '');

  let stationSql    = 'SELECT id FROM station_instances';
  let stationParams = [];
  if (dept) { stationSql += ' WHERE department = ?'; stationParams.push(dept); }

  db.all(stationSql, stationParams, (err, stations) => {
    if (err) return res.status(500).send('Erreur');
    const ids = stations.map(s => s.id);
    if (!ids.length) return res.redirect(`/planification-postes?week=${week_start}&shift=${activeShift}&message=Sauvegardé`);

    // Delete only this week + this shift
    db.run(
      `DELETE FROM station_schedule WHERE week_start = ? AND shift = ?
       AND station_instance_id IN (${ids.map(() => '?').join(',')})`,
      [week_start, activeShift, ...ids],
      (err2) => {
        if (err2) return res.status(500).send('Erreur');

        const entries = Object.entries(parsed).filter(([, v]) => v && v.trim() !== '');
        if (!entries.length) {
          return res.redirect(`/planification-postes?week=${week_start}&shift=${activeShift}&message=Sauvegardé`);
        }

        let done = 0;
        // Also collect assignments for operator planning sync
        // { employeeName -> { dayIndex -> stationName } }
        const empDayMap = {};

        const finish = () => {
          // Sync to schedule_weeks (operator planning)
          if (!Object.keys(empDayMap).length) {
            return res.redirect(`/planification-postes?week=${week_start}&shift=${activeShift}&message=Sauvegardé`);
          }
          const empNames = Object.keys(empDayMap);
          db.all(
            `SELECT id, nom FROM employees WHERE nom IN (${empNames.map(() => '?').join(',')})`,
            empNames,
            (err, empRows) => {
              if (err || !empRows.length) {
                return res.redirect(`/planification-postes?week=${week_start}&shift=${activeShift}&message=Sauvegardé`);
              }
              const nameToId = {};
              empRows.forEach(e => { nameToId[e.nom] = e.id; });

              const DAY_COLS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
              let synced = 0;
              const total = empRows.length;

              empRows.forEach(emp => {
                const days = empDayMap[emp.nom] || {};
                db.get('SELECT * FROM schedule_weeks WHERE week_start = ? AND employee_id = ?',
                  [week_start, emp.id], (err2, row) => {
                    const sets = {};
                    Object.entries(days).forEach(([di, stName]) => {
                      const col = DAY_COLS[parseInt(di)];
                      if (col) sets[col] = stName;
                    });
                    if (!Object.keys(sets).length) {
                      synced++;
                      if (synced === total) res.redirect(`/planification-postes?week=${week_start}&shift=${activeShift}&message=Sauvegardé`);
                      return;
                    }
                    if (row) {
                      const setClauses = Object.keys(sets).map(c => `${c} = ?`).join(', ');
                      db.run(`UPDATE schedule_weeks SET ${setClauses} WHERE week_start = ? AND employee_id = ?`,
                        [...Object.values(sets), week_start, emp.id],
                        () => { synced++; if (synced === total) res.redirect(`/planification-postes?week=${week_start}&shift=${activeShift}&message=Sauvegardé`); }
                      );
                    } else {
                      const allCols = DAY_COLS;
                      const vals = allCols.map(c => sets[c] || '');
                      db.run(`INSERT INTO schedule_weeks (week_start, employee_id, ${allCols.join(',')}) VALUES (?,?,${allCols.map(() => '?').join(',')})`,
                        [week_start, emp.id, ...vals],
                        () => { synced++; if (synced === total) res.redirect(`/planification-postes?week=${week_start}&shift=${activeShift}&message=Sauvegardé`); }
                      );
                    }
                  }
                );
              });
            }
          );
        };

        entries.forEach(([key, empName]) => {
          const [stationId, dayIndex, slotIndex] = key.split('_').map(Number);
          // Find station name for sync
          db.get('SELECT si.name FROM station_instances si WHERE si.id = ?', [stationId], (err, si) => {
            if (si && empName) {
              if (!empDayMap[empName]) empDayMap[empName] = {};
              // Only take first slot per day per employee (avoid overwriting with slot 2)
              if (!empDayMap[empName][dayIndex]) empDayMap[empName][dayIndex] = si.name;
            }
            db.run(
              `INSERT OR REPLACE INTO station_schedule
               (week_start, shift, station_instance_id, day_index, slot_index, employee_name)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [week_start, activeShift, stationId, dayIndex, slotIndex, empName],
              () => { if (++done === entries.length) finish(); }
            );
          });
        });
      }
    );
  });
});

module.exports = router;
