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

const app = express();
const PORT = 5000;

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
  )`, (err) => {
    if (err) { console.error('role_permissions table:', err); return; }
    console.log('✓ role_permissions table ready');
    require('./config/permissions').load(() => console.log('✓ permissions cache loaded'));
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
