const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { isAuthenticated, requirePermission } = require('../middleware/auth');

router.use(isAuthenticated);
router.use(requirePermission('schedule_view'));

const CRITICALITY = [
  { value: 0, label: 'Arrêt',    color: '#374151', bg: '#1f2937' },  // 0 = not running
  { value: 1, label: 'Faible',   color: '#6b7280', bg: '#f3f4f6' },
  { value: 2, label: 'Moyen',    color: '#1d4ed8', bg: '#dbeafe' },
  { value: 3, label: 'Élevé',    color: '#d97706', bg: '#fef3c7' },
  { value: 4, label: 'Critique', color: '#dc2626', bg: '#fee2e2' },
];

const DAYS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const DAY_COLS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];

function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// Day index: Mon=0 … Sun=6 (same as station_schedule)
function dayIndex(isoDate) {
  const d = new Date(isoDate + 'T12:00:00');
  const dow = d.getDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1;
}

// ── GET /planification-optimisee ──────────────────────────────────────────────
router.get('/', (req, res) => {
  const date  = req.query.date  || tomorrowISO();
  const shift = req.query.shift || 'Jour';

  const dept = req.session.user.role === 'admin'
    ? (req.session.adminDept || '')
    : (req.session.user.department || '');

  const month      = date.slice(0, 7);
  const weekStart  = getMondayOf(date);
  const dayIdx     = dayIndex(date);
  const dayLabel   = DAYS_FR[new Date(date + 'T12:00:00').getDay()];

  // 1. Load stations for this dept
  let stSql    = 'SELECT * FROM station_instances';
  let stParams = [];
  if (dept) { stSql += ' WHERE department = ?'; stParams.push(dept); }
  stSql += ' ORDER BY station_key, name';

  db.all(stSql, stParams, (err, stations) => {
    if (err) return res.status(500).send('Erreur');
    if (!stations.length) {
      return res.render('plan-optimized/index', {
        title: 'Planification Optimisée',
        stations: [], suggestions: {}, criticalities: {},
        date, shift, dayLabel, weekStart, dayIdx,
        CRITICALITY, dept, message: req.query.message
      });
    }

    const stIds = stations.map(s => s.id);

    // 2. Load saved criticalities for this date
    db.all(
      `SELECT * FROM station_criticality WHERE date = ? AND station_instance_id IN (${stIds.map(() => '?').join(',')})`,
      [date, ...stIds],
      (err2, critRows) => {
        if (err2) return res.status(500).send('Erreur');
        const criticalities = {};
        critRows.forEach(r => { criticalities[r.station_instance_id] = r.criticality; });

        // 3. Load all active employees with station training + shift
        const stationKeys = [...new Set(stations.map(s => s.station_key))];
        const keyCols = stationKeys.join(', ');
        const empSql = dept
          ? `SELECT id, nom, shift, ${keyCols} FROM employees WHERE department = ? AND shift = ? AND (statut = 'Actif' OR statut IS NULL) ORDER BY nom`
          : `SELECT id, nom, shift, ${keyCols} FROM employees WHERE shift = ? AND (statut = 'Actif' OR statut IS NULL) ORDER BY nom`;
        const empParams = dept ? [dept, shift] : [shift];

        db.all(empSql, empParams, (err3, employees) => {
          if (err3) return res.status(500).send('Erreur');

          const empIds = employees.map(e => e.id);
          if (!empIds.length) {
            return res.render('plan-optimized/index', {
              title: 'Planification Optimisée',
              stations, suggestions: {}, criticalities,
              date, shift, dayLabel, weekStart, dayIdx,
              CRITICALITY, dept, message: req.query.message
            });
          }

          // 4. Load productivity scores for current month
          db.all(
            `SELECT * FROM employee_productivity WHERE month = ? AND employee_id IN (${empIds.map(() => '?').join(',')})`,
            [month, ...empIds],
            (err4, prodRows) => {
              if (err4) return res.status(500).send('Erreur');

              // prodMap[empId][stationKey] = score
              const prodMap = {};
              prodRows.forEach(r => {
                if (!prodMap[r.employee_id]) prodMap[r.employee_id] = {};
                prodMap[r.employee_id][r.station_key] = r.score;
              });

              // 5. Build suggestions per station
              // suggestions[stationId] = [ { emp, score, rank }, ... ] sorted best first
              const suggestions = {};
              stations.forEach(station => {
                const key = station.station_key;
                const crit = criticalities[station.id] || 1;

                // Candidates: trained on this station
                const candidates = employees
                  .filter(e => (e[key] || '').trim() === 'Oui')
                  .map(e => ({
                    id:    e.id,
                    nom:   e.nom,
                    shift: e.shift,
                    score: (prodMap[e.id] && prodMap[e.id][key] !== undefined)
                      ? prodMap[e.id][key]
                      : null   // null = no score yet
                  }))
                  .sort((a, b) => {
                    // Sort: scored first (desc), then unscored alphabetically
                    if (a.score !== null && b.score !== null) return b.score - a.score;
                    if (a.score !== null) return -1;
                    if (b.score !== null) return 1;
                    return a.nom.localeCompare(b.nom);
                  });

                // Take top N — need at least 4 to support 2-slot view with high/low crit offset
                suggestions[station.id] = candidates.slice(0, Math.max(station.max_operators + 2, 4));
              });

              res.render('plan-optimized/index', {
                title: 'Planification Optimisée',
                stations, suggestions, criticalities,
                date, shift, dayLabel, weekStart, dayIdx,
                CRITICALITY, dept, message: req.query.message
              });
            }
          );
        });
      }
    );
  });
});

// ── POST /planification-optimisee/criticality ─────────────────────────────────
// Save criticality levels for a given date
router.post('/criticality', (req, res) => {
  const { date, shift } = req.body;
  const entries = [];
  Object.entries(req.body).forEach(([key, val]) => {
    if (!key.startsWith('crit_')) return;
    const stationId = parseInt(key.replace('crit_', ''));
    const crit = parseInt(val);
    if (!isNaN(stationId) && crit >= 1 && crit <= 4) {
      entries.push([stationId, date, crit]);
    }
  });

  if (!entries.length) return res.redirect(`/planification-optimisee?date=${date}&shift=${shift}`);

  let done = 0;
  entries.forEach(([stId, dt, cr]) => {
    db.run(
      `INSERT INTO station_criticality (station_instance_id, date, criticality) VALUES (?,?,?)
       ON CONFLICT(station_instance_id, date) DO UPDATE SET criticality = excluded.criticality`,
      [stId, dt, cr],
      () => { if (++done === entries.length) res.redirect(`/planification-optimisee?date=${date}&shift=${shift}&message=Criticités sauvegardées`); }
    );
  });
});

// ── POST /planification-optimisee/apply ───────────────────────────────────────
// Apply selected suggestions to station_schedule
router.post('/apply', (req, res) => {
  const { date, shift, week_start, day_idx } = req.body;
  const dayIndex = parseInt(day_idx);

  // Collect stopped stations (criticality = 0) — skip their assignments
  const stoppedStations = new Set();
  Object.entries(req.body).forEach(([key, val]) => {
    if (key.startsWith('crit_') && parseInt(val) === 0) {
      stoppedStations.add(parseInt(key.replace('crit_', '')));
    }
  });

  // assignments: assign_stationId_slotIndex = employee_name (skip stopped stations)
  const entries = [];
  Object.entries(req.body).forEach(([key, val]) => {
    if (!key.startsWith('assign_')) return;
    const parts = key.split('_');
    const stationId = parseInt(parts[1]);
    const slotIndex = parseInt(parts[2]);
    if (stoppedStations.has(stationId)) return; // skip — station not running
    if (!isNaN(stationId) && !isNaN(slotIndex) && val && val.trim()) {
      entries.push([stationId, slotIndex, val.trim()]);
    }
  });

  if (!entries.length) return res.redirect(`/planification-optimisee?date=${date}&shift=${shift}&message=Aucune suggestion appliquée`);

  // Server-side duplicate check — same operator can't be at 2 stations same day
  const empCount = {};
  entries.forEach(([, , empName]) => { empCount[empName] = (empCount[empName] || 0) + 1; });
  const dupes = Object.keys(empCount).filter(n => empCount[n] > 1);
  if (dupes.length) {
    const msg = encodeURIComponent('Conflit: ' + dupes.join(', ') + ' assigné(s) à plusieurs postes');
    return res.redirect(`/planification-optimisee?date=${date}&shift=${shift}&message=${msg}`);
  }

  // Delete existing for this day+shift+stations, then insert
  const stationIds = [...new Set(entries.map(e => e[0]))];
  db.run(
    `DELETE FROM station_schedule WHERE week_start = ? AND shift = ? AND day_index = ?
     AND station_instance_id IN (${stationIds.map(() => '?').join(',')})`,
    [week_start, shift, dayIndex, ...stationIds],
    (err) => {
      if (err) return res.status(500).send('Erreur');

      let done = 0;
      const empDayMap = {};

      entries.forEach(([stId, slotIdx, empName]) => {
        db.run(
          `INSERT OR REPLACE INTO station_schedule (week_start, shift, station_instance_id, day_index, slot_index, employee_name)
           VALUES (?,?,?,?,?,?)`,
          [week_start, shift, stId, dayIndex, slotIdx, empName],
          () => {
            // Also collect for schedule_weeks sync
            if (!empDayMap[empName]) empDayMap[empName] = {};
            db.get('SELECT name FROM station_instances WHERE id = ?', [stId], (e, si) => {
              if (si && !empDayMap[empName][dayIndex]) empDayMap[empName][dayIndex] = si.name;
              if (++done === entries.length) {
                // Sync to schedule_weeks
                const empNames = Object.keys(empDayMap);
                if (!empNames.length) return res.redirect(`/planification-optimisee?date=${date}&shift=${shift}&message=Planning appliqué — Plan. par Poste et Plan. par Opérateur mis à jour!`);
                db.all(`SELECT id, nom FROM employees WHERE nom IN (${empNames.map(() => '?').join(',')})`, empNames, (e2, empRows) => {
                  if (e2 || !empRows.length) return res.redirect(`/planification-optimisee?date=${date}&shift=${shift}&message=Planning appliqué — Plan. par Poste et Plan. par Opérateur mis à jour!`);
                  let synced = 0;
                  empRows.forEach(emp => {
                    const stName = (empDayMap[emp.nom] || {})[dayIndex];
                    if (!stName) { synced++; if (synced === empRows.length) res.redirect(`/planification-optimisee?date=${date}&shift=${shift}&message=Planning appliqué — Plan. par Poste et Plan. par Opérateur mis à jour!`); return; }
                    const col = DAY_COLS[dayIndex];
                    db.get('SELECT id FROM schedule_weeks WHERE week_start = ? AND employee_id = ?', [week_start, emp.id], (e3, row) => {
                      if (row) {
                        db.run(`UPDATE schedule_weeks SET ${col} = ? WHERE week_start = ? AND employee_id = ?`, [stName, week_start, emp.id],
                          () => { synced++; if (synced === empRows.length) res.redirect(`/planification-optimisee?date=${date}&shift=${shift}&message=Planning appliqué — Plan. par Poste et Plan. par Opérateur mis à jour!`); });
                      } else {
                        const allCols = DAY_COLS;
                        const vals = allCols.map(c => c === col ? stName : '');
                        db.run(`INSERT INTO schedule_weeks (week_start, employee_id, ${allCols.join(',')}) VALUES (?,?,${allCols.map(() => '?').join(',')})`,
                          [week_start, emp.id, ...vals],
                          () => { synced++; if (synced === empRows.length) res.redirect(`/planification-optimisee?date=${date}&shift=${shift}&message=Planning appliqué — Plan. par Poste et Plan. par Opérateur mis à jour!`); });
                      }
                    });
                  });
                });
              }
            });
          }
        );
      });
    }
  );
});

module.exports = router;
