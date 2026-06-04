require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const methodOverride = require('method-override');

// Import routes
const authRoutes = require('./routes/auth');
const trainerRoutes = require('./routes/trainers');
const evaluationRoutes = require('./routes/evaluations');
const trainingRoutes = require('./routes/training');
const adminRoutes = require('./routes/admin');
const sharepointRoutes = require('./routes/sharepoint');
const checklistRoutes = require('./routes/checklists');
const settingsRoutes = require('./routes/settings');
const employeeRoutes = require('./routes/employees');
const matrixRoutes = require('./routes/matrix');
const scheduleRoutes = require('./routes/schedule');
const displayRoutes = require('./routes/display');
const suiviRoutes          = require('./routes/suivi');
const adminAnalyticsRoutes = require('./routes/adminAnalytics');
const stationsRoutes          = require('./routes/stations');
const stationPlanningRoutes   = require('./routes/stationPlanning');
const productivityRoutes      = require('./routes/productivity');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user available in all views — refresh from DB each request so role/dept changes apply instantly
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.settings = {};
  res.locals.adminDept = '';
  res.locals.accentColor = '#009ADA'; // default Distech blue

  if (!req.session.user) {
    res.locals.user = null;
    return next();
  }

  db.get('SELECT id, username, email, full_name, role, department FROM users WHERE id = ?',
    [req.session.user.id], (err, freshUser) => {
      if (freshUser) req.session.user = freshUser;
      res.locals.user = req.session.user;

      const activeDept = req.session.user.role === 'admin'
        ? (req.session.adminDept || '')
        : (req.session.user.department || '');

      if (req.session.user.role === 'admin') {
        res.locals.adminDept = req.session.adminDept || '';
      } else {
        res.locals.adminDept = activeDept;
      }

      // Load dept accent color + settings from DB
      db.all('SELECT key, value FROM settings', [], (err2, rows) => {
        const s = {};
        if (rows) rows.forEach(r => { s[r.key] = r.value; });
        res.locals.settings = s;

        // Apply accent color for the active department
        const colorKey = activeDept ? `dept_color_${activeDept}` : null;
        res.locals.accentColor = (colorKey && s[colorKey]) ? s[colorKey] : '#009ADA';

        // Expose permission helper to all EJS templates
        const permsModule = require('./config/permissions');
        const _role = req.session.user.role;
        const _dept = req.session.user.department || '';
        res.locals.canPerm = (key) => permsModule.can(_role, key, _dept);

        next();
      });
    }
  );
});

// Routes
app.use('/', authRoutes);
app.use('/trainers', trainerRoutes);
app.use('/evaluations', evaluationRoutes);
app.use('/training', trainingRoutes);
app.use('/checklists', checklistRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/settings', settingsRoutes);
app.use('/sharepoint', sharepointRoutes);
app.use('/employees', employeeRoutes);
app.use('/matrix', matrixRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/display', displayRoutes);
app.use('/suivi',    suiviRoutes);
app.use('/admin',    adminAnalyticsRoutes);
app.use('/stations',             stationsRoutes);
app.use('/planification-postes', stationPlanningRoutes);
app.use('/productivity',         productivityRoutes);
app.use(express.static(path.join(__dirname, 'views')));
// Home route

app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('dashboard', { 
    title: 'Tableau de bord',
    user: req.session.user 
  });
});

// DB migration — create new tables if not present
const db = require('./config/database');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    equipe TEXT, shift TEXT, poste TEXT, horaire TEXT,
    date_naissance TEXT, date_embauche TEXT, date_fin TEXT,
    raison_depart TEXT, age TEXT, anciennete TEXT,
    courriel TEXT, telephone TEXT, contact_urgence TEXT,
    taille_chandail TEXT, restriction_alimentaire TEXT,
    passion TEXT, ambition TEXT, preoccupation TEXT, why TEXT,
    statut TEXT DEFAULT 'Actif',
    ip_vav TEXT, ip_stat TEXT, ip_ctrl_2 TEXT, smartvue TEXT,
    unitouch TEXT, iom TEXT, ip_303 TEXT, test_1 TEXT, s1000 TEXT,
    ecbl_4_6 TEXT, ecbl_2_3 TEXT, ecbl_vav_s TEXT,
    kit_demobox TEXT, vavn_103 TEXT, display TEXT,
    ecy_4_6 TEXT, ecbos TEXT, resence TEXT, horyzon TEXT,
    ecy_2_3 TEXT, immersion TEXT,
    nb_stations INTEGER DEFAULT 0,
    plan_systeme TEXT, plan_processus TEXT, plan_general TEXT, plan_waterspider TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => { if (err) console.error('employees table:', err); else console.log('✓ employees table ready'); });

  // Add department column to existing tables (safe on re-run — error ignored if column exists)
  db.run(`CREATE TABLE IF NOT EXISTS matrix_columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department TEXT NOT NULL,
    name TEXT NOT NULL,
    ordre INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => { if (err) console.error('matrix_columns:', err); else console.log('✓ matrix_columns ready'); });

  db.run(`CREATE TABLE IF NOT EXISTS matrix_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    column_id INTEGER NOT NULL,
    value TEXT DEFAULT '',
    UNIQUE(employee_id, column_id),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES matrix_columns(id) ON DELETE CASCADE
  )`, (err) => { if (err) console.error('matrix_values:', err); else console.log('✓ matrix_values ready'); });

  db.run(`ALTER TABLE checklist_templates ADD COLUMN department TEXT DEFAULT ''`,
    (err) => { if (err && !err.message.includes('duplicate column')) console.error('dept col checklists:', err); else console.log('✓ checklist_templates.department ready'); });
  db.run(`ALTER TABLE trainers ADD COLUMN department TEXT DEFAULT ''`,
    (err) => { if (err && !err.message.includes('duplicate column')) console.error('dept col trainers:', err); else console.log('✓ trainers.department ready'); });
  db.run(`ALTER TABLE employees ADD COLUMN department TEXT DEFAULT ''`,
    (err) => { if (err && !err.message.includes('duplicate column')) console.error('dept col employees:', err); else console.log('✓ employees.department ready'); });
  db.run(`ALTER TABLE users ADD COLUMN department TEXT DEFAULT ''`,
    (err) => { if (err && !err.message.includes('duplicate column')) console.error('dept col users:', err); else console.log('✓ users.department ready'); });

  db.run(`ALTER TABLE employees ADD COLUMN superviseur TEXT DEFAULT ''`,
    (err) => { if (err && !err.message.includes('duplicate column')) console.error('superviseur col employees:', err); else console.log('✓ employees.superviseur ready'); });

  db.run(`ALTER TABLE employees ADD COLUMN photo TEXT DEFAULT ''`,
    (err) => { if (err && !err.message.includes('duplicate column')) console.error('photo col employees:', err); else console.log('✓ employees.photo ready'); });

  db.run(`CREATE TABLE IF NOT EXISTS station_displays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_code TEXT UNIQUE NOT NULL,
    label TEXT DEFAULT '',
    url TEXT DEFAULT '',
    carousel_interval INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => { if (err) console.error('station_displays:', err); else console.log('✓ station_displays ready'); });

  db.run(`CREATE TABLE IF NOT EXISTS station_display_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    ordre INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES station_displays(id) ON DELETE CASCADE
  )`, (err) => { if (err) console.error('station_display_images:', err); else console.log('✓ station_display_images ready'); });

  db.run(`CREATE TABLE IF NOT EXISTS employee_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mimetype TEXT DEFAULT '',
    size INTEGER DEFAULT 0,
    uploaded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
  )`, (err) => { if (err) console.error('employee_attachments table:', err); else console.log('✓ employee_attachments table ready'); });

  db.run(`ALTER TABLE training_sessions ADD COLUMN assigned_user_id INTEGER`,
    (err) => { if (err && !err.message.includes('duplicate column')) console.error('assigned_user_id col:', err); });

  // Recreate station_schedule if shift column is missing (added in v2)
  db.all("PRAGMA table_info(station_schedule)", [], (err, cols) => {
    const hasShift = cols && cols.some(c => c.name === 'shift');
    const createTable = () => db.run(`CREATE TABLE IF NOT EXISTS station_schedule (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start          TEXT NOT NULL,
      shift               TEXT NOT NULL DEFAULT 'Jour',
      station_instance_id INTEGER NOT NULL,
      day_index           INTEGER NOT NULL,
      slot_index          INTEGER NOT NULL DEFAULT 0,
      employee_name       TEXT,
      UNIQUE(week_start, shift, station_instance_id, day_index, slot_index)
    )`, (e) => { if (e) console.error('station_schedule table:', e); else console.log('✓ station_schedule table ready'); });

    if (!hasShift) {
      db.run('DROP TABLE IF EXISTS station_schedule', () => createTable());
    } else {
      createTable();
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS employee_productivity (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    station_key TEXT NOT NULL,
    month       TEXT NOT NULL,
    score       INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now')),
    UNIQUE(employee_id, station_key, month)
  )`, (err) => { if (err) console.error('employee_productivity table:', err); else console.log('✓ employee_productivity table ready'); });

  db.run(`CREATE TABLE IF NOT EXISTS station_instances (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    station_key   TEXT NOT NULL,
    max_operators INTEGER NOT NULL DEFAULT 1,
    department    TEXT NOT NULL DEFAULT 'Operations',
    created_at    TEXT DEFAULT (datetime('now'))
  )`, (err) => { if (err) console.error('station_instances table:', err); else console.log('✓ station_instances table ready'); });

  db.run(`CREATE TABLE IF NOT EXISTS schedule_weeks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    employee_id INTEGER NOT NULL,
    lundi TEXT DEFAULT '', mardi TEXT DEFAULT '',
    mercredi TEXT DEFAULT '', jeudi TEXT DEFAULT '',
    vendredi TEXT DEFAULT '', samedi TEXT DEFAULT '',
    dimanche TEXT DEFAULT '',
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(week_start, employee_id)
  )`, (err) => { if (err) console.error('schedule_weeks table:', err); else console.log('✓ schedule_weeks table ready'); });

  db.run(`CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    permission_key TEXT NOT NULL,
    allowed INTEGER DEFAULT 0,
    UNIQUE(role, permission_key)
  )`, (err) => { if (err) console.error('role_permissions table:', err); else console.log('✓ role_permissions table ready'); });

  db.run(`CREATE TABLE IF NOT EXISTS employee_holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date_start TEXT NOT NULL,
    date_end TEXT NOT NULL,
    type TEXT DEFAULT 'Congé',
    notes TEXT DEFAULT '',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  )`, (err) => { if (err) console.error('employee_holidays table:', err); else console.log('✓ employee_holidays table ready'); });

  db.run(`CREATE TABLE IF NOT EXISTS dept_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department TEXT NOT NULL,
    permission_key TEXT NOT NULL,
    allowed INTEGER DEFAULT 0,
    UNIQUE(department, permission_key)
  )`, (err) => {
    if (err) { console.error('dept_permissions table:', err); return; }
    console.log('✓ dept_permissions table ready');
    require('./config/permissions').load(() => console.log('✓ permissions cache loaded'));
  });
});
// Training sessions calendar API — returns En cours sessions overlapping a date range
app.get('/api/sessions-calendar', (req, res) => {
  if (!req.session.user) return res.status(401).json([]);
  const { from, to } = req.query;
  if (!from || !to) return res.json([]);

  const user = req.session.user;
  const dept = user.role === 'admin'
    ? (req.session.adminDept || null)
    : (user.department || null);

  // Join with employees to get department
  let sql = `SELECT ts.*, e.department as emp_dept
             FROM training_sessions ts
             LEFT JOIN employees e ON LOWER(TRIM(e.nom)) = LOWER(TRIM(ts.employee_name))
             WHERE ts.statut = 'En cours'
               AND ts.date_debut IS NOT NULL
               AND ts.date_fin   IS NOT NULL
               AND ts.date_debut <= ? AND ts.date_fin >= ?`;
  const params = [to, from];

  if (dept) {
    sql += ' AND (e.department = ? OR e.department IS NULL)';
    params.push(dept);
  }

  sql += ' ORDER BY ts.date_debut';

  db.all(sql, params, (err, rows) => res.json(err ? [] : rows));
});

// Holidays API — accessible to all authenticated users (used by sidebar calendar)
app.get('/api/holidays', (req, res) => {
  if (!req.session.user) return res.status(401).json([]);
  const { from, to } = req.query;
  if (!from || !to) return res.json([]);

  const user = req.session.user;
  // Determine department filter: admin uses selected dept, others use own dept
  const dept = user.role === 'admin'
    ? (req.session.adminDept || null)   // null = all depts
    : (user.department || null);

  let sql = `SELECT h.*, e.nom as employee_nom FROM employee_holidays h
             JOIN employees e ON e.id = h.employee_id
             WHERE h.date_start <= ? AND h.date_end >= ?`;
  const params = [to, from];

  if (dept) {
    sql += ' AND e.department = ?';
    params.push(dept);
  }

  sql += ' ORDER BY h.date_start';

  db.all(sql, params, (err, rows) => res.json(err ? [] : rows));
});

// Actions correctives stats (for KPI chart)
app.get('/admin/actions-stats', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({});
  db.all(`SELECT statut, COUNT(*) as cnt FROM corrective_actions GROUP BY statut`, [], (err, rows) => {
    const result = {};
    (rows || []).forEach(r => { result[r.statut] = r.cnt; });
    res.json(result);
  });
});

app.get('/api/dashboard/stats', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const stats = {};
  
  db.get('SELECT COUNT(*) as count FROM trainers WHERE statut_validation = "Validé"', [], (err, row) => {
    stats.certified = row ? row.count : 0;
    
    db.get('SELECT COUNT(DISTINCT employee_name) as count FROM training_sessions WHERE statut = "En cours"', [], (err, row) => {
      stats.pending = row ? row.count : 0;
      
      db.get('SELECT COUNT(*) as count FROM training_sessions WHERE statut = "En cours"', [], (err, row) => {
        stats.activeSessions = row ? row.count : 0;
        
        db.get('SELECT COUNT(*) as count FROM trainers', [], (err, row) => {
          stats.total = row ? row.count : 0;
          res.json(stats);
        });
      });
    });
  });
});

// Department switcher for admin
app.post('/set-dept', (req, res) => {
  if (req.session.user && req.session.user.role === 'admin') {
    req.session.adminDept = req.body.dept || '';
  }
  res.redirect(req.body.returnTo || '/dashboard');
});

// Error handling
app.use((req, res) => {
  res.status(404).render('error', { 
    title: 'Page non trouvée',
    message: 'La page que vous recherchez n\'existe pas.',
    error: { status: 404 }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Erreur',
    message: 'Une erreur s\'est produite sur le serveur.',
    error: err
  });
});

// Start server — handle port-in-use gracefully (e.g. when hot-reloaded by Electron)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n╔═══════════════════════════════════════════════╗`);
  console.log(`║   Former les Formateurs - Application                           ║`);
  console.log(`╠════════════════════════════════════════════════╣`);
  console.log(`║   Serveur démarré sur: http://localhost:${PORT}                 ║`);
  console.log(`╚════════════════════════════════════════════════╝\n`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} already in use — server already running.`);
  } else {
    console.error('Server error:', err);
  }
});
module.exports = server;
