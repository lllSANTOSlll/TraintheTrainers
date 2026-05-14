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
  
  if (userRole === 'admin') {
    // Admin sees ALL sessions
    sql = `SELECT ts.*, t.nom_prenom as trainer_name, u.username as assigned_username, u.full_name as assigned_fullname
           FROM training_sessions ts
           JOIN trainers t ON ts.trainer_id = t.id
           LEFT JOIN users u ON ts.assigned_user_id = u.id
           ORDER BY ts.date_debut DESC`;
  } else {
    // Trainers and users only see sessions assigned to them
    sql = `SELECT ts.*, t.nom_prenom as trainer_name, u.username as assigned_username, u.full_name as assigned_fullname
           FROM training_sessions ts
           JOIN trainers t ON ts.trainer_id = t.id
           LEFT JOIN users u ON ts.assigned_user_id = u.id
           WHERE ts.assigned_user_id = ?
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

// New training session form
router.get('/new', (req, res) => {
  const trainersSql = 'SELECT id, nom_prenom FROM trainers WHERE statut_validation = "Validé" ORDER BY nom_prenom';
  const templatesSql = 'SELECT id, title, description FROM checklist_templates ORDER BY title';
  const usersSql = 'SELECT id, username, full_name, role FROM users WHERE role IN ("trainer", "user") ORDER BY full_name, username';
  
  db.all(trainersSql, [], (err, trainers) => {
    db.all(templatesSql, [], (err, templates) => {
      db.all(usersSql, [], (err, users) => {
        res.render('training/form', {
          title: 'Nouvelle Session de Formation',
          trainers: trainers || [],
          templates: templates || [],
          users: users || [],
          session: null,
          action: '/training'
        });
      });
    });
  });
});

// Create training session
router.post('/', (req, res) => {
  const { trainer_id, employee_name, date_debut, date_fin, poste, statut, notes, template_id, assigned_user_id } = req.body;

  const sql = `INSERT INTO training_sessions 
    (trainer_id, employee_name, date_debut, date_fin, poste, statut, notes, assigned_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [
    trainer_id, employee_name, date_debut, date_fin, poste, 
    statut || 'En cours', notes,
    assigned_user_id || null
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
  
  if (userRole === 'admin') {
    return next(); // Admins access everything
  }
  
  // Check if session is assigned to this user
  db.get('SELECT assigned_user_id FROM training_sessions WHERE id = ?',
    [sessionId],
    (err, session) => {
      if (err || !session) {
        return res.status(404).send('Session non trouvée');
      }
      
      if (session.assigned_user_id === userId) {
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
  const sessionSql = `SELECT ts.*, t.nom_prenom as trainer_name, 
                      u.username as assigned_username, u.full_name as assigned_fullname
                      FROM training_sessions ts
                      JOIN trainers t ON ts.trainer_id = t.id
                      LEFT JOIN users u ON ts.assigned_user_id = u.id
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
  const usersSql = 'SELECT id, username, full_name, role FROM users WHERE role IN ("trainer", "user") ORDER BY full_name, username';
  
  db.get(sessionSql, [req.params.id], (err, session) => {
    if (!session) return res.status(404).send('Non trouvée');
    db.all(trainersSql, [], (err, trainers) => {
      db.all(usersSql, [], (err, users) => {
        res.render('training/form', {
          title: 'Modifier Session',
          session,
          trainers: trainers || [],
          users: users || [],
          templates: [],
          action: `/training/${session.id}?_method=PUT`
        });
      });
    });
  });
});

// Update session
router.put('/:id', canAccessSession, (req, res) => {
  const { trainer_id, employee_name, date_debut, date_fin, poste, statut, notes, assigned_user_id } = req.body;
  
  const sql = `UPDATE training_sessions 
               SET trainer_id=?, employee_name=?, date_debut=?, date_fin=?, poste=?, statut=?, notes=?, 
                   assigned_user_id=?, updated_at=CURRENT_TIMESTAMP
               WHERE id=?`;
  
  db.run(sql, [trainer_id, employee_name, date_debut, date_fin, poste, statut, notes, 
               assigned_user_id || null, req.params.id], (err) => {
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

module.exports = router;
