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

const app = express();
const PORT = process.env.PORT || 80;

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

// Make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  res.locals.settings = {}; // Settings not loaded per-request anymore (optional feature)
  next();
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

// API endpoint for dashboard stats
const db = require('./config/database');
app.get('/api/dashboard/stats', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const stats = {};
  
  db.get('SELECT COUNT(*) as count FROM trainers WHERE statut_validation = "Validé"', [], (err, row) => {
    stats.certified = row ? row.count : 0;
    
    db.get('SELECT COUNT(*) as count FROM trainers WHERE statut_validation = "Non validé"', [], (err, row) => {
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n╔═══════════════════════════════════════════════╗`);
  console.log(`║   Former les Formateurs - Application         					  ║`);
  console.log(`╠════════════════════════════════════════════════╣`);
  console.log(`║   Serveur démarré sur: http://localhost:${PORT} 				  ║`);
  console.log(`║   Accessible sur réseau: http://10.59.114.235:${PORT} 			  ║`);
  console.log(`║                                               			 	      ║`);
  console.log(`║   Comptes par défaut:                         				      ║`);
  console.log(`║   • Admin: HD001@acuitysso.com                 			      ║`);
  console.log(`║   							                     				  ║`);
  console.log(`╚════════════════════════════════════════════════╝\n`);
});
