const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { isAuthenticated, requirePermission } = require('../middleware/auth');

router.use(isAuthenticated);
router.use(requirePermission('schedule_view'));

const DAYS     = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const DAY_COLS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];

// 0=Arrêt(grey) 1=Faible(green) 2=Moyen(blue) 3=Élevé(orange) 4=Critique(red)
const CRIT_LABELS = { 0:'Arrêt', 1:'Faible', 2:'Moyen', 3:'Élevé', 4:'Critique' };

function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}
function addWeeks(m, n) {
  const d = new Date(m + 'T12:00:00'); d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}
function formatWeekLabel(m) {
  const d = new Date(m + 'T12:00:00'), end = new Date(d);
  end.setDate(end.getDate() + 6);
  const fmt = dt => dt.toLocaleDateString('fr-CA', { month: 'long', day: 'numeric' });
  return `Semaine du ${fmt(d)} au ${fmt(end)} ${d.getFullYear()}`;
}
function getDayDates(monday) {
  return DAYS.map((_, i) => {
    const d = new Date(monday + 'T12:00:00'); d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  });
}
function getDayLabels(monday) {
  return DAYS.map((day, i) => {
    const d = new Date(monday + 'T12:00:00'); d.setDate(d.getDate() + i);
    return day + ' ' + d.toLocaleDateString('fr-CA', { day:'numeric', month:'short' });
  });
}

// ── GET /planification-optimisee ──────────────────────────────────────────────
router.get('/', (req, res) => {
  const today  = new Date().toISOString().split('T')[0];
  const monday = req.query.week ? getMondayOf(req.query.week) : getMondayOf(today);

  const dept = req.session.user.role === 'admin'
    ? (req.session.adminDept || '') : (req.session.user.department || '');

  let stSql = 'SELECT * FROM station_instances';
  let stParams = [];
  if (dept) { stSql += ' WHERE department = ?'; stParams.push(dept); }
  stSql += ' ORDER BY station_key, name';

  db.all(stSql, stParams, (err, stations) => {
    if (err) return res.status(500).send('Erreur');

    const dayISO = getDayDates(monday);
    const stIds  = stations.map(s => s.id);

    if (!stIds.length) {
      return res.render('plan-optimized/index', {
        title: 'Criticité par Poste', stations: [], critMap: {},
        monday, weekLabel: formatWeekLabel(monday), dayLabels: getDayLabels(monday),
        dayISO, DAYS, prevWeek: addWeeks(monday,-1), nextWeek: addWeeks(monday,1),
        CRIT_LABELS, dept, message: req.query.message
      });
    }

    // Load saved criticalities for this week
    db.all(
      `SELECT station_instance_id, date, criticality FROM station_criticality
       WHERE date >= ? AND date <= ?
         AND station_instance_id IN (${stIds.map(() => '?').join(',')})`,
      [dayISO[0], dayISO[6], ...stIds],
      (err2, rows) => {
        if (err2) return res.status(500).send('Erreur');

        // critMap[stationId][isoDate] = criticality (0-4)
        const critMap = {};
        rows.forEach(r => {
          if (!critMap[r.station_instance_id]) critMap[r.station_instance_id] = {};
          critMap[r.station_instance_id][r.date] = r.criticality;
        });

        res.render('plan-optimized/index', {
          title: 'Criticité par Poste',
          stations, critMap,
          monday, weekLabel: formatWeekLabel(monday),
          dayLabels: getDayLabels(monday), dayISO, DAYS,
          prevWeek: addWeeks(monday,-1), nextWeek: addWeeks(monday,1),
          CRIT_LABELS, dept, message: req.query.message
        });
      }
    );
  });
});

// ── POST /planification-optimisee/save ────────────────────────────────────────
router.post('/save', (req, res) => {
  const { monday } = req.body;
  // cells: crit_{stationId}_{isoDate} = value (0-4 or empty)
  const entries = [];
  Object.entries(req.body).forEach(([key, val]) => {
    if (!key.startsWith('crit_')) return;
    const parts = key.split('_');
    // key = crit_{stationId}_{YYYY-MM-DD}  → parts[1]=stationId, parts[2..4]=date
    const stationId = parseInt(parts[1]);
    const isoDate   = parts.slice(2).join('-'); // re-join date parts
    const crit      = parseInt(val);
    if (!isNaN(stationId) && isoDate && !isNaN(crit) && crit >= 0 && crit <= 4) {
      entries.push([stationId, isoDate, crit]);
    }
  });

  if (!entries.length) return res.redirect(`/planification-optimisee?week=${monday}&message=Rien à sauvegarder`);

  let done = 0;
  entries.forEach(([stId, dt, cr]) => {
    db.run(
      `INSERT INTO station_criticality (station_instance_id, date, criticality) VALUES (?,?,?)
       ON CONFLICT(station_instance_id, date) DO UPDATE SET criticality = excluded.criticality`,
      [stId, dt, cr],
      () => { if (++done === entries.length) res.redirect(`/planification-optimisee?week=${monday}&message=Criticités sauvegardées`); }
    );
  });
});

module.exports = router;
