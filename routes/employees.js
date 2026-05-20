const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { isSupervisorOrAdmin, getDeptFilter } = require('../middleware/auth');

router.use(isSupervisorOrAdmin);

// CSV import — memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Upload directories
const photoDir = path.join(__dirname, '../public/uploads/employees');
const attachDir = path.join(__dirname, '../public/uploads/employees/attachments');
if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });
if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true });

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'emp-' + Date.now() + ext);
  }
});
const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Seules les images (JPG, PNG, GIF, WEBP) sont acceptées'));
  }
});

// Attachment upload — disk storage, any file type
const attachStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(attachDir, String(req.params.id));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'att-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + ext);
  }
});
const attachUpload = multer({
  storage: attachStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max
});

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

// ── List ──────────────────────────────────────────────────
router.get('/', (req, res) => {
  const dept = getDeptFilter(req);
  let sql = 'SELECT * FROM employees';
  const params = [];
  if (dept !== null) { sql += ' WHERE department = ?'; params.push(dept); }
  sql += ' ORDER BY nom ASC';
  db.all(sql, params, (err, employees) => {
    if (err) { console.error(err); return res.status(500).send('Erreur serveur'); }
    const noDeptWarning = dept === '__no_dept__';
    res.render('employees/list', { title: 'Employés', employees, stations: STATIONS,
      noDeptWarning, bulkSuccess: req.query.bulkSuccess || null });
  });
});

// ── Bulk assign department ────────────────────────────────
router.post('/bulk-dept', (req, res) => {
  const { department, equipe, scope } = req.body;
  if (!department) return res.redirect('/employees');

  let sql = 'UPDATE employees SET department = ?';
  const params = [department];
  const conds = [];
  if (scope !== 'all') conds.push("(department IS NULL OR department = '')");
  if (equipe && equipe.trim()) { conds.push('equipe = ?'); params.push(equipe.trim()); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');

  db.run(sql, params, function(err) {
    if (err) { console.error(err); return res.status(500).send('Erreur'); }
    res.redirect('/employees?bulkSuccess=' + this.changes);
  });
});

// ── Import CSV page ───────────────────────────────────────
router.get('/import', (req, res) => {
  res.render('employees/import', { title: 'Importer les employés', error: null, count: null,
    userDept: getDeptFilter(req) || '' });
});

router.post('/import', upload.single('csvfile'), (req, res) => {
  const importDept = getDeptFilter(req) || req.body.department || '';
  if (!req.file) {
    return res.render('employees/import', { title: 'Importer les employés', error: 'Aucun fichier sélectionné.', count: null, userDept: importDept });
  }

  const text = req.file.buffer.toString('utf-8');
  let rows;
  try {
    rows = parseCSV(text, STATIONS);
  } catch (e) {
    return res.render('employees/import', { title: 'Importer les employés', error: 'Erreur de parsing: ' + e.message, count: null });
  }

  if (rows.length === 0) {
    return res.render('employees/import', { title: 'Importer les employés', error: 'Aucun employé trouvé dans le fichier.', count: null });
  }

  const stationKeys = STATIONS.map(s => s.key);
  const cols = ['nom','equipe','shift','poste','horaire','date_naissance','date_embauche','date_fin',
    'raison_depart','age','anciennete','courriel','telephone','contact_urgence','taille_chandail',
    'restriction_alimentaire','passion','ambition','preoccupation','why','statut','nb_stations',
    'plan_systeme','plan_processus','plan_general','plan_waterspider','department', ...stationKeys];

  const placeholders = cols.map(() => '?').join(',');
  const sql = `INSERT INTO employees (${cols.join(',')}) VALUES (${placeholders})`;

  let inserted = 0;
  const stmt = db.prepare(sql);
  for (const row of rows) {
    row.department = importDept;
    const vals = cols.map(c => row[c] ?? '');
    stmt.run(vals, (err) => { if (err) console.error('Insert err:', err); });
    inserted++;
  }
  stmt.finalize(() => {
    res.render('employees/import', { title: 'Importer les employés', error: null, count: inserted, userDept: importDept });
  });
});

// ── New form ──────────────────────────────────────────────
router.get('/new', (req, res) => {
  db.all('SELECT id, full_name, username FROM users WHERE role IN ("supervisor","admin") ORDER BY full_name, username', [], (err, supervisors) => {
    res.render('employees/form', { title: 'Nouvel employé', employee: null, stations: STATIONS,
      action: '/employees', userDept: getDeptFilter(req) || '', supervisors: supervisors || [] });
  });
});

// ── Create ────────────────────────────────────────────────
router.post('/', photoUpload.single('photo'), (req, res) => {
  const dept = getDeptFilter(req) || req.body.department || '';
  const data = buildEmployeeData(req.body, STATIONS);
  data.department = dept;
  if (req.file) data.photo = '/uploads/employees/' + req.file.filename;
  const cols = Object.keys(data);
  const sql = `INSERT INTO employees (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
  db.run(sql, Object.values(data), function(err) {
    if (err) { console.error(err); return res.status(500).send('Erreur lors de la création'); }
    res.redirect('/employees/' + this.lastID);
  });
});

// ── Detail ────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM employees WHERE id = ?', [req.params.id], (err, employee) => {
    if (err || !employee) return res.status(404).render('error', { title: '404', message: 'Employé non trouvé', error: { status: 404 } });
    db.all('SELECT * FROM employee_attachments WHERE employee_id = ? ORDER BY created_at DESC',
      [req.params.id], (err2, attachments) => {
        db.all('SELECT * FROM employee_holidays WHERE employee_id = ? ORDER BY date_start DESC',
          [req.params.id], (err3, holidays) => {
            res.render('employees/detail', {
              title: employee.nom, employee, stations: STATIONS,
              attachments: attachments || [],
              holidays: holidays || [],
              holMessage: req.query.holMessage || null,
              holError:   req.query.holError   || null,
            });
          }
        );
      }
    );
  });
});

// ── Add holiday from employee profile ─────────────────────
router.post('/:id/holidays', (req, res) => {
  const { date_start, date_end, type, notes } = req.body;
  const empId = req.params.id;
  if (!date_start || !date_end) {
    return res.redirect(`/employees/${empId}?holError=Dates requises#conges`);
  }
  if (date_end < date_start) {
    return res.redirect(`/employees/${empId}?holError=La date de fin doit être après le début#conges`);
  }
  db.run(
    `INSERT INTO employee_holidays (employee_id, date_start, date_end, type, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [empId, date_start, date_end, type || 'Congé', notes || '', req.session.user.id],
    (err) => {
      if (err) { console.error(err); return res.redirect(`/employees/${empId}?holError=Erreur enregistrement#conges`); }
      res.redirect(`/employees/${empId}?holMessage=Congé enregistré#conges`);
    }
  );
});

// ── Delete holiday from employee profile ──────────────────
router.delete('/:id/holidays/:hid', (req, res) => {
  db.run('DELETE FROM employee_holidays WHERE id = ? AND employee_id = ?',
    [req.params.hid, req.params.id], (err) => {
      if (err) console.error(err);
      res.redirect(`/employees/${req.params.id}?holMessage=Congé supprimé#conges`);
    }
  );
});

// ── Edit form ─────────────────────────────────────────────
router.get('/:id/edit', (req, res) => {
  db.get('SELECT * FROM employees WHERE id = ?', [req.params.id], (err, employee) => {
    if (err || !employee) return res.status(404).send('Employé non trouvé');
    db.all('SELECT id, full_name, username FROM users WHERE role IN ("supervisor","admin") ORDER BY full_name, username', [], (err2, supervisors) => {
      res.render('employees/form', {
        title: 'Modifier ' + employee.nom,
        employee, stations: STATIONS,
        action: `/employees/${employee.id}?_method=PUT`,
        userDept: getDeptFilter(req) || '',
        supervisors: supervisors || []
      });
    });
  });
});

// ── Update ────────────────────────────────────────────────
router.put('/:id', photoUpload.single('photo'), (req, res) => {
  const dept = getDeptFilter(req) || req.body.department || '';
  const data = buildEmployeeData(req.body, STATIONS);
  data.department = dept;

  if (req.file) {
    // Delete old photo if it exists
    db.get('SELECT photo FROM employees WHERE id = ?', [req.params.id], (err, row) => {
      if (row && row.photo) {
        const oldPath = path.join(__dirname, '../public', row.photo);
        if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
      }
    });
    data.photo = '/uploads/employees/' + req.file.filename;
  }

  const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const sql = `UPDATE employees SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  db.run(sql, [...Object.values(data), req.params.id], (err) => {
    if (err) { console.error(err); return res.status(500).send('Erreur'); }
    res.redirect('/employees/' + req.params.id);
  });
});

// ── Delete ────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM employees WHERE id = ?', [req.params.id], (err) => {
    if (err) { console.error(err); return res.status(500).send('Erreur'); }
    res.redirect('/employees');
  });
});

// ── Attachments ───────────────────────────────────────────

// Upload attachments
router.post('/:id/attachments', attachUpload.array('attachments', 20), (req, res) => {
  if (!req.files || req.files.length === 0) return res.redirect('/employees/' + req.params.id);
  const empId = req.params.id;
  const userId = req.session.user ? req.session.user.id : null;
  let done = 0;
  req.files.forEach(file => {
    db.run(
      `INSERT INTO employee_attachments (employee_id, filename, original_name, mimetype, size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [empId, '/uploads/employees/attachments/' + empId + '/' + file.filename,
       file.originalname, file.mimetype, file.size, userId],
      () => { done++; if (done === req.files.length) res.redirect('/employees/' + empId + '#attachments'); }
    );
  });
});

// Download attachment
router.get('/:id/attachments/:attId/download', (req, res) => {
  db.get('SELECT * FROM employee_attachments WHERE id = ? AND employee_id = ?',
    [req.params.attId, req.params.id],
    (err, att) => {
      if (err || !att) return res.status(404).send('Fichier non trouvé');
      const filePath = path.join(__dirname, '../public', att.filename);
      if (!fs.existsSync(filePath)) return res.status(404).send('Fichier introuvable sur le serveur');
      res.download(filePath, att.original_name);
    }
  );
});

// Delete attachment
router.post('/:id/attachments/:attId/delete', (req, res) => {
  db.get('SELECT * FROM employee_attachments WHERE id = ? AND employee_id = ?',
    [req.params.attId, req.params.id],
    (err, att) => {
      if (err || !att) return res.status(404).send('Non trouvé');
      const filePath = path.join(__dirname, '../public', att.filename);
      if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
      db.run('DELETE FROM employee_attachments WHERE id = ?', [att.id], () => {
        res.redirect('/employees/' + req.params.id + '#attachments');
      });
    }
  );
});

// ── Helpers ───────────────────────────────────────────────
function buildEmployeeData(body, stations) {
  const stationKeys = stations.map(s => s.key);
  const data = {
    nom: body.nom || '',
    equipe: body.equipe || '',
    shift: body.shift || '',
    poste: body.poste || '',
    horaire: body.horaire || '',
    date_naissance: body.date_naissance || null,
    date_embauche: body.date_embauche || null,
    date_fin: body.date_fin || null,
    raison_depart: body.raison_depart || '',
    age: body.age || '',
    anciennete: body.anciennete || '',
    courriel: body.courriel || '',
    telephone: body.telephone || '',
    contact_urgence: body.contact_urgence || '',
    taille_chandail: body.taille_chandail || '',
    restriction_alimentaire: body.restriction_alimentaire || '',
    passion: body.passion || '',
    ambition: body.ambition || '',
    preoccupation: body.preoccupation || '',
    why: body.why || '',
    statut: body.statut || 'Actif',
    superviseur: body.superviseur || '',
    photo: body._existing_photo || '',
    plan_systeme: body.plan_systeme || '',
    plan_processus: body.plan_processus || '',
    plan_general: body.plan_general || '',
    plan_waterspider: body.plan_waterspider || '',
  };
  stationKeys.forEach(k => { data[k] = body[k] || ''; });
  data.nb_stations = stationKeys.filter(k => data[k] === 'Oui').length;
  return data;
}

function parseCSVLine(line) {
  const cols = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { field += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      cols.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  cols.push(field.trim());
  return cols;
}

function parseCSV(text, stations) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]).map(h => h.trim());
  const idx = (name) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const COL = {
    nom: idx('Nom'), equipe: idx('Équipe'), shift: idx('Shift'), poste: idx('Poste'),
    horaire: idx('Horaire'), date_naiss: idx('Date de naissance'),
    date_emb: idx("Date d'embauche"), date_fin: idx('Date de fin'),
    raison: idx('Raison de départ'), age: idx('Age'), anciennete: idx('Ancienneté'),
    ip_vav: idx('IP VAV'), ip_stat: idx('IP STAT'), ip_ctrl_2: idx('IP CTRL 2'),
    smartvue: idx('Smartvue'), unitouch: idx('Unitouch'), iom: idx('IOM'),
    ip_303: idx('IP 303'), test_1: idx('1 TEST'), s1000: idx('S1000'),
    ecbl_4_6: idx('ECBL 4/6'), ecbl_2_3: idx('ECBL 2/3'), ecbl_vav_s: idx('ECBL VAV/S'),
    kit_demobox: idx('Kit Demobox'), vavn_103: idx('103 VAVN'), display: idx('Display'),
    ecy_4_6: idx('ECY 4/6'), ecbos: idx('ECBOS'), resence: idx('Resence'),
    horyzon: idx('Horyzon'), ecy_2_3: idx('ECY 2/3'), immersion: idx('Immersion'),
    chandail: idx('Taille chandail'), restriction: idx('Restriction alimentaire'),
    passion: idx('Passion'), ambition: idx('Ambition'), preoccup: idx('Préoccupation'),
    why: idx('Why'), plan_sys: idx('Plan de formation - Système'),
    plan_proc: idx('Plan de formation - Processus'), plan_gen: idx('Plan de formation - Général'),
    plan_ws: idx('Plan de formation - WaterSpider'), courriel: idx('Courriel'),
    telephone: idx('Téléphone'), urgence: idx("Contact en cas d'urgence"),
    statut: idx('Actif / Inactif'),
  };

  const g = (cols, key) => (COL[key] >= 0 ? (cols[COL[key]] || '').trim() : '');

  const stationKeys = stations.map(s => s.key);
  const stationColMap = {
    ip_vav: 'ip_vav', ip_stat: 'ip_stat', ip_ctrl_2: 'ip_ctrl_2', smartvue: 'smartvue',
    unitouch: 'unitouch', iom: 'iom', ip_303: 'ip_303', test_1: 'test_1', s1000: 's1000',
    ecbl_4_6: 'ecbl_4_6', ecbl_2_3: 'ecbl_2_3', ecbl_vav_s: 'ecbl_vav_s',
    kit_demobox: 'kit_demobox', vavn_103: 'vavn_103', display: 'display',
    ecy_4_6: 'ecy_4_6', ecbos: 'ecbos', resence: 'resence', horyzon: 'horyzon',
    ecy_2_3: 'ecy_2_3', immersion: 'immersion',
  };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const nom = g(cols, 'nom').replace(/https?:\/\/\S+/g, '').trim();
    if (!nom) continue;

    const stationData = {};
    stationKeys.forEach(k => { stationData[k] = g(cols, k); });
    const nb = stationKeys.filter(k => stationData[k] === 'Oui').length;

    rows.push({
      nom, equipe: g(cols, 'equipe'), shift: g(cols, 'shift'), poste: g(cols, 'poste'),
      horaire: g(cols, 'horaire'), date_naissance: g(cols, 'date_naiss'),
      date_embauche: g(cols, 'date_emb'), date_fin: g(cols, 'date_fin'),
      raison_depart: g(cols, 'raison'), age: g(cols, 'age'), anciennete: g(cols, 'anciennete'),
      taille_chandail: g(cols, 'chandail'), restriction_alimentaire: g(cols, 'restriction'),
      passion: g(cols, 'passion'), ambition: g(cols, 'ambition'),
      preoccupation: g(cols, 'preoccup'), why: g(cols, 'why'),
      plan_systeme: g(cols, 'plan_sys'), plan_processus: g(cols, 'plan_proc'),
      plan_general: g(cols, 'plan_gen'), plan_waterspider: g(cols, 'plan_ws'),
      courriel: g(cols, 'courriel'), telephone: g(cols, 'telephone'),
      contact_urgence: g(cols, 'urgence'),
      statut: g(cols, 'statut') || 'Actif',
      nb_stations: nb,
      ...stationData
    });
  }
  return rows;
}

module.exports = router;
