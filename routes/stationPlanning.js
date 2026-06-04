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

function getDayISODates(mondayStr) {
  return DAYS.map((_, i) => {
    const d = new Date(mondayStr + 'T12:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

// ── GET /planification-postes ────────────────────────────────────────────────
router.get('/', (req, res) => {
  const today  = new Date().toISOString().split('T')[0];
  const monday = req.query.week ? getMondayOf(req.query.week) : getMondayOf(today);
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
      const empIds     = employees.map(e => e.id);
      // Use LAST month's productivity scores for planning this month
      const lastMonthDate = new Date(monday + 'T12:00:00');
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const month = lastMonthDate.toISOString().slice(0, 7); // YYYY-MM of last month

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

          // 4. Load productivity scores — prefer LAST month, fall back to the
          //    most recent month available for that operator+station (so a
          //    station that only has current-month data still shows a %).
          const loadProd = (cb) => {
            if (!empIds.length) return cb({});
            db.all(
              `SELECT employee_id, station_key, score, month FROM employee_productivity
               WHERE employee_id IN (${empIds.map(() => '?').join(',')})
               ORDER BY month ASC`,
              empIds,
              (err4, prodRows) => {
                if (err4) return cb({});
                // For each emp+station: keep last-month score if present,
                // otherwise the latest month <= ... actually just latest available.
                // prodMap[empId][stationKey] = score
                const prodMap = {};
                const chosenMonth = {}; // empId|key -> month chosen
                prodRows.forEach(r => {
                  if (!prodMap[r.employee_id]) prodMap[r.employee_id] = {};
                  const k = r.employee_id + '|' + r.station_key;
                  // Exact last-month match always wins
                  if (r.month === month) {
                    prodMap[r.employee_id][r.station_key] = r.score;
                    chosenMonth[k] = month;
                  } else if (chosenMonth[k] !== month) {
                    // Otherwise take the most recent (rows are ASC, so later overwrites)
                    prodMap[r.employee_id][r.station_key] = r.score;
                    chosenMonth[k] = r.month;
                  }
                });
                cb(prodMap);
              }
            );
          };

          loadProd((prodMap) => {
            // Attach score to each employee in employeesByKey
            stationKeys.forEach(key => {
              employeesByKey[key] = employeesByKey[key].map(e => ({
                ...e,
                prodScore: (prodMap[e.id] && prodMap[e.id][key] !== undefined)
                  ? prodMap[e.id][key]
                  : null
              })).sort((a, b) => {
                if (a.prodScore !== null && b.prodScore !== null) return b.prodScore - a.prodScore;
                if (a.prodScore !== null) return -1;
                if (b.prodScore !== null) return 1;
                return a.nom.localeCompare(b.nom);
              });
            });

            // 5. Load criticalities for this week
            const dayISO = getDayISODates(monday);
            db.all(
              `SELECT station_instance_id, date, criticality FROM station_criticality
               WHERE date >= ? AND date <= ?
                 AND station_instance_id IN (${stationIds.map(() => '?').join(',')})`,
              [dayISO[0], dayISO[6], ...stationIds],
              (err5, critRows) => {
                const critMap = {};
                (critRows || []).forEach(r => {
                  if (!critMap[r.station_instance_id]) critMap[r.station_instance_id] = {};
                  critMap[r.station_instance_id][r.date] = r.criticality;
                });

                res.render('station-planning/index', {
                  title: 'Planification par Poste',
                  stations, employeesByKey, assignments, critMap, dayISO,
                  monday, shift, weekLabel: formatWeekLabel(monday),
                  dayDates: getDayDates(monday), DAYS,
                  prevWeek: addWeeks(monday, -1), nextWeek: addWeeks(monday, 1),
                  prodMonth: month, // last month label for display
                  dept, message: req.query.message
                });
              }
            );
          }); // end loadProd
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

        // Server-side: no operator can be at 2 stations on the same day
        const dayEmpMap = {};
        for (const [key, empName] of entries) {
          const parts = key.split('_').map(Number);
          const dayIndex = parts[1]; // stationId_dayIndex_slotIndex
          if (!dayEmpMap[dayIndex]) dayEmpMap[dayIndex] = {};
          if (dayEmpMap[dayIndex][empName]) {
            const msg = encodeURIComponent(`Conflit: ${empName} assigné à plusieurs postes le même jour`);
            return res.redirect(`/planification-postes?week=${week_start}&shift=${activeShift}&message=${msg}`);
          }
          dayEmpMap[dayIndex][empName] = true;
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

// ── POST /planification-postes/auto ──────────────────────────────────────────
// Auto-plan the full week: assign best available operator per station per day
// based on criticality (highest first) and last month's productivity scores.
router.post('/auto', requirePermission('schedule_view'), (req, res) => {
  const { week_start, shift } = req.body;

  const dept = req.session.user.role === 'admin'
    ? (req.session.adminDept || '')
    : (req.session.user.department || '');

  const dayISO = getDayISODates(week_start);

  // Last month for productivity
  const lm = new Date(week_start + 'T12:00:00');
  lm.setMonth(lm.getMonth() - 1);
  const lastMonth = lm.toISOString().slice(0, 7);

  // 1. Load stations
  let stSql = 'SELECT * FROM station_instances';
  let stParams = [];
  if (dept) { stSql += ' WHERE department = ?'; stParams.push(dept); }
  stSql += ' ORDER BY station_key, name';

  db.all(stSql, stParams, (err, stations) => {
    if (err || !stations.length) return res.redirect(`/planification-postes?week=${week_start}&shift=${shift}&message=Aucun poste défini`);

    const stationIds = stations.map(s => s.id);
    const stationKeys = [...new Set(stations.map(s => s.station_key))];
    const keyCols = stationKeys.join(', ');

    // 2. Load employees (by shift + dept, with station training columns)
    const empSql = dept
      ? `SELECT id, nom, ${keyCols} FROM employees WHERE department = ? AND shift = ? AND (statut = 'Actif' OR statut IS NULL) ORDER BY nom`
      : `SELECT id, nom, ${keyCols} FROM employees WHERE shift = ? AND (statut = 'Actif' OR statut IS NULL) ORDER BY nom`;
    const empParams = dept ? [dept, shift] : [shift];

    db.all(empSql, empParams, (err2, employees) => {
      if (err2) return res.status(500).send('Erreur');

      const empIds = employees.map(e => e.id);
      if (!empIds.length) return res.redirect(`/planification-postes?week=${week_start}&shift=${shift}&message=Aucun employé trouvé`);

      // 3. Load productivity — prefer last month, fall back to most recent available
      db.all(
        `SELECT employee_id, station_key, score, month FROM employee_productivity
         WHERE employee_id IN (${empIds.map(() => '?').join(',')})
         ORDER BY month ASC`,
        empIds,
        (err3, prodRows) => {
          const prodMap = {};
          const chosenMonth = {};
          (prodRows || []).forEach(r => {
            if (!prodMap[r.employee_id]) prodMap[r.employee_id] = {};
            const k = r.employee_id + '|' + r.station_key;
            if (r.month === lastMonth) {
              prodMap[r.employee_id][r.station_key] = r.score;
              chosenMonth[k] = lastMonth;
            } else if (chosenMonth[k] !== lastMonth) {
              prodMap[r.employee_id][r.station_key] = r.score;
              chosenMonth[k] = r.month;
            }
          });

          // 4. Load criticalities for the week
          db.all(
            `SELECT station_instance_id, date, criticality FROM station_criticality
             WHERE date >= ? AND date <= ?
               AND station_instance_id IN (${stationIds.map(() => '?').join(',')})`,
            [dayISO[0], dayISO[6], ...stationIds],
            (err4, critRows) => {
              const critMap = {};
              (critRows || []).forEach(r => {
                if (!critMap[r.station_instance_id]) critMap[r.station_instance_id] = {};
                critMap[r.station_instance_id][r.date] = r.criticality;
              });

              // ── GREEDY ASSIGNMENT ALGORITHM ──────────────────────────────
              // For each day: sort stations by criticality DESC, assign best
              // available (unassigned that day) operator per station/slot.
              const scheduleEntries = []; // { stationId, dayIndex, slotIndex, empName }
              const empDayMap = {};       // empName -> { dayIndex -> stationName }

              for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
                const iso = dayISO[dayIdx];
                const usedToday = new Set(); // empNames already assigned this day

                // Sort stations by criticality for this day (highest first, skip Arrêt=0)
                const sortedStations = stations
                  .map(s => ({
                    ...s,
                    crit: (critMap[s.id] && critMap[s.id][iso] !== undefined)
                      ? critMap[s.id][iso] : 1
                  }))
                  .filter(s => s.crit > 0) // skip Arrêt
                  .sort((a, b) => b.crit - a.crit);

                sortedStations.forEach(station => {
                  const key = station.station_key;

                  // Candidates: trained on this station, sorted by prod score DESC
                  const candidates = employees
                    .filter(e => (e[key] || '').trim() === 'Oui')
                    .map(e => ({
                      nom: e.nom,
                      score: (prodMap[e.id] && prodMap[e.id][key] !== undefined)
                        ? prodMap[e.id][key] : -1
                    }))
                    .filter(c => !usedToday.has(c.nom))
                    .sort((a, b) => b.score - a.score);

                  for (let slot = 0; slot < station.max_operators; slot++) {
                    const pick = candidates.shift(); // best available not yet used
                    if (!pick) break;
                    usedToday.add(pick.nom);
                    scheduleEntries.push({ stationId: station.id, dayIdx, slot, empName: pick.nom });
                    // Track for schedule_weeks sync
                    if (!empDayMap[pick.nom]) empDayMap[pick.nom] = {};
                    if (!empDayMap[pick.nom][dayIdx]) empDayMap[pick.nom][dayIdx] = station.name;
                  }
                });
              }

              if (!scheduleEntries.length) {
                return res.redirect(`/planification-postes?week=${week_start}&shift=${shift}&message=Aucune suggestion générée — vérifiez les criticités et la productivité`);
              }

              // 5. Clear existing schedule for this week+shift+stations, then insert
              db.run(
                `DELETE FROM station_schedule WHERE week_start = ? AND shift = ?
                 AND station_instance_id IN (${stationIds.map(() => '?').join(',')})`,
                [week_start, shift, ...stationIds],
                (err5) => {
                  if (err5) return res.status(500).send('Erreur');

                  let done = 0;
                  const total = scheduleEntries.length;

                  scheduleEntries.forEach(({ stationId, dayIdx, slot, empName }) => {
                    db.run(
                      `INSERT INTO station_schedule (week_start, shift, station_instance_id, day_index, slot_index, employee_name)
                       VALUES (?,?,?,?,?,?)`,
                      [week_start, shift, stationId, dayIdx, slot, empName],
                      () => {
                        if (++done === total) {
                          // 6. Sync to schedule_weeks
                          const empNames = Object.keys(empDayMap);
                          if (!empNames.length) return res.redirect(`/planification-postes?week=${week_start}&shift=${shift}&message=Planning auto généré!`);

                          db.all(`SELECT id, nom FROM employees WHERE nom IN (${empNames.map(() => '?').join(',')})`, empNames, (e6, empRows) => {
                            if (e6 || !empRows.length) return res.redirect(`/planification-postes?week=${week_start}&shift=${shift}&message=Planning auto généré!`);

                            const DAY_COLS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
                            let synced = 0;
                            empRows.forEach(emp => {
                              const days = empDayMap[emp.nom] || {};
                              const sets = {};
                              Object.entries(days).forEach(([di, stName]) => {
                                const col = DAY_COLS[parseInt(di)];
                                if (col) sets[col] = stName;
                              });
                              if (!Object.keys(sets).length) { synced++; if (synced === empRows.length) res.redirect(`/planification-postes?week=${week_start}&shift=${shift}&message=Planning auto généré!`); return; }

                              db.get('SELECT id FROM schedule_weeks WHERE week_start = ? AND employee_id = ?', [week_start, emp.id], (e7, row) => {
                                if (row) {
                                  const setClauses = Object.keys(sets).map(c => `${c} = ?`).join(', ');
                                  db.run(`UPDATE schedule_weeks SET ${setClauses} WHERE week_start = ? AND employee_id = ?`,
                                    [...Object.values(sets), week_start, emp.id],
                                    () => { synced++; if (synced === empRows.length) res.redirect(`/planification-postes?week=${week_start}&shift=${shift}&message=Planning auto généré — ${total} assignations!`); });
                                } else {
                                  const allCols = DAY_COLS;
                                  const vals = allCols.map(c => sets[c] || '');
                                  db.run(`INSERT INTO schedule_weeks (week_start, employee_id, ${allCols.join(',')}) VALUES (?,?,${allCols.map(() => '?').join(',')})`,
                                    [week_start, emp.id, ...vals],
                                    () => { synced++; if (synced === empRows.length) res.redirect(`/planification-postes?week=${week_start}&shift=${shift}&message=Planning auto généré — ${total} assignations!`); });
                                }
                              });
                            });
                          });
                        }
                      }
                    );
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

// ── POST /planification-postes/clear ─────────────────────────────────────────
// Clear all assignments for a week + shift
router.post('/clear', requirePermission('schedule_view'), (req, res) => {
  const { week_start, shift } = req.body;

  // Delete all station_schedule entries for this week+shift
  db.run(
    `DELETE FROM station_schedule WHERE week_start = ? AND shift = ?`,
    [week_start, shift],
    (err) => {
      if (err) {
        console.error('Clear week error:', err);
        return res.redirect(`/planification-postes?week=${week_start}&shift=${shift}&message=Erreur lors de l'effacement`);
      }
      res.redirect(`/planification-postes?week=${week_start}&shift=${shift}&message=Semaine effacée`);
    }
  );
});

module.exports = router;
