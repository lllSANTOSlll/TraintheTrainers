const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

router.use(isAuthenticated);

// List training sessions - filtered by user role
router.get('/', (req, res) => {
  const userId = req.session.user.id;
  const userRole = req.session.user.role;

  let sql;
  let params = [];

  if (userRole === 'admin' || userRole === 'supervisor') {
    // Admin and supervisors see ALL sessions
    sql = `SELECT ts.*, t.nom_prenom as trainer_name, e.superviseur as employee_supervisor
           FROM training_sessions ts
           JOIN trainers t ON ts.trainer_id = t.id
           LEFT JOIN employees e ON e.nom = ts.employee_name
           ORDER BY ts.date_debut DESC`;
  } else {
    // Trainers and users only see sessions assigned to them
    sql = `SELECT ts.*, t.nom_prenom as trainer_name, e.superviseur as employee_supervisor
           FROM training_sessions ts
           JOIN trainers t ON ts.trainer_id = t.id
           LEFT JOIN employees e ON e.nom = ts.employee_name
           WHERE ts.assigned_user_id = ? OR ts.assigned_user_id IS NULL
           ORDER BY ts.date_debut DESC`;
    params = [userId];
  }
  
  db.all(sql, params, (err, sessions) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur serveur');
    }
    res.render('training/list', {
      title: 'Sessions de Formation',
      sessions: sessions || []
    });
  });
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

// Returns { stations, matrixCols } based on effective department:
//   Logistics   → matrixCols only
//   Technicians → stations + matrixCols
//   Others      → stations only
function getPostesForDept(req, callback) {
  const user = req.session.user;
  const dept = user.role === 'admin'
    ? (req.session.adminDept || 'Operations')
    : (user.department || 'Operations');

  if (dept === 'Logistics') {
    db.all('SELECT name FROM matrix_columns WHERE department = ? ORDER BY ordre, id', [dept], (err, cols) => {
      callback([], cols || []);
    });
  } else if (dept === 'Technicians') {
    db.all('SELECT name FROM matrix_columns WHERE department = ? ORDER BY ordre, id', [dept], (err, cols) => {
      callback(STATIONS, cols || []);
    });
  } else {
    // Operations, admin (no dept), or anything else → stations only
    callback(STATIONS, []);
  }
}

// New training session form
router.get('/new', (req, res) => {
  const trainersSql = 'SELECT id, nom_prenom FROM trainers WHERE statut_validation = "Validé" ORDER BY nom_prenom';
  const templatesSql = 'SELECT id, title, description FROM checklist_templates ORDER BY title';
  const usersSql = 'SELECT id, username, full_name, role FROM users WHERE role IN ("trainer", "user") ORDER BY full_name, username';
  const stationCols = STATIONS.map(s => s.key).join(', ');
  const employeesSql = `SELECT id, nom, equipe, department, superviseur, ${stationCols} FROM employees WHERE statut = "Actif" OR statut IS NULL ORDER BY nom`;

  getPostesForDept(req, (stations, matrixCols) => {
    db.all(trainersSql, [], (err, trainers) => {
      db.all(templatesSql, [], (err2, templates) => {
        db.all(usersSql, [], (err3, users) => {
          db.all(employeesSql, [], (err4, employees) => {
            res.render('training/form', {
              title: 'Nouvelle Session de Formation',
              trainers: trainers || [],
              templates: templates || [],
              users: users || [],
              employees: employees || [],
              stations,
              matrixCols,
              session: null,
              action: '/training'
            });
          });
        });
      });
    });
  });
});

// Create training session
router.post('/', (req, res) => {
  const { trainer_id, employee_name, date_debut, date_fin, poste, statut, notes, template_id } = req.body;
  const creatorId = req.session.user.id;

  const sql = `INSERT INTO training_sessions
    (trainer_id, employee_name, date_debut, date_fin, poste, statut, notes, assigned_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [
    trainer_id, employee_name, date_debut, date_fin, poste,
    statut || 'En cours', notes, creatorId
  ],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Erreur lors de la création');
      }
      
      const sessionId = this.lastID;
      
      // If template selected, load it automatically
      if (template_id && template_id !== '') {
        db.all('SELECT * FROM checklist_template_items WHERE template_id = ? ORDER BY ordre',
          [template_id],
          (err, items) => {
            if (!err && items && items.length > 0) {
              let completed = 0;
              items.forEach(item => {
                db.run(`INSERT INTO checklist_items 
                        (session_id, jour, categorie, sous_categorie, quoi_expliquer, completed) 
                        VALUES (?, ?, ?, ?, ?, 0)`,
                  [sessionId, item.jour, item.categorie, item.sous_categorie, item.quoi_expliquer],
                  () => {
                    completed++;
                    if (completed === items.length) {
                      res.redirect(`/training/${sessionId}`);
                    }
                  }
                );
              });
            } else {
              res.redirect(`/training/${sessionId}`);
            }
          }
        );
      } else {
        res.redirect(`/training/${sessionId}`);
      }
    }
  );
});

// Middleware to check if user can access a session
function canAccessSession(req, res, next) {
  const sessionId = req.params.id;
  const userId = req.session.user.id;
  const userRole = req.session.user.role;

  // Admins and supervisors access everything
  if (userRole === 'admin' || userRole === 'supervisor') {
    return next();
  }

  // Trainers/users: allowed if session is assigned to them or has no assignment (legacy)
  db.get('SELECT assigned_user_id FROM training_sessions WHERE id = ?',
    [sessionId],
    (err, session) => {
      if (err || !session) {
        return res.status(404).send('Session non trouvée');
      }

      if (session.assigned_user_id === userId || session.assigned_user_id === null) {
        return next();
      }

      res.status(403).render('error', {
        title: 'Accès refusé',
        message: 'Cette session ne vous est pas assignée.',
        error: { status: 403 }
      });
    }
  );
}

// View training session detail
router.get('/:id', canAccessSession, (req, res) => {
  const sessionSql = `SELECT ts.*, t.nom_prenom as trainer_name, e.superviseur as employee_supervisor
                      FROM training_sessions ts
                      JOIN trainers t ON ts.trainer_id = t.id
                      LEFT JOIN employees e ON e.nom = ts.employee_name
                      WHERE ts.id = ?`;
  
  const checklistSql = `SELECT * FROM checklist_items WHERE session_id = ? ORDER BY jour, id`;

  db.get(sessionSql, [req.params.id], (err, session) => {
    if (err || !session) {
      return res.status(404).send('Session non trouvée');
    }

    db.all(checklistSql, [req.params.id], (err, checklist) => {
      res.render('training/detail', {
        title: `Formation - ${session.employee_name}`,
        session,
        checklist: checklist || []
      });
    });
  });
});

// Edit session form
router.get('/:id/edit', canAccessSession, (req, res) => {
  const sessionSql = 'SELECT * FROM training_sessions WHERE id = ?';
  const trainersSql = 'SELECT id, nom_prenom FROM trainers WHERE statut_validation = "Validé"';
  const templatesSql = 'SELECT id, title, description FROM checklist_templates ORDER BY title';
  const usersSql = 'SELECT id, username, full_name, role FROM users WHERE role IN ("trainer", "user") ORDER BY full_name, username';
  const stationCols = STATIONS.map(s => s.key).join(', ');
  const employeesSql = `SELECT id, nom, equipe, department, superviseur, ${stationCols} FROM employees WHERE statut = "Actif" OR statut IS NULL ORDER BY nom`;

  getPostesForDept(req, (stations, matrixCols) => {
    db.get(sessionSql, [req.params.id], (err, session) => {
      if (!session) return res.status(404).send('Non trouvée');
      db.all(trainersSql, [], (err, trainers) => {
        db.all(templatesSql, [], (err2, templates) => {
          db.all(usersSql, [], (err3, users) => {
            db.all(employeesSql, [], (err4, employees) => {
              res.render('training/form', {
                title: 'Modifier Session',
                session,
                trainers: trainers || [],
                templates: templates || [],
                users: users || [],
                employees: employees || [],
                stations,
                matrixCols,
                action: `/training/${session.id}?_method=PUT`
              });
            });
          });
        });
      });
    });
  });
});

// Update session
router.put('/:id', canAccessSession, (req, res) => {
  const { trainer_id, employee_name, date_debut, date_fin, poste, statut, notes } = req.body;

  const sql = `UPDATE training_sessions
               SET trainer_id=?, employee_name=?, date_debut=?, date_fin=?, poste=?, statut=?, notes=?,
                   updated_at=CURRENT_TIMESTAMP
               WHERE id=?`;

  db.run(sql, [trainer_id, employee_name, date_debut, date_fin, poste, statut, notes, req.params.id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur');
    }
    res.redirect(`/training/${req.params.id}`);
  });
});

// Update checklist item (checkbox)
router.post('/:id/checklist', canAccessSession, (req, res) => {
  const { item_id, completed, notes } = req.body;
  
  const sql = `UPDATE checklist_items SET completed = ?, notes = ? WHERE id = ?`;
  
  db.run(sql, [completed ? 1 : 0, notes, item_id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur mise à jour' });
    }
    res.json({ success: true });
  });
});

// Edit checklist item content
router.post('/:id/checklist/:itemId/edit', canAccessSession, (req, res) => {
  const { sous_categorie, quoi_expliquer } = req.body;
  
  const sql = `UPDATE checklist_items SET sous_categorie = ?, quoi_expliquer = ? WHERE id = ?`;
  
  db.run(sql, [sous_categorie, quoi_expliquer, req.params.itemId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur' });
    }
    res.json({ success: true });
  });
});

// Delete checklist item
router.post('/:id/checklist/:itemId/delete', canAccessSession, (req, res) => {
  db.run('DELETE FROM checklist_items WHERE id = ?', [req.params.itemId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur' });
    }
    res.json({ success: true });
  });
});

// Rollover incomplete items to next day
router.post('/:id/rollover', canAccessSession, (req, res) => {
  const sessionId = req.params.id;
  
  db.all('SELECT * FROM checklist_items WHERE session_id = ? AND completed = 0 ORDER BY jour, id',
    [sessionId],
    (err, items) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur' });
      }
      
      if (items.length === 0) {
        return res.json({ success: true, message: 'Aucun élément à reporter!' });
      }
      
      let updated = 0;
      let total = items.length;
      
      items.forEach(item => {
        const newJour = item.jour + 1;
        db.run('UPDATE checklist_items SET jour = ? WHERE id = ?',
          [newJour, item.id],
          (err) => {
            if (err) console.error(err);
            updated++;
            
            if (updated === total) {
              res.json({ 
                success: true, 
                message: `${total} élément(s) reporté(s) au jour suivant!` 
              });
            }
          }
        );
      });
    }
  );
});

// Delete training session (admin only)
router.post('/:id/delete', (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.status(403).send('Accès refusé');
  }
  const sessionId = req.params.id;
  // Delete checklist items first, then the session
  db.run('DELETE FROM checklist_items WHERE session_id = ?', [sessionId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur lors de la suppression');
    }
    db.run('DELETE FROM training_sessions WHERE id = ?', [sessionId], (err2) => {
      if (err2) {
        console.error(err2);
        return res.status(500).send('Erreur lors de la suppression');
      }
      res.redirect('/training');
    });
  });
});

module.exports = router;
