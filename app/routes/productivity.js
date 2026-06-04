const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { isAuthenticated, requirePermission } = require('../middleware/auth');

router.use(isAuthenticated);
router.use(requirePermission('employees_view'));

const STATIONS = [
  { key: 'ip_vav',      label: 'IP VAV' },
  { key: 'ip_stat',     label: 'IP STAT' },
  { key: 'ip_ctrl_2',   label: 'IP CTRL 2' },
  { key: 'smartvue',    label: 'Smartvue' },
  { key: 'unitouch',    label: 'Unitouch' },
  { key: 'iom',         label: 'IOM' },
  { key: 'ip_303',      label: 'IP 303' },
  { key: 'test_1',      label: '1 TEST' },
  { key: 's1000',       label: 'S1000' },
  { key: 'ecbl_4_6',    label: 'ECBL 4/6' },
  { key: 'ecbl_2_3',    label: 'ECBL 2/3' },
  { key: 'ecbl_vav_s',  label: 'ECBL VAV/S' },
  { key: 'kit_demobox', label: 'Kit Demobox' },
  { key: 'vavn_103',    label: '103 VAVN' },
  { key: 'display',     label: 'Display' },
  { key: 'ecy_4_6',     label: 'ECY 4/6' },
  { key: 'ecbos',       label: 'ECBOS' },
  { key: 'resence',     label: 'Resence' },
  { key: 'horyzon',     label: 'Horyzon' },
  { key: 'ecy_2_3',     label: 'ECY 2/3' },
  { key: 'immersion',   label: 'Immersion' },
];

function currentMonth() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
}

function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.toISOString().slice(0, 7);
}

function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1);
  return d.toISOString().slice(0, 7);
}

// ── GET /productivity ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const month = req.query.month || currentMonth();
  const shift = req.query.shift || '';

  const dept = req.session.user.role === 'admin'
    ? (req.session.adminDept || '')
    : (req.session.user.department || '');

  const stationCols = STATIONS.map(s => s.key).join(', ');
  let empSql    = `SELECT id, nom, shift, ${stationCols} FROM employees WHERE (statut = 'Actif' OR statut IS NULL)`;
  let empParams = [];
  if (dept)  { empSql += ' AND department = ?'; empParams.push(dept); }
  if (shift) { empSql += ' AND shift = ?';      empParams.push(shift); }
  empSql += ' ORDER BY shift, nom';

  db.all(empSql, empParams, (err, employees) => {
    if (err) return res.status(500).send('Erreur serveur');

    const empIds = employees.map(e => e.id);
    if (!empIds.length) {
      return res.render('productivity/index', {
        title: 'Productivité Mensuelle',
        employees: [], stations: STATIONS, scores: {},
        month, monthLabel: monthLabel(month), shift,
        prevMonth: prevMonth(month), nextMonth: nextMonth(month),
        dept, message: req.query.message
      });
    }

    db.all(
      `SELECT * FROM employee_productivity
       WHERE month = ? AND employee_id IN (${empIds.map(() => '?').join(',')})`,
      [month, ...empIds],
      (err2, rows) => {
        if (err2) return res.status(500).send('Erreur serveur');

        // scores[empId][stationKey] = score
        const scores = {};
        rows.forEach(r => {
          if (!scores[r.employee_id]) scores[r.employee_id] = {};
          scores[r.employee_id][r.station_key] = r.score;
        });

        res.render('productivity/index', {
          title: 'Productivité Mensuelle',
          employees, stations: STATIONS, scores,
          month, monthLabel: monthLabel(month), shift,
          prevMonth: prevMonth(month), nextMonth: nextMonth(month),
          dept, message: req.query.message
        });
      }
    );
  });
});

// ── POST /productivity/save ───────────────────────────────────────────────────
router.post('/save', (req, res) => {
  const { month, shift } = req.body;
  // scores_empId_stationKey = value
  const entries = [];
  Object.entries(req.body).forEach(([key, val]) => {
    if (!key.startsWith('score_')) return;
    const parts = key.split('_');
    // score_{empId}_{stationKey}  — stationKey may contain underscores
    const empId     = parseInt(parts[1]);
    const stationKey = parts.slice(2).join('_');
    const score = parseInt(val);
    if (!isNaN(empId) && stationKey && !isNaN(score) && score >= 0 && score <= 200) {
      entries.push([empId, stationKey, month, score]);
    }
  });

  if (!entries.length) {
    return res.redirect(`/productivity?month=${month}&shift=${shift || ''}&message=Sauvegardé`);
  }

  let done = 0;
  entries.forEach(([empId, stKey, mo, sc]) => {
    db.run(
      `INSERT INTO employee_productivity (employee_id, station_key, month, score)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(employee_id, station_key, month) DO UPDATE SET score = excluded.score`,
      [empId, stKey, mo, sc],
      () => {
        if (++done === entries.length) {
          res.redirect(`/productivity?month=${month}&shift=${shift || ''}&message=Sauvegardé`);
        }
      }
    );
  });
});

module.exports = router;
