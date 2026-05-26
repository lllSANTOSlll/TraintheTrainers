const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { requirePermission } = require('../middleware/auth');

router.use(requirePermission('analytics_view'));

// ── Stations list (Operations) ─────────────────────────────
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

// ── Create tables ──────────────────────────────────────────
db.run(`CREATE TABLE IF NOT EXISTS corrective_actions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id   INTEGER NOT NULL,
  suivi_date    TEXT,
  statut_initial TEXT,
  probleme      TEXT NOT NULL,
  action_plan   TEXT,
  responsable   TEXT,
  due_date      TEXT,
  statut        TEXT DEFAULT 'Ouvert',
  resolved_at   TEXT,
  notes         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
)`);

// ══════════════════════════════════════════════════════════
// 1. KPI ANALYTICS  GET /admin/analytics
// ══════════════════════════════════════════════════════════
router.get('/analytics', (req, res) => {
  const dept = req.session.adminDept || '';

  // Run 5 queries in parallel
  const q1 = new Promise((resolve, reject) => {
    // Suivi entries last 8 weeks, grouped by ISO week + statut
    db.all(`
      SELECT strftime('%Y-W%W', date) as week, statut, COUNT(*) as cnt
      FROM suivi_entries
      WHERE date >= date('now','-56 days')
      GROUP BY week, statut ORDER BY week`, [], (e, r) => e ? reject(e) : resolve(r || []));
  });

  const q2 = new Promise((resolve, reject) => {
    // Training sessions last 6 months
    db.all(`
      SELECT strftime('%Y-%m', COALESCE(date_fin, date_debut)) as month,
             statut, COUNT(*) as cnt
      FROM training_sessions
      WHERE COALESCE(date_fin, date_debut) >= date('now','-180 days')
      GROUP BY month, statut ORDER BY month`, [], (e, r) => e ? reject(e) : resolve(r || []));
  });

  // Totals for stat cards
  const deptCond = dept ? `AND department = '${dept.replace(/'/g,"''")}'` : '';
  const q3 = new Promise((resolve, reject) => {
    db.get(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN statut='Actif' OR statut='Active' THEN 1 ELSE 0 END) as actifs,
      AVG(CAST(nb_stations AS REAL)) as avg_poly
      FROM employees WHERE 1=1 ${deptCond}`, [], (e, r) => e ? reject(e) : resolve(r || {}));
  });
  const q4 = new Promise((resolve, reject) => {
    db.get(`SELECT
      SUM(CASE WHEN statut='À risque' THEN 1 ELSE 0 END) as risque,
      SUM(CASE WHEN statut='À surveiller' THEN 1 ELSE 0 END) as surveiller
      FROM suivi_entries
      WHERE date >= date('now','-7 days')`, [], (e, r) => e ? reject(e) : resolve(r || {}));
  });
  const q5 = new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as open_actions FROM corrective_actions WHERE statut != 'Résolu'`,
      [], (e, r) => e ? reject(e) : resolve(r || {}));
  });

  Promise.all([q1, q2, q3, q4, q5]).then(([suiviRows, sessionRows, empStats, suiviWeek, actionStats]) => {
    res.render('admin/analytics', {
      title: 'KPI & Analytique', user: req.session.user,
      suiviRows: JSON.stringify(suiviRows),
      sessionRows: JSON.stringify(sessionRows),
      empStats, suiviWeek, actionStats, dept
    });
  }).catch(err => res.render('error', { title: 'Erreur', message: err.message, user: req.session.user }));
});

// ══════════════════════════════════════════════════════════
// 2. COVERAGE RISK  GET /admin/coverage
// ══════════════════════════════════════════════════════════
router.get('/coverage', (req, res) => {
  const dept        = req.session.adminDept || '';
  const filterShift = req.query.shift || '';
  const deptCond    = dept ? `AND department = ?` : '';
  const params      = dept ? [dept] : [];
  if (filterShift) { params.push(filterShift); }
  const shiftCond = filterShift ? `AND shift = ?` : '';

  // Active employees
  db.all(`SELECT * FROM employees WHERE (statut='Actif' OR statut='Active') ${deptCond} ${shiftCond} ORDER BY nb_stations DESC`,
    params, (err, employees) => {
      if (err) return res.render('error', { title: 'Erreur', message: err.message, user: req.session.user });

      // Station coverage counts
      const coverage = STATIONS.map(s => {
        const trained = employees.filter(e => (e[s.key] || '').trim() === 'Oui').length;
        const inProg  = employees.filter(e => (e[s.key] || '').trim() === 'En formation').length;
        let risk = 'ok';
        if (trained === 0) risk = 'critical';
        else if (trained === 1) risk = 'danger';
        else if (trained <= 2) risk = 'warning';
        return { ...s, trained, inProg, risk };
      });

      // Polyvalence per employee (% of total STATIONS)
      const total = STATIONS.length;
      const polyvalence = employees.map(e => ({
        nom:   e.nom,
        shift: e.shift,
        dept:  e.department,
        score: e.nb_stations || 0,
        pct:   total ? Math.round(((e.nb_stations || 0) / total) * 100) : 0
      })).sort((a, b) => b.score - a.score);

      // Summary stats
      const critical = coverage.filter(c => c.risk === 'critical').length;
      const danger   = coverage.filter(c => c.risk === 'danger').length;
      const warning  = coverage.filter(c => c.risk === 'warning').length;
      const avgPoly  = polyvalence.length
        ? Math.round(polyvalence.reduce((s, e) => s + e.pct, 0) / polyvalence.length)
        : 0;

      res.render('admin/coverage', {
        title: 'Couverture & Polyvalence', user: req.session.user,
        coverage, polyvalence, employees: employees.length,
        critical, danger, warning, avgPoly, total,
        dept, filterShift
      });
    });
});

// ══════════════════════════════════════════════════════════
// 3. CORRECTIVE ACTIONS  GET /admin/actions
// ══════════════════════════════════════════════════════════
router.get('/actions', (req, res) => {
  const filterStatut = req.query.statut || '';
  let sql = `SELECT ca.*, e.nom as emp_nom, e.shift, e.department
             FROM corrective_actions ca
             JOIN employees e ON e.id = ca.employee_id`;
  const params = [];
  if (filterStatut) { sql += ` WHERE ca.statut = ?`; params.push(filterStatut); }
  sql += ` ORDER BY ca.created_at DESC`;

  db.all(sql, params, (err, actions) => {
    if (err) return res.render('error', { title: 'Erreur', message: err.message, user: req.session.user });

    // Load employees for the "new action" dropdown
    db.all(`SELECT id, nom, shift, department FROM employees WHERE statut='Actif' OR statut='Active' ORDER BY nom`,
      [], (err2, employees) => {
        res.render('admin/actions', {
          title: 'Actions Correctives', user: req.session.user,
          actions, employees: employees || [], filterStatut,
          saved: req.query.saved === '1'
        });
      });
  });
});

// POST /admin/actions — create
router.post('/actions', (req, res) => {
  const { employee_id, suivi_date, statut_initial, probleme, action_plan, responsable, due_date } = req.body;
  if (!employee_id || !probleme)
    return res.redirect('/admin/actions?error=Champs+manquants');

  db.run(`INSERT INTO corrective_actions
    (employee_id, suivi_date, statut_initial, probleme, action_plan, responsable, due_date)
    VALUES (?,?,?,?,?,?,?)`,
    [employee_id, suivi_date || null, statut_initial || null,
     probleme, action_plan || null, responsable || null, due_date || null],
    (err) => {
      if (err) return res.redirect('/admin/actions?error=' + encodeURIComponent(err.message));
      res.redirect('/admin/actions?saved=1');
    });
});

// POST /admin/actions/:id/update — update status / notes
router.post('/actions/:id/update', (req, res) => {
  const { statut, notes, action_plan, responsable, due_date } = req.body;
  const resolved_at = statut === 'Résolu' ? new Date().toISOString().slice(0, 10) : null;

  db.run(`UPDATE corrective_actions SET
    statut=?, notes=?, action_plan=?, responsable=?, due_date=?,
    resolved_at=?, updated_at=datetime('now')
    WHERE id=?`,
    [statut, notes || null, action_plan || null, responsable || null,
     due_date || null, resolved_at, req.params.id],
    (err) => {
      if (err) return res.redirect('/admin/actions?error=' + encodeURIComponent(err.message));
      res.redirect('/admin/actions?saved=1');
    });
});

// DELETE /admin/actions/:id
router.post('/actions/:id/delete', (req, res) => {
  db.run(`DELETE FROM corrective_actions WHERE id=?`, [req.params.id], () => {
    res.redirect('/admin/actions');
  });
});

module.exports = router;
