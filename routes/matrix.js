const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requirePermission, getDeptFilter } = require('../middleware/auth');

router.use(requirePermission('matrix_view'));

// Department access is now controlled via requirePermission('matrix_view')

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

// GET /matrix — branch on department
router.get('/', (req, res) => {
  const dept = getDeptFilter(req);
  const effectiveDept = dept === null ? '' : dept; // admin all = ''

  if (effectiveDept === 'Operations' || effectiveDept === '') {
    // ── Operations: hardcoded stations ──────────────────────────
    const shift = req.query.shift || '';
    const statut = req.query.statut || 'Actif';

    let sql = 'SELECT * FROM employees';
    const params = [];
    const conds = [];
    if (dept !== null) { conds.push('department = ?'); params.push(dept); }
    if (statut) { conds.push('statut = ?'); params.push(statut); }
    if (shift)  { conds.push('shift = ?');  params.push(shift); }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY nom ASC';

    return db.all(sql, params, (err, employees) => {
      if (err) { console.error(err); return res.status(500).send('Erreur serveur'); }
      res.render('matrix/index', {
        title: 'Matrice de formation',
        employees, stations: STATIONS,
        filterShift: shift, filterStatut: statut
      });
    });
  }

  // ── Dynamic matrix (Technicians + future depts) ──────────────
  const shift  = req.query.shift  || '';
  const statut = req.query.statut || 'Actif';

  const empConds = ['department = ?'];
  const empParams = [effectiveDept];
  if (statut) { empConds.push('statut = ?'); empParams.push(statut); }
  if (shift)  { empConds.push('shift = ?');  empParams.push(shift); }
  const empSql = `SELECT * FROM employees WHERE ${empConds.join(' AND ')} ORDER BY nom ASC`;

  db.all(empSql, empParams, (err, employees) => {
    if (err) { console.error(err); return res.status(500).send('Erreur'); }

    db.all('SELECT * FROM matrix_columns WHERE department = ? ORDER BY ordre, id', [effectiveDept], (err, columns) => {
      if (err) { console.error(err); return res.status(500).send('Erreur'); }

      const empIds = employees.map(e => e.id);
      if (empIds.length === 0 || columns.length === 0) {
        return res.render('matrix/dynamic', {
          title: 'Matrice de formation',
          employees, columns, valuesMap: {},
          filterShift: shift, filterStatut: statut,
          dept: effectiveDept, saved: !!req.query.saved
        });
      }

      db.all(
        `SELECT * FROM matrix_values WHERE employee_id IN (${empIds.map(() => '?').join(',')})`,
        empIds, (err, rows) => {
          if (err) { console.error(err); return res.status(500).send('Erreur'); }
          const valuesMap = {};
          rows.forEach(r => {
            if (!valuesMap[r.employee_id]) valuesMap[r.employee_id] = {};
            valuesMap[r.employee_id][r.column_id] = r.value;
          });
          res.render('matrix/dynamic', {
            title: 'Matrice de formation',
            employees, columns, valuesMap,
            filterShift: shift, filterStatut: statut,
            dept: effectiveDept, saved: !!req.query.saved
          });
        }
      );
    });
  });
});

// POST /matrix/dynamic-save — save columns + values in one shot
router.post('/dynamic-save', (req, res) => {
  const dept = getDeptFilter(req);
  const effectiveDept = dept === null ? '' : dept;
  const { new_columns, values_json } = req.body;

  const newNames = (new_columns || '').split('\n').map(s => s.trim()).filter(Boolean);
  const values = (() => { try { return JSON.parse(values_json || '{}'); } catch { return {}; } })();

  // Step 1: insert new columns, then step 2: upsert values
  function upsertValues(allColumns) {
    const colMap = {};
    allColumns.forEach(c => { colMap[c.id] = true; });

    const pairs = [];
    for (const [empId, colVals] of Object.entries(values)) {
      for (const [colId, val] of Object.entries(colVals)) {
        if (colMap[colId]) pairs.push([parseInt(empId), parseInt(colId), val || '']);
      }
    }

    if (pairs.length === 0) return res.redirect('/matrix?saved=1');

    let done = 0;
    pairs.forEach(([empId, colId, val]) => {
      db.run(`INSERT INTO matrix_values (employee_id, column_id, value) VALUES (?,?,?)
              ON CONFLICT(employee_id, column_id) DO UPDATE SET value = excluded.value`,
        [empId, colId, val], () => { if (++done === pairs.length) res.redirect('/matrix?saved=1'); }
      );
    });
  }

  if (newNames.length === 0) {
    return db.all('SELECT * FROM matrix_columns WHERE department = ?', [effectiveDept], (err, cols) => {
      upsertValues(cols || []);
    });
  }

  // Get current max ordre
  db.get('SELECT MAX(ordre) as m FROM matrix_columns WHERE department = ?', [effectiveDept], (err, row) => {
    let ordre = (row && row.m) ? row.m + 1 : 1;
    let inserted = 0;
    newNames.forEach(name => {
      db.run('INSERT INTO matrix_columns (department, name, ordre) VALUES (?,?,?)',
        [effectiveDept, name, ordre++], () => {
          if (++inserted === newNames.length) {
            db.all('SELECT * FROM matrix_columns WHERE department = ?', [effectiveDept], (err, cols) => {
              upsertValues(cols || []);
            });
          }
        }
      );
    });
  });
});

// DELETE /matrix/columns/:id — remove a column
router.delete('/columns/:id', (req, res) => {
  db.run('DELETE FROM matrix_columns WHERE id = ?', [req.params.id], () => {
    res.json({ success: true });
  });
});

module.exports = router;
