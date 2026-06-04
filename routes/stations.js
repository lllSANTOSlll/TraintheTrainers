const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { isAuthenticated, requirePermission, getDeptFilter } = require('../middleware/auth');

router.use(isAuthenticated);

// Hardcoded station types (same list used throughout the app)
const STATION_TYPES = [
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

// ── LIST ──────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const dept = req.session.user.role === 'admin'
    ? (req.session.adminDept || '')
    : (req.session.user.department || '');

  let sql    = 'SELECT * FROM station_instances';
  let params = [];
  if (dept) { sql += ' WHERE department = ?'; params.push(dept); }
  sql += ' ORDER BY station_key, name';

  db.all(sql, params, (err, stations) => {
    if (err) { console.error(err); return res.status(500).send('Erreur serveur'); }

    // Group by station type for display
    const grouped = {};
    stations.forEach(s => {
      const type = STATION_TYPES.find(t => t.key === s.station_key);
      const label = type ? type.label : s.station_key;
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(s);
    });

    res.render('stations/list', {
      title: 'Postes de travail',
      stations,
      grouped,
      dept,
      message: req.query.message
    });
  });
});

// ── NEW FORM ─────────────────────────────────────────────────────────────────
router.get('/new', requirePermission('stations_edit'), (req, res) => {
  const dept = req.session.user.role === 'admin'
    ? (req.session.adminDept || '')
    : (req.session.user.department || '');

  res.render('stations/form', {
    title: 'Nouveau Poste',
    station: null,
    stationTypes: STATION_TYPES,
    dept,
    action: '/stations'
  });
});

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post('/', requirePermission('stations_edit'), (req, res) => {
  const { name, station_key, max_operators, department } = req.body;
  const dept = req.session.user.role === 'admin'
    ? (department || req.session.adminDept || '')
    : (req.session.user.department || '');

  if (!name || !station_key) {
    return res.redirect('/stations/new?error=Nom+et+type+requis');
  }

  db.run(
    'INSERT INTO station_instances (name, station_key, max_operators, department) VALUES (?, ?, ?, ?)',
    [name.trim(), station_key, parseInt(max_operators) || 1, dept],
    function(err) {
      if (err) { console.error(err); return res.status(500).send('Erreur'); }
      res.redirect('/stations?message=Poste créé');
    }
  );
});

// ── EDIT FORM ─────────────────────────────────────────────────────────────────
router.get('/:id/edit', requirePermission('stations_edit'), (req, res) => {
  const dept = req.session.user.role === 'admin'
    ? (req.session.adminDept || '')
    : (req.session.user.department || '');

  db.get('SELECT * FROM station_instances WHERE id = ?', [req.params.id], (err, station) => {
    if (err || !station) return res.status(404).send('Poste non trouvé');
    res.render('stations/form', {
      title: 'Modifier Poste',
      station,
      stationTypes: STATION_TYPES,
      dept,
      action: `/stations/${station.id}?_method=PUT`
    });
  });
});

// ── UPDATE ────────────────────────────────────────────────────────────────────
router.put('/:id', requirePermission('stations_edit'), (req, res) => {
  const { name, station_key, max_operators, department } = req.body;
  const dept = req.session.user.role === 'admin'
    ? (department || '')
    : (req.session.user.department || '');

  db.run(
    'UPDATE station_instances SET name=?, station_key=?, max_operators=?, department=? WHERE id=?',
    [name.trim(), station_key, parseInt(max_operators) || 1, dept, req.params.id],
    (err) => {
      if (err) { console.error(err); return res.status(500).send('Erreur'); }
      res.redirect('/stations?message=Poste mis à jour');
    }
  );
});

// ── DELETE ────────────────────────────────────────────────────────────────────
router.delete('/:id', requirePermission('stations_edit'), (req, res) => {
  db.run('DELETE FROM station_instances WHERE id = ?', [req.params.id], (err) => {
    if (err) { console.error(err); return res.status(500).send('Erreur'); }
    res.redirect('/stations?message=Poste supprimé');
  });
});

module.exports = router;
