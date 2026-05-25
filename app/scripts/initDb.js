const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/trainers.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Trainers table
  db.run(`CREATE TABLE IF NOT EXISTS trainers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_prenom TEXT NOT NULL,
    poste_actuel TEXT,
    departement TEXT,
    domaine_expertise TEXT,
    statut_validation TEXT DEFAULT 'Non validé',
    date_formation DATE,
    date_certification DATE,
    superviseur TEXT,
    commentaires TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // Evaluations table
  db.run(`CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_id INTEGER NOT NULL,
    formation TEXT,
    evaluateur TEXT,
    date_evaluation DATE,
    maitrise_technique INTEGER,
    competences_pedagogiques INTEGER,
    communication INTEGER,
    standards_qualite INTEGER,
    engagement_autonomie INTEGER,
    capacite_adaptation INTEGER,
    remarques_generales TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
  )`);

  // Training sessions table
  db.run(`CREATE TABLE IF NOT EXISTS training_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_id INTEGER NOT NULL,
    employee_name TEXT NOT NULL,
    date_debut DATE,
    date_fin DATE,
    poste TEXT,
    statut TEXT DEFAULT 'En cours',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
  )`);

  // Settings table for app configuration
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    category TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Checklist templates table
  db.run(`CREATE TABLE IF NOT EXISTS checklist_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // Checklist template items table
  db.run(`CREATE TABLE IF NOT EXISTS checklist_template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    jour INTEGER NOT NULL,
    categorie TEXT,
    sous_categorie TEXT,
    quoi_expliquer TEXT,
    ordre INTEGER DEFAULT 0,
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
  )`);

  // Training checklist items table
  db.run(`CREATE TABLE IF NOT EXISTS checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    jour INTEGER NOT NULL,
    categorie TEXT,
    sous_categorie TEXT,
    quoi_expliquer TEXT,
    completed BOOLEAN DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
  )`);

  // Create default admin user
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, password, email, full_name, role) 
          VALUES (?, ?, ?, ?, ?)`,
    ['admin', adminPassword, 'admin@company.com', 'Administrateur', 'admin'],
    function(err) {
      if (err) {
        console.error('Erreur lors de la création de l\'admin:', err);
      } else {
        console.log('✓ Utilisateur admin créé (username: admin, password: admin123)');
      }
    }
  );

  // Create default user
  const userPassword = bcrypt.hashSync('user123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, password, email, full_name, role) 
          VALUES (?, ?, ?, ?, ?)`,
    ['user', userPassword, 'user@company.com', 'Utilisateur Test', 'user'],
    function(err) {
      if (err) {
        console.error('Erreur lors de la création de l\'utilisateur:', err);
      } else {
        console.log('✓ Utilisateur test créé (username: user, password: user123)');
      }
    }
  );

  // Initialize default settings
  const defaultSettings = [
    // SharePoint settings
    { key: 'sharepoint_client_id', value: '', category: 'sharepoint' },
    { key: 'sharepoint_client_secret', value: '', category: 'sharepoint' },
    { key: 'sharepoint_tenant_id', value: '', category: 'sharepoint' },
    { key: 'sharepoint_site_url', value: '', category: 'sharepoint' },
    { key: 'sharepoint_list_name', value: 'FormateursQualifies', category: 'sharepoint' },
    // Theme settings
    { key: 'theme_primary_color', value: '#0066cc', category: 'theme' },
    { key: 'theme_sidebar_bg', value: '#2c3e50', category: 'theme' },
    { key: 'theme_sidebar_hover', value: '#34495e', category: 'theme' },
    { key: 'theme_success_color', value: '#28a745', category: 'theme' },
    { key: 'theme_danger_color', value: '#dc3545', category: 'theme' },
    { key: 'theme_warning_color', value: '#ffc107', category: 'theme' },
    { key: 'theme_info_color', value: '#17a2b8', category: 'theme' }
  ];

  defaultSettings.forEach(setting => {
    db.run(`INSERT OR IGNORE INTO settings (key, value, category) VALUES (?, ?, ?)`,
      [setting.key, setting.value, setting.category],
      function(err) {
        if (err) console.error(`Erreur setting ${setting.key}:`, err);
      }
    );
  });

  console.log('✓ Paramètres par défaut initialisés');

  // Create default Water Spider checklist template
  db.run(`INSERT OR IGNORE INTO checklist_templates (id, title, description, created_by) 
          VALUES (1, 'Water Spider', 'Checklist complète pour la formation Water Spider (2 jours)', 1)`, 
    function(err) {
      if (err) {
        console.error('Erreur création template:', err);
        return;
      }
      
      if (this.changes === 0) {
        console.log('✓ Template Water Spider déjà existant');
        return;
      }

      // Add all Water Spider checklist items
      const waterSpiderItems = [
        // Jour 1 - Environnement de travail
        { jour: 1, cat: 'Environnement de travail', sous: 'Magasin', quoi: 'Aligné avec les stations', ordre: 1 },
        { jour: 1, cat: 'Environnement de travail', sous: 'Magasin', quoi: 'RK : Par station (montrer le plan)', ordre: 2 },
        { jour: 1, cat: 'Environnement de travail', sous: 'Magasin', quoi: 'Explication brève de la zone de lexans', ordre: 3 },
        { jour: 1, cat: 'Environnement de travail', sous: 'Magasin', quoi: 'Explication détaillée de la zone de lexans', ordre: 4 },
        { jour: 1, cat: 'Environnement de travail', sous: 'Stations de travail', quoi: 'Montrer le plan des stations', ordre: 5 },
        { jour: 1, cat: 'Environnement de travail', sous: 'Stations de travail', quoi: 'Faire un tour de chaque station', ordre: 6 },
        { jour: 1, cat: 'Environnement de travail', sous: 'Grand et petit tour', quoi: 'Expliquer quelle station selon le tour', ordre: 7 },
        { jour: 1, cat: 'Environnement de travail', sous: 'Grand et petit tour', quoi: 'Expliquer le sens de circulation', ordre: 8 },
        { jour: 1, cat: 'Concept', sous: 'Kanban', quoi: 'Expliquer le principe du Kanban et comment il s\'applique', ordre: 9 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Changement de job', quoi: 'Quand faire un changement de job', ordre: 10 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Changement de job', quoi: 'Quels sont les étapes d\'un changement de job', ordre: 11 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Changement de job', quoi: 'Comment faire la validation', ordre: 12 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Changement de job', quoi: 'Expliquer la feuille de job', ordre: 13 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Approvisionnement', quoi: 'Quand doit-on approvisionner les stations', ordre: 14 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Approvisionnement', quoi: 'Quels sont les étapes d\'un approvisionnement', ordre: 15 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Approvisionnement', quoi: 'Comment faire la validation', ordre: 16 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Acheminer les produits finis', quoi: 'Quand vider les produits finis', ordre: 17 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Acheminer les produits finis', quoi: 'Quand doit-on utiliser les bacs bleus', ordre: 18 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Acheminer les produits finis', quoi: 'Expliquer les racking SH et MakeToOrder', ordre: 19 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Acheminer les produits finis', quoi: 'Quels sont les étapes pour acheminer les produits finis', ordre: 20 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Faire le recyclage', quoi: 'Quand doit-on faire le recyclage', ordre: 21 },
        { jour: 1, cat: 'Tâches et priorités', sous: 'Faire le recyclage', quoi: 'Quels sont les étapes du recyclage', ordre: 22 },
        { jour: 1, cat: 'Outils de travail', sous: 'Domo : Jobs BOM Compare', quoi: 'À quoi elle sert', ordre: 23 },
        { jour: 1, cat: 'Outils de travail', sous: 'Domo : Jobs BOM Compare', quoi: 'Quand l\'utiliser', ordre: 24 },
        { jour: 1, cat: 'Outils de travail', sous: 'Domo : Jobs BOM Compare', quoi: 'Comment l\'utiliser', ordre: 25 },
        { jour: 1, cat: 'Outils de travail', sous: 'Domo : Job estimated remaining time', quoi: 'À quoi elle sert', ordre: 26 },
        { jour: 1, cat: 'Outils de travail', sous: 'Domo : Job estimated remaining time', quoi: 'Quand l\'utiliser', ordre: 27 },
        { jour: 1, cat: 'Outils de travail', sous: 'Domo : Job estimated remaining time', quoi: 'Comment l\'utiliser', ordre: 28 },
        { jour: 1, cat: 'Outils de travail', sous: 'Power Apps : Choix du tour', quoi: 'À quoi elle sert', ordre: 29 },
        { jour: 1, cat: 'Outils de travail', sous: 'Power Apps : Choix du tour', quoi: 'Quand l\'utiliser', ordre: 30 },
        { jour: 1, cat: 'Outils de travail', sous: 'Power Apps : Choix du tour', quoi: 'Comment l\'utiliser', ordre: 31 },
        { jour: 1, cat: 'Outils de travail', sous: 'Power Apps : Alerte', quoi: 'À quoi elle sert', ordre: 32 },
        { jour: 1, cat: 'Outils de travail', sous: 'Power Apps : Alerte', quoi: 'Quand l\'utiliser', ordre: 33 },
        { jour: 1, cat: 'Outils de travail', sous: 'Power Apps : Alerte', quoi: 'Comment l\'utiliser', ordre: 34 },
        { jour: 1, cat: 'Communication', sous: 'Utilisation des walkie-talkie', quoi: 'Expliquer l\'utilisation du walkie-talkie', ordre: 35 },
        { jour: 1, cat: 'Communication', sous: 'Feuille du chef d\'équipe', quoi: 'Expliquer à quoi elle sert', ordre: 36 },
        { jour: 1, cat: 'Communication', sous: 'Connaître les interlocuteurs', quoi: 'Expliquer les rôles (AC, Superviseur, Chef d\'équipe, Logistique)', ordre: 37 },
        { jour: 2, cat: 'Outils de travail', sous: 'Domo : Item and locations', quoi: 'À quoi elle sert', ordre: 38 },
        { jour: 2, cat: 'Outils de travail', sous: 'Domo : Item and locations', quoi: 'Quand l\'utiliser', ordre: 39 },
        { jour: 2, cat: 'Outils de travail', sous: 'Domo : Item and locations', quoi: 'Comment l\'utiliser', ordre: 40 },
        { jour: 2, cat: 'Concept', sous: '5S', quoi: 'Expliquer le principe du 5S et comment il s\'applique', ordre: 41 },
        { jour: 2, cat: 'Tâches supplémentaire', sous: 'Remplir les bacs verts', quoi: 'Comment le faire quand c\'est tranquille', ordre: 42 },
        { jour: 2, cat: 'Tâches supplémentaire', sous: 'Mise à jour d\'un papier', quoi: 'Quand le faire (changement de version)', ordre: 43 },
        { jour: 2, cat: 'Tâches supplémentaire', sous: 'Mise à jour d\'un papier', quoi: 'Comment le faire', ordre: 44 }
      ];

      waterSpiderItems.forEach(item => {
        db.run(`INSERT INTO checklist_template_items 
                (template_id, jour, categorie, sous_categorie, quoi_expliquer, ordre) 
                VALUES (1, ?, ?, ?, ?, ?)`,
          [item.jour, item.cat, item.sous, item.quoi, item.ordre],
          (err) => { if (err) console.error(err); }
        );
      });

      console.log('✓ Template Water Spider créé avec 44 éléments');
    }
  );
});

db.close((err) => {
  if (err) {
    console.error('Erreur lors de la fermeture de la base de données:', err);
  } else {
    console.log('\n✓ Base de données initialisée avec succès!');
    console.log('  Fichier: ' + dbPath);
  }
});
